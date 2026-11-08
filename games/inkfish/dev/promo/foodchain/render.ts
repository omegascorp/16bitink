import type { Short } from '../short';
import { smooth } from '../short';
import { renderFoodchainAudio } from './audio';
import { prepareCast } from './cast';
import { createClimbChain, createOpenChain } from './chains';
import { drawGiants, drawPayoff, type Giants } from './giants';
import { cornerPyramid, SMOKE_AT } from './corner';
import { drawPyramid, drawRuler, drawSmoke, drawStepCard, drawWeightTag, type PyramidState } from './hud';
import { createFields } from './field';
import { createGameCard, drawEndCard } from './inserts';
import { drawClimbScene, inPortStarboard, type ClimbScene } from './scene';
import { drawOpen } from './open';
import { sectionStart, T, VIDEO_S } from './timeline';
import { createChainView } from './view';
import { createWater, darkOf } from './water';

/**
 * Draws "fish eat fish size comparison… but every animal is real", the
 * second long-form video (script.md has the words, timeline.ts the beats):
 * the cold open's four quick gulps, the climb from a diatom to the orca
 * (one continuous zoom out), the game card, why the chain stops, the
 * giants that eat at the bottom, the orcas that hunt the blue whale, and
 * the end card. The weight tag, step card, ruler and pyramid sit over it.
 */

const s = sectionStart;

function drawCornerHud(ctx: CanvasRenderingContext2D, t: number, dark: number): void {
  const p = cornerPyramid(t);
  drawPyramid(ctx, p, dark);
  SMOKE_AT.forEach((a, k) => {
    const bandH = p.base * 0.11;
    drawSmoke(ctx, p.x, p.baseY - (k + 0.5) * bandH, 60, (t - a) / 1.6, dark);
  });
}

export async function createFoodchain(ctx: CanvasRenderingContext2D): Promise<Short> {
  await prepareCast();
  const water = createWater();
  const open = createOpenChain();
  const openView = createChainView(open, 11);
  const climb = createClimbChain();
  const climbView = createChainView(climb, 23);
  const game = createGameCard();
  const scene: ClimbScene = { climb, view: climbView, water, fields: createFields(climb, climbView) };
  const giants: Giants = { water };

  const draw = (t: number): void => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (t < s(1)) {
      drawOpen(ctx, t, { climb: open, view: openView, water }, scene);
    } else if (t < s(6)) {
      const dark = drawClimbScene(ctx, t, scene);
      drawCornerHud(ctx, t, dark);
    } else if (t < s(7) - 0.5) {
      game.draw(ctx, t, s(6), T.eatUp, T.free, 1);
    } else if (t < s(8)) {
      const dark = drawClimbScene(ctx, t, scene);
      if (!inPortStarboard(t)) drawCornerHud(ctx, t, dark);
      // The game card fades out over the orca's first half second.
      game.draw(ctx, t, s(6), T.eatUp, T.free, 1 - smooth((t - (s(7) - 0.5)) / 0.5));
    } else if (t < s(9)) {
      drawWhy(ctx, t, scene);
    } else if (t < s(10)) {
      drawGiants(ctx, t, giants);
    } else {
      drawPayoff(ctx, t, giants);
      drawEndCard(ctx, smooth((t - T.start) / 0.35));
    }
    ctx.restore();
  };

  return { loopSeconds: VIDEO_S, draw, audio: renderFoodchainAudio };
}

// ---------------------------------------------------------------- 8 · why the chain stops

/** The pyramid comes out of the corner and fills the frame over deep water; a seventh band tries to draw and stays empty. */
function drawWhy(ctx: CanvasRenderingContext2D, t: number, scene: ClimbScene): void {
  scene.water.draw(ctx, 0.95, 0, 0, t);
  const dark = darkOf(0.95);
  const u = smooth((t - T.why) / 1.2);
  const corner = cornerPyramid(t);
  const p: PyramidState = {
    bands: 6,
    x: corner.x + (1920 / 2 - corner.x) * u,
    baseY: corner.baseY + (1000 - corner.baseY) * u,
    base: corner.base + (1000 - corner.base) * u,
    alpha: 1,
    ghost: smooth((t - T.hunter) / 0.6) * (0.75 + 0.25 * Math.sin(t * 5)),
    arrows: 0,
    names: smooth((t - T.remember100) / 0.6),
  };
  drawPyramid(ctx, p, dark);
  // "Every step up keeps only a tenth": a puff off each band in turn.
  for (let k = 0; k < 5; k++) drawSmoke(ctx, p.x, p.baseY - (k + 0.5) * p.base * 0.11, 120, (t - T.keepsTenth - k * 0.35) / 1.4, dark);
  drawRuler(ctx, 7, 1 - u, dark);
  drawWeightTag(ctx, { grams: 5e6, jump: '', pop: 0, alpha: 1 - u }, dark);
  drawStepCard(ctx, 6, 'orca', 1 - u, dark);
}
