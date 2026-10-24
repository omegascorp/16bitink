import type { Rng } from '../../logic/rng';
import { bezier, closed, oval, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { arch, beam, block, frontOf, gable, HOLE, THATCH, TIMBER, TIMBER_DARK } from './build';
import { PLANK, STONE } from './darkPaints';
import { mine } from './mines';
import { flask, gem, GEM, IRON, lump } from './parts';
import { blob, crisp, flat, glow, mix, paint, rgba, SHADOW, soft, sparkle } from './paintKit';

/**
 * The rare-resource workings: the alchemist's lab (mercury), the sulfur
 * dune with its digger's hut, and the gem pond with its sorting shack.
 */
const BRICK = '#7a4434';
const DUNE = '#b08e2a';

/** A puff of smoke or steam: soft overlapping blobs drifting up and right. */
function plume(d: Draw, rng: Rng, from: Pt, color: string, n = 4, size = 4): void {
  for (let i = 0; i < n; i++) {
    const c = pt(from.x + i * 2.4 + (rng() - 0.5) * 2, from.y - i * 4.5);
    const s = blob(c, size * (0.7 + i * 0.22), size * (0.55 + i * 0.16), rng, 0.25, 14);
    soft(d.pen.ctx, 1, () => d.pen.fill(s, color, 0.42 - i * 0.06));
    d.pen.hair(s.slice(10, 18), 0.4, d.ink, 0.25);
  }
}

function lab(d: Draw, rng: Rng): void {
  const furnace = { x0: 4, x1: 15, z0: 14, z1: 22, h0: 0, h1: 38 };
  const house = { x0: -27, x1: 3, z0: 8, z1: 26, h0: 0, h1: 17 };
  block(d, rng, furnace, BRICK, 'stone');
  const fat = frontOf(furnace);
  const fm = arch(d, fat, 3, 5, 6, BRICK, 1.2);
  d.pen.clipped(fm, () => glow(d.pen.ctx, fat(5.5, 1.5), 5, '#f2a24a', 0.9));
  d.pen.fill(crisp([fat(1.5, 38), fat(9.5, 38), fat(9.5, 38.8), fat(1.5, 38.8)], 2), HOLE, 0.9);
  block(d, rng, house, STONE, 'stone', false);
  const at = frontOf(house);
  arch(d, at, 12, 7, 11, STONE, 1.6);
  for (const u of [3.5, 23]) {
    const win = arch(d, at, u, 3.6, 6, STONE, 0.9, 6);
    d.pen.clipped(win, () => glow(d.pen.ctx, at(u + 1.8, 8), 4, '#b9e0c8', 0.7));
  }
  gable(d, rng, house, 12, 'z', '#3e3a4a', 'slate', STONE);
  // The bench outside, its flasks; the alembic on its stand by the door, piped into a receiver.
  const bench = crisp([pt(-34, 6), pt(-18, 6), pt(-18, 7.6), pt(-34, 7.6)], 2);
  for (const x of [-32.5, -19.5]) beam(d, pt(x, 7), pt(x, 12), 1.2, TIMBER_DARK, 0.4);
  flat(d, bench, PLANK, { tone: 0, line: 0.5 });
  flask(d, pt(-30, 6), 3.2);
  flask(d, pt(-23.5, 6), 2.4, '#9fd0a8');
  beam(d, pt(17, 12), pt(19, 3), 1.1, IRON, 0.4);
  beam(d, pt(25, 12), pt(23, 3), 1.1, IRON, 0.4);
  flask(d, pt(21, 4), 4.6);
  d.pen.stroke(bezier(pt(21, -5.5), pt(28, -11), pt(31, 3), 10), 1.1, '#9fb3c0', 0.95, false);
  d.pen.hair(bezier(pt(21, -5.5), pt(28, -11), pt(31, 3), 10), 0.35, d.ink, 0.8);
  flask(d, pt(31, 10), 2.8);
}

function labAir(d: Draw, rng: Rng): void {
  plume(d, rng, pt(13, -58), '#8e8798', 3, 3.6);
}

function sulfurDune(d: Draw, rng: Rng): void {
  const dune = [...bezier(pt(-39, 7), pt(-24, -40), pt(-4, -42), 14), ...bezier(pt(-4, -42), pt(18, -42), pt(39, 7), 14).slice(1)];
  paint(d, dune, DUNE, { shadow: 0.7, hatch: 0.3, cross: true, line: 0.75 });
  d.pen.clipped(dune, () => {
    soft(d.pen.ctx, 4, () => d.pen.fill(oval(22, -6, 22, 26, 24), '#6e4c12', 0.5));
    soft(d.pen.ctx, 5, () => d.pen.fill(oval(-14, -30, 14, 9, 20), '#e0c770', 0.35));
    // Crust ridges and crystal flecks, a scorched seam where the fumes come up.
    for (let k = 0; k < 6; k++) {
      const y = -32 + k * 6.5;
      d.pen.hair(bezier(pt(-30 + k * 2, y + 6), pt(-6, y - 2), pt(26 - k, y + 5), 10), 0.45, mix(DUNE, '#5a3a0c', 0.6), 0.6);
    }
    d.pen.stipple(dune, 260, () => 0.6, 0.55, '#dcc46a');
    d.pen.stipple(dune, 160, (x) => (x > 0 ? 0.8 : 0.2), 0.45, '#5a3a0c');
  });
  for (const c of [pt(-13, -24), pt(6, -13)]) {
    const v = oval(c.x, c.y, 2.6, 1.2, 12);
    d.pen.fill(oval(c.x, c.y - 0.6, 4.4, 2.2, 14), '#6e4c12', 0.6);
    d.pen.fill(v, HOLE, 0.9);
  }
  // A shovel stuck in the dune.
  d.pen.stroke([pt(-24, -8), pt(-21, -26)], 1, TIMBER_DARK, 1, false);
  paint(d, [pt(-25.5, -7), pt(-22, -6.4), pt(-22.6, -1.5), pt(-24.6, -0.6), pt(-26, -2.4)], IRON, { shadow: 0.4, hatch: 0, line: 0.45 });
  const hut = { x0: 12, x1: 32, z0: 0, z1: 12, h0: 0, h1: 12 };
  block(d, rng, hut, PLANK, 'plank', false);
  const at = frontOf(hut);
  const door = crisp([at(4, 0), at(9, 0), at(9, 8), at(4, 8)], 2);
  d.pen.fill(door, HOLE, 0.9);
  d.pen.stroke(closed(door), 0.5, d.ink, 0.9);
  gable(d, rng, hut, 8, 'x', THATCH, 'thatch', PLANK, 1.6);
  // A barrel of it, lidless, by the hut.
  const bx = -2;
  const barrel = [pt(bx - 4, 10), pt(bx - 4.6, 5), pt(bx - 4, 0), pt(bx + 4, 0), pt(bx + 4.6, 5), pt(bx + 4, 10)];
  paint(d, barrel, TIMBER, { shadow: 0.55, hatch: 0.25, line: 0.55 });
  for (const y of [2, 8]) d.pen.stroke([pt(bx - 4.4, y), pt(bx + 4.4, y)], 0.8, IRON, 0.95, false);
  paint(d, oval(bx, 0, 4, 1.4, 14), DUNE, { shadow: 0.2, hatch: 0, line: 0.5 });
}

function steam(d: Draw, rng: Rng): void {
  plume(d, rng, pt(-13, -27), '#b3ab96', 3, 3);
  plume(d, rng, pt(6, -16), '#b3ab96', 3, 2.6);
}

function gemPond(d: Draw, rng: Rng): void {
  const shack = { x0: -34, x1: -12, z0: 26, z1: 38, h0: 0, h1: 13 };
  block(d, rng, shack, PLANK, 'plank', false);
  const sat = frontOf(shack);
  const door = crisp([sat(13, 0), sat(18, 0), sat(18, 9), sat(13, 9)], 2);
  d.pen.fill(door, HOLE, 0.9);
  d.pen.stroke(closed(door), 0.5, d.ink, 0.9);
  gable(d, rng, shack, 8, 'x', THATCH, 'thatch', PLANK, 1.6);
  // The sluice: a trough on trestles from the shack down to the water.
  beam(d, pt(-6, -18), pt(14, -6), 3.2, PLANK);
  for (const p of [pt(-3, -16), pt(9, -9)]) beam(d, p, pt(p.x, p.y + 7), 1.1, TIMBER_DARK, 0.4);
  // The pond: a rim of stones round still green water.
  const c = pt(2, -3);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    lump(d, rng, pt(c.x + Math.cos(a) * 29, c.y + Math.sin(a) * 12.5), 3.4, 2.4, mix('#5e574c', '#8a8070', rng() * 0.4), 0.45);
  }
  const water = oval(c.x, c.y, 28, 12, 36);
  d.pen.fill(water, '#0e1c1c', 1);
  d.pen.clipped(water, () => {
    const g = d.pen.ctx.createLinearGradient(0, c.y - 12, 0, c.y + 12);
    g.addColorStop(0, rgba('#143432', 0.95));
    g.addColorStop(1, rgba('#3a6e62', 0.9));
    d.pen.ctx.fillStyle = g;
    d.pen.ctx.fillRect(c.x - 30, c.y - 14, 60, 28);
    d.pen.fill(oval(c.x - 1, c.y - 9, 30, 6, 24), SHADOW, 0.25);
    for (let k = 0; k < 5; k++) d.pen.hair([pt(c.x - 18 + k * 7, c.y + 2 + (k % 2) * 3), pt(c.x - 12 + k * 7, c.y + 2 + (k % 2) * 3)], 0.5, '#9fbcb0', 0.5);
  });
  d.pen.stroke(closed(water), 0.6, d.ink, 0.9);
  // Gems: on the bed under the water, and sorted on the near rim.
  for (const [x, y, r] of [[-12, -2, 2.6], [8, 3, 2.2], [16, -4, 2]] as const) {
    d.pen.clipped(water, () => gem(d, pt(c.x + x, c.y + y), r, mix(GEM, '#143432', 0.45), 0.4));
  }
  for (const [x, y, r] of [[-22, 10, 3.4], [-15, 12, 2.6], [19, 11, 3], [26, 7.5, 2.4]] as const) gem(d, pt(c.x + x, c.y + y), r);
}

function gemGlints(d: Draw): void {
  for (const p of [pt(-21.5, 5), pt(20.5, 6), pt(-8, -6.5)]) sparkle(d, p, 2.2);
}

export const MINES_B = {
  'mine-mercury': mine(lab, 36, labAir),
  'mine-sulfur': mine(sulfurDune, 38, steam),
  'mine-gems': mine(gemPond, 36, gemGlints),
} as const;

