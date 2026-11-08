import { INK, PAPER } from '../../../src/art/pen';
import { FRAME } from '../descent/frame';
import { createGameCard } from '../foodchain/inserts';
import type { Short } from '../short';
import { smooth } from '../short';
import { vignette, wash } from '../swallowyou/sea';
import { drawPop, drawText, INK_ON_PAPER, PAPER_ON_INK, YELLOW_ON_INK } from '../swallowyou/text';
import { renderBitecompAudio } from './audio';
import { cutsAt } from './cutins';
import { drawLadder, drawLine, drawNameCard, drawReadout, drawStamps, ladderAlpha } from './hud';
import { prepareSpecies, SPECIES } from './species';
import { drawBench, drawLab, withCamera } from './stage';
import { BITES, T, VIDEO_S } from './timeline';
import { drawLineup, drawLineupTitle, drawPerWeight, drawPiranhaInHand, lineupScale } from './twist';

/**
 * Draws "bite force comparison… but every number is real", the sixth
 * long-form video (script.md has the words, timeline.ts the beats): the lab
 * and its sensor bar, every head sliding in and chomping on its number, the
 * readout racing up in pounds with newtons under it, a MEASURED or
 * ESTIMATED stamp, the ladder filling along the top, the cut-ins, the game
 * card, the piranha twist and the end card.
 */

const W = FRAME.width;
const H = FRAME.height;

const GAME = { from: T.quick - 0.3, to: T.speaking + 0.1 } as const;
const TWIST = { lineup: T.forSizeTwist - 0.1, perWeight: T.thirty - 0.1, hand: T.poundForPound - 0.1 } as const;
const END_AT = T.inkfishFree - 0.25;

function drawEndCard(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  SPECIES.piranha.draw(ctx, { x: 620, y: 300, size: 220, jaw: 0.25 + 0.25 * Math.max(0, Math.sin(t * 2)) ** 8, t });
  ctx.restore();
  drawText(ctx, 'InkFish', { x: 140, y: 600, size: 190, maxWidth: 760, left: true }, 700, alpha, INK_ON_PAPER);
  drawText(ctx, 'Start tiny. Bite above your weight.', { x: 146, y: 700, size: 60, maxWidth: 800, left: true }, 500, alpha, INK_ON_PAPER);
  drawText(ctx, 'Free in your browser · 16bit.ink', { x: 146, y: 790, size: 64, maxWidth: 800, left: true }, 700, alpha, INK_ON_PAPER);
}

/** A white flash on every chomp, and the vignette. */
function drawGrade(ctx: CanvasRenderingContext2D, t: number): void {
  vignette(ctx, 0.28);
  for (const b of BITES) {
    const d = t - b.at;
    if (d >= 0 && d < 0.25) wash(ctx, 'screen', '#fff8e8', (0.12 + 0.04 * Math.log10(SPECIES[b.animal].lb)) * (1 - d / 0.25));
  }
}

/** The words that pop over the lab. */
function drawPops(ctx: CanvasRenderingContext2D, t: number): void {
  drawPop(ctx, "less than you'd think", 1280, 700, 84, t, T.lessThan, T.crush, YELLOW_ON_INK, -0.05);
  drawPop(ctx, 'it holds on', 1300, 700, 96, t, T.holdsOn - 0.1, T.quick - 0.4, YELLOW_ON_INK, -0.04);
  drawPop(ctx, 'the numbers are about to JUMP', W / 2, 560, 110, t, T.speaking + 0.4, T.bull, YELLOW_ON_INK, -0.04, 1700);
  drawPop(ctx, 'the estimates get HUGE', W / 2, 560, 120, t, T.huge, T.greatWhite - 0.2, YELLOW_ON_INK, -0.04, 1700);
  drawPop(ctx, '×10', 1500, 420, 200, t, T.tenTimes - 0.05, T.anEstimate, YELLOW_ON_INK, -0.08, 400);
  drawPop(ctx, 'the strongest bite ever measured', 1240, 700, 72, t, T.strongest, T.funny - 0.2, PAPER_ON_INK, -0.03, 1100);
}

/** The lab, with whatever cut-ins sit over it, and the HUD. */
function drawLabScene(ctx: CanvasRenderingContext2D, t: number): void {
  const cuts = cutsAt(t);
  const full = cuts.find((c) => c.cut.kind === 'full');
  if (full) {
    full.cut.draw(ctx, t, full.alpha);
    return;
  }
  drawLab(ctx, t);
  const twist = t >= TWIST.lineup;
  const lineupOnly = twist && t < T.this + 0.2;
  withCamera(ctx, t, () => {
    if (!lineupOnly) drawBench(ctx, t, twist ? smooth((t - T.this - 0.1) / 0.5) : 1);
  });
  if (twist) {
    drawLineup(ctx, t, lineupScale(t), 1 - 0.45 * smooth((t - T.this - 0.1) / 0.7));
    drawLineupTitle(ctx, t);
  }
  const over = cuts.filter((c) => c.cut.kind === 'over');
  const dim = Math.max(0, ...over.map((c) => c.alpha));
  const hud = (1 - 0.7 * dim) * (lineupOnly ? 0 : 1);
  drawLadder(ctx, t, ladderAlpha(t) * (1 - 0.5 * dim));
  drawNameCard(ctx, t, hud * (twist ? 0 : 1) + (twist ? smooth((t - T.piranha) / 0.3) * hud : 0));
  drawReadout(ctx, t, hud * (twist ? smooth((t - T.this - 0.3) / 0.4) : 1));
  drawStamps(ctx, t, hud);
  drawLine(ctx, t, hud);
  drawPops(ctx, t);
  if (dim > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(10,14,18,${0.6 * dim})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  for (const c of cuts) if (c.cut.kind !== 'full') c.cut.draw(ctx, t, c.alpha);
}

export async function createBitecomp(ctx: CanvasRenderingContext2D): Promise<Short> {
  await prepareSpecies();
  const game = createGameCard();

  const draw = (t: number): void => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, H);
    if (t >= END_AT) {
      drawEndCard(ctx, t, smooth((t - END_AT) / 0.4));
    } else if (t >= GAME.from && t < GAME.to) {
      game.draw(ctx, t, GAME.from, T.biteUp, T.free, smooth((t - GAME.from) / 0.25) * (1 - smooth((t - GAME.to + 0.25) / 0.25)));
    } else if (t >= TWIST.hand) {
      drawPiranhaInHand(ctx, t, smooth((t - TWIST.hand) / 0.3));
    } else if (t >= TWIST.perWeight) {
      drawPerWeight(ctx, t, smooth((t - TWIST.perWeight) / 0.3));
    } else {
      drawLabScene(ctx, t);
      drawGrade(ctx, t);
    }
    ctx.restore();
  };

  return { loopSeconds: VIDEO_S, draw, audio: renderBitecompAudio };
}
