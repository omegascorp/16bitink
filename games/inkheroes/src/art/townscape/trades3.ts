import type { Rng } from '../../logic/rng';
import { bezier, closed, oval, pt, ribbon, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { backArc, beam, CROWN_BLUE, CROWN_GOLD, DEPTH, drum, frontArc, P, pennant, PLANK, roundWash, TIMBER, TIMBER_DARK, type Box } from '../sites/build';
import { lump, ROCK } from '../sites/parts';
import { crisp, flat, glow, groundShadow, LIGHT, mix, paint, rgba, SHADOW, soft, sparkle } from '../sites/paintKit';
import { cone, finial } from '../sites/spire';
import { CANVAS, earth, kiteShield, paintIn, RED, solid, STEEL, tufts } from './tradesKit';
import type { TownDrawer } from './types';

/**
 * The tiltyard and the seraphs' spire: the jousting lists with their tilt
 * barrier, striped pavilions and the royal stand hung with bunting; and
 * the angels' white tower on its crag, winged, its gilt dome in a halo of
 * light.
 */
const SAND = '#d8c08a';

/** A shade laid over a round thing already coloured: clear on its lit left, cool indigo on its right. */
function roundShade(d: Draw, shape: readonly Pt[], x0: number, x1: number, depth = 0.4): void {
  const ctx = d.pen.ctx;
  d.pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, rgba(SHADOW, depth * 0.25));
    g.addColorStop(0.3, rgba(LIGHT, 0.25));
    g.addColorStop(0.62, rgba(SHADOW, 0));
    g.addColorStop(0.92, rgba(SHADOW, depth));
    g.addColorStop(1, rgba(SHADOW, depth * 0.7));
    ctx.fillStyle = g;
    ctx.fillRect(x0 - 2, -400, x1 - x0 + 4, 800);
  });
}

// ---- The tiltyard ----

/** A round pavilion: a striped canvas drum, a scalloped valance, a striped cone and its pennant. */
function pavilion(d: Draw, x: number, z: number, r: number, wallH: number, rise: number, stripe: string, flag: string): void {
  const { pen } = d;
  const base = P(x, z, 0);
  const top = P(x, z, wallH);
  const body = [...frontArc(base.x, base.y, r, 20), ...backArc(top.x, top.y, r, 20)];
  flat(d, body, CANVAS, { tone: 0, line: 0 });
  const n = 10;
  const at = (t: number, v: number): Pt => pt(base.x - r * Math.cos(t), base.y + r * DEPTH * Math.sin(t) - v);
  pen.clipped(body, () => {
    for (let k = 0; k < n; k += 2) {
      const [t0, t1] = [(k / n) * Math.PI, ((k + 1) / n) * Math.PI];
      const band = [...Array.from({ length: 5 }, (_, i) => at(t0 + ((t1 - t0) * i) / 4, -2)), ...Array.from({ length: 5 }, (_, i) => at(t1 - ((t1 - t0) * i) / 4, wallH + 2))];
      pen.fill(band, stripe, 0.85);
    }
  });
  roundShade(d, body, base.x - r, base.x + r);
  // The door: the flaps drawn back and tied, the dark inside between them.
  const c0 = at(Math.PI * 0.42, 0);
  const c1 = at(Math.PI * 0.58, 0);
  const peak = pt((c0.x + c1.x) / 2, c0.y - wallH * 0.85);
  pen.fill([c0, c1, peak], '#2b2738', 0.92);
  for (const [foot, s] of [[c0, -1], [c1, 1]] as const) {
    const flap = [foot, peak, pt(foot.x + s * 2.8, foot.y - wallH * 0.4), pt(foot.x + s * 3.4, foot.y)];
    paint(d, flap, mix(stripe, CANVAS, 0.55), { shadow: 0.4, hatch: 0, line: 0.55 });
    pen.dot(foot.x + s * 2.8, foot.y - wallH * 0.4, 0.7, CROWN_GOLD, 1);
  }
  pen.stroke(closed(crisp(body, 4)), 0.75, d.ink, 0.9);
  // The cone, striped in gores to the apex.
  const apex = pt(top.x, top.y - rise);
  const R = r + 2.5;
  const rim = frontArc(top.x, top.y, R, 20);
  const coneShape = [apex, ...rim];
  flat(d, coneShape, CANVAS, { tone: -0.05, line: 0 });
  pen.clipped(coneShape, () => {
    for (let k = 0; k < 20; k += 4) pen.fill([apex, ...rim.slice(k, k + 3)], stripe, 0.85);
  });
  roundShade(d, coneShape, top.x - R, top.x + R, 0.45);
  pen.stroke(closed(coneShape), 0.8, d.ink, 0.9);
  // The valance round the eave.
  for (let k = 0; k < 20; k++) {
    const a = rim[k]!;
    const b = rim[k + 1]!;
    const tab = [a, b, ...bezier(b, pt((a.x + b.x) / 2, (a.y + b.y) / 2 + 4.5), a, 5).slice(1, -1)];
    paint(d, tab, k % 2 ? stripe : CANVAS, { shadow: k > 13 ? 0.6 : 0.25, hatch: 0, line: 0.5 });
  }
  pen.dot(apex.x, apex.y - 1, 1.3, CROWN_GOLD, 1);
  pennant(d, pt(apex.x, apex.y - 1.5), 14, flag, 15, 1);
}

