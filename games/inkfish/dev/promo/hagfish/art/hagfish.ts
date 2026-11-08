import type { Pt } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import { arcLength, clamp, evenly, linePath, mix, polyPath, ramp3 } from './geom';
import { glassBlob } from './slime';

/**
 * The hagfish: a thick, eel-like, slimy body, mauve-pink with a darker plum
 * back and a paler belly, a wet highlight running along the back where the
 * light catches it and a warm, translucent glow at its thin edges. A blunt,
 * rounded head with three pairs of short fleshy barbels round the mouth and
 * the single nostril, faint pale eyespots under the skin; a row of small dark
 * slime pores down the flank; the tail flattened into a paddle with a thin
 * fin fold round it. Painted along a spine (head first), slice by slice in
 * the order of depth, so a knot passes over and under itself: the skin is
 * washed in bands across the body (dark back to pale belly, darker where the
 * surface turns away), so it reads round however the spine curls.
 */

export interface HagLook {
  /** Half the thickness at the thickest, px. */
  readonly half: number;
  /** Slime on the skin along the body, 0 .. 1, by position (0 head .. 1 tail). */
  readonly coat?: (u: number) => number;
  /** Depth per spine point (higher draws on top), same length as the spine. */
  readonly depth?: readonly number[];
  /** The mouth, 0 shut .. 1 wide. */
  readonly mouth?: number;
  /** Slime beading at the pores, 0 .. 1. */
  readonly jets?: number;
  /** A squeeze (the jaws): body position and strength. */
  readonly pinch?: { readonly u: number; readonly k: number };
  /** Barbel wave phase. */
  readonly wiggle?: number;
  /** Which side of the spine the belly is on: 1 the right of the head-to-tail direction, -1 the left (default: whichever is lower on screen). */
  readonly belly?: 1 | -1;
  /** Direction towards the light, on screen (default: from above, a little right). */
  readonly light?: Pt;
}

const CHUNK = 5;
const BANDS = 24;
/** Across the body from the back (-1) to the belly (+1). */
const SKIN: readonly (readonly [number, string])[] = [
  [0, '#3c1c35'], [0.1, '#592b4a'], [0.24, '#7d4366'], [0.4, '#a26285'], [0.55, '#bf7f99'],
  [0.7, '#d9a3b0'], [0.82, '#e6b8bf'], [0.92, '#d499a6'], [1, '#93526b'],
];
const FIN = '#d9a3b0';
const OUT = '#2b1427';

/** Thickness along the body (s px from the head of `len` px), 0 .. 1. */
function profile(s: number, len: number, half: number, pinch?: HagLook['pinch']): number {
  const u = s / len;
  const cap = half * 0.95;
  const head = s < cap ? Math.sqrt(Math.max(0, 1 - (1 - s / cap) ** 2)) : 1;
  const sm = (v: number): number => v * v * (3 - 2 * v);
  // A thick eel body, a little fuller behind the head, narrowing to the tail, which flattens into a deep rounded paddle.
  const body = 0.93 + 0.07 * sm(clamp(u / 0.2)) - 0.32 * sm(clamp((u - 0.5) / 0.26)) + 0.36 * sm(clamp((u - 0.8) / 0.12));
  const tailCap = half * TAIL_CAP;
  const tail = len - s < tailCap ? Math.sqrt(Math.max(0, 1 - (1 - (len - s) / tailCap) ** 2)) : 1;
  const squeeze = pinch ? 1 - 0.26 * pinch.k * Math.exp(-(((u - pinch.u) / 0.045) ** 2)) : 1;
  return Math.max(0.04, head * body * tail * squeeze);
}
const TAIL_CAP = 0.8;

interface Slice {
  readonly p: Pt;
  /** Unit normal towards the belly. */
  readonly n: Pt;
  readonly w: number;
  readonly u: number;
  readonly s: number;
  readonly i: number;
}

