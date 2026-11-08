import { C, heightAt, xAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { PAPER } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import type { Pose } from '../chain';
import { drawTextLine, type TextInk } from '../captions';
import { onScreen as onScreenAt } from '../gameplay/fish';
import { drawCredit, drawFloatText, drawGrowthBar, GROWTH_INK, SCORE_INK } from '../gameplay/hud';
import type { MarkField } from '../gameplay/marks';
import { drawChomp, drawExclaim, drawSuction } from '../gape/effects';
import { drawLights, drawMurky, drawPlayerLight, makeWater } from '../gape/render';
import { drawSnow } from '../gape/snow';
import { clipToGape, drawSwimmer, lipsOf, pointOn, type SwimLook } from '../gape/swimmer';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { renderGulpSwordAudio } from './audio';
import {
  BAR_MARKS, FOCUS, ROT, rotated, BITE_AT, bellySword, biggerText, CAPTIONS, captionAlpha, GULP_AT, growthBar, gulpSnap, LOOP_S, pullAt, SCALE, SCORE_TEXT, scoreText, shake, suction,
  swordAlarm, swordAt, swordMurk, viewAt, viperBelly, viperEyes, viperFish, viperJaw, viperLureGlow, type View, type WorldFish,
} from './story';

/** Draws "how did that fit 4" (story.ts has the choreography). */

/** The screen point the camera centres on: a little above the middle, clear of the captions and the bottom buttons. */
const FIELD: MarkField = { focus: FOCUS, scale: SCALE, loopS: LOOP_S };
const onScreen = (f: WorldFish, v: View): Pose => onScreenAt(f, v, FOCUS);

const PAPER_ON_INK: TextInk = { fill: PAPER, halo: '#05091a' };
/** The viper's skin over its eye, for closed eyes. */
const VIPER_LID = '#8a9fd3';
const CAPTION_LINE = 1.02;
const INK_BLUE = '#1f3f8a';

/** The viper's eye turned in on the sword at its lips: a white eye, the pupil pushed to the nose and down, a second pupil mirroring it. */
function drawCrossedEye(ctx: CanvasRenderingContext2D, sprite: Sprite, you: Pose, look: SwimLook, alpha: number): void {
  const a = ANATOMY.viperfish;
  const ex = xAt(a, a.eye.t);
  const ey = C - heightAt(a, a.eye.t) * 0.3;
  const at = pointOn(sprite, you, look, { x: ex, y: ey });
  const R = a.eye.r * 1.25 * (you.length / (sprite.bodyPx / sprite.res));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(at.x, at.y);
  ctx.scale(you.facing, 1);
  ctx.rotate(-you.tilt);
  ctx.fillStyle = '#fbf6ea';
  ctx.strokeStyle = INK_BLUE;
  ctx.lineWidth = Math.max(2, R * 0.16);
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#0b0f1e';
  // Both pupils crowd the nose-bridge, down and forwards.
  for (const [dx, dy, s] of [[0.42, 0.3, 0.42], [0.2, 0.46, 0.3]] as const) {
    ctx.beginPath();
    ctx.arc(R * dx, R * dy, R * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The sword pressing out through the belly skin from inside: a long, thin, dead straight ridge. */
function drawBellySword(ctx: CanvasRenderingContext2D, sprite: Sprite, you: Pose, look: SwimLook, amount: number): void {
  const b = look.belly;
  if (!b || amount <= 0) return;
  const a = ANATOMY.viperfish;
  const y = C + a.hh * 0.62;
  const p0 = pointOn(sprite, you, look, { x: xAt(a, b.at - b.width * 0.42), y });
  const p1 = pointOn(sprite, you, look, { x: xAt(a, b.at + b.width * 0.42), y });
  const w = you.length * 0.011;
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.lineCap = 'round';
  // The skin lifted over it: a soft shadow below, the ridge itself, and a pale highlight on top.
  const lines: readonly [number, string, number][] = [[w * 3.2, 'rgba(10,16,40,0.35)', 0.9], [w * 1.7, INK_BLUE, 1], [w * 0.6, '#e8eefc', 1]];
  lines.forEach(([width, color, off], i) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y + (i === 0 ? w * 1.6 : i === 2 ? -w * 0.5 : 0) * off);
    ctx.lineTo(p1.x, p1.y + (i === 0 ? w * 1.6 : i === 2 ? -w * 0.5 : 0) * off);
    ctx.stroke();
  });
  ctx.restore();
}

export function createGulpSword(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();
  const viper = makeSprite('viperfish', 6);
  const sword = makeSprite('swordfish', 6);
  const icon = makeSprite('viperfish', 2);
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = VIDEO.width;
  layerCanvas.height = VIDEO.height;
  const layer = layerCanvas.getContext('2d')!;

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    const v = viewAt(t);
    ctx.drawImage(water, 0, 0);
    drawSnow(ctx, FIELD, v, pullAt(t), t);
    const jolt = shake(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);
    // The world is turned about the focus: the lunge climbs the frame.
    ctx.translate(FOCUS.x, FOCUS.y);
    ctx.rotate(-ROT);
    ctx.translate(-FOCUS.x, -FOCUS.y);

    const you = onScreen(viperFish(t), v);
    const snap = gulpSnap(t);
    const eyes = viperEyes(t);
    const look: SwimLook = {
      jaw: viperJaw(t), belly: viperBelly(t), eyes: eyes === 'cross' ? null : eyes, lid: VIPER_LID, squash: 1 - 0.08 * snap, stretch: 1 + 0.05 * snap,
    };
    drawPlayerLight(ctx, you);

    const s = swordAt(t);
    const pose = s.kind === 'gone' ? null : onScreen(s.fish, v);
    const murk = swordMurk(t);
    if (s.kind === 'there' && pose && murk > 0) {
      // Still in the dark ahead. The layer is frame-sized and unturned, so the big fish is centred on it, or the layer's edge would slice it.
      const dx = pose.x - VIDEO.width / 2;
      ctx.save();
      ctx.translate(dx, 0);
      drawMurky(ctx, layer, sword, { ...pose, x: pose.x - dx }, boil, murk, { squash: s.squash, stretch: s.stretch });
      ctx.restore();
      drawSwimmer(ctx, viper, you, boil, look);
    } else if (s.kind === 'there' && pose) {
      // The inside of the mouth, the swordfish going in (only where the open mouth and the water in front of it are), then the viper over it.
      drawSwimmer(ctx, viper, you, boil, { ...look, part: 'mouth' });
      ctx.save();
      clipToGape(ctx, viper, you, look);
      drawSwimmer(ctx, sword, pose, boil, { squash: s.squash, stretch: s.stretch });
      ctx.restore();
      drawSwimmer(ctx, viper, you, boil, { ...look, part: 'body' });
    } else {
      drawSwimmer(ctx, viper, you, boil, look);
    }
    drawLights(ctx, viper, you, look, viperLureGlow(t));
    if (eyes === 'cross') drawCrossedEye(ctx, viper, you, look, 1);
    drawBellySword(ctx, viper, you, look, bellySword(t));

    const lipsAt = lipsOf('viperfish', look.jaw ?? 0).mid;
    const lips = pointOn(viper, you, look, { x: lipsAt.x + 4, y: lipsAt.y });
    drawSuction(ctx, lips, 1, you.length, suction(t), t / 3);
    drawChomp(ctx, you, (t - GULP_AT) / 0.14);
    drawChomp(ctx, you, (t - BITE_AT) / 0.12);
    if (pose && s.kind === 'there') {
      const pop = swordAlarm(t);
      if (pop > 0) drawExclaim(ctx, pose.x + pose.length * 0.34, pose.y - pose.length * 0.12 - 90, 130 * pop, ROT + 0.1);
    }
    ctx.restore();

    const at = rotated(you);
    const score = scoreText(t);
    if (score) drawFloatText(ctx, SCORE_TEXT, at.x + you.length * 0.1, Math.max(560, at.y - you.length * 0.25 - 30 - 70 * score.rise), 84, score.alpha, SCORE_INK);
    const bigger = biggerText(t);
    if (bigger) drawFloatText(ctx, 'Bigger!', at.x, Math.max(560, at.y - you.length * 0.3 - 40 - 70 * bigger.rise), 92, bigger.alpha, GROWTH_INK);
    drawGrowthBar(ctx, icon, 'viperfish', { ...growthBar(t), marks: BAR_MARKS }, t);
    for (const c of CAPTIONS) {
      const alpha = captionAlpha(c, t);
      c.text.split('\n').forEach((row, i) => drawTextLine(ctx, row, VIDEO.width / 2, c.y + i * c.size * CAPTION_LINE, c.size, 700, alpha, PAPER_ON_INK));
    }
    drawCredit(ctx, PAPER_ON_INK);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderGulpSwordAudio };
}
