import { PAPER_FILL } from '../../../../src/art/fish/kit';
import { INK, type Pt } from '../../../../src/art/pen';
import { BOIL_FRAMES } from '../../../../src/art/textures';
import { spline as baseSpline } from '../../kraken/whale';
import { type Placed, UNITS } from '../../seal/story';
import {
  blit, type Box, type Brush, type Bucket, bucketFor, columnWash, contour, curve, edgeAt, frames, lazily, path, px, screenScale, shade, smoothLoop as baseLoop,
  softLine, type Stops, taper, turn,
} from '../../seal/art/paint';


/** The bull shark's build: the blue shark's drawing, reshaped (a blunt, short snout, a deep stocky body) and recoloured grey over white. */
const DEEP = 1.5;
const SNOUT_FROM = 108;
const SNOUT_K = 0.62;
const T = (p: Pt): Pt => ({ x: p.x > SNOUT_FROM ? SNOUT_FROM + (p.x - SNOUT_FROM) * SNOUT_K : p.x, y: p.y * DEEP });
const spline = (pts: readonly Pt[], n?: number): Pt[] => baseSpline(pts.map(T), n);
const smoothLoop = (pts: readonly Pt[], n?: number): Pt[] => baseLoop(pts.map(T), n);

/**
 * The tiger shark (Galeocerdo cuvier), after the bull shark's drawing (which
 * was after the blue shark's), painted in the manner of the great white
 * (../../foodchain/art/greatWhite.ts): a deep, stocky body, a blunt, short,
 * almost square snout, a big dark eye, a long upper tail lobe, grey-blue olive
 * skin over a pale cream belly, and the dark vertical tiger bars down the
 * back and flank, strong at the head and fading towards the tail.
 *
 * Parts are sprites baked once per line-boil frame at a few sizes: the body
 * with its tail and fins on its midline (drawn in thin columns, each moved
 * and turned, so it can bend and beat its tail), the lower jaw (turned open
 * about the mouth's corner), and the two pectorals. The eye, the open mouth,
 * its broad serrated teeth and the tag are live.
 *
 * Own units, as the short places animals: 310 long, the middle at 0,0, nose
 * to the right (+x), belly down (+y).
 */

export interface SharkLook {
  /** 0: bright; 1: a dark shape. */
  readonly dark?: number;
  /** How far the rear body bends (a struggle): positive down, negative up, about -0.25 .. 0.25. */
  readonly bend?: number;
  /** Wide-eyed: a big eye, the lid up, the fins flared, 0 .. 1. */
  readonly fear?: number;
  /** A lid over the eye: 0 open .. 1 shut (a smug half-lid is about 0.5). */
  readonly lid?: number;
  /** How far the jaws are open, 0 .. 1. */
  readonly gape?: number;
  /** A research tag on the dorsal fin, 0 .. 1 (its size). */
  readonly tag?: number;
  /** What is in the mouth, drawn behind the lower jaw and the upper head: called with the context in the shark's own units. */
  readonly inMouth?: (ctx: CanvasRenderingContext2D) => void;
}

// ---------------------------------------------------------------- shape

/** A spline through points already in the shark's own (drawn) units: the head is laid out directly in them. */
const ospline = (pts: readonly Pt[], n?: number): Pt[] => baseSpline(pts, n);

/**
 * The head, in drawn units: the top runs back almost straight, sloping gently
 * down from the shoulders to a short, blunt, broadly rounded snout; under the
 * snout the profile runs back nearly flat to the mouth, which is underslung
 * well behind the tip; the short lower jaw and the throat fall away under it.
 */
const SNOUT_TIP: Pt = { x: 143.8, y: 2 };
const BACK: readonly Pt[] = ospline([
  SNOUT_TIP, { x: 143.9, y: -2.5 }, { x: 142.8, y: -7 }, { x: 140.2, y: -10.8 }, { x: 136, y: -13.8 }, { x: 130, y: -16.4 }, { x: 120, y: -20.2 },
  { x: 110, y: -23.6 }, { x: 100, y: -26.6 }, { x: 80, y: -30 }, { x: 56, y: -33 }, { x: 32, y: -33.75 }, { x: 8, y: -33 }, { x: -16, y: -30.75 },
  { x: -40, y: -26.25 }, { x: -62, y: -19.5 }, { x: -80, y: -13.5 }, { x: -92, y: -9.75 }, { x: -104, y: -6.75 }, { x: -116, y: -3 }, { x: -122, y: 0 },
], 5);
/** The front of the mouth, on the underside of the head, a little behind the snout's tip. */
const MOUTH_FRONT: Pt = { x: 130.5, y: 11.4 };
const BELLY: readonly Pt[] = ospline([
  SNOUT_TIP, { x: 143.4, y: 5.2 }, { x: 141.6, y: 7.6 }, { x: 138.4, y: 9.2 }, { x: 134, y: 10.4 }, MOUTH_FRONT, { x: 128.8, y: 14.6 },
  { x: 125.6, y: 18.2 }, { x: 120, y: 21.6 }, { x: 113, y: 24.4 }, { x: 104, y: 26.7 }, { x: 96, y: 28.3 }, { x: 88, y: 29.7 }, { x: 64, y: 32.1 },
  { x: 40, y: 33 }, { x: 16, y: 32.1 }, { x: -8, y: 30 }, { x: -32, y: 26.25 }, { x: -54, y: 20.25 }, { x: -72, y: 14.25 }, { x: -86, y: 9.75 },
  { x: -100, y: 6.75 }, { x: -112, y: 3 }, { x: -122, y: 0 },
], 5);
const topAt = (x: number): number => edgeAt(BACK, x);
const bottomAt = (x: number): number => edgeAt(BELLY, x);
const along = (v: number, x0: number, x1: number, step = 4): Pt[] => contour(topAt, bottomAt, v, x0, x1, step);

