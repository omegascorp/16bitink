import { INK, type Pt } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import type { KitEntry } from '../../foodchain/kit';
import { spline } from '../../kraken/whale';
import { inkEdge, unit } from '../../polarshark/art/bearFur';
import { type Box, type Brush, dab, fadeRoot, px, smoothLoop, softLine, taper } from '../../seal/art/paint';
import { blink, blobShape, cheekTooth, drawEye, type EyeLook, fang, fringe, fur, gum, inkTufts, inside, makeHead, rimShade, wash, whiskers } from './catRig';
import type { DrawHead } from './contract';

/**
 * A jaguar's head and shoulders (see contract.ts), painted: stocky, a broad massive skull with a domed brow and a
 * short heavy muzzle, a golden coat lit from above, small solid spots on the face and big black rosettes with
 * spots inside them on the neck and shoulders, a white chin, whisker pad and throat, small rounded ears, a golden
 * eye. Open, it shows the cat's dentition: long canines, small incisors, the blade of the carnassial.
 * Own units (catRig.ts): head 100 long, the bite point at 0,0.
 */

// ---------------------------------------------------------------- shape

const TOP: readonly Pt[] = spline([
  { x: -184, y: -40 }, { x: -168, y: -46 }, { x: -148, y: -44 }, { x: -126, y: -37 }, { x: -104, y: -40 }, { x: -86, y: -50 },
  { x: -70, y: -59 }, { x: -54, y: -63.5 }, { x: -38, y: -60.5 }, { x: -26, y: -52.5 }, { x: -15, y: -41 }, { x: -4, y: -34.5 },
  { x: 5, y: -29.5 }, { x: 10.5, y: -25.5 },
], 5);
const NOSE_FRONT: readonly Pt[] = spline([
  { x: 10.5, y: -25.5 }, { x: 14.2, y: -20.5 }, { x: 14.6, y: -15.5 }, { x: 13.2, y: -12.4 }, { x: 14.6, y: -8 }, { x: 13.8, y: -3.2 }, { x: 10.8, y: -0.4 }, { x: 8, y: 0 },
], 4);
const ROOF: readonly Pt[] = spline([{ x: 8, y: 0 }, { x: 0, y: 0.3 }, { x: -12, y: 0.4 }, { x: -24, y: 0.4 }, { x: -36, y: 1 }, { x: -46, y: 2 }], 5);
const UNDER: readonly Pt[] = spline([
  { x: -46, y: 2 }, { x: -50, y: 6 }, { x: -55, y: 13 }, { x: -60, y: 20 }, { x: -70, y: 36 }, { x: -82, y: 58 }, { x: -96, y: 84 },
  { x: -110, y: 108 }, { x: -122, y: 128 },
], 5);
const BODY: readonly Pt[] = [...TOP, ...NOSE_FRONT.slice(1), ...ROOF.slice(1), ...UNDER.slice(1), { x: -186, y: 130 }, { x: -188, y: 40 }];

