import { PAPER_FILL } from '../../../../src/art/fish/kit';
import { INK, type Pt } from '../../../../src/art/pen';
import { BOIL_FRAMES } from '../../../../src/art/textures';
import { spline } from '../../kraken/whale';
import { type Placed } from '../../seal/story';
import {
  blit, type Box, type Brush, type Bucket, bucketFor, columnWash, dab, frames, lazily, mixStops, px, screenScale, shade, softLine, step01, taper,
} from '../../seal/art/paint';
import { clump, grain, inkEdge, shadeLocks, unit } from './bearFur';
import { ARM_BOX, ARM_LEN, HIND_BOX, LAVENDER, LIGHT, PAW_BOX, paintArm, paintHind, paintPaw } from './bearLimbs';
import {
  along, BEAR_EYE, BODY, BODY_BOX, BRIDGE_TILT, EAR_FAR, EAR_NEAR, EDGE_TOP, EDGE_UNDER, HIP_FAR, HIP_NEAR, JAWLINE, LIP, LOCKS, NOSE,
  SHOULDER_FAR, SHOULDER_NEAR, TAIL, topAt, underAt,
} from './bearShape';

export { BEAR_EYE } from './bearShape';

/**
 * A young polar bear swimming (side view, the dog paddle), painted in the manner of the great white and the
 * Cape fur seal: the coat a wash laid column by column from cream and pale yellow along the back to blue-grey
 * and lavender underneath, lit along the back, a core shadow on the flank and the water's cool light under the
 * belly; fur strokes that follow the form, clumps where the coat is long, and an outline softly broken by short
 * locks. A small head with a long, straight Roman-nosed muzzle, a black nose and lip line, a dark eye set well
 * back with a catchlight (live), small round ears set low and back; a long thick neck into a shoulder hump, the
 * back sloping to a low rump with a short tail. The legs are sprites turned live (./bearLimbs.ts): the forelegs
 * reach and pull with huge flat paws flexing at the wrist, the hind legs trail.
 * Own units: 245 long nose to rump, the middle at 0,0, nose to the right (+x), belly down (+y).
 */

export const BEAR_UNITS = 245;

export interface BearPlaced extends Omit<Placed, 'len'> {
  /** Nose to rump, px. */
  readonly len: number;
}

export interface BearLook {
  /** 0: bright cream; 1: a dark shape. */
  readonly dark?: number;
  /** Eyes wide, the head back: 0 .. 1. */
  readonly shock?: number;
  /** How hard the paws paddle, 0 still .. 1; low effort lets the legs hang limp. */
  readonly effort?: number;
}

const SHADOW = '#1a2230';

// ---------------------------------------------------------------- the coat's colour

const AT = [0, 0.18, 0.4, 0.62, 0.82, 1] as const;
const BODY_PAL = ['#fff6dc', '#f5e7c2', '#e9d7a8', '#d3c8ad', '#a8aabd', '#86889f'] as const;
const NECK_PAL = ['#fdf2d2', '#f3e2b4', '#e6d09a', '#d0c3a2', '#a6a8bb', '#84869e'] as const;
const HEAD_PAL = ['#fffbee', '#faf0d6', '#f0e2c0', '#ddd3bd', '#b4b5c6', '#9798ae'] as const;

function coat(x: number): ReturnType<typeof mixStops> {
  const head = step01(x, 74, 92);
  const neck = step01(x, 20, 46) * (1 - head);
  const rump = step01(x, -80, -110) * 0.6;
  return mixStops(AT, [[BODY_PAL, Math.max(0, 1 - head - neck - rump)], [NECK_PAL, neck + rump], [HEAD_PAL, head]]);
}

// ---------------------------------------------------------------- the body

