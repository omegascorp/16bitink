import { INK, type Pt } from '../../../../src/art/pen';
import type { KitEntry } from '../../foodchain/kit';
import { spline } from '../../kraken/whale';
import { inkEdge, unit } from '../../polarshark/art/bearFur';
import { type Box, type Brush, dab, fadeRoot, px, smoothLoop, softLine, taper } from '../../seal/art/paint';
import { blink, cheekTooth, drawEye, type EyeLook, fang, fringe, fur, gum, inkTufts, inside, makeHead, rimShade, wash } from './catRig';
import type { DrawHead } from './contract';

/**
 * A German shepherd's head and shoulders (see contract.ts), painted: a pet, friendly and alert. Big erect pointed
 * ears, a long muzzle with a black mask and a big wet black nose, tan cheeks, brows and throat, the black saddle
 * running from the crown down the back of the neck, a warm brown eye with a catchlight, and a red leather collar
 * with its tag. Open, the dog's dentition: long canines, the incisors, a row of premolars and the carnassial, and
 * a long pink tongue.
 * Own units (catRig.ts): head 100 long, the bite point at 0,0.
 */

// ---------------------------------------------------------------- shape

const TOP: readonly Pt[] = spline([
  { x: -184, y: -10 }, { x: -164, y: -16 }, { x: -138, y: -26 }, { x: -114, y: -35 }, { x: -96, y: -45 }, { x: -80, y: -53 },
  { x: -64, y: -57 }, { x: -50, y: -53 }, { x: -41, y: -43 }, { x: -30, y: -35 }, { x: -12, y: -30 }, { x: 4, y: -26 },
], 5);
const NOSE_FRONT: readonly Pt[] = spline([
  { x: 4, y: -26 }, { x: 12, y: -24.6 }, { x: 16.6, y: -20.4 }, { x: 17.2, y: -15.4 }, { x: 15.2, y: -12.4 }, { x: 14.8, y: -8 }, { x: 13.8, y: -3.6 },
  { x: 11.2, y: -0.6 }, { x: 8, y: 0 },
], 4);
const ROOF: readonly Pt[] = spline([{ x: 8, y: 0 }, { x: 0, y: 0.3 }, { x: -12, y: 0.6 }, { x: -24, y: 1.2 }, { x: -34, y: 2.4 }, { x: -42, y: 4 }], 5);
const UNDER: readonly Pt[] = spline([
  { x: -42, y: 4 }, { x: -46, y: 9 }, { x: -52, y: 15 }, { x: -60, y: 23 }, { x: -72, y: 38 }, { x: -86, y: 58 }, { x: -100, y: 82 },
  { x: -112, y: 106 }, { x: -120, y: 128 },
], 5);
const BODY: readonly Pt[] = [...TOP, ...NOSE_FRONT.slice(1), ...ROOF.slice(1), ...UNDER.slice(1), { x: -186, y: 130 }, { x: -188, y: 40 }];

const EAR: readonly Pt[] = smoothLoop([
  { x: -55, y: -52 }, { x: -58, y: -68 }, { x: -63, y: -86 }, { x: -70, y: -102 }, { x: -74, y: -104.5 }, { x: -78, y: -98 },
  { x: -83, y: -82 }, { x: -88, y: -66 }, { x: -90, y: -50 },
], 5);
/** The ear's open front: the hollow, lined with pale hair. */
const EAR_HOLLOW: readonly Pt[] = smoothLoop([
  { x: -58, y: -56 }, { x: -61, y: -70 }, { x: -66, y: -86 }, { x: -71, y: -99 }, { x: -73, y: -92 }, { x: -72, y: -76 }, { x: -70, y: -62 },
], 5);
const FAR_EAR: readonly Pt[] = EAR.map((p) => ({ x: p.x + 9 + (p.y + 50) * 0.08, y: p.y + 3 }));

