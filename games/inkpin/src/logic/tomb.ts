import type { Boulder } from './boulders';
import type { Creature } from './creatures';
import { clearSlot, jammed } from './gates';
import { segSegDistance, type Contact, type Seg } from './geom';
import type { Blot } from './guards';
import { LEDGE_T, type Ledge } from './ledges';
import type { DoorDef, LevelDef, PlateDef, SealDef } from './level';
import { COIN, LAVA, STONE, WATER, type Grains } from './particles';
import { inPlay, type Ruby } from './rubies';

/**
 * The Desert Tomb's ground (chapter 3): pressure plates that weigh what
 * lies on them, and the stone doors they work. A door is a capsule like a
 * pin; open, it has slid toward its ring end by its own length. It opens at
 * DOOR_OPEN and shuts at DOOR_SHUT px per step, never crushes (it waits for
 * whatever is in its way), and waits on a pin still in its path.
 */

/** How deep a plate's zone reaches above its top (px). */
export const PLATE_ZONE = 40;
/** A plate goes down at this weight unless it says otherwise: Nib alone, or 25 grains. */
export const PLATE_NEED = 25;
/** Steps a plate stays down after its weight drops below `need`: a pour landing doesn't flicker it. */
export const PLATE_HOLD = 30;
/** Weights (see the contract): grains 1 each (gas 0), a ruby 3, Nib or a guard 30, the boss 100, a boulder or a slab 40, a raft 20. */
const W_RUBY = 3;
const W_CREATURE = 30;
const W_BOSS = 100;
const W_BOULDER = 40;
const W_RAFT = 20;
const W_SLAB = 40;
/** Door speeds, px per step. */
export const DOOR_OPEN = 2;
export const DOOR_SHUT = 1;
/** How far below a plate's top something may reach and still stand on it (px). */
const FOOT_SLACK = 4;

export interface PlateState {
  readonly def: PlateDef;
  down: boolean;
  weight: number;
  /** Steps in a row the weight has been under `need`. */
  light: number;
}

export interface DoorState {
  readonly def: DoorDef;
  readonly len: number;
  /** How far it has slid toward its ring end: 0 shut, len open. */
  open: number;
  /** True while something holds it (in its path shutting, a pin in its path opening). */
  waiting: boolean;
}

export interface TombSave {
  readonly plates: readonly { down: boolean; weight: number; light: number }[];
  readonly doors: readonly { open: number; waiting: boolean }[];
}

export type TombEvent =
  | { readonly type: 'plateDown'; readonly id: string; readonly x: number; readonly y: number }
  | { readonly type: 'plateUp'; readonly id: string; readonly x: number; readonly y: number }
  | { readonly type: 'doorOpen'; readonly id: string }
  | { readonly type: 'doorShut'; readonly id: string }
  | { readonly type: 'doorBlocked'; readonly id: string; readonly by: string };

/** What the plates and doors need of the world. */
export interface TombWorld {
  readonly grains: Grains;
  readonly nib: Creature;
  readonly blots: readonly Blot[];
  readonly boulders: readonly Boulder[];
  readonly rubies: readonly Ruby[];
  readonly ledges: readonly Ledge[];
  /** The pins still in. */
  readonly pinsIn: readonly (Seg & { readonly id: string })[];
  readonly contact: Contact;
  readonly footing: number;
}

export function plates(level: LevelDef): PlateState[] {
  return (level.plates ?? []).map((def) => ({ def, down: false, weight: 0, light: 0 }));
}

export function doors(level: LevelDef): DoorState[] {
  return (level.doors ?? []).map((def) => ({ def, len: Math.hypot(def.bx - def.ax, def.by - def.ay), open: 0, waiting: false }));
}

/** The door's capsule as it stands now (slid `open` toward its ring end). */
export function doorSeg(d: DoorState, open = d.open): Seg {
  const { def } = d;
  const ux = (def.ax - def.bx) / (d.len || 1);
  const uy = (def.ay - def.by) / (d.len || 1);
  return { ax: def.ax + ux * open, ay: def.ay + uy * open, bx: def.bx + ux * open, by: def.by + uy * open, t: def.t };
}

