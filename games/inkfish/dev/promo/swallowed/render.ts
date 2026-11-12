import { INK, PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createGameCard } from '../bitecomp/gameCard';
import type { Short } from '../short';
import { smooth } from '../short';
import { createSea, vignette, wash } from '../swallowyou/sea';
import { drawPop, drawText, INK_ON_PAPER, PAPER_ON_INK, YELLOW_ON_INK } from '../swallowyou/text';
import { renderSwallowedAudio } from './audio';
import { drawClaim, drawLadder, drawStamp, fadeIn, window01 } from './hud';
import { H, W } from './layout';
import { drawAlone, drawSwallow, swallowAt, type Pt } from './scene';
import { prepareSprites, spriteOf, STEP_ORDER } from './species';
import { drawCounterAt, drawStepHud, ladderDone, stepAt, TIMES } from './steps';
import { drawSwimmer } from './swimmer';
import { said, sectionStart as s, T, VIDEO_S } from './timeline';

/**
 * Draws "swallowed whole size comparison… but every meal is real", the
 * seventh long-form video (script.md has the words, timeline.ts the beats).
 * One plain stage all through: blue water (black for the deep), the game's
 * own fish swallowing on it, the counter, the bars and the stamps. The cold
 * open and its reprise, the two "not measured" stops, the game card, the
 * swallower's twist and the end card are the only other pictures.
 */

const boilAt = (t: number): number => Math.floor(t * 6) % BOIL_FRAMES;
const GAME = { from: T.quick - 0.3, to: T.gameEnd + 0.5 } as const;
const LIONFISH = { from: T.lionfish - 0.25, to: s(3) - 0.35 } as const;
const PELICAN = { from: T.soTheFish - 0.25, to: s(4) - 0.4 } as const;
const REPRISE = { from: T.fromJuly - 0.2, to: T.outro - 0.25, huge: said('huge', T.fromJuly), or: said('or', T.fromJuly) } as const;
const END_AT = T.outro - 0.25;
export const SWALLOWER_BELLY = { size: 1.9, at: 0.52, width: 0.6, round: 0.45 } as const;

