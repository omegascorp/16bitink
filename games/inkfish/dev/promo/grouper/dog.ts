import { INK, makeCanvas, PAPER, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { drawTextLine } from '../captions';
import { RED } from './marks';

/**
 * "…like a hunting dog": an inset of a pointer on point, drawn with the
 * game's pen (a boil frame each): body low and rigid, neck and nose
 * stretched straight ahead, the near foreleg lifted and folded, the tail
 * straight out behind, a liver-ticked coat shaded with hatching, and a red
 * sight-line on from its nose.
 */

const W = 400;
const H = 260;
const GROUND = 240;
const COAT = '#f6f0e2';
const COAT_FAR = '#ddd4c2';
const LIVER = '#7e4a2c';

const pts = (...xy: number[]): Pt[] => Array.from({ length: xy.length / 2 }, (_, i) => ({ x: xy[2 * i]!, y: xy[2 * i + 1]! }));

/** Rump to withers in one rigid line, the neck carrying it on to the head, the belly tucked up. */
const BODY = pts(88, 104, 140, 96, 200, 96, 250, 94, 292, 88, 312, 114, 288, 146, 260, 172, 215, 166, 175, 150, 138, 156, 102, 158, 76, 132);
const HEAD = pts(292, 88, 300, 72, 326, 68, 344, 78, 378, 84, 388, 94, 383, 106, 350, 110, 320, 114, 312, 114);
const EAR = pts(318, 76, 305, 86, 300, 120, 314, 128, 328, 94);
const SADDLE = pts(150, 97, 214, 97, 226, 124, 190, 136, 158, 128);
const HAUNCH = pts(88, 106, 122, 100, 130, 130, 106, 146, 82, 128);
const CAP = pts(300, 72, 326, 68, 342, 78, 328, 88, 304, 88);
/** The far legs (drawn first, in shadow) and the near ones: the near foreleg folded up at the wrist, its paw hanging clear of the ground. */
const FAR_LEGS: readonly Pt[][] = [pts(256, 160, 262, 200, 268, 236), pts(132, 150, 148, 190, 126, 216, 134, 236)];
const NEAR_LEGS: readonly Pt[][] = [pts(106, 148, 124, 190, 100, 216, 108, 236), pts(244, 162, 254, 190, 278, 198, 272, 214)];
const TAIL = pts(84, 106, 48, 101, 12, 96);

function leg(pen: Pen, line: readonly Pt[], coat: string, width: number): void {
  pen.stroke(line, width + 6, INK, 1, false);
  pen.stroke(line, width, coat, 1, false);
  // Shade down the back of the leg.
  pen.hair(line.map((p) => ({ x: p.x - width * 0.3, y: p.y })), 1.4, INK, 0.45);
}

function drawDog(pen: Pen): void {
  pen.stroke([{ x: 8, y: GROUND }, { x: W - 8, y: GROUND }], 2.4, INK, 0.6, false);
  pen.hatch(pts(20, GROUND, 300, GROUND, 290, GROUND + 10, 30, GROUND + 10), 5, 0.2, 1, { alpha: 0.3 });
  for (const l of FAR_LEGS) leg(pen, l, COAT_FAR, 16);
  // The tail, tapering straight out behind.
  pen.stroke(TAIL, 15, INK, 1, false);
  pen.stroke(TAIL, 8, COAT, 1, false);
  pen.fill(BODY, COAT, 1);
  pen.clipped(BODY, () => {
    pen.hatch(BODY, 5.5, 0.85, 1.1, { onlyBelow: 128, alpha: 0.5 });
    pen.hatch(BODY, 9, -0.7, 0.9, { onlyBelow: 140, alpha: 0.35 });
  });
  pen.fill(SADDLE, LIVER, 0.9);
  pen.fill(HAUNCH, LIVER, 0.85);
  for (let i = 0; i < 46; i++) pen.dot(96 + ((i * 41) % 190), 108 + ((i * 23) % 44), 1.8, LIVER, 0.75);
  pen.closed(BODY, 3.6);
  for (const l of NEAR_LEGS) leg(pen, l, COAT, 18);
  pen.fill(HEAD, COAT, 1);
  pen.clipped(HEAD, () => pen.hatch(HEAD, 5, 0.6, 1, { onlyBelow: 100, alpha: 0.45 }));
  pen.fill(CAP, LIVER, 0.9);
  pen.closed(HEAD, 3.4);
  pen.fill(EAR, LIVER, 1);
  pen.closed(EAR, 2.8);
  pen.dot(334, 82, 4.6);
  pen.dot(385, 93, 6);
  pen.hair(pts(383, 104, 362, 107, 348, 105), 2);
  // Muscle along the shoulder and thigh, under tension.
  pen.hair(pts(236, 104, 248, 132, 250, 156), 1.6, INK, 0.6);
  pen.hair(pts(96, 112, 114, 132, 112, 150), 1.6, INK, 0.6);
}

/** The dog's drawing, one canvas per boil frame. */
export function makeDog(): readonly HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(W, H);
    drawDog(new Pen(ctx, 5501 + f * 977, 1.1));
    return canvas;
  });
}

/** The inset: a paper disc at `at`, `r` its radius, the pointer on point inside, a red line on from its nose, "hunting dog" under it; popped to `s`. */
export function drawDogInset(ctx: CanvasRenderingContext2D, frames: readonly HTMLCanvasElement[], boil: number, at: Pt, r: number, s: number): void {
  if (s <= 0) return;
  // Off-centre to the left, leaving room ahead of its nose for the line.
  const k = (1.7 * r) / W;
  const left = -0.6 * W * k;
  const top = -0.5 * H * k;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.drawImage(frames[boil % frames.length]!, left, top, W * k, H * k);
  // Its point: a dashed red line straight on from the nose.
  const nose = { x: left + 388 * k, y: top + 93 * k };
  ctx.strokeStyle = RED;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.moveTo(nose.x + 12, nose.y);
  ctx.lineTo(r - 18, nose.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(r - 34, nose.y - 13);
  ctx.lineTo(r - 18, nose.y);
  ctx.lineTo(r - 34, nose.y + 13);
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.restore();
  drawTextLine(ctx, 'hunting dog', at.x, at.y + (r + 62) * s, 64 * s, 700, Math.min(1, s * 2));
}
