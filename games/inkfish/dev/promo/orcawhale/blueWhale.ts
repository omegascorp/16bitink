import { PAPER_FILL } from '../../../src/art/fish/kit';
import { INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FPS, BOIL_FRAMES } from '../../../src/art/textures';
import { createRng, type Rng } from '../../../src/logic/rng';
import { resample, spline } from '../kraken/whale';

/**
 * Copied from ../foodchain/art/blueWhale.ts for the orca short, with the
 * tongue on the floor of the open mouth (it glows on "tongue") and the
 * mouth's and head's outlines exported, so an orca can be drawn inside the
 * mouth and kept behind the head.
 *
 * The blue whale, the biggest animal that has ever lived, in the game's pen
 * and ink, painted rather than doodled: paper under a blue-grey wash laid on
 * a little off the outline, dappled all over with the pale blotches that are
 * its signature, lit from above with the belly shaded by lines that follow
 * its curve. A rorqual like the humpback in ../../kayak/whale.ts, but long
 * and slender (about 9.5 times as long as it is deep), with a long, flat
 * rostrum, the raised splashguard in front of the blowholes, a tiny dorsal
 * fin three quarters of the way back, small slim flippers and broad flukes,
 * and the throat pleats running from the chin to the navel.
 *
 * Drawn in its own frame ("local units", 3,016 from chin to fluke tips,
 * snout along +x, belly +y) in two passes, so krill can go between them:
 * `drawBlueWhaleBack` (the body and flukes, then the dark inside of the
 * open mouth with its black baleen), and `drawBlueWhaleFront` (the pleated
 * throat, ballooning into a pouch of water, the lower jaw dropped up to 83
 * degrees, the near flipper).
 *
 * The body is baked once per line-boil frame at four sizes (0.12, 0.3, 0.6
 * and 1 sprite px per local unit) plus the head alone at 2.4, laid over the
 * largest when the whale is drawn past 3,000 px long. The throat, jaw, mouth
 * and flipper change shape with the pose, so they're inked live, crisp at any
 * size. About 43 MB of canvases (26 MB body, 17 MB head).
 */

export interface BlueWhalePose {
  /** 0 shut .. 1 the lower jaw dropped GAPE_MAX radians. */
  readonly gape?: number;
  /** 0 the pleated throat flat .. 1 ballooned into a huge pouch of water. */
  readonly throat?: number;
  /** The fluke beat's phase, radians (default: from t). */
  readonly tail?: number;
  /** 0 .. 1: the tongue on the mouth's floor lit up. */
  readonly tongue?: number;
}

// ---------------------------------------------------------------- the shape, in local units

const SEG = 16;
const pathLength = (pts: readonly Pt[]): number => pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y), 0);
/** A smooth curve through points, resampled to even steps of about `spacing` units (the pen wobbles at each one). */
function curve(points: readonly Pt[], spacing = SEG): Pt[] {
  const s = spline(points, 12);
  return resample(s, Math.max(2, Math.round(pathLength(s) / spacing) + 1));
}
const lerpPt = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const smooth = (a: number, b: number, v: number): number => {
  const u = clamp01((v - a) / (b - a));
  return u * u * (3 - 2 * u);
};

/** The top line, from the snout tip along the flat rostrum, over the splashguard and the blowholes, along the back to the tail stock. */
const TOP = curve([
  { x: 1500, y: 4 }, { x: 1496, y: -9 }, { x: 1470, y: -18 }, { x: 1420, y: -24 }, { x: 1320, y: -33 }, { x: 1190, y: -45 }, { x: 1090, y: -58 },
  { x: 1066, y: -64 }, { x: 1048, y: -80 }, { x: 1030, y: -86 }, { x: 1013, y: -79 }, { x: 1003, y: -71 }, { x: 990, y: -75 },
  { x: 960, y: -84 }, { x: 880, y: -99 }, { x: 720, y: -126 }, { x: 480, y: -145 }, { x: 200, y: -150 }, { x: -100, y: -143 },
  { x: -400, y: -127 }, { x: -700, y: -106 }, { x: -900, y: -84 }, { x: -1080, y: -60 }, { x: -1200, y: -43 }, { x: -1250, y: -36 },
], 12);
/** The upper lip (the mouth line), snout tip to the corner of the mouth. */
const UPPER_LIP = curve([
  { x: 1500, y: 4 }, { x: 1497, y: 12 }, { x: 1450, y: 15 }, { x: 1320, y: 13 }, { x: 1180, y: 14 }, { x: 1060, y: 20 },
  { x: 980, y: 32 }, { x: 935, y: 46 }, { x: 908, y: 60 }, { x: 900, y: 66 },
]);
/** The navel, where the throat pleats end. */
const NAVEL: Pt = { x: 0, y: 157 };
/** Where the pleated skin starts on the flank: from behind the jaw to the navel. */
const ROOT = curve([{ x: 905, y: 92 }, { x: 780, y: 99 }, { x: 600, y: 109 }, { x: 400, y: 123 }, { x: 200, y: 140 }, NAVEL]);
/** The underside behind the navel, to the tail stock. */
const BELLY_AFT = curve([NAVEL, { x: -250, y: 146 }, { x: -550, y: 121 }, { x: -850, y: 86 }, { x: -1050, y: 58 }, { x: -1180, y: 42 }, { x: -1250, y: 36 }]);
/** The throat shut: chin to navel. */
const THROAT_SHUT = curve([
  { x: 1502, y: 50 }, { x: 1440, y: 70 }, { x: 1330, y: 98 }, { x: 1180, y: 128 }, { x: 1000, y: 152 }, { x: 800, y: 166 },
  { x: 560, y: 173 }, { x: 320, y: 170 }, { x: 140, y: 163 }, NAVEL,
]);

/** The lower jaw, shut: its lip (just over the upper lip, so they overlap), the chin poking out past the snout, its underside. */
const LOWER_LIP = curve([
  { x: 900, y: 66 }, { x: 932, y: 46 }, { x: 982, y: 30 }, { x: 1060, y: 18 }, { x: 1180, y: 12 }, { x: 1320, y: 11 }, { x: 1450, y: 13 }, { x: 1506, y: 12 },
]);
const CHIN: readonly Pt[] = [{ x: 1514, y: 19 }, { x: 1517, y: 30 }, { x: 1513, y: 42 }, { x: 1502, y: 50 }];
const JAW_UNDER = curve([{ x: 1502, y: 50 }, { x: 1420, y: 62 }, { x: 1300, y: 70 }, { x: 1160, y: 80 }, { x: 1030, y: 86 }, { x: 950, y: 90 }, { x: 905, y: 92 }]);
const JAW_SHAPE: readonly Pt[] = [...LOWER_LIP, ...CHIN, ...JAW_UNDER.slice(1)];
/** The jaw turns about here. */
const PIVOT: Pt = { x: 900, y: 72 };
/** How far the jaw drops at gape 1 (radians, about 83 degrees, like a real lunge). */
export const GAPE_MAX = 1.45;

