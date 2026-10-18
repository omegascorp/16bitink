import { hash } from '../logic/noise';
import { cub, edge, oval, pt, ribbon, TAU, type Draw } from './kit';
import { dab, gleam, glow, mix, paint, SHADOW } from './paint';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { lash, rib } from './aster/gear';
import { ASTER, starGlyph } from './aster/style';
import { fibreCord, liftBag, TIDE } from './tidesinger/style';
import { craftDrips, craftGround, craftLegs, craftLift, craftThrust, type GroundState } from './asterCraftFlight';

/**
 * The Aster crew's craft on Brine (spec, "Brine": the craft, raising it, a
 * new heart). They built it on Mycel from their lander's petals, as their
 * wall picture shows (`drawAsterCraftPicture`): a cup of hull petals laced
 * together with cord, two torn petals rising at its sides, three of them
 * riding in it under a faceted glass canopy, a fan of petal thrusters under
 * it. All in their language (aster/style.ts): ribbed ceramic glazed
 * bone-white and lilac, dark red cord where we'd rivet, hexagonal glass
 * glowing teal where power runs, their star on its front. Its beacon bead
 * on the canopy is the radio that drowned.
 *
 * `sunk`: lying tilted on the reef, cracked, grown with weed and purple
 * slime, its glass dark. `raised`: floating level on the Tidesingers' lift
 * bladders, its cracks patched with black plates of magnetite iron lashed
 * on with cord (our work, so riveted), glass still dark. `mended`: the
 * same, its glass glowing. `landed`: home on dry ground, up on four claw
 * legs with petal pads for feet, patched, its glass glowing, no bladders
 * and no water. `flying`: lifting off, its legs folded under it, teal thrust
 * under it, the last of the sea dripping off it (asterCraftFlight.ts).
 * 1 unit = 1 px in the world.
 */

/** Origin on the ground (or the reef) under its middle. */
export const ASTER_CRAFT = { w: 176, h: 136, ox: 88, oy: 130 } as const;

export type CraftState = 'sunk' | 'raised' | 'mended' | 'landed' | 'flying';

/** Whether its heart is mended and its glass glows. */
const isLit = (state: CraftState): boolean => state === 'mended' || state === 'landed' || state === 'flying';
const onGround = (state: CraftState): state is GroundState => state === 'landed' || state === 'flying';

/** Its heart, the big hexagon of glass on its front, from its origin when level: the scene can pulse light there. */
export const ASTER_CRAFT_HEART = pt(0, -32);

const DARK_GLASS = '#2f3a46';
const DIM_GLASS = '#3d5560';
const GLOW_CORE = '#e9fff8';
const IRON = '#2c2b31';
const WEED = '#5d7350';
const SLIME = '#8a3f8f';
const SAND = '#a99a8e';

/** The hull's keel, its rim's height, its half-width at the rim. */
const KEEL = -16;
const RIM = -54;
const HALF = 50;

/** Where the cracks are, on the hull and the canopy. */
const CRACKS: readonly Pt[][] = [
  [pt(-30, -31), pt(-27, -27), pt(-30, -23), pt(-26, -19)],
  [pt(11, -25), pt(14, -22), pt(12, -19)],
  [pt(29, -52), pt(32, -49), pt(29, -45)],
];
const CANOPY_CRACK = [pt(-14, -74), pt(-10, -70), pt(-12, -66), pt(-8, -62)];

function hexagon(c: Pt, r: number, rot = Math.PI / 6): Pt[] {
  return Array.from({ length: 6 }, (_, i) => pt(c.x + Math.cos((i / 6) * TAU + rot) * r, c.y + Math.sin((i / 6) * TAU + rot) * r));
}

/** The cup's outline: a bowl from the rim down to the keel. */
function cupShape(): Pt[] {
  return [
    pt(-HALF, RIM),
    ...cub(pt(-HALF, RIM), pt(-49, RIM + 26), pt(-26, KEEL), pt(0, KEEL), 14),
    ...cub(pt(0, KEEL), pt(26, KEEL), pt(49, RIM + 26), pt(HALF, RIM), 14).slice(1),
    ...cub(pt(HALF, RIM), pt(24, RIM + 5), pt(-24, RIM + 5), pt(-HALF, RIM), 10).slice(1),
  ];
}

