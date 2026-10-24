import { closed, oval, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { mix } from '../wash';
import { chain, limb } from './beastFur';
import { dab, gleam, paint, SHADOW } from './beastPaint';

/**
 * The ogre's head and club. The head is small for the bulk under it, set
 * low and forward: a heavy brow over little deep eyes, a broad flat nose,
 * an underbite with two tusks jutting up past the lip, a small ear and a
 * topknot of dark hair bound with a cord. The club is a knotted log with
 * two iron bands and studs round its head.
 */
export const OGRE = {
  skin: '#ae9b60',
  skinLit: '#d2c08e',
  skinDeep: '#6f6a3c',
  hide: '#8c6a45',
  hideSpot: '#5b4029',
  hideLight: '#c4a57a',
  belt: '#5a3d27',
  bronze: '#b98a3e',
  wood: '#8b6239',
  woodDeep: '#5a3c22',
  iron: '#62676b',
  tusk: '#efe4c4',
  hair: '#3b2d24',
  eye: '#2a2222',
  wrap: '#8e7556',
} as const;

const HEAD: Pt[] = chain(
  pt(6.4, -78),
  [pt(5.2, -84.6), pt(9, -90.4), pt(15.6, -90.6)],
  [pt(21, -90.6), pt(24.6, -87.4), pt(25.4, -84)],
  [pt(27.2, -83.2), pt(27.4, -81.4), pt(26.6, -80.6)],
  [pt(28.6, -79.6), pt(29.6, -77), pt(28, -75.6)],
  [pt(27.6, -74.8), pt(27, -74.2), pt(26.4, -74.2)],
  [pt(28.8, -73.6), pt(30, -71), pt(28.8, -68.6)],
  [pt(27.6, -66.4), pt(22, -65.4), pt(16.6, -66.6)],
  [pt(12, -67.6), pt(7.4, -71.4), pt(6.4, -78)],
);

/** A tusk from the lower jaw up past the lip: ivory, curved back, a glint down it. */
function tusk(d: Draw, x: number, y: number, h: number, far: boolean): void {
  const t = chain(pt(x - 1.1, y), [pt(x - 1.2, y - h * 0.5), pt(x - 0.6, y - h * 0.9), pt(x - 1.4, y - h)], [pt(x + 0.4, y - h * 0.8), pt(x + 1.3, y - h * 0.4), pt(x + 1.2, y)]);
  paint(d, t, far ? mix(OGRE.tusk, SHADOW, 0.25) : OGRE.tusk, { gloss: true, shadow: 0.5, hatch: 0, line: 0.45 });
  if (!far) gleam(d, [pt(x - 0.6, y - 0.6), pt(x - 0.5, y - h * 0.65)], 0.35, 0.85);
}

/** The head, facing right. */
export function ogreHead(d: Draw): void {
  // The topknot behind, bound with a cord.
  const knot = chain(pt(6, -86), [pt(2.4, -90), pt(2.4, -95.4), pt(6.6, -96.6)], [pt(10.4, -97.4), pt(11.6, -93), pt(10, -88.6)]);
  paint(d, knot, OGRE.hair, { shadow: 0.5, hatch: 0.2, line: 0.55 });
  for (let k = 0; k < 6; k++) d.pen.hair([pt(4.4 + k * 0.9, -88.6), pt(4.2 + k * 0.7, -95 + Math.abs(k - 2.5) * 0.5)], 0.3, PAPER_FILL, 0.35);
  d.pen.stroke([pt(4.6, -89.4), pt(10.6, -90.2)], 1.1, OGRE.bronze, 1, false);
  tusk(d, 23.8, -72.6, 6, true);
  paint(d, HEAD, OGRE.skin, { shadow: 0.6, hatch: 0.24, cross: true, line: 0 });
  d.pen.clipped(HEAD, () => {
    dab(d, oval(14, -86, 6, 3.4, 14), OGRE.skinLit, 0.5, 1.4);
    // Deep sockets under the brow, a ruddy nose, the shadow under the jaw.
    dab(d, oval(21.2, -80.4, 3.6, 2, 14), OGRE.skinDeep, 0.7, 0.9);
    dab(d, oval(27, -77.4, 2.6, 2.2, 12), '#b0715a', 0.45, 1);
    dab(d, oval(21, -75.6, 3, 2, 12), '#b0715a', 0.3, 1.2);
    dab(d, [pt(8, -70), pt(28, -68.6), pt(28, -64), pt(8, -64)], SHADOW, 0.3, 1.2);
  });
  d.pen.stroke(closed(HEAD), 0.8, d.ink, 0.95);
  // Brow ridge, frown creases, the eye, nostril and mouth.
  d.pen.stroke([pt(17, -83.6), pt(21.4, -83.2), pt(25.6, -82)], 1, d.ink, 0.9, false);
  for (const y of [-86.2, -87.6]) d.pen.hair([pt(18.6, y), pt(22, y + 0.3), pt(24.2, y + 1)], 0.35, d.ink, 0.6);
  d.pen.fill(oval(21.4, -80.5, 1.25, 0.8, 12), OGRE.eye, 1);
  d.pen.dot(21.8, -80.9, 0.32, PAPER_FILL, 0.95);
  d.pen.hair([pt(27.2, -76.4), pt(26.4, -75.6), pt(25.2, -75.8)], 0.5, d.ink, 0.9);
  d.pen.hair([pt(24.6, -78.6), pt(26.2, -76.4)], 0.35, d.ink, 0.6);
  d.pen.stroke([pt(18.6, -72.4), pt(22.4, -73.2), pt(26.4, -73.8)], 0.6, d.ink, 0.95, false);
  d.pen.hair([pt(19.4, -76.8), pt(20.6, -74.4), pt(19.8, -72.4)], 0.4, d.ink, 0.55);
  tusk(d, 26.4, -72.8, 6.6, false);
  // A small ear, a little pointed.
  const ear = chain(pt(9.6, -82), [pt(6, -84.6), pt(4.6, -80), pt(6.6, -76.6)], [pt(8.4, -75.4), pt(10.4, -77), pt(10.2, -79)]);
  paint(d, ear, mix(OGRE.skin, '#b0715a', 0.15), { shadow: 0.6, hatch: 0, line: 0.55 });
  d.pen.hair([pt(8.4, -81.6), pt(7, -80), pt(8, -77.6)], 0.35, d.ink, 0.7);
}

/** The club's axis, grip end to head end. */
export const CLUB = { grip: pt(21, -56), head: pt(-30, -94) } as const;

const along = (t: number, side: number): Pt => {
  const dx = CLUB.head.x - CLUB.grip.x;
  const dy = CLUB.head.y - CLUB.grip.y;
  const l = Math.hypot(dx, dy);
  return pt(CLUB.grip.x + dx * t + (-dy / l) * side, CLUB.grip.y + dy * t + (dx / l) * side);
};

/** The club: a log thickening to a knotted head, grain down it, two iron bands with rivets and studs. */
export function ogreClub(d: Draw): void {
  const shape = limb([CLUB.grip, along(0.45, 0), along(0.8, 0), CLUB.head], [4.6, 6.4, 12, 14]);
  paint(d, shape, OGRE.wood, { shadow: 0.7, hatch: 0.28, cross: true, line: 0 });
  d.pen.clipped(shape, () => {
    for (const s of [-1.6, 0.6, 2.4, -3.6, 4.2]) d.pen.hair([along(0.05, s * 0.4), along(0.5, s * 0.8), along(1.02, s * 1.4)], 0.35, OGRE.woodDeep, 0.7);
    dab(d, oval(along(0.62, 1).x, along(0.62, 1).y, 1.6, 1.1, 10), OGRE.woodDeep, 0.8, 0.3);
    d.pen.hair(closed(oval(along(0.62, 1).x, along(0.62, 1).y, 1.8, 1.3, 10)), 0.35, d.ink, 0.7);
    gleam(d, [along(0.1, -1.6), along(0.55, -2.6), along(0.85, -5)], 0.5, 0.35);
  });
  d.pen.stroke(closed(shape), 0.8, d.ink, 0.95);
  for (const [t, w] of [[0.7, 11.4], [0.9, 14.6]] as const) {
    const band = [along(t - 0.025, -w / 2 - 0.4), along(t - 0.025, w / 2 + 0.4), along(t + 0.025, w / 2 + 0.4), along(t + 0.025, -w / 2 - 0.4)];
    paint(d, band, OGRE.iron, { gloss: true, shadow: 0.6, hatch: 0, line: 0.55 });
    for (const s of [-0.3, 0.05, 0.38]) {
      const r = along(t, s * w);
      d.pen.dot(r.x, r.y, 0.45, mix(OGRE.iron, PAPER_FILL, 0.5), 1);
    }
    gleam(d, [along(t - 0.012, -w / 2), along(t - 0.012, -w / 6)], 0.35, 0.8);
  }
  // Iron studs round the head.
  for (const [t, s] of [[0.8, -6.8], [0.84, 6.6], [0.97, -5.4], [1.0, 3.2], [0.78, 0.4]] as const) {
    const c = along(t, s);
    const stud = oval(c.x, c.y, 1.3, 1.3, 10);
    paint(d, stud, OGRE.iron, { gloss: true, shadow: 0.6, hatch: 0, line: 0.45 });
    d.pen.dot(c.x - 0.35, c.y - 0.4, 0.3, PAPER_FILL, 0.9);
  }
}

/** The near fist round the club's handle: knuckles over it, the thumb wrapped across. */
export function ogreFist(d: Draw, at: Pt): void {
  const fist = chain(pt(at.x - 5, at.y - 3), [pt(at.x - 3, at.y - 6.6), pt(at.x + 3, at.y - 6.4), pt(at.x + 5, at.y - 3)], [pt(at.x + 6.4, at.y), pt(at.x + 5, at.y + 4.6), pt(at.x + 1, at.y + 5)], [pt(at.x - 3, at.y + 5.2), pt(at.x - 6.4, at.y + 1), pt(at.x - 5, at.y - 3)]);
  paint(d, fist, OGRE.skin, { shadow: 0.6, hatch: 0.2, line: 0.75 });
  d.pen.clipped(fist, () => dab(d, oval(at.x + 1, at.y - 4.6, 4.6, 2, 10), '#b0715a', 0.35, 1));
  for (const k of [-1.8, 0.8, 3.2]) d.pen.hair([pt(at.x + k, at.y - 5.6), pt(at.x + k + 0.8, at.y - 1.8), pt(at.x + k + 0.4, at.y + 1)], 0.4, d.ink, 0.75);
  d.pen.stroke([pt(at.x - 4.4, at.y - 2), pt(at.x - 0.6, at.y - 3.4), pt(at.x + 3, at.y - 2.2)], 0.6, d.ink, 0.85, false);
  gleam(d, [pt(at.x - 2.6, at.y - 5.2), pt(at.x + 1.4, at.y - 5.6)], 0.5, 0.5);
}
