import type { Pt } from '../../../../src/art/pen';
import { columnWash, dab, edgeAt, mix, smoothLoop, softLine, taper, type Stops } from '../../seal/art/paint';
import { cubic, fillShape, inkLine, seeded, unitPx, within } from '../../pelican/art/ink';

/**
 * A frog sitting in profile, facing +x, painted to the bar of
 * ../../seal/art/capeFurSeal.ts: the colour laid in column washes that follow
 * the body round (dark back, lighter flank, white belly and throat), wet
 * highlights, a golden eye with a horizontal pupil and a catchlight under a
 * bulging lid, thin interior ink and a firm outline.
 *
 * The main frog is the black-spotted pond frog (Pelophylax nigromaculatus):
 * green-olive back with irregular black spots, a pale thin stripe down the
 * middle of the back, pale ridges along the sides, a round eardrum behind the
 * eye, dark bars on the legs, a white throat. The legs are a frog's: a short
 * arm with four slender fingers on the ground, the long hind leg folded in a Z
 * (thigh forward, shin back, the long foot forward again) with five webbed toes.
 * FrogLook varies it for the other kinds (tree frog, wrinkled frog, rice frog).
 *
 * The mouth opens on a hinge behind the eye: the lower jaw drops and the head
 * tips up a little, the skin bending smoothly back to the neck; the sticky
 * tongue is fixed at the front of the lower jaw and flips out.
 *
 * Own units: facing +x, the ground at y = 0, y down; the snout tip at
 * (178, -112), the vent at (-137, -36), the eye's top at about y -172.
 */

export interface FrogLook {
  readonly backDark: string;
  readonly back: string;
  readonly side: string;
  readonly sideLight: string;
  readonly belly: string;
  readonly lip: string;
  readonly spot: string;
  readonly spots: 'irregular' | 'round' | 'blotch' | 'none';
  readonly spotCount: number;
  /** A pale thin stripe down the middle of the back. */
  readonly stripe: boolean;
  /** Pale folds along the upper flank. */
  readonly ridge: boolean;
  /** 0 smooth .. 1 warty and wrinkled. */
  readonly warts: number;
  /** A dark band from the nostril through the eye to the shoulder. */
  readonly mask: boolean;
  /** Sticky discs on the fingers and toes. */
  readonly pads: boolean;
  /** Dark bars across the legs. */
  readonly bars: boolean;
  readonly iris: string;
  readonly seed: number;
}

export const POND_FROG: FrogLook = {
  backDark: '#3c5422', back: '#5e8434', side: '#8aa548', sideLight: '#c4c98a', belly: '#f1ecd8', lip: '#d8dca0', spot: '#1a2212',
  spots: 'irregular', spotCount: 46, stripe: true, ridge: true, warts: 0, mask: false, pads: false, bars: true, iris: '#e6b43c', seed: 3,
};

export interface FrogPose {
  readonly x: number;
  readonly y: number;
  readonly k: number;
  readonly face: 1 | -1;
  /** 0 shut .. 1 wide open. */
  readonly gape: number;
  /** The tongue's tip in own units, or null (in the mouth). */
  readonly tongue: Pt | null;
  /** 0 .. 1 the eyes pressed down into the head (swallowing). */
  readonly press: number;
  /** Where the pupils look: +1 forward .. -1 back. */
  readonly look: number;
  /** 0 open .. 1 shut. */
  readonly blink: number;
  /** 0 .. 1 a lump going down the throat. */
  readonly gulp: number;
}

export const FROG_REST: Omit<FrogPose, 'x' | 'y' | 'k' | 'face'> = { gape: 0, tongue: null, press: 0, look: 0, blink: 0, gulp: 0 };

// ---------------------------------------------------------------- the shape

export const SNOUT: Pt = { x: 180, y: -111 };
export const HINGE: Pt = { x: 56, y: -98 };
export const VENT: Pt = { x: -137, y: -36 };
export const EYE: Pt = { x: 109, y: -152 };
const EAR: Pt = { x: 66, y: -123 };
const NOSTRIL: Pt = { x: 164, y: -129 };

