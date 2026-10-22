import { C, xAt } from '../../../src/art/fish/kit';
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
import { makeSprite } from '../sprites';
import { ANGLER_BARE, drawBellyLight, drawBulb, drawStalk } from './angler';
import { renderLureAudio } from './audio';
import {
  anglerAlarm, anglerAt, anglerJaw, anglerMurk, BAR_MARKS, BITE_AT, bellyLight, biggerText, CAPTIONS, captionAlpha, GULP_AT, growthBar, gulpSnap, LOOP_S, lureAt,
  pullAt, SCALE, SCORE_TEXT, scoreText, shake, suction, viewAt, viperBelly, viperEyes, viperFish, viperJaw, viperLureGlow, type Lure, type View, type WorldFish,
} from './story';

/** Draws "how did that fit 3" (story.ts has the choreography). */

/** The screen point the camera centres on: a little above the middle, clear of the captions and the bottom buttons. */
const FOCUS = { x: VIDEO.width / 2, y: 800 } as const;
const FIELD: MarkField = { focus: FOCUS, scale: SCALE, loopS: LOOP_S };
const onScreen = (f: WorldFish, v: View): Pose => onScreenAt(f, v, FOCUS);
interface Pt {
  readonly x: number;
  readonly y: number;
}
const toScreen = (p: Pt, v: View): Pt => ({ x: FOCUS.x + v.zoom * (p.x - v.x), y: FOCUS.y + v.zoom * (p.y - v.y) });

const PAPER_ON_INK: TextInk = { fill: PAPER, halo: '#05091a' };
/** The viper's skin over its eye, for closed eyes. */
const VIPER_LID = '#8a9fd3';
const CAPTION_LINE = 1.02;

/** The lure on screen: its stalk (from the snag, if it's caught on the lip) and its bulb. */
function lureOnScreen(l: Lure, v: View): { readonly root: Pt; readonly bend: Pt; readonly bulb: Pt; readonly snag: Pt | null; readonly k: number } {
  return { root: toScreen(l.root, v), bend: toScreen(l.bend, v), bulb: toScreen(l.bulb, v), snag: l.snag ? toScreen(l.snag, v) : null, k: l.k * v.zoom };
}

export function createLure(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();
  const viper = makeSprite('viperfish', 6);
  const angler = makeSprite('angler', 6, 'light', ANGLER_BARE);
  const icon = makeSprite('viperfish', 2);
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = VIDEO.width;
  layerCanvas.height = VIDEO.height;
  const layer = layerCanvas.getContext('2d')!;
  const viperA = ANATOMY.viperfish;

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
      drawLights(ctx, viper, you, look, viperLureGlow(t));
    };

    const a = anglerAt(t);
    const pose = a.kind === 'gone' ? null : onScreen(a.fish, v);
    const lure = lureAt(t);
    const l = lure ? lureOnScreen(lure, v) : null;
    const murk = anglerMurk(t);
    if (a.kind === 'swimming' && pose) {
      drawMurky(ctx, layer, angler, pose, boil, murk, { jaw: anglerJaw(t) });
      drawViper();
    }
    if (a.kind === 'swallowed' && pose) {
      // The inside of the mouth, the angler going in (only where the open mouth and the water in front of it are), then the viper over it.
      drawSwimmer(ctx, viper, you, boil, { ...look, part: 'mouth' });
      ctx.save();
      clipToGape(ctx, viper, you, look);
      drawSwimmer(ctx, angler, pose, boil, { jaw: anglerJaw(t), squash: a.squash, stretch: a.stretch });
      // The stalk from its root on the forehead, inside the mouth, out to the lip it's caught on.
      if (l?.snag) drawStalk(ctx, l.root, { x: (l.root.x + l.snag.x) / 2, y: (l.root.y + l.snag.y) / 2 }, l.snag, l.k);
      ctx.restore();
      drawSwimmer(ctx, viper, you, boil, { ...look, part: 'body' });
      drawLights(ctx, viper, you, look, viperLureGlow(t));
    }
    if (a.kind === 'gone') drawViper();

    // The light: the stalk and bulb fade with the angler into the dark, but the bulb shines through it once it's on.
    if (l && lure && lure.swallowed <= 0) {
      const seen = 1 - murk;
      ctx.save();
      ctx.globalAlpha = Math.max(0.05, seen);
      drawStalk(ctx, l.snag ?? l.root, l.bend, l.bulb, l.k);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = Math.max(seen, Math.min(1, lure.glow * 1.2));
      drawBulb(ctx, l.bulb, l.k, lure.glow, t * 0.6);
      ctx.restore();
    }
    // Going down: only its light, shining out between the closing jaws.
    if (l && lure && lure.swallowed > 0) drawBellyLight(ctx, l.bulb, you.length * 0.22, lure.glow * (1 - 0.5 * lure.swallowed));
    // Swallowed, it shines out through the stretched belly.
    const inside = bellyLight(t);
    if (inside > 0) {
      const b = viperBelly(t);
      const at = pointOn(viper, you, look, { x: xAt(viperA, b.at), y: C });
      drawBellyLight(ctx, at, you.length * 0.45, inside);
    }

    const lipsAt = lipsOf('viperfish', look.jaw ?? 0).mid;
    const lips = pointOn(viper, you, look, { x: lipsAt.x + 4, y: lipsAt.y });
    drawSuction(ctx, lips, 1, you.length, suction(t), t / 3);
    drawChomp(ctx, you, (t - GULP_AT) / 0.14);
    drawChomp(ctx, you, (t - BITE_AT) / 0.12);
    if (pose && a.kind === 'swimming') {
      const pop = anglerAlarm(t);
      if (pop > 0) drawExclaim(ctx, pose.x + pose.length * 0.3, pose.y - pose.length * 0.62 - 40, 110 * pop, 0.12);
    }
    ctx.restore();

    const score = scoreText(t);
    if (score) drawFloatText(ctx, SCORE_TEXT, you.x + you.length * 0.15, Math.max(560, you.y - you.length * 0.25 - 30 - 70 * score.rise), 84, score.alpha, SCORE_INK);
    const bigger = biggerText(t);
    if (bigger) drawFloatText(ctx, 'Bigger!', you.x, Math.max(560, you.y - you.length * 0.3 - 40 - 70 * bigger.rise), 92, bigger.alpha, GROWTH_INK);
    drawGrowthBar(ctx, icon, 'viperfish', { ...growthBar(t), marks: BAR_MARKS }, t);
    for (const c of CAPTIONS) {
      const alpha = captionAlpha(c, t);
      c.text.split('\n').forEach((row, i) => drawTextLine(ctx, row, VIDEO.width / 2, c.y + i * c.size * CAPTION_LINE, c.size, 700, alpha, PAPER_ON_INK));
    }
    drawCredit(ctx, PAPER_ON_INK);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderLureAudio };
}
