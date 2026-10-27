import { boulder, circleContact, CRUSH_SPEED, separate, stepBoulder, type Boulder } from './boulders';
import { capsuleContact, segSegDistance, type Contact, type Seg } from './geom';
import type { DrainDef, FillDef, LevelDef, PinDef, VineDef } from './level';
import { COIN, GRAIN_R, GRAVITY, Grains, LAVA, STEPS_PER_SECOND, STONE, WATER, type GrainEvent } from './particles';

/**
 * One level in play: the grains, the pins, Nib and the Blots, and the rules
 * that end it. Pure and deterministic: the scene draws it and feeds it pulls,
 * and the tests drive the very same object.
 */

export const NIB_R = 24;
export const BLOT_R = 22;
/** The boss guard: a big one. */
export const BOSS_R = 40;
/** Walking speeds in px per step. */
const NIB_WALK = 0.95;
const BLOT_WALK = 0.55;
/** A Blot sees Nib this far away sideways, and only on about its own level (px). */
const BLOT_SIGHT_X = 220;
const BLOT_SIGHT_Y = 50;
/** Steps a patrolling Blot pushes against something before it turns round. */
const BLOT_TURN_STEPS = 30;
/** Nib must be falling at least this fast (px per step) to stomp a guard, and bounces off at this share of a jump. */
const STOMP_SPEED = 0.4;
const STOMP_BOUNCE = 0.75;
/** Water a Blot can soak up (grain contacts summed over steps) before it washes away. */
const BLOT_SOAK = 260;
/** The boss soaks up far more, and dries off as it goes, so only a flood all at once washes it away. */
const BOSS_SOAK = 70;
const BOSS_DRY = 10;
const BOSS_SIGHT_X = 320;
/** Climbing speed on a vine (px per step). */
const CLIMB_SPEED = 0.8;
/** Nib holds a vine this close to it sideways, and a tap this close to one is a tap on the vine (px). */
const VINE_GRAB = 14;
const VINE_TAP = 40;
/** The highest step a creature climbs without stopping (px): a raccoon hauls itself up a ledge. */
const STEP_UP = 44;
/** Reaching the chest: this close sideways, and not far above or below it. */
const CHEST_REACH_X = 44;
const CHEST_REACH_ABOVE = 90;
const CHEST_REACH_BELOW = 24;
/** The world counts as settled once nothing moves faster than this (px per step). */
const SETTLED_SPEED = 0.35;
/** How far past its length a pin must slide to be clear: its ring. */
const PIN_RING_CLEAR = 28;
/** Steps the grains run before a level starts, to settle against the pins. */
const PRESETTLE_STEPS = STEPS_PER_SECOND * 3;
/** Nib's take-off speed (px per step): about 55 px high. */
const JUMP_SPEED = 2.9;
/** Steps a 'goto' may make no headway before Nib gives up and stays. */
const GOTO_PATIENCE = 40;
/**
 * Steps a creature still counts as standing after losing touch with the
 * ground: loose stone and coins make it jitter, and it must keep walking,
 * climbing and jumping through that.
 */
export const FOOTING_STEPS = 8;
/** How far past its body Nib picks coins up (px). */
const PICKUP_REACH = 8;
/**
 * How far below its middle Nib digs coins out (px): gold that slipped
 * between stones or sank to the bottom of a pool is never out of reach.
 */
const DIG_DEPTH = 130;
/** Swimming, Nib dives for the gold at the bottom of the pool, however deep. */
const DIG_DEPTH_SWIM = 380;
/** Stones below this fraction of Nib's radius under its middle are floor; higher ones it kicks aside. */
const KICK_BELOW = 0.5;

export type LossCause = 'burnt' | 'inked' | 'pricked' | 'melted' | 'drained' | 'crushed' | 'fell';

/**
 * What the player has told Nib to do: stay put, walk one way (arrow keys,
 * joystick), climb a vine up or down, or go to a spot (a tap: on the floor,
 * or on a vine, when it has a height).
 */
export type NibOrder =
  | { readonly kind: 'stay' }
  | { readonly kind: 'walk'; readonly dir: -1 | 1 }
  | { readonly kind: 'climb'; readonly dir: -1 | 1 }
  | { readonly kind: 'goto'; readonly x: number; readonly y?: number };
export type Status = { readonly state: 'playing' } | { readonly state: 'won' } | { readonly state: 'lost'; readonly cause: LossCause };

