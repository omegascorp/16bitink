import { closed, cub, oval, pt, ribbon, type Draw } from '../../../src/art/kit';
import { blob } from '../../../src/art/creatures/flesh';
import { dab, gleam, glow, mix, paint, rgba, soft, SHADOW } from '../../../src/art/paint';
import { PAPER_FILL } from '../../../src/art/palette';
import { pathOf, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import type { Frame } from '../sprites';

/**
 * The Leviathan coming at you, painted at video size: the game draws it side
 * on (src/art/creatures/leviathan.ts), and this is that same animal from
 * ahead and a little to one side, with its colours, its bowhead's arched
 * mouth, baleen combs, pleated throat, salt crust and barnacles, its great
 * eyes and its rows of lights. It comes apart in layers so the jaw can open
 * (gape, render.ts): the body behind, the throat, the lower jaw, the upper
 * jaw with its baleen. All of it in units of HEAD_UNIT screen px, origin at
 * the middle of the mouth.
 */
export const HEAD_UNIT = 4;
export const HEAD_FRAME: Frame = { w: 380, h: 460, ox: 190, oy: 220 };
export const BODY_FRAME: Frame = { w: 1100, h: 860, ox: 800, oy: 640 };
export const HEAD_RES = 5;
export const BODY_RES = 2.4;
/** The line through the mouth's corners: the jaws open about it. */
export const HINGE_Y = 18;

export const BACK = '#36334f';
export const BELLY = '#a99fbb';
export const JAW = '#7f779a';
export const SPOT = '#9b95b8';
export const CRUST = '#ece7df';
export const THROAT = '#241626';
export const BALEEN = '#e6dbc0';
export const TONGUE = '#9c5a78';
export const PHOTO = '#bdf4ff';
export const EYE_GLOW = '#9fe7ff';

const NEAR = pt(-100, 34);
const FAR = pt(118, -4);
const APEX = pt(8, -118);
const CHIN = pt(-6, 136);
/** Where the throat goes down. */
export const GULLET = pt(14, 8);

/** The great arched upper lip, near corner to far. */
export const LIP_U: readonly Pt[] = [...cub(NEAR, pt(-96, -44), pt(-58, -116), APEX, 40), ...cub(APEX, pt(62, -120), pt(114, -58), FAR, 40).slice(1)];
/** The lower lip, near corner to far, round under the chin. */
export const LIP_L: readonly Pt[] = [...cub(NEAR, pt(-104, 106), pt(-58, 138), CHIN, 30), ...cub(CHIN, pt(56, 138), pt(116, 72), FAR, 30).slice(1)];
const DOME: readonly Pt[] = [...cub(pt(-146, 52), pt(-168, -70), pt(-80, -176), pt(12, -160), 40), ...cub(pt(12, -160), pt(96, -150), pt(158, -70), pt(146, 10), 40).slice(1)];
const CHIN_EDGE: readonly Pt[] = [...cub(pt(-146, 52), pt(-156, 136), pt(-70, 186), pt(-8, 186), 30), ...cub(pt(-8, 186), pt(74, 186), pt(160, 100), pt(146, 10), 30).slice(1)];
const UPPER: readonly Pt[] = [...DOME, ...[...LIP_U].reverse()];
const LOWER: readonly Pt[] = [...CHIN_EDGE, ...[...LIP_L].reverse()];
const OPENING: readonly Pt[] = [...LIP_U, ...[...LIP_L].reverse()];

/** The near and far eyes, on the head's sides above the mouth's corners. */
export const EYE_NEAR = pt(-113, -32);
export const EYE_FAR = pt(125, -38);

const scaled = (shape: readonly Pt[], c: Pt, k: number): Pt[] => shape.map((p) => pt(c.x + (p.x - c.x) * k, c.y + (p.y - c.y) * k));

/** A barnacle-like cone, as the game's Leviathan carries: grey-white shell, a dark slot, weathered into the hide. */
function barnacle(d: Draw, c: Pt, r: number): void {
  const shell = mix(CRUST, BACK, 0.34);
  const cone = [pt(c.x - r, c.y + r * 0.4), pt(c.x - r * 0.55, c.y - r * 0.55), pt(c.x + r * 0.55, c.y - r * 0.55), pt(c.x + r, c.y + r * 0.4)];
  d.pen.fill(cone.map((p) => pt(p.x + r * 0.3, p.y + r * 0.4)), SHADOW, 0.45);
  d.pen.fill(cone, shell, 1);
  d.pen.hair([pt(c.x - r * 0.8, c.y + r * 0.3), pt(c.x - r * 0.4, c.y - r * 0.5), pt(c.x + r * 0.3, c.y - r * 0.55)], r * 0.14, mix(CRUST, PAPER_FILL, 0.4), 0.8);
  d.pen.hair([pt(c.x - r * 0.3, c.y + r * 0.35), pt(c.x - r * 0.15, c.y - r * 0.3)], r * 0.1, mix(BACK, SHADOW, 0.3), 0.6);
  d.pen.fill(oval(c.x, c.y - r * 0.5, r * 0.34, r * 0.13, 8), THROAT, 0.95);
}

/** A patch of salt crust with barnacles grown into it. */
function crustPatch(d: Draw, c: Pt, rx: number, ry: number, n: number, seed: number): void {
  const rng = createRng(seed);
  const patch = blob(c, rx, ry, 0.8, seed, 26);
  dab(d, patch, mix(CRUST, BACK, 0.62), 0.42, 4);
  dab(d, blob(c, rx * 0.66, ry * 0.6, 0.9, seed + 1, 22), mix(CRUST, BACK, 0.3), 0.42, 2.2);
  d.pen.stipple(patch, Math.round(rx * ry * 2.4), () => 0.65, 0.5, mix(CRUST, BACK, 0.2));
  d.pen.stipple(patch, Math.round(rx * ry * 1.6), () => 0.6, 0.45, mix(BACK, SHADOW, 0.5));
  for (let j = 0; j < n * 3; j++) barnacle(d, pt(c.x + (rng() - 0.5) * rx * 1.5, c.y + (rng() - 0.5) * ry * 1.2), 0.9 + rng() * rng() * 2.6);
}

/** The point `f` of the way along one side of the arch: 0 at the top of the arch, 1 at that side's corner. */
function archAt(side: 'near' | 'far', f: number): Pt {
  const n = LIP_U.length - 1;
  const mid = n / 2;
  const at = side === 'near' ? mid * (1 - f) : mid + mid * f;
  const i = Math.min(n - 1, Math.floor(at));
  const u = at - i;
  return pt(LIP_U[i]!.x + (LIP_U[i + 1]!.x - LIP_U[i]!.x) * u, LIP_U[i]!.y + (LIP_U[i + 1]!.y - LIP_U[i]!.y) * u);
}

/** One side's comb of baleen: stiff tapering plates with dark gaps between, longest along the sides, in the shadow of the arch. */
function comb(d: Draw, side: 'near' | 'far', plates: number): void {
  const { ctx } = d.pen;
  const rng = createRng(side === 'near' ? 7401 : 7402);
  const depth = side === 'near' ? 1 : 0.84;
  for (let k = 0; k <= plates; k++) {
    const f = k / plates;
    const root = archAt(side, f);
    const len = (9 + 92 * Math.pow(Math.sin(Math.PI * (0.04 + 0.86 * f)), 0.9)) * depth * (0.88 + rng() * 0.2);
    const lean = (GULLET.x - root.x) * (0.1 + 0.16 * f);
    const tip = pt(root.x + lean, root.y + len);
    const w = 2.5 + rng() * 0.9;
    const blade = [pt(root.x - w, root.y - 3), pt(root.x + w, root.y - 3), ...cub(pt(root.x + w, root.y), pt(root.x + w * 0.9 + lean * 0.3, root.y + len * 0.5), pt(tip.x + w * 0.3, tip.y - len * 0.2), tip, 8), ...cub(tip, pt(tip.x - w * 0.5, tip.y - len * 0.2), pt(root.x - w * 0.8 + lean * 0.3, root.y + len * 0.5), pt(root.x - w, root.y), 8).slice(1)];
    const g = ctx.createLinearGradient(root.x, root.y, tip.x, tip.y);
    const pale = mix(BALEEN, '#8c7f93', 0.18 + 0.4 * rng());
    g.addColorStop(0, mix(pale, THROAT, 0.92));
    g.addColorStop(0.3, mix(pale, THROAT, 0.42));
    g.addColorStop(0.82, pale);
    g.addColorStop(1, mix(pale, PAPER_FILL, 0.35));
    ctx.save();
    ctx.fillStyle = g;
    pathOf(ctx, blade);
    ctx.fill();
    ctx.restore();
    d.pen.hair([pt(root.x + w * 0.7, root.y + 3), pt(root.x + w * 0.45 + lean * 0.4, root.y + len * 0.55), pt(tip.x + 0.5, tip.y - 2)], 0.6, '#120a18', 0.85);
    d.pen.hair([pt(root.x - w * 0.5 + lean * 0.3, root.y + len * 0.4), pt(tip.x - 0.5, tip.y - len * 0.08)], 0.32, mix(BALEEN, PAPER_FILL, 0.5), 0.55);
  }
}

/** The baleen: its own layer, unfinished, so the plates stay fine. */
export function drawBaleen(d: Draw): void {
  comb(d, 'far', 44);
  comb(d, 'near', 44);
  d.pen.stroke(LIP_U.map((p) => pt(p.x + (GULLET.x - p.x) * 0.07, p.y + 9)), 15, '#0a0610', 0.7, false);
}

/** The throat: dark, ribbed, the great tongue lying in it, the gullet at the back. */
export function drawThroat(d: Draw): void {
  const { ctx } = d.pen;
  d.pen.fill(scaled(OPENING, GULLET, 1.03), THROAT, 1);
  d.pen.clipped(scaled(OPENING, GULLET, 1.03), () => {
    const wall = ctx.createRadialGradient(GULLET.x, GULLET.y, 20, GULLET.x, GULLET.y, 140);
    wall.addColorStop(0, '#05030a');
    wall.addColorStop(0.42, '#0d0814');
    wall.addColorStop(0.8, mix(THROAT, TONGUE, 0.22));
    wall.addColorStop(1, mix(THROAT, TONGUE, 0.42));
    ctx.fillStyle = wall;
    ctx.fillRect(-190, -220, 380, 460);
    for (const k of [0.92, 0.82, 0.71, 0.6, 0.5, 0.41]) {
      const ring = scaled(OPENING, GULLET, k);
      d.pen.hair(closed(ring), 1.5, '#05030a', 0.55);
      d.pen.hair(closed(scaled(ring, GULLET, 1.018)), 0.7, mix(THROAT, TONGUE, 0.75), 0.42 * k);
    }
    const tongue = [...cub(pt(-104, 130), pt(-86, 76), pt(-34, 86), pt(14, 92), 18), ...cub(pt(14, 92), pt(62, 96), pt(96, 66), pt(118, 84), 14).slice(1), pt(120, 160), pt(-104, 160)];
    paint(d, tongue, mix(TONGUE, SHADOW, 0.25), { alpha: 1, shadow: 0.75, hatch: 0.16, line: 0.7, cross: true });
    d.pen.hair(cub(pt(-16, 146), pt(-4, 128), pt(8, 112), pt(14, 96), 12), 3, mix(TONGUE, SHADOW, 0.75), 0.6);
    d.pen.stipple(tongue, 900, () => 0.5, 0.6, mix(TONGUE, SHADOW, 0.6));
    gleam(d, cub(pt(-70, 104), pt(-50, 92), pt(-24, 92), pt(0, 100), 10), 2, 0.3);
    dab(d, oval(GULLET.x, GULLET.y - 10, 74, 74, 26), '#030208', 0.9, 16);
  });
}

/** Skin over a jaw band: whale-shark spots, stipple and old pale scars. */
function hide(d: Draw, shape: readonly Pt[], spots: number, seed: number): void {
  const rng = createRng(seed);
  d.pen.clipped(shape, () => {
    const ys = shape.map((p) => p.y);
    const xs = shape.map((p) => p.x);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    for (let i = 0; i < spots; i++) d.pen.dot(x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0), 0.9 + rng() * 1.5, SPOT, 0.5);
    d.pen.stipple(shape, 2600, () => 0.45, 0.55, mix(BACK, SHADOW, 0.5));
  });
}

