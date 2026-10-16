import { INK, PAPER, type Pen, type Pt } from '../../../src/art/pen';
import { VIDEO } from '../short';
import { arc, curve, inked, prop, type Prop, washPath } from './ink';

/**
 * Freud's lab at the marine station in Trieste, 1876, inked with the
 * game's pen: the room (a wall wash, the chalkboard, the shelves, the
 * bench), the young Freud at the bench (a plain portrait, nobody's
 * caricature), his microscope, and the specimen jars. All in screen px
 * except the jars, Freud and the microscope, which are placed by render.ts.
 */

export const BENCH_Y = 1030;
export const SHELF_YS: readonly number[] = [740, 880, BENCH_Y];
export const BOARD = { x: 110, y: 290, w: 860, h: 210 } as const;
export const SLATE = '#2f3b38';
export const CHALK = '#e8ebe4';
const WALL = '#d8c9a4';
const WOOD = '#9b7653';
const WOOD_DARK = '#6e4f36';
const SKIN = '#efd3b5';
const SHADE = '#a87458';
const HAIR = '#3a2a22';
const COAT = '#3d3e4a';
const SHIRT = '#fbf8f1';
const BRASS = '#c9a04a';
const GLASS = '#c9cf8e';

/** Points round a rounded rectangle. */
function rounded(x: number, y: number, w: number, h: number, r: number): Pt[] {
  return [
    ...arc(x + w - r, y + r, r, r, -Math.PI / 2, 0, 4),
    ...arc(x + w - r, y + h - r, r, r, 0, Math.PI / 2, 4),
    ...arc(x + r, y + h - r, r, r, Math.PI / 2, Math.PI, 4),
    ...arc(x + r, y + r, r, r, Math.PI, Math.PI * 1.5, 4),
  ];
}

const rect = (x: number, y: number, w: number, h: number): Pt[] => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];

// ---------------------------------------------------------------- the room

function drawBoard(pen: Pen): void {
  const { x, y, w, h } = BOARD;
  inked(pen, rect(x, y, w, h), WOOD, 3);
  inked(pen, rect(x + 16, y + 16, w - 32, h - 32), SLATE, 2);
  // Old chalk, wiped but not quite gone.
  for (let k = 0; k < 7; k++) {
    const sx = x + 60 + pen.rng() * (w - 200);
    const sy = y + 40 + pen.rng() * (h - 80);
    pen.hair([{ x: sx, y: sy }, { x: sx + 60 + pen.rng() * 80, y: sy + pen.jitter(10) }], 6, CHALK, 0.06);
  }
  // The chalk ledge, with a stick of chalk on it.
  inked(pen, rect(x - 8, y + h, w + 16, 12), WOOD_DARK, 2.5);
  inked(pen, rect(x + w - 120, y + h - 7, 34, 8), CHALK, 1.2);
}

function drawShelves(pen: Pen): void {
  for (const y of SHELF_YS.slice(0, 2)) {
    inked(pen, rect(562, y, 500, 12), WOOD, 2.5);
    for (const bx of [600, 1020]) inked(pen, [{ x: bx - 6, y: y + 12 }, { x: bx + 6, y: y + 12 }, { x: bx + 6, y: y + 50 }], WOOD_DARK, 2);
  }
}

function drawBench(pen: Pen): void {
  inked(pen, rect(-10, BENCH_Y, VIDEO.width + 20, 16), WOOD_DARK, 3);
  inked(pen, rect(-10, BENCH_Y + 16, VIDEO.width + 20, 70), WOOD, 3);
  // Planks and a drawer.
  for (const x of [330, 700]) pen.hair([{ x, y: BENCH_Y + 18 }, { x, y: BENCH_Y + 84 }], 2, INK, 0.6);
  pen.closed(rect(420, BENCH_Y + 28, 200, 44), 2);
  pen.dot(520, BENCH_Y + 50, 5);
  for (let k = 0; k < 9; k++) {
    const y = BENCH_Y + 26 + pen.rng() * 54;
    const x = 20 + pen.rng() * 980;
    pen.hair(curve({ x, y }, { x: x + 40, y: y + 4 }, { x: x + 90, y }, 5), 1.2, WOOD_DARK, 0.5);
  }
  // Freud's notebook, open on the bench, with a pencil.
  inked(pen, [{ x: 40, y: BENCH_Y + 6 }, { x: 210, y: BENCH_Y - 4 }, { x: 236, y: BENCH_Y + 12 }, { x: 60, y: BENCH_Y + 16 }], SHIRT, 2);
  pen.hair([{ x: 140, y: BENCH_Y + 1 }, { x: 150, y: BENCH_Y + 14 }], 1.4);
}

