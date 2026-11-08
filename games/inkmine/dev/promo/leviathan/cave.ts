import { makeDraw, cub, pt, type Draw } from '../../../src/art/kit';
import { dab, mix, paint, soft, SHADOW } from '../../../src/art/paint';
import { BOIL, PAPER_FILL, RED } from '../../../src/art/palette';
import { makeCanvas, pathOf, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';

/**
 * The Leviathan's flooded cave, in Brine's colours: deep purple water, basalt
 * crusted with salt. A shaft of five blocks through the roof, right over the
 * sleeper's head; the blocks are their own sprites, so the drill can take
 * them one by one.
 */
export const SHAFT_X = 744;
export const BLOCK = 106;
/** The top of the first of the five blocks; the fifth ends at the cave's roof. */
export const ROW_TOP = 300;
export const ROOF_Y = ROW_TOP + 5 * BLOCK;
export const FLOOR_Y = 1302;

const ROCK = '#514a70';
const SALT = '#e8e2ec';

/** Oversized, so a camera shake never shows its edge. */
const MARGIN = 60;

/** The flooded dark behind everything: Brine's deep water, a little lighter in the middle. */
export function makeCaveBack(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(VIDEO.width + MARGIN * 2, VIDEO.height + MARGIN * 2);
  const g = ctx.createRadialGradient(canvas.width / 2, 900, 80, canvas.width / 2, 900, 1250);
  g.addColorStop(0, '#3b2a63');
  g.addColorStop(0.5, '#241a44');
  g.addColorStop(1, '#0e0a22');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

/** The cave round the chase: the dark, with black basalt closing in from the edges. */
export function makeChaseBack(): HTMLCanvasElement {
  const canvas = makeCaveBack();
  const ctx = canvas.getContext('2d')!;
  ctx.translate(MARGIN, MARGIN);
  const d = makeDraw(ctx, 7760, 0, 0);
  const rng = createRng(7761);
  const wall = (x0: number, x1: number, y0: number, y1: number, jut: number): Pt[] => [pt(x0, y0), ...Array.from({ length: 22 }, (_, i) => pt(x1 + (rng() - 0.5) * jut * (0.5 + 0.5 * Math.sin(i * 0.8)), y0 + ((i + 1) / 23) * (y1 - y0))), pt(x0, y1)];
  const shapes = [
    wall(-80, 190, -80, 900, 150),
    wall(1160, 880, -80, 1000, 170),
    wall(-80, 150, 1100, 2000, 130),
    wall(1160, 930, 1200, 2000, 150),
    [pt(-80, -80), pt(1160, -80), ...Array.from({ length: 24 }, (_, i) => pt(1160 - i * 54, 50 + rng() * 60 + (i % 2) * 40))],
  ];
  for (const shape of shapes) {
    paint(d, shape, mix(ROCK, SHADOW, 0.62), { alpha: 1, shadow: 0.8, hatch: 0.14, line: 1.8, cross: true });
    d.pen.stipple(shape, 2200, () => 0.5, 1, mix(ROCK, SHADOW, 0.7));
  }
  return canvas;
}

function strata(d: Draw, shape: readonly Pt[], seed: number, x0: number, x1: number, y0: number, y1: number): void {
  const rng = createRng(seed);
  d.pen.clipped(shape, () => {
    d.pen.stipple(shape, 5200, () => 0.5, 1, mix(ROCK, SHADOW, 0.6));
    d.pen.stipple(shape, 1300, () => 0.4, 0.9, mix(ROCK, SALT, 0.45));
    for (let i = 0; i < 26; i++) {
      const y = y0 + rng() * (y1 - y0);
      const x = x0 + rng() * (x1 - x0);
      const len = 90 + rng() * 300;
      d.pen.hair(cub(pt(x, y), pt(x + len * 0.3, y + 14 * (rng() - 0.5)), pt(x + len * 0.7, y + 18 * (rng() - 0.5)), pt(x + len, y + 8 * (rng() - 0.5)), 8), 1.3 + rng() * 1.6, mix(ROCK, SHADOW, 0.7), 0.7);
    }
    for (let i = 0; i < 14; i++) {
      const x = x0 + rng() * (x1 - x0);
      const y = y0 + rng() * (y1 - y0);
      dab(d, [pt(x - 50 - rng() * 60, y), pt(x, y - 7 - rng() * 8), pt(x + 60 + rng() * 40, y + 1), pt(x, y + 9)], SALT, 0.14, 6);
    }
  });
}

/** The roof over the cave, and a floor under it, the shaft cut through the roof. One canvas per boil frame. */
export function makeRock(): readonly HTMLCanvasElement[] {
  return Array.from({ length: BOIL }, (_, f) => {
    const { canvas, ctx } = makeCanvas(VIDEO.width + MARGIN * 2, VIDEO.height + MARGIN * 2);
    ctx.translate(MARGIN, MARGIN);
    const d = makeDraw(ctx, 7700 + f, f, 0);
    const rng = createRng(7710);
    const edge: Pt[] = Array.from({ length: 19 }, (_, i) => {
      const x = -80 + i * 70;
      const lip = Math.abs(x - SHAFT_X) < 110 ? ROOF_Y : ROOF_Y - 40 + 80 * rng() - (x < 300 ? 90 : 0);
      return pt(x, lip);
    });
    const roof = [pt(-80, -80), pt(1180, -80), pt(1180, ROOF_Y - 40), ...[...edge].reverse()];
    paint(d, roof, ROCK, { alpha: 1, shadow: 0.7, hatch: 0.14, line: 2.4, cross: true });
    strata(d, roof, 7720, -60, 1160, -60, ROOF_Y);
    const floorTop = cub(pt(-80, FLOOR_Y - 26), pt(300, FLOOR_Y + 22), pt(760, FLOOR_Y - 30), pt(1180, FLOOR_Y + 8), 26);
    const floor = [...floorTop, pt(1180, 2000), pt(-80, 2000)];
    paint(d, floor, mix(ROCK, SHADOW, 0.3), { alpha: 1, shadow: 0.6, hatch: 0.12, line: 2.4 });
    strata(d, floor, 7730, -60, 1160, FLOOR_Y, 1960);
    soft(ctx, 6, () => d.pen.stroke(floorTop.map((p) => pt(p.x, p.y + 7)), 7, SALT, 0.3, false));
    // The shaft: cut clean out of the roof, its walls in shade.
    const hole = [pt(SHAFT_X - BLOCK / 2, -80), pt(SHAFT_X + BLOCK / 2, -80), pt(SHAFT_X + BLOCK / 2, ROOF_Y + 60), pt(SHAFT_X - BLOCK / 2, ROOF_Y + 60)];
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    pathOf(ctx, hole);
    ctx.fill();
    ctx.restore();
    for (const side of [-1, 1]) {
      const x = SHAFT_X + (side * BLOCK) / 2;
      d.pen.stroke([pt(x, -80), pt(x + side * 1.5, 200), pt(x - side, ROOF_Y - 4)], 3, mix(SHADOW, RED, 0.1), 0.95, false);
      d.pen.hair([pt(x + side * 7, -60), pt(x + side * 6, ROOF_Y - 12)], 1.5, mix(ROCK, PAPER_FILL, 0.3), 0.4);
    }
    return canvas;
  });
}

/** One block of the shaft, cracks included: `row` picks its grain. */
export function makeBlock(row: number): readonly HTMLCanvasElement[] {
  return Array.from({ length: BOIL }, (_, f) => {
    const { canvas, ctx } = makeCanvas(BLOCK + 8, BLOCK + 8);
    ctx.translate(4, 4);
    const d = makeDraw(ctx, 7800 + row * 7 + f, f, 0);
    const shape = [pt(0, 0), pt(BLOCK * 0.5, 2), pt(BLOCK, 0), pt(BLOCK, BLOCK), pt(BLOCK * 0.5, BLOCK - 2), pt(0, BLOCK)];
    paint(d, shape, mix(ROCK, SALT, 0.06 + 0.04 * (row % 2)), { alpha: 1, shadow: 0.6, hatch: 0.16, line: 2 });
    d.pen.stipple(shape, 340, () => 0.55, 1, mix(ROCK, SHADOW, 0.6));
    d.pen.stipple(shape, 80, () => 0.5, 0.9, mix(ROCK, SALT, 0.5));
    return canvas;
  });
}

export const blockCorner = (row: number): Pt => pt(SHAFT_X - BLOCK / 2 - 4, ROW_TOP + row * BLOCK - 4);
export const ROCK_INK = { rock: ROCK, margin: MARGIN } as const;