/** Light and shade in the round: the shoulder and haunch as masses, the flank's core shadow, the belly's cool light. */
function paintForm(k: Brush): void {
  const { ctx } = k;
  // Soft mottling: cool shadows and warm creamy patches, so the coat is painted, not flat.
  for (let i = 0; i < 16; i++) {
    const x = -116 + k.pen.rng() * 190;
    const v = 0.1 + k.pen.rng() * 0.7;
    const warm = k.pen.rng() < 0.5;
    dab(ctx, x, topAt(x) + (underAt(x) - topAt(x)) * v, 8 + k.pen.rng() * 14, warm ? '232,214,164' : '120,124,160', warm ? 0.12 : 0.07);
  }
  softLine(ctx, along(0.04, 120, -118), 5, '#ffffff', 0.4);
  softLine(ctx, along(0.17, 70, -112), 16, '#fffbec', 0.22);
  // The shoulder and the haunch as lit masses, soft shade behind the shoulder and in the hollow of the flank.
  dab(ctx, 24, -4, 30, '255,251,236', 0.32);
  dab(ctx, -14, 6, 26, '96,98,138', 0.1);
  dab(ctx, -8, 26, 18, '96,98,138', 0.1);
  dab(ctx, -92, -2, 24, '255,250,232', 0.3);
  dab(ctx, -64, 14, 22, '96,98,138', 0.08);
  // The flank's core shadow and, under it, the cool light off the water.
  softLine(ctx, along(0.72, 40, -104), 18, '#696b8d', 0.2);
  softLine(ctx, along(0.95, 34, -112), 6, '#cdd8ec', 0.32);
  // The rump and the neck a little yellower.
  dab(ctx, -104, -2, 22, '222,200,140', 0.2);
  dab(ctx, 40, -16, 20, '230,210,150', 0.12);
  // The neck: shadow under the jaw and down the throat, a soft fold where the skull sits on it, light along the top.
  softLine(ctx, spline([{ x: 98, y: -14 }, { x: 86, y: -9 }, { x: 74, y: -2 }, { x: 64, y: 6 }], 5), 10, '#666889', 0.3);
  dab(ctx, 64, -20, 14, '96,98,138', 0.08);
  softLine(ctx, along(0.12, 74, 26), 8, '#ffffff', 0.25);
}

/** The head: the bridge lit, the muzzle's side plane, the eye socket and brow, the cheek and the jaw. */
function paintHeadForm(k: Brush): void {
  const { ctx, pen } = k;
  const e = BEAR_EYE;
  softLine(ctx, [{ x: 82, y: -44.4 }, { x: 96, y: -40.6 }, { x: 110, y: -36 }, { x: 119, y: -32.4 }], 4, '#ffffff', 0.55);
  softLine(ctx, [{ x: 100, y: -28 }, { x: 110, y: -26.4 }, { x: 118, y: -25 }], 6, '#8d8ea2', 0.16);
  dab(ctx, 115, -26, 8, '206,196,166', 0.28);
  // The socket and the brow over it.
  dab(ctx, e.x, e.y + 0.6, 7.5, '92,94,118', 0.32);
  softLine(ctx, [{ x: e.x - 7, y: e.y - 5.6 }, { x: e.x, y: e.y - 5.4 }, { x: e.x + 6, y: e.y - 3.2 }], 3, '#ffffff', 0.45);
  // The cheek swelling behind the mouth, lit on top, shaded under; the jaw's shadow.
  dab(ctx, 88, -27, 10, '255,252,240', 0.3);
  dab(ctx, 86, -18, 11, '110,112,140', 0.2);
  softLine(ctx, JAWLINE.map((p) => ({ x: p.x, y: p.y + 1.4 })), 4, '#5e6082', 0.28);
  // Short fur on the face: lying back from the nose, over the cheek and down the jaw.
  for (let i = 0; i < 70; i++) {
    const x = 74 + pen.rng() * 40;
    const v = 0.08 + pen.rng() * 0.84;
    const y = topAt(x) + (underAt(x) - topAt(x)) * v;
    const d = unit(-1, -0.25 + v * 0.6 - (x - 100) * 0.01);
    const len = 2.5 + pen.rng() * 3.5;
    const light = v < 0.55 ? pen.rng() < 0.7 : pen.rng() < 0.3;
    pen.hair([{ x, y }, { x: x + d.x * len, y: y + d.y * len }], px(k, 0.7), light ? '#ffffff' : '#7a7c98', light ? 0.3 : 0.2);
  }
  // Whisker spots along the muzzle's side.
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 4; i++) pen.dot(117 - i * 2.8 - row * 1.2, -25.4 + row * 2.1 + i * 0.5, px(k, 0.8), '#3e3e4c', 0.5);
  }
}

