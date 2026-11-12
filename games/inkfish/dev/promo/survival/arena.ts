import { smooth } from '../short';
import { drawPop, drawCard, drawText, INK_ON_PAPER, YELLOW_ON_INK } from '../swallowyou/text';
import { drawOut, drawTick, fadeIn, window01 } from './hud';
import { LEFT_TANK, LOG, phaseAt, RIGHT_TANK, TANK, type Rect } from './layout';
import {
  drawBowlBack, drawBowlFront, drawCalendar, drawClock, drawFlow, drawGauge, drawLog, drawShaker, drawStopSign, drawThermometer, drawVs, saltAt, tempF,
} from './props';
import { drawFishState, fishAt, spotOf, type FishState } from './scene';
import { drawHaze, drawSchool, drawTunaNames, HERO } from './school';
import { aspectOf, type FishId } from './species';
import { clipTo, drawStage, drawTankBack, drawTankFront, type Water } from './tank';
import { T } from './timeline';
import { leaveOf, VERDICTS, type Verdict } from './verdicts';

/**
 * The tank and everything in it, round by round: the water's state, the
 * contestants, their stamps and ticks where each verdict landed, and each
 * round's props. The final's two tanks are drawn by drawFinal.
 */

const CAST: readonly FishId[] = ['white', 'mako', 'cod', 'salmon', 'icefish', 'eel', 'goldfish', 'giantMudskipper', 'mudskipper', 'pupfish', 'rivulus'];

function waterAt(t: number): Water {
  const dry = t >= T.drain - 0.1;
  return {
    level: dry ? 1 - smooth((t - T.drain) / 1.6) : 1,
    heat: Math.max(0, Math.min(1, (tempF(t) - 57) / 43)),
    salt: Math.min(1, saltAt(t) / 40),
    mud: dry ? smooth((t - T.drain - 0.8) / 1.4) : 0,
  };
}

/** Every OUT stamp and pass tick showing at t (for the verdicts `inTank` picks), on the fish as it was when its verdict landed. */
function drawMarks(ctx: CanvasRenderingContext2D, t: number, inTank: (v: Verdict) => boolean): void {
  for (const v of VERDICTS) {
    if (t < v.at || !inTank(v)) continue;
    const spot = spotOf(v.fish, v.at);
    if (!spot) continue;
    if (v.kind === 'out') {
      const a = 1 - smooth((t - leaveOf(v) - 2.2) / 0.6);
      if (a > 0) drawOut(ctx, spot.x, spot.y, v.big ? 150 : v.soft ? 58 : 76, t, v.at, a);
    } else {
      const a = 1 - smooth((t - v.at - (v.tagS ?? 5)) / 0.4);
      const r = Math.max(24, Math.min(40, spot.len * 0.16));
      if (a > 0) drawTick(ctx, spot.x, spot.y - spot.len * aspectOf(v.fish) - r - 14, r, t, v.at, a);
    }
  }
}

/** The goldfish in its bowl, from round 3's verdict on. */
function drawBowl(ctx: CanvasRenderingContext2D, t: number, boil: number, gold: FishState | null): void {
  const a = fadeIn(t, T.gfOut - 0.4, 0.4);
  if (a <= 0) return;
  drawBowlBack(ctx, a);
  if (gold?.free) drawFishState(ctx, gold, t, boil);
  drawBowlFront(ctx, a);
}