const DORSAL = curve([{ x: -672, y: -104 }, { x: -720, y: -118 }, { x: -770, y: -136 }, { x: -800, y: -147 }, { x: -814, y: -148 }, { x: -808, y: -134 }, { x: -814, y: -110 }, { x: -838, y: -88 }], 8);
/** The flukes, seen a little from above: the upper lobe raised, the lower one dropped, a notch between. */
const FLUKES: readonly Pt[] = [
  ...curve([{ x: -1230, y: -38 }, { x: -1300, y: -80 }, { x: -1390, y: -150 }, { x: -1470, y: -200 }, { x: -1500, y: -214 }]),
  ...curve([{ x: -1500, y: -214 }, { x: -1468, y: -160 }, { x: -1430, y: -90 }, { x: -1402, y: -30 }, { x: -1392, y: 0 }]).slice(1),
  ...curve([{ x: -1392, y: 0 }, { x: -1402, y: 34 }, { x: -1440, y: 100 }, { x: -1476, y: 170 }, { x: -1492, y: 214 }]).slice(1),
  ...curve([{ x: -1492, y: 214 }, { x: -1458, y: 200 }, { x: -1380, y: 140 }, { x: -1300, y: 78 }, { x: -1230, y: 38 }]).slice(1),
];
const EYE = { x: 858, y: 34, r: 10 } as const;
const FIN_ROOT: Pt = { x: 742, y: 100 };

const CHIN_X = 1516;
const FLUKE_TIP_X = -1500;
const LOCAL_LEN = CHIN_X - FLUKE_TIP_X;
const CENTRE_X = (CHIN_X + FLUKE_TIP_X) / 2;

/** The body sprite's outline: everything but the jaw and the throat, reaching a little under where the throat is laid over it. */
const BODY: readonly Pt[] = [
  ...TOP,
  ...[...BELLY_AFT].reverse(),
  ...[...ROOT].reverse().map((p) => ({ x: p.x, y: p.y + 9 * smooth(0, 220, p.x) })),
  ...[...UPPER_LIP].reverse(),
];

function edgeAt(line: readonly Pt[], x: number): number {
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    if ((a.x - x) * (b.x - x) <= 0) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x || 1);
  }
  return line[line.length - 1]!.y;
}
const topAt = (x: number): number => edgeAt(TOP, x);
const bottomAt = (x: number): number => (x < 0 ? edgeAt(BELLY_AFT, x) : x < 900 ? edgeAt(ROOT, x) : edgeAt(UPPER_LIP, x));

// ---------------------------------------------------------------- colours and the painted finish

const BLUE = '#4a6d92';
const WASH = 0.86;
const LIGHT = '#eef4f8';
const LIGHT_RGB = '236,244,250';
const SHADOW_RGB = '8,18,32';
const PALE_RGB = '184,205,224';
const DARK_RGB = '22,38,60';
const GROOVE = '#152230';
const STRETCH = '#d9e3e6';
const LINING = '#6e4352';
const BALEEN = '#0e0c0f';
const BALEEN_EDGE = '#55545c';
const FRINGE = '#8a7a66';
const GUM = '#5e6a74';
const WOBBLE = 1.4;

/** The light from above: lit across the back, the core shadow low on the flank, a little bounce under the belly (local y). */
const SHADE_Y: readonly [number, number] = [-150, 175];
const SHADE: readonly (readonly [number, string])[] = [
  [0, `rgba(${LIGHT_RGB},0.36)`], [0.2, `rgba(${LIGHT_RGB},0.08)`], [0.5, `rgba(${SHADOW_RGB},0.1)`], [0.8, `rgba(${SHADOW_RGB},0.5)`], [1, `rgba(${SHADOW_RGB},0.36)`],
];

function shapePath(ctx: CanvasRenderingContext2D, shape: readonly Pt[]): void {
  ctx.beginPath();
  shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

/** A vertical gradient over a shape (clipped to it). */
function shade(ctx: CanvasRenderingContext2D, shape: readonly Pt[], y0: number, y1: number, stops: readonly (readonly [number, string])[]): void {
  ctx.save();
  shapePath(ctx, shape);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  ctx.fillStyle = g;
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  ctx.fillRect(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  ctx.restore();
}

/** Paper, then the blue-grey wash, laid on `off` units below the outline so a sliver of paper shows along the top, where the light is. */
function washOf(pen: Pen, shape: readonly Pt[], off = 0): void {
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    pen.ctx.translate(0, off);
    pen.fill(shape, BLUE, WASH);
    pen.ctx.translate(0, -off);
  });
}

// ---------------------------------------------------------------- the mottling

/** A soft, ragged blotch of pale or dark pigment: the dappled skin that names the blue whale. */
interface Blotch { readonly x: number; readonly y: number; readonly rx: number; readonly ry: number; readonly rot: number; readonly light: boolean; readonly alpha: number; readonly wob: readonly number[] }

function blotchOf(rng: Rng, x: number, y: number, r: number, light: boolean): Blotch {
  return {
    x, y, light,
    rx: r * (1.4 + rng() * 1.6),
    ry: r * (0.5 + rng() * 0.4),
    rot: (rng() - 0.5) * 0.5,
    alpha: light ? 0.16 + rng() * 0.26 : 0.12 + rng() * 0.2,
    wob: Array.from({ length: 9 }, () => 0.65 + rng() * 0.7),
  };
}

/** Pale blotches on the darker back, darker spots on the paler flank; few on the plainer head. */
const BODY_MOTTLE: readonly Blotch[] = (() => {
  const rng = createRng(2718);
  const out: Blotch[] = [];
  while (out.length < 1300) {
    const x = -1240 + rng() * 2720;
    const v = rng();
    const head = x > 980;
    if (head && rng() < 0.65) continue;
    const top = topAt(x) + 4;
    const y = top + (bottomAt(x) - top) * v;
    const r = (3 + rng() * rng() * 22) * (head ? 0.7 : 1) * (x < -900 ? 0.7 : 1);
    out.push(blotchOf(rng, x, y, r, rng() < (v < 0.55 ? 0.8 : 0.4)));
  }
  return out;
})();

/** The throat's few blotches, placed along it (t, chin 0 .. navel 1) and across it (k, its root 0 .. its outer edge 1). */
const THROAT_MOTTLE: readonly (Blotch & { readonly k: number })[] = (() => {
  const rng = createRng(3141);
  return Array.from({ length: 70 }, () => ({ ...blotchOf(rng, 0.08 + rng() * 0.84, 0, 4 + rng() * 14, rng() < 0.55), k: 0.05 + rng() * 0.6 }));
})();