/** The crusted upper jaw over the arch: a long wash of cold light on the dome, deep shadow under the brow of the lip. */
export function drawUpperJaw(d: Draw): void {
  const { ctx } = d.pen;
  paint(d, UPPER, BACK, { alpha: 1, shadow: 0.75, hatch: 0.18, line: 1.4, cross: true });
  hide(d, UPPER, 170, 7410);
  d.pen.clipped(UPPER, () => {
    soft(ctx, 9, () => {
      d.pen.stroke(LIP_U.map((p) => pt(p.x + (p.x - GULLET.x) * 0.14, p.y - 10)), 24, mix(BACK, SHADOW, 0.6), 0.6, false);
      d.pen.stroke(DOME.map((p) => pt(p.x * 0.93, p.y * 0.93 - 2)), 20, '#141030', 0.65, false);
      d.pen.stroke(cub(pt(-120, -70), pt(-90, -128), pt(-30, -146), pt(50, -142), 24), 12, mix(BELLY, PAPER_FILL, 0.2), 0.16, false);
    });
    crustPatch(d, pt(16, -140), 46, 14, 7, 7420);
    crustPatch(d, pt(-66, -122), 26, 12, 4, 7421);
    crustPatch(d, pt(86, -114), 22, 11, 4, 7422);
    crustPatch(d, pt(-118, -84), 12, 20, 2, 7423);
    for (const [a, b, c] of [[pt(-70, -96), pt(-40, -112), pt(-16, -118)], [pt(40, -128), pt(70, -112), pt(92, -90)], [pt(-132, 4), pt(-134, -16), pt(-126, -44)]] as const) d.pen.hair([a, b, c], 0.9, mix(BELLY, PAPER_FILL, 0.4), 0.4);
  });
  // The lip: a heavy roll along the arch.
  d.pen.stroke(LIP_U.map((p) => pt(p.x + (p.x - GULLET.x) * 0.02, p.y - 3)), 7, mix(JAW, BACK, 0.55), 1, false);
  d.pen.hair(LIP_U.map((p) => pt(p.x + (p.x - GULLET.x) * 0.02, p.y - 5.4)), 1.1, mix(BELLY, PAPER_FILL, 0.2), 0.5);
  d.pen.stroke(LIP_U, 1.3, '#120a18', 0.95, false);
}

