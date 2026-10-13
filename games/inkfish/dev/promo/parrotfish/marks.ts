import { INK, PAPER } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine } from '../captions';
import { VIDEO } from '../short';
import { captionAt } from './cues';

/** The notes inked over the picture: labels and arrows, the kg counter, the throat X-ray, and the captions. */

const SPOKEN = { fill: '#d9541e', halo: PAPER } as const;
const UNSPOKEN = { fill: INK, halo: PAPER } as const;
const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
const CAPTION_MAX_W = 980;

interface Pt { readonly x: number; readonly y: number }

/** A handwritten label. */
export function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, alpha: number): void {
  drawTextLine(ctx, text, x, y, size, 700, alpha);
}

/** A hand-drawn arrow from `from` to `to`, bowed a little to one side, on a paper halo. */
export function drawArrow(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, bow: number, alpha: number, width = 5): void {
  if (alpha <= 0) return;
  const mid = { x: (from.x + to.x) / 2 - (to.y - from.y) * bow, y: (from.y + to.y) / 2 + (to.x - from.x) * bow };
  const ang = Math.atan2(to.y - mid.y, to.x - mid.x);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [colour, w] of [[PAPER, width + 6], [INK, width]] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(mid.x, mid.y, to.x, to.y);
    ctx.moveTo(to.x + Math.cos(ang + 2.6) * 26, to.y + Math.sin(ang + 2.6) * 26);
    ctx.lineTo(to.x, to.y);
    ctx.lineTo(to.x + Math.cos(ang - 2.6) * 26, to.y + Math.sin(ang - 2.6) * 26);
    ctx.stroke();
  }
  ctx.restore();
}

/** A paper card with an inked, slightly wobbly border, tilted. */
function card(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - h / 2 + 2);
  ctx.lineTo(x + w / 2 - 3, y - h / 2);
  ctx.lineTo(x + w / 2, y + h / 2 - 2);
  ctx.lineTo(x - w / 2 + 2, y + h / 2);
  ctx.closePath();
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** The readout: "320 kg" racing up, the month on a calendar tab, "of sand a year" under it. */
export function drawCounter(ctx: CanvasRenderingContext2D, x: number, y: number, kg: number, month: string, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(-0.04);
  ctx.scale(0.85 + 0.15 * alpha, 0.85 + 0.15 * alpha);
  card(ctx, 0, 0, 380, 200);
  // The calendar tab, top right.
  ctx.save();
  ctx.translate(135, -100);
  ctx.rotate(0.12);
  card(ctx, 0, 0, 120, 64);
  ctx.fillStyle = '#e2574c';
  ctx.fillRect(-58, -30, 116, 16);
  ctx.restore();
  ctx.restore();
  drawTextLine(ctx, month, x + 136, y - 76, 44, 700, alpha);
  drawTextLine(ctx, `${kg} kg`, x - 6, y + 18, 104, 700, alpha, { fill: '#d9541e', halo: PAPER });
  drawTextLine(ctx, 'of sand a year', x - 6, y + 74, 48, 700, alpha);
}

// ---------------------------------------------------------------- the X-ray

const FLESH = '#f1b9b0';
const BONE = '#f6eedb';
const CORAL_BIT = '#c9a46a';

/**
 * The cutaway of its throat: a circle at (x, y) linked to the throat at `at`,
 * the pharyngeal teeth grinding side to side, coral chunks squeezed between
 * them and coming out the far side as sand. `open` 0 .. 1 pops it.
 */
