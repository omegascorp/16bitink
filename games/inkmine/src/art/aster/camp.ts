import { hash } from '../../logic/noise';
import { capsule, cub, edge, oval, pt, TAU, tube, type Draw } from '../kit';
import { dab, gleam, glow, mix, paint, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { lash, rib } from './gear';
import { ASTER, starGlyph } from './style';

/**
 * The Aster's camp on Mycel (spec, "Mycel"): a cave in the peat east of
 * their wreck, sealed against the spores. Three of the four crew built a
 * craft from the lander's petals and flew on to Brine; one stayed asleep in
 * a pod to keep the beacon calling. Here are that pod, the Aster themself,
 * the camp's props, and the pictures they left on the wall. Everything is
 * theirs, so in their language (style.ts): glazed ceramic, cord lashings,
 * hexagonal glass where power runs, the star on everything. 1 unit = 1 px in
 * the world, as for the wreck.
 */

/** Their sleep pod, lying on the cave floor. Origin at the middle of its base, on the floor. */
export const SLEEP_POD = { w: 80, h: 56, ox: 40, oy: 54 } as const;
/** An Aster: about 34 tall, under a tile and a bit. Origin on the floor between its feet. */
export const ASTER_PERSON = { w: 44, h: 48, ox: 22, oy: 46 } as const;
/** The camp's props along the floor, with a gap in the middle for the pod. Origin at the bottom centre, on the floor. */
export const ASTER_CAMP = { w: 300, h: 90, ox: 150, oy: 88 } as const;
/** A story card's picture, as painted on the cave wall. Origin at the centre. */
export const ASTER_CRAFT_PICTURE = { w: 140, h: 100, ox: 70, oy: 50 } as const;

export type PodState = 'failing' | 'open';
export type AsterPose = 'stand' | 'speak';

/** Where the pod's hexagonal glass is, from its origin, in each state: the scene can pulse a light there. */
export const SLEEP_POD_GLASS: Readonly<Record<PodState, Pt>> = { failing: pt(0, -29), open: pt(0, -40) };
/** Where the Aster's crown organ glows, from its feet: the light it speaks in. */
export const ASTER_CROWN = pt(0, -30.4);

const DARK = '#2a2238';
const EYE = '#1d1626';
const THREAD = '#c98b6c';
const FIBRE = '#b98a68';
const RESIN = '#d4892c';
const COVER = '#8e6a8f';
const STONE = '#a497ab';
const GLASS_DIM = mix(ASTER.glass, '#3a4f58', 0.32);
const GLOW_CORE = '#e9fff8';

/** A regular hexagon round `c`, a point up when `rot` is 0. */
function hexagon(c: Pt, r: number, rot = Math.PI / 6): Pt[] {
  return Array.from({ length: 6 }, (_, i) => pt(c.x + Math.cos((i / 6) * TAU + rot) * r, c.y + Math.sin((i / 6) * TAU + rot) * r));
}

/** A honeycomb of fine lines over glass, clipped to it; `sy` squashes it, as glass seen at a slant. */
function honeycomb(d: Draw, clip: readonly Pt[], c: Pt, cell: number, sy: number, color: string, alpha: number): void {
  d.pen.clipped(clip, () => {
    for (let row = -5; row <= 5; row++) {
      for (let col = -7; col <= 7; col++) {
        const at = pt(c.x + col * cell * 1.73 + (row % 2 ? cell * 0.87 : 0), c.y + row * cell * 1.5 * sy);
        const hex = hexagon(at, cell, Math.PI / 6).map((p) => pt(p.x, at.y + (p.y - at.y) * sy));
        d.pen.hair([...hex, hex[0]!], 0.35, color, alpha);
      }
    }
  });
}

/** A cord tied round a thin limb at `at`, across a limb running at `angle`: two tight turns with a lit thread. */
function tie(d: Draw, at: Pt, angle: number, r: number): void {
  const nx = Math.cos(angle);
  const ny = Math.sin(angle);
  for (const k of [-0.5, 0.5]) {
    const c = pt(at.x + nx * k * r * 0.7, at.y + ny * k * r * 0.7);
    const a = pt(c.x - ny * r, c.y + nx * r);
    const b = pt(c.x + ny * r, c.y - nx * r);
    d.pen.stroke([a, b], r * 0.62, ASTER.cord, 1, false);
    d.pen.hair([pt(a.x - nx * 0.15, a.y - ny * 0.15), pt(b.x - nx * 0.15, b.y - ny * 0.15)], r * 0.18, THREAD, 0.85);
  }
}

/** A soft shadow on the floor under something. */
function floorShadow(d: Draw, x: number, rx: number, alpha = 0.16): void {
  dab(d, oval(x, 0.4, rx, 2.2, 20), SHADOW, alpha, 1.2);
}

// ---------------------------------------------------------------- the Aster

/** One of its six legs, `a` round its body (front when sin a > 0): a thin thigh out to a high knee, a tapering shin to the floor, cord at the knee. */
function leg(d: Draw, a: number, far: boolean): void {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const hip = pt(c * 6.4, -9 + s * 2.2);
  const knee = pt(c * 13, -14.6 + s * 2.4);
  const foot = pt(c * 18, s * 1.5);
  const wash = far ? mix(ASTER.shell, SHADOW, 0.25) : mix(ASTER.shell, ASTER.glaze, 0.12);
  paint(d, capsule(hip, knee, 2, 1.5), wash, { alpha: 1, shadow: 0.4, hatch: 0, line: 0.3, gloss: true });
  // The shin arches out from the high knee and comes down to a fine point, as a harvestman's does.
  const bow = pt((knee.x + foot.x) / 2 + c * 2.2, (knee.y + foot.y) / 2 - 1.2);
  const shin = [...cub(pt(knee.x - 0.6, knee.y), bow, pt(foot.x - 0.3, foot.y - 2.4), foot, 8), ...cub(foot, pt(foot.x + 0.3, foot.y - 2.4), pt(bow.x + 0.9, bow.y), pt(knee.x + 0.6, knee.y), 8)];
  paint(d, shin, wash, { alpha: 1, shadow: 0.4, hatch: 0, line: 0.3, gloss: true });
  tie(d, knee, Math.atan2(foot.y - knee.y, foot.x - knee.x), 1.1);
}

/** Its shell: a ribbed ceramic bell, bone-white with the lilac glaze pooled low round its rim. */
function bell(): Pt[] {
  return [
    ...cub(pt(-9.4, -8), pt(-12.6, -11.5), pt(-11.6, -22.5), pt(-4.6, -27.6), 10),
    ...cub(pt(4.6, -27.6), pt(11.6, -22.5), pt(12.6, -11.5), pt(9.4, -8), 10),
    ...cub(pt(9.4, -8), pt(5, -5.4), pt(-5, -5.4), pt(-9.4, -8), 8),
  ];
}

function body(d: Draw): void {
  // The dark underside between the legs, under the rim.
  paint(d, oval(0, -7.4, 8.6, 2.4, 16), DARK, { alpha: 1, shadow: 0, hatch: 0, line: 0.4 });
  const shape = bell();
  paint(d, shape, ASTER.shell, { alpha: 1, shadow: 0.55, hatch: 0.12, line: 0.8, gloss: true });
  d.pen.clipped(shape, () => {
    dab(d, oval(0, -6.4, 14, 6, 18), ASTER.glaze, 0.6, 1.6);
    dab(d, oval(0, -5.6, 12, 2.6, 16), mix(ASTER.glaze, SHADOW, 0.3), 0.35, 0.8);
  });
  d.pen.clipped(shape, () => {
    for (let k = -3; k <= 3; k++) rib(d, pt(k * 3.2, -5.8 - Math.abs(k) * 0.5), pt(k * 1.15, -27.4), k * 1.5);
  });
  // A scalloped lip round the rim.
  const lip: Pt[] = [];
  for (let x = -8.6; x <= 8.6; x += 1.15) lip.push(pt(x, -7.1 + (Math.round(x / 1.15) % 2 ? 0.45 : -0.1) + (x * x) / 52));
  d.pen.hair(lip, 0.45, mix(ASTER.glaze, SHADOW, 0.5), 0.8);
  starGlyph(d, pt(0, -14.6), 3.1, mix(ASTER.glaze, ASTER.ink, 0.35));
  gleam(d, cub(pt(-8.4, -13), pt(-9, -18), pt(-7.4, -22.4), pt(-4.8, -25), 6), 0.7, 0.75);
}

/** The ring of small dark eyes round the top of its shell: the front ones round, the side ones turned away. */
function eyes(d: Draw): void {
  for (let k = 0; k < 7; k++) {
    const a = Math.PI * (0.06 + (k / 6) * 0.88);
    const turned = Math.abs(Math.cos(a));
    const c = pt(Math.cos(a) * 7.4, -22.2 + Math.sin(a) * 1.5);
    const r = 0.95 - turned * 0.25;
    paint(d, oval(c.x, c.y, r * 1.35 * (1 - turned * 0.35), r * 1.25, 10), mix(ASTER.shell, ASTER.glaze, 0.5), { alpha: 1, shadow: 0.3, hatch: 0, line: 0 });
    d.pen.fill(oval(c.x, c.y + 0.1, r * (1 - turned * 0.4), r, 10), EYE, 1);
    d.pen.dot(c.x - r * 0.3, c.y - r * 0.35, Math.max(0.25, r * 0.3), PAPER_FILL, 0.95);
  }
}

/** The crown: a collar of cord, then a faceted glass dome over the hexagonal organ it speaks with, lit bright when it does. */
function crown(d: Draw, lit: boolean): void {
  const collar = [...cub(pt(-5.2, -27.2), pt(-2.6, -26.2), pt(2.6, -26.2), pt(5.2, -27.2), 6), ...cub(pt(4.8, -28.8), pt(2.4, -28), pt(-2.4, -28), pt(-4.8, -28.8), 6)];
  paint(d, collar, ASTER.cord, { alpha: 1, shadow: 0.4, hatch: 0, line: 0.5 });
  for (let x = -4; x <= 4; x += 1.6) d.pen.hair([pt(x - 0.3, -28.3), pt(x + 0.3, -26.8)], 0.3, THREAD, 0.8);
  const dome = oval(0, -30.2, 4.7, 4.5, 24).filter((p) => p.y <= -28.2);
  glow(d.pen.ctx, ASTER_CROWN, lit ? 5 : 4, ASTER.glow, lit ? 0.33 : 0.25);
  paint(d, dome, lit ? mix(ASTER.glass, GLOW_CORE, 0.35) : ASTER.glass, { alpha: 0.8, shadow: 0.35, hatch: 0, line: 0, gloss: true });
  const organ = hexagon(pt(ASTER_CROWN.x, ASTER_CROWN.y + 0.3), 1.9);
  paint(d, organ, lit ? GLOW_CORE : mix(ASTER.glass, ASTER.glow, 0.5), { alpha: 1, shadow: lit ? 0 : 0.3, hatch: 0, line: 0.35, lineAlpha: 0.6 });
  honeycomb(d, dome, pt(0, -30.6), 1.25, 1, '#2f6a63', 0.5);
  dab(d, oval(-1.8, -32.4, 1.4, 0.7, 8), PAPER_FILL, 0.7, 0.3);
  edge(d, dome, 0.55, 0.9);
}

/** A slender forelimb: upper and lower segments, cord at the elbow, three fine digits; `spread` opens them, `up` points them up. */
function forelimb(d: Draw, shoulder: Pt, elbow: Pt, wrist: Pt, spread: number): void {
  const wash = mix(ASTER.shell, ASTER.glaze, 0.2);
  paint(d, capsule(shoulder, elbow, 1.8, 1.4), wash, { alpha: 1, shadow: 0.45, hatch: 0, line: 0.45, gloss: true });
  paint(d, capsule(elbow, wrist, 1.4, 1.05), wash, { alpha: 1, shadow: 0.45, hatch: 0, line: 0.45, gloss: true });
  tie(d, elbow, Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x), 1);
  const a = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x);
  for (const k of [-1, 0, 1]) {
    const b = a + k * spread;
    const mid = pt(wrist.x + Math.cos(b) * 1.5, wrist.y + Math.sin(b) * 1.5);
    const tip = pt(wrist.x + Math.cos(b + k * 0.25) * 2.9, wrist.y + Math.sin(b + k * 0.25) * 2.9);
    d.pen.stroke([wrist, mid, tip], 0.75, d.ink, 0.9, false);
    d.pen.hair([wrist, mid, tip], 0.32, PAPER_FILL, 0.8);
  }
}

