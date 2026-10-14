import type { FishShape } from '../../../src/art/fishArt';
import { INK, PAPER } from '../../../src/art/pen';
import { ZONE_INFO } from '../../../src/levels/zones';
import { createRng } from '../../../src/logic/rng';
import type { Pose } from '../chain';
import { drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { clamp01, lerp, ramp, smooth, window01 } from '../short';
import type { Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { FRAME } from './frame';
import { drawTextLeft, PAPER_ON_INK } from './hud';
import { T } from './timeline';
import { LINE_RED } from './water';
import { darknessAt } from './world';

/** Cut-ins over the dive: the game card (also the end card), Everest to scale, the cell, the two trenches, red light fading. */

const W = FRAME.width;
const H = FRAME.height;
const ACCENT = '#f5c84a';
const BLUE_INK: TextInk = { fill: '#1f3f8a', halo: PAPER };

/** A sheet of paper with a soft shadow, the cut-ins' card. */
function card(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha: number, paper: CanvasImageSource): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = PAPER;
  ctx.fillRect(x, y, w, h);
  ctx.shadowColor = 'transparent';
  ctx.drawImage(paper, x, y, w, h, x, y, w, h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

// ---------------------------------------------------------------- the game card / end card

export type SpriteFor = (shape: FishShape) => Sprite;

const BANDS = { x: 110, top: 70, w: 960, h: 94 } as const;

/**
 * The ocean as the game's ten chapters, one band each, light to dark, each
 * with the fish you swim as there; a route drawn down through them over
 * `route` (0 .. 1). With `endCard` the right-hand side leaves room below the
 * title for YouTube's end-screen elements.
 */
export function drawGameCard(ctx: CanvasRenderingContext2D, paper: CanvasImageSource, spriteFor: SpriteFor, t: number, route: number, alpha: number, endCard: boolean): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(paper, 0, 0);
  ZONE_INFO.forEach((z, i) => {
    const y = BANDS.top + i * BANDS.h;
    const dark = darknessAt((z.depth[0] + z.depth[1]) / 2);
    const shade = Math.round(240 - 225 * dark);
    ctx.fillStyle = `rgba(${shade - 30},${shade - 8},${Math.min(255, shade + 15)},${(0.35 + 0.65 * dark).toFixed(3)})`;
    ctx.fillRect(BANDS.x, y, BANDS.w, BANDS.h);
    const ink = dark > 0.45 ? PAPER_ON_INK : INK_ON_PAPER;
    drawTextLeft(ctx, `${z.id}`, BANDS.x + 22, y + 62, 54, 700, alpha, ink);
    drawTextLeft(ctx, z.name, BANDS.x + 90, y + 50, 44, 700, alpha, ink);
    drawTextLeft(ctx, `${z.depth[0].toLocaleString('en-US')}–${z.depth[1].toLocaleString('en-US')} m`, BANDS.x + 92, y + 82, 28, 500, alpha * 0.9, ink);
    const sprite = spriteFor(z.player);
    const fx = BANDS.x + BANDS.w - 150 + 14 * Math.sin(t * 0.8 + i);
    const pose: Pose = { j: 0, shape: z.player, age: 0, x: fx, y: y + BANDS.h / 2 + 4 * Math.sin(t * 1.3 + i), length: 120, facing: 1, tilt: 0, beat: 2 * Math.PI * 1.6 * t + i, effort: 0.4 };
    drawSwimmer(ctx, sprite, pose, Math.floor(t * 8) % 3, { alpha });
  });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(BANDS.x, BANDS.top, BANDS.w, BANDS.h * ZONE_INFO.length);
  // The route: a dashed zigzag from the tide pool to the trench.
  const pts = ZONE_INFO.map((_, i) => ({ x: BANDS.x + BANDS.w - 330 + (i % 2 ? 60 : -60), y: BANDS.top + i * BANDS.h + BANDS.h / 2 }));
  const total = pts.length - 1;
  const upto = route * total;
  ctx.strokeStyle = LINE_RED;
  ctx.lineWidth = 5;
  ctx.setLineDash([16, 12]);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i <= total; i++) {
    const u = clamp01(upto - (i - 1));
    if (u <= 0) break;
    ctx.lineTo(lerp(pts[i - 1]!.x, pts[i]!.x, u), lerp(pts[i - 1]!.y, pts[i]!.y, u));
  }
  ctx.stroke();
  ctx.restore();

  const cx = 1490;
  drawTextLine(ctx, 'InkFish', cx, endCard ? 210 : 300, 190, 700, alpha, INK_ON_PAPER);
  drawTextLine(ctx, 'start small. eat your way down.', cx, endCard ? 290 : 390, 50, 500, alpha, INK_ON_PAPER);
  drawTextLine(ctx, 'chapter 1 free in your browser', cx, endCard ? 380 : 560, 58, 700, alpha, INK_ON_PAPER);
  drawTextLine(ctx, '16bit.ink', cx, endCard ? 470 : 680, endCard ? 96 : 130, 700, alpha, BLUE_INK);
}

/** How far the route has been drawn: during the game card, and again on the end card. */
export const routeAt = (t: number): number => Math.max(ramp(t, T.inkfish, T.chapterOne + 0.5), ramp(t, T.startTidePool, T.startTidePool + 3.5));

// ---------------------------------------------------------------- Everest to scale

/** The deepest trench with Everest stood in it, to scale: its peak still ~2 km under the surface. */
export function drawEverest(ctx: CanvasRenderingContext2D, paper: CanvasImageSource, t: number, alpha: number): void {
  if (alpha <= 0) return;
  const box = { x: 1150, y: 230, w: 640, h: 790 };
  card(ctx, box.x, box.y, box.w, box.h, alpha, paper);
  const top = box.y + 70;
  const scale = (box.h - 120) / 11000;
  const yOf = (m: number): number => top + m * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  // The sea and the trench's sides.
  const deep = 10935;
  const left = box.x + 40;
  const right = box.x + box.w - 40;
  ctx.fillStyle = 'rgba(40,72,130,0.18)';
  ctx.fillRect(left, top, right - left, yOf(deep) - top);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(right, top);
  ctx.stroke();
  ctx.fillStyle = '#d9cfb8';
  ctx.beginPath();
  ctx.moveTo(left, yOf(6000));
  ctx.lineTo(left + 150, yOf(6000));
  ctx.lineTo(left + 250, yOf(deep));
  ctx.lineTo(right - 250, yOf(deep));
  ctx.lineTo(right - 150, yOf(6000));
  ctx.lineTo(right, yOf(6000));
  ctx.lineTo(right, yOf(11000) + 20);
  ctx.lineTo(left, yOf(11000) + 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Everest drops in from above, and comes to rest on the trench floor.
  const drop = smooth((t - (T.everest + 0.4)) / 1.4);
  const peak = deep - 8849;
  const offset = (1 - drop) * -9000;
  const baseY = yOf(deep) + offset * scale;
  const peakY = yOf(peak) + offset * scale;
  const mx = (left + right) / 2;
  // Everest falls in from above the card: clipped to it.
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.fillStyle = '#efe6d2';
  ctx.beginPath();
  ctx.moveTo(mx - 170, baseY);
  ctx.lineTo(mx - 70, peakY + 140);
  ctx.lineTo(mx - 20, peakY + 40);
  ctx.lineTo(mx, peakY);
  ctx.lineTo(mx + 40, peakY + 60);
  ctx.lineTo(mx + 90, peakY + 110);
  ctx.lineTo(mx + 170, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Snow on the peak.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(mx - 20, peakY + 40);
  ctx.lineTo(mx, peakY);
  ctx.lineTo(mx + 40, peakY + 60);
  ctx.lineTo(mx + 10, peakY + 45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  drawTextLine(ctx, 'to scale', box.x + box.w / 2, box.y + 50, 40, 700, alpha, INK_ON_PAPER);
  drawTextLine(ctx, 'Mount Everest', mx, baseY - 70, 40, 700, alpha * drop, INK_ON_PAPER);
  drawTextLine(ctx, '8,849 m tall', mx, baseY - 34, 30, 500, alpha * drop, INK_ON_PAPER);
  drawTextLeft(ctx, 'deepest point ~10,935 m', left + 6, yOf(deep) + 48, 30, 500, alpha, INK_ON_PAPER);
  // The gap over the peak.
  const gap = ramp(t, T.everest + 2, T.everest + 2.8);
  if (gap > 0) {
    ctx.save();
    ctx.globalAlpha = alpha * gap;
    ctx.strokeStyle = LINE_RED;
    ctx.lineWidth = 4;
    const gx = mx + 120;
    ctx.beginPath();
    ctx.moveTo(gx, top + 4);
    ctx.lineTo(gx, yOf(peak) - 4);
    ctx.moveTo(gx - 14, top + 4);
    ctx.lineTo(gx + 14, top + 4);
    ctx.moveTo(gx - 14, yOf(peak) - 4);
    ctx.lineTo(gx + 14, yOf(peak) - 4);
    ctx.stroke();
    ctx.restore();
    drawTextLine(ctx, '~2 km of water', mx - 40, (top + yOf(peak)) / 2 + 12, 38, 700, alpha * gap, { fill: LINE_RED, halo: PAPER });
  }
}

export const everestAlpha = (t: number): number => window01(t, T.everest - 0.2, T.pressureWins - 0.3, 0.4);

// ---------------------------------------------------------------- the cell

/** Inside a cell: proteins squeezed out of shape by the pressure, held in shape by TMAO, until it's saltier than the sea. */
const LENS = { x: 1390, y: 560, r: 300 } as const;
const PROTEINS = (() => {
  const rng = createRng(301);
  return Array.from({ length: 6 }, (_, i) => ({ x: (rng() - 0.5) * 300, y: (rng() - 0.5) * 260, a: rng() * Math.PI, seed: i }));
})();
const DOTS = (() => {
  const rng = createRng(302);
  return Array.from({ length: 120 }, () => {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * 205;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, order: rng() };
  });
})();

export function drawCell(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  if (alpha <= 0) return;
  const squeeze = ramp(t, T.squeezes, T.squeezes + 0.8) * (1 - ramp(t, T.molecule + 0.4, T.molecule + 1.4));
  const fill = Math.max(0.15 * ramp(t, T.molecule, T.molecule + 1), ramp(t, T.molecule, T.deeperMore + 2.5) * 0.55, ramp(t, T.saltier - 0.5, T.saltier + 0.8));
  const push = ramp(t, T.pushIn - 0.2, T.pushIn + 0.6);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(LENS.x, LENS.y, LENS.r * smooth(alpha), 0, Math.PI * 2);
  ctx.fillStyle = '#e7eef6';
  ctx.fill();
  ctx.save();
  ctx.clip();
  // The cell: a wobbly membrane, bulging as water pushes in.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.fillStyle = 'rgba(242,214,190,0.8)';
  ctx.beginPath();
  for (let k = 0; k <= 64; k++) {
    const a = (k / 64) * Math.PI * 2;
    const r = 225 + 8 * Math.sin(a * 5 + t * 1.5) + push * (18 + 10 * Math.sin(a * 3 + t * 4)) - squeeze * 20;
    const x = LENS.x + Math.cos(a) * r;
    const y = LENS.y + Math.sin(a) * r;
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.fill();
  ctx.stroke();
  // Proteins: inked coils, flattened under pressure.
  for (const p of PROTEINS) {
    ctx.save();
    ctx.translate(LENS.x + p.x, LENS.y + p.y);
    ctx.rotate(p.a);
    ctx.scale(1 + 0.35 * squeeze, 1 - 0.6 * squeeze);
    ctx.strokeStyle = '#7a3b8f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let k = 0; k <= 40; k++) {
      const u = k / 40;
      const x = (u - 0.5) * 90;
      const y = 18 * Math.sin(u * Math.PI * 5 + p.seed) * (1 - 0.6 * squeeze * Math.sin(u * 7));
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }
  // TMAO: small dots, more and more of them.
  ctx.fillStyle = '#1f6f8a';
  for (const d of DOTS) {
    if (d.order > fill) continue;
    ctx.beginPath();
    ctx.arc(LENS.x + d.x, LENS.y + d.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Pressure (arrows pressing in) and then water (blue arrows pushing in).
  const arrows = Math.max(squeeze, push);
  if (arrows > 0) {
    ctx.strokeStyle = push > squeeze ? '#2c6fd1' : INK;
    ctx.lineWidth = 6;
    ctx.globalAlpha = alpha * arrows;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.2;
      const r0 = 292 - 20 * Math.sin(t * 5 + k);
      const r1 = 248;
      const x0 = LENS.x + Math.cos(a) * r0;
      const y0 = LENS.y + Math.sin(a) * r0;
      const x1 = LENS.x + Math.cos(a) * r1;
      const y1 = LENS.y + Math.sin(a) * r1;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x1 + Math.cos(a + 2.6) * 18, y1 + Math.sin(a + 2.6) * 18);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + Math.cos(a - 2.6) * 18, y1 + Math.sin(a - 2.6) * 18);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(LENS.x, LENS.y, LENS.r * smooth(alpha), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // Labels under the lens.
  const below = LENS.y + LENS.r + 52;
  const labels = [
    { text: 'inside a deep-sea fish’s cell', from: T.invisible, to: T.squeezes },
    { text: 'pressure crushes its proteins out of shape', from: T.squeezes, to: T.molecule },
    { text: 'TMAO holds them together', from: T.molecule, to: T.saltier - 0.3 },
    { text: 'so much TMAO: saltier than the sea', from: T.saltier - 0.3, to: T.pushIn - 0.2 },
    { text: 'deeper, water would rush in', from: T.pushIn - 0.2, to: T.thatsTheLine + 1.6 },
  ];
  for (const l of labels) drawTextLine(ctx, l.text, LENS.x, below, 42, 700, alpha * window01(t, l.from, l.to, 0.25), PAPER_ON_INK);
}

export const cellAlpha = (t: number): number => window01(t, T.invisible - 0.2, T.thatsTheLine + 1.6, 0.45);

// ---------------------------------------------------------------- the two trenches

/** Mariana (deepest, crossed out) against the warmer Izu-Ogasawara (Jamieson's bet), both below the line. */
export function drawTrenches(ctx: CanvasRenderingContext2D, paper: CanvasImageSource, t: number, alpha: number): void {
  if (alpha <= 0) return;
  const box = { x: 1040, y: 250, w: 780, h: 700 };
  card(ctx, box.x, box.y, box.w, box.h, alpha, paper);
  const top = box.y + 120;
  const scale = (box.h - 200) / 11000;
  const yOf = (m: number): number => top + m * scale;
  const trenches = [
    { name: 'Mariana Trench', note: 'the deepest', depth: 10935, cx: box.x + 210, warm: 0.25 },
    { name: 'Izu-Ogasawara Trench', note: 'a little warmer', depth: 9780, cx: box.x + 560, warm: 0.55 },
  ];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(40,72,130,0.18)';
  ctx.fillRect(box.x + 30, top, box.w - 60, yOf(11000) - top);
  for (const tr of trenches) {
    ctx.fillStyle = '#d9cfb8';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tr.cx - 160, yOf(5800));
    ctx.lineTo(tr.cx - 60, yOf(5800));
    ctx.lineTo(tr.cx - 18, yOf(tr.depth));
    ctx.lineTo(tr.cx + 18, yOf(tr.depth));
    ctx.lineTo(tr.cx + 60, yOf(5800));
    ctx.lineTo(tr.cx + 160, yOf(5800));
    ctx.lineTo(tr.cx + 160, yOf(11000) + 10);
    ctx.lineTo(tr.cx - 160, yOf(11000) + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // A thermometer beside each: the Japanese trench's reads a little warmer.
    const thx = tr.cx + 120;
    const th0 = yOf(1500);
    const th1 = yOf(4800);
    ctx.lineWidth = 3;
    ctx.strokeRect(thx - 9, th0, 18, th1 - th0);
    const fillTo = lerp(th1, th0, tr.warm * ramp(t, T.japan, T.warmer + 0.6) + 0.12);
    ctx.fillStyle = '#c8372d';
    ctx.fillRect(thx - 6, fillTo, 12, th1 - fillTo);
    ctx.beginPath();
    ctx.arc(thx, th1 + 14, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // The line, across both.
  ctx.strokeStyle = LINE_RED;
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 12]);
  ctx.beginPath();
  ctx.moveTo(box.x + 30, yOf(8200));
  ctx.lineTo(box.x + box.w - 30, yOf(8200));
  ctx.stroke();
  ctx.setLineDash([]);
  // A cross on Mariana, a ring on Izu-Ogasawara.
  const cross = ramp(t, T.notDeepest + 0.3, T.notDeepest + 0.9);
  if (cross > 0) {
    const c = trenches[0]!;
    ctx.strokeStyle = LINE_RED;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    const y = yOf(c.depth) - 50;
    ctx.beginPath();
    ctx.moveTo(c.cx - 50, y - 50);
    ctx.lineTo(c.cx - 50 + 100 * Math.min(1, cross * 2), y - 50 + 100 * Math.min(1, cross * 2));
    if (cross > 0.5) {
      ctx.moveTo(c.cx + 50, y - 50);
      ctx.lineTo(c.cx + 50 - 100 * (cross - 0.5) * 2, y - 50 + 100 * (cross - 0.5) * 2);
    }
    ctx.stroke();
  }
  const ring = ramp(t, T.japan - 0.2, T.japan + 0.6);
  if (ring > 0) {
    const c = trenches[1]!;
    ctx.strokeStyle = '#2c8a4a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(c.cx, yOf(c.depth) - 40, 70, 90, 0, -0.5, -0.5 + Math.PI * 2 * ring);
    ctx.stroke();
  }
  ctx.restore();
  drawTextLine(ctx, 'where would you look?', box.x + box.w / 2, box.y + 64, 50, 700, alpha, INK_ON_PAPER);
  for (const tr of trenches) {
    drawTextLine(ctx, tr.name, tr.cx, yOf(11000) + 50, 34, 700, alpha, INK_ON_PAPER);
    drawTextLine(ctx, tr.note, tr.cx, yOf(11000) + 84, 30, 500, alpha, INK_ON_PAPER);
  }
  drawTextLeft(ctx, '8,200 m', box.x + 40, yOf(8200) - 12, 30, 700, alpha, { fill: LINE_RED, halo: PAPER });
  drawTextLine(ctx, 'Alan Jamieson’s bet', trenches[1]!.cx, box.y + 116, 36, 700, alpha * ramp(t, T.jamieson, T.jamieson + 0.6), { fill: '#2c8a4a', halo: PAPER });
}

export const trenchesAlpha = (t: number): number => window01(t, T.notDeepest - 0.4, T.lowered - 0.1, 0.4);

// ---------------------------------------------------------------- red light first

/** The colours of sunlight in a strip; red fades (`fade` 0 .. 1) and is crossed out. */
export function drawSpectrum(ctx: CanvasRenderingContext2D, alpha: number, fade: number, ink: TextInk, label: string, at: { readonly x: number; readonly y: number }): void {
  if (alpha <= 0) return;
  const colours = ['#d23a2e', '#e8892c', '#e9cf3c', '#4aa54a', '#3474c8', '#6a4ab8'];
  const x0 = at.x;
  const y = at.y;
  ctx.save();
  colours.forEach((c, i) => {
    ctx.globalAlpha = alpha * (i === 0 ? 1 - 0.85 * fade : i === 1 ? 1 - 0.4 * fade : 1);
    ctx.fillStyle = c;
    ctx.fillRect(x0 + i * 100, y, 92, 46);
  });
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(x0, y, 592, 46);
  if (fade > 0.3) {
    ctx.strokeStyle = LINE_RED;
    ctx.lineWidth = 7;
    ctx.globalAlpha = alpha * ramp(fade, 0.3, 0.7);
    ctx.beginPath();
    ctx.moveTo(x0 - 6, y - 6);
    ctx.lineTo(x0 + 98, y + 52);
    ctx.stroke();
  }
  ctx.restore();
  drawTextLine(ctx, label, x0 + 296, y + 100, 44, 700, alpha, ink);
}

/** The strip at the wreck ("red light first"), and again in the abyss ("remember the red light…"). */
export function spectrumAt(t: number): { readonly alpha: number; readonly fade: number; readonly label: string; readonly at: { readonly x: number; readonly y: number } } {
  // Low on the left at the wreck, clear of the hull; high in the middle in the abyss, clear of the mud.
  const wreck = window01(t, T.redLight - 0.3, T.rememberRed + 0.4, 0.35);
  if (wreck > 0) return { alpha: wreck, fade: ramp(t, T.redLight + 0.3, T.redLight + 1.6), label: 'sunlight underwater: red goes first', at: { x: 150, y: 800 } };
  return { alpha: window01(t, T.rememberRedLight - 0.2, T.loosejaw + 0.2, 0.35), fade: 1, label: 'no red light left down here', at: { x: 664, y: 260 } };
}

