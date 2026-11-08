import { makeCanvas } from '../../../src/art/pen';
import { rgba } from '../../../src/art/paint';
import { RED_FINISH } from '../../../src/art/brineFauna';
import { RED } from '../../../src/art/palette';
import { lerp, ramp, VIDEO } from '../short';
import { bakeSprite, drawSprite, type Sprite } from '../sprites';
import { bubblesIn, drawBubbles } from './bubbles';
import { makeChaseBack } from './cave';
import {
  BODY_FRAME, BODY_RES, drawBaleen, drawBody, drawBodyLights, drawEyes, drawLowerJaw, drawLowerLights, drawLowerSheen, drawThroat, drawUpperJaw, drawUpperLights, drawUpperSheen, EYE_FAR, EYE_GLOW, EYE_NEAR, HEAD_FRAME, HEAD_RES, HEAD_UNIT, HINGE_Y,
} from './mouthArt';
import { CHARGE_AT, chaseClock, CHASE_AT, fleeAt, headAt, LOOP_S, type HeadPose } from './story';
import type { Figures } from './figures';

const LAMP = '#ffd9a0';
/** How tall the tiny prospector stands against the mouth (screen px per drawing unit). */
export const FLEE_SCALE = 3.2;

/** One layer of the head, opening about the hinge by `ky`. */
function layer(ctx: CanvasRenderingContext2D, s: Sprite, boil: number, head: HeadPose, ky: number): void {
  const k = HEAD_UNIT * head.scale;
  ctx.save();
  ctx.translate(head.x, head.y + HINGE_Y * k);
  ctx.scale(k, k * ky);
  ctx.translate(0, -HINGE_Y);
  ctx.scale(1 / s.res, 1 / s.res);
  ctx.drawImage(s.frames[boil % s.frames.length]!, -s.frame.ox * s.res, -s.frame.oy * s.res);
  ctx.restore();
}

