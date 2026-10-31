import { INK, PAPER } from '../../../src/art/pen';
import type { Pose } from '../chain';
import { drawTextLine } from '../captions';
import { drawSeal as drawSealSilhouette } from '../surfer/figures';
import type { Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { drawStopwatch } from '../kayak/effects';
import { makeCanvas } from '../../../src/art/pen';
import { VIDEO } from '../short';
import { drawBlueShark, drawSeal, drawSharkIcon, onAnimal, pinned, SHARK_PLUMP } from './figures';
import { drawBar, drawBiteBubbles, drawBurp, drawMotionLines, drawEquals, drawSky, drawSweat, RED } from './scene';
import { TEXT } from './script';
import {
  BAR_SEAL_Y, BAR_SHARK_Y, BAR_X0, BAR_X1, BURP_AT, biteSeal, biteShark, chaseAt, chaseViewAt, clockAt, clockHand, countAt, counterAt, equalAt, iconPop, LOOP_S, peekAt,
  placeAt, placeSouthAt, whiteTagAt, sealBarAt, sealLabelAt, sharkBarAt, sharkLabelAt, surfaceAt, tugAt, TICK_AT,
} from './story';

/** The six scenes, each drawn on its own transparent layer (the water is under them all). */

const PAPER_ON_BLUE = { fill: PAPER, halo: '#10335f' };
const RED_ON_PAPER = { fill: RED, halo: PAPER };

export interface Sprites {
  readonly white: Sprite;
}


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

/** Where the seal's jaws close, in the seal's own units. */
const MOUTH = { x: 128, y: 12 } as const;

/** Frame 1: the seal biting the blue shark behind its head, both big. */
export function drawBite(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const shark = biteShark(t);
  const seal = biteSeal(t);
  const nape = onAnimal(shark, { x: 40, y: -20 * SHARK_PLUMP });
  const placed = pinned(seal, MOUTH, nape);
  const tail = onAnimal(placed, { x: -168, y: 0 });
  const dir = { x: Math.cos(seal.rot + Math.PI), y: Math.sin(seal.rot + Math.PI) };
  drawMotionLines(ctx, tail, dir, t / LOOP_S);
  drawBlueShark(ctx, shark, { bend: shark.bend }, boil);
  drawSeal(ctx, placed, { mood: 'fierce', gape: seal.gape }, boil);
  drawBiteBubbles(ctx, nape, t / LOOP_S);
}

const poseOf = (x: number, y: number, len: number, facing: 1 | -1, tilt: number, beat: number, effort: number): Pose => ({
  j: 0, shape: 'shark', age: 0, x, y, length: len, facing, tilt, beat, effort,
});

/** From below, off Cape Point: a seal at the surface, a great white rising under it. */
export function drawSurface(ctx: CanvasRenderingContext2D, sprites: Sprites, t: number, boil: number): void {
  const s = surfaceAt(t);
  drawSky(ctx, t / LOOP_S, boil);
  if (s.white) drawSwimmer(ctx, sprites.white, poseOf(s.white.x, s.white.y, s.white.len, 1, s.white.tilt, s.white.beat, 0.8), boil);
  drawSealSilhouette(ctx, { x: s.seal.x, y: s.seal.y, len: s.seal.len, face: -1, tilt: 0, beat: s.seal.beat, effort: s.seal.effort }, boil);
  drawTextLine(ctx, 'Off Cape Point', VIDEO.width / 2, TEXT.place.y, TEXT.place.size, 700, placeAt(t));
  if (s.white) drawTextLine(ctx, 'great white', 760, TEXT.whiteTag.y, TEXT.whiteTag.size, 700, whiteTagAt(t), RED_ON_PAPER);
  drawTextLine(ctx, 'South Africa', VIDEO.width / 2, TEXT.placeSouth.y, TEXT.placeSouth.size, 700, placeSouthAt(t), RED_ON_PAPER);
}

/** Streaks behind a fast swimmer. */
function drawStreaks(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(236,250,255,0.7)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const yy = y - 90 + i * 36;
    const len = 90 + 40 * ((i * 37) % 5);
    const x0 = x - 330 - ((t * 700 + i * 160) % 500);
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(x0, yy);
    ctx.lineTo(x0 - len, yy);
    ctx.stroke();
  }
  ctx.restore();
}

