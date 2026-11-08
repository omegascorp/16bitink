import type { Rng } from '../../logic/rng';
import { bezier, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import {
  arch, block, CROWN_GOLD, drum, frontOf, gable, HOLE, merlonRow, P, pennant, pyramid, roundCrown, slit, type Box,
} from './build';
import { CROWN_BLUE, STONE } from './darkPaints';
import { blob, crisp, dab, flat, groundShadow, mix, paint, SHADOW, sprite } from './paintKit';
import { cone, finial } from './spire';
import { SITE_FRAME } from './types';

/**
 * The Crown's hill-town, as Heroes III's Castle seen on the adventure map:
 * a coursed-stone curtain wall on a grassy knoll, round corner towers
 * under blue slate spires with gilt trim, a twin-towered gatehouse at the
 * front middle (the gate tile, where the hero rides in), a few houses
 * inside, and the tall keep at the back under a blue pyramid roof flying
 * the Crown's pennant. Spans three tiles across and the row behind.
 */
const BLUE = CROWN_BLUE;
const SLATE_HOUSE = '#3e4a63';
const EARTH = '#5e4a34';
const GRASS = '#3d5a28';
const PLASTER = '#a49478';
const FIELDSTONE = '#5e574c';
/** The knoll the town stands on: everything above it is lifted this much. */
const KNOLL = 6;

function spireTower(d: Draw, rng: Rng, x: number, z: number, r: number, h: number, rise: number, wave: number): void {
  const t = drum(d, rng, x, z, r, 0, h, STONE);
  const at = (u: number, v: number): Pt => pt(t.base.x + u, t.base.y - v);
  slit(d, at, -r * 0.45, h * 0.45, 1.8, 4.2);
  slit(d, at, -r * 0.25, h * 0.75, 1.6, 3.6);
  // Corbels under the eave: a row of small dark teeth.
  for (let i = 1; i < 7; i++) {
    const s = (i / 7) * Math.PI;
    const px = t.top.x - r * Math.cos(s);
    const py = t.top.y + r * 0.6 * Math.sin(s);
    d.pen.fill([pt(px - 0.6, py + 0.2), pt(px + 0.6, py + 0.2), pt(px + 0.4, py + 2.2), pt(px - 0.4, py + 2.2)], mix(STONE, SHADOW, 0.55), 0.9);
  }
  const apex = cone(d, rng, t.top, r + 2.2, rise, BLUE);
  pennant(d, finial(d, apex, 2.5), 7, BLUE, 8, wave);
}

function gateTower(d: Draw, rng: Rng, x: number, z: number, r: number, h: number, wave: number): void {
  const t = drum(d, rng, x, z, r, 0, h, STONE);
  const at = (u: number, v: number): Pt => pt(t.base.x + u, t.base.y - v);
  slit(d, at, -r * 0.35, h * 0.55, 1.6, 4);
  // A corbelled parapet, a touch wider than the shaft.
  const p = drum(d, rng, x, z, r + 1.2, h, h + 4, STONE, false);
  roundCrown(d, p.top, r + 1.2, STONE, 6);
  pennant(d, pt(p.top.x + 0.5, p.top.y - 0.5), 11, BLUE, 9, wave);
}

/** The keep: a tall square tower with a blue pyramid roof, gilt along its eaves, and its stair turret. */
function keep(d: Draw, rng: Rng): void {
  const b: Box = { x0: -16, x1: 16, z0: 48, z1: 72, h0: 0, h1: 50 };
  block(d, rng, b, mix(STONE, '#b0a690', 0.25), 'stone', false);
  const at = frontOf(b);
  for (const u of [7, 22]) slit(d, at, u, 30, 3, 7);
  slit(d, at, 14, 14, 4, 9);
  // A gilt string course under the eaves.
  d.pen.fill(crisp([P(b.x0, b.z0, b.h1 - 1.2), P(b.x1, b.z0, b.h1 - 1.2), P(b.x1, b.z1, b.h1 - 1.2), P(b.x1, b.z1, b.h1), P(b.x1, b.z0, b.h1), P(b.x0, b.z0, b.h1)], 3), CROWN_GOLD, 0.9);
  const apex = pyramid(d, rng, b, 30, BLUE, 'slate', 2.5);
  d.pen.stroke([P(b.x0 - 2.5, b.z0 - 2.5, b.h1 - 1.2), P(b.x1 + 2.5, b.z0 - 2.5, b.h1 - 1.2), P(b.x1 + 2.5, b.z1 + 2.5, b.h1 - 1.2)], 1.1, CROWN_GOLD, 0.95, false);
  pennant(d, finial(d, apex, 3), 10, BLUE, 12, 1);
}

function house(d: Draw, rng: Rng, b: Box, along: 'x' | 'z', rise: number): void {
  const wallC = PLASTER;
  block(d, rng, b, wallC, 'plaster', false);
  const at = frontOf(b);
  const w = b.x1 - b.x0;
  for (let u = 3; u + 2.5 < w; u += 6) {
    const win = crisp([at(u, 5), at(u + 2.4, 5), at(u + 2.4, 9), at(u, 9)], 1.5);
    d.pen.fill(win, HOLE, 0.85);
    d.pen.stroke([...win, win[0]!], 0.4, d.ink, 0.8);
  }
  gable(d, rng, b, rise, along, SLATE_HOUSE, 'slate', wallC, 1.6);
}

/** The knoll: a grassy rise with an earth and rock face along its front, the road climbing it to the gate. */
function knoll(d: Draw, rng: Rng): void {
  const front = [...bezier(pt(-70, -2), pt(0, 12), pt(74, -4), 20)];
  const shape = [...front, P(70, 40, 0), P(62, 92, 0), P(-60, 92, 0), P(-72, 40, 0)];
  paint(d, shape, GRASS, { shadow: 0.3, hatch: 0, line: 0.6 });
  const face = [...front, ...bezier(pt(74, -4 - KNOLL), pt(0, 12 - KNOLL - 3), pt(-70, -2 - KNOLL), 20)];
  flat(d, face, EARTH, { tone: 0.1, line: 0.5 });
  d.pen.clipped(face, () => {
    for (let i = 0; i < 22; i++) {
      const p = pt(-64 + rng() * 134, 2 + rng() * 6);
      const s = blob(p, 2 + rng() * 2.5, 1.4 + rng(), rng, 0.2, 10);
      d.pen.fill(s, mix(FIELDSTONE, '#8a8070', rng() * 0.4), 0.85);
      d.pen.stroke([...s, s[0]!], 0.35, d.ink, 0.6);
    }
  });
  // The road up to the gate.
  const road = [pt(-9, 14), pt(-7, 0), pt(-6, -6), pt(6, -6), pt(7, 0), pt(10, 14)];
  paint(d, road, '#5e4228', { shadow: 0.2, hatch: 0, line: 0.45 });
  for (const s of [-1, 1]) d.pen.hair([pt(s * 3, -5), pt(s * 3.5, 4), pt(s * 4.5, 13)], 0.4, mix(EARTH, SHADOW, 0.5), 0.6);
}

/** The ward inside the walls: packed earth and cobbles in the keep's shadow. */
function ward(d: Draw, rng: Rng): void {
  const yard = crisp([P(-56, 6), P(56, 6), P(56, 82), P(-56, 82)], 4);
  flat(d, yard, '#5e4e3a', { tone: 0.12, line: 0 });
  d.pen.stipple(yard, 900, () => 0.6, 0.45, mix(EARTH, SHADOW, 0.45));
  for (let i = 0; i < 8; i++) dab(d, blob(P(-50 + rng() * 100, 10 + rng() * 70), 5, 3, rng), GRASS, 0.3, 1);
  // The keep's shadow thrown down and right across the ward.
  dab(d, [P(16, 48), P(16, 72), P(40, 60), P(40, 36)], SHADOW, 0.25, 1.4);
}

function draw(d: Draw, rng: Rng): void {
  knoll(d, rng);
  d.pen.ctx.save();
  d.pen.ctx.translate(0, -KNOLL);
  ward(d, rng);
  block(d, rng, { x0: -56, x1: 56, z0: 80, z1: 84, h0: 0, h1: 20 }, STONE, 'stone');
  spireTower(d, rng, -56, 82, 7, 30, 18, 0.5);
  spireTower(d, rng, 56, 82, 7, 30, 18, -0.5);
  block(d, rng, { x0: -58, x1: -54, z0: 8, z1: 80, h0: 0, h1: 20 }, STONE, 'stone');
  keep(d, rng);
  spireTower(d, rng, -18, 47, 6, 60, 20, 1);
  house(d, rng, { x0: -46, x1: -30, z0: 24, z1: 40, h0: 0, h1: 16 }, 'z', 10);
  house(d, rng, { x0: 24, x1: 46, z0: 30, z1: 42, h0: 0, h1: 14 }, 'x', 9);
  house(d, rng, { x0: 30, x1: 44, z0: 12, z1: 24, h0: 0, h1: 12 }, 'z', 8);
  block(d, rng, { x0: 54, x1: 58, z0: 8, z1: 80, h0: 0, h1: 20 }, STONE, 'stone');
  for (const [x0, x1] of [[-56, -12], [12, 56]] as const) {
    const b: Box = { x0, x1, z0: 4, z1: 8, h0: 0, h1: 22 };
    block(d, rng, b, STONE, 'stone');
    merlonRow(d, frontOf(b), 1, x1 - x0 - 1, 22, STONE);
  }
  spireTower(d, rng, -58, 6, 9, 32, 22, 0);
  spireTower(d, rng, 58, 6, 9, 32, 22, 0.8);
  // The gatehouse: an arched gate, the portcullis half up, merlons above; a tower either side.
  const g: Box = { x0: -9, x1: 9, z0: 2, z1: 9, h0: 0, h1: 26 };
  block(d, rng, g, STONE, 'stone');
  const at = frontOf(g);
  const hole = arch(d, at, 3, 12, 17, STONE, 2);
  d.pen.clipped(hole, () => {
    for (let u = 4; u < 15; u += 2.2) d.pen.stroke([at(u, 17), at(u, 10)], 0.6, '#55504a', 0.95, false);
    for (let v = 11; v < 17; v += 2.2) d.pen.stroke([at(3, v), at(15, v)], 0.5, '#55504a', 0.9, false);
    for (let u = 4; u < 15; u += 2.2) d.pen.dot(at(u, 10).x, at(u, 10).y + 0.6, 0.45, '#55504a', 1);
    d.pen.fill(crisp([at(3, 0), at(15, 0), at(15, 3), at(3, 3)], 2), '#7c6a50', 0.5);
  });
  merlonRow(d, at, 0.5, 17.5, 26, STONE, 3, 2.2);
  // A Crown shield over the gate.
  const c = at(9, 21.5);
  const shield = [pt(c.x - 2.6, c.y - 2.4), pt(c.x + 2.6, c.y - 2.4), pt(c.x + 2.4, c.y + 0.8), pt(c.x, c.y + 3), pt(c.x - 2.4, c.y + 0.8)];
  paint(d, shield, BLUE, { shadow: 0.3, hatch: 0, line: 0.5 });
  d.pen.dot(c.x, c.y - 0.2, 0.9, CROWN_GOLD, 1);
  gateTower(d, rng, -12, 5, 6.5, 28, 1);
  gateTower(d, rng, 12, 5, 6.5, 28, -0.4);
  d.pen.ctx.restore();
}

const FR = SITE_FRAME.town;

export function drawTown(ctx: CanvasRenderingContext2D, seed: number, f: number): void {
  sprite(ctx, seed, f, {
    bounds: { x0: -FR.ox, y0: -FR.oy, x1: FR.w - FR.ox, y1: FR.h - FR.oy },
    line: 0.55,
    rim: 0.4,
    ground: (d) => groundShadow(d, 8, 8, 84, 9, 0.45),
  }, draw);
}