/** The tilt barrier down the middle of the lists: posts, rails and a painted panel, a pennant at either end. */
function tilt(d: Draw, rng: Rng): void {
  const [x0, x1, z] = [-94, 88, 22];
  const panel = crisp([P(x0, z, 2), P(x1, z, 2), P(x1, z, 12), P(x0, z, 12)], 4);
  flat(d, panel, CANVAS, { tone: 0, line: 0 });
  d.pen.clipped(panel, () => {
    for (let x = x0 - 10; x < x1; x += 9) d.pen.fill([P(x, z, 1), P(x + 4.5, z, 1), P(x + 10.5, z, 13), P(x + 6, z, 13)], CROWN_BLUE, 0.85);
    d.pen.fill(crisp([P(x0, z, 2), P(x1, z, 2), P(x1, z, 4.5), P(x0, z, 4.5)], 4), SHADOW, 0.15);
  });
  d.pen.stroke(closed(panel), 0.7, d.ink, 0.9);
  for (let x = x0; x <= x1 + 0.1; x += 26) beam(d, P(x, z - 0.5, 0), P(x, z - 0.5, 15), 2.8, TIMBER, 0.6);
  beam(d, P(x0 - 2, z - 0.8, 13.4), P(x1 + 2, z - 0.8, 13.4), 2.6, TIMBER_DARK, 0.6);
  for (const x of [x0, x1]) pennant(d, P(x, z - 0.5, 15), 12, x < 0 ? CROWN_BLUE : CROWN_GOLD, 11, 0.8);
  void rng;
}

