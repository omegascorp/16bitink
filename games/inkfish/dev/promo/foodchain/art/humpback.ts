import { PAPER_FILL } from '../../../../src/art/fish/kit';
import { INK, makeCanvas, Pen, type Pt } from '../../../../src/art/pen';
import { BOIL_FPS, BOIL_FRAMES } from '../../../../src/art/textures';
import { createRng, type Rng } from '../../../../src/logic/rng';
import { resample, spline } from '../../kraken/whale';
import type { KitEntry } from '../kit';

/**
 * The humpback whale in the game's pen and ink, painted rather than doodled
 * (the same method as blueWhale.ts, greatWhite.ts): paper under a slate wash
 * laid on a little off the outline, dark across the back and paling down the
 * flank to a white pleated belly, lit from above. Stocky for a rorqual (about
 * 4.7 times as long as it is deep), a broad rounded head studded with knobbly
 * tubercles (each with its hair), a mouth that runs back past the eye, a small
 * dorsal fin on a hump, very long pectoral fins with scalloped leading edges,
 * broad flukes with a serrated trailing edge, and throat pleats that stretch
 * into a pouch when it lunges.
 *
 * API (all in screen px; the local frame has the snout along +x, belly +y):
 *   await prepare()                                  bake the sprites once (also done lazily)
 *   drawHumpbackBack(ctx, x, y, length, angle, t, pose, flip)   body + flukes, then the dark inside of the open mouth with baleen
 *   drawHumpbackFront(ctx, x, y, length, angle, t, pose, flip)  pleated throat, lower jaw, the near pectoral fin
 *   drawHumpback(...)                                both passes in one (put things between the two passes to sit inside the mouth)
 *   humpbackMouth(x, y, length, angle, pose, flip)   centre and radius of the mouth opening in screen px
 * (x, y) is the middle of the whale, `length` snout to fluke tips in screen px,
 * `angle` radians (0 side-on heading right; -PI/2 rising head-up; PI heading left,
 * use flip to keep it right way up), `t` seconds (line boil, tail phase).
 * pose: { gape 0..1 (jaw drops up to ~70 degrees), throat 0..1 (pleats ballooned
 * into a pouch of water), tail (fluke phase, radians), fin (pectoral swing, radians) }.
 *
 * Baked once per line-boil frame at four sizes plus the head alone at 2.4 px per
 * local unit; the throat, jaw, mouth and pectoral fin are inked live, crisp at any size.
 */

