import Phaser from 'phaser';
import { BACKDROP } from '../art/palette';
import { getSound } from '../host';
import type { MapDef } from '../level/types';
import { gridOf, guardAt, heroInGarrison, holdOff, heroTown, isSeen, objectCovering, otherHeroAt, planPath, rivalHeroes, stepHero, wallsToStorm, weekOf, type Adventure } from '../logic/adventure';
import { splitRides } from './map/rivalRides';
import { rivalHeroAt } from '../logic/mapIntent';
import { wearsWords } from '../logic/sets';
import { lairWords } from '../logic/lairs';
import { trainingWords } from '../logic/training';
import { isLying, roomFor } from '../logic/lying';
import { itemDef } from '../logic/items';
import { besideEachOther, selectHero } from '../logic/heroes';
import type { Army } from '../logic/army';
import { creature, sizeWord, type CreatureId } from '../logic/creatures';
import { intentAt, townTap, townWords, type MapIntent } from '../logic/mapIntent';
import { bankName, LEARNING_XP, MINE_NAMES, MINE_OUTPUT, SITE_NAMES } from '../logic/objects';
import { dwellingName } from '../logic/dwellings';
import type { PathStep } from '../logic/path';
import type { RivalReport } from '../logic/rival';
import { SPELLS } from '../logic/spells';
import { openCard } from './CardScene';
import { openPrompt, wallsCard } from './cards';
import { tradeCard } from './hud/tradeCard';
import { DPR, toView } from './hidpi';
import { loadMapArt } from './map/pixelMapArt';
import { PixelMapWorld } from './map/pixelMapWorld';
import { GROUND_BORDER, MAP_TILE as TILE } from './map/pixelGround';
import { coverWhileLoading } from './LoadingScene';
import { prepareGround } from './map/groundPrep';
import { narratorReading } from './NarratorScene';
import { PixelCursors, type CursorKind } from './pixelCursors';
import { pixelZoom } from './pixelScreen';
import { Session } from './session';

/** A press that moves further than this (CSS px) is a drag, not a tap. */
const DRAG = 8;
/** How fast the view catches a hero it lost sight of, map pixels a millisecond (the ride's pace or better). */
const CATCH_UP = 1;
/** How fast the view flies along a newly opened way, map pixels a millisecond, how long it rests at each stop, and how much faster it comes home. */
const FLIGHT = { speed: 0.8, rest: 450, home: 2 } as const;
/** How far the zoom may step from the screen's own pixel size, either way. */
const ZOOM_STEPS = 1;
/** A pinch must grow or shrink the finger gap this much to step the zoom. */
const PINCH_STEP = 1.35;

/** The cursor that says what a tap would do. */
const CURSOR: Readonly<Record<MapIntent, CursorKind>> = { move: 'move', attack: 'attack', visit: 'visit', enter: 'enter', open: 'open' };