/** Fur strokes and clumps over the coat, following the form. */
function paintCoatFur(k: Brush): void {
  const { pen } = k;
  grain(k, topAt, underAt, 78, -122, 30, { light: LIGHT, dark: LAVENDER, droop: (v) => 0.06 + 0.5 * Math.max(0, v - 0.55), litTop: true });
  // Clumps where the coat is long: the throat ruff, the belly fringe, behind the shoulder, the haunch and rump.
  for (let i = 0; i < 90; i++) {
    const x = -120 + pen.rng() * 200;
    const throat = x > 40;
    const v = throat ? 0.45 + pen.rng() * 0.5 : 0.3 + Math.sqrt(pen.rng()) * 0.66;
    const t = topAt(x);
    const u = underAt(x);
    const at = { x, y: t + (u - t) * v };
    const slope = (underAt(x - 2) - underAt(x + 2)) / 4;
    const dir = unit(-1, slope * v * 0.6 + 0.15 + 0.7 * Math.max(0, v - 0.5) + (x < -100 ? 0.6 : 0));
    const lower = v > 0.6;
    clump(k, {
      at, dir, len: 4 + pen.rng() * (lower ? 6 : 4),
      light: lower ? '#e6e6ef' : '#fff8e6', dark: lower ? '84,86,122' : '150,140,118', a: lower ? 0.6 : 0.4,
    });
  }
  shadeLocks(k, LOCKS, '#ecebf0', '84,86,122', 0.4);
}

function paintEars(k: Brush, near: boolean): void {
  const { pen, ctx } = k;
  const ear = near ? EAR_NEAR : EAR_FAR;
  pen.fill(ear, near ? '#f4ecd6' : '#cfc9bb', 1);
  shade(ctx, ear, -52, -44, [[0, 'rgba(255,255,255,0.5)'], [0.6, 'rgba(255,255,255,0)'], [1, 'rgba(90,92,120,0.35)']]);
  if (near) {
    // The inner ear: a soft grey hollow, fur over its base.
    const c = { x: 69.4, y: -47.6 };
    dab(ctx, c.x, c.y, 3.4, '96,96,118', 0.55);
    for (let i = 0; i < 9; i++) {
      const x = 63 + i * 1.5;
      taper(ctx, [{ x, y: -42.8 }, { x: x - 1.2, y: -45.4 }, { x: x - 1.8, y: -47.4 + pen.rng() }], 1.8, 0.2, '#fbf3dc', 0.85);
    }
  }
  pen.stroke(ear.filter((p) => p.y < -44.6), px(k, near ? 1.2 : 1), INK, 0.85, false);
}

/** The tail: a short tuft at the top of the rump, painted before the body so the rump's fur covers its root. */
function paintTail(k: Brush): void {
  const { pen, ctx } = k;
  pen.fill(TAIL, '#ece2c8', 1);
  shade(ctx, TAIL, -9, 0, [[0, 'rgba(255,255,255,0.45)'], [1, 'rgba(96,98,128,0.45)']]);
  for (let i = 0; i < 5; i++) {
    const y = -7.4 + i * 1.6;
    pen.hair([{ x: -116, y }, { x: -121, y: y + 0.3 }, { x: -125.4, y: y + 1.2 }], px(k, 0.7), i < 2 ? '#ffffff' : '#6d6f90', 0.45);
  }
  pen.stroke(TAIL.filter((p) => p.x < -119), px(k, 1.1), INK, 0.85, false);
}

