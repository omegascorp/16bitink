import { PAPER_FILL } from '../../../src/art/fish/kit';
import { ellipse, INK, PAPER, type Pt } from '../../../src/art/pen';
import { drawTextLine, type TextInk } from '../captions';
import { VIDEO } from '../short';
import { arc, livePen, roundRect, smoothClosed, smoothOpen } from './ink';
import { PREY_LEN, preyHalfWidth, type SpinePt, spineAt } from './shape';
import { cycles } from './story';
import { TEXT } from './script';

/**
 * Everything drawn over the reef to tell the story: the chalk rug with
 * tasselled ends, the measuring tape along the bamboo shark and the arrow
 * down to its head (in world mm); the clock, the progress bar, the divers
 * and the sun (on screen, px).
 */

export const INK_BG = '#06101a';
export const SPOKEN = '#f5c84a';
export const PAPER_ON_INK: TextInk = { fill: PAPER, halo: INK_BG };
const CHALK = '#f4efe2';
const GOLD = '#f5c84a';
const GOLD_ON_INK: TextInk = { fill: GOLD, halo: INK_BG };

/** A chalk line: a soft dark halo under a bright stroke, so it reads over sand and shark alike. */
function chalk(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, colour = CHALK, alpha = 1, closed = false): void {
  if (pts.length < 2 || alpha <= 0.01) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [c, w, a] of [[INK_BG, width * 2.6, 0.45], [colour, width, 1]] as const) {
    ctx.globalAlpha = a * alpha;
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    if (closed) ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

/** The first `u` (0 .. 1) of a polyline, by length. */
function partOf(pts: readonly Pt[], u: number): Pt[] {
  if (u >= 1) return [...pts];
  const lens = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y));
  let left = u * lens.reduce((s, l) => s + l, 0);
  const out: Pt[] = [pts[0]!];
  for (let i = 0; i < lens.length; i++) {
    const l = lens[i]!;
    if (left >= l) {
      out.push(pts[i + 1]!);
      left -= l;
    } else {
      const f = left / l;
      out.push({ x: pts[i]!.x + (pts[i + 1]!.x - pts[i]!.x) * f, y: pts[i]!.y + (pts[i + 1]!.y - pts[i]!.y) * f });
      break;
    }
  }
  return out;
}

// ---------------------------------------------------------------- in the world (mm)

/** The rug round the wobbegong: a rounded rectangle drawn on in chalk, tassels hanging off its ends. */
export const RUG = { x0: -520, y0: -460, x1: 520, y1: 1500 } as const;

export function drawRug(ctx: CanvasRenderingContext2D, drawn: number, alpha: number, t: number): void {
  if (alpha <= 0.01) return;
  const { x0, y0, x1, y1 } = RUG;
  const edge = roundRect(x0, y0, x1 - x0, y1 - y0, 60);
  // Start at the top middle so it draws round both ways at once.
  const start = edge.findIndex((p) => p.y <= y0 + 1 && p.x >= 0);
  const loop = [...edge.slice(start), ...edge.slice(0, start), edge[start]!];
  chalk(ctx, partOf(loop, drawn), 11, CHALK, alpha);
  // A border inside it, dashed.
  ctx.save();
  ctx.setLineDash([36, 28]);
  chalk(ctx, partOf(roundRect(x0 + 50, y0 + 50, x1 - x0 - 100, y1 - y0 - 100, 40), drawn), 6, CHALK, alpha * 0.7, drawn >= 1);
  ctx.restore();
  // The tassels along the two short ends, swinging.
  const shown = Math.max(0, (drawn - 0.55) / 0.45);
  for (const [y, dir] of [[y0, -1], [y1, 1]] as const) {
    for (let i = 0; i <= 18; i++) {
      if (i / 18 > shown) break;
      const x = x0 + 40 + ((x1 - x0 - 80) * i) / 18;
      const swing = 0.25 * Math.sin(cycles(12, t) + i * 0.8);
      const len = 90;
      chalk(ctx, [{ x, y }, { x: x + Math.sin(swing) * len, y: y + dir * Math.cos(swing) * len }], 7, CHALK, alpha);
    }
  }
}

