import { BOIL_FPS } from '../../../src/art/textures';
import type { Pose } from '../chain';
import { drawTextLine } from '../captions';
import { onScreen as onScreenAt } from '../gameplay/fish';
import { drawCredit, drawFloatText, drawGrowthBar, GROWTH_INK } from '../gameplay/hud';
import { drawZoomMarks, type MarkField } from '../gameplay/marks';
import { drawChomp, drawExclaim, drawSuction } from '../effects';
import { makeBackdrop } from '../backdrop';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer, type SwimLook } from '../swimmer';
import { renderRevengeAudio } from './audio';
import {
  BAR_MARKS, biggerText, CAPTIONS, captionAlpha, growthBar, gulpSnap, inklingAlarm, inklingEyes, inklingFish, inklingJaw, inklingLump, LOOP_S, MEALS,
  perchAlarm, perchAt, perchJaw, perchMenace, perchMurk, pullAt, SCALE, shake, snacksAt, SNAP_AT, suction, viewAt, type View, type WorldFish,
} from './story';

/** Draws the "remember this perch" short (story.ts has the choreography). */

/** The screen point the camera centres on: a little above the middle, clear of the captions and the bottom buttons. */
const FOCUS = { x: VIDEO.width / 2, y: 820 } as const;

const FIELD: MarkField = { focus: FOCUS, scale: SCALE, loopS: LOOP_S };
const onScreen = (f: WorldFish, v: View): Pose => onScreenAt(f, v, FOCUS);

// ---------------------------------------------------------------- the fish

/** The perch, as a hunter (heavy ink) or prey (light), or between the two as it flips; the dad rises out of the dark. */
function drawPerch(
  ctx: CanvasRenderingContext2D, layer: CanvasRenderingContext2D, sprites: { heavy: Sprite; light: Sprite }, pose: Pose, boil: number, look: SwimLook, t: number,
): void {
  const menace = perchMenace(t);
  const dark = perchMurk(t);
  const target = dark > 0.005 ? layer : ctx;
  if (target === layer) layer.clearRect(0, 0, VIDEO.width, VIDEO.height);
  if (menace < 1) drawSwimmer(target, sprites.light, pose, boil, look);
  if (menace > 0) drawSwimmer(target, sprites.heavy, pose, boil, { ...look, alpha: menace, mouth: { teeth: true } });
  if (target === ctx) return;
  layer.save();
  layer.globalCompositeOperation = 'source-atop';
  layer.fillStyle = `rgba(16,26,46,${(0.93 * dark).toFixed(3)})`;
  layer.fillRect(0, 0, VIDEO.width, VIDEO.height);
  layer.restore();
  ctx.save();
  ctx.globalAlpha = 1 - 0.25 * dark;
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.restore();
}

/** A "!" over a fish's head. */
function exclaimOver(ctx: CanvasRenderingContext2D, p: Pose, size: number, popped: number): void {
  if (popped <= 0) return;
  drawExclaim(ctx, p.x + p.facing * p.length * 0.1, p.y - p.length * 0.42 - size * 0.35, size * popped, p.facing * 0.12);
}

export function createRevenge(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makeBackdrop({ top: 'rgba(60,110,160,0.05)', bottom: 'rgba(30,64,110,0.3)' });
  const inkling = makeSprite('inkling');
  const icon = makeSprite('inkling', 2);
  const perch = { heavy: makeSprite('perch', 8, 'heavy'), light: makeSprite('perch', 8, 'light') };
  const snacks = { minnow: makeSprite('minnow', 3), blenny: makeSprite('blenny', 4) } as const;
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = VIDEO.width;
  layerCanvas.height = VIDEO.height;
  const layer = layerCanvas.getContext('2d')!;

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    const v = viewAt(t);
    ctx.drawImage(backdrop, 0, 0);
    drawZoomMarks(ctx, FIELD, v, pullAt(t), t);
    const jolt = shake(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);

    const you = onScreen(inklingFish(t), v);
    const snap = gulpSnap(t);
    const youLook: SwimLook = {
      jaw: inklingJaw(t), lump: inklingLump(t), eyes: inklingEyes(t), squash: 1 - 0.1 * snap, stretch: 1 + 0.05 * snap,
    };
    let swallowing: { readonly sprite: Sprite; readonly pose: Pose; readonly stretch: number; readonly squash: number } | null = null;

    for (const s of snacksAt(t)) {
      const sprite = snacks[s.fish.shape as keyof typeof snacks];
      const pose = onScreen(s.fish, v);
      if (s.kind === 'swallowed') swallowing = { sprite, pose, stretch: s.stretch, squash: s.squash };
      else drawSwimmer(ctx, sprite, pose, boil, { alpha: s.alpha });
    }

    const p = perchAt(t);
    const perchPose = p.kind === 'gone' ? null : onScreen(p.fish, v);
    if (p.kind === 'swimming' && perchPose) drawPerch(ctx, layer, perch, perchPose, boil, { jaw: perchJaw(t) }, t);
    if (p.kind === 'swallowed' && perchPose) swallowing = { sprite: perch.light, pose: perchPose, stretch: p.stretch, squash: p.squash };

    if (swallowing) {
      // Inside of your mouth, the meal going in, then you over it.
      drawSwimmer(ctx, inkling, you, boil, { ...youLook, part: 'mouth' });
      drawSwimmer(ctx, swallowing.sprite, swallowing.pose, boil, { stretch: swallowing.stretch, squash: swallowing.squash });
      drawSwimmer(ctx, inkling, you, boil, { ...youLook, part: 'body' });
    } else {
      drawSwimmer(ctx, inkling, you, boil, youLook);
    }
    drawSuction(ctx, you, suction(t), t / 3);
    for (const at of MEALS) drawChomp(ctx, you, (t - at) / 0.12);
    if (perchPose) {
      drawChomp(ctx, perchPose, (t - SNAP_AT) / 0.12);
      exclaimOver(ctx, perchPose, perchPose.length * 0.4, perchAlarm(t));
    }
    exclaimOver(ctx, you, Math.max(70, you.length * 0.5), inklingAlarm(t));
    ctx.restore();

    const bigger = biggerText(t);
    if (bigger) drawFloatText(ctx, 'Bigger!', you.x, you.y - you.length * 0.35 - 40 - 90 * bigger.rise, 88, bigger.alpha, GROWTH_INK);
    const bar = growthBar(t);
    drawGrowthBar(ctx, icon, 'inkling', { ...bar, marks: BAR_MARKS }, t);
    for (const c of CAPTIONS) drawTextLine(ctx, c.text, VIDEO.width / 2, c.y, c.size, 700, captionAlpha(c, t));
    drawCredit(ctx);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderRevengeAudio };
}
