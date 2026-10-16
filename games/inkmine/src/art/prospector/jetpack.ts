import type { Look } from '../../logic/gear';
import { capsule, edge, type Draw } from '../kit';
import { dab, glow, mix, SHADOW } from '../paint';
import type { Pt } from '../pen';
import { oval, part, pt, rivets, roundRect, seam, sheen, WASH } from './parts';

/**
 * The pack on the prospector's back, carrying the drill's energy cell and
 * the jetpack's fuel, in three looks:
 * 0, a battery cell and a dented ochre fuel can strapped together, one nozzle;
 * 1, a framed pack with twin tanks, two nozzles, a pressure dial and fins;
 * 2, a sealed pod with vents and a gimballed nozzle.
 * NOZZLES gives each look's nozzle mouth, for the flame.
 */
export const NOZZLES: Readonly<Record<Look, Pt>> = { 0: pt(-9.5, 11.2), 1: pt(-10, 11.6), 2: pt(-9.4, 12) };

/** The shoulder strap across the chest (drawn over the torso). */
export function strap(d: Draw, look: Look): void {
  if (look === 2) return;
  const band = [pt(-7, -3), pt(-6.2, -2.2), pt(2.8, 5), pt(1.8, 5.8)];
  part(d, band, mix(WASH.leather, SHADOW, 0.15), { shadow: 0.3, line: 0.4, hatch: 0 });
  rivets(d, [pt(-2.4, 1.2)], 0.35);
}

function nozzle(d: Draw, mouth: Pt, w: number): void {
  const n = [pt(mouth.x - w * 0.55, mouth.y - 3.4), pt(mouth.x + w * 0.55, mouth.y - 3.4), pt(mouth.x + w, mouth.y), pt(mouth.x - w, mouth.y)];
  part(d, n, WASH.darkMetal, { shadow: 0.55, line: 0.55, gloss: true });
  // Heat-blued and sooty towards the mouth.
  dab(d, [pt(mouth.x - w * 0.8, mouth.y - 1.4), pt(mouth.x + w * 0.8, mouth.y - 1.4), pt(mouth.x + w, mouth.y), pt(mouth.x - w, mouth.y)], '#2b2440', 0.45, 0.4);
  edge(d, oval(mouth.x, mouth.y, w, 0.5, 12), 0.45, 0.9);
}

export function jetpack(d: Draw, look: Look): void {
  if (look === 0) {
    // The fuel can, strapped behind the cell: ochre paint, dented and chipped.
    const can = roundRect(-15.4, -5.4, -10.4, 7.6, 1.6);
    part(d, can, WASH.can, { shadow: 0.6, line: 0.6 });
    d.pen.stroke([pt(-14.6, -5.8), pt(-13.4, -7.4), pt(-12, -6)], 0.7, d.ink, 0.9, false);
    d.pen.hair([pt(-15.2, 1.6), pt(-13.4, 2.6), pt(-12.4, 2)], 0.35, mix(WASH.can, SHADOW, 0.6), 0.85);
    for (const [x, y] of [[-14.4, -2.4], [-12, 5.4]] as const) d.pen.dot(x, y, 0.45, WASH.metal, 0.9);
    sheen(d, [pt(-14.6, -3.6), pt(-14.6, 3)], 0.5);
    const cell = roundRect(-12.6, -6.4, -5.8, 8, 1.2);
    part(d, cell, WASH.cell, { shadow: 0.55, line: 0.65, gloss: true });
    // The charge window: four bars, lit.
    const win = roundRect(-11.4, -5, -7, 2.6, 0.5);
    part(d, win, '#2c3352', { shadow: 0, line: 0.4, hatch: 0 });
    glow(d.pen.ctx, pt(-9.2, -1.2), 4, WASH.charge, 0.35);
    for (const y of [-4, -2.2, -0.4, 1.4]) part(d, roundRect(-10.8, y, -7.6, y + 1, 0.2), WASH.charge, { shadow: 0, line: 0, hatch: 0, alpha: 1 });
    seam(d, [pt(-12.4, 3.8), pt(-6, 3.8)], 0.35);
    edge(d, roundRect(-10.6, 4.6, -7.8, 6.2, 0.4), 0.45);
    sheen(d, [pt(-11.8, -5.6), pt(-7, -5.8)], 0.45);
    part(d, oval(-13, 9.4, 1.2, 1.2, 12), WASH.metal, { shadow: 0.4, line: 0.4, gloss: true, hatch: 0 });
    nozzle(d, NOZZLES[0], 2.4);
    return;
  }
  if (look === 1) {
    const frame = roundRect(-16.2, -7, -5.6, 8.6, 1);
    part(d, frame, WASH.darkMetal, { shadow: 0.5, line: 0.6, alpha: 0.6 });
    for (const x of [-15.4, -11.2]) {
      const tank = capsule(pt(x + 2, -5.2), pt(x + 2, 6.2), 4, 4);
      part(d, tank, WASH.metal, { shadow: 0.6, line: 0.6, gloss: true });
      sheen(d, [pt(x + 0.9, -3.6), pt(x + 0.9, 3)], 0.6);
      seam(d, [pt(x + 0.2, 0.4), pt(x + 3.8, 0.4)], 0.3);
    }
    // Pressure dial and a side fin.
    const dial = oval(-8.6, -3, 1.6, 1.6, 14);
    part(d, dial, '#f1ecdf', { shadow: 0.2, line: 0.5, hatch: 0, gloss: true });
    d.pen.hair([pt(-8.6, -3), pt(-7.8, -3.8)], 0.4, d.ink, 0.9);
    const fin = [pt(-16, 1), pt(-19.4, 6.6), pt(-16, 6)];
    part(d, fin, WASH.contractor, { shadow: 0.4, line: 0.55 });
    rivets(d, [pt(-6.6, -6), pt(-6.6, 7.6)], 0.38);
    nozzle(d, pt(NOZZLES[1].x - 2.2, NOZZLES[1].y), 2);
    nozzle(d, pt(NOZZLES[1].x + 2.2, NOZZLES[1].y), 2);
    return;
  }
  // Deep-space pod: one sealed ceramic shell with vents.
  const pod = [pt(-6, -7), pt(-11, -7.6), pt(-15.6, -4), pt(-16.4, 3), pt(-13.6, 8.6), pt(-6, 8.4)];
  part(d, pod, WASH.gunmetal, { shadow: 0.65, cross: true, line: 0.65 });
  // A white ceramic cap over its top.
  const cap = [pt(-6, -7), pt(-11, -7.6), pt(-14.6, -5), pt(-14.4, -4), pt(-6, -4.2)];
  part(d, cap, WASH.armour, { shadow: 0.45, line: 0.5, gloss: true });
  for (const y of [-3, -1.2, 0.6]) seam(d, [pt(-14.4, y), pt(-10.6, y + 0.2)], 0.4);
  sheen(d, [pt(-14.2, -4.6), pt(-10.4, -6.2)], 0.8);
  const gimbal = oval(NOZZLES[2].x, NOZZLES[2].y - 4, 2.4, 1, 12);
  part(d, gimbal, WASH.darkMetal, { shadow: 0.3, line: 0.5, hatch: 0, gloss: true });
  nozzle(d, NOZZLES[2], 2.8);
}