/** A seam between two hull petals: from near the keel out and up to the rim. */
function seamLine(x: number): Pt[] {
  return cub(pt(x * 0.18, KEEL + 1), pt(x * 0.55, KEEL - 2), pt(x * 0.98, RIM + 16), pt(x, RIM + 3.4 - Math.abs(x) * 0.02), 12);
}

/** Cord laced across a seam, ladder fashion: short tight stitches all the way up it, each with a lit thread. */
function lacing(d: Draw, seam: readonly Pt[]): void {
  d.pen.hair(seam, 0.7, mix(ASTER.glaze, SHADOW, 0.6), 0.9);
  for (let i = 1; i < seam.length - 1; i += 1) {
    const a = seam[i - 1]!;
    const b = seam[i + 1]!;
    const p = seam[i]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const nx = (-dy / l) * 1.7;
    const ny = (dx / l) * 1.7;
    d.pen.stroke([pt(p.x - nx, p.y - ny), pt(p.x + nx, p.y + ny)], 0.9, ASTER.cord, 1, false);
    d.pen.hair([pt(p.x - nx * 0.8, p.y - ny * 0.8 - 0.3), pt(p.x + nx * 0.8, p.y + ny * 0.8 - 0.3)], 0.25, '#c98b6c', 0.85);
  }
}

/** A petal standing up from the rim as one of its sides: long, ribbed, its tip torn ragged where it came off the lander. */
function sidePetal(d: Draw, base: Pt, angle: number, len: number, wid: number, far: boolean): void {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const at = (u: number, v: number): Pt => pt(base.x + c * u - s * v, base.y + s * u + c * v);
  const torn = [at(len * 0.92, -wid * 0.3), at(len * 0.86, -wid * 0.1), at(len, wid * 0.02), at(len * 0.9, wid * 0.14), at(len * 0.95, wid * 0.3)];
  const shape = [at(0, -wid / 2), ...cub(at(0, -wid / 2), at(len * 0.35, -wid * 0.7), at(len * 0.75, -wid * 0.55), torn[0]!, 10), ...torn.slice(1), ...cub(torn[4]!, at(len * 0.72, wid * 0.62), at(len * 0.35, wid * 0.66), at(0, wid / 2), 10)];
  const wash = far ? mix(ASTER.shell, SHADOW, 0.22) : ASTER.shell;
  paint(d, shape, wash, { alpha: 1, shadow: 0.55, hatch: 0.12, line: 0.8, gloss: true });
  d.pen.clipped(shape, () => {
    dab(d, oval(base.x, base.y, wid * 0.9, wid * 0.7, 14), ASTER.glaze, 0.55, 2);
    for (const v of [-0.3, 0, 0.3]) rib(d, at(len * 0.04, v * wid), at(len * 0.86, v * wid * 0.3), 0);
  });
  // The torn edge: raw ceramic, paler, chipped.
  d.pen.hair(torn, 0.5, PAPER_FILL, 0.85);
}

/** The canopy: a dome of faceted glass over the cup, lashed round its foot, the beacon bead and their star on its crown. */
function canopy(d: Draw, state: CraftState): Pt[] {
  const dome = [...oval(0, RIM + 1, 38, 25, 40).filter((p) => p.y <= RIM + 1)];
  const lit = isLit(state);
  paint(d, dome, lit ? mix(ASTER.glass, '#9fb9c0', 0.5) : mix(DIM_GLASS, '#8ea4ac', 0.35), { alpha: 0.72, shadow: 0.4, hatch: 0, line: 0, gloss: true });
  d.pen.clipped(dome, () => {
    if (lit) glow(d.pen.ctx, pt(0, RIM - 6), 30, ASTER.glow, 0.35);
    for (let row = -3; row <= 1; row++) {
      for (let col = -6; col <= 6; col++) {
        const c = pt(col * 6.6 + (row % 2 ? 3.3 : 0), RIM - 10 + row * 5.6);
        const hex = hexagon(c, 3.7);
        d.pen.hair([...hex, hex[0]!], 0.35, lit ? '#2f6a63' : '#1f2c34', 0.6);
      }
    }
    dab(d, oval(-14, RIM - 16, 9, 4, 14), PAPER_FILL, 0.45, 1.2);
  });
  gleam(d, cub(pt(-30, RIM - 6), pt(-28, RIM - 16), pt(-18, RIM - 22), pt(-8, RIM - 24), 8), 0.8, 0.7);
  edge(d, dome, 0.8, 0.95);
  // The lashing round its foot, and the crown.
  for (const x of [-30, -10, 10, 30]) lash(d, pt(x - 1.4, RIM - 2.6), pt(x + 1.4, RIM + 2.4), 2);
  starGlyph(d, pt(0, RIM - 27), 5.4, ASTER.shell, true);
  paint(d, oval(0, RIM - 34, 2.6, 2.6, 12), DARK_GLASS, { alpha: 1, shadow: 0.3, hatch: 0, line: 0.55, gloss: true });
  return dome;
}