/** The lower jaw: a vast pale scoop, its throat grooves running down from the lip. */
export function drawLowerJaw(d: Draw): void {
  paint(d, LOWER, mix(JAW, BACK, 0.25), { alpha: 1, shadow: 0.78, hatch: 0.16, line: 1.4, cross: true });
  d.pen.clipped(LOWER, () => {
    dab(d, oval(-20, 174, 110, 22, 26), mix(BACK, SHADOW, 0.3), 0.6, 10);
    for (let i = 2; i < LIP_L.length - 2; i += 2) {
      const a = LIP_L[i]!;
      const u = i / (LIP_L.length - 1);
      const b = CHIN_EDGE[Math.round(u * (CHIN_EDGE.length - 1))]!;
      const fold = [pt(a.x, a.y + 4), pt((a.x + b.x) / 2 + (u - 0.5) * 7, (a.y + b.y) / 2 + 1), b];
      d.pen.hair(fold, 1.1, mix(JAW, SHADOW, 0.68), 0.75);
      d.pen.hair(fold.map((p) => pt(p.x + 1.2, p.y)), 0.55, mix(JAW, PAPER_FILL, 0.5), 0.42);
    }
    crustPatch(d, pt(-34, 170), 26, 8, 4, 7430);
    crustPatch(d, pt(52, 158), 18, 6, 3, 7431);
  });
  d.pen.stroke(LIP_L.map((p) => pt(p.x + (p.x - GULLET.x) * 0.02, p.y + (p.y - GULLET.y) * 0.022)), 8, mix(JAW, BACK, 0.2), 1, false);
  d.pen.hair(LIP_L.map((p) => pt(p.x + (p.x - GULLET.x) * 0.02, p.y + (p.y - GULLET.y) * 0.012)), 1.3, mix(BELLY, PAPER_FILL, 0.35), 0.55);
  d.pen.stroke(LIP_L, 1.3, '#120a18', 0.95, false);
}