/** The first dorsal, set well back: a convex leading edge, a rounded tip, a concave trailing edge to a free rear tip. */
const DORSAL: readonly Pt[] = spline([
  { x: -4, y: -21.8 }, { x: -10, y: -27 }, { x: -17, y: -34.5 }, { x: -24, y: -41 }, { x: -30, y: -44.5 }, { x: -34, y: -44 },
  { x: -35.5, y: -39 }, { x: -36.5, y: -31 }, { x: -39.5, y: -24 }, { x: -45, y: -19.6 },
], 5);
const SECOND_DORSAL: readonly Pt[] = spline([
  { x: -72, y: -11.2 }, { x: -75.5, y: -15.5 }, { x: -80, y: -18 }, { x: -83, y: -17.5 }, { x: -84, y: -14 }, { x: -86.5, y: -10 }, { x: -90, y: -7.6 },
], 4);
const TOPLINE: readonly Pt[] = [
  ...BACK.filter((p) => p.x > -4), ...DORSAL, ...BACK.filter((p) => p.x < -46 && p.x > -72), ...SECOND_DORSAL, ...BACK.filter((p) => p.x < -90),
];
const BODY: readonly Pt[] = [...TOPLINE, ...[...BELLY].reverse().slice(1, -1)];

/** The crescent tail: a long upper lobe with a small notched tip, a shorter lower lobe. */
const CAUDAL: readonly Pt[] = spline([
  { x: -92, y: -6 }, { x: -108, y: -10.5 }, { x: -124, y: -17.5 }, { x: -140, y: -26 }, { x: -154, y: -35 }, { x: -165, y: -42.5 },
  { x: -172, y: -47.5 }, { x: -170, y: -43.5 }, { x: -164.5, y: -39.5 }, { x: -161, y: -36 }, { x: -158, y: -30 }, { x: -152, y: -22 },
  { x: -146, y: -14 }, { x: -142, y: -7 }, { x: -140.5, y: -1.5 }, { x: -140, y: 4 }, { x: -140.5, y: 10.5 }, { x: -142, y: 17 },
  { x: -143, y: 21.5 }, { x: -134, y: 17 }, { x: -124, y: 11.5 }, { x: -112, y: 7 }, { x: -100, y: 5 }, { x: -92, y: 5.5 },
], 4);
const ANAL: readonly Pt[] = smoothLoop([
  { x: -72, y: 9.5 }, { x: -76, y: 14.5 }, { x: -80.5, y: 17.5 }, { x: -83, y: 16.6 }, { x: -83.5, y: 13 }, { x: -86, y: 9 }, { x: -89, y: 7 },
  { x: -86, y: 4.5 }, { x: -72, y: 6.5 },
], 3);
const PELVIC: readonly Pt[] = smoothLoop([
  { x: -34, y: 17.8 }, { x: -40, y: 23.5 }, { x: -47, y: 27 }, { x: -51, y: 26.4 }, { x: -50, y: 22.5 }, { x: -52, y: 17.5 }, { x: -55, y: 14.5 },
  { x: -52, y: 11 }, { x: -34, y: 13.5 },
], 3);

/**
 * The countershading line, snout to tail (drawn units): the grey above gives
 * way to the cream below. On the head it starts just under the snout's tip,
 * passes under the eye and runs back just over the mouth to its corner, so
 * the underside of the snout and the jaw are pale and the cheek is grey.
 */
const LINE: readonly Pt[] = ospline([
  { x: 147, y: 4.6 }, { x: 142, y: 5.4 }, { x: 136, y: 7.2 }, { x: 130, y: 9.2 }, { x: 124, y: 11 }, { x: 118, y: 12.4 }, { x: 112, y: 13.2 },
  { x: 104, y: 12.4 }, { x: 96, y: 11 }, { x: 88, y: 10.4 }, { x: 72, y: 11.4 }, { x: 50, y: 12.6 }, { x: 28, y: 13.5 }, { x: 6, y: 12.75 },
  { x: -18, y: 11.1 }, { x: -40, y: 9 }, { x: -62, y: 6 }, { x: -82, y: 3.9 }, { x: -100, y: 2.4 }, { x: -126, y: 0.9 },
], 5).map((p) => ({ x: p.x, y: p.y + 0.5 * Math.sin(p.x * 0.21) + 0.3 * Math.sin(p.x * 0.57 + 1) }));
const lineAt = (x: number): number => edgeAt(LINE, x);

/** The eye: on the side of the head, above the front part of the mouth. */
export const SHARK_EYE: Pt = { x: 122.5, y: -5.2 };
const EYE_R = 4.1;
/** The mouth on the underside of the head, front to corner (the corner below and a little behind the eye). */
const MOUTH: readonly Pt[] = ospline([MOUTH_FRONT, { x: 126, y: 13.3 }, { x: 121, y: 15 }, { x: 116, y: 16.3 }, { x: 111, y: 17 }], 5);
/** The lower jaw's piece of the body (below the mouth line, from the corner to the front), and where it turns. */
const JAW_CORNER: Pt = MOUTH[MOUTH.length - 1]!;
const JAW_FRONT: Pt = MOUTH[0]!;
const JAW_CLIP: readonly Pt[] = [...MOUTH.map((p) => ({ x: p.x, y: p.y - 0.7 })), { x: JAW_CORNER.x - 7, y: 60 }, { x: JAW_FRONT.x + 0.5, y: 60 }];
const JAW_CUT: readonly Pt[] = [...MOUTH, { x: JAW_CORNER.x - 7, y: 60 }, { x: JAW_FRONT.x + 0.5, y: 60 }];
const GILLS = [84, 79, 74, 69, 64] as const;