/** The legs splayed round it, a sixth of a turn apart: the side pair straight out, a pair coming forward, a pair behind. */
const LEGS = [0, 1, 2, 3, 4, 5].map((k) => (k / 6) * TAU);

/**
 * One of the Aster (spec, "The Aster"): no head, a ribbed ceramic bell on
 * six thin jointed legs, two long forelimbs with three digits each, a ring
 * of small eyes round its top and a glass dome on its crown over the organ
 * it speaks with, in pulses of light. `speak` lights that organ and raises
 * a forelimb; its rays are drawn by `drawAsterPersonAir`. Harmless, so the
 * caller inks it in blue.
 */
export function drawAsterPerson(d: Draw, pose: AsterPose): void {
  floorShadow(d, 0, 17, 0.14);
  // A slight sway with the boil, as it shifts its weight.
  const sway = [0, 0.25, -0.2][d.f]!;
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(sway, 0);
  for (const a of LEGS) if (Math.sin(a) < -0.1) leg(d, a, true);
  for (const a of LEGS) if (Math.abs(Math.sin(a)) <= 0.1) leg(d, a, false);
  // The far forelimb, behind the shell when it's raised.
  if (pose === 'speak') forelimb(d, pt(5.2, -10), pt(13.4, -16.4), pt(14.6, -26.6), 0.5);
  body(d);
  eyes(d);
  crown(d, pose === 'speak');
  for (const a of LEGS) if (Math.sin(a) > 0.1) leg(d, a, false);
  // Forelimbs folded across its front at rest, digits loosely together, as a mantis holds them.
  forelimb(d, pt(-5.6, -8.4), pt(-9.2, -12.8), pt(-3.2, -9.8), 0.4);
  if (pose === 'stand') forelimb(d, pt(5.6, -8.4), pt(9.2, -12.4), pt(3.4, -9.2), 0.4);
  ctx.restore();
}

