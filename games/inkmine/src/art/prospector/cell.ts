import { lookOf } from '../../logic/gear';
import { capsule, edge, type Draw } from '../kit';
import { glow, mix, SHADOW } from '../paint';
import { hexWindow, lashing, ribs } from './asterMotifs';
import { markOf } from './marks';
import { frost, gem, glowLine, oval, part, pores, pt, rivets, roundRect, seam, sheen } from './parts';

/**
 * The drill's energy cell, strapped to the back in front of the jetpack's
 * tank, its charge lit in the mark's colour. Its shape comes in three
 * families:
 * 0, a tall battery with a charge window. The starter's is pale steel with
 *    four gamboge bars; Graphite's (Mk 1) carbon-black with copper
 *    terminals standing up and a copper foil edge, its charge copper-orange;
 *    Mycel's (Mk 2) pyrite brass under a ribbed malachite cap, lashed round
 *    the middle with cord, its charge in three hexagonal windows glowing
 *    teal (the Aster's design); Brine's (Mk 3) pearl with teal bands;
 * 1, a riveted box at the small of the back with a round charge gauge;
 * 2, a slim cartridge with a ring of light.
 */
export function cell(d: Draw, mk: number): void {
  const look = lookOf(mk);
  if (look === 0) battery(d, mk);
  else if (look === 1) box(d, mk);
  else cartridge(d, mk);
}

function battery(d: Draw, mk: number): void {
  const m = markOf(mk);
  if (mk === 1) {
    // Copper terminals standing up from the top.
    for (const x of [-11.4, -8.4]) part(d, roundRect(x, -8, x + 1.8, -6, 0.3), m.fitting, { shadow: 0.3, line: 0.45, gloss: true, hatch: 0 });
  }
  const body = roundRect(-12.6, -6.4, -5.8, 8, 1.2);
  part(d, body, m.case, { shadow: 0.55, line: 0.65, gloss: true });
  if (mk === 2) {
    // A ribbed malachite cap, the charge in three hexagonal windows, a cord round the middle.
    const cap = roundRect(-13, -7.6, -5.4, -4.2, 1.6);
    part(d, cap, m.shell, { shadow: 0.45, line: 0.5, gloss: true });
    ribs(d, cap, pt(-9.2, -3.4), m.shell, 7, Math.PI * 0.6, -Math.PI / 2, 5);
    for (const y of [-2.2, 0.6, 3.4]) hexWindow(d, pt(-9.2, y), 1.2, m.charge);
    lashing(d, pt(-9.2, 5.6), 6.4, 0, 2);
    sheen(d, [pt(-11.8, -3.6), pt(-11.8, 6)], 0.45);
    return;
  }
  if (mk === 3) for (const y of [-5.4, 6.2]) part(d, roundRect(-12.7, y, -5.7, y + 1, 0.3), m.shell, { shadow: 0.3, line: 0.35, hatch: 0, gloss: true });
  // The charge window: four bars, lit.
  const win = roundRect(-11.4, -5, -7, 2.6, 0.5);
  part(d, win, '#2c3352', { shadow: 0, line: 0.4, hatch: 0 });
  glow(d.pen.ctx, pt(-9.2, -1.2), 4, m.charge, 0.35);
  for (const y of [-4, -2.2, -0.4, 1.4]) part(d, roundRect(-10.8, y, -7.6, y + 1, 0.2), m.charge, { shadow: 0, line: 0, hatch: 0, alpha: 1 });
  seam(d, [pt(-12.4, 3.8), pt(-6, 3.8)], 0.35);
  edge(d, roundRect(-10.6, 4.6, -7.8, 6.2, 0.4), 0.45);
  if (mk === 1) d.pen.stroke([pt(-12.2, -5.6), pt(-12.2, 7.2)], 0.6, m.fitting, 1, false);
  sheen(d, [pt(-11.8, -5.6), pt(-7, -5.8)], 0.45);
}

function box(d: Draw, mk: number): void {
  const m = markOf(mk);
  const body = roundRect(-12.6, -1.6, -5.4, 8.6, 0.8);
  part(d, body, m.case, { shadow: 0.55, line: 0.65, gloss: true });
  if (mk === 7) pores(d, body, m.case, 14);
  const dial = oval(-9, 2.6, 2.2, 2.2, 16);
  glow(d.pen.ctx, pt(-9, 2.6), 4, m.charge, 0.4);
  part(d, dial, '#2c3352', { shadow: 0, line: 0.45, hatch: 0 });
  if (mk === 5) gem(d, pt(-9, 2.6), 1.6, m.accent);
  else part(d, oval(-9, 2.6, 1.4, 1.4, 14), m.charge, { shadow: 0.1, line: 0, hatch: 0, alpha: 1 });
  if (mk === 6) glowLine(d, [pt(-12.2, 6.6), pt(-5.8, 6.6)], m.accent, 0.35);
  else seam(d, [pt(-12.4, 6.4), pt(-5.6, 6.4)], 0.35);
  rivets(d, [pt(-11.6, -0.6), pt(-6.4, -0.6), pt(-11.6, 7.6), pt(-6.4, 7.6)], 0.3, m.fitting);
  if (mk === 4) d.pen.hair([pt(-11.6, 0), pt(-11.4, 1.6)], 0.4, mix(m.accent, SHADOW, 0.2), 0.8);
  sheen(d, [pt(-11.8, -0.8), pt(-7, -1)], 0.45);
}

function cartridge(d: Draw, mk: number): void {
  const m = markOf(mk);
  const body = capsule(pt(-8.6, -3.6), pt(-8.6, 7), 3.6, 3.6);
  part(d, body, m.case, { shadow: 0.55, line: 0.6, gloss: true });
  glow(d.pen.ctx, pt(-8.6, 1.6), 3.4, m.charge, 0.5);
  part(d, roundRect(-10.4, 0.8, -6.8, 2.4, 0.4), m.charge, { shadow: 0.1, line: 0.35, hatch: 0, alpha: 1 });
  if (mk === 8) frost(d, [pt(-9.6, -4.6), pt(-8.6, -5.2), pt(-7.6, -4.6)]);
  if (mk === 10) gem(d, pt(-8.6, -2.2), 1, m.accent);
  sheen(d, [pt(-9.6, -3), pt(-9.6, 6)], 0.4);
}
