import { makeCanvas } from '../../../src/art/pen';
import { drawSquidPortrait, SQUID_TEX } from '../../../src/art/squidArt';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createGameCard } from '../bitecomp/gameCard';
import type { Short } from '../short';
import { smooth } from '../short';
import { vignette } from '../swallowyou/sea';
import { drawPop, drawText, PAPER_ON_INK, YELLOW_ON_INK } from '../swallowyou/text';
import { drawArena, drawFinal } from './arena';
import { renderSurvivalAudio } from './audio';
import { drawFlyingFish, drawLungfish, drawNurse, drawPodium, drawSpeedRound } from './cutins';
import { drawCounter, drawMiniCard, drawRoundCard, drawStagedNote, drawStamp, drawTags, EVIDENCE_INK, fadeIn, OUT_RED, window01 } from './hud';
import { H, W } from './layout';
import { drawLineup } from './lineup';
import { contestant, prepareSprites, type FishId } from './species';
import { sectionStart as s, T, VIDEO_S } from './timeline';
import { VERDICTS, type Verdict } from './verdicts';

/**
 * Draws "100 Fish Enter a Survival Tournament… Only One Can Win", the eighth
 * long-form video (script.md has the words, timeline.ts the beats). One arena
 * all through: a pen-and-ink tank on a stage, bright blue water, the game's
 * fish, contestant cards, stamps, the FISH LEFT counter top right and the
 * round's card top left. The to-scale line-up, the cut-in cards, the game
 * card and the winner's podium are the only other pictures.
 */

const boilAt = (t: number): number => Math.floor(t * 6) % BOIL_FRAMES;

const LINEUP = { from: T.okay, to: s(1) - 0.9 } as const;
const GAME = { from: T.inkfish - 0.25, to: T.now2 - 0.1 } as const;
const FINAL_AT = T.final - 0.6;
const PODIUM_AT = T.mudOut + 1.8;
const FADE = 0.6;

interface Round { readonly from: number; readonly to: number; readonly title: string; readonly sub: string; readonly cast: readonly FishId[] }

const ROUNDS: readonly Round[] = [
  { from: T.round1 - 0.2, to: T.speed - 0.9, title: 'ROUND 1 · STOP SWIMMING', sub: 'for 5 minutes · keep breathing without moving', cast: [] },
  { from: T.speed - 0.8, to: GAME.from, title: 'BREAK', sub: 'the speed round', cast: [] },
  { from: T.round2 - 0.3, to: T.round3 - 0.7, title: 'ROUND 2 · 100 °F', sub: "38 °C · lose your balance, you're out", cast: ['cod', 'salmon', 'icefish', 'eel', 'goldfish', 'pupfish', 'mudskipper', 'rivulus'] },
  { from: T.round3 - 0.3, to: T.round4 - 0.5, title: 'ROUND 3 · SEA WATER', sub: 'as salty as the sea · 35 ppt', cast: ['eel', 'goldfish', 'pupfish', 'mudskipper', 'rivulus'] },
  { from: T.round4 - 0.3, to: FINAL_AT, title: 'ROUND 4 · OUT OF WATER', sub: '24 hours in damp air', cast: ['eel', 'pupfish', 'mudskipper', 'rivulus'] },
  { from: FINAL_AT, to: PODIUM_AT, title: 'THE FINAL', sub: 'fresh water, then 2x the sea (70 ppt)', cast: ['mudskipper', 'rivulus'] },
];

/** The tags on screen: every verdict's, and the skipjack school's (not a verdict: the counter drops 90 at once). */
const TAGS: readonly Verdict[] = [
  ...VERDICTS.filter((v) => v.at < T.ninetyOut),
  { fish: 'tuna', at: T.ninetyOut + 0.4, kind: 'out', tag: 'must keep swimming to breathe', stamp: 'ESTIMATED', tagS: 4.5 },
  ...VERDICTS.filter((v) => v.at >= T.ninetyOut),
];

let squid: HTMLCanvasElement | null = null;
const squidArt = (): HTMLCanvasElement => {
  if (squid) return squid;
  const { canvas, ctx } = makeCanvas(SQUID_TEX.portrait.w * 2, SQUID_TEX.portrait.h * 2);
  ctx.scale(2, 2);
  drawSquidPortrait(ctx, 'light', 77);
  squid = canvas;
  return canvas;
};