/**
 * The adventure map: the painted ground, sites, monsters and the heroes.
 * Tap a tile to plan a path, tap it again to go; tap another of your heroes
 * to pick them (or, beside them, to meet them); drag to look round, wheel
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
  private cursors!: PixelCursors;
  /** The tile and the state the cursor was last worked out for: a path is only searched when one changes. */
  private aim: { x: number; y: number; adv: Adventure } | null = null;

  constructor() {
    super('Map');
  }

  create(): void {
    getSound(this)?.music('map');
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
      // The ground a little each frame, so the screen keeps moving instead of freezing at the end (user, Nov 9).
      .then(() => (this.sys.isActive() ? prepareGround(this, this.session.def, (f) => cover.layingProgress(f * 0.9)) : undefined))
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
    this.cursors = new PixelCursors(this.game.canvas);
    this.aim = null;
    const plainCursor = (): void => this.clearCursor();
    this.events.on(Phaser.Scenes.Events.SLEEP, plainCursor);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.SLEEP, plainCursor);
      this.clearCursor();
    });
    this.wireInput();
    this.scene.launch('MapHud');
    this.ready = true;
    // Reloaded mid-step into a guard zone: the fight comes first.
    if (!this.fightIfGuarded()) this.showPrompts();
  }

  update(_t: number, delta: number): void {
    if (!this.ready) return;
    this.world.update(delta);
    if (this.world.heroRiding) this.followHero(delta);
    if (this.blocked()) this.clearCursor();
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
    // The pointer left the page's game: no town keeps its signs up.
    this.input.on(Phaser.Input.Events.GAME_OUT, () => this.clearCursor());
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
    return !this.ready || this.walking || this.scene.isActive('Card') || this.scene.isActive('Town') || this.scene.isActive('Battle') || narratorReading(this);
  }

  private hover(p: Phaser.Input.Pointer): void {
    if (!this.ready || this.walking) return;
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    const x = Math.floor(w.x / TILE);
    const y = Math.floor(w.y / TILE);
    this.events.emit('status', this.describe(x, y));
    this.aimCursor(x, y);
  }

  /** Shows what a tap on the tile would do. */
  private aimCursor(x: number, y: number): void {
    const { adv, def } = this.session;
    if (this.blocked() || (this.aim?.x === x && this.aim.y === y && this.aim.adv === adv)) return;
    this.aim = { x, y, adv };
    const intent = intentAt(adv, def, x, y);
    this.cursors.set(intent && CURSOR[intent]);
  }

  /** Back to the ordinary pointer: something covers the map, or the pointer left it for the HUD. */
  clearCursor(): void {
    this.aim = null;
    this.cursors.set(null);
  }

  /** What the player sees at a tile, for the status line. */
  describe(x: number, y: number): string {
    const { adv, def } = this.session;
    const g = gridOf(def);
    if (x < 0 || y < 0 || x >= g.w || y >= g.h || !isSeen(adv, def, x, y)) return '';
    const met = rivalHeroAt(adv, x, y);
    if (met && !adv.towns.some((t) => t.x === x && t.y === y)) {
      const worn = wearsWords(met);
      return `${met.name}, the rival's hero, leading ${armyWords(met.army)}${worn ? `, ${worn}` : ''}`;
    }
    const friend = otherHeroAt(adv, x, y);
    if (friend) return `${friend.name}, leading ${armyWords(friend.army)}: ${besideEachOther(adv.hero, friend) ? 'tap to meet and trade companies' : 'tap to pick'}`;
    const town = adv.towns.find((t) => Math.abs(x - t.x) <= 1 && (y === t.y || y === t.y - 1));
    const ours = townWords(adv, def, x, y);
    if (ours) return ours;
    if (town) {
      if (town.owner === 'player') return `${town.name}: your town`;
      if (town.ally) return `${town.name}: its gates will open to you`;
      // A town not ours: who holds it, the way a monster is named.
      const foe = rivalHeroes(adv)[0];
      const inside = rivalHeroAt(adv, town.x, town.y);
      const lord = town.owner === 'rival' ? ` (${foe ? `${foe.name}'s` : 'the rival\'s'} town${inside ? `, and ${inside.name} is in it` : ''})` : '';
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
    if (o.kind === 'dwelling') {
      const c = creature(o.creature!);
      const holder = o.owner === 'player' ? ' (yours)' : o.owner === 'rival' ? ' (the rival’s)' : '';
      return `${dwellingName(o)}: ${o.growth} ${o.growth === 1 ? c.name : c.plural} a week${holder}`;
    }
    if (o.kind === 'learningStone') return `Learning Stone: +${LEARNING_XP} experience${o.visitedBy?.includes(adv.hero.id) ? ' (read)' : ''}`;
    if (o.kind === 'bank') return o.looted ? `${bankName(o)} (empty)` : bankName(o);
    if (o.kind === 'lair') return lairWords(o);
    if (o.kind === 'arena' || o.kind === 'sanctum') return trainingWords(o, weekOf(adv.day));
    // A piece lying on the ground: ridden over, taken in passing when there is room (src/logic/lying.ts).
    if (isLying(o)) return `${itemDef(o.item!).name} on the ground: ${roomFor(adv.hero, o.item!) ? 'ride over it to take it' : 'no room in the bag, but the way is open'}`;
    return SITE_NAMES[o.kind];
  }

  private tap(x: number, y: number): void {
    // Tapping the rival lord heads for him (the walk ends in the fight).
    const foe = rivalHeroAt(this.session.adv, x, y);
    if (foe && isSeen(this.session.adv, this.session.def, x, y) && !heroInGarrison(this.session.adv)) {
      const end = this.path?.[this.path.length - 1];
      if (end && end.x === x && end.y === y) this.walk(this.path!);
      else this.setPath(planPath(this.session.adv, this.session.def, x, y));
      this.events.emit('status', this.describe(x, y));
      return;
    }
    const { adv, def } = this.session;
    const end = this.path?.[this.path.length - 1];
    if (this.tapTown(x, y)) return;
    if (this.tapFriend(x, y)) return;
    this.events.emit('status', this.describe(x, y));
    const on = isSeen(adv, def, x, y) ? objectCovering(adv, x, y) : undefined;
    if (end && ((end.x === x && end.y === y) || (on && end.x === on.x && end.y === on.y))) {
      this.walk(this.path!);
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

  /**
   * A tap on a town of ours (false: not one): its top opens it where the
   * hero is; its gate half plans the ride to the gate, a second tap rides in,
   * and arriving enters it as a visit. With the hero at the gate, it opens.
   */
  private tapTown(x: number, y: number): boolean {
    const { adv, def } = this.session;
    const tap = townTap(adv, def, x, y, this.path?.[this.path.length - 1]);
    if (!tap) return false;
    this.events.emit('status', this.describe(x, y));
    if (tap.kind === 'open') this.openTown(heroTown(adv)?.id === tap.town.id ? undefined : tap.town.id);
    else if (heroInGarrison(adv)) {
      this.setPath(null);
      this.events.emit('status', `${adv.hero.name} is in the garrison: lead the army out in the town`);
    } else if (tap.kind === 'ride') this.walk(this.path!);
    else this.setPath(planPath(adv, def, tap.town.x, tap.town.y));
    return true;
  }

  /**
   * A tap on another hero of ours: with a path planned to them, or standing
   * beside them, the picked hero rides over to meet them; otherwise they are
   * picked. False when no hero of ours stands there.
   */
  private tapFriend(x: number, y: number): boolean {
    const { adv, def } = this.session;
    const friend = otherHeroAt(adv, x, y);
    if (!friend) return false;
    const end = this.path?.[this.path.length - 1];
    if (end && end.x === x && end.y === y) this.walk(this.path!);
    else if (besideEachOther(adv.hero, friend) && !heroInGarrison(adv)) {
      const path = planPath(adv, def, x, y);
      if (path) this.walk(path);
      else this.pickHero(friend.id);
    } else this.pickHero(friend.id);
    return true;
  }

  /** Hero `id` of ours becomes the one moved: the path is cleared and the view goes to them. */
  pickHero(id: string): void {
    if (this.blocked() || id === this.session.adv.hero.id) return;
    const next = selectHero(this.session.adv, id);
    if (next === this.session.adv) return;
    getSound(this)?.play('card');
    this.setPath(null);
    this.session.set(next);
    this.centreOnHero();
    this.events.emit('status', `${next.hero.name} is picked`);
  }

  private setPath(path: PathStep[] | null): void {
    this.path = path;
    this.world.showPath(path);
  }

  /** Rides the planned path, stopping for sites, monsters, the town or the day's end. */
  private walk(path: readonly PathStep[]): void {
    this.walking = true;
    this.world.startRide();
    this.setPath(null);
    this.stride(path, 0);
  }

  /** Takes step `i` and, as the hero gets there, the next: the ride itself calls it, so no frame is lost at a tile. */
  private stride(path: readonly PathStep[], i: number): void {
    const step = path[i];
    if (!step) {
      this.endWalk([]);
      return;
    }
    const r = stepHero(this.session.adv, this.session.def, step, path[path.length - 1]);
    if (r.meet) {
      this.world.faceHero(step.x);
      this.endWalk([]);
      this.meet(r.meet);
      return;
    }
    if (r.adv === this.session.adv) {
      if (!r.battle) {
        this.endWalk(path.slice(i));
        return;
      }
      this.halt();
      this.world.faceHero(step.x);
      this.startBattle(r.battle, r.then);
      return;
    }
    const arrive = (): void => {
      getSound(this)?.play('step');
      this.session.set(r.adv);
      if (r.notes.length) getSound(this)?.play('pickup');
      for (const n of r.notes) this.events.emit('note', n, step.x, step.y);
      if (r.battle) {
        this.halt();
        this.startBattle(r.battle, r.then);
      } else if (r.town) {
        this.halt();
        this.openTown();
      } else if (r.stop) this.endWalk(path.slice(i + 1));
      else this.stride(path, i + 1);
    };
    // A step onto an object is a visit from beside it: the hero turns to it and stays.
    if (r.adv.hero.x === step.x && r.adv.hero.y === step.y) this.world.walkHero(step.x, step.y, arrive);
    else {
      this.world.faceHero(step.x);
      arrive();
    }
  }

  /** The picked hero has met hero `id` of ours: the card where they trade companies. */
  private meet(id: string): void {
    openCard(this, tradeCard(this.session, id));
  }

  /** Stops at once, for a scene about to open. */
  private halt(): void {
    this.walking = false;
    this.world.stopRide(true);
  }

  /** The ride is over: what's `rest` stays planned for tomorrow. */
  private endWalk(rest: readonly PathStep[]): void {
    this.walking = false;
    this.world.stopRide();
    const end = rest[rest.length - 1];
    if (end) this.setPath(planPath(this.session.adv, this.session.def, end.x, end.y));
    this.showPrompts();
    // The pointer has not moved, but what lies under it may have changed.
    if (!this.session.adv.prompts.length) this.hover(this.input.activePointer);
  }

  /** Keeps the hero inside the middle of the screen: past its edge the view moves with the rider, pixel for pixel. */
  private followHero(delta: number): void {
    const h = this.world.heroFeet;
    const vw = this.scale.width / this.k;
    const vh = this.scale.height / this.k;
    const margin = Math.min(vw, vh) * 0.25;
    const reach = delta * CATCH_UP;
    const pull = (over: number, free: number): number => Phaser.Math.Clamp(over > free ? over - free : over < -free ? over + free : 0, -reach, reach);
    this.view = { x: this.view.x + pull(h.x - this.view.x, vw / 2 - margin), y: this.view.y + pull(h.y - this.view.y, vh / 2 - margin) };
    this.applyView();
  }

  startBattle(monsterId: string, then?: string, warned = false): void {
    const walls = warned ? undefined : wallsToStorm(this.session.adv, monsterId);
    if (walls) {
      openCard(this, wallsCard(walls, this.session.adv, () => this.startBattle(monsterId, then, true)));
      return;
    }
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

  /** The town screen's "Ride here": the town closes and the hero rides `path`. */
  rideTo(path: readonly PathStep[]): void {
    this.back();
    this.walk(path);
  }

  /** Called by the battle and the town when they close. */
  back(): void {
    this.events.emit('status', '');
    getSound(this)?.music('map');
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
      // The walls after his gate was won, stormed with no war machine: warned first, as any siege ("Not yet" leaves them for later).
      const fight = adv.rivalFight;
      const walls = wallsToStorm(adv, fight);
      if (walls) {
        openCard(this, wallsCard(walls, adv, () => this.startBattle(fight, undefined, true), () => this.session.set(holdOff(this.session.adv))));
        return;
      }
      this.startBattle(fight, undefined, true);
      return;
    }
    const opening = !adv.prompts.length && adv.status === 'playing' ? this.session.takeOpening() : undefined;
    if (opening) {
      this.flyAlong(opening);
      return;
    }
    // No "is a card open" guard: a card that just closed is still active until the next frame, and openCard replaces any open card.
    openPrompt(this, this.session);
  }

  /** Flies the view along the way a part opened and back to the hero; a tap cuts it short. */
  private flyAlong({ text, way }: NonNullable<MapDef['opening']>): void {
    const centre = (t: { x: number; y: number }): { x: number; y: number } => ({ x: (t.x + 0.5) * TILE, y: (t.y + 0.5) * TILE });
    const stops = [...way.map(centre), centre(this.session.adv.hero)];
    const eye = { ...this.view };
    let from = eye;
    const legs = stops.map((to, i) => {
      const home = i === stops.length - 1;
      const duration = Phaser.Math.Distance.BetweenPoints(from, to) / (FLIGHT.speed * (home ? FLIGHT.home : 1));
      from = to;
      return { ...to, duration, hold: home ? 0 : FLIGHT.rest, ease: 'Sine.easeInOut', onUpdate: () => this.lookAt(eye) };
    });
    const land = (): void => {
      this.input.off('pointerdown', cut);
      this.walking = false;
      this.events.emit('status', '');
      this.centreOnHero();
    };
    const flight = this.tweens.chain({ targets: eye, tweens: legs, onComplete: land });
    const cut = (): void => {
      flight.stop();
      land();
    };
    this.walking = true;
    this.setPath(null);
    this.events.emit('status', text);
    this.input.once('pointerdown', cut);
  }

  private lookAt(at: { x: number; y: number }): void {
    this.view = { ...at };
    this.applyView();
  }

  /** Shows the rival lord riding his path, on the tiles the player has seen (he slips through the rest unseen). */
  async showRival(before: Adventure, report: RivalReport): Promise<void> {
    if (!this.ready || !report.path.length) {
      this.world.sync(this.session.adv);
      return;
    }
    const { def } = this.session;
    this.walking = true;
    // Each hero of his on his own figure, in the order they rode (a lord rides with several).
    const after = this.session.adv;
    const rides = splitRides(report.path, rivalHeroes(before), rivalHeroes(after));
    // Every hero of his where he stood at dusk: one hired tonight where his ride begins (unseen in the fog).
    const hired = rivalHeroes(after).filter((h) => !rivalHeroes(before).some((b) => b.id === h.id));
    const dusk = [...rivalHeroes(before), ...hired.map((h) => ({ ...h, ...(rides.find((r) => r.id === h.id)?.tiles[0] ?? {}) }))];
    this.world.placeRival(before, dusk);
    await this.world.rideRivals(rides, (x, y) => isSeen(before, def, x, y));
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