/** The measuring tape along the bamboo shark, snout to tail, a little off to its left (the outside of its curl). */
export function drawTape(ctx: CanvasRenderingContext2D, spine: readonly SpinePt[], amount: number): void {
  if (amount <= 0.01) return;
  const OFF = 34;
  const pts = Array.from({ length: 51 }, (_, i) => {
    const s = (PREY_LEN * i) / 50;
    const q = spineAt(spine, s);
    const w = preyHalfWidth(s) + OFF;
    return { x: q.p.x - q.n.x * w, y: q.p.y - q.n.y * w };
  });
  const part = partOf(pts, Math.min(1, amount * 1.4));
  chalk(ctx, part, 7, GOLD, Math.min(1, amount * 2));
  // Ticks every 100 mm, and the two ends.
  for (let i = 0; i <= 10; i++) {
    const k = i * 5;
    if (k / 50 > Math.min(1, amount * 1.4)) break;
    const q = spineAt(spine, (PREY_LEN * i) / 10);
    const p = pts[k]!;
    const len = i === 0 || i === 10 ? 34 : 16;
    chalk(ctx, [{ x: p.x - q.n.x * len, y: p.y - q.n.y * len }, { x: p.x + q.n.x * len * 0.6, y: p.y + q.n.y * len * 0.6 }], i === 0 || i === 10 ? 7 : 4, GOLD, Math.min(1, amount * 2));
  }
}

/** The arrow down the wobbegong's throat to the bamboo shark's head, drawn on 0 .. 1. */
export function drawHeadArrow(ctx: CanvasRenderingContext2D, inside: number, drawn: number, t: number): void {
  if (drawn <= 0.01) return;
  const bob = 10 * Math.sin(t * 9);
  const from = { x: 330, y: -120 };
  const to = { x: 60, y: inside - 70 + bob };
  const path = smoothOpen([from, { x: 300, y: 120 }, { x: 170, y: inside * 0.75 }, to], 6);
  const part = partOf(path, drawn);
  chalk(ctx, part, 10, GOLD);
  if (drawn > 0.95) {
    const end = path[path.length - 1]!;
    const prev = path[path.length - 3]!;
    const a = Math.atan2(end.y - prev.y, end.x - prev.x);
    chalk(ctx, [{ x: end.x - Math.cos(a - 0.5) * 50, y: end.y - Math.sin(a - 0.5) * 50 }, end, { x: end.x - Math.cos(a + 0.5) * 50, y: end.y - Math.sin(a + 0.5) * 50 }], 10, GOLD);
  }
}

// ---------------------------------------------------------------- on screen (px)

/** Pops up from nothing, overshooting a little. */
function popIn(ctx: CanvasRenderingContext2D, x: number, y: number, shown: number): void {
  const s = shown * (1 + 0.2 * Math.sin(Math.PI * shown));
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.translate(-x, -y);
}

/** The clock jumping 30 minutes: a white face, a hand sweeping round, the swept half shaded. */
export function drawClock(ctx: CanvasRenderingContext2D, shown: number, minutes: number, boil: number): void {
  if (shown <= 0.01) return;
  const { x, y, r } = TEXT.clock;
  const pen = livePen(ctx, 91, boil, 1);
  ctx.save();
  popIn(ctx, x, y, shown);
  pen.fill(ellipse(x + 8, y + 10, r + 14, r + 14, 40), '#000000', 0.3);
  pen.fill(ellipse(x, y, r + 14, r + 14, 40), '#3a3f47', 1);
  pen.fill(ellipse(x, y, r, r, 40), PAPER_FILL, 1);
  const a0 = -Math.PI / 2;
  const a1 = a0 + (minutes / 60) * Math.PI * 2;
  if (minutes > 0.5) {
    const wedge = [{ x, y }, ...arc(x, y, r - 4, r - 4, a0, a1, 24)];
    pen.fill(wedge, GOLD, 0.75);
    pen.stroke([...wedge, wedge[0]!], 2, '#8a5a12', 1, false);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r0 = r * (i % 3 === 0 ? 0.78 : 0.86);
    pen.stroke([{ x: x + Math.cos(a) * r0, y: y + Math.sin(a) * r0 }, { x: x + Math.cos(a) * r * 0.95, y: y + Math.sin(a) * r * 0.95 }], i % 3 === 0 ? 5 : 3, INK, 1, false);
  }
  pen.stroke([{ x, y }, { x: x + Math.cos(a1) * r * 0.82, y: y + Math.sin(a1) * r * 0.82 }], 7, INK, 1, false);
  pen.stroke([{ x, y }, { x: x + Math.cos(-Math.PI / 2 + 0.5 + minutes / 360) * r * 0.5, y: y + Math.sin(-Math.PI / 2 + 0.5 + minutes / 360) * r * 0.5 }], 9, INK, 1, false);
  pen.dot(x, y, 9, INK, 1);
  pen.stroke([...ellipse(x, y, r + 14, r + 14, 40), { x: x + r + 14, y }], 3.5, INK, 1);
  ctx.restore();
  // "+30 min" beside it, once it has jumped.
  const label = Math.min(1, Math.max(0, (minutes - 20) / 10)) * shown;
  drawTextLine(ctx, '+30 min', TEXT.plus.x, TEXT.plus.y, TEXT.plus.size, 700, label, GOLD_ON_INK);
}