const JAW_MOTTLE: readonly Blotch[] = (() => {
  const rng = createRng(1618);
  return Array.from({ length: 26 }, () => {
    const x = 940 + rng() * 540;
    const y = edgeAt(LOWER_LIP, x) + 8 + rng() * (edgeAt(JAW_UNDER, x) - edgeAt(LOWER_LIP, x) - 12);
    return blotchOf(rng, x, y, 4 + rng() * 9, rng() < 0.6);
  });
})();

function paintBlotch(ctx: CanvasRenderingContext2D, b: Blotch, at: Pt = b, stretch = 1, rot = b.rot): void {
  const ring = (scale: number): void => {
    const pts = b.wob.map((w, i) => {
      const a = (i / b.wob.length) * Math.PI * 2;
      const lx = Math.cos(a) * b.rx * stretch * w * scale;
      const ly = Math.sin(a) * b.ry * w * scale;
      return { x: at.x + lx * Math.cos(rot) - ly * Math.sin(rot), y: at.y + lx * Math.sin(rot) + ly * Math.cos(rot) };
    });
    ctx.beginPath();
    const mid = (p: Pt, q: Pt): Pt => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
    const start = mid(pts[pts.length - 1]!, pts[0]!);
    ctx.moveTo(start.x, start.y);
    pts.forEach((p, i) => {
      const m = mid(p, pts[(i + 1) % pts.length]!);
      ctx.quadraticCurveTo(p.x, p.y, m.x, m.y);
    });
    ctx.closePath();
  };
  const rgb = b.light ? PALE_RGB : DARK_RGB;
  ring(1);
  ctx.fillStyle = `rgba(${rgb},${b.alpha.toFixed(3)})`;
  ctx.fill();
  // The pigment pools at the blotch's edge, like a wash drying.
  ctx.strokeStyle = `rgba(${rgb},${(b.alpha * 0.8).toFixed(3)})`;
  ctx.lineWidth = Math.max(1, b.ry * 0.12);
  ctx.stroke();
  if (!b.light) return;
  ring(0.5);
  ctx.fillStyle = `rgba(${rgb},${(b.alpha * 0.6).toFixed(3)})`;
  ctx.fill();
}

// ---------------------------------------------------------------- the body sprite

function paintFlukes(pen: Pen, ink: number): void {
  const { ctx } = pen;
  washOf(pen, FLUKES, 4);
  pen.clipped(FLUKES, () => {
    for (const b of BODY_MOTTLE.slice(0, 40)) paintBlotch(ctx, b, { x: -1260 - ((b.x + 1240) % 240), y: b.y * 1.2 }, 0.7);
  });
  shade(ctx, FLUKES, -220, 220, [[0, `rgba(${LIGHT_RGB},0.16)`], [0.5, `rgba(${SHADOW_RGB},0.12)`], [1, `rgba(${SHADOW_RGB},0.48)`]]);
  // Lines along each lobe, from the stock to the trailing edge.
  pen.clipped(FLUKES, () => {
    for (let k = 0; k < 14; k++) {
      const u = k / 13;
      for (const lobe of [-1, 1]) {
        const tip = lobe < 0 ? { x: -1500, y: -214 } : { x: -1492, y: 214 };
        const from = { x: -1250, y: lobe * 14 };
        const to = { x: -1400 + (tip.x + 1400) * u, y: lobe * 4 + (tip.y - lobe * 4) * u };
        pen.hair([from, { x: (from.x + to.x) / 2 - 14, y: (from.y + to.y) / 2 }, to], 1.1 * ink, INK, 0.3);
      }
    }
  });
  pen.stroke(FLUKES.slice(1, -1), 4.5 * ink, INK, 1, true);
}

/** Lines that follow the belly's curve behind the navel, shading the underside. */
function bellyLines(pen: Pen, ink: number): void {
  for (let r = 1; r <= 9; r++) {
    const pts: Pt[] = [];
    for (let x = -20 - pen.rng() * 40; x >= -1150 + r * 10; x -= 26) {
      const depth = bottomAt(x) - topAt(x);
      pts.push({ x, y: bottomAt(x) - r * 7 * ink * (depth / 300) });
    }
    pen.hair(pts, 1.1 * ink, INK, 0.5 * (1 - r / 11));
  }
}

/** The flat top of the rostrum catching the light, the edge where it turns down into the side, the hair follicles round the tip. */
function rostrum(pen: Pen, ink: number): void {
  const along = TOP.filter((p) => p.x > 1090 && p.x < 1488);
  const edge = along.map((p) => ({ x: p.x, y: p.y + 6 + 9 * smooth(1488, 1090, p.x) }));
  pen.hair(along.map((p) => ({ x: p.x, y: p.y + 3 })), 4 * ink, LIGHT, 0.3);
  pen.hair(edge, 1.4 * ink, INK, 0.5);
  pen.hair(edge.map((p) => ({ x: p.x, y: p.y + 3 })), 1.6 * ink, LIGHT, 0.18);
  // Short strokes down the side of the snout, turning it away from the light.
  for (let x = 1460; x > 1000; x -= (9 + pen.rng() * 14) * ink) {
    const y = edgeAt(edge, x) + 2 + pen.rng() * 3;
    const len = (0.25 + pen.rng() * 0.3) * (edgeAt(UPPER_LIP, x) - y);
    pen.hair([{ x, y }, { x: x - 2 - len * 0.3, y: y + len }], (0.6 + pen.rng() * 0.5) * ink, INK, 0.12 + pen.rng() * 0.14);
  }
  for (let i = 0; i < 11; i++) {
    const x = 1490 - i * 13 - pen.rng() * 6;
    const y = edgeAt(edge, x) + 6 + pen.rng() * Math.max(2, edgeAt(UPPER_LIP, x) - edgeAt(edge, x) - 12);
    pen.dot(x, y + 0.8, 2.4, '#1b2633', 0.45);
    pen.dot(x - 0.5, y - 0.5, 1.6, '#c9d6de', 0.7);
  }
  // The lip, a pale line just above the mouth.
  pen.hair(UPPER_LIP.slice(1, -3).map((p) => ({ x: p.x, y: p.y - 5 })), 2.4 * ink, '#b6c6d0', 0.35);
}

/** The splashguard: a fleshy ridge raised in front of the blowholes; the blowhole slit behind it. */
function splashguard(pen: Pen, ink: number): void {
  const ridge = TOP.filter((p) => p.x > 1000 && p.x < 1080);
  pen.hair(ridge.map((p) => ({ x: p.x - 2, y: p.y + 9 })), 1.3 * ink, INK, 0.45);
  pen.hair(ridge.filter((p) => p.x > 1022).map((p) => ({ x: p.x, y: p.y + 3 })), 3 * ink, LIGHT, 0.4);
  // The blowhole: a dark slit in the dip behind the ridge, its rim catching the light.
  const slit = curve([{ x: 1012, y: -76 }, { x: 1002, y: -68 }, { x: 990, y: -71 }, { x: 976, y: -79 }], 4);
  pen.fill([...slit, ...[...slit].reverse().map((p) => ({ x: p.x + 1, y: p.y - 5 }))], '#090d14', 0.9);
  pen.hair(slit, 1.6 * ink, INK, 0.9);
  pen.hair(slit.map((p) => ({ x: p.x, y: p.y + 4 })), 1.2 * ink, LIGHT, 0.35);
}

