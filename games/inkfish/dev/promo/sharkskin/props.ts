import { ellipse, INK, PAPER, type Pt } from '../../../src/art/pen';
import { drawFist } from './figures';
import { bake, capsule, curve, inked, type Prop, RED, rounded, SHARK_GREY, WASABI, WASABI_DARK, WOOD } from './kit';

/**
 * The sketched props: the sheet of sandpaper, the shark-skin grater, the
 * wasabi root in the chef's fist, the plate of sushi and the flag of Japan
 * (figures.ts has the people). All original pen drawings, baked once per boil frame (kit.ts).
 */

const SANDPAPER = '#cfa968';
const GRIT = '#6f5124';
const RICE = '#fbfaf3';
const SALMON = '#f29a6a';
const TUNA = '#c9434d';

/** A sheet of sandpaper, gritty, one corner curling up. Anchor: its middle. */
export function makeSandpaper(): Prop {
  return bake(420, 320, 210, 160, 21, (pen) => {
    const W = 170;
    const H = 112;
    const sheet = [{ x: -W, y: -H }, { x: W, y: -H }, { x: W, y: H - 62 }, { x: W - 62, y: H }, { x: -W, y: H }];
    pen.fill(sheet, SANDPAPER, 1);
    pen.stipple(sheet, 5200, () => 0.75, 1.3, GRIT);
    pen.stipple(sheet, 1400, () => 0.6, 1, PAPER);
    pen.closed(sheet, 4);
    // The curled corner shows the paper's plain back.
    inked(pen, [{ x: W, y: H - 62 }, { x: W - 62, y: H }, { x: W - 70, y: H - 70 }], '#f1e6c9', 3);
  });
}

/** The shark-skin grater: a wooden paddle with a handle, its face covered in grey skin. Anchor: the middle of the skin. */
export const GRATER = { w: 150, h: 86 } as const;
export function makeGrater(): Prop {
  return bake(540, 270, 195, 135, 31, (pen, ctx) => {
    inked(pen, capsule({ x: 165, y: 0 }, { x: 300, y: 0 }, 26), WOOD);
    pen.hair([{ x: 190, y: -8 }, { x: 290, y: -6 }], 1.6, INK, 0.4);
    const board = rounded(-172, -106, 344, 212, 26);
    pen.fill(board, WOOD, 1);
    pen.hatch(board, 16, 0.04, 1.2, { alpha: 0.25 });
    pen.closed(board, 4);
    const face = rounded(-GRATER.w, -GRATER.h, 2 * GRATER.w, 2 * GRATER.h, 14);
    pen.fill(face, SHARK_GREY, 1);
    // Tiny scales, too small to see one by one: a fine rasp of dots and ticks.
    pen.stipple(face, 3600, () => 0.8, 1.2, '#cfd5d9');
    pen.stipple(face, 2000, () => 0.7, 1, INK);
    ctx.save();
    pen.hatch(face, 7, 0.0, 0.8, { alpha: 0.18 });
    ctx.restore();
    pen.closed(face, 3);
  });
}

/** A wasabi root held in the chef's fist: knobbly, green, cut leaf stalks on top. Anchor: its tip, where it grates. */
export function makeWasabi(): Prop {
  return bake(200, 300, 110, 285, 41, (pen) => {
    for (const [dx, top] of [[-26, -244], [2, -258], [30, -238]] as const) inked(pen, capsule({ x: dx * 0.25, y: -168 }, { x: dx, y: top }, 6), '#a8d27a', 2.5);
    const left: Pt[] = [];
    const right: Pt[] = [];
    for (let y = 0; y >= -172; y -= 12) {
      const w = 12 + 15 * Math.min(1, -y / 120) + (Math.abs(y) % 24 === 0 ? 3 : 0);
      left.push({ x: -w, y });
      right.push({ x: w, y });
    }
    const root = [...left, ...right.reverse()];
    pen.fill(root, WASABI, 1);
    pen.stipple(root, 500, () => 0.6, 1.4, WASABI_DARK);
    for (let y = -20; y > -170; y -= 22) pen.hair(curve({ x: -20, y }, { x: 0, y: y + 6 }, { x: 20, y }, 5), 1.6, INK, 0.5);
    pen.closed(root, 3.5);
    drawFist(pen);
  });
}

/**
 * A plate of sushi: three pieces of nigiri (salmon, tuna, salmon) on rice,
 * and a dab of wasabi. Anchor: the plate's middle.
 */
export function makeSushi(): Prop {
  return bake(560, 260, 280, 140, 61, (pen) => {
    inked(pen, ellipse(0, 20, 250, 78, 40), '#fdfcf8');
    pen.hair([...ellipse(0, 20, 206, 56, 40), ellipse(0, 20, 206, 56, 40)[0]!], 1.6, INK, 0.4);
    [{ x: -125, fish: SALMON }, { x: 0, fish: TUNA }, { x: 125, fish: SALMON }].forEach(({ x, fish }) => {
      const y = x === 0 ? -6 : 4;
      inked(pen, ellipse(x, y + 8, 56, 26, 20), RICE, 3);
      for (let k = -2; k <= 2; k++) pen.hair(curve({ x: x + k * 18 - 5, y: y + 16 }, { x: x + k * 18, y: y + 12 }, { x: x + k * 18 + 5, y: y + 16 }, 3), 1.2, INK, 0.4);
      const slice = [...curve({ x: x - 66, y: y - 2 }, { x: x - 10, y: y - 46 }, { x: x + 66, y: y - 18 }, 10), ...curve({ x: x + 66, y: y - 18 }, { x: x + 10, y: y + 2 }, { x: x - 66, y: y - 2 }, 10).slice(1)];
      pen.fill(slice, fish, 1);
      if (fish === SALMON) for (let k = -2; k <= 2; k++) pen.stroke([{ x: x + k * 22 - 6, y: y - 30 }, { x: x + k * 22 + 8, y: y - 6 }], 2.5, PAPER, 0.85, false);
      pen.closed(slice, 3);
    });
    // The dab of wasabi, curled to a point.
    const dab = [...ellipse(196, 46, 26, 14, 16)];
    inked(pen, dab, WASABI, 2.5);
    pen.stroke(curve({ x: 186, y: 36 }, { x: 196, y: 22 }, { x: 204, y: 34 }, 5), 3, WASABI_DARK, 1, false);
  });
}

/** The flag of Japan, a little card. Anchor: its middle. */
export function makeFlag(): Prop {
  return bake(170, 120, 85, 60, 71, (pen) => {
    inked(pen, [{ x: -66, y: -44 }, { x: 66, y: -44 }, { x: 66, y: 44 }, { x: -66, y: 44 }], '#fffdf7');
    pen.fill(ellipse(0, 0, 26, 26, 24), RED, 1);
  });
}