/** The pectoral fin, its root at 0,0 pointing +x: long, narrow, sickle-shaped. */
const PECTORAL: readonly Pt[] = smoothLoop([
  { x: -3, y: -6.5 }, { x: 10, y: -8 }, { x: 24, y: -8.4 }, { x: 38, y: -7 }, { x: 52, y: -4 }, { x: 63, y: 0 }, { x: 71, y: 3.8 },
  { x: 77, y: 7.2 }, { x: 73.5, y: 7.6 }, { x: 64, y: 5.6 }, { x: 52, y: 4 }, { x: 40, y: 4.2 }, { x: 28, y: 5.6 }, { x: 16, y: 7.2 },
  { x: 4, y: 8 }, { x: -3, y: 7 },
], 4);
const PEC_NEAR: Pt = T({ x: 58, y: 16.5 });
const PEC_FAR: Pt = T({ x: 50, y: 15 });

// ---------------------------------------------------------------- ink

const INDIGO = '#2f3b3a';
const COBALT = '#7f9a96';
const SHEEN = '#e6efe9';
const DARK = '#12181a';
const COOL = '#8a9a90';
const SHADOW = '#1c2a2a';
const BAR = '#161d1d';

function blueStops(x: number): Stops {
  const t = topAt(x);
  const l = Math.max(0.3, Math.min(0.9, (lineAt(x) - t) / Math.max(1, bottomAt(x) - t)));
  return [
    [0, INDIGO], [l * 0.3, '#44544f'], [l * 0.62, '#62786f'], [l * 0.86, COBALT], [l - 0.03, '#a3b8ae'],
    [l + 0.012, '#f4efdc'], [Math.min(1, l + 0.25), '#efe8cf'], [1, '#d3c9ac'],
  ];
}

// ---------------------------------------------------------------- painting

/** A fin washed indigo, lit along its leading edge, darker to its trailing edge, ruled with fine lines from its root. */
function paintFin(k: Brush, shape: readonly Pt[], root: Pt, tip: Pt, outline = true): void {
  const { pen, ctx } = k;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    ctx.save();
    ctx.translate(px(k, 0.8), px(k, 0.8));
    pen.fill(shape, '#4a5a53', 1);
    ctx.restore();
    const g = ctx.createLinearGradient(root.x, root.y, tip.x, tip.y);
    g.addColorStop(0, 'rgba(150,160,170,0.35)');
    g.addColorStop(0.6, 'rgba(80,88,98,0)');
    g.addColorStop(1, 'rgba(8,10,12,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(-200, -100, 400, 200);
    for (let i = 0; i < 9; i++) {
      const u = i / 8;
      const to = { x: tip.x + (root.x - tip.x) * 0.1 + (u - 0.5) * 18, y: tip.y + (u - 0.5) * 14 };
      pen.hair([root, to], px(k, 0.7), DARK, 0.15 + 0.15 * u);
    }
  });
  if (outline) pen.stroke(shape, px(k, 1.4), INK, 1, true);
}

/** The tall fins on the back: rays from the foot, the light up the leading edge, the trailing edge in shadow. */
function paintDorsals(k: Brush): void {
  const { pen, ctx } = k;
  for (const [fin, foot0, foot1] of [[DORSAL, -4, -45], [SECOND_DORSAL, -72, -90]] as const) {
    const apex = fin.reduce((a, p) => (p.y < a.y ? p : a));
    const shape = [...fin, { x: foot1, y: 0 }, { x: foot0, y: 0 }];
    pen.clipped(shape, () => {
      for (let i = 0; i < 10; i++) {
        const u = i / 9;
        const foot = { x: foot0 + (foot1 - foot0) * u, y: topAt(foot0 + (foot1 - foot0) * u) };
        pen.hair([foot, { x: apex.x + u * 2, y: apex.y + 3 + u * 6 }], px(k, 0.7), u < 0.3 ? SHEEN : DARK, u < 0.3 ? 0.3 : 0.15 + 0.25 * u);
      }
      softLine(ctx, fin.filter((p) => p.x < apex.x), 5, '#07090b', 0.35);
      softLine(ctx, fin.filter((p) => p.x >= apex.x), 3, '#a9b3ba', 0.3);
    });
  }
}

function paintBlue(k: Brush): void {
  const { pen, ctx } = k;
  ctx.save();
  ctx.translate(px(k, 1.1), px(k, 1.3));
  columnWash(ctx, -124, 166, 1, topAt, bottomAt, blueStops, 50);
  ctx.restore();
  // Light from above along the back, broken; the cobalt glowing just over the line; the belly cooling to its underside.
  softLine(ctx, along(0.1, 141, -110), 7, '#d8dedf', 0.26);
  for (let r = 0; r < 10; r++) {
    const v = 0.03 + (0.28 * (r + pen.rng() * 0.7)) / 10;
    let x = 148 - pen.rng() * 30;
    while (x > -110) {
      const end = Math.max(-112, x - 10 - pen.rng() * 40);
      pen.hair(along(v, x, end, 3), px(k, 0.9 + pen.rng() * 0.6), SHEEN, 0.3 * (1 - v / 0.34));
      x = end - 4 - pen.rng() * 18;
    }
  }
  paintBars(k);
  softLine(ctx, LINE.map((p) => ({ x: p.x, y: p.y - 2.2 })), 4, '#b3c4ba', 0.3);
  softLine(ctx, along(0.42, 100, -100), 9, '#0c1014', 0.12);
  pen.stipple(BODY, 1300, (x, y) => 0.5 * Math.max(0, 1 - (y - topAt(x)) / 14), px(k, 0.7), 'rgba(225,230,230,0.5)');
  // The lateral line, faint.
  pen.hair(along(0.36, 96, -110, 5), px(k, 0.8), '#b5bfc2', 0.18);
  // The white belly: cool shade toward its underside, fine lines along it.
  for (let r = 1; r <= 3; r++) pen.hair(along(1 - r * 0.05, 120, -90, 5), px(k, 0.7), COOL, 0.16 - r * 0.03);
  softLine(ctx, along(0.985, 130, -100), 4, '#aaa595', 0.35);
  // The line itself: drawn with the pen, sharp but soft.
  pen.hair(LINE.filter((p) => p.x < 138), px(k, 1), DARK, 0.35);
  paintHeadForm(k);
}

