import { BIRD_FRAMES, BIRD_TEX, drawBird } from '../../../src/art/birdArt';
import { ART_RES } from '../../../src/art/propArt';
import { BOIL_FPS, BOIL_FRAMES } from '../../../src/art/textures';
import { drawTextLine } from '../captions';
import { drawChomp, drawExclaim } from '../effects';
import { drawCredit, drawFloatText, SCORE_INK } from '../gameplay/hud';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer, type SwimLook } from '../swimmer';
import { renderLeapAudio } from './audio';
import { storyAt } from './timing';
import { drawBubbles, drawFeather, drawRipples, drawSplash, drawWater, drawWaterline, makeScene } from './scenery';
import {
  bubblesAt, CAPTIONS, captionAlpha, CATCH_AT, FEATHER_COUNT, featherAt, gullAlarm, gullAt, gullBehind, GULL_SCALE, LOOP_S, MISS_AT, POINTS,
  scoreText, shake, sinceLoop, snap, SPLASHES, tunaAt, tunaEyes, tunaJaw, tunaLump, type GullPose,
} from './story';

/** Draws the "don't fly too close to the sun… or too low" short (story.ts has the choreography). */

/** Sprite px per bird-drawing px: the gull is drawn at GULL_SCALE, so this keeps its lines crisp. */
const GULL_RES = 6;
/** The tuna is a quarter of the video's width: a light sprite will do. */
const TUNA_RES = 4;

/** The game's gull, one canvas per boil frame and wing frame, facing right. */
function makeGullFrames(): HTMLCanvasElement[][] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) =>
    Array.from({ length: BIRD_FRAMES }, (_, wing) => {
      const canvas = document.createElement('canvas');
      canvas.width = BIRD_TEX.w * GULL_RES;
      canvas.height = BIRD_TEX.h * GULL_RES;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(GULL_RES / ART_RES, GULL_RES / ART_RES);
      drawBird(ctx, 'gull', wing, 401 + f * 313);
      return canvas;
    }));
}

function drawGull(ctx: CanvasRenderingContext2D, frames: readonly HTMLCanvasElement[][], boil: number, p: GullPose): void {
  const canvas = frames[boil % frames.length]![p.frame]!;
  const k = (GULL_SCALE * p.scale) / GULL_RES;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.facing, 1);
  ctx.rotate(-p.tilt);
  ctx.scale(k, k);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  ctx.restore();
}

export function createLeap(ctx: CanvasRenderingContext2D): Short {
  const scene = makeScene();
  const tuna: Sprite = makeSprite('tuna', TUNA_RES);
  const gull = makeGullFrames();

  const draw = (seconds: number): void => {
    const real = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    // The ink boils in real time; everything else plays in story time, slowed for the snatch.
    const boil = Math.floor(real * BOIL_FPS + 1e-6);
    const t = ((storyAt(real) % LOOP_S) + LOOP_S) % LOOP_S;
    ctx.drawImage(scene, 0, 0);
    const jolt = shake(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);

    const fish = tunaAt(t);
    const bird = gullAt(t);
    const s = snap(t);
    const look: SwimLook = { jaw: tunaJaw(t), lump: tunaLump(t), eyes: tunaEyes(t), squash: 1 - 0.1 * s, stretch: 1 + 0.05 * s };
    if (bird.kind === 'taken') {
      // Inside of the mouth, the gull going in, then the tuna over it.
      drawSwimmer(ctx, tuna, fish, boil, { ...look, part: 'mouth' });
      drawGull(ctx, gull, boil, bird.pose);
      drawSwimmer(ctx, tuna, fish, boil, { ...look, part: 'body' });
    } else if (bird.kind === 'flying' && gullBehind(t)) {
      // Just before the bite, the jaws close round its tail: the gull is behind your head.
      drawGull(ctx, gull, boil, bird.pose);
      drawSwimmer(ctx, tuna, fish, boil, look);
    } else {
      drawSwimmer(ctx, tuna, fish, boil, look);
    }
    // The sea over whatever is in it, then what happens on its surface.
    drawWater(ctx, t);
    drawWaterline(ctx, t);
    drawBubbles(ctx, bubblesAt(t));
    for (const sp of SPLASHES) {
      const since = sinceLoop(t, sp.at);
      drawRipples(ctx, sp.x, since, sp.size);
      drawSplash(ctx, sp.x, since, sp.size);
    }
    for (const at of [MISS_AT, CATCH_AT]) drawChomp(ctx, fish, sinceLoop(t, at) / 0.12);
    for (let i = 0; i < FEATHER_COUNT; i++) {
      const f = featherAt(i, t);
      if (f) drawFeather(ctx, f);
    }
    if (bird.kind === 'flying') {
      if (!gullBehind(t)) drawGull(ctx, gull, boil, bird.pose);
      const pop = gullAlarm(t);
      if (pop > 0) drawExclaim(ctx, bird.pose.x - 70, bird.pose.y - 34 * GULL_SCALE, 110 * pop, -0.15);
    }
    ctx.restore();

    const score = scoreText(t);
    if (score) drawFloatText(ctx, `+${POINTS}`, score.x, score.y - 80 * score.rise, 96, score.alpha, SCORE_INK);
    for (const c of CAPTIONS) drawTextLine(ctx, c.text, VIDEO.width / 2, c.y, c.size, 700, captionAlpha(c, t));
    drawCredit(ctx);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderLeapAudio };
}