export interface HumpbackPose {
  /** 0 shut .. 1 the lower jaw dropped GAPE_MAX radians. */
  readonly gape?: number;
  /** 0 the pleated throat flat .. 1 ballooned into a huge pouch of water. */
  readonly throat?: number;
  /** The fluke beat's phase, radians (default: from t). */
  readonly tail?: number;
  /** The far pectoral fin's swing (drawn behind the body; leave out for none). */
  readonly farFin?: number;
  /** Extra swing of the pectoral fin, radians (+ swings it back, - forward). */
  readonly fin?: number;
  /** Both pectoral fins' length as a share of full (default 1): shorter reads as turned away from the camera. */
  readonly finScale?: number;
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

/** The top line, from the snout tip over the broad head, the blowholes, up the back to the dorsal hump, then down to the tail stock. */
const TOP = curve([
  { x: 1200, y: 6 }, { x: 1196, y: -8 }, { x: 1165, y: -22 }, { x: 1100, y: -38 }, { x: 1010, y: -58 }, { x: 930, y: -80 },
  { x: 880, y: -94 }, { x: 850, y: -108 }, { x: 815, y: -112 }, { x: 780, y: -104 }, { x: 740, y: -112 }, { x: 640, y: -140 },
  { x: 500, y: -178 }, { x: 320, y: -214 }, { x: 120, y: -238 }, { x: -100, y: -250 }, { x: -280, y: -256 }, { x: -350, y: -272 }, { x: -430, y: -290 }, { x: -500, y: -284 },
  { x: -580, y: -250 }, { x: -720, y: -190 }, { x: -860, y: -142 }, { x: -980, y: -96 }, { x: -1070, y: -60 }, { x: -1140, y: -42 },
], 12);
/** The upper lip (the mouth line), snout tip back past the eye to the corner of the mouth. */
const UPPER_LIP = curve([
  { x: 1200, y: 6 }, { x: 1198, y: 16 }, { x: 1150, y: 22 }, { x: 1050, y: 30 }, { x: 950, y: 44 }, { x: 860, y: 66 }, { x: 790, y: 84 }, { x: 742, y: 96 },
]);
/** The navel, where the throat pleats end. */
const NAVEL: Pt = { x: -150, y: 240 };
/** Where the pleated skin starts on the flank: from behind the jaw to the navel. */
const ROOT = curve([{ x: 745, y: 130 }, { x: 600, y: 160 }, { x: 400, y: 198 }, { x: 200, y: 224 }, { x: 20, y: 238 }, NAVEL]);
/** The underside behind the navel, to the tail stock. */
const BELLY_AFT = curve([NAVEL, { x: -350, y: 232 }, { x: -550, y: 206 }, { x: -750, y: 160 }, { x: -900, y: 112 }, { x: -1020, y: 70 }, { x: -1100, y: 48 }, { x: -1140, y: 42 }]);
/** The throat shut: chin to navel. */
const THROAT_SHUT = curve([
  { x: 1202, y: 66 }, { x: 1120, y: 108 }, { x: 1000, y: 168 }, { x: 860, y: 214 }, { x: 700, y: 245 }, { x: 500, y: 262 },
  { x: 300, y: 267 }, { x: 100, y: 261 }, { x: -40, y: 252 }, NAVEL,
]);

/** The lower jaw, shut: its lip (just over the upper lip, so they overlap), the chin poking out past the snout, its underside. */
const LOWER_LIP = curve([
  { x: 742, y: 96 }, { x: 790, y: 80 }, { x: 860, y: 62 }, { x: 950, y: 40 }, { x: 1050, y: 26 }, { x: 1150, y: 20 }, { x: 1204, y: 18 },
]);
const CHIN: readonly Pt[] = [{ x: 1216, y: 26 }, { x: 1220, y: 40 }, { x: 1214, y: 56 }, { x: 1202, y: 66 }];
const JAW_UNDER = curve([{ x: 1202, y: 66 }, { x: 1130, y: 88 }, { x: 1030, y: 108 }, { x: 930, y: 122 }, { x: 840, y: 128 }, { x: 790, y: 130 }, { x: 745, y: 130 }]);
const JAW_SHAPE: readonly Pt[] = [...LOWER_LIP, ...CHIN, ...JAW_UNDER.slice(1)];
/** The jaw turns about here. */
const PIVOT: Pt = { x: 742, y: 98 };
/** How far the jaw drops at gape 1 (radians, about 70 degrees, a real lunge). */
export const GAPE_MAX = 1.22;

const DORSAL = curve([{ x: -400, y: -284 }, { x: -430, y: -304 }, { x: -452, y: -330 }, { x: -466, y: -346 }, { x: -478, y: -336 }, { x: -484, y: -310 }, { x: -520, y: -272 }], 8);
/** The flukes, seen a little from above: the upper lobe raised, the lower one dropped, a serrated trailing edge and a notch between. */
const serrate = (pts: readonly Pt[]): Pt[] => pts.map((p, i) => (i % 2 ? { x: p.x - 9, y: p.y } : p));
const FLUKES: readonly Pt[] = [
  ...curve([{ x: -1120, y: -40 }, { x: -1190, y: -100 }, { x: -1260, y: -190 }, { x: -1320, y: -270 }, { x: -1362, y: -304 }]),
  ...serrate(curve([{ x: -1362, y: -304 }, { x: -1352, y: -240 }, { x: -1330, y: -150 }, { x: -1310, y: -70 }, { x: -1296, y: 0 }], 22)).slice(1),
  ...serrate(curve([{ x: -1296, y: 0 }, { x: -1312, y: 70 }, { x: -1340, y: 160 }, { x: -1366, y: 250 }, { x: -1380, y: 300 }], 22)).slice(1),
  ...curve([{ x: -1380, y: 300 }, { x: -1330, y: 240 }, { x: -1250, y: 170 }, { x: -1180, y: 100 }, { x: -1120, y: 44 }]).slice(1),
];
const EYE = { x: 706, y: 62, r: 11 } as const;
const FIN_ROOT: Pt = { x: 480, y: 168 };

const CHIN_X = 1220;
const FLUKE_TIP_X = -1380;
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
const bottomAt = (x: number): number => (x < -150 ? edgeAt(BELLY_AFT, x) : x < 745 ? edgeAt(ROOT, x) : edgeAt(UPPER_LIP, x));

// ---------------------------------------------------------------- colours and the painted finish

const BLUE = '#141c27';
const PALE = '#aebcc7';
const WASH = 0.9;
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
const SHADE_Y: readonly [number, number] = [-260, 275];
const SHADE: readonly (readonly [number, string])[] = [
  [0, `rgba(${LIGHT_RGB},0.2)`], [0.2, `rgba(${LIGHT_RGB},0.05)`], [0.5, `rgba(${SHADOW_RGB},0.1)`], [0.8, `rgba(${SHADOW_RGB},0.5)`], [1, `rgba(${SHADOW_RGB},0.36)`],
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
function washOf(pen: Pen, shape: readonly Pt[], off = 0, colour = BLUE): void {
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    pen.ctx.translate(0, off);
    pen.fill(shape, colour, WASH);
    pen.ctx.translate(0, -off);
  });
}