function drawEye(pen: Pen, ink: number): void {
  const { x, y, r } = EYE;
  // Folds of skin round a small eye, just above and behind the corner of the mouth.
  for (let k = 0; k < 3; k++) {
    const s = 1.7 + k * 0.6;
    pen.hair(curve([{ x: x - r * s, y: y + r * 0.3 }, { x: x - r * 0.1, y: y - r * s * 0.8 }, { x: x + r * s, y: y }], 6), 1.2 * ink, INK, 0.5 - k * 0.12);
    pen.hair(curve([{ x: x - r * s * 0.9, y: y + r * 0.6 }, { x, y: y + r * s * 0.7 }, { x: x + r * s * 0.8, y: y + r * 0.4 }], 6), 1 * ink, INK, 0.36 - k * 0.1);
  }
  const lid = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 13) * Math.PI * 2;
    return { x: x + Math.cos(a) * r * 1.2, y: y + Math.sin(a) * r * 0.75 };
  });
  pen.fill(lid, '#1a1412', 1);
  pen.dot(x + r * 0.15, y, r * 0.55, '#05040a', 1);
  pen.dot(x + r * 0.45, y - r * 0.3, r * 0.2, '#f2eee4', 0.85);
  pen.stroke(lid, 2.4 * ink, INK, 1, false);
  pen.stroke(curve([{ x: x - r * 1.6, y: y - r * 0.2 }, { x, y: y - r * 1.3 }, { x: x + r * 1.5, y: y - r * 0.3 }], 5), 2.6 * ink, INK, 1, false);
  pen.hair(curve([{ x: x - r * 1.3, y: y - r * 1.0 }, { x, y: y - r * 1.9 }, { x: x + r * 1.2, y: y - r * 1.1 }], 5), 1.6 * ink, LIGHT, 0.3);
}

function drawDorsal(pen: Pen, ink: number): void {
  washOf(pen, DORSAL, 2);
  shade(pen.ctx, DORSAL, -150, -95, [[0, `rgba(${LIGHT_RGB},0.25)`], [1, `rgba(${SHADOW_RGB},0.25)`]]);
  pen.stroke(DORSAL.slice(1, -1), 4 * ink, INK, 1, true);
}

function paintBody(ctx: CanvasRenderingContext2D, seed: number, ink: number): void {
  const pen = new Pen(ctx, seed, WOBBLE);
  paintFlukes(pen, ink);
  washOf(pen, BODY, 6);
  pen.clipped(BODY, () => {
    for (const b of BODY_MOTTLE) paintBlotch(ctx, b);
    shade(ctx, BODY, SHADE_Y[0], SHADE_Y[1], SHADE);
    // The long head turns darker towards the snout, away from the light on the back.
    const g = ctx.createLinearGradient(1000, 0, 1500, 0);
    g.addColorStop(0, `rgba(${SHADOW_RGB},0)`);
    g.addColorStop(1, `rgba(${SHADOW_RGB},0.22)`);
    ctx.fillStyle = g;
    ctx.fillRect(1000, -120, 520, 200);
    bellyLines(pen, ink);
    pen.stipple(BODY, 3600, (_x, y) => 0.04 + 0.5 * clamp01((y + 30) / 200), 1.1 * Math.min(ink, 2), INK);
    // The light catching the top of the back.
    for (let k = 1; k <= 3; k++) {
      pen.hair(TOP.filter((p) => p.x > -1000 && p.x < 960).map((p) => ({ x: p.x, y: p.y + 6 + k * 8 * ink })), (3.2 - k * 0.7) * ink, LIGHT, 0.3 - k * 0.07);
    }
    rostrum(pen, ink);
  });
  pen.stroke(TOP, 5.5 * ink, INK, 1, true);
  pen.stroke(BELLY_AFT, 5 * ink, INK, 1, true);
  pen.stroke(UPPER_LIP, 4 * ink, INK, 1, true);
  drawDorsal(pen, ink);
  splashguard(pen, ink);
  drawEye(pen, ink);
}

// ---------------------------------------------------------------- baking

interface Box { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number }
interface Sheet { readonly canvas: HTMLCanvasElement; readonly res: number; readonly box: Box }

const BODY_BOX: Box = { x0: -1530, x1: 1530, y0: -240, y1: 240 };
const HEAD_BOX: Box = { x0: 640, x1: 1530, y0: -150, y1: 125 };
/** Sprite px per local unit for the body's sizes, and the head's. */
const BODY_RES = [0.12, 0.3, 0.6, 1] as const;
const HEAD_RES = 2.4;
/** Ink is thickened on the small sizes so the outline still reads as a pen line. */
const inkFor = (res: number): number => Math.max(1, 0.6 / res);
const seedOf = (f: number): number => 5501 + f * 977;

function bake(box: Box, res: number, seed: number, ink: number): Sheet {
  const { canvas, ctx } = makeCanvas(Math.ceil((box.x1 - box.x0) * res), Math.ceil((box.y1 - box.y0) * res));
  ctx.scale(res, res);
  ctx.translate(-box.x0, -box.y0);
  paintBody(ctx, seed, ink);
  return { canvas, res, box };
}

/** The body's sheets [size][boil frame], and the head's [boil frame]. */
interface Sprites { readonly body: readonly (readonly Sheet[])[]; readonly head: readonly Sheet[] }
let sprites: Sprites | null = null;

function spritesNow(): Sprites {
  if (sprites) return sprites;
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => f);
  sprites = {
    body: BODY_RES.map((res) => frames.map((f) => bake(BODY_BOX, res, seedOf(f), inkFor(res)))),
    head: frames.map((f) => bake(HEAD_BOX, HEAD_RES, seedOf(f), inkFor(1))),
  };
  return sprites;
}

export async function prepare(): Promise<void> {
  spritesNow();
}

// ---------------------------------------------------------------- the body on screen

/** Where the tail starts to bend, and how far the flukes swing (local units). */
const BEND_FROM = -150;
const WAG = 46;
const TAIL_RATE = 1.6;
const flexAt = (x: number, phase: number): number => {
  const b = clamp01((BEND_FROM - x) / (BEND_FROM - FLUKE_TIP_X));
  return WAG * b * b * Math.sin(phase - 2.2 * b) - WAG * 0.25 * b * Math.sin(phase);
};