const EAR: readonly Pt[] = smoothLoop([
  { x: -55, y: -58 }, { x: -56, y: -68 }, { x: -61.5, y: -76.5 }, { x: -70.5, y: -78 }, { x: -78, y: -71 }, { x: -80.5, y: -60 },
], 5);
const NOSE: readonly Pt[] = smoothLoop([
  { x: 7, y: -26.6 }, { x: 10.8, y: -25.4 }, { x: 14.3, y: -20.6 }, { x: 14.6, y: -15.6 }, { x: 12.8, y: -13.6 }, { x: 10.4, y: -16 }, { x: 8, y: -21 },
], 4);
const MUZZLE_WHITE: readonly Pt[] = smoothLoop([
  { x: 14.4, y: -11.5 }, { x: 14.6, y: -7.5 }, { x: 13.6, y: -3 }, { x: 10.6, y: -0.4 }, { x: -4, y: 0.6 }, { x: -16, y: -0.2 }, { x: -25, y: -4 },
  { x: -24, y: -10.5 }, { x: -14, y: -16 }, { x: -2, y: -18.5 }, { x: 8, y: -17 },
], 4);
const THROAT_WHITE: readonly Pt[] = smoothLoop([
  { x: -51, y: 8 }, { x: -58, y: 19 }, { x: -70, y: 37 }, { x: -82, y: 59 }, { x: -96, y: 85 }, { x: -110, y: 109 }, { x: -122, y: 130 },
  { x: -134, y: 112 }, { x: -118, y: 80 }, { x: -100, y: 50 }, { x: -84, y: 26 }, { x: -68, y: 7 },
], 5);
/** The white throat's upper edge, where the gold fur laps over it. */
const THROAT_EDGE: readonly Pt[] = spline([{ x: -134, y: 112 }, { x: -118, y: 80 }, { x: -100, y: 50 }, { x: -84, y: 26 }, { x: -68, y: 7 }, { x: -54, y: 4 }], 5);

const FLOOR: readonly Pt[] = spline([{ x: 10, y: 0.2 }, { x: 0, y: 0.4 }, { x: -12, y: 0.5 }, { x: -24, y: 0.5 }, { x: -36, y: 1.1 }, { x: -46, y: 2.2 }], 5);
const JAW_UNDER: readonly Pt[] = spline([
  { x: -66, y: 16 }, { x: -52, y: 18 }, { x: -34, y: 17.6 }, { x: -18, y: 16 }, { x: -6, y: 14.2 }, { x: 3, y: 11.4 }, { x: 8.4, y: 6.5 }, { x: 10, y: 0.2 },
], 5);
const JAW: readonly Pt[] = [...FLOOR, { x: -54, y: -1.5 }, { x: -63, y: -3 }, { x: -70, y: 3 }, ...JAW_UNDER.slice(0, -1)];
const HINGE: Pt = { x: -58, y: -2 };

const EYE: EyeLook = {
  at: { x: -25, y: -34 }, w: 12.5, h: 4, tilt: 0.2, irisIn: '#f7d460', irisOut: '#c0801c', pupil: 0.62, lid: '#c4883a', ring: '246,238,218',
};

// ---------------------------------------------------------------- colour

const GOLD = '#c98b38';
const GOLD_LIT = '#f6d38a';
const GOLD_DARK = '#6b3d12';
const CREAM = '#f2e9d6';
const BLACK = '#1d130b';
const LIT_STOPS = [[0, 'rgba(255,228,150,0.55)'], [0.35, 'rgba(255,220,140,0.08)'], [0.7, 'rgba(90,50,15,0.12)'], [1, 'rgba(60,30,8,0.4)']] as const;

const flowHead = (p: Pt): Pt => (p.x > -70 ? unit(-1, (p.y + 22) * 0.025) : unit(-1, 0.2 + p.y * 0.004));
const inWhite = (p: Pt): boolean => inside(MUZZLE_WHITE, p) || inside(THROAT_WHITE, p);

// ---------------------------------------------------------------- markings

/** A crescent blotch along an arc round `c`: thick in the middle, ragged, tapering to its ends. */
function crescent(c: Pt, r: number, a0: number, span: number, thick: number, squash: number, tilt: number, rng: () => number): Pt[] {
  const n = 9;
  const wob = Array.from({ length: n + 1 }, () => 0.75 + rng() * 0.5);
  const at = (a: number, rr: number): Pt => {
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr * squash;
    return { x: c.x + x * Math.cos(tilt) - y * Math.sin(tilt), y: c.y + x * Math.sin(tilt) + y * Math.cos(tilt) };
  };
  const outer: Pt[] = [];
  const inner: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const a = a0 + span * u;
    const w = thick * Math.pow(Math.sin(Math.PI * u), 0.55) * wob[i]!;
    outer.push(at(a, r + w * 0.55));
    inner.push(at(a, r - w * 0.45));
  }
  return [...outer, ...inner.reverse()];
}

