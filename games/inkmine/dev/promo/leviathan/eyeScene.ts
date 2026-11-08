import { makeDraw, oval, pt, type Draw } from '../../../src/art/kit';
import { blob } from '../../../src/art/creatures/flesh';
import { dab, mix, rgba, SHADOW, soft } from '../../../src/art/paint';
import { VIDEO } from '../short';
import { bakeSprite, drawSprite, type Sprite } from '../sprites';
import { createRng } from '../../../src/logic/rng';
import type { Figures } from './figures';
import { BACK, BELLY, CRUST, EYE_GLOW, greatEye, JAW, SPOT } from './mouthArt';
import { EYE_OPEN_AT, eyeOpenAt, eyeZoomAt } from './story';

const UNIT = 4;
const EYE_C = pt(0, 0);
const EYE_R = 92;
const SKIN_FRAME = { w: 340, h: 560, ox: 170, oy: 260 };

/** The old hide round the eye, seen close: spots, scars, salt, deep folds. */
function drawHide(d: Draw): void {
  const { ctx } = d.pen;
  const box = [pt(-170, -260), pt(170, -260), pt(170, 300), pt(-170, 300)];
  d.pen.fill(box, BACK, 1);
  const g = ctx.createRadialGradient(-30, -60, 40, -30, -60, 330);
  g.addColorStop(0, rgba(mix(BACK, JAW, 0.45), 0.9));
  g.addColorStop(1, rgba('#141030', 0.95));
  ctx.fillStyle = g;
  ctx.fillRect(-170, -260, 340, 560);
  const rng = createRng(8200);
  for (let i = 0; i < 110; i++) d.pen.dot(-170 + rng() * 340, -260 + rng() * 560, 1.2 + rng() * 3, SPOT, 0.3 + rng() * 0.25);
  d.pen.stipple(box, 7000, () => 0.5, 0.75, mix(BACK, SHADOW, 0.6));
  for (let k = 0; k < 16; k++) {
    const y = -230 + k * 36;
    const line = Array.from({ length: 9 }, (_, i) => pt(-170 + i * 43, y + Math.sin(i * 0.7 + k) * 15 + (Math.abs(i - 4) * 4)));
    soft(ctx, 1.4, () => d.pen.hair(line, 3.2, mix(BACK, SHADOW, 0.7), 0.5));
    d.pen.hair(line.map((p) => pt(p.x, p.y + 2.6)), 0.9, mix(BELLY, BACK, 0.4), 0.28);
  }
  for (const [x, y, rx, ry] of [[-110, -190, 44, 20], [120, 200, 54, 20], [-130, 220, 34, 14], [130, -210, 30, 16]] as const) {
    const patch = blob(pt(x, y), rx, ry, 0.8, 8210 + x, 22);
    dab(d, patch, mix(CRUST, BACK, 0.55), 0.5, 4);
    d.pen.stipple(patch, 460, () => 0.6, 0.7, mix(CRUST, BACK, 0.2));
  }
  dab(d, oval(0, 0, 150, 120, 30), '#0d0a1c', 0.5, 26);
}

/** Cut in on the eye: shut in the silence, then it opens, and it's looking at you. */
export function makeEyeScene(figures: Figures): (ctx: CanvasRenderingContext2D, t: number, boil: number) => void {
  const hide: Sprite = bakeSprite(SKIN_FRAME, 3.4, 8300, drawHide);
  return (ctx, t, boil) => {
    const open = eyeOpenAt(t);
    const z = eyeZoomAt(t);
    const k = UNIT * z;
    ctx.fillStyle = '#0d0a1c';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    ctx.save();
    ctx.translate(540, 880);
    drawSprite(ctx, hide, boil, { x: 0, y: 0, scale: k });
    ctx.scale(k, k);
    // Shut, the lid lies over a dark eye; open, the same lid lifts on the light.
    const d = makeDraw(ctx, 8400 + boil, boil, 0, '#141030');
    greatEye(d, EYE_C, EYE_R, 1, Math.max(0.04, open));
    ctx.restore();

    // What it sees: the small lit figure, tiny in the pupil's edge.
    const seen = Math.max(0, Math.min(1, (t - EYE_OPEN_AT - 0.28) / 0.2));
    if (seen > 0) drawSprite(ctx, figures.fly, boil, { x: 540 + 112 * z, y: 880 + 20 * z, scale: 1.5 * z, alpha: 0.9 * seen, rotation: 0.3 });

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const r = 760 * z;
    const g = ctx.createRadialGradient(540, 880, 0, 540, 880, r);
    g.addColorStop(0, rgba(EYE_GLOW, 0.34 * open));
    g.addColorStop(1, rgba(EYE_GLOW, 0));
    ctx.fillStyle = g;
    ctx.fillRect(540 - r, 880 - r, r * 2, r * 2);
    ctx.restore();
  };
}