/** The front in one piece; the back column by column, each lifted by the flex. */
function drawSheet(ctx: CanvasRenderingContext2D, sheet: Sheet, phase: number): void {
  const { canvas: c, res, box } = sheet;
  const k = 1 / res;
  const split = Math.max(0, Math.min(c.width, Math.round((BEND_FROM - box.x0) * res)));
  ctx.drawImage(c, split, 0, c.width - split, c.height, box.x0 + split * k, box.y0, (c.width - split) * k, c.height * k);
  const step = 4;
  for (let sx = 0; sx < split; sx += step) {
    const w = Math.min(step, split - sx);
    const dy = flexAt(box.x0 + (sx + w / 2) * k, phase);
    ctx.drawImage(c, sx, 0, w, c.height, box.x0 + sx * k, box.y0 + dy, (w + 0.75) * k, c.height * k);
  }
}

// ---------------------------------------------------------------- the jaw, the throat, the mouth (live: they change shape)

const rotJaw = (p: Pt, a: number): Pt => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = p.x - PIVOT.x;
  const dy = p.y - PIVOT.y;
  return { x: PIVOT.x + dx * c - dy * s, y: PIVOT.y + dx * s + dy * c };
};

const POUCH_SAMPLES = 64;
const PLEATS = 22;
const SHUT_CHORD = { from: THROAT_SHUT[0]!, len: Math.hypot(NAVEL.x - THROAT_SHUT[0]!.x, NAVEL.y - THROAT_SHUT[0]!.y) };
/** The shut throat as offsets from its chord (chin to navel): where along it (0..1) and how far out. */
const SHUT_PROFILE: readonly { readonly t: number; readonly off: number }[] = THROAT_SHUT.map((p) => {
  const d = { x: (NAVEL.x - SHUT_CHORD.from.x) / SHUT_CHORD.len, y: (NAVEL.y - SHUT_CHORD.from.y) / SHUT_CHORD.len };
  const rel = { x: p.x - SHUT_CHORD.from.x, y: p.y - SHUT_CHORD.from.y };
  return { t: (rel.x * d.x + rel.y * d.y) / SHUT_CHORD.len, off: rel.x * d.y - rel.y * d.x };
});
/** How far the full pouch bulges past its chord: a share of the chord's length. */
const BALLOON = { base: 60, perLength: 0.3 } as const;

/** The throat: `inner` runs from the chin along the jaw's underside and the root of the pleats to the navel, `outer` chin to navel round the outside. */
interface Pouch { readonly inner: readonly Pt[]; readonly outer: readonly Pt[]; readonly shape: readonly Pt[] }

function pouchOf(a: number, throat: number): Pouch {
  const under = JAW_UNDER.map((p) => rotJaw(p, a));
  const chin = under[0]!;
  const chord = { x: NAVEL.x - chin.x, y: NAVEL.y - chin.y };
  const len = Math.hypot(chord.x, chord.y);
  const n = { x: chord.y / len, y: -chord.x / len };
  const ratio = len / SHUT_CHORD.len;
  // Water rushes in as the jaw drops, so an open mouth always fills the throat a little.
  const fill = Math.max(throat, 0.3 * (a / GAPE_MAX));
  const height = fill * (BALLOON.base + BALLOON.perLength * len);
  const outer = resample(
    SHUT_PROFILE.map(({ t, off }) => {
      // Fullest a third of the way back, easing into the belly at the navel.
      const u = clamp01(t);
      const bulge = off * ratio + height * Math.sin(Math.PI * u ** 0.72) ** (0.9 + 1.3 * u);
      return { x: chin.x + chord.x * t + n.x * bulge, y: chin.y + chord.y * t + n.y * bulge };
    }),
    POUCH_SAMPLES,
  );
  const inner = resample([...under, ...ROOT], POUCH_SAMPLES);
  return { inner, outer, shape: [...inner, ...[...outer].reverse()] };
}

/** A polyline averaged over `half` points either side (its ends kept): rounds the corner where the jaw meets the flank. */
function softened(line: readonly Pt[], half: number): Pt[] {
  if (half < 1) return [...line];
  return line.map((p, i) => {
    if (i === 0 || i === line.length - 1) return p;
    const h = Math.min(half, i, line.length - 1 - i);
    let x = 0;
    let y = 0;
    for (let j = i - h; j <= i + h; j++) {
      x += line[j]!.x;
      y += line[j]!.y;
    }
    return { x: x / (2 * h + 1), y: y / (2 * h + 1) };
  });
}

/** A groove k of the way across the throat: the further out, the more it rounds the jaw's corner. */
const pleatAt = (p: Pouch, k: number): Pt[] => {
  const inner = softened(p.inner, Math.round(2 + k * 12));
  return inner.map((q, i) => lerpPt(q, p.outer[i]!, k));
};

/** The grooves: spaced a little unevenly, each its own weight, a few merging part-way along. */
const GROOVES: readonly { readonly k: number; readonly w: number; readonly from: number; readonly to: number }[] = (() => {
  const rng = createRng(4471);
  return Array.from({ length: PLEATS - 1 }, (_, i) => {
    const short = rng() < 0.22;
    return {
      k: (i + 1 + (rng() - 0.5) * 0.5) / PLEATS,
      w: 0.7 + rng() * 0.6,
      from: short && rng() < 0.5 ? 0.15 + rng() * 0.3 : 0,
      to: short ? 0.55 + rng() * 0.35 : 1,
    };
  });
})();

