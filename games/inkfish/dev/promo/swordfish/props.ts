import { ellipse, INK, PAPER, Pen, type Pt } from '../../../src/art/pen';
import { drawTextLine, type TextInk } from '../captions';
import { clamp01, lerp } from '../short';
import { faded } from './layer';
import { COLD, EMBER, ICE, mix } from './water';

/**
 * The short's inked props, drawn live with the game's pen (its wobble
 * reseeded each boil frame, so they boil like the game's lines): the
 * thermometer, snowflakes, callout arrows, the heated car seat and its
 * strike, and the ring round each eye view.
 */

export const RED = '#c8352b';
export const RED_ON_PAPER: TextInk = { fill: RED, halo: PAPER };
export const EMBER_ON_PAPER: TextInk = { fill: EMBER, halo: PAPER };
export const COLD_ON_PAPER: TextInk = { fill: '#2f6aa8', halo: PAPER };
const GLASS = '#f6fbff';
const SEAT = '#5f5552';
const SEAT_DARK = '#3f3836';

/** A pen for one prop at one boil frame: the same strokes, wobbled anew each frame. */
export const penFor = (ctx: CanvasRenderingContext2D, seed: number, boil: number, wobble = 1.3): Pen => new Pen(ctx, seed * 31 + boil * 977, wobble);

// ---------------------------------------------------------------- the thermometer

export const THERMO = { x: 960, top: 330, bottom: 640, r: 40, max: 30 } as const;

/**
 * A glass thermometer, its column at `temp` °C (0 .. THERMO.max up the
 * tube): blue when cold, reddening as it warms. `shown` fades it.
 */
export function drawThermometer(ctx: CanvasRenderingContext2D, temp: number, shown: number, boil: number): void {
  faded(ctx, shown, (c) => drawGlassAt(c, temp, boil));
}

function drawGlassAt(ctx: CanvasRenderingContext2D, temp: number, boil: number): void {
  const { x, top, bottom, r } = THERMO;
  const half = 17;
  const pen = penFor(ctx, 11, boil, 1.1);
  const arc = (cx: number, cy: number, rad: number, from: number, to: number): Pt[] =>
    Array.from({ length: 25 }, (_, i) => ({ x: cx + Math.cos(from + ((to - from) * i) / 24) * rad, y: cy + Math.sin(from + ((to - from) * i) / 24) * rad }));
  // Where the tube meets the bulb.
  const join = Math.asin(half / r);
  const neck = bottom - r * Math.cos(join);
  const glass: Pt[] = [...arc(x, top, half, Math.PI, Math.PI * 2), ...arc(x, bottom, r, -Math.PI / 2 + join, (3 * Math.PI) / 2 - join)];
  pen.fill(glass, GLASS, 0.92);
  // The column: bulb full, rising up the tube to the temperature, blue when cold and reddening as it warms.
  const liquid = mix('#3d7fc4', '#d23a26', clamp01((temp - 3) / 15));
  const level = bottom - (bottom - top) * clamp01(temp / THERMO.max);
  pen.fill(ellipse(x, bottom, r - 10, r - 10, 24), liquid, 1);
  ctx.fillStyle = liquid;
  ctx.fillRect(x - 7, level, 14, bottom - level);
  pen.stroke(arc(x, top, half, Math.PI, Math.PI * 2), 4);
  pen.stroke([{ x: x - half, y: top }, { x: x - half, y: neck }], 4);
  pen.stroke([{ x: x + half, y: top }, { x: x + half, y: neck }], 4);
  pen.stroke(arc(x, bottom, r, -Math.PI / 2 + join, (3 * Math.PI) / 2 - join), 4);
  // Ticks every 5 °C, the long ones every 10.
  for (let c = 5; c <= THERMO.max; c += 5) {
    const y = bottom - ((bottom - top) * c) / THERMO.max;
    pen.hair([{ x: x + half + 2, y }, { x: x + half + (c % 10 ? 12 : 22), y }], 2.4);
  }
}

