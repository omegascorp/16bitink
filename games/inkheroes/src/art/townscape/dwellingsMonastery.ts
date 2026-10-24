import type { Rng } from '../../logic/rng';
import { bezier, closed, oval, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { CROWN_GOLD, frontOf, HOLE, P, sideOf, STONE, type Box, type Surface } from '../sites/build';
import { blob, castShadow, crisp, flat, gleam, glow, groundShadow, LIGHT, mix, paint, SHADOW, soft } from '../sites/paintKit';
import {
  apron, box, CANDLE, door, eaveShadow, gableRoof, haze, pyramidRoof, quoins, SLATE, STRAW, stringCourse, tufts, window, windowGlow,
} from './dwellingKit';

/**
 * The monastery on the slope behind the town, where monks hire: the
 * chapel's west front with its rose window over a deep portal, the bell
 * tower, the cloister's arcade with cypresses in its garth, the monks'
 * range with candlelight in its windows, and bee skeps by the path.
 */
const MONK_STONE = mix(STONE, '#9c896f', 0.4);
const CYPRESS = '#2e472a';

/** A tall cypress, `foot` at its base, `h` tall: a dark flame of foliage, lit on its left. */
function cypress(d: Draw, rng: Rng, foot: Pt, h: number, w: number): void {
  const shape = [
    ...bezier(pt(foot.x - w * 0.5, foot.y), pt(foot.x - w * 0.75, foot.y - h * 0.55), pt(foot.x, foot.y - h), 12),
    ...bezier(pt(foot.x, foot.y - h), pt(foot.x + w * 0.75, foot.y - h * 0.55), pt(foot.x + w * 0.5, foot.y), 12).slice(1),
  ];
  paint(d, shape, CYPRESS, { shadow: 0.6, hatch: 0.28, line: 0.65 });
  d.pen.clipped(shape, () => {
    for (let i = 0; i < 26; i++) {
      const y = foot.y - rng() * h * 0.95;
      const x = foot.x + (rng() - 0.6) * w * 0.6;
      d.pen.hair(bezier(pt(x - 2.4, y + 1.2), pt(x, y - 1.2), pt(x + 2.4, y + 1.2), 4), 0.45, rng() < 0.55 ? mix(CYPRESS, LIGHT, 0.4) : mix(CYPRESS, SHADOW, 0.5), 0.8);
    }
  });
}

/** A stepped buttress against a front face at x (plan) and zFace, `h` tall, standing `proj` proud of it. */
function buttress(d: Draw, rng: Rng, x: number, zFace: number, h: number, proj: number, C: string): void {
  const lower: Box = { x0: x - 3, x1: x + 3, z0: zFace - proj, z1: zFace, h0: 0, h1: h * 0.55 };
  const upper: Box = { x0: x - 2.6, x1: x + 2.6, z0: zFace - proj * 0.6, z1: zFace, h0: h * 0.55, h1: h * 0.92 };
  box(d, rng, lower, C, 'stone', false);
  flat(d, crisp([P(lower.x0, lower.z0, lower.h1), P(lower.x1, lower.z0, lower.h1), P(lower.x1, upper.z0, lower.h1 + 3), P(lower.x0, upper.z0, lower.h1 + 3)], 2), C, { tone: -0.3, line: 0.5 });
  box(d, rng, upper, C, 'stone', false);
  flat(d, crisp([P(upper.x0, upper.z0, upper.h1), P(upper.x1, upper.z0, upper.h1), P(upper.x1, zFace, upper.h1 + 4), P(upper.x0, zFace, upper.h1 + 4)], 2), C, { tone: -0.3, line: 0.5 });
}

/** The rose window on a front face, centred at (u, v), radius r: a stone ring, lit glass, tracery petals. */
function rose(d: Draw, at: Surface, u: number, v: number, r: number, C: string): void {
  const { pen } = d;
  const c = at(u, v);
  paint(d, oval(c.x, c.y, r + 3, r + 3, 32), mix(C, LIGHT, 0.25), { shadow: 0.25, hatch: 0, line: 0.6 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    pen.hair([pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r), pt(c.x + Math.cos(a) * (r + 3), c.y + Math.sin(a) * (r + 3))], 0.45, d.ink, 0.6);
  }
  const glass = oval(c.x, c.y, r, r, 32);
  pen.clipped(glass, () => {
    const g = pen.ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
    g.addColorStop(0, '#fff1c0');
    g.addColorStop(0.5, CANDLE);
    g.addColorStop(1, '#81431b');
    pen.ctx.fillStyle = g;
    pen.ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    // Coloured panes between the tracery: blue, red, gold.
    for (let i = 0; i < 8; i++) {
      const a = ((i + 0.5) / 8) * Math.PI * 2;
      const p = pt(c.x + Math.cos(a) * r * 0.66, c.y + Math.sin(a) * r * 0.66);
      pen.fill(oval(p.x, p.y, r * 0.2, r * 0.2, 10), ['#394e8e', '#8e3026', '#9d7e25'][i % 3]!, 0.55);
    }
    pen.crescent(glass, pt(1.6, 1.8), () => pen.fill(glass, SHADOW, 0.4));
  });
  const stoneTrace = mix(C, LIGHT, 0.1);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    pen.stroke([pt(c.x + Math.cos(a) * r * 0.3, c.y + Math.sin(a) * r * 0.3), pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r)], 1.1, stoneTrace, 1, false);
  }
  pen.stroke(closed(oval(c.x, c.y, r * 0.3, r * 0.3, 14)), 1.1, stoneTrace, 1);
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2;
    pen.hair(closed(oval(c.x + Math.cos(a) * r * 0.66, c.y + Math.sin(a) * r * 0.66, r * 0.24, r * 0.24, 10)), 0.6, stoneTrace, 0.95);
  }
  pen.dot(c.x, c.y, r * 0.12, CROWN_GOLD, 1);
  pen.stroke(closed(glass), 0.7, d.ink, 0.95);
}