/**
 * The head as a rounded wedge lit from above: the light along the crown, the
 * blunt front of the snout turning away into shadow, the cheek darkening
 * where it turns under towards the mouth, the underside of the snout cool.
 */
function paintHeadForm(k: Brush): void {
  const { ctx } = k;
  const front = [...[...BACK].reverse().filter((p) => p.x > 134), ...BELLY.filter((p) => p.x > 132)];
  softLine(ctx, front.map((p) => ({ x: p.x - 2.2, y: p.y })), 5, '#0c1014', 0.22);
  softLine(ctx, along(0.06, 139, 96, 2), 4, '#e3ebe6', 0.3);
  softLine(ctx, LINE.filter((p) => p.x < 136 && p.x > 100).map((p) => ({ x: p.x, y: p.y - 3.6 })), 6, '#0c1014', 0.14);
  softLine(ctx, BELLY.filter((p) => p.x > 112 && p.x < 142).map((p) => ({ x: p.x, y: p.y - 1.2 })), 3, '#8f9688', 0.35);
}

/**
 * The tiger bars: dark, wavering, tapering stripes from the back down the
 * flank, laid on twice a little out of register (the way a wash goes on),
 * strong and close at the head and shoulders, fainter and wider apart
 * towards the tail, gone before the belly; a few dark spots on the snout.
 */
function paintBars(k: Brush): void {
  const { pen, ctx } = k;
  let x = 100;
  let i = 0;
  while (x > -112) {
    const fade = Math.max(0, Math.min(1, (x + 118) / 190));
    const strength = 0.2 + 0.55 * fade;
    const top = topAt(x) - 3;
    const reach = bottomAt(x) * (0.2 + 0.4 * fade) + topAt(x) * (0.3 - 0.1 * fade) + 6 * Math.sin(i * 1.9);
    const half = (1.5 + 1.6 * fade) * (0.8 + 0.4 * Math.abs(Math.sin(i * 2.7)));
    const wob = pen.rng() * Math.PI * 2;
    const lean = -1 - 4 * (1 - fade) + 2 * Math.sin(i);
    const left: Pt[] = [];
    const right: Pt[] = [];
    const n = 9;
    for (let j = 0; j <= n; j++) {
      const f = j / n;
      const y = top + (reach - top) * f;
      const cx = x + lean * f + 1.1 * Math.sin(wob + f * 6);
      const w = half * (1 - 0.7 * f) * (0.85 + 0.3 * Math.sin(wob * 1.7 + f * 8));
      left.push({ x: cx - w, y });
      right.push({ x: cx + w, y });
    }
    const shape = [...left, ...right.reverse()];
    for (const [dx, dy, a] of [[0, 0, 1], [px(k, 0.9), px(k, 0.6), 0.4]] as const) {
      ctx.save();
      ctx.translate(dx, dy);
      const g = ctx.createLinearGradient(0, top, 0, reach);
      g.addColorStop(0, `rgba(22,29,29,${(strength * a).toFixed(3)})`);
      g.addColorStop(0.6, `rgba(22,29,29,${(strength * a * 0.65).toFixed(3)})`);
      g.addColorStop(1, 'rgba(22,29,29,0)');
      ctx.fillStyle = g;
      path(ctx, shape);
      ctx.fill();
      ctx.restore();
    }
    x -= (13 + 11 * (1 - fade)) * (0.85 + 0.3 * pen.rng());
    i += 1;
  }
  // On the head the bars break into dark mottled blotches, fading towards the snout.
  for (let j = 0; j < 34; j++) {
    const u = pen.rng();
    const sx = 92 + u * 44;
    const sy = topAt(sx) + (lineAt(sx) - topAt(sx)) * (0.06 + 0.6 * pen.rng());
    const fadeOut = 1 - 0.75 * u;
    const r = (0.5 + pen.rng() * 0.9) * (1.1 - 0.5 * u);
    pen.dot(sx, sy, r, BAR, 0.32 * fadeOut);
    if (pen.rng() < 0.5) pen.dot(sx + r * 0.9, sy + r * 0.3, r * 0.7, BAR, 0.24 * fadeOut);
  }
}

function paintGills(k: Brush): void {
  const { pen } = k;
  for (const x of GILLS) {
    const [top, bottom] = [topAt(x) * 0.42, bottomAt(x) * 0.48];
    const slit = baseSpline([{ x: x + 2.2, y: top }, { x: x - 0.4, y: top * 0.4 }, { x: x - 0.6, y: bottom * 0.4 }, { x: x + 1.4, y: bottom }], 6);
    pen.fill([...slit, ...[...slit].reverse().map((p, i, all) => ({ x: p.x - 1.4 * Math.sin((Math.PI * i) / (all.length - 1)), y: p.y }))], DARK, 0.4);
    pen.stroke(slit, px(k, 1.2), INK, 0.9, false);
    pen.hair(slit.slice(2, -2).map((p) => ({ x: p.x - 1.7, y: p.y })), px(k, 0.9), SHEEN, 0.35);
  }
}

/** The snout: rows of pores (the shark's electric sense) and the nostril slit on its underside, near the tip. */
function paintSnout(k: Brush): void {
  const { pen } = k;
  pen.clipped(BODY, () => {
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 7; i++) {
        const x = 140.5 - row * 1.4 - i * 2.3 - pen.rng() * 1.8;
        const y = topAt(x) + (lineAt(x) - topAt(x)) * (0.45 + row * 0.16) + (pen.rng() - 0.5) * 2.2;
        pen.dot(x, y, px(k, 0.7), DARK, 0.45);
      }
    }
  });
  const nostril = ospline([{ x: 139.4, y: 7.3 }, { x: 137.2, y: 8.2 }, { x: 134.6, y: 8.9 }], 3);
  pen.fill([...nostril, ...[...nostril].reverse().map((p, i, all) => ({ x: p.x, y: p.y + 0.7 * Math.sin((Math.PI * i) / (all.length - 1)) }))], DARK, 0.6);
  pen.stroke(nostril, px(k, 1.1), INK, 0.85, false);
}