/** The royal stand: a planked platform hung with banners, benches, a striped canopy with a gilt crest, bunting along its front. */
function stand(d: Draw, rng: Rng): void {
  const { pen } = d;
  const [x0, x1, z0, z1, ph] = [18, 82, 44, 64, 14];
  for (const x of [x0 + 1, x1 - 1]) beam(d, P(x, z1, ph), P(x, z1, 44), 2.4, TIMBER, 0.55);
  // The back: a blue cloth wall.
  const back = crisp([P(x0, z1, ph), P(x1, z1, ph), P(x1, z1, 40), P(x0, z1, 40)], 4);
  flat(d, back, mix(CROWN_BLUE, SHADOW, 0.25), { tone: 0.2, line: 0.6 });
  d.pen.clipped(back, () => {
    for (let x = x0 + 4; x < x1; x += 6) pen.hair([P(x, z1, ph), P(x + 0.5, z1, 40)], 0.45, mix(CROWN_BLUE, SHADOW, 0.6), 0.6);
  });
  const deck: Box = { x0, x1, z0, z1, h0: 0, h1: ph };
  solid(d, rng, deck, PLANK, 'plank', true);
  for (const z of [56, 49]) solid(d, rng, { x0: x0 + 4, x1: x1 - 4, z0: z, z1: z + 4, h0: ph, h1: ph + 4 }, mix(PLANK, '#d9b27a', 0.3), 'none', true);
  // Banners hung down the front, each blue with a gilt crown.
  const bw = 9;
  for (const x of [x0 + 8, (x0 + x1) / 2 - bw / 2, x1 - 8 - bw]) {
    const b = [P(x, z0 - 0.5, ph), P(x + bw, z0 - 0.5, ph), P(x + bw, z0 - 0.5, 1.5), P(x + bw / 2, z0 - 0.5, 4.5), P(x, z0 - 0.5, 1.5)];
    paint(d, crisp(b, 2), CROWN_BLUE, { shadow: 0.35, hatch: 0, line: 0.6 });
    const c = P(x + bw / 2, z0 - 0.5, 9);
    pen.fill([pt(c.x - 2.6, c.y + 1.4), pt(c.x - 2.6, c.y - 1.2), pt(c.x - 1.3, c.y), pt(c.x, c.y - 2), pt(c.x + 1.3, c.y), pt(c.x + 2.6, c.y - 1.2), pt(c.x + 2.6, c.y + 1.4)], CROWN_GOLD, 1);
    pen.stroke([P(x, z0 - 0.5, ph - 1), P(x + bw, z0 - 0.5, ph - 1)], 0.9, CROWN_GOLD, 1, false);
  }
  // Steps up the left end.
  for (let i = 0; i < 4; i++) solid(d, rng, { x0: x0 - 10 + i * 2.4, x1: x0, z0: z0 + 4, z1: z0 + 12, h0: 0, h1: (i + 1) * 3.5 }, PLANK, 'none', true);
  for (const x of [x0 + 1, x1 - 1]) beam(d, P(x, z0 - 1, ph), P(x, z0 - 1, 38), 2.4, mix(TIMBER, SHADOW, x > 50 ? 0.12 : 0), 0.55);
  canopy(d, x0, x1, z0, z1);
}

function canopy(d: Draw, x0: number, x1: number, z0: number, z1: number): void {
  const { pen } = d;
  const [hf, hb] = [38, 45];
  const w = x1 - x0 + 6;
  const at = (u: number, v: number): Pt => P(x0 - 3 + u, z0 - 3 + (v / 10) * (z1 + 2 - (z0 - 3)), hf + (v / 10) * (hb - hf));
  const shape = crisp([at(0, 0), at(w, 0), at(w, 10), at(0, 10)], 3);
  flat(d, shape, CANVAS, { tone: -0.05, line: 0 });
  pen.clipped(shape, () => {
    for (let u = 0; u < w; u += 12) pen.fill(crisp([at(u, -1), at(u + 6, -1), at(u + 6, 11), at(u, 11)], 3), CROWN_BLUE, 0.85);
    soft(pen.ctx, 2, () => pen.fill([at(-1, 3), at(w + 1, 3), at(w + 1, 6.5), at(-1, 6.5)], SHADOW, 0.12));
  });
  pen.stroke(closed(shape), 0.85, d.ink, 0.9);
  for (let u = 0, k = 0; u < w - 0.5; u += 6, k++) {
    const a = at(u, 0);
    const b = at(Math.min(w, u + 6), 0);
    paint(d, [a, b, ...bezier(b, pt((a.x + b.x) / 2, b.y + 6), a, 6).slice(1, -1)], k % 2 ? CROWN_GOLD : CROWN_BLUE, { shadow: 0.3, hatch: 0, line: 0.55 });
  }
  // A gilt crest over the middle: the Crown's shield under a little crown.
  const c = at(w / 2, 5);
  kiteShield(d, pt(c.x, c.y - 17), 10, CROWN_BLUE, CROWN_GOLD, 'cross');
  pen.fill([pt(c.x - 4, c.y - 18), pt(c.x - 4, c.y - 22), pt(c.x - 2, c.y - 20), pt(c.x, c.y - 23.5), pt(c.x + 2, c.y - 20), pt(c.x + 4, c.y - 22), pt(c.x + 4, c.y - 18)], CROWN_GOLD, 1);
  pen.stroke(closed([pt(c.x - 4, c.y - 18), pt(c.x - 4, c.y - 22), pt(c.x - 2, c.y - 20), pt(c.x, c.y - 23.5), pt(c.x + 2, c.y - 20), pt(c.x + 4, c.y - 22), pt(c.x + 4, c.y - 18)]), 0.5, d.ink, 0.9);
  pennant(d, at(0, 10), 12, CROWN_BLUE, 12, 0.8);
  // Bunting swagged along the front, blue and gold pennons.
  const a = at(0, -0.6);
  const b = at(w, -0.6);
  const swag = (p: Pt, q: Pt): void => {
    const line = bezier(p, pt((p.x + q.x) / 2, (p.y + q.y) / 2 + 9), q, 10);
    pen.stroke(line, 0.5, d.ink, 0.8, false);
    for (let i = 1; i < 10; i++) {
      const s = line[i]!;
      paint(d, [pt(s.x - 1.4, s.y), pt(s.x + 1.4, s.y), pt(s.x, s.y + 3.6)], i % 2 ? CROWN_GOLD : CROWN_BLUE, { shadow: 0.25, hatch: 0, line: 0.35 });
    }
  };
  const mid = pt((a.x + b.x) / 2, (a.y + b.y) / 2);
  swag(pt(a.x, a.y + 6), pt(mid.x, mid.y + 6));
  swag(pt(mid.x, mid.y + 6), pt(b.x, b.y + 6));
}

