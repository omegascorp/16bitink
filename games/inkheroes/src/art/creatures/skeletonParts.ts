import { bezier, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { blob, dab, folds, gleam, mix, ovalAt, paint, roundTube, SHADOW, stud, tatters, UMBER } from './neutralKit';
import { turn, within, xf } from './neutralRig';

/**
 * The Skeleton's parts, painted: long, gaunt bones yellowed with age, a
 * rusted mail skirt on a cracked belt, a notched
 * sword and a split round shield. Each part is drawn in the rest pose's
 * coordinates; skeleton.ts places them.
 */
export const C = {
  bone: '#b9a67a',
  boneFar: '#8c7a54',
  boneDeep: '#6e5a38',
  stain: '#5e4626',
  socket: '#120b09',
  ember: '#c8642a',
  steel: '#6c7074',
  iron: '#4a4744',
  rust: '#7a3a1c',
  rustLit: '#a35a2a',
  grip: '#33221a',
  wood: '#4a2f1c',
  paint: '#4a2018',
  cloth: '#4a2a20',
  leather: '#3e2a1c',
} as const;

/** The jaw's hinge, under the cheekbone at the back of the skull. */
export const JAW_HINGE = pt(3, -66);

/** A bone from a to b: a shaft of width w swelling to knobbed ends (the ends' heads a little offset, as a real bone's are). */
export function bone(d: Draw, a: Pt, b: Pt, w: number, color: string = C.bone, knob = 0.8): Pt[] {
  const spine = Array.from({ length: 13 }, (_, i) => pt(a.x + ((b.x - a.x) * i) / 12, a.y + ((b.y - a.y) * i) / 12));
  const shape = roundTube(spine, (u) => w * (0.82 + 0.18 * Math.abs(u - 0.5) * 2 + knob * Math.exp(-((u / 0.1) ** 2)) + knob * 0.9 * Math.exp(-(((1 - u) / 0.1) ** 2))));
  paint(d, shape, color, { shadow: 0.7, line: 0.55, hatch: 0.22 });
  // Age: a stain dabbed along the shaft, and the lit ridge on the side toward the light.
  const nx = -(b.y - a.y);
  const ny = b.x - a.x;
  const l = Math.hypot(nx, ny) || 1;
  const s = nx * -0.55 + ny * -0.84 > 0 ? 1 : -1;
  const off = pt((nx / l) * w * 0.28 * s, (ny / l) * w * 0.28 * s);
  d.pen.clipped(shape, () => d.pen.fill(ovalAt(spine[7]!, w * 1.6, w * 0.45, Math.atan2(b.y - a.y, b.x - a.x), 10), C.stain, 0.22));
  gleam(d, spine.slice(2, 11).map((p) => pt(p.x + off.x, p.y + off.y)), w * 0.32, 0.55);
  return shape;
}

/** A forearm: radius and ulna side by side, crossing a little toward the wrist. */
export function forearm(d: Draw, elbow: Pt, wrist: Pt, color: string): void {
  const nx = -(wrist.y - elbow.y);
  const ny = wrist.x - elbow.x;
  const l = Math.hypot(nx, ny) || 1;
  const o = pt((nx / l) * 0.6, (ny / l) * 0.6);
  bone(d, pt(elbow.x - o.x, elbow.y - o.y), pt(wrist.x - o.x * 0.3, wrist.y - o.y * 0.3), 0.75, mix(color, SHADOW, 0.25), 0.6);
  bone(d, pt(elbow.x + o.x, elbow.y + o.y), pt(wrist.x + o.x * 0.5, wrist.y + o.y * 0.5), 0.9, color, 0.7);
}

/** A leg: femur, the thin fibula behind the shin, the tibia, a kneecap and a long bony foot. */
export function leg(d: Draw, hip: Pt, knee: Pt, ankle: Pt, toe: Pt, color: string, tilt = 0): void {
  bone(d, hip, knee, 1.8, color, 0.75);
  bone(d, pt(knee.x - 0.7, knee.y + 1), pt(ankle.x - 0.5, ankle.y - 0.3), 0.6, mix(color, SHADOW, 0.3), 0.6);
  bone(d, pt(knee.x + 0.3, knee.y + 0.5), ankle, 1.4, color, 0.7);
  paint(d, ovalAt(pt(knee.x + 1.1, knee.y - 0.1), 1.1, 1.35, 0.2), color, { shadow: 0.55, line: 0.45, hatch: 0 });
  within(d.pen.ctx, xf(ankle, tilt), () => foot(d, ankle, toe, color));
}

/** The heel bone, then the long bones of the foot running out to the toes. */
function foot(d: Draw, ankle: Pt, toe: Pt, color: string): void {
  paint(d, ovalAt(pt(ankle.x - 1, ankle.y + 1.7), 1.5, 1.2, 0.2), color, { shadow: 0.6, line: 0.5, hatch: 0 });
  for (const [k, w] of [[-0.5, 0.75], [0.5, 0.9]] as const) {
    const a = pt(ankle.x + 0.3, ankle.y + 1 + k * 0.5);
    const b = pt(toe.x - 1.8, toe.y - 0.8 + k * 0.6);
    bone(d, a, b, w, k < 0 ? mix(color, SHADOW, 0.25) : color, 0.5);
    bone(d, b, pt(toe.x, toe.y - 0.4 + k * 0.45), w * 0.75, color, 0.4);
  }
}

/** The neck: three vertebrae stacked from the skull's base down to the shoulders. */
export function neck(d: Draw): void {
  for (let i = 0; i < 3; i++) {
    const c = pt(2.2 - i * 0.25, -62.6 + i * 1.3);
    paint(d, ovalAt(c, 1.15, 0.7, -0.15), mix(C.bone, SHADOW, 0.2), { shadow: 0.6, line: 0.4, hatch: 0 });
  }
}

/** The rib cage in three-quarter view: dark hollow, spine behind, ribs arching forward to the breastbone, collarbones over the top. */
export function ribcage(d: Draw): void {
  const hollow = blob([pt(-4.4, -57.2), pt(1, -58.4), pt(5.2, -56.6), pt(5.4, -51), pt(3.8, -46.8), pt(-0.6, -45.6), pt(-3.8, -47), pt(-5, -52)], 4);
  dab(d, hollow, UMBER, 0.72, 0.7);
  // The spine down the back of the cage, and on down to the pelvis.
  for (let y = -57; y < -38.8; y += 1.75) {
    const x = -3.6 + Math.max(0, y + 46) * 0.12;
    const v = ovalAt(pt(x, y), 1.15, 0.75, 0.1, 12);
    // The vertebrae inside the cage sit in its shadow: a dull tone and a line; those below it are painted in full.
    if (y < -46) {
      d.pen.fill(v, mix(C.bone, SHADOW, 0.45), 1);
      d.pen.stroke([...v, v[0]!], 0.25, d.ink, 0.7, false);
    } else paint(d, v, C.bone, { shadow: 0.6, line: 0.38, hatch: 0 });
  }
  for (let i = 6; i >= 0; i--) {
    const y0 = -56.2 + i * 1.55;
    const end = i < 5 ? pt(4.6 - i * 0.04, -55.4 + i * 1.35) : pt(2.4 - (i - 5) * 1.8, -47.4 + (i - 5) * 0.4);
    const rib = bezier(pt(-3.4, y0), pt(1.4 - i * 0.2, y0 - 1.9 + i * 0.12), end, 12);
    paint(d, roundTube(rib, (u) => 1.05 - u * 0.35), i % 2 ? mix(C.bone, SHADOW, 0.08) : C.bone, { shadow: 0.6, line: 0.42, hatch: 0 });
    gleam(d, rib.slice(2, 8).map((p) => pt(p.x - 0.1, p.y - 0.28)), 0.28, 0.45);
  }
  // The breastbone and the cartilage's line down to the lowest ribs.
  bone(d, pt(4.8, -57), pt(4.5, -49.6), 1.05, C.bone, 0.35);
  d.pen.hair(bezier(pt(4.4, -49.4), pt(4, -47.6), pt(2.4, -47.2), 6), 0.35, d.ink, 0.6);
  bone(d, pt(4.4, -57.4), pt(-2.6, -58.4), 0.85, C.bone, 0.5);
}

/** The pelvis, the cracked belt and the rusted mail skirt hung from it, a strip of old cloth over the front. */
export function hips(d: Draw): void {
  const pelvis = blob([pt(-4.8, -40.6), pt(-0.6, -41.2), pt(4.6, -40), pt(5.4, -37), pt(3, -34.4), pt(-0.4, -34), pt(-3.8, -35), pt(-5.4, -37.6)], 4);
  paint(d, pelvis, C.bone, { shadow: 0.7, line: 0.5, hatch: 0.2 });
  const hem = tatters(pt(7, -28.6), pt(-6.8, -29.4), 6, 2.2, 13);
  const mail = [pt(-6.4, -38.4), pt(-0.4, -39.4), pt(6.4, -38.2), pt(7.2, -33), ...hem, pt(-6.8, -33.6)];
  paint(d, mail, mix(C.iron, SHADOW, 0.15), { shadow: 0.8, line: 0.55, hatch: 0.18 });
  d.pen.clipped(mail, () => {
    // Rust bleeding down from the belt and pooled in the hem, then the rings: a fine glitter of lit links, densest toward the light.
    dab(d, ovalAt(pt(-3, -31), 3.4, 2), C.rust, 0.6, 0.7);
    dab(d, ovalAt(pt(3.6, -35.6), 2.6, 1.6), C.rust, 0.45, 0.6);
    d.pen.stipple(mail, 120, (x, y) => 0.25 + 0.55 * Math.max(0, Math.min(1, (2 - x) / 9)) * (y < -31 ? 1 : 0.6), 0.2, mix(C.steel, '#f3e2b8', 0.25));
    d.pen.stipple(mail, 36, () => 0.6, 0.22, C.rustLit);
    for (const x of [-4, -0.6, 3.4]) d.pen.hair([pt(x, -37), pt(x + 0.3, -33), pt(x - 0.2, -29.6)], 0.3, UMBER, 0.6);
  });
  const strip = [pt(1.4, -38.6), pt(4.8, -38.4), pt(5, -30), ...tatters(pt(5.2, -26.4), pt(1.2, -26.2), 2, 2.6, 5)];
  paint(d, strip, mix(C.paint, '#3a2a1e', 0.35), { shadow: 0.75, line: 0.45, hatch: 0.22 });
  folds(d, [[pt(2.8, -37.4), pt(3, -27.4)]], C.paint, 0.4, 0.7);
  const belt = roundTube([pt(-6.6, -38.4), pt(-0.4, -39.6), pt(6.8, -38.2)], () => 1.5);
  paint(d, belt, C.leather, { shadow: 0.55, line: 0.45, hatch: 0 });
  paint(d, [pt(-1.6, -40.4), pt(0.6, -40.6), pt(0.8, -38.4), pt(-1.4, -38.2)], C.iron, { shadow: 0.4, line: 0.4, hatch: 0, gloss: true });
  d.pen.hair([pt(3.8, -39.6), pt(4.2, -38.2)], 0.35, d.ink, 0.8);
}

/** The round shield on the far arm, turned a little away: dark planks, a faded oxblood band, an iron rim and boss, split by a crack. */
export function shield(d: Draw, c: Pt): void {
  const rim = ovalAt(c, 8, 11.8, -0.1, 28);
  const bitten = rim.map((p, i) => (i >= 19 && i <= 21 ? pt(c.x + (p.x - c.x) * 0.84, c.y + (p.y - c.y) * 0.84) : p));
  paint(d, bitten, C.iron, { shadow: 0.7, line: 0.65, hatch: 0.2, gloss: true });
  const face = ovalAt(pt(c.x + 0.2, c.y), 6.7, 10.3, -0.1, 28).map((p, i) => (i >= 19 && i <= 21 ? pt(c.x + (p.x - c.x) * 0.9, c.y + (p.y - c.y) * 0.9) : p));
  paint(d, face, C.wood, { shadow: 0.7, line: 0.4, hatch: 0.2 });
  d.pen.clipped(face, () => {
    paint(d, [pt(c.x - 9, c.y - 2.6), pt(c.x + 9, c.y - 4.4), pt(c.x + 9, c.y + 0.8), pt(c.x - 9, c.y + 2.6)], C.paint, { shadow: 0.6, line: 0, hatch: 0, alpha: 0.8 });
    for (const x of [-3.4, 0.2, 3.6]) d.pen.hair([pt(c.x + x + 1, c.y - 12), pt(c.x + x - 1, c.y + 12)], 0.3, UMBER, 0.75);
    d.pen.stipple(face, 60, () => 0.5, 0.28, mix(C.wood, '#000000', 0.4));
  });
  paint(d, ovalAt(pt(c.x + 0.6, c.y - 0.4), 2.4, 3.2, -0.1), C.iron, { shadow: 0.6, line: 0.5, hatch: 0, gloss: true });
  dab(d, ovalAt(pt(c.x + 1.4, c.y + 0.9), 1.6, 2), C.rust, 0.6, 0.5);
  for (const k of [3, 9, 15, 24]) stud(d, rim[k]!, 0.42, C.steel);
  d.pen.stroke([pt(c.x - 1.6, c.y - 9.6), pt(c.x - 0.4, c.y - 6.8), pt(c.x - 2, c.y - 4.6), pt(c.x - 1, c.y - 2.6), pt(c.x - 1.8, c.y + 1)], 0.5, UMBER, 0.95, false);
  d.pen.hair([pt(c.x - 2, c.y - 4.6), pt(c.x - 4.4, c.y - 3.4)], 0.3, UMBER, 0.85);
  gleam(d, [pt(c.x - 6.8, c.y + 2), pt(c.x - 7.1, c.y - 4), pt(c.x - 5.2, c.y - 9.4)], 0.55, 0.7);
  gleam(d, [pt(c.x - 0.6, c.y - 2.6), pt(c.x - 0.1, c.y - 3.2)], 0.4, 0.8);
}

/** The sword, from its pommel up past the guard to the point: a notched, rust-bitten blade of dark steel. */
export function sword(d: Draw, hand: Pt, dir: Pt, len: number): void {
  const at = (k: number, side = 0): Pt => pt(hand.x + dir.x * k - dir.y * side, hand.y + dir.y * k + dir.x * side);
  const k = len / 30;
  const blade = [at(2.6, -1.4), at(20 * k, -1.25), at(27 * k, -0.4), at(len, 0), at(27.4 * k, 0.5), at(16.4 * k, 1.35), at(15.6 * k, 0.8), at(14.6 * k, 1.45), at(7.2 * k, 1.45), at(6.4 * k, 0.9), at(5.6 * k, 1.45), at(2.6, 1.45)];
  paint(d, blade, C.steel, { shadow: 0.65, line: 0.55, hatch: 0.14, gloss: true });
  d.pen.clipped(blade, () => {
    dab(d, ovalAt(at(9, 0.5), 2.6, 1.2, Math.atan2(dir.y, dir.x)), C.rust, 0.65, 0.5);
    dab(d, ovalAt(at(18, 0.8), 3.4, 1, Math.atan2(dir.y, dir.x)), C.rust, 0.55, 0.5);
    d.pen.stipple(blade, 50, () => 0.5, 0.22, C.rustLit);
  });
  d.pen.hair([at(3.4, -0.1), at(len * 0.74, -0.15)], 0.3, mix(C.steel, SHADOW, 0.6), 0.85);
  gleam(d, [at(4, -0.8), at(len * 0.8, -0.7)], 0.38, 0.95, '#f3e2b8');
  paint(d, roundTube([at(2.4, -4), at(2.2, 0), at(2.4, 4)], () => 1.35), C.iron, { shadow: 0.55, line: 0.45, hatch: 0, gloss: true });
  paint(d, roundTube([at(-3.6), at(1.6)], () => 1.5), C.grip, { shadow: 0.5, line: 0.4, hatch: 0 });
  paint(d, ovalAt(at(-4.3), 1.25, 1.25), C.iron, { shadow: 0.5, line: 0.4, hatch: 0, gloss: true });
}

/** The skull, three-quarter profile: deep dark sockets under a heavy brow, the nose's hollow, teeth, the jaw on its hinge. */
export function skull(d: Draw, jawOpen: number): void {
  if (jawOpen > 0.01) d.pen.fill([pt(5, -65.8), pt(9.2, -65.6), turn(pt(9.2, -64), JAW_HINGE, jawOpen), turn(pt(5, -64), JAW_HINGE, jawOpen)], C.socket, 1);
  within(d.pen.ctx, xf(JAW_HINGE, jawOpen), () => jaw(d));
  cranium(d);
}

const teeth = (d: Draw, x0: number, x1: number, y: number, h: number): void => {
  for (let x = x0; x < x1; x += 0.72) paint(d, [pt(x - 0.3, y), pt(x + 0.3, y), pt(x + 0.22, y + h), pt(x - 0.22, y + h)], C.bone, { shadow: 0.25, line: 0.2, hatch: 0 });
};

function jaw(d: Draw): void {
  // The mandible: the ramus down from the hinge, the angle, the long body forward to a square chin.
  const shape = blob([pt(2.4, -66.4), pt(3.8, -66.2), pt(4.6, -65.2), pt(9, -65.1), pt(9.4, -64), pt(8.8, -63), pt(5.6, -63.2), pt(3.4, -63.4), pt(2.6, -64.4)], 4);
  paint(d, shape, mix(C.bone, SHADOW, 0.12), { shadow: 0.75, line: 0.5, hatch: 0.22 });
  d.pen.fill(blob([pt(3.4, -65.4), pt(4.4, -65), pt(4.2, -64), pt(3.2, -64.2)], 3), mix(C.boneDeep, SHADOW, 0.3), 0.6);
  teeth(d, 5.8, 9.1, -65.2, 0.7);
}

function cranium(d: Draw): void {
  const shape = blob([pt(-1.4, -69.2), pt(-0.6, -72.2), pt(2.2, -73.9), pt(5.6, -73.8), pt(7.9, -72.4), pt(8.9, -70.4), pt(9.4, -69.2), pt(8.9, -68.6), pt(9.5, -67.4), pt(9.7, -66.2), pt(9.3, -65.3), pt(6, -65.4), pt(4.6, -66), pt(3, -65.6), pt(-0.6, -66.6)], 4);
  paint(d, shape, C.bone, { shadow: 0.75, line: 0.6, hatch: 0.26, cross: true });
  d.pen.clipped(shape, () => {
    // The temple's hollow, the gaunt shadow under the cheekbone, age in the bone.
    dab(d, ovalAt(pt(3.4, -68.8), 2, 1.5, 0.3), mix(C.boneDeep, SHADOW, 0.25), 0.6, 0.6);
    d.pen.fill([pt(4.2, -66.6), pt(8.6, -66.4), pt(9.6, -65.3), pt(4.6, -65.6)], mix(C.boneDeep, SHADOW, 0.45), 0.55);
    d.pen.stipple(shape, 50, (_, y) => (y > -69 ? 0.6 : 0.25), 0.22, C.stain);
  });
  teeth(d, 6.1, 9.4, -66, 0.75);
  // The cheekbone: a lit bar of bone under the socket, arching back toward the ear.
  d.pen.hair(bezier(pt(2.6, -66.6), pt(4.6, -67.3), pt(7.6, -66.7), 6), 0.3, d.ink, 0.75);
  gleam(d, [pt(5, -67.2), pt(6.6, -67.3), pt(8, -66.9)], 0.42, 0.75);
  // The sockets: deep, angular and dark under the brow; the far one a sliver past the bridge. A dull ember far back in the near one.
  const near = blob([pt(4.9, -69.6), pt(6.4, -70.3), pt(8.1, -69.7), pt(8.3, -68.1), pt(7.2, -67.4), pt(5.4, -67.8)], 4);
  const far = blob([pt(8.9, -69.9), pt(9.4, -69.4), pt(9.3, -68.1), pt(8.8, -68.3)], 3);
  for (const s of [near, far]) paint(d, s, C.socket, { shadow: 0, line: 0.35, hatch: 0, alpha: 1 });
  d.pen.dot(6.9, -68.7, 0.4, C.ember, 0.4);
  // The brow ridge, lit and overhanging; the nose's dark hollow; a crack across the crown.
  d.pen.stroke([pt(4.6, -70.3), pt(6.6, -71), pt(8.6, -70.4)], 0.5, '#e9dfc6', 0.65, false);
  paint(d, [pt(8.8, -67.9), pt(9.6, -66.4), pt(8.4, -66.3)], C.socket, { shadow: 0, line: 0.25, hatch: 0, alpha: 1 });
  d.pen.hair([pt(1.2, -73.6), pt(1.8, -72.2), pt(1.2, -71.2), pt(1.6, -70.2)], 0.28, d.ink, 0.8);
  gleam(d, [pt(-0.6, -70.8), pt(0.6, -72.8), pt(3.4, -73.7)], 0.5, 0.5);
}