/** The back, from the snout tip over the head to the vent. */
const TOP: readonly Pt[] = [
  SNOUT, { x: 178, y: -117 }, { x: 172, y: -126 }, { x: 160, y: -135 }, { x: 144, y: -142 }, { x: 132, y: -147 }, { x: 127, y: -157 }, { x: 119, y: -166 },
  { x: 109, y: -170 }, { x: 99, y: -167 }, { x: 91, y: -159 }, { x: 85, y: -150 }, { x: 74, y: -148 },
  { x: 58, y: -145 }, { x: 34, y: -139 }, { x: 4, y: -130 }, { x: -30, y: -121 }, { x: -60, y: -117 }, { x: -82, y: -115 }, { x: -102, y: -106 },
  { x: -120, y: -88 }, { x: -132, y: -66 }, { x: -138, y: -46 }, VENT,
];
/** The belly, from the vent forward to the chest (mostly behind the legs). */
const BELLY: readonly Pt[] = [{ x: -128, y: -24 }, { x: -100, y: -16 }, { x: -60, y: -14 }, { x: -20, y: -20 }, { x: 10, y: -30 }, { x: 30, y: -44 }, { x: 38, y: -56 }];
const NECK: readonly Pt[] = [{ x: 44, y: -74 }, { x: 52, y: -90 }];
/** The mouth line, snout tip back to the hinge. */
const MOUTH: readonly Pt[] = [SNOUT, { x: 168, y: -107 }, { x: 150, y: -103 }, { x: 126, y: -100 }, { x: 100, y: -98 }, { x: 78, y: -97 }, HINGE];
/** Under the chin and throat, from the chest forward to the snout. */
const THROAT: readonly Pt[] = [{ x: 52, y: -64 }, { x: 80, y: -72 }, { x: 112, y: -80 }, { x: 144, y: -90 }, { x: 166, y: -101 }];

const UPPER_RAW: readonly Pt[] = [...TOP, ...BELLY, ...NECK, ...[...MOUTH].reverse().slice(0, -1)];
const LOWER_RAW: readonly Pt[] = [...MOUTH, { x: 50, y: -86 }, { x: 44, y: -72 }, { x: 38, y: -58 }, ...THROAT];
/** The bottom edge under each x, left to right: belly, neck, then the mouth. */
const UNDER: readonly Pt[] = [VENT, ...BELLY, ...NECK, ...[...MOUTH].reverse()];

const THIGH = smoothLoop([
  { x: -134, y: -60 }, { x: -112, y: -80 }, { x: -80, y: -82 }, { x: -48, y: -68 }, { x: -14, y: -49 }, { x: 4, y: -37 }, { x: 3, y: -23 },
  { x: -14, y: -17 }, { x: -60, y: -22 }, { x: -104, y: -30 }, { x: -130, y: -40 },
], 5);
const SHIN = smoothLoop([
  { x: -8, y: -37 }, { x: 7, y: -29 }, { x: 5, y: -16 }, { x: -20, y: -10 }, { x: -70, y: -9 }, { x: -122, y: -8 }, { x: -146, y: -12 }, { x: -150, y: -23 },
  { x: -136, y: -29 }, { x: -90, y: -25 }, { x: -40, y: -29 },
], 5);
const FOOT = smoothLoop([{ x: -150, y: -15 }, { x: -138, y: -21 }, { x: -110, y: -13 }, { x: -80, y: -9 }, { x: -72, y: -3 }, { x: -110, y: 0 }, { x: -146, y: -4 }], 5);
const TOE_BASE: Pt = { x: -78, y: -5 };
/** Five toes, far to near: the fourth is the longest. */
const TOES: readonly Pt[] = [{ x: -58, y: -14 }, { x: -40, y: -12 }, { x: -21, y: -8 }, { x: 4, y: -3 }, { x: -18, y: 2 }];
const ARM = smoothLoop([
  { x: 34, y: -62 }, { x: 56, y: -66 }, { x: 62, y: -48 }, { x: 70, y: -26 }, { x: 80, y: -9 }, { x: 74, y: -2 }, { x: 63, y: -6 }, { x: 50, y: -30 }, { x: 36, y: -48 },
], 5);
const WRIST: Pt = { x: 74, y: -5 };
/** Four slender fingers on the ground, far to near. */
const FINGERS: readonly Pt[] = [{ x: 93, y: -8 }, { x: 103, y: -3 }, { x: 99, y: 3 }, { x: 82, y: 5 }];

// ---------------------------------------------------------------- bending the mouth open

const smooth01 = (u: number): number => {
  const c = Math.max(0, Math.min(1, u));
  return c * c * (3 - 2 * c);
};

const turnAbout = (p: Pt, c: Pt, a: number): Pt => {
  const [co, si] = [Math.cos(a), Math.sin(a)];
  const [dx, dy] = [p.x - c.x, p.y - c.y];
  return { x: c.x + dx * co - dy * si, y: c.y + dx * si + dy * co };
};

/** The lower jaw's drop and the head's tip at a gape. */
export const jawAngles = (gape: number): { readonly low: number; readonly up: number } => ({ low: 0.55 * gape, up: -0.2 * gape });

