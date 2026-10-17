import { lookOf } from '../../logic/gear';
import { edge, type Draw } from '../kit';
import { glow, mix, SHADOW } from '../paint';
import type { Pt } from '../pen';
import { hexWindow, lashing, ribs } from './asterMotifs';
import { markOf } from './marks';
import { gem, glowLine, oval, part, pores, pt, rivets, roundRect, seam, sheen, WASH } from './parts';

/**
 * The drill, held at `hand` and pointing along `angle`. Its shape comes in
 * three families, each mark in its planet's materials:
 * 0, a chunky hand drill: pistol grip, housing, a fluted cone bit. The
 *    starter's is ochre with a vent band; Graphite's (Mk 1) carbon-black
 *    with its copper windings showing and diamond grit on the bit; Mycel's
 *    (Mk 2) malachite ribbed like a shell after the Aster's designs, a brass
 *    carrying handle, a hexagonal window glowing teal, a grip lashed with
 *    cord, copper windings and a dark iron bit; Brine's (Mk 3) teal with a
 *    water jet along the top;
 * 1, a heavy contractor's drill: finned housing, a fore-grip, a coolant
 *    canister and a bigger bit with carbide teeth, its coolant and touches
 *    by mark (rust, crystal, glowing fins, pores);
 * 2, a plasma lance: a slim barrel with heat-sink rings and three prongs
 *    round an emitter, arcing between them in the mark's colour.
 * `spin` (0..2) turns the bit or flickers the arcs; `running` says it's
 * cutting, and then the bit's tip glows with the heat.
 */
/** The drill is drawn at this size: a tool in the hand, not bigger than the one holding it. */
const SIZE = 0.68;
const HEAT = '#ffbe6a';

export function drill(d: Draw, mk: number, hand: Pt, angle: number, spin: number, running: boolean): void {
  const { ctx } = d.pen;
  const look = lookOf(mk);
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(angle);
  ctx.scale(SIZE, SIZE);
  if (look === 0) handDrill(d, mk, spin, running);
  else if (look === 1) heavyDrill(d, mk, spin, running);
  else lance(d, mk, spin, running);
  ctx.restore();
}

const STEEL = '#b9c1cc';
/** Mycel's bit is iron, dark and a little rusty. */
const IRON = '#7c7672';

/** A fluted cone bit from x0 to the tip at x0 + len, `r` across at its base: polished `metal` with spiral flutes. */
function coneBit(d: Draw, x0: number, len: number, r: number, spin: number, teeth: boolean, running: boolean, metal = STEEL): void {
  const cone = [pt(x0, -r), pt(x0 + len, 0), pt(x0, r)];
  part(d, cone, metal, { shadow: 0.6, line: 0.7, gloss: true });
  d.pen.clipped(cone, () => {
    for (let k = 0; k < 5; k++) {
      const x = x0 + 0.4 + ((k * (len / 5) + spin * (len / 15)) % (len - 1));
      const half = r * (1 - (x - x0) / len);
      d.pen.hair([pt(x, -half), pt(x + 1.8, half)], 0.5, mix(metal, SHADOW, 0.6), 0.85);
      d.pen.hair([pt(x - 0.5, -half), pt(x + 1.2, half)], 0.35, '#ffffff', 0.55);
    }
  });
  sheen(d, [pt(x0 + 0.6, -r * 0.55), pt(x0 + len * 0.7, -r * 0.15)], 0.6);
  if (teeth) for (const s of [-1, 1]) d.pen.stroke([pt(x0 + 0.5, s * r), pt(x0 + 1.4, s * (r + 1.2)), pt(x0 + 2.4, s * r * 0.85)], 0.6, d.ink, 0.9, false);
  if (running) glow(d.pen.ctx, pt(x0 + len - 0.6, 0), r * 1.3, HEAT, 0.75);
}

