import { runInSlices } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { PAPER } from '../art/palette';
import { TILE } from '../art/terrain';
import { chunkJobs, dropChunks } from '../art/textures';
import { getSound } from '../host';
import { gridOf, guardAt, isSeen, objectAt, planPath, stepHero, type Adventure } from '../logic/adventure';
import { creature, sizeWord } from '../logic/creatures';
import { MINE_NAMES, MINE_OUTPUT, SITE_NAMES } from '../logic/objects';
import type { PathStep } from '../logic/path';
import { SPELLS } from '../logic/spells';
import { openPrompt } from './cards';
import { DPR, screenZoom, toView } from './hidpi';
import { MapWorld } from './map/mapWorld';
import { Session } from './session';

/** A press that moves further than this (CSS px) is a drag, not a tap. */
const DRAG = 8;
/** A tile's size on screen, CSS px: about an eighth of the screen's short side, within these bounds. */
const TILE_PX = { min: 34, max: 60 } as const;
/** Milliseconds a hero takes per 100 movement points. */
const STEP_MS = 150;

/**
 * The adventure map: the painted ground, sites, monsters and the hero.
 * Tap a tile to plan a path, tap it again to go; drag to look round, wheel
 * or pinch to zoom. Its HUD (MapHudScene) runs on top.
 */
export class MapScene extends Phaser.Scene {
  private session!: Session;
  private world!: MapWorld;
  private path: PathStep[] | null = null;
  private walking = false;
  private press: { x: number; y: number; sx: number; sy: number; moved: boolean } | null = null;
  private pinch: { dist: number; zoom: number } | null = null;
  private ready = false;

  constructor() {
    super('Map');
  }

  create(): void {
    this.session = Session.get(this);
    this.ready = false;
    this.path = null;
    this.walking = false;
    this.cameras.main.setBackgroundColor(PAPER);
    const label = this.add.text(0, 0, 'unrolling the map…', { fontFamily: '"Caveat", cursive', fontSize: '32px', color: '#232a4f' }).setOrigin(0.5);
    this.cameras.main.centerOn(0, 0).setZoom(DPR);
    dropChunks(this, this.session.def.id);
    void runInSlices(chunkJobs(this, this.session.def)).then(() => {
      // The scene may have been left while its ground was painting.
      if (!this.sys.isActive()) return;
      label.destroy();
      this.build();
    });
  }

