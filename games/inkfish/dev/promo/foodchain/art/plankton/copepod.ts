import { INK, pathOf, Pen, type Pt } from '../../../../../src/art/pen';
import { type Box, capsule, clamp01, closed, cub, glow, lerp, line, normals, oval, Plate, polar, pt, ribbon, seta, shadeY, SHINE, skin, smooth, TAU } from './ink';

/**
 * A calanoid copepod (Calanus), side-on from a little above, head to the
 * right: amber glass with an oil sac, long first antennae, five pairs of
 * swimming legs, feathery mouthparts and its one red eye.
 */
const AMBER = '#e9a35a';
const AMBER_DEEP = '#9c5220';
const TIP_RED = '#c8432c';
const EYE_RED = '#d8261a';
export const COPE_BOX: Box = { x0: -86, x1: 60, y0: -100, y1: 104 };
export const COPE_EYE = { x: 42, y: -3.5, r: 3.5 } as const;
/** The eye never shrinks below this (px), so "one eye" still reads on a tiny copepod. */
export const EYE_MIN_PX = 1.1;

const PRO_N = 30;
function proH(u: number): number {
  if (u < 0.34) return 15 * Math.sqrt(Math.max(0, 1 - ((0.34 - u) / 0.34) ** 2));
  return 15 - 10.4 * ((u - 0.34) / 0.66) ** 1.7;
}
const PRO_TOP = Array.from({ length: PRO_N + 1 }, (_, i) => pt(49 - 55 * (i / PRO_N), -proH(i / PRO_N)));
const PRO_BOT = Array.from({ length: PRO_N + 1 }, (_, i) => pt(49 - 55 * (i / PRO_N), proH(i / PRO_N) * 0.88));
const PRO_SHAPE = [...PRO_TOP, ...[...PRO_BOT].reverse()];
const proBottom = (x: number): number => proH(clamp01((49 - x) / 55)) * 0.88;

/** The first antennae, far (0) and near (1): held out at rest, pressed back along the body in the kick. */
const A1_REST = [
  [pt(43, -8), pt(40, -36), pt(26, -64), pt(4, -84)],
  [pt(43, 5), pt(41, 34), pt(28, 64), pt(6, 87)],
] as const;
const A1_KICK = [
  [pt(43, -8), pt(26, -18), pt(0, -20), pt(-34, -21)],
  [pt(43, 5), pt(26, 15), pt(0, 17), pt(-34, 19)],
] as const;

function a1Spine(side: 0 | 1, kick: number): Pt[] {
  const s = smooth(kick * 1.25);
  const c = A1_REST[side].map((p, i) => lerp(p, A1_KICK[side][i]!, s));
  return cub(c[0]!, c[1]!, c[2]!, c[3]!, 34);
}

/** Swimming legs P1..P5: where they hang from, and their length. */
const LEGS = [
  { x: 31, len: 12.5 },
  { x: 25.5, len: 14 },
  { x: 20, len: 15 },
  { x: 14.5, len: 15.5 },
  { x: 9, len: 10.5 },
] as const;
/** Pointing forward and down at rest; swept back in the kick, the hind pair first. */
const legAngle = (i: number, kick: number): number => 0.95 + 1.45 * smooth(kick * 1.7 - (4 - i) * 0.17) + i * 0.07;

/** Mouthparts from the front back: second antenna, mandible palp, maxilla, maxilliped. */
const MOUTH = [
  { x: 44, a: 1.1, len: 12, sway: 1 },
  { x: 41, a: 1.4, len: 7, sway: -1 },
  { x: 38, a: 1.55, len: 10, sway: 1 },
  { x: 35, a: 1.78, len: 10.5, sway: -1 },
] as const;