/** A jousting lance from `foot` to `tip`: a striped shaft, a steel vamplate near the grip, a crowned tip. */
function lance(d: Draw, foot: Pt, tip: Pt): void {
  const { pen } = d;
  const spine = Array.from({ length: 13 }, (_, i) => pt(foot.x + ((tip.x - foot.x) * i) / 12, foot.y + ((tip.y - foot.y) * i) / 12));
  const { shape, top, bot } = ribbon(spine, (u) => 2.8 - u * 1.8);
  paint(d, shape, mix(CANVAS, LIGHT, 0.3), { shadow: 0.3, hatch: 0, line: 0.55 });
  pen.clipped(shape, () => {
    for (let i = 2; i < 12; i += 2) pen.fill([top[i]!, top[i + 1]!, bot[i]!, bot[i - 1]!], CROWN_BLUE, 0.8);
  });
  const v = spine[3]!;
  const ang = Math.atan2(tip.y - foot.y, tip.x - foot.x);
  const n = pt(-Math.sin(ang), Math.cos(ang));
  const along = pt(Math.cos(ang), Math.sin(ang));
  const plate = [pt(v.x + n.x * 3, v.y + n.y * 3), pt(v.x - n.x * 3, v.y - n.y * 3), pt(v.x + along.x * 5 - n.x * 1, v.y + along.y * 5 - n.y * 1), pt(v.x + along.x * 5 + n.x * 1, v.y + along.y * 5 + n.y * 1)];
  paint(d, plate, STEEL, { shadow: 0.4, hatch: 0, line: 0.55, gloss: true });
  pen.stroke([pt(tip.x - along.x * 2, tip.y - along.y * 2), pt(tip.x + along.x * 1.5, tip.y + along.y * 1.5)], 1.6, STEEL, 1, false);
  for (const s of [-1, 0, 1]) pen.stroke([pt(tip.x + along.x * 1.2 + n.x * s, tip.y + along.y * 1.2 + n.y * s), pt(tip.x + along.x * 2.6 + n.x * s * 1.6, tip.y + along.y * 2.6 + n.y * s * 1.6)], 0.6, '#6a6e7c', 1, false);
}

/** The lance rack at the near end: a trestle with its lances leant up against it. */
function lanceRack(d: Draw): void {
  const [x0, x1, z] = [-102, -86, 34];
  for (const x of [x0, x1]) beam(d, P(x, z + 3, 0), P(x, z + 3, 22), 2.2, TIMBER, 0.55);
  for (let i = 0; i < 3; i++) {
    const foot = P(x0 + 2 + i * 6, z, 0);
    lance(d, foot, pt(foot.x + 5 + i * 2, foot.y - 60 + (i % 2) * 5));
  }
  beam(d, P(x0 - 2, z + 3, 19), P(x1 + 2, z + 3, 19), 2, TIMBER_DARK, 0.55);
}