/** A rosette: a broken, ragged ring of black crescents round a darker gold middle with spots inside it. */
function rosette(k: Brush, c: Pt, r: number, rng: () => number): void {
  const { pen } = k;
  const squash = 0.72 + rng() * 0.25;
  const tilt = rng() * Math.PI;
  pen.fill(blobShape(c, r * 0.9, r * 0.9 * squash, tilt, rng), '#a0601a', 0.5);
  const n = 3 + Math.floor(rng() * 3);
  const start = rng() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = start + ((i + (rng() - 0.5) * 0.25) / n) * Math.PI * 2;
    const span = ((Math.PI * 2) / n) * (0.62 + rng() * 0.3);
    pen.fill(crescent(c, r * (0.92 + rng() * 0.16), a, span, r * (0.34 + rng() * 0.16), squash, tilt, rng), BLACK, 0.93);
  }
  const inner = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < inner; i++) {
    const a = rng() * Math.PI * 2;
    const d = rng() * r * 0.38;
    pen.fill(blobShape({ x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d }, r * 0.15, r * 0.13, rng() * 3, rng, 6), BLACK, 0.9);
  }
}

function paintMarkings(k: Brush): void {
  const { pen } = k;
  const rng = createRng(7213);
  // Rosettes on the neck and shoulders, on a jittered grid, bigger toward the shoulder; solid spots near the head.
  for (let gx = -184; gx < -70; gx += 21) {
    for (let gy = -44; gy < 130; gy += 19) {
      const c = { x: gx + (rng() - 0.5) * 8 + (Math.round(gy / 19) % 2) * 10, y: gy + (rng() - 0.5) * 7 };
      if (!inside(BODY, c) || inside(THROAT_WHITE, c)) continue;
      const r = 5 + 3.5 * Math.min(1, (-80 - c.x) / 80) + rng() * 1.2;
      if (c.x > -90 || c.y < -36) pen.fill(blobShape(c, r * 0.36, r * 0.3, rng() * 3, rng), BLACK, 0.9);
      else rosette(k, c, r, rng);
    }
  }
  // Small spots in the gaps.
  for (let i = 0; i < 40; i++) {
    const c = { x: -176 + rng() * 100, y: -46 + rng() * 176 };
    if (!inside(BODY, c) || inside(THROAT_WHITE, c)) continue;
    pen.fill(blobShape(c, 1 + rng() * 1.2, 0.9 + rng() * 0.6, rng() * 3, rng, 6), BLACK, 0.85);
  }
  // Solid spots on the throat's white, in loose bars.
  for (let i = 0; i < 30; i++) {
    const c = { x: -136 + rng() * 86, y: 10 + rng() * 120 };
    if (!inside(THROAT_WHITE, c)) continue;
    pen.fill(blobShape(c, 2 + rng() * 2.2, 1.2 + rng() * 1, -0.6 + rng() * 0.4, rng), BLACK, 0.8);
  }
  // The face: small solid spots, denser and bigger toward the crown, few on the bridge, none on the white or round the eye.
  for (let i = 0; i < 300; i++) {
    const c = { x: -88 + (i % 20) * 4.1 + rng() * 3.6, y: -64 + Math.floor(i / 20) * 3.7 + rng() * 3.2 };
    if (!inside(BODY, c) || inWhite(c) || Math.hypot(c.x - EYE.at.x, (c.y - EYE.at.y) * 1.3) < 9.5) continue;
    if (c.y > -14 && c.x > -40) continue;
    const back = Math.min(1, (-c.x - 4) / 70);
    if (rng() > 0.15 + 0.6 * back) continue;
    const r = 0.5 + 1.1 * back * (0.6 + rng() * 0.5);
    pen.fill(blobShape(c, r, r * 0.85, rng() * 3, rng, 6), BLACK, 0.88);
  }
  // Rows of spots across the cheek, under the eye toward the jaw.
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 6; i++) {
      const c = { x: -36 - i * 5 - row * 2, y: -20 + row * 5 + i * 1.6 + (rng() - 0.5) * 1.5 };
      if (inWhite(c)) continue;
      pen.fill(blobShape(c, 1.3 + rng() * 0.6, 1.1, rng() * 3, rng, 6), BLACK, 0.85);
    }
  }
  // The whisker pad's dark dotted rows.
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 6; i++) {
      pen.dot(10.5 - i * 2.6 - row * 0.6, -11 + row * 2.3 + i * 0.35, px(k, 1.3) + 0.25, '#3a2618', 0.55);
    }
  }
}