/** The nose, the black lip line and the chin. */
function paintFace(k: Brush): void {
  const { pen, ctx } = k;
  // The nose: black leather, a sheen on its top, the nostril a curled slit at the front.
  pen.fill(NOSE, '#0c0c10', 1);
  shade(ctx, NOSE, -33, -23, [[0, 'rgba(150,156,176,0.55)'], [0.4, 'rgba(60,62,74,0.15)'], [1, 'rgba(0,0,0,0)']]);
  pen.hair(spline([{ x: 124.4, y: -27.6 }, { x: 122.6, y: -26.8 }, { x: 121.8, y: -25 }], 3), px(k, 1.3), '#000000', 1);
  pen.dot(120.2, -30.8, px(k, 1.5), '#e8eef4', 0.75);
  pen.hair([{ x: 117.8, y: -31.2 }, { x: 121.6, y: -31.6 }], px(k, 0.9), '#c6ccd6', 0.5);
  pen.stroke(NOSE.slice(0, 18), px(k, 1), INK, 0.9, false);
  // The black lips: a line from under the nose back to the corner of the mouth, the lip skin below it.
  taper(ctx, LIP, 1.6, 0.9, '#121216', 0.95);
  taper(ctx, LIP.map((p) => ({ x: p.x, y: p.y + 1 })).slice(0, -2), 1.2, 0.4, '#2a2a34', 0.5);
  // The chin: lit under the lip, a thin line of ink along its lower edge.
  softLine(ctx, [{ x: 116, y: -19.4 }, { x: 108, y: -17.4 }, { x: 102, y: -16.2 }], 2.5, '#ffffff', 0.4);
  pen.hair(JAWLINE, px(k, 0.8), INK, 0.4);
}

function paintBody(k: Brush): void {
  const { pen, ctx } = k;
  paintEars(k, false);
  paintTail(k);
  pen.fill(BODY, PAPER_FILL, 1);
  pen.clipped(BODY, () => {
    // The wash, laid a hair off the line so a sliver of paper catches the light along the back.
    ctx.save();
    ctx.translate(px(k, 0.8), px(k, 1.2));
    columnWash(ctx, BODY_BOX.x0, BODY_BOX.x1, 1, topAt, underAt, coat);
    ctx.restore();
    paintForm(k);
    paintCoatFur(k);
    paintHeadForm(k);
  });
  paintFace(k);
  // Thin interior ink: the fold behind the cheek, the line of the shoulder.
  pen.hair(spline([{ x: 80, y: -34 }, { x: 78, y: -26 }, { x: 81, y: -18 }], 4), px(k, 0.7), '#5a5c78', 0.12);
  pen.hair(spline([{ x: -4, y: 10 }, { x: 2, y: 22 }, { x: 10, y: 32 }], 4), px(k, 0.8), '#4a4c66', 0.18);
  // The outline: lighter over the lit head and back, firmer underneath, softly broken where the fur is long.
  const shaggyUnder = (p: Pt): number => (p.x < 96 ? 0.35 : 0);
  inkEdge(k, EDGE_TOP, (p) => (p.x > 84 ? 1.3 : 1.15), (p) => (p.x < 84 ? 0.25 : 0), 0.9);
  inkEdge(k, EDGE_UNDER, (p) => (p.x > 96 ? 1.3 : 1.6), shaggyUnder, 0.95);
  paintEars(k, true);
}

function paintShadow(k: Brush): void {
  k.pen.fill(BODY, SHADOW, 0.97);
  shade(k.ctx, BODY, -50, 40, [[0, 'rgba(90,100,110,0.3)'], [1, 'rgba(4,8,16,0.4)']]);
  k.pen.fill(EAR_NEAR, SHADOW, 0.97);
  k.pen.fill(EAR_FAR, SHADOW, 0.97);
  k.pen.fill(TAIL, SHADOW, 0.97);
}

/** A leg's dark silhouette, for the bear as a shape in the dark. */
const shadowOf = (paint: (k: Brush, far: boolean) => void) => (k: Brush): void => {
  paint(k, false);
  const { ctx } = k;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = SHADOW;
  ctx.fillRect(-200, -200, 400, 400);
  ctx.restore();
};

