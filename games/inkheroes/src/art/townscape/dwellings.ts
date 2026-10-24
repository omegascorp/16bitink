import type { Rng } from '../../logic/rng';
import { bezier, closed, oval, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { beam, CROWN_BLUE, CROWN_GOLD, frontOf, P, PLANK, SHINGLE, sideOf, STONE, TIMBER, TIMBER_DARK, type Box } from '../sites/build';
import { blob, castShadow, flat, glow, groundShadow, LIGHT, mix, paint, SHADOW, soft } from '../sites/paintKit';
import { IRON } from '../sites/parts';
import {
  apron, barrel, box, CANDLE, STRAW, corbels, crenels, door, dwelling, eaveShadow, face, flag, gableRoof, loop, OAK_DARK, pyramidRoof, quoins, shield, STEEL, stringCourse, tufts, window,
} from './dwellingKit';
import { BARRACKS } from './dwellings2';
import { EYRIE } from './dwellingsEyrie';
import { MONASTERY } from './dwellingsMonastery';
import type { TownDrawer } from './types';

/**
 * The Crown's troop dwellings on the town screen: the guardhouse where
 * spearmen hire, the archery range, the barracks, the griffins' eyrie and
 * the monastery. Each is painted at its slot's anchor with the townscape
 * kit (dwellingKit.ts) and finished like the map's sites.
 */
const GUARD_STONE = mix(STONE, '#b8ab90', 0.35);

// ---- The guardhouse ----

/** Spears and halberds leant on a rack: two posts, a crossbar, their butts against a sill log, steel heads. */
function spearRack(d: Draw, x0: number, x1: number, y: number): void {
  const bar = y - 26;
  beam(d, pt(x0, y + 1), pt(x0, bar - 3), 3, TIMBER_DARK);
  for (let i = 0; i < 5; i++) {
    const foot = pt(x0 + 2 + i * ((x1 - x0 - 2) / 5), y - 1);
    const tip = pt(foot.x + 6 + (i % 3), foot.y - 44 + (i % 2) * 5);
    const len = Math.hypot(tip.x - foot.x, tip.y - foot.y);
    d.pen.stroke([foot, tip], 1.7, d.ink, 1, false);
    d.pen.stroke([foot, tip], 0.9, i % 2 ? TIMBER : '#a07a4c', 1, false);
    const dir = pt((tip.x - foot.x) / len, (tip.y - foot.y) / len);
    const at = (s: number, n: number): Pt => pt(tip.x + dir.x * s - dir.y * n, tip.y + dir.y * s + dir.x * n);
    if (i % 2 === 0) {
      // A spear: a leaf-shaped head on a socket.
      paint(d, [at(-4.5, 0), at(-2.6, -1.5), at(2.4, 0), at(-2.6, 1.5)], STEEL, { shadow: 0.35, hatch: 0, line: 0.45, gloss: true });
      d.pen.stroke([at(-5.6, -0.9), at(-5.6, 0.9)], 1.1, IRON, 1, false);
    } else {
      // A halberd: a spike, an axe blade to the right and a hook behind.
      paint(d, [at(-3, 0), at(-1.6, -0.8), at(3.4, 0), at(-1.6, 0.8)], STEEL, { shadow: 0.3, hatch: 0, line: 0.4, gloss: true });
      paint(d, [at(-9, 0.5), at(-10.5, 5.4), at(-6, 6.4), at(-3.4, 4.6), at(-3.4, 0.5)], STEEL, { shadow: 0.4, hatch: 0, line: 0.45, gloss: true });
      d.pen.stroke([at(-6, -0.5), at(-7, -3.4), at(-5.4, -4.4)], 0.9, IRON, 1, false);
    }
  }
  beam(d, pt(x1, y + 1), pt(x1, bar - 3), 3, mix(TIMBER_DARK, SHADOW, 0.15));
  beam(d, pt(x0 - 2, bar), pt(x1 + 2, bar - 0.6), 2.6, TIMBER);
  // A sill log the butts rest against.
  beam(d, pt(x0 - 1, y), pt(x1 + 1, y - 0.4), 2.4, mix(TIMBER, SHADOW, 0.1));
}

/** A lantern on an iron bracket off the wall at `p`. */
function lantern(d: Draw, p: Pt): void {
  d.pen.stroke([p, pt(p.x + 6, p.y), pt(p.x + 6, p.y + 2)], 1, IRON, 1, false);
  d.pen.stroke(bezier(p, pt(p.x + 1, p.y + 4), pt(p.x + 4, p.y + 0.5), 5), 0.7, IRON, 1, false);
  const c = pt(p.x + 6, p.y + 6.5);
  const body = [pt(c.x - 2.4, c.y - 4), pt(c.x + 2.4, c.y - 4), pt(c.x + 2, c.y + 3), pt(c.x - 2, c.y + 3)];
  d.pen.fill(body, CANDLE, 0.95);
  d.pen.fill([pt(c.x - 1, c.y - 1), pt(c.x + 1, c.y - 1), pt(c.x + 0.6, c.y + 2), pt(c.x - 0.6, c.y + 2)], '#fff3c8', 1);
  d.pen.stroke(closed(body), 0.7, IRON, 1);
  d.pen.stroke([pt(c.x, c.y - 4), pt(c.x, c.y + 3)], 0.5, IRON, 0.9, false);
  d.pen.fill([pt(c.x - 3.2, c.y - 4), pt(c.x + 3.2, c.y - 4), pt(c.x, c.y - 7)], IRON, 1);
}

/** The watch turret on the guardhouse's back left corner: a slit, a blue slate cap and the Crown's flag. */
function turret(d: Draw, rng: Rng, C: string): void {
  const t: Box = { x0: -46, x1: -22, z0: 12, z1: 34, h0: 50, h1: 76 };
  box(d, rng, t, C, 'stone', false);
  const at = frontOf(t);
  quoins(d, at, 0.5, 26, C, 1);
  loop(d, at, 12, 12, 10, C);
  eaveShadow(d, at, 24, 26, 6);
  const apex = pyramidRoof(d, rng, t, 18, CROWN_BLUE, 3);
  d.pen.stroke([P(t.x0 - 3, t.z0 - 3, 74.6), P(t.x1 + 3, t.z0 - 3, 74.6)], 1.3, CROWN_GOLD, 0.95, false);
  flag(d, apex, 14, CROWN_BLUE, 17, 7, 1.2);
}

function guardhouse(d: Draw, rng: Rng): void {
  const C = GUARD_STONE;
  const b: Box = { x0: -44, x1: 44, z0: 0, z1: 34, h0: 0, h1: 56 };
  // A plinth course along the foot, then the walls.
  box(d, rng, { x0: -45.5, x1: 45.5, z0: -1.5, z1: 35.5, h0: 0, h1: 5 }, mix(C, SHADOW, 0.12), 'stone', true);
  box(d, rng, { ...b, h0: 5 }, C, 'stone', false);
  const at = frontOf(b);
  const side = sideOf(b);
  quoins(d, at, 0.5, 56, C, 1);
  quoins(d, at, 87.5, 56, C, -1);
  loop(d, side, 14, 24, 13, C, 0.4);
  // The roof walk behind the parapets, and the back parapet's inner face with its merlons.
  flat(d, [P(-44, 0, 56), P(44, 0, 56), P(44, 34, 56), P(-44, 34, 56)], mix(C, SHADOW, 0.35), { tone: 0.2, line: 0 });
  const back: Box = { x0: -46.5, x1: 46.5, z0: 31, z1: 36.5, h0: 56, h1: 64 };
  face(d, rng, frontOf(back), 93, 8, C, 'stone', 0.25);
  crenels(d, P(-20, 31, 64), P(46.5, 31, 64), 9, P(0, 5.5, 0), C, 0.25, 0.55, 8, 5);
  turret(d, rng, C);
  // The right parapet, its merlons run from the back forwards.
  const right: Box = { x0: 41, x1: 46.5, z0: -2.5, z1: 36.5, h0: 56, h1: 66 };
  face(d, rng, sideOf(right), 39, 10, C, 'stone', 0.42);
  crenels(d, P(46.5, 36.5, 66), P(46.5, -2.5, 66), 9, pt(-5.5, 0), C, 0.42, 0.05, 7, 4.5);
  // The front parapet on its corbels.
  eaveShadow(d, at, 88, 56, 7, 0.34);
  corbels(d, at, 4, 84, 56, C, 0.05, 8);
  const fp: Box = { x0: -46.5, x1: 46.5, z0: -2.5, z1: 3, h0: 56, h1: 66 };
  face(d, rng, frontOf(fp), 93, 10, C, 'stone', 0.03);
  crenels(d, P(-46.5, -2.5, 66), P(46.5, -2.5, 66), 9, P(0, 5.5, 0), C, 0.03, 0.5, 8, 5);
  stringCourse(d, at, 0, 34, 36, C);
  stringCourse(d, at, 54, 88, 36, C);
  // The door, the shield over it, windows and loops.
  door(d, rng, at, 36.5, 15, 25, C, { ring: 3.8 });
  shield(d, at(44, 46), 13, 15);
  for (const u of [11, 69]) window(d, at, u, 21, 8, 10, C, { bars: true });
  for (const u of [8, 80]) loop(d, at, u, 6, 10, C);
  for (const u of [15, 73]) window(d, at, u - 3, 42, 6, 8, C, { arched: true, sill: false });
  lantern(d, at(57, 26));
  // The garrison's kit: barrels by the wall, the rack of spears and halberds.
  barrel(d, pt(-58, 2), 6.4, 15);
  barrel(d, pt(-69, 5), 5.4, 12, '#87603c');
  spearRack(d, 52, 74, 6);
}

function guardhouseGround(d: Draw, rng: Rng): void {
  groundShadow(d, 2, -2, 64, 10, 0.26);
  castShadow(d, [P(44, -1, 0), P(44, 35, 0), P(62, 26, 0), P(66, -4, 0)], 0, 0, 0.22, 3);
  castShadow(d, [pt(52, 8), pt(76, 6), pt(86, -2), pt(64, -2)], 0, 0, 0.14, 2);
  apron(d, rng, pt(0, 6), 18, 5);
  apron(d, rng, pt(62, 8), 16, 4, false);
  tufts(d, rng, -44, -30, 3, 3);
  tufts(d, rng, 30, 46, 3, 3);
}

function guardhouseAir(d: Draw): void {
  glow(d.pen.ctx, P(-44 + 63, 0, 19.5), 16, CANDLE, 0.32);
}

// ---- The archery range ----

const FLETCH = ['#a9302a', '#efe6cf', '#2f55a8'] as const;

/** An arrow from its point `tip` back along `dir` (unit), `len` long: shaft, nock and fletching. */
function arrow(d: Draw, tip: Pt, dir: Pt, len: number, fletch: string): void {
  const end = pt(tip.x + dir.x * len, tip.y + dir.y * len);
  d.pen.stroke([tip, end], 1.1, d.ink, 1, false);
  d.pen.stroke([tip, end], 0.55, '#d9bf8c', 1, false);
  const n = pt(-dir.y, dir.x);
  for (const s of [-1, 1]) {
    const vane = [pt(end.x - dir.x * 4.6, end.y - dir.y * 4.6), pt(end.x + n.x * s * 1.9 - dir.x * 0.4, end.y + n.y * s * 1.9 - dir.y * 0.4), pt(end.x + dir.x * 0.6, end.y + dir.y * 0.6)];
    d.pen.fill(vane, s < 0 ? fletch : mix(fletch, SHADOW, 0.3), 0.95);
    d.pen.hair(closed(vane), 0.35, d.ink, 0.8);
  }
}

/** A straw butt on its easel, its painted face turned to the shooters on the left, arrows in it. */
function butt(d: Draw, rng: Rng, c: Pt, r: number, hits: readonly (readonly [number, number])[]): void {
  const { pen } = d;
  const foot = c.y + r * 1.75;
  beam(d, pt(c.x + r * 0.55, c.y - r * 0.2), pt(c.x + r * 1.25, foot - 1), 2.2, mix(TIMBER, SHADOW, 0.25));
  beam(d, pt(c.x - r * 0.25, c.y), pt(c.x - r * 0.75, foot + 1), 2.4, TIMBER);
  beam(d, pt(c.x + r * 0.3, c.y), pt(c.x + r * 0.45, foot + 1.5), 2.4, TIMBER);
  // The coil's thickness on its far side, then the face.
  const rim = oval(c.x + r * 0.32, c.y - r * 0.05, r * 0.72, r, 28);
  paint(d, rim, mix(STRAW, SHADOW, 0.3), { shadow: 0.55, hatch: 0.25, line: 0.7 });
  pen.clipped(rim, () => {
    for (let i = 0; i < 40; i++) {
      const a = rng() * Math.PI * 2;
      const p = pt(c.x + r * 0.32 + Math.cos(a) * r * 0.66, c.y + Math.sin(a) * r * 0.92);
      pen.hair([p, pt(p.x + 2.4, p.y + (rng() - 0.5) * 1.4)], 0.4, rng() < 0.5 ? '#8c6a2c' : '#f0dc9c', 0.8);
    }
  });
  const face = oval(c.x, c.y, r * 0.72, r, 32);
  paint(d, face, STRAW, { shadow: 0.25, hatch: 0, line: 0 });
  pen.clipped(face, () => {
    for (let k = 0.15; k < 1; k += 0.11) pen.hair(closed(oval(c.x + 0.3, c.y, r * 0.72 * k, r * k, 24)), 0.4, '#9a7634', 0.55);
    const rings: readonly (readonly [number, string])[] = [[0.84, '#efe6cf'], [0.66, CROWN_BLUE], [0.48, '#efe6cf'], [0.32, '#a9302a'], [0.15, CROWN_GOLD]];
    for (const [k, col] of rings) {
      const ring = oval(c.x - 0.4, c.y, r * 0.72 * k, r * k, 28);
      pen.fill(ring, col, 0.9);
      pen.hair(closed(ring), 0.4, d.ink, 0.55);
    }
    pen.crescent(face, pt(-r * 0.3, -r * 0.4), () => soft(pen.ctx, r * 0.1, () => pen.fill(face, SHADOW, 0.32)));
    pen.fill(oval(c.x - r * 0.25, c.y - r * 0.35, r * 0.25, r * 0.3, 14), LIGHT, 0.18);
    // Cords binding the coil.
    for (const t of [-0.45, 0.45]) pen.stroke([pt(c.x - r, c.y + r * t - 1), pt(c.x + r, c.y + r * t + 1)], 0.8, '#6b4a26', 0.7, false);
  });
  pen.stroke(closed(face), 0.75, d.ink, 0.92);
  hits.forEach(([hx, hy], i) => {
    const tip = pt(c.x + hx * r * 0.7, c.y + hy * r);
    arrow(d, tip, pt(-0.95, 0.3 - i * 0.12), 13, FLETCH[i % FLETCH.length]!);
  });
}

/** A post-and-rail fence from (xa, za) to (xb, zb) on the ground. */
function fence(d: Draw, xa: number, za: number, xb: number, zb: number, posts: number): void {
  const at = (t: number, h: number): Pt => P(xa + (xb - xa) * t, za + (zb - za) * t, h);
  for (let i = 0; i < posts; i++) {
    const t = i / (posts - 1);
    const post = [pt(at(t, 0).x - 1.3, at(t, 0).y), pt(at(t, 0).x + 1.3, at(t, 0).y), pt(at(t, 15).x + 1.3, at(t, 15).y), pt(at(t, 16.6).x, at(t, 16.6).y), pt(at(t, 15).x - 1.3, at(t, 15).y)];
    paint(d, post, i % 2 ? TIMBER : mix(TIMBER, '#9b7448', 0.5), { shadow: 0.45, hatch: 0, line: 0.55 });
  }
  for (const h of [6, 12.5]) beam(d, at(-0.02, h), at(1.02, h - 0.4), 1.9, mix(TIMBER, LIGHT, 0.12), 0.5);
}

/** A bow hung on a peg: the stave in a long curve and its string. */
function bow(d: Draw, top: Pt, len: number): void {
  const bot = pt(top.x + 1, top.y + len);
  const belly = pt(top.x - len * 0.32, top.y + len / 2);
  d.pen.stroke(bezier(top, belly, bot, 12), 1.5, OAK_DARK, 1, false);
  d.pen.hair([top, bot], 0.4, '#efe6cf', 0.9);
  d.pen.stroke([pt(top.x - 2.6, top.y + len / 2 - 2), pt(top.x - 2.6, top.y + len / 2 + 2)], 1.6, '#a9302a', 0.9, false);
}

/** A leather quiver on a peg, its fletchings showing. */
function quiver(d: Draw, top: Pt): void {
  const body = [pt(top.x - 2.4, top.y), pt(top.x + 2.4, top.y), pt(top.x + 1.8, top.y + 14), pt(top.x - 1.8, top.y + 14)];
  for (let i = 0; i < 4; i++) d.pen.stroke([pt(top.x - 1.6 + i * 1.1, top.y + 1), pt(top.x - 2 + i * 1.3, top.y - 3.4)], 1.1, FLETCH[i % 3]!, 0.95, false);
  paint(d, body, '#8a5a32', { shadow: 0.4, hatch: 0, line: 0.55 });
  d.pen.hair([pt(top.x - 2.2, top.y + 3), pt(top.x + 2.2, top.y + 3)], 0.6, OAK_DARK, 0.8);
}

/** The shooting gallery: a timber shed on a plank floor, open to the range, under a shingle roof. */
function gallery(d: Draw, rng: Rng): void {
  const S: Box = { x0: -86, x1: -26, z0: 14, z1: 40, h0: 0, h1: 36 };
  box(d, rng, { x0: -87, x1: -25, z0: 12, z1: 41, h0: 0, h1: 3.5 }, PLANK, 'plank', true);
  const backWall: Box = { x0: -86, x1: -26, z0: 38, z1: 40, h0: 3.5, h1: 36 };
  face(d, rng, frontOf(backWall), 60, 32.5, PLANK, 'plank', 0.5);
  const bw = frontOf(backWall);
  for (const [u, kind] of [[8, 'bow'], [15, 'quiver'], [24, 'bow'], [33, 'bow'], [44, 'quiver'], [52, 'bow']] as const) {
    d.pen.dot(bw(u, 24).x, bw(u, 24).y, 0.8, OAK_DARK, 1);
    if (kind === 'bow') bow(d, bw(u, 24.5), 19);
    else quiver(d, bw(u, 22));
  }
  face(d, rng, sideOf({ x0: -88, x1: -86, z0: 14, z1: 38, h0: 3.5, h1: 36 }), 24, 32.5, PLANK, 'plank', 0.55);
  // The dim of the shed's inside, deepest under the roof.
  const inside = [P(-86, 14, 36), P(-26, 14, 36), P(-26, 40, 36), P(-26, 40, 3.5), P(-86, 40, 3.5), P(-86, 14, 3.5)];
  d.pen.clipped(inside, () => soft(d.pen.ctx, 5, () => d.pen.fill([P(-90, 10, 38), P(-20, 10, 38), P(-20, 44, 38), P(-20, 44, 18), P(-90, 44, 10)], SHADOW, 0.42)));
  face(d, rng, sideOf(S), 26, 36, PLANK, 'plank', 0.42);
  // Posts, the head beam with its braces and the shooting rail across the front.
  for (const x of [-86, -56, -26]) beam(d, P(x, 14, 3.5), P(x, 14, 36), 3.4, x === -26 ? mix(TIMBER, SHADOW, 0.2) : TIMBER, 0.6);
  for (const [xa, xb] of [[-86, -78], [-56, -64], [-56, -48], [-26, -34]] as const) beam(d, P(xa, 14, 27), P(xb, 14, 35), 2, TIMBER_DARK, 0.5);
  beam(d, P(-87, 14, 35.5), P(-25, 14, 35.5), 3.2, TIMBER_DARK, 0.6);
  beam(d, P(-86, 13.5, 14), P(-26, 13.5, 14), 2.6, PLANK, 0.55);
  arrow(d, P(-70, 13.5, 15), pt(-0.2, -1), 12, FLETCH[0]);
  arrow(d, P(-67, 13.5, 15), pt(0.05, -1), 12, FLETCH[1]);
  gableRoof(d, rng, S, 13, 'x', SHINGLE, 'shingle', PLANK, 4);
  flag(d, P(-26, 27, 49), 12, CROWN_BLUE, 15, 6, 1);
  targetSign(d, P(-56, 13, 33));
}

/** The range's sign hung under the eaves: a round board painted as a target, an arrow through it. */
function targetSign(d: Draw, hook: Pt): void {
  const c = pt(hook.x, hook.y + 9);
  for (const s of [-1, 1]) d.pen.stroke([pt(hook.x + s * 3, hook.y), pt(c.x + s * 4.6, c.y - 4)], 0.6, OAK_DARK, 0.9, false);
  paint(d, oval(c.x, c.y, 7, 6.4, 24), '#efe6cf', { shadow: 0.35, hatch: 0, line: 0.7 });
  for (const [k, col] of [[0.72, CROWN_BLUE], [0.48, '#efe6cf'], [0.3, '#a9302a'], [0.13, CROWN_GOLD]] as const) {
    d.pen.fill(oval(c.x, c.y, 7 * k, 6.4 * k, 20), col, 0.95);
    d.pen.hair(closed(oval(c.x, c.y, 7 * k, 6.4 * k, 20)), 0.4, d.ink, 0.6);
  }
  d.pen.crescent(oval(c.x, c.y, 7, 6.4, 24), pt(-2, -2), () => d.pen.fill(oval(c.x, c.y, 7, 6.4, 24), SHADOW, 0.25));
  arrow(d, pt(c.x + 0.6, c.y - 0.4), pt(-0.92, 0.38), 12, FLETCH[0]);
}

/** A standing rack of longbows by the gallery, a quiver hung on its post. */
function bowStand(d: Draw, foot: Pt): void {
  beam(d, pt(foot.x, foot.y + 1), pt(foot.x, foot.y - 30), 2.6, TIMBER_DARK);
  beam(d, pt(foot.x + 14, foot.y + 1), pt(foot.x + 14, foot.y - 30), 2.6, mix(TIMBER_DARK, SHADOW, 0.15));
  for (let i = 0; i < 4; i++) bow(d, pt(foot.x + 2.5 + i * 3.2, foot.y - 31), 31);
  beam(d, pt(foot.x - 1.5, foot.y - 26), pt(foot.x + 15.5, foot.y - 26.4), 2.2, TIMBER);
  beam(d, pt(foot.x - 1.5, foot.y - 4), pt(foot.x + 15.5, foot.y - 4.4), 2.2, TIMBER);
  quiver(d, pt(foot.x + 17, foot.y - 24));
}

function archeryRange(d: Draw, rng: Rng): void {
  fence(d, -22, 52, 74, 52, 9);
  gallery(d, rng);
  butt(d, rng, P(28, 38, 16), 10, [[-0.2, 0.1], [0.3, -0.4]]);
  butt(d, rng, P(70, 34, 16), 9.5, [[0.1, 0.25]]);
  butt(d, rng, P(48, 12, 16), 11, [[-0.1, -0.05], [0.35, 0.3], [-0.45, -0.5]]);
  // A barrel of arrows by the gallery, a stray arrow in the turf, the front fence.
  for (let i = 0; i < 9; i++) arrow(d, pt(-14 + (i % 5) * 1.8 - 1, -12), pt(((i % 5) - 2) * 0.12, -1), 7 + (i % 3) * 2, FLETCH[i % 3]!);
  barrel(d, pt(-13, -2), 6.2, 12);
  bowStand(d, pt(-2, -6));
  arrow(d, pt(16, 2), pt(-0.7, -0.7), 10, FLETCH[2]);
  fence(d, 2, -3, 80, -3, 7);
}

function archeryGround(d: Draw, rng: Rng): void {
  groundShadow(d, -50, 4, 46, 8, 0.24);
  castShadow(d, [P(-26, 14, 0), P(-26, 40, 0), P(-6, 34, 0), P(-8, 10, 0)], 0, 0, 0.18, 3);
  // The worn shooting lanes from the gallery to the butts, and the targets' shadows.
  for (const [x, z] of [[28, 38], [70, 34], [48, 12]] as const) {
    soft(d.pen.ctx, 3, () => d.pen.fill(blob(P(x - 14, z - 2, 0), 34, 5, rng, 0.2, 18), '#b49a72', 0.32));
    groundShadow(d, P(x + 6, z, 0).x, P(x, z, 0).y + 1, 12, 3, 0.2);
  }
  apron(d, rng, pt(-50, 6), 30, 5, false);
  tufts(d, rng, -84, -30, 6, 6);
  tufts(d, rng, 10, 80, 7, 7);
}

export const DWELLINGS: Readonly<Record<'guardhouse' | 'archeryRange' | 'barracks' | 'griffinTower' | 'monastery', TownDrawer>> = {
  guardhouse: dwelling('guardhouse', guardhouse, guardhouseGround, guardhouseAir),
  archeryRange: dwelling('archeryRange', archeryRange, archeryGround),
  barracks: dwelling('barracks', BARRACKS.draw, BARRACKS.ground),
  griffinTower: dwelling('griffinTower', EYRIE.draw, EYRIE.ground, EYRIE.air),
  monastery: dwelling('monastery', MONASTERY.draw, MONASTERY.ground, MONASTERY.air),
};

