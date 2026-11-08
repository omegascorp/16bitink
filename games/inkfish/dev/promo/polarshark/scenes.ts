import { INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { drawTextLine } from '../captions';
import { lerp } from '../short';
import { onAnimal, type Placed } from '../seal/story';
import { VIDEO } from '../short';
import { drawGreenlandShark } from './art/greenlandShark';
import { type BearPlaced, drawPolarBear } from './art/polarBear';
import { drawBubbleStream, drawFloe, drawRays, drawSnow, drawSurface, drawVignette, ICE_TEXT, RED_TEXT } from './scene';
import { TEXT } from './script';
import {
  bearTagAt, bobAt, catchTagAt, deadQuestionAt, foundTagAt, fragmentAt, HOOK_SURFACE_Y, hookBear, hookShark, huntBear, huntFogAt, huntQuestionAt, huntShark, insideShark, jawFlashAt, LOOP_S, mphTagAt, needleAt,
  placeAt, placeDrift, shrugBear, shrugQuestionAt, shrugShark, sharkTagAt, sinkingBear, sizeTagAt, slowShark, slowTagAt, snailX, speedTagAt, stomachGlowAt, stomachTagAt, STOMACH, type Swimmer, xrayAt, yearAt,
} from './story';

/** The seven scenes, each drawn on its own layer over a backdrop it picks (made once by render.ts). */

export interface Backdrops {
  readonly arctic: HTMLCanvasElement;
  readonly twilight: HTMLCanvasElement;
  readonly deep: HTMLCanvasElement;
  readonly shallows: HTMLCanvasElement;
  readonly gloom: HTMLCanvasElement;
}

const CX = VIDEO.width / 2;
const penFor = (ctx: CanvasRenderingContext2D, seed: number, boil: number): Pen => new Pen(ctx, seed * 31 + boil * 977, 1.2);

function glow(ctx: CanvasRenderingContext2D, at: Pt, rx: number, ry: number, rgb: string, alpha: number, rot = 0): void {
  if (alpha <= 0.003) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(at.x, at.y);
  ctx.rotate(rot);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(0.5, `rgba(${rgb},${alpha * 0.4})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx);
  ctx.restore();
}

function shark(ctx: CanvasRenderingContext2D, s: Swimmer, boil: number, look: { dark?: number } = {}): void {
  drawGreenlandShark(ctx, s, { bend: s.bend, open: s.open, ...look }, boil);
}

// ---------------------------------------------------------------- frame 1 (and the shrug, which ends on it)

let scratch: ReturnType<typeof makeCanvas> | null = null;

/** The bear at the surface: the part under the water tinted teal by it. */
function drawSurfaceBear(ctx: CanvasRenderingContext2D, bear: BearPlaced, boil: number, surfaceY: number): void {
  scratch ??= makeCanvas(VIDEO.width, VIDEO.height);
  const c = scratch.ctx;
  c.clearRect(0, 0, VIDEO.width, VIDEO.height);
  drawPolarBear(c, bear, { effort: 1 }, boil);
  c.save();
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = 'rgba(24,130,146,0.5)';
  c.fillRect(0, surfaceY + 12, VIDEO.width, VIDEO.height);
  c.restore();
  ctx.drawImage(scratch.canvas, 0, 0);
}

function drawPair(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops, s: Swimmer, bear: BearPlaced): void {
  ctx.drawImage(b.arctic, 0, 0);
  const loop = t / LOOP_S;
  drawRays(ctx, loop, HOOK_SURFACE_Y, 1);
  drawFloe(ctx, -80, 260, HOOK_SURFACE_Y, 190, 11, boil);
  drawFloe(ctx, 900, 1200, HOOK_SURFACE_Y, 150, 23, boil);
  drawSurfaceBear(ctx, bear, boil, HOOK_SURFACE_Y);
  drawSurface(ctx, HOOK_SURFACE_Y + 24, t, loop, 0.85);
  shark(ctx, s, boil);
  const shadow = ctx.createLinearGradient(0, 980, 0, 1500);
  shadow.addColorStop(0, 'rgba(1,10,16,0)');
  shadow.addColorStop(1, 'rgba(1,10,16,0.75)');
  ctx.fillStyle = shadow;
  ctx.fillRect(0, 980, VIDEO.width, 940);
  drawBubbleStream(ctx, onAnimal(s, { x: 118, y: 6 }), loop, 4, 0.8);
  drawSnow(ctx, loop, 0.8);
  drawVignette(ctx, 0.35);
}

/** Frame 1: from underwater, the bear paddling at the bright surface between floes, the huge Greenland shark gliding under it. */
export function drawHook(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  const s = hookShark(t);
  drawPair(ctx, t, boil, b, s, hookBear(t));
  glow(ctx, onAnimal(s, STOMACH), 230, 80, '255,235,170', 0.45 * stomachGlowAt(t), s.rot);
  drawTextLine(ctx, 'polar bear', CX, TEXT.bearTag.y, TEXT.bearTag.size, 700, bearTagAt(t), ICE_TEXT);
  drawTextLine(ctx, 'stomach', CX, TEXT.stomachTag.y, TEXT.stomachTag.size, 700, stomachTagAt(t), ICE_TEXT);
}

/** Nobody knows: the same picture, the shark shrugging, a question mark bobbing over it. */
export function drawShrug(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  drawPair(ctx, t, boil, b, shrugShark(t), shrugBear(t));
  const a = shrugQuestionAt(t);
  drawTextLine(ctx, '?', 960, TEXT.shrug.y + bobAt(t), TEXT.shrug.size, 700, a, RED_TEXT);
}

// ---------------------------------------------------------------- Svalbard

export function drawPlace(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  const drift = placeDrift(t);
  ctx.drawImage(b.twilight, drift - 60, 0, VIDEO.width + 120, VIDEO.height);
  const pen = penFor(ctx, 5, boil);
  // Floes on the dark water, nearer ones bigger, drifting a little at different speeds.
  for (const [x, y, w, k] of [[170, 930, 360, 0.5], [760, 880, 280, 0.35], [470, 1010, 520, 1], [900, 1090, 420, 1.4], [60, 1150, 360, 1.6]] as const) {
    const cx = x + drift * k * 0.6;
    const top = [{ x: cx - w / 2, y }, { x: cx - w * 0.3, y: y - 22 * (0.6 + k * 0.4) }, { x: cx + w * 0.1, y: y - 28 * (0.6 + k * 0.4) }, { x: cx + w / 2, y }, { x: cx + w * 0.36, y: y + 22 * (0.6 + k * 0.4) }, { x: cx - w * 0.3, y: y + 24 * (0.6 + k * 0.4) }];
    ctx.save();
    ctx.beginPath();
    top.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    const g = ctx.createLinearGradient(0, y - 30, 0, y + 30);
    g.addColorStop(0, '#f4f0fa');
    g.addColorStop(0.5, '#b9c4e0');
    g.addColorStop(1, '#6c80ac');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    pen.stroke([...top, top[0]!], 3, INK, 0.8, true);
  }
  drawSnow(ctx, t / LOOP_S, 0.5, 77);
  drawVignette(ctx, 0.3);
  drawTextLine(ctx, 'Svalbard', CX, TEXT.place.y, TEXT.place.size, 700, placeAt(t), ICE_TEXT);
  const y = yearAt(t);
  drawTextLine(ctx, '2008', CX, TEXT.year.y, TEXT.year.size * (0.9 + 0.1 * y), 700, y, RED_TEXT);
}

// ---------------------------------------------------------------- inside the shark

/** A small jaw fragment with a few teeth, in screen px, centred on `at`, `size` wide. */
export function drawJawBone(ctx: CanvasRenderingContext2D, at: Pt, size: number, rot: number, boil: number): void {
  const k = size / 140;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(rot);
  ctx.scale(k, k);
  // A U-shaped lower jaw: an arc, thick at the middle, with a row of teeth on its inner edge.
  const arc = (r: number, n: number): Pt[] => Array.from({ length: n + 1 }, (_, i) => {
    const a = Math.PI * (0.13 + (0.74 * i) / n);
    return { x: Math.cos(a) * r, y: -62 + Math.sin(a) * r };
  });
  const bone: Pt[] = [...arc(98, 16), ...arc(74, 16).reverse()];
  const teeth = Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI * (0.2 + 0.12 * i + 0.06);
    const at = (r: number, da = 0): Pt => ({ x: Math.cos(a + da) * r, y: -62 + Math.sin(a + da) * r });
    return [at(75, -0.045), at(50), at(75, 0.045)] as const;
  });
  const pen = penFor(ctx, 9, boil);
  for (const tooth of teeth) {
    ctx.beginPath();
    tooth.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    const g = ctx.createLinearGradient(tooth[0].x, 0, tooth[2].x, 0);
    g.addColorStop(0, '#fff8e4');
    g.addColorStop(1, '#cdbf98');
    ctx.fillStyle = g;
    ctx.fill();
    pen.stroke([...tooth, tooth[0]], 2, INK, 0.9, true);
  }
  ctx.beginPath();
  bone.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -5, 0, 36);
  g.addColorStop(0, '#fff6dc');
  g.addColorStop(0.55, '#e4d6ae');
  g.addColorStop(1, '#a8966a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 12; i++) pen.hair([{ x: -70 + i * 12, y: 8 + (i % 3) * 3 }, { x: -66 + i * 12, y: 34 }], 1.2, '#8a7a50', 0.25);
  ctx.restore();
  pen.stroke([...bone, bone[0]!], 3, INK, 0.95, true);
  ctx.restore();
}

export function drawInside(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  ctx.drawImage(b.deep, 0, 0);
  drawRays(ctx, t / LOOP_S, 0, 0.5, '150,230,230');
  const s = insideShark(t);
  shark(ctx, s, boil);
  const x = xrayAt(t);
  const c = onAnimal(s, STOMACH);
  const frag = fragmentAt(t);
  if (x > 0.01) {
    // The belly goes see-through: a cool glow, the stomach drawn faintly inside it.
    glow(ctx, c, 330, 120, '90,230,230', 0.55 * x, s.rot);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(s.rot);
    ctx.globalAlpha = x;
    ctx.beginPath();
    ctx.ellipse(0, 0, 220, 70, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(150,250,240,0.2)';
    ctx.fill();
    ctx.setLineDash([14, 10]);
    ctx.strokeStyle = 'rgba(220,255,250,0.85)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(200,255,250,0.35)';
    ctx.lineWidth = 3;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 70 - 16, -56);
      ctx.quadraticCurveTo(i * 70 + 8, 0, i * 70 - 16, 56);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (frag > 0.01) {
    const pop = 0.7 + 0.3 * frag;
    ctx.save();
    ctx.globalAlpha = frag;
    drawJawBone(ctx, c, 190 * pop * (1 + 0.15 * jawFlashAt(t)), s.rot - 0.12, boil);
    ctx.restore();
    glow(ctx, c, 200, 120, '255,244,210', 0.9 * jawFlashAt(t));
  }
  drawBubbleStream(ctx, onAnimal(s, { x: 100, y: 6 }), t / LOOP_S, 4, 0.5);
  drawSnow(ctx, t / LOOP_S, 0.6, 99);
  drawVignette(ctx, 0.35);
  drawTextLine(ctx, 'Greenland shark', CX, TEXT.sharkTag.y, TEXT.sharkTag.size, 700, sharkTagAt(t), ICE_TEXT);
  const a = sizeTagAt(t);
  drawTextLine(ctx, "bear's jaw", CX, TEXT.jawTag.y, TEXT.jawTag.size, 700, a, RED_TEXT);
  drawTextLine(ctx, '10 cm', CX, TEXT.cm.y, TEXT.cm.size * (0.92 + 0.08 * a), 700, a, ICE_TEXT);
  drawTextLine(ctx, '4 in', CX, TEXT.inch.y, TEXT.inch.size, 700, a, ICE_TEXT);
}

// ---------------------------------------------------------------- one mile an hour

function drawGauge(ctx: CanvasRenderingContext2D, at: Pt, r: number, needle: number, boil: number): void {
  const pen = penFor(ctx, 13, boil);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -r, 0, 0);
  g.addColorStop(0, '#fffaf0');
  g.addColorStop(1, '#e8dcc0');
  ctx.fillStyle = g;
  ctx.fill();
  // Coloured band, then ticks.
  for (const [a0, a1, col] of [[0, 0.12, '#58b868'], [0.12, 0.55, '#f0c04a'], [0.55, 1, '#d8503c']] as const) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.86, Math.PI + a0 * Math.PI, Math.PI + a1 * Math.PI);
    ctx.strokeStyle = col;
    ctx.lineWidth = r * 0.1;
    ctx.stroke();
  }
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI + (i / 10) * Math.PI;
    pen.hair([{ x: Math.cos(a) * r * 0.7, y: Math.sin(a) * r * 0.7 }, { x: Math.cos(a) * r * 0.8, y: Math.sin(a) * r * 0.8 }], 3, INK, 0.8);
  }
  const a = Math.PI + needle * Math.PI;
  pen.stroke([{ x: 0, y: 0 }, { x: Math.cos(a) * r * 0.78, y: Math.sin(a) * r * 0.78 }], 7, '#b02a1c', 1, true);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  pen.stroke([{ x: -r, y: 0 }, { x: -r, y: 0 }, ...Array.from({ length: 25 }, (_, i) => ({ x: -Math.cos((i / 24) * Math.PI) * r, y: -Math.sin((i / 24) * Math.PI) * r })), { x: r, y: 0 }, { x: -r, y: 0 }], 5, INK, 1, true);
  ctx.restore();
}

function drawSnail(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, t: number, boil: number): void {
  const pen = penFor(ctx, 21, boil);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  const stretch = 1 + 0.06 * Math.sin(t * 5);
  const body: Pt[] = [{ x: -60, y: 4 }, { x: -40 * stretch, y: -8 }, { x: 20, y: -10 }, { x: 52 * stretch, y: -16 }, { x: 64 * stretch, y: -34 }, { x: 74 * stretch, y: -30 }, { x: 74 * stretch, y: -12 }, { x: 70 * stretch, y: 6 }, { x: 20, y: 10 }, { x: -50, y: 10 }];
  ctx.beginPath();
  body.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = '#d8b88e';
  ctx.fill();
  pen.stroke([...body, body[0]!], 3, INK, 0.9, true);
  pen.stroke([{ x: 68 * stretch, y: -30 }, { x: 70 * stretch, y: -48 }], 3, INK, 0.9, false);
  pen.stroke([{ x: 74 * stretch, y: -30 }, { x: 82 * stretch, y: -46 }], 3, INK, 0.9, false);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(70 * stretch, -50, 4, 0, Math.PI * 2);
  ctx.arc(83 * stretch, -48, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-6, -34, 44, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(-20, -52, 4, -6, -34, 48);
  g.addColorStop(0, '#f6c690');
  g.addColorStop(1, '#a8603a');
  ctx.fillStyle = g;
  ctx.fill();
  pen.stroke([...Array.from({ length: 40 }, (_, i) => ({ x: -6 + (i / 40) * 36 * Math.cos(i * 0.5), y: -34 + (i / 40) * 36 * Math.sin(i * 0.5) }))], 3, '#6a3a1e', 0.9, false);
  pen.stroke(Array.from({ length: 25 }, (_, i) => ({ x: -6 + 44 * Math.cos((i / 24) * Math.PI * 2), y: -34 + 44 * Math.sin((i / 24) * Math.PI * 2) })), 3.5, INK, 1, true);
  ctx.restore();
}

export function drawSlow(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  ctx.drawImage(b.shallows, 0, 0);
  drawRays(ctx, t / LOOP_S, 0, 1.3, '255,255,235');
  const s = slowShark(t);
  shark(ctx, s, boil);
  drawSnail(ctx, snailX(t), 1070, 140, t, boil);
  drawGauge(ctx, { x: CX, y: 690 }, 170, needleAt(t), boil);
  drawSnow(ctx, t / LOOP_S, 0.5, 31);
  drawTextLine(ctx, 'slow', CX, TEXT.slowTag.y, TEXT.slowTag.size, 700, slowTagAt(t), RED_TEXT);
  drawTextLine(ctx, '1.2 km/h', CX, TEXT.kmh.y, TEXT.kmh.size, 700, speedTagAt(t), { fill: '#ffffff', halo: '#0b4a5a' });
  drawTextLine(ctx, '0.8 mph', CX, TEXT.mph.y, TEXT.mph.size, 700, mphTagAt(t), { fill: '#ffffff', halo: '#0b4a5a' });
}

// ---------------------------------------------------------------- caught? / found dead?

export function drawHunt(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  ctx.drawImage(b.gloom, 0, 0);
  drawRays(ctx, t / LOOP_S, 0, 0.5, '120,200,210');
  drawPolarBear(ctx, huntBear(t), { effort: 1 }, boil);
  shark(ctx, huntShark(t), boil);
  const fog = huntFogAt(t);
  if (fog > 0.01) {
    const g = ctx.createLinearGradient(0, 600, 0, 1400);
    g.addColorStop(0, 'rgba(1,8,12,0)');
    g.addColorStop(1, `rgba(1,8,12,${fog})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 600, VIDEO.width, 900);
  }
  drawSnow(ctx, t / LOOP_S, 0.4, 41);
  drawVignette(ctx, 0.5);
  drawTextLine(ctx, 'caught it?', CX, TEXT.catchTag.y, TEXT.catchTag.size, 700, catchTagAt(t), ICE_TEXT);
  drawTextLine(ctx, '?', 900, TEXT.question.y, TEXT.question.size * (1 + 0.06 * Math.sin(t * 6)), 700, huntQuestionAt(t), RED_TEXT);
}

export function drawDead(ctx: CanvasRenderingContext2D, t: number, boil: number, b: Backdrops): void {
  ctx.drawImage(b.gloom, 0, 0);
  drawRays(ctx, t / LOOP_S, 0, 0.3, '90,160,180');
  const bear = sinkingBear(t);
  glow(ctx, { x: bear.x, y: bear.y }, 300, 130, '70,120,140', 0.25);
  ctx.save();
  ctx.filter = 'brightness(0.5) saturate(0.45)';
  drawPolarBear(ctx, bear, { effort: 0.25 }, boil);
  ctx.restore();
  drawBubbleStream(ctx, { x: bear.x + 70, y: bear.y - 40 }, t / LOOP_S, 2, 0.4);
  drawSnow(ctx, t / LOOP_S, 0.35, 57);
  drawVignette(ctx, 0.6);
  drawTextLine(ctx, 'or found it?', CX, TEXT.foundTag.y, TEXT.foundTag.size, 700, foundTagAt(t), { fill: '#cfe4ea', halo: '#02080c' });
  drawTextLine(ctx, '?', 900, TEXT.question.y, TEXT.question.size, 700, deadQuestionAt(t), { fill: '#9fb8c2', halo: '#02080c' });
  void lerp;
}
