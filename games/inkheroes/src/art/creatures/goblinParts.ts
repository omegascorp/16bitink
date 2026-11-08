import { bezier, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { blob, dab, folds, gleam, IVORY, limb, mix, ovalAt, paint, roundTube, SHADOW, stitches, stud, tatters, UMBER } from './neutralKit';
import { within, xf } from './neutralRig';

/**
 * The Goblin's parts, painted: sallow olive skin over wiry, knotted limbs,
 * a long narrow head with a hooked nose and slitted eyes sunk under a
 * heavy brow, crude dark leather riveted with iron, and a jagged iron
 * cleaver. Each part is drawn in the rest pose's coordinates; goblin.ts
 * places them.
 */
export const C = {
  skin: '#6d6b3a',
  skinDeep: '#3f3d20',
  earIn: '#6a4634',
  leather: '#3d2b1d',
  leatherDeep: '#291c12',
  strap: '#4d3622',
  iron: '#46433f',
  ironLit: '#8a8478',
  rust: '#6e3418',
  wood: '#4a3220',
  eye: '#c9a43a',
  mouth: '#24100c',
  tooth: '#cfc09a',
  nail: '#a8956a',
} as const;

/** A long bare foot: heel at `heel`, three clawed toes reaching forward; `tilt` turns it about the ankle (+ toes down). */
export function foot(d: Draw, heel: Pt, len: number, color: string, tilt = 0): void {
  within(d.pen.ctx, xf(pt(heel.x + 2.4, heel.y - 1.6), tilt), () => footAt(d, heel, len, color));
}

function footAt(d: Draw, heel: Pt, len: number, color: string): void {
  const shape = blob([pt(heel.x - 1.2, heel.y - 0.8), pt(heel.x + 0.8, heel.y - 3.2), pt(heel.x + 3, heel.y - 2.6), pt(heel.x + len * 0.7, heel.y - 1.4), pt(heel.x + len, heel.y - 0.3), pt(heel.x + len * 0.55, heel.y + 0.4), pt(heel.x, heel.y + 0.3)], 4);
  paint(d, shape, color, { shadow: 0.7, line: 0.55, hatch: 0.18 });
  for (const k of [0, 1]) d.pen.hair([pt(heel.x + len * (0.55 + k * 0.17), heel.y - 1.3 + k * 0.4), pt(heel.x + len * (0.66 + k * 0.17), heel.y + 0.1)], 0.28, UMBER, 0.7);
  d.pen.stroke([pt(heel.x + len - 0.4, heel.y - 0.6), pt(heel.x + len + 1.2, heel.y), pt(heel.x + len + 1.4, heel.y + 0.3)], 0.45, C.nail, 1, false);
  d.pen.hair([pt(heel.x + 2, heel.y - 2.8), pt(heel.x + 4.4, heel.y - 1.8)], 0.3, mix(color, '#f6d49a', 0.35), 0.7);
}

/** A wiry leg, hip to knee to ankle: a lean thigh, a knotted knee, a stringy shin. */
export function leg(d: Draw, hip: Pt, knee: Pt, ankle: Pt, color: string): void {
  limb(d, hip, knee, 3.6, 2.4, color, { shadow: 0.7, hatch: 0.2 });
  limb(d, knee, ankle, 2.4, 1.7, color, { shadow: 0.7, hatch: 0.2 });
  paint(d, ovalAt(knee, 1.35, 1.2), color, { shadow: 0.55, line: 0.4, hatch: 0, lineAlpha: 0.7 });
}

/** A long clawed hand: a narrow palm and three hooked fingers. */
export function claw(d: Draw, at: Pt, ang: number, color: string): void {
  for (const k of [-0.5, 0, 0.5]) {
    const a = ang + k;
    const tip = pt(at.x + Math.cos(a) * 4, at.y + Math.sin(a) * 4);
    const bend = pt(at.x + Math.cos(a - 0.45) * 2.6, at.y + Math.sin(a - 0.45) * 2.6);
    paint(d, roundTube(bezier(at, bend, tip, 6), (u) => 1.1 - u * 0.6), color, { shadow: 0.5, line: 0.38, hatch: 0 });
    d.pen.stroke([pt(tip.x - Math.cos(a) * 0.3, tip.y - Math.sin(a) * 0.3), pt(tip.x + Math.cos(a + 0.6) * 1.1, tip.y + Math.sin(a + 0.6) * 1.1)], 0.35, C.nail, 1, false);
  }
  paint(d, ovalAt(at, 1.6, 1.25, ang), color, { shadow: 0.55, line: 0.42, hatch: 0 });
}

/** A pointed ear from its root out to a tip, swept back, the inside a warm hollow. */
export function ear(d: Draw, root: Pt, tip: Pt, wide: number, near: boolean): void {
  const mid = pt((root.x + tip.x) / 2, (root.y + tip.y) / 2 - wide * 0.3);
  const spine = bezier(root, mid, tip, 12);
  const shape = roundTube(spine, (u) => wide * Math.pow(1 - u, 0.9) + 0.25);
  const skin = near ? C.skin : mix(C.skin, SHADOW, 0.35);
  paint(d, shape, skin, { shadow: 0.65, line: near ? 0.55 : 0.45, hatch: 0.18 });
  const inner = roundTube(bezier(pt(root.x, root.y + 0.4), pt(mid.x, mid.y + wide * 0.3), pt(tip.x + (root.x - tip.x) * 0.25, tip.y + (root.y - tip.y) * 0.25 + 0.3), 10), (u) => wide * 0.45 * (1 - u));
  d.pen.clipped(shape, () => d.pen.fill(inner, near ? C.earIn : mix(C.earIn, SHADOW, 0.4), 0.8));
  if (near) {
    // A torn nick in the edge, and the lit rim along the top.
    const n = spine[6]!;
    d.pen.stroke([pt(n.x - 0.6, n.y - wide * 0.3), pt(n.x, n.y - wide * 0.1), pt(n.x + 0.7, n.y - wide * 0.34)], 0.38, UMBER, 0.9, false);
    gleam(d, spine.slice(1, 8).map((p) => pt(p.x, p.y - wide * 0.32)), 0.4, 0.5);
  }
}

/** The head: long and narrow, jutting forward; a heavy brow over slitted eyes, a hooked nose, a thin snarl with two fangs. */
export function head(d: Draw): void {
  const skull = blob([pt(6.2, -43), pt(7.2, -45.6), pt(10, -46.8), pt(13.4, -46), pt(15.2, -44), pt(16, -42.6), pt(15.4, -41.4), pt(16.6, -39.6), pt(16.8, -38.2), pt(16.2, -36.6), pt(14.6, -35.8), pt(11.4, -36.4), pt(9, -37.6), pt(7, -39.6)], 4);
  paint(d, skull, C.skin, { shadow: 0.75, line: 0.6, hatch: 0.24, cross: true });
  d.pen.clipped(skull, () => {
    // The eye sunk in shadow under the brow; the gaunt hollow under the cheekbone; the jaw's underside.
    dab(d, ovalAt(pt(13.6, -41.8), 2.6, 1.4, -0.15), mix(C.skinDeep, SHADOW, 0.4), 0.8, 0.5);
    d.pen.fill(blob([pt(10.6, -40), pt(13.6, -39.6), pt(14.2, -38), pt(11.2, -38.4)], 3), mix(C.skinDeep, SHADOW, 0.3), 0.55);
    d.pen.fill([pt(9, -37.4), pt(16.4, -36.4), pt(15, -35.4), pt(9, -36.2)], mix(C.skinDeep, SHADOW, 0.5), 0.5);
  });
  // Lank hairs off the crown and the back of the skull.
  for (const [x, y, dx, dy] of [[7.8, -45.8, -2.4, 1.8], [9.4, -46.6, -2.8, 0.6], [7, -44.4, -1.8, 2.8]] as const) {
    d.pen.hair(bezier(pt(x, y), pt(x + dx * 0.5, y - 0.6), pt(x + dx, y + dy), 5), 0.26, UMBER, 0.85);
  }
  // The eye: a narrow slanted slit of dull yellow, a hard slit pupil, a pinpoint of light.
  const eye = blob([pt(12.4, -41.8), pt(13.8, -42.5), pt(15, -42.1), pt(13.8, -41.4)], 3);
  paint(d, eye, C.eye, { shadow: 0.3, line: 0.3, hatch: 0, gloss: true });
  d.pen.fill(ovalAt(pt(14, -41.95), 0.22, 0.48, 0, 8), UMBER, 1);
  d.pen.dot(13.6, -42.1, 0.2, IVORY, 0.85);
  // The brow: heavy, pulled down hard toward the nose.
  d.pen.stroke([pt(11.2, -43.6), pt(13.4, -43.1), pt(15.6, -42.3)], 0.75, UMBER, 0.95, false);
  gleam(d, [pt(11.4, -44.1), pt(13.6, -43.8), pt(15.4, -43)], 0.4, 0.6);
  d.pen.hair([pt(15.2, -43.4), pt(15.8, -42.8)], 0.25, UMBER, 0.8);
  // The nose: long and hooked, the bridge lit, the nostril dark.
  const nose = blob([pt(15.2, -42), pt(16.8, -41.2), pt(19.2, -38.8), pt(18.6, -38.1), pt(16.8, -38.4), pt(15.6, -39.4)], 4);
  paint(d, nose, C.skin, { shadow: 0.7, line: 0.5, hatch: 0.18 });
  gleam(d, [pt(15.8, -41.4), pt(17.4, -40.2), pt(18.6, -38.9)], 0.38, 0.65);
  d.pen.hair([pt(16.8, -38.6), pt(17.6, -38.3)], 0.32, UMBER, 0.9);
  // The mouth: a thin, hard snarl, a fang up from the lower jaw and one down past the lip.
  d.pen.stroke([pt(13.4, -37.8), pt(14.8, -37.5), pt(16.6, -37.7)], 0.5, C.mouth, 1, false);
  d.pen.fill([pt(15.3, -37.6), pt(15.9, -37.6), pt(15.6, -38.8)], C.tooth, 1);
  d.pen.fill([pt(16.1, -37.8), pt(16.6, -37.8), pt(16.4, -36.9)], C.tooth, 1);
  d.pen.hair(bezier(pt(13, -38.4), pt(12.8, -37.6), pt(13.4, -36.8), 5), 0.28, UMBER, 0.7);
  // A wrinkle at the bridge, a scar down the cheek.
  d.pen.hair([pt(14.8, -41.2), pt(15.4, -40.6)], 0.25, UMBER, 0.7);
  d.pen.hair([pt(11.6, -42.6), pt(12.2, -40.6), pt(12.4, -39.2)], 0.3, mix(C.earIn, UMBER, 0.3), 0.85);
  gleam(d, [pt(7, -43.6), pt(8.4, -45.8), pt(11, -46.6)], 0.5, 0.5);
}

/** The torso, hunched and lean: wiry bare skin under a crude leather jerkin, a riveted baldric across it, a belt and a ragged leather skirt. */
export function torso(d: Draw): void {
  const body = blob([pt(-4.6, -20.4), pt(-5.2, -25.6), pt(-3.6, -32.4), pt(-0.4, -37), pt(3, -38.6), pt(6.6, -36.4), pt(7, -32), pt(5.4, -26.4), pt(4.4, -21), pt(0.4, -19.6)], 4);
  paint(d, body, C.skin, { shadow: 0.75, line: 0.55, hatch: 0.2 });
  // Ribs showing on the lean chest, and the knobs of the spine along the hunched back.
  for (const y of [-33.4, -31.6, -29.8]) d.pen.hair(bezier(pt(4.4, y), pt(5.8, y - 0.5), pt(6.8, y + 0.3), 5), 0.26, mix(C.skinDeep, UMBER, 0.4), 0.75);
  const hem = tatters(pt(5, -18.4), pt(-5.8, -18.2), 4, 2.8, 4);
  const jerkin = [...blob([pt(-5.6, -25.6), pt(-4.6, -31.8), pt(-2.2, -36.4), pt(1, -37.8), pt(3.4, -36.8), pt(3.6, -32.4), pt(4, -27), pt(4.8, -20.6)], 4).slice(0, 33), ...hem];
  paint(d, jerkin, C.leather, { shadow: 0.8, line: 0.6, hatch: 0.24, cross: true });
  // Panels stitched together, worn pale at the seams.
  folds(d, [[pt(-3.2, -33.6), pt(-3.8, -27), pt(-3.2, -19)], [pt(0.6, -36), pt(0.4, -28), pt(0.8, -19.2)]], C.leather, 0.45, 0.85);
  stitches(d, pt(-1.2, -36.4), pt(-1.6, -24), 6, mix(C.leather, '#f6d49a', 0.3), 0.3);
  d.pen.hair([pt(3.4, -36.4), pt(3.8, -31), pt(4.4, -24)], 0.35, mix(C.leather, '#f6d49a', 0.3), 0.75);
  // A baldric across the back, riveted with iron.
  const strap = roundTube([pt(3.6, -37), pt(-1, -29.6), pt(-5.2, -22.6)], () => 1.5);
  paint(d, strap, C.strap, { shadow: 0.6, line: 0.45, hatch: 0 });
  for (const k of [0.2, 0.45, 0.7]) stud(d, pt(3.6 - 8.8 * k, -37 + 14.4 * k), 0.38, mix(C.iron, C.ironLit, 0.5));
  // The belt, a crude iron buckle, a hanging leather tab.
  const belt = roundTube([pt(-5.6, -22.6), pt(-0.4, -21.6), pt(5.2, -22.2)], () => 1.6);
  paint(d, belt, C.strap, { shadow: 0.6, line: 0.45, hatch: 0 });
  paint(d, [pt(1.2, -23.6), pt(3.2, -23.4), pt(3.2, -20.8), pt(1.2, -20.9)], C.iron, { shadow: 0.5, line: 0.4, hatch: 0 });
  d.pen.fill(ovalAt(pt(2.2, -22.2), 0.55, 0.75, 0, 8), UMBER, 0.85);
  const tab = blob([pt(-3.8, -22), pt(-1.8, -22), pt(-2, -16.8), pt(-2.9, -15.8), pt(-3.8, -16.8)], 3);
  paint(d, tab, C.leatherDeep, { shadow: 0.6, line: 0.45, hatch: 0.15 });
}

/** A crude iron plate strapped over the near shoulder. */
export function shoulderPlate(d: Draw): void {
  const plate = blob([pt(1.6, -36.2), pt(3.6, -38.8), pt(7, -38.6), pt(8.4, -36.4), pt(6.8, -34.2), pt(3, -34)], 4);
  paint(d, plate, C.iron, { shadow: 0.75, line: 0.55, hatch: 0.22, gloss: true });
  d.pen.clipped(plate, () => {
    d.pen.fill(ovalAt(pt(4.6, -34.6), 3, 0.9, 0, 10), C.rust, 0.55);
    d.pen.stipple(plate, 24, () => 0.6, 0.2, mix(C.rust, '#f6d49a', 0.3));
  });
  d.pen.stroke([pt(2.4, -36.8), pt(4, -38.4), pt(6.8, -38.2)], 0.4, mix(C.ironLit, IVORY, 0.4), 0.8, false);
  stud(d, pt(3.4, -36), 0.4, mix(C.iron, C.ironLit, 0.5));
  stud(d, pt(6.8, -36.2), 0.4, mix(C.iron, C.ironLit, 0.5));
}

/** A leather bracer round the forearm from `a` to `b`. */
export function bracer(d: Draw, a: Pt, b: Pt): void {
  const s = pt(a.x + (b.x - a.x) * 0.35, a.y + (b.y - a.y) * 0.35);
  const e = pt(a.x + (b.x - a.x) * 0.9, a.y + (b.y - a.y) * 0.9);
  limb(d, s, e, 3.1, 2.7, C.leather, { shadow: 0.7, hatch: 0.15, line: 0.5 });
  const m = pt((s.x + e.x) / 2, (s.y + e.y) / 2);
  stud(d, m, 0.38, mix(C.iron, C.ironLit, 0.5));
}

/** The cleaver: a short wrapped haft and a broad, jagged blade of black iron hacked from scrap, a spike on its back. */
export function cleaver(d: Draw, grip: Pt, ang: number, len: number): void {
  const at = (k: number, side = 0): Pt => pt(grip.x + Math.cos(ang) * k - Math.sin(ang) * side, grip.y + Math.sin(ang) * k + Math.cos(ang) * side);
  const haft = roundTube([at(-3.4), at(len * 0.55)], (u) => 1.6 + u * 0.3);
  paint(d, haft, C.wood, { shadow: 0.65, line: 0.5, hatch: 0.15 });
  for (let k = -2.6; k < 1.6; k += 0.9) d.pen.hair([at(k, -0.9), at(k + 0.5, 0.9)], 0.3, C.strap, 0.9);
  // The blade: a heavy slab of black iron, its edge forward (+side), hacked and notched; a hooked spike off its back.
  const blade = [at(len * 0.42, -1.2), at(len * 0.97, -1.4), at(len, -0.4), at(len * 0.99, 4.6), at(len * 0.91, 5), at(len * 0.87, 4.2), at(len * 0.81, 5.1), at(len * 0.67, 5), at(len * 0.63, 4.3), at(len * 0.57, 4.9), at(len * 0.48, 3.8), at(len * 0.42, 1.4)];
  const spike = [at(len * 0.62, -1.1), at(len * 0.52, -4.4), at(len * 0.74, -1.3)];
  paint(d, spike, C.iron, { shadow: 0.6, line: 0.45, hatch: 0 });
  paint(d, blade, C.iron, { shadow: 0.7, line: 0.55, hatch: 0.22 });
  d.pen.clipped(blade, () => {
    d.pen.fill(ovalAt(at(len * 0.72, 0.6), 3.4, 1.2, ang, 10), C.rust, 0.5);
    d.pen.fill(ovalAt(at(len * 0.9, 2), 1.4, 1.8, ang, 10), C.rust, 0.4);
    d.pen.stipple(blade, 40, () => 0.5, 0.22, mix(C.rust, '#f6d49a', 0.25));
    // The ground bevel along the edge, lighter than the slab.
    d.pen.fill([at(len * 0.46, 3.2), at(len * 0.99, 3.4), at(len * 0.99, 5.2), at(len * 0.46, 5.2)], C.ironLit, 0.35);
  });
  d.pen.stroke([at(len * 0.5, 4), at(len * 0.57, 4.7), at(len * 0.67, 4.8), at(len * 0.81, 4.9), at(len * 0.98, 4.5)], 0.4, '#f0cf9a', 0.9, false);
  d.pen.hair([at(len * 0.44, -0.9), at(len * 0.96, -1.1)], 0.3, mix(C.ironLit, IVORY, 0.3), 0.6);
  stud(d, at(len * 0.48, 0.2), 0.42, mix(C.iron, C.ironLit, 0.5));
  stud(d, at(len * 0.58, 0.4), 0.42, mix(C.iron, C.ironLit, 0.5));
}