export function drawXray(ctx: CanvasRenderingContext2D, at: Pt, x: number, y: number, r: number, open: number, t: number): void {
  if (open <= 0) return;
  const R = r * (0.6 + 0.4 * open);
  ctx.save();
  ctx.globalAlpha = Math.min(1, open * 1.5);
  // The spot on the throat, and lines out to the circle.
  const ring = 34;
  const dx = x - at.x;
  const dy = y - at.y;
  const dist = Math.hypot(dx, dy);
  const side = Math.asin(Math.min(1, (R - ring) / dist));
  const base = Math.atan2(dy, dx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  for (const s of [-1, 1]) {
    const n = base + s * (Math.PI / 2 + side);
    ctx.beginPath();
    ctx.moveTo(at.x + Math.cos(n) * ring, at.y + Math.sin(n) * ring);
    ctx.lineTo(x + Math.cos(n) * R, y + Math.sin(n) * R);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(at.x, at.y, ring, 0, Math.PI * 2);
  ctx.stroke();
  // Inside the circle.
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fillStyle = FLESH;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.translate(x, y);
  ctx.scale(R / r, R / r);
  drawGrinder(ctx, r, t);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
  const shown = Math.min(1, open * 1.5);
  drawTextLine(ctx, 'throat teeth', x, y - R - 24, 64, 700, shown);
  drawTextLine(ctx, 'coral', x - R - 78, y + 16, 60, 700, shown);
  drawTextLine(ctx, 'sand', x + R + 66, y + 16, 60, 700, shown, { fill: '#d9541e', halo: PAPER });
}

/** One jaw plate, its molars along the edge facing the gap; `dir` 1 for the upper plate (teeth pointing down). */
function plate(ctx: CanvasRenderingContext2D, r: number, gap: number, dir: 1 | -1, shift: number): void {
  const edge = -dir * gap;
  const tooth = 34;
  ctx.beginPath();
  ctx.moveTo(-r - 60, -dir * r * 1.2);
  ctx.lineTo(-r - 60, edge - dir * 8);
  for (let x = -r - 60 + shift % tooth; x < r + 60; x += tooth) {
    ctx.quadraticCurveTo(x + tooth / 2, edge + dir * 22, x + tooth, edge - dir * 8);
  }
  ctx.lineTo(r + 60, -dir * r * 1.2);
  ctx.closePath();
  ctx.fillStyle = BONE;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  // Hatching on the bone.
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 2;
  for (let k = -r * 2; k < r * 2; k += 22) {
    ctx.beginPath();
    ctx.moveTo(k + shift, -dir * r);
    ctx.lineTo(k + shift + r * 0.6, -dir * (gap + 30));
    ctx.stroke();
  }
  ctx.restore();
}

/** Coral in from the left, ground between the plates, sand out on the right. */
function drawGrinder(ctx: CanvasRenderingContext2D, r: number, t: number): void {
  const gap = 66;
  const scrub = 16 * Math.sin(2 * Math.PI * 3.2 * t);
  const N = 6;
  for (let k = 0; k < N; k++) {
    const u = (k / N + t * 0.55) % 1;
    const x = -r * 1.1 + u * r * 2.2;
    // Big chunks on the left, broken smaller in the middle, grains on the right.
    const bits = u < 0.38 ? 1 : u < 0.62 ? 3 : 7;
    for (let b = 0; b < bits; b++) {
      const size = u < 0.38 ? 66 : u < 0.62 ? 28 : 10;
      const bx = x + (b - (bits - 1) / 2) * (u < 0.62 ? 26 : 13) + (u >= 0.62 ? Math.sin(k * 7 + b * 3) * 10 : 0);
      const by = (u < 0.62 ? (b - 1) * 8 * (bits > 1 ? 1 : 0) : Math.cos(k * 5 + b * 2) * 34) + Math.sin(k * 3 + b) * 4;
      ctx.beginPath();
      if (u >= 0.62) ctx.arc(bx, by, size / 2, 0, Math.PI * 2);
      else {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + k + b;
          const rr = (size / 2) * (0.75 + 0.25 * Math.sin(i * 2.1 + k));
          if (i === 0) ctx.moveTo(bx + Math.cos(a) * rr, by + Math.sin(a) * rr);
          else ctx.lineTo(bx + Math.cos(a) * rr, by + Math.sin(a) * rr);
        }
        ctx.closePath();
      }
      ctx.fillStyle = u >= 0.62 ? '#fffcf2' : CORAL_BIT;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = u >= 0.62 ? 1.6 : 2.6;
      ctx.stroke();
    }
  }
  plate(ctx, r, gap, 1, scrub);
  plate(ctx, r, gap, -1, -scrub);
}

// ---------------------------------------------------------------- captions

/** The spoken line, word by word, the word being said in orange. */
export function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = `700 ${CAPTION_SIZE}px ${CAPTION_FONT}`;
  const space = ctx.measureText(' ').width;
  const natural = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const naturalTotal = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const k = Math.min(1, CAPTION_MAX_W / naturalTotal);
  let x = VIDEO.width / 2 - (naturalTotal * k) / 2;
  words.forEach((w, i) => {
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, i === now.word ? SPOKEN : UNSPOKEN);
    x += (natural[i]! + space) * k;
  });
}
