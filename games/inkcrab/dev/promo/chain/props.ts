import { BLUE, HIGHLIGHT, INK, PAPER_FILL, RED } from '../../../src/art/palette';
import { Pen, type Pt } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine } from '../captions';
import { clamp01, lerp, smooth } from '../short';

/**
 * The sketchbook marks over the scene, all in the game's ballpoint: labels
 * with leader lines, the hop arcs, the clock and the stopwatch, the size
 * ruler, the queue's ropes and the heading. Each takes how much of it shows
 * (0 .. 1).
 */
const BRASS = '#c9a54a';

/** A label in ink handwriting, with a leader line from it to what it names. */
export function callout(ctx: CanvasRenderingContext2D, text: string, at: Pt, to: Pt | null, alpha: number, size = 64, boil = 0): void {
  if (alpha <= 0) return;
  if (to) {
    const from = { x: at.x, y: to.y > at.y ? at.y + size * 0.25 : at.y - size * 0.8 };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    const pen = new Pen(ctx, 210 + boil, 0.8);
    const a = { x: from.x + (dx / len) * 10, y: from.y + (dy / len) * 10 };
    const b = { x: to.x - (dx / len) * 8, y: to.y - (dy / len) * 8 };
    pen.stroke([a, { x: lerp(a.x, b.x, 0.5) + 8, y: lerp(a.y, b.y, 0.5) }, b], 3.2, INK, 0.9, false);
    ctx.restore();
  }
  drawTextLine(ctx, text, at.x, at.y, size, 700, alpha);
}

/**
 * An arc with an arrowhead from `a` over to `b`, `u` 0 .. 1 of it drawn;
 * dashed for a hint. It bows `lift` px up, or, for a hop mostly up or down
 * (round a turn of the queue), out sideways towards the nearer edge.
 */
export function drawHopArc(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, lift: number, u: number, alpha: number, dashed: boolean, color = INK): void {
  if (u <= 0 || alpha <= 0) return;
  const sideways = Math.abs(b.y - a.y) > Math.abs(b.x - a.x);
  const bend = sideways ? { x: (a.x > 540 ? 1 : -1) * lift, y: 0 } : { x: 0, y: -lift };
  const at = (s: number): Pt => ({ x: lerp(a.x, b.x, s) + bend.x * 4 * s * (1 - s), y: lerp(a.y, b.y, s) + bend.y * 4 * s * (1 - s) });
  const n = Math.max(2, Math.ceil(24 * u));
  const pts = Array.from({ length: n + 1 }, (_, i) => at((u * i) / n));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = dashed ? 4 : 5.5;
  if (dashed) ctx.setLineDash([12, 10]);
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.setLineDash([]);
  const tip = pts[pts.length - 1]!;
  const prev = at(Math.max(0, u - 0.06));
  const ang = Math.atan2(tip.y - prev.y, tip.x - prev.x);
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x - 20 * Math.cos(ang + s * 0.5), tip.y - 20 * Math.sin(ang + s * 0.5));
  }
  ctx.stroke();
  ctx.restore();
}

/** A round face in pen with its tick marks, as for the clock and the stopwatch. */
function face(ctx: CanvasRenderingContext2D, pen: Pen, c: Pt, r: number): void {
  const ring = Array.from({ length: 41 }, (_, i) => ({ x: c.x + Math.cos((i / 40) * Math.PI * 2) * r, y: c.y + Math.sin((i / 40) * Math.PI * 2) * r }));
  pen.fill(ring, PAPER_FILL, 1);
  pen.stroke(ring, 5, INK, 1);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const r0 = k % 3 === 0 ? r * 0.72 : r * 0.8;
    pen.hair([{ x: c.x + Math.cos(a) * r0, y: c.y + Math.sin(a) * r0 }, { x: c.x + Math.cos(a) * r * 0.9, y: c.y + Math.sin(a) * r * 0.9 }], k % 3 === 0 ? 3.2 : 2, INK, 0.9);
  }
}

function hand(pen: Pen, c: Pt, turns: number, len: number, width: number, color = INK): void {
  const a = turns * Math.PI * 2 - Math.PI / 2;
  pen.stroke([c, { x: c.x + Math.cos(a) * len * 0.5, y: c.y + Math.sin(a) * len * 0.5 }, { x: c.x + Math.cos(a) * len, y: c.y + Math.sin(a) * len }], width, color, 1, false);
}