function tiltyard(d: Draw, rng: Rng): void {
  pavilion(d, -26, 74, 11, 16, 17, RED, RED);
  pavilion(d, -66, 52, 17, 24, 26, CROWN_BLUE, CROWN_GOLD);
  stand(d, rng);
  tilt(d, rng);
  lanceRack(d);
}

function tiltyardGround(d: Draw, rng: Rng): void {
  const ctx = d.pen.ctx;
  const lists = [P(-104, -4), P(100, -4), P(104, 46), P(-100, 46)];
  soft(ctx, 4, () => d.pen.fill(lists, SAND, 0.75));
  // Raked furrows down the lists, scuffed along both sides of the barrier.
  for (let z = 2; z < 44; z += 3.2) d.pen.hair([P(-96 + (z % 7), z), P(94 - (z % 5), z)], 0.4, mix(SAND, SHADOW, 0.35), 0.35);
  for (const z of [14, 30]) soft(ctx, 2, () => d.pen.fill([P(-90, z - 3), P(86, z - 3), P(86, z + 3), P(-90, z + 3)], mix(SAND, '#8a7050', 0.5), 0.25));
  // Trodden grass round the tents and the stand.
  earth(d, rng, [P(-104, 30), P(-40, 30), P(-8, 60), P(-8, 86), P(-60, 80), P(-104, 60)], '#b8a57c', 0.4);
  earth(d, rng, [P(12, 40), P(88, 40), P(88, 70), P(12, 70)], '#b8a57c', 0.4);
  groundShadow(d, -56, -32, 26, 5, 0.22);
  groundShadow(d, -12, -46, 16, 3.5, 0.2);
  groundShadow(d, 58, -32, 40, 6, 0.2);
  soft(ctx, 2, () => d.pen.fill([P(-94, 22), P(88, 22), P(92, 19), P(-90, 19)], SHADOW, 0.18));
  tufts(d, rng, -102, -90, P(0, 46).y, 3);
  tufts(d, rng, 90, 102, 0, 3);
}

// ---- The seraph spire ----

const WHITE = '#ece6d6';
const WHITE_SHADE = '#c9c3d8';
const GILT = '#d9ad3c';
const RADIANCE = '#fff4cc';
const SZ = 30;
/** The tower's axis on the ground, and the heights of its stages. */
const LANTERN = { h0: 150, h1: 170 };
const DOME = { h0: 173, rise: 16 };
const at = (x: number, h: number): Pt => P(x, SZ, h);

/** A stepped round plinth on the crag. */
function plinth(d: Draw, rng: Rng): void {
  // A few fallen stones about its foot, where it stands on the crag.
  for (const [x, z, r] of [[-30, 2, 3.4], [-24, -2, 2.4], [34, 4, 3], [28, -1, 2.2], [40, 12, 2.6]] as const) lump(d, rng, P(x, z), r, r * 0.72, mix(ROCK, '#b7ad98', 0.3));
  for (const [r, h0] of [[31, 0], [27, 4], [23.5, 8]] as const) {
    drum(d, rng, 0, SZ, r, h0, h0 + 4, WHITE, false);
    const top = P(0, SZ, h0 + 4);
    flat(d, [...frontArc(top.x, top.y, r, 20), ...backArc(top.x, top.y, r, 20).slice(1, -1)], WHITE, { tone: -0.3, line: 0.6 });
  }
}