/** The chase: the seal closing on a blue shark, seen from a different angle after each cut. */
export function drawChase(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const c = chaseAt(t);
  const v = chaseViewAt(t);
  ctx.save();
  ctx.translate(540, 800);
  ctx.rotate(v.rot);
  ctx.scale(v.zoom * v.mirror, v.zoom * v.flipY);
  ctx.translate(-v.cx, -v.cy);
  drawStreaks(ctx, c.seal.x, c.seal.y, t);
  drawSeal(ctx, c.seal, { mood: 'fierce', gape: c.seal.gape }, boil);
  drawBlueShark(ctx, c.shark, {}, boil);
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
  drawTextLine(ctx, String(count), 270, TEXT.count.y, TEXT.count.size * bump, 700, shown, count === 5 ? RED_ON_PAPER : PAPER_ON_BLUE);
  const clock = clockAt(t);
  if (clock > 0.01) {
    drawStopwatch(ctx, { x: 800, y: 540 }, 62, clock, clockHand(t), boil);
    drawTextLine(ctx, '2 hr', 800, TEXT.clock.y, TEXT.clock.size, 700, clock, PAPER_ON_BLUE);
  }
}

/** Where the settled seal's mouth is. */
const SETTLED_MOUTH = { x: 720, y: 700 } as const;

/** The tug at the shark's belly, the sink, and the smug seal's burp. */
export function drawTug(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const tug = tugAt(t);
  const belly = onAnimal(tug.shark, { x: 18, y: 18 * SHARK_PLUMP });
  const grab = pinned(tug.seal, MOUTH, belly);
  const rest = pinned(tug.seal, MOUTH, SETTLED_MOUTH);
  const s = tug.settle;
  const seal = { ...tug.seal, x: grab.x + (rest.x - grab.x) * s, y: grab.y + (rest.y - grab.y) * s };
  const smug = s > 0.35;
  const look = { mood: smug ? ('smug' as const) : ('fierce' as const), gape: tug.seal.gape, napkin: s > 0.55, puff: tug.puff };
  // Behind the shark while it tugs at the belly; in front once it lets go and sinks.
  const sharkLayer = (): void => faded(ctx, tug.sharkAlpha, (c) => drawBlueShark(c, tug.shark, { dark: tug.dark }, boil));
  if (s > 0.15) {
    sharkLayer();
    drawSeal(ctx, seal, look, boil);
  } else {
    drawSeal(ctx, seal, look, boil);
    sharkLayer();
  }
  drawBurp(ctx, onAnimal(seal, { x: 152, y: 8 }), t - BURP_AT);
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

/** The great white peeks in, looks at the seal, and backs off, sweating. */
export function drawPeek(ctx: CanvasRenderingContext2D, sprites: Sprites, t: number, boil: number): void {
  const p = peekAt(t);
  drawSeal(ctx, p.seal, { mood: 'sly', gape: 0, wave: p.shoo, napkin: true }, boil);
  if (p.white.x > 1500) return;
  drawSwimmer(ctx, sprites.white, poseOf(p.white.x, p.white.y, p.white.len, -1, 0, p.white.beat, 0.5), boil);
  // A big cartoon eye over the shark's own: glancing at the seal, then wide and scared.
  const eye = { x: p.white.x - 0.37 * p.white.len, y: p.white.y - 0.03 * p.white.len };
  const r = 24 + 12 * p.scared;
  ctx.save();
  ctx.fillStyle = '#fbfaf4';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(eye.x, eye.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#101418';
  ctx.beginPath();
  ctx.arc(eye.x - 11 * p.look * (1 - p.scared) - 4, eye.y + 4 * p.look, 11 - 5 * p.scared, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawSweat(ctx, eye.x - 8, eye.y - 62 + 40 * p.scared, 12, p.scared);
  drawSweat(ctx, eye.x + 40, eye.y - 40 + 30 * p.scared, 9, p.scared * 0.9);
}
