import { PAPER_FILL } from '../../../src/art/fish/kit';
import { halo } from '../../../src/art/glowArt';
import { ellipse, INK, Pen, type Pt } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO } from '../short';
import { CHALK, INK_BG, PAPER_ON_INK, SPOKEN } from './scenery';

/**
 * The inked props and notes: the sun, the thermometer, the "BANG!", the dizzy
 * stars, the bed's snap marks, the submarine, and the chalk callouts.
 */

const seedOf = (boil: number, salt: number): number => 31 + boil * 977 + salt * 131;
const closed = (pts: readonly Pt[]): Pt[] => [...pts, pts[0]!];
const SUN_WASH = '#f5c84a';

/** Labels stay inside the area the Shorts buttons leave clear, and above the captions. */
export const SAFE = { left: 120, right: VIDEO.width - 120, top: 300, bottom: 1100 } as const;

/** An ink sun: a round face washed yellow, pointed rays, a warm glow. `r` its radius, `pop` its scale. */
export function drawSun(ctx: CanvasRenderingContext2D, at: Pt, r: number, pop: number, boil: number): void {
  if (pop <= 0.01) return;
  const k = r * pop;
  halo(ctx, at.x, at.y, k * 3.2, '#ffb347', 0.55 * Math.min(1, pop));
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(0.08 * Math.sin(boil * 2.1));
  // The pen draws at a radius of 50: scale to fit.
  ctx.scale(k / 50, k / 50);
  const pen = new Pen(ctx, seedOf(boil, 1), 0.6);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const long = i % 2 === 0 ? 88 : 76;
    const ray = [
      { x: Math.cos(a - 0.12) * 58, y: Math.sin(a - 0.12) * 58 },
      { x: Math.cos(a) * long, y: Math.sin(a) * long },
      { x: Math.cos(a + 0.12) * 58, y: Math.sin(a + 0.12) * 58 },
    ];
    pen.fill(ray, PAPER_FILL, 1);
    pen.fill(ray, SUN_WASH, 0.85);
    pen.stroke(closed(ray), 2.2, INK, 1, false);
  }
  const face = ellipse(0, 0, 50, 50, 40);
  pen.fill(face, PAPER_FILL, 1);
  pen.fill(face, SUN_WASH, 0.9);
  pen.hatch(face, 5, -0.6, 0.9, { onlyBelow: 10, color: '#c0661c', alpha: 0.5 });
  pen.stroke(closed(face), 3, INK);
  ctx.restore();
}

/** A thermometer in chalk and ink: the glass, ticks, and the red rising to `level` 0 .. 1. */
export function drawThermometer(ctx: CanvasRenderingContext2D, at: Pt, h: number, level: number, alpha: number, boil: number): void {
  if (alpha <= 0) return;
  const w = h * 0.13;
  const bulb = w * 1.05;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(at.x, at.y);
  const pen = new Pen(ctx, seedOf(boil, 2), 1);
  const cy = h / 2 - bulb * 0.2;
  const join = Math.acos(w / 2 / bulb);
  const tube = [
    // Round top, down the right side, round the bulb, up the left side.
    ...Array.from({ length: 9 }, (_, i) => ({ x: Math.cos(Math.PI + (i / 8) * Math.PI) * (w / 2), y: -h / 2 + w / 2 + Math.sin(Math.PI + (i / 8) * Math.PI) * (w / 2) })),
    ...Array.from({ length: 25 }, (_, i) => {
      const a = -join + (i / 24) * (Math.PI + 2 * join);
      return { x: Math.cos(a) * bulb, y: cy + Math.sin(a) * bulb };
    }),
  ];
  pen.fill(tube, '#e9eef8', 0.22);
  // The red: the bulb, and the column up to `level`.
  const top = h / 2 - bulb * 1.1 - (h - bulb * 2.4) * level;
  const red = '#e8442e';
  halo(ctx, 0, cy, bulb * 2.2, '#ff5a3c', 0.35 + 0.4 * level);
  pen.fill(ellipse(0, cy, bulb * 0.72, bulb * 0.72, 20), red, 1);
  pen.fill([{ x: -w * 0.24, y: h / 2 - bulb * 0.6 }, { x: -w * 0.24, y: top }, { x: w * 0.24, y: top }, { x: w * 0.24, y: h / 2 - bulb * 0.6 }], red, 1);
  pen.stroke(closed(tube), Math.max(2.5, h * 0.012), CHALK, 1);
  for (let i = 1; i < 8; i++) {
    const y = h / 2 - bulb * 1.3 - ((h - bulb * 2.5) * i) / 8;
    pen.hair([{ x: w / 2 + 4, y }, { x: w / 2 + (i % 2 ? 14 : 24), y }], 2.4, CHALK, 0.8);
  }
  ctx.restore();
}