function slices(spine: readonly Pt[], look: HagLook): { readonly list: Slice[]; readonly at: number[]; readonly len: number } {
  const len = arcLength(spine);
  const N = clamp(Math.round(len / 6), 60, 360);
  const { pts, at } = evenly(spine, N);
  const raw = pts.map((p, i) => {
    const [a, b] = [pts[Math.max(0, i - 1)]!, pts[Math.min(N - 1, i + 1)]!];
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: -(b.y - a.y) / l, y: (b.x - a.x) / l };
  });
  const belly = look.belly ?? (raw.reduce((s, n) => s + n.y, 0) >= 0 ? 1 : -1);
  const list = pts.map((p, i) => {
    const u = i / (N - 1);
    const s = u * len;
    return { p, n: { x: raw[i]!.x * belly, y: raw[i]!.y * belly }, w: look.half * profile(s, len, look.half, look.pinch), u, s, i };
  });
  return { list, at, len };
}

const side = (s: Slice, v: number): Pt => ({ x: s.p.x + s.n.x * s.w * v, y: s.p.y + s.n.y * s.w * v });

/** Where across the body (-1 back .. 1 belly) the light glints, for a slice. */
function glintAt(n: Pt, light: Pt): number {
  const l = Math.hypot(light.x, light.y, 0.8) || 1;
  const H = { x: light.x / l, y: light.y / l, z: 0.8 / l + 1 };
  const h = Math.hypot(H.x, H.y, H.z);
  const d = (n.x * H.x + n.y * H.y) / h;
  const z = H.z / h;
  return clamp(d / Math.hypot(d, z), -0.85, 0.85);
}