function handDrill(d: Draw, mk: number, spin: number, running: boolean): void {
  const m = markOf(mk);
  // Pistol grip and trigger under the housing (the hand holds the grip).
  const grip = [pt(-1.6, 1), pt(1.4, 1), pt(0.8, 5.4), pt(-1.8, 5)];
  part(d, grip, mk === 3 ? m.fitting : WASH.rubber, { shadow: 0.4, line: 0.6 });
  d.pen.stroke([pt(1.6, 1.4), pt(2.4, 2.8), pt(1.8, 3.4)], 0.5, d.ink, 0.9, false);
  if (mk === 2) {
    // A brass carrying handle over the housing.
    const arch = [pt(0, -3.4), pt(0.8, -6.6), pt(6.4, -6.6), pt(7.2, -3.4)];
    d.pen.stroke(arch, 1.5, d.ink, 0.95, false);
    d.pen.stroke(arch, 0.85, m.fitting, 1, false);
    d.pen.stroke(arch.slice(1, 3).map((p) => pt(p.x, p.y - 0.25)), 0.3, '#ffffff', 0.7, false);
  }
  if (mk === 3) {
    // A water jet along the top, to wash the face being cut.
    d.pen.stroke([pt(-2.6, -4.4), pt(9, -4.4), pt(12.6, -2.8)], 1.3, d.ink, 0.95, false);
    d.pen.stroke([pt(-2.6, -4.4), pt(9, -4.4), pt(12.6, -2.8)], 0.7, m.fitting, 1, false);
  }
  const housing = [pt(-3.4, -3.6), pt(8.6, -3.6), pt(9.8, -2.4), pt(9.8, 2.4), pt(8.6, 3.6), pt(-3.4, 3.6), pt(-4.6, 0)];
  part(d, housing, m.shell, { shadow: 0.6, line: 0.8, gloss: mk === 1 });
  if (mk === 2) {
    // Ribbed like a shell, fanning from the back, with a window onto the windings' glow.
    ribs(d, housing, pt(-4.6, 0), m.shell, 7, Math.PI * 0.55, 0, 16);
    hexWindow(d, pt(7.4, 1.1), 1.2);
    lashing(d, pt(-0.3, 3.4), 2.6, 0.08, 3);
  }
  const band = roundRect(-0.4, -2.8, 5.4, 0.9, 0.5);
  part(d, band, '#3a3f52', { shadow: 0, line: 0.4, hatch: 0 });
  if (mk === 1 || mk === 2) {
    // Copper windings showing through the band.
    d.pen.clipped(band, () => {
      for (let x = -0.4; x < 5.6; x += 0.7) d.pen.stroke([pt(x, -2.9), pt(x + 0.6, 1)], 0.45, '#c4773f', 1, false);
    });
  } else {
    for (const x of [0.6, 2.4, 4.2]) d.pen.hair([pt(x, -2.2), pt(x, 0.3)], 0.45, '#8e95a6', 0.9);
  }
  if (mk === 1) d.pen.stroke([pt(-3, 2.6), pt(8.8, 2.6)], 0.5, m.fitting, 1, false);
  if (mk === 3) d.pen.dot(-3.4, 0, 0.9, m.fitting);
  sheen(d, [pt(-2.4, -2.7), pt(7.6, -2.7)], 0.6);
  const collar = roundRect(9.6, -3.2, 11.4, 3.2, 0.4);
  part(d, collar, mk === 0 ? WASH.darkMetal : m.fitting, { shadow: 0.4, line: 0.55, gloss: true, hatch: 0 });
  coneBit(d, 11.4, 8, 3.1, running ? spin : 0, false, running, mk === 2 ? IRON : STEEL);
  if (mk === 1) {
    // Diamond grit along the bit.
    for (const [x, y] of [[12.6, -1.6], [14, 1], [15.4, -0.6], [16.8, 0.4], [13.4, 0.2]] as const) d.pen.dot(x, y, 0.35, '#ffffff', 0.95);
  }
}

