import { capsule, cub, type Draw } from '../kit';
import { glow, mix, SHADOW } from '../paint';
import type { Pt } from '../pen';
import { hexWindow, lashing, ribs, star8, ASTER } from './asterMotifs';
import { markOf } from './marks';
import { oval, part, pt, roundRect, seam, sheen } from './parts';

/**
 * Our pulse: the Aster's wrist resonator as our printer builds it (spec,
 * "Weapons"), like the Mk 2 gear: our silhouette, their ideas. A leather
 * cuff with brass buckles carries a malachite housing ribbed like a shell
 * and lashed with cord where ours would be riveted, a hexagonal window
 * glowing teal, and a short barrel ending in a brass collar round the lens
 * that throws the ring. Drawn in blue, as all your gear is.
 */
const M = markOf(2);
const LENS = ASTER.glow;

/** The tool slot's picture: the pulse off the wrist, the cuff open underneath, the barrel forward (right). 40 units, centre origin. */
export function pulseTool(d: Draw): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(-1.5, 1);
  ctx.scale(0.88, 0.88);
  ctx.rotate(-0.12);
  // The cuff: a leather sleeve, seen a little from the end so its opening shows.
  const cuff = roundRect(-16, -3, 6, 13, 4);
  part(d, cuff, M.trim, { shadow: 0.55, line: 0.8 });
  const opening = oval(-16, 5, 3, 7.6, 16);
  part(d, opening, '#231a14', { shadow: 0, line: 0.6, hatch: 0, alpha: 1 });
  // Two straps with brass buckles.
  for (const x of [-10, 0]) {
    const strap = roundRect(x - 1.8, -3.4, x + 1.8, 13.4, 0.8);
    part(d, strap, mix(M.trim, '#8a6a4a', 0.35), { shadow: 0.45, line: 0.55, hatch: 0 });
    const buckle = roundRect(x - 2.4, 6.6, x + 2.4, 10.4, 0.6);
    part(d, buckle, M.fitting, { shadow: 0.35, line: 0.6, gloss: true, hatch: 0 });
    d.pen.hair([pt(x, 7.2), pt(x, 9.8)], 0.5, d.ink, 0.8);
  }
  // The barrel, under the housing's front: a short tube to a brass collar and the lens.
  const barrel = capsule(pt(2, -1), pt(14, -1), 7.4, 7);
  part(d, barrel, M.nozzle, { shadow: 0.5, line: 0.7, gloss: true });
  const collar = roundRect(12, -6.4, 16, 4.4, 1.2);
  part(d, collar, M.fitting, { shadow: 0.45, line: 0.7, gloss: true });
  seam(d, [pt(14, -6), pt(14, 4)], 0.4);
  glow(ctx, pt(17, -1), 9, LENS, 0.5);
  const lens = oval(16.6, -1, 2, 4.8, 16);
  part(d, lens, LENS, { shadow: 0.25, line: 0.6, gloss: true, hatch: 0, alpha: 1 });
  d.pen.dot(16, -3, 0.7, '#ffffff', 0.9);
  // The housing on top: a ribbed malachite shell, lashed down at both ends.
  const housing = [pt(-13, -3), ...cub(pt(-13, -3), pt(-13, -12), pt(-4, -14), pt(4, -13), 8), ...cub(pt(4, -13), pt(9, -12.4), pt(11, -8), pt(11, -3), 6)];
  part(d, housing, M.shell, { shadow: 0.55, line: 0.8, gloss: true });
  ribs(d, housing, pt(-1, -2), M.shell, 7, Math.PI * 0.85, -Math.PI / 2, 13);
  lashing(d, pt(-11.6, -4.6), 4, Math.PI / 2 + 0.3, 3);
  lashing(d, pt(9.6, -4.6), 4, Math.PI / 2 - 0.3, 3);
  hexWindow(d, pt(-1.6, -8), 2.4);
  // Three pips of charge, the lit ones teal.
  for (let k = 0; k < 3; k++) d.pen.dot(4 + k * 2, -10 + k * 0.4, 0.75, k < 2 ? LENS : mix(M.shell, SHADOW, 0.5), 0.95);
  star8(d, pt(-8, -8.4), 1.8, M.fitting);
  sheen(d, cub(pt(-11, -6), pt(-11, -10), pt(-7, -12.4), pt(-3, -13), 6), 0.8);
  ctx.restore();
}

/**
 * The pulse worn on the front arm, from `shoulder` to `hand`: a leather
 * cuff round the forearm with a malachite housing on its back (the side
 * away from the body) and the teal lens at its wrist end, glowing, so it
 * reads even at play size above the drill.
 */
export function pulseBracer(d: Draw, shoulder: Pt, hand: Pt): void {
  const { ctx } = d.pen;
  const ang = Math.atan2(hand.y - shoulder.y, hand.x - shoulder.x);
  const len = Math.hypot(hand.x - shoulder.x, hand.y - shoulder.y);
  ctx.save();
  ctx.translate(shoulder.x, shoulder.y);
  ctx.rotate(ang);
  // Local frame: x runs shoulder to hand; -y is the back of the arm.
  const x0 = len * 0.36;
  const x1 = len * 0.8;
  const cuff = roundRect(x0, -2.5, x1, 2.4, 0.9);
  part(d, cuff, M.trim, { shadow: 0.5, line: 0.5, hatch: 0 });
  d.pen.hair([pt(x0 + 0.9, -2.3), pt(x0 + 0.9, 2.2)], 0.5, M.fitting, 0.95);
  const housing = [pt(x0 - 0.2, -1.4), ...cub(pt(x0 - 0.2, -1.4), pt(x0, -4.6), pt(x1 - 0.6, -5), pt(x1 + 0.6, -3), 6), pt(x1 + 0.8, -1.2)];
  part(d, housing, M.shell, { shadow: 0.5, line: 0.55, gloss: true, hatch: 0 });
  for (const k of [0.3, 0.55]) {
    const x = x0 + (x1 - x0) * k;
    d.pen.hair([pt(x, -1.6), pt(x + 0.3, -4.3)], 0.3, mix(M.shell, SHADOW, 0.5), 0.8);
  }
  const lens = pt(x1 + 0.9, -2.4);
  glow(ctx, lens, 4.2, LENS, 0.6);
  d.pen.dot(lens.x, lens.y, 1.15, LENS, 1);
  d.pen.dot(lens.x - 0.3, lens.y - 0.35, 0.4, '#ffffff', 0.9);
  ctx.restore();
}