/** What's round the Aster, not of it (drawn after its finish): the glow of its crown, and when it speaks, rays of light. */
export function drawAsterPersonAir(d: Draw, pose: AsterPose): void {
  const { ctx } = d.pen;
  const sway = [0, 0.25, -0.2][d.f]!;
  const c = pt(ASTER_CROWN.x + sway, ASTER_CROWN.y);
  if (pose === 'stand') {
    glow(ctx, c, 5.5, ASTER.glow, 0.3);
    return;
  }
  glow(ctx, c, 12, ASTER.glow, 0.55);
  glow(ctx, c, 4, GLOW_CORE, 0.9);
  // Short rays all round the crown, longer upward, turning a little each boil frame like a pulse.
  for (let k = 0; k < 9; k++) {
    const a = -Math.PI + (k / 8) * Math.PI + (d.f - 1) * 0.05;
    const r0 = 5.6;
    const r1 = 8.4 + (k % 2 ? 0 : 2.2) + Math.sin(a) * -0.6;
    d.pen.stroke([pt(c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0), pt(c.x + Math.cos(a) * r1, c.y + Math.sin(a) * r1)], 0.85, ASTER.glow, 0.85, false);
    d.pen.hair([pt(c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0), pt(c.x + Math.cos(a) * (r1 - 1), c.y + Math.sin(a) * (r1 - 1))], 0.35, GLOW_CORE, 0.9);
  }
}

// ---------------------------------------------------------------- the sleep pod

/** The pod's two tips, and its outline: a ribbed ceramic seed lying on its side. */
const TIP_L = pt(-33, -19);
const TIP_R = pt(33, -20);
const podTop = (): Pt[] => cub(TIP_L, pt(-26, -37), pt(24, -38), TIP_R, 20);
const podBottom = (): Pt[] => cub(TIP_R, pt(26, -3), pt(-26, -3), TIP_L, 20);

/** A short claw foot, like the lander's: a thick thigh out from under the pod, a claw curled down to the floor, cord at the knee. */
function podFoot(d: Draw, hip: Pt, knee: Pt, toe: Pt, far: boolean): void {
  const wash = far ? mix(ASTER.shell, SHADOW, 0.35) : ASTER.shell;
  paint(d, capsule(hip, knee, 5.2, 4.2), wash, { alpha: 1, shadow: 0.5, hatch: 0.12, line: 0.6, gloss: true });
  const out = Math.sign(toe.x - hip.x) || 1;
  const claw = [...cub(pt(knee.x - 2, knee.y), pt(knee.x + out * 1, knee.y + 3), pt(toe.x - out * 2.4, toe.y - 2), toe, 6), ...cub(toe, pt(toe.x - out * 0.6, toe.y - 3.4), pt(knee.x + out * 3.6, knee.y + 1), pt(knee.x + 2, knee.y - 0.6), 6)];
  paint(d, claw, wash, { alpha: 1, shadow: 0.55, hatch: 0.1, line: 0.6, gloss: true });
  tie(d, knee, Math.atan2(toe.y - knee.y, toe.x - knee.x), 2.2);
}

/** Ribs running tip to tip round the seed's long axis, as a seed's ridges do. */
function podRibs(d: Draw, clip: readonly Pt[], from: number, to: number): void {
  d.pen.clipped(clip, () => {
    for (let k = from; k <= to; k++) {
      const y = -20 + k * 4.4;
      const line = cub(TIP_L, pt(-20, y - 1), pt(20, y - 1), TIP_R, 16);
      d.pen.hair(line, 0.7, mix(ASTER.glaze, SHADOW, 0.45), 0.75);
      d.pen.hair(line.map((p) => pt(p.x, p.y - 0.8)), 0.45, PAPER_FILL, 0.55);
    }
  });
}

/** The pod's three claw feet; the far one first, so the caller draws the near two after the hull. */
function farFoot(d: Draw): void {
  podFoot(d, pt(4, -10), pt(9, -6), pt(11, -1.4), true);
}
function nearFeet(d: Draw): void {
  podFoot(d, pt(-17, -9.5), pt(-23.5, -6), pt(-26, 0), false);
  podFoot(d, pt(17, -10), pt(23.5, -6.4), pt(26.4, 0), false);
}

/** The window on its top: hexagonal glass, dimming, the sleeper curled faintly behind it. */
function podWindow(d: Draw): void {
  const c = SLEEP_POD_GLASS.failing;
  const win = oval(c.x, c.y, 15, 6.2, 30);
  d.pen.stroke([...win, win[0]!], 2.4, mix(ASTER.shell, ASTER.glaze, 0.55), 1, false);
  glow(d.pen.ctx, c, 13, ASTER.glow, 0.22);
  paint(d, win, GLASS_DIM, { alpha: 0.95, shadow: 0.35, hatch: 0, line: 0, gloss: true });
  d.pen.clipped(win, () => {
    // The sleeper: a bell on its side, legs folded under it, its crown turned up, dimly lit.
    const sleeper = [...cub(pt(-9, -27.6), pt(-9, -33), pt(3, -34), pt(7, -30), 8), ...cub(pt(7, -30), pt(8, -27.6), pt(-2, -25.6), pt(-9, -27.6), 8)];
    dab(d, sleeper, '#1c2a33', 0.6, 0.5);
    d.pen.hair(sleeper.slice(0, 9), 0.45, '#1c2a33', 0.5);
    for (let k = 0; k < 4; k++) d.pen.hair([pt(-6 + k * 3.4, -27), pt(-4.6 + k * 3.4, -25.4), pt(-2.8 + k * 3.4, -25.8)], 0.5, '#1c2a33', 0.55);
    glow(d.pen.ctx, pt(8.4, -31), 3.4, ASTER.glow, 0.55);
    d.pen.dot(8.4, -31, 0.8, mix(ASTER.glow, GLOW_CORE, 0.5), 0.8);
    // Two cells gone dark as its power fails, and a crack across one.
    for (const at of [pt(-10.4, -30.2), pt(-7.4, -26.2)]) d.pen.fill(hexagon(at, 2.2, Math.PI / 6).map((p) => pt(p.x, at.y + (p.y - at.y) * 0.6)), '#1c262d', 0.55);
    d.pen.hair([pt(9, -33.4), pt(10.6, -30.6), pt(9.6, -28.8), pt(11.6, -26.4)], 0.4, PAPER_FILL, 0.75);
  });
  honeycomb(d, win, c, 2.2, 0.6, '#1f4a45', 0.4);
  dab(d, oval(c.x - 6, c.y - 3, 4.6, 1.2, 12), PAPER_FILL, 0.55, 0.5);
  edge(d, win, 0.7, 0.9);
}

