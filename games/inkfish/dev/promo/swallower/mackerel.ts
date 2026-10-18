import { PAPER_FILL } from '../../../src/art/fish/kit';
import { INK, Pen, type Pt } from '../../../src/art/pen';
import { MACKEREL } from './anatomy';
import { MACK_H, type SpineSample } from './swallow';

/**
 * The snake mackerel, in the game's pen and ink, drawn along its bent spine
 * (swallow.ts) so it can trail out of the swallower's mouth and coil inside
 * its stomach: a long dark-silver ribbon of a fish with a low spiny fin
 * down most of its back, a little second dorsal and anal fin, finlets, a
 * forked tail, a big eye and a fanged jaw. Same pen as fishArt: a paper
 * fill and a misregistered wash, belly-curve hatching, two open contour
 * strokes, re-traced, and a fresh wobble each boil frame.
 *
 * Drawn in the swallower's local px; `lw` is local px per game texture px,
 * so its lines weigh what the swallower's do.
 */

const WASH = '#5b6571';
const BACK = '#2d333c';
const FIN_WASH = '#8d96a0';
const SHINE = '#dfe6ec';

export interface MackerelLook {
  readonly boil: number;
  /** Local px per texture px: line weights and wobble scale with it. */
  readonly lw: number;
  readonly alpha?: number;
}

interface Frame {
  readonly p: Pt;
  /** Unit tangent, snout towards tail; `n` its normal, the dorsal side. */
  readonly t: Pt;
  readonly n: Pt;
  readonly h: number;
  readonly s: number;
}

function framesOf(spine: readonly SpineSample[]): Frame[] {
  return spine.map((q, i) => {
    const a = spine[Math.max(0, i - 1)]!;
    const b = spine[Math.min(spine.length - 1, i + 1)]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const t = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
    return { p: { x: q.x, y: q.y }, t, n: { x: -t.y, y: t.x }, h: q.h, s: q.s };
  });
}

/** A point `v` half-depths off the spine at frame `f` (positive: the back), pushed `a` local px along it. */
const off = (f: Frame, v: number, a = 0): Pt => ({ x: f.p.x + f.n.x * f.h * v + f.t.x * a, y: f.p.y + f.n.y * f.h * v + f.t.y * a });

/** The frame nearest to `s`. */
const at = (fr: readonly Frame[], s: number): Frame => fr[Math.round(s * (fr.length - 1))]!;

/** A fin along an edge between s0 and s1: `side` 1 the back, -1 the belly; `height` in half-depths; `spiny` for the low first dorsal. */
function edgeFin(pen: Pen, fr: readonly Frame[], from: number, to: number, side: number, height: number, lw: number, spiny: boolean): void {
  const n = fr.length - 1;
  const a = Math.round(from * n);
  const b = Math.round(to * n);
  if (b - a < 2) return;
  const base: Pt[] = [];
  const tips: Pt[] = [];
  for (let i = a; i <= b; i++) {
    const f = fr[i]!;
    const u = (i - Math.round(from * n)) / Math.max(1, Math.round((to - from) * n));
    const prof = spiny ? 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, u * 1.3)) ** 0.5 : Math.sin(Math.PI * Math.min(1, u * 1.1)) ** 0.7;
    const hgt = MACK_H * height * Math.max(0.15, prof) * (f.h / MACK_H) ** 0.5;
    base.push(off(f, side * 0.92));
    tips.push({ x: f.p.x + f.n.x * (f.h * side * 0.92 + side * hgt) + f.t.x * hgt * 0.5, y: f.p.y + f.n.y * (f.h * side * 0.92 + side * hgt) + f.t.y * hgt * 0.5 });
  }
  const shape = [...base, ...[...tips].reverse()];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, spiny ? BACK : FIN_WASH, spiny ? 0.45 : 0.3);
  const every = spiny ? 3 : 2;
  base.forEach((p, i) => {
    if (i % every) return;
    pen.hair([p, tips[i]!], (spiny ? 0.8 : 0.5) * lw, INK, 0.8);
  });
  pen.stroke(tips, 0.9 * lw, INK, 1, false);
}

/** The finlets between the second dorsal and anal fins and the tail: little flags along both edges. */
function finlets(pen: Pen, fr: readonly Frame[], lw: number): void {
  const [from, to] = MACKEREL.finlets;
  for (let k = 0; k < 5; k++) {
    const s = from + (k / 5) * (to - from);
    const f = at(fr, s);
    for (const side of [1, -1]) {
      const root = off(f, side * 0.9);
      const len = MACK_H * 0.24;
      const tri = [root, { x: root.x + f.n.x * side * len + f.t.x * len * 1.1, y: root.y + f.n.y * side * len + f.t.y * len * 1.1 }, off(f, side * 0.9, len * 1.2)];
      pen.fill(tri, PAPER_FILL, 1);
      pen.fill(tri, BACK, 0.5);
      pen.hair([...tri, tri[0]!], 0.45 * lw, INK, 0.9);
    }
  }
}