// ---------------------------------------------------------------- the body

function paintEar(k: Brush): void {
  const { pen, ctx } = k;
  // The back of the ear black, its rim catching the light; the hollow pale, with cream tufts rising out of it.
  wash(k, EAR, '#b07a34', -78, -56, [[0, 'rgba(255,220,150,0.3)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(60,30,8,0.4)']]);
  rimShade(k, EAR, '#1c120a', 4.5, 0.95);
  pen.clipped(EAR, () => {
    dab(ctx, -64, -63, 5.5, '240,226,196', 0.9);
    for (let i = 0; i < 22; i++) {
      const x = -72 + pen.rng() * 14;
      pen.hair([{ x, y: -56 }, { x: x - 0.4, y: -61 }, { x: x - 1.6 + pen.rng() * 1.5, y: -65 - pen.rng() * 5 }], px(k, 0.8), i % 3 ? '#fbf3df' : '#6a4a2a', 0.7);
    }
  });
  fringe(k, EAR.filter((p) => p.y < -60), {
    side: -1, flow: () => unit(-0.3, -1), len: () => [1.2, 2.4], every: 1, width: 0.9, colour: () => ['#24160c', 0.8],
  });
  pen.stroke(EAR.filter((p) => p.y < -59), px(k, 1.8), INK, 0.95, false);
}

function paintForm(k: Brush): void {
  const { ctx } = k;
  // Masses: the domed brow and crown lit, the shoulder lit, shade on the neck behind the cheek and under the jaw.
  dab(ctx, -42, -52, 22, '255,232,165', 0.45);
  dab(ctx, -150, -24, 34, '255,226,150', 0.3);
  dab(ctx, -110, 20, 36, '70,40,12', 0.32);
  dab(ctx, -72, 30, 20, '60,32,10', 0.4);
  dab(ctx, -150, 110, 40, '60,32,10', 0.35);
  // The bridge of the nose lit; the side of the muzzle in soft shade under the eye; the cheek swelling.
  softLine(ctx, [{ x: 8, y: -28 }, { x: -4, y: -33 }, { x: -18, y: -44 }], 5, '#ffe6a8', 0.5);
  softLine(ctx, [{ x: -8, y: -22 }, { x: -18, y: -23 }, { x: -28, y: -19 }], 7, '#6a3a10', 0.22);
  dab(ctx, -44, -12, 15, '255,226,160', 0.25);
  // Behind the cheek ruff the neck falls into shadow.
  softLine(ctx, [{ x: -74, y: -40 }, { x: -78, y: -14 }, { x: -70, y: 12 }], 12, '#4a2808', 0.36);
  // Under the brow, the socket and the side of the face in shade; the cheekbone catching light under it.
  softLine(ctx, [{ x: -40, y: -36 }, { x: -30, y: -40 }, { x: -16, y: -36 }], 6, '#5a300c', 0.25);
  softLine(ctx, [{ x: -44, y: -22 }, { x: -32, y: -21 }, { x: -20, y: -19 }], 4, '#ffe2a2', 0.3);
  softLine(ctx, [{ x: -48, y: -8 }, { x: -38, y: 0 }, { x: -24, y: -2 }], 8, '#5a300c', 0.22);
}