  private build(): void {
    const { def } = this.session;
    const g = gridOf(def);
    this.world = new MapWorld(this, def, this.session.adv);
    const cam = this.cameras.main;
    cam.setBounds(-TILE * 2, -TILE * 2, (g.w + 4) * TILE, (g.h + 4) * TILE);
    this.fitZoom();
    this.centreOnHero();
    this.scale.on('resize', this.fitZoom, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.fitZoom, this));
    const onChange = (adv: Adventure): void => this.world.sync(adv);
    this.session.on('change', onChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.session.off('change', onChange));
    this.wireInput();
    this.scene.launch('MapHud');
    this.ready = true;
    // Reloaded mid-step into a guard zone: the fight comes first.
    if (!this.fightIfGuarded()) this.showPrompts();
  }

  update(_t: number, delta: number): void {
    if (this.ready) this.world.update(delta);
  }

  /** A zoom that shows a sensible number of tiles on any screen, keeping the same spot in the middle. */
  private fitZoom(): void {
    const cam = this.cameras.main;
    const mid = { x: cam.midPoint.x, y: cam.midPoint.y };
    const short = Math.min(this.scale.width, this.scale.height) / DPR;
    const px = Phaser.Math.Clamp(short / 8, TILE_PX.min, TILE_PX.max);
    cam.setZoom(Math.max(this.minZoom(), (px / TILE) * DPR));
    if (this.ready) cam.centerOn(mid.x, mid.y);
  }

  /** Never zoom out past the whole map. */
  private minZoom(): number {
    const g = gridOf(this.session.def);
    return Math.min(this.scale.width / ((g.w + 4) * TILE), this.scale.height / ((g.h + 4) * TILE));
  }

  centreOnHero(): void {
    const h = this.session.adv.hero;
    this.cameras.main.centerOn((h.x + 0.5) * TILE, (h.y + 0.5) * TILE);
  }

  private wireInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.blocked()) return;
      const pointers = this.input.manager.pointers.filter((q) => q.isDown);
      if (pointers.length >= 2) {
        const [a, b] = pointers;
        this.pinch = { dist: Phaser.Math.Distance.Between(a!.x, a!.y, b!.x, b!.y), zoom: this.cameras.main.zoom };
        this.press = null;
        return;
      }
      const v = toView(p.x, p.y);
      this.press = { x: v.x, y: v.y, sx: this.cameras.main.scrollX, sy: this.cameras.main.scrollY, moved: false };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.pinch) {
        const pointers = this.input.manager.pointers.filter((q) => q.isDown);
        if (pointers.length >= 2) {
          const [a, b] = pointers;
          const d = Phaser.Math.Distance.Between(a!.x, a!.y, b!.x, b!.y);
          this.zoomTo(this.pinch.zoom * (d / this.pinch.dist));
        }
        return;
      }
      if (!this.press || !p.isDown) {
        if (!p.isDown) this.hover(p);
        return;
      }
      const v = toView(p.x, p.y);
      if (!this.press.moved && Math.hypot(v.x - this.press.x, v.y - this.press.y) > DRAG) this.press.moved = true;
      if (this.press.moved) {
        const z = screenZoom(this.cameras.main);
        this.cameras.main.setScroll(this.press.sx - (v.x - this.press.x) / z, this.press.sy - (v.y - this.press.y) / z);
      }
    });
    const release = (p: Phaser.Input.Pointer): void => {
      if (this.pinch) {
        if (this.input.manager.pointers.filter((q) => q.isDown).length < 2) this.pinch = null;
        return;
      }
      const press = this.press;
      this.press = null;
      if (!press || press.moved || this.blocked()) return;
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      this.tap(Math.floor(w.x / TILE), Math.floor(w.y / TILE));
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (!this.blocked()) this.zoomTo(this.cameras.main.zoom * (dy > 0 ? 0.9 : 1.1));
    });
    const kb = this.input.keyboard;
    kb?.on('keydown-SPACE', () => !this.blocked() && this.events.emit('end-day'));
    kb?.on('keydown-T', () => !this.blocked() && this.openTown());
    kb?.on('keydown-H', () => this.centreOnHero());
  }

  private zoomTo(z: number): void {
    const max = 2.4 * DPR;
    this.cameras.main.setZoom(Phaser.Math.Clamp(z, this.minZoom(), max));
  }

  /** Map input waits while the hero walks or a card, the town or a battle is open. */
  blocked(): boolean {
    return !this.ready || this.walking || this.scene.isActive('Card') || this.scene.isActive('Town') || this.scene.isActive('Battle');
  }

  private hover(p: Phaser.Input.Pointer): void {
    if (!this.ready) return;
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    this.events.emit('status', this.describe(Math.floor(w.x / TILE), Math.floor(w.y / TILE)));
  }

  /** What the player sees at a tile, for the status line. */
  describe(x: number, y: number): string {
    const { adv, def } = this.session;
    const g = gridOf(def);
    if (x < 0 || y < 0 || x >= g.w || y >= g.h || !isSeen(adv, def, x, y)) return '';
    if (Math.abs(x - adv.town.x) <= 1 && (y === adv.town.y || y === adv.town.y - 1)) return `${adv.town.name}: your town`;
    const o = objectAt(adv, x, y);
    if (!o) return '';
    if (o.kind === 'monster') {
      const c = creature(o.creature!);
      const words = sizeWord(o.count ?? 1);
      return `${words[0]!.toUpperCase()}${words.slice(1)} ${c.plural}${o.id === def.goal.target ? ' (your goal)' : ''}`;
    }
    if (o.kind === 'mine') return `${MINE_NAMES[o.resource!]}: +${MINE_OUTPUT[o.resource!]} ${o.resource} a day${o.owner === 'player' ? ' (yours)' : ''}`;
    if (o.kind === 'pile') return `A pile of ${o.resource}`;
    if (o.kind === 'shrine') return `Wayside Shrine: ${SPELLS[o.spell!].name}`;
    return SITE_NAMES[o.kind];
  }

  private tap(x: number, y: number): void {
    const { adv, def } = this.session;
    const end = this.path?.[this.path.length - 1];
    this.events.emit('status', this.describe(x, y));
    if (end && end.x === x && end.y === y) {
      void this.walk(this.path!);
      return;
    }
    if (x === adv.hero.x && y === adv.hero.y && x === adv.town.x && y === adv.town.y) {
      this.openTown();
      return;
    }
    if (!isSeen(adv, def, x, y)) {
      this.setPath(null);
      return;
    }
    this.setPath(planPath(adv, def, x, y));
  }

  private setPath(path: PathStep[] | null): void {
    this.path = path;
    this.world.showPath(path);
  }

  /** Walks the planned path a step at a time, stopping for sites, monsters, the town or the day's end. */
  private async walk(path: readonly PathStep[]): Promise<void> {
    this.walking = true;
    this.setPath(null);
    let rest = [...path];
    for (const step of path) {
      const r = stepHero(this.session.adv, this.session.def, step);
      if (r.battle && r.adv === this.session.adv) {
        this.walking = false;
        this.startBattle(r.battle);
        return;
      }
      if (r.adv === this.session.adv) break;
      await this.world.walkHero(step.x, step.y, (STEP_MS * step.cost) / 100);
      getSound(this)?.play('step');
      this.session.set(r.adv);
      this.followHero();
      if (r.notes.length) getSound(this)?.play('pickup');
      for (const n of r.notes) this.events.emit('note', n, step.x, step.y);
      rest = rest.slice(1);
      if (r.battle) {
        this.walking = false;
        this.startBattle(r.battle);
        return;
      }
      if (r.town) {
        this.walking = false;
        this.openTown();
        return;
      }
      if (r.stop) break;
    }
    this.walking = false;
    // Keep showing what's left for tomorrow.
    if (rest.length) this.setPath(planPath(this.session.adv, this.session.def, rest[rest.length - 1]!.x, rest[rest.length - 1]!.y));
    this.showPrompts();
  }

  private followHero(): void {
    const cam = this.cameras.main;
    const h = this.world.hero;
    const view = cam.worldView;
    const margin = Math.min(view.width, view.height) * 0.25;
    if (h.x < view.x + margin || h.x > view.right - margin || h.y < view.y + margin || h.y > view.bottom - margin) cam.pan(h.x, h.y, 300, 'Sine.easeInOut');
  }

  startBattle(monsterId: string): void {
    this.scene.sleep('MapHud');
    this.scene.launch('Battle', { monsterId });
    this.scene.sleep();
  }

  openTown(): void {
    if (this.blocked()) return;
    this.setPath(null);
    this.scene.sleep('MapHud');
    this.scene.launch('Town');
    this.scene.sleep();
  }

  /** Called by the battle and the town when they close. */
  back(): void {
    this.scene.wake();
    this.scene.wake('MapHud');
    this.world.sync(this.session.adv);
    this.showPrompts();
  }

  /** Starts the fight with a monster guarding the hero's tile, if any (when no card is waiting). */
  private fightIfGuarded(): boolean {
    const adv = this.session.adv;
    if (adv.status !== 'playing' || adv.prompts.length) return false;
    const guard = guardAt(adv, adv.hero.x, adv.hero.y);
    if (!guard) return false;
    this.startBattle(guard.id);
    return true;
  }

  /** Opens the first waiting card, if any. */
  showPrompts(): void {
    // No "is a card open" guard: a card that just closed is still active until the next frame, and openCard replaces any open card.
    openPrompt(this, this.session);
  }

  /** Clears a planned path (the HUD calls it when the day ends). */
  clearPath(): void {
    this.setPath(null);
  }
}