/** The progress bar, `fill` 0 .. 1, stalled at 50% with a blinking cursor. */
export function drawBar(ctx: CanvasRenderingContext2D, shown: number, fill: number, t: number, boil: number): void {
  if (shown <= 0.01) return;
  const { x0, x1, y, h } = TEXT.bar;
  const pen = livePen(ctx, 97, boil, 1);
  ctx.save();
  popIn(ctx, (x0 + x1) / 2, y, shown);
  const frame = roundRect(x0, y - h / 2, x1 - x0, h, h / 2);
  pen.fill(frame.map((p) => ({ x: p.x + 6, y: p.y + 8 })), '#000000', 0.3);
  pen.fill(frame, '#1d2833', 1);
  const w = (x1 - x0 - 16) * fill;
  if (w > 4) {
    const bar = roundRect(x0 + 8, y - h / 2 + 8, Math.max(h - 16, w), h - 16, (h - 16) / 2);
    pen.fill(bar, '#6fd08c', 1);
    pen.clipped(bar, () => {
      for (let k = -2; k < 30; k++) {
        const sx = x0 + k * 34 + ((t * 60) % 34);
        pen.fill([{ x: sx, y: y - h }, { x: sx + 16, y: y - h }, { x: sx - 24, y: y + h }, { x: sx - 40, y: y + h }], '#b8f0c4', 0.35);
      }
    });
  }
  pen.stroke([...frame, frame[0]!], 4, INK, 1);
  ctx.restore();
  const pct = `${Math.round(fill * 100)}%`;
  drawTextLine(ctx, pct, TEXT.pct.x, TEXT.pct.y, TEXT.pct.size, 700, shown, PAPER_ON_INK);
  // The stall: a cursor blinking at the bar's end.
  if (fill >= 0.499 && Math.sin(t * 14) > 0) {
    ctx.save();
    ctx.globalAlpha = shown;
    ctx.fillStyle = PAPER;
    ctx.fillRect(x0 + 8 + w + 8, y - h / 2 + 12, 8, h - 24);
    ctx.restore();
  }
}