/** A snowflake: six inked arms, each with two twigs, `r` across, turned by `spin`. */
export function drawSnowflake(ctx: CanvasRenderingContext2D, at: Pt, r: number, spin: number, alpha: number, boil: number, seed: number): void {
  faded(ctx, alpha, (c) => {
    const pen = penFor(c, seed, boil, 0.8);
    for (let k = 0; k < 6; k++) {
      const a = spin + (k * Math.PI) / 3;
      const along = (u: number): Pt => ({ x: at.x + Math.cos(a) * r * u, y: at.y + Math.sin(a) * r * u });
      pen.stroke([at, along(1)], 3.2, ICE, 1, false);
      for (const side of [-1, 1]) {
        const root = along(0.55);
        pen.hair([root, { x: root.x + Math.cos(a + side * 0.8) * r * 0.3, y: root.y + Math.sin(a + side * 0.8) * r * 0.3 }], 2.4, ICE, 1);
      }
    }
  });
}

// ---------------------------------------------------------------- notes

/** A hand-drawn arrow from `from` to `to`, bowed to one side, drawn out `u` of the way (0 .. 1). */
export function drawArrow(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, alpha: number, boil: number, seed: number, colour = INK, bow = 0.18, u = 1): void {
  if (u <= 0) return;
  const mid = { x: (from.x + to.x) / 2 - (to.y - from.y) * bow, y: (from.y + to.y) / 2 + (to.x - from.x) * bow };
  const pts = Array.from({ length: 13 }, (_, i) => {
    const s = (i / 12) * u;
    return { x: (1 - s) ** 2 * from.x + 2 * s * (1 - s) * mid.x + s * s * to.x, y: (1 - s) ** 2 * from.y + 2 * s * (1 - s) * mid.y + s * s * to.y };
  });
  faded(ctx, alpha, (c) => {
    const pen = penFor(c, seed, boil, 1);
    pen.stroke(pts, 5, PAPER, 0.6, false);
    pen.stroke(pts, 3.4, colour);
    if (u < 1) return;
    const end = pts[pts.length - 1]!;
    const prev = pts[pts.length - 3]!;
    const a = Math.atan2(end.y - prev.y, end.x - prev.x);
    for (const side of [-1, 1]) pen.stroke([end, { x: end.x - Math.cos(a + side * 0.5) * 26, y: end.y - Math.sin(a + side * 0.5) * 26 }], 3.4, colour, 1, false);
  });
}

/** A label: its text, and an arrow from beside it to what it names. */
export function drawCallout(
  ctx: CanvasRenderingContext2D, text: string, at: Pt, size: number, alpha: number, colours: TextInk, arrow: { readonly from: Pt; readonly to: Pt } | null, boil: number, seed: number,
): void {
  if (alpha <= 0) return;
  if (arrow) drawArrow(ctx, arrow.from, arrow.to, alpha, boil, seed, colours.fill === PAPER ? INK : colours.fill);
  drawTextLine(ctx, text, at.x, at.y, size, 700, alpha, colours);
}

// ---------------------------------------------------------------- the heated seat

/** The seat's outline, facing right, its cushion's front at (0, 0). */
const BACK: readonly Pt[] = [{ x: -175, y: 0 }, { x: -190, y: -60 }, { x: -205, y: -150 }, { x: -212, y: -215 }, { x: -170, y: -222 }, { x: -150, y: -160 }, { x: -128, y: -70 }, { x: -110, y: -18 }];
const CUSHION: readonly Pt[] = [{ x: -190, y: 0 }, { x: -180, y: -40 }, { x: -60, y: -48 }, { x: -6, y: -42 }, { x: 8, y: -20 }, { x: 0, y: 6 }, { x: -170, y: 14 }];
const HEADREST: readonly Pt[] = [{ x: -222, y: -250 }, { x: -226, y: -296 }, { x: -170, y: -300 }, { x: -164, y: -254 }];