function heavyDrill(d: Draw, mk: number, spin: number, running: boolean): void {
  const m = markOf(mk);
  const grip = [pt(-1.6, 1.4), pt(1.4, 1.4), pt(0.8, 6), pt(-1.8, 5.6)];
  part(d, grip, WASH.rubber, { shadow: 0.4, line: 0.6 });
  const housing = [pt(-4.6, -4.4), pt(10.6, -4.4), pt(12, -3), pt(12, 3), pt(10.6, 4.4), pt(-4.6, 4.4), pt(-6, 0)];
  part(d, housing, m.shell, { shadow: 0.6, cross: true, line: 0.85, gloss: mk === 5 || mk === 6 });
  if (mk === 7) pores(d, housing, m.shell, 22);
  // Cooling fins (glowing on Ember's) and a fore-grip.
  for (let x = 1; x <= 9; x += 1.6) {
    if (mk === 6) glowLine(d, [pt(x, -4.2), pt(x, -1.8)], m.accent, 0.4);
    else seam(d, [pt(x, -4.4), pt(x, -1.6)], 0.4);
  }
  const fore = [pt(6.6, 4.2), pt(8.6, 4.2), pt(8, 8.2), pt(6.4, 8)];
  part(d, fore, WASH.rubber, { shadow: 0.4, line: 0.55 });
  // Coolant canister on top, its liquid showing in a window.
  const can = roundRect(-2.8, -7.4, 5, -4.4, 1.2);
  part(d, can, m.fitting, { shadow: 0.5, line: 0.6, gloss: true });
  part(d, roundRect(-1.4, -6.6, 3.2, -5.2, 0.4), m.accent, { shadow: 0, line: 0.3, hatch: 0, alpha: 1 });
  if (mk === 5) gem(d, pt(0.9, -8.6), 1.3, m.accent);
  d.pen.hair([pt(5, -6), pt(7, -5.6), pt(7.6, -4.4)], 0.5, d.ink, 0.85);
  rivets(d, [pt(-3, 2.6), pt(10, 2.6)], 0.4, m.fitting);
  if (mk === 4) {
    // Rust run down from the rivets.
    for (const x of [-3, 10]) d.pen.hair([pt(x, 3), pt(x + 0.2, 4.2)], 0.4, mix(m.accent, SHADOW, 0.2), 0.8);
  }
  const collar = roundRect(11.8, -3.8, 13.8, 3.8, 0.4);
  part(d, collar, WASH.darkMetal, { shadow: 0.4, line: 0.55, gloss: true, hatch: 0 });
  coneBit(d, 13.8, 10, 3.8, running ? spin : 0, true, running);
}

function lance(d: Draw, mk: number, spin: number, running: boolean): void {
  const m = markOf(mk);
  const grip = [pt(-1.4, 1.2), pt(1.2, 1.2), pt(0.8, 5.4), pt(-1.6, 5)];
  part(d, grip, m.trim, { shadow: 0.4, line: 0.6 });
  const barrel = [pt(-4, -2.6), pt(13, -2), pt(13, 2), pt(-4, 2.6), pt(-5.2, 0)];
  part(d, barrel, m.shell, { shadow: 0.6, line: 0.75, gloss: true });
  // Heat-sink rings.
  for (const x of [3, 5, 7, 9]) {
    part(d, oval(x, 0, 0.8, 3, 12), m.fitting, { shadow: 0.3, line: 0.4, hatch: 0, gloss: true });
  }
  sheen(d, [pt(-3, -1.6), pt(12, -1.2)], 0.6);
  if (mk === 9) glowLine(d, [pt(-3.6, 1.6), pt(12.6, 1.2)], m.accent, 0.35);
  if (mk === 10) gem(d, pt(-2.4, 0), 1.5, m.accent);
  // Three prongs round the emitter.
  for (const s of [-1, 0, 1]) {
    const prong = [pt(12.6, s * 2 - 0.6), pt(18.4, s * 3.2 - 0.3), pt(18.6, s * 3.2 + 0.5), pt(12.6, s * 2 + 0.6)];
    part(d, prong, m.fitting, { shadow: 0.3, line: 0.5, gloss: true, hatch: 0 });
  }
  if (running) glow(d.pen.ctx, pt(17, 0), 7, m.accent, 0.8);
  const lens = oval(15, 0, 1.4, 1.4, 12);
  part(d, lens, mix(m.accent, '#ffffff', 0.6), { shadow: 0.2, line: 0.5, hatch: 0, gloss: true });
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