/** A diver seen from above, upper body only (the rest off the edge): hooded head and mask strap, a tank on the back, arms forward to a slate. */
function drawDiver(ctx: CanvasRenderingContext2D, x: number, y: number, facing: 1 | -1, scale: number, t: number, slate: boolean, boil: number, seed: number): void {
  const pen = livePen(ctx, seed, boil, 1.2);
  const SUIT = '#222c37';
  const SUIT_LIT = '#4a5d70';
  const GLOVE = '#151a20';
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * scale, scale);
  ctx.rotate(0.06 * Math.sin(cycles(5, t) + seed));
  // Arms first (under the shoulders), bent at the elbow, reaching forward.
  for (const k of [-1, 1] as const) {
    const reach = slate ? 0 : 24 * Math.sin(cycles(4, t) + seed + k);
    const arm = [{ x: -40, y: k * 118 }, { x: 110, y: k * 150 + reach }, { x: 250, y: k * (slate ? 70 : 105) + reach }];
    pen.stroke(arm, 74, INK, 1, false);
    pen.stroke(arm, 62, SUIT, 1, false);
    pen.stroke(arm.map((p) => ({ x: p.x, y: p.y - 12 })), 18, SUIT_LIT, 0.55, false);
    const hand = arm[2]!;
    const glove = smoothClosed([{ x: hand.x - 10, y: hand.y - 30 }, { x: hand.x + 50, y: hand.y - 26 }, { x: hand.x + 62, y: hand.y }, { x: hand.x + 50, y: hand.y + 26 }, { x: hand.x - 10, y: hand.y + 30 }], 3);
    pen.fill(glove, GLOVE, 1);
    pen.stroke([...glove, glove[0]!], 4, INK, 1);
  }
  if (slate) {
    const s = roundRect(275, -100, 180, 200, 16);
    pen.fill(s.map((p) => ({ x: p.x + 10, y: p.y + 14 })), '#000000', 0.3);
    pen.fill(s, '#f2f2ea', 1);
    for (let i = 0; i < 5; i++) pen.hair([{ x: 300 + (i % 2) * 10, y: -64 + i * 32 }, { x: 420 - (i % 3) * 20, y: -60 + i * 32 }], 4, '#2b3440', 0.85);
    pen.stroke([...s, s[0]!], 4.5, INK, 1);
    // Thumbs over its edge.
    for (const k of [-1, 1] as const) pen.fill(ellipse(285, k * 70, 22, 16, 10), GLOVE, 1);
  }
  // The torso: broad shoulders tapering back off the edge, lit along one side.
  const torso = smoothClosed([{ x: 10, y: -128 }, { x: -260, y: -118 }, { x: -620, y: -100 }, { x: -620, y: 100 }, { x: -260, y: 118 }, { x: 10, y: 128 }, { x: 40, y: 0 }], 4);
  pen.fill(torso, SUIT, 1);
  pen.fill(smoothClosed([{ x: 0, y: -110 }, { x: -600, y: -86 }, { x: -600, y: -30 }, { x: 0, y: -50 }], 3), SUIT_LIT, 0.45);
  pen.hatch(smoothClosed([{ x: 0, y: 40 }, { x: -620, y: 30 }, { x: -620, y: 100 }, { x: 10, y: 128 }], 3), 12, 0.8, 2, { color: '#06090c', alpha: 0.5 });
  pen.stroke([...torso, torso[0]!], 4.5, INK, 1);
  // The jacket's straps, then the tank on top: yellow, its valve towards the head.
  for (const bx of [-120, -330]) pen.stroke([{ x: bx, y: -118 }, { x: bx - 8, y: 118 }], 16, '#0c1116', 0.9, false);
  const tank = smoothClosed([{ x: -70, y: -38 }, { x: -420, y: -38 }, { x: -440, y: 0 }, { x: -420, y: 38 }, { x: -70, y: 38 }, { x: -50, y: 0 }], 4);
  pen.fill(tank, '#d9a838', 1);
  pen.fill(smoothClosed([{ x: -70, y: -30 }, { x: -420, y: -30 }, { x: -420, y: -8 }, { x: -70, y: -8 }], 2), '#fff0b0', 0.6);
  pen.hatch(smoothClosed([{ x: -70, y: 8 }, { x: -420, y: 8 }, { x: -420, y: 38 }, { x: -70, y: 38 }], 2), 8, 0.8, 1.5, { color: '#7a5a10', alpha: 0.5 });
  pen.stroke([...tank, tank[0]!], 4, INK, 1);
  pen.fill(ellipse(-38, 0, 24, 20, 12), '#9aa3ab', 1);
  pen.stroke([...ellipse(-38, 0, 24, 20, 12), { x: -14, y: 0 }], 3, INK, 1);
  // The head: a hood, the mask's strap round the back of it, the mask's rim showing at the sides.
  const head = ellipse(95, 0, 82, 72, 24);
  pen.fill(head, SUIT, 1);
  pen.fill(ellipse(80, -24, 44, 30, 16), SUIT_LIT, 0.55);
  pen.stroke(arc(95, 0, 74, 66, Math.PI * 0.62, Math.PI * 1.38, 12), 13, '#c9d2da', 1, false);
  for (const k of [-1, 1] as const) pen.fill(ellipse(160, k * 52, 20, 14, 10), '#9fb3c0', 1);
  pen.stroke([...head, head[0]!], 4.5, INK, 1);
  ctx.restore();
  // Bubbles rising from the regulator: growing as they come up to us.
  for (let i = 0; i < 5; i++) {
    const k = ((((t * 0.9 + i / 5 + seed * 0.13) % 1) + 1) % 1);
    const r = (10 + 30 * k) * scale * 1.4;
    const bx = x + facing * scale * (150 + 60 * k) + 18 * Math.sin(i * 2 + t * 3);
    const by = y - scale * (80 + 220 * k);
    ctx.save();
    ctx.globalAlpha = (1 - k) * 0.85;
    ctx.strokeStyle = '#e8f6ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/** The two scientists floating in from either side. */
export function drawDivers(ctx: CanvasRenderingContext2D, amount: number, t: number, boil: number): void {
  if (amount <= 0.01) return;
  const slide = 1 - amount;
  drawDiver(ctx, 150 - 600 * slide, 1000, 1, 0.56, t, true, boil, 3);
  drawDiver(ctx, VIDEO.width - 150 + 600 * slide, 580, -1, 0.5, t, false, boil, 7);
}

/** The sun glowing through the surface, arcing over from left to right. */
export function drawSun(ctx: CanvasRenderingContext2D, arcAt: number, shown: number, t: number): void {
  if (shown <= 0.01) return;
  const x = 120 + 840 * arcAt;
  const y = 520 - 230 * Math.sin(Math.PI * arcAt);
  const warm = Math.sin(Math.PI * Math.min(1, arcAt * 1.15));
  const core = arcAt < 0.6 ? '255,244,200' : '255,170,90';
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(x, y, 0, x, y, 300);
  g.addColorStop(0, `rgba(${core},${(0.9 * shown).toFixed(3)})`);
  g.addColorStop(0.18, `rgba(${core},${(0.6 * shown).toFixed(3)})`);
  g.addColorStop(1, `rgba(${core},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - 300, y - 300, 600, 600);
  // Wavering rays.
  ctx.globalAlpha = 0.5 * shown * (0.6 + 0.4 * warm);
  ctx.strokeStyle = `rgb(${core})`;
  ctx.lineCap = 'round';
  ctx.lineWidth = 8;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + t * 0.6;
    const r0 = 74 + 6 * Math.sin(t * 7 + i);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
    ctx.lineTo(x + Math.cos(a) * (r0 + 46), y + Math.sin(a) * (r0 + 46));
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = shown;
  ctx.fillStyle = `rgb(${core})`;
  ctx.beginPath();
  ctx.arc(x, y, 58 + 3 * Math.sin(t * 5), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A place label: the name, then the year under it. */
export function drawPlace(ctx: CanvasRenderingContext2D, name: number, year: number): void {
  drawTextLine(ctx, 'Great Barrier Reef', VIDEO.width / 2, TEXT.place.y, TEXT.place.size, 700, name, PAPER_ON_INK);
  drawTextLine(ctx, '2011', VIDEO.width / 2, TEXT.year.y, TEXT.year.size, 700, year, GOLD_ON_INK);
}

/** Its name, with a chalk arrow to it. */
export function drawName(ctx: CanvasRenderingContext2D, shown: number, target: Pt): void {
  if (shown <= 0.01) return;
  const { x, y, size } = TEXT.name;
  drawTextLine(ctx, 'wobbegong', x, y, size, 700, shown, GOLD_ON_INK);
  const from = { x: x + 60, y: y + 40 };
  const mid = { x: from.x + 20, y: (from.y + target.y) / 2 + 20 };
  const path = partOf(smoothOpen([from, mid, target], 6), shown);
  chalk(ctx, path, 6, GOLD, shown);
}

/** The bamboo shark's size, by the tape: "3 ft", "1 m" under it. */
export function drawSize(ctx: CanvasRenderingContext2D, shown: number): void {
  drawTextLine(ctx, '3 ft', TEXT.feet.x, TEXT.feet.y, TEXT.feet.size, 700, shown, GOLD_ON_INK);
  drawTextLine(ctx, '1 m', TEXT.metres.x, TEXT.metres.y, TEXT.metres.size, 700, shown * 0.9, PAPER_ON_INK);
}

