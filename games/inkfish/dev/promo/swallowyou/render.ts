import { createGameCard } from '../foodchain/inserts';
import type { Short } from '../short';
import { smooth } from '../short';
import { drawYou } from './art/people';
import { renderSwallowyouAudio } from './audio';
import { prepareCast } from './cast';
import { gradeAt, SHOCKS } from './grade';
import { drawGauge, drawStampCard, drawTestCard, gaugeAlpha } from './hud';
import { createKit } from './kit';
import { activeTest, H, type Stage, STAGES, stampCardAlpha, W } from './layout';
import { drawOpen } from './open';
import {
  createSceneKit, drawBoard, drawCapeCod, drawClippingScene, drawCrocEyes, drawDivers, drawFlorida, drawIceWalk, drawSealScene, type SceneKit,
} from './scenes';
import { vignette, wash } from './sea';
import { createStageKit, drawStage, type StageKit } from './stage';
import { drawText, INK_ON_PAPER } from './text';
import { CAPE_COD, CLIPPING, CROC_EYES, DIVERS, FLORIDA, ICE_WALK, SEAL, sectionStart, T, VIDEO_S } from './timeline';

/**
 * Draws "every ocean animal that could swallow you… only one actually could",
 * the third long-form video (script.md has the words, timeline.ts the beats):
 * the cold open (a humpback gulping a kayaker), "you" measured, then eight
 * animals smallest to biggest, each mouth-first, pulled back beside "you" on
 * the size ruler, put to the shoulder test and stamped, with the cut-aways
 * their stories need; the game card; the twist on the stamp card; the end
 * card. `&kit` shows the drawings instead (longform.ts only registers the
 * video, not a kit page).
 */

/** A cut-away: while it's on, it fills the frame instead of the stage. */
interface Cut {
  readonly from: number;
  readonly to: number;
  readonly draw: (ctx: CanvasRenderingContext2D, k: SceneKit, t: number) => void;
  /** It brings its own stamp card (or has no room for one). */
  readonly noCard?: boolean;
}

const CUTS: readonly Cut[] = [
  { ...FLORIDA, draw: drawFlorida },
  { ...DIVERS, draw: drawDivers },
  { ...SEAL, draw: drawSealScene },
  { ...CROC_EYES, draw: drawCrocEyes },
  { ...ICE_WALK, draw: drawIceWalk },
  { ...CAPE_COD, draw: drawCapeCod },
  { from: sectionStart(10) - 0.4, to: T.sperm - 0.4, draw: (c, k, t) => drawBoard(c, k, t, { mystery: 1, line: [T.whosLeft, T.sperm - 0.4, "so who's left?"] }), noCard: true },
  { ...CLIPPING, draw: drawClippingScene, noCard: true },
  { from: CLIPPING.to, to: T.notInterested - 0.2, draw: (c, k, t) => drawBoard(c, k, t, { neverHas: 1, line: [T.twist + 0.4, T.notInterested - 0.2, 'no whale has EVER been recorded swallowing a person'] }), noCard: true },
];

/** The game card's window, and the end card's start. */
const GAME = { from: sectionStart(5) - 0.3, to: CROC_EYES.from } as const;
const END_AT = T.end - 0.2;

const cutAt = (t: number): Cut | null => CUTS.find((c) => t >= c.from && t < c.to) ?? null;

/** The stage on at t: the last one whose close-up has begun. */
function stageAt(t: number): Stage | null {
  let on: Stage | null = null;
  for (const s of STAGES) if (t >= s.close) on = s;
  return on;
}

/** Every sentence's mood laid over the picture, and a flash on each shock. */
function drawGrade(ctx: CanvasRenderingContext2D, t: number): void {
  const g = gradeAt(t);
  wash(ctx, 'soft-light', '#ffb347', 0.22 * g.warm);
  wash(ctx, 'multiply', '#86a6c8', 0.28 * g.cold);
  vignette(ctx, 0.3 * g.cold + 0.35 * g.final + 0.3 * g.hush);
  wash(ctx, 'soft-light', '#ff7aa8', 0.24 * g.rosy);
  wash(ctx, 'soft-light', '#9a6bff', 0.26 * g.sly);
  wash(ctx, 'screen', '#4fb3c8', 0.08 * g.awe);
  wash(ctx, 'multiply', '#a4a4a4', 0.16 * g.final);
  wash(ctx, 'multiply', '#565266', 0.3 * g.hush);
  for (const at of SHOCKS) {
    const d = t - at;
    if (d >= 0 && d < 0.4) wash(ctx, 'screen', '#fff4e0', 0.35 * (1 - d / 0.4));
  }
}

/** The end card: the logo and the site on the left, the right half clear for YouTube's end-screen elements. */
function drawEndCard(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#f4eddc';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  drawYou(ctx, 230, 1040, 300, t, { arms: 'shrug', alpha, halo: 0 });
  drawText(ctx, 'InkFish', { x: 140, y: 400, size: 190, maxWidth: 760, left: true }, 700, alpha, INK_ON_PAPER);
  drawText(ctx, 'Every animal here is drawn for the game.', { x: 146, y: 500, size: 56, maxWidth: 780, left: true }, 500, alpha, INK_ON_PAPER);
  drawText(ctx, 'Free to try in your browser · 16bit.ink', { x: 146, y: 590, size: 60, maxWidth: 780, left: true }, 700, alpha, INK_ON_PAPER);
}

export async function createSwallowyou(ctx: CanvasRenderingContext2D): Promise<Short> {
  await prepareCast();
  const params = new URLSearchParams(location.search);
  if (params.has('kit')) return createKit(ctx, params.get('only'));
  const stageKit: StageKit = createStageKit();
  const sceneKit: SceneKit = createSceneKit(stageKit.sea);
  const game = createGameCard();

  const draw = (t: number): void => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (t >= END_AT) {
      drawEndCard(ctx, t, 1);
      ctx.restore();
      return;
    }
    if (t >= GAME.from && t < GAME.to) {
      game.draw(ctx, t, GAME.from, T.eatUp, T.free, 1);
      ctx.restore();
      return;
    }
    const cut = cutAt(t);
    const stage = stageAt(t);
    if (t < sectionStart(2) - 0.05) drawOpen(ctx, stageKit.sea, t);
    else if (cut) cut.draw(ctx, sceneKit, t);
    else if (stage) drawStage(ctx, stageKit, stage, t);
    drawGrade(ctx, t);
    stageKit.sea.grain(ctx, 0.14);
    // The HUD: the stamp card and its gauge, the test card.
    const card = cut?.noCard ? 0 : stampCardAlpha(t);
    const testing = activeTest(t);
    drawStampCard(ctx, t, card);
    drawGauge(ctx, Math.min(card, gaugeAlpha(t, testing !== null)));
    if (testing) drawTestCard(ctx, testing, t);
    // The end card fades up over the last of the sperm whale.
    if (t > END_AT - 0.4) drawEndCard(ctx, t, smooth((t - END_AT + 0.4) / 0.4));
    ctx.restore();
  };

  return { loopSeconds: VIDEO_S, draw, audio: renderSwallowyouAudio };
}