/** The tail's point runs on inside the caudal fin: wash over its edge there, ramping in, so no paper shows. */
function hideTailEdge(k: Brush): void {
  const { ctx } = k;
  ctx.save();
  path(ctx, BODY);
  ctx.clip();
  ctx.fillStyle = '#4a5a53';
  for (let x = -96; x > -126; x -= 0.6) {
    ctx.globalAlpha = Math.min(1, (-96 - x) / 12);
    ctx.fillRect(x - 0.6, -20, 0.7, 40);
  }
  ctx.restore();
}

function paintBody(k: Brush): void {
  const { pen } = k;
  paintFin(k, CAUDAL, { x: -100, y: 0 }, { x: -165, y: -42 });
  pen.clipped(CAUDAL, () => pen.stroke(CAUDAL.slice(26, 70).map((p) => ({ x: p.x + 1.4, y: p.y })), px(k, 4), DARK, 0.3, false));
  paintFin(k, ANAL, { x: -78, y: 7 }, { x: -82, y: 17 });
  paintFin(k, PELVIC, { x: -44, y: 15 }, { x: -50, y: 26 });
  pen.fill(BODY, PAPER_FILL, 1);
  pen.clipped(BODY, () => {
    paintBlue(k);
    paintDorsals(k);
  });
  hideTailEdge(k);
  paintGills(k);
  paintSnout(k);
  pen.stroke(TOPLINE.filter((p) => p.x > -96), px(k, 1.5), INK, 1, true);
  pen.stroke(BELLY.filter((p) => p.x > -96), px(k, 2.2), INK, 1, true);
  // The keel along the tail stock.
  pen.hair(spline([{ x: -92, y: 0.5 }, { x: -104, y: 0.2 }, { x: -116, y: 0 }], 3), px(k, 1), DARK, 0.5);
}