/** A tall lancet window: a pointed arch of lit glass with a lead cross. */
function lancet(d: Draw, at: Surface, u: number, v: number, w: number, h: number, C: string, lit = true): void {
  const { pen } = d;
  const sp = v + h - w * 0.866;
  const pointed = (g: number): Pt[] => {
    const R = w + g;
    const right = Array.from({ length: 7 }, (_, i) => {
      const a = (i / 6) * (Math.PI / 3);
      return at(u + R * Math.cos(a), sp + R * Math.sin(a));
    });
    const left = Array.from({ length: 7 }, (_, i) => {
      const a = (2 * Math.PI) / 3 + (i / 6) * (Math.PI / 3);
      return at(u + w + R * Math.cos(a), sp + R * Math.sin(a));
    });
    return crisp([at(u - g, v - g), at(u + w + g, v - g), ...right, ...left.slice(1)], 2);
  };
  flat(d, pointed(1.8), mix(C, LIGHT, 0.25), { tone: 0, line: 0.5 });
  const hole = pointed(0);
  if (lit) {
    pen.clipped(hole, () => {
      const c = at(u + w / 2, v + h * 0.4);
      const g = pen.ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, h * 0.7);
      g.addColorStop(0, '#ffe9b0');
      g.addColorStop(0.5, CANDLE);
      g.addColorStop(1, '#a8562a');
      pen.ctx.fillStyle = g;
      pen.ctx.fillRect(c.x - h, c.y - h, h * 2, h * 2);
      pen.stroke([at(u + w / 2, v), at(u + w / 2, v + h)], 0.6, '#462f1d', 0.9, false);
      for (let k = 1; k < 4; k++) pen.hair([at(u, v + (h * k) / 4), at(u + w, v + (h * k) / 4)], 0.4, '#462f1d', 0.8);
    });
  } else pen.fill(hole, HOLE, 0.92);
  pen.crescent(hole, pt(1.2, 1.5), () => pen.fill(hole, SHADOW, 0.4));
  pen.stroke(closed(hole), 0.6, d.ink, 0.92);
}

