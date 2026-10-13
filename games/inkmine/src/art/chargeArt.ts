import { edge, oval, pt, shade, skin, tint, type Draw } from './kit';
import { PAPER_FILL, RED } from './palette';
import type { Pt } from './pen';

/**
 * An earlier crew's unfired charges, drawn sitting in the rock: a steel
 * canister in a drilled bore hole, its detonator cap and lamp, and the
 * lead wire running off along the seam; a line charge is detonating cord
 * clipped along the seam with cartridges on it. Blue ink, with the parts
 * that can hurt you (hazard bands, the lamp) in red. Drawn in a frame of
 * CHARGE_FRAME × CHARGE_FRAME units (a little over a tile), origin at its
 * centre; a line charge's cord runs on past the frame's tile into the rock
 * either side.
 */
export const CHARGE_FRAME = 36;
/** A line charge's frame is wider: its cord runs a tile and a half each way. */
export const LINE_FRAME_W = 112;

const STEEL = '#b9c0c8';
const BORE = '#5d5a60';
const CORD = '#d8b25c';

/** The bore hole: a dark channel drilled into the rock, a little wider than the canister. */
function bore(d: Draw, x0: number, x1: number, h: number): void {
  const hole = [pt(x0, -h), pt(x1, -h), pt(x1 + 2, 0), pt(x1, h), pt(x0, h), pt(x0 - 2, 0)];
  tint(d, hole, BORE, 0.75);
  d.pen.hatch(hole, 1.6, 0.6, 0.45, { color: d.ink, alpha: 0.6 });
  edge(d, hole, 1.1, 0.9);
}

/** The detonator: a cap at the canister's end, with a lamp (lit red when armed). */
function detonator(d: Draw, at: Pt, lit: boolean): void {
  const cap = [pt(at.x, at.y - 4), pt(at.x + 5, at.y - 3.4), pt(at.x + 5, at.y + 3.4), pt(at.x, at.y + 4)];
  skin(d, cap, '#8f969e', 0.7);
  edge(d, cap, 1);
  const lamp = oval(at.x + 2.5, at.y - 6.5, 2, 2, 12);
  skin(d, lamp, lit ? RED : '#e6c6c2', lit ? 0.85 : 0.5);
  edge(d, lamp, 0.8);
  d.pen.hair([pt(at.x + 2.5, at.y - 4.5), pt(at.x + 2.5, at.y - 4)], 0.7, d.ink, 0.9);
  if (lit) {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + d.f * 0.5;
      d.pen.hair([pt(at.x + 2.5 + Math.cos(a) * 3, at.y - 6.5 + Math.sin(a) * 3), pt(at.x + 2.5 + Math.cos(a) * 5.5, at.y - 6.5 + Math.sin(a) * 5.5)], 0.6, RED, 0.9);
    }
  }
}

/** An old charge: canister in its bore, bands, stencil, detonator and lead wire. */
export function drawCharge(d: Draw, lit: boolean): void {
  bore(d, -15, 10, 6.5);
  const can = [pt(-12.5, -4.6), pt(5, -4.6), pt(6, -3.6), pt(6, 3.6), pt(5, 4.6), pt(-12.5, 4.6), pt(-13.5, 0)];
  skin(d, can, STEEL, 0.6);
  shade(d, can, 0.4);
  edge(d, can, 1.2);
  // Hazard bands in red, a stencilled lot number in ink, and a rust stain from years in the damp.
  for (const x of [-9.5, 1.5]) {
    const band = [pt(x, -4.6), pt(x + 2.4, -4.6), pt(x + 2.4, 4.6), pt(x, 4.6)];
    tint(d, band, RED, 0.55);
    edge(d, band, 0.6, 0.8);
  }
  for (const x of [-5.8, -4.3, -2.8, -1.3]) d.pen.hair([pt(x, -1.6), pt(x + 0.3, 1.6)], 0.55, d.ink, 0.75);
  tint(d, oval(-7, 2.6, 3.4, 1.3, 12), '#a8683f', 0.35);
  d.pen.stroke([pt(-11, -2.8), pt(4, -3)], 0.9, PAPER_FILL, 0.8, false);
  detonator(d, pt(6, 0), lit);
  // Lead wire out of the hole and off along the seam.
  d.pen.stroke([pt(11, 1), pt(13.5, 3.5), pt(16, 3), pt(18, 5.5)], 0.9, d.ink, 0.85, false);
}

/** A line charge: detonating cord along the seam with cartridges taped on, a detonator at its middle. */
export function drawLineCharge(d: Draw, lit: boolean): void {
  const half = LINE_FRAME_W / 2 - 4;
  bore(d, -half, half, 3.6);
  const cord: Pt[] = [];
  for (let x = -half; x <= half; x += 4) cord.push(pt(x, Math.sin(x * 0.21) * 0.9));
  d.pen.stroke(cord, 2.4, d.ink, 0.9, false);
  d.pen.stroke(cord, 1.3, CORD, 1, false);
  for (let x = -half + 10; x < half - 6; x += 16) {
    if (Math.abs(x) < 6) continue;
    const cart = [pt(x - 3.2, -3), pt(x + 3.2, -3), pt(x + 3.2, 3), pt(x - 3.2, 3)];
    skin(d, cart, STEEL, 0.55);
    edge(d, cart, 0.9);
    d.pen.hair([pt(x - 3.2, 0), pt(x + 3.2, 0)], 0.6, RED, 0.8);
  }
  detonator(d, pt(-2.5, 0), lit);
}