function paintPectoral(k: Brush, far: boolean): void {
  const { pen, ctx } = k;
  pen.fill(PECTORAL, PAPER_FILL, 1);
  pen.clipped(PECTORAL, () => {
    ctx.save();
    ctx.translate(px(k, 0.7), px(k, 0.7));
    shade(ctx, PECTORAL, -11, 11, [[0, '#74857c'], [0.45, '#52625a'], [1, '#2e3a36']]);
    ctx.restore();
    const g = ctx.createLinearGradient(0, 0, 78, 0);
    g.addColorStop(0, 'rgba(8,10,12,0)');
    g.addColorStop(0.6, 'rgba(8,10,12,0.1)');
    g.addColorStop(1, 'rgba(8,10,12,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -12, 95, 24);
    for (let i = 0; i < 8; i++) {
      const u = i / 7;
      pen.hair(spline([{ x: 0, y: -5 + u * 11 }, { x: 36, y: -5 + u * 9 }, { x: 72, y: 2 + u * 4.5 }], 5), px(k, 0.7), DARK, 0.18);
    }
    softLine(ctx, [{ x: 4, y: -6 }, { x: 30, y: -7.2 }, { x: 56, y: -3.4 }, { x: 72, y: 3.6 }], 3, '#bcc6cc', 0.4);
    pen.hair([{ x: 10, y: -7.4 }, { x: 36, y: -7.4 }, { x: 60, y: -2.6 }], px(k, 1.2), SHEEN, 0.5);
    if (far) {
      ctx.fillStyle = 'rgba(6,8,10,0.4)';
      ctx.fillRect(-10, -12, 95, 24);
    }
  });
  pen.stroke(PECTORAL.slice(3, PECTORAL.length - 3), px(k, far ? 1.2 : 1.6), INK, 1, true);
}

/** The dark set: the same shapes as one deep shadow, faintly lit along the back. */
function paintShadowBody(k: Brush): void {
  const { pen, ctx } = k;
  for (const shape of [CAUDAL, ANAL, PELVIC, BODY]) {
    pen.fill(shape, SHADOW, 0.97);
    shade(ctx, shape, -68, 40, [[0, 'rgba(90,100,95,0.35)'], [0.5, 'rgba(90,100,95,0)'], [1, 'rgba(4,8,16,0.4)']]);
  }
  pen.stroke(TOPLINE.filter((p) => p.x > -96), px(k, 1.2), '#0a1220', 0.5, false);
}
function paintShadowPectoral(k: Brush): void {
  k.pen.fill(PECTORAL, SHADOW, 0.97);
  shade(k.ctx, PECTORAL, -11, 11, [[0, 'rgba(90,100,95,0.25)'], [1, 'rgba(4,8,16,0.35)']]);
}

// ---------------------------------------------------------------- sprites

const BODY_BOX: Box = { x0: -176, x1: 160, y0: -76, y1: 52 };
const JAW_BOX: Box = { x0: 96, x1: 150, y0: 0, y1: 52 };
const PEC_BOX: Box = { x0: -5, x1: 80, y0: -16, y1: 16 };

interface Sprites {
  readonly res: number;
  readonly body: readonly HTMLCanvasElement[];
  readonly jaw: readonly HTMLCanvasElement[];
  readonly near: readonly HTMLCanvasElement[];
  readonly far: readonly HTMLCanvasElement[];
}

/** Paints the whole body but only the upper head and the rest (`rest`) or only the lower jaw. */
function clipped(k: Brush, rest: boolean, paint: (k: Brush) => void): void {
  const { ctx } = k;
  ctx.save();
  ctx.beginPath();
  if (rest) {
    ctx.rect(-400, -300, 800, 600);
    JAW_CUT.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.clip('evenodd');
  } else {
    JAW_CLIP.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.clip();
  }
  paint(k);
  ctx.restore();
}

const SEED = 9131;
const spritesFor = lazily((b: Bucket): Sprites => ({
  res: b.res,
  body: frames(BODY_BOX, b, SEED, (k) => clipped(k, true, paintBody)),
  jaw: frames(JAW_BOX, b, SEED, (k) => clipped(k, false, paintBody)),
  near: frames(PEC_BOX, b, SEED + 13, (k) => paintPectoral(k, false)),
  far: frames(PEC_BOX, b, SEED + 17, (k) => paintPectoral(k, true)),
}));
const shadowsFor = lazily((b: Bucket): Sprites => ({
  res: b.res,
  body: frames(BODY_BOX, b, SEED + 3, (k) => clipped(k, true, paintShadowBody)),
  jaw: frames(JAW_BOX, b, SEED + 3, (k) => clipped(k, false, paintShadowBody)),
  near: frames(PEC_BOX, b, SEED + 5, paintShadowPectoral),
  far: frames(PEC_BOX, b, SEED + 7, paintShadowPectoral),
}));

// ---------------------------------------------------------------- on screen

/** The rear body's bend for a struggle (as the short's poses give it) and the tail's beat. */
const BEND_FROM = 60;
const BEND_K = 1;
const WAG_FROM = -10;
const WAG_TO = -172;
const WAG = 7;

/** The tail fin turns as one piece from here back, carried on the bent stock. */
const RIGID_FROM = -102;

function curveAt(x: number, bend: number, beat: number): number {
  const b = Math.max(0, Math.min(1, (x - WAG_FROM) / (WAG_TO - WAG_FROM)));
  return (BEND_K * bend * Math.max(0, BEND_FROM - x) ** 2) / 200 + WAG * b * b * Math.sin(beat - 2.6 * b);
}

function bentAt(x: number, bend: number, beat: number): number {
  if (x >= RIGID_FROM) return curveAt(x, bend, beat);
  const at = curveAt(RIGID_FROM, bend, beat);
  const slope = at - curveAt(RIGID_FROM + 1, bend, beat);
  return at + slope * (RIGID_FROM - x);
}

/** The body: the head as it is, the rest in thin columns, each moved onto the bent midline and turned with it. */
function drawBent(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, res: number, scale: number, bend: number, beat: number): void {
  const box = BODY_BOX;
  const k = 1 / res;
  const split = Math.round((BEND_FROM - box.x0) * res);
  ctx.drawImage(c, split, 0, c.width - split, c.height, box.x0 + split * k, box.y0, (c.width - split) * k, c.height * k);
  const step = Math.max(2, Math.round((2.5 * res) / scale));
  const overlap = 0.7 / scale;
  for (let sx = 0; sx < split; sx += step) {
    const w = Math.min(step, split - sx);
    const x = box.x0 + (sx + w / 2) * k;
    const dy = bentAt(x, bend, beat);
    const slope = bentAt(x + 0.5, bend, beat) - bentAt(x - 0.5, bend, beat);
    if (Math.abs(dy) < 1e-3 && Math.abs(slope) < 1e-4) {
      ctx.drawImage(c, sx, 0, w, c.height, box.x0 + sx * k - overlap, box.y0, w * k + 2 * overlap, c.height * k);
      continue;
    }
    ctx.save();
    ctx.translate(x, dy);
    ctx.rotate(Math.atan(slope));
    ctx.drawImage(c, sx, 0, w, c.height, -(w * k) / 2 - overlap, box.y0, w * k + 2 * overlap, c.height * k);
    ctx.restore();
  }
}

function fin(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, res: number, root: Pt, angle: number, stretch = 1): void {
  ctx.save();
  ctx.translate(root.x, root.y);
  ctx.rotate(angle);
  ctx.scale(stretch, 1);
  blit(ctx, c, PEC_BOX, res);
  ctx.restore();
}

/** The eye, live: big, round and dark, a catchlight; `fear` widens it, `lid` (0 open .. 1 shut) drops the lid over it. */
function drawEye(ctx: CanvasRenderingContext2D, fear: number, lid: number, lw: number): void {
  const { x, y } = SHARK_EYE;
  const r = EYE_R * (1 + 0.28 * fear);
  const socket = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 2.4);
  socket.addColorStop(0, 'rgba(10,18,18,0.4)');
  socket.addColorStop(1, 'rgba(10,18,18,0)');
  ctx.fillStyle = socket;
  ctx.fillRect(x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(x - r * 0.1, y + r * 0.45, 0.2, x, y, r);
  g.addColorStop(0, '#4a4f42');
  g.addColorStop(0.55, '#10171a');
  g.addColorStop(1, '#030506');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.05, y, r * (0.42 - 0.12 * fear), r * (0.62 - 0.1 * fear), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(190,200,160,0.3)';
  ctx.lineWidth = 0.9 * lw;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.3, y - r * 0.36, r * (0.17 + 0.06 * fear), r * (0.14 + 0.05 * fear), -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(x - r * 0.36, y + r * 0.38, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  // The lid: skin-coloured, coming down from the top over the eye.
  const drop = Math.max(0, Math.min(1, lid));
  if (drop > 0.01) {
    const edge = y - r + 2 * r * drop;
    const lg = ctx.createLinearGradient(0, y - r, 0, edge);
    lg.addColorStop(0, '#3b4a45');
    lg.addColorStop(1, '#566a62');
    ctx.fillStyle = lg;
    ctx.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, edge - (y - r * 1.2));
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.1 * lw;
    ctx.beginPath();
    ctx.moveTo(x - r, edge - r * 0.06);
    ctx.quadraticCurveTo(x, edge + r * 0.22, x + r, edge - r * 0.1);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2 * lw;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(200,225,205,0.22)';
  ctx.beginPath();
  ctx.arc(x, y, r + 0.9 * lw, 0.3, Math.PI - 0.3);
  ctx.stroke();
  ctx.restore();
  // The brow ridge over the eye.
  const lift = fear * r * 0.35;
  const ridge = curve({ x: x - r * 1.8, y: y - r * 1.05 }, { x: x - r * 0.1, y: y - r * 1.6 - lift }, { x: x + r * 1.5, y: y - r * 1.25 - lift * 0.6 }, 10);
  taper(ctx, ridge.map((p) => ({ x: p.x, y: p.y - 1 })), 2 * lw, 0.5 * lw, '#d5e0d6', 0.3);
  taper(ctx, ridge, 1.1 * lw, 0.4 * lw, INK, 0.3 + 0.15 * fear);
}

/**
 * A tiger shark's tooth, cockscomb-shaped: a broad base, the cusp hooked
 * over to one side with a deep notch behind it, the edges saw-cut. Base centre
 * at x,y, the tip `h` along -y before turning by `rot`; `back` (0 .. 1) sets it
 * deeper in the mouth (smaller, darker).
 */
function tooth(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number, w: number, h: number, lw: number, back = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(-w * 0.38, -h * 0.3);
  ctx.lineTo(-w * 0.3, -h * 0.34);
  ctx.lineTo(-w * 0.2, -h * 0.62);
  ctx.lineTo(-w * 0.1, -h * 0.66);
  ctx.lineTo(w * 0.02, -h * 0.9);
  ctx.lineTo(w * 0.16, -h);
  ctx.lineTo(w * 0.14, -h * 0.7);
  ctx.lineTo(w * 0.2, -h * 0.4);
  ctx.lineTo(w * 0.3, -h * 0.44);
  ctx.lineTo(w * 0.4, -h * 0.26);
  ctx.lineTo(w / 2, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, -h);
  g.addColorStop(0, back > 0.5 ? '#8f8775' : '#cfc7aa');
  g.addColorStop(1, back > 0.5 ? '#c9c2ae' : '#fbf8ec');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = `rgba(27,26,31,${back > 0.5 ? 0.5 : 0.8})`;
  ctx.lineWidth = 0.55 * lw;
  ctx.stroke();
  ctx.restore();
}

/** Where the lower jaw's mouth line is when open by `a` radians (turned about the corner). */
function jawLine(a: number): Pt[] {
  return MOUTH.map((p) => turn(p, JAW_CORNER, a));
}

/** How far the upper jaw slides out from under the snout, wide open: sharks throw the upper jaw forward and down to bite. */
const PROTRUDE: Pt = { x: 1.8, y: 2.4 };
const OPEN_MAX = 1.2;

/** The upper jaw's biting edge when the mouth is open by `a`: slid forward and down from under the snout, more at the front. */
function upperLine(a: number): Pt[] {
  const u = Math.max(0, Math.min(1, a / OPEN_MAX));
  const n = MOUTH.length - 1;
  return MOUTH.map((p, i) => {
    const f = 1 - (0.75 * i) / n;
    return { x: p.x + PROTRUDE.x * u * f, y: p.y + PROTRUDE.y * u * f };
  });
}

/** The inside of the mouth: dark at the back, pinkish towards the lips, the floor a paler pink, the gill arches dark in the throat. */
function drawInside(ctx: CanvasRenderingContext2D, a: number): void {
  const lower = jawLine(a);
  const upper = upperLine(a);
  const shape = [...upper, ...[...lower].reverse()];
  ctx.save();
  path(ctx, shape);
  const g = ctx.createRadialGradient(JAW_CORNER.x + 2, JAW_CORNER.y + 2, 1, JAW_CORNER.x + 8, JAW_CORNER.y + 5, 30);
  g.addColorStop(0, '#120508');
  g.addColorStop(0.45, '#3a1419');
  g.addColorStop(1, '#94504c');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // The gill arches, dark bands across the throat.
  ctx.lineCap = 'round';
  const n = MOUTH.length - 1;
  for (let j = 0; j < 3; j++) {
    const i = n - 2 - j * 3;
    const top = upper[i]!;
    const bottom = lower[i]!;
    ctx.strokeStyle = `rgba(8,2,4,${0.55 - 0.12 * j})`;
    ctx.lineWidth = 1.6 - 0.3 * j;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y + 1);
    ctx.quadraticCurveTo((top.x + bottom.x) / 2 - 3, (top.y + bottom.y) / 2, bottom.x, bottom.y - 1);
    ctx.stroke();
  }
  // The floor of the mouth along the lower jaw, a paler pink gum.
  ctx.strokeStyle = 'rgba(176,104,102,0.85)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  lower.forEach((p, i) => {
    const d = { x: p.x - JAW_CORNER.x, y: p.y - JAW_CORNER.y };
    const len = Math.hypot(d.x, d.y) || 1;
    const at = { x: p.x + (d.y / len) * 1.4, y: p.y - (d.x / len) * 1.4 };
    if (i) ctx.lineTo(at.x, at.y);
    else ctx.moveTo(at.x, at.y);
  });
  ctx.stroke();
  ctx.restore();
}

