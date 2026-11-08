import { INK, pathOf, Pen, type Pt } from '../../../../../src/art/pen';
import { createRng } from '../../../../../src/logic/rng';
import { boundsOf, type Box, capsule, closed, cub, glow, lerp, line, oval, Plate, polar, pt, ribbon, seta, shadeY, SHINE, skin, TAU, yAt } from './ink';

/**
 * Antarctic krill side-on, head to the right: pinkish-orange glass with red
 * pigment stars, black eyes on stalks, a basket of feathery legs, a green gut
 * full of diatoms, a curling abdomen, a tail fan and blue-green photophores.
 */
const PINK = '#f19274';
const PINK_DEEP = '#b9452e';
const SPOT_RED = '#c3281e';
export const KRILL_BOX: Box = { x0: -76, x1: 92, y0: -66, y1: 66 };

/** The carapace: a short deep shield over the head and thorax, about a third of the body. */
const CARA_TOP = cub(pt(46, -6), pt(40, -11.8), pt(28, -12.8), pt(18, -11.4), 18);
const CARA_BOT = cub(pt(45, 1.5), pt(38, 9.8), pt(28, 12), pt(19, 10.8), 18);
const CARA_BACK = cub(pt(18, -11.4), pt(15.4, -3), pt(16, 4), pt(19, 10.8), 8);
const CARA_SHAPE = [pt(51.5, -7.4), ...CARA_TOP, ...CARA_BACK.slice(1), ...[...CARA_BOT].reverse().slice(1), pt(47.6, -1.6)];
const caraBottom = (x: number): number => yAt(CARA_BOT, x);

const SEG_LEN = [10, 9.6, 9.2, 9, 8.6, 11.5] as const;
/** Half heights above and below the abdomen's mid line at each joint. */
const SEG_TOP = [11, 10.3, 9.4, 8.3, 7, 5.5, 3.6] as const;
const SEG_BOT = [10.6, 10, 9.2, 8.1, 6.8, 5.2, 3.3] as const;

interface Abdomen {
  readonly joints: readonly Pt[];
  /** Heading of each segment, head to tail (pi = straight back). */
  readonly heads: readonly number[];
  readonly tops: readonly Pt[];
  readonly bots: readonly Pt[];
  readonly shapes: readonly Pt[][];
  readonly endHead: number;
}

function abdomen(flex: number): Abdomen {
  const bend = 0.045 + 0.27 * flex;
  const joints: Pt[] = [pt(19, -0.4)];
  const heads: number[] = [];
  let h = Math.PI;
  for (let i = 0; i < SEG_LEN.length; i++) {
    h -= bend * (i === 0 ? 0.5 : 1);
    heads.push(h);
    joints.push(polar(joints[i]!, h, SEG_LEN[i]!));
  }
  const jointHead = (j: number): number => (j === 0 ? Math.PI : j === heads.length ? heads[j - 1]! : (heads[j - 1]! + heads[j]!) / 2);
  const tops = joints.map((p, j) => polar(p, jointHead(j) + Math.PI / 2, SEG_TOP[j]!));
  const bots = joints.map((p, j) => polar(p, jointHead(j) - Math.PI / 2, SEG_BOT[j]!));
  const shapes = heads.map((hd, i) => {
    const fwd = hd + Math.PI;
    const down = hd - Math.PI / 2;
    const t0 = polar(tops[i]!, fwd, 1.6);
    const b0 = polar(bots[i]!, fwd, 1.6);
    const t1 = tops[i + 1]!;
    const b1 = bots[i + 1]!;
    // The back arches a little; the side plate (pleuron) hangs below.
    const topEdge = cub(t0, polar(lerp(t0, t1, 0.33), hd + Math.PI / 2, 0.7), polar(lerp(t0, t1, 0.66), hd + Math.PI / 2, 0.7), t1, 6);
    const back = cub(t1, polar(lerp(t1, b1, 0.33), hd, 1.6), polar(lerp(t1, b1, 0.7), hd, 1.4), b1, 6).slice(1);
    const pleuron = cub(b1, polar(b1, down, 2.6), polar(b0, down, 2.4), b0, 8).slice(1);
    return [...topEdge, ...back, ...pleuron];
  });
  return { joints, heads, tops, bots, shapes, endHead: heads[heads.length - 1]! - bend };
}

