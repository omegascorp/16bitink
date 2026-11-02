import { makeCanvas, PAPER } from '../../../src/art/pen';
import { drawTextLine } from '../captions';
import { drawStopwatch } from '../kayak/effects';
import { VIDEO } from '../short';
import { drawBlueShark, drawSeal, drawSharkIcon, drawWhite, onAnimal } from './figures';
import { drawBar, drawBiteBubbles, drawBurp, drawBurst, drawMotionLines, drawEquals, drawSky, drawSweat, RED } from './scene';
import { TEXT } from './script';
import {
  BAR_SEAL_Y, BAR_SHARK_Y, BAR_X0, BAR_X1, BURP_AT, biteNape, bitePlaced, biteShark, burstAt, chaseAt, chaseViewAt, clockAt, clockHand, countAt, counterAt, equalAt, iconPop, LOOP_S,
  onWhite, peekAt, peekSnoutX, placeAt, placeSouthAt, SEAL_MOUTH, SHARK_BELLY, whiteTagAt, sealBarAt, sealLabelAt, sharkBarAt, sharkLabelAt, surfaceAt, tugAt, TICK_AT, WHITE_EYE,
} from './story';

/** The six scenes, each drawn on its own transparent layer (the water is under them all). */

const PAPER_ON_BLUE = { fill: PAPER, halo: '#10335f' };
const RED_ON_PAPER = { fill: RED, halo: PAPER };

/** Where the "great white" tag sits, right of the rising shark's snout. */
const WHITE_TAG_X = 800;
/** Where the counter's number and the clock sit: either side, clear of the dive in the middle. */
const COUNT_X = 165;
const CLOCK_X = 915;

let scratch: ReturnType<typeof makeCanvas> | null = null;

/** Draws through `draw` at `alpha` (the pen sets its own alpha, so a faded drawing goes via a scratch layer). */
export function faded(ctx: CanvasRenderingContext2D, alpha: number, draw: (c: CanvasRenderingContext2D) => void): void {
  if (alpha <= 0.005) return;
  if (alpha >= 0.995) {
    draw(ctx);
    return;
  }
  scratch ??= makeCanvas(VIDEO.width, VIDEO.height);
  scratch.ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
  draw(scratch.ctx);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(scratch.canvas, 0, 0);
  ctx.restore();
}

/** Frame 1: the seal biting the blue shark behind its head, both big, the seal shaking its head and the shark thrashing. */
export function drawBite(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const shark = biteShark(t);
  const seal = bitePlaced(t);
  const nape = biteNape(t);
  const tail = onAnimal(seal, { x: -168, y: 0 });
  const dir = { x: Math.cos(seal.rot + Math.PI), y: Math.sin(seal.rot + Math.PI) };
  drawMotionLines(ctx, tail, dir, t / LOOP_S);
  drawBlueShark(ctx, shark, { bend: shark.bend, fear: 1 }, boil);
  drawSeal(ctx, seal, { mood: 'fierce', gape: seal.gape }, boil);
  drawBiteBubbles(ctx, nape, t / LOOP_S);
  drawBurst(ctx, nape, burstAt(t));
}

/** From below, off Cape Point: the seal at the surface, a huge great white rising under it, jaws opening. */
export function drawSurface(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const s = surfaceAt(t);
  drawSky(ctx, t / LOOP_S, boil);
  if (s.white) drawWhite(ctx, s.white, t);
  drawSeal(ctx, s.seal, { mood: s.fierce ? 'fierce' : 'plain', gape: 0 }, boil);
  drawTextLine(ctx, 'Off Cape Point', VIDEO.width / 2, TEXT.place.y, TEXT.place.size, 700, placeAt(t));
  if (s.white) drawTextLine(ctx, 'great white', WHITE_TAG_X, TEXT.whiteTag.y, TEXT.whiteTag.size, 700, whiteTagAt(t), RED_ON_PAPER);
  drawTextLine(ctx, 'South Africa', VIDEO.width / 2, TEXT.placeSouth.y, TEXT.placeSouth.size, 700, placeSouthAt(t), RED_ON_PAPER);
}

/** The chase: the seal diving at a scared blue shark below, seen from a different angle after each cut. */
export function drawChase(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const c = chaseAt(t);
  const v = chaseViewAt(t);
  ctx.save();
  ctx.translate(540, 800);
  ctx.rotate(v.rot);
  ctx.scale(v.zoom * v.mirror, v.zoom);
  ctx.translate(-v.cx, -v.cy);
  const tail = onAnimal(c.seal, { x: -168, y: 0 });
  drawMotionLines(ctx, tail, { x: -Math.cos(c.seal.rot), y: -Math.sin(c.seal.rot) }, t / LOOP_S);
  drawBlueShark(ctx, c.shark, { fear: 1, bend: 0.1 * Math.sin(t * 9) }, boil);
  drawSeal(ctx, c.seal, { mood: 'fierce', gape: c.seal.gape }, boil);
  ctx.restore();
  drawCounter(ctx, t, boil);
}

