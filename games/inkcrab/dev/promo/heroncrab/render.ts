import { drawSpokenLine, drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { inkWash, makeLayer, drawArrow } from '../crabbird/marks';
import { RED, PAPER_FILL } from '../../../src/art/palette';
import { VIDEO, type Short } from '../short';
import { boilAt } from '../sprites';
import { drawCrab, drawCrabHands } from './art/crab';
import { drawHeron, HEAD_SCALE } from './art/heron';
import { type Backdrop, drawBackdrop, drawRings, drawShallows, makeSoftMarsh, makeWideMarsh } from './art/marsh';
import { renderHeronCrabAudio } from './audio';
import { drawGameCard, type GameCard, makeGameCard } from './card';
import { drawAlarm, drawBang, drawDrips, drawHitStar, drawPinch, drawShakeLines, drawSplash } from './marks';
import {
  AFTER_CRAB, AT, bangAt, billPoint, type Cam, CLAMP_U, CLOSE_WATER_Y, CTA, ctaAt, drips, eyeOf, LOOP_S, posesOf, SCORE, scoreCrabAt, scoreHeronAt,
  type Shot, shakeLinesAt, shotsAt, snapMarkAt, splashAt, spokenAt, starAt, WADE_Y,
} from './story';

/** Draws "This heron picked the wrong crab" (story.ts has the choreography). */

interface Kit {
  readonly wide: Backdrop;
  readonly soft: Backdrop;
  readonly card: GameCard;
}

function withCam(ctx: CanvasRenderingContext2D, cam: Cam, draw: () => void): void {
  ctx.save();
  ctx.translate(VIDEO.width / 2, VIDEO.height / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);
  draw();
  ctx.restore();
}

/** The close-up (and the hook): the soft marsh behind, the head and bill big, the crab on it. */
function drawClose(ctx: CanvasRenderingContext2D, kit: Kit, shot: Shot, boil: number): void {
  const t = shot.at;
  const { heron, crab, cam } = posesOf(shot);
  withCam(ctx, cam, () => {
    // The soft background drifts a little against the head.
    ctx.save();
    ctx.translate((heron.head.x * heron.k - 360) * -0.04, 0);
    drawBackdrop(ctx, kit.soft);
    ctx.restore();
    drawHeron(ctx, heron, boil);
    drawCrab(ctx, crab, boil, false);
    drawCrabHands(ctx, crab, boil);
    if (shot.id === 'close') {
      drawShallows(ctx, -60, 1140, CLOSE_WATER_Y, 640, t, 5);
      drawRings(ctx, 660, CLOSE_WATER_Y + 8, 300, (t - AT.lift + 0.1) / 1.2, boil);
      drawDrips(ctx, drips(t));
      ([0, 1] as const).forEach((i) => drawPinch(ctx, billPoint(heron, CLAMP_U[i], -0.4), 70, snapMarkAt(t, i), boil));
      const head = { x: heron.x + heron.head.x * heron.k, y: heron.y + heron.head.y * heron.k };
      drawShakeLines(ctx, head, 40 * HEAD_SCALE * heron.k, shakeLinesAt(t), t, boil);
      drawSplash(ctx, crab.x, CLOSE_WATER_Y, 60, (t - AT.drop - 0.12) / 0.5, 9);
    }
    // Shock strokes off the back of the startled head.
    const back = { x: heron.x + heron.head.x * heron.k - 150, y: heron.y + heron.head.y * heron.k - 110 };
    drawAlarm(ctx, back, 70, shot.id === 'hook' || t > AT.clamp1 + 0.1 ? 1 : 0, boil);
  });
}

/** The wide marsh: the stalk, the strike, the jab at the eye, the stand-off, the second try. */
function drawMarsh(ctx: CanvasRenderingContext2D, kit: Kit, shot: Shot, boil: number): void {
  const t = shot.at;
  const { heron, crab, cam } = posesOf(shot);
  withCam(ctx, cam, () => {
    drawBackdrop(ctx, kit.wide);
    drawHeron(ctx, heron, boil);
    drawCrab(ctx, crab, boil);
    drawShallows(ctx, -400, 1600, WADE_Y - 4, 220, t, 3);
    drawRings(ctx, heron.x + 20, WADE_Y + 4, 120, ((t - AT.hookOut) % 1.1) / 1.1, boil);
    const eye = eyeOf(heron);
    drawHitStar(ctx, eye.x, eye.y, 64, starAt(t), boil);
    drawBang(ctx, eye.x + 70, eye.y - 60, 170, Math.max(bangAt(t), starAt(t) > 0 && starAt(t) < 0.5 ? 1 : 0), 0.12);
    drawSplash(ctx, crab.x - 40, WADE_Y, 40, (t - AT.strike - 0.06) / 0.5, 4);
  });
}

/** After: the heron flapping off over the marsh, the crab alone with its claws up. */
function drawAfter(ctx: CanvasRenderingContext2D, kit: Kit, shot: Shot, boil: number): void {
  const t = shot.at;
  const { heron, crab, cam } = posesOf(shot);
  withCam(ctx, cam, () => {
    drawBackdrop(ctx, kit.wide);
    drawHeron(ctx, heron, boil);
    drawCrab(ctx, crab, boil);
    drawShallows(ctx, -400, 1600, AFTER_CRAB.y + 40, 260, t, 8);
    drawSplash(ctx, crab.x, AFTER_CRAB.y + 40, 60, splashAt(t), 12);
    drawRings(ctx, crab.x, AFTER_CRAB.y + 46, 300, splashAt(t), boil);
  });
}

function drawShot(ctx: CanvasRenderingContext2D, kit: Kit, shot: Shot, boil: number): void {
  if (shot.id === 'hook' || shot.id === 'close') drawClose(ctx, kit, shot, boil);
  else if (shot.id === 'marsh') drawMarsh(ctx, kit, shot, boil);
  else drawAfter(ctx, kit, shot, boil);
}

const HOT_INK: TextInk = { fill: RED, halo: PAPER_FILL };

function drawCaptions(ctx: CanvasRenderingContext2D, t: number): void {
  for (const r of spokenAt(t)) drawSpokenLine(ctx, r.words, r.current, INK_ON_PAPER, RED, r.y, r.size, r.unsaid);
  const [c, h] = [scoreCrabAt(t), scoreHeronAt(t)];
  drawTextLine(ctx, 'Crab 1', SCORE.crabX, SCORE.y, SCORE.size, 700, c, HOT_INK);
  drawTextLine(ctx, '·', (SCORE.crabX + SCORE.heronX) / 2, SCORE.y, SCORE.size, 700, Math.min(c, h), INK_ON_PAPER);
  drawTextLine(ctx, 'Heron 0', SCORE.heronX, SCORE.y, SCORE.size, 700, h, INK_ON_PAPER);
}

function drawCta(ctx: CanvasRenderingContext2D, kit: Kit, t: number, boil: number): void {
  const a = ctaAt(t);
  if (a <= 0) return;
  drawGameCard(ctx, kit.card, t, a, boil);
  drawTextLine(ctx, '10 levels free', CTA.x, CTA.y, CTA.size, 700, a, INK_ON_PAPER);
  drawTextLine(ctx, 'tap the channel name', CTA.x, CTA.subY, CTA.subSize, 700, a, INK_ON_PAPER);
  drawArrow(ctx, a, boil);
}

export function createHeronCrab(ctx: CanvasRenderingContext2D): Short {
  const kit: Kit = { wide: makeWideMarsh(), soft: makeSoftMarsh(), card: makeGameCard() };
  const layer = makeLayer();
  return {
    loopSeconds: LOOP_S,
    draw(seconds: number): void {
      const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
      const boil = boilAt(t);
      const s = shotsAt(t);
      drawShot(ctx, kit, s.under, boil);
      if (s.over) {
        layer.ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
        drawShot(layer.ctx, kit, s.over, boil);
        if (s.how === 'wash') inkWash(ctx, layer.canvas, layer.ctx, s.u);
        else {
          ctx.save();
          ctx.globalAlpha = s.u;
          ctx.drawImage(layer.canvas, 0, 0);
          ctx.restore();
        }
      }
      drawCaptions(ctx, t);
      drawCta(ctx, kit, t, boil);
    },
    audio: renderHeronCrabAudio,
  };
}
