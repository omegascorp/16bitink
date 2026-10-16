import { INK, PAPER } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { CAPTION_FONT, type TextInk } from '../captions';
import { VIDEO } from '../short';
import { arc, curve, livePen, washPath } from './ink';
import { LOOP_S, RING } from './story';

/**
 * The deep: a dark blue wash brushed across the page, paler where the eels
 * circle, marine snow drifting down through it, and the hook's signs (a
 * big "?" and a crossed-out eye).
 */

export const DEEP_TOP = 236;
export const DEEP_BOTTOM = 1112;
/** Words on the deep: paper on a dark halo; what's said in warm yellow. */
export const ON_DEEP: TextInk = { fill: PAPER, halo: '#081526' };
export const SAID_ON_DEEP: TextInk = { fill: '#f5c84a', halo: '#081526' };
const SLASH = '#e0553a';

/** The wash's ragged outline, as a path on `ctx`. */
export const deepPath = (ctx: CanvasRenderingContext2D): void => washPath(ctx, DEEP_TOP, DEEP_BOTTOM, VIDEO.width, 150);

/** The wash, built once. */
export function makeDeep(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.width;
  canvas.height = VIDEO.height;
  const ctx = canvas.getContext('2d')!;
  deepPath(ctx);
  const water = ctx.createLinearGradient(0, DEEP_TOP, 0, DEEP_BOTTOM);
  water.addColorStop(0, '#16304d');
  water.addColorStop(1, '#0a1a2e');
  ctx.fillStyle = water;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const glow = ctx.createRadialGradient(RING.x, RING.y, 0, RING.x, RING.y, 560);
  glow.addColorStop(0, 'rgba(110,160,200,0.55)');
  glow.addColorStop(1, 'rgba(110,160,200,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  // Brush streaks through the wash.
  const rng = createRng(151);
  ctx.strokeStyle = '#06101e';
  ctx.lineCap = 'round';
  for (let k = 0; k < 26; k++) {
    const y = DEEP_TOP + rng() * (DEEP_BOTTOM - DEEP_TOP);
    ctx.globalAlpha = 0.08 + 0.08 * rng();
    ctx.lineWidth = 10 + 30 * rng();
    ctx.beginPath();
    ctx.moveTo(-40, y);
    ctx.quadraticCurveTo(VIDEO.width / 2, y + (rng() - 0.5) * 80, VIDEO.width + 40, y + (rng() - 0.5) * 60);
    ctx.stroke();
  }
  ctx.restore();
  return canvas;
}

/** Marine snow: pale specks sinking slowly, each falling the wash's depth a whole number of times a loop. */
const SNOW = (() => {
  const rng = createRng(152);
  return Array.from({ length: 70 }, () => ({ x: rng() * VIDEO.width, y: rng(), r: 1.2 + 2.4 * rng(), falls: 1 + Math.floor(rng() * 2), sway: rng() * 6 }));
})();

export function drawSnow(ctx: CanvasRenderingContext2D, t: number): void {
  const depth = DEEP_BOTTOM - DEEP_TOP;
  ctx.save();
  ctx.fillStyle = '#cfe0ee';
  for (const s of SNOW) {
    const u = (s.y + (s.falls * t) / LOOP_S) % 1;
    // Fading in at the top of the wash and out at its bottom, so a speck never pops.
    const edge = Math.min(1, u * 8, (1 - u) * 8);
    ctx.globalAlpha = 0.45 * edge;
    ctx.beginPath();
    ctx.arc(s.x + 10 * Math.sin((2 * Math.PI * t) / LOOP_S + s.sway), DEEP_TOP + 20 + u * (depth - 40), s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The big "?" the eels circle, bobbing gently. */
export function drawQuestion(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  if (alpha <= 0) return;
  const bob = 8 * Math.sin((2 * Math.PI * 6 * t) / LOOP_S);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 300px ${CAPTION_FONT}`;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#081526';
  ctx.lineWidth = 26;
  ctx.strokeText('?', RING.x, RING.y + bob);
  ctx.fillStyle = PAPER;
  ctx.fillText('?', RING.x, RING.y + bob);
  ctx.restore();
}

/** An eye, crossed out: nobody has seen it. `w` px wide. */
export function drawNoEye(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, alpha: number, boil: number): void {
  if (alpha <= 0) return;
  const pen = livePen(ctx, 7, boil);
  const h = w * 0.3;
  const upper = curve({ x: x - w / 2, y }, { x, y: y - h * 1.6 }, { x: x + w / 2, y }, 14);
  const lower = curve({ x: x + w / 2, y }, { x, y: y + h * 1.6 }, { x: x - w / 2, y }, 14);
  ctx.save();
  ctx.globalAlpha = alpha;
  pen.fill([...upper, ...lower], PAPER, 1);
  pen.fill(arc(x, y, h * 0.85, h * 0.85, 0, Math.PI * 2, 18), '#5b86a8', 1);
  pen.fill(arc(x, y, h * 0.4, h * 0.4, 0, Math.PI * 2, 14), INK, 1);
  pen.dot(x - h * 0.25, y - h * 0.25, h * 0.14, PAPER);
  pen.stroke(upper, 4);
  pen.stroke(lower, 4);
  for (let k = 0; k < 5; k++) {
    const a = Math.PI * (1.2 + k * 0.15);
    const from = { x: x + Math.cos(a) * w * 0.4, y: y - h * 0.95 + Math.sin(a) * 4 };
    pen.stroke([from, { x: from.x + Math.cos(a) * 18, y: from.y + Math.sin(a) * 22 }], 3);
  }
  // The slash, with a dark edge so it reads on the wash.
  const a = { x: x - w * 0.52, y: y + h * 1.5 };
  const b = { x: x + w * 0.52, y: y - h * 1.5 };
  pen.stroke([a, b], 18, '#081526', 0.9, false);
  pen.stroke([a, b], 11, SLASH);
  ctx.restore();
}