/** The room behind Freud, in screen px. */
export function makeRoom(): Prop {
  return prop(VIDEO.width, 1140, 1876, (pen, ctx) => {
    ctx.save();
    washPath(ctx, 250, BENCH_Y + 10, VIDEO.width, 18);
    ctx.fillStyle = WALL;
    ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.restore();
    // Shadow hatched into the corners of the wall.
    pen.hatch(rect(0, 260, 70, BENCH_Y - 260), 14, -1.1, 1.2, { alpha: 0.18 });
    pen.hatch(rect(VIDEO.width - 60, 260, 60, BENCH_Y - 260), 14, -1.1, 1.2, { alpha: 0.18 });
    drawBoard(pen);
    drawShelves(pen);
    drawBench(pen);
  });
}

// ---------------------------------------------------------------- Freud

/** Freud's prop: 440 px square, the bench top along its bottom edge. */
export const FREUD_W = 440;
export const FREUD_H = 440;
/** Where his head is in the prop (the "?" floats by it). */
export const FREUD_HEAD = { x: 220, y: 140 } as const;

function drawCoat(pen: Pen): void {
  const coat = [
    { x: 196, y: 262 }, { x: 140, y: 280 }, { x: 102, y: 316 }, { x: 84, y: 440 }, { x: 360, y: 440 }, { x: 344, y: 316 }, { x: 304, y: 280 }, { x: 244, y: 262 },
  ];
  inked(pen, coat, COAT, 3.2);
  // The shirt front, the lapels, and the bow tie.
  inked(pen, [{ x: 204, y: 268 }, { x: 236, y: 268 }, { x: 220, y: 350 }], SHIRT, 1.6);
  pen.stroke([{ x: 196, y: 262 }, { x: 182, y: 300 }, { x: 220, y: 360 }], 2.4);
  pen.stroke([{ x: 244, y: 262 }, { x: 258, y: 300 }, { x: 220, y: 360 }], 2.4);
  inked(pen, [{ x: 220, y: 280 }, { x: 202, y: 270 }, { x: 202, y: 292 }], INK, 1.2);
  inked(pen, [{ x: 220, y: 280 }, { x: 238, y: 270 }, { x: 238, y: 292 }], INK, 1.2);
  // Folds in the cloth: hatching down the shaded side, a crease at each elbow.
  pen.hatch([{ x: 102, y: 316 }, { x: 150, y: 290 }, { x: 150, y: 440 }, { x: 84, y: 440 }], 7, -1.2, 1.1, { color: '#15151b', alpha: 0.5 });
  pen.hair(curve({ x: 130, y: 360 }, { x: 140, y: 390 }, { x: 128, y: 430 }), 1.6, '#15151b', 0.7);
  pen.hair(curve({ x: 318, y: 340 }, { x: 330, y: 380 }, { x: 352, y: 410 }), 1.6, '#15151b', 0.7);
  // His left hand reaches out to the microscope's focus knob.
  inked(pen, [{ x: 330, y: 330 }, { x: 392, y: 372 }, { x: 420, y: 384 }, { x: 414, y: 410 }, { x: 380, y: 404 }, { x: 330, y: 380 }], COAT, 2.6);
  inked(pen, arc(424, 396, 15, 12, 0, Math.PI * 2, 14).slice(0, -1), SKIN, 2);
}