function paintWhite(k: Brush): void {
  const { pen, ctx } = k;
  for (const shape of [MUZZLE_WHITE, THROAT_WHITE]) {
    pen.fill(shape, shape === MUZZLE_WHITE ? '#ece0c6' : CREAM, 0.92);
    pen.clipped(shape, () => softLine(ctx, [...shape, shape[0]!], 6, '#c98b38', 0.45));
  }
  pen.clipped(MUZZLE_WHITE, () => {
    softLine(ctx, [{ x: 10, y: -1 }, { x: -6, y: -0.5 }, { x: -22, y: -2 }], 5, '#9a8a70', 0.35);
    dab(ctx, 4, -12, 8, '255,255,255', 0.6);
  });
  pen.clipped(THROAT_WHITE, () => {
    softLine(ctx, [{ x: -56, y: 14 }, { x: -72, y: 40 }, { x: -96, y: 80 }], 12, '#8c7c64', 0.45);
  });
  // Gold fur lapping over the white's edges.
  fringe(k, THROAT_EDGE, {
    side: 1, flow: (p) => unit(-0.8, 0.6 + p.y * 0.004), len: () => [3, 6], every: 0.9, width: 1.4,
    colour: (_, r) => (r < 0.6 ? ['#c48838', 0.85] : ['#7a4a18', 0.55]),
  });
  fringe(k, MUZZLE_WHITE.slice(-18), {
    side: -1, flow: () => unit(-1, 0.3), len: () => [1.5, 3], every: 0.7, width: 0.9, colour: (_, r) => (r < 0.6 ? ['#f2e9d6', 0.85] : ['#c48838', 0.7]),
  });
  // Pale fur under and over the eye.
  dab(ctx, -27, -27.5, 7, '248,240,222', 0.65);
  dab(ctx, -26, -40, 5, '248,238,214', 0.5);
}

function paintFur(k: Brush): void {
  fur(k, BODY, {
    n: 2600,
    flow: flowHead,
    len: [2.4, 5.5],
    tint: (p, r) => {
      if (inWhite(p)) return r < 0.6 ? ['#ffffff', 0.4] : ['#8f8068', 0.22];
      const lit = Math.max(0, Math.min(1, (-p.y + 20) / 70));
      return r < 0.3 + 0.45 * lit ? [GOLD_LIT, 0.38] : [GOLD_DARK, 0.28];
    },
  });
  // Longer fur down the neck.
  fur(k, BODY, {
    n: 900,
    flow: (p) => unit(-1, 0.1 + p.y * 0.016),
    len: [5, 10],
    tint: (p, r) => (p.x > -80 ? null : inWhite(p) ? ['#ffffff', 0.3] : r < 0.45 ? [GOLD_LIT, 0.22] : [GOLD_DARK, 0.18]),
  });
}

/** The cheek ruff: fur sweeping back and down behind the jaw. */
function paintRuff(k: Brush): void {
  const line = spline([{ x: -66, y: -42 }, { x: -73, y: -26 }, { x: -74, y: -8 }, { x: -68, y: 10 }, { x: -62, y: 22 }], 5);
  fringe(k, line, {
    side: -1, flow: (p) => unit(-0.6, 0.8 + p.y * 0.004), len: (p) => (p.y > -10 ? [6, 10] : [4, 7]), every: 1.3, width: 1.6,
    colour: (p, r) => (p.y > -6 ? (r < 0.6 ? [CREAM, 0.6] : ['#a39478', 0.4]) : r < 0.4 ? ['#dcaa5c', 0.45] : ['#5c3510', 0.4]),
  });
  inkTufts(k, line, -1, (p) => unit(-0.6, 0.8 + p.y * 0.004), 5, 3.2, 0.7, 0.45);
}

