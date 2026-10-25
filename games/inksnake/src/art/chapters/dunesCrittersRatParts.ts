import { createRng } from '../../logic/rng';
import { capsule, closed, type Draw, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { castShadow, ellipseAt, glaze, hairs } from '../critters/preyKit';
import { along } from './barrensCrittersBeast';

/**
 * The kangaroo rat's parts, seen from above: its long tail, dark-striped
 * down the middle between white side stripes and ending in a dusky,
 * white-tipped brush; its huge white-topped hind feet; tiny forepaws; the
 * sand its kick flings; and the little z's of a sleeping one.
 */
export const KRAT = {
  fur: '#c99d66',
  back: '#8c6a44',
  warm: '#d6a05c',
  tick: '#43301f',
  white: '#f6efe0',
  pale: '#eadcc0',
  deep: '#5a422b',
  foot: '#f1e8d6',
  footDeep: '#b8a383',
  pink: '#e7b3a4',
  pinkDeep: '#b97f74',
  stripe: '#4a3828',
  tuft: '#3d3024',
  sand: '#d8bf8c',
  sandDeep: '#a88a58',
} as const;

const R = KRAT;

/** The spine resampled every `step` px. */
export function even(spine: readonly Pt[], step: number): Pt[] {
  const out: Pt[] = [spine[0]!];
  let carry = 0;
  for (let i = 1; i < spine.length; i++) {
    const a = spine[i - 1]!;
    const b = spine[i]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    let t = step - carry;
    while (t <= l) {
      out.push(pt(a.x + ((b.x - a.x) * t) / l, a.y + ((b.y - a.y) * t) / l));
      t += step;
    }
    carry = l - (t - step);
  }
  return out;
}

/** The tail: thin and furred, a dark stripe down its top between white sides, then a bushy dusky brush tipped white. */
export function paintTail(d: Draw, spine: readonly Pt[], lift: Pt): void {
  const { pen } = d;
  const s = even(spine, 0.8);
  const n = s.length - 1;
  const w = (u: number): number => (u < 0.68 ? 3.1 - 1.5 * u : 2.08 + 3.2 * Math.sin(Math.PI * Math.min(1, (u - 0.68) / 0.36)) ** 0.8);
  const { shape } = ribbon(s, w);
  castShadow(d, shape, lift, 0.16);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, R.white, 0.9);
  pen.clipped(shape, () => {
    // The dark stripe along its top, running out into the brush.
    const mid = ribbon(s.slice(0, Math.round(n * 0.72)), (u) => 1.7 - 0.4 * u).shape;
    pen.fill(mid, R.stripe, 0.75);
    const root = s[0]!;
    glaze(d, root.x, root.y, 3.4, 2.4, 0, R.fur, 0.85);
  });
  const brush = ribbon(s.slice(Math.round(n * 0.66)), (u) => w(0.66 + u * 0.34)).shape;
  const dir = (p: Pt): number => along(s, p).ang + Math.PI * 0.04;
  hairs(d, brush, { dir: (p) => dir(p), color: (p, r) => (along(s, p).i / n > 0.9 ? (r < 0.7 ? R.white : R.pale) : r < 0.7 ? R.tuft : R.deep) }, 160, 5402, 2.2, 0.32, 0.85);
  hairs(d, shape, { dir: (p) => dir(p), color: (_p, r) => (r < 0.5 ? R.stripe : R.pale) }, 90, 5403, 1.3, 0.22, 0.5);
  pen.clipped(shape, () => pen.crescent(shape, pt(-0.5, -0.8), () => pen.fill(shape, R.deep, 0.3)));
  pen.stroke(closed(shape), 0.4, d.ink, 0.85, false);
  // Wisps flicking off the brush.
  const rng = createRng(5404 + d.f);
  for (let i = Math.round(n * 0.7); i <= n; i += 2) {
    const p = s[i]!;
    const a = along(s, p).ang;
    const side = rng() < 0.5 ? -1 : 1;
    const half = w(i / n) / 2;
    const o = pt(p.x - Math.sin(a) * half * side, p.y + Math.cos(a) * half * side);
    pen.hair([o, pt(o.x + Math.cos(a + side * 0.5) * 1.6, o.y + Math.sin(a + side * 0.5) * 1.6)], 0.25, d.ink, 0.5);
  }
  const tip = s[n]!;
  const ta = along(s, tip).ang;
  pen.hair([tip, pt(tip.x + Math.cos(ta) * 1.8, tip.y + Math.sin(ta) * 1.8)], 0.7, R.white, 0.9);
}

