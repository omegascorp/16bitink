import { createRng } from '../../logic/rng';
import { polar } from '../groundKit';
import { bezier, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { ellipseAt, glaze } from '../critters/birdKit';
import type { Foot, Runner } from './dunesBossParts';
import { RR } from './dunesBossPaint';

/**
 * The Roadrunner's legs and the marks round it: long blue-grey legs on
 * X-shaped feet (two toes forward, two back), a cartoon wheel of legs when
 * it runs flat out, speed lines and kicked-up dust, the furrows and the
 * spray of a skid, and fright jolts.
 */
const SAND = '#d8bf8c';
const SAND_DEEP = '#a88a58';

/** A scaly toe from the foot's centre. */
function toe(d: Draw, at: Pt, a: number, len: number): void {
  const tip = polar(at, a, len);
  d.pen.stroke([at, polar(at, a + 0.06, len * 0.55), tip], 1.3, RR.leg, 1, false);
  d.pen.hair([at, tip], 0.35, RR.legDeep, 0.9);
  for (let t = 0.3; t < 0.9; t += 0.25) {
    const p = polar(at, a, len * t);
    d.pen.hair([polar(p, a + Math.PI / 2, 0.5), polar(p, a - Math.PI / 2, 0.5)], 0.2, RR.legDeep, 0.7);
  }
  d.pen.hair([tip, polar(tip, a, 0.9)], 0.45, d.ink, 0.95);
}

/** A leg from under the body to its X-shaped foot. */
export function leg(d: Draw, r: Runner, f: Foot): void {
  const hip = pt(r.bodyC.x + 2, r.bodyC.y + Math.sign(f.at.y) * 2.4);
  if (!f.up) d.pen.fill(ellipseAt(f.at.x + 0.8, f.at.y + 1.2, 4.2, 2.6, f.ang, 14), d.ink, 0.14);
  d.pen.stroke([hip, pt((hip.x + f.at.x) / 2, (hip.y + f.at.y) / 2 + Math.sign(f.at.y) * 0.6), f.at], 1.7, RR.leg, 1, false);
  d.pen.hair([hip, f.at], 0.4, RR.legDeep, 0.8);
  for (const a of [-0.38, 0.38]) toe(d, f.at, f.ang + a, 4.4);
  for (const a of [Math.PI - 0.5, Math.PI + 0.5]) toe(d, f.at, f.ang + a, 3.2);
  d.pen.dot(f.at.x, f.at.y, 0.9, RR.leg, 1);
}

/** Flat out: each side's legs a cartoon wheel of whirling arcs, ghosts of feet round it, `k` turning it. */
export function legWheel(d: Draw, r: Runner, k: 0 | 1): void {
  const { pen } = d;
  for (const s of [-1, 1]) {
    const c = pt(r.bodyC.x + 6, r.bodyC.y + s * (r.bodyR.y + 1.2));
    const rx = 9;
    const ry = 3.4;
    const at = (a: number): Pt => pt(c.x + Math.cos(a) * rx, c.y + Math.sin(a) * ry * s);
    glaze(d, c.x, c.y, rx + 2, ry + 2, 0, RR.leg, 0.28);
    for (let i = 0; i < 3; i++) {
      const a0 = k * 1.05 + (i * Math.PI * 2) / 3;
      pen.hair(Array.from({ length: 9 }, (_, j) => at(a0 + j * 0.2)), 0.9, RR.legDeep, 0.7);
      pen.hair(Array.from({ length: 9 }, (_, j) => at(a0 + j * 0.2)), 0.4, PAPER_FILL, 0.5);
      const f = at(a0 + 1.7);
      for (const a of [-0.4, 0.4, Math.PI]) pen.hair([f, polar(f, a, 2.6)], 0.7, RR.leg, 0.45);
    }
  }
}

/** Speed lines streaming back off it, and puffs of kicked-up dust behind. */
export function speed(d: Draw, r: Runner, k: 0 | 1): void {
  const { pen } = d;
  const rng = createRng(6801 + k * 13 + d.f);
  const back = r.tail.root.x - r.tail.len;
  for (const [y, x0, len, a] of [[-11, -2, 22, 0.6], [11, 0, 24, 0.6], [-7, -18, 16, 0.4], [7, -16, 18, 0.45], [-15, -10, 12, 0.35], [15, -12, 12, 0.35]] as const) {
    const p = pt(x0 + (rng() - 0.5) * 3, y + (rng() - 0.5));
    pen.hair(bezier(p, pt(p.x - len * 0.5, p.y), pt(p.x - len, p.y + Math.sign(y) * 0.6), 6), 0.6, d.ink, a);
  }
  for (let i = 0; i < 4; i++) {
    const p = pt(back + 6 - i * 5 - k * 3, (rng() - 0.5) * 10);
    glaze(d, p.x, p.y, 5 + i, 3.5 + i * 0.6, 0, SAND, 0.5 - i * 0.08);
    pen.hair(Array.from({ length: 8 }, (_, j) => polar(p, (j / 7) * 4.2 + 1, 3 + i * 0.6)), 0.4, SAND_DEEP, 0.5 - i * 0.08);
  }
}

/** A skid: two furrows ploughed back behind the braced feet, sand sprayed up ahead of them. */
export function skidMarks(d: Draw, r: Runner): void {
  const { pen } = d;
  for (const f of r.feet) {
    const a = f.at;
    const line = bezier(pt(a.x - 44, a.y * 0.8), pt(a.x - 20, a.y * 0.95), pt(a.x - 2, a.y), 8);
    pen.hair(line, 2.6, SAND_DEEP, 0.35);
    pen.hair(line.map((p) => pt(p.x, p.y - 1)), 0.5, d.ink, 0.4);
    pen.hair(line.map((p) => pt(p.x, p.y + 1.2)), 0.8, PAPER_FILL, 0.5);
  }
}

export function skidSpray(d: Draw, r: Runner): void {
  const { pen } = d;
  const rng = createRng(6811 + d.f * 5);
  for (const f of r.feet) {
    const c = pt(f.at.x + 5, f.at.y);
    glaze(d, c.x + 2, c.y, 7, 5, 0, SAND, 0.55);
    for (let i = 0; i < 18; i++) {
      const a = (rng() - 0.5) * 1.8;
      const p = polar(c, a, 2 + rng() * 9);
      const g = 0.35 + rng() * 0.5;
      pen.dot(p.x + 0.25, p.y + 0.35, g, SAND_DEEP, 0.5);
      pen.dot(p.x, p.y, g, i % 4 === 0 ? PAPER_FILL : SAND, 0.95);
    }
    for (const a of [-0.5, 0, 0.5]) pen.hair([polar(c, a, 3), polar(c, a, 9)], 0.45, d.ink, 0.4);
  }
}

/** Fright jolts bursting out round it. */
export function jolts(d: Draw, c: Pt): void {
  for (const [a, rr] of [[-2.4, 30], [-1.6, 26], [-0.7, 30], [0.7, 31], [1.6, 27], [2.45, 30]] as const) {
    const u = pt(Math.cos(a), Math.sin(a));
    const v = pt(-u.y, u.x);
    for (const o of [-2.6, 0, 2.6]) {
      const b = pt(c.x + u.x * (rr - Math.abs(o) * 0.6) + v.x * o, c.y + u.y * (rr - Math.abs(o) * 0.6) + v.y * o);
      const len = o === 0 ? 5.5 : 3.6;
      d.pen.stroke([b, pt(b.x + u.x * len, b.y + u.y * len)], 0.75, d.ink, 0.8, false);
    }
  }
}

/** A tail cocked straight up throws a long shadow back across the sand: the tell before the dash. */
export function tailShadow(d: Draw, r: Runner): void {
  const t = r.tail;
  const base = t.root;
  const tip = pt(base.x + 14, base.y + 24);
  const half = t.w * (0.6 + t.spread);
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    glaze(d, base.x + (tip.x - base.x) * t, base.y + (tip.y - base.y) * t, half * (0.5 + t * 0.6), half * (0.4 + t * 0.4), Math.atan2(tip.y - base.y, tip.x - base.x), d.ink, 0.12);
  }
}
