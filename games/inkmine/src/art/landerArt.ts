import { capsule, edge, oval, pt, shade, skin, tint, type Draw } from './kit';
import { PAPER_FILL } from './palette';

/**
 * The lander: a tin-can ship on spindly legs, with a porthole, a hatch and
 * a ladder down to the ground. Origin at its feet's middle, drawn up from
 * y = 0 within LANDER_W × LANDER_H units (three tiles across, three high).
 */
export const LANDER_W = 112;
export const LANDER_H = 112;

const HULL = '#d5d9df';
const METAL = '#a9b0bb';

export function drawLander(d: Draw): void {
  // Legs splay out to round foot pads.
  for (const side of [-1, 1]) {
    const leg = capsule(pt(side * 20, -30), pt(side * 42, -2), 3.4, 2.6);
    skin(d, leg, METAL, 0.6);
    edge(d, leg, 1.1);
    const strut = capsule(pt(side * 12, -22), pt(side * 34, -10), 2, 2);
    edge(d, strut, 0.8);
    const pad = oval(side * 43, -1.5, 7, 2.2, 14);
    skin(d, pad, METAL, 0.7);
    edge(d, pad, 1.1);
  }
  // Thruster bell under the hull.
  const bell = [pt(-9, -30), pt(9, -30), pt(13, -17), pt(-13, -17)];
  skin(d, bell, METAL, 0.7);
  shade(d, bell, 0.5, true);
  edge(d, [...bell, bell[0]!], 1.2);
  // The hull: a tin can with a domed top.
  const hull = [
    pt(-28, -30), pt(28, -30), pt(29, -66), pt(24, -80), pt(13, -89), pt(0, -92), pt(-13, -89), pt(-24, -80), pt(-29, -66),
  ];
  skin(d, hull, HULL, 0.5);
  shade(d, hull, 0.42);
  edge(d, hull, 1.8);
  // Seams and rivets.
  for (const y of [-42, -66]) {
    d.pen.hair([pt(-28.5, y), pt(28.5, y)], 0.8, d.ink, 0.75);
    for (let x = -24; x <= 24; x += 6) d.pen.dot(x, y + 2.2, 0.6, d.ink, 0.7);
  }
  // Porthole.
  const port = oval(-8, -56, 7.5, 7.5, 22);
  skin(d, port, '#bcd6e4', 0.6);
  edge(d, port, 1.5);
  edge(d, oval(-8, -56, 9.6, 9.6, 22), 0.9, 0.7);
  d.pen.stroke([pt(-12, -59), pt(-9.5, -61.5), pt(-6.5, -62)], 1.1, PAPER_FILL, 0.9, false);
  // Hatch and its ladder down the right side.
  const hatch = [pt(10, -36), pt(22, -36), pt(22, -58), pt(16, -62), pt(10, -58)];
  tint(d, hatch, d.ink, 0.12);
  edge(d, [...hatch, hatch[0]!], 1.2);
  for (const x of [13, 20]) d.pen.hair([pt(x, -34), pt(x + 2, 0)], 0.9, d.ink, 0.9);
  for (let y = -30; y < 0; y += 6) d.pen.hair([pt(13 + (-y / 34) * 2 - 0.4, y), pt(20 + (-y / 34) * 2 + 0.4, y)], 0.8, d.ink, 0.85);
  // Antenna with a little pennant.
  d.pen.stroke([pt(4, -91), pt(6, -106)], 1, d.ink, 1, false);
  const flag = [pt(6, -106), pt(17, -103), pt(6, -100)];
  skin(d, flag, '#e8d9a8', 0.6);
  edge(d, [...flag, flag[0]!], 0.9);
}
