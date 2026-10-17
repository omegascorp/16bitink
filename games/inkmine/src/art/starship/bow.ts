import { oval, pt, type Draw } from '../kit';
import { dab, gleam, glow, LIGHT, mix, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { part, rivets, roundRect, seam } from '../prospector/parts';
import { COLOR, cylinder, drumShape, frameArc, navLight, pitting, plates, porthole, stencil, streaks, type ShipLook } from './hull';
import { quad } from './stern';

/**
 * The bow (index.ts): the crew's drum with its portholes, the telescope
 * along its back, and the bridge in the nose under a strip of canopy, its
 * thruster quads, a sensor blister under its chin and a whip aerial.
 */

/** The crew's drum. */
const HAB = { x0: 33, x1: 80, r: 12.6, e: 1.5, frames: [44.5, 56.5, 68.5] } as const;
const PORTHOLES = [37.6, 41.4, 48.6, 52.4, 60.6, 64.4, 72.4, 76.2] as const;
/** The telescope: its tube along the drum's back, and its hood at the front. */
const SCOPE = { x0: 40, x1: 72, y: -19.6, r: 4 } as const;
/** The bridge, from the drum to the nose. */
const BRIDGE: readonly Pt[] = [pt(80, -12.6), pt(91, -12), pt(100, -9.6), pt(106.6, -6.2), pt(111.2, -2.6), pt(113.6, 0.4), pt(112.6, 3.2), pt(108, 6.8), pt(100, 10.4), pt(90, 12.2), pt(80, 12.6)];

/** The drum: plated, a row of portholes, vents and handholds, a hull number. */
function habitat(d: Draw, lit: boolean): void {
  const { pen } = d;
  const { x0, x1, r, e, frames } = HAB;
  const collar = drumShape(28, x0 + 0.2, r + 1.4, e);
  cylinder(d, collar, mix(COLOR.metal, SHADOW, 0.1), -r - 1.4, r + 1.4, { gloss: true, hatch: 0.15 });
  pen.stroke([...collar, collar[0]!], 0.5, d.ink, 0.9, false);
  rivets(d, frameArc(30.4, r + 0.6, e, 0, 12).slice(1, -1), 0.18);
  const shape = drumShape(x0, x1, r, e);
  cylinder(d, shape, COLOR.hull, -r, r, { gloss: true });
  plates(d, shape, frames, [-7.4, 6.6], r, e, { rivet: 0.17 });
  pen.clipped(shape, () => {
    pen.fill([pt(x0 - 2, 2.6), pt(x1 + 3, 2.6), pt(x1 + 3, 4.6), pt(x0 - 2, 4.6)], COLOR.stripe, 0.85);
    pen.fill([pt(x0 - 2, 5.3), pt(x1 + 3, 5.3), pt(x1 + 3, 5.7), pt(x0 - 2, 5.7)], COLOR.stripe, 0.6);
    // Vents under the stripe, and handholds along the keel.
    for (const x of [39, 51, 63, 75]) for (let k = 0; k < 4; k++) pen.fill(roundRect(x + k * 0.9, 8, x + k * 0.9 + 0.45, 9.8, 0.1), COLOR.dark, 0.7);
    for (let x = 36; x < 79; x += 4.2) pen.hair([pt(x, 11.2), pt(x, 10.4), pt(x + 1.4, 10.4), pt(x + 1.4, 11.2)], 0.18, d.ink, 0.8);
    pitting(d, shape, 380);
    streaks(d, shape, frames.flatMap((x) => [pt(x - 0.3, -9), pt(x - 0.3, 9)]), 6);
  });
  pen.stroke([...shape, shape[0]!], 0.55, d.ink, 0.95, false);
  for (const x of PORTHOLES) porthole(d, pt(x, -2.4), 1.25, lit);
  stencil(d, 45.6, -10, 5, 0.55);
}

/**
 * The telescope along the drum's back, on a yoke: a tube with an
 * instrument box behind, its hood forward with the aperture lid open on
 * its hinge. Until it's mended the lid hangs bent and the tube's dented,
 * a crack across it where the mirror broke inside.
 */
function telescope(d: Draw, look: ShipLook): void {
  const { pen } = d;
  const { x0, x1, y, r } = SCOPE;
  // The yoke and its turntable.
  part(d, roundRect(50, -HAB.r - 1.4, 62, -HAB.r + 0.6, 0.5), COLOR.gunmetal, { shadow: 0.35, line: 0.35, hatch: 0, gloss: true });
  for (const x of [52.4, 59.6]) part(d, [pt(x - 1, -HAB.r - 1.2), pt(x + 1, -HAB.r - 1.2), pt(x + 0.7, y + 1), pt(x - 0.7, y + 1)], COLOR.metal, { shadow: 0.35, line: 0.3, hatch: 0, gloss: true });
  // The instrument box behind, finned.
  const box = roundRect(x0 - 5, y - 3.2, x0 + 0.6, y + 3.2, 0.6);
  part(d, box, COLOR.gunmetal, { shadow: 0.45, line: 0.4, hatch: 0.12, gloss: true });
  for (let x = x0 - 4.2; x < x0; x += 0.9) pen.hair([pt(x, y - 2.6), pt(x, y + 2.6)], 0.14, '#1c1d27', 0.6);
  const body = drumShape(x0, x1, r, 0.6, y);
  cylinder(d, body, '#e3e1da', y - r, y + r, { gloss: true, hatch: 0.12 });
  pen.clipped(body, () => {
    for (const x of [46, 54, 62]) seam(d, frameArc(x, r, 0.6, y), 0.22);
    if (!look.telescope) {
      // A dent and the crack over the broken mirror.
      dab(d, oval(57, y - 1.2, 2.6, 1.6, 14), SHADOW, 0.25, 0.6);
      pen.hair([pt(55.2, y - r), pt(56.4, y - 1.8), pt(55.6, y - 0.4), pt(57, y + 1.6)], 0.22, d.ink, 0.9);
    }
  });
  pen.stroke([...body, body[0]!], 0.45, d.ink, 0.9, false);
  for (const x of [48, 60]) {
    const band = [...frameArc(x + 0.6, r + 0.25, 0.6, y), ...frameArc(x - 0.6, r + 0.25, 0.6, y).reverse()];
    cylinder(d, band, COLOR.metal, y - r, y + r, { hatch: 0, gloss: true });
    pen.hair([...band, band[0]!], 0.2, d.ink, 0.8);
  }
  // The hood: a little wider, black inside.
  const hood = drumShape(x1 - 0.4, x1 + 6.4, r + 0.7, 0.8, y);
  cylinder(d, hood, mix('#e3e1da', SHADOW, 0.08), y - r - 0.7, y + r + 0.7, { gloss: true, hatch: 0.1 });
  pen.stroke([...hood, hood[0]!], 0.42, d.ink, 0.9, false);
  pen.fill(oval(x1 + 6.6, y, 0.8, r + 0.3, 16), '#15161e', 0.95);
  // The lid on its hinge at the hood's top.
  const hinge = pt(x1 + 6.6, y - r - 0.7);
  const lid = look.telescope ? [hinge, pt(hinge.x + 4.6, hinge.y - 6.6), pt(hinge.x + 5.4, hinge.y - 6), pt(hinge.x + 0.9, hinge.y + 0.4)] : [hinge, pt(hinge.x + 2.6, hinge.y + 4.2), pt(hinge.x + 1.4, hinge.y + 8.4), pt(hinge.x + 0.4, hinge.y + 8), pt(hinge.x + 1.6, hinge.y + 4.2), pt(hinge.x - 0.4, hinge.y + 0.6)];
  part(d, lid, '#d9d7cf', { shadow: 0.4, line: 0.38, hatch: 0, gloss: true });
  part(d, oval(hinge.x, hinge.y, 0.7, 0.7, 10), COLOR.gunmetal, { shadow: 0.2, line: 0.22, hatch: 0 });
  if (look.telescope) {
    // The mirror's silver catching the light, deep in the tube.
    pen.fill(oval(x1 + 6.4, y + 0.4, 0.35, r * 0.6, 12), '#dfe6f0', 0.5);
  } else {
    pen.hair([pt(hinge.x + 1.6, hinge.y + 3.6), pt(hinge.x + 2.4, hinge.y + 5.2)], 0.16, d.ink, 0.85);
  }
  gleam(d, [pt(x0 + 1, y - r * 0.6), pt(x1 + 5, y - r * 0.6)], 0.35, 0.7);
  rivets(d, [pt(x0 - 4.2, y - 2.6), pt(x0 - 4.2, y + 2.6)], 0.15);
}

/** The bridge: the canopy panes under a brow, lit from inside once there's power; the nose cap, thruster quads, a blister under the chin, and the aerial. */
function bridge(d: Draw, lit: boolean): void {
  const { pen } = d;
  cylinder(d, BRIDGE, COLOR.bridge, -12.6, 12.6, { gloss: true });
  pen.clipped(BRIDGE, () => {
    plates(d, BRIDGE, [91, 101], [-7.4, 6.6], HAB.r, 1.2, { rivet: 0.16 });
    pen.fill([pt(78, 2.6), pt(110, 2.6), pt(108.6, 4.6), pt(78, 4.6)], COLOR.stripe, 0.85);
    pen.fill([pt(78, 5.3), pt(105, 5.3), pt(104.5, 5.7), pt(78, 5.7)], COLOR.stripe, 0.6);
    // The nose cap, darker and heat-stained.
    pen.fill([pt(108, -8), pt(116, -8), pt(116, 9), pt(108, 9)], mix(COLOR.gunmetal, LIGHT, 0.15), 0.85);
    dab(d, oval(113, 0.6, 3, 3, 14), COLOR.scorch, 0.25, 1);
    pitting(d, BRIDGE, 240);
  });
  seam(d, [pt(108.2, -5.8), pt(109, 0), pt(108.2, 6.4)], 0.3);
  // The canopy: four panes, mullions between, a brow over them.
  const glass = [pt(88.6, -10.6), pt(99.4, -8.6), pt(105.6, -5.4), pt(108.6, -2.4), pt(107.6, -1), pt(88.6, -1.6)];
  if (lit) glow(pen.ctx, pt(98, -5), 11, COLOR.windowLit, 0.5);
  part(d, glass, lit ? COLOR.windowLit : COLOR.glass, { shadow: lit ? 0.1 : 0.35, line: 0.5, hatch: 0, gloss: !lit, alpha: 1 });
  pen.clipped(glass, () => {
    if (lit) {
      // The consoles and a seat-back inside, against the light.
      pen.fill([pt(88, -3.4), pt(108, -3.4), pt(108, -1), pt(88, -1)], '#8a6a3a', 0.45);
      pen.fill(roundRect(95.2, -6.6, 97, -2.4, 0.5), '#7a5e38', 0.55);
      for (const x of [90.4, 101.6]) pen.fill(roundRect(x, -4.4, x + 2.4, -3, 0.2), '#e88f4a', 0.6);
    } else {
      gleam(d, [pt(90, -9.2), pt(92.6, -2.4)], 0.5, 0.55);
      gleam(d, [pt(100.6, -7.4), pt(102.4, -2.6)], 0.35, 0.4);
    }
  });
  for (const x of [93.6, 98.6, 103.4]) pen.stroke([pt(x, -10.2 + (x - 88.6) * 0.32), pt(x - 0.2, -1.4)], 0.5, d.ink, 0.95, false);
  part(d, [pt(87.8, -11.6), pt(99.6, -9.6), pt(106.4, -6.2), pt(105.6, -5.4), pt(99.2, -8.6), pt(88.4, -10.6)], COLOR.gunmetal, { shadow: 0.25, line: 0.35, hatch: 0, gloss: true });
  // Wipers' rails and the frame's rivets.
  rivets(d, [pt(89.4, -0.6), pt(95, -0.6), pt(100.6, -0.4), pt(106, -0.4)], 0.16);
  // The chin blister: a sensor under glass.
  const blister = [...oval(99, 10.6, 4.2, 2.2, 20).filter((p) => p.y >= 10.4), pt(94.8, 10.4)];
  part(d, blister, '#5b6a8c', { shadow: 0.3, line: 0.35, hatch: 0, gloss: true });
  pen.dot(99.6, 11.4, 0.5, lit ? '#9fe0c0' : '#2a3044', 0.9);
  quad(d, pt(86, -13.4), -1);
  quad(d, pt(87, 13.4), 1);
  // The aerial and the probes.
  pen.hair([pt(112.2, -1.6), pt(116, -5), pt(119, -8.2)], 0.26, d.ink, 0.95);
  pen.hair([pt(113, 2.6), pt(117.4, 3.4)], 0.22, d.ink, 0.9);
  navLight(d, pt(119.2, -8.4), COLOR.white, lit, 0.5);
  navLight(d, pt(104, -9.2), COLOR.red, lit, 0.45);
}

/** The drum, the telescope and the bridge. */
export function bow(d: Draw, look: ShipLook): void {
  habitat(d, look.power);
  bridge(d, look.power);
  telescope(d, look);
}

/** The telescope's broken glass drifting off it until it's mended: painted round the craft, outside its outline. */
export function scopeShards(d: Draw, look: ShipLook): void {
  if (look.telescope) return;
  const { pen } = d;
  const from = pt(SCOPE.x1 + 7.6, SCOPE.y - 1);
  for (const [dx, dy, s, a] of [[2.4, -2.2, 0.9, 0.2], [4.6, -0.6, 0.6, 1.1], [3.4, 1.6, 0.7, 2.2], [6.8, -3.4, 0.5, 0.7], [7.6, 0.8, 0.4, 1.8]] as const) {
    const c = pt(from.x + dx, from.y + dy);
    const tri = [0, 2.1, 4.2].map((k) => pt(c.x + Math.cos(a + k) * s, c.y + Math.sin(a + k) * s * 0.8));
    pen.fill(tri, '#cfe0ee', 0.85);
    pen.hair([...tri, tri[0]!], 0.12, d.ink, 0.7);
    pen.dot(c.x - s * 0.2, c.y - s * 0.2, 0.12, PAPER_FILL, 0.9);
  }
}