function drawPouch(ctx: CanvasRenderingContext2D, pen: Pen, a: number, throat: number, ink: number): void {
  const pouch = pouchOf(a, throat);
  const { shape } = pouch;
  const stretch = clamp01(throat * 0.9 + (a / GAPE_MAX) * 0.35);
  washOf(pen, shape);
  pen.clipped(shape, () => {
    for (const b of THROAT_MOTTLE) {
      const i = Math.round(b.x * (POUCH_SAMPLES - 1));
      const p = lerpPt(pouch.inner[i]!, pouch.outer[i]!, b.k);
      const q = pouch.inner[Math.min(POUCH_SAMPLES - 1, i + 1)]!;
      const r = pouch.inner[Math.max(0, i - 1)]!;
      paintBlotch(ctx, b, p, 1 + stretch * 0.8, Math.atan2(q.y - r.y, q.x - r.x));
    }
    shade(ctx, shape, SHADE_Y[0], SHADE_Y[1], SHADE);
    // Stretched, the skin between the grooves pales.
    if (stretch > 0.02) {
      for (let i = 0; i < PLEATS; i += 1) {
        const a0 = pleatAt(pouch, (i + 0.25) / PLEATS);
        const a1 = pleatAt(pouch, (i + 0.7) / PLEATS);
        pen.fill([...a0, ...a1.reverse()], STRETCH, 0.16 * stretch);
      }
    }
    // The round of the balloon: lit along its top, the core shadow towards its outer edge.
    if (throat > 0.02) {
      for (let r = 1; r <= 8; r++) pen.hair(pleatAt(pouch, 1 - r * 0.012), (1.2 + throat) * ink, INK, 0.4 * throat * (1 - r / 10));
      const mid = pouch.outer[Math.round(POUCH_SAMPLES * 0.4)]!;
      const top = pouch.inner[Math.round(POUCH_SAMPLES * 0.4)]!;
      const g = ctx.createLinearGradient(top.x, top.y, mid.x, mid.y);
      g.addColorStop(0, `rgba(${SHADOW_RGB},0)`);
      g.addColorStop(0.6, `rgba(${SHADOW_RGB},${(0.12 * throat).toFixed(3)})`);
      g.addColorStop(1, `rgba(${SHADOW_RGB},${(0.38 * throat).toFixed(3)})`);
      ctx.fillStyle = g;
      shapePath(ctx, shape);
      ctx.fill();
    }
    // The grooves, chin to navel, fanning apart as the throat fills.
    GROOVES.forEach((g, i) => {
      const pleat = pleatAt(pouch, g.k);
      const part = pleat.slice(Math.floor(g.from * (pleat.length - 1)), Math.ceil(g.to * (pleat.length - 1)) + 1);
      pen.hair(part, (1.1 + 1.3 * stretch) * g.w * ink, GROOVE, (0.38 + 0.4 * stretch) * (0.75 + 0.25 * g.w));
      if (stretch > 0.2 && i % 2 === 0) pen.hair(pleatAt(pouch, g.k + 0.35 / PLEATS).slice(2, -2), 1.4 * ink, LIGHT, 0.22 * stretch);
    });
    pen.stipple(shape, Math.round(300 + 500 * throat), (x, y) => {
      const d = Math.hypot(x - NAVEL.x, y - NAVEL.y);
      return 0.15 + 0.35 * clamp01(d / 900);
    }, 1.1 * ink, INK);
  });
  pen.hair(ROOT, 1.2 * ink, INK, 0.35);
  pen.stroke(pouch.outer, 5 * ink, INK, 1, true);
}

function drawJaw(ctx: CanvasRenderingContext2D, pen: Pen, a: number, ink: number): void {
  ctx.save();
  ctx.translate(PIVOT.x, PIVOT.y);
  ctx.rotate(a);
  ctx.translate(-PIVOT.x, -PIVOT.y);
  washOf(pen, JAW_SHAPE, 3);
  pen.clipped(JAW_SHAPE, () => {
    for (const b of JAW_MOTTLE) paintBlotch(ctx, b);
    shade(ctx, JAW_SHAPE, SHADE_Y[0], SHADE_Y[1], SHADE);
    for (let k = 1; k <= 3; k++) pen.hair(JAW_UNDER.slice(1, -1).map((p) => ({ x: p.x, y: p.y - k * 6 * ink })), 1 * ink, INK, 0.4 - k * 0.09);
    pen.stipple(JAW_SHAPE, 260, (_x, y) => clamp01((y - 30) / 60) * 0.6 + 0.05, 1.1 * ink, INK);
  });
  // The pale lip, the knobbly chin with its hair follicles.
  pen.hair(LOWER_LIP.slice(5).map((p) => ({ x: p.x, y: p.y + 5 })), 2.6 * ink, '#b9c8d1', 0.45);
  for (const p of [{ x: 1500, y: 26 }, { x: 1488, y: 36 }, { x: 1470, y: 24 }, { x: 1452, y: 34 }, { x: 1432, y: 26 }, { x: 1410, y: 36 }]) {
    pen.dot(p.x, p.y + 0.8, 2.4, '#1b2633', 0.45);
    pen.dot(p.x - 0.5, p.y - 0.5, 1.6, '#c9d6de', 0.7);
  }
  // Inked along the lip and round the chin; the underside only lightly, where it runs into the throat.
  pen.stroke([...LOWER_LIP.slice(1), ...CHIN], 4.5 * ink, INK, 1, true);
  pen.hair(JAW_UNDER.slice(0, -2), 2 * ink, INK, 0.7);
  ctx.restore();
}

/** The open mouth: the upper lip, then the dropped lower lip; the open front between their tips is the water. */
function cavityOf(a: number): Pt[] {
  return [...UPPER_LIP, ...LOWER_LIP.map((p) => rotJaw(p, a))];
}

/** Black baleen plates hanging along the whole upper jaw, longest at the back, their tips frayed into bristles. */
function drawBaleen(pen: Pen, ink: number): void {
  const lip = resample(UPPER_LIP, 104);
  const plates = lip.slice(4, -2).map((root, j, all) => {
    const u = (j + 4) / (lip.length - 1);
    const next = all[Math.min(all.length - 1, j + 1)]!;
    const prev = all[Math.max(0, j - 1)]!;
    const tx = prev.x - next.x;
    const ty = prev.y - next.y;
    const tl = Math.hypot(tx, ty) || 1;
    // Down from the lip, leaning back a little.
    const down = { x: -ty / tl, y: tx / tl };
    const lean = 0.28;
    const dir = { x: down.x * Math.cos(lean) - down.y * Math.sin(lean), y: down.x * Math.sin(lean) + down.y * Math.cos(lean) };
    const len = 16 + 92 * smooth(0.02, 0.8, u) * (1 - 0.3 * smooth(0.88, 1, u));
    return { root, tip: { x: root.x + dir.x * len, y: root.y + dir.y * len }, len };
  });
  pen.fill([...plates.map((p) => p.root), ...[...plates].reverse().map((p) => p.tip)], BALEEN, 0.96);
  plates.forEach((p) => {
    // A plate's edge catching the light, here and there.
    if (pen.rng() < 0.6) pen.hair([lerpPt(p.root, p.tip, 0.05), lerpPt(p.root, p.tip, 0.6 + pen.rng() * 0.3)], (0.6 + pen.rng() * 0.9) * ink, BALEEN_EDGE, 0.3 + pen.rng() * 0.35);
    // The frayed inner edge: a mat of fine bristles, combed down and back.
    const d = { x: (p.tip.x - p.root.x) / p.len, y: (p.tip.y - p.root.y) / p.len };
    for (let b = 0; b < 4; b++) {
      const fan = (pen.rng() - 0.35) * 0.7;
      const l = 5 + p.len * (0.08 + pen.rng() * 0.14);
      const start = lerpPt(p.root, p.tip, 0.7 + pen.rng() * 0.25);
      const end = { x: start.x + (d.x * Math.cos(fan) - d.y * Math.sin(fan)) * l, y: start.y + (d.x * Math.sin(fan) + d.y * Math.cos(fan)) * l };
      pen.hair([start, end], (0.5 + pen.rng() * 0.5) * ink, FRINGE, 0.3 + pen.rng() * 0.35);
    }
  });
  // The gum along the lip, over the plates' roots.
  pen.hair(lip.slice(3, -1).map((p) => ({ x: p.x, y: p.y + 3 })), 6 * ink, GUM, 0.85);
}

/** The far lower jaw, seen through the open mouth a little ahead of the near one: dark, in the shadow of the mouth. */
const FAR_JAW = 0.94;