/** The doors not fully open, as segs: a door is solid for everything. */
export function doorSegs(ds: readonly DoorState[]): Seg[] {
  return ds.filter((d) => d.open < d.len).map((d) => doorSeg(d));
}

/** True when the door's plate says it should be open. */
function wantsOpen(d: DoorState, ps: readonly PlateState[]): boolean {
  const p = ps.find((q) => q.def.id === d.def.plate);
  const down = p?.down ?? false;
  return d.def.invert ? !down : down;
}

/** Where a creature, ruby or body stands: its bottom is in the zone and its centre over the span. */
function standsIn(p: PlateDef, x: number, bottom: number): boolean {
  return x >= p.x0 && x <= p.x1 && bottom >= p.y - PLATE_ZONE && bottom <= p.y + FOOT_SLACK;
}

/** Everything in the plate's zone, weighed. */
export function weigh(p: PlateDef, w: TombWorld): number {
  let n = 0;
  const g = w.grains;
  const cx = (p.x0 + p.x1) / 2;
  const cy = p.y - PLATE_ZONE / 2;
  g.near(cx, cy, Math.hypot((p.x1 - p.x0) / 2, PLATE_ZONE / 2) + 1, (i) => {
    const k = g.kind[i];
    // Gas weighs nothing.
    if (k !== WATER && k !== LAVA && k !== COIN && k !== STONE) return;
    const x = g.x[i]!;
    const y = g.y[i]!;
    if (x >= p.x0 && x <= p.x1 && y >= p.y - PLATE_ZONE && y <= p.y) n++;
  });
  for (const r of w.rubies) if (inPlay(r) && r.x >= p.x0 && r.x <= p.x1 && r.y >= p.y - PLATE_ZONE && r.y <= p.y) n += W_RUBY;
  const nib = w.nib;
  if (nib.air <= w.footing && standsIn(p, nib.x, nib.y + nib.r)) n += W_CREATURE;
  for (const b of w.blots) {
    if (b.gone || b.puffed || b.air > w.footing || !standsIn(p, b.x, b.y + b.r)) continue;
    n += b.boss ? W_BOSS : W_CREATURE;
  }
  for (const b of w.boulders) {
    if (b.gone || b.crate || !standsIn(p, b.x, b.y + b.hh)) continue;
    n += b.raft ? W_RAFT : W_BOULDER;
  }
  const half = (p.x1 - p.x0) / 2;
  for (const l of w.ledges) {
    if (l.state !== 'down') continue;
    const over = Math.min(l.x1, p.x1) - Math.max(l.x0, p.x0);
    const bottom = l.y + LEDGE_T * 2;
    if (over >= half && bottom >= p.y - PLATE_ZONE && bottom <= p.y + FOOT_SLACK) n += W_SLAB;
  }
  return n;
}

/** One step of the plates: down at `need`, up once light for PLATE_HOLD steps. */
export function stepPlates(ps: readonly PlateState[], w: TombWorld, events: TombEvent[]): void {
  for (const p of ps) {
    p.weight = weigh(p.def, w);
    const need = p.def.need ?? PLATE_NEED;
    const mid = (p.def.x0 + p.def.x1) / 2;
    if (p.weight >= need) {
      p.light = 0;
      if (!p.down) {
        p.down = true;
        events.push({ type: 'plateDown', id: p.def.id, x: mid, y: p.def.y });
      }
    } else if (p.down && ++p.light >= PLATE_HOLD) {
      p.down = false;
      p.light = 0;
      events.push({ type: 'plateUp', id: p.def.id, x: mid, y: p.def.y });
    }
  }
}

/** Sets each door at once to where its plate wants it (a level's start). */
export function snapDoors(ds: readonly DoorState[], ps: readonly PlateState[]): void {
  for (const d of ds) d.open = wantsOpen(d, ps) ? d.len : 0;
}