function glowAt(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** The deep water over the whole animal, baked once (it goes on with multiply): dim everywhere, the edges falling off into the dark. */
function makeGrade(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(VIDEO.width + 120, VIDEO.height + 120);
  ctx.fillStyle = '#8580bb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const g = ctx.createRadialGradient(canvas.width / 2, 1040, 380, canvas.width / 2, 1040, 1180);
  g.addColorStop(0, 'rgba(20, 14, 60, 0)');
  g.addColorStop(0.6, 'rgba(20, 14, 60, 0.45)');
  g.addColorStop(1, 'rgba(8, 6, 26, 0.92)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Faint water rushing past, raked out from the head as it comes: every streak's cycle divides the loop. */
function drawStreaks(ctx: CanvasRenderingContext2D, t: number, cx: number, cy: number, strength: number): void {
  ctx.save();
  ctx.strokeStyle = '#b9b2e6';
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const a = i * 2.399;
    const u = (((t / LOOP_S) * 9 + i * 0.137) % 1 + 1) % 1;
    const r0 = 340 + 1000 * u * u;
    const r1 = r0 + 40 + 220 * u;
    ctx.globalAlpha = 0.16 * strength * Math.min(1, u * 5, (1 - u) * 5);
    ctx.lineWidth = 2 + 2 * u;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.restore();
}

/** The charge and the chase: the head growing out of the dark behind the tiny prospector. */
export function makeChaseScene(figures: Figures): (ctx: CanvasRenderingContext2D, t: number, boil: number) => void {
  const head = (draw: Parameters<typeof bakeSprite>[3], seed: number, finished = true): Sprite => bakeSprite(HEAD_FRAME, HEAD_RES, seed, draw, finished ? RED_FINISH : undefined, RED);
  const body = bakeSprite(BODY_FRAME, BODY_RES, 7500, drawBody, RED_FINISH, RED);
  const bodyLights = bakeSprite(BODY_FRAME, BODY_RES, 7510, drawBodyLights);
  const throat = head(drawThroat, 7520, false);
  const lower = head(drawLowerJaw, 7530);
  const upper = head(drawUpperJaw, 7540);
  const baleen = head(drawBaleen, 7545, false);
  const eyes = head(drawEyes, 7548, false);
  const upperLights = bakeSprite(HEAD_FRAME, 4, 7550, drawUpperLights);
  const lowerLights = bakeSprite(HEAD_FRAME, 4, 7560, drawLowerLights);
  const upperSheen = bakeSprite(HEAD_FRAME, 4, 7570, drawUpperSheen);
  const lowerSheen = bakeSprite(HEAD_FRAME, 4, 7580, drawLowerSheen);
  const back = makeChaseBack();
  const grade = makeGrade();

  return (ctx, t, boil) => {
    const pose = headAt(t);
    const flee = fleeAt(t);
    const g = pose.gape;
    const upperKy = lerp(0.2, 1, g);
    const lowerKy = lerp(0.13, 1, g);
    ctx.drawImage(back, -60 + (pose.x - 540) * 0.04, -60 + (pose.y - 1060) * 0.03);
    const speed = ramp(chaseClock(t), CHARGE_AT, CHASE_AT);
    drawStreaks(ctx, t, pose.x, pose.y, speed);
    drawBubbles(ctx, bubblesIn(t, 16, 3.1, { x0: -20, x1: 1100, y0: -40, y1: 1960, rMin: 5, rMax: 15 }), 0.7);

    layer(ctx, body, boil, pose, 1);
    layer(ctx, throat, boil, pose, lerp(0.16, 1, g));
    layer(ctx, baleen, boil, pose, upperKy);
    layer(ctx, lower, boil, pose, lowerKy);
    layer(ctx, upper, boil, pose, upperKy);

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(grade, -60, -60);
    ctx.restore();

    // Far off it's lost in the dark: only the eyes and the lights come first.
    const fog = 0.9 * (1 - ramp(pose.scale, 0.42, 0.72));
    if (fog > 0) {
      ctx.fillStyle = rgba('#0c0820', fog);
      ctx.fillRect(-80, -80, VIDEO.width + 160, VIDEO.height + 160);
    }

    // After the grade, what shines: the rows of lights and the great eyes.
    // Eyes and lights sit on the head's sides, so they stay put while the lips part.
    const sideKy = lerp(0.74, 1, g);
    layer(ctx, eyes, boil, pose, sideKy);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = pose.lit;
    layer(ctx, bodyLights, boil, pose, 1);
    layer(ctx, upperLights, boil, pose, sideKy);
    layer(ctx, lowerLights, boil, pose, sideKy);
    layer(ctx, upperSheen, boil, pose, upperKy);
    layer(ctx, lowerSheen, boil, pose, lowerKy);
    const k = HEAD_UNIT * pose.scale;
    const eyeY = (y: number): number => pose.y + HINGE_Y * k + (y - HINGE_Y) * k * sideKy;
    glowAt(ctx, pose.x + EYE_NEAR.x * k, eyeY(EYE_NEAR.y), 230 * pose.scale, EYE_GLOW, 0.34);
    glowAt(ctx, pose.x + EYE_FAR.x * k, eyeY(EYE_FAR.y), 170 * pose.scale, EYE_GLOW, 0.3);
    ctx.restore();

    // The trail of air and the lamp, then the tiny figure itself.
    drawBubbles(ctx, bubblesIn(t, 14, 7.7, { x0: flee.x - 170, x1: flee.x - 30, y0: flee.y - 170, y1: flee.y + 60, rMin: 3, rMax: 10 }), 0.9);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glowAt(ctx, flee.x + 6, flee.y - 8, 210, LAMP, 0.34);
    glowAt(ctx, flee.x + 6, flee.y - 8, 86, LAMP, 0.42);
    ctx.restore();
    drawSprite(ctx, figures.fly, boil, { x: flee.x, y: flee.y, scale: FLEE_SCALE, rotation: flee.tilt, facing: flee.facing });
  };
}