/** A point inside abdomen segment i: u along it (0 front), v down it (0 back, 1 belly). */
function inSegment(ab: Abdomen, i: number, u: number, v: number): Pt {
  return lerp(lerp(ab.tops[i]!, ab.tops[i + 1]!, u), lerp(ab.bots[i]!, ab.bots[i + 1]!, u), v);
}

interface Spot {
  readonly seg: number;
  readonly u: number;
  readonly v: number;
  readonly r: number;
}

/** Red pigment stars, fixed on the body (seg -1 = the carapace). */
const SPOTS: readonly Spot[] = (() => {
  const rng = createRng(4242);
  const v = (): number => (rng() < 0.55 ? 0.06 + rng() * 0.16 : 0.8 + rng() * 0.14);
  const cara = Array.from({ length: 10 }, () => ({ seg: -1, u: 0.08 + rng() * 0.88, v: v(), r: 0.35 + rng() * 0.35 }));
  const abd = Array.from({ length: 6 * 4 }, (_, i) => ({ seg: Math.floor(i / 4), u: 0.1 + rng() * 0.8, v: v(), r: 0.3 + rng() * 0.35 }));
  return [...cara, ...abd];
})();

function spotAt(ab: Abdomen, s: Spot): Pt {
  if (s.seg >= 0) return inSegment(ab, s.seg, s.u, s.v);
  const i = Math.round(s.u * (CARA_TOP.length - 1));
  return lerp(CARA_TOP[i]!, CARA_BOT[i]!, s.v);
}

function paintSpots(pl: Plate, pen: Pen, ab: Abdomen, carapace: boolean): void {
  if (!pl.has(30)) return;
  for (const s of SPOTS) {
    if ((s.seg < 0) !== carapace) continue;
    const c = pl.at(spotAt(ab, s));
    const r = s.r * pl.k;
    pen.dot(c.x, c.y, Math.max(0.4, r), SPOT_RED, 0.8);
    if (!pl.has(220)) continue;
    // A pigment star: arms branching off a dark core.
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * TAU + pen.rng() * 0.6;
      const arm = r * (2.4 + pen.rng() * 2.2);
      const mid = polar(c, a, arm * 0.55);
      pen.hair([c, mid, polar(mid, a + 0.4, arm * 0.45)], pl.fine * 0.6, SPOT_RED, 0.65);
    }
  }
}

/** Blue-green light organs: a red-rimmed lens with a faint glow. */
function photophore(pl: Plate, pen: Pen, at: Pt): void {
  const c = pl.at(at);
  const r = Math.max(0.6, 1.15 * pl.k);
  glow(pl.ctx, c, r * 3.6, 'rgba(110,232,255,0.4)', 'rgba(110,232,255,0)');
  pen.fill(oval(c, r, r, 0, 12), '#9c3a26', 0.75);
  glow(pl.ctx, pt(c.x - r * 0.12, c.y - r * 0.12), r * 0.75, 'rgba(225,252,255,0.95)', 'rgba(120,230,250,0.6)');
}

function paintSegment(pl: Plate, pen: Pen, ab: Abdomen, i: number): void {
  const { ctx, k } = pl;
  const shape = pl.m(ab.shapes[i]!);
  skin(pl, pen, shape, PINK, 0.5, 0.42);
  const b = boundsOf(shape);
  shadeY(ctx, shape, b.y0, b.y1, [[0, 'rgba(255,246,236,0.34)'], [0.4, 'rgba(255,246,236,0)'], [1, 'rgba(150,40,24,0.26)']]);
  pen.clipped(shape, () => {
    if (pl.has(140)) {
      // Muscle bands slanting through the glass.
      for (const u of [0.25, 0.55, 0.85]) pen.hair(pl.m([inSegment(ab, i, u + 0.12, 0.18), inSegment(ab, i, u - 0.12, 0.8)]), pl.fine * 0.7, PINK_DEEP, 0.2);
    }
    pen.hair(pl.m(line(inSegment(ab, i, -0.1, 0.06), inSegment(ab, i, 1, 0.06), 4)), pl.fine * 1.8, SPOT_RED, 0.32);
  });
  if (pl.has(48)) pen.hair(pl.m(line(inSegment(ab, i, 0.05, 0.16), inSegment(ab, i, 0.92, 0.16), 4)), pl.fine * 1.6, SHINE, 0.5);
  // Heavy along the back and the side plate, a lighter line at the joint.
  pen.stroke(shape.slice(0, 7), pl.line * 0.85, INK, 1, false);
  pen.stroke(shape.slice(12), pl.line * 0.8, INK, 1, false);
  pen.stroke(shape.slice(6, 13), pl.line * 0.45, INK, 0.85, false);
}

