import { INK, RED } from '../../../src/art/palette';
import type { Short } from '../short';
import { clamp01, smooth } from '../short';
import { boilAt } from '../sprites';
import { renderSwallowAudio } from './audio';
import { drawBeats } from './beats';
import { flash } from './cards';
import { makeCast, type Cast } from './cast';
import { drawGame } from './game';
import { card, drawCounter, drawNameCard, drawPinCard, write } from './hud';
import { drawCrown, drawLineup, drawRosette, type LineupOpts, lineupOn } from './lineup';
import { drawOlive } from './olive';
import { drawOpenShot } from './open';
import { drawStep, type Shot } from './scene';
import { CORN_STEP, DEER_STEP, FAWN_STEP, HYENA_STEP, OLIVE_STEP, type Step } from './steps';
import { createTwist, type Twist } from './twist';
import { T, sectionStart as s, VIDEO_S } from './timeline';

/**
 * Draws "what's the biggest thing a snake can swallow?", the fifth long
 * video (script.md has the words, timeline.ts the beats): the cold open on
 * the deer, then each meal's shot (corn snake, olive python, the game,
 * the Burmese with the fawn and the deer, the rock python), the line-up
 * between them, the egg-eater's twist side-on, the end card.
 */

function stepAt(t: number): Step | null {
  if (t < s(1)) return null;
  if (t < s(2)) return CORN_STEP;
  if (t < s(3)) return OLIVE_STEP;
  if (t < s(4)) return null;
  if (t < s(5)) return FAWN_STEP;
  if (t < s(6)) return DEER_STEP;
  if (t < s(7)) return HYENA_STEP;
  return null;
}

function lineupOpts(t: number): LineupOpts {
  const everyone = t < s(1) || t >= T.biggestMouth;
  if (t >= T.champion && t < s(1)) return { everyone, egg: 'coil', eggDark: 1 };
  if (t >= T.y2023 && t < T.thisOne) return { everyone, egg: 'coil' };
  if (t >= T.biggestMouth) return { everyone, egg: 'lump' };
  return { everyone };
}

function drawRow(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const row = drawLineup(ctx, cast, t, boil, lineupOpts(t));
  const rock = row.heads[4]!;
  const crownOn = clamp01((t - T.biggestWins + 0.3) / 0.3) * (1 - smooth((t - T.notClose - 1.4) / 0.2));
  if (t > T.biggestWins - 0.3 && t < T.notClose + 1.6) drawCrown(ctx, { x: rock.x + 230, y: rock.y + 110 }, 80, Math.max(0, t - T.notClose) / 1.2, crownOn);
  if (t >= T.barely7 - 0.2) drawRosette(ctx, { x: row.egg.x + 90, y: row.egg.y - 10 }, 56, (t - T.barely7 + 0.2) / 0.5);
  // The cold open's unnamed silhouette: the row goes dark round it.
  if (t >= T.champion && t < s(1)) {
    const d = smooth((t - T.champion) / 1.2) * 0.55;
    const g = ctx.createRadialGradient(row.egg.x, row.egg.y, 120, row.egg.x, row.egg.y, 900);
    g.addColorStop(0, `rgba(10,8,6,${d * 0.4})`);
    g.addColorStop(1, `rgba(10,8,6,${d})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1920, 1080);
    write(ctx, '?', row.egg.x + 230, row.egg.y - 60, 220, { alpha: smooth((t - T.barely) / 0.4), fill: '#f2cf55', halo: INK });
  }
}

/** The end card: the title in the left half, the right half left clear for YouTube's end screen. */
function drawEnd(ctx: CanvasRenderingContext2D, t: number): void {
  const a = smooth((t - T.every + 0.3) / 0.5);
  if (a <= 0) return;
  card(ctx, 70, 170, 760, 560, a, -0.015);
  write(ctx, 'InkSnake', 450, 360, 170, { alpha: a });
  write(ctx, '10 real snakes to play', 450, 460, 62, { alpha: a, weight: 500 });
  write(ctx, 'start as the corn snake', 450, 545, 58, { alpha: a * smooth((t - T.start) / 0.4), weight: 500 });
  write(ctx, 'free · 16bit.ink', 450, 650, 78, { alpha: a * smooth((t - T.start - 0.6) / 0.4), fill: RED });
}

export function createSwallow(ctx: CanvasRenderingContext2D): Short {
  const cast = makeCast();
  const twist: Twist = createTwist();
  const draw = (t: number): void => {
    const boil = boilAt(t);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    let shot: Shot | null = null;
    if (t < T.lining) shot = drawOpenShot(ctx, cast, t, boil);
    else if (t >= T.thisOne && t < T.biggestMouth) twist.draw(ctx, t);
    else if (lineupOn(t)) drawRow(ctx, cast, t, boil);
    else if (t >= s(3) && t < s(4)) drawGame(ctx, cast, t, boil);
    else {
      const st = stepAt(t);
      if (st === OLIVE_STEP) shot = drawOlive(ctx, cast, t, boil);
      else if (st) shot = drawStep(ctx, cast, st, t, boil);
      else drawRow(ctx, cast, t, boil);
    }
    drawBeats(ctx, cast, t, boil, shot);
    drawPinCard(ctx, t);
    drawNameCard(ctx, t);
    // Over the line-up the weight tags at the heads do the counting; the counter only comes back, on top, for the twist's flip.
    const row = lineupOn(t) && t >= T.lining;
    if (!row || t >= T.biggestWins) drawCounter(ctx, t, row);
    flash(ctx, Math.max(0, 1 - Math.abs(t - T.seventySeven - 0.1) / 0.2));
    drawEnd(ctx, t);
    ctx.restore();
  };
  return { loopSeconds: VIDEO_S, draw, audio: renderSwallowAudio };
}
