import { drawCrabBack, PLAYER_COLORS } from '../../../src/art/crabArt';
import { FRAME, GROUND } from '../../../src/art/frame';
import { makeDraw } from '../../../src/art/kit';
import { PAPER, RED } from '../../../src/art/palette';
import { makeCanvas } from '../../../src/art/pen';
import { drawSpokenLine, type TextInk } from '../captions';
import { clamp01, lerp, smooth, VIDEO, type Short } from '../short';
import { bakeSprite, boilAt, crabSprite, critterSprite, drawSprite, type Sprite, shellSprite } from '../sprites';
import { renderCrabsAudio } from './audio';
import { drawDecapod, type Look } from './decapod';
import { drawKingCrab } from './kingCrab';
import { burst, dashedArrow, drawPage, label, leader, tally, written } from './page';
import {
  ancestorLabelAt, armourLabelAt, arrowAt, burstAt, captionAt, fiveAt, type Figure, GROUND_Y, headingAt, HERMIT, HERMIT_LANE, hermitAt,
  hermitNameAt, kingAt, kingNameAt, kingTitleAt, LANE_ANCESTOR_X, LANE_RESULT_X, laneFigure, LANES, lanesAt, leastAt, LOOP_S, marchAt,
  marchFigure, MARCH_NAMES, meaningAt, nameAt, nameSwapAt, probablyAt, resultLabelAt, sayItAt, shapeCalloutAt, shellLabelAt,
  STAMPS, stampAt, tallyAt, wrap, writeAt,
} from './story';

/** Draws the "evolution keeps making crabs" short (story.ts has the choreography). */

const RED_INK: TextInk = { fill: RED, halo: PAPER };
const TIP = '#6b3420';
/** The march, shrimp-like to crab: each a little more crab than the last. */
const MARCH_LOOKS: readonly Look[] = [
  { wash: '#e3916c', tip: TIP, claw: 0.5 },
  { wash: '#c0653a', tip: TIP, claw: 1 },
  { wash: '#c99a62', tip: TIP, claw: 0.85 },
  { wash: '#c4703e', tip: TIP, claw: 0.9 },
];
const KING_UNITS = 220;

/**
 * The pen kit sets its own alpha on every mark, so a group of live
 * drawings fades as one through an offscreen layer.
 */
function makeLayer(ctx: CanvasRenderingContext2D): (alpha: number, paint: (c: CanvasRenderingContext2D) => void) => void {
  const { canvas, ctx: layer } = makeCanvas(VIDEO.width, VIDEO.height);
  return (alpha, paint) => {
    if (alpha <= 0) return;
    if (alpha >= 1) {
      paint(ctx);
      return;
    }
    layer.clearRect(0, 0, VIDEO.width, VIDEO.height);
    paint(layer);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
  };
}

/** One morphing crustacean, drawn live (its shape changes every frame), boiling with the game's line. */
function drawFigure(c: CanvasRenderingContext2D, fig: Figure, look: Look, seed: number, boil: number): void {
  c.save();
  c.translate(fig.x, fig.y);
  c.scale(fig.scale, fig.scale);
  drawDecapod(makeDraw(c, seed + boil * 17, boil, 0), fig.m, look);
  c.restore();
}

