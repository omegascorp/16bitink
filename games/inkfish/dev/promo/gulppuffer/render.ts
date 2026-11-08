import { PAPER } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import { drawTextLine, type TextInk } from '../captions';
import type { Pose } from '../chain';
import { asPose } from '../gameplay/fish';
import { drawCredit, drawFloatText, drawGrowthBar, floatLife, SCORE_INK } from '../gameplay/hud';
import { drawExclaim, drawSuction } from '../gape/effects';
import { drawLights, drawPlayerLight, makeWater } from '../gape/render';
import { clipToGape, drawSwimmer, lipsOf, pointOn, type SwimLook } from '../gape/swimmer';
import { VIDEO, type Short } from '../short';
import { makeSprite } from '../sprites';
import { renderGulpPufferAudio } from './audio';
import { drawPufferFace, drawSpines, drawViperEyes } from './puffer';
import {
  BAR_MARKS, CAPTIONS, FOCUS, captionAlpha, growthBar, jolt, LOOP_S, pufferAt, puffAlarm, raspberry, SCORE_AT, SCORE_TEXT, shake, smug, suction, swell, viperBelly,
  viperEyes, viperFish, viperJaw, toScreen, viewAt,
} from './story';

/** Draws "never swallow a pufferfish" (story.ts has the choreography). */

const PAPER_ON_INK: TextInk = { fill: PAPER, halo: '#05091a' };
const VIPER_LID = '#8a9fd3';
const CAPTION_LINE = 1.02;

export function createGulpPuffer(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();
  const viper = makeSprite('viperfish', 6);
  const puffer = makeSprite('puffer', 6);
  const icon = makeSprite('viperfish', 2);

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    ctx.drawImage(water, 0, 0);
    const shaken = shake(t);
    const view = viewAt(t);
    ctx.save();
    ctx.translate(FOCUS.x + shaken.x, FOCUS.y + shaken.y);
    ctx.scale(view.zoom, view.zoom);
    ctx.translate(-view.x, -view.y);

    const you: Pose = asPose(viperFish(t));
    const snap = jolt(t);
    const eyes = viperEyes(t);
    const look: SwimLook = {
      jaw: viperJaw(t), belly: viperBelly(t), eyes: eyes === 'squeeze' ? 'squeeze' : null, lid: VIPER_LID, squash: 1 - 0.06 * snap, stretch: 1 + 0.04 * snap,
    };
    drawPlayerLight(ctx, you);

    const p = pufferAt(t);
    const pose: Pose = asPose(p.fish);
    const amt = swell(t);
    const drawPuffer = (squash: number, stretch: number): void => {
      drawSwimmer(ctx, puffer, pose, boil, { squash, stretch });
      drawSpines(ctx, pose, amt, squash, stretch);
      drawPufferFace(ctx, pose, squash, stretch, smug(t), raspberry(t));
    };
    const drawViper = (part?: 'mouth' | 'body'): void => {
      drawSwimmer(ctx, viper, you, boil, { ...look, part });
      if (part !== 'mouth') {
        drawViperEyes(ctx, viper, you, look, eyes, t);
        drawLights(ctx, viper, you, look, 0.22);
      }
    };
    if (p.kind === 'swallowed') {
      // The inside of the mouth, the puffer in it (only where the open mouth and the water in front of it are), then the viper over it.
      drawViper('mouth');
      ctx.save();
      clipToGape(ctx, viper, you, look);
      drawPuffer(p.squash, p.stretch);
      ctx.restore();
      drawViper('body');
    } else {
      drawViper();
      drawPuffer(1, 1);
    }

    const lipsAt = lipsOf('viperfish', look.jaw ?? 0).mid;
    const lips = pointOn(viper, you, look, { x: lipsAt.x + 4, y: lipsAt.y });
    drawSuction(ctx, lips, 1, you.length, suction(t), t / 3);
    const alarm = puffAlarm(t);
    if (alarm > 0) drawExclaim(ctx, pose.x + pose.length * 0.12, pose.y - pose.length * 0.5 - 50, 110 * alarm, 0.12);
    ctx.restore();

    const score = floatLife(t - SCORE_AT, 1.1);
    if (score) {
      const at = toScreen({ x: you.x + you.length * 0.1, y: you.y - you.length * 0.3 }, view);
      drawFloatText(ctx, SCORE_TEXT, at.x, Math.max(560, at.y - 30 - 70 * score.rise), 96, score.alpha, SCORE_INK);
    }
    drawGrowthBar(ctx, icon, 'viperfish', { ...growthBar(t), marks: BAR_MARKS }, t);
    for (const c of CAPTIONS) {
      const alpha = captionAlpha(c, t);
      c.text.split('\n').forEach((row, i) => drawTextLine(ctx, row, VIDEO.width / 2, c.y + i * c.size * CAPTION_LINE, c.size, 700, alpha, PAPER_ON_INK));
    }
    drawCredit(ctx, PAPER_ON_INK);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderGulpPufferAudio };
}