// ---------------------------------------------------------------- the mottling

/** A soft, ragged blotch of pale or dark pigment: the dappled skin that names the humpback. */
interface Blotch { readonly x: number; readonly y: number; readonly rx: number; readonly ry: number; readonly rot: number; readonly light: boolean; readonly alpha: number; readonly wob: readonly number[] }

function blotchOf(rng: Rng, x: number, y: number, r: number, light: boolean): Blotch {
  return {
    x, y, light,
    rx: r * (1.4 + rng() * 1.6),
    ry: r * (0.5 + rng() * 0.4),
    rot: (rng() - 0.5) * 0.5,
    alpha: light ? 0.05 + rng() * 0.1 : 0.1 + rng() * 0.14,
    wob: Array.from({ length: 9 }, () => 0.65 + rng() * 0.7),
  };
}

/** Pale blotches on the darker back, darker spots on the paler flank; few on the plainer head. */
const BODY_MOTTLE: readonly Blotch[] = (() => {
  const rng = createRng(2718);
  const out: Blotch[] = [];
  while (out.length < 380) {
    const x = -1150 + rng() * 2350;
    const v = rng();
    const head = x > 740;
    if (head && rng() < 0.65) continue;
    const top = topAt(x) + 4;
    const y = top + (bottomAt(x) - top) * v;
    const r = (3 + rng() * rng() * 22) * (head ? 0.7 : 1) * (x < -800 ? 0.7 : 1);
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
    const x = 760 + rng() * 430;
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
    for (const b of BODY_MOTTLE.slice(0, 40)) paintBlotch(ctx, b, { x: -1160 - ((b.x + 1150) % 200), y: b.y * 1.5 }, 0.7);
  });
  shade(ctx, FLUKES, -310, 310, [[0, `rgba(${LIGHT_RGB},0.16)`], [0.5, `rgba(${SHADOW_RGB},0.12)`], [1, `rgba(${SHADOW_RGB},0.48)`]]);
  // Lines along each lobe, from the stock to the trailing edge.
  pen.clipped(FLUKES, () => {
    for (let k = 0; k < 16; k++) {
      const u = k / 15;
      for (const lobe of [-1, 1]) {
        const tip = lobe < 0 ? { x: -1362, y: -304 } : { x: -1380, y: 300 };
        const from = { x: -1130, y: lobe * 14 };
        const to = { x: -1300 + (tip.x + 1300) * u, y: lobe * 4 + (tip.y - lobe * 4) * u };
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
    for (let x = -170 - pen.rng() * 40; x >= -1060 + r * 10; x -= 26) {
      const depth = bottomAt(x) - topAt(x);
      pts.push({ x, y: bottomAt(x) - r * 7 * ink * (depth / 420) });
    }
    pen.hair(pts, 1.1 * ink, INK, 0.5 * (1 - r / 11));
  }
}

/** A knobbly tubercle: a raised bump with its one hair, shaded below, lit above. */
function tubercle(pen: Pen, x: number, y: number, r: number): void {
  const { ctx } = pen;
  // A rounded bump: its shadow thrown below, a lit dome, a pale glint, one hair.
  ctx.save();
  ctx.fillStyle = 'rgba(6,12,20,0.5)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.15, y + r * 0.75, r * 1.05, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
  g.addColorStop(0, '#9db0c1');
  g.addColorStop(0.45, '#49596b');
  g.addColorStop(1, '#16202c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(8,14,22,0.7)';
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.stroke();
  ctx.restore();
  pen.dot(x + r * 0.05, y + r * 0.1, Math.max(1, r * 0.14), '#05080d', 0.9);
}

/** The broad head: its top catching the light, the tubercles scattered along the rostrum, the lip, barnacles on the chin and snout. */
function rostrum(pen: Pen, ink: number): void {
  const along = TOP.filter((p) => p.x > 880 && p.x < 1190);
  pen.hair(along.map((p) => ({ x: p.x, y: p.y + 3 })), 4 * ink, LIGHT, 0.3);
  const edge = along.map((p) => ({ x: p.x, y: p.y + 8 + 14 * smooth(1190, 880, p.x) }));
  pen.hair(edge, 1.4 * ink, INK, 0.5);
  for (let x = 1170; x > 740; x -= (10 + pen.rng() * 14) * ink) {
    const y = edgeAt(UPPER_LIP, x) - 50 - pen.rng() * 60;
    const len = 18 + pen.rng() * 30;
    pen.hair([{ x, y }, { x: x - 2 - len * 0.3, y: y + len }], (0.6 + pen.rng() * 0.5) * ink, INK, 0.1 + pen.rng() * 0.12);
  }
  const rng = createRng(6201);
  for (let i = 0; i < 34; i++) {
    const x = 1185 - rng() * 400;
    const top = edgeAt(TOP, x);
    const y = top + 14 + rng() * Math.max(10, (edgeAt(UPPER_LIP, x) - top) * 0.6);
    tubercle(pen, x, y, 5.5 + rng() * 4.5);
  }
  for (const p of [{ x: 1120, y: -4 }, { x: 1060, y: 4 }, { x: 990, y: 12 }, { x: 930, y: 22 }]) {
    pen.dot(p.x, p.y + 2, 8, '#101a26', 0.4);
    pen.dot(p.x, p.y, 7.5, '#dcd5bf', 0.9);
    pen.dot(p.x - 2, p.y - 2, 3, '#fff9e6', 0.8);
  }
  pen.hair(UPPER_LIP.slice(1, -3).map((p) => ({ x: p.x, y: p.y - 5 })), 2.4 * ink, '#b6c6d0', 0.35);
}

/** The blowholes: a broad ridge with a pair of slits. */
function splashguard(pen: Pen, ink: number): void {
  const ridge = TOP.filter((p) => p.x > 760 && p.x < 880);
  pen.hair(ridge.map((p) => ({ x: p.x - 2, y: p.y + 9 })), 1.3 * ink, INK, 0.45);
  pen.hair(ridge.map((p) => ({ x: p.x, y: p.y + 3 })), 3 * ink, LIGHT, 0.4);
  const slit = curve([{ x: 838, y: -98 }, { x: 818, y: -94 }, { x: 796, y: -92 }, { x: 778, y: -94 }], 4);
  pen.fill([...slit, ...[...slit].reverse().map((p) => ({ x: p.x + 1, y: p.y - 5 }))], '#090d14', 0.9);
  pen.hair(slit, 1.6 * ink, INK, 0.9);
}

function drawEye(pen: Pen, ink: number): void {
  const { x, y, r } = EYE;
  for (let k = 0; k < 3; k++) {
    const s = 1.7 + k * 0.6;
    pen.hair(curve([{ x: x - r * s, y: y + r * 0.3 }, { x: x - r * 0.1, y: y - r * s * 0.8 }, { x: x + r * s, y: y }], 6), 1.2 * ink, INK, 0.5 - k * 0.12);
    pen.hair(curve([{ x: x - r * s * 0.9, y: y + r * 0.6 }, { x, y: y + r * s * 0.7 }, { x: x + r * s * 0.8, y: y + r * 0.4 }], 6), 1 * ink, INK, 0.36 - k * 0.1);
  }
  const lid = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 13) * Math.PI * 2;
    return { x: x + Math.cos(a) * r * 1.2, y: y + Math.sin(a) * r * 0.78 };
  });
  pen.fill(lid, '#2a1c14', 1);
  pen.dot(x + r * 0.15, y, r * 0.62, '#06050a', 1);
  pen.dot(x + r * 0.5, y - r * 0.32, r * 0.22, '#f4f0e6', 0.9);
  pen.stroke(lid, 2.4 * ink, INK, 1, false);
  pen.stroke(curve([{ x: x - r * 1.6, y: y - r * 0.2 }, { x, y: y - r * 1.3 }, { x: x + r * 1.5, y: y - r * 0.3 }], 5), 2.6 * ink, INK, 1, false);
}

function drawDorsal(pen: Pen, ink: number): void {
  washOf(pen, DORSAL, 2);
  shade(pen.ctx, DORSAL, -346, -272, [[0, `rgba(${LIGHT_RGB},0.25)`], [1, `rgba(${SHADOW_RGB},0.25)`]]);
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
    const g = ctx.createLinearGradient(780, 0, 1200, 0);
    g.addColorStop(0, `rgba(${SHADOW_RGB},0)`);
    g.addColorStop(1, `rgba(${SHADOW_RGB},0.22)`);
    ctx.fillStyle = g;
    ctx.fillRect(780, -160, 440, 300);
    // Countershading: the flank pales to the white belly.
    const belly = ctx.createLinearGradient(0, -20, 0, 250);
    belly.addColorStop(0, 'rgba(206,218,226,0)');
    belly.addColorStop(1, 'rgba(206,218,226,0.78)');
    ctx.fillStyle = belly;
    ctx.fillRect(-1160, -20, 2000, 300);
    bellyLines(pen, ink);
    pen.stipple(BODY, 3600, (_x, y) => 0.04 + 0.5 * clamp01((y + 40) / 300), 1.1 * Math.min(ink, 2), INK);
    // The light catching the top of the back.
    for (let k = 1; k <= 3; k++) {
      pen.hair(TOP.filter((p) => p.x > -950 && p.x < 860).map((p) => ({ x: p.x, y: p.y + 6 + k * 8 * ink })), (3.2 - k * 0.7) * ink, LIGHT, 0.3 - k * 0.07);
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

const BODY_BOX: Box = { x0: -1400, x1: 1240, y0: -330, y1: 330 };
const HEAD_BOX: Box = { x0: 640, x1: 1240, y0: -160, y1: 140 };
/** Sprite px per local unit for the body's sizes, and the head's. */
const BODY_RES = [0.15, 0.35, 0.7, 1] as const;
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
const BEND_FROM = -330;
const WAG = 60;
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
const PLEATS = 18;
const SHUT_CHORD = { from: THROAT_SHUT[0]!, len: Math.hypot(NAVEL.x - THROAT_SHUT[0]!.x, NAVEL.y - THROAT_SHUT[0]!.y) };
/** The shut throat as offsets from its chord (chin to navel): where along it (0..1) and how far out. */
const SHUT_PROFILE: readonly { readonly t: number; readonly off: number }[] = THROAT_SHUT.map((p) => {
  const d = { x: (NAVEL.x - SHUT_CHORD.from.x) / SHUT_CHORD.len, y: (NAVEL.y - SHUT_CHORD.from.y) / SHUT_CHORD.len };
  const rel = { x: p.x - SHUT_CHORD.from.x, y: p.y - SHUT_CHORD.from.y };
  return { t: (rel.x * d.x + rel.y * d.y) / SHUT_CHORD.len, off: rel.x * d.y - rel.y * d.x };
});
/** How far the full pouch bulges past its chord: a share of the chord's length. */
const BALLOON = { base: 50, perLength: 0.2 } as const;

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
  washOf(pen, shape, 0, PALE);
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
    pen.stipple(JAW_SHAPE, 260, (_x, y) => clamp01((y - 40) / 80) * 0.6 + 0.05, 1.1 * ink, INK);
  });
  // The pale lip, the knobbly chin with its hair follicles.
  pen.hair(LOWER_LIP.slice(3).map((p) => ({ x: p.x, y: p.y + 5 })), 2.6 * ink, '#b9c8d1', 0.45);
  for (const p of [{ x: 1200, y: 30 }, { x: 1180, y: 44 }, { x: 1150, y: 32 }, { x: 1120, y: 46 }, { x: 1090, y: 34 }, { x: 1050, y: 42 }, { x: 1010, y: 36 }]) tubercle(pen, p.x, p.y, 8);
  for (const p of [{ x: 1196, y: 56 }, { x: 1100, y: 70 }]) {
    pen.dot(p.x, p.y, 8, '#dcd5bf', 0.9);
    pen.dot(p.x - 2, p.y - 2, 3, '#fff9e6', 0.8);
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
    const len = 12 + 62 * smooth(0.02, 0.8, u) * (1 - 0.3 * smooth(0.88, 1, u));
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

function drawCavity(ctx: CanvasRenderingContext2D, pen: Pen, a: number, ink: number): void {
  const cavity = cavityOf(a);
  const upperTip = UPPER_LIP[0]!;
  const jawTip = rotJaw(LOWER_LIP[LOWER_LIP.length - 1]!, a);
  // Deep in the throat it's black; towards the open front it thins to the water seen straight through the mouth.
  const front = lerpPt(upperTip, jawTip, 0.5);
  const across = ctx.createLinearGradient(PIVOT.x, PIVOT.y, front.x, front.y);
  across.addColorStop(0, 'rgba(10,4,8,1)');
  across.addColorStop(0.45, 'rgba(22,10,20,0.92)');
  across.addColorStop(0.8, 'rgba(26,12,28,0.3)');
  across.addColorStop(1, 'rgba(30,16,34,0)');
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
  });
  pen.clipped(cavity, () => {
    pen.fill(far, '#24364c', 0.55);
    pen.hair(LOWER_LIP.slice(1).map((p) => rotJaw(p, a * FAR_JAW)), 2 * ink, '#6d8299', 0.35);
    drawBaleen(pen, ink);
  });
  pen.stroke(UPPER_LIP, 4 * ink, INK, 1, false);
}