/** A point of the head turned up about the hinge, fully from x 110 forward, not at all behind x 40. */
export const bendUp = (p: Pt, gape: number): Pt => turnAbout(p, HINGE, jawAngles(gape).up * smooth01((p.x - 40) / 70));
/** A point of the lower jaw turned down about the hinge, fully from x 100 forward. */
export const bendLow = (p: Pt, gape: number): Pt => turnAbout(p, HINGE, jawAngles(gape).low * smooth01((p.x - 42) / 58));

/** The throat's lump, swelling the line under the chin. */
function swellThroat(p: Pt, gulp: number): Pt {
  if (gulp <= 0) return p;
  const centre = 150 - 90 * gulp;
  const bump = Math.sin(Math.PI * Math.min(1, gulp * 1.6)) * 14 * Math.exp(-(((p.x - centre) / 26) ** 2));
  // Only the line under the chin swells, never the lip.
  return p.x > 40 && p.y > edgeAt(MOUTH, p.x) + 5 ? { x: p.x, y: p.y + bump } : p;
}

export const UPPER = smoothLoop(UPPER_RAW, 4);

/** The eye's bump on the outline sinks as the eye presses down. */
function pressTop(p: Pt, press: number): Pt {
  if (press <= 0 || p.x < 80 || p.x > 136 || p.y > -146) return p;
  const w = Math.exp(-(((p.x - EYE.x) / 18) ** 2));
  return { x: p.x, y: p.y + 14 * press * w };
}
const upperFor = (press: number): Pt[] => (press > 0 ? smoothLoop(UPPER_RAW.map((p) => pressTop(p, press)), 4) : UPPER);
export const LOWER = smoothLoop(LOWER_RAW, 4);
export const LIMBS = { THIGH, SHIN, FOOT, ARM } as const;

// ---------------------------------------------------------------- painting helpers

interface Spot { readonly shape: Pt[] }

function insideShape(shape: readonly Pt[], q: Pt): boolean {
  let hit = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const [a, b] = [shape[i]!, shape[j]!];
    if (a.y > q.y !== b.y > q.y && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

const blob = (c: Pt, r: number, rng: () => number, n: number, rough: number, stretch = 1): Pt[] =>
  smoothLoop(Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 - rough / 2 + rough * rng());
    return { x: c.x + Math.cos(a) * rr * stretch, y: c.y + Math.sin(a) * rr };
  }), 4);

const spotCache = new Map<string, { body: Spot[]; legs: Spot[] }>();

function spotsFor(look: FrogLook): { body: Spot[]; legs: Spot[] } {
  const key = `${look.seed}:${look.spots}:${look.spotCount}`;
  const have = spotCache.get(key);
  if (have) return have;
  const rng = seeded(look.seed * 7919 + 13);
  const body: Spot[] = [];
  const legs: Spot[] = [];
  if (look.spots !== 'none') {
    let tries = 0;
    const centres: { x: number; y: number; r: number }[] = [];
    while (body.length < look.spotCount && tries++ < 4000) {
      const x = -128 + rng() * 280;
      const top = edgeAt(TOP, x);
      const under = edgeAt(UNDER, x);
      const y = top + 6 + rng() * (under - top) * (x > 50 ? 0.45 : 0.6);
      const p = { x, y };
      if (Math.hypot(p.x - EYE.x, p.y - EYE.y) < 30 || Math.hypot(p.x - EAR.x, p.y - EAR.y) < 18 || !insideShape(UPPER_RAW, p)) continue;
      // Smaller on the head.
      const size = x > 60 ? 0.55 : 1;
      const r = look.spots === 'blotch' ? (7 + rng() * 9) * size : look.spots === 'round' ? (4 + rng() * 3.5) * size : (3.5 + rng() * 6.5) * size;
      if (centres.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < (q.r + r) * 0.85)) continue;
      centres.push({ ...p, r });
      const rough = look.spots === 'irregular' ? 0.75 : look.spots === 'blotch' ? 0.5 : 0.2;
      body.push({ shape: blob(p, r, rng, 7, rough, look.spots === 'irregular' ? 1 + rng() * 0.8 : 1.15) });
    }
    for (let i = 0; i < 26; i++) {
      const p = { x: -140 + rng() * 150, y: -80 + rng() * 75 };
      if (!insideShape(THIGH, p) && !insideShape(SHIN, p)) continue;
      legs.push({ shape: blob(p, 2.5 + rng() * 3.5, rng, 6, 0.6, 1.3) });
    }
  }
  const out = { body, legs };
  spotCache.set(key, out);
  return out;
}

