import { PAPER } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import type { Pose } from '../chain';
import { drawTextLine, type TextInk } from '../captions';
import { onScreen as onScreenAt } from '../gameplay/fish';
import { drawCredit, drawFloatText, drawGrowthBar, GROWTH_INK, SCORE_INK } from '../gameplay/hud';
import type { MarkField } from '../gameplay/marks';
import { drawChomp, drawExclaim, drawSuction } from '../gape/effects';
import { drawLights, drawPlayerLight, makeWater } from '../gape/render';
import { drawSnow } from '../gape/snow';
import { clipToGape, drawSwimmer, lipsOf, pointOn, type SwimLook } from '../gape/swimmer';
import { VIDEO, type Short } from '../short';
import { makeSprite } from '../sprites';
import { renderGulpMorayAudio } from './audio';
import { drawBellyCoil, makeCoilLayers } from './coil';
import { drawRibbon, type Pt } from './ribbon';
import {
  BAR_MARKS, BITE_AT, bellyCoil, biggerText, CAPTIONS, captionAlpha, GULP_AT, growthBar, gulpSnap, isDessert, LOOP_S, morayAlarm, morayAt, morayMurk, pullAt, SCALE, SCORE_TEXT,
  scoreText, seam, shake, suction, viewAt, viperBelly, viperEyes, viperFish, viperJaw, type View, type WorldFish,
} from './story';

/** Draws "how did that fit 122" (story.ts has the choreography). */

/** The screen point the camera centres on: a little above the middle, clear of the captions and the bottom buttons. */
const FOCUS = { x: VIDEO.width / 2, y: 800 } as const;
const FIELD: MarkField = { focus: FOCUS, scale: SCALE, loopS: LOOP_S };
const onScreen = (f: WorldFish, v: View): Pose => onScreenAt(f, v, FOCUS);

const PAPER_ON_INK: TextInk = { fill: PAPER, halo: '#05091a' };
/** The viper's skin over its eye, for closed eyes. */
const VIPER_LID = '#8a9fd3';
const CAPTION_LINE = 1.02;
const VIPER_LURE = 0.22;

export function createGulpMoray(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();
  const viper = makeSprite('viperfish', 6);
  const coil = makeCoilLayers();
  const icon = makeSprite('viperfish', 2);
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = VIDEO.width;
  layerCanvas.height = VIDEO.height;
  const layer = layerCanvas.getContext('2d')!;

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    const v = viewAt(t);
    const screen = (p: Pt): Pt => ({ x: FOCUS.x + v.zoom * (p.x - v.x), y: FOCUS.y + v.zoom * (p.y - v.y) });
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

    const o = morayAt(t);
    const murk = morayMurk(t);
    if (o.kind === 'there' && !isDessert(t)) {
      // Going in: the inside of the mouth, the ribbon only where the open mouth and the water in front of it are, then the viper over it.
      drawSwimmer(ctx, viper, you, boil, { ...look, part: 'mouth' });
      ctx.save();
      clipToGape(ctx, viper, you, look);
      drawRibbon(ctx, boil, o.ribbon, v.zoom, screen);
      ctx.restore();
      drawSwimmer(ctx, viper, you, boil, { ...look, part: 'body' });
    } else if (o.kind === 'there') {
      // Still in the dark ahead (the jaws take it over as the strike begins).
      const inJaws = seam(t) > -0.3;
      if (inJaws) {
        drawSwimmer(ctx, viper, you, boil, { ...look, part: 'mouth' });
        ctx.save();
        clipToGape(ctx, viper, you, look);
        drawRibbon(ctx, boil, o.ribbon, v.zoom, screen);
        ctx.restore();
        drawSwimmer(ctx, viper, you, boil, { ...look, part: 'body' });
      } else {
        if (murk > 0.005) {
          layer.clearRect(0, 0, VIDEO.width, VIDEO.height);
          drawRibbon(layer, boil, o.ribbon, v.zoom, screen);
          layer.save();
          layer.globalCompositeOperation = 'source-atop';
          layer.fillStyle = `rgba(5,10,30,${(0.95 * murk).toFixed(3)})`;
          layer.fillRect(0, 0, VIDEO.width, VIDEO.height);
          layer.restore();
          ctx.save();
          ctx.globalAlpha = 1 - 0.4 * murk;
          ctx.drawImage(layerCanvas, 0, 0);
          ctx.restore();
        } else {
          drawRibbon(ctx, boil, o.ribbon, v.zoom, screen);
        }
        drawSwimmer(ctx, viper, you, boil, look);
      }
    } else {
      drawSwimmer(ctx, viper, you, boil, look);
    }
    // Going down, the coil grows as its nose gets further round; after the gulp it is all in, and fades as it is digested.
    const inside = t >= GULP_AT ? 1 : bellyCoil(t) / 0.85;
    drawBellyCoil(ctx, coil, viper, you, look, inside, t >= GULP_AT ? bellyCoil(t) : 1, t, boil);
    drawLights(ctx, viper, you, look, VIPER_LURE);

    const lipsAt = lipsOf('viperfish', look.jaw ?? 0).mid;
    const lips = pointOn(viper, you, look, { x: lipsAt.x + 4, y: lipsAt.y });
    drawSuction(ctx, lips, 1, you.length, suction(t), t / 3);
    drawChomp(ctx, you, (t - GULP_AT) / 0.14);
    drawChomp(ctx, you, (t - BITE_AT) / 0.12);
    if (o.kind === 'there' && isDessert(t)) {
      const pop = morayAlarm(t);
      if (pop > 0) {
        const head = screen(o.ribbon.at(0));
        drawExclaim(ctx, head.x + 40, head.y - 190, 130 * pop, -0.12);
      }
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

  return { loopSeconds: LOOP_S, draw, audio: renderGulpMorayAudio };
}