/**
 * The jaws' teeth: the upper jaw (slid out from under the snout, a pink gum
 * band showing above its row) and the lower jaw, each a front row of broad
 * serrated teeth with a smaller, darker row behind it.
 */
function drawTeeth(ctx: CanvasRenderingContext2D, a: number, lw: number): void {
  const lower = jawLine(a);
  const upper = upperLine(a);
  const n = MOUTH.length;
  // The upper jaw's gum, between the lip under the snout and the slid-out biting edge.
  const gum = [...MOUTH, ...[...upper].reverse().map((p) => ({ x: p.x, y: p.y + 0.6 }))];
  ctx.save();
  path(ctx, gum);
  const gg = ctx.createLinearGradient(0, MOUTH_FRONT.y, 0, MOUTH_FRONT.y + PROTRUDE.y + 1);
  gg.addColorStop(0, '#7a3c3c');
  gg.addColorStop(1, '#b8706b');
  ctx.fillStyle = gg;
  ctx.fill();
  ctx.restore();
  taper(ctx, upper.map((p) => ({ x: p.x, y: p.y + 0.6 })), 0.6 * lw, 1.2 * lw, INK, 0.6);
  for (let i = 2; i < n - 1; i += 2) {
    const p = lower[i]!;
    tooth(ctx, p.x - 0.6, p.y + 0.8, a - 0.35, 1.9, 1.7 - 0.4 * (i / (n - 1)), lw, 1);
  }
  for (let i = 2; i < n - 1; i += 2) {
    const p = upper[i]!;
    tooth(ctx, p.x - 0.7, p.y - 0.2, Math.PI + 0.45, 2, 2, lw, 1);
  }
  for (let i = 1; i < n - 1; i += 2) {
    const p = upper[i]!;
    const f = i / (n - 1);
    tooth(ctx, p.x, p.y + 0.5, Math.PI + 0.3, 2.7 - 0.5 * f, 3 - 0.9 * f, lw);
  }
  for (let i = 1; i < n - 1; i += 2) {
    const p = lower[i]!;
    const f = i / (n - 1);
    tooth(ctx, p.x, p.y - 0.1, a - 0.25, 2.5 - 0.4 * f, 2.6 - 0.7 * f, lw);
  }
}