/** The chapel's west portal: receding arched orders round a studded door, a carved tympanum. */
function portal(d: Draw, rng: Rng, at: Surface, u: number, w: number, h: number, C: string): void {
  const { pen } = d;
  for (const [g, tone] of [[7, 0.02], [4, 0.12]] as const) {
    const r = w / 2 + g;
    const sp = h - w / 2;
    const head = Array.from({ length: 15 }, (_, i) => {
      const a = (i / 14) * Math.PI;
      return at(u + w / 2 + Math.cos(a) * r, sp + Math.sin(a) * r);
    });
    const order = crisp([at(u - g, sp), at(u - g, 0), at(u + w + g, 0), ...head.slice(0, -1)], 2);
    flat(d, order, mix(C, LIGHT, 0.2), { tone, line: 0.6 });
    for (let i = 1; i < 12; i++) {
      const a = (i / 12) * Math.PI;
      pen.hair([at(u + w / 2 + Math.cos(a) * (r - 3), sp + Math.sin(a) * (r - 3)), at(u + w / 2 + Math.cos(a) * r, sp + Math.sin(a) * r)], 0.45, d.ink, 0.6);
    }
  }
  door(d, rng, at, u, w, h, C, { ring: 0, wood: '#533721', ajar: true });
  // A carved cross over the door.
  const c = at(u + w / 2, h + 9.5);
  pen.stroke([pt(c.x, c.y - 3.4), pt(c.x, c.y + 3.4)], 1.4, mix(C, SHADOW, 0.45), 1, false);
  pen.stroke([pt(c.x - 2.4, c.y - 1), pt(c.x + 2.4, c.y - 1)], 1.4, mix(C, SHADOW, 0.45), 1, false);
}

/** A gilt cross on a staff standing on `foot`, `h` tall, inked. */
function cross(d: Draw, foot: Pt, h: number, w = 2): void {
  const top = pt(foot.x, foot.y - h);
  const arm = pt(foot.x, foot.y - h * 0.7);
  for (const [lw, col] of [[w, d.ink], [w * 0.5, CROWN_GOLD]] as const) {
    d.pen.stroke([foot, pt(foot.x, (foot.y + top.y) / 2), top], lw, col, 1, false);
    d.pen.stroke([pt(arm.x - h * 0.28, arm.y), arm, pt(arm.x + h * 0.28, arm.y)], lw, col, 1, false);
  }
}

/** A plank bench for the skeps, from x0 to x1 on the ground at y. */
function bench(d: Draw, rng: Rng, x0: number, x1: number, y: number): void {
  for (const x of [x0 + 3, (x0 + x1) / 2, x1 - 3]) d.pen.stroke([pt(x, y - 4), pt(x + 0.6, y + 1)], 1.8, '#462f1d', 1, false);
  box(d, rng, { x0, x1, z0: -y / 0.6 - 1, z1: -y / 0.6 + 4, h0: 4, h1: 5.6 }, '#6f5230', 'plank', true);
}

