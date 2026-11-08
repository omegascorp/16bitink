import type { Creature } from './creatures';
import { BOSS_SIGHT_X, type Blot } from './guards';
import type { BreathDef, LevelDef } from './level';
import { GAS, GRAIN_R, STEPS_PER_SECOND, type Grains } from './particles';

/**
 * The Tomb Guardian's breath (chapter 3's boss, level 30): an old toad that
 * stays in its coffin. From the first pull, every `every` seconds, while Nib
 * is within its sight (BOSS_SIGHT_X sideways, any height), it breathes out
 * `count` gas grains from its mouth toward him, in rows of BREATH_ROW,
 * BREATH_SPEED px per step in a fan of ±BREATH_FAN. Its throat swells for
 * SWELL_STEPS first, as the tell. It never has more than `max` breath grains
 * in play: burnt and vented ones free up room. Gas and blasts don't hurt it;
 * a slab falling on it (the coffin lid) beats it like any guard.
 */

export const BREATH_DEFAULT: BreathDef = { every: 5, count: 24, max: 120 };
/** The throat swells this long (steps) before each breath. */
export const SWELL_STEPS = STEPS_PER_SECOND;
export const BREATH_SPEED = 1.5;
/** Half the fan's width (radians): ±20°. */
export const BREATH_FAN = (20 * Math.PI) / 180;
/** Grains per row, the gap between them (px), and the steps between rows (a row every 9 px of travel). */
const BREATH_ROW = 4;
const BREATH_LANE = 10;
const ROW_STEPS = 6;

export interface BreathState {
  /** The step of the first pull: the beat starts there. Null until then. */
  start: number | null;
  /** The breath grains still in play, by grain id. */
  ids: number[];
  /** Grains of the current breath still to come out, and where they go. */
  queued: number;
  dirX: number;
  dirY: number;
  nextRow: number;
}

export type BreathEvent = { readonly type: 'breath'; readonly x: number; readonly y: number };

/** The level's breath: its own, or the default when it has the toad boss; null without one. */
export function breathOf(level: LevelDef): BreathDef | null {
  if (level.breath) return level.breath;
  return level.blots.some((b) => b.boss && b.animal === 'toad') ? BREATH_DEFAULT : null;
}

export function newBreath(): BreathState {
  return { start: null, ids: [], queued: 0, dirX: 0, dirY: -1, nextRow: 0 };
}

export const saveBreath = (s: BreathState): BreathState => ({ ...s, ids: s.ids.slice() });

export function loadBreath(s: BreathState, from: BreathState): void {
  Object.assign(s, from, { ids: from.ids.slice() });
}

/** The toad that breathes: the level's live toad boss. */
export function breather(blots: readonly Blot[]): Blot | null {
  return blots.find((b) => b.boss && b.animal === 'toad' && !b.gone) ?? null;
}

const inSight = (toad: Blot, nib: Creature): boolean => Math.abs(nib.x - toad.x) < BOSS_SIGHT_X;

/** Steps since the beat started, and the steps per beat; null before the first pull. */
function phase(s: BreathState, def: BreathDef, steps: number): { t: number; every: number } | null {
  if (s.start === null) return null;
  return { t: steps - s.start, every: Math.max(1, Math.round(def.every * STEPS_PER_SECOND)) };
}

/** How swollen the toad's throat is (0..1): it fills over the last SWELL_STEPS before a breath, while Nib is in sight. */
export function swell(s: BreathState, def: BreathDef | null, toad: Blot | null, nib: Creature, steps: number): number {
  if (!def || !toad || !inSight(toad, nib)) return 0;
  const p = phase(s, def, steps);
  if (!p || p.t < 0) return 0;
  const left = p.every - (p.t % p.every);
  return left <= SWELL_STEPS ? 1 - left / SWELL_STEPS : 0;
}

/** Breath grains still in play (and forgets the ones gone). */
function live(s: BreathState, g: Grains): number {
  const mine = new Set(s.ids);
  const still: number[] = [];
  for (let i = 0; i < g.count; i++) if (g.kind[i] === GAS && mine.has(g.id[i]!)) still.push(g.id[i]!);
  s.ids = still;
  return still.length;
}

/** One step of the breath: on the beat (Nib in sight) a breath starts; a breath under way puts out its next row. */
export function stepBreath(s: BreathState, def: BreathDef | null, toad: Blot | null, nib: Creature, g: Grains, steps: number, events: BreathEvent[]): void {
  if (!def || !toad) {
    s.queued = 0;
    return;
  }
  const p = phase(s, def, steps);
  if (p && p.t > 0 && p.t % p.every === 0 && inSight(toad, nib) && s.queued === 0) {
    const room = def.max - live(s, g);
    if (room > 0) {
      const dx = nib.x - toad.x;
      const dy = nib.y - toad.y;
      const d = Math.hypot(dx, dy) || 1;
      s.dirX = dx / d;
      s.dirY = dy / d;
      s.queued = Math.min(def.count, room);
      s.nextRow = steps;
      events.push({ type: 'breath', x: toad.x + s.dirX * toad.r, y: toad.y + s.dirY * toad.r });
    }
  }
  if (s.queued > 0 && steps >= s.nextRow) {
    exhaleRow(s, toad, g);
    s.nextRow = steps + ROW_STEPS;
  }
}

/** One row of breath from the toad's mouth (on its edge toward Nib), fanned ±BREATH_FAN. */
function exhaleRow(s: BreathState, toad: Blot, g: Grains): void {
  const n = Math.min(BREATH_ROW, s.queued);
  const reach = toad.r + GRAIN_R + 1;
  const mx = toad.x + s.dirX * reach;
  const my = toad.y + s.dirY * reach;
  const base = Math.atan2(s.dirY, s.dirX);
  const widest = ((BREATH_ROW - 1) / 2) * BREATH_LANE;
  for (let j = 0; j < n; j++) {
    const lane = (j - (n - 1) / 2) * BREATH_LANE;
    const a = base + (lane / widest) * BREATH_FAN;
    if (g.count >= g.capacity) break;
    g.add(GAS, mx - s.dirY * lane, my + s.dirX * lane);
    const i = g.count - 1;
    g.vx[i] = Math.cos(a) * BREATH_SPEED;
    g.vy[i] = Math.sin(a) * BREATH_SPEED;
    s.ids.push(g.id[i]!);
  }
  s.queued -= n;
}