export type WorldEvent =
  | GrainEvent
  | { readonly type: 'pull'; readonly id: string }
  | { readonly type: 'blocked'; readonly id: string; readonly by: string }
  | { readonly type: 'collect'; readonly id: number; readonly x: number; readonly y: number }
  | { readonly type: 'goal' }
  | { readonly type: 'washed'; readonly x: number; readonly y: number }
  | { readonly type: 'scorched'; readonly x: number; readonly y: number }
  | { readonly type: 'stomped'; readonly x: number; readonly y: number }
  | { readonly type: 'bonk'; readonly x: number; readonly y: number }
  | { readonly type: 'drained'; readonly x: number; readonly y: number }
  | { readonly type: 'splash'; readonly x: number; readonly y: number }
  | { readonly type: 'chest'; readonly x: number; readonly y: number }
  | { readonly type: 'jump' };

export interface Creature {
  x: number;
  y: number;
  vx: number;
  vy: number;
  readonly r: number;
  grounded: boolean;
  /** Steps since it last stood on something. */
  air: number;
  /** Water grains touching it this step. */
  wet: number;
  /** -1 left, 1 right: the way it faces. */
  facing: number;
}

/** How a guard is beaten: washed away, scorched, or stomped flat. */
export type BlotEnd = 'washed' | 'scorched' | 'stomped';

export interface Blot extends Creature {
  readonly spiky: boolean;
  readonly boss: boolean;
  soaked: number;
  /** Set when it's gone: washed away or dried to smoke. */
  gone: BlotEnd | null;
  goneAt: number;
  /** Steps it has walked without getting anywhere: it turns round. */
  stuck: number;
}

export interface PinState {
  readonly def: PinDef;
  pulledAt: number | null;
}

export class World {
  readonly grains: Grains;
  readonly pins: PinState[];
  readonly nib: Creature;
  readonly blots: Blot[];
  readonly boulders: Boulder[];
  readonly coinsTotal: number;
  coinsCollected = 0;
  /** True once Nib has opened the chest and taken its treasure. */
  chestTaken = false;
  /**
   * True once Nib has the chest and enough coins. The level goes on, so the
   * rest of the gold can be picked up; it ends when Nib leaves or none is left.
   */
  goalMet = false;
  steps = 0;
  status: Status = { state: 'playing' };
  /** What happened during the last step, for the scene's effects and sounds. */
  readonly events: WorldEvent[] = [];
  private quietSteps = 0;
  private order: NibOrder = { kind: 'stay' };
  /** Steps a 'goto' has made no headway (a wall, a pin in the way): it gives up. */
  private stalled = 0;
  /** Pulls made between steps, reported with the next step's events. */
  private pending: WorldEvent[] = [];
  private segs: Seg[] = [];
  private readonly contact: Contact = { nx: 0, ny: 0, depth: 0 };
  /** The vine Nib is holding, if any. */
  private climbing: VineDef | null = null;
  /** What took the gold that's gone, for the loss: lava or the drain. */
  private goldLostTo: 'melted' | 'drained' = 'melted';
  /** Below this, Nib has fallen out of the level. */
  private readonly floorY: number;

  constructor(readonly level: LevelDef) {
    const total = level.fills.reduce((n, f) => n + f.count, 0);
    this.grains = new Grains(total + 16);
    for (const f of level.fills) fill(this.grains, f);
    this.pins = level.pins.map((def) => ({ def, pulledAt: null }));
    this.nib = creature(level.nib.x, level.nib.y, NIB_R, 1);
    this.blots = level.blots.map((b) => ({ ...creature(b.x, b.y, b.boss ? BOSS_R : BLOT_R, -1), spiky: b.spiky ?? false, boss: b.boss ?? false, soaked: 0, gone: null, goneAt: 0, stuck: 0 }));
    this.boulders = (level.boulders ?? []).map((b) => boulder(b.x, b.y));
    this.floorY = Math.max(...level.rooms.flatMap((r) => r.map(([, y]) => y))) + 70;
    this.rebuildSegs();
    // Let everything settle against the pins before play starts, so a level
    // opens at rest: still pools, coins asleep.
    const scratch: GrainEvent[] = [];
    for (let i = 0; i < PRESETTLE_STEPS; i++) {
      scratch.length = 0;
      this.grains.step(this.segs, scratch);
      this.drain();
      this.moveBoulders();
    }
    this.events.length = 0;
    this.coinsTotal = this.grains.countOf(COIN);
  }