function paintFace(k: Brush): void {
  const { pen, ctx } = k;
  // The nose leather: pinkish brown, darker at the edges, a sheen on top, the nostril curling under.
  wash(k, NOSE, '#8e5048', -26.6, -13.6, [[0, 'rgba(230,170,150,0.65)'], [0.5, 'rgba(180,110,95,0.1)'], [1, 'rgba(50,20,15,0.55)']]);
  rimShade(k, NOSE, '#3a1a14', 2, 0.7);
  pen.hair(spline([{ x: 14.4, y: -17.4 }, { x: 12.6, y: -16.8 }, { x: 11, y: -15 }], 3), px(k, 2.2), '#1b0d0a', 0.95);
  dab(ctx, 11, -23.4, 1.8, '255,235,225', 0.7);
  pen.stroke([...NOSE, NOSE[0]!], px(k, 1.2), INK, 0.9, false);
  // The philtrum and the black lip line along the mouth to its corner.
  pen.hair(spline([{ x: 12.8, y: -13.2 }, { x: 14.2, y: -8 }, { x: 13.4, y: -3.2 }, { x: 10.6, y: -0.3 }], 4), px(k, 1.3), INK, 0.85);
  const lip = ROOF.filter((p) => p.x > -30);
  taper(ctx, lip, 2.2, 0.6, BLACK, 0.95);
  // The whisker pad's edge and the line of the cheek behind it.
  pen.hair(spline([{ x: 8, y: -18 }, { x: -4, y: -19 }, { x: -16, y: -15.5 }, { x: -25, y: -8 }, { x: -28, y: -1 }], 5), px(k, 0.9), '#4a3020', 0.35);
  // The brow over the eye and the dark line running from the eye's front corner down the side of the nose.
  pen.hair(spline([{ x: -33, y: -38.5 }, { x: -25, y: -41 }, { x: -17, y: -38 }], 4), px(k, 1.1), INK, 0.55);
  taper(ctx, spline([{ x: -19.5, y: -31.6 }, { x: -15, y: -28.5 }, { x: -10, y: -26.5 }], 4), 1.3, 0.2, BLACK, 0.7);
  // The socket's shade round the eye.
  dab(ctx, -25, -33, 8, '90,55,20', 0.22);
}

function paintSilhouette(k: Brush): void {
  const flowBack = (p: Pt): Pt => unit(-1, 0.15 + p.y * 0.002);
  const neck = TOP.filter((p) => p.x < -20);
  fringe(k, neck, {
    side: 1, flow: flowBack, len: (p) => (p.x < -90 ? [3.5, 6.5] : [2.2, 4]), every: 1.1, width: 1.5,
    colour: (_, r) => (r < 0.55 ? ['#a8722c', 0.85] : ['#5a3410', 0.6]),
  });
  fringe(k, UNDER.slice(16), {
    side: 1, flow: () => unit(-0.5, 1), len: () => [4, 8], every: 0.8, width: 1.4, lean: 0.5,
    colour: (_, r) => (r < 0.6 ? ['#efe5cf', 0.85] : ['#9b8c72', 0.5]),
  });
  // The cheek's edge over the jaw, from the corner of the mouth down the throat: soft fur, no ink.
  fringe(k, UNDER.slice(0, 16), {
    side: 1, flow: (p) => unit(-0.4, 1 + p.y * 0.01), len: () => [2.5, 5], every: 1, width: 1.4,
    colour: (p, r) => (p.y > 8 ? (r < 0.6 ? ['#f0e6d0', 0.85] : ['#9b8c72', 0.5]) : r < 0.5 ? ['#c98b38', 0.9] : ['#6b3d12', 0.6]),
  });
  inkEdge(k, TOP, (p) => (p.x > -40 ? 2.1 : 1.8), (p) => (p.x < -40 ? 0.3 : 0.05), 0.92);
  inkTufts(k, neck, 1, flowBack, 3.4, 2.6, 0.75, 0.6);
  inkEdge(k, NOSE_FRONT, () => 1.9, () => 0, 0.95);
  inkEdge(k, UNDER.slice(16), () => 1.9, () => 0.35, 0.9);
  inkTufts(k, UNDER.slice(16), 1, (p) => unit(-0.8, 0.9 + p.y * 0.003), 4, 2.4, 0.7, 0.55);
}