/** A dark spotlight: everything outside a soft circle round `at` dimmed. */
function spotlight(ctx: CanvasRenderingContext2D, at: Pt, r: number, strength: number): void {
  const g = ctx.createRadialGradient(at.x, at.y, r * 0.4, at.x, at.y, r * 1.6);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** A dashed outline of a long, slender fish `len` px long from x0, drawn on from the left. */
export function dashedMeal(ctx: CanvasRenderingContext2D, x0: number, y: number, len: number, drawn: number, alpha: number): void {
  if (drawn <= 0 || alpha <= 0) return;
  const h = len * 0.045;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.rect(x0 - 20, y - h * 3, (len + 40) * drawn, h * 6);
  ctx.clip();
  ctx.setLineDash([22, 14]);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#ffcf33';
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.quadraticCurveTo(x0 + len * 0.08, y - h, x0 + len * 0.2, y - h);
  ctx.lineTo(x0 + len * 0.85, y - h * 0.6);
  ctx.lineTo(x0 + len, y - h * 1.6);
  ctx.lineTo(x0 + len * 0.97, y);
  ctx.lineTo(x0 + len, y + h * 1.6);
  ctx.lineTo(x0 + len * 0.85, y + h * 0.6);
  ctx.lineTo(x0 + len * 0.2, y + h);
  ctx.quadraticCurveTo(x0 + len * 0.08, y + h, x0, y);
  ctx.stroke();
  ctx.restore();
}

/** The cold open (and its reprise): the July swallower in the dark, its balloon belly, the "?" and the 4.5x outline. */
function drawColdOpen(ctx: CanvasRenderingContext2D, sea: ReturnType<typeof createSea>, t: number, reprise: boolean): void {
  sea.draw(ctx, 'deep', t);
  const out = reprise ? 0 : smooth((t - T.fourTimes + 0.2) / 1.1);
  const len = 760 - 470 * out;
  const at = { x: 960 - 760 * out, y: 560 };
  const swell = SWALLOWER_BELLY.size * (reprise ? 1 : 0.7 + 0.3 * smooth((t - T.balloon) / 0.5)) * (1 + 0.04 * Math.sin(t * 2.4));
  drawAlone(ctx, 'swallower', at, len, t, boilAt(t), { belly: { ...SWALLOWER_BELLY, size: swell } });
  spotlight(ctx, at, len * 0.75, 0.75);
  const meal = { x: at.x + len * 0.62, y: at.y };
  dashedMeal(ctx, meal.x, meal.y, len * 4.5, smooth((t - T.fourTimes) / 1.2), reprise ? 0 : 1);
  if (!reprise) {
    drawText(ctx, '4.5× ITS LENGTH', { x: meal.x + len * 2.25, y: at.y - 120, size: 72, maxWidth: 900 }, 700, fadeIn(t, T.fourTimes + 0.8), YELLOW_ON_INK);
    drawText(ctx, 'JULY 2026 · 1,259 m · 4,131 ft deep', { x: 80, y: 90, size: 52, maxWidth: 1100, left: true }, 700, window01(t, T.over - 0.2, T.soToday - 0.3), PAPER_ON_INK);
    drawPop(ctx, '?', at.x + len * 0.02, at.y - len * 0.32, 200, t, T.nobodyKnows, T.fourTimes - 0.2, YELLOW_ON_INK);
  } else {
    drawPop(ctx, '?', at.x + len * 0.02, at.y - len * 0.32, 200, t, T.fromJuly + 0.4, T.outro - 0.3, YELLOW_ON_INK);
    drawPop(ctx, 'a huge meal…', 960, 900, 84, t, REPRISE.huge, REPRISE.or, PAPER_ON_INK);
    drawPop(ctx, '…or about to float up', 960, 900, 84, t, REPRISE.or, T.outro - 0.3, YELLOW_ON_INK);
  }
}

/** "Smallest to biggest": the four eaters popping on in a row, then "every number is real". */
function drawPromise(ctx: CanvasRenderingContext2D, sea: ReturnType<typeof createSea>, t: number): void {
  sea.draw(ctx, 'tropic', t);
  STEP_ORDER.forEach((id, i) => {
    const a = fadeIn(t, T.soToday + 0.5 + i * 0.6, 0.25);
    if (a <= 0) return;
    const eater = TIMES[id].plan.eater;
    const len = [340, 330, 260, 200][i]!;
    ctx.save();
    ctx.globalAlpha = a;
    drawAlone(ctx, eater, { x: 260 + i * 470, y: 520 }, len, t + i, boilAt(t), id === 'swallower' ? { belly: SWALLOWER_BELLY } : {});
    ctx.restore();
    drawText(ctx, ['50%+', '66%', '100%+', '???'][i]!, { x: 260 + i * 470, y: 700, size: 70, maxWidth: 400 }, 700, a, YELLOW_ON_INK);
  });
  drawPop(ctx, 'SMALLEST MEAL → BIGGEST', W / 2, 220, 96, t, T.smallest - 0.2, T.everyNumber - 0.1, PAPER_ON_INK);
  drawPop(ctx, 'EVERY NUMBER IS REAL', W / 2, 220, 110, t, T.everyNumber, s(1) - 0.3, YELLOW_ON_INK);
  drawStamp(ctx, 'MEASURED', W / 2, 900, 64, t, T.measuredOpen, 1 - smooth((t - s(1) + 0.3) / 0.3));
}

/** A stop: one fish, a claim and a verdict. */
function drawLionfish(ctx: CanvasRenderingContext2D, sea: ReturnType<typeof createSea>, t: number): void {
  sea.draw(ctx, 'tropic', t);
  drawAlone(ctx, 'lionfish', { x: 960, y: 640 }, 600, t, boilAt(t));
  drawClaim(ctx, 'STOMACH STRETCHES 30×?', 960, 130, fadeIn(t, T.lionfish + 1.1));
  drawStamp(ctx, 'NOT MEASURED', 960, 940, 72, t, T.couldnt);
}

function drawPelican(ctx: CanvasRenderingContext2D, sea: ReturnType<typeof createSea>, t: number): void {
  sea.draw(ctx, 'deep', t);
  const jaw = 3.2 * smooth((t - T.biggestMouth) / 0.5) * (1 - smooth((t - T.crustaceans - 0.25) / 0.2)) + 0.4;
  const at = { x: 860, y: 600 };
  drawAlone(ctx, 'pelican', at, 1300, t, boilAt(t), { jaw });
  // One tiny crustacean drifting into the mouth: a pink comma.
  const k = smooth((t - T.pelican) / (T.crustaceans + 0.2 - T.pelican));
  if (k < 1) {
    const x = 1500 - 380 * k;
    ctx.save();
    ctx.strokeStyle = '#ff8a9a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, at.y - 10 + 6 * Math.sin(t * 5), 9, 0.3, Math.PI * 1.6);
    ctx.stroke();
    ctx.restore();
  }
  drawClaim(ctx, 'BIGGEST MOUTH = BIGGEST MEALS?', 960, 190, fadeIn(t, T.soTheFish + 0.3));
  drawPop(ctx, 'mostly little crustaceans', 1380, 800, 76, t, T.crustaceans - 0.1, PELICAN.to, YELLOW_ON_INK);
  drawStamp(ctx, 'MYTH', 960, 950, 72, t, T.crustaceans + 0.5);
}

/** The meal seen through the stretched belly: a dashed fish folded back on itself three times. */
export function drawFoldedMeal(ctx: CanvasRenderingContext2D, at: Pt, len: number, alpha: number): void {
  if (alpha <= 0) return;
  const w = len * 0.24;
  const top = at.y - len * 0.02;
  const fold = len * 0.075;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.setLineDash([len * 0.03, len * 0.02]);
  ctx.lineWidth = len * 0.012;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#ffcf33';
  ctx.beginPath();
  ctx.moveTo(at.x + w, top);
  for (let i = 0; i < 4; i++) {
    const y = top + i * fold;
    const from = i % 2 === 0 ? at.x + w : at.x - w;
    const to = i % 2 === 0 ? at.x - w : at.x + w;
    ctx.lineTo(to, y);
    if (i < 3) ctx.quadraticCurveTo(to + (to < from ? -1 : 1) * fold * 0.6, y + fold / 2, to, y + fold);
  }
  ctx.stroke();
  ctx.restore();
}

/** The swallower after its meal: zoomed in, the belly greying as it rots, then rolling belly up and rising. */
function drawSwallowerTwist(ctx: CanvasRenderingContext2D, t: number): void {
  const plan = TIMES.swallower.plan;
  const st = swallowAt(plan, t);
  const zoom = 1 + 1.7 * smooth((t - T.folded - 0.6) / 1.4);
  const roll = smooth((t - T.floats + 0.2) / 1.2);
  const rise = smooth((t - T.floats) / 3.5) * 340;
  ctx.save();
  ctx.translate(960, 560 - rise);
  ctx.scale(zoom, zoom);
  ctx.translate(-plan.at.x, -plan.at.y);
  drawSwimmer(ctx, spriteOf('swallower'), { ...st.eater, effort: 0.35 * (1 - roll) }, boilAt(t), { ...st.look, squash: Math.cos(Math.PI * roll) });
  drawFoldedMeal(ctx, plan.at, plan.eaterLen, fadeIn(t, T.folded + 0.9, 0.5) * (1 - smooth((t - T.rot) / 0.6)));
  ctx.restore();
}

function drawStage(ctx: CanvasRenderingContext2D, sea: ReturnType<typeof createSea>, t: number): void {
  const id = stepAt(t);
  const deep = id === 'swallower';
  sea.draw(ctx, deep ? 'deep' : 'tropic', t);
  const twist = deep && t >= T.folded + 0.6;
  if (twist) {
    drawSwallowerTwist(ctx, t);
    wash(ctx, 'multiply', '#7a8a6a', 0.5 * smooth((t - T.rot) / 1) * (1 - smooth((t - T.floats) / 1.5)));
    // Light from the surface as it rises.
    const light = smooth((t - T.floats) / 2.5);
    if (light > 0) {
      const g = ctx.createLinearGradient(0, 0, 0, H * 0.7);
      g.addColorStop(0, `rgba(170,215,255,${0.5 * light})`);
      g.addColorStop(1, 'rgba(170,215,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    drawPop(ctx, 'IT CAN ROT INSIDE', 960, 170, 96, t, T.rot - 0.2, T.floats - 0.2, PAPER_ON_INK);
    drawPop(ctx, 'THE GAS FLOATS IT UP', 960, 170, 96, t, T.floats - 0.1, T.fromJuly - 0.3, YELLOW_ON_INK);
    drawPop(ctx, "that's how many are found", 960, 950, 72, t, T.howMany, T.fromJuly - 0.3, PAPER_ON_INK);
  } else if (id) {
    drawSwallow(ctx, TIMES[id].plan, t, boilAt(t));
  }
  if (deep) spotlight(ctx, { x: 700, y: 560 }, 700, 0.5);
  // A white flash on the frogfish's strike.
  const bam = t - T.bam;
  if (bam >= 0 && bam < 0.3) wash(ctx, 'screen', '#ffffff', 0.55 * (1 - bam / 0.3));
  const hud = twist ? 1 - smooth((t - T.folded - 0.6) / 0.4) : 1;
  if (id) drawStepHud(ctx, id, t, 1);
  drawCounterAt(ctx, t, hud);
  drawLadder(ctx, (s2) => ladderDone(s2, t), hud);
  drawPop(ctx, 'nobody weighed it', 1300, 800, 80, t, T.nobodyMeasured, T.eight - 0.2, PAPER_ON_INK, -0.05);
  drawPop(ctx, 'worst siblings', 1300, 800, 90, t, T.siblings, T.lionfish - 0.4, YELLOW_ON_INK, -0.05);
  drawPop(ctx, 'BAM!', 1350, 420, 180, t, T.bam, T.backbone + 0.3, YELLOW_ON_INK, -0.1);
}

function drawEndCard(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  drawAlone(ctx, 'swallower', { x: 1400, y: 470 }, 520, t, boilAt(t), { belly: SWALLOWER_BELLY });
  ctx.restore();
  drawText(ctx, 'InkFish', { x: 140, y: 560, size: 190, maxWidth: 760, left: true }, 700, alpha, INK_ON_PAPER);
  drawText(ctx, 'Start tiny. Swallow big.', { x: 146, y: 670, size: 64, maxWidth: 800, left: true }, 500, alpha, INK_ON_PAPER);
  drawText(ctx, 'Free in your browser · 16bit.ink', { x: 146, y: 770, size: 64, maxWidth: 800, left: true }, 700, alpha, INK_ON_PAPER);
}

export async function createSwallowed(ctx: CanvasRenderingContext2D): Promise<Short> {
  prepareSprites();
  const sea = createSea();
  const game = createGameCard();
  const draw = (t: number): void => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, H);
    if (t >= END_AT) drawEndCard(ctx, t, smooth((t - END_AT) / 0.4));
    else if (t >= REPRISE.from && t < REPRISE.to) drawColdOpen(ctx, sea, t, true);
    else if (t >= GAME.from && t < GAME.to) {
      game.draw(ctx, t, GAME.from, T.eatUp, T.free, smooth((t - GAME.from) / 0.25) * (1 - smooth((t - GAME.to + 0.25) / 0.25)));
    } else if (t >= LIONFISH.from && t < LIONFISH.to) drawLionfish(ctx, sea, t);
    else if (t >= PELICAN.from && t < PELICAN.to) drawPelican(ctx, sea, t);
    else if (t < T.soToday) drawColdOpen(ctx, sea, t, false);
    else if (t < TIMES.grouper.plan.enter) drawPromise(ctx, sea, t);
    else drawStage(ctx, sea, t);
    vignette(ctx, 0.28);
    sea.grain(ctx, 0.12);
    ctx.restore();
  };
  return { loopSeconds: VIDEO_S, draw, audio: renderSwallowedAudio };
}
