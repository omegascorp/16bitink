import type { Look } from '../../logic/gear';
import { edge, type Draw } from '../kit';
import { glow, mix, SHADOW } from '../paint';
import type { Pt } from '../pen';
import { oval, part, pt, rivets, roundRect, seam, sheen, WASH } from './parts';

/**
 * The drill, held at `hand` and pointing along `angle`, in three looks:
 * 0, a chunky hand drill: pistol grip, vented housing, a fluted cone bit;
 * 1, a heavy contractor's drill: finned housing, a fore-grip, a coolant
 *    canister and a bigger bit with carbide teeth;
 * 2, a plasma lance: a slim barrel with heat-sink rings and three prongs
 *    round an emitter, arcing between them while it cuts.
 * `spin` (0..2) turns the bit or flickers the arcs; `running` says it's
 * cutting, and then the bit's tip glows with the heat.
 */
/** The drill is drawn at this size: a tool in the hand, not bigger than the one holding it. */
const SIZE = 0.68;
const HEAT = '#ffbe6a';

export function drill(d: Draw, look: Look, hand: Pt, angle: number, spin: number, running: boolean): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(angle);
  ctx.scale(SIZE, SIZE);
  if (look === 0) handDrill(d, spin, running);
  else if (look === 1) heavyDrill(d, spin, running);
  else lance(d, spin, running);
  ctx.restore();
}

/** A fluted cone bit from x0 to the tip at x0 + len, `r` across at its base: polished steel with spiral flutes. */
function coneBit(d: Draw, x0: number, len: number, r: number, spin: number, teeth: boolean, running: boolean): void {
  const cone = [pt(x0, -r), pt(x0 + len, 0), pt(x0, r)];
  part(d, cone, '#b9c1cc', { shadow: 0.6, line: 0.7, gloss: true });
  d.pen.clipped(cone, () => {
    for (let k = 0; k < 5; k++) {
      const x = x0 + 0.4 + ((k * (len / 5) + spin * (len / 15)) % (len - 1));
      const half = r * (1 - (x - x0) / len);
      d.pen.hair([pt(x, -half), pt(x + 1.8, half)], 0.5, mix('#b9c1cc', SHADOW, 0.6), 0.85);
      d.pen.hair([pt(x - 0.5, -half), pt(x + 1.2, half)], 0.35, '#ffffff', 0.55);
    }
  });
  sheen(d, [pt(x0 + 0.6, -r * 0.55), pt(x0 + len * 0.7, -r * 0.15)], 0.6);
  if (teeth) for (const s of [-1, 1]) d.pen.stroke([pt(x0 + 0.5, s * r), pt(x0 + 1.4, s * (r + 1.2)), pt(x0 + 2.4, s * r * 0.85)], 0.6, d.ink, 0.9, false);
  if (running) glow(d.pen.ctx, pt(x0 + len - 0.6, 0), r * 1.3, HEAT, 0.75);
}

function handDrill(d: Draw, spin: number, running: boolean): void {
  // Pistol grip and trigger under the housing (the hand holds the grip).
  const grip = [pt(-1.6, 1), pt(1.4, 1), pt(0.8, 5.4), pt(-1.8, 5)];
  part(d, grip, WASH.rubber, { shadow: 0.4, line: 0.6 });
  d.pen.stroke([pt(1.6, 1.4), pt(2.4, 2.8), pt(1.8, 3.4)], 0.5, d.ink, 0.9, false);
  const housing = [pt(-3.4, -3.6), pt(8.6, -3.6), pt(9.8, -2.4), pt(9.8, 2.4), pt(8.6, 3.6), pt(-3.4, 3.6), pt(-4.6, 0)];
  part(d, housing, WASH.can, { shadow: 0.6, line: 0.8 });
  // Vents in a dark band, and a worn steel nose.
  const band = roundRect(-0.4, -2.8, 5.4, 0.9, 0.5);
  part(d, band, '#3a3f52', { shadow: 0, line: 0.4, hatch: 0 });
  for (const x of [0.6, 2.4, 4.2]) d.pen.hair([pt(x, -2.2), pt(x, 0.3)], 0.45, '#8e95a6', 0.9);
  sheen(d, [pt(-2.4, -2.7), pt(7.6, -2.7)], 0.6);
  const collar = roundRect(9.6, -3.2, 11.4, 3.2, 0.4);
  part(d, collar, WASH.darkMetal, { shadow: 0.4, line: 0.55, gloss: true, hatch: 0 });
  coneBit(d, 11.4, 8, 3.1, running ? spin : 0, false, running);
}