/** The clock, popped in by `show`, its hour hand at `turns` and the minute hand whirling twelve times as fast. */
export function drawClock(ctx: CanvasRenderingContext2D, c: Pt, r: number, show: number, turns: number, boil: number): void {
  if (show <= 0) return;
  const s = smooth(show);
  ctx.save();
  ctx.globalAlpha = clamp01(show * 2);
  ctx.translate(c.x, c.y);
  ctx.scale(s, s);
  ctx.rotate(0.06 * Math.sin(turns * 9));
  const pen = new Pen(ctx, 260 + boil, 0.8);
  const o = { x: 0, y: 0 };
  // Two bells on top, as an alarm clock has.
  for (const side of [-1, 1]) pen.fill(Array.from({ length: 13 }, (_, i) => ({ x: side * r * 0.62 + Math.cos(Math.PI + (i / 12) * Math.PI) * r * 0.3, y: -r * 0.86 + Math.sin(Math.PI + (i / 12) * Math.PI) * r * 0.3 })), INK, 0.85);
  face(ctx, pen, o, r);
  hand(pen, o, turns, r * 0.5, 7);
  hand(pen, o, turns * 12, r * 0.78, 4.5);
  pen.dot(0, 0, 7, INK);
  ctx.restore();
}

/** The stopwatch: a crown button, a red second hand that jumps a tick at a time. */
export function drawStopwatch(ctx: CanvasRenderingContext2D, c: Pt, r: number, show: number, ticks: number, press: number, boil: number): void {
  if (show <= 0) return;
  const s = smooth(show);
  ctx.save();
  ctx.globalAlpha = clamp01(show * 2);
  ctx.translate(c.x, c.y);
  ctx.scale(s, s);
  const pen = new Pen(ctx, 280 + boil, 0.8);
  const o = { x: 0, y: 0 };
  const crown = -r - 22 + 8 * press;
  pen.fill([{ x: -16, y: crown }, { x: 16, y: crown }, { x: 16, y: crown + 16 }, { x: -16, y: crown + 16 }], INK, 0.9);
  pen.stroke([{ x: 0, y: crown + 16 }, { x: 0, y: -r }], 9, INK, 1, false);
  face(ctx, pen, o, r);
  hand(pen, o, ticks / 12, r * 0.8, 5, RED);
  pen.dot(0, 0, 7, RED);
  ctx.restore();
}

/** Points every `step` px along a polyline, each with how far along it is (px). */
function resample(path: readonly Pt[], step: number): { readonly p: Pt; readonly at: number }[] {
  const out: { p: Pt; at: number }[] = [{ p: path[0]!, at: 0 }];
  let at = 0;
  for (let i = 1; i < path.length; i++) {
    const [a, b] = [path[i - 1]!, path[i]!];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = step; d <= len; d += step) out.push({ p: { x: lerp(a.x, b.x, d / len), y: lerp(a.y, b.y, d / len) }, at: at + d });
    at += len;
  }
  return out;
}

/**
 * The size ruler, laid along the queue's lane: a highlighter band from thick
 * (the biggest) to thin (the smallest), drawn in from the head as `u` goes
 * 0 .. 1, with an ink arrowhead at its tip. The band goes on a scratch
 * canvas first so its overlapping strokes don't darken where they meet.
 */
export function drawLane(ctx: CanvasRenderingContext2D, scratch: CanvasRenderingContext2D, path: readonly Pt[], u: number): void {
  if (u <= 0) return;
  const pts = resample(path, 6);
  const total = pts[pts.length - 1]!.at;
  const shown = pts.filter((q) => q.at <= total * clamp01(u));
  if (shown.length < 2) return;
  const widthAt = (at: number): number => lerp(40, 7, at / total);
  scratch.clearRect(0, 0, scratch.canvas.width, scratch.canvas.height);
  scratch.save();
  scratch.strokeStyle = HIGHLIGHT;
  scratch.lineCap = 'round';
  for (let i = 1; i < shown.length; i++) {
    scratch.lineWidth = widthAt(shown[i]!.at);
    scratch.beginPath();
    scratch.moveTo(shown[i - 1]!.p.x, shown[i - 1]!.p.y);
    scratch.lineTo(shown[i]!.p.x, shown[i]!.p.y);
    scratch.stroke();
  }
  scratch.restore();
  ctx.save();
  ctx.globalAlpha = 0.6 * clamp01(u * 6);
  ctx.drawImage(scratch.canvas, 0, 0);
  ctx.restore();
  const tip = shown[shown.length - 1]!;
  const prev = shown[Math.max(0, shown.length - 4)]!;
  const ang = Math.atan2(tip.p.y - prev.p.y, tip.p.x - prev.p.x);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const side of [-1, 1]) {
    ctx.moveTo(tip.p.x + Math.cos(ang) * 10, tip.p.y + Math.sin(ang) * 10);
    ctx.lineTo(tip.p.x - 24 * Math.cos(ang + side * 0.55), tip.p.y - 24 * Math.sin(ang + side * 0.55));
  }
  ctx.stroke();
  ctx.restore();
}