/** The thin fin fold round the paddle tail: a translucent flange along the back and belly and round the tip, drawn under the body. */
function paintFold(ctx: CanvasRenderingContext2D, list: readonly Slice[], half: number): void {
  const flange = half * 0.3;
  const grow = (q: Slice, from: number): number => flange * Math.sin((Math.PI / 2) * clamp((q.u - from) / 0.1));
  const back = list.filter((q) => q.u > 0.56);
  const belly = list.filter((q) => q.u > 0.72);
  const end = list[list.length - 1]!;
  if (back.length < 3 || belly.length < 3) return;
  const len = end.s;
  const c = list.reduce((a, q) => (Math.abs(q.s - (len - half * TAIL_CAP)) < Math.abs(a.s - (len - half * TAIL_CAP)) ? q : a));
  const dir = Math.atan2(end.p.y - c.p.y, end.p.x - c.p.x);
  const R = c.w + flange;
  const sideSign = Math.sign(Math.cos(dir) * c.n.y - Math.sin(dir) * c.n.x) || 1;
  // Round the tip, from the back side to the belly side.
  const cap: Pt[] = Array.from({ length: 11 }, (_, k) => {
    const a = dir + sideSign * (-Math.PI / 2 + (Math.PI * k) / 10);
    return { x: c.p.x + Math.cos(a) * R, y: c.p.y + Math.sin(a) * R };
  });
  const outer = (q: Slice, sg: number, from: number): Pt => {
    const off = q.w + grow(q, from);
    return { x: q.p.x + q.n.x * off * sg, y: q.p.y + q.n.y * off * sg };
  };
  const top = back.filter((q) => q.s <= c.s).map((q) => outer(q, -1, 0.56));
  const bot = belly.filter((q) => q.s <= c.s).map((q) => outer(q, 1, 0.72));
  const outline = [...top, ...cap, ...[...bot].reverse()];
  ctx.save();
  polyPath(ctx, [...outline, ...back.filter((q) => q.u <= 0.72).reverse().map((q) => q.p)]);
  ctx.fillStyle = mix(FIN, '#f4d0d6', 0.2, 0.82);
  ctx.fill();
  ctx.clip();
  // Fine rays across the fold, and its darker trailing edge.
  ctx.strokeStyle = 'rgba(120,50,84,0.3)';
  ctx.lineWidth = 1;
  for (let k = 0; k < outline.length; k += 2) {
    const o = outline[k]!;
    const toward = { x: c.p.x - o.x, y: c.p.y - o.y };
    const l = Math.hypot(toward.x, toward.y) || 1;
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(o.x + (toward.x / l) * flange * 1.3, o.y + (toward.y / l) * flange * 1.3);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(43,20,39,0.7)';
  ctx.lineWidth = Math.max(1.4, half * 0.04);
  ctx.lineJoin = 'round';
  linePath(ctx, outline);
  ctx.stroke();
}

function paintChunk(ctx: CanvasRenderingContext2D, list: readonly Slice[], i0: number, i1: number, look: HagLook, light: Pt, boil: number): void {
  const seg = list.slice(i0, i1 + 1);
  const mid = seg[Math.floor(seg.length / 2)]!;
  // The skin in bands across the body: plum back, mauve flank, pale belly, each edge darkening as it turns away.
  for (let b = 0; b < BANDS; b++) {
    const [v0, v1] = [-1 + (2 * b) / BANDS, -1 + (2 * (b + 1)) / BANDS];
    const pad = b < BANDS - 1 ? 0.05 : 0;
    polyPath(ctx, [...seg.map((q) => side(q, v0)), ...[...seg].reverse().map((q) => side(q, v1 + pad))]);
    ctx.fillStyle = ramp3(SKIN, (v0 + v1 + 2) / 4);
    ctx.fill();
  }
  // Warmth under the skin: rosy light through the thin edges, a reflected glow along the belly.
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255,140,150,0.28)';
  ctx.lineWidth = Math.max(2, mid.w * 0.16);
  linePath(ctx, seg.map((q) => side(q, 0.84)));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(214,96,128,0.25)';
  ctx.lineWidth = Math.max(1.5, mid.w * 0.12);
  linePath(ctx, seg.map((q) => side(q, -0.86)));
  ctx.stroke();
  // Mottling: fine dusky flecks over the back, fixed bar the boil.
  const rng = createRng(1301 + i0 * 7 + boil * 31);
  for (let k = 0; k < 4; k++) {
    const q = seg[Math.floor(rng() * seg.length)]!;
    const c = side(q, -0.85 + rng() * 1.1);
    ctx.fillStyle = `rgba(58,24,52,${(0.12 + 0.1 * rng()).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, Math.max(1.4, q.w * (0.06 + 0.08 * rng())), Math.max(1, q.w * 0.05), rng() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Slime pores: a row of small dark openings low on the flank, a pale lip under each.
  const spacing = Math.max(5, Math.round((look.half * 0.62) / 6));
  for (const q of seg.slice(0, -1)) {
    if (q.i % spacing !== 0 || q.u < 0.1 || q.u > 0.9) continue;
    const c = side(q, 0.4);
    const r = Math.max(1.6, q.w * 0.075);
    const a = Math.atan2(q.n.y, q.n.x);
    ctx.fillStyle = 'rgba(255,214,222,0.55)';
    ctx.beginPath();
    ctx.ellipse(c.x + q.n.x * r * 0.5, c.y + q.n.y * r * 0.5, r * 1.15, r * 1.5, a, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(46,14,36,0.92)';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, r * 0.75, r * 1.05, a, 0, Math.PI * 2);
    ctx.fill();
    if ((look.jets ?? 0) > 0.05) glassBlob(ctx, c.x + q.n.x * r * 1.2, c.y + q.n.y * r * 1.2, r * (1 + 0.6 * look.jets!), r * (0.8 + 0.5 * look.jets!), 0.7 * look.jets!, a);
  }
  // The wet highlight along the back where the light catches it: a soft broad sheen, then a crisp broken streak.
  const glint = seg.map((q) => side(q, glintAt(q.n, light)));
  ctx.strokeStyle = 'rgba(255,226,236,0.3)';
  ctx.lineWidth = Math.max(3, mid.w * 0.36);
  linePath(ctx, glint);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,246,0.45)';
  ctx.lineWidth = Math.max(2, mid.w * 0.16);
  linePath(ctx, glint);
  ctx.stroke();
  const wet = (q: Slice): boolean => Math.sin(q.s / 41) + 0.7 * Math.sin(q.s / 17 + 1) > -0.9;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(1.5, mid.w * 0.07);
  ctx.beginPath();
  let on = false;
  seg.forEach((q, k) => {
    const g = glint[k]!;
    if (!wet(q) || q.u > 0.96) {
      on = false;
      return;
    }
    if (on) ctx.lineTo(g.x, g.y);
    else ctx.moveTo(g.x, g.y);
    on = true;
  });
  ctx.stroke();
  // Slime on the skin: a glassy veil with a second bright streak and a rim of gel at the edges.
  const cv = look.coat ? look.coat(mid.u) : 0;
  if (cv > 0.01) {
    polyPath(ctx, [...seg.map((q) => side(q, -1.04)), ...[...seg].reverse().map((q) => side(q, 1.04))]);
    ctx.fillStyle = `rgba(236,250,255,${(0.16 * cv).toFixed(3)})`;
    ctx.fill();
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(255,255,255,${(0.55 * cv).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.4, mid.w * 0.05);
    linePath(ctx, seg.map((q) => side(q, glintAt(q.n, light) + 0.28)));
    ctx.stroke();
    for (const s of [-1.06, 1.06]) {
      ctx.strokeStyle = `rgba(236,250,255,${(0.38 * cv).toFixed(3)})`;
      ctx.lineWidth = Math.max(2, mid.w * 0.1);
      linePath(ctx, seg.map((q) => side(q, s)));
      ctx.stroke();
    }
  }
  // The outline: firm, not heavy.
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(2.2, look.half * 0.065);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    linePath(ctx, seg.map((q) => side(q, s)));
    ctx.stroke();
  }
}

interface HeadFrame {
  readonly at: (fwd: number, up: number) => Pt;
  readonly dir: number;
  readonly up: Pt;
  readonly h: number;
}

function headFrame(list: readonly Slice[], look: HagLook): HeadFrame {
  const h = look.half;
  const k = Math.min(list.length - 3, Math.max(1, list.findIndex((q) => q.s >= h * 0.95)));
  const c = list[k]!;
  const back = list[Math.min(list.length - 1, k + 3)]!;
  const dir = Math.atan2(c.p.y - back.p.y, c.p.x - back.p.x);
  const f = { x: Math.cos(dir), y: Math.sin(dir) };
  const up = { x: -c.n.x, y: -c.n.y };
  return { at: (fwd, u) => ({ x: c.p.x + f.x * fwd + up.x * u, y: c.p.y + f.y * fwd + up.y * u }), dir, up, h };
}

/** One fleshy barbel: a short, soft, tapering finger with a rounded tip, shaded across, inked. */
function barbel(ctx: CanvasRenderingContext2D, base: Pt, ang: number, len: number, w: number, far: boolean, bend = 0.3): void {
  const n = 8;
  const mid = Array.from({ length: n }, (_, i) => {
    const u = i / (n - 1);
    const a = ang + bend * u * u;
    return { x: base.x + Math.cos(a) * len * u, y: base.y + Math.sin(a) * len * u };
  });
  const tipA = ang + bend;
  const half = (u: number): number => (w / 2) * (1 - 0.38 * u);
  const edge = (s: number): Pt[] => mid.map((p, i) => {
    const u = i / (n - 1);
    const a = ang + bend * u * u + (s * Math.PI) / 2;
    return { x: p.x + Math.cos(a) * half(u), y: p.y + Math.sin(a) * half(u) };
  });
  const [l, r] = [edge(1), edge(-1)];
  const tip = mid[n - 1]!;
  const rt = half(1);
  const cap = Array.from({ length: 7 }, (_, k) => {
    const a = tipA + Math.PI / 2 - (Math.PI * k) / 6;
    return { x: tip.x + Math.cos(a) * rt, y: tip.y + Math.sin(a) * rt };
  });
  const shape = [...l, ...cap, ...[...r].reverse()];
  polyPath(ctx, shape);
  const across = { x: Math.cos(ang + Math.PI / 2) * w * 0.5, y: Math.sin(ang + Math.PI / 2) * w * 0.5 };
  const g = ctx.createLinearGradient(base.x - across.x, base.y - across.y, base.x + across.x, base.y + across.y);
  g.addColorStop(0, far ? '#6e3452' : '#b56d8a');
  g.addColorStop(0.55, far ? '#94506f' : '#eab9c4');
  g.addColorStop(1, far ? '#7d3e5d' : '#d593a6');
  ctx.fillStyle = g;
  ctx.fill();
  if (!far) {
    ctx.strokeStyle = 'rgba(255,240,244,0.85)';
    ctx.lineWidth = Math.max(1.2, w * 0.12);
    ctx.lineCap = 'round';
    linePath(ctx, mid.slice(1, -1).map((p, i) => ({ x: p.x * 0.6 + r[i + 1]!.x * 0.4, y: p.y * 0.6 + r[i + 1]!.y * 0.4 })));
    ctx.stroke();
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.3, w * 0.1);
  ctx.lineJoin = 'round';
  linePath(ctx, shape);
  ctx.stroke();
}

const BARBELS: readonly (readonly [number, number, number, number])[] = [
  // fwd, up (of the half), angle off forward (towards the back is negative), length (of the half)
  [0.74, 0.46, -0.18, 0.58],
  [0.92, 0.04, 0.1, 0.64],
  [0.76, -0.4, 0.42, 0.58],
];

function paintBarbels(ctx: CanvasRenderingContext2D, F: HeadFrame, wig: number, far: boolean): void {
  const { h } = F;
  const sideOf = Math.atan2(F.up.y, F.up.x);
  BARBELS.forEach(([fwd, up, off, len], i) => {
    const base = F.at(h * fwd - (far ? h * 0.08 : 0), h * up + (far ? h * 0.06 : 0));
    // Angle off forward, towards the back (+up) for negative offsets.
    const turn = Math.sin(sideOf - F.dir) >= 0 ? -1 : 1;
    const ang = F.dir + turn * off + 0.14 * Math.sin(wig + i * 1.9 + (far ? 1 : 0)) + (far ? -turn * 0.15 : 0);
    barbel(ctx, base, ang, h * len * (far ? 0.85 : 1), h * 0.38, far, -turn * 0.45);
  });
}

function paintHead(ctx: CanvasRenderingContext2D, F: HeadFrame, look: HagLook, light: Pt): void {
  const { h } = F;
  // A soft light on the brow.
  const brow = F.at(h * 0.2, h * 0.3);
  const g = ctx.createRadialGradient(brow.x + light.x * h * 0.2, brow.y + light.y * h * 0.2, 0, brow.x, brow.y, h * 0.85);
  g.addColorStop(0, 'rgba(255,214,226,0.4)');
  g.addColorStop(1, 'rgba(255,214,226,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(brow.x, brow.y, h * 0.85, 0, Math.PI * 2);
  ctx.fill();
  // Eyespots: faint pale patches under the skin, not eyes.
  const eye = F.at(-h * 0.25, h * 0.42);
  ctx.fillStyle = 'rgba(255,238,236,0.55)';
  ctx.beginPath();
  ctx.ellipse(eye.x, eye.y, h * 0.17, h * 0.12, F.dir, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,60,90,0.3)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // The single nostril on top of the snout.
  const nose = F.at(h * 0.74, h * 0.36);
  ctx.fillStyle = 'rgba(40,12,32,0.9)';
  ctx.beginPath();
  ctx.ellipse(nose.x, nose.y, h * 0.13, h * 0.09, F.dir, 0, Math.PI * 2);
  ctx.fill();
  // The mouth: a slit under the snout, opening a little.
  const mouth = clamp(look.mouth ?? 0.2);
  const m0 = F.at(h * 0.86, -h * 0.28);
  const m1 = F.at(h * 0.42, -h * 0.62);
  const mm = F.at(h * 0.62, -h * (0.42 + 0.14 * mouth));
  ctx.fillStyle = '#4a1430';
  ctx.beginPath();
  ctx.moveTo(m0.x, m0.y);
  ctx.quadraticCurveTo(mm.x, mm.y, m1.x, m1.y);
  const mb = F.at(h * 0.66, -h * (0.5 - 0.22 * mouth));
  ctx.quadraticCurveTo(mb.x, mb.y, m0.x, m0.y);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.6, h * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(m0.x, m0.y);
  ctx.quadraticCurveTo(mm.x, mm.y, m1.x, m1.y);
  ctx.stroke();
  // A crease where the head meets the body, and a wet glint on the snout.
  const c0 = F.at(-h * 0.7, h * 0.85);
  const c1 = F.at(-h * 0.85, -h * 0.4);
  ctx.strokeStyle = 'rgba(70,28,60,0.35)';
  ctx.lineWidth = Math.max(1.2, h * 0.04);
  ctx.beginPath();
  ctx.moveTo(c0.x, c0.y);
  ctx.quadraticCurveTo(F.at(-h * 0.95, h * 0.2).x, F.at(-h * 0.95, h * 0.2).y, c1.x, c1.y);
  ctx.stroke();
  const gl = F.at(h * 0.55, h * 0.55);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(gl.x, gl.y, h * 0.14, h * 0.05, F.dir - 0.5, 0, Math.PI * 2);
  ctx.fill();
}

/** Draws the hagfish along `spine` (head first). */
export function drawHagfish(ctx: CanvasRenderingContext2D, spine: readonly Pt[], look: HagLook, boil: number): void {
  const { list, at } = slices(spine, look);
  const light = look.light ?? { x: 0.45, y: -0.89 };
  const N = list.length;
  const F = headFrame(list, look);
  const wig = look.wiggle ?? 0;
  ctx.save();
  // The far barbels behind the head, and the fin fold under the tail.
  paintBarbels(ctx, F, wig, true);
  paintFold(ctx, list, look.half);
  const starts: number[] = [];
  for (let i = 0; i < N - 1; i += CHUNK - 1) starts.push(i);
  const depthAt = (i: number): number => {
    if (!look.depth) return 0;
    const f = at[i]!;
    const [j, u] = [Math.floor(f), f - Math.floor(f)];
    return look.depth[j]! * (1 - u) + (look.depth[Math.min(look.depth.length - 1, j + 1)] ?? 0) * u;
  };
  const chunks = starts.map((i0) => {
    const i1 = Math.min(N - 1, i0 + CHUNK - 1);
    return { i0, i1, z: depthAt(Math.floor((i0 + i1) / 2)) };
  });
  chunks.sort((a, b) => a.z - b.z || a.i0 - b.i0);
  for (const c of chunks) {
    if (c.z > 0.25) {
      // A contact shadow on what lies beneath.
      const seg = list.slice(c.i0, c.i1 + 1);
      polyPath(ctx, [...seg.map((q) => side(q, -1.3)), ...[...seg].reverse().map((q) => side(q, 1.3))]);
      ctx.fillStyle = 'rgba(24,10,30,0.3)';
      ctx.fill();
    }
    paintChunk(ctx, list, c.i0, c.i1, look, light, boil);
  }
  paintHead(ctx, F, look, light);
  paintBarbels(ctx, F, wig, false);
  ctx.restore();
}

export interface Pore {
  readonly at: Pt;
  /** Outward, towards the belly side. */
  readonly out: Pt;
  readonly u: number;
}

/** The slime pores along the body (each `every` px), with the way out of each: for slime to billow from. */
export function hagPores(spine: readonly Pt[], look: HagLook, from = 0.1, to = 0.9, every = 40): Pore[] {
  const { list, len } = slices(spine, look);
  const out: Pore[] = [];
  const step = Math.max(1, Math.round((every / len) * (list.length - 1)));
  for (let i = 0; i < list.length; i += step) {
    const q = list[i]!;
    if (q.u < from || q.u > to) continue;
    out.push({ at: side(q, 0.4), out: q.n, u: q.u });
  }
  return out;
}

/** Where on screen a point `u` (0 head .. 1 tail) along a spine lies. */
export function pointAt(spine: readonly Pt[], u: number): Pt {
  const { pts } = evenly(spine, 120);
  return pts[Math.round(clamp(u) * 119)]!;
}