/** Urosome segments: from x, to x, half widths. */
const URO = [
  [-3, -14.5, 4.9, 4.2],
  [-14, -22.5, 3.8, 3.4],
  [-22, -29.5, 3.3, 3.0],
  [-29, -36.5, 3.0, 2.7],
] as const;
const RAMI = [
  { a: pt(-35.5, -1.3), b: pt(-44, -3.8), side: -1 },
  { a: pt(-35.5, 1.3), b: pt(-44, 3.8), side: 1 },
] as const;
const RAMUS_SETAE = [
  { da: -0.42, len: 13 },
  { da: -0.16, len: 26 },
  { da: 0.08, len: 21 },
  { da: 0.3, len: 11 },
] as const;

export interface CopeState {
  readonly kick: number;
  /** How far the mouthparts are swept in, 0..1. */
  readonly bite: number;
}

function drawA1(pl: Plate, pen: Pen, spineU: readonly Pt[], near: boolean): void {
  const spine = pl.m(spineU);
  const n = spine.length - 1;
  const width = (u: number): number => pl.k * (2.4 - 1.7 * u);
  const { top, bot, shape } = ribbon(spine, width);
  const nrm = normals(spine);
  const sign = near ? -1 : 1;
  const back = near ? bot : top;
  // Setae on the trailing edge, then a few long ones off the tip.
  if (pl.has(36)) {
    for (let i = 3; i < n - 1; i += pl.has(200) ? 1 : 3) {
      const d = pt(spine[i + 1]!.x - spine[i]!.x, spine[i + 1]!.y - spine[i]!.y);
      const dl = Math.hypot(d.x, d.y) || 1;
      const a = Math.atan2(nrm[i]!.y * sign + (d.y / dl) * 0.8, nrm[i]!.x * sign + (d.x / dl) * 0.8);
      seta(pl, pen, back[i]!, a, pl.k * (2.5 + 3.8 * pen.rng()) * (1 - (i / n) * 0.35), 0.6, 0.05);
    }
  }
  const end = spine[n]!;
  const prev = spine[n - 3]!;
  const dir = Math.atan2(end.y - prev.y, end.x - prev.x);
  for (const [da, len] of [[-0.35, 13], [0, 19], [0.4, 10]] as const) seta(pl, pen, end, dir + da, len * pl.k, 0.75, 0.1);
  skin(pl, pen, shape, AMBER, 0.5, 0.5);
  const tipFrom = Math.round(n * 0.6);
  pen.fill([...top.slice(tipFrom), ...bot.slice(tipFrom).reverse()], TIP_RED, 0.42);
  if (pl.has(70)) for (let i = 2; i < n; i += pl.has(300) ? 1 : 2) pen.hair([top[i]!, bot[i]!], pl.fine * 0.6, INK, 0.42);
  if (pl.has(160)) pen.hair(top.slice(2, -4).map((p, i) => lerp(p, bot[i + 2]!, 0.3)), pl.fine * 1.1, SHINE, 0.45);
  pen.stroke(closed(shape), pl.line * 0.5, INK, 1, false);
}

function drawLeg(pl: Plate, pen: Pen, hipU: Pt, a: number, len: number, alpha: number): void {
  const { k } = pl;
  const hip = pl.at(hipU);
  const L = len * k;
  const knee = polar(hip, a, L * 0.36);
  const rami = [
    { tip: polar(knee, a + 0.22, L * 0.64), w: 2.4, side: 1 },
    { tip: polar(knee, a - 0.16, L * 0.52), w: 2.1, side: -1 },
  ];
  for (const r of rami) {
    const ra = Math.atan2(r.tip.y - knee.y, r.tip.x - knee.x);
    if (pl.has(56)) {
      for (const u of [0.3, 0.5, 0.7, 0.9]) seta(pl, pen, lerp(knee, r.tip, u), ra + r.side * (0.9 - 0.45 * u), (4 + 4 * u) * k, 0.6 * alpha);
      if (pl.has(200)) for (const u of [0.45, 0.8]) seta(pl, pen, lerp(knee, r.tip, u), ra - r.side * 0.8, 4 * k, 0.45 * alpha);
      for (const da of [-0.25, 0.05, 0.3]) seta(pl, pen, r.tip, ra + da, 8 * k, 0.65 * alpha, 0.08);
    }
    // A flattened, three-jointed paddle.
    const { top, bot, shape } = ribbon(line(knee, r.tip, 10), (u) => r.w * k * (0.6 + 0.55 * Math.sin(Math.PI * Math.min(1, u * 1.15))) * (1 - 0.55 * u));
    skin(pl, pen, shape, AMBER, 0.42 * alpha, 0.45 * alpha);
    if (pl.has(120)) for (const j of [3, 7]) pen.hair([top[j]!, bot[j]!], pl.fine * 0.8, INK, 0.5 * alpha);
    pen.stroke(closed(shape), pl.line * 0.42, INK, alpha, false);
  }
  const base = capsule(hip, knee, 3.1 * k, 2.4 * k);
  skin(pl, pen, base, AMBER, 0.45 * alpha, 0.5 * alpha);
  pen.stroke(closed(base), pl.line * 0.45, INK, alpha, false);
}