const NOSE: readonly Pt[] = smoothLoop([
  { x: 4, y: -26.4 }, { x: 12, y: -25 }, { x: 16.6, y: -20.4 }, { x: 17.3, y: -15.4 }, { x: 15.2, y: -12.2 }, { x: 10.6, y: -13 }, { x: 5.6, y: -16.4 }, { x: 3, y: -21.6 },
], 4);
/** The black mask over the muzzle, round the mouth and up to the eye. */
const MASK: readonly Pt[] = smoothLoop([
  { x: 6, y: -27 }, { x: -10, y: -31 }, { x: -24, y: -35 }, { x: -34, y: -40 }, { x: -46, y: -46 }, { x: -50, y: -40 }, { x: -36, y: -34 },
  { x: -30, y: -26 }, { x: -30, y: -16 }, { x: -36, y: -6 }, { x: -42, y: 3 }, { x: -30, y: 3 }, { x: -10, y: 1.4 }, { x: 10, y: 0.4 }, { x: 16, y: -10 },
], 5);
/** The black saddle: the crown, behind the ears and down the back of the neck to the shoulders. */
const SADDLE: readonly Pt[] = smoothLoop([
  { x: -46, y: -50 }, { x: -60, y: -60 }, { x: -82, y: -56 }, { x: -110, y: -40 }, { x: -140, y: -28 }, { x: -170, y: -16 }, { x: -196, y: -6 },
  { x: -196, y: 40 }, { x: -170, y: 34 }, { x: -146, y: 14 }, { x: -122, y: -4 }, { x: -96, y: -18 }, { x: -76, y: -32 }, { x: -58, y: -40 },
], 5);
/** The collar: a band round the neck, its top behind the bottom. */
const COLLAR_TOP: Pt = { x: -104, y: -40 };
const COLLAR_BOTTOM: Pt = { x: -76, y: 46 };
const COLLAR_W = 10;

const FLOOR: readonly Pt[] = spline([{ x: 10.4, y: 0.3 }, { x: 0, y: 0.4 }, { x: -12, y: 0.7 }, { x: -24, y: 1.3 }, { x: -34, y: 2.6 }, { x: -42, y: 4.2 }], 5);
const JAW_UNDER: readonly Pt[] = spline([
  { x: -66, y: 16 }, { x: -52, y: 17.5 }, { x: -36, y: 16.6 }, { x: -20, y: 14.6 }, { x: -6, y: 12.4 }, { x: 4, y: 9.6 }, { x: 9.4, y: 5.4 }, { x: 10.4, y: 0.3 },
], 5);
const JAW: readonly Pt[] = [...FLOOR, { x: -50, y: 0 }, { x: -58, y: -3 }, { x: -68, y: 3 }, ...JAW_UNDER.slice(0, -1)];
const HINGE: Pt = { x: -55, y: -2 };

const EYE: EyeLook = {
  at: { x: -40, y: -30.5 }, w: 10, h: 3.9, tilt: 0.14, irisIn: '#8a5428', irisOut: '#3e220e', pupil: 0.72, lid: '#2a201a', ring: null,
};

// ---------------------------------------------------------------- colour

const TAN = '#c4843e';
const TAN_LIT = '#ebbc78';
const TAN_DARK = '#7a4a1e';
const BLACK = '#1d1713';
const SHEEN = '#7c7480';
const flowHead = (p: Pt): Pt => (p.x > -60 ? unit(-1, (p.y + 26) * 0.02) : unit(-1, 0.15 + p.y * 0.012));
const blackAt = (p: Pt): boolean => inside(MASK, p) || inside(SADDLE, p);

// ---------------------------------------------------------------- the body

