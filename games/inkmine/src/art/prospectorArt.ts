import { capsule, edge, oval, pt, shade, skin, type Draw } from './kit';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';

/**
 * The prospector: a small figure in a round-helmeted suit, a jetpack with
 * the drill's energy cell on their back and a chunky drill in hand, inked in blue like every
 * "you" in the catalog. Drawn facing right in a frame of PROSPECTOR_FRAME
 * units with the feet on y = PROSPECTOR_GROUND; `d.f` (0..2) is both the
 * line-boil frame and the walk step.
 */
export const PROSPECTOR_FRAME = 64;
export const PROSPECTOR_GROUND = 14;

export type Pose = 'idle' | 'walk' | 'drillSide' | 'drillDown' | 'drillUp' | 'climb';
export const POSES: readonly Pose[] = ['idle', 'walk', 'drillSide', 'drillDown', 'drillUp', 'climb'];

const SUIT = '#dfe3ea';
const GLASS = '#cfe2ee';
const CELL = '#c4ccd8';
const METAL = '#a9b0bb';

/** The drill from its grip at `hand`, pointing along `angle`; `spin` (0..2) turns the bit's grooves. */
function drill(d: Draw, hand: Pt, angle: number, spin: number): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(angle);
  const body = [pt(-2, -3.8), pt(9, -3.8), pt(10, -2.6), pt(10, 2.6), pt(9, 3.8), pt(-2, 3.8), pt(-3.2, 0)];
  skin(d, body, METAL, 0.55);
  shade(d, body, 0.45);
  edge(d, body, 1.1);
  // Vents along the housing.
  for (const x of [1.5, 4, 6.5]) d.pen.hair([pt(x, -2.4), pt(x, 2.4)], 0.5, d.ink, 0.6);
  const cone = [pt(10, -3.4), pt(18.5, 0), pt(10, 3.4)];
  skin(d, cone, METAL, 0.75);
  edge(d, [...cone, cone[0]!], 1);
  for (let k = 0; k < 4; k++) {
    const x = 10.6 + ((k * 2.1 + spin * 0.7) % 8);
    const half = 3.4 * (1 - (x - 10) / 8.5);
    d.pen.hair([pt(x, -half), pt(x + 1.6, half)], 0.55, d.ink, 0.75);
  }
  ctx.restore();
}

function legs(d: Draw, pose: Pose): void {
  const step = pose === 'walk' ? [-2.6, 0, 2.6][d.f]! : 0;
  const g = d.g;
  const pairs: readonly [Pt, Pt][] = pose === 'climb'
    ? [[pt(-3, 7), pt(-4, g - 3)], [pt(2.5, 7), pt(3.5, g - 1)]]
    : [[pt(-3, 7), pt(-3 - step, g - 1.5)], [pt(2.5, 7), pt(2.5 + step, g - 1.5)]];
  for (const [hip, foot] of pairs) {
    const leg = capsule(hip, foot, 4.6, 4);
    skin(d, leg, SUIT, 0.5);
    edge(d, leg, 1);
    const boot = oval(foot.x + 1, foot.y + 0.3, 3.3, 1.9, 12);
    skin(d, boot, METAL, 0.6);
    edge(d, boot, 1.1);
  }
}

/** Where the jetpack's nozzle sits, for the flame (drawing units, facing right). */
export const NOZZLE = pt(-9, 10.5);

function cell(d: Draw): void {
  // The jetpack's nozzle under the pack.
  const nozzle = [pt(-11, 7), pt(-7, 7), pt(-6.2, 10.5), pt(-11.8, 10.5)];
  skin(d, nozzle, METAL, 0.75);
  edge(d, nozzle, 1);
  const pack = [pt(-12.5, -5.5), pt(-6, -6), pt(-5.5, 7), pt(-12, 7.5)];
  skin(d, pack, CELL, 0.6);
  shade(d, pack, 0.4);
  edge(d, pack, 1.1);
  // The charge gauge on the cell.
  for (const y of [-3, -0.5, 2, 4.5]) d.pen.hair([pt(-11, y), pt(-7.5, y)], 0.7, d.ink, 0.7);
}