function drawMouthparts(pl: Plate, pen: Pen, bite: number): void {
  const { k } = pl;
  for (const m of MOUTH) {
    const root = pl.p(m.x, proBottom(m.x) - 1.2);
    const a = m.a + m.sway * 0.5 * bite;
    const tip = polar(root, a, m.len * k);
    if (pl.has(48)) {
      for (let i = 0; i < 6; i++) seta(pl, pen, tip, a - 0.65 + i * 0.26, (4.5 + 3.5 * pen.rng()) * k, 0.6, 0.1);
      if (pl.has(140)) for (const u of [0.45, 0.7]) seta(pl, pen, lerp(root, tip, u), a - 1.1, 4 * k, 0.5);
    }
    const shape = capsule(root, tip, 2.6 * k, 1.2 * k);
    skin(pl, pen, shape, AMBER, 0.45, 0.5);
    pen.stroke(closed(shape), pl.line * 0.4, INK, 1, false);
  }
  // Rostral filaments under the front of the head.
  if (pl.has(90)) {
    pen.hair(pl.m([pt(47.6, 2.4), pt(50, 5.5), pt(51.2, 8.6)]), pl.fine, INK, 0.8);
    pen.hair(pl.m([pt(46.8, 3.2), pt(48.4, 6.2), pt(49, 9.2)]), pl.fine, INK, 0.6);
  }
}

/** A tail segment: a short tapered drum with gently rounded joints. */
function tailSegment(x0: number, x1: number, w0: number, w1: number): Pt[] {
  const cap = (x: number, w: number, from: number, dir: number): Pt[] => Array.from({ length: 7 }, (_, i) => {
    const a = from + (i / 6) * Math.PI;
    return pt(x + Math.cos(a) * 1.3 * dir, Math.sin(a) * w);
  });
  return [...cap(x1, w1, -Math.PI / 2, -1), ...cap(x0, w0, -Math.PI / 2, 1).map((p) => pt(p.x, -p.y))];
}

function drawCopeTail(pl: Plate, pen: Pen): void {
  const { ctx, k } = pl;
  for (const r of RAMI) {
    const a = pl.at(r.a);
    const b = pl.at(r.b);
    const dir = Math.atan2(b.y - a.y, b.x - a.x);
    if (pl.has(24)) for (const s of RAMUS_SETAE) seta(pl, pen, b, dir + s.da * r.side, s.len * k, 0.8, 0.06 * r.side);
    const shape = capsule(a, b, 2.5 * k, 2 * k);
    skin(pl, pen, shape, AMBER, 0.5, 0.5);
    pen.stroke(closed(shape), pl.line * 0.45, INK, 1, false);
  }
  for (let i = URO.length - 1; i >= 0; i--) {
    const [x0, x1, w0, w1] = URO[i]!;
    const shape = pl.m(tailSegment(x0, x1, w0, w1));
    skin(pl, pen, shape, AMBER, 0.5, 0.48);
    shadeY(ctx, shape, -w0 * k, w0 * k, [[0, 'rgba(255,250,235,0.3)'], [0.45, 'rgba(255,250,235,0)'], [1, 'rgba(120,55,15,0.3)']]);
    if (pl.has(120)) pen.hair(pl.m(line(pt(x0 - 1, -w0 + 1.1), pt(x1 + 1.5, -w1 + 1.1), 4)), pl.fine * 1.2, SHINE, 0.5);
    // The front of each segment hides inside the one before, so only its back and sides are inked.
    pen.stroke([shape[shape.length - 1]!, ...shape.slice(0, 8)], pl.line * 0.6, INK, 1, false);
  }
  pen.hair(pl.m(line(pt(-4, 0.4), pt(-35.5, 0.2), 8)), pl.fine * 1.3, AMBER_DEEP, 0.4);
}