/** The squid: drifts in, gets disqualified (a mollusc), and jets off in a puff of ink. */
function drawSquid(ctx: CanvasRenderingContext2D, t: number): void {
  if (t < T.wait - 0.4 || t > T.bye + 2) return;
  const art = squidArt();
  const arrive = smooth((t - T.wait + 0.4) / 1.6);
  const jet = Math.max(0, t - T.bye);
  const x = 2200 - 820 * arrive - 900 * jet - 2600 * jet * jet;
  const y = 430 + Math.sin(t * 1.4) * 14;
  const w = 600;
  ctx.drawImage(art, x - w * 0.3, y - w * 0.25, w, w / 2);
  // The ink puff left behind.
  if (jet > 0) {
    const at = 1380 + 0;
    for (let i = 0; i < 9; i++) {
      const r = (30 + i * 9) * (0.6 + 1.6 * smooth(jet / 0.8));
      ctx.fillStyle = `rgba(16,12,20,${0.75 * (1 - smooth((jet - 0.4) / 1.4))})`;
      ctx.beginPath();
      ctx.arc(at + Math.cos(i * 2.1) * 60 * jet * 2, y + Math.sin(i * 2.7) * 50 * jet * 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  drawStamp(ctx, 'DISQUALIFIED', OUT_RED, Math.max(x, 1380), y - 20, 64, t, T.mollusc + 0.1, 1 - smooth((jet - 0.5) / 0.4));
}

/** The cold open's words over the packed tank. */
function drawColdOpen(ctx: CanvasRenderingContext2D, t: number): void {
  drawPop(ctx, '100 FISH', 520, 105, 110, t, -0.5, T.five - 0.05, PAPER_ON_INK);
  drawPop(ctx, '5 CHALLENGES', 520, 105, 100, t, T.five, T.only - 0.05, PAPER_ON_INK);
  drawPop(ctx, 'ONLY 1 WINS', 520, 105, 110, t, T.only, T.wait - 0.5, YELLOW_ON_INK);
  drawStamp(ctx, 'MEASURED', EVIDENCE_INK.MEASURED, 1700, 232, 42, t, T.real, 1 - smooth((t - T.wait + 0.3) / 0.3));
  drawSquid(ctx, t);
  drawText(ctx, 'the squid never counted', { x: 1700, y: 232, size: 34, maxWidth: 380 }, 700, window01(t, T.mollusc + 0.6, T.okay + 0.4), PAPER_ON_INK);
  drawStagedNote(ctx, window01(t, T.lineupStaged, T.okay + 0.4, 0.3));
}

/** The round's card, the survivors' cards popping up at its start, the counter and the evidence tags. */
function drawHud(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  for (const r of ROUNDS) {
    const a = window01(t, r.from, r.to, 0.3);
    if (a <= 0) continue;
    drawRoundCard(ctx, r.title, r.sub, a);
    const roster = window01(t, r.from + 0.5, r.from + 4.5, 0.3);
    r.cast.forEach((id, i) => {
      const x = 1140 - (r.cast.length * 88) / 2 + i * 88;
      drawMiniCard(ctx, contestant(id), x, 30, 82, 104, t, boil, roster * fadeIn(t, r.from + 0.5 + i * 0.08, 0.2));
    });
  }
  drawCounter(ctx, t, 1);
  drawTags(ctx, TAGS, t, 1);
}

/** Draws `draw` faded to `alpha` through a spare layer (for cross-fades between pictures). */
function faded(ctx: CanvasRenderingContext2D, layer: CanvasRenderingContext2D, alpha: number, draw: (c: CanvasRenderingContext2D) => void): void {
  if (alpha <= 0) return;
  if (alpha >= 1) {
    draw(ctx);
    return;
  }
  layer.clearRect(0, 0, W, H);
  draw(layer);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.restore();
}

export async function createSurvival(ctx: CanvasRenderingContext2D): Promise<Short> {
  prepareSprites();
  const game = createGameCard();
  const layer = makeCanvas(W, H).ctx;
  const draw = (t: number): void => {
    const boil = boilAt(t);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const arena = (c: CanvasRenderingContext2D): void => {
      if (t >= FINAL_AT) drawFinal(c, t, boil);
      else drawArena(c, t, boil);
    };
    if (t >= PODIUM_AT) {
      arena(ctx);
      faded(ctx, layer, smooth((t - PODIUM_AT) / FADE), (c) => drawPodium(c, t, boil, 1));
    } else if (t >= GAME.from && t < GAME.to) {
      game.draw(ctx, t, GAME.from, T.eatUp, T.free, 1);
    } else if (t >= LINEUP.from && t < LINEUP.to + FADE) {
      if (t >= LINEUP.to) {
        drawArena(ctx, t, boil);
        faded(ctx, layer, 1 - smooth((t - LINEUP.to) / FADE), (c) => drawLineup(c, t, boil));
      } else {
        drawArena(ctx, t, boil);
        faded(ctx, layer, smooth((t - LINEUP.from) / FADE), (c) => drawLineup(c, t, boil));
      }
      drawCounter(ctx, t, 1);
      if (t < LINEUP.from + FADE) drawColdOpen(ctx, t);
    } else {
      // The crossfade into the final's two tanks.
      if (t >= FINAL_AT && t < FINAL_AT + FADE) {
        drawArena(ctx, t, boil);
        faded(ctx, layer, smooth((t - FINAL_AT) / FADE), (c) => drawFinal(c, t, boil));
      } else arena(ctx);
      drawNurse(ctx, t, boil, window01(t, T.nurse - 0.5, T.everyone - 0.2, 0.3));
      drawSpeedRound(ctx, t, boil, window01(t, T.speed - 0.6, GAME.from, 0.3));
      drawFlyingFish(ctx, t, boil, window01(t, T.flying - 0.3, T.lungfish - 0.3, 0.3));
      drawLungfish(ctx, t, boil, window01(t, T.lungfish - 0.2, T.eelSlither - 0.4, 0.3));
      if (t < LINEUP.from) drawColdOpen(ctx, t);
      drawHud(ctx, t, boil);
    }
    if (t >= PODIUM_AT && t < PODIUM_AT + FADE) drawCounter(ctx, t, 1 - smooth((t - PODIUM_AT) / FADE));
    vignette(ctx, 0.22);
    ctx.restore();
  };
  return { loopSeconds: VIDEO_S, draw, audio: renderSurvivalAudio };
}