/** The near pectoral fin: very long and slim, hanging back and down from behind the jaw, scalloped along its leading edge, pale underneath. */
function drawFin(ctx: CanvasRenderingContext2D, pen: Pen, phase: number, swing: number, ink: number, scale = 1): void {
  const ang = Math.PI - 0.78 + swing + 0.07 * Math.sin(phase * 0.5);
  const dir = { x: Math.cos(ang), y: Math.sin(ang) };
  const nrm = { x: -dir.y, y: dir.x };
  const len = 900 * scale;
  const at = (u: number, side: number): Pt => {
    const base = (16 + 60 * Math.sin(Math.PI * Math.min(1, u * 1.04) ** 0.75)) * (1 - 0.3 * u);
    const knob = side < 0 ? 14 * Math.abs(Math.sin(u * 30)) * smooth(0.06, 0.25, u) * (1 - 0.5 * u) : 0;
    const w = side * base + knob;
    const bow = 22 * Math.sin(Math.PI * u);
    return { x: FIN_ROOT.x + dir.x * len * u + nrm.x * (w + bow), y: FIN_ROOT.y + dir.y * len * u + nrm.y * (w + bow) };
  };
  const lead = Array.from({ length: 41 }, (_, i) => at(i / 40, -1));
  const trail = Array.from({ length: 31 }, (_, i) => at(1 - i / 30, 1));
  const root = Array.from({ length: 7 }, (_, i) => {
    const s = Math.PI / 2 + (Math.PI * (i + 1)) / 8;
    return { x: FIN_ROOT.x + dir.x * Math.cos(s) * 16 + nrm.x * Math.sin(s) * 16, y: FIN_ROOT.y + dir.y * Math.cos(s) * 16 + nrm.y * Math.sin(s) * 16 };
  });
  const shape = [...lead, ...trail, ...root];
  washOf(pen, shape, 0, '#b4c2cc');
  const g = ctx.createLinearGradient(FIN_ROOT.x, FIN_ROOT.y, FIN_ROOT.x + dir.x * len, FIN_ROOT.y + dir.y * len);
  pen.clipped(shape, () => {
    // The pale underside showing along the trailing half, more towards the tip.
    const pale = [...Array.from({ length: 21 }, (_, i) => at(i / 20, 0.15)), ...trail];
    pen.fill(pale, '#f3f6f8', 0.92);
    pen.fill([...lead.slice(0, 33), ...Array.from({ length: 33 }, (_, i) => at(1 - i / 32, -0.55))], '#222e3b', 0.75);
    for (const b of JAW_MOTTLE.slice(0, 14)) paintBlotch(ctx, { ...b, light: true, alpha: 0.2 }, at(((b.x - 760) / 430) * 0.9, (b.y % 2) - 0.5), 1.1, ang);
    g.addColorStop(0, `rgba(${SHADOW_RGB},0.4)`);
    g.addColorStop(0.3, `rgba(${SHADOW_RGB},0.1)`);
    g.addColorStop(1, `rgba(${SHADOW_RGB},0.22)`);
    ctx.fillStyle = g;
    shapePath(ctx, shape);
    ctx.fill();
    for (let k = 1; k <= 4; k++) pen.hair(Array.from({ length: 16 }, (_, i) => lerpPt(at((i / 15) * 0.92, -1), at((i / 15) * 0.92, 1), 0.25 + k * 0.14)), 0.9 * ink, INK, 0.3);
    pen.hair(lead.slice(4, -3).map((p) => ({ x: p.x + nrm.x * 5, y: p.y + nrm.y * 5 })), 3 * ink, LIGHT, 0.3);
  });
  pen.stroke([...lead.slice(1), ...trail], 3.8 * ink, INK, 1, true);
  pen.hair(root, 1.6 * ink, INK, 0.5);
}

