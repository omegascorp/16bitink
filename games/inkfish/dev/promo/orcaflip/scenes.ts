import { blob } from '../alvin/art/draw';
import { specks, vignette } from '../alvin/water';
import { INK } from '../../../src/art/pen';
import { burst, rays } from './fx';
import { drawOrcaPose, drawShark, faded, say } from './parts';
import { ADULT_LEN, baseShark, circlers, hookAt, HOOK_PIVOT, sharkAt, strikeOrca, strikePoint } from './poses';
import { TEXT } from './script';
import { adultLabelAt, BIGGEST_AT, gulfAt, HITS, LONG_AT, sizeAt, THEY_AT, UNTIL_AT, viewfinderAt } from './story';
import { drawWhaleShark } from '../foodchain/art/whaleShark';
import { ramp } from '../short';
import { VIDEO } from '../short';

/** The first three scenes: frame 1 and the viewfinder's push-in that ends on it, the adult and the kid, and the hits. */

const SURFACE_Y = -150;
const HOOK_BURST_AXIS = -0.52;
/** The adult, far behind: the tail runs off the left of the frame, the head is in view. */
const ADULT = { x: 215, y: 590, a: 0.02 } as const;

function sea(ctx: CanvasRenderingContext2D, stops: readonly (readonly [number, string])[]): void {
  const g = ctx.createLinearGradient(0, SURFACE_Y, 0, 2600);
  for (const [at, c] of stops) g.addColorStop(at, c);
  ctx.fillStyle = g;
  ctx.fillRect(-2600, SURFACE_Y, 6400, 2600 - SURFACE_Y);
}

/** A small white boat on the surface, with a wake line. */
function boat(ctx: CanvasRenderingContext2D, x: number, t: number): void {
  const y = SURFACE_Y + 6 * Math.sin(t * 1.4);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.02 * Math.sin(t * 1.1));
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  const hull = new Path2D('M-180 -62 L190 -62 L150 22 L-140 22 Z');
  ctx.fillStyle = '#f2efe6';
  ctx.fill(hull);
  ctx.stroke(hull);
  ctx.fillStyle = '#2a6f9c';
  ctx.fillRect(-170, -40, 350, 14);
  const cabin = new Path2D('M-60 -62 L-60 -130 L40 -130 L70 -62 Z');
  ctx.fillStyle = '#e8e2d2';
  ctx.fill(cabin);
  ctx.stroke(cabin);
  ctx.fillStyle = '#5ea6c8';
  ctx.fillRect(-42, -116, 56, 34);
  ctx.beginPath();
  ctx.moveTo(110, -62);
  ctx.lineTo(110, -170);
  ctx.moveTo(110, -170);
  ctx.lineTo(60, -100);
  ctx.stroke();
  ctx.restore();
}

function surface(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.fillStyle = '#d9eef6';
  ctx.fillRect(-2600, -3400, 6400, 3400 + SURFACE_Y);
  blob(ctx, 540, SURFACE_Y - 300, 1500, 500, 0, '255,244,214', 0.5);
  ctx.strokeStyle = 'rgba(240,252,255,0.9)';
  ctx.lineWidth = 9;
  ctx.beginPath();
  for (let x = -600; x <= 1700; x += 40) ctx.lineTo(x, SURFACE_Y + 7 * Math.sin(x * 0.03 + t * 1.5));
  ctx.stroke();
}

