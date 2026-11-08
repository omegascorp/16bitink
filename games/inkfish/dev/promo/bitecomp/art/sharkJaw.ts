import { INK, type Pen, type Pt } from '../../../../src/art/pen';

/**
 * The bite's parts shared by the shark heads: rows of teeth set along a jaw's
 * edge (a front row and a second row behind it), the pink gum they sit in,
 * and the dark wet inside of the gape. Drawn live, in head units; `px` turns
 * screen pixels into units so the ink holds up at every size.
 */

export interface Ink {
  readonly ctx: CanvasRenderingContext2D;
  readonly pen: Pen;
  /** `n` screen px (already weighted for the head's size) in head units. */
  readonly px: (n: number) => number;
}

export interface TeethRow {
  readonly count: number;
  /** Front tooth .. back tooth, head units. */
  readonly len: readonly [number, number];
  readonly wide: readonly [number, number];
  /** Broad: a flat triangle with convex edges (great white and megalodon uppers). Narrow: a slender spike on a wide root. */
  readonly kind: 'broad' | 'narrow';
  /** How far the tip leans toward the corner of the mouth, × its length: front, back. */
  readonly rake: readonly [number, number];
}

export const GUM = '#c46a75';
export const GUM_DARK = '#7d2f3c';
export const GUM_LIGHT = '#f0b4ba';
const ENAMEL = '#fbf7ea';
const ROOT = '#c9b994';

const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;

/** Points along a polyline by arc length (0..1), with the unit direction there. */
export function along(line: readonly Pt[], u: number): { p: Pt; d: Pt } {
  const lens = [0];
  for (let i = 1; i < line.length; i++) lens.push(lens[i - 1]! + Math.hypot(line[i]!.x - line[i - 1]!.x, line[i]!.y - line[i - 1]!.y));
  const at = Math.max(0, Math.min(1, u)) * lens[lens.length - 1]!;
  let i = 1;
  while (i < line.length - 1 && lens[i]! < at) i++;
  const [a, b] = [line[i - 1]!, line[i]!];
  const seg = Math.max(1e-6, lens[i]! - lens[i - 1]!);
  const e = (at - lens[i - 1]!) / seg;
  return { p: { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e) }, d: { x: (b.x - a.x) / seg, y: (b.y - a.y) / seg } };
}