/** The body running back into the dark, and the head's mass (what shows while the mouth is shut). */
export function drawBody(d: Draw): void {
  const spine = cub(pt(0, -30), pt(-70, -200), pt(-260, -340), pt(-790, -420), 56);
  const b = ribbon(spine, (u) => 330 - 225 * Math.pow(u, 0.62));
  paint(d, b.shape, BACK, { alpha: 1, shadow: 0.75, hatch: 0.12, line: 1.3, cross: true });
  d.pen.clipped(b.shape, () => {
    d.pen.stipple(b.shape, 5000, () => 0.5, 0.8, mix(BACK, SHADOW, 0.5));
    dab(d, b.bot.map((p, i) => pt(p.x + (b.top[i]!.x - p.x) * 0.3, p.y + (b.top[i]!.y - p.y) * 0.3)).concat([...b.bot].reverse()), BELLY, 0.3, 14);
  });
  const mass = [...DOME, ...[...CHIN_EDGE].reverse()];
  paint(d, mass, BACK, { alpha: 1, shadow: 0.7, hatch: 0.14, line: 1.3, cross: true });
  crustPatch(d, pt(10, -130), 40, 16, 8, 7440);
  crustPatch(d, pt(-40, 120), 30, 12, 4, 7441);
  d.pen.stroke(cub(pt(-140, 44), pt(-60, 66), pt(60, 60), pt(144, 12), 20), 2.4, d.ink, 0.9, false);
}

