import type { Box } from './body';
import { CREATURE, type Creature } from './creatures';
import type { FaunaHost } from './fauna';
import { isSolid, ringDelta, type Terrain } from './terrain';

/** Where creatures can be hit and what they can reach, and how far things are from the prospector (fauna.ts, seaFauna.ts). */

/** How far down a tendril can reach from its knot: its full length, or to the floor under it. */
export function reachOf(t: Terrain, c: Creature, tile: number): number {
  const col = Math.floor(c.x / tile);
  const top = Math.floor(c.y / tile);
  let rows = 0;
  while (rows < CREATURE.tendril.reach && !isSolid(t, col, top + rows)) rows++;
  return Math.max(tile * 0.5, Math.min(CREATURE.tendril.reach, rows) * tile);
}

/** How far out of its burrow a rasp eel can lunge: its full length, or to the rock in front of it. */
export function lungeOf(t: Terrain, c: Creature, tile: number): number {
  const row = Math.floor(c.y / tile);
  // The first open tile in front of its mouth.
  const first = c.facing === 1 ? Math.floor(c.x / tile) : Math.floor(c.x / tile) - 1;
  let tiles = 0;
  while (tiles < CREATURE.lamprey.reach && !isSolid(t, first + c.facing * tiles, row)) tiles++;
  return Math.max(tile * 0.5, tiles * tile);
}

/** The box a creature is hit in, px. */
export function bodyOf(c: Creature, t: Terrain, tile: number): Box {
  if (c.kind === 'puffball') return { x: c.x - 13, y: c.y - 28, w: 26, h: 28 };
  if (c.kind === 'tendril') return { x: c.x - 10, y: c.y, w: 20, h: Math.max(14, c.reach * reachOf(t, c, tile)) };
  if (c.kind === 'grazer') return { x: c.x - 22, y: c.y - 24, w: 44, h: 24 };
  if (c.kind === 'crab') return { x: c.x - 17, y: c.y - 20, w: 34, h: 20 };
  if (c.kind === 'jelly') return { x: c.x - 12, y: c.y - 14, w: 24, h: 30 };
  if (c.kind === 'lamprey') {
    // From its mouth out to its head; a little of its head shows even tucked in.
    const out = Math.max(14, c.reach * lungeOf(t, c, tile));
    return { x: c.facing === 1 ? c.x : c.x - out, y: c.y - 8, w: out, h: 16 };
  }
  const G = c.kind === 'leviathan' ? CREATURE.leviathan : CREATURE.mother;
  return { x: c.x - (G.w * tile) / 2, y: c.y - G.h * tile, w: G.w * tile, h: G.h * tile };
}

/** Whether two boxes overlap, measured the short way round. */
export function overlaps(host: FaunaHost, a: Box, b: Box): boolean {
  const bx = a.x + ringDelta(host.terrain, a.x, b.x, host.tile);
  return a.x < bx + b.w && a.x + a.w > bx && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** From the prospector's middle to (x, y), px, the short way round. */
export function distance(host: FaunaHost, x: number, y: number): number {
  const p = host.player;
  return Math.hypot(ringDelta(host.terrain, p.x + p.w / 2, x, host.tile), p.y + p.h / 2 - y);
}

/** From the prospector's middle to the nearest edge of a box, px (0 inside it). */
export function edgeDistance(host: FaunaHost, b: Box): number {
  const p = host.player;
  const dx = Math.max(0, Math.abs(ringDelta(host.terrain, b.x + b.w / 2, p.x + p.w / 2, host.tile)) - b.w / 2);
  const dy = Math.max(0, Math.abs(p.y + p.h / 2 - (b.y + b.h / 2)) - b.h / 2);
  return Math.hypot(dx, dy);
}

/** Whether nothing solid lies on the straight line from (x, y) along (dx, dy). */
export function clear(t: Terrain, x: number, y: number, dx: number, dy: number, tile: number): boolean {
  const steps = Math.ceil(Math.hypot(dx, dy) / (tile / 3));
  for (let i = 1; i < steps; i++) {
    const k = i / steps;
    if (isSolid(t, Math.floor((x + dx * k) / tile), Math.floor((y + dy * k) / tile))) return false;
  }
  return true;
}