function drawHead(pen: Pen): void {
  const { x, y } = FREUD_HEAD;
  // Neck and wing collar.
  inked(pen, rect(x - 22, y + 80, 44, 44), SKIN, 2);
  inked(pen, [{ x: x - 30, y: y + 112 }, { x, y: y + 132 }, { x: x + 30, y: y + 112 }, { x: x + 34, y: y + 130 }, { x, y: y + 146 }, { x: x - 34, y: y + 130 }], SHIRT, 2);
  // Ears, then the face.
  for (const s of [-1, 1]) inked(pen, arc(x + s * 56, y + 6, 10, 17, 0, Math.PI * 2, 12).slice(0, -1), SKIN, 2);
  inked(pen, arc(x, y, 56, 74, 0, Math.PI * 2, 30).slice(0, -1), SKIN, 2.6);
  // Shadow down the far side of the face and under the brow, hatched like a pen portrait.
  pen.hatch([...arc(x, y, 56, 74, -1.35, 1.35, 12), { x: x + 30, y: y + 60 }, { x: x + 26, y: y - 64 }], 5, -1.0, 0.9, { color: SHADE, alpha: 0.4 });
  pen.hatch([{ x: x - 40, y: y - 20 }, { x: x + 40, y: y - 20 }, { x: x + 40, y: y - 12 }, { x: x - 40, y: y - 12 }], 4, -0.9, 0.7, { color: SHADE, alpha: 0.3 });
  // Short dark hair, parted on his left, combed back.
  const hair = [
    { x: x - 57, y: y - 4 }, { x: x - 58, y: y - 40 }, { x: x - 36, y: y - 74 }, { x, y: y - 84 }, { x: x + 38, y: y - 74 }, { x: x + 58, y: y - 42 },
    { x: x + 57, y: y - 8 }, { x: x + 46, y: y - 40 }, { x: x + 14, y: y - 52 }, { x: x - 20, y: y - 50 }, { x: x - 46, y: y - 34 },
  ];
  inked(pen, hair, HAIR, 2.4);
  for (let k = 0; k < 6; k++) pen.hair(curve({ x: x - 30 + k * 12, y: y - 52 }, { x: x - 22 + k * 12, y: y - 72 }, { x: x - 6 + k * 10, y: y - 80 }, 6), 1.1, PAPER, 0.25);
  // Brows, eyes, nose.
  for (const s of [-1, 1]) {
    pen.stroke([{ x: x + s * 12, y: y - 22 }, { x: x + s * 24, y: y - 25 }, { x: x + s * 36, y: y - 22 }], 2.4, HAIR);
    pen.hair(curve({ x: x + s * 13, y: y - 8 }, { x: x + s * 24, y: y - 15 }, { x: x + s * 35, y: y - 8 }, 6), 1.6);
    pen.hair(curve({ x: x + s * 15, y: y - 7 }, { x: x + s * 24, y: y - 3 }, { x: x + s * 33, y: y - 7 }, 6), 1, INK, 0.5);
    pen.dot(x + s * 24, y - 9, 3.6);
  }
  pen.hair([{ x: x - 2, y: y - 6 }, { x: x - 6, y: y + 22 }, { x: x + 2, y: y + 28 }, { x: x + 9, y: y + 25 }], 1.6);
  pen.hatch([{ x: x + 2, y: y - 2 }, { x: x + 10, y: y + 6 }, { x: x + 12, y: y + 24 }, { x: x + 3, y: y + 24 }], 3, -1.1, 0.8, { color: SHADE, alpha: 0.45 });
  // A full, trimmed beard and moustache, hatched with hair strokes.
  const beard = [
    { x: x - 55, y: y + 10 }, { x: x - 50, y: y + 44 }, { x: x - 34, y: y + 76 }, { x: x - 14, y: y + 96 }, { x, y: y + 102 }, { x: x + 14, y: y + 96 },
    { x: x + 34, y: y + 76 }, { x: x + 50, y: y + 44 }, { x: x + 55, y: y + 10 }, { x: x + 42, y: y + 30 }, { x: x + 22, y: y + 36 }, { x: x + 10, y: y + 33 },
    { x, y: y + 35 }, { x: x - 10, y: y + 33 }, { x: x - 22, y: y + 36 }, { x: x - 42, y: y + 30 },
  ];
  inked(pen, beard, HAIR, 2.2);
  inked(pen, arc(x, y + 52, 9, 4, 0, Math.PI * 2, 10).slice(0, -1), '#d9a890', 1);
  for (let k = 0; k < 14; k++) {
    const bx = x - 42 + k * 6.5;
    pen.hair([{ x: bx, y: y + 46 + Math.abs(k - 6.5) * 2 }, { x: bx + 2, y: y + 70 + (6.5 - Math.abs(k - 6.5)) * 3 }], 1, PAPER, 0.18);
  }
}

