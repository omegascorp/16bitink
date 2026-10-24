import { closed, makeDraw, oval, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { chain, limb, tufted } from './beastFur';
import { dab, finished, gleam, groundShadow, paint, SHADOW } from './beastPaint';
import { apply, chainOf, place, posed, reach, rotateAbout, scaleAbout, translate, turn, type Affine } from './beastRig';
import { bareFoot, facets, fist, vein } from './ogreForm';
import { CLUB, OGRE, ogreClub, ogreFist, ogreHead } from './ogreParts';
import { FAR_FIST, FEET, HIP, NEAR_FIST, ogrePose, type FootPose, type OgrePose } from './ogreRig';
import type { CreatureDrawer } from './types';

/**
 * The Ogre, chapter one's bridge boss: a hulking brute ~92 tall, a great
 * hump of back and shoulder with a small bald head thrust forward and sunk
 * low between them, a slab of chest over a heavy gut, thick short legs.
 * Dirty mottled olive-grey hide modelled hard in the late light; crude gear of
 * hide and iron: a studded strap across the chest, an iron plate lashed to
 * the near shoulder, an iron cuff, a hide loincloth under a broad belt with
 * an iron buckle, bare clawed feet. A great spiked club over the near
 * shoulder. Origin on the ground between its feet, facing right.
 *
 * Posed by ogreRig: the legs reach from the hips to the feet by IK, the
 * upper body leans about the hips and heaves with breath, the arms reach
 * for the fists by IK and the club turns in the near fist.
 */
const SEED = 5000;

/** The trunk: hump of trapezius, slab of chest, gut, the lats and the small of the back, each a plane meeting the next at a dent. */
const TORSO: Pt[] = facets(
  [pt(4, -90), pt(15, -83), pt(22, -77.4), pt(34.6, -69), pt(35.8, -62.4), pt(37.2, -52), pt(34.4, -42), pt(22, -37.6), pt(-12, -37), pt(-22, -39), pt(-27, -45), pt(-33.4, -55), pt(-36, -66.6), pt(-33.6, -75), pt(-26.6, -86), pt(-14, -93.4), pt(-3, -93.6)],
  [0.08, 0.05, 0.1, 0.06, 0.1, 0.12, 0.08, 0.02, 0.02, 0.08, 0.1, 0.08, -0.05, 0.12, 0.1, 0.06, 0.06],
);
const PEC: Pt[] = facets([pt(8, -77), pt(20, -76.4), pt(30, -72.6), pt(35, -65.4), pt(31, -60.6), pt(19, -59.4), pt(9, -62), pt(7, -70)], [0.08, 0.06, 0.08, 0.05, 0.04, 0.06, 0.08, 0.06]);
const GUT: Pt[] = facets([pt(9, -61), pt(22, -63), pt(33, -60), pt(37.4, -52), pt(36.6, -44), pt(31, -38), pt(20, -37.6), pt(9, -39.6), pt(5, -46), pt(5, -55)], 0.1);
/** The far shoulder, a mass of muscle rising beside the head. */
const FAR_DELT: Pt[] = facets([pt(18, -74), pt(22, -81.4), pt(31, -82.6), pt(36.8, -75), pt(37.6, -66), pt(31.4, -59.8), pt(24, -60.4), pt(18.4, -66)], 0.1);

/** Fixed blotches of the mottled hide: x, y, size. */
const BLOTCHES = [[-24, -78, 3.4], [-12, -70, 2.6], [-28, -56, 3], [-18, -46, 2.4], [-4, -84, 2.2], [2, -60, 2], [-8, -52, 1.8], [14, -48, 2.4], [26, -44, 2], [30, -54, 1.6]] as const;

const shifted = (shape: readonly Pt[], dx: number, dy: number): Pt[] => shape.map((q) => pt(q.x + dx, q.y + dy));

/** Deep hatched core shadow: `band` darkened and hatched, inside `clip`. */
function coreShadow(d: Draw, clip: readonly Pt[], band: readonly Pt[], alpha: number): void {
  d.pen.clipped(clip, () => {
    dab(d, band, SHADOW, alpha, 0.9);
    d.pen.hatch(band, 1.25, 0.9, 0.36, { color: d.ink, alpha: 0.5 });
  });
}

/** The body: a hump of back and trapezius, the far shoulder, a slab of chest and the gut, each mass modelled in washes and hatching. */
function torso(d: Draw, breath: number): void {
  paint(d, TORSO, mix(OGRE.skin, SHADOW, 0.12), { shadow: 0.95, hatch: 0.4, cross: true, line: 0 });
  d.pen.clipped(TORSO, () => {
    // The head's shadow cast down onto the chest.
    dab(d, oval(24, -68, 9, 4, 14), SHADOW, 0.65, 1.4);
    // The sun on the top of the hump and the upper back; the lower back and loins turned into shadow.
    dab(d, oval(-16, -88, 12, 5, 16), OGRE.skinLit, 0.75, 2);
    dab(d, oval(-31, -70, 3.4, 8, 14), OGRE.skinLit, 0.4, 1.6);
    dab(d, [pt(-38, -60), pt(-26, -52), pt(-10, -46), pt(8, -46), pt(8, -34), pt(-38, -34)], SHADOW, 0.7, 2.2);
    for (const [x, y, r] of BLOTCHES) dab(d, oval(x, y, r * 1.4, r, 12), OGRE.mottle, 0.7, 0.8);
    for (const [x, y, r] of [[-20, -64, 2.4], [-6, -76, 1.8], [-26, -46, 2]] as const) dab(d, oval(x, y, r * 1.5, r, 12), OGRE.ochre, 0.45, 0.8);
    d.pen.stipple(TORSO, 160, (_, y) => (y > -70 ? 0.6 : 0.3), 0.3, OGRE.skinDeep);
  });
  d.pen.stroke(closed(TORSO), 0.55, d.ink, 0.9);
  // The spine's furrow down the hump, the shoulder blade and the lats under the hide of the back.
  d.pen.hair(chain(pt(-14, -91), [pt(-24, -86), pt(-30, -78), pt(-32, -68)]), 0.36, d.ink, 0.6);
  d.pen.hair(chain(pt(-26, -76), [pt(-21, -68), pt(-19, -61), pt(-22, -53)]), 0.36, d.ink, 0.55);
  d.pen.hair(chain(pt(-30, -60), [pt(-26, -54), pt(-20, -50), pt(-12, -48)]), 0.3, d.ink, 0.5);
  paint(d, FAR_DELT, mix(OGRE.skin, SHADOW, 0.15), { shadow: 0.85, hatch: 0.4, cross: true, line: 0.45, lineAlpha: 0.8 });
  d.pen.clipped(FAR_DELT, () => dab(d, oval(26, -79.4, 6, 2.2, 12), OGRE.skinLit, 0.55, 1));
  paint(d, PEC, OGRE.skin, { shadow: 0.85, hatch: 0.4, line: 0.45, lineAlpha: 0.8 });
  d.pen.clipped(PEC, () => dab(d, oval(17, -72.6, 7, 2.4, 12), OGRE.skinLit, 0.6, 1));
  // The far shoulder's shadow on the chest.
  coreShadow(d, PEC, shifted(FAR_DELT, 1.2, 3), 0.55);
  // The gut swells forward and out with each breath.
  posed(d, scaleAbout(pt(6, -40), 1 + 0.045 * breath, 1 + 0.03 * breath), () => {
    paint(d, GUT, OGRE.skin, { shadow: 0.95, hatch: 0.4, cross: true, line: 0.5 });
    d.pen.clipped(GUT, () => {
      dab(d, oval(14, -54, 6, 3, 16), OGRE.skinLit, 0.5, 1.4);
      for (const [x, y, r] of [[24, -50, 2], [12, -44, 1.6], [32, -46, 1.4]] as const) dab(d, oval(x, y, r * 1.4, r, 10), OGRE.mottle, 0.6, 0.6);
      d.pen.stipple(GUT, 90, (_, y) => (y > -50 ? 0.6 : 0.25), 0.28, OGRE.skinDeep);
      d.pen.hair([pt(8, -52), pt(18, -53.6), pt(30, -52)], 0.3, d.ink, 0.45);
    });
    // Deep shadow under the slab of chest, and under the hang of the gut.
    coreShadow(d, GUT, shifted(PEC, 1.2, 3.2), 0.8);
    coreShadow(d, GUT, [pt(38, -50), pt(39, -36), pt(8, -36), pt(20, -41), pt(32, -45)], 0.75);
    d.pen.hair([pt(29, -47.6), pt(30, -46.6), pt(31, -47.4)], 0.4, d.ink, 0.75);
  });
  strap(d);
}

/** A broad hide strap from the near shoulder across the chest to the belt, studded with iron. */
function strap(d: Draw): void {
  const top = chain(pt(-2, -89), [pt(6, -78), pt(18, -58), pt(26, -38)]);
  const bot = chain(pt(32, -38.6), [pt(24, -58), pt(12, -78), pt(5, -90)]);
  const band = [...top, ...bot];
  paint(d, band, OGRE.belt, { shadow: 0.7, hatch: 0.15, line: 0.4 });
  d.pen.hair(top.map((p) => pt(p.x + 1, p.y)), 0.25, OGRE.hideLight, 0.45);
  for (const k of [0.25, 0.45, 0.65, 0.85]) {
    const a = top[Math.round(k * (top.length - 1))]!;
    const b = bot[Math.round((1 - k) * (bot.length - 1))]!;
    const c = pt((a.x + b.x) / 2, (a.y + b.y) / 2);
    d.pen.dot(c.x, c.y, 0.75, OGRE.iron, 1);
    d.pen.dot(c.x - 0.25, c.y - 0.3, 0.26, OGRE.ironLit, 0.55);
  }
}

/** A thick leg from under the loincloth to the ankle: a heavy thigh, a knob of knee, the shin's hard edge, a bulging calf. */
function leg(d: Draw, joints: readonly Pt[], widths: readonly number[], far: boolean): void {
  const [h0, k0, a0] = joints as [Pt, Pt, Pt];
  const l = dist(k0, a0) || 1;
  // The calf swells out behind the shin a little below the knee.
  const calf = pt(k0.x + (a0.x - k0.x) * 0.36 - ((a0.y - k0.y) / l) * 2.2, k0.y + (a0.y - k0.y) * 0.36 + ((a0.x - k0.x) / l) * 2.2);
  const shape = limb([h0, k0, calf, a0], [widths[0]!, widths[1]! * 0.92, widths[1]! * 1.18, widths[2]!]);
  const skin = far ? mix(OGRE.skin, SHADOW, 0.4) : OGRE.skin;
  paint(d, shape, skin, { shadow: 0.95, hatch: 0.42, cross: true, line: 0.5 });
  const fwd = (q: Pt, k: number): Pt => pt(q.x + ((a0.y - k0.y) / l) * k, q.y - ((a0.x - k0.x) / l) * k);
  d.pen.clipped(shape, () => {
    if (!far) dab(d, oval(h0.x + (k0.x - h0.x) * 0.4 - 3, h0.y + (k0.y - h0.y) * 0.4, 3.4, 5, 12), OGRE.skinLit, 0.45, 1);
    // The calf's back in shadow, a blotch on the shin.
    dab(d, oval(calf.x - 3.4, calf.y + 1, 3, 5, 12), SHADOW, 0.55, 1);
    dab(d, oval(calf.x + 2, calf.y + 3, 2, 2.6, 10), OGRE.mottle, 0.6, 0.6);
  });
  // The kneecap, a hard knob catching light.
  const cap = fwd(k0, widths[1]! * 0.32);
  const knee = facets([pt(cap.x - 2.6, cap.y - 2.4), pt(cap.x + 1.6, cap.y - 2.8), pt(cap.x + 2.6, cap.y + 0.6), pt(cap.x + 0.4, cap.y + 3), pt(cap.x - 2.6, cap.y + 1.4)], 0.12);
  dab(d, knee, mix(skin, OGRE.skinLit, 0.5), 0.55, 0.7);
  d.pen.hair(knee.slice(Math.floor(knee.length * 0.4)), 0.32, d.ink, 0.5);
  // The shin's ridge down the front, the tendon above the heel.
  d.pen.hair([fwd(pt(k0.x + (a0.x - k0.x) * 0.2, k0.y + (a0.y - k0.y) * 0.2), widths[1]! * 0.3), fwd(pt(k0.x + (a0.x - k0.x) * 0.85, k0.y + (a0.y - k0.y) * 0.85), widths[2]! * 0.25)], 0.34, d.ink, 0.6);
  d.pen.hair([fwd(pt(k0.x + (a0.x - k0.x) * 0.55, k0.y + (a0.y - k0.y) * 0.55), -widths[2]! * 0.3), fwd(a0, -widths[2]! * 0.32)], 0.3, d.ink, 0.5);
}

/** A bare foot, splayed and clawed, a hide thong round the ankle. */
function foot(d: Draw, x: number, far: boolean): void {
  const dim = (c: string): string => (far ? mix(c, SHADOW, 0.4) : c);
  bareFoot(d, x, dim(OGRE.skin), dim(OGRE.skinLit), dim(OGRE.nail), dim(OGRE.belt));
}

/** The loincloth: a dark hide skirt with a ragged hem, dappled, its front flap hanging longer. */
function loincloth(d: Draw, flap: number): void {
  // The skirt's hem trails the swing a little; the front flap swings freely from the belt.
  const swing: Affine = [1, 0, -0.3 * flap, 1, -0.3 * flap * 38, 0];
  posed(d, swing, () => skirt(d));
  posed(d, rotateAbout(pt(16, -38), -flap), () => frontFlap(d));
}

function skirt(d: Draw): void {
  const hem = tufted(chain(pt(28, -28), [pt(14, -26), pt(-8, -25.4), pt(-29, -29.4)]), { len: 2.4, every: 3, rake: pt(-0.2, 0.6), side: 1, seed: SEED + 1, skip: 0.3 });
  const skirt = [pt(-30.6, -40), ...chain(pt(-30.6, -40), [pt(-10, -38.4), pt(12, -38), pt(30.6, -39)]).slice(1), pt(31.2, -34), ...hem, pt(-31.2, -35)];
  paint(d, skirt, OGRE.hide, { shadow: 0.85, hatch: 0.36, cross: true, line: 0.45 });
  d.pen.clipped(skirt, () => {
    for (const [x, y, r] of [[-18, -30, 2.2], [-6, -27, 1.6], [4, -32, 2], [-24, -26, 1.4], [16, -28, 1.8], [-12, -35, 1.3]] as const) {
      dab(d, oval(x, y, r * 1.3, r, 10), OGRE.hideSpot, 0.75, 0.5);
    }
    // Folds hanging from the belt.
    for (const x of [-21, -10, 2]) d.pen.hair([pt(x, -36), pt(x - 0.6, -29), pt(x + 0.4, -23)], 0.32, d.ink, 0.55);
  });
}

function frontFlap(d: Draw): void {
  const flap = [pt(10, -38), pt(23, -38.4), ...tufted([pt(23.6, -19), pt(9.4, -18.2)], { len: 1.8, every: 2.6, rake: pt(0, 0.6), side: 1, seed: SEED + 2 }), pt(9.4, -18.2)];
  const flapShape = [flap[0]!, flap[1]!, pt(24, -29), ...flap.slice(2)];
  paint(d, flapShape, mix(OGRE.hide, OGRE.hideLight, 0.3), { shadow: 0.75, hatch: 0.2, line: 0.45 });
  d.pen.clipped(flapShape, () => dab(d, oval(14, -24, 2.4, 1.8, 10), OGRE.hideSpot, 0.65, 0.5));
  for (let y = -34; y < -20; y += 2.6) d.pen.hair([pt(11.2, y), pt(11.6, y + 1.2)], 0.3, d.ink, 0.6);
}

/** The broad belt over the loincloth, a crude square iron buckle at the front. */
function belt(d: Draw): void {
  const top = chain(pt(-31.6, -43.6), [pt(-10, -41.8), pt(14, -41.4), pt(32.6, -43.2)]);
  const bot = chain(pt(32, -36.4), [pt(14, -35), pt(-10, -35.4), pt(-31.2, -37)]);
  const band = [...top, ...bot];
  paint(d, band, OGRE.belt, { shadow: 0.75, hatch: 0.2, line: 0.45 });
  d.pen.hair(top.map((p) => pt(p.x, p.y + 1.1)), 0.25, OGRE.hideLight, 0.4);
  for (let x = -27; x < 16; x += 3.6) d.pen.dot(x, -39.4 + Math.abs(x) * 0.012, 0.3, OGRE.ironLit, 0.35);
  const buckle = [pt(17, -44.4), pt(26, -44.8), pt(26.4, -33.8), pt(17.2, -33.6)];
  paint(d, buckle, OGRE.iron, { gloss: true, shadow: 0.7, hatch: 0, line: 0.45 });
  const hole = [pt(19.2, -42.2), pt(24, -42.4), pt(24.2, -36), pt(19.4, -35.8)];
  d.pen.fill(hole, OGRE.belt, 1);
  d.pen.stroke([pt(19.4, -39), pt(25.2, -39.2)], 0.65, mix(OGRE.iron, OGRE.ironLit, 0.35), 1, false);
  gleam(d, [pt(17.8, -43.6), pt(22, -43.9)], 0.35, 0.7);
}

const SHOULDER = pt(-11, -74);
const ELBOW = pt(-6, -50);
const WRIST = pt(13, -58.6);
const FAR_SHOULDER = pt(16, -68);
const FAR_ELBOW = pt(29, -50);
const FAR_WRIST = pt(36.8, -29);
const dist = (a: Pt, b: Pt): number => Math.hypot(b.x - a.x, b.y - a.y);
const angle = (a: Pt, b: Pt): number => Math.atan2(b.y - a.y, b.x - a.x);

interface Arm {
  readonly shoulder: Pt;
  readonly elbow: Pt;
  readonly wrist: Pt;
  /** How far the forearm (and so the fist) has turned from rest. */
  readonly turn: number;
}

/** An arm reaching from its shoulder to a fist by IK, the elbow bowed `toward`. */
function arm(shoulder: Pt, fist: Pt, rest: readonly [Pt, Pt, Pt, Pt], toward: Pt): Arm {
  const [s0, e0, w0, f0] = rest;
  const r = reach(shoulder, pt(fist.x + w0.x - f0.x, fist.y + w0.y - f0.y), dist(s0, e0), dist(e0, w0), toward);
  return { shoulder, elbow: r.mid, wrist: r.end, turn: angle(r.mid, r.end) - angle(e0, w0) };
}

/** A point `k` of the way along a→b, pushed `side` units off it (+ to the left of travel). */
function along(a: Pt, b: Pt, k: number, side: number): Pt {
  const l = dist(a, b) || 1;
  return pt(a.x + (b.x - a.x) * k + ((b.y - a.y) / l) * side, a.y + (b.y - a.y) * k - ((b.x - a.x) / l) * side);
}

/** The near arm: a great shoulder under a lashed iron plate, the upper arm down to the elbow, the forearm up to the fist on the club. */
function nearArm(d: Draw, a: Arm): void {
  const upper = limb([a.shoulder, along(a.shoulder, a.elbow, 0.3, 0.4), along(a.shoulder, a.elbow, 0.62, 1.6), a.elbow], [22, 20.6, 19.6, 14]);
  const fore = limb([a.elbow, along(a.elbow, a.wrist, 0.26, 1.4), along(a.elbow, a.wrist, 0.62, 0.6), a.wrist], [15, 17.6, 14, 10.4]);
  // The arm's shadow thrown down and away across the body.
  d.pen.clipped(TORSO, () => {
    for (const part of [upper, fore]) dab(d, shifted(part, 2.6, 3.4), SHADOW, 0.6, 1.2);
  });
  paint(d, upper, OGRE.skin, { shadow: 0.9, hatch: 0.42, cross: true, line: 0.5 });
  d.pen.clipped(upper, () => {
    // The biceps lit in front, the triceps' mass behind falling into shadow, split by a dent.
    const bi = along(a.shoulder, a.elbow, 0.58, 4);
    dab(d, oval(bi.x, bi.y, 3.4, 5, 12), OGRE.skinLit, 0.45, 0.9);
    dab(d, [along(a.shoulder, a.elbow, 0.25, -10), along(a.shoulder, a.elbow, 0.95, -8), along(a.shoulder, a.elbow, 0.95, -2.4), along(a.shoulder, a.elbow, 0.25, -3.4)], SHADOW, 0.55, 1);
    const m = along(a.shoulder, a.elbow, 0.45, -4);
    dab(d, oval(m.x, m.y, 2.6, 1.8, 10), OGRE.mottle, 0.7, 0.6);
  });
  d.pen.hair([along(a.shoulder, a.elbow, 0.32, -0.6), along(a.shoulder, a.elbow, 0.62, -1.6), along(a.shoulder, a.elbow, 0.95, -1)], 0.38, d.ink, 0.65);
  vein(d, along(a.shoulder, a.elbow, 0.4, 5), along(a.shoulder, a.elbow, 0.92, 4.4), 0.7, OGRE.vein, OGRE.skinLit);
  // The deltoid rides on the shoulder, turning a little with the upper arm; an iron plate lashed over it.
  const swing = (angle(a.shoulder, a.elbow) - angle(SHOULDER, ELBOW)) * 0.35;
  posed(d, place(SHOULDER, a.shoulder, swing), () => {
    const delt = facets([pt(-25, -79), pt(-21.4, -89), pt(-11, -93.4), pt(-1, -87.4), pt(2.6, -77), pt(0, -68), pt(-6, -61.4), pt(-14.4, -60.6), pt(-21.6, -66.4)], 0.1);
    paint(d, delt, OGRE.skin, { shadow: 0.9, hatch: 0.4, cross: true, line: 0.5 });
    d.pen.clipped(delt, () => {
      dab(d, oval(-6, -69, 4, 3, 12), OGRE.mottle, 0.65, 0.8);
      dab(d, oval(-16, -72, 4, 6, 12), OGRE.skinLit, 0.35, 1);
    });
    // The dent between the deltoid's front and rear heads.
    d.pen.hair([pt(-9, -80), pt(-8.4, -72), pt(-9.6, -63)], 0.36, d.ink, 0.6);
    pauldron(d);
  });
  paint(d, fore, OGRE.skin, { shadow: 0.85, hatch: 0.4, cross: true, line: 0.5 });
  d.pen.clipped(fore, () => {
    const lit = along(a.elbow, a.wrist, 0.35, 4.6);
    dab(d, oval(lit.x, lit.y, 5, 2, 12), OGRE.skinLit, 0.55, 0.8);
    dab(d, [along(a.elbow, a.wrist, 0, -9), along(a.elbow, a.wrist, 1, -6), along(a.elbow, a.wrist, 1, -2), along(a.elbow, a.wrist, 0, -3)], SHADOW, 0.5, 1);
  });
  // The flexor's edge and the thick veins winding over the forearm.
  d.pen.hair([along(a.elbow, a.wrist, 0.1, -1), along(a.elbow, a.wrist, 0.5, -1.6), along(a.elbow, a.wrist, 0.85, -0.6)], 0.34, d.ink, 0.55);
  vein(d, along(a.elbow, a.wrist, 0.12, 3.6), along(a.elbow, a.wrist, 0.82, 2.6), 0.9, OGRE.vein, OGRE.skinLit);
  vein(d, along(a.elbow, a.wrist, 0.4, 3.8), along(a.elbow, a.wrist, 0.7, 5.2), 0.5, OGRE.vein, OGRE.skinLit);
  // A crude iron cuff round the wrist.
  const l = dist(a.elbow, a.wrist);
  const b0 = along(a.elbow, a.wrist, 1 - 5 / l, 0);
  const b1 = along(a.elbow, a.wrist, 1 - 0.6 / l, 0);
  paint(d, limb([b0, b1], [10.8, 10.2]), OGRE.iron, { gloss: true, shadow: 0.75, hatch: 0, line: 0.42 });
  for (const k of [0.25, 0.75]) {
    const r = along(b0, b1, k, 3.6);
    d.pen.dot(r.x, r.y, 0.42, OGRE.ironLit, 0.8);
  }
  gleam(d, [along(b0, b1, 0.15, 5), along(b0, b1, 0.85, 5)], 0.3, 0.6);
}

/** A rough iron plate over the top of the near shoulder, riveted, lashed on with a hide thong. */
function pauldron(d: Draw): void {
  const plate = chain(pt(-24.6, -79), [pt(-23, -90.6), pt(-6, -93), pt(0.6, -81.6)], [pt(-1, -79.6), pt(-4, -78.6), pt(-7, -79)], [pt(-13, -82), pt(-20, -80.4), pt(-24.6, -79)]);
  paint(d, plate, OGRE.iron, { gloss: true, shadow: 0.85, hatch: 0.18, line: 0.45 });
  d.pen.clipped(plate, () => {
    // Dents and rust in the dark iron.
    dab(d, oval(-8, -84, 3, 1.4, 10), RUST, 0.55, 0.8);
    dab(d, oval(-19, -82, 2, 1, 10), RUST, 0.45, 0.6);
  });
  gleam(d, [pt(-20.6, -87.4), pt(-14, -90.6), pt(-8, -90.4)], 0.4, 0.8);
  for (const [x, y] of [[-21, -82.4], [-13.6, -84.4], [-4.4, -83.2]] as const) {
    d.pen.dot(x, y, 0.5, OGRE.iron, 1);
    d.pen.dot(x - 0.2, y - 0.25, 0.22, OGRE.ironLit, 0.9);
  }
  d.pen.stroke([pt(-16, -80.6), pt(-15, -72), pt(-13, -64)], 0.9, OGRE.belt, 0.95, false);
}

const RUST = '#5a3a22';

/** The far arm hanging long beside the gut, a great fist at the end of it (or up on the club). */
function farArm(d: Draw, a: Arm): void {
  const dim = mix(OGRE.skin, SHADOW, 0.4);
  const shape = limb([a.shoulder, along(a.shoulder, a.elbow, 0.5, 1.4), a.elbow, along(a.elbow, a.wrist, 0.28, 1.4), along(a.elbow, a.wrist, 0.65, 0.4), a.wrist], [17, 16, 12.6, 15, 12.4, 10.4]);
  paint(d, shape, dim, { shadow: 0.85, hatch: 0.4, line: 0.48 });
  d.pen.clipped(shape, () => dab(d, oval(a.elbow.x, a.elbow.y, 3, 2.4, 10), SHADOW, 0.5, 0.8));
  vein(d, along(a.elbow, a.wrist, 0.15, -2.6), along(a.elbow, a.wrist, 0.85, -2), 0.7, mix(OGRE.vein, SHADOW, 0.3), mix(OGRE.skinLit, SHADOW, 0.3));
  posed(d, place(FAR_WRIST, a.wrist, a.turn), () => fist(d, FAR_WRIST, angle(FAR_ELBOW, FAR_WRIST) - Math.PI / 2, dim, mix(OGRE.skinLit, SHADOW, 0.2), 1.05));
}

/** Where a foot's ankle sits: rolled about the toe (heel up) or the heel (toe up) on the ground, or hoisted. */
function ankleOf(x0: number, f: FootPose): Pt {
  const ankle0 = pt(x0 + 5.4, -6);
  const pivot0 = f.lift > 0 ? ankle0 : f.tilt > 0 ? pt(x0 + 17, 0) : pt(x0, 0.8);
  const a = turn(ankle0, pivot0, f.tilt);
  return pt(a.x + f.x - x0, a.y - f.lift);
}

/** A leg from its hip to a posed foot. */
function legTo(d: Draw, hip: Pt, x0: number, rest: readonly [Pt, Pt, Pt], widths: readonly number[], f: FootPose, far: boolean): void {
  const target = ankleOf(x0, f);
  const r = reach(hip, target, dist(rest[0], rest[1]) * 1.03, dist(rest[1], rest[2]) * 1.03, pt(1, 0));
  leg(d, [hip, r.mid, r.end], widths, far);
  posed(d, place(rest[2], r.end, f.tilt), () => foot(d, x0, far));
}

/** The club's blow: cracks and a burst of dust and grit where its head hits, under the figure. */
function impact(d: Draw, at: Pt, k: number): void {
  if (k <= 0) return;
  const g = Math.max(-2, at.y);
  dab(d, oval(at.x - 2, g - 4 * k, 16 * k + 4, 4 + 5 * k, 18), OGRE.hideLight, 0.45 * k, 2.5);
  for (const [a, l] of [[-2.9, 10], [-2.5, 12], [-2.05, 11], [-1.1, 9], [-0.6, 11], [-0.25, 9]] as const) {
    const r0 = 9;
    d.pen.hair([pt(at.x + Math.cos(a) * r0, g + Math.sin(a) * r0 * 0.7), pt(at.x + Math.cos(a) * (r0 + l * k), g + Math.sin(a) * (r0 + l * k) * 0.7)], 0.55, d.ink, 0.75 * k);
  }
  d.pen.hair([pt(at.x - 12, g + 0.8), pt(at.x - 5, g + 1.4), pt(at.x + 1, g + 0.6)], 0.5, d.ink, 0.6 * k);
  d.pen.hair([pt(at.x + 3, g + 1.2), pt(at.x + 9, g + 0.6), pt(at.x + 14, g + 1.4)], 0.5, d.ink, 0.6 * k);
}

interface Rig {
  readonly hips: Affine;
  readonly upper: Affine;
  readonly head: Affine;
  readonly near: Arm;
  readonly far: Arm;
  readonly club: Affine;
  readonly fist: Pt;
}

/** The pose turned into maps: hips, upper body, head and shoulders (raised by breath), arms, club in the fist. */
function rigOf(p: OgrePose): Rig {
  const hips = translate(p.hipX, p.hipY);
  const upper = chainOf(hips, rotateAbout(HIP, p.lean));
  const rise = translate(0, -1.3 * p.breath);
  const head = chainOf(upper, rise, rotateAbout(pt(14, -68), p.nod));
  const shoulders = (q: Pt): Pt => apply(rise, q);
  const near = arm(shoulders(SHOULDER), p.fist, [SHOULDER, ELBOW, WRIST, NEAR_FIST], pt(-0.25 - 0.75 * p.raise, 1 - 1.25 * p.raise));
  const far = arm(shoulders(FAR_SHOULDER), p.farFist, [FAR_SHOULDER, FAR_ELBOW, FAR_WRIST, FAR_FIST], pt(1, 0.2));
  const fist = pt(near.wrist.x + NEAR_FIST.x - WRIST.x, near.wrist.y + NEAR_FIST.y - WRIST.y);
  return { hips, upper, head, near, far, club: place(NEAR_FIST, fist, p.club), fist };
}

function ogre(d: Draw, p: OgrePose, r: Rig): void {
  legTo(d, apply(r.hips, pt(-14, -32)), FEET.far, [pt(-14, -32), pt(-17, -16), pt(-15.6, -6)], [20, 15, 11.4], p.far, true);
  posed(d, r.upper, () => farArm(d, r.far));
  legTo(d, apply(r.hips, pt(10, -32)), FEET.near, [pt(10, -32), pt(14.6, -16), pt(12.4, -6)], [21, 16, 12], p.near, false);
  posed(d, r.upper, () => torso(d, p.breath));
  posed(d, r.hips, () => {
    loincloth(d, p.flap);
    belt(d);
  });
  posed(d, r.head, () => ogreHead(d));
  posed(d, r.upper, () => {
    nearArm(d, r.near);
    posed(d, r.club, () => ogreClub(d));
    posed(d, place(NEAR_FIST, r.fist, r.near.turn), () => ogreFist(d, NEAR_FIST));
  });
}

/** Where the club's head is, on the ground, for the blow. */
function clubHead(r: Rig): Pt {
  return apply(chainOf(r.upper, r.club), pt(CLUB.head.x + (CLUB.grip.x - CLUB.head.x) * 0.12, CLUB.head.y + (CLUB.grip.y - CLUB.head.y) * 0.12));
}

export const drawOgre: CreatureDrawer = (ctx, seed, f, pose) => {
  const p = ogrePose(pose);
  const r = rigOf(p);
  const ground = makeDraw(ctx, seed + f, f, 0);
  const shadow = (): void => {
    groundShadow(ground, p.hipX * 0.6, 36, 3.6);
    impact(ground, clubHead(r), p.impact);
  };
  finished(ctx, { line: 0.6, rim: 0.65 }, shadow, (layer) => ogre(makeDraw(layer, seed + f, f, 0), p, r));
};