/** The body's countershading: the stops at column x (the head's are a little lighter and greener). */
function bodyStops(look: FrogLook, x: number): Stops {
  const u = smooth01((x - 30) / 40);
  const body: readonly (readonly [number, string])[] = [[0, look.backDark], [0.14, look.back], [0.42, look.side], [0.66, look.sideLight], [0.86, look.belly], [1, look.belly]];
  const head: readonly (readonly [number, string])[] = [[0, look.backDark], [0.2, look.back], [0.55, look.side], [0.8, look.side], [0.93, look.lip], [1, look.lip]];
  return body.map(([at, c], i) => [at + (head[i]![0] - at) * u, mix(c, head[i]![1], u)] as const);
}

/** A thin opaque line along `pts`, tapering at both ends. */
function fold(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w: number, colour: string, alpha: number): void {
  if (pts.length < 3) return;
  const mid = Math.floor(pts.length / 2);
  taper(ctx, pts.slice(0, mid + 1), w * 0.25, w, colour, alpha);
  taper(ctx, pts.slice(mid), w, w * 0.25, colour, alpha);
}

function paintSpots(ctx: CanvasRenderingContext2D, spots: readonly Spot[], colour: string, alpha: number): void {
  for (const s of spots) {
    fillShape(ctx, s.shape, colour, alpha);
  }
}

/** Dark bars across a limb shape, perpendicular to a line from a to b. */
function bars(ctx: CanvasRenderingContext2D, shape: readonly Pt[], a: Pt, b: Pt, n: number, colour: string, alpha: number): void {
  within(ctx, shape, () => {
    const d = { x: b.x - a.x, y: b.y - a.y };
    const len = Math.hypot(d.x, d.y) || 1;
    const nrm = { x: -d.y / len, y: d.x / len };
    for (let i = 0; i < n; i++) {
      const u = (i + 0.6) / (n + 0.2);
      const c = { x: a.x + d.x * u, y: a.y + d.y * u };
      softLine(ctx, [{ x: c.x - nrm.x * 30 + d.x * 0.02, y: c.y - nrm.y * 30 }, { x: c.x + d.x * 0.03, y: c.y + d.y * 0.03 }, { x: c.x + nrm.x * 30, y: c.y + nrm.y * 30 }], 7, colour, alpha, 3);
    }
  });
}

/** A limb: a wash from its top to its paler underside, a sheen, its outline. */
function paintLimb(ctx: CanvasRenderingContext2D, shape: readonly Pt[], look: FrogLook, top: string, under: string, boil: number, line: number): void {
  const ys = shape.map((p) => p.y);
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  within(ctx, shape, () => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, top);
    g.addColorStop(0.55, look.side);
    g.addColorStop(1, under);
    ctx.fillStyle = g;
    ctx.fillRect(-200, y0 - 2, 420, y1 - y0 + 4);
  });
  inkLine(ctx, shape, line, 0.78, boil, true);
}

function paintToe(ctx: CanvasRenderingContext2D, base: Pt, tip: Pt, w: number, colour: string, pads: boolean, boil: number, line: number): void {
  const mid = { x: (base.x + tip.x) / 2, y: (base.y + tip.y) / 2 - 1.5 };
  taper(ctx, [base, mid, tip], w, w * 0.5, colour, 1);
  const r = pads ? w * 0.75 : w * 0.38;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, r, 0, Math.PI * 2);
  ctx.fill();
  inkLine(ctx, [base, mid, tip], line * 0.55, 0.35, boil);
}

// ---------------------------------------------------------------- the parts

function paintFoot(ctx: CanvasRenderingContext2D, look: FrogLook, boil: number, line: number): void {
  // The webbing between the toes, pale and a little see-through.
  const web: Pt[] = [TOE_BASE];
  TOES.slice(0, 4).forEach((tip, i) => {
    const near = { x: TOE_BASE.x + (tip.x - TOE_BASE.x) * 0.78, y: TOE_BASE.y + (tip.y - TOE_BASE.y) * 0.78 };
    web.push(near);
    const next = TOES[i + 1];
    if (next && i < 3) web.push({ x: TOE_BASE.x + ((tip.x + next.x) / 2 - TOE_BASE.x) * 0.5, y: TOE_BASE.y + ((tip.y + next.y) / 2 - TOE_BASE.y) * 0.5 });
  });
  if (!look.pads) fillShape(ctx, smoothLoop(web, 3), mix(look.side, look.sideLight, 0.5), 0.72);
  TOES.forEach((tip, i) => paintToe(ctx, TOE_BASE, tip, i === 4 ? 5.4 : 4.6, i < 2 ? mix(look.side, look.backDark, 0.4) : look.side, look.pads, boil, line));
  paintLimb(ctx, FOOT, look, look.back, look.sideLight, boil, line);
}