function fillPath(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

/**
 * One tooth: its root at `base` on the gum line, pointing along `dir` (unit),
 * the tip leaning `rake` × len along `back` (toward the corner of the mouth).
 */
export function tooth(ink: Ink, base: Pt, dir: Pt, back: Pt, len: number, wide: number, kind: TeethRow['kind'], rake: number, dim = 0): void {
  const { ctx, px } = ink;
  const side = { x: -dir.y, y: dir.x };
  const tip = { x: base.x + dir.x * len + back.x * rake * len, y: base.y + dir.y * len + back.y * rake * len };
  const root = 0.32 * len;
  const serr = Math.max(px(0.55), 0.03 * wide);
  const edge = (sign: number): Pt[] => {
    const foot = { x: base.x + side.x * sign * wide * 0.5 - dir.x * root, y: base.y + side.y * sign * wide * 0.5 - dir.y * root };
    const start = { x: base.x + side.x * sign * wide * 0.5, y: base.y + side.y * sign * wide * 0.5 };
    const pts: Pt[] = [foot];
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const m = { x: lerp(start.x, tip.x, u), y: lerp(start.y, tip.y, u) };
      // Broad teeth bulge out a little; narrow ones pinch in to a spike over a wide root.
      const bulge = kind === 'broad' ? 0.1 * Math.sin(Math.PI * u) : -0.24 * Math.sin(Math.PI * Math.min(1, u * 1.3)) * (1 - u * 0.3);
      const saw = i > 0 && i < n && i % 2 === 1 ? serr : 0;
      const out = bulge * wide + saw;
      pts.push({ x: m.x + side.x * sign * out, y: m.y + side.y * sign * out });
    }
    return pts;
  };
  const left = edge(-1);
  const right = edge(1);
  const shape = [...left, ...[...right].reverse()];
  ctx.save();
  fillPath(ctx, shape);
  const g = ctx.createLinearGradient(base.x - dir.x * root, base.y - dir.y * root, tip.x, tip.y);
  g.addColorStop(0, ROOT);
  g.addColorStop(0.45, '#eee5cc');
  g.addColorStop(1, ENAMEL);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // The half turned from the light, and the enamel's ridge catching it.
  ctx.fillStyle = 'rgba(112,92,62,0.24)';
  fillPath(ctx, [tip, ...[...right].reverse(), base]);
  ctx.fill();
  if (dim > 0) {
    ctx.fillStyle = `rgba(70,22,30,${dim})`;
    ctx.fillRect(Math.min(tip.x, base.x) - len * 2, Math.min(tip.y, base.y) - len * 2, len * 4, len * 4);
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = px(1.1);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(base.x - side.x * wide * 0.18 + dir.x * len * 0.12, base.y - side.y * wide * 0.18 + dir.y * len * 0.12);
  ctx.lineTo(lerp(base.x - side.x * wide * 0.12, tip.x, 0.78), lerp(base.y - side.y * wide * 0.12, tip.y, 0.78));
  ctx.stroke();
  fillPath(ctx, shape);
  ctx.strokeStyle = INK;
  ctx.globalAlpha = dim > 0 ? 0.6 : 0.95;
  ctx.lineWidth = px(0.95);
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

/** Where each tooth of a row sits: its spot along the gum line (0 front .. 1 corner) and its size there. */
function places(row: TeethRow, second: boolean): { u: number; f: number }[] {
  const out: { u: number; f: number }[] = [];
  const n = second ? row.count - 1 : row.count;
  for (let i = 0; i < n; i++) {
    const f = (i + (second ? 0.5 : 0)) / (row.count - 1);
    out.push({ u: 0.06 + 0.85 * f, f });
  }
  return out;
}

/**
 * A row of teeth along `line` (the gum's edge, front to corner, in the jaw's
 * shut frame), pointing to the side `out` (+1 down for the upper jaw, -1 up
 * for the lower). `second` draws the replacement row behind: smaller, set
 * back into the gum, darker, between the front teeth.
 */
export function drawRow(ink: Ink, line: readonly Pt[], out: 1 | -1, row: TeethRow, second: boolean, grow = 1): void {
  for (const { u, f } of places(row, second)) {
    const { p, d } = along(line, u);
    const dir = { x: d.y * out, y: -d.x * out };
    const k = second ? 0.78 : 1;
    const len = lerp(row.len[0], row.len[1], f) * k * grow;
    const base = second ? { x: p.x - dir.x * len * 0.12, y: p.y - dir.y * len * 0.12 } : p;
    tooth(ink, base, dir, d, len, lerp(row.wide[0], row.wide[1], f) * k, row.kind, lerp(row.rake[0], row.rake[1], f), second ? 0.32 : 0);
  }
}

/**
 * The gum the row grows from: a band from `line` back `depth` units into the
 * jaw, its edge scalloped down over each tooth's root.
 */
export function drawGum(ink: Ink, line: readonly Pt[], out: 1 | -1, row: TeethRow, depth: number): void {
  const { ctx, px } = ink;
  const n = 60;
  const edge: Pt[] = [];
  const top: Pt[] = [];
  const spacing = 0.85 / (row.count - 1);
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const { p, d } = along(line, u);
    const dir = { x: d.y * out, y: -d.x * out };
    const phase = (u - 0.06) / spacing;
    const len = lerp(row.len[0], row.len[1], Math.max(0, Math.min(1, phase / (row.count - 1))));
    const over = 0.14 * Math.max(0, Math.cos(Math.PI * (phase - Math.round(phase)))) * len - 0.06 * len;
    edge.push({ x: p.x + dir.x * over, y: p.y + dir.y * over });
    top.push({ x: p.x - dir.x * depth, y: p.y - dir.y * depth });
  }
  // The upper jaw curves away round the front of the mouth: round its front end off, forward and up under the snout.
  const fwd = along(line, 0).d;
  const cap: Pt[] = [];
  if (out === 1) {
    for (let i = 1; i < 8; i++) {
      const a = i / 8;
      const reach = depth * 0.13 * Math.sin((Math.PI / 2) * Math.min(1, a * 2));
      cap.push({ x: lerp(edge[0]!.x, top[0]!.x, a) - fwd.x * reach, y: lerp(edge[0]!.y, top[0]!.y, a) - fwd.y * reach });
    }
  }
  const band = [...edge, ...[...top].reverse(), ...[...cap].reverse()];
  ctx.save();
  fillPath(ctx, band);
  const a = edge[Math.floor(n / 2)]!;
  const b = top[Math.floor(n / 2)]!;
  const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  g.addColorStop(0, GUM);
  g.addColorStop(0.22, '#b25664');
  g.addColorStop(0.55, GUM_DARK);
  g.addColorStop(1, '#4e1520');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // Wet light along the gum's swell, and the folds of it.
  ctx.lineCap = 'round';
  ctx.strokeStyle = GUM_LIGHT;
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = px(2.2);
  ctx.beginPath();
  edge.forEach((p, i) => {
    const q = { x: lerp(p.x, top[i]!.x, 0.22), y: lerp(p.y, top[i]!.y, 0.22) };
    if (i) ctx.lineTo(q.x, q.y);
    else ctx.moveTo(q.x, q.y);
  });
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = GUM_DARK;
  ctx.lineWidth = px(1.2);
  for (let i = 2; i < n - 2; i += 3) {
    const p = edge[i]!;
    const q = top[i]!;
    const v = 0.3 + 0.25 * Math.abs(Math.sin(i * 1.7));
    ctx.beginPath();
    ctx.moveTo(lerp(p.x, q.x, 0.12), lerp(p.y, q.y, 0.12));
    ctx.lineTo(lerp(p.x, q.x, v) + px(1.5) * Math.sin(i), lerp(p.y, q.y, v));
    ctx.stroke();
  }
  for (const v of [0.45, 0.7]) {
    ctx.beginPath();
    edge.forEach((p, i) => {
      const q = { x: lerp(p.x, top[i]!.x, v), y: lerp(p.y, top[i]!.y, v) + Math.sin(i * 0.9) * px(0.6) };
      if (i) ctx.lineTo(q.x, q.y);
      else ctx.moveTo(q.x, q.y);
    });
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = px(1);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  edge.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

/**
 * The inside of the gape (world units): from the upper gum's edge to the lower
 * jaw's, dark at the throat, red toward the front, the tongue on the floor.
 */
export function drawGape(ink: Ink, upper: readonly Pt[], lower: readonly Pt[], open: number): void {
  if (open < 0.01) return;
  const { ctx, px } = ink;
  const fu = upper[0]!;
  const fl = lower[0]!;
  const hinge = upper[upper.length - 1]!;
  const reach = Math.hypot(fu.x - fl.x, fu.y - fl.y);
  // The far side's jaw closes the gape at the front, bowed a little forward.
  const front: Pt[] = [];
  for (let i = 1; i < 10; i++) {
    const u = i / 10;
    const bow = Math.sin(Math.PI * u) * reach * 0.2;
    front.push({ x: lerp(fl.x, fu.x, u) + bow, y: lerp(fl.y, fu.y, u) });
  }
  const shape = [...upper, ...[...lower].reverse(), ...front];
  ctx.save();
  fillPath(ctx, shape);
  const g = ctx.createLinearGradient(hinge.x, hinge.y, (fu.x + fl.x) / 2, (fu.y + fl.y) / 2);
  g.addColorStop(0, '#120407');
  g.addColorStop(0.45, '#3d0f18');
  g.addColorStop(1, '#7a2a36');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // The roof of the mouth lit pink under the gum; the throat's depth.
  const mid = along(upper, 0.35).p;
  const roof = ctx.createRadialGradient(mid.x, mid.y, 0, mid.x, mid.y, reach * 0.9);
  roof.addColorStop(0, 'rgba(176,82,96,0.55)');
  roof.addColorStop(1, 'rgba(176,82,96,0)');
  ctx.fillStyle = roof;
  ctx.fillRect(mid.x - reach * 2, mid.y - reach * 2, reach * 4, reach * 4);
  const tongue = along(lower, 0.42).p;
  const d = along(lower, 0.42).d;
  ctx.fillStyle = 'rgba(190,96,108,0.85)';
  ctx.beginPath();
  ctx.ellipse(tongue.x - d.y * reach * 0.06, tongue.y + d.x * reach * 0.06 - reach * 0.05, reach * 0.34, reach * 0.09, Math.atan2(d.y, d.x), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(240,170,178,0.5)';
  ctx.lineWidth = px(1.6);
  ctx.beginPath();
  ctx.ellipse(tongue.x - d.y * reach * 0.06, tongue.y + d.x * reach * 0.06 - reach * 0.07, reach * 0.26, reach * 0.05, Math.atan2(d.y, d.x), Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  const throat = ctx.createRadialGradient(hinge.x, hinge.y, 0, hinge.x, hinge.y, reach * 0.7);
  throat.addColorStop(0, 'rgba(8,2,4,0.85)');
  throat.addColorStop(1, 'rgba(8,2,4,0)');
  ctx.fillStyle = throat;
  ctx.fillRect(hinge.x - reach * 2, hinge.y - reach * 2, reach * 4, reach * 4);
  ctx.restore();
  // The far lip across the front.
  ctx.save();
  ctx.strokeStyle = 'rgba(150,62,76,0.9)';
  ctx.lineWidth = px(3);
  ctx.lineCap = 'round';
  ctx.beginPath();
  front.forEach((p, i) => (i ? ctx.lineTo(p.x - px(1.5), p.y) : ctx.moveTo(p.x - px(1.5), p.y)));
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = px(1.2);
  ctx.beginPath();
  [fl, ...front, fu].forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}