function paintTailFan(pl: Plate, pen: Pen, ab: Abdomen, near: boolean): void {
  const { k } = pl;
  const e = ab.joints[ab.joints.length - 1]!;
  const h = ab.endHead;
  const fans = near
    ? [{ a: h + 0.32, len: 17, w: 5.2 }, { a: h + 0.12, len: 15.5, w: 4.4 }]
    : [{ a: h - 0.14, len: 16.5, w: 5 }, { a: h - 0.34, len: 14.5, w: 4.2 }];
  for (const f of fans) {
    const c = polar(e, f.a, f.len / 2 + 0.6);
    if (pl.has(90)) {
      for (let j = 0; j < 9; j++) {
        const t = -1.25 + (j / 8) * 2.5;
        const base = pl.at(polar(polar(c, f.a, (f.len / 2) * Math.cos(t)), f.a + Math.PI / 2, (f.w / 2) * Math.sin(t)));
        seta(pl, pen, base, f.a + t * 0.7, 4 * k, 0.6, 0.05);
      }
    }
    const shape = pl.m(oval(c, f.len / 2, f.w / 2, f.a, 20));
    skin(pl, pen, shape, PINK, 0.48, 0.38);
    if (pl.has(60)) pen.hair(pl.m([polar(e, f.a, 1.5), polar(e, f.a, f.len)]), pl.fine * 0.8, PINK_DEEP, 0.45);
    pen.stroke(closed(shape), pl.line * 0.55, INK, near ? 1 : 0.7, false);
  }
  if (near) return;
  // The telson, a spike between the paddles.
  const telson = pl.m(capsule(e, polar(e, h, 17), 3.6, 0.6));
  skin(pl, pen, telson, PINK, 0.5, 0.45);
  pen.stroke(closed(telson), pl.line * 0.55, INK, 1, false);
}

function paintPleopod(pl: Plate, pen: Pen, rootU: Pt, a: number, len: number, alpha: number, phase: number): void {
  const { k } = pl;
  const root = pl.at(rootU);
  const L = len * k;
  const knee = polar(root, a, L * 0.36);
  const spread = 0.06 + 0.16 * (0.5 + 0.5 * Math.cos(phase));
  for (const s of [-1, 1]) {
    const ra = a + s * spread;
    const tip = polar(knee, ra, L * 0.66);
    if (pl.has(48)) {
      const n = pl.has(200) ? 7 : 2;
      for (let j = 1; j <= n; j++) {
        const at = lerp(knee, tip, j / n);
        for (const side of [-1, 1]) seta(pl, pen, at, ra + side * 0.62, (3.8 + 3.4 * (j / n)) * k, 0.65 * alpha, 0.06);
      }
    }
    const shape = capsule(knee, tip, 1.6 * k, 0.6 * k);
    skin(pl, pen, shape, PINK, 0.4 * alpha, 0.62 * alpha);
    pen.stroke(closed(shape), pl.line * 0.4, INK, alpha * 0.8, false);
  }
  const base = capsule(root, knee, 2.6 * k, 1.9 * k);
  skin(pl, pen, base, PINK, 0.45 * alpha, 0.62 * alpha);
  pen.stroke(closed(base), pl.line * 0.45, INK, alpha * 0.85, false);
}