function paintHand(ctx: CanvasRenderingContext2D, look: FrogLook, dx: number, far: boolean, boil: number, line: number): void {
  const colour = far ? mix(look.side, look.backDark, 0.45) : look.side;
  FINGERS.forEach((tip, i) => paintToe(ctx, { x: WRIST.x + dx, y: WRIST.y }, { x: tip.x + dx, y: tip.y - (far ? 2 : 0) }, i === 3 ? 4.6 : 4, i < 1 ? mix(colour, look.backDark, 0.3) : colour, look.pads, boil, line));
}

function paintArm(ctx: CanvasRenderingContext2D, look: FrogLook, boil: number, line: number): void {
  paintLimb(ctx, ARM, look, look.back, look.sideLight, boil, line);
  if (look.bars) bars(ctx, ARM, { x: 46, y: -60 }, { x: 76, y: -6 }, 2, look.spot, 0.55);
  softLine(ctx, [{ x: 44, y: -58 }, { x: 58, y: -36 }, { x: 70, y: -16 }], 3, '#ffffff', 0.12, 3);
  paintHand(ctx, look, 0, false, boil, line);
}

function paintHindLeg(ctx: CanvasRenderingContext2D, look: FrogLook, legSpots: readonly Spot[], boil: number, line: number): void {
  paintFoot(ctx, look, boil, line);
  paintLimb(ctx, SHIN, look, look.back, look.sideLight, boil, line);
  if (look.bars) bars(ctx, SHIN, { x: 0, y: -28 }, { x: -146, y: -18 }, 4, look.spot, 0.6);
  paintLimb(ctx, THIGH, look, look.backDark, look.sideLight, boil, line);
  within(ctx, THIGH, () => {
    if (look.bars) bars(ctx, THIGH, { x: -126, y: -62 }, { x: 0, y: -30 }, 4, look.spot, 0.62);
    paintSpots(ctx, legSpots, look.spot, 0.55);
    softLine(ctx, [{ x: -118, y: -72 }, { x: -76, y: -76 }, { x: -30, y: -58 }, { x: -6, y: -42 }], 5, '#ffffff', 0.14, 4);
    dab(ctx, -60, -28, 26, '0,0,0', 0.18);
  });
  inkLine(ctx, THIGH, line, 0.8, boil, true);
}

function paintWarts(ctx: CanvasRenderingContext2D, look: FrogLook): void {
  if (look.warts <= 0) return;
  const rng = seeded(look.seed * 31 + 5);
  const n = Math.round(150 * look.warts);
  for (let i = 0; i < n; i++) {
    const x = -130 + rng() * 290;
    const top = edgeAt(TOP, x);
    const y = top + 4 + rng() * (edgeAt(UNDER, x) - top) * 0.7;
    if (Math.hypot(x - EYE.x, y - EYE.y) < 26) continue;
    const len = 3 + rng() * 6;
    const a = -0.25 + rng() * 0.5;
    const p0 = { x: x - Math.cos(a) * len, y: y - Math.sin(a) * len };
    const p1 = { x: x + Math.cos(a) * len, y: y + Math.sin(a) * len };
    taper(ctx, [{ x: p0.x, y: p0.y + 1.4 }, { x: p1.x, y: p1.y + 1.4 }], 2.8, 1.6, '#000000', 0.22);
    taper(ctx, [p0, p1], 2.6, 1.4, look.sideLight, 0.45);
  }
}