// ---------------------------------------------------------------- sprites

interface Sprites {
  readonly res: number;
  readonly body: readonly HTMLCanvasElement[];
  readonly arm: readonly HTMLCanvasElement[];
  readonly armFar: readonly HTMLCanvasElement[];
  readonly paw: readonly HTMLCanvasElement[];
  readonly pawFar: readonly HTMLCanvasElement[];
  readonly hind: readonly HTMLCanvasElement[];
  readonly hindFar: readonly HTMLCanvasElement[];
}
const SEED = 4421;
const spritesFor = lazily((b: Bucket): Sprites => ({
  res: b.res,
  body: frames(BODY_BOX, b, SEED, paintBody),
  arm: frames(ARM_BOX, b, SEED + 11, (k) => paintArm(k, false)),
  armFar: frames(ARM_BOX, b, SEED + 13, (k) => paintArm(k, true)),
  paw: frames(PAW_BOX, b, SEED + 17, (k) => paintPaw(k, false)),
  pawFar: frames(PAW_BOX, b, SEED + 19, (k) => paintPaw(k, true)),
  hind: frames(HIND_BOX, b, SEED + 23, (k) => paintHind(k, false)),
  hindFar: frames(HIND_BOX, b, SEED + 29, (k) => paintHind(k, true)),
}));
const shadowsFor = lazily((b: Bucket): Sprites => {
  const arm = frames(ARM_BOX, b, SEED + 5, shadowOf(paintArm));
  const paw = frames(PAW_BOX, b, SEED + 7, shadowOf(paintPaw));
  const hind = frames(HIND_BOX, b, SEED + 9, shadowOf(paintHind));
  return { res: b.res, body: frames(BODY_BOX, b, SEED + 3, paintShadow), arm, armFar: arm, paw, pawFar: paw, hind, hindFar: hind };
});

// ---------------------------------------------------------------- on screen

function limb(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, box: Box, res: number, root: Pt, angle: number, stretch: number): void {
  ctx.save();
  ctx.translate(root.x, root.y);
  ctx.rotate(angle);
  ctx.scale(stretch, stretch);
  blit(ctx, c, box, res);
  ctx.restore();
}

/** A foreleg and its paw: the leg turned at the shoulder, the paw at the wrist. */
function foreleg(ctx: CanvasRenderingContext2D, arm: HTMLCanvasElement, paw: HTMLCanvasElement, res: number, root: Pt, angle: number, flex: number, stretch: number): void {
  limb(ctx, arm, ARM_BOX, res, root, angle, stretch);
  const wrist = { x: root.x + Math.cos(angle) * ARM_LEN * stretch, y: root.y + Math.sin(angle) * ARM_LEN * stretch };
  limb(ctx, paw, PAW_BOX, res, wrist, angle + flex, stretch);
}