/** A hexagon of glass on the hull: dark, or glowing with power. */
function hullGlass(d: Draw, c: Pt, r: number, lit: boolean, cracked = false): void {
  const hex = hexagon(c, r);
  d.pen.stroke([...hex, hex[0]!], r * 0.36, mix(ASTER.shell, ASTER.glaze, 0.5), 1, false);
  if (lit) glow(d.pen.ctx, c, r * 2, ASTER.glow, 0.4);
  paint(d, hex, lit ? mix(ASTER.glass, GLOW_CORE, 0.25) : DARK_GLASS, { alpha: 1, shadow: lit ? 0.15 : 0.35, hatch: 0, line: 0.55, gloss: true });
  d.pen.clipped(hex, () => {
    if (lit) glow(d.pen.ctx, c, r * 0.8, GLOW_CORE, 0.8);
    for (let k = -1; k <= 1; k++) d.pen.hair([pt(c.x + k * r * 0.5, c.y - r), pt(c.x + k * r * 0.5, c.y + r)], 0.3, lit ? '#3f8d80' : '#1a2229', 0.5);
  });
  d.pen.dot(c.x - r * 0.35, c.y - r * 0.4, Math.max(0.4, r * 0.16), PAPER_FILL, 0.85);
  if (cracked) d.pen.hair([pt(c.x - r * 0.7, c.y - r * 0.3), pt(c.x - 0.2, c.y + 0.3), pt(c.x + r * 0.6, c.y - r * 0.1), pt(c.x + r * 0.3, c.y + r * 0.8)], 0.4, PAPER_FILL, 0.85);
}

/** The fan of petal thrusters under the keel, round a glass core. */
function thrusters(d: Draw, lit: boolean): void {
  for (const a of [Math.PI / 2 + 0.55, Math.PI / 2 - 0.55, Math.PI / 2 + 0.18, Math.PI / 2 - 0.18]) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    const root = pt(c * 4, KEEL - 2);
    const at = (u: number, v: number): Pt => pt(root.x + c * u - s * v, root.y + s * u + c * v);
    const len = Math.abs(a - Math.PI / 2) > 0.3 ? 12 : 14;
    const shape = [at(0, -3.4), ...cub(at(0, -3.4), at(len * 0.5, -5), at(len * 0.9, -2.6), at(len, 0), 6), ...cub(at(len, 0), at(len * 0.9, 2.6), at(len * 0.5, 5), at(0, 3.4), 6)];
    paint(d, shape, mix(ASTER.shell, ASTER.glaze, 0.4), { alpha: 1, shadow: 0.5, hatch: 0.14, line: 0.7, gloss: true });
    dab(d, oval(at(len * 0.78, 0).x, at(len * 0.78, 0).y, 2.6, 1.8, 10), '#2a2238', 0.5, 0.7);
  }
  hullGlass(d, pt(0, KEEL + 1), 3.2, lit);
}

