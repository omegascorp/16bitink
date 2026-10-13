import type { Look } from '../../logic/gear';
import { capsule, edge, type Draw } from '../kit';
import type { Pt } from '../pen';
import { oval, part, pt, rivets, roundRect, sheen, WASH } from './parts';

/**
 * The pack on the prospector's back, carrying the drill's energy cell and
 * the jetpack's fuel, in three looks:
 * 0, a battery cell and a dented fuel can strapped together, one nozzle;
 * 1, a framed pack with twin tanks, two nozzles, a pressure dial and fins;
 * 2, a sealed pod with vents and a gimballed nozzle.
 * NOZZLES gives each look's nozzle mouth, for the flame.
 */
export const NOZZLES: Readonly<Record<Look, Pt>> = { 0: pt(-9.5, 11.2), 1: pt(-10, 11.6), 2: pt(-9.4, 12) };

/** The shoulder strap across the chest (drawn over the torso). */
export function strap(d: Draw, look: Look): void {
  if (look === 2) return;
  d.pen.stroke([pt(-6.8, -2.6), pt(-2, 1), pt(2.4, 5.2)], 1.4, d.ink, 0.8, false);
  d.pen.stroke([pt(-6.6, -2.2), pt(-2, 1.4), pt(2.2, 5.5)], 0.6, '#9c8d70', 0.9, false);
}

function nozzle(d: Draw, mouth: Pt, w: number): void {
  const n = [pt(mouth.x - w * 0.55, mouth.y - 3.4), pt(mouth.x + w * 0.55, mouth.y - 3.4), pt(mouth.x + w, mouth.y), pt(mouth.x - w, mouth.y)];
  part(d, n, WASH.darkMetal, { shadow: 0.4, line: 0.9, alpha: 0.6 });
}

export function jetpack(d: Draw, look: Look): void {
  if (look === 0) {
    // The fuel can, strapped behind the cell.
    const can = roundRect(-15.4, -5.4, -10.4, 7.6, 1.6);
    part(d, can, WASH.can, { shadow: 0.45, line: 1 });
    d.pen.stroke([pt(-14.6, -5.8), pt(-13.4, -7.4), pt(-12, -6)], 0.9, d.ink, 0.9, false);
    d.pen.hair([pt(-15.2, 1.6), pt(-12.8, 2.4)], 0.5, d.ink, 0.6);
    const cell = roundRect(-12.6, -6.4, -5.8, 8, 1.2);
    part(d, cell, WASH.cell, { shadow: 0.4, line: 1.1 });
    // Charge gauge, a strap buckle and a valve wheel.
    for (const y of [-4, -2, 0, 2]) d.pen.hair([pt(-11.2, y), pt(-7.4, y)], 0.7, d.ink, 0.75);
    edge(d, roundRect(-10.6, 4.2, -7.8, 5.8, 0.4), 0.6);
    edge(d, oval(-13, 9.4, 1.2, 1.2, 10), 0.6);
    nozzle(d, NOZZLES[0], 2.4);
    return;
  }
  if (look === 1) {
    const frame = roundRect(-16.2, -7, -5.6, 8.6, 1);
    part(d, frame, WASH.darkMetal, { shadow: 0, line: 0.9, alpha: 0.35 });
    for (const x of [-15.4, -11.2]) {
      const tank = capsule(pt(x + 2, -5.2), pt(x + 2, 6.2), 4, 4);
      part(d, tank, WASH.metal, { shadow: 0.45, line: 1 });
      sheen(d, [pt(x + 0.8, -3.6), pt(x + 0.8, 3)], 0.7);
    }
    // Pressure dial and a side fin.
    const dial = oval(-8.6, -3, 1.6, 1.6, 12);
    part(d, dial, '#efeadb', { shadow: 0, line: 0.7 });
    d.pen.hair([pt(-8.6, -3), pt(-7.8, -3.8)], 0.5, d.ink, 0.9);
    const fin = [pt(-16, 1), pt(-19.4, 6.6), pt(-16, 6)];
    part(d, fin, WASH.contractor, { shadow: 0, line: 0.9 });
    rivets(d, [pt(-6.6, -6), pt(-6.6, 7.6)], 0.4);
    nozzle(d, pt(NOZZLES[1].x - 2.2, NOZZLES[1].y), 2);
    nozzle(d, pt(NOZZLES[1].x + 2.2, NOZZLES[1].y), 2);
    return;
  }
  // Deep-space pod.
  const pod = [pt(-6, -7), pt(-11, -7.6), pt(-15.6, -4), pt(-16.4, 3), pt(-13.6, 8.6), pt(-6, 8.4)];
  part(d, pod, WASH.armour, { shadow: 0.45, cross: true, line: 1.2 });
  for (const y of [-3, -1.2, 0.6]) d.pen.hair([pt(-14.4, y), pt(-10.6, y + 0.2)], 0.55, d.ink, 0.75);
  sheen(d, [pt(-14.2, -4.6), pt(-10.4, -6.2)], 0.8);
  const gimbal = oval(NOZZLES[2].x, NOZZLES[2].y - 4, 2.4, 1, 12);
  edge(d, gimbal, 0.8);
  nozzle(d, NOZZLES[2], 2.8);
}
