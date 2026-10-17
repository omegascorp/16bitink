import { lookOf, type Look } from '../../logic/gear';
import { capsule, edge, type Draw } from '../kit';
import { dab, mix, SHADOW } from '../paint';
import type { Pt } from '../pen';
import { hexWindow, lashing, ribs } from './asterMotifs';
import { markOf } from './marks';
import { frost, gem, glowLine, oval, part, pores, pt, rivets, roundRect, seam, sheen } from './parts';

/**
 * The jetpack on the prospector's back, its tank behind the energy cell
 * (cell.ts). Its shape comes in three families, each mark in its planet's
 * materials:
 * 0, a fuel can strapped on, one nozzle. The starter's is a dented ochre
 *    can; Graphite's (Mk 1) smooth carbon-black with silver bands and a
 *    silver joint on a graphite nozzle; Mycel's (Mk 2) a lignite bottle
 *    ribbed like a shell after the Aster's designs, a brass dome, lashed on
 *    with cord, a hexagonal window onto its glow, on an iron joint; Brine's
 *    (Mk 3) teal with a pearl cap and a coiled hose;
 * 1, a framed pack with twin tanks, two nozzles, a pressure dial and a fin;
 * 2, a sealed pod with vents and a gimballed nozzle.
 * NOZZLES gives each family's nozzle mouth, for the flame.
 */
export const NOZZLES: Readonly<Record<Look, Pt>> = { 0: pt(-9.5, 11.2), 1: pt(-10, 11.6), 2: pt(-9.4, 12) };

/** The shoulder strap across the chest (drawn over the torso). */
export function strap(d: Draw, mk: number): void {
  if (lookOf(mk) === 2) return;
  const m = markOf(mk);
  const band = [pt(-7, -3), pt(-6.2, -2.2), pt(2.8, 5), pt(1.8, 5.8)];
  part(d, band, mix(m.trim, SHADOW, 0.15), { shadow: 0.3, line: 0.4, hatch: 0 });
  if (mk === 2) lashing(d, pt(-2.4, 1.2), 1.8, -0.7, 2);
  else rivets(d, [pt(-2.4, 1.2)], 0.35, m.fitting);
}

function nozzle(d: Draw, mouth: Pt, w: number, wash: string): void {
  const n = [pt(mouth.x - w * 0.55, mouth.y - 3.4), pt(mouth.x + w * 0.55, mouth.y - 3.4), pt(mouth.x + w, mouth.y), pt(mouth.x - w, mouth.y)];
  part(d, n, wash, { shadow: 0.55, line: 0.55, gloss: true });
  // Heat-blued and sooty towards the mouth.
  dab(d, [pt(mouth.x - w * 0.8, mouth.y - 1.4), pt(mouth.x + w * 0.8, mouth.y - 1.4), pt(mouth.x + w, mouth.y), pt(mouth.x - w, mouth.y)], '#2b2440', 0.45, 0.4);
  edge(d, oval(mouth.x, mouth.y, w, 0.5, 12), 0.45, 0.9);
}

/** The work can (Mk 0–3). */
function can(d: Draw, mk: number): void {
  const m = markOf(mk);
  if (mk === 2) {
    // A lignite bottle, ribbed across like a shell, a brass dome on top, lashed to the back.
    const bottle = capsule(pt(-12.9, -4.6), pt(-12.9, 7.4), 5.4, 5.4);
    part(d, bottle, m.trim, { shadow: 0.6, line: 0.6, gloss: true });
    d.pen.clipped(bottle, () => {
      for (let y = -3.6; y < 8; y += 1.4) {
        d.pen.hair([pt(-15.8, y + 0.5), pt(-12.9, y - 0.2), pt(-10, y + 0.5)], 0.35, mix(m.trim, '#ffffff', 0.3), 0.8);
      }
    });
    const dome = oval(-12.9, -5.2, 2.4, 1.8, 14);
    part(d, dome, m.fitting, { shadow: 0.45, line: 0.5, gloss: true });
    ribs(d, dome, pt(-12.9, -3.6), m.fitting, 5, Math.PI * 0.7, -Math.PI / 2, 4);
    hexWindow(d, pt(-14.2, 2.4), 1);
    lashing(d, pt(-12.9, 5.6), 5, 0, 2);
    sheen(d, [pt(-14.8, -3), pt(-14.8, 1)], 0.5);
    return;
  }
  const body = roundRect(-15.4, -5.4, -10.4, 7.6, 1.6);
  part(d, body, m.shell, { shadow: 0.6, line: 0.6, gloss: mk > 0 });
  if (mk === 0) {
    // Ochre paint, dented and chipped, a wire handle.
    d.pen.stroke([pt(-14.6, -5.8), pt(-13.4, -7.4), pt(-12, -6)], 0.7, d.ink, 0.9, false);
    d.pen.hair([pt(-15.2, 1.6), pt(-13.4, 2.6), pt(-12.4, 2)], 0.35, mix(m.shell, SHADOW, 0.6), 0.85);
    for (const [x, y] of [[-14.4, -2.4], [-12, 5.4]] as const) d.pen.dot(x, y, 0.45, m.fitting, 0.9);
  } else if (mk === 1) {
    // Smooth carbon with silver bands, a silver handle.
    d.pen.stroke([pt(-14.6, -5.8), pt(-13.4, -7.4), pt(-12, -6)], 0.9, d.ink, 0.9, false);
    d.pen.stroke([pt(-14.6, -5.8), pt(-13.4, -7.4), pt(-12, -6)], 0.45, m.accent, 1, false);
    for (const y of [-3.6, 5.2]) part(d, roundRect(-15.5, y, -10.3, y + 1.1, 0.3), m.accent, { shadow: 0.3, line: 0.35, gloss: true, hatch: 0 });
  } else {
    // A pearl cap, and a hose coiled round the can.
    part(d, oval(-12.9, -5.6, 2.2, 1.2, 12), m.fitting, { shadow: 0.3, line: 0.45, gloss: true, hatch: 0 });
    for (const y of [0, 1.6, 3.2]) d.pen.stroke(oval(-12.9, y, 3, 0.6, 12).slice(0, 7), 0.6, m.trim, 1, false);
  }
  sheen(d, [pt(-14.6, -3.6), pt(-14.6, 3)], 0.5);
  if (mk === 0) part(d, oval(-13, 9.4, 1.2, 1.2, 12), m.fitting, { shadow: 0.4, line: 0.4, gloss: true, hatch: 0 });
}