/** The sealed pod: a ribbed seed on three claws, two lashings round it, the star on its side and the dim window on top. */
function sealedPod(d: Draw): void {
  farFoot(d);
  const hull = [...podTop(), ...podBottom()];
  paint(d, hull, ASTER.shell, { alpha: 1, shadow: 0.55, hatch: 0.14, line: 0.9, gloss: true });
  d.pen.clipped(hull, () => dab(d, oval(0, -8, 38, 8, 20), ASTER.glaze, 0.6, 2.4));
  podRibs(d, hull, -3, 3);
  d.pen.clipped(hull, () => {
    lash(d, pt(-21.4, -36), pt(-19.2, -4), 3);
    lash(d, pt(20.8, -36), pt(18.8, -4), 3);
  });
  starGlyph(d, pt(0, -15.4), 4.2, mix(ASTER.glaze, ASTER.ink, 0.3));
  gleam(d, cub(pt(-28, -24), pt(-22, -31), pt(-12, -34), pt(-2, -35), 8), 0.9, 0.7);
  edge(d, hull, 1, 0.9);
  podWindow(d);
  nearFeet(d);
}

/** One of the pod's petals, unfolded from its hinge at `base` towards `angle`: the inner face is pearly lilac, the outer bone-white. */
function podPetal(d: Draw, base: Pt, angle: number, len: number, wid: number, inner: boolean): Pt[] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const at = (u: number, v: number): Pt => pt(base.x + c * u - s * v, base.y + s * u + c * v);
  const shape = [at(0, -wid / 2), ...cub(at(0, -wid / 2), at(len * 0.4, -wid * 0.72), at(len * 0.86, -wid * 0.38), at(len, 0), 10), ...cub(at(len, 0), at(len * 0.86, wid * 0.38), at(len * 0.4, wid * 0.72), at(0, wid / 2), 10)];
  const wash = inner ? mix(ASTER.shell, ASTER.glaze, 0.45) : ASTER.shell;
  paint(d, shape, wash, { alpha: 1, shadow: 0.5, hatch: 0.12, line: 0.75, gloss: true });
  d.pen.clipped(shape, () => {
    if (!inner) dab(d, oval(at(len, 0).x, at(len, 0).y, wid * 0.7, wid * 0.7, 14), ASTER.glaze, 0.5, 1.6);
    for (const v of [-0.28, 0, 0.28]) rib(d, at(len * 0.04, v * wid), at(len * 0.95, v * wid * 0.25), 0);
  });
  return shape;
}

/** The open pod's back petal, standing up behind it: its window of hexagonal glass now bright. */
function backPetal(d: Draw): void {
  const shape = podPetal(d, pt(0, -24), -Math.PI / 2, 28, 22, true);
  const c = SLEEP_POD_GLASS.open;
  const win = hexagon(c, 7.6, 0).map((p) => pt(c.x + (p.x - c.x) * 0.95, p.y));
  d.pen.clipped(shape, () => glow(d.pen.ctx, c, 14, ASTER.glow, 0.45));
  d.pen.stroke([...win, win[0]!], 2.2, mix(ASTER.shell, ASTER.glaze, 0.3), 1, false);
  paint(d, win, mix(ASTER.glass, GLOW_CORE, 0.3), { alpha: 1, shadow: 0.2, hatch: 0, line: 0, gloss: true });
  glow(d.pen.ctx, c, 6, GLOW_CORE, 0.8);
  honeycomb(d, win, c, 2.1, 1, '#3f8d80', 0.55);
  edge(d, win, 0.7, 0.9);
}

/** The open pod: its upper shell unfolded into petals round the cradle, the bed inside empty and bright. */
function openPod(d: Draw): void {
  // The back petals, standing up behind the opening.
  podPetal(d, pt(-14, -23), -Math.PI / 2 - 0.62, 23, 17, true);
  podPetal(d, pt(14, -23.4), -Math.PI / 2 + 0.62, 23, 17, true);
  backPetal(d);
  farFoot(d);
  // The cradle: the lower half of the seed, cut along its rim.
  const rimC = pt(0, -20.6);
  const rimBack = Array.from({ length: 21 }, (_, i) => pt(rimC.x + Math.cos(Math.PI * (i / 20)) * 31.6, rimC.y - Math.sin(Math.PI * (i / 20)) * 6.6));
  const cradle = [...podBottom(), ...rimBack.reverse()];
  paint(d, cradle, ASTER.shell, { alpha: 1, shadow: 0.55, hatch: 0.14, line: 0.9, gloss: true });
  d.pen.clipped(cradle, () => dab(d, oval(0, -8, 38, 8, 20), ASTER.glaze, 0.6, 2.4));
  podRibs(d, cradle, 0, 3);
  // Inside: the hollow it slept in, lined with glass that glows where power runs, and nobody in it.
  const hollow = oval(rimC.x, rimC.y, 30.4, 6, 32);
  paint(d, hollow, mix(ASTER.glaze, DARK, 0.55), { alpha: 1, shadow: 0.3, hatch: 0, line: 0.6 });
  d.pen.clipped(hollow, () => {
    const bed = oval(1, -18.6, 18, 3.6, 24);
    glow(d.pen.ctx, pt(1, -19.6), 20, ASTER.glow, 0.6);
    d.pen.fill(bed, mix(ASTER.glass, GLOW_CORE, 0.25), 0.9);
    honeycomb(d, bed, pt(1, -18.6), 1.9, 0.45, '#3f8d80', 0.6);
    dab(d, oval(0, -25.6, 30, 3, 20), DARK, 0.45, 1.2);
  });
  // The cut rim, lit along its front edge.
  const front = Array.from({ length: 21 }, (_, i) => pt(rimC.x + Math.cos(Math.PI * (i / 20)) * 31, rimC.y + Math.sin(Math.PI * (i / 20)) * 6.2));
  d.pen.stroke(front, 1.8, mix(ASTER.shell, PAPER_FILL, 0.4), 1, false);
  d.pen.hair(front, 0.6, d.ink, 0.8);
  d.pen.clipped(cradle, () => {
    lash(d, pt(-20.2, -18), pt(-19.2, -4), 3);
    lash(d, pt(19.8, -18), pt(18.8, -4), 3);
  });
  // The side petals folded out and down, then the front one hanging over the cradle with the star on it.
  podPetal(d, pt(-30, -21), Math.PI - 0.55, 12, 11, false);
  podPetal(d, pt(30, -21.6), 0.55, 12, 11, false);
  podPetal(d, pt(0, -14.6), Math.PI / 2, 11.4, 16, false);
  starGlyph(d, pt(0, -9.4), 3.2, mix(ASTER.glaze, ASTER.ink, 0.3));
  nearFeet(d);
}

/**
 * The Aster's sleep pod on the camp floor (spec, "Mycel"). `failing`: sealed
 * like a ribbed seed on three short claws, lashed shut, its window of
 * hexagonal glass dim and two cells dark, the sleeper's shape faint behind
 * it. `open`: its petals unfolded round an empty cradle, the glass bright.
 * Its glass is at `SLEEP_POD_GLASS`; its halo is `drawSleepPodAir`.
 */
