import type { Rng } from '../../logic/rng';
import { closed, oval, pt, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import { beam, block, frontOf, gable, HOLE, SHINGLE, TIMBER, TIMBER_DARK } from './build';
import { PLANK } from './darkPaints';
import { cart, cluster, crag, CRYSTAL, GOLD, IRON, logStack, lump, mouth, rails } from './parts';
import { blob, boundsOf, crisp, flat, glow, groundShadow, mix, paint, SHADOW, sparkle, sprite } from './paintKit';
import { SITE_FRAME } from './types';
import type { SiteDrawer } from './types';

/**
 * The mines a hero captures (gold, the sawmill, the ore pit, the crystal
 * cavern), each its own workings on one tile, drawn as finished ink and
 * wash with a soft shadow on the ground.
 */
const BOUNDS = boundsOf(SITE_FRAME.mine);
/** Ore as it lies at a pit head: dark iron-grey. */
const DARK_ORE = '#5a5b62';

export function mine(draw: (d: Draw, rng: Rng) => void, shadowW = 36, air?: (d: Draw, rng: Rng) => void): SiteDrawer {
  return (ctx, seed, f) => sprite(ctx, seed, f, { bounds: BOUNDS, line: 0.5, rim: 0.4, ground: (d) => groundShadow(d, 4, 5, shadowW, 6, 0.4), air }, draw);
}

/** A timber-framed adit: two posts and a lintel round a dark opening. */
function adit(d: Draw, rng: Rng, x: number, y: number, w: number, h: number): void {
  mouth(d, rng, pt(x, y), w, h);
  beam(d, pt(x - w / 2 + 1, y + 1), pt(x - w / 2 + 1.5, y - h + 1), 3, TIMBER);
  beam(d, pt(x + w / 2 - 1, y + 1), pt(x + w / 2 - 1.5, y - h + 1), 3, mix(TIMBER, SHADOW, 0.2));
  beam(d, pt(x - w / 2 - 2, y - h), pt(x + w / 2 + 2, y - h - 0.5), 3.4, TIMBER);
}

function goldMine(d: Draw, rng: Rng): void {
  const rock = crag(d, rng, -37, 37, 3, 54, '#6e6556', 0.42);
  // A gold vein through the rock.
  d.pen.clipped(rock, () => vein(d, rng));
  adit(d, rng, -3, 3, 18, 21);
  rails(d, pt(4, 12), pt(-3, 3), 7);
  // A pick leant on the frame.
  d.pen.stroke([pt(-17, 4), pt(-21, -10)], 1, TIMBER_DARK, 1, false);
  d.pen.stroke([pt(-24.5, -9), pt(-21, -11), pt(-17.5, -10.5)], 1.1, IRON, 1, false);
  cart(d, rng, pt(17, 10), 15, GOLD, false);
}

function vein(d: Draw, rng: Rng): void {
  for (let i = 0; i < 14; i++) {
    const p = pt(-26 + i * 3.6 + (rng() - 0.5) * 3, -30 + Math.sin(i * 0.7) * 4 + (rng() - 0.5) * 3);
    d.pen.dot(p.x, p.y, 0.6 + rng() * 0.6, GOLD, 0.95);
  }
}

function sawmill(d: Draw, rng: Rng): void {
  const b = { x0: -28, x1: 6, z0: 8, z1: 26, h0: 0, h1: 17 };
  block(d, rng, b, PLANK, 'plank', false);
  const at = frontOf(b);
  // The open saw bay, the round blade glinting in the dark.
  const bay = crisp([at(14, 0), at(28, 0), at(28, 12), at(14, 12)], 2);
  d.pen.fill(bay, HOLE, 0.92);
  const bc = at(21, 6);
  d.pen.clipped(bay, () => {
    const blade = oval(bc.x, bc.y, 5, 5, 24).map((p, i) => (i % 2 === 0 ? p : pt(bc.x + (p.x - bc.x) * 0.86, bc.y + (p.y - bc.y) * 0.86)));
    paint(d, blade, '#b8bcc6', { shadow: 0.4, hatch: 0, line: 0.4, gloss: true });
    d.pen.dot(bc.x, bc.y, 0.8, IRON, 1);
    d.pen.fill(crisp([at(13, 3.5), at(29, 3.5), at(29, 5), at(13, 5)], 2), TIMBER, 0.95);
  });
  d.pen.stroke(closed(bay), 0.6, d.ink, 0.9);
  gable(d, rng, b, 11, 'x', SHINGLE, 'shingle', PLANK);
  // The waterwheel on the right, fed by a flume, turning in its race.
  const stream = [pt(4, 4), pt(37, -1), pt(37, 8), pt(6, 10)];
  paint(d, crisp(stream, 4), '#2c4a5c', { shadow: 0.3, hatch: 0, line: 0.5 });
  for (let i = 0; i < 4; i++) d.pen.hair([pt(10 + i * 7, 6 + (i % 2)), pt(14 + i * 7, 5.5 + (i % 2))], 0.5, '#9fb4b8', 0.55);
  const w = pt(18, -12);
  beam(d, pt(36, -32), pt(19, -27), 4, TIMBER);
  const rimO = oval(w.x, w.y, 14, 14, 32);
  const rimI = oval(w.x, w.y, 11.6, 11.6, 32);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    beam(d, w, pt(w.x + Math.cos(a) * 12.5, w.y + Math.sin(a) * 12.5), 1.3, TIMBER, 0.4);
  }
  const ring = [...rimO, rimO[0]!, ...[...rimI, rimI[0]!].reverse()];
  d.pen.fill(ring, TIMBER, 0.95);
  d.pen.clipped(rimO, () => d.pen.fill(oval(w.x + 4, w.y + 4, 13, 13, 24), SHADOW, 0.3));
  d.pen.stroke(closed(rimO), 0.7, d.ink, 0.95);
  d.pen.stroke(closed(rimI), 0.5, d.ink, 0.85);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    beam(d, pt(w.x + Math.cos(a) * 12, w.y + Math.sin(a) * 12), pt(w.x + Math.cos(a) * 16, w.y + Math.sin(a) * 16), 1.6, mix(TIMBER, PAPER_FILL, 0.15), 0.4);
  }
  paint(d, oval(w.x, w.y, 2.2, 2.2, 12), IRON, { shadow: 0.5, hatch: 0, line: 0.5 });
  logStack(d, rng, pt(-23, 11), 3.2, [4, 3, 2], 9);
}