function paintBody(k: Brush): void {
  paintEar(k);
  wash(k, BODY, GOLD, -62, 90, LIT_STOPS);
  k.pen.clipped(BODY, () => {
    paintForm(k);
    paintWhite(k);
    paintMarkings(k);
    paintFur(k);
    paintRuff(k);
  });
  paintFace(k);
  paintSilhouette(k);
  fadeRoot(k.ctx, -186, -146);
}

// ---------------------------------------------------------------- the lower jaw

function paintJaw(k: Brush): void {
  const { pen, ctx } = k;
  // White on the chin and along the underside; golden up the side toward the back, with a few spots.
  wash(k, JAW, CREAM, -2, 20, [[0, 'rgba(255,255,255,0.4)'], [0.6, 'rgba(160,140,110,0.1)'], [1, 'rgba(90,70,50,0.5)']]);
  pen.clipped(JAW, () => {
    const side = spline([{ x: -72, y: -2 }, { x: -50, y: 4 }, { x: -30, y: 4.5 }, { x: -12, y: 3 }], 5);
    softLine(ctx, side, 16, GOLD, 1);
    softLine(ctx, side.slice(0, 12), 10, '#7a4a18', 0.4);
    softLine(ctx, JAW_UNDER, 6, '#6c5a44', 0.45);
    dab(ctx, 2, 8, 8, '255,255,255', 0.5);
    const rng = createRng(4410);
    for (let i = 0; i < 10; i++) {
      const c = { x: -50 + rng() * 34, y: 3 + rng() * 7 };
      pen.fill(blobShape(c, 1.1 + rng() * 0.7, 0.9, rng() * 3, rng, 6), BLACK, 0.8);
    }
    fur(k, JAW, {
      n: 420, flow: () => unit(-1, 0.12), len: [2, 4.5],
      tint: (p, r) => (p.y < 6 && p.x < -14 ? (r < 0.5 ? [GOLD_LIT, 0.3] : [GOLD_DARK, 0.2]) : r < 0.55 ? ['#ffffff', 0.4] : ['#8a7a62', 0.22]),
    });
  });
  // The black lower lip.
  taper(ctx, FLOOR, 1.9, 0.9, BLACK, 0.95);
  pen.hair(FLOOR.map((p) => ({ x: p.x, y: p.y + 1.6 })), px(k, 0.7), '#5a4636', 0.35);
  fringe(k, JAW_UNDER.slice(0, -6), {
    side: 1, flow: () => unit(-1, 0.4), len: () => [2.5, 5], every: 1.1, width: 1.3,
    colour: (_, r) => (r < 0.6 ? ['#efe5cf', 0.85] : ['#9b8c72', 0.5]),
  });
  inkEdge(k, JAW_UNDER, () => 1.9, () => 0.15, 0.92);
}

// ---------------------------------------------------------------- teeth

const DOWN: Pt = { x: 0, y: 1 };
const UP: Pt = { x: 0, y: -1 };

