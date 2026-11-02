import type { Seg } from './geom';
import type { LevelDef, Room } from './level';

/**
 * Where the rooms are, for the painter and the tests: what's open space and
 * what's rock, which stretches of a room's edge face the rock (and get the
 * ink outline), and which walls stand in the open (and must be drawn).
 */

/** True when (x, y) is inside one of the rooms (point in polygon). */
export function inRooms(rooms: readonly Room[], x: number, y: number): boolean {
  return rooms.some((room) => {
    let hit = false;
    for (let i = 0, j = room.length - 1; i < room.length; j = i++) {
      const [ax, ay] = room[i]!;
      const [bx, by] = room[j]!;
      if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) hit = !hit;
    }
    return hit;
  });
}

/** How far either side of an edge or a wall to look for open space (board px). */
const PROBE = 4;
/** Length of the pieces an edge is checked in (board px). */
const PIECE = 8;

/** Open space on both sides of the point (x, y) across the direction (ux, uy). */
function openBothSides(rooms: readonly Room[], x: number, y: number, ux: number, uy: number, reach: number): boolean {
  return inRooms(rooms, x - uy * reach, y + ux * reach) && inRooms(rooms, x + uy * reach, y - ux * reach);
}

/**
 * The stretches of the rooms' edges that face the rock, as runs of points.
 * Where two rooms join, their shared edges have open space on both sides and
 * are left out, so no seam shows between them.
 */
export function outerRuns(rooms: readonly Room[]): { x: number; y: number }[][] {
  const runs: { x: number; y: number }[][] = [];
  for (const room of rooms) {
    room.forEach(([ax, ay], i) => {
      const [bx, by] = room[(i + 1) % room.length]!;
      const len = Math.hypot(bx - ax, by - ay);
      if (len < 1) return;
      const ux = (bx - ax) / len;
      const uy = (by - ay) / len;
      const n = Math.max(1, Math.round(len / PIECE));
      let run: { x: number; y: number }[] = [];
      for (let k = 0; k < n; k++) {
        const t0 = (k / n) * len;
        const t1 = ((k + 1) / n) * len;
        const mid = (t0 + t1) / 2;
        const outer = !openBothSides(rooms, ax + ux * mid, ay + uy * mid, ux, uy, PROBE);
        if (outer) {
          if (!run.length) run = [{ x: ax + ux * t0, y: ay + uy * t0 }];
          run = [...run, { x: ax + ux * t1, y: ay + uy * t1 }];
        } else if (run.length) {
          runs.push(run);
          run = [];
        }
      }
      if (run.length) runs.push(run);
    });
  }
  return runs;
}

/** True when some of the wall stands in the open, with space on both sides, so the outline doesn't draw it. */
export function standsInTheOpen(rooms: readonly Room[], s: Seg): boolean {
  const len = Math.hypot(s.bx - s.ax, s.by - s.ay);
  if (len < 1) return false;
  const ux = (s.bx - s.ax) / len;
  const uy = (s.by - s.ay) / len;
  // Skip the ends, where a wall meets the room's edge.
  for (let d = s.t + PROBE; d <= len - s.t - PROBE; d += PIECE) {
    if (openBothSides(rooms, s.ax + ux * d, s.ay + uy * d, ux, uy, s.t + PROBE)) return true;
  }
  return false;
}

/** The walls to draw as stone bars: the level's own, and any other wall standing in the open. */
export function barWalls(level: LevelDef): readonly Seg[] {
  return level.walls.filter((s, i) => level.bars.includes(i) || standsInTheOpen(level.rooms, s));
}