/** The tongue: a huge soft mound on the floor of the mouth, lying along the dropped jaw from the corner of the mouth (local units, jaw shut). */
const TONGUE_BASE = curve([{ x: 905, y: 70 }, { x: 1000, y: 40 }, { x: 1120, y: 24 }, { x: 1230, y: 20 }], 10);
const TONGUE_TOP = curve([{ x: 1230, y: 20 }, { x: 1206, y: -22 }, { x: 1130, y: -58 }, { x: 1020, y: -62 }, { x: 940, y: -30 }, { x: 905, y: 70 }], 10);

/** The tongue's outline at jaw angle `a`, turned down with the jaw (local units). */
export function tongueOf(a: number): Pt[] {
  return [...TONGUE_BASE, ...TONGUE_TOP.slice(1)].map((p) => rotJaw(p, a * 0.97));
}

function drawTongue(ctx: CanvasRenderingContext2D, pen: Pen, a: number, glow: number, ink: number): void {
  const shape = tongueOf(a);
  const top = rotJaw({ x: 1080, y: -60 }, a);
  const base = rotJaw({ x: 1080, y: 30 }, a);
  pen.fill(shape, '#5e3440', 0.92);
  const g = ctx.createLinearGradient(top.x, top.y, base.x, base.y);
  g.addColorStop(0, `rgba(206,132,140,${(0.3 + 0.5 * glow).toFixed(3)})`);
  g.addColorStop(0.5, `rgba(150,78,92,${(0.2 + 0.35 * glow).toFixed(3)})`);
  g.addColorStop(1, 'rgba(40,10,20,0.4)');
  ctx.save();
  shapePath(ctx, shape);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  // The groove down its middle and a wet shine along the top.
  pen.hair(curve([{ x: 940, y: 30 }, { x: 1040, y: 4 }, { x: 1160, y: 4 }], 6).map((p) => rotJaw(p, a * 0.97)), 1.6 * ink, '#3a1520', 0.55);
  pen.hair(curve([{ x: 970, y: -40 }, { x: 1060, y: -52 }, { x: 1160, y: -38 }], 6).map((p) => rotJaw(p, a * 0.97)), (3 + 3 * glow) * ink, '#f6d6da', 0.25 + 0.5 * glow);
  pen.stroke(TONGUE_TOP.slice(0, -1).map((p) => rotJaw(p, a * 0.97)), 2.4 * ink, INK, 0.7, false);
}

function drawCavity(ctx: CanvasRenderingContext2D, pen: Pen, a: number, ink: number, tongue = 0): void {
  const cavity = cavityOf(a);
  const upperTip = UPPER_LIP[0]!;
  const jawTip = rotJaw(LOWER_LIP[LOWER_LIP.length - 1]!, a);
  // Deep in the throat it's black; towards the open front it thins to the water seen straight through the mouth.
  const front = lerpPt(upperTip, jawTip, 0.5);
  const across = ctx.createLinearGradient(PIVOT.x, PIVOT.y, front.x, front.y);
  across.addColorStop(0, 'rgba(10,4,8,1)');
  across.addColorStop(0.6, 'rgba(22,10,20,0.95)');
  across.addColorStop(1, 'rgba(30,16,34,0.35)');
  ctx.save();
  shapePath(ctx, cavity);
  ctx.fillStyle = across;
  ctx.fill();
  ctx.restore();
  const far = JAW_SHAPE.map((p) => rotJaw(p, a * FAR_JAW));
  pen.clipped(cavity, () => {
    // The floor of the mouth between the two jaws: the pouch's lining, in soft folds.
    const floor = [...LOWER_LIP.map((p) => rotJaw(p, a)), ...LOWER_LIP.map((p) => rotJaw(p, a * FAR_JAW)).reverse()];
    pen.fill(floor, LINING, 0.7);
    for (let i = 1; i <= 3; i++) pen.hair(LOWER_LIP.slice(2).map((p) => rotJaw(p, a * (1 - i * 0.025))), 1.2 * ink, '#3a1e2a', 0.45);
    drawTongue(ctx, pen, a, tongue, ink);
  });
  pen.clipped(cavity, () => {
    pen.fill(far, '#24364c', 0.55);
    pen.hair(LOWER_LIP.slice(1).map((p) => rotJaw(p, a * FAR_JAW)), 2 * ink, '#6d8299', 0.35);
    drawBaleen(pen, ink);
  });
  pen.stroke(UPPER_LIP, 4 * ink, INK, 1, false);
}

/** The near flipper: small and slim, sweeping back and down from behind the jaw, pale along its trailing edge. */
function drawFin(ctx: CanvasRenderingContext2D, pen: Pen, phase: number, ink: number): void {
  const ang = Math.PI - 0.5 + 0.06 * Math.sin(phase * 0.5);
  const dir = { x: Math.cos(ang), y: Math.sin(ang) };
  const nrm = { x: -dir.y, y: dir.x };
  const len = 330;
  const at = (u: number, side: number): Pt => {
    const w = (u < 0.15 ? 26 + 40 * u : 32 * (1 - u) ** 0.75 + 2) * side;
    const bow = 10 * Math.sin(Math.PI * u);
    return { x: FIN_ROOT.x + dir.x * len * u + nrm.x * (w + bow), y: FIN_ROOT.y + dir.y * len * u + nrm.y * (w + bow) };
  };
  const lead = Array.from({ length: 23 }, (_, i) => at(i / 22, -1));
  const trail = Array.from({ length: 23 }, (_, i) => at(1 - i / 22, 1));
  // The root, rounded where the flipper turns out of the flank.
  const root = Array.from({ length: 7 }, (_, i) => {
    const s = Math.PI / 2 + (Math.PI * (i + 1)) / 8;
    return { x: FIN_ROOT.x - dir.x * Math.cos(s) * -16 + nrm.x * Math.sin(s) * -26, y: FIN_ROOT.y - dir.y * Math.cos(s) * -16 + nrm.y * Math.sin(s) * -26 };
  });
  const shape = [...lead, ...trail, ...root];
  washOf(pen, shape);
  const g = ctx.createLinearGradient(FIN_ROOT.x, FIN_ROOT.y, FIN_ROOT.x + dir.x * len, FIN_ROOT.y + dir.y * len);
  pen.clipped(shape, () => {
    for (const b of JAW_MOTTLE.slice(0, 8)) paintBlotch(ctx, b, at(((b.x - 940) / 540) * 0.9, (b.y % 2) - 0.5), 0.8, ang);
    g.addColorStop(0, `rgba(${SHADOW_RGB},0.45)`);
    g.addColorStop(0.25, `rgba(${SHADOW_RGB},0.12)`);
    g.addColorStop(1, `rgba(${SHADOW_RGB},0.3)`);
    ctx.fillStyle = g;
    shapePath(ctx, shape);
    ctx.fill();
    for (let k = 1; k <= 4; k++) pen.hair(Array.from({ length: 12 }, (_, i) => lerpPt(at(i / 11 * 0.9, -1), at(i / 11 * 0.9, 1), 0.3 + k * 0.14)), 0.9 * ink, INK, 0.3);
    pen.hair(trail.slice(2, -3).map((p) => ({ x: p.x - nrm.x * 4, y: p.y - nrm.y * 4 })), 4 * ink, '#dfe8ec', 0.55);
  });
  pen.stroke([...lead.slice(1), ...trail], 3.6 * ink, INK, 1, true);
  pen.hair(root, 1.6 * ink, INK, 0.5);
}