function paintUpper(k: Brush): void {
  gum(k, ROOF.slice(0, -3).map((p) => ({ x: p.x, y: p.y + 1.2 })), DOWN, 5);
  for (const x of [8.4, 6.6, 4.8]) fang(k, { x, y: 2.2 }, unit(0.12, 1), 3, 2, 0.05);
  fang(k, { x: -4.8, y: 2 }, unit(0.05, 1), 12.5, 6, 0.1, 0.45);
  cheekTooth(k, { x: -15, y: 2 }, { x: -21, y: 2 }, DOWN, [[0.45, 4.6], [0.85, 2]]);
  cheekTooth(k, { x: -23, y: 2 }, { x: -38, y: 2.4 }, DOWN, [[0.18, 3.2], [0.4, 7.6], [0.68, 4.4], [0.9, 2.2]]);
  fang(k, { x: -1.4, y: 2 }, unit(0.06, 1), 15, 7.2, 0.1);
}

function paintLower(k: Brush): void {
  gum(k, FLOOR.slice(0, -3).map((p) => ({ x: p.x, y: p.y - 1.2 })), UP, 5);
  for (const x of [9.4, 7.7, 6]) fang(k, { x, y: -1.6 }, unit(0.15, -1), 2.6, 1.8, -0.05);
  fang(k, { x: 1.2, y: -1.6 }, unit(0.1, -1), 10, 5.6, -0.1, 0.45);
  cheekTooth(k, { x: -15, y: -1.6 }, { x: -20.5, y: -1.6 }, UP, [[0.5, 3.8]]);
  cheekTooth(k, { x: -22, y: -1.6 }, { x: -28.5, y: -1.6 }, UP, [[0.4, 4.8], [0.8, 2.4]]);
  cheekTooth(k, { x: -30, y: -1.5 }, { x: -41, y: -1 }, UP, [[0.27, 6.2], [0.52, 3], [0.76, 6]]);
  fang(k, { x: 4, y: -1.6 }, unit(0.1, -1), 13, 6.6, -0.12);
}

// ---------------------------------------------------------------- live

const WHISKER_ROOTS: readonly Pt[] = [
  { x: 10, y: -9.5 }, { x: 7.4, y: -8.2 }, { x: 4.8, y: -9.6 }, { x: 2.4, y: -7.4 }, { x: 9, y: -6.4 }, { x: 5.4, y: -5.2 }, { x: 0, y: -8.6 }, { x: -2, y: -5.6 },
];
const WHISKER_AIMS: readonly Pt[] = [
  { x: 30, y: -3 }, { x: 34, y: 5 }, { x: 26, y: 12 }, { x: 22, y: -8 }, { x: 30, y: 15 }, { x: -24, y: 10 }, { x: 18, y: 20 }, { x: -20, y: 2 },
];

function live(ctx: CanvasRenderingContext2D, t: number, lw: number): void {
  drawEye(ctx, EYE, blink(t, 4.7, 1.3), lw);
  whiskers(ctx, WHISKER_ROOTS, WHISKER_AIMS, '#fbf7ee', lw, Math.sin(t * 1.3) * 0.8);
}

// ---------------------------------------------------------------- export

const TEETH_BOX: Box = { x0: -60, x1: 18, y0: -22, y1: 24 };
const head = makeHead({
  seed: 6101,
  box: { x0: -190, x1: 20, y0: -86, y1: 134 },
  jawBox: { x0: -76, x1: 18, y0: -10, y1: 28 },
  teethBox: TEETH_BOX,
  hinge: HINGE,
  jawMax: 0.88,
  roof: ROOF,
  floor: FLOOR,
  mouth: { deep: '#2a0a0e', near: '#7e2f3a', tongue: '#d27e88', tongueLit: '#f2b7bd', tongueReach: 0.93, tongueThick: 7 },
  paintBody,
  paintJaw,
  paintUpper,
  paintLower,
  live,
});

export const drawJaguar: DrawHead = head.draw;

export async function prepare(): Promise<void> {
  await head.prepare();
}

export const KIT: KitEntry = {
  name: 'jaguar',
  draw: (ctx, w, h, t) => drawJaguar(ctx, { x: w * 0.72, y: h * 0.55, size: Math.min(w, h) * 0.55, jaw: 0.5 + 0.5 * Math.sin(t * 2), t }),
};
