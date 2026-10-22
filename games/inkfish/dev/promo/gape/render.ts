import { fishLights } from '../../../src/art/fishArt';
import { halo } from '../../../src/art/glowArt';
import { PAPER } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import type { Pose } from '../chain';
import { drawTextLine, type TextInk } from '../captions';
import { makePaper } from '../backdrop';
import { onScreen as onScreenAt } from '../gameplay/fish';
import { drawCredit, drawFloatText, drawGrowthBar, GROWTH_INK, SCORE_INK } from '../gameplay/hud';
import type { MarkField } from '../gameplay/marks';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { renderGapeAudio } from './audio';
import { drawChomp, drawExclaim, drawSuction } from './effects';
import { drawSnow } from './snow';
import {
  BAR_MARKS, BITE_AT, biggerText, CAPTIONS, captionAlpha, fangAlarm, fangAt, fangMurk, GULP_AT, growthBar, gulpSnap, LOOP_S, lureGlow, pullAt, SCALE, SCORE_TEXT,
  scoreText, shake, suction, viewAt, viperBelly, viperEyes, viperFish, viperJaw, type View, type WorldFish,
} from './story';
import { clipToGape, drawSwimmer, lipsOf, pointOn, type SwimLook } from './swimmer';

/** Draws the "how did that fit" short (story.ts has the choreography). */

/** The screen point the camera centres on: a little above the middle, clear of the captions and the bottom buttons. */
const FOCUS = { x: VIDEO.width / 2, y: 800 } as const;
const FIELD: MarkField = { focus: FOCUS, scale: SCALE, loopS: LOOP_S };
const onScreen = (f: WorldFish, v: View): Pose => onScreenAt(f, v, FOCUS);

const PAPER_ON_INK: TextInk = { fill: PAPER, halo: '#05091a' };
/** The viper's skin over its eye, for closed eyes. */
const VIPER_LID = '#8a9fd3';
/** The midnight zone's night over the paper (levels/zones.ts ZONE_NIGHT: 0x07112e at 0.8), a touch deeper at the bottom. */
export function makeWater(): HTMLCanvasElement {
  const canvas = makePaper();
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, 'rgba(9,22,58,0.84)');
  g.addColorStop(1, 'rgba(4,10,30,0.9)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  return canvas;
}

/** The soft pool of light the game keeps round you in the deep (scenes/game/deepLight.ts), tinted like the viper's lights. */
export function drawPlayerLight(ctx: CanvasRenderingContext2D, p: Pose): void {
  const r = p.length * 1.1;
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
  g.addColorStop(0, 'rgba(190,200,230,0.16)');
  g.addColorStop(0.5, 'rgba(160,180,230,0.06)');
  g.addColorStop(1, 'rgba(160,180,230,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(p.x - r, p.y - r, 2 * r, 2 * r);
  ctx.restore();
}

/** The viper's own lights, glowing over its drawing as the game's glow twins do; the lure (the biggest) brightness `lure`. */
export function drawLights(ctx: CanvasRenderingContext2D, sprite: Sprite, pose: Pose, look: SwimLook, lure: number): void {
  const lights = fishLights('viperfish');
  const k = pose.length / sprite.bodyPx;
  const biggest = Math.max(...lights.map((l) => l.r));
  for (const l of lights) {
    const at = pointOn(sprite, pose, look, l);
    const isLure = l.r === biggest;
    halo(ctx, at.x, at.y, (isLure ? 8 : 4.5) * l.r * sprite.res * k, l.color, isLure ? lure : 0.3);
  }
}

/** A fish drawn out of the dark: its drawing darkened by `murk` (0 plain .. 1 hidden) in a layer of its own. */
export function drawMurky(
  ctx: CanvasRenderingContext2D, layer: CanvasRenderingContext2D, sprite: Sprite, pose: Pose, boil: number, murk: number, look: SwimLook = {},
): void {
  if (murk <= 0.005) {
    drawSwimmer(ctx, sprite, pose, boil, look);
    return;
  }
  layer.clearRect(0, 0, VIDEO.width, VIDEO.height);
  drawSwimmer(layer, sprite, pose, boil, look);
  layer.save();
  layer.globalCompositeOperation = 'source-atop';
  layer.fillStyle = `rgba(5,10,30,${(0.95 * murk).toFixed(3)})`;
  layer.fillRect(0, 0, VIDEO.width, VIDEO.height);
  layer.restore();
  ctx.save();
  ctx.globalAlpha = 1 - 0.4 * murk;
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.restore();
}

export function createGape(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();
  const viper = makeSprite('viperfish', 6);
  const fang = makeSprite('fangtooth', 6);
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

    const you = onScreen(viperFish(t), v);
    const snap = gulpSnap(t);
    const look: SwimLook = {
      jaw: viperJaw(t), belly: viperBelly(t), eyes: viperEyes(t), lid: VIPER_LID, squash: 1 - 0.08 * snap, stretch: 1 + 0.05 * snap,
    };
    drawPlayerLight(ctx, you);

    const f = fangAt(t);
    const fangPose = f.kind === 'gone' ? null : onScreen(f.fish, v);
    if (f.kind === 'swimming' && fangPose) drawMurky(ctx, layer, fang, fangPose, boil, fangMurk(t));
    if (f.kind === 'swallowed' && fangPose) {
      // The inside of the mouth, the fangtooth going in (only where the open mouth and the water in front of it are), then the viper over it.
      drawSwimmer(ctx, viper, you, boil, { ...look, part: 'mouth' });
      ctx.save();
      clipToGape(ctx, viper, you, look);
      drawSwimmer(ctx, fang, fangPose, boil, { squash: f.squash, stretch: f.stretch });
      ctx.restore();
      drawSwimmer(ctx, viper, you, boil, { ...look, part: 'body' });
    } else {
      drawSwimmer(ctx, viper, you, boil, look);
    }
    drawLights(ctx, viper, you, look, lureGlow(t));

    const lips = pointOn(viper, you, look, { x: lipsOf('viperfish', look.jaw ?? 0).mid.x + 4, y: lipsOf('viperfish', look.jaw ?? 0).mid.y });
    drawSuction(ctx, lips, 1, you.length, suction(t), t / 3);
    drawChomp(ctx, you, (t - GULP_AT) / 0.14);
    drawChomp(ctx, you, (t - BITE_AT) / 0.12);
    if (fangPose && f.kind === 'swimming') {
      const pop = fangAlarm(t);
      if (pop > 0) drawExclaim(ctx, fangPose.x + fangPose.facing * fangPose.length * 0.05, fangPose.y - fangPose.length * 0.5 - 50, 110 * pop, fangPose.facing * 0.12);
    }
    ctx.restore();

    const score = scoreText(t);
    if (score) drawFloatText(ctx, SCORE_TEXT, you.x + you.length * 0.15, Math.max(560, you.y - you.length * 0.25 - 30 - 70 * score.rise), 84, score.alpha, SCORE_INK);
    const bigger = biggerText(t);
    if (bigger) drawFloatText(ctx, 'Bigger!', you.x, Math.max(560, you.y - you.length * 0.3 - 40 - 70 * bigger.rise), 92, bigger.alpha, GROWTH_INK);
    drawGrowthBar(ctx, icon, 'viperfish', { ...growthBar(t), marks: BAR_MARKS }, t);
    for (const c of CAPTIONS) drawTextLine(ctx, c.text, VIDEO.width / 2, c.y, c.size, 700, captionAlpha(c, t), PAPER_ON_INK);
    drawCredit(ctx, PAPER_ON_INK);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderGapeAudio };
}