/** Weed grown on it: olive blades rising from its edges, waving, ribbed down the middle. */
function weed(d: Draw, roots: readonly Pt[], seed: number, len: number): void {
  roots.forEach((r, i) => {
    const l = len * (0.6 + hash(i, seed, 1700) * 0.6);
    const sway = (hash(i, seed, 1701) - 0.3) * 8;
    const strand = cub(r, pt(r.x + sway * 0.3, r.y - l * 0.35), pt(r.x + sway, r.y - l * 0.7), pt(r.x + sway * 1.3, r.y - l), 12);
    const { shape } = ribbon(strand, (u) => 0.6 + Math.sin(u * Math.PI) * 2.2);
    paint(d, shape, mix(WEED, TIDE.fibre, hash(i, seed, 1702) * 0.5), { alpha: 0.95, shadow: 0.4, hatch: 0, line: 0.45 });
    d.pen.hair(strand.slice(1, -1), 0.3, mix(WEED, PAPER_FILL, 0.45), 0.7);
  });
}

/** Purple slime smeared over it: translucent, glossy, dripping. */
function slime(d: Draw, at: Pt, w: number, seed: number): void {
  const blob = oval(at.x, at.y, w, w * 0.45, 16).map((p, i) => pt(p.x + (hash(i, seed, 1710) - 0.5) * w * 0.3, p.y + (hash(i, seed, 1711) - 0.5) * w * 0.2));
  dab(d, blob, SLIME, 0.55, 0.5);
  d.pen.hair([...blob, blob[0]!], 0.35, mix(SLIME, SHADOW, 0.4), 0.6);
  const drip = pt(at.x + w * 0.2, at.y + w * 0.4);
  dab(d, [pt(drip.x - 0.9, drip.y - 1), pt(drip.x + 0.9, drip.y - 1), pt(drip.x + 1, drip.y + w * 0.5), pt(drip.x, drip.y + w * 0.6), pt(drip.x - 1, drip.y + w * 0.5)], SLIME, 0.55, 0.3);
  gleam(d, [pt(at.x - w * 0.5, at.y - w * 0.1), pt(at.x - w * 0.1, at.y - w * 0.3)], 0.5, 0.7);
}