// ---------------------------------------------------------------- placing it

/** A placement worked out: the boil frame, the ink weight, device px per local unit, the jaw's angle, the throat, the tail's phase. */
interface Placed { readonly boil: number; readonly ink: number; readonly scale: number; readonly gapeAngle: number; readonly throat: number; readonly phase: number; readonly fin: number; readonly farFin: number | undefined; readonly finScale: number }

function enter(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, t: number, pose: HumpbackPose, flip: boolean): Placed {
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
    fin: pose.fin ?? 0,
    farFin: pose.farFin,
    finScale: pose.finScale ?? 1,
  };
}

const livePen = (ctx: CanvasRenderingContext2D, part: number, boil: number): Pen => new Pen(ctx, 8100 + part * 131 + boil * 977, WOBBLE);

/** Snout at +x of the local frame: centre (x, y) in screen px, `length` = snout to fluke tip in screen px, `angle` radians, `flip` mirrors vertically, `t` seconds. */
export function drawHumpbackBack(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, t: number, pose: HumpbackPose = {}, flip = false): void {
  const all = spritesNow();
  ctx.save();
  const p = enter(ctx, x, y, length, angle, t, pose, flip);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const size = BODY_RES.findIndex((r) => r >= p.scale);
  const sheets = all.body[size < 0 ? BODY_RES.length - 1 : size]!;
  if (p.farFin !== undefined) drawFin(ctx, livePen(ctx, 5, p.boil), p.phase + 1, p.farFin, p.ink, p.finScale);
  drawSheet(ctx, sheets[p.boil]!, p.phase);
  if (size < 0) drawSheet(ctx, all.head[p.boil]!, p.phase);
  if (p.gapeAngle > 0.01) drawCavity(ctx, livePen(ctx, 1, p.boil), p.gapeAngle, p.ink);
  ctx.restore();
}

