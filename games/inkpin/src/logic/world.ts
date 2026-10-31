import { climbable, loadVine, saveVine, stepVine, vine, type Vine, type VineEvent, type VineSave } from './vines';
import { boulder, CRUSH_SPEED, separate, standsOn, stepBody, type Boulder } from './boulders';
import { capsuleContact, segSegDistance, type Contact, type Seg } from './geom';
import { creature, FOOTING_STEPS, moveCreature, overlaps, type Creature, type Mover } from './creatures';
import { drainGrains, drainsOpen, inDrain, type DrainedCoin } from './drains';
import { clearSlot, jammed } from './gates';
import { blot, moveBlot, type Blot, type BlotEnd } from './guards';
import { ledge, ledgeMoving, ledgeSeg, loadLedge, noteNib, saveLedge, stepSlab, type Ledge, type LedgeEvent, type LedgeSave } from './ledges';
import type { FillDef, GuardAnimal, LevelDef, PinDef } from './level';
import { COIN, GRAIN_R, Grains, LAVA, STEPS_PER_SECOND, type GrainEvent, type GrainsSave } from './particles';
import { raft, stepRaft } from './rafts';
import { inPlay, ruby, RUBY_COINS, RUBY_R, saveRuby, separateRubies, stepRuby, type Ruby, type RubyEvent, type RubySave } from './rubies';

export { BLOT_R, BOSS_R, type Blot, type BlotEnd } from './guards';
export { FOOTING_STEPS, type Creature } from './creatures';

/**
 * One level in play: the grains, the pins, Nib and the Blots, and the rules
 * that end it. Pure and deterministic: the scene draws it and feeds it pulls,
 * and the tests drive the very same object.
 */

export const NIB_R = 24;
/** Nib's walking speed in px per step. */
const NIB_WALK = 0.95;
/** Nib must be falling at least this fast (px per step) to stomp a guard, and bounces off at this share of a jump. */
const STOMP_SPEED = 0.4;
const STOMP_BOUNCE = 0.75;
/** Nib holds a vine this close to it sideways, and a tap this close to one is a tap on the vine (px). */
const VINE_GRAB = 14;
const VINE_TAP = 40;
/** Reaching the chest: this close sideways, and not far above or below it. */
const CHEST_REACH_X = 44;
const CHEST_REACH_ABOVE = 90;
const CHEST_REACH_BELOW = 24;
/** The world counts as settled once nothing moves faster than this (px per step). */
const SETTLED_SPEED = 0.35;
/** Grains that may still jiggle in a settled world (water squeezed between a resting boulder and a wall). */
const SETTLED_STRAYS = 6;
/** How far past its length a pin must slide to be clear: its ring. */
const PIN_RING_CLEAR = 28;
/** Steps the grains run before a level starts, to settle against the pins. */
const PRESETTLE_STEPS = STEPS_PER_SECOND * 3;
/** Nib's take-off speed (px per step): about 55 px high. */
const JUMP_SPEED = 2.9;
/** Steps a 'goto' may make no headway before Nib gives up and stays. */
const GOTO_PATIENCE = 40;
/** A slab pressing this far (px) into a creature on the ground squashes it, however slowly it comes down. */
const SLAB_PRESS = 6;

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
/** A loss to a guard (caught or pricked) says which animal, when the level names it (chapter 2 on), for the loss line. */
export type Status = { readonly state: 'playing' } | { readonly state: 'won' } | { readonly state: 'lost'; readonly cause: LossCause; readonly by?: GuardAnimal };