/** A queue barrier: brass posts with a navy rope slung between them, in pen. */
export function drawRope(ctx: CanvasRenderingContext2D, base: number, posts: readonly number[], boil: number): void {
  const H = 78;
  const top = base - H;
  const pen = new Pen(ctx, 320 + boil, 0.7);
  for (let i = 1; i < posts.length; i++) {
    const [a, b] = [posts[i - 1]!, posts[i]!];
    const sag = Array.from({ length: 13 }, (_, k) => {
      const s = k / 12;
      return { x: lerp(a, b, s), y: top + 8 + 26 * 4 * s * (1 - s) };
    });
    pen.stroke(sag, 7, BLUE, 0.85, false);
    pen.hair(sag.map((p) => ({ x: p.x, y: p.y + 2.5 })), 1.2, INK, 0.6);
  }
  for (const x of posts) {
    const pole = [{ x: x - 5, y: top }, { x: x + 5, y: top }, { x: x + 5, y: base }, { x: x - 5, y: base }];
    pen.fill(pole, BRASS, 0.85);
    pen.stroke([...pole, pole[0]!], 1.8, INK, 0.9, false);
    const foot = Array.from({ length: 13 }, (_, k) => ({ x: x + Math.cos((k / 12) * Math.PI * 2) * 22, y: base + Math.sin((k / 12) * Math.PI * 2) * 6 }));
    pen.fill(foot, BRASS, 0.85);
    pen.stroke(foot, 1.8, INK, 0.9, false);
    pen.fill(Array.from({ length: 13 }, (_, k) => ({ x: x + Math.cos((k / 12) * Math.PI * 2) * 9, y: top - 4 + Math.sin((k / 12) * Math.PI * 2) * 8 })), BRASS, 1);
    pen.circle(x, top - 4, 9, 1.8, INK);
  }
}

/** Text written out from the left, `u` 0 .. 1 of it, in the handwriting font, with a double underline once done. */
export function drawWritten(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, u: number, alpha: number, boil: number): void {
  if (u <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  const w = ctx.measureText(text).width;
  ctx.beginPath();
  ctx.rect(x - w / 2 - 20, y - size * 1.2, (w + 40) * clamp01(u), size * 1.6);
  ctx.clip();
  drawTextLine(ctx, text, x, y, size, 700, alpha);
  ctx.restore();
  const line = clamp01((u - 0.7) / 0.3);
  if (line <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const pen = new Pen(ctx, 290 + boil, 1);
  for (const [dy, k] of [[size * 0.22, 1], [size * 0.36, 0.8]] as const) {
    const a = { x: x - (w / 2) * k, y: y + dy };
    pen.stroke([a, { x: lerp(a.x, x + (w / 2) * k, line), y: y + dy + 3 }], 4, INK, 0.9, false);
  }
  ctx.restore();
}

/** Three dots of waiting over a crab, appearing one by one. */
export function drawWaiting(ctx: CanvasRenderingContext2D, at: Pt, show: number, t: number, phase: number): void {
  if (show <= 0) return;
  ctx.save();
  ctx.globalAlpha = show;
  ctx.fillStyle = INK;
  for (let k = 0; k < 3; k++) {
    const on = clamp01((((t * 1.6 + phase) % 1) * 3 - k) * 3) + 0.25;
    ctx.globalAlpha = show * Math.min(1, on);
    ctx.beginPath();
    ctx.arc(at.x - 30 + k * 30, at.y, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