function orePit(d: Draw, rng: Rng): void {
  const shed = { x0: 8, x1: 32, z0: 16, z1: 30, h0: 0, h1: 12 };
  block(d, rng, shed, PLANK, 'plank', false);
  gable(d, rng, shed, 7, 'x', '#4e463f', 'slate', PLANK);
  // The headframe: an A-frame of squared timbers over the shaft, its sheave wheel on top.
  const top = pt(-4, -50);
  beam(d, pt(-20, 0), pt(top.x - 1, top.y + 4), 3, mix(TIMBER, SHADOW, 0.25));
  beam(d, pt(10, -2), pt(top.x + 1, top.y + 4), 3, mix(TIMBER, SHADOW, 0.3));
  // The shaft collar: a plank box round a dark hole.
  const collar = crisp([pt(-15, 2), pt(7, 2), pt(7, -5), pt(-15, -5)], 2);
  flat(d, collar, PLANK, { tone: 0.05 });
  const hole = crisp([pt(-12, -6), pt(5, -6), pt(7, -10), pt(-10, -10)], 2);
  d.pen.fill(hole, HOLE, 0.95);
  d.pen.stroke(closed(hole), 0.5, d.ink, 0.9);
  for (let x = -12; x < 7; x += 4) d.pen.hair([pt(x, 2), pt(x, -5)], 0.4, TIMBER_DARK, 0.7);
  d.pen.stroke([pt(-4, -46), pt(-4, -9)], 0.5, d.ink, 0.9, false);
  beam(d, pt(-24, 2), pt(top.x - 2, top.y + 2), 3.4, TIMBER);
  beam(d, pt(16, 2), pt(top.x + 2, top.y + 2), 3.4, mix(TIMBER, SHADOW, 0.15));
  beam(d, pt(-17, -22), pt(10, -22), 2.6, TIMBER);
  beam(d, pt(-15, -21), pt(5, -38), 1.6, mix(TIMBER, SHADOW, 0.2));
  beam(d, pt(8, -21), pt(-12, -38), 1.6, mix(TIMBER, SHADOW, 0.1));
  const sheave = oval(top.x, top.y + 6, 6, 6, 22);
  paint(d, sheave, '#4a484e', { shadow: 0.5, hatch: 0, line: 0.6 });
  d.pen.fill(oval(top.x, top.y + 6, 4.2, 4.2, 18), mix(TIMBER, SHADOW, 0.3), 0.9);
  for (let i = 0; i < 6; i++) d.pen.hair([pt(top.x, top.y + 6), pt(top.x + Math.cos(i) * 4.4, top.y + 6 + Math.sin(i) * 4.4)], 0.5, IRON, 0.9);
  d.pen.dot(top.x, top.y + 6, 0.9, IRON, 1);
  // The ore heap, and a cart of it on the rails.
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    lump(d, rng, pt(-30 + t * 16 + (rng() - 0.5) * 2, 8 - Math.sin(t * Math.PI) * 5 - (i % 3) * 1.6), 3.4, 2.8, mix(DARK_ORE, rng() < 0.3 ? '#6e4a34' : DARK_ORE, 0.4));
  }
  rails(d, pt(22, 12), pt(6, 2), 6);
  cart(d, rng, pt(19, 10), 13, DARK_ORE);
}

function crystalCavern(d: Draw, rng: Rng): void {
  crag(d, rng, -38, 38, 3, 56, '#5a5156', 0.55);
  mouth(d, rng, pt(-1, 3), 24, 25);
  cluster(d, rng, pt(-21, 6), 22);
  cluster(d, rng, pt(23, 5), 16);
  cluster(d, rng, pt(7, -46), 13);
  cluster(d, rng, pt(-6, -16), 8);
  for (let i = 0; i < 4; i++) d.pen.fill(blob(pt(-30 + i * 18, 6), 2.6, 1.6, rng, 0.2, 10), '#3e373a', 0.9);
}

function cavernGlow(d: Draw): void {
  glow(d.pen.ctx, pt(-1, -6), 13, CRYSTAL, 0.35);
  for (const p of [pt(-24, -14), pt(25, -8), pt(5, -55)]) sparkle(d, p, 2.4);
}

function goldGlints(d: Draw): void {
  for (const p of [pt(13, -4), pt(20, -2), pt(-12, -30), pt(6, -34)]) sparkle(d, p, 2.2);
}

export const MINES_A = {
  'mine-gold': mine(goldMine, 36, goldGlints),
  'mine-wood': mine(sawmill, 38),
  'mine-ore': mine(orePit, 36),
  'mine-crystal': mine(crystalCavern, 37, cavernGlow),
} as const;