function pleopods(pl: Plate, pen: Pen, ab: Abdomen, kick: number, near: boolean): void {
  for (let i = 0; i < 5; i++) {
    const hd = ab.heads[i]!;
    const phase = TAU * kick - i * 1.1 - (near ? 0 : 0.35);
    const root = polar(lerp(ab.bots[i]!, ab.bots[i + 1]!, 0.45), hd + Math.PI / 2, near ? 1.2 : 2.6);
    const a = hd - Math.PI / 2 + 0.45 + 0.5 * Math.sin(phase);
    paintPleopod(pl, pen, near ? root : pt(root.x - 1, root.y), a, 16 - i * 0.8, near ? 1 : 0.5, phase);
  }
}

const TLEG_X = [40, 36, 32, 28, 24, 20.5] as const;
const TLEG_SCALE = [0.95, 1.05, 1.08, 1.02, 0.92, 0.75] as const;

/** A feeding leg: down from the carapace, then bent forward, combed with long setae on its front edge (the basket). */
function thoracopod(pl: Plate, pen: Pen, i: number, kick: number, off: Pt, alpha: number): void {
  const { k } = pl;
  const s = TLEG_SCALE[i]!;
  const x = TLEG_X[i]!;
  const sway = 0.07 * Math.sin(TAU * kick + i * 0.9);
  const p0 = pl.p(x + off.x, caraBottom(x) - 1.3 + off.y);
  const lean = (2.5 - i) * 0.05;
  const p1 = polar(p0, 1.55 + lean + sway, 5 * s * k);
  const p2 = polar(p1, 1.2 + lean + sway, 10 * s * k);
  const p3 = polar(p2, 0.85 + lean + sway * 1.5, 8.5 * s * k);
  if (pl.has(36)) {
    const n = pl.has(300) ? 12 : pl.has(110) ? 6 : 2;
    for (const [a, b] of [[p1, p2], [p2, p3]] as const) {
      const segA = Math.atan2(b.y - a.y, b.x - a.x);
      for (let j = 1; j <= n; j++) seta(pl, pen, lerp(a, b, j / (n + 0.5)), segA - 1.15, (8 + 5 * pen.rng()) * s * k, 0.42 * alpha, -0.1);
    }
    seta(pl, pen, p3, 0.4 + sway, 7 * s * k, 0.6 * alpha, -0.1);
    // The exopod, a little whip trailing back off the base.
    seta(pl, pen, p1, 2.3, 6.5 * s * k, 0.5 * alpha, 0.2);
  }
  for (const [a, b, w0, w1] of [[p0, p1, 2.2, 1.7], [p1, p2, 1.6, 1.2], [p2, p3, 1.1, 0.5]] as const) {
    const shape = capsule(a, b, w0 * k, w1 * k);
    skin(pl, pen, shape, PINK, 0.4 * alpha, 0.62 * alpha);
    pen.stroke(closed(shape), pl.line * 0.42, INK, alpha * 0.8, false);
  }
}