export function drawSleepPod(d: Draw, state: PodState): void {
  floorShadow(d, 0, 32, 0.18);
  if (state === 'open') openPod(d);
  else sealedPod(d);
}

/** The halo round the pod's glass (drawn after its finish): weak and low while it fails, bright once it's open. */
export function drawSleepPodAir(d: Draw, state: PodState): void {
  const c = SLEEP_POD_GLASS[state];
  if (state === 'failing') glow(d.pen.ctx, c, 18, ASTER.glow, 0.12 + d.f * 0.03);
  else {
    glow(d.pen.ctx, c, 26, ASTER.glow, 0.35);
    glow(d.pen.ctx, pt(0, -20), 24, ASTER.glow, 0.25);
  }
}

// ---------------------------------------------------------------- the camp

/** Basket weave over a shape: short dashes laid one way then the other, chequered, each with a lit thread. */
function weave(d: Draw, clip: readonly Pt[], c: Pt, w: number, h: number, cell: number, color: string): void {
  d.pen.clipped(clip, () => {
    for (let j = -Math.ceil(h / cell); j <= Math.ceil(h / cell); j++) {
      for (let i = -Math.ceil(w / cell); i <= Math.ceil(w / cell); i++) {
        const p = pt(c.x + i * cell, c.y + j * cell * 0.55);
        const flat = (i + j) % 2 === 0;
        const a = flat ? pt(p.x - cell * 0.42, p.y) : pt(p.x, p.y - cell * 0.24);
        const b = flat ? pt(p.x + cell * 0.42, p.y) : pt(p.x, p.y + cell * 0.24);
        d.pen.hair([a, b], 0.4, mix(color, SHADOW, 0.5), 0.6);
        d.pen.hair([pt(a.x - 0.2, a.y - 0.3), pt(b.x - 0.2, b.y - 0.3)], 0.25, mix(color, PAPER_FILL, 0.5), 0.5);
      }
    }
  });
}

/**
 * A woven-cord bedroll: a round nest with a braided bolster for a rim, the
 * mat inside dipped where its sleeper lay, and a woven cover thrown back
 * over one side, as it was left. Empty. `side` is which way the cover lies.
 */
function bedroll(d: Draw, x: number, y: number, rx: number, side: 1 | -1): void {
  floorShadow(d, x, rx + 2, 0.15);
  const ry = rx * 0.3;
  const cy = y - ry - 1;
  const outer = oval(x, cy, rx, ry + 1.8, 36);
  paint(d, outer, FIBRE, { alpha: 1, shadow: 0.55, hatch: 0.14, line: 0.75 });
  const inner = oval(x + 0.4, cy - 0.9, rx * 0.68, ry * 0.55, 28);
  paint(d, inner, mix(FIBRE, ASTER.cord, 0.3), { alpha: 1, shadow: 0.5, hatch: 0, line: 0.5 });
  weave(d, inner, pt(x, cy - 0.9), rx * 0.7, ry, 2.2, mix(FIBRE, ASTER.cord, 0.3));
  d.pen.clipped(inner, () => dab(d, oval(x + 1.2, cy - 0.4, rx * 0.42, ry * 0.34, 16), SHADOW, 0.25, 0.9));
  // The braid round the bolster: chevrons along its middle, fat in front where it's seen side on.
  const rxm = rx * 0.85;
  const rym = ry * 0.82 + 0.6;
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * TAU;
    const sn = Math.sin(a);
    const p = pt(x + Math.cos(a) * rxm, cy + 0.2 + sn * rym);
    const tl = Math.hypot(sn * rxm, Math.cos(a) * rym) || 1;
    const t = pt((-sn * rxm) / tl, (Math.cos(a) * rym) / tl);
    const n = pt(-t.y, t.x);
    const w = 0.7 + Math.max(0, sn) * 1.3;
    const tip = pt(p.x + t.x * 0.6, p.y + t.y * 0.6);
    for (const k of [-1, 1]) d.pen.hair([pt(p.x + n.x * w * k - t.x * 0.8, p.y + n.y * w * k - t.y * 0.8), tip], 0.4, mix(FIBRE, SHADOW, 0.5), 0.75);
  }
  // Cord bindings round the bolster, at the front.
  for (const a of [0.55, 1.6, 2.6]) {
    const p = pt(x + Math.cos(a) * rxm, cy + 0.2 + Math.sin(a) * rym);
    d.pen.stroke([pt(p.x - 0.5, p.y - 2), pt(p.x + 0.5, p.y + 2.2)], 1.1, ASTER.cord, 1, false);
    d.pen.hair([pt(p.x - 0.7, p.y - 1.8), pt(p.x + 0.2, p.y + 2)], 0.3, THREAD, 0.85);
  }
  // The cover, thrown back over the far side: a woven blanket, its turned edge showing the paler underside, a fringe where it hangs over the rim.
  const X = (u: number): number => x + side * rx * u;
  const top = [pt(X(0.08), cy - ry * 1.15), pt(X(0.98), cy - ry * 1.05)];
  const hang = [pt(X(1.08), cy + ry * 0.9), pt(X(0.42), cy + ry * 1.25)];
  const cover = [top[0]!, ...cub(top[0]!, pt(X(0.4), cy - ry * 1.4), pt(X(0.7), cy - ry * 1.3), top[1]!, 6), ...cub(top[1]!, pt(X(1.06), cy - ry * 0.4), pt(X(1.1), cy + ry * 0.3), hang[0]!, 6), ...cub(hang[0]!, pt(X(0.86), cy + ry * 1.2), pt(X(0.6), cy + ry * 1.4), hang[1]!, 6), ...cub(hang[1]!, pt(X(0.3), cy + ry * 0.4), pt(X(0.12), cy - ry * 0.4), top[0]!, 6)];
  paint(d, cover, COVER, { alpha: 1, shadow: 0.5, hatch: 0.14, line: 0.65 });
  d.pen.clipped(cover, () => {
    // Woven stripes across it, and a band of the dyed cord.
    for (let k = -4; k <= 7; k++) {
      const u = 0.12 + k * 0.09;
      d.pen.hair([pt(X(u + 0.02), cy - ry * 1.4), pt(X(u + 0.22), cy + ry * 1.5)], k === 3 ? 0.9 : 0.35, k === 3 ? mix(ASTER.cord, COVER, 0.3) : mix(COVER, SHADOW, 0.4), 0.7);
    }
    for (let j = 0; j < 4; j++) d.pen.hair([pt(X(0), cy - ry * (0.9 - j * 0.55)), pt(X(1.1), cy - ry * (0.8 - j * 0.55))], 0.3, mix(COVER, PAPER_FILL, 0.4), 0.5);
  });
  // The turned-back edge along the top.
  const fold = cub(pt(X(0.1), cy - ry * 0.95), pt(X(0.4), cy - ry * 1.2), pt(X(0.7), cy - ry * 1.1), pt(X(0.97), cy - ry * 0.85), 8);
  d.pen.stroke(fold, 1.4, mix(COVER, PAPER_FILL, 0.45), 0.9, false);
  d.pen.hair(fold.map((q) => pt(q.x, q.y + 0.8)), 0.4, mix(COVER, SHADOW, 0.6), 0.8);
  // The fringe along its hanging edge.
  const edgeLine = cub(hang[0]!, pt(X(0.86), cy + ry * 1.2), pt(X(0.6), cy + ry * 1.4), hang[1]!, 10);
  for (const q of edgeLine) d.pen.hair([q, pt(q.x - side * 0.2, q.y + 1.5)], 0.4, mix(COVER, SHADOW, 0.35), 0.85);
  starGlyph(d, pt(X(-0.55), cy + ry + 0.6), 1.5, ASTER.cord);
}