  /** Coins still in play plus those in Nib's sack. */
  get treasure(): number {
    return this.coinsCollected + this.grains.countOf(COIN);
  }

  /** Tells Nib what to do. */
  command(order: NibOrder): void {
    if (this.finished) return;
    this.order = order;
    this.stalled = 0;
  }

  /**
   * Nib jumps, if standing on something (or swimming, a smaller hop). The
   * jump clears a low ledge or a Blot-sized gap, never a pit wall.
   */
  jump(): boolean {
    if (this.finished) return false;
    const nib = this.nib;
    if (this.climbing) {
      this.climbing = null;
      this.order = { kind: 'stay' };
    }
    if (nib.air <= FOOTING_STEPS) nib.vy = -JUMP_SPEED;
    else if (nib.wet > 3) nib.vy = -JUMP_SPEED * 0.8;
    else return false;
    nib.grounded = false;
    nib.air = FOOTING_STEPS + 1;
    this.pending.push({ type: 'jump' });
    return true;
  }

  /** Nib leaves the ruin with what it carries: only once the goal is met. */
  leave(): boolean {
    if (this.finished || !this.goalMet) return false;
    this.status = { state: 'won' };
    return true;
  }

  /** True while Nib holds a vine. */
  get onVine(): boolean {
    return this.climbing !== null;
  }

  /** True when Nib is holding a vine or close enough to grab one: the up key climbs instead of jumping. */
  canClimb(): boolean {
    return this.climbing !== null || this.vineAt() !== null;
  }

  /** What Nib is doing now (a 'goto' reverts to 'stay' on arrival). */
  get nibOrder(): NibOrder {
    return this.order;
  }

  get finished(): boolean {
    return this.status.state !== 'playing';
  }

  /**
   * Pulls a pin. Returns false when it's already out, the level is over, or
   * another pin is in the way (then a 'blocked' event says which).
   */
  pull(id: string): boolean {
    if (this.finished) return false;
    const pin = this.pins.find((p) => p.def.id === id);
    if (!pin || pin.pulledAt !== null) return false;
    const by = this.blockedBy(pin.def);
    if (by) {
      this.pending.push({ type: 'blocked', id, by });
      return false;
    }
    pin.pulledAt = this.steps;
    this.rebuildSegs();
    this.grains.wakeAll();
    this.pending.push({ type: 'pull', id });
    this.quietSteps = 0;
    return true;
  }

  /**
   * The pin in the way of `def` sliding out, if any. A pin slides out past
   * its ring, by its own length; another pin still in that path stops it.
   * Pins only ever block each other: rock and walls never do.
   */
  blockedBy(def: PinDef): string | null {
    const len = Math.hypot(def.bx - def.ax, def.by - def.ay) || 1;
    const ux = (def.ax - def.bx) / len;
    const uy = (def.ay - def.by) / len;
    const reach = len + PIN_RING_CLEAR;
    const path: Seg = { ax: def.ax, ay: def.ay, bx: def.ax + ux * reach, by: def.ay + uy * reach, t: def.t };
    for (const other of this.pins) {
      if (other.pulledAt !== null || other.def.id === def.id) continue;
      if (segSegDistance(path, other.def) < def.t + other.def.t) return other.def.id;
    }
    return null;
  }

  /** True when nothing is moving: the tests pull the next pin then. */
  get settled(): boolean {
    return this.quietSteps > 20;
  }

  step(): void {
    this.events.length = 0;
    this.events.push(...this.pending);
    this.pending.length = 0;
    if (this.finished) return;
    this.steps++;
    this.grains.step(this.segs, this.events as GrainEvent[]);
    if (this.events.some((e) => e.type === 'melt')) this.goldLostTo = 'melted';
    this.drain();
    this.moveBoulders();
    for (const b of this.blots) if (!b.gone) this.moveBlot(b);
    this.moveNib();
    this.judge();
  }

  private rebuildSegs(): void {
    this.segs = [...this.level.walls, ...this.pins.filter((p) => p.pulledAt === null).map((p) => p.def)];
  }

  /** Grains in a drain's box are gone down it. */
  private drain(): void {
    const drains = this.level.drains;
    if (!drains?.length) return;
    const g = this.grains;
    for (let i = 0; i < g.count; i++) {
      const k = g.kind[i];
      if (k === STONE || k === 0) continue;
      const d = drains.find((d) => inBox(d, g.x[i]!, g.y[i]!));
      if (!d) continue;
      g.remove(i);
      if (k === COIN) {
        this.goldLostTo = 'drained';
        this.events.push({ type: 'drained', x: g.x[i]!, y: g.y[i]! });
      }
    }
  }