/** The forked tail, from the stalk to the tips. */
function tail(pen: Pen, fr: readonly Frame[], lw: number): void {
  const n = fr.length - 1;
  const base = fr[Math.round(MACKEREL.tailBase * n)]!;
  const end = fr[n]!;
  const span = MACK_H * 1.45 * Math.sqrt(base.h / (MACK_H * 0.24));
  const tipUp = { x: end.p.x + end.n.x * span + end.t.x * MACK_H * 0.5, y: end.p.y + end.n.y * span + end.t.y * MACK_H * 0.5 };
  const tipDown = { x: end.p.x - end.n.x * span + end.t.x * MACK_H * 0.5, y: end.p.y - end.n.y * span + end.t.y * MACK_H * 0.5 };
  const notch = fr[Math.round(0.975 * n)]!.p;
  const shape = [off(base, 1.05), tipUp, notch, tipDown, off(base, -1.05)];
  const smooth: Pt[] = [];
  for (let i = 0; i < shape.length - 1; i++) {
    const a = shape[i]!;
    const b = shape[i + 1]!;
    for (let k = 0; k < 6; k++) smooth.push({ x: a.x + ((b.x - a.x) * k) / 6, y: a.y + ((b.y - a.y) * k) / 6 });
  }
  smooth.push(shape[shape.length - 1]!);
  pen.fill(smooth, PAPER_FILL, 1);
  pen.fill(smooth, FIN_WASH, 0.3);
  for (let k = 1; k < 10; k++) {
    const u = k / 10;
    const edge = u < 0.5 ? { x: tipUp.x + (notch.x - tipUp.x) * u * 2, y: tipUp.y + (notch.y - tipUp.y) * u * 2 } : { x: notch.x + (tipDown.x - notch.x) * (u - 0.5) * 2, y: notch.y + (tipDown.y - notch.y) * (u - 0.5) * 2 };
    pen.hair([base.p, edge], 0.5 * lw, INK, 0.6);
  }
  pen.stroke(smooth, 1.2 * lw, INK, 1, false);
}

/** Eye, fanged jaw, gill cover and the little pectoral fin. */
function head(pen: Pen, fr: readonly Frame[], lw: number): void {
  const n = fr.length - 1;
  const snout = fr[0]!;
  const e = fr[Math.round(MACKEREL.eye * n)]!;
  const jawEnd = fr[Math.round(MACKEREL.jaw * n)]!;
  const gill = fr[Math.round(MACKEREL.gill * n)]!;
  // The jaw: from the tip of the (jutting) lower jaw back under the eye.
  const jaw = [off(snout, -0.1, 2 * lw), off(fr[Math.round(0.03 * n)]!, -0.3), off(jawEnd, -0.12)];
  pen.stroke(jaw, 1.1 * lw, INK, 1, false);
  // Fangs: two long ones at the front of the upper jaw, needles along the lower.
  for (const [s, len, w] of [[0.008, 0.85, 2.4], [0.02, 0.6, 2]] as const) {
    const f = fr[Math.round(s * n)]!;
    const root = off(f, -0.12);
    needle(pen, root, { x: root.x - f.n.x * f.h * len + f.t.x * 2, y: root.y - f.n.y * f.h * len + f.t.y * 2 }, w * lw);
  }
  for (let k = 0; k < 5; k++) {
    const f = fr[Math.round((0.028 + k * 0.009) * n)]!;
    const root = off(f, -0.32);
    needle(pen, root, { x: root.x + f.n.x * f.h * 0.28, y: root.y + f.n.y * f.h * 0.28 }, 1.1 * lw);
  }
  // A big eye high on the head.
  const ec = off(e, 0.22);
  const r = e.h * 0.5;
  const ring = Array.from({ length: 19 }, (_, i) => ({ x: ec.x + Math.cos((i / 18) * Math.PI * 2) * r, y: ec.y + Math.sin((i / 18) * Math.PI * 2) * r }));
  pen.fill(ring, PAPER_FILL, 1);
  pen.fill(ring, '#c9c6a8', 0.35);
  pen.stroke(ring, 0.9 * lw, INK, 1, false);
  pen.dot(ec.x + e.t.x * -r * 0.1, ec.y + e.t.y * -r * 0.1, r * 0.48, INK);
  pen.dot(ec.x - e.t.x * r * 0.25 + e.n.x * r * 0.2, ec.y - e.t.y * r * 0.25 + e.n.y * r * 0.2, Math.max(0.6, r * 0.14), PAPER_FILL);
  // Gill cover.
  pen.stroke([off(gill, 0.85), off(gill, 0, -gill.h * 0.35), off(gill, -0.85)], 0.9 * lw, INK, 1, false);
  // The pectoral fin, low behind the gill.
  const pf = fr[Math.round(MACKEREL.pectoral * n)]!;
  const root = off(pf, -0.3);
  const fan = [0, 1, 2, 3, 4].map((k) => off(pf, -0.22 - k * 0.09, MACK_H * (0.75 - k * 0.07)));
  const fin = [root, ...fan];
  pen.fill(fin, PAPER_FILL, 1);
  pen.fill(fin, BACK, 0.45);
  for (const p of fan) pen.hair([root, p], 0.45 * lw, INK, 0.75);
  pen.hair([...fin, fin[0]!], 0.55 * lw, INK, 0.9);
}