/** The single tank (everything before the final). */
export function drawArena(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const phase = phaseAt(t);
  const water = waterAt(t);
  const zoom = 1 + 1.7 * window01(t, T.tiny - 0.3, T.two + 0.2, 0.9);
  drawStage(ctx, t);
  ctx.save();
  if (zoom > 1) {
    const fx = LOG.x0 + 40;
    const fy = LOG.y - 40;
    ctx.translate(fx, fy);
    ctx.scale(zoom, zoom);
    ctx.translate(-fx, -fy);
  }
  drawTankBack(ctx, TANK, water, t, boil);
  const states = CAST.map((id) => fishAt(id, t)).filter((s): s is FishState => s !== null);
  const schoolOn = t < T.andThen + 3.5;
  ctx.save();
  clipTo(ctx, TANK);
  if (schoolOn) {
    drawSchool(ctx, t, boil, true);
    drawHaze(ctx, TANK.x, TANK.y, TANK.w, TANK.h, 0.28);
  }
  const big = states.filter((s) => s.id === 'white' || s.id === 'mako');
  for (const s of big) drawFishState(ctx, s, t, boil);
  if (schoolOn) drawSchool(ctx, t, boil, false);
  if (phase === 'dry') {
    const riv = states.find((s) => s.id === 'rivulus');
    drawLog(ctx, water.mud, () => {
      if (riv) drawFishState(ctx, riv, t, boil);
    });
  }
  for (const s of states) {
    if (big.includes(s) || s.free || (phase === 'dry' && s.id === 'rivulus')) continue;
    drawFishState(ctx, s, t, boil);
  }
  // Round 3's beam on the goldfish.
  const beam = window01(t, T.goldfish3 - 0.2, T.gfOut + 0.8, 0.4);
  const gold = states.find((s) => s.id === 'goldfish');
  if (beam > 0 && gold && !gold.free) {
    const g = ctx.createRadialGradient(gold.x, gold.y, 80, gold.x, gold.y, 420);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${0.55 * beam})`);
    ctx.fillStyle = g;
    ctx.fillRect(TANK.x, TANK.y, TANK.w, TANK.h);
  }
  drawMarks(ctx, t, (v) => v.at < T.final - 0.6);
  ctx.restore();
  // Each round's props.
  drawStopSign(ctx, t, window01(t, T.stop - 0.2, T.everyone + 1.5, 0.3));
  drawFlow(ctx, HERO.x, HERO.y, HERO.len, t, window01(t, T.waterRush - 0.2, T.tunaStop + 0.2, 0.3));
  drawThermometer(ctx, t, window01(t, T.heat - 0.2, T.round3 - 0.8, 0.5));
  drawShaker(ctx, t, T.into, 640);
  drawGauge(ctx, TANK, saltAt(t), window01(t, T.into - 0.2, T.drain + 0.6, 0.4), window01(t, T.halfSalty, T.gfOut + 2, 0.3));
  drawTankFront(ctx, TANK, boil);
  ctx.restore();
  drawTunaNames(ctx, t);
  drawBowl(ctx, t, boil, gold ?? null);
  drawClock(ctx, t, window01(t, T.h24 - 0.3, T.final - 0.8, 0.3));
  // Round 2's rewind gag and the eel's coin flip.
  drawPop(ctx, '◀◀ REWIND', 960, 280, 76, t, T.f57, T.gone + 0.6, YELLOW_ON_INK);
  const coin = window01(t, T.eelLimit - 0.1, T.scrapes + 1.4, 0.25);
  const eel = fishAt('eel', T.eelLimit);
  if (coin > 0 && eel) {
    const x = Math.min(Math.max(eel.x, 330), 1300);
    drawCard(ctx, x - 260, eel.y - 250, 520, 130, coin);
    drawText(ctx, 'water 100.0 °F · 37.8 °C', { x, y: eel.y - 212, size: 40, maxWidth: 480 }, 700, coin, INK_ON_PAPER);
    drawText(ctx, "eel's limit 100.4 °F · 38.0 °C", { x, y: eel.y - 158, size: 40, maxWidth: 480 }, 700, coin, { fill: '#b5381e', halo: '#fffaf0' });
  }
  drawPop(ctx, '66 DAYS+', 760, 600, 230, t, T.days66, T.two + 0.3, YELLOW_ON_INK);
}

/** One of the final's tanks with its fish. */
function finalTank(ctx: CanvasRenderingContext2D, r: Rect, id: FishId, t: number, boil: number): void {
  const ppt = saltAt(t);
  drawTankBack(ctx, r, { level: 1, heat: 0, salt: Math.min(1, ppt / 40), mud: 0 }, t, boil);
  const s = fishAt(id, t);
  ctx.save();
  clipTo(ctx, r);
  if (s) drawFishState(ctx, s, t, boil);
  // Fresh water running in from above.
  const run = window01(t, T.fresh - 0.1, T.fresh + 1.8, 0.3);
  if (run > 0) {
    ctx.fillStyle = `rgba(200,236,255,${0.6 * run})`;
    ctx.fillRect(r.x + r.w * 0.45, r.y, 46, r.h);
  }
  drawMarks(ctx, t, (v) => v.at >= T.final - 0.6 && v.fish === id);
  ctx.restore();
  drawGauge(ctx, r, ppt, fadeIn(t, T.oneTest, 0.4));
  drawTankFront(ctx, r, boil);
}

/** The final: two tanks side by side, the mudskipper's on the left. */
export function drawFinal(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  drawStage(ctx, t);
  const push = 1 + 0.3 * smooth((t - T.mudFresh) / 2.5);
  ctx.save();
  if (push > 1) {
    ctx.translate(500, 600);
    ctx.scale(push, push);
    ctx.translate(-500, -600);
  }
  finalTank(ctx, LEFT_TANK, 'mudskipper', t, boil);
  finalTank(ctx, RIGHT_TANK, 'rivulus', t, boil);
  drawShaker(ctx, t, T.brine, LEFT_TANK.x + LEFT_TANK.w / 2 - 60);
  drawShaker(ctx, t, T.brine + 0.2, RIGHT_TANK.x + RIGHT_TANK.w / 2 - 60);
  ctx.restore();
  drawVs(ctx, window01(t, T.oneTest + 0.8, T.mudFresh, 0.3));
  drawPop(ctx, 'BRINE: 2X THE SEA', 960, 250, 80, t, T.brine, T.notOne - 0.3, YELLOW_ON_INK);
  drawPop(ctx, 'FRESH WATER', 960, 250, 80, t, T.fresh, T.noProblem, YELLOW_ON_INK);
  drawCalendar(ctx, t, window01(t, T.mudFresh + 0.6, T.mudOut + 1.5, 0.3));
  drawPop(ctx, "can't handle a rain puddle", 640, 860, 64, t, T.puddle, T.mudOut + 1.5, YELLOW_ON_INK);
}