/** A ceramic bowl, glazed lilac inside, at `c` (the middle of its foot); `broken` leaves half of it and a shard. */
function bowl(d: Draw, c: Pt, r: number, broken: boolean): void {
  const h = r * 0.62;
  const body = broken
    ? [pt(c.x - r, c.y - h), pt(c.x - r * 0.15, c.y - h * 0.65), pt(c.x + r * 0.15, c.y - h * 0.95), pt(c.x + r * 0.35, c.y - h * 0.3), ...cub(pt(c.x + r * 0.35, c.y), pt(c.x - r * 0.3, c.y + 0.4), pt(c.x - r * 0.9, c.y - h * 0.3), pt(c.x - r, c.y - h), 6)]
    : [pt(c.x - r, c.y - h), pt(c.x + r, c.y - h), ...cub(pt(c.x + r, c.y - h), pt(c.x + r * 0.9, c.y - h * 0.2), pt(c.x + r * 0.4, c.y), pt(c.x, c.y), 6), ...cub(pt(c.x, c.y), pt(c.x - r * 0.4, c.y), pt(c.x - r * 0.9, c.y - h * 0.2), pt(c.x - r, c.y - h), 6)];
  paint(d, body, ASTER.shell, { alpha: 1, shadow: 0.5, hatch: 0.1, line: 0.6, gloss: true });
  d.pen.clipped(body, () => dab(d, oval(c.x, c.y, r * 1.2, h * 0.5, 12), ASTER.glaze, 0.5, 0.8));
  const mouth = broken ? oval(c.x - r * 0.42, c.y - h, r * 0.58, r * 0.2, 14).filter((p) => p.x <= c.x - 0.1 || p.y > c.y - h) : oval(c.x, c.y - h, r, r * 0.22, 18);
  paint(d, mouth, mix(ASTER.glaze, SHADOW, 0.25), { alpha: 1, shadow: 0, hatch: 0, line: 0.5 });
  for (const k of [-0.5, 0, 0.5]) rib(d, pt(c.x + k * r, c.y - h * 0.85), pt(c.x + k * r * 0.5, c.y - h * 0.1), 0);
}

/** One strut of the rack: a rib from the lander's shell, curved, tapering to its top, with the ridges of the ribbing across it. */
function strut(d: Draw, from: Pt, to: Pt, bend: number): void {
  const m = pt((from.x + to.x) / 2 + bend, (from.y + to.y) / 2);
  const line = cub(from, m, m, to, 14);
  const shape = tube(line, 3.8, 2.2);
  paint(d, shape, ASTER.shell, { alpha: 1, shadow: 0.5, hatch: 0.12, line: 0.65, gloss: true });
  d.pen.clipped(shape, () => {
    dab(d, oval(from.x, from.y, 5, 12, 10), ASTER.glaze, 0.55, 1.4);
    for (let i = 2; i < line.length - 1; i += 3) d.pen.hair([pt(line[i]!.x - 2, line[i]!.y + 0.6), pt(line[i]!.x + 2, line[i]!.y - 0.6)], 0.4, mix(ASTER.glaze, SHADOW, 0.45), 0.7);
  });
}

/** The rack: two curved struts from the lander's ribs crossed and lashed at the top, a shelf lashed across them with a bowl on it, a coil of cord hung up. */
function rack(d: Draw, x: number): void {
  floorShadow(d, x, 20, 0.14);
  strut(d, pt(x + 16, 0), pt(x - 6, -50), 4);
  strut(d, pt(x - 16, 0), pt(x + 6, -50), -4);
  tie(d, pt(x, -40.6), Math.PI / 2, 2.4);
  const bar = capsule(pt(x - 15, -21), pt(x + 15, -20.4), 2.6, 2.6);
  paint(d, bar, mix(ASTER.shell, ASTER.glaze, 0.3), { alpha: 1, shadow: 0.45, hatch: 0, line: 0.6, gloss: true });
  tie(d, pt(x - 11.6, -20.9), 0, 2.1);
  tie(d, pt(x + 11.6, -20.5), 0, 2.1);
  bowl(d, pt(x - 3, -22.2), 6.4, false);
  // A coil of cord hung from the shelf's end.
  d.pen.stroke([pt(x + 8, -20), pt(x + 8.4, -15.4)], 0.9, ASTER.cord, 1, false);
  for (let k = 0; k < 3; k++) {
    const ring = oval(x + 8.6, -12.2 + k * 0.6, 3.6 - k * 0.3, 2.4, 14);
    d.pen.stroke([...ring, ring[0]!], 0.9, k === 1 ? mix(ASTER.cord, THREAD, 0.3) : ASTER.cord, 1, false);
  }
}

/** A bowl dropped and broken on the floor: half of it, and a shard beside. */
function brokenBowl(d: Draw, x: number): void {
  floorShadow(d, x + 3, 9, 0.12);
  bowl(d, pt(x, 0), 5.6, true);
  const shard = [pt(x + 6, 0), pt(x + 8.4, -2.4), pt(x + 11.6, -1.6), pt(x + 12, 0)];
  paint(d, shard, ASTER.shell, { alpha: 1, shadow: 0.4, hatch: 0, line: 0.5, gloss: true });
  d.pen.hair([pt(x + 7, -0.5), pt(x + 11, -0.9)], 0.5, ASTER.glaze, 0.8);
}

