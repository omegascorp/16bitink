import { drawCritter } from '../../../src/art/critterArt';
import { FISH_TEX } from '../../../src/art/fish/kit';
import { halo } from '../../../src/art/glowArt';
import { makeCanvas, PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO } from '../short';
import type { Pt } from './mouth';
import type { Shrimp } from './story';

/**
 * The deep around the gulper: near-black water, marine snow streaming past
 * as we sink, water rushing into the mouth and jetting out of the gills, the
 * shrimp, and the chalk notes (paper on ink, like the other deep shorts).
 */

export const INK_BG = '#05091a';
export const CHALK = '#dcd6e6';
export const PAPER_ON_INK: TextInk = { fill: PAPER, halo: INK_BG };
export const SPOKEN = '#f5c84a';
export const TAIL_LIGHT = '#ff7aa8';
/** Labels stay inside the area the Shorts buttons leave clear, and above the captions. */
export const SAFE = { left: 120, right: VIDEO.width - 120, top: 300, bottom: 1080 } as const;

/** The deep: near-black water, a touch lighter at the top. */
export function makeWater(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(VIDEO.width, VIDEO.height);
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, '#0d1733');
  g.addColorStop(0.55, '#070c1f');
  g.addColorStop(1, '#03060f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  return canvas;
}

const SNOW = (() => {
  const rng = createRng(4242);
  return Array.from({ length: 220 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 0.9 + rng() * 2.1, phase: rng() * Math.PI * 2, depth: 0.5 + rng() * 0.5 }));
})();

