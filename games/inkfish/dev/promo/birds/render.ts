import { BIRD_FRAMES, BIRD_TEX, drawBird } from '../../../src/art/birdArt';
import { ART_RES } from '../../../src/art/propArt';
import { BOIL_FPS, BOIL_FRAMES } from '../../../src/art/textures';
import type { Pose } from '../chain';
import { drawTextLine } from '../captions';
import { drawChomp, drawExclaim } from '../effects';
import { makePaper } from '../backdrop';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer, type SwimLook } from '../swimmer';
import { renderBirdsAudio } from './audio';
import { drawFeather, drawIslet, drawRipples, drawSplash, drawWater, drawWaterline } from './scenery';
import {
  alarm, CAPTIONS, captionAlpha, FEATHER_COUNT, featherAt, GULP_AT, jackAt, jackEyes, jackJaw, jackVisible, LOOP_S, murk, shake, snap, SPLASHES,
  TERN_SCALE, ternAt, type TernPose,
} from './story';

/** Draws the "some fish eat birds" short (story.ts has the choreography). */

/** Sprite px per bird-drawing px: the tern is drawn at TERN_SCALE, so this keeps its lines crisp. */
const TERN_RES = 8;
/** The trevally is under half the video's width: a lighter sprite will do. */
const JACK_RES = 5;

/** The game's tern, one canvas per boil frame and wing frame, facing right. */
function makeTernFrames(): HTMLCanvasElement[][] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) =>
    Array.from({ length: BIRD_FRAMES }, (_, wing) => {
      const canvas = document.createElement('canvas');
      canvas.width = BIRD_TEX.w * TERN_RES;
      canvas.height = BIRD_TEX.h * TERN_RES;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(TERN_RES / ART_RES, TERN_RES / ART_RES);
      drawBird(ctx, 'tern', wing, 401 + f * 313);
      return canvas;
    }));
}

function drawTern(ctx: CanvasRenderingContext2D, frames: readonly HTMLCanvasElement[][], boil: number, p: TernPose): void {
  const canvas = frames[boil % frames.length]![p.frame]!;
  const k = (TERN_SCALE * p.scale) / TERN_RES;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(-p.tilt);
  ctx.scale(k, k);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  ctx.restore();
}

/** The trevally; while the water still hides it, a dark shape. */
function drawJack(ctx: CanvasRenderingContext2D, layer: CanvasRenderingContext2D, sprite: Sprite, pose: Pose, boil: number, look: SwimLook): void {
  const dark = murk(pose);
  if (dark <= 0.005) {
    drawSwimmer(ctx, sprite, pose, boil, look);
    return;
  }
  layer.clearRect(0, 0, VIDEO.width, VIDEO.height);
  drawSwimmer(layer, sprite, pose, boil, look);
  layer.save();
  layer.globalCompositeOperation = 'source-atop';
  layer.fillStyle = `rgba(16,26,46,${(0.9 * dark).toFixed(3)})`;
  layer.fillRect(0, 0, VIDEO.width, VIDEO.height);
  layer.restore();
  ctx.save();
  ctx.globalAlpha = 1 - 0.3 * dark;
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.restore();
}

export function createBirds(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makePaper();
  drawIslet(backdrop.getContext('2d')!);
  const jack = makeSprite('jack', JACK_RES, 'heavy');
  const tern = makeTernFrames();
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = VIDEO.width;
  layerCanvas.height = VIDEO.height;
  const layer = layerCanvas.getContext('2d')!;

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    ctx.drawImage(backdrop, 0, 0);
    const jolt = shake(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);

    const bird = ternAt(t);
    const fish = jackVisible(t) ? jackAt(t) : null;
    const look: SwimLook = { jaw: jackJaw(t), squash: 1 - 0.1 * snap(t), stretch: 1 + 0.05 * snap(t), eyes: jackEyes(t) };
    if (fish && bird.kind === 'taken') {
      // Inside of the mouth, the tern going in, then the trevally over it.
      drawSwimmer(ctx, jack, fish, boil, { ...look, part: 'mouth' });
      drawTern(ctx, tern, boil, bird.pose);
      drawSwimmer(ctx, jack, fish, boil, { ...look, part: 'body' });
    } else if (fish) {
      drawJack(ctx, layer, jack, fish, boil, look);
    }
    // The sea over whatever is in it, then what happens on its surface.
    drawWater(ctx, t);
    drawWaterline(ctx, t);
    for (const s of SPLASHES) {
      drawRipples(ctx, s.x, t - s.at, s.size);
      drawSplash(ctx, s.x, t - s.at, s.size);
    }
    if (fish) drawChomp(ctx, fish, (t - GULP_AT) / 0.12);
    for (let i = 0; i < FEATHER_COUNT; i++) {
      const f = featherAt(i, t);
      if (f) drawFeather(ctx, f);
    }
    if (bird.kind === 'flying') {
      drawTern(ctx, tern, boil, bird.pose);
      const pop = alarm(t);
      if (pop > 0) drawExclaim(ctx, bird.pose.x + 6 * TERN_SCALE, bird.pose.y - 38 * TERN_SCALE, 130 * pop, 0.12);
    }
    ctx.restore();

    for (const c of CAPTIONS) drawTextLine(ctx, c.text, VIDEO.width / 2, c.y, c.size, 700, captionAlpha(c, t));
  };

  return { loopSeconds: LOOP_S, draw, audio: renderBirdsAudio };
}