function needle(pen: Pen, base: Pt, tip: Pt, width: number): void {
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = (-dy / d) * (width / 2);
  const ny = (dx / d) * (width / 2);
  const tooth = [{ x: base.x + nx, y: base.y + ny }, tip, { x: base.x - nx, y: base.y - ny }];
  pen.fill(tooth, PAPER_FILL, 1);
  pen.hair(tooth, 0.4 * width, INK, 0.9);
}

/**
 * Draws the whole mackerel. Where it is half inside the swallower, the
 * caller draws it twice under different clips (in the stomach, in front of
 * the mouth): the same strokes each time, so the line boils only at the
 * game's 8 a second, never as it slides.
 */
export function drawMackerel(ctx: CanvasRenderingContext2D, spine: readonly SpineSample[], look: MackerelLook): void {
  const n = spine.length - 1;
  const lw = look.lw;
  const fr = framesOf(spine);
  const pen = new Pen(ctx, 7001 + look.boil * 977, 0.5 * lw);
  ctx.save();
  ctx.globalAlpha = look.alpha ?? 1;
  // Fins behind the body.
  tail(pen, fr, lw);
  edgeFin(pen, fr, MACKEREL.dorsal[0], MACKEREL.dorsal[1], 1, 0.42, lw, true);
  edgeFin(pen, fr, MACKEREL.dorsal2[0], MACKEREL.dorsal2[1], 1, 0.75, lw, false);
  edgeFin(pen, fr, MACKEREL.anal[0], MACKEREL.anal[1], -1, 0.65, lw, false);
  finlets(pen, fr, lw);

  const top: Pt[] = [];
  const bottom: Pt[] = [];
  for (let i = 0; i <= Math.round(MACKEREL.tailBase * n) + 2; i++) {
    top.push(off(fr[i]!, 1));
    bottom.push(off(fr[i]!, -0.95));
  }
  {
    // Close the snout to a point.
    top[0] = off(fr[0]!, 0.1);
    bottom[0] = off(fr[0]!, -0.1, 1.5 * lw);
  }
  const body = [...top, ...[...bottom].reverse()];
  pen.fill(body, PAPER_FILL, 1);
  pen.clipped(body, () => {
    ctx.translate(1.2 * lw, 0.8 * lw);
    pen.fill(body, WASH, 0.62);
    ctx.translate(-1.2 * lw, -0.8 * lw);
    // A dark back over the silver.
    const back = [...top, ...[...top.map((_, k) => off(fr[k]!, 0.15))].reverse()];
    pen.fill(back, BACK, 0.55);
    // Belly-curve hatching, as fishArt shades its fish, and the cross contours of a round body.
    for (const v of [-0.7, -0.45]) {
      const row = top.map((_, k) => off(fr[k]!, v));
      pen.hair(row.filter((_, k) => k % 3 === 0), 0.5 * lw, INK, 0.45);
    }
    for (let i = 2; i <= n; i += 5) {
      const f = fr[i]!;
      pen.hair([off(f, 0.95), off(f, 0.15, -f.h * 0.45), off(f, -0.9)], 0.45 * lw, INK, 0.2);
    }
    // The silver shine along its flank, and the lateral line.
    const shine = top.map((_, k) => off(fr[k]!, -0.25)).filter((_, k) => k % 3 === 0);
    pen.hair(shine, 1.6 * lw, SHINE, 0.35);
    for (let i = 1; i < n - 1; i += 3) pen.hair([off(fr[i]!, 0.42), off(fr[i + 1]!, 0.42)], 0.55 * lw, INK, 0.55);
  });
  // Back and belly as two open strokes, joined at the snout.
  pen.stroke([...[...bottom].slice(0, 2).reverse(), ...top], 2.1 * lw, INK);
  pen.stroke(bottom, 2.1 * lw, INK);
  head(pen, fr, lw);
  ctx.restore();
}
