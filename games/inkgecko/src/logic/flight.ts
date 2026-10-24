import { BOARD, type PillarDef } from '../level/types';
import type { ColourId } from './colours';
import { D, type Line } from './line';
import type { Pt } from './path';

/** Barn levels: shots bounce off timber walls this far inside the board's left, right and top edges. */
export const WALL_INSET = 14;
/** A shot bounces this many times at most, then flies out. */
export const MAX_BOUNCES = 3;
/** A shot glances off a pillar this many times at most (on top of any wall bounces). */
export const MAX_GLANCES = 4;
/** A shot marble's radius, for glancing off pillars. */
export const SHOT_R = D / 2;
/** A marble that touches a shot within this distance (centre to centre) is hit. */
export const HIT_DIST = D * 0.86;

/** What a shot needs for flying: where it is, its speed, and its bounces and glances so far. */
export interface Flier {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bounces: number;
  glances: number;
}

/** Barn levels: a shot that reaches a wall comes off it like a ball off a cushion; where it knocked, if it did. */
export function bounce(shot: Flier): Pt | null {
  if (shot.bounces >= MAX_BOUNCES) return null;
  const lo = WALL_INSET;
  const hi = BOARD.w - WALL_INSET;
  let hit = false;
  if (shot.x < lo && shot.vx < 0) {
    shot.x = 2 * lo - shot.x;
    shot.vx = -shot.vx;
    hit = true;
  } else if (shot.x > hi && shot.vx > 0) {
    shot.x = 2 * hi - shot.x;
    shot.vx = -shot.vx;
    hit = true;
  }
  if (shot.y < lo && shot.vy < 0) {
    shot.y = 2 * lo - shot.y;
    shot.vy = -shot.vy;
    hit = true;
  }
  if (!hit) return null;
  shot.bounces++;
  return { x: shot.x, y: shot.y };
}

/** The ruins: a shot that meets a pillar glances off it, mirrored about the pillar's surface; where it knocked, if it did. */
export function glance(shot: Flier, pillars: readonly PillarDef[]): Pt | null {
  if (shot.glances >= MAX_GLANCES) return null;
  for (const p of pillars) {
    const dx = shot.x - p.x;
    const dy = shot.y - p.y;
    const d = Math.hypot(dx, dy);
    const reach = p.r + SHOT_R;
    if (d >= reach || d === 0) continue;
    const nx = dx / d;
    const ny = dy / d;
    const along = shot.vx * nx + shot.vy * ny;
    // Only a shot still heading in is turned (one already leaving it just flies on).
    if (along >= 0) continue;
    shot.vx -= 2 * along * nx;
    shot.vy -= 2 * along * ny;
    shot.x = p.x + nx * reach;
    shot.y = p.y + ny * reach;
    shot.glances++;
    return { x: shot.x - nx * SHOT_R, y: shot.y - ny * SHOT_R };
  }
  return null;
}

/** The colour a Geode takes: the marble it hit, or its nearest neighbour that isn't a stone. */
export function wildColour(line: Line, index: number, fallback: ColourId): ColourId {
  const ms = line.marbles;
  for (let d = 0; d < ms.length; d++) {
    for (const i of [index - d, index + d]) {
      const m = ms[i];
      if (m && !m.stone) return m.colour;
    }
  }
  return fallback;
}

/** Whether distance `s` along a line's track lies in a gap between two of its marbles. */
export function inGap(line: Line, s: number): boolean {
  const ms = line.marbles;
  for (let i = 1; i < ms.length; i++) {
    const a = ms[i - 1]!;
    const b = ms[i]!;
    if (s > a.s + HIT_DIST && s < b.s - HIT_DIST) return true;
  }
  return false;
}