/** The counter, five shark icons ticking in, and the clock. */
function drawCounter(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const shown = counterAt(t);
  if (shown <= 0.01) return;
  faded(ctx, shown, (c) => {
    for (let n = 0; n < 5; n++) {
      const x = 150 + n * 195;
      const pop = iconPop(n, t);
      c.save();
      c.translate(x, 330);
      if (pop > 0) {
        c.scale(pop, pop);
        drawSharkIcon(c, 0, 0, 170, boil);
      } else {
        c.strokeStyle = 'rgba(244,237,220,0.55)';
        c.lineWidth = 5;
        c.setLineDash([12, 12]);
        c.beginPath();
        c.ellipse(0, 0, 80, 26, 0, 0, Math.PI * 2);
        c.stroke();
      }
      c.restore();
    }
  });
  const count = countAt(t);
  const tickAge = count > 0 ? t - TICK_AT[count - 1]! : 1;
  const bump = 1 + 0.25 * Math.max(0, 1 - tickAge / 0.15);
  if (count > 0) drawTextLine(ctx, String(count), COUNT_X, TEXT.count.y, TEXT.count.size * bump, 700, shown, count === 5 ? RED_ON_PAPER : PAPER_ON_BLUE);
  const clock = clockAt(t);
  if (clock > 0.01) {
    drawStopwatch(ctx, { x: CLOCK_X, y: 540 }, 62, clock, clockHand(t), boil);
    drawTextLine(ctx, '2 hr', CLOCK_X, TEXT.clock.y, TEXT.clock.size, 700, clock, PAPER_ON_BLUE);
  }
}

/** The tug at the shark's belly from behind; then the smug seal in its napkin, a burp, the shark's dark shape sinking below. */
export function drawTug(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const tug = tugAt(t);
  if (tug.phase === 'tug') {
    drawBlueShark(ctx, tug.shark, { bend: tug.shark.bend, fear: 1 }, boil);
    drawSeal(ctx, tug.seal, { mood: 'fierce', gape: tug.seal.gape }, boil);
    drawBiteBubbles(ctx, onAnimal(tug.shark, SHARK_BELLY), t / LOOP_S);
    return;
  }
  faded(ctx, tug.sharkAlpha, (c) => drawBlueShark(c, tug.shark, { dark: tug.dark }, boil));
  drawSeal(ctx, tug.seal, { mood: 'smug', gape: 0, napkin: true, puff: tug.puff }, boil);
  drawBurp(ctx, onAnimal(tug.seal, { x: SEAL_MOUTH.x + 26, y: SEAL_MOUTH.y - 4 }), t - BURP_AT);
}

/** Two equal length bars: the seal and a blue shark, "5 ft / 1.5 m" each. */
export function drawBars(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const seal = { x: 456, y: BAR_SEAL_Y - 150, len: 600, rot: 0, face: 1 as const, beat: t * 3 };
  const shark = { x: 473, y: BAR_SHARK_Y - 130, len: 562, rot: 0, face: 1 as const, beat: t * 4 };
  const tremble = 3 * Math.sin(t * 31);
  drawSeal(ctx, { ...seal, x: seal.x + tremble }, { mood: 'nervous', gape: 0, sweat: 0.4 + 0.6 * Math.abs(Math.sin(t * 2.2)) }, boil);
  drawBlueShark(ctx, shark, {}, boil);
  drawBar(ctx, BAR_X0, BAR_X1, BAR_SEAL_Y, sealBarAt(t), boil);
  drawBar(ctx, BAR_X0, BAR_X1, BAR_SHARK_Y, sharkBarAt(t), boil);
  const sealLabel = sealLabelAt(t);
  const sharkLabel = sharkLabelAt(t);
  drawTextLine(ctx, '5 ft', 915, TEXT.feetSeal.y, TEXT.feetSeal.size, 700, sealLabel, PAPER_ON_BLUE);
  drawTextLine(ctx, '1.5 m', 915, TEXT.metresSeal.y, TEXT.metresSeal.size, 700, sealLabel, RED_ON_PAPER);
  drawTextLine(ctx, '5 ft', 915, TEXT.feetShark.y, TEXT.feetShark.size, 700, sharkLabel, PAPER_ON_BLUE);
  drawTextLine(ctx, '1.5 m', 915, TEXT.metresShark.y, TEXT.metresShark.size, 700, sharkLabel, RED_ON_PAPER);
  const eq = equalAt(t);
  drawEquals(ctx, 915, (BAR_SEAL_Y + BAR_SHARK_Y) / 2 + 30, 80, eq);
}

/** A big great white noses in from the side, tips its nose at the seal, gets a nervous eye and a sweat drop, and backs off. */
export function drawPeek(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const p = peekAt(t);
  drawSeal(ctx, p.seal, { mood: 'sly', gape: 0, wave: p.shoo, napkin: true }, boil);
  if (peekSnoutX(p) > VIDEO.width + 40) return;
  drawWhite(ctx, p.white, t);
  const eye = onWhite(p.white, WHITE_EYE);
  drawSweat(ctx, eye.x + 30, eye.y - 80 + 50 * p.scared, 22, p.scared);
  drawSweat(ctx, eye.x + 100, eye.y - 50 + 34 * p.scared, 14, p.scared * 0.85);
}