/** The colonnade round the shrine at the tower's foot: white columns with gilt capitals, the cella behind, a ring of entablature. */
function tholos(d: Draw, rng: Rng): void {
  const R = 20;
  const cols = 10;
  const column = (a: number): void => {
    const x = R * Math.cos(a);
    const z = SZ + R * Math.sin(a);
    drum(d, rng, x, z, 1.9, 12, 44, WHITE, false);
    const cap = P(x, z, 44);
    paint(d, crisp([pt(cap.x - 3, cap.y - 2.2), pt(cap.x + 3, cap.y - 2.2), pt(cap.x + 2, cap.y + 0.6), pt(cap.x - 2, cap.y + 0.6)], 1), GILT, { shadow: 0.35, hatch: 0, line: 0.5, gloss: true });
  };
  for (let k = 0; k < cols; k++) {
    const a = (k / cols) * Math.PI * 2 + Math.PI / 2 + Math.PI / cols;
    if (Math.sin(a) > 0) column(a);
  }
  const cella = drum(d, rng, 0, SZ, 15, 12, 46, WHITE);
  // A golden door on the cella's front.
  const cx = cella.base.x;
  const cy = cella.base.y + 15 * DEPTH;
  const door = [pt(cx - 4.5, cy), pt(cx - 4.5, cy - 14), ...bezier(pt(cx - 4.5, cy - 14), pt(cx, cy - 21), pt(cx + 4.5, cy - 14), 8).slice(1), pt(cx + 4.5, cy)];
  paint(d, door, GILT, { shadow: 0.4, hatch: 0, line: 0.7, gloss: true });
  d.pen.stroke([pt(cx, cy), pt(cx, cy - 17.5)], 0.6, mix(GILT, SHADOW, 0.5), 0.9, false);
  for (const s of [-1, 1]) d.pen.dot(cx + s * 1.4, cy - 8, 0.6, mix(GILT, SHADOW, 0.6), 1);
  for (let k = 0; k < cols; k++) {
    const a = (k / cols) * Math.PI * 2 + Math.PI / 2 + Math.PI / cols;
    if (Math.sin(a) <= 0) column(a);
  }
  const ring = drum(d, rng, 0, SZ, 22.5, 46, 52, WHITE, false);
  d.pen.stroke(frontArc(ring.base.x, ring.base.y - 3, 22.5, 22), 1.6, GILT, 0.95, false);
  d.pen.hair(frontArc(ring.base.x, ring.base.y - 2.2, 22.5, 22), 0.4, mix(GILT, SHADOW, 0.5), 0.8);
  cone(d, rng, ring.top, 23, 10, '#e3d3a0', GILT);
}

/** One feather from `base` to `tip`, `w` wide: a rounded white vane, its quill and a gilt edge on the outer ones. */
function feather(d: Draw, base: Pt, tip: Pt, w: number, color: string, gilt: boolean, bend = 0.08): void {
  const spine = bezier(base, pt((base.x + tip.x) / 2 + (tip.y - base.y) * bend, (base.y + tip.y) / 2 - (tip.x - base.x) * bend), tip, 12);
  const prof = (u: number): number => (0.35 + 0.65 * Math.sin(Math.min(1, u / 0.4) * Math.PI / 2)) * (u > 0.7 ? Math.sqrt(Math.max(0.02, 1 - ((u - 0.7) / 0.3) ** 2)) : 1);
  const { shape } = ribbon(spine, (u) => w * prof(u));
  paint(d, shape, color, { shadow: 0.3, hatch: 0, line: 0 });
  d.pen.clipped(shape, () => {
    for (let i = 3; i < 11; i += 2) {
      const p = spine[i]!;
      const q = spine[i + 1]!;
      const n = pt(-(q.y - p.y), q.x - p.x);
      const l = Math.hypot(n.x, n.y) || 1;
      d.pen.hair([p, pt(p.x + (n.x / l) * w * 0.5 + (q.x - p.x) * 0.8, p.y + (n.y / l) * w * 0.5 + (q.y - p.y) * 0.8)], 0.3, mix(color, SHADOW, 0.4), 0.45);
    }
  });
  d.pen.hair(spine.slice(0, 10), 0.4, mix(GILT, SHADOW, 0.25), 0.7);
  d.pen.stroke(closed(shape), gilt ? 0.8 : 0.5, gilt ? GILT : d.ink, gilt ? 0.95 : 0.75);
  if (gilt) d.pen.stroke(closed(shape), 0.35, d.ink, 0.6);
}