export function createCrabs(ctx: CanvasRenderingContext2D): Short {
  const layer = makeLayer(ctx);
  const king = bakeSprite(KING_UNITS, 6, 0, 900, drawKingCrab);
  // The game's hermit crab, its soft coiled tail drawn too: it shows once it walks out of the shell.
  const hermitBack = bakeSprite(FRAME, 4, GROUND, 100, (d) => drawCrabBack(d, false, PLAYER_COLORS, true));
  const hermitFront = crabSprite('front');
  const whelk = shellSprite('whelk');
  const stamps: readonly Sprite[] = STAMPS.map((s) => critterSprite(s.species, 5));

  const drawHermit = (x: number, y: number, scale: number, boil: number, shell: number, crab: number, dx: number): void => {
    drawSprite(ctx, hermitBack, boil, { x: x + dx, y, scale, alpha: crab });
    drawSprite(ctx, whelk, boil, { x, y, scale, alpha: shell });
    drawSprite(ctx, hermitFront, boil, { x: x + dx, y, scale, alpha: crab });
  };

  function drawOpening(t: number, boil: number): void {
    const head = headingAt(t);
    if (head.alpha > 0) {
      written(ctx, 'Evolution keeps', { x: 540, y: 362 }, 112, clamp01(head.reveal * 2), head.alpha);
      written(ctx, 'making CRABS', { x: 540, y: 478 }, 112, clamp01(head.reveal * 2 - 1), head.alpha, RED_INK);
    }
    const alpha = marchAt(t);
    layer(alpha, (c) => MARCH_LOOKS.forEach((look, i) => drawFigure(c, marchFigure(i, t), look, 300 + i * 40, boil)));
    // The reading order: across the top row, down to the next, across again.
    dashedArrow(ctx, { x: 500, y: 690 }, { x: 590, y: 690 }, 1, alpha * 0.8, t, 5);
    // Out of the way while the callout's leader runs past it.
    dashedArrow(ctx, { x: 640, y: 805 }, { x: 470, y: 880 }, 1, alpha * 0.8 * (1 - shapeCalloutAt(t)), t, 5);
    dashedArrow(ctx, { x: 500, y: 960 }, { x: 590, y: 960 }, 1, alpha * 0.8, t, 5);
    MARCH_NAMES.forEach((name, i) => {
      const swap = nameSwapAt(i, t);
      const f = marchFigure(i, t);
      const at = { x: f.x, y: f.y + 52 };
      // The old name fades out before "crab!" fades in, so they never overprint.
      label(ctx, name, at, 50, alpha * (1 - smooth(swap * 2)), 500);
      label(ctx, 'crab!', at, 58, alpha * (i === 3 ? 1 : smooth(swap * 2 - 1)), 700, i === 3 ? undefined : RED_INK);
    });
    const callout = shapeCalloutAt(t);
    if (callout > 0) {
      const f = marchFigure(1, t);
      label(ctx, 'wide, flat shell', { x: 760, y: 560 }, 54, callout);
      leader(ctx, { x: 760, y: 576 }, { x: f.x - 10, y: f.y - f.scale * 38 }, callout);
      label(ctx, 'tail tucked under', { x: 560, y: 850 }, 50, callout);
      leader(ctx, { x: 620, y: 815 }, { x: f.x - 25, y: f.y - f.scale * 12 }, callout);
    }
  }

  function drawLanes(t: number, boil: number): void {
    const alpha = lanesAt(t);
    if (alpha <= 0) return;
    layer(alpha, (c) => {
      LANES.forEach((lane, k) => {
        if (k !== HERMIT_LANE) drawFigure(c, laneFigure(k, 'ancestor', t), { wash: lane.wash, tip: TIP, claw: lane.claw }, 500 + k * 30, boil);
        drawFigure(c, laneFigure(k, 'result', t), { wash: lane.wash, tip: TIP, claw: lane.claw }, 700 + k * 30, boil);
      });
    });
    const hermit = laneFigure(HERMIT_LANE, 'ancestor', t);
    drawHermit(hermit.x + 20, hermit.y, 0.9, boil, alpha, alpha, 0);
    LANES.forEach((lane, k) => {
      dashedArrow(ctx, { x: 345, y: lane.y - 28 }, { x: 515, y: lane.y - 28 }, 1, alpha * 0.8, t, 5);
      label(ctx, lane.ancestor, { x: LANE_ANCESTOR_X, y: lane.y + 40 }, 42, ancestorLabelAt(k, t), 500);
      label(ctx, lane.result, { x: 890, y: lane.y - 12 }, 46, resultLabelAt(k, t));
    });
    label(ctx, 'at least', { x: 215, y: 370 }, 70, leastAt(t));
    tally(ctx, { x: 500, y: 345 }, LANES.map((_, k) => tallyAt(k, t)));
    const five = fiveAt(t);
    if (five > 0) {
      ctx.save();
      ctx.translate(810, 340);
      ctx.scale(five, five);
      label(ctx, '×5', { x: 0, y: 45 }, 150, clamp01(five * 2), 700, RED_INK);
      ctx.restore();
    }
  }

  function drawKingScene(t: number, boil: number): void {
    const h = hermitAt(t);
    if (h.shell > 0 || h.crab > 0) drawHermit(HERMIT.x, GROUND_Y, HERMIT.scale, boil, Math.min(1, h.shell), Math.min(1, h.crab), h.dx);
    const k = kingAt(t);
    if (k.alpha > 0) drawSprite(ctx, king, boil, { x: k.x, y: k.y, scale: k.scale, alpha: k.alpha });
    burst(ctx, { x: HERMIT.x + HERMIT.walk + 40, y: GROUND_Y - 90 }, 170, burstAt(t));
    dashedArrow(ctx, { x: HERMIT.x + 170, y: 720 }, { x: 640, y: 720 }, arrowAt(t), Math.min(1, arrowAt(t) * 4), t);
    label(ctx, 'probably…?', { x: 520, y: 650 }, 76, probablyAt(t));
    label(ctx, 'KING CRAB', { x: 540, y: 420 }, 140, kingTitleAt(t), 700, RED_INK);
    label(ctx, 'king crab', { x: k.x + 50, y: 610 }, 64, kingNameAt(t));
    const hn = hermitNameAt(t);
    label(ctx, 'hermit crab', { x: HERMIT.x - 40, y: 560 }, 64, hn);
    leader(ctx, { x: HERMIT.x - 40, y: 580 }, { x: HERMIT.x - 20, y: GROUND_Y - 150 }, hn);
    const sl = shellLabelAt(t);
    label(ctx, 'borrowed shell', { x: 250, y: 1065 }, 56, sl);
    leader(ctx, { x: 250, y: 1022 }, { x: HERMIT.x - 30, y: GROUND_Y - 40 }, sl);
    const al = armourLabelAt(t);
    label(ctx, 'armour of', { x: 600, y: 470 }, 66, al);
    label(ctx, 'their own', { x: 600, y: 540 }, 66, al);
    leader(ctx, { x: 600, y: 560 }, { x: k.x + 5, y: k.y - k.scale * 52 }, al);
  }

  function drawName(t: number, boil: number): void {
    STAMPS.forEach((s, i) => {
      const v = stampAt(i, t);
      if (v > 0) drawSprite(ctx, stamps[i]!, boil + i, { x: s.x, y: s.y, scale: s.scale * lerp(0.45, 1, v), facing: s.facing, alpha: clamp01(v * 2.5) });
    });
    const name = nameAt(t);
    if (name <= 0) return;
    label(ctx, 'scientists call it:', { x: 540, y: 670 }, 62, name, 500);
    ctx.save();
    ctx.globalAlpha = name * 0.7;
    ctx.fillStyle = '#26316a';
    ctx.fillRect(140, 812, 800 * name, 5);
    ctx.restore();
    written(ctx, 'carcinization', { x: 540, y: 790 }, 132, writeAt(t), name, RED_INK);
    label(ctx, 'car-sin-eye-ZAY-shun', { x: 540, y: 880 }, 58, sayItAt(t), 500);
    label(ctx, '= evolving into a crab', { x: 540, y: 950 }, 54, meaningAt(t));
  }

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t);
    drawPage(ctx);
    drawOpening(t, boil);
    drawLanes(t, boil);
    drawKingScene(t, boil);
    drawName(t, boil);
    const cap = captionAt(t);
    if (cap) drawSpokenLine(ctx, cap.line.words.map((w) => w.text), cap.word);
  };
  return { loopSeconds: LOOP_S, draw, audio: renderCrabsAudio };
}