function heavyDrill(d: Draw, spin: number, running: boolean): void {
  const grip = [pt(-1.6, 1.4), pt(1.4, 1.4), pt(0.8, 6), pt(-1.8, 5.6)];
  part(d, grip, WASH.rubber, { shadow: 0.4, line: 0.6 });
  const housing = [pt(-4.6, -4.4), pt(10.6, -4.4), pt(12, -3), pt(12, 3), pt(10.6, 4.4), pt(-4.6, 4.4), pt(-6, 0)];
  part(d, housing, WASH.contractor, { shadow: 0.6, cross: true, line: 0.85 });
  // Cooling fins and a fore-grip.
  for (let x = 1; x <= 9; x += 1.6) seam(d, [pt(x, -4.4), pt(x, -1.6)], 0.4);
  const fore = [pt(6.6, 4.2), pt(8.6, 4.2), pt(8, 8.2), pt(6.4, 8)];
  part(d, fore, WASH.rubber, { shadow: 0.4, line: 0.55 });
  // Coolant canister on top, its liquid showing in a window.
  const can = roundRect(-2.8, -7.4, 5, -4.4, 1.2);
  part(d, can, WASH.metal, { shadow: 0.5, line: 0.6, gloss: true });
  part(d, roundRect(-1.4, -6.6, 3.2, -5.2, 0.4), '#7fc6c8', { shadow: 0, line: 0.3, hatch: 0, alpha: 1 });
  d.pen.hair([pt(5, -6), pt(7, -5.6), pt(7.6, -4.4)], 0.5, d.ink, 0.85);
  rivets(d, [pt(-3, 2.6), pt(10, 2.6)], 0.4);
  const collar = roundRect(11.8, -3.8, 13.8, 3.8, 0.4);
  part(d, collar, WASH.darkMetal, { shadow: 0.4, line: 0.55, gloss: true, hatch: 0 });
  coneBit(d, 13.8, 10, 3.8, running ? spin : 0, true, running);
}

function lance(d: Draw, spin: number, running: boolean): void {
  const grip = [pt(-1.4, 1.2), pt(1.2, 1.2), pt(0.8, 5.4), pt(-1.6, 5)];
  part(d, grip, WASH.darkMetal, { shadow: 0.4, line: 0.6 });
  const barrel = [pt(-4, -2.6), pt(13, -2), pt(13, 2), pt(-4, 2.6), pt(-5.2, 0)];
  part(d, barrel, WASH.armour, { shadow: 0.6, line: 0.75, gloss: true });
  // Heat-sink rings.
  for (const x of [3, 5, 7, 9]) {
    part(d, oval(x, 0, 0.8, 3, 12), WASH.darkMetal, { shadow: 0.3, line: 0.4, hatch: 0, gloss: true });
  }
  sheen(d, [pt(-3, -1.6), pt(12, -1.2)], 0.6);
  // Three prongs round the emitter.
  for (const s of [-1, 0, 1]) {
    const prong = [pt(12.6, s * 2 - 0.6), pt(18.4, s * 3.2 - 0.3), pt(18.6, s * 3.2 + 0.5), pt(12.6, s * 2 + 0.6)];
    part(d, prong, WASH.metal, { shadow: 0.3, line: 0.5, gloss: true, hatch: 0 });
  }
  if (running) glow(d.pen.ctx, pt(17, 0), 7, '#bfe6ff', 0.8);
  const lens = oval(15, 0, 1.4, 1.4, 12);
  part(d, lens, '#e4f3fb', { shadow: 0.2, line: 0.5, hatch: 0, gloss: true });
  if (running) {
    // Arcs jumping from prong to prong, a different crackle each frame.
    for (let k = 0; k < 3; k++) {
      const y0 = (k - 1) * 3.2;
      const pts: Pt[] = [pt(18.4, y0)];
      for (let i = 1; i <= 3; i++) pts.push(pt(19 + i * 0.9 + ((spin + i + k) % 3) * 0.4, y0 + ((i + spin) % 2 === 0 ? 1 : -1) * (0.8 + k * 0.2)));
      d.pen.stroke(pts, 0.7, '#e9f6ff', 0.9, false);
      d.pen.stroke(pts, 0.3, d.ink, 0.8, false);
    }
  }
  edge(d, lens, 0.3, 0.6);
}