function paintBody(ctx: CanvasRenderingContext2D, look: FrogLook, upper: readonly Pt[], gape: number, boil: number, line: number): void {
  const spots = spotsFor(look);
  const b = (p: Pt): Pt => bendUp(p, gape);
  within(ctx, upper, () => {
    ctx.save();
    // Paint in the unbent frame, turned with the head (the bend is small; the wash follows it closely enough).
    columnWash(ctx, -142, 184, Math.max(0.4, 2.2 * unitPx(ctx)), (x) => b({ x, y: edgeAt(TOP, x) }).y, (x) => b({ x, y: edgeAt(UNDER, x) }).y, (x) => bodyStops(look, x), 20);
    ctx.restore();
    const shift = (pts: readonly Pt[]): Pt[] => pts.map(b);
    paintSpots(ctx, spots.body.map((s) => ({ shape: shift(s.shape) })), look.spot, 0.88);
    paintWarts(ctx, look);
    // The pale ridge down the flank, with its shadow under it.
    // The side ridge: a low raised fold, a light top edge over a slightly darker shadow, not a pale bar.
    if (look.ridge) {
      const ridge = shift([{ x: 90, y: -139 }, { x: 60, y: -136 }, { x: 30, y: -129 }, { x: 0, y: -119 }, { x: -40, y: -109 }, { x: -78, y: -104 }, { x: -104, y: -91 }]);
      fold(ctx, ridge.map((p) => ({ x: p.x, y: p.y + 2.2 })), 2, mix(look.back, look.backDark, 0.7), 0.55);
      fold(ctx, ridge, 1.8, mix(look.side, look.sideLight, 0.55), 0.85);
    }
    // The thin pale stripe down the middle of the back, along its curve, behind the eyes.
    if (look.stripe) fold(ctx, shift(TOP.filter((p) => p.x < 76 && p.x > -104)).map((p) => ({ x: p.x, y: p.y + 1.8 })), 1.7, mix(look.sideLight, look.side, 0.25), 0.95);
    if (look.mask) {
      softLine(ctx, shift([{ x: 172, y: -122 }, { x: 150, y: -128 }, { x: 122, y: -136 }, { x: 96, y: -132 }, { x: 70, y: -122 }, { x: 44, y: -108 }]), 9, '#4a3420', 0.75, 4);
    }
    // The pale upper lip.
    softLine(ctx, shift(MOUTH.slice(0, 6)).map((p) => ({ x: p.x, y: p.y - 3 })), 5, look.lip, 0.65, 3);
    // Wet highlights along the back and the head, the shade on the side under the ridge.
    softLine(ctx, shift([{ x: 166, y: -128 }, { x: 150, y: -138 }, { x: 140, y: -142 }]), 4, '#ffffff', 0.3, 4);
    dab(ctx, -40, -70, 50, '0,0,0', 0.14);
    dab(ctx, 120, -114, 26, '255,255,240', 0.12);
  });
  inkLine(ctx, upper, line, 0.82, boil, true);
}

function paintEar(ctx: CanvasRenderingContext2D, look: FrogLook, gape: number, line: number): void {
  const c = bendUp(EAR, gape);
  const r = 12;
  const g = ctx.createRadialGradient(c.x - 3, c.y - 3, 1, c.x, c.y, r);
  g.addColorStop(0, mix(look.back, '#8a6a3a', 0.35));
  g.addColorStop(0.75, mix(look.back, '#6a5028', 0.45));
  g.addColorStop(1, mix(look.backDark, '#3a2a14', 0.3));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, r, r * 0.94, 0, 0, Math.PI * 2);
  ctx.fill();
  dab(ctx, c.x - 3, c.y - 4, 5, '255,250,220', 0.12);
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, r, r * 0.94, 0, 0, Math.PI * 2);
  ctx.save();
  ctx.strokeStyle = 'rgba(20,24,12,0.6)';
  ctx.lineWidth = line * 0.8 * unitPx(ctx);
  ctx.stroke();
  ctx.restore();
}