/** A huge hind foot from the heel, `len` long at angle `ang`: a white top, four slim toes with claws, its sole's edge in shadow. */
export function hindFoot(d: Draw, heel: Pt, ang: number, len: number, side: number, toesUp = false): Pt[] {
  const { pen } = d;
  const u = pt(Math.cos(ang), Math.sin(ang));
  const ball = pt(heel.x + u.x * len * 0.78, heel.y + u.y * len * 0.78);
  const foot = capsule(heel, ball, 3, 4.1);
  castShadow(d, foot, pt(0.7, 1.1), 0.18);
  const toeBase = pt(heel.x + u.x * len * 0.74, heel.y + u.y * len * 0.74);
  [-0.42, -0.14, 0.14, 0.42].forEach((o, i) => {
    const a = ang + o * 0.55;
    const l = len * (i === 0 || i === 3 ? 0.2 : 0.27);
    const b = pt(toeBase.x - u.y * o * 3.4, toeBase.y + u.x * o * 3.4);
    const tip = pt(b.x + Math.cos(a) * l, b.y + Math.sin(a) * l);
    const toe = capsule(b, tip, 1.25, 0.95);
    pen.fill(toe, R.foot, 1);
    pen.clipped(toe, () => pen.fill(toe.map((p) => pt(p.x + 0.25, p.y + 0.35)), R.footDeep, 0.5));
    pen.stroke(closed(toe), 0.3, d.ink, 0.85, false);
    pen.hair([tip, pt(tip.x + Math.cos(a) * 0.7, tip.y + Math.sin(a) * 0.7)], 0.3, toesUp ? R.pinkDeep : R.tick, 0.85);
  });
  pen.fill(foot, PAPER_FILL, 1);
  pen.fill(foot, toesUp ? mix(R.pink, R.foot, 0.4) : R.foot, 0.95);
  pen.clipped(foot, () => {
    pen.crescent(foot, pt(-0.5, -0.8), () => pen.fill(foot, R.footDeep, 0.55));
    pen.hair([pt(heel.x - u.y * side * 0.4 + u.x, heel.y + u.x * side * 0.4 + u.y), pt(ball.x - u.y * side * 0.4, ball.y + u.x * side * 0.4)], 0.5, PAPER_FILL, 0.6);
    // The ankle's fur running down onto the top of the foot.
    glaze(d, heel.x + u.x * 1.2, heel.y + u.y * 1.2, 2.6, 1.5, ang, R.fur, 0.6);
  });
  hairs(d, foot, { dir: () => ang, color: (_p, r) => (r < 0.6 ? R.footDeep : R.pale) }, 26, 5410 + Math.round(heel.y * 3), 1.1, 0.2, 0.55);
  pen.stroke(closed(foot), 0.42, d.ink, 0.9, false);
  return foot;
}

/** A tiny forepaw peeping out under the chin: a pale palm and four little fingers. */
export function forePaw(d: Draw, c: Pt, ang: number): void {
  const { pen } = d;
  const palm = ellipseAt(c.x, c.y, 0.9, 0.75, ang, 12);
  [-0.6, -0.2, 0.2, 0.6].forEach((o) => {
    const a = ang + o;
    const b = pt(c.x + Math.cos(a) * 0.6, c.y + Math.sin(a) * 0.6);
    pen.hair([b, pt(b.x + Math.cos(a) * 0.9, b.y + Math.sin(a) * 0.9)], 0.45, R.pinkDeep, 0.9);
  });
  pen.fill(palm, R.pink, 1);
  pen.stroke(closed(palm), 0.3, d.ink, 0.85, false);
}

/** The shin from the haunch down to the heel, seen when the legs stretch back. */
export function shin(d: Draw, from: Pt, to: Pt): void {
  const { pen } = d;
  const s = capsule(from, to, 3.6, 2.4);
  pen.fill(s, PAPER_FILL, 1);
  pen.fill(s, R.fur, 0.9);
  pen.clipped(s, () => pen.crescent(s, pt(-0.6, -0.9), () => pen.fill(s, R.deep, 0.4)));
  hairs(d, s, { dir: () => Math.atan2(to.y - from.y, to.x - from.x), color: (_p, r) => (r < 0.4 ? R.back : r < 0.8 ? R.fur : R.pale) }, 40, 5420 + Math.round(from.y * 5), 1.3, 0.24, 0.7);
  pen.stroke(closed(s), 0.4, d.ink, 0.85, false);
}

/** Sand flung back by the kick: a fan of grains and flying streaks behind the feet, thinning as it goes. */
export function sandSpray(d: Draw, from: Pt, spread: number, reach: number): void {
  const { pen } = d;
  const rng = createRng(5430 + d.f * 17);
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + (i / 6 - 0.5) * spread + (rng() - 0.5) * 0.15;
    const r0 = 3 + rng() * 4;
    const r1 = r0 + reach * (0.45 + rng() * 0.4);
    const p0 = pt(from.x + Math.cos(a) * r0, from.y + Math.sin(a) * r0);
    const p1 = pt(from.x + Math.cos(a) * r1, from.y + Math.sin(a) * r1);
    pen.hair([p0, pt((p0.x + p1.x) / 2, (p0.y + p1.y) / 2 + (rng() - 0.5)), p1], 0.45, d.ink, 0.35 + rng() * 0.25);
  }
  for (let i = 0; i < 46; i++) {
    const a = Math.PI + (rng() - 0.5) * spread * 1.1;
    const t = rng() ** 0.7;
    const r = 3 + t * reach;
    const p = pt(from.x + Math.cos(a) * r, from.y + Math.sin(a) * r);
    const g = 0.35 + rng() * 0.6 * (1 - t * 0.5);
    pen.dot(p.x + 0.25, p.y + 0.35, g, R.sandDeep, 0.5);
    pen.dot(p.x, p.y, g, i % 3 === 0 ? R.white : R.sand, 0.95);
    if (g > 0.6) pen.circle(p.x, p.y, g, 0.18, d.ink);
  }
  // A cloud of fine dust where the feet dig in.
  glaze(d, from.x - reach * 0.25, from.y, reach * 0.4, spread * reach * 0.3, 0, R.sand, 0.45);
}

/** Little z's drifting up off a sleeper, cartoon-style. */
export function zzz(d: Draw, at: Pt): void {
  [[0, 0, 1.5], [4.6, -3.6, 1.2], [8.4, -6.6, 0.95]].forEach(([dx, dy, s]) => {
    const o = pt(at.x + dx!, at.y + dy!);
    const z = [pt(o.x - s!, o.y - s!), pt(o.x + s!, o.y - s!), pt(o.x - s!, o.y + s!), pt(o.x + s!, o.y + s!)];
    d.pen.stroke(z, 0.55, d.ink, 0.75, false);
  });
}