export type WorldEvent =
  | GrainEvent
  | { readonly type: 'pull'; readonly id: string }
  | { readonly type: 'blocked'; readonly id: string; readonly by: string }
  | { readonly type: 'gateIn'; readonly id: string }
  | { readonly type: 'gateJammed'; readonly id: string }
  | { readonly type: 'collect'; readonly id: number; readonly x: number; readonly y: number }
  | { readonly type: 'goal' }
  | { readonly type: 'washed'; readonly x: number; readonly y: number }
  | { readonly type: 'scorched'; readonly x: number; readonly y: number }
  | { readonly type: 'stomped'; readonly x: number; readonly y: number }
  | { readonly type: 'bonk'; readonly x: number; readonly y: number }
  | { readonly type: 'drained'; readonly x: number; readonly y: number }
  | { readonly type: 'splash'; readonly x: number; readonly y: number }
  | { readonly type: 'chest'; readonly x: number; readonly y: number }
  | VineEvent
  | { readonly type: 'crateBurnt'; readonly x: number; readonly y: number }
  | LedgeEvent
  | RubyEvent
  | { readonly type: 'jump' };

export interface PinState {
  readonly def: PinDef;
  pulledAt: number | null;
  /** The step a gate pin last went back in, for the art; null if it never has. */
  pushedAt: number | null;
}

/** Everything that changes in a World as it plays, to wind back to (a heart lost). */
export interface WorldSave {
  readonly grains: GrainsSave;
  readonly pulled: readonly (number | null)[];
  readonly pushed: readonly (number | null)[];
  readonly nib: Creature;
  readonly blots: readonly Blot[];
  readonly boulders: readonly Boulder[];
  readonly coinsCollected: number;
  readonly chestTaken: boolean;
  readonly goalMet: boolean;
  readonly steps: number;
  readonly status: Status;
  readonly quietSteps: number;
  readonly order: NibOrder;
  readonly stalled: number;
  /** The vine Nib holds, by index. */
  readonly climbing: number | null;
  readonly vines: readonly VineSave[];
  readonly ledges: readonly LedgeSave[];
  readonly rubies: readonly RubySave[];
  readonly goldLostTo: 'melted' | 'drained';
}

export class World {
  readonly grains: Grains;
  readonly pins: PinState[];
  readonly nib: Creature;
  readonly blots: Blot[];
  readonly boulders: Boulder[];
  /** The vines as they are now: grown, still seeds, or burnt. */
  readonly vines: Vine[];
  /** The crumbling ledges, up or fallen. */
  readonly ledges: Ledge[];
  readonly rubies: Ruby[];
  /** Coins and rubies (at RUBY_COINS each) in play when the level opens. */
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
  private climbing: Vine | null = null;
  /** What took the gold that's gone, for the loss: lava or the drain. */
  private goldLostTo: 'melted' | 'drained' = 'melted';
  /** Below this, Nib has fallen out of the level. */
  private readonly floorY: number;
  /** What creatures.ts moves Nib and the guards against. */
  private readonly mover: Mover;