export function drawHumpbackFront(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, t: number, pose: HumpbackPose = {}, flip = false): void {
  ctx.save();
  const p = enter(ctx, x, y, length, angle, t, pose, flip);
  drawPouch(ctx, livePen(ctx, 2, p.boil), p.gapeAngle, p.throat, p.ink);
  drawJaw(ctx, livePen(ctx, 3, p.boil), p.gapeAngle, p.ink);
  drawFin(ctx, livePen(ctx, 4, p.boil), p.phase, p.fin, p.ink, p.finScale);
  ctx.restore();
}

export function drawHumpback(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, t: number, pose: HumpbackPose = {}, flip = false): void {
  drawHumpbackBack(ctx, x, y, length, angle, t, pose, flip);
  drawHumpbackFront(ctx, x, y, length, angle, t, pose, flip);
}

/** Where the mouth opening is in screen px for the given placement and pose (so krill can be placed in it). */
export function humpbackMouth(x: number, y: number, length: number, angle: number, pose: HumpbackPose = {}, flip = false): { x: number; y: number; radius: number } {
  const g = clamp01(pose.gape ?? 0);
  const upper = { x: 1200, y: 8 };
  const lower = rotJaw({ x: 1204, y: 18 }, g * GAPE_MAX);
  const mid = lerpPt(lerpPt(upper, lower, 0.5), PIVOT, 0.32 * g);
  const radius = 14 + 0.36 * Math.hypot(upper.x - lower.x, upper.y - lower.y);
  const s = length / LOCAL_LEN;
  const lx = (mid.x - CENTRE_X) * s;
  const ly = mid.y * s * (flip ? -1 : 1);
  return { x: x + lx * Math.cos(angle) - ly * Math.sin(angle), y: y + lx * Math.sin(angle) + ly * Math.cos(angle), radius: radius * s };
}