function paintCarapace(pl: Plate, pen: Pen, ab: Abdomen): void {
  const { ctx, k } = pl;
  const shape = pl.m(CARA_SHAPE);
  skin(pl, pen, shape, PINK, 0.5, 0.4);
  shadeY(ctx, shape, -12 * k, 11 * k, [[0, 'rgba(255,246,236,0.36)'], [0.35, 'rgba(255,246,236,0)'], [1, 'rgba(150,40,24,0.28)']]);
  pen.clipped(shape, () => {
    // The digestive gland, green with eaten diatoms, and the heart above it.
    const c = pl.p(31, -1.5);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(1, 0.5);
    const g = ctx.createRadialGradient(-3 * k, -2 * k, 0, 0, 0, 13 * k);
    g.addColorStop(0, 'rgba(150,170,70,0.7)');
    g.addColorStop(0.55, 'rgba(118,142,48,0.5)');
    g.addColorStop(1, 'rgba(118,142,48,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 13 * k, 0, TAU);
    ctx.fill();
    ctx.restore();
    if (pl.has(160)) pen.hair(closed(pl.m(oval(pt(31, -1.5), 10, 5, 0.04, 22))), pl.fine * 0.8, '#55652a', 0.35);
    pen.fill(pl.m(oval(pt(25, -8.4), 4.5, 1.8, -0.1, 12)), PINK_DEEP, 0.25);
    if (pl.has(60)) {
      pen.hair(pl.m(cub(pt(37, -12.2), pt(34.5, -6), pt(33.5, -1), pt(35.5, 4), 8)), pl.fine * 1.1, INK, 0.45);
      for (const v of [0.74, 0.82, 0.89, 0.95]) pen.hair(pl.m(CARA_TOP.slice(2, -1).map((p, i) => lerp(p, CARA_BOT[i + 2]!, v))), pl.fine * 0.8, INK, 0.12 + (v - 0.7) * 0.9);
    }
  });
  paintSpots(pl, pen, ab, true);
  pen.hair(pl.m(CARA_TOP.slice(2, -2).map((p) => pt(p.x, p.y + 1.8))), pl.fine * 2, SHINE, 0.6);
  pen.stroke(closed(shape), pl.line, INK, 1, true);
}

/** A thin whip (antenna flagellum): a tapered ribbon when big enough, else a line. */
function whip(pl: Plate, pen: Pen, ptsU: readonly Pt[], w0: number, alpha: number): void {
  const pts = pl.m(ptsU);
  if (w0 * pl.k < 2) {
    pen.stroke(pts, Math.max(0.4, w0 * pl.k * 0.8), INK, alpha, false);
    return;
  }
  const { top, bot, shape } = ribbon(pts, (u) => w0 * pl.k * (1 - 0.8 * u));
  skin(pl, pen, shape, PINK, 0.45 * alpha, 0.5 * alpha);
  if (pl.has(200)) for (let i = 2; i < top.length - 1; i += 2) pen.hair([top[i]!, bot[i]!], pl.fine * 0.5, INK, 0.4 * alpha);
  pen.stroke(closed(shape), pl.line * 0.4, INK, alpha, false);
}

function paintKrillHead(pl: Plate, pen: Pen, kick: number): void {
  const { ctx, k } = pl;
  const sw = 1.2 * Math.sin(TAU * kick);
  // Antennal scale and the antennule's three-jointed stalk.
  const scale = pl.m([...cub(pt(45.5, 0.4), pt(51, -1.4), pt(57, -1), pt(60.5, 1.2), 10), ...cub(pt(60.5, 1.2), pt(56, 2.4), pt(50, 3), pt(45.5, 2.4), 10).slice(1)]);
  if (pl.has(140)) for (let j = 0; j < 9; j++) seta(pl, pen, pl.at(pt(48 + j * 1.4, 2.7 - j * 0.12)), 1.1 - j * 0.04, 2.8 * k, 0.5, 0.05);
  skin(pl, pen, scale, PINK, 0.5, 0.4);
  pen.stroke(closed(scale), pl.line * 0.5, INK, 1, false);
  for (const [a, b, w0, w1] of [[pt(45, -4), pt(51, -6.6), 3.3, 2.7], [pt(51, -6.6), pt(56.5, -8), 2.7, 2.2], [pt(56.5, -8), pt(60.5, -8.8), 2.2, 1.9]] as const) {
    const seg = pl.m(capsule(a, b, w0, w1));
    skin(pl, pen, seg, PINK, 0.5, 0.48);
    pen.stroke(closed(seg), pl.line * 0.5, INK, 1, false);
  }
  whip(pl, pen, cub(pt(60.5, -8.8), pt(68, -12), pt(74, -18 + sw), pt(80, -27 + sw), 14), 1.3, 1);
  whip(pl, pen, cub(pt(60.5, -8.8), pt(70, -9), pt(78, -9 + sw), pt(87, -13 + sw), 14), 1.2, 1);
  // Eye on its stalk: black, glossy, a dark red ring of pigment.
  const stalk = pl.m(capsule(pt(39.5, -3), pt(44.5, -6.4), 4.2, 3.6));
  skin(pl, pen, stalk, PINK, 0.5, 0.5);
  pen.stroke(closed(stalk), pl.line * 0.5, INK, 1, false);
  const c = pl.p(45.6, -7.4);
  const r = 5 * k;
  const eye = oval(c, r, r * 0.96, 0, 22);
  const g = ctx.createRadialGradient(c.x - r * 0.3, c.y - r * 0.3, 0, c.x, c.y, r);
  g.addColorStop(0, '#3e2c30');
  g.addColorStop(0.55, '#171216');
  g.addColorStop(1, '#0b090c');
  ctx.fillStyle = g;
  pathOf(ctx, eye);
  ctx.fill();
  if (pl.has(200)) {
    for (let i = 0; i < 40; i++) {
      const q = polar(c, i * 2.4, r * 0.85 * Math.sqrt((i + 0.5) / 40));
      pen.dot(q.x, q.y, r * 0.05, '#6a5458', 0.5);
    }
  }
  if (pl.has(40)) pen.hair(closed(oval(c, r * 0.9, r * 0.86, 0, 22)), pl.fine * 1.6, '#6e2418', 0.55);
  pen.fill(oval(pt(c.x - r * 0.36, c.y - r * 0.42), r * 0.3, r * 0.17, -0.6, 12), SHINE, 0.9);
  if (pl.has(60)) pen.dot(c.x + r * 0.34, c.y + r * 0.36, r * 0.08, SHINE, 0.6);
  pen.stroke(closed(eye), pl.line * 0.7, INK, 1, false);
}

export interface KrillState {
  readonly kick: number;
  readonly flex: number;
}

export function paintKrill(pl: Plate, pose: KrillState): void {
  const ab = abdomen(pose.flex);
  const sw = 1.5 * Math.sin(TAU * pose.kick);
  const far = pl.pen(1);
  whip(pl, far, cub(pt(49, 1), pt(78, -4 + sw), pt(70, -48), pt(-8, -57 + sw), 40), 1.1, 0.55);
  for (let i = 0; i < TLEG_X.length; i++) thoracopod(pl, far, i, pose.kick + 0.1, pt(-1.8, -1.4), 0.5);
  pleopods(pl, far, ab, pose.kick, false);
  paintTailFan(pl, far, ab, false);
  const body = pl.pen(2);
  for (let i = ab.shapes.length - 1; i >= 0; i--) paintSegment(pl, body, ab, i);
  paintSpots(pl, body, ab, false);
  pl.pen(3).hair(pl.m(ab.joints.slice(0, -1).map((p, j) => polar(p, ab.heads[j]! + Math.PI / 2, 3.2))), pl.fine * 1.4, '#7c4a2a', 0.35);
  paintTailFan(pl, pl.pen(4), ab, true);
  const lights = pl.pen(5, 0.4);
  for (let i = 0; i < 4; i++) photophore(pl, lights, inSegment(ab, i, 0.5, 0.88));
  pleopods(pl, pl.pen(6), ab, pose.kick, true);
  if (pl.has(200)) {
    // Feathery gills peeping out under the carapace.
    const gills = pl.pen(7);
    for (let i = 1; i < 6; i++) {
      const base = pl.p(TLEG_X[i]! - 2.4, caraBottom(TLEG_X[i]! - 2.4) - 0.6);
      for (let j = 0; j < 4; j++) gills.hair([base, polar(base, 1.9 + j * 0.22, (2.2 + j * 0.5) * pl.k), polar(base, 2.2 + j * 0.2, (3.2 + j * 0.6) * pl.k)], pl.fine * 0.6, PINK_DEEP, 0.55);
    }
  }
  paintCarapace(pl, pl.pen(8), ab);
  for (const at of [pt(36, caraBottom(36) - 1.6), pt(22.5, caraBottom(22.5) - 1.6), pt(41.4, -2.2)]) photophore(pl, lights, at);
  const near = pl.pen(9);
  for (let i = 0; i < TLEG_X.length; i++) thoracopod(pl, near, i, pose.kick, pt(0, 0), 1);
  paintKrillHead(pl, pl.pen(10), pose.kick);
  whip(pl, pl.pen(11), cub(pt(50, 2.2), pt(82, 2 + sw), pt(84, -44), pt(6, -51 + sw), 40), 1.3, 1);
}