/** Marine snow, scrolled up by `scroll` (0 .. 1 of the screen a loop), streaking while we sink fast. */
export function drawSnow(ctx: CanvasRenderingContext2D, loop: number, scroll: number, streak: number): void {
  ctx.save();
  ctx.fillStyle = '#dfe8ff';
  ctx.strokeStyle = '#dfe8ff';
  ctx.lineCap = 'round';
  for (const m of SNOW) {
    const x = m.x + 12 * Math.sin(2 * Math.PI * loop + m.phase);
    // Nearer flakes (bigger `depth`) stream past faster: two or one screens a loop.
    const laps = m.depth > 0.75 ? 2 : 1;
    const y = (((m.y - VIDEO.height * scroll * laps) % VIDEO.height) + VIDEO.height) % VIDEO.height;
    ctx.globalAlpha = 0.16 + 0.16 * m.depth;
    const len = streak * 70 * m.depth * laps;
    if (len > m.r) {
      ctx.lineWidth = m.r * 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + len);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** The dark closing in at the edges. */
export function drawVignette(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createRadialGradient(VIDEO.width / 2, 760, 380, VIDEO.width / 2, 800, 1250);
  g.addColorStop(0, 'rgba(1,2,6,0)');
  g.addColorStop(1, 'rgba(1,2,6,0.7)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

const FLOW = (() => {
  const rng = createRng(53);
  return Array.from({ length: 14 }, (_, k) => ({ spread: ((k + 0.2 + rng() * 0.6) / 14 - 0.5) * 2, phase: rng(), reach: 0.65 + rng() * 0.5, speck: k % 3 === 2 }));
})();

/**
 * Water on the move, in chalk "~" marks and specks: flowing `inward` to the
 * point `at` from the direction `dir` (radians) or out from it along `dir`,
 * fanning `fan` radians either side, reaching `reach` px. `clock` drives the flow.
 */
export function drawFlow(ctx: CanvasRenderingContext2D, at: Pt, dir: number, fan: number, reach: number, strength: number, clock: number, inward: boolean): void {
  if (strength <= 0.01) return;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.fillStyle = CHALK;
  ctx.lineCap = 'round';
  for (const s of FLOW) {
    const flow = (s.phase + clock * 2.2) % 1;
    // Inward marks start far out and speed up into the mouth; outward ones shoot out and slow.
    const d = inward ? reach * s.reach * (1 - flow) ** 1.5 : reach * s.reach * (1 - (1 - flow) ** 1.8);
    const near = 1 - d / (reach * s.reach + 1e-6);
    const fade = Math.min(1, (inward ? near : 1 - near) * 5 + 0.05) * Math.min(1, (inward ? 1 - flow : flow) * 6) * Math.min(1, d / 30);
    if (fade <= 0.02) continue;
    const a = dir + s.spread * fan * (inward ? 0.5 + 0.5 * (1 - near) : 0.3 + 0.7 * flow);
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    ctx.globalAlpha = 0.6 * strength * fade;
    const x0 = at.x + cos * d;
    const y0 = at.y + sin * d;
    if (s.speck) {
      ctx.beginPath();
      ctx.arc(x0, y0, Math.max(1.5, reach * 0.008), 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    const len = reach * (0.06 + 0.1 * (inward ? near : 1 - near));
    const wave = reach * 0.01;
    ctx.lineWidth = Math.max(2, reach * 0.006);
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const along = d + (len * i) / 6;
      const side = Math.sin(i * 1.4 + s.phase * 6) * wave;
      const x = at.x + cos * along - sin * side;
      const y = at.y + sin * along + cos * side;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** The snap of the jaws: chalk strokes bursting out round the snout, `u` 0 .. 1. */
export function drawSnap(ctx: CanvasRenderingContext2D, at: Pt, size: number, u: number): void {
  if (u < 0 || u > 1) return;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(3, size * 0.035);
  ctx.globalAlpha = 1 - u;
  for (let k = 0; k < 7; k++) {
    const a = -1.3 + (k / 6) * 2.6;
    const r0 = size * (0.35 + 0.4 * u);
    const r1 = size * (0.6 + 0.6 * u) * (k % 2 ? 0.8 : 1);
    ctx.beginPath();
    ctx.moveTo(at.x + Math.cos(a) * r0, at.y + Math.sin(a) * r0);
    ctx.lineTo(at.x + Math.cos(a) * r1, at.y + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.restore();
}

/** The game's own shrimp, one canvas per boil frame. */
export interface ShrimpSprite {
  readonly frames: readonly HTMLCanvasElement[];
  readonly res: number;
}

/** The drawing's body length in texture px (CRITTER_BODY's hl × 2). */
const SHRIMP_BODY = 132;

export function makeShrimpSprite(res = 2): ShrimpSprite {
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(FISH_TEX * res, FISH_TEX * res);
    ctx.scale(res, res);
    drawCritter(ctx, 'shrimp', 'light', f, 7 + f * 977);
    return canvas;
  });
  return { frames, res };
}

/** A shrimp on screen at `s` (already in screen px, `scale` screen px per world px), with a faint glow so it reads in the dark. */
export function drawShrimp(ctx: CanvasRenderingContext2D, sprite: ShrimpSprite, s: Shrimp, at: Pt, scale: number, boil: number): void {
  if (s.alpha <= 0.01) return;
  const len = s.len * scale;
  if (!s.inside) halo(ctx, at.x, at.y, len * 1.1, '#ffd6c8', 0.18 * s.alpha);
  const canvas = sprite.frames[(boil + Math.round(s.flick)) % sprite.frames.length]!;
  const k = len / (SHRIMP_BODY * sprite.res);
  // Facing left (heading ~π) it would be upside down: flip it instead.
  const left = Math.cos(s.angle) < 0;
  ctx.save();
  ctx.globalAlpha = s.alpha;
  ctx.translate(at.x, at.y);
  ctx.rotate(left ? s.angle - Math.PI : s.angle);
  ctx.scale(left ? -k : k, k);
  // A flick of the tail: a quick squash along its length.
  const flick = Math.max(0, Math.sin(s.flick)) ** 8;
  ctx.scale(1 - 0.12 * flick, 1 + 0.08 * flick);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  ctx.restore();
}

/** A label in chalk handwriting, kept inside the safe area, with a leader line to what it names. */
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
  const closed = [...pts, pts[0]!];
  const lens = closed.slice(1).map((p, i) => Math.hypot(p.x - closed[i]!.x, p.y - closed[i]!.y));
  const total = lens.reduce((s, l) => s + l, 0);
  let left = total * Math.min(1, drawn);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.setLineDash([22, 16]);
  ctx.beginPath();
  ctx.moveTo(closed[0]!.x, closed[0]!.y);
  for (let i = 1; i < closed.length && left > 0; i++) {
    const a = closed[i - 1]!;
    const b = closed[i]!;
    const u = Math.min(1, left / (lens[i - 1]! || 1));
    ctx.lineTo(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u);
    left -= lens[i - 1]!;
  }
  ctx.stroke();
  ctx.restore();
}

/** The "?" in the handwriting font, popping in at `pop` (overshooting a little past 1). */
export function drawQuestion(ctx: CanvasRenderingContext2D, at: Pt, size: number, pop: number): void {
  if (pop <= 0) return;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(0.12);
  drawTextLine(ctx, '?', 0, 0, size * pop, 700, Math.min(1, pop), { fill: SPOKEN, halo: INK_BG });
  ctx.restore();
}

/** The tail's light: a pink glow, pulsing. */
export function drawTailLight(ctx: CanvasRenderingContext2D, at: Pt, size: number, strength: number): void {
  halo(ctx, at.x, at.y, size * 4, TAIL_LIGHT, 0.55 * strength);
  halo(ctx, at.x, at.y, size, '#ffe0ec', 0.8 * strength);
}

/** The caption's font, for measuring. */
export const fontOf = (size: number): string => `700 ${size}px ${CAPTION_FONT}`;