/** A black plate of magnetite iron over a crack, cut rough, riveted as we'd do it and bound on with their cord. */
function patch(d: Draw, crack: readonly Pt[]): void {
  const xs = crack.map((p) => p.x);
  const ys = crack.map((p) => p.y);
  const c = pt((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2);
  const hw = (Math.max(...xs) - Math.min(...xs)) / 2 + 3;
  const hh = (Math.max(...ys) - Math.min(...ys)) / 2 + 2.4;
  const plate = [pt(c.x - hw, c.y - hh + 1.2), pt(c.x - hw * 0.2, c.y - hh), pt(c.x + hw, c.y - hh + 0.6), pt(c.x + hw - 0.6, c.y + hh - 0.8), pt(c.x - hw * 0.1, c.y + hh), pt(c.x - hw + 0.4, c.y + hh - 1.2)];
  paint(d, plate, IRON, { alpha: 1, shadow: 0.45, hatch: 0.15, line: 0.65, gloss: true });
  d.pen.clipped(plate, () => {
    dab(d, oval(c.x - hw * 0.4, c.y - hh * 0.45, hw * 0.55, hh * 0.25, 10), '#77758a', 0.45, 0.6);
    d.pen.stipple(plate, 20, () => 0.6, 0.25, '#55535e');
  });
  for (const k of [0, 2, 3, 5]) {
    const p = plate[k]!;
    const r = pt(p.x + (c.x - p.x) * 0.28, p.y + (c.y - p.y) * 0.28);
    d.pen.dot(r.x, r.y, 0.6, '#646270', 1);
    d.pen.dot(r.x - 0.2, r.y - 0.25, 0.25, PAPER_FILL, 0.8);
  }
  // One turn of cord bound over it, as they bind everything.
  d.pen.stroke([pt(c.x - hw - 1, c.y + 0.6), pt(c.x + hw + 1, c.y - 0.6)], 1, ASTER.cord, 1, false);
  d.pen.hair([pt(c.x - hw - 0.6, c.y + 0.2), pt(c.x + hw + 0.6, c.y - 1)], 0.3, '#c98b6c', 0.85);
}

/** The craft as built, level, in its own frame (keel at KEEL). */
function craft(d: Draw, state: CraftState): void {
  const lit = isLit(state);
  const sunk = state === 'sunk';
  // The far side petal, the back of the rim, then the canopy over the cup.
  sidePetal(d, pt(40, RIM + 4), -Math.PI / 2 + 0.6, 42, 19, true);
  const rimBack = oval(0, RIM, HALF, 6, 40).filter((p) => p.y <= RIM + 0.2);
  paint(d, [...rimBack, pt(HALF, RIM + 2), pt(-HALF, RIM + 2)], mix(ASTER.glaze, SHADOW, 0.35), { alpha: 1, shadow: 0, hatch: 0, line: 0.6 });
  const dome = canopy(d, state);
  if (sunk) d.pen.clipped(dome, () => d.pen.hair(CANOPY_CRACK, 0.5, PAPER_FILL, 0.9));
  if (!sunk) patch(d, CANOPY_CRACK);
  thrusters(d, lit);
  const cup = cupShape();
  paint(d, cup, ASTER.shell, { alpha: 1, shadow: 0.55, hatch: 0.14, line: 1, gloss: true });
  d.pen.clipped(cup, () => {
    dab(d, oval(0, KEEL - 2, 56, 14, 24), ASTER.glaze, 0.6, 3);
    dab(d, oval(0, KEEL, 40, 6, 20), mix(ASTER.glaze, SHADOW, 0.3), 0.35, 1.6);
    // The ribs of each petal, between the seams.
    for (const x of [-42, -34, -22, -14, 14, 22, 34, 42]) rib(d, pt(x * 0.2, KEEL + 1), pt(x, RIM + 4), x * 0.06);
  });
  for (const x of [-30, -9, 9, 30]) lacing(d, seamLine(x));
  // The rim: a lip of glaze, lashed where petals meet.
  const lip = cub(pt(-HALF, RIM), pt(-24, RIM + 5), pt(24, RIM + 5), pt(HALF, RIM), 20);
  d.pen.stroke(lip, 2.2, mix(ASTER.shell, ASTER.glaze, 0.3), 1, false);
  d.pen.hair(lip.map((p) => pt(p.x, p.y + 1.2)), 0.5, mix(ASTER.glaze, SHADOW, 0.5), 0.8);
  // The band of glass, their star, the heart below it.
  for (const x of [-40, -20, 20, 40]) hullGlass(d, pt(x, -38 + Math.abs(x) * 0.12), 4 - Math.abs(x) * 0.03, lit, sunk && x === 20);
  starGlyph(d, pt(0, -45), 5.6, mix(ASTER.glaze, ASTER.ink, 0.35));
  hullGlass(d, ASTER_CRAFT_HEART, 6.4, lit);
  gleam(d, cub(pt(-46, -48), pt(-46, -38), pt(-40, -28), pt(-30, -22), 8), 0.9, 0.7);
  // The cracks, or the plates over them.
  for (const crack of CRACKS) {
    if (sunk) {
      d.pen.stroke(crack, 1, '#241c30', 0.95, false);
      d.pen.hair(crack.map((p) => pt(p.x - 0.7, p.y)), 0.4, PAPER_FILL, 0.75);
    } else patch(d, crack);
  }
  // The near side petal over the rim.
  sidePetal(d, pt(-40, RIM + 4), -Math.PI / 2 - 0.6, 44, 20, false);
  lash(d, pt(-44, RIM + 1), pt(-37, RIM + 7), 3);
  lash(d, pt(37, RIM + 7), pt(44, RIM + 1), 3);
  if (sunk) {
    for (const [x, y, w, s] of [[-24, -24, 6, 1], [30, -46, 4.4, 2], [-44, -44, 3.4, 3], [8, -22, 3, 4], [-16, -82, 3.6, 5]] as const) slime(d, pt(x, y), w, s);
    weed(d, [pt(-48, -56), pt(-44, -57), pt(-51, -52), pt(46, -56), pt(42, -57)], 1, 16);
  } else {
    // A little of it still on, where the slime wasn't scraped off; out of the sea, the weed is gone.
    slime(d, pt(-24, -22), 3.6, 6);
    if (!onGround(state)) weed(d, [pt(-48, -56), pt(46, -56)], 2, 9);
  }
}

/** The lift bladders over it, tethered to its rim. */
function bladders(d: Draw): void {
  for (const [c, r, to] of [[pt(-50, -100), 9, pt(-47, RIM + 1)], [pt(0, -108), 8, pt(0, RIM - 34)], [pt(51, -98), 9.6, pt(47, RIM + 1)]] as const) {
    const mouth = liftBag(d, c, r);
    fibreCord(d, mouth, to, 1, 0.8);
  }
}

/** The heap of reef sand it ploughed up where it lies. */
function heap(d: Draw): void {
  const mound = [pt(-62, 2), ...cub(pt(-62, 0), pt(-44, -8), pt(-18, -13), pt(2, -12), 8), ...cub(pt(2, -12), pt(26, -11), pt(46, -6), pt(66, 0), 8), pt(66, 2)];
  paint(d, mound, SAND, { alpha: 1, shadow: 0.5, hatch: 0.2, line: 0.7 });
  d.pen.clipped(mound, () => d.pen.stipple(mound, 120, () => 0.6, 0.35, mix(SAND, SHADOW, 0.45)));
  edge(d, mound.slice(1, -2), 0.8, 0.85);
}

/**
 * The Aster crew's craft (spec, "Brine", steps 5, 12 and 13): sunk on the
 * reef, raised on bladders and patched, or mended with its glass glowing.
 * Its heart is at `ASTER_CRAFT_HEART` (level); the glow round it is
 * `drawAsterCraftAir`.
 */
export function drawAsterCraft(d: Draw, state: CraftState): void {
  const { ctx } = d.pen;
  if (state === 'sunk') {
    ctx.save();
    ctx.translate(-4, 9);
    ctx.rotate(0.3);
    craft(d, state);
    ctx.restore();
    // Nothing below the reef: the reef itself is the world's.
    ctx.clearRect(-ASTER_CRAFT.ox, 1.5, ASTER_CRAFT.w, ASTER_CRAFT.h);
    heap(d);
    weed(d, [pt(-50, -1), pt(-46, -2), pt(56, -1)], 3, 12);
    return;
  }
  if (onGround(state)) {
    // Out of the water: on its legs, or lifting off with them folded.
    const lift = craftLift(state, d.f);
    craftGround(d, state);
    ctx.save();
    ctx.translate(0, -lift);
    craftLegs(d, state, lift, true);
    craft(d, state);
    craftLegs(d, state, lift, false);
    ctx.restore();
    if (state === 'flying') craftDrips(d, lift);
    return;
  }
  // Floating: it rides a little over the reef, the bladders holding it level.
  dab(d, oval(0, 0, 50, 3, 24), SHADOW, 0.14, 2);
  ctx.save();
  ctx.translate(0, -4 + [0, -0.5, 0.4][d.f]!);
  bladders(d);
  craft(d, state);
  ctx.restore();
}

/** What's round it (drawn after its finish): when mended, the glow of its glass in the water; out of it, in the air, and the thrust under it as it lifts off. */
export function drawAsterCraftAir(d: Draw, state: CraftState): void {
  const { ctx } = d.pen;
  if (onGround(state)) {
    const y = -craftLift(state, d.f);
    if (state === 'flying') craftThrust(d, -y);
    glow(ctx, pt(ASTER_CRAFT_HEART.x, ASTER_CRAFT_HEART.y + y), 24 * [1, 0.92, 1.08][d.f]!, ASTER.glow, 0.38);
    glow(ctx, pt(0, RIM - 8 + y), 36, ASTER.glow, 0.16);
    return;
  }
  if (state !== 'mended') return;
  const y = -4 + [0, -0.5, 0.4][d.f]!;
  glow(ctx, pt(ASTER_CRAFT_HEART.x, ASTER_CRAFT_HEART.y + y), 26, ASTER.glow, 0.4);
  glow(ctx, pt(0, RIM - 8 + y), 40, ASTER.glow, 0.2);
  glow(ctx, pt(0, KEEL + 4 + y), 14, ASTER.glow, 0.3);
}