/** The bulging eye: a dome of skin, the golden iris and its horizontal pupil, a catchlight, the lids. */
function paintEye(ctx: CanvasRenderingContext2D, look: FrogLook, pose: FrogPose, boil: number, line: number): void {
  const c0 = bendUp(EYE, pose.gape);
  const press = pose.press;
  const c = { x: c0.x, y: c0.y + 11 * press };
  // The socket's soft shade on the head under the bump.
  dab(ctx, c.x, c.y + 4, 26, '20,30,10', 0.3);
  const r = 15.5;
  const e = { x: c.x + 1, y: c.y };
  const shut = Math.max(pose.blink, press * 0.72);
  ctx.save();
  ctx.beginPath();
  ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
  ctx.clip();
  // The iris: gold, darker to the rim, fine dark flecks.
  const iris = ctx.createRadialGradient(e.x - 3, e.y - 3, 1, e.x, e.y, r);
  iris.addColorStop(0, mix(look.iris, '#fff2b0', 0.35));
  iris.addColorStop(0.55, look.iris);
  iris.addColorStop(0.85, mix(look.iris, '#4a2a08', 0.6));
  iris.addColorStop(1, '#1a1206');
  ctx.fillStyle = iris;
  ctx.fillRect(e.x - r, e.y - r, 2 * r, 2 * r);
  const rng = seeded(look.seed + 77);
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2;
    const d = r * (0.35 + rng() * 0.55);
    dab(ctx, e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, 1.6 + rng() * 1.6, '60,34,8', 0.5);
  }
  // The horizontal pupil.
  const pu = { x: e.x + pose.look * 4.2, y: e.y + 0.5 };
  ctx.fillStyle = '#070504';
  ctx.beginPath();
  ctx.moveTo(pu.x - 8.4, pu.y);
  ctx.quadraticCurveTo(pu.x, pu.y - 7.4, pu.x + 8.4, pu.y);
  ctx.quadraticCurveTo(pu.x, pu.y + 7.4, pu.x - 8.4, pu.y);
  ctx.fill();
  // Shade under the upper lid, the catchlights.
  dab(ctx, e.x, e.y - r * 0.9, r * 0.9, '20,14,4', 0.5);
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.ellipse(e.x - 5, e.y - 6, 3.4, 2.6, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(e.x + 5.5, e.y + 5, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // The lids closing in from top and bottom.
  if (shut > 0.01) {
    const upEdge = e.y - r + r * 1.15 * shut;
    const lowEdge = e.y + r - r * 0.85 * shut;
    fillShape(ctx, [{ x: e.x - r - 2, y: e.y - r - 2 }, { x: e.x + r + 2, y: e.y - r - 2 }, { x: e.x + r + 2, y: upEdge + 2 }, { x: e.x, y: upEdge + 4 }, { x: e.x - r - 2, y: upEdge + 2 }], look.back);
    fillShape(ctx, [{ x: e.x - r - 2, y: e.y + r + 2 }, { x: e.x + r + 2, y: e.y + r + 2 }, { x: e.x + r + 2, y: lowEdge }, { x: e.x, y: lowEdge - 2 }, { x: e.x - r - 2, y: lowEdge }], look.side);
    inkLine(ctx, [{ x: e.x - r, y: upEdge + 2 }, { x: e.x, y: upEdge + 4 }, { x: e.x + r, y: upEdge + 2 }], line * 0.9, 0.8, boil);
  }
  ctx.restore();
  // The rim of the eye and the dome's top.
  ctx.save();
  ctx.strokeStyle = 'rgba(14,16,8,0.85)';
  ctx.lineWidth = line * 0.9 * unitPx(ctx);
  ctx.beginPath();
  ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  dab(ctx, e.x - 2, e.y - r - 6, 7, '255,255,240', 0.12 * (1 - press));
}

function paintNostril(ctx: CanvasRenderingContext2D, gape: number): void {
  const n = bendUp(NOSTRIL, gape);
  taper(ctx, [{ x: n.x - 3, y: n.y + 1 }, { x: n.x + 2, y: n.y - 1 }], 2.6, 1.6, '#0d1008', 0.9);
}

/** Inside the open mouth: dark pink to the throat, the gums' paler rims, the tongue on the floor or flipped out. */
function paintMouth(ctx: CanvasRenderingContext2D, pose: FrogPose, upLip: readonly Pt[], lowLip: readonly Pt[], boil: number, line: number): void {
  if (pose.gape < 0.01) return;
  // The front of the opening curves back toward the hinge (the far lips), so it isn't a box.
  const [a, b] = [upLip[0]!, lowLip[0]!];
  const mid = { x: (a.x + b.x) / 2 + (HINGE.x - (a.x + b.x) / 2) * 0.22, y: (a.y + b.y) / 2 };
  const front = cubic(b, { x: mid.x + 4, y: b.y - (b.y - mid.y) * 0.4 }, { x: mid.x + 4, y: a.y + (mid.y - a.y) * 0.4 }, a, 10);
  const hole = [...[...upLip].reverse(), ...[...front].reverse().slice(1, -1), ...lowLip];
  within(ctx, hole, () => {
    const g = ctx.createRadialGradient(HINGE.x, HINGE.y, 4, HINGE.x + 30, HINGE.y, 150);
    g.addColorStop(0, '#2a080c');
    g.addColorStop(0.45, '#7a2430');
    g.addColorStop(0.8, '#c85c68');
    g.addColorStop(1, '#e48890');
    ctx.fillStyle = g;
    ctx.fillRect(30, -200, 200, 220);
    softLine(ctx, upLip.map((p) => ({ x: p.x, y: p.y + 3 })), 5, '#f0a8ac', 0.55, 3);
    softLine(ctx, lowLip.map((p) => ({ x: p.x, y: p.y - 3 })), 5, '#f0a8ac', 0.5, 3);
    if (!pose.tongue) {
      const floor = lowLip.slice(1, 5).map((p) => ({ x: p.x - 6, y: p.y - 8 }));
      softLine(ctx, floor, 14, '#e68890', 0.9, 4);
    }
  });
  inkLine(ctx, upLip, line * 0.9, 0.8, boil);
  inkLine(ctx, lowLip, line * 0.9, 0.8, boil);
}

/** The sticky tongue from the front of the lower jaw out to its tip. */
export function tongueLine(pose: FrogPose): Pt[] | null {
  if (!pose.tongue) return null;
  const root = bendLow({ x: 152, y: -102 }, pose.gape);
  const tip = pose.tongue;
  const d = { x: tip.x - root.x, y: tip.y - root.y };
  // A gentle arc, bowed up a little.
  const bow = { x: -d.y * 0.12, y: d.x * 0.12 - Math.hypot(d.x, d.y) * 0.08 };
  return cubic(root, { x: root.x + d.x * 0.33 + bow.x, y: root.y + d.y * 0.33 + bow.y }, { x: root.x + d.x * 0.7 + bow.x, y: root.y + d.y * 0.7 + bow.y }, tip, 18);
}

function paintTongue(ctx: CanvasRenderingContext2D, pose: FrogPose, boil: number, line: number): void {
  const pts = tongueLine(pose);
  if (!pts) return;
  taper(ctx, pts, 9, 13, '#d86c78', 1);
  taper(ctx, pts.map((p) => ({ x: p.x, y: p.y - 1.6 })), 4, 5, '#f4aab0', 0.7);
  const tip = pts[pts.length - 1]!;
  const g = ctx.createRadialGradient(tip.x - 2, tip.y - 2, 1, tip.x, tip.y, 10);
  g.addColorStop(0, '#f8b8c0');
  g.addColorStop(1, '#c85a68');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(tip.x, tip.y, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  dab(ctx, tip.x - 3, tip.y - 3, 3, '255,255,255', 0.6);
  inkLine(ctx, pts.map((p) => ({ x: p.x, y: p.y - 5 })), line * 0.6, 0.45, boil);
}

function paintLowerJaw(ctx: CanvasRenderingContext2D, look: FrogLook, lower: readonly Pt[], gape: number, boil: number, line: number): void {
  const low = (p: Pt): Pt => bendLow(p, gape);
  within(ctx, lower, () => {
    columnWash(ctx, 34, 184, Math.max(0.4, 2.2 * unitPx(ctx)), (x) => low({ x, y: edgeAt(MOUTH, x) }).y - 2, (x) => low({ x, y: edgeAt(THROAT, x) }).y + 6,
      () => [[0, look.side], [0.25, look.lip], [0.6, look.belly], [1, mix(look.belly, '#b8b49a', 0.4)]], 30);
    softLine(ctx, THROAT.map(low).map((p) => ({ x: p.x, y: p.y - 3 })), 6, '#8a8a70', 0.3, 3);
  });
  inkLine(ctx, lower, line, 0.82, boil, true);
}

/** The painted frog, placed. `beetle` paints whatever the tongue holds, between the mouth and the jaws. */
export function drawFrog(ctx: CanvasRenderingContext2D, look: FrogLook, pose: FrogPose, boil: number, beetle?: () => void): void {
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.scale(pose.face * pose.k, pose.k);
  const line = Math.max(1.3, Math.min(2.6, 1.1 + pose.k * 0.28));
  const gape = pose.gape;
  const upper = upperFor(pose.press).map((p) => bendUp(p, gape));
  const lower = LOWER.map((p) => swellThroat(bendLow(p, gape), pose.gulp));
  const upLip = MOUTH.map((p) => bendUp(p, gape));
  const lowLip = MOUTH.map((p) => bendLow(p, gape));
  const legSpots = spotsFor(look).legs;
  // The far arm behind the body, its fingers peeking.
  ctx.save();
  ctx.translate(18, -3);
  paintLimb(ctx, ARM, { ...look, side: mix(look.side, look.backDark, 0.45) }, mix(look.back, '#000000', 0.3), mix(look.sideLight, look.back, 0.5), boil, line);
  ctx.restore();
  paintHand(ctx, look, 18, true, boil, line);
  // Its shadow on the ground.
  dab(ctx, -30, 0, 150, '0,0,0', 0.35);
  paintMouth(ctx, pose, upLip, lowLip, boil, line);
  paintTongue(ctx, pose, boil, line);
  beetle?.();
  paintLowerJaw(ctx, look, lower, gape, boil, line);
  paintBody(ctx, look, upper, gape, boil, line);
  paintEar(ctx, look, gape, line);
  paintNostril(ctx, gape);
  if (gape < 0.02) inkLine(ctx, MOUTH, line * 1.1, 0.85, boil);
  paintEye(ctx, look, pose, boil, line);
  paintHindLeg(ctx, look, legSpots, boil, line);
  paintArm(ctx, look, boil, line);
  ctx.restore();
}