function paintEar(k: Brush, ear: readonly Pt[], far: boolean): void {
  const { pen, ctx } = k;
  wash(k, ear, far ? '#16110e' : BLACK, -104, -50, [[0, 'rgba(120,110,120,0.35)'], [0.5, 'rgba(60,50,50,0.1)'], [1, 'rgba(0,0,0,0.3)']]);
  if (far) {
    pen.stroke(ear.filter((p) => p.y < -56), px(k, 1.4), INK, 0.85, false);
    return;
  }
  pen.clipped(ear, () => {
    // Sheen down the back edge; the hollow at the front, pinkish grey deep inside, pale hair along its rim.
    softLine(ctx, [{ x: -86, y: -60 }, { x: -82, y: -80 }, { x: -76, y: -98 }], 4, SHEEN, 0.5);
    pen.fill(EAR_HOLLOW, '#5a4446', 1);
    pen.clipped(EAR_HOLLOW, () => {
      softLine(ctx, [{ x: -70, y: -60 }, { x: -70, y: -80 }, { x: -71, y: -95 }], 5, '#2a1c1c', 0.6);
      dab(ctx, -62, -64, 8, '170,120,110', 0.35);
    });
    for (let i = 0; i < 40; i++) {
      const y = -56 - pen.rng() * 40;
      const x = -59 - (y + 56) * -0.3 + pen.rng() * 4;
      pen.hair([{ x: x - 3, y: y + 2 }, { x: x - 1, y: y - 1 }, { x: x + 1.5, y: y - 4 - pen.rng() * 3 }], px(k, 0.8), i % 4 ? '#e8d8bc' : '#b89870', 0.75);
    }
    fur(k, ear, { n: 160, flow: () => unit(0.2, -1), len: [2, 4], tint: (_, r) => (r < 0.5 ? [SHEEN, 0.3] : ['#000000', 0.25]) });
  });
  fringe(k, ear.filter((p) => p.x < -72 || p.y < -96), {
    side: -1, flow: () => unit(0.1, -1), len: () => [1, 2.2], every: 0.9, width: 0.8, colour: () => ['#141010', 0.8],
  });
  pen.stroke(ear.filter((p) => p.y < -55), px(k, 1.9), INK, 0.95, true);
}

function paintForm(k: Brush): void {
  const { ctx } = k;
  // Masses lit from above: the crown and the bridge, the cheek; shade under the jaw, down the neck, behind the cheek.
  dab(ctx, -58, -50, 18, '255,230,170', 0.3);
  softLine(ctx, [{ x: 2, y: -27 }, { x: -14, y: -31 }, { x: -30, y: -36 }], 4, '#fff0c8', 0.4);
  dab(ctx, -54, -18, 16, '255,226,160', 0.35);
  softLine(ctx, [{ x: -70, y: -30 }, { x: -74, y: -8 }, { x: -66, y: 14 }], 20, '#5a3410', 0.16);
  dab(ctx, -76, 36, 24, '70,40,12', 0.3);
  dab(ctx, -140, 80, 40, '60,32,10', 0.3);
  softLine(ctx, [{ x: -66, y: 30 }, { x: -96, y: 70 }, { x: -116, y: 120 }], 16, '#6a3c12', 0.3);
  dab(ctx, -120, 20, 30, '255,226,160', 0.2);
  // Tan brows over the eye.
  dab(ctx, -38, -38.5, 4.5, '230,170,96', 0.9);
}

function paintBlack(k: Brush): void {
  const { pen, ctx } = k;
  for (const shape of [MASK, SADDLE]) {
    pen.fill(shape, BLACK, 0.96);
    pen.clipped(shape, () => softLine(ctx, [...shape, shape[0]!], 10, '#6a4424', 0.7));
  }
  pen.clipped(MASK, () => {
    softLine(ctx, [{ x: 4, y: -26 }, { x: -12, y: -29.5 }, { x: -28, y: -33 }], 4, SHEEN, 0.5);
    dab(ctx, -6, -14, 10, '90,84,96', 0.25);
  });
  pen.clipped(SADDLE, () => {
    softLine(ctx, [{ x: -64, y: -56 }, { x: -96, y: -44 }, { x: -140, y: -26 }, { x: -186, y: -8 }], 8, SHEEN, 0.4);
  });
  // Tan fur lapping into the black where they meet, black hair over tan: the coat's edges are soft.
  fringe(k, SADDLE.slice(Math.floor(SADDLE.length * 0.5)), {
    side: -1, flow: (p) => unit(-1, 0.4 + p.y * 0.004), len: () => [3, 7], every: 0.9, width: 1.3,
    colour: (_, r) => (r < 0.6 ? [BLACK, 0.85] : ['#4a3a30', 0.6]),
  });
  fringe(k, MASK.slice(28, 52), {
    side: -1, flow: () => unit(-1, 0.1), len: () => [2.5, 5], every: 0.6, width: 1, colour: (_, r) => (r < 0.5 ? [BLACK, 0.7] : r < 0.8 ? ['#5a4030', 0.6] : [TAN, 0.7]),
  });
}