function paintProsome(pl: Plate, pen: Pen): void {
  const { ctx, k } = pl;
  const shape = pl.m(PRO_SHAPE);
  skin(pl, pen, shape, AMBER, 0.5, 0.48);
  shadeY(ctx, shape, -15 * k, 14 * k, [[0, 'rgba(255,250,235,0.38)'], [0.35, 'rgba(255,250,235,0)'], [0.7, 'rgba(140,70,20,0.08)'], [1, 'rgba(120,55,15,0.34)']]);
  pen.clipped(shape, () => {
    // The gut, the oil sac above it, then the plates of the back.
    const gut = ribbon(pl.m(cub(pt(41, 1.5), pt(25, 3), pt(8, 2), pt(-7, 0.6), 20)), (u) => k * (2 + 4.4 * Math.sin(Math.PI * Math.min(1, u * 1.25))));
    pen.fill(gut.shape, AMBER_DEEP, 0.2);
    if (pl.has(60)) pen.hair(gut.top.map((p, i) => lerp(p, gut.bot[i]!, 0.5)), pl.fine, AMBER_DEEP, 0.4);
    oilSac(pl, pen);
    if (pl.has(40)) segmentArcs(pl, pen);
    if (pl.has(80)) {
      // Shading lines following the belly's curve, and faint muscle lines along the back.
      const rows = pl.has(300) ? [0.64, 0.71, 0.77, 0.82, 0.87, 0.91, 0.95] : [0.7, 0.8, 0.9];
      for (const v of rows) pen.hair(pl.m(PRO_TOP.slice(3, -1).map((p, i) => lerp(p, PRO_BOT[i + 3]!, v))), pl.fine * 0.8, INK, 0.1 + ((v - 0.6) / 0.4) * 0.3);
      for (const v of [0.14, 0.2]) pen.hair(pl.m(PRO_TOP.slice(9, -3).map((p, i) => lerp(p, PRO_BOT[i + 9]!, v))), pl.fine * 0.7, AMBER_DEEP, 0.25);
    }
    if (pl.has(120)) pen.stipple(shape, Math.round(pl.size * 1.6), (_x, y) => clamp01((y / k + 2) / 14) * 0.6, Math.min(1.3, Math.max(0.45, k * 0.11)), AMBER_DEEP);
  });
  // The light on the curve of the back, and a glint on the dome of the head.
  pen.hair(pl.m(PRO_TOP.slice(2, 22).map((p) => pt(p.x, p.y + 2.2))), pl.fine * 2.2, SHINE, 0.6);
  if (pl.has(60)) pen.hair(pl.m(PRO_TOP.slice(4, 16).map((p) => pt(p.x, p.y + 3.8))), pl.fine * 1.2, SHINE, 0.3);
  if (pl.has(60)) pen.hair(pl.m(cub(pt(47, -4), pt(46.5, -7.5), pt(44.5, -10), pt(41, -11.6), 6)), pl.fine * 1.8, SHINE, 0.8);
  pen.stroke(closed(shape), pl.line, INK, 1, true);
}

