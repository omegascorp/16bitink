import { closed, oval, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { chain, limb } from './beastFur';
import { dab, gleam, paint, SHADOW } from './beastPaint';
import { turn } from './beastRig';
import { fist } from './ogreForm';

/**
 * The ogre's head and club. The head is small for the bulk under it, thrust
 * forward and sunk low between the shoulders: a sloping bald skull, a
 * heavy ridge of brow over small eyes lost in shadow, a broad flattened
 * nose, a jutting underbite with two yellowed tusks, a torn ear with an
 * iron ring. The club is a great knotted log bound with two iron bands
 * and driven through with iron spikes round its head.
 */
export const OGRE = {
  /** Mottled grey-ochre hide. */
  skin: '#504a37',
  skinLit: '#a88d5c',
  skinDeep: '#241e15',
  mottle: '#38321f',
  /** Raised veins: darker, a little purple. */
  vein: '#352a26',
  /** Horny nails. */
  nail: '#7a6a4c',
  /** Old ochre staining in the hide. */
  ochre: '#6c5732',
  /** Blood under the hide: knuckles, nose, ear. */
  flush: '#663826',
  hide: '#5a4129',
  hideSpot: '#33231a',
  hideLight: '#8f7150',
  belt: '#3a2618',
  iron: '#4b4d4e',
  ironLit: '#a6a399',
  wood: '#4f331e',
  woodDeep: '#2a190d',
  tusk: '#cdbb8e',
  eye: '#d29a34',
  wrap: '#5e4a35',
} as const;

const HEAD: Pt[] = chain(
  pt(13.4, -79),
  [pt(13, -84.4), pt(16.4, -87.8), pt(21, -87.8)],
  [pt(25, -87.8), pt(28, -86.6), pt(30.4, -84.6)],
  [pt(32, -83.6), pt(33.2, -82.4), pt(32.8, -81.2)],
  [pt(32.4, -80.4), pt(31, -80.2), pt(30.4, -79.8)],
  [pt(32, -79), pt(34, -77.2), pt(33.6, -75.8)],
  [pt(33.2, -75.2), pt(32, -75.2), pt(31.4, -75)],
  [pt(31.6, -74.6), pt(31.6, -74.2), pt(31.8, -74)],
  [pt(33.8, -73.8), pt(35, -72.2), pt(34.4, -70.2)],
  [pt(33.8, -68.8), pt(30, -67.4), pt(24, -67.6)],
  [pt(19, -67.8), pt(14.2, -71.6), pt(13.4, -79)],
);

/** The ridge of brow, a shelf of bone jutting over the eyes. */
const BROW: Pt[] = chain(pt(22, -85.4), [pt(26, -85.6), pt(30.6, -84.4), pt(33, -82.4)], [pt(33.4, -81.4), pt(32.6, -80.6), pt(31, -80.8)], [pt(28, -81.4), pt(25, -82), pt(22, -85.4)]);

/** A tusk from the lower jaw up past the lip: yellowed ivory, curved back, a dull glint down it. */
function tusk(d: Draw, x: number, y: number, h: number, far: boolean): void {
  const t = chain(pt(x - 1.1, y), [pt(x - 1.2, y - h * 0.5), pt(x - 0.8, y - h * 0.9), pt(x - 1.6, y - h)], [pt(x + 0.3, y - h * 0.8), pt(x + 1.2, y - h * 0.4), pt(x + 1.1, y)]);
  paint(d, t, far ? mix(OGRE.tusk, SHADOW, 0.4) : OGRE.tusk, { gloss: true, shadow: 0.6, hatch: 0, line: 0.35 });
  if (!far) gleam(d, [pt(x - 0.6, y - 0.8), pt(x - 0.6, y - h * 0.6)], 0.3, 0.55);
}

/** The head, facing right. */
export function ogreHead(d: Draw): void {
  tusk(d, 30.2, -72.8, 5.6, true);
  paint(d, HEAD, OGRE.skin, { shadow: 0.85, hatch: 0.32, cross: true, line: 0 });
  d.pen.clipped(HEAD, () => {
    // Light on the dome; the eyes lost under the brow; the cheekbone caught; the heavy jaw's underside dark.
    dab(d, oval(20, -85.6, 5.4, 2.2, 14), OGRE.skinLit, 0.7, 1.1);
    dab(d, oval(29, -79.4, 4.4, 1.7, 14), SHADOW, 0.9, 0.6);
    dab(d, oval(27.4, -76.8, 2.6, 1.2, 12), OGRE.skinLit, 0.5, 0.7);
    dab(d, oval(32.6, -77, 1.6, 1.4, 12), OGRE.flush, 0.45, 0.7);
    dab(d, [pt(14, -72.4), pt(35, -71.4), pt(35, -66), pt(14, -66)], SHADOW, 0.6, 1.2);
    dab(d, [pt(12, -84), pt(17, -84), pt(18, -70), pt(12, -70)], SHADOW, 0.35, 1.6);
    for (const [x, y, r] of [[17, -82, 1.4], [22, -76, 1.1], [19, -73.4, 1.2], [24.6, -86, 0.9]] as const) dab(d, oval(x, y, r * 1.3, r, 10), OGRE.mottle, 0.7, 0.4);
    d.pen.stipple(HEAD, 40, (_, y) => (y > -78 ? 0.6 : 0.25), 0.25, OGRE.skinDeep);
  });
  d.pen.stroke(closed(HEAD), 0.5, d.ink, 0.85);
  // The brow ridge: its top catching the sun, its underside a hard dark edge over the eyes.
  d.pen.clipped(HEAD, () => dab(d, BROW, OGRE.skinLit, 0.55, 0.6));
  d.pen.stroke([pt(24.6, -81.8), pt(28.6, -81), pt(32.6, -80.8)], 0.7, d.ink, 0.95, false);
  for (const y of [-86.4, -87.2]) d.pen.hair([pt(24.6, y + 0.4), pt(27.4, y + 0.6), pt(29.6, y + 1.8)], 0.26, d.ink, 0.45);
  // A small hard eye glinting in its socket.
  d.pen.fill(oval(29.6, -79.4, 1, 0.42, 10), '#140c08', 1);
  d.pen.dot(29.9, -79.4, 0.26, OGRE.eye, 0.95);
  // The broad flat nose, the grim set of the underbite, the jaw's line, an old scar on the scalp.
  d.pen.hair([pt(33.4, -76), pt(32.4, -75.4), pt(31.2, -75.8)], 0.38, d.ink, 0.85);
  d.pen.hair([pt(30.8, -79), pt(31.8, -77)], 0.26, d.ink, 0.5);
  d.pen.stroke([pt(25, -72.2), pt(28.6, -73.6), pt(31.8, -74)], 0.5, d.ink, 0.95, false);
  d.pen.hair([pt(31.8, -74), pt(33.6, -73.6), pt(34.6, -72.6)], 0.32, d.ink, 0.6);
  d.pen.hair([pt(18, -71.6), pt(23, -69.6), pt(29, -69.4)], 0.26, d.ink, 0.4);
  d.pen.hair([pt(16.6, -86.4), pt(19, -84.6), pt(20.4, -84.8)], 0.3, mix(OGRE.flush, SHADOW, 0.3), 0.8);
  tusk(d, 32.8, -73.2, 6.8, false);
  // A small torn ear with an iron ring through it.
  const ear = chain(pt(18.4, -81.4), [pt(15.4, -83.4), pt(14, -79.6), pt(15.4, -76.6)], [pt(16.4, -75.4), pt(18.6, -76.2), pt(18.8, -78.4)]);
  paint(d, ear, mix(OGRE.skin, OGRE.flush, 0.2), { shadow: 0.7, hatch: 0, line: 0.38 });
  d.pen.hair([pt(17.2, -80.4), pt(16, -79), pt(16.8, -77.2)], 0.28, d.ink, 0.7);
  d.pen.stroke(closed(oval(15.6, -75.2, 1.2, 1.4, 10)), 0.4, OGRE.iron, 1, false);
  d.pen.dot(15, -75.8, 0.22, OGRE.ironLit, 0.9);
}

/** The club's axis, grip end to head end. */
export const CLUB = { grip: pt(21, -56), head: pt(-30, -94) } as const;

const along = (t: number, side: number): Pt => {
  const dx = CLUB.head.x - CLUB.grip.x;
  const dy = CLUB.head.y - CLUB.grip.y;
  const l = Math.hypot(dx, dy);
  return pt(CLUB.grip.x + dx * t + (-dy / l) * side, CLUB.grip.y + dy * t + (dx / l) * side);
};

/** The club's width at `t` along it, as the limb below tapers it. */
const CLUB_W = [5.2, 7.4, 13.4, 15.6] as const;

/** An iron spike driven through the club's head at `t`, jutting from one side. */
function spike(d: Draw, t: number, side: 1 | -1, half: number, len: number): void {
  const base0 = along(t - 0.022, side * (half - 0.6));
  const base1 = along(t + 0.022, side * (half - 0.6));
  const tip = along(t + 0.006, side * (half + len));
  d.pen.fill([base0, tip, base1], OGRE.iron, 1);
  d.pen.fill([base1, tip, along(t + 0.004, side * (half - 0.6))], SHADOW, 0.5);
  d.pen.hair([base0, tip, base1], 0.3, d.ink, 0.85);
}

/** The club: a log thickening to a knotted head, grain down it, two iron bands with rivets, iron spikes. */
export function ogreClub(d: Draw): void {
  for (const [t, s, h, l] of [[0.79, -1, 6.6, 4.2], [0.93, -1, 7.6, 4.8], [0.85, 1, 7.2, 4.4], [0.98, 1, 7.6, 3.8]] as const) spike(d, t, s as 1 | -1, h, l);
  const shape = limb([CLUB.grip, along(0.45, 0), along(0.8, 0), CLUB.head], CLUB_W);
  paint(d, shape, OGRE.wood, { shadow: 0.85, hatch: 0.3, cross: true, line: 0 });
  d.pen.clipped(shape, () => {
    for (const s of [-1.6, 0.6, 2.4, -3.6, 4.2]) d.pen.hair([along(0.05, s * 0.4), along(0.5, s * 0.8), along(1.02, s * 1.4)], 0.3, OGRE.woodDeep, 0.75);
    for (const [t, s] of [[0.62, 1], [0.84, -2.5]] as const) {
      const k = along(t, s);
      dab(d, oval(k.x, k.y, 1.6, 1.1, 10), OGRE.woodDeep, 0.85, 0.3);
      d.pen.hair(closed(oval(k.x, k.y, 1.9, 1.35, 10)), 0.3, d.ink, 0.7);
    }
    gleam(d, [along(0.1, -1.4), along(0.55, -2.4), along(0.85, -4.6)], 0.4, 0.25);
  });
  d.pen.stroke(closed(shape), 0.55, d.ink, 0.9);
  for (const [t, w] of [[0.7, 11.8], [0.9, 15.2]] as const) {
    const band = [along(t - 0.026, -w / 2 - 0.5), along(t - 0.026, w / 2 + 0.5), along(t + 0.026, w / 2 + 0.5), along(t + 0.026, -w / 2 - 0.5)];
    paint(d, band, OGRE.iron, { gloss: true, shadow: 0.7, hatch: 0, line: 0.4 });
    for (const s of [-0.3, 0.05, 0.38]) {
      const r = along(t, s * w);
      d.pen.dot(r.x, r.y, 0.36, OGRE.ironLit, 0.6);
    }
    gleam(d, [along(t - 0.014, -w / 2), along(t - 0.014, -w / 6)], 0.3, 0.75);
  }
}

/** The near fist round the club's handle: knuckle ridge over it, the fingers curled round the shaft, the thumb clamped across. */
export function ogreFist(d: Draw, at: Pt): void {
  // The fist's frame turned so its fingers lie across the shaft; its middle sits on the grip.
  const a = -0.93;
  const c = turn(pt(1.6, 5.6), pt(0, 0), a);
  fist(d, pt(at.x - c.x, at.y - c.y), a, OGRE.skin, OGRE.skinLit, 1.05);
}
