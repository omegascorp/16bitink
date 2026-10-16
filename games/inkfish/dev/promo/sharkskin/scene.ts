import { INK, PAPER, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { drawTextLine, type TextInk } from '../captions';
import { VIDEO } from '../short';
import { bake, inked, type Prop, RED, rounded } from './kit';
import { bodyPoint, type Fish, type Trail } from './story';

/**
 * The scene round the props: the current streaming past the shark, the
 * marks a stroke leaves on its skin, the arrow to its tail, the card the
 * cut-away drawings sit on, and the handwritten notes.
 */

export const SPOKEN: TextInk = { fill: RED, halo: PAPER };

// ---------------------------------------------------------------- the current

/** Current marks ("~") and specks drifting past to the right: the shark swims against them. Each crosses a whole number of times a loop. */
const MARKS = (() => {
  const rng = createRng(1717);
  return Array.from({ length: 30 }, () => ({ x: rng(), y: 300 + rng() * 1200, size: 0.6 + rng() * 0.8, wave: rng() < 0.65, laps: 3 + Math.floor(rng() * 3) }));
})();

export function drawCurrent(ctx: CanvasRenderingContext2D, t: number, loopS: number): void {
  const span = VIDEO.width + 240;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = 'round';
  for (const m of MARKS) {
    const x = ((m.x * span + (m.laps * span * t) / loopS) % span) - 120;
    const len = 64 * m.size;
    ctx.globalAlpha = m.wave ? 0.2 : 0.26;
    if (!m.wave) {
      ctx.beginPath();
      ctx.arc(x, m.y, Math.max(1.5, len * 0.035), 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.lineWidth = Math.max(1, len * 0.03);
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const px = x - len / 2 + (k / 6) * len;
      const py = m.y + Math.sin(k * 1.4 + m.y) * len * 0.06;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- strokes on the skin

/** Points along the shark between two places, at one height on its side. */
function along(s: Fish, from: number, to: number, side: number, wiggle = 0): Pt[] {
  const n = Math.max(2, Math.ceil(Math.abs(to - from) / 0.015));
  return Array.from({ length: n + 1 }, (_, i) => bodyPoint(s, from + ((to - from) * i) / n, side + (i % 2 ? wiggle : -wiggle)));
}

function polyline(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
}

/** Going with the grain: soft pale lines, smoothed flat behind the hand. */
export function drawSmoothTrail(ctx: CanvasRenderingContext2D, s: Fish, trail: Trail | null): void {
  if (!trail || trail.alpha <= 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ffffff';
  for (const side of [-0.6, -0.35, -0.1]) {
    ctx.globalAlpha = 0.65 * trail.alpha;
    ctx.lineWidth = 5;
    polyline(ctx, along(s, trail.from, trail.to, side));
  }
  ctx.restore();
}

/** Going against it: scratchy ink zigzags, and grit flicked up behind the hand. */
export function drawRoughTrail(ctx: CanvasRenderingContext2D, s: Fish, trail: Trail | null, t: number): void {
  if (!trail || trail.alpha <= 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  for (const side of [-0.62, -0.38, -0.14]) {
    ctx.globalAlpha = 0.75 * trail.alpha;
    ctx.lineWidth = 3;
    polyline(ctx, along(s, trail.to, trail.from, side, 0.07));
  }
  // Specks of grit, flicked up and back from where the hand is now.
  ctx.fillStyle = INK;
  const at = bodyPoint(s, trail.to, -0.7);
  for (let k = 0; k < 7; k++) {
    const u = (t * 2.6 + k / 7) % 1;
    ctx.globalAlpha = trail.alpha * (1 - u) * 0.8;
    ctx.beginPath();
    ctx.arc(at.x + (30 + 60 * u) * Math.cos(-1 - k * 0.25), at.y - (20 + 70 * u) * Math.sin(1 + k * 0.25), 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The red arrow along the shark to its tail, drawn out from the middle (`drawn` 0 .. 1). */
export function drawTailArrow(ctx: CanvasRenderingContext2D, s: Fish, drawn: number, alpha: number): void {
  if (drawn <= 0 || alpha <= 0) return;
  const pts = along(s, 0.6, 0.6 + 0.38 * drawn, 0.1);
  const tip = pts[pts.length - 1]!;
  const back = pts[Math.max(0, pts.length - 3)]!;
  const ang = Math.atan2(tip.y - back.y, tip.x - back.x);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [colour, width] of [[PAPER, 15], [RED, 8]] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    polyline(ctx, pts);
    ctx.beginPath();
    ctx.moveTo(tip.x + Math.cos(ang + 2.5) * 28, tip.y + Math.sin(ang + 2.5) * 28);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(tip.x + Math.cos(ang - 2.5) * 28, tip.y + Math.sin(ang - 2.5) * 28);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the card and notes

/** The card the cut-away scale and tooth sit on, centred on its anchor. */
export const CARD = { x: 540, y: 470, w: 860, h: 350 } as const;
export function makeCard(): Prop {
  return bake(CARD.w + 40, CARD.h + 40, CARD.w / 2 + 20, CARD.h / 2 + 20, 101, (pen) => {
    inked(pen, rounded(-CARD.w / 2, -CARD.h / 2, CARD.w, CARD.h, 24), PAPER, 4, 0.94);
  });
}

/** A hand-inked tick ✓, `h` tall, centred at (x, y). */
export function drawCheck(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, alpha: number): void {
  if (alpha <= 0) return;
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(x - h * 0.45, y);
    ctx.quadraticCurveTo(x - h * 0.25, y + h * 0.2, x - h * 0.1, y + h * 0.42);
    ctx.quadraticCurveTo(x + h * 0.1, y - h * 0.1, x + h * 0.5, y - h * 0.5);
  };
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [colour, width] of [[PAPER, 0.3], [RED, 0.14]] as const) {
    path();
    ctx.strokeStyle = colour;
    ctx.lineWidth = h * width;
    ctx.stroke();
  }
  ctx.restore();
}

/** A note, with a thin line and dot pointing at what it names (`to`, optional). */
export function drawNote(ctx: CanvasRenderingContext2D, text: string, at: Pt, to: Pt | null, alpha: number, size: number, colours: TextInk = SPOKEN): void {
  if (alpha <= 0) return;
  if (to) {
    const from = { x: at.x, y: to.y > at.y ? at.y + size * 0.25 : at.y - size * 0.8 };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len > 40) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = colours.fill;
      ctx.fillStyle = colours.fill;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(from.x + (dx / len) * 10, from.y + (dy / len) * 10);
      ctx.lineTo(to.x - (dx / len) * 12, to.y - (dy / len) * 12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(to.x, to.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  drawTextLine(ctx, text, at.x, at.y, size, 700, alpha, colours);
}
