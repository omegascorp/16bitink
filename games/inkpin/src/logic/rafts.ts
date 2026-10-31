import { boxPush, MAX_SPEED, settle, type Boulder } from './boulders';
import { capsuleContact, type Contact, type Seg } from './geom';
import { COIN, GRAIN_R, GRAVITY, LAVA, STONE, WATER, type Grains } from './particles';

/**
 * Pumice rafts: a wide flat slab of stone so full of air that it floats on
 * lava as well as on water, and never burns. A raft lives in the world's
 * boulders (so creatures, drains, gates and slabs treat it as a body), as a
 * box RAFT_HW by RAFT_HH; against walls it's a capsule of that size, so its
 * ends slide along a wall instead of catching on it.
 */

export const RAFT_HW = 40;
export const RAFT_HH = 14;
/** How far past its sides a raft feels the liquid (px), as a crate does. */
const FEEL = GRAIN_R * 2 + 4;
/**
 * Liquid grains in that band when the raft is about half under: it floats
 * there. The band under a raft is wider than a crate's, so it takes more.
 * Lava packs looser round it than water, so it takes fewer of those.
 */
const AFLOAT_WATER = 26;
const AFLOAT_LAVA = 20;
/** Drag on its bobbing in liquid: it bobs a little and comes to rest. */
const DRAG = 0.93;
/** How fast it takes up the liquid's current: within about 10 steps. */
const CURRENT = 0.1;
/** Fastest it drifts sideways (px per step, about 84 px/s): slower than Nib walks, so a ride is easy to follow. */
export const RAFT_DRIFT = 0.7;
/** Speed it keeps sliding along the floor when aground. */
const SLIDE = 0.8;
/** Liquid on its deck runs off toward the nearer end this fast (px per step): the deck stays dry to stand on. */
const SHED = 1;
/** Circles along its length that stand for it against walls: about every 6 px. */
const RIBS = 9;

export function raft(x: number, y: number): Boulder {
  return { x, y, vx: 0, vy: 0, r: RAFT_HW, angle: 0, crate: false, raft: true, hw: RAFT_HW, hh: RAFT_HH, gone: false };
}

/** One step: floats, drifts with the current, and pushes the liquid out of its box. Walls, pins, slabs and stone hold it. */
export function stepRaft(b: Boulder, segs: readonly Seg[], g: Grains, k: Contact): void {
  if (b.gone) return;
  let wet = 0;
  let lava = 0;
  let flow = 0;
  const rx = b.hw + FEEL;
  const ry = b.hh + FEEL;
  g.near(b.x, b.y, Math.hypot(rx, ry), (i) => {
    const kind = g.kind[i];
    if (kind !== WATER && kind !== LAVA) return;
    if (Math.abs(g.x[i]! - b.x) > rx || Math.abs(g.y[i]! - b.y) > ry) return;
    wet++;
    if (kind === LAVA) lava++;
    flow += g.vx[i]!;
  });
  const afloat = wet ? AFLOAT_WATER + ((AFLOAT_LAVA - AFLOAT_WATER) * lava) / wet : AFLOAT_WATER;
  b.vy += GRAVITY * (1 - Math.min(2, wet / afloat));
  if (wet > 2) {
    // It drifts at the liquid's own speed (drag is against the liquid, not the board).
    b.vx += (flow / wet - b.vx) * CURRENT;
    b.vy *= DRAG;
  }
  b.vx = Math.max(-RAFT_DRIFT, Math.min(RAFT_DRIFT, b.vx));
  if (b.vy > MAX_SPEED) b.vy = MAX_SPEED;
  b.x += b.vx;
  b.y += b.vy;
  let floored = false;
  const span = b.hw - b.hh;
  for (let pass = 0; pass < 2; pass++) {
    for (const s of segs) {
      for (let r = 0; r < RIBS; r++) {
        const off = -span + (2 * span * r) / (RIBS - 1);
        if (!capsuleContact(s, b.x + off, b.y, b.hh, k)) continue;
        if (k.ny < -0.5) floored = true;
        settle(b, k);
      }
    }
    g.near(b.x, b.y, Math.hypot(b.hw + GRAIN_R, b.hh + GRAIN_R), (i) => {
      if (g.kind[i] !== STONE) return;
      const p = boxPush(b.x, b.y, b.hw, b.hh, g.x[i]!, g.y[i]!, GRAIN_R);
      if (!p) return;
      const d = Math.hypot(p.x, p.y) || 1;
      k.nx = -p.x / d;
      k.ny = -p.y / d;
      k.depth = d;
      if (k.ny < -0.5) floored = true;
      settle(b, k);
    });
  }
  if (floored) b.vx *= SLIDE;
  pushRaftGrains(b, g);
}

/**
 * Pushes the loose grains out of the raft's box. Liquid beside it goes out
 * sideways, never up onto the deck (bobbing and drifting would scoop it up
 * there, under Nib's feet), and what's on the deck runs off its ends. Gold
 * stays put on the deck: it's cargo.
 */
function pushRaftGrains(b: Boulder, g: Grains): void {
  const deck = b.y - b.hh;
  g.near(b.x, b.y, Math.hypot(b.hw + GRAIN_R * 3, b.hh + GRAIN_R * 3), (i) => {
    const kind = g.kind[i];
    if (kind === STONE) return;
    const dx = g.x[i]! - b.x;
    const side = Math.sign(dx) || 1;
    if (kind !== COIN && Math.abs(dx) < b.hw && g.y[i]! < deck && g.y[i]! > deck - GRAIN_R * 3) g.x[i] = g.x[i]! + side * SHED;
    const p = boxPush(b.x, b.y, b.hw, b.hh, g.x[i]!, g.y[i]!, GRAIN_R);
    if (!p) return;
    if (kind === COIN) g.wake(i);
    if (p.y < 0 && g.y[i]! >= deck) {
      // Beside it, not on it: out to the side.
      g.x[i] = b.x + side * (b.hw + GRAIN_R);
      return;
    }
    g.x[i] = g.x[i]! + p.x;
    g.y[i] = g.y[i]! + p.y;
  });
}