/** A boulder in the cave wall with a crack sealed against the spores: amber resin smeared thick along it, worked in by their digits, a drip run down. */
function sealedRock(d: Draw, x: number): void {
  floorShadow(d, x, 18, 0.16);
  const rock = [pt(x - 16, 0), ...cub(pt(x - 16, 0), pt(x - 19, -24), pt(x - 14, -54), pt(x - 2, -62), 12), ...cub(pt(x - 2, -62), pt(x + 8, -66), pt(x + 15, -58), pt(x + 13, -40), 10), ...cub(pt(x + 13, -40), pt(x + 15, -24), pt(x + 17, -8), pt(x + 15, 0), 8)];
  paint(d, rock, STONE, { alpha: 1, shadow: 0.6, hatch: 0.24, line: 0.85, cross: true });
  d.pen.clipped(rock, () => {
    for (let k = 0; k < 24; k++) dab(d, oval(x - 14 + hash(k, 1, 980) * 28, -60 + hash(k, 2, 980) * 58, 1.8, 1.1, 8), mix(STONE, SHADOW, 0.35), 0.3, 0.5);
    for (let k = 0; k < 4; k++) d.pen.hair([pt(x - 12 + k * 6, -50 + k * 9), pt(x - 6 + k * 6, -47 + k * 9)], 0.45, mix(STONE, SHADOW, 0.6), 0.6);
  });
  const crack = [pt(x + 1, -61), pt(x - 2, -52), pt(x + 2, -44), pt(x - 1, -35), pt(x + 3, -27), pt(x, -18), pt(x + 2, -9), pt(x - 1, 0)];
  d.pen.stroke(crack, 1.2, DARK, 0.9, false);
  // The resin: a thick smear along the crack, swelling and thinning, glossy.
  const half = (side: number): Pt[] => crack.slice(1, -1).map((p, i) => pt(p.x + side * (2 + hash(i, side + 3, 981) * 2.4), p.y));
  const smear = [...half(-1), ...half(1).reverse()];
  paint(d, smear, RESIN, { alpha: 0.95, shadow: 0.4, hatch: 0, line: 0.6, gloss: true });
  d.pen.clipped(smear, () => {
    for (let k = 0; k < 5; k++) d.pen.hair([pt(x - 3, -50 + k * 8), pt(x + 3.4, -47.6 + k * 8)], 0.4, mix(RESIN, '#7a4214', 0.5), 0.6);
  });
  gleam(d, crack.slice(1, 6).map((p) => pt(p.x - 1.2, p.y + 1)), 0.6, 0.8);
  // A drip run down below the smear.
  const drip = [pt(x + 2.2, -10), pt(x + 3.6, -10), pt(x + 3.8, -4.4), pt(x + 3, -3), pt(x + 2.2, -4.6)];
  paint(d, drip, RESIN, { alpha: 0.95, shadow: 0.3, hatch: 0, line: 0.5, gloss: true });
}

/** A flat stone on the floor with their star scratched into its face. */
function starStone(d: Draw, x: number): void {
  floorShadow(d, x, 14, 0.16);
  const stone = [pt(x - 13, 0), ...cub(pt(x - 13, 0), pt(x - 14, -9), pt(x - 6, -14), pt(x + 2, -14), 10), ...cub(pt(x + 2, -14), pt(x + 11, -14), pt(x + 15, -7), pt(x + 13, 0), 10)];
  paint(d, stone, mix(STONE, '#c9bfc8', 0.4), { alpha: 1, shadow: 0.5, hatch: 0.18, line: 0.75 });
  const c = pt(x, -7.4);
  const pts: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * TAU - Math.PI / 2;
    const q = i % 2 === 0 ? (i % 4 === 0 ? 6.4 : 4.4) : 2;
    pts.push(pt(c.x + Math.cos(a) * q, c.y + Math.sin(a) * q * 0.8));
  }
  d.pen.stroke(pts, 0.7, ASTER.ink, 0.85, false);
  d.pen.hair(pts.map((p) => pt(p.x + 0.4, p.y + 0.4)), 0.35, PAPER_FILL, 0.6);
  d.pen.dot(c.x, c.y, 0.6, ASTER.ink, 0.8);
}

/**
 * The camp's props along the cave floor, behind the pod and the Aster
 * (spec, "Mycel"): the cord-lashed rack, two empty bedrolls and a
 * broken bowl on the left; the third bedroll, the star stone and the
 * resin-sealed crack on the right. The middle, from x -58 to 60, is left
 * clear for the pod and its sleeper.
 */
export function drawAsterCamp(d: Draw): void {
  rack(d, -130);
  bedroll(d, -100, -2.6, 19, 1);
  bedroll(d, -78, 0, 18, -1);
  brokenBowl(d, -64);
  sealedRock(d, 134);
  starStone(d, 108);
  bedroll(d, 84, 0, 18.5, 1);
}

// ---------------------------------------------------------------- pictures on the wall

/** A scratch in the wall, inked plum: the groove, with its far wall catching the light. */
function scratch(d: Draw, pts: readonly Pt[], w = 1.3): void {
  d.pen.stroke(pts, w, ASTER.ink, 0.9, false);
  d.pen.hair(pts.map((p) => pt(p.x + w * 0.45, p.y + w * 0.45)), w * 0.35, PAPER_FILL, 0.5);
}

/** The wall the picture is on: a pale slab of stone, rough at its edge, pitted. */
function wall(d: Draw, seed: number): void {
  const W = ASTER_CRAFT_PICTURE;
  const slab = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * TAU;
    const k = 1 + (hash(i, seed, 985) - 0.5) * 0.07;
    const x = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), 0.45) * (W.w / 2 - 4) * k;
    const y = Math.sign(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), 0.45) * (W.h / 2 - 4) * k;
    return pt(x, y);
  });
  paint(d, slab, '#ddd2d4', { alpha: 1, shadow: 0.35, hatch: 0.1, line: 0.9 });
  d.pen.clipped(slab, () => {
    for (let k = 0; k < 40; k++) dab(d, oval((hash(k, seed, 986) - 0.5) * 130, (hash(k, seed, 987) - 0.5) * 90, 2 + hash(k, 3, 988) * 5, 1.2 + hash(k, 4, 988) * 2.4, 10), mix('#ddd2d4', SHADOW, 0.25), 0.18, 1.4);
    d.pen.stipple(slab, 260, () => 0.5, 0.4, mix('#ddd2d4', SHADOW, 0.45));
  });
}

/** One of them, as they draw themselves: a bell, three legs a side, a dot of light on the crown; `lying` on its side. */
function glyphAster(d: Draw, c: Pt, s: number, lying = false): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(c.x, c.y);
  if (lying) ctx.rotate(Math.PI / 2);
  ctx.scale(s, s);
  const bellLine = [pt(-4, 0), ...cub(pt(-4, 0), pt(-4.6, -5), pt(-2, -7.4), pt(0, -7.4), 6), ...cub(pt(0, -7.4), pt(2, -7.4), pt(4.6, -5), pt(4, 0), 6), pt(-4, 0)];
  d.pen.fill(bellLine, ASTER.ink, 0.22);
  scratch(d, bellLine, 1.1 / s);
  for (const side of [-1, 1]) {
    for (const k of [0, 1, 2]) scratch(d, [pt(side * (1.6 + k * 0.9), 0), pt(side * (3 + k * 1.6), 1.6), pt(side * (3.6 + k * 1.8), 3.4)], 0.8 / s);
  }
  d.pen.dot(0, -9.2, 1.1, ASTER.ink, 0.9);
  ctx.restore();
}

