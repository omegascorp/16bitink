import { INK, type Pt } from '../../../../src/art/pen';
import { curve, dab, path, smoothLoop, softLine } from '../../seal/art/paint';

/**
 * Inside the close-up's mouth: a pale pink lining darkening only to the throat
 * (never a dark red that could read as blood), the ridged palate, a big pink
 * tongue, the gums, and a row of big conical teeth above and below.
 */

export interface Lips {
  readonly open: number;
  /** Left corner to right corner, in the head's units. */
  readonly upper: readonly Pt[];
  readonly lower: readonly Pt[];
}

const LINING = '#f4cfca';
const GUM = '#efb4b2';
const TONGUE = '#ee9aa6';

const opening = (l: Lips): Pt[] => [...l.upper, ...[...l.lower].reverse()];
const mid = (pts: readonly Pt[]): Pt => pts[Math.floor(pts.length / 2)]!;

function palate(ctx: CanvasRenderingContext2D, l: Lips): void {
  const top = mid(l.upper);
  const gape = mid(l.lower).y - top.y;
  // A few faint ridges near the teeth only: the roof of the mouth, not a tunnel.
  for (let i = 1; i <= 3; i++) {
    const d = (0.09 + i * 0.05) * gape;
    const pts = l.upper.slice(9, -9).map((p) => ({ x: top.x + (p.x - top.x) * (1 - i * 0.1), y: p.y + d }));
    softLine(ctx, pts, 16, '#fdeae4', 0.16);
    softLine(ctx, pts.map((p) => ({ x: p.x, y: p.y + 11 })), 12, '#a9707e', 0.1);
  }
}