function paintFur(k: Brush): void {
  fur(k, BODY, {
    n: 2600, flow: flowHead, len: [2.4, 5.5],
    tint: (p, r) => {
      if (blackAt(p)) return r < 0.35 ? [SHEEN, 0.32] : ['#000000', 0.3];
      const lit = Math.max(0, Math.min(1, (-p.y + 30) / 80));
      return r < 0.3 + 0.45 * lit ? [TAN_LIT, 0.38] : [TAN_DARK, 0.26];
    },
  });
  fur(k, BODY, {
    n: 1100, flow: (p) => unit(-1, 0.25 + p.y * 0.014), len: [5, 11],
    tint: (p, r) => (p.x > -70 ? null : blackAt(p) ? (r < 0.4 ? [SHEEN, 0.28] : ['#000000', 0.28]) : r < 0.45 ? [TAN_LIT, 0.3] : [TAN_DARK, 0.24]),
  });
}

/** The ruff behind the cheek: fur sweeping back and down. */
function paintRuff(k: Brush): void {
  const line = spline([{ x: -66, y: -42 }, { x: -72, y: -26 }, { x: -73, y: -8 }, { x: -66, y: 10 }, { x: -58, y: 22 }], 5);
  fringe(k, line, {
    side: -1, flow: (p) => unit(-0.6, 0.8 + p.y * 0.004), len: () => [5, 9], every: 1.4, width: 1.2,
    colour: (p, r) => (p.y < -30 ? (r < 0.6 ? [BLACK, 0.35] : [TAN_DARK, 0.3]) : r < 0.45 ? [TAN_LIT, 0.35] : [TAN_DARK, 0.3]),
  });
}

function collarBand(): { readonly band: Pt[]; readonly back: readonly Pt[]; readonly front: readonly Pt[] } {
  const d = unit(COLLAR_BOTTOM.x - COLLAR_TOP.x, COLLAR_BOTTOM.y - COLLAR_TOP.y);
  const n = { x: d.y, y: -d.x };
  const bow = (u: number): number => Math.sin(Math.PI * u) * 4;
  const edge = (o: number): Pt[] => Array.from({ length: 13 }, (_, i) => {
    const u = i / 12;
    return { x: COLLAR_TOP.x + (COLLAR_BOTTOM.x - COLLAR_TOP.x) * u + n.x * (o + bow(u)), y: COLLAR_TOP.y + (COLLAR_BOTTOM.y - COLLAR_TOP.y) * u + n.y * (o + bow(u)) };
  });
  const back = edge(-COLLAR_W / 2);
  const front = edge(COLLAR_W / 2);
  return { band: [...back, ...[...front].reverse()], back, front };
}

/** The red leather collar: lit along its top edge, stitched, half buried in the neck fur; a ring and a brass tag. */
function paintCollar(k: Brush): void {
  const { pen, ctx } = k;
  const { band, back, front } = collarBand();
  wash(k, band, '#a3281f', -40, 66, [[0, 'rgba(255,160,130,0.25)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(40,0,0,0.4)']]);
  pen.clipped(band, () => {
    softLine(ctx, front.map((p) => ({ x: p.x - 1.5, y: p.y + 0.2 })), 2.6, '#f08a70', 0.55);
    softLine(ctx, back.map((p) => ({ x: p.x + 1.5, y: p.y })), 3, '#3a0806', 0.55);
  });
  for (const line of [back, front]) {
    const s = line.map((p, i) => ({ x: p.x + (line === back ? 1.6 : -1.6), y: p.y + (i ? 0 : 0) }));
    for (let i = 0; i < s.length - 1; i++) {
      for (let j = 0; j < 3; j++) {
        const a = { x: s[i]!.x + ((s[i + 1]!.x - s[i]!.x) * j) / 3, y: s[i]!.y + ((s[i + 1]!.y - s[i]!.y) * j) / 3 };
        pen.dot(a.x, a.y, px(k, 0.8) + 0.12, '#f2d2b8', 0.75);
      }
    }
  }
  pen.stroke(back, px(k, 1.4), INK, 0.9, false);
  pen.stroke(front, px(k, 1.4), INK, 0.9, false);
  // Neck fur lying over both edges of the collar.
  fringe(k, back, { side: 1, flow: () => unit(-0.2, 1), len: () => [2, 4.5], every: 0.9, width: 1.2, colour: (p, r) => (p.y < 0 ? [r < 0.5 ? BLACK : '#3a2c24', 0.85] : [r < 0.5 ? TAN : TAN_DARK, 0.85]) });
  fringe(k, front, { side: 1, flow: () => unit(-1, 0.3), len: () => [2, 4], every: 1, width: 1.1, colour: (p, r) => (p.y < 0 ? [r < 0.5 ? BLACK : '#3a2c24', 0.7] : [r < 0.5 ? TAN : TAN_LIT, 0.75]) });
}

