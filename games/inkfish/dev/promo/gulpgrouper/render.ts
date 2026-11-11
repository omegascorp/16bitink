import { C, heightAt, topAt, xAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { bodyProportions } from '../../../src/art/fishArt';
import { INK, PAPER } from '../../../src/art/pen';
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
import { lerp, VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { goldGrouper } from './tint';
import { renderGulpGrouperAudio } from './audio';
import {
  BAR_MARKS, BITE_AT, biggerText, CAPTIONS, captionAlpha, finBump, finLight, GULP_AT, growthBar, gulpSnap, LOOP_S, pullAt, SCALE, SCORE_TEXT, scoreText, seam, GROUPER_DEPTH,
  grouperAlarm, grouperAt, grouperEyeWide, grouperJaw, grouperMurk, grouperStretch, shake, suction, SUCK_FROM, viewAt, viperBelly, viperEyes, viperFish, viperJaw, isDessert, type View,
  type WorldFish,
} from './story';

/** Draws "how did that fit 4" (story.ts has the choreography). */

/** The screen point the camera centres on: a little above the middle, clear of the captions and the bottom buttons. */
const FOCUS = { x: VIDEO.width / 2, y: 800 } as const;
const FIELD: MarkField = { focus: FOCUS, scale: SCALE, loopS: LOOP_S };
const onScreen = (f: WorldFish, v: View): Pose => onScreenAt(f, v, FOCUS);

const PAPER_ON_INK: TextInk = { fill: PAPER, halo: '#05091a' };
/** The viper's skin over its eye, for closed eyes. */
const VIPER_LID = '#8a9fd3';
const CAPTION_LINE = 1.02;
const VIPER_LURE = 0.22;
/** The viper's back, and the same skin stretched thin over the fin's point. */
const SKIN = '#8597c1';
const SKIN_GONE = 'rgba(133,151,193,0)';
const SKIN_STRETCHED = '#c9d5f2';
/** Where the fin presses out, 0 nose .. 1 tail base, and its height in body lengths. */
const FIN_ALONG = { from: 0.46, to: 0.62 } as const;
const FIN_TALL = 0.19;

/** The grouper's eye gone wide: a white ring round a shrunken pupil, looking at the teeth, and a raised lid. */
function drawWideEye(ctx: CanvasRenderingContext2D, sprite: Sprite, pose: Pose, look: SwimLook, wide: number): void {
  const a = ANATOMY.grouper;
  const at = pointOn(sprite, pose, look, { x: xAt(a, a.eye.t), y: C - heightAt(a, a.eye.t) * 0.3 });
  const r = (a.eye.r * pose.length * (1 + 0.5 * wide)) / (2 * a.hl);
  ctx.save();
  ctx.globalAlpha = Math.min(1, wide * 3);
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.lineWidth = r * 0.2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(at.x + pose.facing * r * 0.34, at.y + r * 0.08, r * 0.34, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(at.x, at.y, r * 1.42, -Math.PI * 0.8, -Math.PI * 0.2);
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.17;
  ctx.stroke();
  ctx.restore();
}

/**
 * The swallowed grouper's dorsal fin pressing out of the belly's top: one
 * triangle of the viper's own skin, raked towards its head (the grouper went in
 * nose first), stretched pale at the point. Its root fades into the back, over
 * the body's outline, so it is the belly's skin pushed out, not a fin laid on it.
 */
function drawFinBump(ctx: CanvasRenderingContext2D, sprite: Sprite, pose: Pose, look: SwimLook, fin: number): void {
  const a = ANATOMY.viperfish;
  const on = (t: number): { readonly x: number; readonly y: number } => pointOn(sprite, pose, look, { x: xAt(a, t), y: topAt(a, t) });
  const front = on(FIN_ALONG.from);
  const back = on(FIN_ALONG.to);
  const root = { x: (front.x + back.x) / 2, y: (front.y + back.y) / 2 };
  const apex = { x: lerp(back.x, front.x, 0.74), y: Math.min(front.y, back.y) - pose.length * FIN_TALL * fin };
  const fade = pose.length * 0.07;
  const trace = (): void => {
    ctx.moveTo(back.x, back.y);
    ctx.quadraticCurveTo(lerp(back.x, apex.x, 0.62), lerp(back.y, apex.y, 0.38), apex.x, apex.y);
    ctx.quadraticCurveTo(lerp(front.x, apex.x, 0.72), lerp(front.y, apex.y, 0.36), front.x, front.y);
  };
  const bottom = root.y + fade;
  const skin = ctx.createLinearGradient(apex.x, apex.y, apex.x, bottom);
  skin.addColorStop(0, SKIN_STRETCHED);
  skin.addColorStop((root.y + fade * 0.45 - apex.y) / (bottom - apex.y), SKIN);
  skin.addColorStop(1, SKIN_GONE);
  ctx.save();
  ctx.beginPath();
  trace();
  ctx.bezierCurveTo(front.x, bottom + fade, back.x, bottom + fade, back.x, back.y);
  ctx.closePath();
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.beginPath();
  trace();
  ctx.lineWidth = pose.length * 0.016;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = a.ink ?? INK;
  ctx.stroke();
  ctx.restore();
}

export function createGulpGrouper(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();
  const viper = makeSprite('viperfish', 6);
  const grouper = goldGrouper(makeSprite('grouper', 6, 'light'));
  const icon = makeSprite('viperfish', 2);
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = VIDEO.width;
  layerCanvas.height = VIDEO.height;
  const layer = layerCanvas.getContext('2d')!;
  const grouperA = ANATOMY.grouper;
  const grouperHh = bodyProportions('grouper').hh;

  /** Clips to the grouper's dorsal fin (the part above its back), so the fin can show out of the dark before the rest does. */
  const clipToFin = (pose: Pose, look: SwimLook): void => {
    const x0 = xAt(grouperA, 0.26);
    const x1 = xAt(grouperA, 0.46);
    const yTop = C - grouperHh * 2.4;
    const yBase = topAt(grouperA, 0.4) - 1;
    const corners = [{ x: x0, y: yTop }, { x: x1, y: yTop }, { x: x1, y: yBase }, { x: x0, y: yBase }].map((p) => pointOn(grouper, pose, look, p));
    ctx.beginPath();
    corners.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.clip();
  };

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    const v = viewAt(t);
    ctx.drawImage(water, 0, 0);
    drawSnow(ctx, FIELD, v, pullAt(t), t);
    const jolt = shake(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);

    const you = onScreen(viperFish(t), v);
    const snap = gulpSnap(t);
    const look: SwimLook = {
      jaw: viperJaw(t), belly: viperBelly(t), eyes: viperEyes(t), lid: VIPER_LID, squash: 1 - 0.08 * snap, stretch: 1 + 0.05 * snap,
    };
    drawPlayerLight(ctx, you);
    const drawViper = (): void => {
      drawSwimmer(ctx, viper, you, boil, look);
      drawLights(ctx, viper, you, look, VIPER_LURE);
    };

    const a = grouperAt(t);
    const pose = a.kind === 'gone' ? null : onScreen(a.fish, v);
    // Round the strike the grouper's nose is inside the open jaws: the mouth behind it, the viper in front.
    const inJaws = a.kind === 'swallowed' || (a.kind === 'swimming' && !isDessert(t) && (t < SUCK_FROM || seam(t) > -0.3));
    if (pose && a.kind !== 'gone') {
      const grouperLook: SwimLook = {
        jaw: grouperJaw(t),
        squash: a.kind === 'swallowed' ? a.squash : GROUPER_DEPTH,
        stretch: (a.kind === 'swallowed' ? a.stretch : 1) * grouperStretch(t),
      };
      const wide = grouperEyeWide(t);
      if (inJaws) {
        drawSwimmer(ctx, viper, you, boil, { ...look, part: 'mouth' });
        ctx.save();
        clipToGape(ctx, viper, you, look);
        drawSwimmer(ctx, grouper, pose, boil, grouperLook);
        if (wide > 0) drawWideEye(ctx, grouper, pose, grouperLook, wide);
        ctx.restore();
        drawSwimmer(ctx, viper, you, boil, { ...look, part: 'body' });
        drawLights(ctx, viper, you, look, VIPER_LURE);
      } else {
        drawMurky(ctx, layer, grouper, pose, boil, grouperMurk(t), grouperLook);
        if (wide > 0) drawWideEye(ctx, grouper, pose, grouperLook, wide);
        const fin = finLight(t);
        if (fin > 0.01) {
          // The dorsal fin cuts the dark before the rest of it shows.
          ctx.save();
          ctx.globalAlpha = Math.min(1, fin);
          clipToFin(pose, grouperLook);
          drawSwimmer(ctx, grouper, pose, boil, grouperLook);
          ctx.restore();
        }
        drawViper();
      }
    } else {
      drawViper();
    }

    const bump = finBump(t);
    if (bump > 0.01) drawFinBump(ctx, viper, you, look, bump);

    const lipsAt = lipsOf('viperfish', look.jaw ?? 0).mid;
    const lips = pointOn(viper, you, look, { x: lipsAt.x + 4, y: lipsAt.y });
    drawSuction(ctx, lips, 1, you.length, suction(t), t / 3);
    drawChomp(ctx, you, (t - GULP_AT) / 0.14);
    drawChomp(ctx, you, (t - BITE_AT) / 0.12);
    if (pose && a.kind === 'swimming') {
      const pop = grouperAlarm(t);
      if (pop > 0) drawExclaim(ctx, pose.x - pose.length * 0.3, pose.y - pose.length * 0.15 - 90, 130 * pop, -0.12);
    }
    ctx.restore();

    const score = scoreText(t);
    if (score) drawFloatText(ctx, SCORE_TEXT, you.x + you.length * 0.26, Math.max(560, you.y - you.length * 0.25 - 30 - 70 * score.rise), 84, score.alpha, SCORE_INK);
    const bigger = biggerText(t);
    if (bigger) drawFloatText(ctx, 'Bigger!', Math.max(170, you.x - you.length * 0.3), Math.max(560, you.y - you.length * 0.3 - 40 - 70 * bigger.rise), 92, bigger.alpha, GROWTH_INK);
    drawGrowthBar(ctx, icon, 'viperfish', { ...growthBar(t), marks: BAR_MARKS }, t);
    for (const c of CAPTIONS) {
      const alpha = captionAlpha(c, t);
      c.text.split('\n').forEach((row, i) => drawTextLine(ctx, row, VIDEO.width / 2, c.y + i * c.size * CAPTION_LINE, c.size, 700, alpha, PAPER_ON_INK));
    }
    drawCredit(ctx, PAPER_ON_INK);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderGulpGrouperAudio };
}