/** The lights down the body's flank: rows of cold glows running back into the dark. */
export function drawBodyLights(d: Draw): void {
  const spine = cub(pt(0, -30), pt(-70, -200), pt(-260, -340), pt(-790, -420), 72);
  const b = ribbon(spine, (u) => 330 - 225 * Math.pow(u, 0.62));
  for (let i = 4; i < spine.length; i += 1) {
    const u = i / (spine.length - 1);
    for (const k of [0.3, 0.46]) {
      const p = pt(b.bot[i]!.x + (b.top[i]!.x - b.bot[i]!.x) * k, b.bot[i]!.y + (b.top[i]!.y - b.bot[i]!.y) * k);
      light(d, p, 5.6 * (1 - u * 0.8));
    }
  }
  // They run behind the head: nothing of them shows through it.
  const { ctx } = d.pen;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  pathOf(ctx, [...DOME, ...[...CHIN_EDGE].reverse()]);
  ctx.fill();
  ctx.restore();
}

/** One photophore: a soft cold halo, a bright core. */
function light(d: Draw, p: Pt, r: number): void {
  glow(d.pen.ctx, p, r * 3.6, PHOTO, 0.26);
  glow(d.pen.ctx, p, r * 1.7, PHOTO, 0.55);
  d.pen.fill(oval(p.x, p.y, r * 0.72, r * 0.62, 12), PHOTO, 0.95);
  d.pen.dot(p.x, p.y, r * 0.34, '#ffffff', 1);
}

