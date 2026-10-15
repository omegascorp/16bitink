import { BOIL } from '../../../src/art/palette';
import { drawSpokenLine } from '../captions';
import { VIDEO, type Short } from '../short';
import { makeCanvas } from '../../../src/art/pen';
import { renderChainAudio } from './audio';
import { type Cast, drawCrabIn, drawNaked, drawPuffAt, drawShell, makeCast } from './cast';
import { callout, drawClock, drawHopArc, drawLane, drawRope, drawStopwatch, drawWaiting, drawWritten } from './props';
import { lanePath, ROPES, ROWS, shellTop, SLOT_X, SLOT_Y, SLOTS } from './layout';
import { crabsAt, PUFF_S, PUFFS, shellsAt, WAVE_LEFT, waveAt } from './queue';
import { drawBeach, drawWave, makeBeach } from './scene';
import {
  bigShellLabel, biggestJolt, biggestLabel, boilAt, captionAt, chainArcAt, clockAt, clockTurnsAt, headingAt, headingWritten, hintArcsAt,
  hoursLabel, LOOP_S, paperLabel, rulerAt, SECONDS_AT, secondsLabel, smallestLabel, stopwatchAt, stopwatchTicksAt, waitAt, walkFrameAt,
} from './story';

/**
 * Draws the "hermit crabs queue up to swap houses" short (story.ts and
 * queue.ts have the choreography, layout.ts the snaking queue): the beach,
 * the size ruler along the queue's lane, the rows back to front with their
 * ropes, the crabs out of their shells on top, then the marks and the
 * captions.
 */

/** Where the clock and then the stopwatch stand, in the sky over the line, and where their labels go. */
const DIAL = { x: 870, y: 400, r: 100 } as const;
const DIAL_LABEL = { x: 640, y: 430 } as const;
const LANE = lanePath();

function drawLine(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const crabs = crabsAt(t);
  const shells = shellsAt(t);
  const walk = walkFrameAt(t);
  const frameOf = (c: (typeof crabs)[number]): number => (c.mode === 'in' && c.walking ? walk : boil);
  ROWS.forEach((row, r) => {
    // Along the row from the head of the line, so each crab's claws lie over the shell ahead.
    for (const slot of row.slots) {
      const here = crabs.filter((c) => c.mode === 'in' && c.slot === slot);
      for (const c of here) drawCrabIn(ctx, cast, c, frameOf(c), 'back');
      for (const s of shells.filter((x) => x.slot === slot)) drawShell(ctx, cast, s, boil);
      for (const c of here) drawCrabIn(ctx, cast, c, frameOf(c), 'front');
    }
    if (r === 0) {
      // The wave washes over whatever it reaches on the first row, the shell it brings too.
      const wave = waveAt(t);
      drawWave(ctx, WAVE_LEFT, wave.reach, wave.alpha, boil);
    }
    const rope = ROPES[r];
    if (rope) drawRope(ctx, rope.y, rope.posts, boil);
  });
  for (const c of crabs) drawNaked(ctx, cast, c, walk);
  for (const [at, slot] of PUFFS) drawPuffAt(ctx, cast, slot, (t - at + 0.08) / PUFF_S, boil);
}

/** The marks: hop arcs, the waiting dots, labels, the clock and the stopwatch, the paper and the heading. */
function drawMarks(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  // "swap houses": a dashed hint of the hops; "each crab taking the next shell up": the hops, one by one, up the snake.
  for (let slot = 1; slot < SLOTS; slot++) {
    const [a, b] = [shellTop(slot), shellTop(slot - 1)];
    const hint = hintArcsAt(t);
    drawHopArc(ctx, a, b, 60, hint, hint * 0.7, true);
    const arc = chainArcAt(slot, t);
    drawHopArc(ctx, a, b, 75, arc, Math.min(1, arc * 3), false);
  }
  for (let slot = 1; slot < SLOTS; slot++) {
    const top = shellTop(slot);
    drawWaiting(ctx, { x: top.x, y: top.y - 50 }, waitAt(t), t, slot * 0.17);
  }
  callout(ctx, 'big empty shell', { x: 470, y: 520 }, shellTop(0), bigShellLabel(t), 80, boil);
  const jolt = 1 + 0.15 * biggestJolt(t);
  callout(ctx, 'biggest', { x: SLOT_X[1]!, y: shellTop(1).y - 30 }, null, biggestLabel(t), 84 * jolt, boil);
  callout(ctx, 'smallest', { x: SLOT_X[SLOTS - 1]! + 230, y: SLOT_Y[SLOTS - 1]! - 40 }, null, smallestLabel(t), 84, boil);
  drawClock(ctx, DIAL, DIAL.r, clockAt(t), clockTurnsAt(t), boil);
  callout(ctx, 'for hours', DIAL_LABEL, null, hoursLabel(t), 80, boil);
  // "in SECONDS": the stopwatch clicked where the clock was.
  const press = Math.max(0, 1 - Math.abs(t - (SECONDS_AT - 0.2)) / 0.12);
  drawStopwatch(ctx, DIAL, DIAL.r, stopwatchAt(t), stopwatchTicksAt(t), press, boil);
  callout(ctx, 'seconds!', DIAL_LABEL, null, secondsLabel(t), 80, boil);
  // "Scientists call it a vacancy chain".
  callout(ctx, 'Rotjan, Chabot & Lewis, 2010', { x: 540, y: 330 }, null, paperLabel(t), 56, boil);
  drawWritten(ctx, 'vacancy chain', 540, 470, 140, headingWritten(t), headingAt(t), boil);
}

export function createChain(ctx: CanvasRenderingContext2D): Short {
  const beach = makeBeach();
  const cast = makeCast();
  const scratch = makeCanvas(VIDEO.width, VIDEO.height).ctx;

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL;
    drawBeach(ctx, beach, t);
    drawLane(ctx, scratch, LANE, rulerAt(t));
    drawLine(ctx, cast, t, boil);
    drawMarks(ctx, t, boil);
    const now = captionAt(t);
    if (now) drawSpokenLine(ctx, now.line.words.map((w) => w.text), now.word);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderChainAudio };
}
