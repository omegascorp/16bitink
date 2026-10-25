import { BOIL_FRAMES } from '../../../src/art/textures';
import { clamp01, lerp, ramp, smooth } from '../short';
import type { Sprite } from '../sprites';
import { drawDogfish } from './dogfish';
import { curlArm } from './geom';
import { type Body, drawArm, drawBody, eyeOnScreen } from './octoArt';
import { BAD_AT, cycles, IDEA_AT } from './story';
import { drawGrade, drawRays, drawSpecks, drawVignette, drawWash } from './water';

/**
 * "Bad idea…": close on the octopus's eye in the tank. A dogfish glides past
 * just below it; the bar pupil follows it; the lid narrows; one arm
 * tip creeps up from below towards it. The water goes dark and a red pulse
 * beats at the edges.
 */

const FROM = BAD_AT - 0.06;
const SPAN = 1.2;
/** Where the near eye sits on screen. */
const EYE_AT = { x: 370, y: 640 } as const;

/** The shark gliding past behind, screen px. */
function sharkX(t: number): number {
  return lerp(-120, 1180, (t - FROM) / SPAN);
}

export function eyeBody(t: number): Body {
  const sx = sharkX(t);
  // The head fills the top of the picture, its mantle off the top of the frame; it looks down at the shark passing below.
  const posed: Body = { x: 0, y: 0, angle: -0.06, scale: 5.0, lean: 0, breathe: 1, gaze: { x: 0, y: 0 }, lid: 0.2, brow: 0, flush: 0.1, lineK: 0.34, turn: 0 };
  const off = eyeOnScreen(posed, 0);
  const base: Body = { ...posed, x: EYE_AT.x - off.x, y: EYE_AT.y - off.y };
  const eye = EYE_AT;
  const narrow = ramp(t, IDEA_AT - 0.1, IDEA_AT + 0.4);
  return {
    ...base,
    y: base.y - 24 * smooth((t - FROM) / SPAN),
    gaze: { x: Math.max(-1, Math.min(1, (sx - eye.x - 160) / 420)), y: 0.75 },
    lid: lerp(0.18, 0.42, narrow),
    brow: lerp(0.1, 0.85, narrow),
    flush: 0.1 + 0.25 * narrow,
  };
}

export function drawEyeScene(ctx: CanvasRenderingContext2D, paper: HTMLCanvasElement, dogfish: Sprite, t: number, boil: number): void {
  drawWash(ctx, paper, 'rgba(22,66,74,0.95)', 'rgba(6,20,26,0.98)');
  drawRays(ctx, t, 0.08, 0, 1400);
  drawSpecks(ctx, t, '#d8e8e4', 0.8);
  const body = eyeBody(t);
  drawBody(ctx, body, 6201 + (boil % BOIL_FRAMES) * 977);
  // The shark gliding past just below, unaware.
  drawDogfish(ctx, dogfish, { x: sharkX(t), y: 1060, length: 560, facing: 1, tilt: 0.03, beat: t * 2 * Math.PI * 1.4, effort: 0.5 }, boil);
  // The arm tip creeping up from below, reaching after the shark.
  const creep = smooth(clamp01((t - (FROM + 0.25)) / 0.95));
  if (creep > 0) {
    const path = curlArm({ x: 1060, y: 1500 }, -1.75 + 0.12 * Math.sin(cycles(5, t)), 160 + 560 * creep, -2.2 + 1.0 * creep, 0.4, t * 6, 34);
    drawArm(ctx, path, { w0: 150, wEnd: 0.04, side: -1, seed: 6101 + (boil % BOIL_FRAMES) * 977, lineK: 0.8 });
  }
  // Dark closing in, and a red pulse at the edges on the beat.
  drawVignette(ctx, 0.75);
  const pulse = Math.max(0, Math.sin(((t - FROM) / 0.42) * Math.PI * 2 - 0.4));
  drawVignette(ctx, 0.28 * pulse, '120,10,8');
  drawGrade(ctx, '#200508', 0.12);
}