/** A cold sheen along a lip, the mouth's arch catching the eyes' light. */
function sheen(d: Draw, lip: readonly Pt[], out: number, alpha: number): void {
  const edge = lip.map((p) => pt(p.x + (p.x - GULLET.x) * out, p.y + (p.y - GULLET.y) * out));
  soft(d.pen.ctx, 3, () => d.pen.stroke(edge, 5, PHOTO, alpha * 0.5, false));
  d.pen.hair(edge, 1.3, PHOTO, alpha);
}

/** The cold edge of each lip, a layer of its own: it opens with the jaw. */
export function drawUpperSheen(d: Draw): void {
  sheen(d, LIP_U, 0.05, 0.42);
}
export function drawLowerSheen(d: Draw): void {
  sheen(d, LIP_L, 0.03, 0.3);
}

/** The lights along the upper jaw: down the cheeks from the eyes. */
export function drawUpperLights(d: Draw): void {
  for (let i = 0; i < 9; i++) {
    const f = i / 8;
    light(d, pt(-132 + 26 * f * f, -62 - 74 * f), 4.2 - f * 1.1);
    light(d, pt(146 - 34 * f * f, -56 - 72 * f), 3.2 - f * 0.9);
  }
}

/** The lights along the lower jaw, running back from the mouth's corners. */
export function drawLowerLights(d: Draw): void {
  for (let i = 0; i < 12; i++) {
    const f = i / 11;
    light(d, pt(-133 + 66 * f * f, 64 + 96 * f), 4.2 - f * 1.3);
    light(d, pt(137 - 58 * f * f, 36 + 98 * f), 3.2 - f * 1.1);
  }
}

/** Both eyes, their own layer, laid on after the deep-water grade so they blaze. */
export function drawEyes(d: Draw): void {
  greatEye(d, EYE_NEAR, 15, 1, 1);
  greatEye(d, EYE_FAR, 12, -0.5, 1);
}

/**
 * The great eye, as the game's (a wrinkled socket, a dark globe, a cold light
 * in the iris, a slit pupil, a heavy upper lid), at any size, the brow low
 * towards the snout. `wide` squeezes it across, and flips it for the far side.
 */