/** A bee skep: a dome of coiled straw with its dark door, `foot` at the middle of its base. */
function skep(d: Draw, foot: Pt, r: number): void {
  const { pen } = d;
  const y0 = foot.y;
  const dome = [...bezier(pt(foot.x - r, y0), pt(foot.x - r * 1.05, y0 - r * 1.5), pt(foot.x, y0 - r * 1.45), 10), ...bezier(pt(foot.x, y0 - r * 1.45), pt(foot.x + r * 1.05, y0 - r * 1.5), pt(foot.x + r, y0), 10).slice(1)];
  paint(d, dome, STRAW, { shadow: 0.5, hatch: 0.2, line: 0.65 });
  pen.clipped(dome, () => {
    for (let k = 1; k < 6; k++) pen.stroke(bezier(pt(foot.x - r * 1.1, y0 - (k * r * 1.3) / 6), pt(foot.x, y0 - (k * r * 1.3) / 6 + 1.6), pt(foot.x + r * 1.1, y0 - (k * r * 1.3) / 6), 8), 0.7, mix(STRAW, SHADOW, 0.45), 0.75, false);
  });
  pen.fill(oval(foot.x - r * 0.15, y0 - 1.2, 1.6, 1.2, 10), HOLE, 0.95);
}

function monastery(d: Draw, rng: Rng): void {
  const C = MONK_STONE;
  // Cypresses in the cloister garth, behind everything.
  cypress(d, rng, P(-92, 44, 0), 64, 13);
  cypress(d, rng, P(-70, 46, 0), 52, 11);
  // The cloister: an arcade under a slate roof, the walk dark behind its arches.
  const K: Box = { x0: -112, x1: -48, z0: 6, z1: 30, h0: 0, h1: 26 };
  box(d, rng, K, C, 'stone', false);
  const ka = frontOf(K);
  for (let i = 0; i < 5; i++) window(d, ka, 4 + i * 12.4, 0.5, 8, 18, C, { arched: true, sill: false });
  stringCourse(d, ka, 0, 64, 22, C);
  gableRoof(d, rng, K, 12, 'x', SLATE, 'slate', C, 3);
  // The chapel's nave, its west front to the town.
  const N: Box = { x0: -44, x1: 8, z0: 0, z1: 46, h0: 0, h1: 56 };
  box(d, rng, { x0: N.x0 - 1.5, x1: N.x1 + 1.5, z0: -1.5, z1: N.z1, h0: 0, h1: 4 }, mix(C, SHADOW, 0.1), 'stone', true);
  box(d, rng, { ...N, h0: 4 }, C, 'stone', false);
  const na = frontOf(N);
  const ns = sideOf(N);
  for (const u of [16, 34]) lancet(d, ns, u, 18, 4, 18, C);
  quoins(d, na, 0.5, 56, C, 1);
  quoins(d, na, 51.5, 56, C, -1);
  gableRoof(d, rng, N, 28, 'z', SLATE, 'slate', C, 4);
  // The west front: portal, lancets either side, the rose, a cross on the gable.
  portal(d, rng, na, 18, 16, 27, C);
  for (const u of [7, 41]) lancet(d, na, u, 16, 5, 20, C);
  rose(d, na, 26, 58, 11, C);
  stringCourse(d, na, 0, 52, 44, C);
  cross(d, P(-18, -4, 86), 16, 2.8);
  for (const x of [N.x0, N.x1]) buttress(d, rng, x, N.z0, 50, 6, C);
  // The monks' range to the right, candlelit.
  const R: Box = { x0: 40, x1: 104, z0: 22, z1: 46, h0: 0, h1: 36 };
  box(d, rng, R, mix(C, '#a39177', 0.3), 'plaster', false);
  const ra = frontOf(R);
  for (let i = 0; i < 5; i++) window(d, ra, 5 + i * 12, 8, 6, 9, C, { arched: true, lit: i !== 2, bars: true });
  for (let i = 0; i < 5; i++) window(d, ra, 5.5 + i * 12, 24, 5, 6, C, { lit: i % 2 === 0, sill: false });
  gableRoof(d, rng, R, 18, 'x', mix(SLATE, '#4d4850', 0.4), 'slate', mix(C, '#a39177', 0.3), 3);
  // The bell tower: a tall square tower, the belfry's paired openings, a slate spire and cross.
  const T: Box = { x0: 12, x1: 36, z0: 12, z1: 36, h0: 0, h1: 104 };
  box(d, rng, T, C, 'stone', false);
  const ta = frontOf(T);
  quoins(d, ta, 0.5, 104, C, 1);
  quoins(d, ta, 23.5, 104, C, -1);
  stringCourse(d, ta, 0, 24, 76, C);
  lancet(d, ta, 9.5, 36, 5, 16, C, false);
  belfry(d, ta, C);
  eaveShadow(d, ta, 24, 104, 6);
  const spire = pyramidRoof(d, rng, T, 34, SLATE, 3);
  cross(d, spire, 13);
  // Bee skeps on their stools by the path, and the hives' flowers.
  bench(d, rng, 60, 98, 6);
  for (const x of [68, 88]) skep(d, pt(x, 1.4), 6.4);
  haze(d, '#908e92', 0.1, -115, -184, 115, 16);
}