/**
 * One step of the doors toward where their plates want them. Returns true
 * when any moved (the world rebuilds its segs).
 */
export function stepDoors(ds: readonly DoorState[], ps: readonly PlateState[], w: TombWorld, events: TombEvent[]): boolean {
  let moved = false;
  for (const d of ds) {
    const target = wantsOpen(d, ps) ? d.len : 0;
    if (d.open === target) {
      d.waiting = false;
      continue;
    }
    const opening = target > d.open;
    const next = opening ? Math.min(target, d.open + DOOR_OPEN) : Math.max(target, d.open - DOOR_SHUT);
    const seg = doorSeg(d, next);
    if (opening) {
      // Pins block a door as they block each other.
      const pin = w.pinsIn.find((q) => segSegDistance(seg, q) < seg.t + q.t);
      if (pin) {
        if (!d.waiting) events.push({ type: 'doorBlocked', id: d.def.id, by: pin.id });
        d.waiting = true;
        continue;
      }
    } else {
      // Never crushes: it waits for a creature, a body, a ruby or a slab in its way.
      const creatures = [w.nib, ...w.blots.filter((b) => !b.gone)];
      if (jammed(seg, { creatures, bodies: w.boulders, rubies: w.rubies, ledges: w.ledges }, w.contact)) {
        d.waiting = true;
        continue;
      }
      clearSlot(seg, w.grains, w.contact);
    }
    const was = d.open;
    d.open = next;
    d.waiting = false;
    moved = true;
    if (opening && was === 0) events.push({ type: 'doorOpen', id: d.def.id });
    if (!opening && next === 0) events.push({ type: 'doorShut', id: d.def.id });
  }
  return moved;
}

/** True while a door is on the move (not waiting): the world isn't settled. */
export function doorsMoving(ds: readonly DoorState[], ps: readonly PlateState[]): boolean {
  return ds.some((d) => !d.waiting && d.open !== (wantsOpen(d, ps) ? d.len : 0));
}

export function saveTomb(ps: readonly PlateState[], ds: readonly DoorState[]): TombSave {
  return { plates: ps.map((p) => ({ down: p.down, weight: p.weight, light: p.light })), doors: ds.map((d) => ({ open: d.open, waiting: d.waiting })) };
}

export function loadTomb(ps: readonly PlateState[], ds: readonly DoorState[], s: TombSave): void {
  ps.forEach((p, i) => Object.assign(p, s.plates[i]));
  ds.forEach((d, i) => Object.assign(d, s.doors[i]));
}

/**
 * True when a sealing barrier still stands between Nib and his goal: a door
 * not open or a cracked wall not broken, with Nib on its far side.
 */
export function sealedOut(seals: readonly SealDef[], ds: readonly DoorState[], walls: readonly Seg[], broken: readonly boolean[], nib: Creature): boolean {
  return seals.some((s) => {
    let seg: Seg | undefined;
    if (s.door !== undefined) {
      const d = ds.find((q) => q.def.id === s.door);
      if (!d || d.open >= d.len) return false;
      seg = d.def;
    } else if (s.wall !== undefined) {
      if (broken[s.wall]) return false;
      seg = walls[s.wall];
    }
    if (!seg) return false;
    const mx = (seg.ax + seg.bx) / 2;
    const my = (seg.ay + seg.by) / 2;
    switch (s.side) {
      case 'left':
        return nib.x > mx;
      case 'right':
        return nib.x < mx;
      case 'up':
        return nib.y > my;
      case 'down':
        return nib.y < my;
    }
  });
}

/** Weighs the plates and moves the doors they work. True when a door moved enough to change the walls (the caller rebuilds its segments). */
export function weighPlates(ps: PlateState[], ds: DoorState[], w: TombWorld, events: TombEvent[]): boolean {
  if (!ps.length) return false;
  stepPlates(ps, w, events);
  return stepDoors(ds, ps, w, events);
}