/** Their craft as they drew it: torn petals of the lander lashed into a cup, the three of them riding in it, a flame under it. */
function glyphCraft(d: Draw, c: Pt, s: number, tilt: number, flame: number): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(tilt);
  ctx.scale(s, s);
  // Two torn petals rising behind as its sides, ragged at the tips.
  const leaf = (base: Pt, a: number, len: number): Pt[] => {
    const cs = Math.cos(a);
    const sn = Math.sin(a);
    const at = (u: number, v: number): Pt => pt(base.x + cs * u - sn * v, base.y + sn * u + cs * v);
    return [at(0, -3.6), at(len * 0.55, -4.6), at(len, -1.8), at(len * 0.86, -0.2), at(len * 0.98, 1.4), at(len * 0.82, 2.4), at(len * 0.5, 4.2), at(0, 3.6)];
  };
  for (const [base, a] of [[pt(-10, 2), -Math.PI / 2 - 0.75], [pt(10, 2), -Math.PI / 2 + 0.75]] as const) {
    const l = leaf(base, a, 13);
    d.pen.fill(l, ASTER.ink, 0.12);
    scratch(d, [...l, l[0]!], 1.1 / s);
  }
  for (const k of [-1, 0, 1]) glyphAster(d, pt(k * 6.4, 2 - (k === 0 ? 1.2 : 0)), 0.72);
  // The cup in front of them: a bowl of petal, a lashing round it.
  const cup = [pt(-13, 0), ...cub(pt(-13, 0), pt(-12, 9.6), pt(12, 9.6), pt(13, 0), 12), pt(-13, 0)];
  d.pen.fill(cup, PAPER_FILL, 0.75);
  d.pen.fill(cup, ASTER.ink, 0.1);
  scratch(d, cup, 1.4 / s);
  for (const x of [-4.4, 4.4]) scratch(d, [pt(x, 0.6), pt(x * 0.9, 6.8)], 0.9 / s);
  starGlyphScratch(d, pt(0, 3.6), 2.2 / s);
  if (flame > 0) {
    // The flame: three tongues licking down from under the cup, the middle one longest.
    const L = 16 * flame + 4;
    const f = [pt(-5, 7.6), pt(-6.2, 7.6 + L * 0.45), pt(-3.4, 7.6 + L * 0.35), pt(-2.4, 7.6 + L * 0.8), pt(-0.6, 7.6 + L * 0.6), pt(0.4, 7.6 + L), pt(1.6, 7.6 + L * 0.6), pt(3.2, 7.6 + L * 0.78), pt(3.8, 7.6 + L * 0.36), pt(6.2, 7.6 + L * 0.42), pt(5, 7.6)];
    d.pen.fill(f, ASTER.ink, 0.15);
    scratch(d, [...f, f[0]!], 1.2 / s);
    scratch(d, [pt(0, 9.4), pt(-0.4, 7.6 + L * 0.35), pt(0.2, 7.6 + L * 0.6)], 0.9 / s);
  }
  ctx.restore();
}

/** Their star, scratched as a pictograph: four long strokes crossing, short ones between. */
function starGlyphScratch(d: Draw, c: Pt, r: number): void {
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI;
    const q = k % 2 === 0 ? r : r * 0.6;
    scratch(d, [pt(c.x - Math.cos(a) * q, c.y - Math.sin(a) * q), pt(c.x + Math.cos(a) * q, c.y + Math.sin(a) * q)], 0.7);
  }
}

/** A dashed path along a curve: short scratches with gaps between. */
function dashes(d: Draw, path: readonly Pt[], every: number): void {
  for (let i = 0; i + 1 < path.length; i += every) scratch(d, path.slice(i, Math.min(path.length, i + Math.ceil(every / 2) + 1)), 1.1);
}

/** The pod as they drew it: a seed on three feet, a hexagon on top, one of them lying in it, pulses rising off it, the beacon calling. */
function glyphPod(d: Draw, c: Pt): void {
  const seed = [...cub(pt(c.x - 20, c.y - 7), pt(c.x - 16, c.y - 17), pt(c.x + 16, c.y - 17), pt(c.x + 20, c.y - 7), 12), ...cub(pt(c.x + 20, c.y - 7), pt(c.x + 15, c.y - 1), pt(c.x - 15, c.y - 1), pt(c.x - 20, c.y - 7), 12)];
  d.pen.fill(seed, PAPER_FILL, 0.45);
  scratch(d, [...seed, seed[0]!], 1.4);
  for (const x of [-12, 0, 12]) scratch(d, [pt(c.x + x, c.y - 2), pt(c.x + x * 1.25, c.y + 2)], 1.2);
  glyphAster(d, pt(c.x + 1, c.y - 8.4), 0.7, true);
  const hex = hexagon(pt(c.x, c.y - 17.4), 2.6, 0);
  scratch(d, [...hex, hex[0]!], 1);
  for (const r of [6, 10, 14]) scratch(d, Array.from({ length: 7 }, (_, i) => pt(c.x + Math.cos(-Math.PI / 2 - 0.6 + (i / 6) * 1.2) * r, c.y - 18 + Math.sin(-Math.PI / 2 - 0.6 + (i / 6) * 1.2) * r)), 0.9);
}

/** The ground they drew things on: a line with tufts of fungus along it. */
function glyphGround(d: Draw, y: number): void {
  scratch(d, [pt(-58, y + 1), pt(-20, y), pt(20, y + 0.6), pt(58, y - 0.4)], 1.4);
  for (const x of [-52, -8, 24, 46]) {
    scratch(d, [pt(x, y), pt(x, y - 4)], 0.9);
    scratch(d, [pt(x - 2, y - 4), pt(x, y - 5.4), pt(x + 2, y - 4)], 0.9);
  }
}

/**
 * The picture on the camp wall (spec, "Mycel"), drawn as the Aster draw, in
 * their plum ink on the stone: the craft they built from the lander's torn
 * petals rising on a flame with three of them in it, a dashed path up and
 * away to the right, and below, on the ground, the fourth asleep in the pod,
 * its beacon calling.
 */
export function drawAsterCraftPicture(d: Draw): void {
  wall(d, 1);
  glyphGround(d, 34);
  glyphPod(d, pt(-34, 34));
  dashes(d, cub(pt(-2, 18), pt(4, 0), pt(30, -18), pt(56, -34), 30), 3);
  glyphCraft(d, pt(12, -6), 1.25, 0.28, 1);
  // Where the path goes: a world of water, as they draw one.
  const w = oval(52, -36, 6, 6, 16);
  scratch(d, [...w, w[0]!], 1.1);
  scratch(d, [pt(47.4, -35), pt(50, -36.4), pt(52.6, -35), pt(55.2, -36.4), pt(57, -35.4)], 0.8);
}

/** The second picture: the same craft coming down to a great circle of waves, Brine, the sea world they flew to. */
export function drawAsterBrinePicture(d: Draw): void {
  wall(d, 2);
  dashes(d, cub(pt(-62, -44), pt(-52, -40), pt(-42, -34), pt(-34, -24), 14), 3);
  const sea = oval(20, 14, 36, 30, 40);
  d.pen.fill(sea, ASTER.ink, 0.08);
  scratch(d, [...sea, sea[0]!], 1.6);
  d.pen.clipped(sea, () => {
    for (let row = 0; row < 6; row++) {
      const y = -6 + row * 8;
      const wave: Pt[] = [];
      for (let x = -18; x <= 58; x += 2) wave.push(pt(x, y + Math.sin((x + row * 5) * 0.42) * 1.8));
      scratch(d, wave, 1);
    }
  });
  glyphCraft(d, pt(-28, -14), 1.1, -0.3, 0.5);
  // Little marks of arrival: a splash ring where it will come down.
  for (const k of [-1, 1]) scratch(d, [pt(-6 + k * 3, -5), pt(-6 + k * 6, -9)], 0.9);
}