/** The inked "BANG!" on a spiky burst, at `scale` (pops in overshooting). */
export function drawBang(ctx: CanvasRenderingContext2D, at: Pt, scale: number, boil: number): void {
  if (scale <= 0.01) return;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(-0.1);
  ctx.scale(scale, scale);
  const pen = new Pen(ctx, seedOf(boil, 3), 1.6);
  const spikes = 14;
  const burst = Array.from({ length: spikes * 2 }, (_, i) => {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? (i % 4 === 0 ? 1 : 0.86) : 0.62;
    return { x: Math.cos(a) * 330 * r, y: Math.sin(a) * 190 * r };
  });
  pen.fill(burst, PAPER_FILL, 1);
  pen.fill(burst, SUN_WASH, 0.75);
  pen.hatch(burst, 9, 0.7, 1.4, { onlyBelow: 60, color: '#c0661c', alpha: 0.45 });
  pen.stroke(closed(burst), 6, INK);
  ctx.font = `700 200px ${CAPTION_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 16;
  ctx.strokeStyle = PAPER_FILL;
  ctx.strokeText('BANG!', 4, 6);
  ctx.fillStyle = INK;
  ctx.fillText('BANG!', 4, 6);
  ctx.fillStyle = '#c8321e';
  ctx.globalAlpha = 0.9;
  ctx.fillText('BANG!', 0, 0);
  ctx.restore();
}

/** Five-pointed star path. */
function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** Dizzy stars circling over `at` (screen px), on an ellipse `rx` wide. */
export function drawStars(ctx: CanvasRenderingContext2D, at: Pt, rx: number, alpha: number, clock: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    const a = clock * 5 + (i / 3) * Math.PI * 2;
    const x = at.x + Math.cos(a) * rx;
    const y = at.y + Math.sin(a) * rx * 0.3;
    const near = 0.75 + 0.25 * Math.sin(a);
    ctx.globalAlpha = alpha * (0.6 + 0.4 * near);
    star(ctx, x, y, rx * 0.32 * near, clock * 3 + i);
    ctx.fillStyle = SPOKEN;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(2, rx * 0.03);
    ctx.stroke();
  }
  ctx.restore();
}

/** A bed shrimp's snap: a tiny white flash and chalk ticks, `u` 0 .. 1; with "snap!" for some. */
export function drawSnapMark(ctx: CanvasRenderingContext2D, at: Pt, size: number, u: number, word: boolean, tilt: number): void {
  const fade = 1 - u;
  halo(ctx, at.x, at.y, size * 1.2, '#fff4cc', fade * 0.9);
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.globalAlpha = fade;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    const r0 = size * (0.3 + 0.4 * u);
    const r1 = size * (0.6 + 0.6 * u);
    ctx.beginPath();
    ctx.moveTo(at.x + Math.cos(a) * r0, at.y + Math.sin(a) * r0);
    ctx.lineTo(at.x + Math.cos(a) * r1, at.y + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.restore();
  if (word) {
    ctx.save();
    ctx.translate(at.x, at.y - size * (1.2 + 0.5 * u));
    ctx.rotate(tilt);
    drawTextLine(ctx, 'snap!', 0, 0, size * 0.95, 700, Math.min(1, fade * 1.6), PAPER_ON_INK);
    ctx.restore();
  }
}

/** A submarine in silhouette, facing right: hull, sail, periscope, a propeller, a few portholes. `len` screen px. */
export function drawSub(ctx: CanvasRenderingContext2D, at: Pt, len: number, alpha: number, boil: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(at.x, at.y);
  // The pen draws a 400-long sub.
  ctx.scale(len / 400, len / 400);
  const pen = new Pen(ctx, seedOf(boil, 4), 1.2);
  const hull = [
    ...Array.from({ length: 17 }, (_, i) => {
      const a = -Math.PI / 2 + (i / 16) * Math.PI;
      return { x: 150 + Math.cos(a) * 50, y: Math.sin(a) * 34 };
    }),
    { x: -120, y: 30 },
    { x: -185, y: 8 },
    { x: -185, y: -8 },
    { x: -120, y: -32 },
  ];
  const sail = [{ x: 10, y: -30 }, { x: 22, y: -74 }, { x: 80, y: -74 }, { x: 96, y: -30 }];
  const scope = [{ x: 46, y: -74 }, { x: 46, y: -112 }, { x: 70, y: -112 }];
  const fill = '#060b1e';
  pen.fill(sail, fill, 1);
  pen.fill(hull, fill, 1);
  pen.hatch(hull, 7, -0.5, 1, { onlyBelow: 6, color: '#04081a', alpha: 0.8 });
  pen.stroke(closed(sail), 2.6, CHALK, 0.85);
  pen.stroke(closed(hull), 3, CHALK, 0.85);
  pen.stroke(scope, 3.2, CHALK, 0.85, false);
  // The fins and the propeller at the stern.
  pen.stroke([{ x: -150, y: -18 }, { x: -172, y: -44 }, { x: -140, y: -22 }], 2.4, CHALK, 0.8, false);
  pen.stroke([{ x: -150, y: 18 }, { x: -172, y: 44 }, { x: -140, y: 22 }], 2.4, CHALK, 0.8, false);
  pen.stroke([{ x: -196, y: -22 }, { x: -190, y: 0 }, { x: -196, y: 22 }], 3, CHALK, 0.8, false);
  for (const x of [-60, -10, 40, 90]) pen.circle(x, 2, 6, 2, CHALK);
  pen.hair([{ x: -110, y: -12 }, { x: 170, y: -12 }], 1.6, CHALK, 0.4);
  ctx.restore();
}

/** A chalk callout kept inside the safe area, with a leader line to what it names. */
export function drawCallout(ctx: CanvasRenderingContext2D, text: string, at: Pt, to: Pt | null, alpha: number, size = 68, ink: TextInk = PAPER_ON_INK): void {
  if (alpha <= 0) return;
  const x = Math.max(SAFE.left, Math.min(SAFE.right, at.x));
  const y = Math.max(SAFE.top, Math.min(SAFE.bottom, at.y));
  if (to) {
    const from = { x, y: to.y > y ? y + size * 0.2 : y - size * 0.75 };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len > 40) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = CHALK;
      ctx.fillStyle = CHALK;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(from.x + (dx / len) * 12, from.y + (dy / len) * 12);
      ctx.lineTo(to.x - (dx / len) * 14, to.y - (dy / len) * 14);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(to.x, to.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  drawTextLine(ctx, text, x, y, size, 700, alpha, ink);
}

/** A dashed chalk outline through `pts` (closed), drawn on over `drawn` 0 .. 1. */
export function drawDashed(ctx: CanvasRenderingContext2D, pts: readonly Pt[], drawn: number, alpha: number, colour = CHALK): void {
  if (drawn <= 0 || alpha <= 0) return;
  const loop = closed(pts);
  const lens = loop.slice(1).map((p, i) => Math.hypot(p.x - loop[i]!.x, p.y - loop[i]!.y));
  const total = lens.reduce((s, l) => s + l, 0);
  let left = total * Math.min(1, drawn);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.setLineDash([22, 16]);
  ctx.beginPath();
  ctx.moveTo(loop[0]!.x, loop[0]!.y);
  for (let i = 1; i < loop.length && left > 0; i++) {
    const a = loop[i - 1]!;
    const b = loop[i]!;
    const u = Math.min(1, left / (lens[i - 1]! || 1));
    ctx.lineTo(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u);
    left -= lens[i - 1]!;
  }
  ctx.stroke();
  ctx.restore();
}

/** A curved chalk arrow along `pts`, with a head at the end. */
export function drawArrow(ctx: CanvasRenderingContext2D, pts: readonly Pt[], alpha: number, width = 6, colour = SPOKEN): void {
  if (alpha <= 0 || pts.length < 2) return;
  const end = pts[pts.length - 1]!;
  const prev = pts[pts.length - 2]!;
  const a = Math.atan2(end.y - prev.y, end.x - prev.x);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = INK_BG;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  const h = width * 4;
  ctx.beginPath();
  ctx.moveTo(end.x + Math.cos(a) * h * 0.6, end.y + Math.sin(a) * h * 0.6);
  ctx.lineTo(end.x + Math.cos(a + 2.5) * h, end.y + Math.sin(a + 2.5) * h);
  ctx.lineTo(end.x + Math.cos(a - 2.5) * h, end.y + Math.sin(a - 2.5) * h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