  private moveBoulders(): void {
    const bs = this.boulders;
    for (const b of bs) stepBoulder(b, this.segs, this.grains, this.contact);
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) separate(bs[i]!, bs[j]!);
  }

  /** The vine within Nib's reach, if any. */
  private vineAt(): VineDef | null {
    const nib = this.nib;
    return this.level.vines?.find((v) => Math.abs(v.x - nib.x) < VINE_GRAB * 2 && nib.y > v.top - nib.r - 8 && nib.y < v.bottom - nib.r + 8) ?? null;
  }

  /** The vine a tap at (x, y) lands on, if any. */
  private vineNear(x: number, y: number): VineDef | null {
    return this.level.vines?.find((v) => Math.abs(v.x - x) < VINE_TAP && y > v.top - 70 && y < v.bottom + 30) ?? null;
  }

  /**
   * Nib walks only when told: one way, or to a spot, where Nib stops. On a
   * vine it climbs, and holds on while told to stay.
   */
  private moveNib(): void {
    const nib = this.nib;
    const o = this.order;
    if (o.kind === 'goto' && o.y !== undefined) {
      const vine = this.vineNear(o.x, o.y);
      if (vine) return this.gotoVine(vine, o.y);
    }
    if (o.kind === 'climb') {
      const vine = this.climbing ?? this.vineAt();
      if (vine) {
        this.climbing = vine;
        return this.moveCreature(nib, 0, true, o.dir);
      }
      this.order = { kind: 'stay' };
    }
    if (this.climbing && this.order.kind === 'stay') return this.moveCreature(nib, 0, true, 0);
    this.climbing = null;
    let walk = 0;
    if (o.kind === 'walk') walk = o.dir * NIB_WALK;
    else if (o.kind === 'goto') {
      const gap = o.x - nib.x;
      if (Math.abs(gap) < 4 || this.stalled > GOTO_PATIENCE) this.order = { kind: 'stay' };
      else walk = Math.sign(gap) * NIB_WALK;
    }
    if (walk !== 0) nib.facing = Math.sign(walk);
    const before = nib.x;
    this.moveCreature(nib, walk, true);
    if (o.kind === 'goto') this.stalled = Math.abs(nib.x - before) < 0.05 ? this.stalled + 1 : 0;
  }

  /** A tap on a vine: walk to it, take hold, and climb to the spot tapped. */
  private gotoVine(vine: VineDef, y: number): void {
    const nib = this.nib;
    const holding = this.climbing === vine;
    const within = Math.abs(nib.x - vine.x) < VINE_GRAB && nib.y > vine.top - nib.r - 8 && nib.y < vine.bottom - nib.r + 8;
    if (holding || within) {
      this.climbing = vine;
      const target = Math.min(vine.bottom - nib.r, Math.max(vine.top - nib.r, y - nib.r));
      const gap = target - nib.y;
      if (Math.abs(gap) < 3) {
        this.order = { kind: 'stay' };
        return this.moveCreature(nib, 0, true, 0);
      }
      return this.moveCreature(nib, 0, true, gap > 0 ? 1 : -1);
    }
    this.climbing = null;
    const walk = Math.sign(vine.x - nib.x) * NIB_WALK;
    if (walk !== 0) nib.facing = Math.sign(walk);
    const before = nib.x;
    this.moveCreature(nib, walk, true);
    this.stalled = Math.abs(nib.x - before) < 0.05 ? this.stalled + 1 : 0;
    if (this.stalled > GOTO_PATIENCE) this.order = { kind: 'stay' };
  }

  /**
   * A Blot patrols its room, turning at walls and edges, and goes for Nib
   * once Nib is close and on its level.
   */
  private moveBlot(b: Blot): void {
    const nib = this.nib;
    // The boss keeps its eyes on Nib wherever it is, and waits below.
    const seesNib = b.boss ? Math.abs(nib.x - b.x) < BOSS_SIGHT_X : Math.abs(nib.x - b.x) < BLOT_SIGHT_X && Math.abs(nib.y - b.y) < BLOT_SIGHT_Y;
    if (seesNib) {
      b.facing = Math.sign(nib.x - b.x) || b.facing;
      // At an edge it stops and waits rather than walking off.
      if (this.edgeAhead(b)) {
        this.moveCreature(b, 0, false);
        this.soak(b);
        return;
      }
    } else if (b.stuck > BLOT_TURN_STEPS || this.edgeAhead(b)) {
      b.facing = -b.facing;
      b.stuck = 0;
    }
    const before = b.x;
    this.moveCreature(b, b.facing * BLOT_WALK, false);
    b.stuck = Math.abs(b.x - before) < 0.1 ? b.stuck + 1 : 0;
    this.soak(b);
  }

  /** Water soaks into a guard until it washes away; the boss dries off as it goes. */
  private soak(b: Blot): void {
    if (b.gone) return;
    if (b.boss) b.soaked = Math.max(0, b.soaked - BOSS_DRY);
    if (b.wet > 0) {
      b.soaked += b.wet;
      if (b.soaked > (b.boss ? BOSS_SOAK : BLOT_SOAK)) this.blotGone(b, 'washed');
    }
  }

  /** True when a Blot standing on something would walk off a drop next. */
  private edgeAhead(b: Blot): boolean {
    if (b.air > FOOTING_STEPS || b.wet > 3) return false;
    return !this.overlaps(b.x + b.facing * (b.r + 6), b.y + b.r + 14, 4);
  }

  /** The guard's share of how soaked it must get to wash away, for the art. */
  soakOf(b: Blot): number {
    return Math.min(1, b.soaked / (b.boss ? BOSS_SOAK : BLOT_SOAK));
  }

  private blotGone(b: Blot, how: BlotEnd): void {
    b.gone = how;
    b.goneAt = this.steps;
    this.events.push({ type: how, x: b.x, y: b.y });
  }

  /**
   * Walks, falls and floats a creature: walls and stone stop it, while it
   * pushes water, lava and coins aside. Nib picks up the coins it touches.
   */
  private moveCreature(c: Creature, walk: number, isNib: boolean, climb: -1 | 0 | 1 | null = null): void {
    const g = this.grains;
    const vine = isNib && climb !== null ? this.climbing : null;
    // Floating: the more water around it, the stronger the lift, with drag.
    c.wet = 0;
    let lava = false;
    g.near(c.x, c.y, c.r + GRAIN_R, (i) => {
      if (g.kind[i] === WATER) c.wet++;
      else if (g.kind[i] === LAVA) lava = true;
    });
    if (lava) {
      if (isNib) this.lose('burnt');
      else this.blotGone(c as Blot, 'scorched');
      return;
    }
    const footed = c.air <= FOOTING_STEPS;
    const canWalk = footed || c.wet > 3;
    if (vine) {
      // On a vine: hands on it, no falling; it moves only as it climbs.
      c.vx = (vine.x - c.x) * 0.25;
      c.vy = (climb ?? 0) * CLIMB_SPEED;
    } else {
      c.vy += GRAVITY;
      if (c.wet > 3) {
        c.vy -= GRAVITY * Math.min(2.2, c.wet / 7);
        c.vy *= 0.9;
      }
      c.vx = canWalk ? c.vx + (walk - c.vx) * 0.25 : c.vx * 0.99;
    }
    const fromX = c.x;
    c.x += c.vx;
    c.y += c.vy;
    c.grounded = false;
    const k = this.contact;
    for (let pass = 0; pass < 2; pass++) {
      for (const s of this.segs) if (capsuleContact(s, c.x, c.y, c.r, k)) this.resolve(c, k);
      // Stone is solid ground, but Nib kicks loose any rubble in front of its body.
      g.near(c.x, c.y, c.r + GRAIN_R, (i) => {
        if (g.kind[i] !== STONE) return;
        const dx = c.x - g.x[i]!;
        const dy = c.y - g.y[i]!;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        k.nx = dx / d;
        k.ny = dy / d;
        k.depth = c.r + GRAIN_R - d;
        if (k.depth <= 0) return;
        if (isNib && walk !== 0 && this.inTheWay(c, walk, i)) this.kick(c, walk, i, k);
        else this.resolve(c, k);
      });
      // Boulders are solid too, and one coming down fast squashes what it lands on.
      for (const b of this.boulders) {
        if (!circleContact(b.x, b.y, b.r, c.x, c.y, c.r, k)) continue;
        if (b.vy > CRUSH_SPEED && b.y < c.y - c.r * 0.5) {
          if (isNib) this.lose('crushed');
          else this.blotGone(c as Blot, 'stomped');
          return;
        }
        this.resolve(c, k);
      }
    }
    if (vine) {
      c.y = Math.min(vine.bottom - c.r, Math.max(vine.top - c.r, c.y));
      c.grounded = true;
    }
    c.air = c.grounded ? 0 : c.air + 1;
    // Blocked while walking or swimming: climb a low step (a lip, a bump of stone, out of the water), never a wall.
    if (canWalk && walk !== 0 && Math.abs(c.x - fromX) < Math.abs(walk) * 0.3) {
      const ahead = c.x + Math.sign(walk) * 4;
      if (!this.overlaps(ahead, c.y - STEP_UP, c.r) && this.overlaps(ahead, c.y, c.r)) {
        c.y -= 2.5;
        c.x += Math.sign(walk) * 0.8;
        // Nib hauls itself up: no falling back between pulls, and it keeps its footing.
        if (isNib) {
          c.vy = Math.min(c.vy, 0);
          c.air = 0;
        }
      }
    }
    // Everything loose makes way; Nib pockets the coins within reach.
    g.near(c.x, c.y, c.r + GRAIN_R + (isNib ? PICKUP_REACH : 0), (i) => {
      const kind = g.kind[i];
      if (kind === STONE) return;
      if (kind === COIN && isNib && this.reaches(c, i)) {
        this.collect(i);
        return;
      }
      const dx = g.x[i]! - c.x;
      const dy = g.y[i]! - c.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const push = c.r + GRAIN_R - d;
      if (push <= 0) return;
      g.wake(i);

      g.x[i] = g.x[i]! + (dx / d) * push;
      g.y[i] = g.y[i]! + (dy / d) * push;
    });
    if (isNib && (canWalk || vine)) this.dig(c);
  }

  /** A stone ahead of Nib and above its feet: rubble in the way, not the floor. */
  private inTheWay(c: Creature, walk: number, i: number): boolean {
    const g = this.grains;
    return Math.sign(g.x[i]! - c.x) === Math.sign(walk) && g.y[i]! < c.y + c.r * KICK_BELOW;
  }

  /**
   * Nib shoves a stone in its way, and the rubble around it comes loose, so
   * lava that set into a wall or a lump never shuts Nib in.
   */
  private kick(c: Creature, walk: number, i: number, k: Contact): void {
    const g = this.grains;
    g.loosen(i);
    g.x[i] = g.x[i]! - k.nx * k.depth;
    g.y[i] = g.y[i]! - k.ny * k.depth;
    g.near(g.x[i]!, g.y[i]!, GRAIN_R * 4, (j) => {
      if (this.inTheWay(c, walk, j)) g.loosen(j);
    });
  }

  /** Nib digs out the coins straight below it, in gaps between stones or at the bottom of a pool. */
  private dig(c: Creature): void {
    const g = this.grains;
    const depth = c.wet > 3 ? DIG_DEPTH_SWIM : DIG_DEPTH;
    g.near(c.x, c.y + depth / 2, depth / 2 + GRAIN_R, (i) => {
      if (g.kind[i] !== COIN) return;
      const dy = g.y[i]! - c.y;
      if (Math.abs(g.x[i]! - c.x) >= c.r || dy <= 0 || dy >= depth) return;
      // Never through a floor or a pin: only loose stone, water and coins.
      const reach: Seg = { ax: c.x, ay: c.y, bx: g.x[i]!, by: g.y[i]!, t: 0 };
      if (this.segs.some((s) => segSegDistance(reach, s) < s.t)) return;
      this.collect(i);
    });
  }

  private collect(i: number): void {
    const g = this.grains;
    g.remove(i);
    this.coinsCollected++;
    this.events.push({ type: 'collect', id: g.id[i]!, x: g.x[i]!, y: g.y[i]! });
  }

  /** Nib's paws reach a little past its body: coins this close are picked up. */
  private reaches(c: Creature, i: number): boolean {
    const g = this.grains;
    return Math.hypot(g.x[i]! - c.x, g.y[i]! - c.y) < c.r + GRAIN_R + PICKUP_REACH;
  }

  /** True when a circle at (x, y) would overlap a wall, a pin still in, or stone. */
  private overlaps(x: number, y: number, r: number): boolean {
    const k = this.contact;
    for (const s of this.segs) if (capsuleContact(s, x, y, r, k)) return true;
    let hit = false;
    const g = this.grains;
    g.near(x, y, r + GRAIN_R, (i) => {
      if (g.kind[i] === STONE) hit = true;
    });
    return hit || this.boulders.some((b) => circleContact(b.x, b.y, b.r, x, y, r, k));
  }

  private resolve(c: Creature, k: Contact): void {
    c.x += k.nx * k.depth;
    c.y += k.ny * k.depth;
    const vn = c.vx * k.nx + c.vy * k.ny;
    if (vn < 0) {
      c.vx -= vn * k.nx;
      c.vy -= vn * k.ny;
    }
    if (k.ny < -0.55) c.grounded = true;
  }

  private judge(): void {
    if (this.finished) return;
    const nib = this.nib;
    if (nib.y > this.floorY) return this.lose('fell');
    for (const b of this.blots) {
      if (b.gone) continue;
      if (this.stomps(b)) {
        if (b.spiky) return this.lose('pricked');
        // The boss is too big to squash: Nib just bounces off its back.
        if (b.boss) this.events.push({ type: 'bonk', x: b.x, y: b.y - b.r });
        else this.blotGone(b, 'stomped');
        nib.vy = -JUMP_SPEED * STOMP_BOUNCE;
        nib.air = FOOTING_STEPS + 1;
        continue;
      }
      if (Math.hypot(b.x - nib.x, b.y - nib.y) < b.r + nib.r - 6) return this.lose('inked');
    }
    if (this.treasure < this.level.coinsNeeded) return this.lose(this.goldLostTo);
    // The chest: Nib opens it on reaching it and takes its treasure.
    const chest = this.level.chest;
    const atChest = chest && Math.abs(nib.x - chest.x) < CHEST_REACH_X && nib.y > chest.y - CHEST_REACH_ABOVE && nib.y < chest.y + CHEST_REACH_BELOW;
    if (chest && atChest && !this.chestTaken) {
      this.chestTaken = true;
      this.events.push({ type: 'chest', x: chest.x, y: chest.y });
    }
    if (!this.goalMet && (this.chestTaken || !chest) && this.coinsCollected >= this.level.coinsNeeded) {
      this.goalMet = true;
      this.events.push({ type: 'goal' });
    }
    // Every coin picked up (or lost): nothing left to stay for.
    if (this.goalMet && this.grains.countOf(COIN) === 0) {
      this.status = { state: 'won' };
      return;
    }
    const moving = this.grains.maxSpeed() > SETTLED_SPEED || Math.hypot(nib.vx, nib.vy) > SETTLED_SPEED * 0.5 || this.boulders.some((b) => Math.hypot(b.vx, b.vy) > SETTLED_SPEED);
    this.quietSteps = moving ? 0 : this.quietSteps + 1;
  }

  /** Nib coming down on top of a guard, as in the old platformers: it lands on its head. */
  private stomps(b: Blot): boolean {
    const nib = this.nib;
    const above = b.y - nib.y;
    return !this.climbing && nib.vy > STOMP_SPEED && above > b.r * 0.7 && Math.abs(b.x - nib.x) < b.r + nib.r * 0.6 && Math.hypot(b.x - nib.x, b.y - nib.y) < b.r + nib.r;
  }

  private lose(cause: LossCause): void {
    if (this.finished) return;
    // With the goal met, a mishap only cuts the visit short: Nib keeps the loot.
    this.status = this.goalMet ? { state: 'won' } : { state: 'lost', cause };
  }
}

function inBox(d: DrainDef, x: number, y: number): boolean {
  return x > d.x0 && x < d.x1 && y > d.y0 && y < d.y1;
}

function creature(x: number, y: number, r: number, facing: number): Creature {
  return { x, y, vx: 0, vy: 0, r, grounded: false, air: 0, wet: 0, facing };
}

/** Packs a block of grains in staggered rows, from its bottom up. */
function fill(g: Grains, f: FillDef): void {
  const gap = 10;
  const rowH = 9;
  let placed = 0;
  for (let row = 0; placed < f.count; row++) {
    const offset = (row % 2) * (gap / 2);
    for (let x = f.x0 + GRAIN_R + offset; x <= f.x1 - GRAIN_R && placed < f.count; x += gap) {
      g.add(f.kind, x, f.y1 - GRAIN_R - 2 - row * rowH);
      placed++;
    }
  }
}