/** The ring at the throat and the brass tag hanging from it. */
function paintTag(k: Brush): void {
  const { pen, ctx } = k;
  const ring = { x: COLLAR_BOTTOM.x + 2, y: COLLAR_BOTTOM.y + 4 };
  ctx.save();
  ctx.strokeStyle = '#b8b4ac';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, 2.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  pen.circle(ring.x, ring.y, 3.4, px(k, 1), INK);
  const tag = smoothLoop([{ x: ring.x - 4, y: ring.y + 5 }, { x: ring.x + 4, y: ring.y + 5 }, { x: ring.x + 5, y: ring.y + 10 }, { x: ring.x, y: ring.y + 14 }, { x: ring.x - 5, y: ring.y + 10 }], 4);
  wash(k, tag, '#d9a93c', ring.y + 5, ring.y + 14, [[0, 'rgba(255,240,180,0.7)'], [0.5, 'rgba(255,220,120,0)'], [1, 'rgba(90,50,0,0.5)']]);
  pen.hair([{ x: ring.x - 2, y: ring.y + 8 }, { x: ring.x + 2, y: ring.y + 7.6 }], px(k, 1), '#ffffff', 0.6);
  pen.stroke([...tag, tag[0]!], px(k, 1.2), INK, 0.9, false);
}

function paintFace(k: Brush): void {
  const { pen, ctx } = k;
  // The nose: black, wet, a cool sheen on top, the nostril a curled slit at the front.
  wash(k, NOSE, '#141012', -26.4, -12.2, [[0, 'rgba(160,160,176,0.6)'], [0.35, 'rgba(70,70,80,0.15)'], [1, 'rgba(0,0,0,0.3)']]);
  for (let i = 0; i < 40; i++) {
    const x = 5 + pen.rng() * 11;
    const y = -24 + pen.rng() * 10;
    if (inside(NOSE, { x, y })) pen.dot(x, y, px(k, 0.6) + 0.15, '#3a383e', 0.6);
  }
  pen.hair(spline([{ x: 17, y: -17.4 }, { x: 15, y: -16.6 }, { x: 13.6, y: -14.6 }], 3), px(k, 2.4), '#000000', 1);
  dab(ctx, 10, -23.2, 2.6, '235,240,250', 0.75);
  pen.dot(12.4, -22.8, px(k, 1.4), '#ffffff', 0.85);
  pen.stroke([...NOSE, NOSE[0]!], px(k, 1.4), INK, 0.95, false);
  // The philtrum and the black lips, drooping into flews at the back.
  pen.hair(spline([{ x: 15.2, y: -12.2 }, { x: 14.8, y: -8 }, { x: 13.8, y: -3.6 }, { x: 11, y: -0.4 }], 4), px(k, 1.3), INK, 0.85);
  taper(ctx, ROOF, 2.4, 1.4, '#0c0a0a', 0.95);
  // Short dark whiskers in rows on the muzzle.
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 5; i++) pen.dot(9 - i * 3.6 - row * 1.2, -12 + row * 3 + i * 0.5, px(k, 1.2) + 0.2, '#4a4048', 0.6);
  }
  // The brow ridge over the eye; the socket's shade.
  pen.hair(spline([{ x: -46, y: -35.5 }, { x: -40, y: -38.2 }, { x: -33, y: -36.4 }], 4), px(k, 1.1), INK, 0.5);
  dab(ctx, -40, -30, 7, '20,14,10', 0.3);
}