/** The tanks or pod, behind the cell. */
export function jetpack(d: Draw, mk: number): void {
  const look = lookOf(mk);
  const m = markOf(mk);
  if (look === 0) {
    can(d, mk);
    return;
  }
  if (look === 1) {
    const frame = roundRect(-16.2, -7, -5.6, 8.6, 1);
    part(d, frame, m.trim, { shadow: 0.5, line: 0.6, alpha: 0.6 });
    for (const x of [-15.4, -11.2]) {
      const tank = capsule(pt(x + 2, -5.2), pt(x + 2, 6.2), 4, 4);
      part(d, tank, m.shell, { shadow: 0.6, line: 0.6, gloss: true });
      if (mk === 7) pores(d, tank, m.shell, 10);
      sheen(d, [pt(x + 0.9, -3.6), pt(x + 0.9, 3)], 0.6);
      if (mk === 6) glowLine(d, [pt(x + 0.2, 0.4), pt(x + 3.8, 0.4)], m.accent, 0.35);
      else seam(d, [pt(x + 0.2, 0.4), pt(x + 3.8, 0.4)], 0.3);
      if (mk === 7) part(d, roundRect(x, 2.2, x + 4, 3.2, 0.3), m.accent, { shadow: 0.2, line: 0.3, hatch: 0 });
    }
    // Pressure dial (a crystal on Prism's) and a side fin.
    if (mk === 5) gem(d, pt(-8.6, -3), 1.6, m.accent);
    else {
      part(d, oval(-8.6, -3, 1.6, 1.6, 14), '#f1ecdf', { shadow: 0.2, line: 0.5, hatch: 0, gloss: true });
      d.pen.hair([pt(-8.6, -3), pt(-7.8, -3.8)], 0.4, d.ink, 0.9);
    }
    const fin = [pt(-16, 1), pt(-19.4, 6.6), pt(-16, 6)];
    part(d, fin, mk === 4 ? m.accent : m.cloth, { shadow: 0.4, line: 0.55 });
    rivets(d, [pt(-6.6, -6), pt(-6.6, 7.6)], 0.38, m.fitting);
    return;
  }
  // Deep-space pod: one sealed shell with vents.
  const pod = [pt(-6, -7), pt(-11, -7.6), pt(-15.6, -4), pt(-16.4, 3), pt(-13.6, 8.6), pt(-6, 8.4)];
  part(d, pod, mix(m.shell, SHADOW, 0.35), { shadow: 0.65, cross: true, line: 0.65 });
  const cap = [pt(-6, -7), pt(-11, -7.6), pt(-14.6, -5), pt(-14.4, -4), pt(-6, -4.2)];
  part(d, cap, m.shell, { shadow: 0.45, line: 0.5, gloss: true });
  for (const y of [-3, -1.2, 0.6]) {
    if (mk === 9) glowLine(d, [pt(-14.4, y), pt(-10.6, y + 0.2)], m.accent, 0.35);
    else seam(d, [pt(-14.4, y), pt(-10.6, y + 0.2)], 0.4);
  }
  sheen(d, [pt(-14.2, -4.6), pt(-10.4, -6.2)], 0.8);
  if (mk === 8) frost(d, [pt(-13.6, -5.2), pt(-12, -6.4), pt(-10.4, -6.8), pt(-8.6, -6.8), pt(-7, -6.6)]);
  if (mk === 10) gem(d, pt(-12.6, 4.4), 1.4, m.accent);
}

/** The nozzles under the tank, drawn after the cell so they show below it. */
export function nozzles(d: Draw, mk: number): void {
  const look = lookOf(mk);
  const m = markOf(mk);
  if (look === 0) {
    nozzle(d, NOZZLES[0], 2.4, m.nozzle);
    // A joint ring at the throat: silver on Graphite's, iron on Mycel's.
    if (mk === 1 || mk === 2) part(d, roundRect(NOZZLES[0].x - 1.8, NOZZLES[0].y - 4.4, NOZZLES[0].x + 1.8, NOZZLES[0].y - 3.2, 0.4), mk === 1 ? m.accent : '#8a8580', { shadow: 0.3, line: 0.4, gloss: true, hatch: 0 });
    return;
  }
  if (look === 1) {
    nozzle(d, pt(NOZZLES[1].x - 2.2, NOZZLES[1].y), 2, m.nozzle);
    nozzle(d, pt(NOZZLES[1].x + 2.2, NOZZLES[1].y), 2, m.nozzle);
    return;
  }
  const gimbal = oval(NOZZLES[2].x, NOZZLES[2].y - 4, 2.4, 1, 12);
  part(d, gimbal, m.fitting, { shadow: 0.3, line: 0.5, hatch: 0, gloss: true });
  nozzle(d, NOZZLES[2], 2.8, m.nozzle);
}