/** The seat, heat lines wafting up off it (`loop` drives them), drawn about its middle. */
function drawSeatAt(ctx: CanvasRenderingContext2D, loop: number, boil: number): void {
  const pen = penFor(ctx, 23, boil, 1.2);
  ctx.save();
  ctx.translate(105, 130);
  ctx.strokeStyle = EMBER;
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  for (const [x0, y0, h] of [[-40, -70, 120], [-95, -80, 140], [-120, -250, 90], [-250, -150, 110]] as const) {
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      const px = x0 + Math.sin(u * 7 - 2 * Math.PI * 30 * loop + x0) * 9;
      if (i === 0) ctx.moveTo(px, y0 - h * u);
      else ctx.lineTo(px, y0 - h * u);
    }
    ctx.stroke();
  }
  for (const part of [BACK, CUSHION, HEADREST]) {
    pen.fill([...part], SEAT, 1);
    pen.closed([...part], 5);
  }
  pen.stroke([{ x: -205, y: -252 }, { x: -200, y: -222 }], 4);
  pen.stroke([{ x: -178, y: -255 }, { x: -176, y: -222 }], 4);
  // Stitching, and the rail it slides on.
  pen.hair([{ x: -196, y: -170 }, { x: -168, y: -165 }, { x: -146, y: -150 }], 2.2, SEAT_DARK, 0.9);
  pen.hair([{ x: -150, y: -28 }, { x: -60, y: -34 }, { x: -14, y: -28 }], 2.2, SEAT_DARK, 0.9);
  pen.stroke([{ x: -170, y: 34 }, { x: -10, y: 34 }], 5);
  pen.stroke([{ x: -150, y: 14 }, { x: -150, y: 34 }], 4);
  pen.stroke([{ x: -30, y: 8 }, { x: -30, y: 34 }], 4);
  ctx.restore();
}

/** A red pen stroke from `from`, drawn `u` of the way to `to`. */
function strike(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, u: number, width: number, boil: number, seed: number): void {
  if (u <= 0) return;
  const red = penFor(ctx, seed, boil, 1.5);
  const end = { x: lerp(from.x, to.x, u), y: lerp(from.y, to.y, u) };
  red.stroke([from, end], width + 7, PAPER, 0.8, false);
  red.stroke([from, end], width, RED);
}

/**
 * "Forget heated seats.": a car seat in side view with heat lines wafting
 * off it and its name under it, popped in at `shown` (swelling a touch as
 * it lands) and struck out in red as `struck` runs 0 → 1. Centred about
 * (x, y), the name `nameDy` below.
 */
export function drawSeat(ctx: CanvasRenderingContext2D, at: Pt, nameDy: number, shown: number, struck: number, loop: number, boil: number): void {
  const k = 0.6 + 0.4 * clamp01(shown) + 0.12 * Math.sin(Math.PI * clamp01(shown));
  faded(ctx, clamp01(shown), (c) => {
    c.save();
    c.translate(at.x, at.y);
    c.scale(k, k);
    drawSeatAt(c, loop, boil);
    strike(c, { x: -115, y: -125 }, { x: 125, y: 125 }, struck, 15, boil, 29);
    drawTextLine(c, 'heated seats', 0, nameDy, 72, 700, 1);
    strike(c, { x: -190, y: nameDy - 22 }, { x: 190, y: nameDy - 26 }, struck, 9, boil, 31);
    c.restore();
  });
}

// ---------------------------------------------------------------- the eye views

/** The ring round an eye view, inked in the eye's colour. */
export function drawViewRing(ctx: CanvasRenderingContext2D, at: Pt, r: number, warm: boolean, boil: number): void {
  const pen = penFor(ctx, warm ? 41 : 43, boil, 1.4);
  pen.closed(ellipse(at.x, at.y, r, r, 48), 10, warm ? EMBER : COLD);
  pen.closed(ellipse(at.x, at.y, r + 9, r + 9, 48), 3.5);
}