/** Where to put the whale so that a point of its local frame lands on a screen point: the (x, y) to draw it at. */
export function humpbackPin(local: Pt, target: Pt, length: number, angle: number, flip = false): { x: number; y: number } {
  const s = length / LOCAL_LEN;
  const lx = (local.x - CENTRE_X) * s;
  const ly = local.y * s * (flip ? -1 : 1);
  return { x: target.x - (lx * Math.cos(angle) - ly * Math.sin(angle)), y: target.y - (lx * Math.sin(angle) + ly * Math.cos(angle)) };
}

/** The hinge of the jaw in the whale's local frame (the V's apex when the mouth gapes). */
export const HUMPBACK_HINGE: Pt = PIVOT;

// ---------------------------------------------------------------- the kit preview

const ease = (u: number): number => smooth(0, 1, u);

/** Shut, then the lunge: the jaw drops, the throat balloons, the jaw closes round a pouch of water, the pouch empties. */
function lungeAt(t: number): HumpbackPose {
  const c = t % 6;
  return { gape: ease((c - 0.4) / 1.0) * (1 - ease((c - 2.4) / 1.4)), throat: ease((c - 0.7) / 2.0) * (1 - ease((c - 4.4) / 1.3)) };
}

export const KIT: KitEntry = {
  name: 'humpback',
  draw(ctx, w, h, t) {
    const sea = ctx.createLinearGradient(0, 0, 0, h);
    sea.addColorStop(0, '#16507e');
    sea.addColorStop(1, '#061a33');
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, w, h);
    drawHumpback(ctx, w * 0.36, h * 0.5, w * 0.66, 0, t, lungeAt(t));
    drawHumpback(ctx, w * 0.5, h * 0.84, w * 0.9, Math.PI, t, { gape: 0.25, throat: 0.9, fin: -1.0, farFin: -0.35 }, true);
  },
};
