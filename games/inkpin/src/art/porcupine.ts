import { createRng } from '../logic/rng';
import { ART_RES, INK } from './palette';
import { ellipse, makeCanvas, Pen, type Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * The spiky guard: a crested porcupine, round and grumpy under a fan of
 * striped quills. Landing on it hurts, so it has to be washed away or
 * squashed. Same frame as the boar: faces right, centred on its collision
 * circle, feet at y = 22.
 */
export const PORCUPINE_FRAME = { w: 76, h: 72, ox: 38, oy: 38 } as const;
export type PorcupineMood = 'grump' | 'scared';

const COAT = '#5b4636';
const COAT_LIGHT = '#8a6c52';
const QUILL = '#efe6d2';
const QUILL_DARK = '#2b2420';
const NOSE = '#3a2a24';

export function paintPorcupine(mood: PorcupineMood, boil: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(PORCUPINE_FRAME.w * ART_RES, PORCUPINE_FRAME.h * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(PORCUPINE_FRAME.ox, PORCUPINE_FRAME.oy);
  const pen = new Pen(ctx, 900 + boil * 17, 0.5);
  const scared = mood === 'scared';
  paintShadow(ctx);
  const step = boil === 1 ? 2 : boil === 2 ? -2 : 0;
  for (const [x, dark] of [[-11 - step, true], [8 + step, true], [-7 + step, false], [12 - step, false]] as const) paintLeg(pen, x, dark);
  // Quills raised higher when it's scared, fanned over the back.
  paintQuills(pen, boil, scared ? 1.25 : 1);
  paintBody(pen, ctx);
  paintFace(pen, scared);
  return canvas;
}

function paintShadow(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createRadialGradient(0, 22, 0, 0, 22, 26);
  g.addColorStop(0, 'rgba(40,30,20,0.32)');
  g.addColorStop(1, 'rgba(40,30,20,0)');
  ctx.save();
  ctx.translate(0, 22);
  ctx.scale(1, 0.2);
  ctx.fillStyle = g;
  ctx.fillRect(-28, -28, 56, 56);
  ctx.restore();
}

function paintLeg(pen: Pen, x: number, far: boolean): void {
  const color = far ? mix(COAT, '#000000', 0.3) : mix(COAT, '#000000', 0.12);
  const leg = [{ x: x - 3, y: 12 }, { x: x + 3, y: 12 }, { x: x + 3, y: 21 }, { x: x - 3, y: 21 }];
  pen.fill(leg, color, 1);
  pen.fill(ellipse(x + 1, 21, 3.6, 1.8, 10), '#1f1814', 1);
}

/** Bold quills, striped dark and cream with dark tips, in a fan from the rump over the back. */
function paintQuills(pen: Pen, boil: number, lift: number): void {
  const rng = createRng(41 + boil * 3);
  const n = 15;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    // From pointing back (left) to pointing up, rooted along the back.
    const a = Math.PI * (1.0 + t * 0.52) + (rng() - 0.5) * 0.06;
    const root = { x: -3 + Math.cos(a) * 11, y: 5 + Math.sin(a) * 8 };
    const len = (19 + rng() * 7) * lift * (1 - Math.abs(t - 0.45) * 0.45);
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const half = 2.6;
    const at = (k: number, w: number): Pt => ({ x: root.x + ux * len * k - uy * w, y: root.y + uy * len * k + ux * w });
    const spike = [at(0, -half), at(0.55, -half * 0.7), at(1, 0), at(0.55, half * 0.7), at(0, half)];
    pen.fill(spike, QUILL, 1);
    // A dark band at the root and a dark tip.
    pen.fill([at(0, -half), at(0.32, -half * 0.85), at(0.32, half * 0.85), at(0, half)], QUILL_DARK, 1);
    pen.fill([at(0.78, -half * 0.35), at(1, 0), at(0.78, half * 0.35)], QUILL_DARK, 1);
    pen.stroke([...spike], 0.9, INK, 0.9, false);
  }
}

function paintBody(pen: Pen, ctx: CanvasRenderingContext2D): void {
  const body: Pt[] = ellipse(0, 6, 19, 13, 32);
  const g = ctx.createRadialGradient(4, 0, 2, 0, 6, 22);
  g.addColorStop(0, COAT_LIGHT);
  g.addColorStop(1, COAT);
  ctx.fillStyle = g;
  ctx.beginPath();
  body.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  pen.clipped(body, () => {
    const belly = ctx.createRadialGradient(6, 16, 0, 6, 16, 12);
    belly.addColorStop(0, rgba(COAT_LIGHT, 0.7));
    belly.addColorStop(1, rgba(COAT_LIGHT, 0));
    ctx.fillStyle = belly;
    ctx.fillRect(-12, 6, 30, 14);
  });
  pen.stroke([...body, body[0]!], 1.3, INK, 0.95);
}

function paintFace(pen: Pen, scared: boolean): void {
  // A blunt snout poking out of the front, a round dark nose and whiskers.
  const snout = ellipse(17, 6, 8, 6.5, 18);
  pen.fill(snout, COAT_LIGHT, 1);
  pen.stroke([...snout, snout[0]!], 1, INK, 0.85, false);
  pen.fill(ellipse(24, 5, 2.6, 2.2, 10), NOSE, 1);
  pen.dot(23.5, 4.2, 0.7, '#ffffff', 0.8);
  for (const dy of [-1.5, 1.5]) pen.hair([{ x: 22, y: 6 + dy }, { x: 30, y: 5 + dy * 2.2 }], 0.6, INK, 0.6);
  // A small round ear.
  pen.fill(ellipse(9, -3, 3, 2.6, 10), mix(COAT, '#000000', 0.2), 1);
  // The eye: a grumpy half-lid, or wide with worry.
  const eye = ellipse(14, 1, 2.8, scared ? 3.2 : 2.4, 12);
  pen.fill(eye, '#ffffff', 1);
  pen.stroke([...eye, eye[0]!], 0.6, INK, 0.8, false);
  pen.dot(14.8, scared ? 0.6 : 1.4, scared ? 0.9 : 1.3, '#140f0a');
  if (scared) {
    pen.stroke([{ x: 11, y: -3.5 }, { x: 17, y: -4.5 }], 1.2, INK, 0.9, false);
    pen.dot(7, -6, 1.2, '#9cc6ea', 0.9);
  } else {
    pen.stroke([{ x: 11, y: -2.5 }, { x: 17.5, y: -0.5 }], 1.4, INK, 0.95, false);
  }
  pen.hair(scared ? [{ x: 18, y: 10 }, { x: 20, y: 9 }, { x: 22, y: 10 }] : [{ x: 18, y: 10.5 }, { x: 22, y: 9.5 }], 0.9, INK, 0.9);
}
