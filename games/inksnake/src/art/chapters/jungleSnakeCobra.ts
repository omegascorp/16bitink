import { createRng } from '../../logic/rng';
import { pt, ribbon } from '../kit';
import { Pen, type Pt } from '../pen';
import { flankHatch, glaze } from '../snakes/cornPaint';
import { rgba } from '../wash';
import { bodyClip, contours, crossWash, grain, mod, modelBody, scaleRows } from './jungleSnakePaint';

/**
 * The king cobra's back (see jungleSnake.ts), seen from above: a long,
 * glossy olive-brown body darkening to near-black on the far flank, every
 * scale dark-edged so the back reads as a fine net, crossed by thin pale
 * yellowish chevron bands pointing to the head; a big head with large
 * shields (two big occipitals behind the parietals, the king cobra's own),
 * pale lips. The hood is jungleHood.ts.
 *
 * The strip is one period painted once on a tile (bands crossing the tile's
 * ends painted at both ends from the same seed) and the tile laid end to
 * end, so x = PERIOD + a is pixel for pixel x = a.
 */
export const COBRA_PERIOD = 120;
const PERIOD = COBRA_PERIOD;
const BANDS = 4;
const STEP = PERIOD / BANDS;

export const COBRA_PAINT = {
  ground: '#5e5833',
  olive: '#7c7444',
  deep: '#2b2817',
  shadow: '#1b190e',
  edge: '#15130b',
  band: '#e6d996',
  bandDeep: '#b5a45c',
  belly: '#e2d6a0',
} as const;
const C = COBRA_PAINT;

export const COBRA_WASH = [[0, '#8e8654'], [0.16, '#757040'], [0.42, '#56512e'], [0.72, '#3a3520'], [1, '#242113']] as const;

/** Band i's spine (any integer; the same as band i + BANDS one period along): a chevron, its point on the midline towards the head. */
function bandSpine(i: number): Pt[] {
  const k = mod(i, BANDS);
  const rng = createRng(21100 + k * 17);
  const x = i * STEP + STEP / 2 + (rng() - 0.5) * 3;
  const sweep = 6.5 + rng() * 1.8;
  const lean = (rng() - 0.5) * 1.6;
  return [pt(x + sweep + lean, -1.5), pt(x + sweep * 0.45, 6), pt(x, 12 + (rng() - 0.5) * 1.2), pt(x + sweep * 0.5, 18.5), pt(x + sweep - lean, 25.5)];
}

/** A band's outline: a ribbon about one scale wide, its edges stepped where they cross the scale rows. */
function bandShape(i: number): Pt[] {
  const k = mod(i, BANDS);
  const spine = bandSpine(i);
  const dense: Pt[] = [];
  for (let s = 0; s < spine.length - 1; s++) {
    const a = spine[s]!;
    const b = spine[s + 1]!;
    for (let t = 0; t < 8; t++) dense.push(pt(a.x + ((b.x - a.x) * t) / 8, a.y + ((b.y - a.y) * t) / 8));
  }
  dense.push(spine[spine.length - 1]!);
  const rng = createRng(21200 + k * 7);
  const jag = dense.map(() => 0.75 + rng() * 0.6);
  return ribbon(dense, (u) => 2.5 * jag[Math.round(u * (dense.length - 1))]! * (0.82 + 0.3 * Math.abs(u - 0.5))).shape;
}

/** The ground's washes between the bands: warmer olive high on the back, umber clouding the far flank, as a wash dries. */
function groundGlazes(ctx: CanvasRenderingContext2D, i: number): void {
  const k = mod(i, BANDS);
  const rng = createRng(21300 + k * 11);
  const x = i * STEP;
  glaze(ctx, x + (rng() - 0.5) * 4, 8 + rng() * 3, 9, 4.5, 0, C.olive, 0.4);
  glaze(ctx, x + STEP / 2 + (rng() - 0.5) * 8, 19 + rng() * 2, 12, 3.6, 0, C.deep, 0.32);
  glaze(ctx, x + STEP * 0.3 + (rng() - 0.5) * 6, 13, 6, 5, 0, '#4e4a2a', 0.25);
}

/** A pale band laid as watercolour: cream-yellow with its far side greyed into the ground, a darker edge pooled behind it. */
function paintBand(ctx: CanvasRenderingContext2D, i: number, ink: string, boil: number): void {
  const shape = bandShape(i);
  const pen = new Pen(ctx, 21400 + mod(i, BANDS) + boil, 0.3);
  // The dark scale edges behind each band (the bands are edged blacker on the king cobra).
  pen.fill(shape.map((p) => pt(p.x + 1.4, p.y)), C.edge, 0.32);
  pen.fill(shape, C.band, 0.88);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, 0, 0, 24);
    g.addColorStop(0, rgba('#fff3c4', 0.35));
    g.addColorStop(0.35, rgba(C.band, 0));
    g.addColorStop(0.7, rgba(C.bandDeep, 0.35));
    g.addColorStop(1, rgba(C.deep, 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(i * STEP - 4, 0, STEP + 8, 24);
  });
  pen.hair(shape.slice(0, shape.length / 2), 0.26, ink, 0.22);
}

/** Paints one period of the back into [0, PERIOD] × [0, SNAKE_W]. */
export function paintCobraTile(ctx: CanvasRenderingContext2D, ink: string, f: number): void {
  const boil = f * 1000;
  bodyClip(ctx, 0, PERIOD, crossWash(ctx, 0, COBRA_WASH), () => {
    for (let i = -1; i <= BANDS; i++) groundGlazes(ctx, i);
    grain(ctx, 0, PERIOD, 0, 21500, 300, true, C.deep);
    for (let i = -1; i <= BANDS; i++) paintBand(ctx, i, ink, boil);
    scaleRows(ctx, 0, PERIOD, 0, { rows: 15, len: 2.5, period: PERIOD, edge: C.edge, alpha: 0.75, gloss: 0.55, heart: 0.07 });
    grain(ctx, 0, PERIOD, 0, 21600, 360, true, C.shadow);
    modelBody(ctx, 0, PERIOD, 0, C.shadow, 0.3, 1.15);
    flankHatch(ctx, 0, PERIOD, 60, 0, 21700 + boil, ink, 0.42, true);
  });
  contours(ctx, PERIOD, ink, 21800 + boil);
}