/** The young Freud, aged 19 (born May 1856, in Trieste from March 1876): dark hair, a full beard, a dark coat and wing collar. */
export function makeFreud(): Prop {
  return prop(FREUD_W, FREUD_H, 20, (pen) => {
    drawCoat(pen);
    drawHead(pen);
  });
}

// ---------------------------------------------------------------- the microscope

export const SCOPE_W = 190;
export const SCOPE_H = 270;

/** A brass microscope of the 1870s: horseshoe foot, pillar, stage and mirror, and its tube tilted back. */
export function makeMicroscope(): Prop {
  return prop(SCOPE_W, SCOPE_H, 1590, (pen) => {
    inked(pen, [{ x: 30, y: 262 }, { x: 46, y: 238 }, { x: 144, y: 238 }, { x: 160, y: 262 }, { x: 128, y: 262 }, { x: 118, y: 250 }, { x: 72, y: 250 }, { x: 62, y: 262 }], BRASS, 2.4);
    inked(pen, rect(86, 170, 18, 70), BRASS, 2.2);
    inked(pen, arc(95, 212, 13, 13, 0, Math.PI * 2, 14).slice(0, -1), '#aebac2', 2);
    inked(pen, rect(46, 160, 98, 12), INK, 1.6);
    // The limb curving up to hold the tube.
    pen.stroke(curve({ x: 98, y: 170 }, { x: 40, y: 140 }, { x: 84, y: 76 }, 10), 9, BRASS);
    pen.stroke(curve({ x: 98, y: 170 }, { x: 40, y: 140 }, { x: 84, y: 76 }, 10), 2);
    const tube = [{ x: 96, y: 40 }, { x: 122, y: 44 }, { x: 112, y: 148 }, { x: 90, y: 146 }];
    inked(pen, tube, BRASS, 2.4);
    pen.hatch(tube, 5, 1.4, 0.9, { alpha: 0.35 });
    inked(pen, [{ x: 92, y: 18 }, { x: 128, y: 22 }, { x: 124, y: 42 }, { x: 94, y: 38 }], INK, 1.6);
    inked(pen, rect(94, 146, 16, 14), INK, 1.4);
    inked(pen, arc(62, 108, 10, 10, 0, Math.PI * 2, 12).slice(0, -1), BRASS, 2);
  });
}

// ---------------------------------------------------------------- the jars

export const JAR_W = 84;
export const JAR_H = 124;

/** A specimen jar's liquid, drawn under the eel in it. */
export function makeJarBack(): Prop {
  return prop(JAR_W, JAR_H, 400, (pen) => {
    pen.fill(rounded(6, 30, JAR_W - 12, JAR_H - 34, 14), GLASS, 0.75);
  });
}

/** The jar's glass, lid and shine, drawn over the eel. */
export function makeJarFront(): Prop {
  return prop(JAR_W, JAR_H, 401, (pen) => {
    pen.closed(rounded(4, 18, JAR_W - 8, JAR_H - 20, 16), 2.4);
    pen.hair([{ x: 8, y: 32 }, { x: JAR_W - 8, y: 32 }], 1.4, '#7b8a64', 0.8);
    inked(pen, rect(0, 4, JAR_W, 18), '#a7744a', 2.2);
    pen.hair([{ x: 4, y: 12 }, { x: JAR_W - 4, y: 12 }], 1, INK, 0.5);
    pen.stroke([{ x: 16, y: 44 }, { x: 14, y: 80 }, { x: 16, y: 108 }], 3, '#ffffff', 0.7, false);
  });
}