function oilSac(pl: Plate, pen: Pen): void {
  const { ctx, k } = pl;
  const c = pl.p(14, -6);
  const [rx, ry] = [15 * k, 4.8 * k];
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(-0.05);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(-rx * 0.3, -rx * 0.35, 0, 0, 0, rx);
  g.addColorStop(0, 'rgba(255,220,130,0.85)');
  g.addColorStop(0.5, 'rgba(246,140,52,0.6)');
  g.addColorStop(1, 'rgba(210,78,30,0.45)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, TAU);
  ctx.fill();
  ctx.restore();
  if (pl.has(60)) pen.hair(closed(pl.m(oval(pt(14, -6), 15, 4.8, -0.05, 28))), pl.fine, '#a8401a', 0.55);
  if (pl.has(40)) pen.fill(pl.m(oval(pt(7, -8.6), 3.4, 0.9, -0.12, 12)), SHINE, 0.75);
}

function segmentArcs(pl: Plate, pen: Pen): void {
  for (const u of [0.43, 0.555, 0.665, 0.765, 0.86]) {
    const i = Math.round(u * PRO_N);
    const a = PRO_TOP[i]!;
    const b = PRO_BOT[i]!;
    const c = pt((a.x + b.x) / 2 - 3.2, (a.y + b.y) / 2);
    const arc3 = cub(a, lerp(a, c, 0.7), lerp(b, c, 0.7), b, 10);
    pen.hair(pl.m(arc3), pl.fine * 1.15, INK, 0.55);
    if (pl.has(100)) pen.hair(pl.m(arc3.slice(1, -4).map((p) => pt(p.x + 1, p.y))), pl.fine * 1.4, SHINE, 0.45);
  }
}

function paintCopeEye(pl: Plate, pen: Pen): void {
  const { ctx } = pl;
  const c = pl.p(COPE_EYE.x, COPE_EYE.y);
  const r = Math.max(COPE_EYE.r * pl.k, EYE_MIN_PX);
  glow(ctx, c, r * 2.6, 'rgba(232,44,22,0.4)', 'rgba(232,44,22,0)');
  // One eye, unmistakably: a single glossy red bead, dark at its pigment core.
  const bead = oval(c, r, r * 0.9, 0.35, 20);
  pen.fill(bead, EYE_RED, 1);
  if (!pl.has(70)) return;
  const g = ctx.createRadialGradient(c.x + r * 0.15, c.y + r * 0.15, 0, c.x, c.y, r);
  g.addColorStop(0, 'rgba(60,4,2,0.8)');
  g.addColorStop(0.45, 'rgba(110,8,4,0.4)');
  g.addColorStop(1, 'rgba(255,90,60,0.15)');
  ctx.fillStyle = g;
  pathOf(ctx, bead);
  ctx.fill();
  pen.fill(oval(pt(c.x - r * 0.36, c.y - r * 0.38), r * 0.3, r * 0.2, -0.6, 12), SHINE, 0.9);
  pen.dot(c.x + r * 0.4, c.y + r * 0.42, r * 0.08, SHINE, 0.6);
  pen.stroke(closed(bead), Math.max(0.5, pl.line * 0.45), '#4a0806', 0.9, false);
}

export function paintCopepod(pl: Plate, pose: CopeState): void {
  drawA1(pl, pl.pen(1), a1Spine(0, pose.kick), false);
  const legs = pl.pen(2);
  LEGS.forEach((l, i) => drawLeg(pl, legs, pt(l.x + 1.4, proBottom(l.x) - 1.6), legAngle(i, pose.kick) - 0.14, l.len * 0.94, 0.5));
  LEGS.forEach((l, i) => drawLeg(pl, legs, pt(l.x, proBottom(l.x) - 0.4), legAngle(i, pose.kick), l.len, 1));
  drawMouthparts(pl, pl.pen(3), pose.bite);
  drawCopeTail(pl, pl.pen(4));
  paintProsome(pl, pl.pen(5));
  paintCopeEye(pl, pl.pen(7, 0.4));
  drawA1(pl, pl.pen(6), a1Spine(1, pose.kick), true);
}