// ---------------------------------------------------------------- placing it

/** A placement worked out: the boil frame, the ink weight, device px per local unit, the jaw's angle, the throat, the tail's phase. */
interface Placed { readonly boil: number; readonly ink: number; readonly scale: number; readonly gapeAngle: number; readonly throat: number; readonly phase: number }

function enter(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, t: number, pose: BlueWhalePose, flip: boolean): Placed {
  const s = length / LOCAL_LEN;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(s, flip ? -s : s);
  ctx.translate(-CENTRE_X, 0);
  const m = ctx.getTransform();
  const scale = Math.hypot(m.a, m.b);
  const res = BODY_RES.find((r) => r >= scale) ?? BODY_RES[BODY_RES.length - 1]!;
  return {
    boil: Math.floor(Math.max(0, t) * BOIL_FPS) % BOIL_FRAMES,
    ink: inkFor(res),
    scale,
    gapeAngle: clamp01(pose.gape ?? 0) * GAPE_MAX,
    throat: clamp01(pose.throat ?? 0),
    phase: pose.tail ?? t * TAIL_RATE,
  };
}

const livePen = (ctx: CanvasRenderingContext2D, part: number, boil: number): Pen => new Pen(ctx, 8100 + part * 131 + boil * 977, WOBBLE);

/** Snout at +x of the local frame: centre (x, y) in screen px, `length` = snout to fluke tip in screen px, `angle` radians, `flip` mirrors vertically, `t` seconds. */
export function drawBlueWhaleBack(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, t: number, pose: BlueWhalePose = {}, flip = false): void {
  const all = spritesNow();
  ctx.save();
  const p = enter(ctx, x, y, length, angle, t, pose, flip);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const size = BODY_RES.findIndex((r) => r >= p.scale);
  const sheets = all.body[size < 0 ? BODY_RES.length - 1 : size]!;
  drawSheet(ctx, sheets[p.boil]!, p.phase);
  if (size < 0) drawSheet(ctx, all.head[p.boil]!, p.phase);
  if (p.gapeAngle > 0.01) drawCavity(ctx, livePen(ctx, 1, p.boil), p.gapeAngle, p.ink, clamp01(pose.tongue ?? 0));
  ctx.restore();
}

/** The tongue again, over whatever is in the mouth (the orca nosing into it), at `alpha`, lit by `pose.tongue`. */
export function drawBlueWhaleTongue(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, t: number, pose: BlueWhalePose, alpha: number): void {
  if (alpha <= 0.01) return;
  ctx.save();
  const p = enter(ctx, x, y, length, angle, t, pose, false);
  ctx.globalAlpha = alpha;
  const pen = livePen(ctx, 5, p.boil);
  pen.clipped(cavityOf(p.gapeAngle), () => drawTongue(ctx, pen, p.gapeAngle, clamp01(pose.tongue ?? 0), p.ink));
  ctx.restore();
}

export function drawBlueWhaleFront(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, t: number, pose: BlueWhalePose = {}, flip = false): void {
  ctx.save();
  const p = enter(ctx, x, y, length, angle, t, pose, flip);
  drawPouch(ctx, livePen(ctx, 2, p.boil), p.gapeAngle, p.throat, p.ink);
  drawJaw(ctx, livePen(ctx, 3, p.boil), p.gapeAngle, p.ink);
  drawFin(ctx, livePen(ctx, 4, p.boil), p.phase, p.ink);
  ctx.restore();
}

export function drawBlueWhale(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, t: number, pose: BlueWhalePose = {}, flip = false): void {
  drawBlueWhaleBack(ctx, x, y, length, angle, t, pose, flip);
  drawBlueWhaleFront(ctx, x, y, length, angle, t, pose, flip);
}

/** Where the mouth opening is in screen px for the given placement and pose (so krill can be placed in it). */
export function blueWhaleMouth(x: number, y: number, length: number, angle: number, pose: BlueWhalePose = {}, flip = false): { x: number; y: number; radius: number } {
  const g = clamp01(pose.gape ?? 0);
  const upper = { x: 1500, y: 8 };
  const lower = rotJaw({ x: 1506, y: 14 }, g * GAPE_MAX);
  const mid = lerpPt(lerpPt(upper, lower, 0.5), PIVOT, 0.32 * g);
  const radius = 14 + 0.36 * Math.hypot(upper.x - lower.x, upper.y - lower.y);
  const s = length / LOCAL_LEN;
  const lx = (mid.x - CENTRE_X) * s;
  const ly = mid.y * s * (flip ? -1 : 1);
  return { x: x + lx * Math.cos(angle) - ly * Math.sin(angle), y: y + lx * Math.sin(angle) + ly * Math.cos(angle), radius: radius * s };
}


// ---------------------------------------------------------------- outlines, for drawing things in the mouth

/** The open mouth at `gape` (0 .. 1), local units. */
export const mouthOf = (gape: number): Pt[] => cavityOf(clamp01(gape) * GAPE_MAX);
/** The head and body the sprite covers (not the jaw or throat), local units. */
export const HEAD_OUTLINE: readonly Pt[] = BODY;
/** The corner of the mouth, where the jaw turns, and the upper lip's tip, local units. */
export const MOUTH_CORNER: Pt = PIVOT;
export const SNOUT_TIP: Pt = UPPER_LIP[0]!;
/** The lower lip's tip at `gape`, local units. */
export const jawTipOf = (gape: number): Pt => rotJaw(LOWER_LIP[LOWER_LIP.length - 1]!, clamp01(gape) * GAPE_MAX);
/** The tongue's middle at `gape`, local units. */
export const tongueMid = (gape: number): Pt => rotJaw({ x: 1070, y: 0 }, clamp01(gape) * GAPE_MAX * 0.97);

/** A local point on screen for a placement (as drawBlueWhale places it). */
export function whaleToScreen(p: Pt, x: number, y: number, length: number, angle: number, flip = false): Pt {
  const s = length / LOCAL_LEN;
  const lx = (p.x - CENTRE_X) * s;
  const ly = p.y * s * (flip ? -1 : 1);
  return { x: x + lx * Math.cos(angle) - ly * Math.sin(angle), y: y + lx * Math.sin(angle) + ly * Math.cos(angle) };
}