function paintSilhouette(k: Brush): void {
  const flowBack = (p: Pt): Pt => unit(-1, 0.15 + p.y * 0.002);
  const neck = TOP.filter((p) => p.x < -44);
  fringe(k, neck, {
    side: 1, flow: flowBack, len: (p) => (p.x < -90 ? [3.5, 7] : [2, 4]), every: 1, width: 1.4,
    colour: (_, r) => (r < 0.55 ? ['#2a221e', 0.85] : ['#5a4a40', 0.6]),
  });
  fringe(k, UNDER.slice(0, 16), {
    side: 1, flow: (p) => unit(-0.4, 1 + p.y * 0.01), len: () => [2.5, 5], every: 1, width: 1.3,
    colour: (_, r) => (r < 0.5 ? [TAN, 0.9] : r < 0.8 ? [TAN_LIT, 0.7] : [TAN_DARK, 0.6]),
  });
  fringe(k, UNDER.slice(16), {
    side: 1, flow: () => unit(-0.5, 1), len: () => [4, 8], every: 0.8, width: 1.4, lean: 0.5,
    colour: (_, r) => (r < 0.6 ? ['#e2aa62', 0.85] : [TAN_DARK, 0.55]),
  });
  inkEdge(k, TOP, (p) => (p.x > -44 ? 2.1 : 1.8), (p) => (p.x < -44 ? 0.3 : 0.03), 0.92);
  inkTufts(k, neck, 1, flowBack, 3.4, 2.6, 0.75, 0.6);
  inkEdge(k, NOSE_FRONT, () => 1.9, () => 0, 0.95);
  inkEdge(k, UNDER.slice(16), () => 1.9, () => 0.35, 0.9);
  inkTufts(k, UNDER.slice(16), 1, () => unit(-0.5, 1), 4, 2.4, 0.7, 0.55);
}

function paintBody(k: Brush): void {
  paintEar(k, FAR_EAR, true);
  wash(k, BODY, TAN, -58, 128, [[0, 'rgba(255,228,160,0.5)'], [0.35, 'rgba(255,220,140,0.08)'], [0.7, 'rgba(90,50,15,0.12)'], [1, 'rgba(60,30,8,0.4)']]);
  k.pen.clipped(BODY, () => {
    paintForm(k);
    paintBlack(k);
    paintFur(k);
    paintRuff(k);
    paintCollar(k);
  });
  paintFace(k);
  paintSilhouette(k);
  paintTag(k);
  paintEar(k, EAR, false);
  fadeRoot(k.ctx, -188, -146);
}

// ---------------------------------------------------------------- the lower jaw

function paintJaw(k: Brush): void {
  const { pen, ctx } = k;
  // Black lips and chin over tan under the jaw.
  wash(k, JAW, TAN, -2, 18, [[0, 'rgba(255,230,170,0.3)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(70,40,10,0.5)']]);
  pen.clipped(JAW, () => {
    const lip = spline([{ x: -70, y: -1 }, { x: -44, y: 4 }, { x: -20, y: 3.6 }, { x: 4, y: 2.6 }, { x: 12, y: 3 }], 5);
    softLine(ctx, lip, 13, BLACK, 1);
    softLine(ctx, [{ x: 6, y: 4 }, { x: 10, y: 8 }], 8, BLACK, 0.9);
    softLine(ctx, JAW_UNDER, 5, '#5a3410', 0.45);
    fur(k, JAW, {
      n: 420, flow: () => unit(-1, 0.12), len: [2, 4.5],
      tint: (p, r) => (p.y < 7 || p.x > 2 ? (r < 0.4 ? [SHEEN, 0.3] : ['#000000', 0.25]) : r < 0.5 ? [TAN_LIT, 0.35] : [TAN_DARK, 0.25]),
    });
  });
  taper(ctx, FLOOR, 1.8, 1, '#0c0a0a', 0.95);
  fringe(k, JAW_UNDER.slice(0, -6), {
    side: 1, flow: () => unit(-1, 0.4), len: () => [2.5, 5], every: 1, width: 1.2,
    colour: (_, r) => (r < 0.6 ? [TAN, 0.85] : [TAN_DARK, 0.5]),
  });
  inkEdge(k, JAW_UNDER, () => 1.9, () => 0.15, 0.92);
}

// ---------------------------------------------------------------- teeth

const DOWN: Pt = { x: 0, y: 1 };
const UP: Pt = { x: 0, y: -1 };

