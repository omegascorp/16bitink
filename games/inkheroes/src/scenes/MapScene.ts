import Phaser from 'phaser';
import { BACKDROP } from '../art/palette';
import { getSound } from '../host';
import { gridOf, guardAt, heroInGarrison, heroTown, isSeen, objectCovering, planPath, rivalHero, stepHero, type Adventure } from '../logic/adventure';
import type { Army } from '../logic/army';
import { creature, sizeWord, type CreatureId } from '../logic/creatures';
import { MINE_NAMES, MINE_OUTPUT, SITE_NAMES } from '../logic/objects';
import type { PathStep } from '../logic/path';
import type { RivalReport } from '../logic/rival';
import { SPELLS } from '../logic/spells';
import { openPrompt } from './cards';
import { DPR, toView } from './hidpi';
import { loadMapArt } from './map/pixelMapArt';
import { PixelMapWorld } from './map/pixelMapWorld';
import { GROUND_BORDER, MAP_TILE as TILE } from './map/pixelGround';
import { coverWhileLoading } from './LoadingScene';
import { pixelZoom } from './pixelScreen';
import { Session } from './session';

/** A press that moves further than this (CSS px) is a drag, not a tap. */
const DRAG = 8;
/** Milliseconds a hero takes per 100 movement points. */
const STEP_MS = 150;
/** How far the zoom may step from the screen's own pixel size, either way. */
const ZOOM_STEPS = 1;
/** A pinch must grow or shrink the finger gap this much to step the zoom. */
const PINCH_STEP = 1.35;

/**
 * The adventure map: the painted ground, sites, monsters and the hero.
 * Tap a tile to plan a path, tap it again to go; drag to look round, wheel
 * or pinch to zoom. Its HUD (MapHudScene) runs on top.
 */
export class MapScene extends Phaser.Scene {
  private session!: Session;
  private world!: PixelMapWorld;
  /** Device pixels per art pixel: a whole number, so the art stays on its grid. */
  private k = 2;
  /** The world point at the middle of the screen; the camera scrolls by whole pixels round it. */
  private view = { x: 0, y: 0 };
  private path: PathStep[] | null = null;
  private walking = false;
  private press: { x: number; y: number; sx: number; sy: number; moved: boolean } | null = null;
  private pinch: { dist: number; k: number } | null = null;
  private ready = false;

  constructor() {
    super('Map');
  }

  create(): void {
    this.session = Session.get(this);
    this.ready = false;
    this.path = null;
    this.walking = false;
    this.cameras.main.setBackgroundColor(BACKDROP);
    // The loading screen stays up until the map's art is in and its ground painted.
    const cover = coverWhileLoading(this, 'unrolling the map…');
    // The map's art, the hero's ride and everyone's idle loop.
    const monsters = [...new Set(this.session.def.objects.flatMap((o) => (o.kind === 'monster' && o.creature ? [o.creature] : [])))];
    void loadMapArt(this, monsters)
      .then(() => cover.laying('painting the land…'))
      .then(() => {
        // The scene may have been left while its art was loading.
        if (this.sys.isActive()) this.build();
        cover.close();
      });
  }