/** The viewfinder over the picture: corner brackets, a blinking REC dot, a focus box. */
function viewfinder(ctx: CanvasRenderingContext2D, alpha: number, t: number): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#f6f2e8';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  const [x0, y0, x1, y1, k] = [56, 250, 1024, 1500, 96];
  for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y + sy * k);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * k, y);
    ctx.stroke();
  }
  ctx.lineWidth = 4;
  ctx.strokeRect(VIDEO.width / 2 - 70, 850, 140, 140);
  if (Math.floor(t * 2) % 2 === 0) {
    ctx.fillStyle = '#e0301f';
    ctx.beginPath();
    ctx.arc(130, 330, 20, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  say(ctx, 'REC', TEXT.rec, alpha);
}

/** Frame 1, and the viewfinder's wide shot pushing in to it. */
export function drawHook(ctx: CanvasRenderingContext2D, t: number): void {
  const h = hookAt(t);
  ctx.save();
  ctx.translate(HOOK_PIVOT.x, HOOK_PIVOT.y);
  ctx.scale(h.zoom, h.zoom);
  ctx.translate(-HOOK_PIVOT.x, -HOOK_PIVOT.y);
  surface(ctx, t);
  sea(ctx, [[0, '#4aa6d2'], [0.1, '#1a6ea4'], [0.45, '#08406c'], [1, '#021830']]);
  boat(ctx, 760, t);
  rays(ctx, 0.8, t);
  specks(ctx, t, 40, -22, 0.28);
  drawShark(ctx, h.shark, t);
  drawOrcaPose(ctx, h.orca, t);
  // Bubbles out along the shark's side, leaving the contact itself in plain view.
  burst(ctx, h.impact.x, h.impact.y, h.age, 5, { size: 1.15, axis: HOOK_BURST_AXIS, hole: 150, sand: 0 });
  ctx.restore();
  vignette(ctx, 0.45);
  viewfinder(ctx, viewfinderAt(t), t);
  say(ctx, 'Gulf of California', TEXT.gulf, gulfAt(t));
}

function water(ctx: CanvasRenderingContext2D, top: string, mid: string, bottom: string): void {
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, top);
  g.addColorStop(0.5, mid);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

/** The biggest fish on Earth, pale behind; the kid in front of it, measured. */
export function drawKid(ctx: CanvasRenderingContext2D, t: number): void {
  water(ctx, '#3aa0cc', '#1b73a6', '#0a3f6a');
  rays(ctx, 0.7, t, 5);
  specks(ctx, t, 30, -14, 0.25);
  // The adult, far behind in the haze (faded, not a silhouette: its spots still show), going as the camera moves in on the kid.
  const adult = 0.42 * ramp(t, BIGGEST_AT - 0.1, BIGGEST_AT + 0.3) * (1 - ramp(t, LONG_AT + 0.1, THEY_AT));
  if (adult > 0.005) faded(ctx, (c) => drawWhaleShark(c, ADULT.x, ADULT.y, ADULT_LEN, ADULT.a, t, { tail: t * 1.2 }), adult);
  say(ctx, 'adult · 12 m · 40 ft', TEXT.adult, adultLabelAt(t) * 0.9);
  drawShark(ctx, baseShark(t), t);
  const s = sizeAt(t);
  if (s > 0.01) {
    ctx.save();
    ctx.globalAlpha = s;
    ctx.strokeStyle = '#f6f2e8';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    const w = baseShark(t).len * Math.min(1, s * 1.3);
    ctx.beginPath();
    ctx.moveTo(540 - w / 2, TEXT.bar.y);
    ctx.lineTo(540 + w / 2, TEXT.bar.y);
    ctx.moveTo(540 - w / 2, TEXT.bar.y - 22);
    ctx.lineTo(540 - w / 2, TEXT.bar.y + 22);
    ctx.moveTo(540 + w / 2, TEXT.bar.y - 22);
    ctx.lineTo(540 + w / 2, TEXT.bar.y + 22);
    ctx.stroke();
    ctx.restore();
  }
  say(ctx, '6 m · 20 ft', TEXT.size, s);
  vignette(ctx, 0.35);
}

/** Three orcas hit it from three sides; then it hangs belly-up in the light; then orcas circle it. */
export function drawSpin(ctx: CanvasRenderingContext2D, t: number): void {
  const hang = ramp(t, UNTIL_AT, UNTIL_AT + 0.7);
  water(ctx, '#2a86b6', '#0f5688', '#052849');
  rays(ctx, 0.25 + 0.75 * hang, t);
  specks(ctx, t, 34, -16 * (1 - 0.8 * hang), 0.26);
  const around = circlers(t);
  for (const o of around.filter((x) => x.behind)) drawOrcaPose(ctx, o, t);
  drawShark(ctx, sharkAt(t), t);
  for (const o of around.filter((x) => !x.behind)) drawOrcaPose(ctx, o, t);
  HITS.forEach((h, k) => {
    const o = strikeOrca(k, t);
    if (o) drawOrcaPose(ctx, o, t);
    const at = strikePoint(k);
    burst(ctx, at.x, at.y, t - h, 11 + k * 7, { hole: 110, sand: 0.5 });
  });
  vignette(ctx, 0.3 + 0.4 * hang);
}
