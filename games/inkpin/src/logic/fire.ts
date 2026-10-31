import type { Creature } from './creatures';
import { segSegDistance, type Seg } from './geom';
import type { Blot } from './guards';
import { CRACK_STEPS, ledgeSeg, type Ledge } from './ledges';
import { GAS, GRAIN_R, LAVA, WATER, type Grains } from './particles';

/**
 * Tomb gas and fire (chapter 3). A gas grain touching a lit fire bowl's
 * flame, or any lava, starts to burn. A burning grain burns BURN_STEPS, then
 * is gone; from its second step it lights every gas grain within SPREAD, so
 * all the gas connected to the spark burns as one fast front, and gas cut off
 * by a wall doesn't. Each burning grain blasts BLAST_R along any line no
 * wall, pin, door or ledge blocks: it breaks cracked walls, cracks 'up'
 * ledges, and beats Nib and every guard but the boss. Water douses a bowl
 * for good. Nib breathing gas is lost 'gassed'.
 */

export const BURN_STEPS = 8;
export const SPREAD = 16;
export const BLAST_R = 40;
/** A fire bowl's flame: a circle this far above the floor it stands on, and this big. */
export const FLAME_UP = 34;
export const FLAME_R = 12;
/** Nib is gassed by this many gas grains touching him at once, or by any for GAS_STEPS in a row. */
export const GAS_CROWD = 3;
export const GAS_STEPS = 20;
/** Gas this close to lava lights (px between centres). */
const TOUCH = GRAIN_R * 2 + 1.5;

export interface Bowl {
  readonly x: number;
  readonly y: number;
  lit: boolean;
}

export type FireEvent =
  | { readonly type: 'ignite'; readonly x: number; readonly y: number }
  | { readonly type: 'blast'; readonly x: number; readonly y: number }
  | { readonly type: 'wallBroken'; readonly index: number; readonly x: number; readonly y: number }
  | { readonly type: 'doused'; readonly x: number; readonly y: number }
  | { readonly type: 'steam'; readonly x: number; readonly y: number }
  | { readonly type: 'crack'; readonly index: number; readonly x: number; readonly y: number };

/** What the fire needs of the world. */
export interface FireWorld {
  readonly grains: Grains;
  readonly bowls: readonly Bowl[];
  readonly walls: readonly Seg[];
  readonly cracked: readonly number[];
  readonly broken: boolean[];
  readonly ledges: readonly Ledge[];
  /** What blocks a blast: the walls standing, the pins still in, the doors, the ledges. */
  readonly segs: readonly Seg[];
  readonly nib: Creature;
  readonly blots: readonly Blot[];
  readonly steps: number;
  lose(cause: 'blasted'): void;
  blotGone(b: Blot, how: 'blasted'): void;
}

export const flameY = (b: { readonly y: number }): number => b.y - FLAME_UP;

/** Water douses a lit bowl (the grain boils away); a lit bowl lights the gas that reaches its flame. */
export function stepBowls(w: FireWorld, events: FireEvent[]): void {
  const g = w.grains;
  for (const b of w.bowls) {
    if (!b.lit) continue;
    const fy = flameY(b);
    let douse = -1;
    g.near(b.x, fy, FLAME_R + GRAIN_R, (i) => {
      if (g.kind[i] === WATER && douse < 0) douse = i;
      else if (g.kind[i] === GAS && g.burn[i] === 0) {
        g.burn[i] = 1;
        events.push({ type: 'ignite', x: g.x[i]!, y: g.y[i]! });
      }
    });
    if (douse >= 0) {
      b.lit = false;
      g.remove(douse);
      events.push({ type: 'doused', x: b.x, y: fy }, { type: 'steam', x: b.x, y: fy });
    }
  }
}

/** Lava lights any gas it touches. */
export function lavaSparks(g: Grains, events: FireEvent[]): void {
  for (let i = 0; i < g.count; i++) {
    if (g.kind[i] !== GAS || g.burn[i] !== 0) continue;
    let hit = false;
    g.near(g.x[i]!, g.y[i]!, TOUCH, (j) => {
      if (g.kind[j] === LAVA) hit = true;
    });
    if (hit) {
      g.burn[i] = 1;
      events.push({ type: 'ignite', x: g.x[i]!, y: g.y[i]! });
    }
  }
}

/** True when nothing in `segs` but `skip` stands between (ax, ay) and (bx, by). */
function clearLine(ax: number, ay: number, bx: number, by: number, segs: readonly Seg[], skip: Seg | null): boolean {
  const line: Seg = { ax, ay, bx, by, t: 0 };
  for (const s of segs) if (!same(s, skip) && segSegDistance(line, s) < s.t) return false;
  return true;
}

/** The same seg (ledge segs are rebuilt each time, so by their ends). */
function same(a: Seg, b: Seg | null): boolean {
  return b !== null && (a === b || (a.ax === b.ax && a.ay === b.ay && a.bx === b.bx && a.by === b.by));
}

