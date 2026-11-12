import { bottomAt, C, topAt, xAt } from '../../../src/art/fish/kit';
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
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { steel } from './tint';
import { renderGulpMakoAudio } from './audio';
import {
  BAR_MARKS, BITE_AT, biggerText, CAPTIONS, captionAlpha, finBump, finLight, GULP_AT, growthBar, gulpSnap, LOOP_S, pullAt, SCALE, SCORE_TEXT, scoreText, seam, MAKO_DEPTH,
  makoAlarm, makoAt, makoJaw, makoMurk, makoStretch, shake, suction, SUCK_FROM, viewAt, viperBelly, viperEyes, viperFish, viperJaw, isDessert, type View,
  type WorldFish,
} from './story';

/** Draws "how did that fit 4" (story.ts has the choreography). */

/** The screen point the camera centres on: a little above the middle, clear of the captions and the bottom buttons. */
const FOCUS = { x: VIDEO.width / 2, y: 800 } as const;
const FIELD: MarkField = { focus: FOCUS, scale: SCALE, loopS: LOOP_S };
const onScreen = (f: WorldFish, v: View): Pose => onScreenAt(f, v, FOCUS);
/** The mako lying in the viper's belly, head first and straight, as long as the belly. */
const insidePose = (_t: number, you: Pose): Pose => ({ ...you, shape: 'mako', length: you.length * INSIDE_LEN, effort: 0.2 });

const PAPER_ON_INK: TextInk = { fill: PAPER, halo: '#05091a' };
/** The viper's skin over its eye, for closed eyes. */
const VIPER_LID = '#8a9fd3';
const CAPTION_LINE = 1.02;
const VIPER_LURE = 0.22;
/** The swallowed mako's outline inside the belly: shorter than the viper, along its length. */
const INSIDE_LEN = 0.92;

/** The mako's eye, bigger than the game's pin-prick so the face reads with the sound off: all dark navy with a thin darker rim and a small catchlight, no white. */
function drawMakoEye(ctx: CanvasRenderingContext2D, sprite: Sprite, pose: Pose, look: SwimLook): void {
  const a = ANATOMY.mako;
  const t = 0.11;
  const at = pointOn(sprite, pose, look, { x: xAt(a, t), y: topAt(a, t) + (bottomAt(a, t) - topAt(a, t)) * 0.42 });
  const r = (4.4 * pose.length * (look.squash ?? 1)) / (2 * a.hl);
  ctx.save();
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#0b1426';
  ctx.fill();
  ctx.lineWidth = r * 0.18;
  ctx.strokeStyle = '#040810';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(at.x - pose.facing * r * 0.3, at.y - r * 0.32, r * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = '#f4f7fb';
  ctx.fill();
  ctx.restore();
}

export function createGulpMako(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();
  const viper = makeSprite('viperfish', 6);
  const mako = steel(makeSprite('mako', 6, 'light'));
  const icon = makeSprite('viperfish', 2);
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = VIDEO.width;
  layerCanvas.height = VIDEO.height;
  const layer = layerCanvas.getContext('2d')!;
  // The swallowed mako is drawn here first, so its faintness survives drawSwimmer setting its own alpha.
  const innerCanvas = document.createElement('canvas');
  innerCanvas.width = VIDEO.width;
  innerCanvas.height = VIDEO.height;
  const inner = innerCanvas.getContext('2d')!;
  const makoA = ANATOMY.mako;
  const makoHh = bodyProportions('mako').hh;

  /** Clips to the mako's dorsal fin (the part above its back), so the fin can show out of the dark before the rest does. */
  const clipToFin = (pose: Pose, look: SwimLook): void => {
    const x0 = xAt(makoA, 0.26);
    const x1 = xAt(makoA, 0.46);
    const yTop = C - makoHh * 2.4;
    const yBase = topAt(makoA, 0.4) - 1;
    const corners = [{ x: x0, y: yTop }, { x: x1, y: yTop }, { x: x1, y: yBase }, { x: x0, y: yBase }].map((p) => pointOn(mako, pose, look, p));
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
    const press = finBump(t);
    const drawViper = (): void => {
      if (press > 0.01) {
        // The swallowed mako's outline faintly pressing through the stretched belly: drawn over the viper's own skin only.
        layer.clearRect(0, 0, VIDEO.width, VIDEO.height);
        drawSwimmer(layer, viper, you, boil, look);
        inner.clearRect(0, 0, VIDEO.width, VIDEO.height);
        drawSwimmer(inner, mako, insidePose(t, you), boil, { jaw: 0, squash: 1.0, stretch: 1 });
        layer.save();
        layer.globalCompositeOperation = 'source-atop';
        layer.globalAlpha = Math.min(0.3, 0.22 * press);
        layer.drawImage(innerCanvas, 0, 0);
        layer.restore();
        ctx.drawImage(layerCanvas, 0, 0);
      } else {
        drawSwimmer(ctx, viper, you, boil, look);
      }
      drawLights(ctx, viper, you, look, VIPER_LURE);
    };

    const a = makoAt(t);
    const pose = a.kind === 'gone' ? null : onScreen(a.fish, v);
    // Round the strike the mako's nose is inside the open jaws: the mouth behind it, the viper in front.
    const inJaws = a.kind === 'swallowed' || (a.kind === 'swimming' && !isDessert(t) && (t < SUCK_FROM || seam(t) > -0.3));
    if (pose && a.kind !== 'gone') {
      const makoLook: SwimLook = {
        jaw: makoJaw(t),
        squash: a.kind === 'swallowed' ? a.squash : MAKO_DEPTH,
        stretch: (a.kind === 'swallowed' ? a.stretch : 1) * makoStretch(t),
      };
      if (inJaws) {
        drawSwimmer(ctx, viper, you, boil, { ...look, part: 'mouth' });
        ctx.save();
        clipToGape(ctx, viper, you, look);
        drawSwimmer(ctx, mako, pose, boil, makoLook);
        drawMakoEye(ctx, mako, pose, makoLook);
        ctx.restore();
        drawSwimmer(ctx, viper, you, boil, { ...look, part: 'body' });
        drawLights(ctx, viper, you, look, VIPER_LURE);
      } else {
        drawMurky(ctx, layer, mako, pose, boil, makoMurk(t), makoLook);
        if (makoMurk(t) < 0.2) drawMakoEye(ctx, mako, pose, makoLook);
                const fin = finLight(t);
        if (fin > 0.01) {
          // The dorsal fin cuts the dark before the rest of it shows.
          ctx.save();
          ctx.globalAlpha = Math.min(1, fin);
          clipToFin(pose, makoLook);
          drawSwimmer(ctx, mako, pose, boil, makoLook);
          ctx.restore();
        }
        drawViper();
      }
    } else {
      drawViper();
    }

    const lipsAt = lipsOf('viperfish', look.jaw ?? 0).mid;
    const lips = pointOn(viper, you, look, { x: lipsAt.x + 4, y: lipsAt.y });
    drawSuction(ctx, lips, 1, you.length, suction(t), t / 3);
    drawChomp(ctx, you, (t - GULP_AT) / 0.14);
    drawChomp(ctx, you, (t - BITE_AT) / 0.12);
    if (pose && a.kind === 'swimming') {
      const pop = makoAlarm(t);
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

  return { loopSeconds: LOOP_S, draw, audio: renderGulpMakoAudio };
}
