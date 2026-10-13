import { claw, PLAYER_COLORS } from './crabArt';
import { bezier, capsule, type Draw, edge, glint, mottle, oval, pt, ribbon, shade, skin } from './kit';
import { BLUE, SAND_DRY, SAND_GRAIN, SAND_WET } from './palette';
import type { Pt } from './pen';

/**
 * The signs on the touch buttons, inked like the rest of the game: paper,
 * an off-register wash, shadow hatching and a pen contour. Drawn in an
 * ICON-unit square with the origin at its centre. The hide button shows the
 * crab's own shell instead (its texture), so it has no drawing here.
 */
export const ICON = 96;
/** Texture px per unit: crisp at a phone's pixel ratio. */
export const ICON_RES = 3;

export type ButtonIcon = 'jump' | 'dig' | 'grab';

const WOOD = '#b07a45';
const STEEL = '#8e99a0';

/** A low heap of sand with the ground line under it, its grains stippled in. */
function mound(d: Draw, left: number, right: number, top: number, base: number): Pt[] {
  const mid = (left + right) / 2;
  const shape = [...bezier(pt(left, base), pt(mid, top - (base - top)), pt(right, base), 14)];
  skin(d, shape, SAND_WET, 0.75);
  mottle(d, shape, 90, top, base, SAND_GRAIN, 0.6);
  d.pen.stroke(shape, 1.4, d.ink, 1, false);
  d.pen.hair([pt(left - 6, base), pt(right + 6, base)], 1, d.ink, 0.7);
  return shape;
}

/** A clump of sand in the air. */
function clump(d: Draw, x: number, y: number, r: number): void {
  const shape = oval(x, y, r, r * 0.8, 9);
  skin(d, shape, SAND_DRY, 0.9);
  edge(d, shape, 1);
}

/** Jump: a fat inked arrow springing off a heap of sand, dust kicked out either side. */
function jump(d: Draw): void {
  mound(d, -26, 26, 28, 36);
  const arrow = [pt(-7, 26), pt(-7, -2), pt(-19, -2), pt(0, -30), pt(19, -2), pt(7, -2), pt(7, 26)];
  skin(d, arrow, BLUE, 0.35);
  shade(d, arrow, 0.45);
  edge(d, arrow, 1.8);
  glint(d, [pt(-3, 20), pt(-3, 2)], 1.4, 0.7);
  for (const s of [-1, 1]) {
    // Speed lines beside the shaft, and dust puffing off the heap.
    d.pen.hair([pt(s * 14, 22), pt(s * 14, 8)], 0.9, d.ink, 0.6);
    d.pen.hair([pt(s * 20, 26), pt(s * 20, 16)], 0.9, d.ink, 0.45);
    clump(d, s * 30, 26, 3.4);
    clump(d, s * 36, 20, 2.2);
  }
}

/** Dig: a wooden spade, its blade sunk in a heap of sand, a few clumps thrown up. */
function dig(d: Draw): void {
  const grip = pt(20, -32);
  const shoulder = pt(3, -5);
  const dir = { x: shoulder.x - grip.x, y: shoulder.y - grip.y };
  const len = Math.hypot(dir.x, dir.y);
  const u = { x: dir.x / len, y: dir.y / len };
  // The blade: a rounded spade along the handle's line, its tip down in the sand.
  const spine = Array.from({ length: 9 }, (_, i) => pt(shoulder.x + u.x * i * 3, shoulder.y + u.y * i * 3));
  const blade = ribbon(spine, (t) => 18 * Math.pow(Math.max(0, 1 - t * t), 0.45) + 0.6).shape;
  skin(d, blade, STEEL, 0.6);
  shade(d, blade, 0.5);
  edge(d, blade, 1.6);
  glint(d, [pt(shoulder.x + 2, shoulder.y + 3), pt(shoulder.x - 3, shoulder.y + 12)], 1.3, 0.8);
  const handle = capsule(grip, pt(shoulder.x + u.x * 2, shoulder.y + u.y * 2), 5.5, 5.5);
  const tee = capsule(pt(grip.x - 7, grip.y - 4), pt(grip.x + 7, grip.y + 4), 5, 5);
  for (const part of [handle, tee]) {
    skin(d, part, WOOD, 0.7);
    edge(d, part, 1.3);
  }
  d.pen.hair([pt(grip.x - 1, grip.y + 6), pt(shoulder.x + 2, shoulder.y - 4)], 0.6, d.ink, 0.5);
  mound(d, -30, 22, 14, 36);
  clump(d, -24, -6, 3.6);
  clump(d, -31, 4, 2.6);
  clump(d, -16, -14, 2.4);
}

/** Grab: the crab's own big claw, held open. */
function grab(d: Draw): void {
  claw(d, -78, 8, 1, PLAYER_COLORS.body, 6, false, PLAYER_COLORS.tip);
  // Little ticks round the open fingers: it's about to snap shut.
  d.pen.hair([pt(29, -21), pt(34, -28)], 1, d.ink, 0.6);
  d.pen.hair([pt(34, -5), pt(41, -6)], 1, d.ink, 0.6);
  d.pen.hair([pt(30, 8), pt(35, 14)], 1, d.ink, 0.6);
}

const DRAW: Readonly<Record<ButtonIcon, (d: Draw) => void>> = { jump, dig, grab };

export function drawButtonIcon(d: Draw, icon: ButtonIcon): void {
  DRAW[icon](d);
}

export const BUTTON_ICONS: readonly ButtonIcon[] = ['jump', 'dig', 'grab'];