export function greatEye(d: Draw, c: Pt, r: number, wide: number, open: number): void {
  const { ctx } = d.pen;
  const lidSkin = mix(BACK, SHADOW, 0.15);
  const fold = mix(BACK, SHADOW, 0.7);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(wide, 1);
  ctx.translate(-c.x, -c.y);
  const socket = oval(c.x, c.y, r * 1.36, r * 1.08, 28);
  dab(d, oval(c.x, c.y, r * 1.8, r * 1.5, 26), '#0d0a1c', 0.8, r * 0.25);
  d.pen.fill(socket, mix(BACK, SHADOW, 0.5), 1);
  const globe = oval(c.x, c.y, r * 1.05, r * 0.86, 28);
  d.pen.fill(globe, '#071018', 1);
  d.pen.clipped(globe, () => {
    const iris = ctx.createRadialGradient(c.x, c.y, r * 0.1, c.x, c.y, r * 1.05);
    iris.addColorStop(0, rgba('#f4feff', open));
    iris.addColorStop(0.4, rgba(EYE_GLOW, open));
    iris.addColorStop(0.78, rgba('#2f9fc4', open));
    iris.addColorStop(1, rgba('#0c3a55', open));
    ctx.fillStyle = iris;
    ctx.fillRect(c.x - r * 1.2, c.y - r * 1.2, r * 2.4, r * 2.4);
    for (let i = 0; i < 56; i++) {
      const a = (i / 56) * Math.PI * 2;
      d.pen.hair([pt(c.x + Math.cos(a) * r * 0.3, c.y + Math.sin(a) * r * 0.2), pt(c.x + Math.cos(a) * r * 0.98, c.y + Math.sin(a) * r * 0.8)], r * 0.016, '#14607c', 0.55);
    }
    d.pen.fill(oval(c.x + r * 0.05, c.y + r * 0.06, r * 0.56, r * 0.17, 18), '#04030a', 1);
    // The heavy upper lid, down over the globe, sloping to the snout; drawn lower as the eye shuts.
    const left = c.y - r * 0.5 + r * 1.3 * (1 - open);
    const right = c.y - r * 0.22 + r * 1.02 * (1 - open);
    const droop = r * (0.06 + 0.28 * (1 - open));
    const rim = cub(pt(c.x - r * 1.5, left), pt(c.x - r * 0.5, left + droop), pt(c.x + r * 0.5, right + droop), pt(c.x + r * 1.5, right), 16);
    d.pen.fill([pt(c.x - r * 1.5, c.y - r * 1.5), pt(c.x + r * 1.5, c.y - r * 1.5), ...[...rim].reverse()], lidSkin, 1);
    dab(d, oval(c.x - r * 0.3, c.y - r * 0.55 + r * 0.5 * (1 - open), r * 0.8, r * 0.26, 16), mix(BACK, BELLY, 0.5), 0.42, r * 0.12);
    d.pen.stroke(rim.map((p) => pt(p.x, p.y + r * 0.03)), r * 0.13, '#02040a', 0.55 + 0.35 * open, false);
    for (const up of [0.2, 0.44, 0.7]) d.pen.hair(rim.map((p, i) => pt(p.x, p.y - r * up + Math.sin(i * 0.5 + up * 9) * r * 0.012)), r * 0.03, fold, 0.7);
  });
  // The brow: a fold of old skin over the lid, and the wrinkles round the socket.
  const browTop = cub(pt(c.x - r * 1.9, c.y - r * 0.2), pt(c.x - r * 1.1, c.y - r * 1.5), pt(c.x + r * 0.6, c.y - r * 1.2), pt(c.x + r * 1.7, c.y + r * 0.34), 18);
  const browLow = cub(pt(c.x + r * 1.7, c.y + r * 0.34), pt(c.x + r * 0.6, c.y - r * 0.52), pt(c.x - r * 0.8, c.y - r * 0.74), pt(c.x - r * 1.9, c.y - r * 0.2), 18);
  paint(d, [...browTop, ...browLow.slice(1, -1)], mix(BACK, SHADOW, 0.35), { alpha: 1, shadow: 0.7, hatch: 0.12, line: r * 0.02, lineAlpha: 0.7 });
  const brow = [...browTop, ...browLow.slice(1, -1)];
  d.pen.stipple(brow, Math.round(r * 18), () => 0.55, r * 0.012, fold);
  for (const up of [0.16, 0.34, 0.5]) d.pen.hair(browLow.map((p, i) => pt(p.x + Math.sin(i * 0.6 + up * 7) * r * 0.012, p.y - r * up * Math.sin((i / (browLow.length - 1)) * Math.PI))), r * 0.022, fold, 0.75);
  d.pen.hair(browLow.map((p) => pt(p.x, p.y - r * 0.03)), r * 0.014, PHOTO, 0.3);
  const rng = createRng(7470);
  for (let k = 0; k < 7; k++) {
    const a = 0.1 + k * 0.42;
    const rad = r * (1.42 + 0.34 * (k % 3));
    d.pen.hair(Array.from({ length: 6 }, (_, i) => pt(c.x + Math.cos(a + i * 0.09) * rad, c.y + Math.sin(a + i * 0.09) * rad * 0.86 + r * 0.05)), r * (0.05 + rng() * 0.05), fold, 0.8);
  }
  soft(ctx, r * 0.03, () => d.pen.dot(c.x - r * 0.38, c.y - r * 0.12, r * 0.12, PAPER_FILL, 0.95 * open));
  ctx.restore();
}