/** A wing raised beside the tower: primaries fanned out and down, secondaries under the arm, rows of coverts, the gilt leading edge; `side` -1 left, 1 right. */
function wing(d: Draw, side: -1 | 1): void {
  const w = (x: number, h: number): Pt => at(side * x * 0.86, h);
  const color = side < 0 ? WHITE : mix(WHITE, WHITE_SHADE, 0.55);
  const primaries: readonly (readonly [number, number, number, number])[] = [
    [50, 150, 82, 112], [48, 148, 79, 101], [45, 145, 74, 91], [42, 142, 67, 83], [39, 139, 59, 77], [36, 136, 51, 73], [33, 133, 43, 70],
  ];
  primaries.forEach(([bx, bh, tx, th], i) => feather(d, w(bx, bh), w(tx, th), 7.5, color, i < 3));
  const secondaries: readonly (readonly [number, number, number, number])[] = [
    [31, 130, 35, 72], [27, 125, 29, 72], [23, 119, 23, 73], [19, 113, 18, 75], [15, 107, 13, 79], [11, 101, 9.5, 84],
  ];
  secondaries.forEach(([bx, bh, tx, th]) => feather(d, w(bx, bh), w(tx, th), 7, mix(color, side < 0 ? LIGHT : WHITE_SHADE, 0.15), false));
  // Coverts: rows of small rounded feathers overlapping like scales under the arm.
  for (const [off, size, n] of [[16, 4.2, 9], [10, 3.8, 10], [4.5, 3.2, 11]] as const) {
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1);
      const bx = 9 + t * 40;
      const bh = 103 + t * 46 - off;
      feather(d, w(bx, bh + size), w(bx + 1.5, bh - size * 1.3), size * 1.5, mix(color, LIGHT, 0.12), false, 0.02);
    }
  }
  // The arm, its leading edge gilt.
  const arm = [w(7, 96), w(22, 124), w(40, 150), w(54, 155), w(52, 150), w(38, 142), w(20, 116), w(7, 104)];
  const armShape = [...bezier(arm[0]!, arm[1]!, arm[2]!, 8), ...bezier(arm[2]!, arm[3]!, arm[4]!, 4).slice(1), ...bezier(arm[4]!, arm[5]!, arm[6]!, 8).slice(1), arm[7]!];
  paint(d, armShape, color, { shadow: 0.35, hatch: 0, line: 0.7 });
  d.pen.stroke(bezier(arm[0]!, arm[1]!, arm[2]!, 10).concat(bezier(arm[2]!, arm[3]!, arm[4]!, 4).slice(1)), 1.4, GILT, 0.95, false);
}

/** The white shaft: coursed, banded in gold, its lancet windows full of light. */
function shaft(d: Draw, rng: Rng): void {
  const s = drum(d, rng, 0, SZ, 9.5, 54, LANTERN.h0, WHITE);
  const fy = (h: number): number => s.base.y + 9.5 * DEPTH - (h - 54);
  for (const h of [70, 104]) {
    const shape = [pt(s.base.x - 1.8, fy(h)), pt(s.base.x - 1.8, fy(h + 14)), ...bezier(pt(s.base.x - 1.8, fy(h + 14)), pt(s.base.x, fy(h + 19)), pt(s.base.x + 1.8, fy(h + 14)), 6).slice(1), pt(s.base.x + 1.8, fy(h))];
    paint(d, shape, '#fbe9b0', { shadow: 0.2, hatch: 0, line: 0.6, gloss: true });
  }
  for (const h of [94, 128, LANTERN.h0 - 2]) {
    const y = s.base.y - (h - 54);
    d.pen.stroke(frontArc(s.base.x, y, 9.6, 16), 1.5, GILT, 0.95, false);
  }
}