function torso(d: Draw): void {
  const body = [pt(-7, -3), pt(5.5, -3.5), pt(7, 2), pt(6, 9), pt(-6.5, 9.5), pt(-7.8, 3)];
  skin(d, body, SUIT, 0.45);
  shade(d, body, 0.4);
  edge(d, body, 1.3);
  d.pen.hair([pt(-7, 5.5), pt(6.5, 5)], 0.7, d.ink, 0.7);
  const patch = oval(1.5, 1, 1.8, 1.6, 10);
  edge(d, patch, 0.7);
}

function helmet(d: Draw, facing: 'side' | 'up' | 'down'): void {
  const cy = -9;
  const glass = oval(0.5, cy, 8.6, 8.2, 26);
  skin(d, glass, GLASS, 0.5);
  shade(d, glass, 0.32);
  // The face inside the glass, looking where the drill points.
  const look = facing === 'up' ? pt(3, -2.2) : facing === 'down' ? pt(3, 1.6) : pt(3.4, 0);
  d.pen.dot(1.6 + look.x, cy + look.y, 1.05, d.ink);
  d.pen.dot(4.6 + look.x, cy + look.y, 1.05, d.ink);
  d.pen.hair([pt(2.4 + look.x, cy + 2.6 + look.y), pt(4.2 + look.x, cy + 2.4 + look.y)], 0.6, d.ink, 0.7);
  edge(d, glass, 1.4);
  d.pen.stroke([pt(-4.5, cy - 5), pt(-1.5, cy - 6.8), pt(1.5, cy - 7.2)], 1.3, PAPER_FILL, 0.9, false);
  const collar = [pt(-6, -2.2), pt(6.5, -2.6), pt(6.8, -0.6), pt(-6.2, -0.2)];
  skin(d, collar, METAL, 0.55);
  edge(d, collar, 1);
  // Antenna nub.
  d.pen.hair([pt(-3, cy - 8), pt(-4.5, cy - 12)], 0.8, d.ink, 0.9);
  d.pen.dot(-4.6, cy - 12.4, 1.1, d.ink);
}

function arm(d: Draw, shoulder: Pt, hand: Pt): void {
  const a = capsule(shoulder, hand, 4, 3.6);
  skin(d, a, SUIT, 0.45);
  edge(d, a, 1);
  const glove = oval(hand.x, hand.y, 2.3, 2.1, 10);
  skin(d, glove, METAL, 0.6);
  edge(d, glove, 0.9);
}

/** The cable from the cell to the drill. */
function hose(d: Draw, to: Pt): void {
  d.pen.stroke([pt(-8, 6.5), pt(-4, 11), pt(to.x - 4, to.y + 4), to], 1, d.ink, 0.8, false);
}

export function drawProspector(d: Draw, pose: Pose): void {
  const spin = d.f;
  if (pose === 'climb') {
    cell(d);
    legs(d, pose);
    torso(d);
    arm(d, pt(-4, -1), pt(-5, -15 + (d.f === 1 ? 1.5 : 0)));
    arm(d, pt(4, -1), pt(6, -13 - (d.f === 1 ? 1.5 : 0)));
    helmet(d, 'up');
    return;
  }
  cell(d);
  legs(d, pose);
  torso(d);
  const hand = pose === 'drillDown' ? pt(6.5, 6) : pose === 'drillUp' ? pt(7, -2) : pose === 'drillSide' ? pt(8.5, 1.5) : pt(7.5, 4);
  hose(d, pt(hand.x - 3, hand.y + 1));
  helmet(d, pose === 'drillUp' ? 'up' : pose === 'drillDown' ? 'down' : 'side');
  arm(d, pt(2, 0), hand);
  const angle = pose === 'drillDown' ? Math.PI / 2 : pose === 'drillUp' ? -Math.PI / 2 : pose === 'drillSide' ? 0 : 0.35;
  drill(d, hand, angle, pose.startsWith('drill') ? spin : 0);
}