/** The point on a seg's centre line nearest (x, y). */
function nearestOn(s: Seg, x: number, y: number): { x: number; y: number } {
  const dx = s.bx - s.ax;
  const dy = s.by - s.ay;
  const len2 = dx * dx + dy * dy;
  const u = len2 > 0 ? Math.max(0, Math.min(1, ((x - s.ax) * dx + (y - s.ay) * dy) / len2)) : 0;
  return { x: s.ax + dx * u, y: s.ay + dy * u };
}

/** True when a blast from (x, y) reaches a creature: its edge within BLAST_R and a clear line to its middle. */
function reaches(x: number, y: number, c: Creature, segs: readonly Seg[]): boolean {
  return Math.hypot(c.x - x, c.y - y) - c.r <= BLAST_R && clearLine(x, y, c.x, c.y, segs, null);
}

/**
 * One step of the burning gas: each burning grain ages, spreads the fire to
 * the gas round it, blasts what it reaches, and burns out. Returns true when
 * a wall broke (the world rebuilds its segs).
 */
export function stepFire(w: FireWorld, events: FireEvent[]): boolean {
  const g = w.grains;
  const burning: number[] = [];
  for (let i = 0; i < g.count; i++) if (g.kind[i] === GAS && g.burn[i]! > 0) burning.push(i);
  if (!burning.length) return false;
  if (burning.every((i) => g.burn[i] === 1)) {
    const i = burning[0]!;
    events.push({ type: 'blast', x: g.x[i]!, y: g.y[i]! });
  }
  const light: number[] = [];
  let broke = false;
  for (const i of burning) {
    const x = g.x[i]!;
    const y = g.y[i]!;
    if (g.burn[i]! >= 2) {
      g.near(x, y, SPREAD, (j) => {
        if (g.kind[j] === GAS && g.burn[j] === 0) light.push(j);
      });
    }
    broke = blast(w, x, y, events) || broke;
    if (++g.burn[i]! > BURN_STEPS) g.remove(i);
  }
  for (const j of light) if (g.burn[j] === 0) g.burn[j] = 1;
  return broke;
}

/** What one burning grain at (x, y) reaches this step. */
function blast(w: FireWorld, x: number, y: number, events: FireEvent[]): boolean {
  let broke = false;
  for (const index of w.cracked) {
    const s = w.walls[index];
    if (!s || w.broken[index]) continue;
    const p = nearestOn(s, x, y);
    if (Math.hypot(p.x - x, p.y - y) - s.t > BLAST_R || !clearLine(x, y, p.x, p.y, w.segs, s)) continue;
    w.broken[index] = true;
    broke = true;
    events.push({ type: 'wallBroken', index, x: (s.ax + s.bx) / 2, y: (s.ay + s.by) / 2 });
  }
  w.ledges.forEach((l, index) => {
    if (l.state !== 'up') return;
    const s = ledgeSeg(l);
    const p = nearestOn(s, x, y);
    if (Math.hypot(p.x - x, p.y - y) - s.t > BLAST_R || !clearLine(x, y, p.x, p.y, w.segs, s)) return;
    l.state = 'cracking';
    l.crackAt = w.steps;
    events.push({ type: 'crack', index, x: (l.x0 + l.x1) / 2, y: l.y });
  });
  if (reaches(x, y, w.nib, w.segs)) w.lose('blasted');
  for (const b of w.blots) if (!b.gone && !b.boss && reaches(x, y, b, w.segs)) w.blotGone(b, 'blasted');
  return broke;
}

/** Gas grains touching Nib now (within his radius plus a grain's). */
export function gasOn(g: Grains, nib: Creature): number {
  let n = 0;
  g.near(nib.x, nib.y, nib.r + GRAIN_R, (i) => {
    if (g.kind[i] === GAS) n++;
  });
  return n;
}

/** The steps a ledge cracked by a blast wobbles before it falls (the same as one Nib stepped off). */
export const BLAST_CRACK_STEPS = CRACK_STEPS;

const hasKind = (g: Grains, kind: number): boolean => {
  for (let i = 0; i < g.count; i++) if (g.kind[i] === kind) return true;
  return false;
};

/** One step of fire: bowls, lava sparks and burning gas. True when a blast broke a wall (the caller rebuilds its segments). */
export function burn(fw: FireWorld, events: FireEvent[]): boolean {
  const gas = hasKind(fw.grains, GAS);
  if (!fw.bowls.length && !gas) return false;
  stepBowls(fw, events);
  if (hasKind(fw.grains, LAVA)) lavaSparks(fw.grains, events);
  return stepFire(fw, events);
}

/** Gas on Nib: GAS_CROWD grains at once, or any for GAS_STEPS in a row. `touch` is the steps in a row so far; the result has the new count. */
export function gasOnNib(grains: Grains, nib: Creature, touch: number): { readonly gassed: boolean; readonly touch: number } {
  if (!hasKind(grains, GAS)) return { gassed: false, touch: 0 };
  const n = gasOn(grains, nib);
  const next = n > 0 ? touch + 1 : 0;
  return { gassed: n >= GAS_CROWD || next >= GAS_STEPS, touch: next };
}