function tongue(ctx: CanvasRenderingContext2D, l: Lips): void {
  const low = mid(l.lower);
  const gape = low.y - mid(l.upper).y;
  const h = gape * 0.5;
  const shape = smoothLoop([
    { x: low.x - 320, y: low.y - 20 }, { x: low.x - 290, y: low.y - h * 0.5 }, { x: low.x - 170, y: low.y - h * 0.86 }, { x: low.x, y: low.y - h },
    { x: low.x + 170, y: low.y - h * 0.86 }, { x: low.x + 290, y: low.y - h * 0.5 }, { x: low.x + 320, y: low.y - 20 }, { x: low.x, y: low.y + 16 },
  ], 6);
  path(ctx, shape);
  const g = ctx.createLinearGradient(0, low.y - h, 0, low.y);
  g.addColorStop(0, '#b76e80');
  g.addColorStop(0.3, '#df8c9a');
  g.addColorStop(0.7, TONGUE);
  g.addColorStop(1, '#f6b7bb');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  dab(ctx, low.x - 150, low.y - h * 0.34, 150, '255,226,226', 0.55);
  dab(ctx, low.x + 190, low.y - h * 0.3, 120, '255,226,226', 0.3);
  softLine(ctx, [{ x: low.x, y: low.y - h }, { x: low.x + 6, y: low.y - h * 0.5 }, { x: low.x, y: low.y }], 22, '#9d5a6c', 0.3);
  ctx.restore();
  path(ctx, shape);
  ctx.strokeStyle = 'rgba(92,46,62,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** The mouth's inside, clipped to the opening between the lips. */
export function drawCavity(ctx: CanvasRenderingContext2D, l: Lips, lw: number): void {
  if (l.open < 0.015) return;
  const shape = opening(l);
  const [top, low] = [mid(l.upper), mid(l.lower)];
  const c = { x: top.x, y: top.y + (low.y - top.y) * 0.44 };
  ctx.save();
  path(ctx, shape);
  ctx.clip();
  const g = ctx.createRadialGradient(c.x, c.y, 8, c.x, c.y, 480);
  g.addColorStop(0, '#120d18');
  g.addColorStop(0.2, '#2b1c2b');
  g.addColorStop(0.42, '#80566a');
  g.addColorStop(0.66, '#d39ea6');
  g.addColorStop(1, LINING);
  ctx.fillStyle = g;
  ctx.fillRect(-640, -560, 1280, 1200);
  palate(ctx, l);
  // The soft folds in the cheeks at each corner.
  for (const end of [l.upper[0]!, l.upper[l.upper.length - 1]!]) {
    const s = end.x < c.x ? 1 : -1;
    const fold = curve({ x: end.x + s * 30, y: end.y - 150 * l.open }, { x: end.x + s * 120, y: end.y }, { x: end.x + s * 30, y: end.y + 150 * l.open }, 12);
    softLine(ctx, fold, 42, '#a0687a', 0.26, 12);
    softLine(ctx, fold.map((p) => ({ x: p.x + s * 34, y: p.y })), 30, '#fde6e0', 0.14, 10);
  }
  tongue(ctx, l);
  // Gums: soft pale bands just inside the lips, the teeth set in them.
  softLine(ctx, l.upper, 72, GUM, 0.95);
  softLine(ctx, l.lower, 72, GUM, 0.95);
  softLine(ctx, l.upper.map((p) => ({ x: p.x, y: p.y + 2 })), 16, '#7a3f52', 0.3);
  softLine(ctx, l.lower.map((p) => ({ x: p.x, y: p.y - 2 })), 16, '#7a3f52', 0.3);
  ctx.restore();
  path(ctx, shape);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4 * lw;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** One big cone: `at` its root, `aim` the way it points, shaded round, a little curved. */
function tooth(ctx: CanvasRenderingContext2D, at: Pt, aim: number, h: number, w: number, lw: number): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(aim);
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.bezierCurveTo(-w * 0.46, h * 0.4, -w * 0.2, h * 0.84, 0, h);
  ctx.bezierCurveTo(w * 0.24, h * 0.8, w * 0.46, h * 0.4, w / 2, 0);
  ctx.quadraticCurveTo(0, h * 0.1, -w / 2, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, '#fffdf5');
  g.addColorStop(0.45, '#f7f0dd');
  g.addColorStop(1, '#bfae92');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const root = ctx.createLinearGradient(0, 0, 0, h * 0.42);
  root.addColorStop(0, 'rgba(176,120,120,0.6)');
  root.addColorStop(1, 'rgba(176,120,120,0)');
  ctx.fillStyle = root;
  ctx.fillRect(-w, -2, 2 * w, h);
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4 * lw;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(-w * 0.16, h * 0.42, w * 0.07, h * 0.2, 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const TEETH_PER_SIDE = 6;

/** The roots along a lip, inset a little from it, front teeth biggest. */
function rowOf(lip: readonly Pt[], inset: number, sign: 1 | -1, open: number): { at: Pt; aim: number; h: number; w: number }[] {
  const middle = (lip.length - 1) / 2;
  const out: { at: Pt; aim: number; h: number; w: number }[] = [];
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < TEETH_PER_SIDE; i++) {
      const f = 0.085 + (i / TEETH_PER_SIDE) * 0.85;
      const q = middle + side * f * middle;
      const p = lip[Math.round(q)]!;
      const a = lip[Math.max(0, Math.round(q) - 1)]!;
      const b = lip[Math.min(lip.length - 1, Math.round(q) + 1)]!;
      const slope = Math.atan2(b.y - a.y, b.x - a.x);
      const scale = 1 - 0.42 * (i / TEETH_PER_SIDE);
      out.push({
        at: { x: p.x, y: p.y + sign * inset },
        aim: sign > 0 ? slope : slope + Math.PI,
        h: (92 * scale) * Math.min(1, open * 1.8),
        w: 56 * scale,
      });
    }
  }
  return out;
}

export function drawTeeth(ctx: CanvasRenderingContext2D, l: Lips, lw: number): void {
  if (l.open < 0.12) return;
  ctx.save();
  path(ctx, opening(l));
  ctx.clip();
  // The back teeth first, so the front ones overlap them.
  for (const r of [rowOf(l.upper, 16, 1, l.open), rowOf(l.lower, 16, -1, l.open)]) {
    for (const t of [...r].reverse()) tooth(ctx, t.at, t.aim, t.h, t.w, lw);
  }
  ctx.restore();
}
