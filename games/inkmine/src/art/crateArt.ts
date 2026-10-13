import type { CrateKey } from '../logic/crates';
import { edge, oval, pt, shade, skin, type Draw } from './kit';
import { RED } from './palette';
import type { Pt } from './pen';

/**
 * Crates: plank boxes wedged in the rock, inked blue with what's inside
 * stencilled on in red (it can hurt you). Drawn in a CRATE_FRAME-unit
 * square, origin at its centre, filling a 32 px tile.
 */
export const CRATE_FRAME = 36;

const WOOD = '#d9b77f';

function box(d: Draw): void {
  const s = 14.5;
  const face = [pt(-s, -s), pt(s, -s), pt(s, s), pt(-s, s)];
  skin(d, face, WOOD, 0.55);
  shade(d, face, 0.3);
  // Planks and a cross brace.
  for (const y of [-s / 3, s / 3]) d.pen.hair([pt(-s, y), pt(s, y)], 0.7, d.ink, 0.6);
  d.pen.stroke([pt(-s + 2, s - 2), pt(s - 2, -s + 2)], 1.2, d.ink, 0.45, false);
  for (const [x, y] of [[-s + 2.5, -s + 2.5], [s - 2.5, -s + 2.5], [-s + 2.5, s - 2.5], [s - 2.5, s - 2.5]] as const) d.pen.dot(x, y, 0.8, d.ink, 0.8);
  edge(d, face, 1.6);
}

function bomb(d: Draw, lit: boolean): void {
  const ball = oval(-1, 2, 6.5, 6.5, 18);
  skin(d, ball, '#e7b8b2', 0.5);
  edge(d, ball, 1.3, 1);
  d.pen.stroke([pt(3, -3.5), pt(5.5, -7), pt(8.5, -8)], 1.1, RED, 1, false);
  spark(d, pt(9, -8.5), lit);
}

function dynamite(d: Draw, lit: boolean): void {
  for (const x of [-6, 0, 6]) {
    const stick = [pt(x - 2.5, -6), pt(x + 2.5, -6), pt(x + 2.5, 9), pt(x - 2.5, 9)];
    skin(d, stick, '#e7b8b2', 0.55);
    edge(d, stick, 1.1, 1);
  }
  d.pen.hair([pt(-9, 4), pt(9, 4)], 1, RED, 0.9);
  d.pen.stroke([pt(0, -6), pt(2, -9.5), pt(5, -10.5)], 1.1, RED, 1, false);
  spark(d, pt(5.5, -11), lit);
}

/** The fuse's spark: a red star once it's lit. */
function spark(d: Draw, at: Pt, lit: boolean): void {
  if (!lit) return;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + d.f * 0.4;
    d.pen.hair([pt(at.x + Math.cos(a) * 1.2, at.y + Math.sin(a) * 1.2), pt(at.x + Math.cos(a) * 4, at.y + Math.sin(a) * 4)], 0.8, RED, 1);
  }
}

export function drawCrate(d: Draw, kind: CrateKey, lit: boolean): void {
  box(d);
  // The stencil goes on in red: what's inside can hurt you.
  const red = { ...d, ink: RED };
  if (kind === 'bomb') bomb(red, lit);
  else dynamite(red, lit);
}