function paintUpper(k: Brush): void {
  gum(k, ROOF.slice(0, -3).map((p) => ({ x: p.x, y: p.y + 1.2 })), DOWN, 5, '#cf7a86');
  for (const x of [8.6, 6.8, 5]) fang(k, { x, y: 2.2 }, unit(0.1, 1), 3.4, 2.1, 0.04);
  fang(k, { x: -4.4, y: 2.1 }, unit(0.05, 1), 9.5, 5, 0.12, 0.45);
  cheekTooth(k, { x: -8.5, y: 2.2 }, { x: -11.5, y: 2.3 }, DOWN, [[0.5, 2.2]]);
  cheekTooth(k, { x: -13.5, y: 2.4 }, { x: -18.5, y: 2.5 }, DOWN, [[0.4, 3.6], [0.85, 1.6]]);
  cheekTooth(k, { x: -20.5, y: 2.6 }, { x: -26.5, y: 2.8 }, DOWN, [[0.4, 4.2], [0.85, 1.8]]);
  cheekTooth(k, { x: -28, y: 3 }, { x: -39, y: 3.8 }, DOWN, [[0.15, 2.6], [0.4, 6.4], [0.75, 3.4]]);
  fang(k, { x: -1.4, y: 2 }, unit(0.06, 1), 11.5, 6, 0.12);
}

function paintLower(k: Brush): void {
  gum(k, FLOOR.slice(0, -3).map((p) => ({ x: p.x, y: p.y - 1.2 })), UP, 5, '#cf7a86');
  for (const x of [9.4, 7.7, 6]) fang(k, { x, y: -1.6 }, unit(0.15, -1), 3, 1.9, -0.05);
  fang(k, { x: 1.2, y: -1.6 }, unit(0.1, -1), 8.5, 4.8, -0.12, 0.45);
  cheekTooth(k, { x: -9, y: -1.5 }, { x: -12, y: -1.4 }, UP, [[0.5, 2.2]]);
  cheekTooth(k, { x: -14, y: -1.3 }, { x: -18.5, y: -1.2 }, UP, [[0.45, 3.4]]);
  cheekTooth(k, { x: -20.5, y: -1 }, { x: -25.5, y: -0.8 }, UP, [[0.45, 3.8], [0.85, 1.6]]);
  cheekTooth(k, { x: -27.5, y: -0.6 }, { x: -39, y: 0.4 }, UP, [[0.25, 5.2], [0.5, 2.6], [0.72, 4.6]]);
  fang(k, { x: 4, y: -1.6 }, unit(0.12, -1), 10, 5.6, -0.12);
}

// ---------------------------------------------------------------- live

function live(ctx: CanvasRenderingContext2D, t: number, lw: number): void {
  drawEye(ctx, EYE, blink(t, 3.9, 2.1), lw);
  // A tan spot of brow over the eye catches the light: a friendly, alert look.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,224,170,0.35)';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-43, -37.6);
  ctx.quadraticCurveTo(-39, -39.6, -35, -37.8);
  ctx.stroke();
  ctx.restore();
  rimShadeLive(ctx, lw);
}

/** A soft dark line under the eye: dogs' lower lids are dark-rimmed. */
function rimShadeLive(ctx: CanvasRenderingContext2D, lw: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(20,12,8,0.5)';
  ctx.lineWidth = 0.9 * lw;
  ctx.beginPath();
  ctx.moveTo(-45.5, -29.4);
  ctx.quadraticCurveTo(-40, -25.6, -34.4, -30.2);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- export

const TEETH_BOX: Box = { x0: -60, x1: 18, y0: -22, y1: 24 };
const head = makeHead({
  seed: 8417,
  box: { x0: -200, x1: 22, y0: -110, y1: 134 },
  jawBox: { x0: -74, x1: 18, y0: -10, y1: 26 },
  teethBox: TEETH_BOX,
  hinge: HINGE,
  jawMax: 0.78,
  roof: ROOF,
  floor: FLOOR,
  mouth: { deep: '#2a0a0e', near: '#82323e', tongue: '#e0808f', tongueLit: '#f8bcc4', tongueReach: 0.97, tongueThick: 11 },
  paintBody,
  paintJaw,
  paintUpper,
  paintLower,
  live,
});

export const drawDog: DrawHead = head.draw;

export async function prepare(): Promise<void> {
  await head.prepare();
}

export const KIT: KitEntry = {
  name: 'dog',
  draw: (ctx, w, h, t) => drawDog(ctx, { x: w * 0.72, y: h * 0.55, size: Math.min(w, h) * 0.55, jaw: 0.5 + 0.5 * Math.sin(t * 2), t }),
};