  constructor(readonly level: LevelDef) {
    const total = level.fills.reduce((n, f) => n + f.count, 0);
    this.grains = new Grains(total + 16);
    for (const f of level.fills) fill(this.grains, f);
    this.pins = level.pins.map((def) => ({ def, pulledAt: null, pushedAt: null }));
    this.nib = creature(level.nib.x, level.nib.y, NIB_R, 1);
    this.blots = level.blots.map(blot);
    this.boulders = [...(level.boulders ?? []).map((b) => boulder(b.x, b.y)), ...(level.crates ?? []).map((c) => boulder(c.x, c.y, true)), ...(level.rafts ?? []).map((r) => raft(r.x, r.y))];
    this.vines = (level.vines ?? []).map(vine);
    this.ledges = (level.ledges ?? []).map(ledge);
    this.rubies = (level.rubies ?? []).map((r, i) => ruby(i, r.x, r.y));
    const segs = (): readonly Seg[] => this.segs;
    this.mover = {
      grains: this.grains,
      get segs() {
        return segs();
      },
      boulders: this.boulders,
      rubies: this.rubies,
      contact: this.contact,
      lose: (cause) => this.lose(cause),
      blotGone: (b, how) => this.blotGone(b, how),
      collect: (i) => this.collect(i),
      takeRuby: (r) => this.takeRuby(r),
    };
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
      this.moveSlabs();
      this.moveRubies();
      this.growVines();
    }
    this.events.length = 0;
    this.coinsTotal = this.grains.countOf(COIN) + this.rubiesLeft * RUBY_COINS;
  }

  /** Coins and rubies still in play (at RUBY_COINS each) plus those in Nib's sack. */
  get treasure(): number {
    return this.coinsCollected + this.grains.countOf(COIN) + this.rubiesLeft * RUBY_COINS;
  }

  /** Rubies still in play: not taken, not lost. */
  get rubiesLeft(): number {
    return this.rubies.filter(inPlay).length;
  }

  /** A copy of the level as it is now, to wind back to with `load`. */
  save(): WorldSave {
    return {
      grains: this.grains.save(),
      pulled: this.pins.map((p) => p.pulledAt),
      pushed: this.pins.map((p) => p.pushedAt),
      nib: { ...this.nib },
      blots: this.blots.map((b) => ({ ...b })),
      boulders: this.boulders.map((b) => ({ ...b })),
      coinsCollected: this.coinsCollected,
      chestTaken: this.chestTaken,
      goalMet: this.goalMet,
      steps: this.steps,
      status: this.status,
      quietSteps: this.quietSteps,
      order: this.order,
      stalled: this.stalled,
      climbing: this.climbing ? this.vines.indexOf(this.climbing) : null,
      vines: this.vines.map(saveVine),
      ledges: this.ledges.map(saveLedge),
      rubies: this.rubies.map(saveRuby),
      goldLostTo: this.goldLostTo,
    };
  }

  /** Winds the level back to a saved moment: the grains, the pins and gates, Nib, the guards, the bodies, the ledges, the rubies and the score. */
  load(s: WorldSave): void {
    this.grains.load(s.grains);
    this.pins.forEach((p, i) => {
      p.pulledAt = s.pulled[i] ?? null;
      p.pushedAt = s.pushed[i] ?? null;
    });
    Object.assign(this.nib, s.nib);
    this.blots.forEach((b, i) => Object.assign(b, s.blots[i]));
    this.boulders.forEach((b, i) => Object.assign(b, s.boulders[i]));
    this.coinsCollected = s.coinsCollected;
    this.chestTaken = s.chestTaken;
    this.goalMet = s.goalMet;
    this.steps = s.steps;
    this.status = s.status;
    this.quietSteps = s.quietSteps;
    this.order = s.order;
    this.stalled = s.stalled;
    this.vines.forEach((v, i) => {
      const saved = s.vines[i];
      if (saved) loadVine(v, saved);
    });
    this.ledges.forEach((l, i) => {
      const saved = s.ledges[i];
      if (saved) loadLedge(l, saved);
    });
    this.rubies.forEach((r, i) => Object.assign(r, s.rubies[i]));
    this.climbing = s.climbing === null ? null : (this.vines[s.climbing] ?? null);
    this.goldLostTo = s.goldLostTo;
    this.pending = [];
    this.events.length = 0;
    this.rebuildSegs();
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
   * Pushes a gate pin that's out back in. Returns false when it isn't a gate,
   * isn't out, or the level is over; also when another pin is in its way
   * (a 'blocked' event) or something solid is in its slot (a 'gateJammed'
   * event). Grains in the slot make way.
   */
  push(id: string): boolean {
    if (this.finished) return false;
    const pin = this.pins.find((p) => p.def.id === id);
    if (!pin || !pin.def.gate || pin.pulledAt === null) return false;
    const by = this.blockedBy(pin.def);
    if (by) {
      this.pending.push({ type: 'blocked', id, by });
      return false;
    }
    const creatures = [this.nib, ...this.blots.filter((b) => !b.gone)];
    if (jammed(pin.def, { creatures, bodies: this.boulders, rubies: this.rubies, ledges: this.ledges }, this.contact)) {
      this.pending.push({ type: 'gateJammed', id });
      return false;
    }
    clearSlot(pin.def, this.grains, this.contact);
    pin.pulledAt = null;
    pin.pushedAt = this.steps;
    this.rebuildSegs();
    this.pending.push({ type: 'gateIn', id });
    this.quietSteps = 0;
    return true;
  }

  /** A tap on a pin: pulls it, or pushes a gate that's out back in. */
  tap(id: string): boolean {
    const pin = this.pins.find((p) => p.def.id === id);
    return pin?.def.gate && pin.pulledAt !== null ? this.push(id) : this.pull(id);
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
    this.moveSlabs();
    this.moveRubies();
    this.growVines();
    for (const b of this.blots) if (!b.gone) moveBlot(b, this, FOOTING_STEPS);
    this.moveNib();
    this.ledges.forEach((l, i) => noteNib(l, i, this.nibOn(l), this.steps, this.events));
    this.judge();
  }

  private rebuildSegs(): void {
    this.segs = [...this.level.walls, ...this.pins.filter((p) => p.pulledAt === null).map((p) => p.def), ...this.ledges.map(ledgeSeg)];
  }

  /** Grains, and rubies, in an open drain's box are gone down it. */
  private drain(): void {
    const drains = this.level.drains;
    if (!drains?.length) return;
    const lost: DrainedCoin[] = [];
    drainGrains(drains, this.boulders, this.grains, lost);
    if (lost.length) this.goldLostTo = 'drained';
    this.events.push(...lost);
    if (!this.rubies.length) return;
    const open = drainsOpen(drains, this.boulders);
    for (const r of this.rubies) {
      if (!inPlay(r) || !open.some((d) => inDrain(d, r.x, r.y))) continue;
      this.loseRuby(r);
      this.goldLostTo = 'drained';
    }
  }

  private loseRuby(r: Ruby): void {
    r.lost = true;
    this.events.push({ type: 'rubyLost', id: r.id, x: r.x, y: r.y });
  }

  /**
   * Boulders roll, crates and rafts float; then whatever stands on a crate
   * or a raft rides along with it: Nib, the guards, rubies, and (on a raft)
   * the gold.
   */
  private moveBoulders(): void {
    const bs = this.boulders;
    const before = bs.map((b) => b.x);
    for (const b of bs) {
      if (b.raft) stepRaft(b, this.segs, this.grains, this.contact);
      else if (stepBody(b, this.segs, this.grains, this.contact)) this.events.push({ type: 'crateBurnt', x: b.x, y: b.y });
    }
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) if (!bs[i]!.gone && !bs[j]!.gone) separate(bs[i]!, bs[j]!);
    bs.forEach((b, i) => this.carry(b, b.x - before[i]!));
  }

  /** Moves what stands on a crate or raft by its drift. */
  private carry(b: Boulder, dx: number): void {
    if (b.gone || dx === 0 || (!b.crate && !b.raft)) return;
    for (const c of [this.nib, ...this.blots]) if (!(c as Blot).gone && standsOn(b, c.x, c.y, c.r)) c.x += dx;
    for (const r of this.rubies) if (inPlay(r) && standsOn(b, r.x, r.y, RUBY_R)) r.x += dx;
    if (!b.raft) return;
    const g = this.grains;
    g.near(b.x, b.y - b.hh, b.hw + GRAIN_R * 2, (i) => {
      if (g.kind[i] === COIN && standsOn(b, g.x[i]!, g.y[i]!, GRAIN_R)) g.x[i] = g.x[i]! + dx;
    });
  }

  /**
   * Cracked ledges fall as slabs. One coming down fast (or pressing down on
   * a creature that can't get out of its way) squashes what's under it.
   */
  private moveSlabs(): void {
    if (!this.ledges.some((l) => l.state === 'cracking' || l.state === 'falling')) return;
    const statics = [...this.level.walls, ...this.pins.filter((p) => p.pulledAt === null).map((p) => p.def)];
    const w = { statics, ledges: this.ledges, bodies: this.boulders, grains: this.grains };
    this.ledges.forEach((l, i) => {
      const y = l.y;
      stepSlab(l, i, w, this.steps, this.contact, this.events);
      if (l.y !== y) this.squash(l, l.y - y);
    });
    this.rebuildSegs();
  }

  private squash(l: Ledge, fell: number): void {
    const s = ledgeSeg(l);
    const k = this.contact;
    for (const c of [this.nib, ...this.blots]) {
      const isNib = c === this.nib;
      if ((!isNib && (c as Blot).gone) || !capsuleContact(s, c.x, c.y, c.r, k) || k.ny < 0.3) continue;
      if (fell < CRUSH_SPEED && !(c.air <= FOOTING_STEPS && k.depth > SLAB_PRESS)) continue;
      if (isNib) this.lose('crushed');
      else this.blotGone(c as Blot, 'stomped');
    }
  }

  /** Rubies fall, sink and roll. */
  private moveRubies(): void {
    if (!this.rubies.length) return;
    for (const r of this.rubies) {
      stepRuby(r, this.segs, this.grains, this.boulders, this.contact);
      if (inPlay(r) && (r.y > this.floorY || r.x < -40 || r.x > 2240)) this.loseRuby(r);
    }
    separateRubies(this.rubies);
  }

  /** True when Nib is on a ledge: standing on it, or in the air over it (a jump on a ledge doesn't count as leaving it). */
  private nibOn(l: Ledge): boolean {
    const nib = this.nib;
    if (l.state !== 'up') return false;
    if (capsuleContact(ledgeSeg(l), nib.x, nib.y, nib.r + 2, this.contact) && this.contact.ny < -0.5) return true;
    return nib.air > FOOTING_STEPS && l.stood && nib.y < l.y && nib.x > l.x0 - nib.r && nib.x < l.x1 + nib.r && !this.finished;
  }

  /** Seeds drink and grow, lava burns vines; Nib lets go of one that burns. */
  private growVines(): void {
    for (const v of this.vines) stepVine(v, this.grains, this.events);
    if (this.climbing?.burnt) {
      this.climbing = null;
      if (this.order.kind === 'climb') this.order = { kind: 'stay' };
    }
  }

  /** The vine within Nib's reach, if any. */
  private vineAt(): Vine | null {
    const nib = this.nib;
    return this.vines.find((v) => climbable(v) && Math.abs(v.x - nib.x) < VINE_GRAB * 2 && nib.y > v.top - nib.r - 8 && nib.y < v.bottom - nib.r + 8) ?? null;
  }

  /** The vine a tap at (x, y) lands on, if any. */
  private vineNear(x: number, y: number): Vine | null {
    return this.vines.find((v) => climbable(v) && Math.abs(v.x - x) < VINE_TAP && y > v.top - 70 && y < v.bottom + 30) ?? null;
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
  private gotoVine(vine: Vine, y: number): void {
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

  /** A guard is beaten: it goes, and the scene shows how. (For guards.ts.) */
  blotGone(b: Blot, how: BlotEnd): void {
    b.gone = how;
    b.goneAt = this.steps;
    this.events.push({ type: how, x: b.x, y: b.y });
  }


  /** Walks, falls, floats or climbs a creature (see creatures.ts). */
  moveCreature(c: Creature, walk: number, isNib: boolean, climb: -1 | 0 | 1 | null = null): void {
    moveCreature(this.mover, c, walk, isNib, isNib && climb !== null ? this.climbing : null, climb);
  }

  /** True when a circle at (x, y) would overlap a wall, a pin still in, a ledge, stone or a body. (For guards.ts.) */
  overlaps(x: number, y: number, r: number): boolean {
    return overlaps(this.mover, x, y, r);
  }

  /** True when lava is within r of (x, y). (For guards.ts.) */
  lavaAt(x: number, y: number, r: number): boolean {
    let hit = false;
    this.grains.near(x, y, r, (i) => {
      if (this.grains.kind[i] === LAVA) hit = true;
    });
    return hit;
  }

  private collect(i: number): void {
    const g = this.grains;
    g.remove(i);
    this.coinsCollected++;
    this.events.push({ type: 'collect', id: g.id[i]!, x: g.x[i]!, y: g.y[i]! });
  }

  private takeRuby(r: Ruby): void {
    r.taken = true;
    this.coinsCollected += RUBY_COINS;
    this.events.push({ type: 'ruby', id: r.id, x: r.x, y: r.y });
  }

  private judge(): void {
    if (this.finished) return;
    const nib = this.nib;
    if (nib.y > this.floorY) return this.lose('fell');
    for (const b of this.blots) {
      if (b.gone) continue;
      if (this.stomps(b)) {
        if (b.spiky) return this.lose('pricked', this.animalOf(b));
        // The boss is too big to squash: Nib just bounces off its back.
        if (b.boss) this.events.push({ type: 'bonk', x: b.x, y: b.y - b.r });
        else this.blotGone(b, 'stomped');
        nib.vy = -JUMP_SPEED * STOMP_BOUNCE;
        nib.air = FOOTING_STEPS + 1;
        continue;
      }
      if (Math.hypot(b.x - nib.x, b.y - nib.y) < b.r + nib.r - 6) return this.lose('inked', this.animalOf(b));
    }
    if (this.treasure < this.level.coinsNeeded) return this.lose(this.goldLostTo);
    // The chest: Nib opens it on reaching it and takes its treasure.
    const chest = this.level.chest;
    const atChest = chest && Math.abs(nib.x - chest.x) < CHEST_REACH_X && nib.y > chest.y - CHEST_REACH_ABOVE && nib.y < chest.y + CHEST_REACH_BELOW;
    if (chest && atChest && !this.chestTaken) {
      this.chestTaken = true;
      this.events.push({ type: 'chest', x: chest.x, y: chest.y });
    }
    const cleared = !this.level.clear || this.blots.every((b) => b.gone);
    if (!this.goalMet && (this.chestTaken || !chest) && cleared && this.coinsCollected >= this.level.coinsNeeded) {
      this.goalMet = true;
      this.events.push({ type: 'goal' });
    }
    // Every coin picked up (or lost): nothing left to stay for.
    if (this.goalMet && this.grains.countOf(COIN) === 0 && this.rubiesLeft === 0) {
      this.status = { state: 'won' };
      return;
    }
    const moving =
      this.grains.countFasterThan(SETTLED_SPEED) > SETTLED_STRAYS ||
      Math.hypot(nib.vx, nib.vy) > SETTLED_SPEED * 0.5 ||
      this.boulders.some((b) => !b.gone && Math.hypot(b.vx, b.vy) > SETTLED_SPEED) ||
      this.ledges.some(ledgeMoving) ||
      this.rubies.some((r) => inPlay(r) && Math.hypot(r.vx, r.vy) > SETTLED_SPEED);
    this.quietSteps = moving ? 0 : this.quietSteps + 1;
  }

  /** Nib coming down on top of a guard, as in the old platformers: it lands on its head. */
  private stomps(b: Blot): boolean {
    const nib = this.nib;
    const above = b.y - nib.y;
    return !this.climbing && nib.vy > STOMP_SPEED && above > b.r * 0.7 && Math.abs(b.x - nib.x) < b.r + nib.r * 0.6 && Math.hypot(b.x - nib.x, b.y - nib.y) < b.r + nib.r;
  }

  private lose(cause: LossCause, by?: GuardAnimal): void {
    if (this.finished) return;
    // With the goal met, a mishap only cuts the visit short: Nib keeps the loot.
    this.status = this.goalMet ? { state: 'won' } : by ? { state: 'lost', cause, by } : { state: 'lost', cause };
  }

  /** The guard's animal for the loss line, when its level names one (chapter 1's don't, and their losses stay as they were). */
  private animalOf(b: Blot): GuardAnimal | undefined {
    return this.level.blots[this.blots.indexOf(b)]?.animal;
  }
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