/** The belfry's paired openings on the tower's front, a bronze bell hanging in one. */
function belfry(d: Draw, at: Surface, C: string): void {
  const { pen } = d;
  for (const u of [3.5, 13.5]) window(d, at, u, 82, 7, 17, C, { arched: true, sill: u === 3.5 });
  const c = at(7, 96.5);
  const bell = [...bezier(pt(c.x - 1.6, c.y - 4.6), pt(c.x - 2.2, c.y - 1), pt(c.x - 3.4, c.y + 2.4), 6), pt(c.x + 3.4, c.y + 2.4), ...bezier(pt(c.x + 3.4, c.y + 2.4), pt(c.x + 2.2, c.y - 1), pt(c.x + 1.6, c.y - 4.6), 6).slice(1)];
  paint(d, bell, '#7e6021', { shadow: 0.45, hatch: 0, line: 0.55, gloss: true });
  gleam(d, [pt(c.x - 1.4, c.y - 3.8), pt(c.x - 2, c.y), pt(c.x - 2.6, c.y + 1.8)], 0.6, 0.7);
  pen.stroke([pt(c.x, c.y - 4.6), pt(c.x, c.y - 7)], 0.8, '#3e3739', 1, false);
  // Louvres across the other opening.
  for (let v = 85; v < 96; v += 2.4) pen.stroke([at(13.8, v), at(20.2, v + 0.8)], 1, '#533721', 0.9, false);
}

function monasteryGround(d: Draw, rng: Rng): void {
  groundShadow(d, -6, -2, 112, 12, 0.24);
  castShadow(d, [P(104, 21, 0), P(104, 47, 0), P(112, 40, 0), P(112, 18, 0)], 0, 0, 0.18, 3);
  // The path from the portal down the slope, and the garden beds by the skeps.
  apron(d, rng, pt(-9, 6), 16, 5);
  soft(d.pen.ctx, 2, () => d.pen.fill(blob(pt(80, 6), 24, 5, rng, 0.2, 16), '#654c2e', 0.35));
  for (let i = 0; i < 18; i++) {
    const p = pt(58 + rng() * 44, 4 + rng() * 6);
    d.pen.dot(p.x, p.y, 0.9, ['#9c3c3c', '#9d881c', '#ac9c84', '#715296'][i % 4]!, 0.9);
  }
  tufts(d, rng, -110, -50, 2, 6);
  tufts(d, rng, 36, 110, 3, 5);
}

function monasteryAir(d: Draw): void {
  windowGlow(d, P(-44 + 26, 0, 58), 24, 0.26);
  for (const u of [9.5, 43.5]) windowGlow(d, P(-44 + u, 0, 26), 10, 0.2);
  for (let i = 0; i < 5; i++) if (i !== 2) windowGlow(d, P(40 + 8 + i * 12, 22, 12.5), 9, 0.22);
  glow(d.pen.ctx, P(-44 + 26 + 4, 0, 6), 9, CANDLE, 0.2);
}

export const MONASTERY = { draw: monastery, ground: monasteryGround, air: monasteryAir } as const;