  private build(): void {
    const { def } = this.session;
    this.world = new PixelMapWorld(this, def, this.session.adv);
    this.cameras.main.setOrigin(0).setRoundPixels(true);
    this.k = pixelZoom(this.scale);
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

  /** A new screen keeps the same spot in the middle at the screen's own pixel size. */
  private fitZoom(): void {
    this.k = pixelZoom(this.scale);
    this.applyView();
  }

  /** The zooms allowed on this screen, device pixels per art pixel. */
  private zoomRange(): { min: number; max: number } {
    const base = pixelZoom(this.scale);
    return { min: Math.max(1, base - ZOOM_STEPS), max: base + ZOOM_STEPS };
  }

  /** Points the camera at `view` (kept inside the map and its border), scrolled by whole art pixels. */
  private applyView(): void {
    const g = gridOf(this.session.def);
    const cam = this.cameras.main;
    const vw = this.scale.width / this.k;
    const vh = this.scale.height / this.k;
    const lo = -GROUND_BORDER * TILE;
    const span = { w: (g.w + GROUND_BORDER * 2) * TILE, h: (g.h + GROUND_BORDER * 2) * TILE };
    const clamp = (v: number, size: number, view: number): number => (view >= size ? lo + size / 2 : Phaser.Math.Clamp(v, lo + view / 2, lo + size - view / 2));
    this.view = { x: clamp(this.view.x, span.w, vw), y: clamp(this.view.y, span.h, vh) };
    cam.setZoom(this.k).setScroll(Math.round(this.view.x - vw / 2), Math.round(this.view.y - vh / 2));
  }

  centreOnHero(): void {
    const h = this.session.adv.hero;
    this.view = { x: (h.x + 0.5) * TILE, y: (h.y + 0.5) * TILE };
    this.applyView();
  }

  private wireInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.blocked()) return;
      const pointers = this.input.manager.pointers.filter((q) => q.isDown);
      if (pointers.length >= 2) {
        const [a, b] = pointers;
        this.pinch = { dist: Phaser.Math.Distance.Between(a!.x, a!.y, b!.x, b!.y), k: this.k };
        this.press = null;
        return;
      }
      const v = toView(p.x, p.y);
      this.press = { x: v.x, y: v.y, sx: this.view.x, sy: this.view.y, moved: false };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.pinch) {
        const pointers = this.input.manager.pointers.filter((q) => q.isDown);
        if (pointers.length >= 2) {
          const [a, b] = pointers;
          const d = Phaser.Math.Distance.Between(a!.x, a!.y, b!.x, b!.y);
          const steps = Math.round(Math.log(d / this.pinch.dist) / Math.log(PINCH_STEP));
          this.zoomTo(this.pinch.k + steps);
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
        const z = this.k / DPR;
        this.view = { x: this.press.sx - (v.x - this.press.x) / z, y: this.press.sy - (v.y - this.press.y) / z };
        this.applyView();
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
      if (!this.blocked()) this.zoomTo(this.k + (dy > 0 ? -1 : 1));
    });
    const kb = this.input.keyboard;
    kb?.on('keydown-SPACE', () => !this.blocked() && this.events.emit('end-day'));
    kb?.on('keydown-T', () => !this.blocked() && this.openTown());
    kb?.on('keydown-H', () => this.centreOnHero());
  }

  /** Steps to zoom `k` (whole, within the range), keeping the middle of the screen where it is. */
  private zoomTo(k: number): void {
    const r = this.zoomRange();
    const next = Phaser.Math.Clamp(Math.round(k), r.min, r.max);
    if (next === this.k) return;
    this.k = next;
    this.applyView();
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
    const foe = rivalHero(adv);
    if (foe && foe.x === x && foe.y === y && !adv.towns.some((t) => t.x === x && t.y === y)) return `${foe.name} of the Black Banner, leading ${armyWords(foe.army)}`;
    const town = adv.towns.find((t) => Math.abs(x - t.x) <= 1 && (y === t.y || y === t.y - 1));
    if (town) {
      if (town.owner === 'player') return `${town.name}: your town`;
      if (town.ally) return `${town.name}: its gates will open to you`;
      // A town not ours: who holds it, the way a monster is named.
      const lord = town.owner === 'rival' ? ` (${foe ? `${foe.name}'s` : 'the Black Banner\'s'} town${foe && foe.x === town.x && foe.y === town.y ? `, and ${foe.name} is in it` : ''})` : '';
      return `${town.name}${lord}: held by ${armyWords(town.garrison)}${town.id === def.goal.target ? ' (your goal)' : ''}`;
    }
    const o = objectCovering(adv, x, y);
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
    // Tapping the rival lord heads for him (the walk ends in the fight).
    const foe = rivalHero(this.session.adv);
    if (foe && foe.x === x && foe.y === y && isSeen(this.session.adv, this.session.def, x, y) && !heroInGarrison(this.session.adv)) {
      const end = this.path?.[this.path.length - 1];
      if (end && end.x === x && end.y === y) void this.walk(this.path!);
      else this.setPath(planPath(this.session.adv, this.session.def, x, y));
      this.events.emit('status', this.describe(x, y));
      return;
    }
    const { adv, def } = this.session;
    const end = this.path?.[this.path.length - 1];
    this.events.emit('status', this.describe(x, y));
    const on = isSeen(adv, def, x, y) ? objectCovering(adv, x, y) : undefined;
    if (end && ((end.x === x && end.y === y) || (on && end.x === on.x && end.y === on.y))) {
      void this.walk(this.path!);
      return;
    }
    if (x === adv.hero.x && y === adv.hero.y && heroTown(adv)) {
      this.openTown();
      return;
    }
    if (!isSeen(adv, def, x, y)) {
      this.setPath(null);
      return;
    }
    // A hero in the garrison has no companies to travel with: they lead them out from the town first.
    if (heroInGarrison(adv)) {
      this.setPath(null);
      this.events.emit('status', `${adv.hero.name} is in the garrison: lead the army out in the town`);
      return;
    }
    // A tap anywhere on an object's picture heads for the object itself.
    const o = objectCovering(adv, x, y);
    this.setPath(planPath(adv, def, o?.x ?? x, o?.y ?? y));
  }

  private setPath(path: PathStep[] | null): void {
    this.path = path;
    this.world.showPath(path);
  }

  /** Walks the planned path a step at a time, stopping for sites, monsters, the town or the day's end. */
  private async walk(path: readonly PathStep[]): Promise<void> {
    this.walking = true;
    this.world.startRide();
    this.setPath(null);
    let rest = [...path];
    const goal = path[path.length - 1];
    for (const step of path) {
      const r = stepHero(this.session.adv, this.session.def, step, goal);
      if (r.battle && r.adv === this.session.adv) {
        this.walking = false;
        this.world.stopRide(true);
        this.world.faceHero(step.x);
        this.startBattle(r.battle, r.then);
        return;
      }
      if (r.adv === this.session.adv) break;
      // A step onto an object is a visit from beside it: the hero turns to it and stays.
      const visit = r.adv.hero.x !== step.x || r.adv.hero.y !== step.y;
      if (visit) this.world.faceHero(step.x);
      else await this.world.walkHero(step.x, step.y, (STEP_MS * step.cost) / 100);
      getSound(this)?.play('step');
      this.session.set(r.adv);
      this.followHero();
      if (r.notes.length) getSound(this)?.play('pickup');
      for (const n of r.notes) this.events.emit('note', n, step.x, step.y);
      rest = rest.slice(1);
      if (r.battle) {
        this.walking = false;
        this.world.stopRide(true);
        this.startBattle(r.battle, r.then);
        return;
      }
      if (r.town) {
        this.walking = false;
        this.world.stopRide(true);
        this.openTown();
        return;
      }
      if (r.stop) break;
    }
    this.walking = false;
    this.world.stopRide();
    // Keep showing what's left for tomorrow.
    if (rest.length) this.setPath(planPath(this.session.adv, this.session.def, rest[rest.length - 1]!.x, rest[rest.length - 1]!.y));
    this.showPrompts();
  }

  /** Glides the view to the hero when the hero nears the screen's edge. */
  private followHero(): void {
    const h = this.world.heroFeet;
    const vw = this.scale.width / this.k;
    const vh = this.scale.height / this.k;
    const margin = Math.min(vw, vh) * 0.25;
    const dx = Math.abs(h.x - this.view.x);
    const dy = Math.abs(h.y - this.view.y);
    if (dx < vw / 2 - margin && dy < vh / 2 - margin) return;
    this.tweens.add({ targets: this.view, x: h.x, y: h.y, duration: 300, ease: 'Sine.easeInOut', onUpdate: () => this.applyView() });
  }

  startBattle(monsterId: string, then?: string): void {
    this.scene.sleep('MapHud');
    this.scene.launch('Battle', { monsterId, then });
    this.scene.sleep();
  }

  /** Opens town `townId`, or the one the hero is in, or the first. */
  openTown(townId?: string): void {
    if (this.blocked()) return;
    this.setPath(null);
    this.scene.sleep('MapHud');
    // Always an object: a launch with no data keeps the last town opened.
    this.scene.launch('Town', { townId });
    this.scene.sleep();
  }

  /** Called by the battle and the town when they close. */
  back(): void {
    this.events.emit('status', '');
    this.scene.wake();
    this.scene.wake('MapHud');
    this.world.sync(this.session.adv);
    this.showPrompts();
  }

  /** Starts the fight with a monster guarding the hero's tile, if any (when no card is waiting). */
  private fightIfGuarded(): boolean {
    const adv = this.session.adv;
    if (adv.status !== 'playing' || adv.prompts.length || heroInGarrison(adv)) return false;
    const guard = guardAt(adv, adv.hero.x, adv.hero.y);
    if (!guard) return false;
    this.startBattle(guard.id);
    return true;
  }

  /** Opens the first waiting card, if any; with none left, the fight the rival started. */
  showPrompts(): void {
    const adv = this.session.adv;
    if (!adv.prompts.length && adv.status === 'playing' && adv.rivalFight) {
      this.startBattle(adv.rivalFight);
      return;
    }
    // No "is a card open" guard: a card that just closed is still active until the next frame, and openCard replaces any open card.
    openPrompt(this, this.session);
  }

  /** Shows the rival lord riding his path, on the tiles the player has seen (he slips through the rest unseen). */
  async showRival(before: Adventure, report: RivalReport): Promise<void> {
    if (!this.ready || !report.path.length) {
      this.world.sync(this.session.adv);
      return;
    }
    const { def } = this.session;
    this.walking = true;
    this.world.placeRival(before);
    for (const t of report.path) {
      if (isSeen(before, def, t.x, t.y)) await this.world.walkRival(t.x, t.y, STEP_MS);
      else this.world.hideRival();
    }
    this.walking = false;
    this.world.sync(this.session.adv);
  }

  /** Clears a planned path (the HUD calls it when the day ends). */
  clearPath(): void {
    this.setPath(null);
  }
}

/** "lots of Hoplites and several Slingers": an army as the map names it, like a monster. */
function armyWords(army: Army): string {
  const held = new Map<CreatureId, number>();
  for (const s of army) if (s) held.set(s.creature, (held.get(s.creature) ?? 0) + s.count);
  const parts = [...held].map(([c, n]) => `${sizeWord(n)} ${creature(c).plural}`);
  return parts.length ? parts.slice(0, -1).join(', ') + (parts.length > 1 ? ' and ' : '') + parts[parts.length - 1] : 'nobody';
}