/** The eye: small and dark in a black rim, set along the bridge, a bright catchlight; wide in shock. */
function drawEye(ctx: CanvasRenderingContext2D, shock: number, shut: number, lw: number): void {
  const { x, y } = BEAR_EYE;
  const big = 1 + 0.35 * shock;
  const [rx, ry] = [2.9 * big, 2.1 * big * (1 + 0.25 * shock)];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(BRIDGE_TILT * 0.7);
  // The black rim of the lids.
  ctx.fillStyle = '#121014';
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 1.28, ry * 1.32, 0, 0, Math.PI * 2);
  ctx.fill();
  if (shock > 0.05) {
    ctx.fillStyle = `rgba(236,232,222,${0.9 * shock})`;
    ctx.beginPath();
    ctx.ellipse(-rx * 0.15, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(shock * rx * 0.15, 0, rx * (1 - 0.3 * shock), ry * (1 - 0.15 * shock), 0, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(0, ry * 0.45, 0.2, 0, 0, rx * 1.1);
  g.addColorStop(0, '#6b4a2c');
  g.addColorStop(0.5, '#24160e');
  g.addColorStop(1, '#070505');
  ctx.fillStyle = g;
  ctx.fill();
  // The catchlight up front and a small second one behind.
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(rx * 0.32, -ry * 0.34, rx * 0.26, ry * 0.26, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.arc(-rx * 0.4, ry * 0.36, rx * 0.1, 0, Math.PI * 2);
  ctx.fill();
  if (shut > 0.01) {
    // The lid drawn down over the eye: furred, its edge a dark line.
    const edge = -ry * 1.4 + ry * 2.5 * shut;
    ctx.fillStyle = '#ece8dc';
    ctx.beginPath();
    ctx.rect(-rx * 1.6, -ry * 1.8, rx * 3.2, edge + ry * 1.8);
    ctx.fill();
    ctx.strokeStyle = '#141216';
    ctx.lineWidth = 1.1 * lw;
    ctx.beginPath();
    ctx.moveTo(-rx * 1.2, edge - ry * 0.1);
    ctx.quadraticCurveTo(0, edge - ry * 0.35, rx * 1.2, edge + ry * 0.15);
    ctx.stroke();
  }
  ctx.restore();
  if (shut < 0.5) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.9 * lw;
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 1.28, ry * 1.32, BRIDGE_TILT * 0.7, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  }
  if (shock > 0.05) {
    taper(ctx, [{ x: x - rx * 2.2, y: y - ry * 2.3 }, { x: x, y: y - ry * (2.6 + shock) }, { x: x + rx * 2, y: y - ry * 1.6 }], 1.2 * lw, 0.4 * lw, INK, 0.4 * shock);
  }
}

/** The bear, nose right in its own units, placed and turned by `p`; its four paws paddle with `p.beat`. */
export function drawPolarBear(ctx: CanvasRenderingContext2D, p: BearPlaced, look: BearLook, boil: number): void {
  const k = p.len / BEAR_UNITS;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.face, 1);
  ctx.rotate(p.rot);
  ctx.scale(k, k);
  const scale = screenScale(ctx);
  const dark = (look.dark ?? 0) > 0.5;
  const s = (dark ? shadowsFor : spritesFor)(bucketFor(scale));
  const f = ((boil % BOIL_FRAMES) + BOIL_FRAMES) % BOIL_FRAMES;
  const e = Math.max(0, Math.min(1, look.effort ?? 1));
  const limp = 1 - Math.min(1, e / 0.6);
  // Dog paddle: each foreleg reaches forward and down with the paw curled, then pulls back flat under the chest.
  const fore = (ph: number): readonly [number, number] => [
    1.08 + 0.55 * e * Math.sin(p.beat + ph) + 0.35 * limp,
    0.18 + e * (0.22 - 0.3 * Math.cos(p.beat + ph)) + 0.3 * limp,
  ];
  const hind = (ph: number): number => Math.PI - 0.58 + 0.16 * e * Math.sin(p.beat + ph) - 0.3 * limp;
  const [farA, farFlex] = fore(Math.PI);
  const [nearA, nearFlex] = fore(0);
  // The hind legs trail from under the rump, the near one over the far; the rump's round outline over both.
  limb(ctx, s.hindFar[f]!, HIND_BOX, s.res, HIP_FAR, hind(Math.PI + 1.2) - 0.1, 0.92);
  limb(ctx, s.hind[f]!, HIND_BOX, s.res, HIP_NEAR, hind(1.2), 1);
  foreleg(ctx, s.armFar[f]!, s.pawFar[f]!, s.res, SHOULDER_FAR, farA, farFlex, 0.9);
  blit(ctx, s.body[f]!, BODY_BOX, s.res);
  if (!dark) drawEye(ctx, look.shock ?? 0, Math.max(0, Math.min(1, (limp - 0.3) / 0.25)), 1 / scale);
  foreleg(ctx, s.arm[f]!, s.paw[f]!, s.res, SHOULDER_NEAR, nearA, nearFlex, 1);
  ctx.restore();
}

/** Bakes the size the short opens on. */
export function prepareBear(): void {
  spritesFor(bucketFor(2.1));
}