/** The lantern: an open arcade full of light, a gilt cornice, the golden dome with its ribs, the halo and spike over it. */
function crown(d: Draw, rng: Rng): void {
  const r = 12;
  const lan = drum(d, rng, 0, SZ, r, LANTERN.h0, LANTERN.h1, WHITE, false);
  const bx = lan.base.x;
  const by = lan.base.y;
  for (const t of [0.22, 0.5, 0.78]) {
    const x = bx - r * Math.cos(t * Math.PI);
    const y = by + r * DEPTH * Math.sin(t * Math.PI);
    const hw = 2.8 * Math.sin(t * Math.PI);
    const open = [pt(x - hw, y - 2), pt(x - hw, y - 13), ...bezier(pt(x - hw, y - 13), pt(x, y - 18), pt(x + hw, y - 13), 6).slice(1), pt(x + hw, y - 2)];
    paint(d, open, RADIANCE, { shadow: 0.1, hatch: 0, line: 0.6 });
  }
  const cornice = drum(d, rng, 0, SZ, r + 1.8, LANTERN.h1, LANTERN.h1 + 3, GILT, false);
  void cornice;
  const base = P(0, SZ, DOME.h0);
  const R = r + 0.5;
  const apex = pt(base.x, base.y - DOME.rise - 4);
  const rim = frontArc(base.x, base.y, R, 20);
  const dome = [...bezier(apex, pt(base.x - R * 1.25, base.y - DOME.rise * 0.7), rim[0]!, 12), ...rim.slice(1), ...bezier(rim[rim.length - 1]!, pt(base.x + R * 1.25, base.y - DOME.rise * 0.7), apex, 12).slice(1, -1)];
  roundWash(d, dome, base.x - R, base.x + R, GILT, 0.25);
  d.pen.clipped(dome, () => {
    for (const k of [-0.66, -0.33, 0, 0.33, 0.66]) d.pen.hair(bezier(pt(base.x + k * R, base.y + R * DEPTH * Math.sqrt(1 - k * k)), pt(base.x + k * R * 1.15, base.y - DOME.rise * 0.6), apex, 8), 0.45, mix(GILT, SHADOW, 0.45), 0.7);
  });
  d.pen.hair(bezier(pt(base.x - R * 0.55, base.y), pt(base.x - R * 0.6, base.y - DOME.rise * 0.6), pt(apex.x - 1, apex.y + 4), 8), 1.2, PAPER_FILL, 0.7);
  d.pen.stroke(closed(dome), 0.8, d.ink, 0.95);
  const tip = finial(d, apex, 8);
  d.pen.stroke(closed(oval(tip.x, tip.y - 2, 4.5, 1.6, 16)), 1, GILT, 1);
}

function seraphSpire(d: Draw, rng: Rng): void {
  plinth(d, rng);
  tholos(d, rng);
  wing(d, -1);
  wing(d, 1);
  shaft(d, rng);
  crown(d, rng);
}

function spireGround(d: Draw, rng: Rng): void {
  groundShadow(d, 8, -2, 46, 8, 0.24);
  earth(d, rng, [P(-50, -6), P(56, -6), P(60, 14), P(-46, 16)], '#a89c80', 0.3);
}

function spireAir(d: Draw, rng: Rng): void {
  const ctx = d.pen.ctx;
  const c = at(0, LANTERN.h0 + 12);
  glow(ctx, c, 48, RADIANCE, 0.5);
  glow(ctx, c, 22, '#ffffff', 0.6);
  // Soft rays of light fanned from the lantern.
  for (let k = 0; k < 9; k++) {
    const a = -Math.PI / 2 + (k - 4) * 0.34 + (rng() - 0.5) * 0.08;
    const len = 34 + rng() * 10;
    const spread = 0.05;
    soft(ctx, 2, () => d.pen.fill([pt(c.x + Math.cos(a - spread) * 10, c.y + Math.sin(a - spread) * 10), pt(c.x + Math.cos(a) * len, c.y + Math.sin(a) * len), pt(c.x + Math.cos(a + spread) * 10, c.y + Math.sin(a + spread) * 10)], RADIANCE, 0.3));
  }
  glow(ctx, at(0, 30), 14, RADIANCE, 0.35);
  for (const h of [77, 111]) glow(ctx, at(0, h), 7, RADIANCE, 0.4);
  for (const [x, h, r] of [[-30, 178, 2.6], [34, 168, 2.2], [-20, 200, 1.8], [24, 196, 2], [0, 214, 2.4]] as const) sparkle(d, at(x, h), r, 0.9);
}

export const TRADES_C: Readonly<Record<'tiltyard' | 'seraphSpire', TownDrawer>> = {
  tiltyard: paintIn('tiltyard', tiltyard, tiltyardGround),
  seraphSpire: paintIn('seraphSpire', seraphSpire, spireGround, spireAir),
};