/** The upper labial furrow: a long fold running forward from the corner of the mouth, just over the upper jaw. */
const UPPER_FURROW: readonly Pt[] = ospline([{ x: JAW_CORNER.x + 0.4, y: JAW_CORNER.y - 0.7 }, { x: 115.5, y: 15.1 }, { x: 120, y: 13.9 }, { x: 123.5, y: 13 }], 4);
/** The lower labial furrow: a short fold back from the corner. */
const LOWER_FURROW: readonly Pt[] = ospline([JAW_CORNER, { x: 109.4, y: 17.9 }, { x: 107.8, y: 18.3 }], 3);

/** The mouth on the underside of the head: a firm line (and the lower lip, turned open), the labial furrows at the corner. */
function drawMouth(ctx: CanvasRenderingContext2D, a: number, lw: number): void {
  taper(ctx, MOUTH, 1.3 * lw, 2.4 * lw, INK, 0.92);
  if (a > 0.02) {
    taper(ctx, jawLine(a), 1.2 * lw, 2.2 * lw, INK, 0.92);
  }
  taper(ctx, UPPER_FURROW.map((p) => ({ x: p.x, y: p.y - 0.7 })), 0.4 * lw, 1.2 * lw, '#dfe6df', 0.35);
  taper(ctx, UPPER_FURROW, 1.5 * lw, 0.4 * lw, '#3a4440', 0.7);
  taper(ctx, LOWER_FURROW, 1.4 * lw, 0.4 * lw, '#3a4440', 0.6);
}

/** The research tag on the dorsal fin: a bright orange pill with a hole, and its short lead into the fin. */
function drawTag(ctx: CanvasRenderingContext2D, size: number, lw: number): void {
  if (size <= 0.01) return;
  ctx.save();
  ctx.translate(-27, -43);
  ctx.rotate(-0.25);
  ctx.scale(size, size);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.8 * lw;
  ctx.beginPath();
  ctx.moveTo(-3, 1);
  ctx.lineTo(0, -1);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-3.3, -2.2, 6.6, 12, 2.6);
  const g = ctx.createLinearGradient(-3, 0, 3, 0);
  g.addColorStop(0, '#ff9a2e');
  g.addColorStop(0.55, '#ff7a14');
  g.addColorStop(1, '#c4500a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff4dc';
  ctx.beginPath();
  ctx.arc(0, 1.6, 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(-2.2, 3.6, 0.9, 4.4);
  ctx.restore();
}

/** The tiger shark, nose right in its own units, placed, turned and mirrored by `p` (its tail beating with `p.beat`). */
export function drawTigerShark(ctx: CanvasRenderingContext2D, p: Placed, look: SharkLook, boil: number): void {
  const k = p.len / UNITS;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.face, 1);
  ctx.rotate(p.rot);
  ctx.scale(k, k);
  const scale = screenScale(ctx);
  const lw = 1 / scale;
  const dark = (look.dark ?? 0) > 0.5;
  const b = bucketFor(scale);
  const s = dark ? shadowsFor(b) : spritesFor(b);
  const f = ((boil % BOIL_FRAMES) + BOIL_FRAMES) % BOIL_FRAMES;
  const fear = Math.max(0, Math.min(1, look.fear ?? 0));
  const gape = Math.max(0, Math.min(1, look.gape ?? 0));
  const open = 1.2 * gape;
  const paddle = 0.05 * Math.sin(p.beat * 0.5);
  fin(ctx, s.far[f]!, s.res, PEC_FAR, 2.62 - 0.2 * fear + paddle, 0.6);
  if (!dark && open > 0.02) {
    drawInside(ctx, open);
    look.inMouth?.(ctx);
  }
  // The lower jaw, turned open about the corner of the mouth.
  ctx.save();
  ctx.translate(JAW_CORNER.x, JAW_CORNER.y);
  ctx.rotate(open);
  ctx.translate(-JAW_CORNER.x, -JAW_CORNER.y);
  blit(ctx, s.jaw[f]!, JAW_BOX, s.res);
  ctx.restore();
  drawBent(ctx, s.body[f]!, s.res, scale, look.bend ?? 0, p.beat);
  if (!dark) {
    if (open > 0.02) drawTeeth(ctx, open, lw);
    drawMouth(ctx, open, lw);
    drawEye(ctx, fear, look.lid ?? (1 - fear) * 0.18, lw);
    drawTag(ctx, look.tag ?? 0, lw);
  }
  fin(ctx, s.near[f]!, s.res, PEC_NEAR, 2.3 - 0.32 * fear + paddle, 0.74);
  ctx.restore();
}

/** Bakes the size the short opens on. */
export function prepareTiger(): void {
  spritesFor(bucketFor(6.5));
}

/** Where the mouth is in the shark's own units: the corner (hinge) and the front of the lip. */
export const TIGER_MOUTH = { corner: JAW_CORNER, front: JAW_FRONT } as const;
