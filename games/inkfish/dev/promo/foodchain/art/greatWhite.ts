import { PAPER_FILL } from '../../../../src/art/fish/kit';
import { ellipse, INK, makeCanvas, Pen } from '../../../../src/art/pen';
import { BOIL_FPS, BOIL_FRAMES } from '../../../../src/art/textures';
import { type Pt, resample, spline } from '../../kraken/whale';
import type { KitEntry } from '../kit';
import { previewSea } from './orca';

/**
 * The great white shark in the game's pen and ink, painted like the sperm
 * whale in ../../kraken/whaleArt.ts: a torpedo with a conical snout, a slate
 * wash over paper on top, broken off along a ragged countershading line to a
 * white belly; the light from above along the back, hatching darkening the
 * flank just above the line, five long gill slits, the tall triangular dorsal
 * fin, long sickle pectorals and a crescent tail.
 *
 * Parts are separate sprites, so poses are cheap: the body, the lower jaw,
 * the upper row of broad serrated teeth on its pink gum (it slides forward
 * out from under the snout as the jaws open, like a real bite) and the lower
 * row of narrower teeth. The jaw turns about the corner of the mouth over the
 * dark inside (drawn live); the tail half bends column by column. The eye is
 * drawn live too, so it can widen when the shark is `worried` (a white
 * catchlight and a raised ridge over it). One canvas per line-boil frame,
 * baked lazily at three sizes.
 */

export interface GreatWhitePose {
  /** 0 shut .. 1 wide. */
  readonly jaw?: number;
  /** The tail beat's phase, radians (default: beating with time). */
  readonly tail?: number;
  /** 0 calm .. 1 worried: a bigger eye with a catchlight, the ridge over it raised. */
  readonly worried?: number;
}

// ---------------------------------------------------------------- shape (local px: snout at x 0, facing +x, y down)

/** Snout to the tip of the tail's upper lobe, local px; the middle of that is the centre `drawGreatWhite` places. */
const LEN = 1000;
const CENTRE: Pt = { x: -LEN / 2, y: 0 };

/** The back, from the tip of the snout to the tail stock (without the dorsal fin). */
const BACK: readonly Pt[] = spline([
  { x: 0, y: 8 }, { x: -6, y: -4 }, { x: -24, y: -24 }, { x: -60, y: -48 }, { x: -115, y: -70 }, { x: -190, y: -90 },
  { x: -280, y: -103 }, { x: -370, y: -106 }, { x: -460, y: -100 }, { x: -560, y: -84 }, { x: -650, y: -63 },
  { x: -730, y: -42 }, { x: -800, y: -27 }, { x: -860, y: -19 }, { x: -905, y: -1 },
], 6);

/** Under the cone of the snout, from its tip back to the front of the mouth. */
const SNOUT_UNDER: readonly Pt[] = spline([{ x: 0, y: 8 }, { x: -8, y: 21 }, { x: -26, y: 35 }, { x: -50, y: 44 }], 5);
/** The underside from the front of the lower jaw to the tail stock. */
const BELLY: readonly Pt[] = spline([
  { x: -50, y: 44 }, { x: -53, y: 55 }, { x: -64, y: 65 }, { x: -88, y: 75 }, { x: -130, y: 86 }, { x: -190, y: 95 },
  { x: -270, y: 101 }, { x: -370, y: 103 }, { x: -470, y: 95 }, { x: -570, y: 80 }, { x: -660, y: 60 },
  { x: -740, y: 41 }, { x: -805, y: 28 }, { x: -860, y: 19 }, { x: -905, y: 1 },
], 6);
const UNDERSIDE: readonly Pt[] = [...SNOUT_UNDER, ...BELLY.slice(1)];

/** The upper jaw's edge, from the front of the mouth under the snout back to its corner. */
const MOUTH: readonly Pt[] = spline([{ x: -50, y: 44 }, { x: -80, y: 50 }, { x: -112, y: 54 }, { x: -146, y: 56 }], 6);
const PIVOT: Pt = MOUTH[MOUTH.length - 1]!;
/** How far the jaw drops at most (radians), and how far the upper teeth slide out from under the snout (local px). */
const JAW_MAX = 0.62;
const PROTRUDE: Pt = { x: 5, y: 11 };
/** Where the lower jaw ends under the throat. */
const JAW_BACK_X = -186;

function edgeAt(line: readonly Pt[], x: number): number {
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    if ((a.x - x) * (b.x - x) <= 0) return a.y + ((b.y - a.y) * (x - a.x)) / ((b.x - a.x) || 1);
  }
  return line[line.length - 1]!.y;
}
const topAt = (x: number): number => edgeAt(BACK, x);
const bottomAt = (x: number): number => edgeAt(UNDERSIDE, x);

function turn(p: Pt, about: Pt, a: number): Pt {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = p.x - about.x;
  const dy = p.y - about.y;
  return { x: about.x + dx * c - dy * s, y: about.y + dx * s + dy * c };
}

/** The throat under the jaw: the lip turned down as far as the jaw opens, to the belly. Hidden by the jaw at every gape. */
const FOLD: readonly Pt[] = (() => {
  const out: Pt[] = [];
  for (const p of [...MOUTH].reverse()) {
    const q = turn(p, PIVOT, JAW_MAX);
    if (q.y >= bottomAt(q.x)) return [...out, { x: q.x, y: bottomAt(q.x) }];
    out.push(q);
  }
  return out;
})();
const FOLD_END = FOLD[FOLD.length - 1]!;

/** The tall dorsal fin: a convex leading edge to a sharp tip, a concave trailing edge. */
const DORSAL: readonly Pt[] = spline([
  { x: -296, y: -104 }, { x: -322, y: -152 }, { x: -352, y: -206 }, { x: -381, y: -246 }, { x: -398, y: -259 },
  { x: -400, y: -240 }, { x: -407, y: -196 }, { x: -421, y: -150 }, { x: -440, y: -117 }, { x: -462, y: -99 },
], 6);
/** The back with the dorsal fin standing on it, tail stock to snout. */
const TOPLINE: readonly Pt[] = [
  ...[...BACK].reverse().filter((p) => p.x < DORSAL[DORSAL.length - 1]!.x),
  ...[...DORSAL].reverse(),
  ...[...BACK].reverse().filter((p) => p.x > DORSAL[0]!.x),
];

/** The body without the lower jaw (the throat under it stays, for when the jaw drops). */
const BODY: readonly Pt[] = [
  ...SNOUT_UNDER, ...MOUTH.slice(1), ...FOLD.slice(1), ...BELLY.filter((p) => p.x < FOLD_END.x), ...TOPLINE.slice(0, -1),
];
/** Its inked edges (not the hidden fold, nor the tail's point inside the caudal fin). */
const INKED_BELLY: readonly Pt[] = BELLY.filter((p) => p.x < FOLD_END.x && p.x > -842);
const INKED_TOP: readonly Pt[] = [...TOPLINE.filter((p) => p.x > -842), ...SNOUT_UNDER.slice(1), ...MOUTH.slice(1)];

const JAW_BOTTOM: readonly Pt[] = BELLY.filter((p) => p.x > JAW_BACK_X);
const JAW_SHAPE: readonly Pt[] = [
  ...MOUTH,
  ...spline([PIVOT, { x: -166, y: 76 }, { x: JAW_BACK_X, y: bottomAt(JAW_BACK_X) }], 4).slice(1),
  ...[...JAW_BOTTOM].reverse(),
];

/** A little fixed raggedness, the same in every boil frame. */
const ragged = (x: number): number => 4 * Math.sin(x * 0.045) + 2.6 * Math.sin(x * 0.11 + 1.3) + 1.2 * Math.sin(x * 0.29 + 0.4);

/** The countershading line, snout to tail: the slate above breaks off sharply to the white below. */
const SHADE_LINE: readonly Pt[] = spline([
  { x: 2, y: 9 }, { x: -30, y: 19 }, { x: -70, y: 26 }, { x: -120, y: 31 }, { x: -170, y: 30 }, { x: -205, y: 38 },
  { x: -245, y: 30 }, { x: -295, y: 36 }, { x: -345, y: 24 }, { x: -405, y: 30 }, { x: -470, y: 18 }, { x: -540, y: 23 },
  { x: -610, y: 11 }, { x: -680, y: 14 }, { x: -750, y: 10 }, { x: -810, y: 16 }, { x: -860, y: 24 }, { x: -920, y: 34 },
], 6).map((p) => ({ x: p.x, y: p.y + ragged(p.x) * Math.min(1, -p.x / 60) }));
const SLATE_SIDE: readonly Pt[] = [...SHADE_LINE, { x: -1100, y: -500 }, { x: 100, y: -500 }];

const EYE: Pt = { x: -92, y: -6 };
const EYE_R = 7;

/** The near pectoral fin: long and sickle-shaped, low behind the gills. */
const PECTORAL: readonly Pt[] = spline([
  { x: -256, y: 58 }, { x: -276, y: 96 }, { x: -310, y: 140 }, { x: -356, y: 185 }, { x: -408, y: 218 },
  { x: -396, y: 198 }, { x: -373, y: 162 }, { x: -352, y: 122 }, { x: -336, y: 92 }, { x: -322, y: 72 }, { x: -256, y: 58 },
], 5);
const PELVIC: readonly Pt[] = spline([{ x: -598, y: 70 }, { x: -626, y: 92 }, { x: -660, y: 106 }, { x: -652, y: 84 }, { x: -640, y: 64 }], 4);
const SECOND_DORSAL: readonly Pt[] = spline([{ x: -752, y: -30 }, { x: -768, y: -52 }, { x: -786, y: -56 }, { x: -784, y: -38 }, { x: -796, y: -24 }], 3);
const ANAL: readonly Pt[] = spline([{ x: -752, y: 34 }, { x: -770, y: 54 }, { x: -788, y: 58 }, { x: -786, y: 40 }, { x: -798, y: 26 }], 3);

/** The crescent tail: the upper lobe a little longer than the lower. */
const CAUDAL: readonly Pt[] = spline([
  { x: -835, y: -20 }, { x: -872, y: -64 }, { x: -920, y: -128 }, { x: -968, y: -186 }, { x: -1000, y: -214 },
  { x: -982, y: -176 }, { x: -958, y: -116 }, { x: -936, y: -56 }, { x: -922, y: -6 }, { x: -930, y: 40 },
  { x: -950, y: 92 }, { x: -972, y: 152 }, { x: -936, y: 116 }, { x: -892, y: 66 }, { x: -858, y: 30 }, { x: -835, y: 20 },
], 5);

/** Gill slits: x where each crosses the middle, and its length. */
const GILLS: readonly { readonly x: number; readonly top: number; readonly bottom: number }[] = [
  { x: -182, top: -40, bottom: 52 }, { x: -201, top: -44, bottom: 56 }, { x: -220, top: -46, bottom: 58 },
  { x: -239, top: -46, bottom: 57 }, { x: -257, top: -44, bottom: 52 },
];

/** Where the tail's point starts to hide its paper edge inside the caudal fin. */
const TAIL_HIDE_FROM = -822;
const BEND_FROM = -520;
const BEND_TO = -1000;
const TAIL_WAG = 24;
const TAIL_HZ = 1.1;

// ---------------------------------------------------------------- ink

const SLATE = '#56636f';
const DARK = '#1c232b';
const SHEEN = '#e3eaf0';
const COOL = '#55687c';
const IVORY = '#f6f0de';
const GUM = '#a8646d';
const WOBBLE = 0.7;
const COOL_SHADE: readonly [number, string][] = [[0, 'rgba(85,104,124,0)'], [0.5, 'rgba(85,104,124,0.1)'], [1, 'rgba(85,104,124,0.5)']];

interface Brush {
  readonly ctx: CanvasRenderingContext2D;
  readonly pen: Pen;
  /** Line weight: thicker in the small sprites, so lines hold up small. */
  readonly w: number;
  /** Sprite px per local px. */
  readonly res: number;
}

function path(ctx: CanvasRenderingContext2D, shape: readonly Pt[]): void {
  ctx.beginPath();
  shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

function shade(ctx: CanvasRenderingContext2D, shape: readonly Pt[], y0: number, y1: number, stops: readonly (readonly [number, string])[]): void {
  ctx.save();
  path(ctx, shape);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  ctx.fillStyle = g;
  ctx.fillRect(-1100, -500, 1200, 1000);
  ctx.restore();
}

/** Paper, then the slate wash laid on a little off it, lit from above. */
function slateSkin(k: Brush, shape: readonly Pt[], y0: number, y1: number): void {
  const { pen, ctx } = k;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    ctx.translate(1.6, 1.3);
    pen.fill(shape, SLATE, 0.9);
  });
  shade(ctx, shape, y0, y1, [[0, 'rgba(227,234,240,0.24)'], [0.35, 'rgba(227,234,240,0)'], [1, 'rgba(12,16,22,0.42)']]);
}

/** A line along the body at `v` of the way down (0 the back, 1 the belly), from x0 back to x1. */
function contour(v: number, x0: number, x1: number, step = 14): Pt[] {
  const pts: Pt[] = [];
  for (let x = x0; x >= x1; x -= step) pts.push({ x, y: topAt(x) + (bottomAt(x) - topAt(x)) * v });
  return pts;
}

function dryBrush(k: Brush, v0: number, v1: number, rows: number, x0: number, x1: number, colour: string, alpha: (v: number) => number, width: number): void {
  const { pen } = k;
  for (let r = 0; r < rows; r++) {
    const v = v0 + ((v1 - v0) * (r + pen.rng() * 0.7)) / rows;
    let x = x0 - pen.rng() * 70;
    while (x > x1) {
      const end = Math.max(x1, x - 50 - pen.rng() * 170);
      pen.hair(contour(v, x, end), width * k.w, colour, alpha(v));
      x = end - 12 - pen.rng() * 60;
    }
  }
}

/** A fin washed slate, darkening to its trailing edge, ruled with fine lines from its root. */
function paintFin(k: Brush, shape: readonly Pt[], root: Pt, y0: number, y1: number, outline = true): void {
  const { pen } = k;
  slateSkin(k, shape, y0, y1);
  pen.clipped(shape, () => {
    const far = shape.reduce((a, p) => (Math.hypot(p.x - root.x, p.y - root.y) > Math.hypot(a.x - root.x, a.y - root.y) ? p : a));
    for (let i = 0; i < 10; i++) {
      const u = i / 9;
      const to = { x: far.x + (root.x - far.x) * 0.15 + (u - 0.5) * 60, y: far.y + (u - 0.5) * 40 };
      pen.hair([root, to], 0.7 * k.w, DARK, 0.18 + 0.2 * u);
    }
  });
  if (outline) pen.stroke(shape, 2.2 * k.w, INK, 1, true);
}

function paintBackFins(k: Brush): void {
  paintFin(k, CAUDAL, { x: -850, y: 0 }, -214, 152);
  const { pen } = k;
  pen.clipped(CAUDAL, () => {
    // The dark trailing edge of the crescent.
    pen.stroke(CAUDAL.slice(4, 13).map((p) => ({ x: p.x + 4, y: p.y })), 7 * k.w, DARK, 0.35, false);
  });
  paintFin(k, SECOND_DORSAL, { x: -770, y: -24 }, -60, -20);
  paintFin(k, ANAL, { x: -770, y: 30 }, 20, 60);
}

function paintSlate(k: Brush): void {
  const { pen, ctx } = k;
  pen.clipped(SLATE_SIDE, () => {
    ctx.translate(1.6, 1.3);
    pen.fill(BODY, SLATE, 0.9);
    ctx.translate(-1.6, -1.3);
    shade(ctx, BODY, -260, 40, [[0, 'rgba(227,234,240,0.3)'], [0.3, 'rgba(227,234,240,0.12)'], [0.6, 'rgba(227,234,240,0)'], [1, 'rgba(12,16,22,0.28)']]);
    dryBrush(k, 0.02, 0.3, 12, -20, -850, SHEEN, (v) => 0.38 * (1 - v / 0.34), 1.2);
    // Darkening into the countershading line, hatched along it.
    shade(ctx, SLATE_SIDE, -40, 40, [[0, 'rgba(12,16,22,0)'], [1, 'rgba(12,16,22,0.22)']]);
    pen.hair(SHADE_LINE.map((p) => ({ x: p.x, y: p.y - 3 })), 1.6 * k.w, DARK, 0.3);
    for (const lift of [42, 24]) {
      pen.clipped([...SHADE_LINE.map((p) => ({ x: p.x, y: p.y - lift })), ...[...SHADE_LINE].reverse()], () => pen.hatch(BODY, 8, -1.1, 0.7 * k.w, { color: DARK, alpha: 0.24 }));
    }
    pen.stipple(BODY, 1500, (_x, y) => 0.4 * Math.max(0, 1 - (y + 100) / 130), 0.6, 'rgba(227,234,240,0.5)');
    // Old pale scratches on the head and flank.
    for (let i = 0; i < 9; i++) {
      const x = -60 - pen.rng() * 420;
      const y = topAt(x) + 20 + pen.rng() * 60;
      const len = 18 + pen.rng() * 36;
      const a = -0.4 + pen.rng() * 0.8;
      pen.hair([{ x, y }, { x: x - Math.cos(a) * len, y: y + Math.sin(a) * len }], 0.8 * k.w, SHEEN, 0.35);
    }
  });
}

function paintWhite(k: Brush): void {
  const { pen, ctx } = k;
  pen.clipped(BODY, () => {
    shade(ctx, BODY, 0, 105, COOL_SHADE);
    for (let r = 1; r <= 8; r++) pen.hair(contour(1 - r * 0.03, -60, -860, 16), 0.85 * k.w, COOL, 0.45 - r * 0.045);
    pen.stipple(BODY, 700, (_x, y) => Math.max(0, (y - 60) / 50), 0.8, COOL);
  });
  pen.hair(SHADE_LINE, 1.2 * k.w, INK, 0.7);
}

function paintGills(k: Brush): void {
  const { pen } = k;
  for (const g of GILLS) {
    // A long curved slit: a dark crease, the flap behind it in shadow, the light on its edge.
    const slit = spline([{ x: g.x + 9, y: g.top }, { x: g.x - 2, y: g.top * 0.4 }, { x: g.x - 3, y: g.bottom * 0.4 }, { x: g.x + 5, y: g.bottom }], 6);
    pen.fill([...slit, ...[...slit].reverse().map((p, i, all) => ({ x: p.x - 4.5 * Math.sin((Math.PI * i) / (all.length - 1)), y: p.y }))], DARK, 0.35);
    pen.stroke(slit, 1.25 * k.w, INK, 0.95, false);
    pen.hair(slit.slice(2, -2).map((p) => ({ x: p.x - 5.5, y: p.y })), 0.9 * k.w, SHEEN, 0.32);
  }
}

/** The snout: pores (the shark's electric sense) and the nostril under the tip. */
function paintSnout(k: Brush): void {
  const { pen } = k;
  pen.clipped(BODY, () => {
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 9; i++) {
        const x = -10 - row * 5 - i * 8 - pen.rng() * 4;
        const y = topAt(x) + (bottomAt(x) - topAt(x)) * (0.38 + row * 0.12) + pen.rng() * 3;
        pen.dot(x, y, 0.55 + pen.rng() * 0.35, DARK, 0.45);
      }
    }
  });
  pen.stroke(spline([{ x: -14, y: 26 }, { x: -22, y: 30 }, { x: -32, y: 30 }], 3), 1.5 * k.w, INK, 1, false);
}

/** The tail's point runs on inside the caudal fin: wash over its edge there, ramping in, so no paper shows along it. */
function hideTailEdge(k: Brush, colour: string, alpha: number): void {
  const { ctx } = k;
  ctx.save();
  path(ctx, BODY);
  ctx.clip();
  ctx.fillStyle = colour;
  for (let x = TAIL_HIDE_FROM; x > TAIL_HIDE_FROM - 100; x -= 2) {
    ctx.globalAlpha = alpha * Math.min(1, (TAIL_HIDE_FROM - x) / 28);
    ctx.fillRect(x - 2, -60, 2.2, 120);
  }
  ctx.restore();
}

/** Fine lines up the dorsal fin from its foot, darker toward the trailing edge, with the light along its leading edge. */
function paintDorsal(k: Brush): void {
  const { pen } = k;
  const shape = [...DORSAL, { x: -462, y: -60 }, { x: -296, y: -60 }];
  const apex = DORSAL.reduce((a, p) => (p.y < a.y ? p : a));
  pen.clipped(shape, () => {
    for (let i = 0; i < 12; i++) {
      const u = i / 11;
      const foot = { x: -300 - u * 160, y: -100 };
      pen.hair([foot, { x: (foot.x + apex.x) / 2 - 4, y: (foot.y + apex.y) / 2 }, { x: apex.x + u * 4, y: apex.y + 10 + u * 20 }], 0.75 * k.w, u < 0.3 ? SHEEN : DARK, u < 0.3 ? 0.3 : 0.12 + 0.3 * u);
    }
  });
  // The trailing edge in shadow.
  const { ctx } = k;
  ctx.save();
  path(ctx, shape);
  ctx.clip();
  ctx.strokeStyle = 'rgba(28,35,43,0.22)';
  ctx.lineWidth = 12;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  DORSAL.filter((p) => p.x < apex.x).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

function paintBody(k: Brush): void {
  const { pen } = k;
  paintBackFins(k);
  pen.fill(BODY, PAPER_FILL, 1);
  paintSlate(k);
  paintDorsal(k);
  hideTailEdge(k, SLATE, 0.9);
  paintWhite(k);
  paintGills(k);
  paintSnout(k);
  pen.stroke(INKED_BELLY, 2.8 * k.w, INK, 1, true);
  pen.stroke(INKED_TOP, 2.8 * k.w, INK, 1, true);
  // The lateral keel along the tail stock.
  pen.hair(spline([{ x: -790, y: 2 }, { x: -840, y: 0 }, { x: -878, y: 0 }], 4), 1.2 * k.w, DARK, 0.6);
  paintFin(k, PELVIC, { x: -606, y: 70 }, 60, 110);
  paintFin(k, PECTORAL, { x: -290, y: 66 }, 50, 220);
  pen.clipped(PECTORAL, () => {
    // The dark tip and the pale trailing edge of the pectoral.
    pen.fill(ellipse(-405, 214, 36, 22, 14), DARK, 0.5);
    pen.hair(PECTORAL.slice(26, 48).map((p) => ({ x: p.x + 2, y: p.y - 2 })), 2 * k.w, SHEEN, 0.35);
  });
}

function paintJaw(k: Brush): void {
  const { pen, ctx } = k;
  pen.fill(JAW_SHAPE, PAPER_FILL, 1);
  shade(ctx, JAW_SHAPE, 0, 105, COOL_SHADE);
  pen.clipped(JAW_SHAPE, () => {
    for (let r = 1; r <= 8; r++) pen.hair(contour(1 - r * 0.03, -40, -200, 12), 0.85 * k.w, COOL, 0.45 - r * 0.045);
    pen.stipple(JAW_SHAPE, 160, (_x, y) => Math.max(0, (y - 60) / 40), 0.8, COOL);
    pen.fill([...MOUTH, ...[...MOUTH].reverse().map((p) => ({ x: p.x, y: p.y + 3.5 }))], '#3b3236', 0.6);
  });
  pen.stroke(MOUTH, 2 * k.w, INK, 1, false);
  pen.stroke(JAW_BOTTOM.filter((p) => p.x > -160), 2.6 * k.w, INK, 1, true);
}

/** A tooth on the lip at `base`, pointing `dir` (1 down, -1 up): a flat triangle with serrated edges. */
function tooth(k: Brush, base: Pt, dir: number, h: number, w: number, lean: number): void {
  const { pen } = k;
  const tip = { x: base.x + lean, y: base.y + dir * h };
  const edge = (from: Pt, out: number): Pt[] =>
    Array.from({ length: 9 }, (_, i) => {
      const u = i / 8;
      const bulge = Math.sin(Math.PI * u) * w * 0.12 * out;
      const saw = i % 2 && i < 8 ? 0.55 * out : 0;
      return { x: from.x + (tip.x - from.x) * u + bulge + saw, y: from.y + (tip.y - from.y) * u };
    });
  const left = edge({ x: base.x - w / 2, y: base.y }, -1);
  const right = edge({ x: base.x + w / 2, y: base.y }, 1);
  const shape = [{ x: base.x - w / 2, y: base.y - dir * 4 }, ...left, ...[...right].reverse(), { x: base.x + w / 2, y: base.y - dir * 4 }];
  pen.fill(shape, IVORY, 1);
  pen.fill([tip, ...right.slice(2, 7).reverse(), { x: base.x + w * 0.1, y: base.y }], '#d8ccb0', 0.6);
  pen.stroke(shape.slice(1, -1), 0.9 * k.w, INK, 1, false);
}

/** The upper teeth on their pink gum: broad serrated triangles, biggest at the front. */
function paintUpper(k: Brush): void {
  const { pen } = k;
  const pts = resample(MOUTH, 34);
  for (let i = 0; i < 11; i++) {
    const p = pts[2 + i * 3]!;
    const u = i / 10;
    tooth(k, { x: p.x, y: p.y + 1.5 }, 1, 15 - 6 * u, 11 - 3.5 * u, -1.5 - 2 * u);
  }
  // The gum over the roots, a fold of it catching the light.
  const gum = [...MOUTH.map((p) => ({ x: p.x, y: p.y - 16 })), ...[...MOUTH].reverse().map((p) => ({ x: p.x, y: p.y + 2 }))];
  pen.fill(gum, GUM, 1);
  shade(k.ctx, gum, 30, 58, [[0, 'rgba(60,20,28,0.55)'], [1, 'rgba(60,20,28,0)']]);
  pen.hair(MOUTH.map((p) => ({ x: p.x, y: p.y - 1 })), 1.2 * k.w, '#d9a0a6', 0.6);
  pen.hair(MOUTH.map((p) => ({ x: p.x, y: p.y + 2 })), 0.9 * k.w, INK, 0.7);
}

/** The lower teeth: narrower, sharper spikes. */
function paintLower(k: Brush): void {
  const pts = resample(MOUTH, 34);
  for (let i = 0; i < 10; i++) {
    const p = pts[3 + i * 3]!;
    const u = i / 9;
    tooth(k, { x: p.x, y: p.y - 1 }, -1, 13 - 5 * u, 6.5 - 1.5 * u, -1);
  }
}

// ---------------------------------------------------------------- sprites

interface Box { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number }
const BODY_BOX: Box = { x0: -1010, x1: 12, y0: -270, y1: 228 };
const JAW_BOX: Box = { x0: -200, x1: -40, y0: 30, y1: 110 };
const TEETH_BOX: Box = { x0: -160, x1: -36, y0: 18, y1: 80 };

interface Bucket { readonly res: number; readonly w: number }
const BUCKETS: readonly Bucket[] = [{ res: 0.45, w: 1.7 }, { res: 1.1, w: 1.2 }, { res: 2.5, w: 1 }];

interface Sprites {
  readonly res: number;
  readonly body: readonly HTMLCanvasElement[];
  readonly jaw: readonly HTMLCanvasElement[];
  readonly upper: readonly HTMLCanvasElement[];
  readonly lower: readonly HTMLCanvasElement[];
}

const seedOf = (f: number): number => 6301 + f * 977;

function sheet(box: Box, b: Bucket, seed: number, paint: (k: Brush) => void): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(Math.ceil((box.x1 - box.x0) * b.res), Math.ceil((box.y1 - box.y0) * b.res));
  ctx.scale(b.res, b.res);
  ctx.translate(-box.x0, -box.y0);
  paint({ ctx, pen: new Pen(ctx, seed, WOBBLE), w: b.w, res: b.res });
  return canvas;
}

function bake(b: Bucket): Sprites {
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => seedOf(f));
  return {
    res: b.res,
    body: frames.map((s) => sheet(BODY_BOX, b, s, paintBody)),
    jaw: frames.map((s) => sheet(JAW_BOX, b, s + 17, paintJaw)),
    upper: frames.map((s) => sheet(TEETH_BOX, b, s + 19, paintUpper)),
    lower: frames.map((s) => sheet(TEETH_BOX, b, s + 23, paintLower)),
  };
}

const baked = new Map<Bucket, Sprites>();
function spritesFor(b: Bucket): Sprites {
  const have = baked.get(b);
  if (have) return have;
  const made = bake(b);
  baked.set(b, made);
  return made;
}

function bucketFor(pxPerLocal: number): Bucket {
  return BUCKETS.find((b) => b.res >= pxPerLocal * 0.95) ?? BUCKETS[BUCKETS.length - 1]!;
}

/** Bakes the middle size (the others bake the first time they're needed). */
export async function prepare(): Promise<void> {
  spritesFor(BUCKETS[1]!);
}

// ---------------------------------------------------------------- on screen

function blit(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, box: Box, res: number): void {
  ctx.drawImage(c, box.x0, box.y0, c.width / res, c.height / res);
}

function drawBody(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, res: number, beat: number, scale: number): void {
  const box = BODY_BOX;
  const k = 1 / res;
  const split = Math.round((BEND_FROM - box.x0) * res);
  ctx.drawImage(c, split, 0, c.width - split, c.height, box.x0 + split * k, box.y0, (c.width - split) * k, c.height * k);
  const step = Math.max(2, Math.round((3 * res) / scale));
  for (let sx = 0; sx < split; sx += step) {
    const x = box.x0 + (sx + step / 2) * k;
    const b = Math.max(0, Math.min(1, (x - BEND_FROM) / (BEND_TO - BEND_FROM)));
    const dy = TAIL_WAG * b * b * Math.sin(beat - 2.6 * b);
    const w = Math.min(step, split - sx);
    ctx.drawImage(c, sx, 0, w, c.height, box.x0 + sx * k, box.y0 + dy, w * k + 1.2 / scale, c.height * k);
  }
}

/** The inside of the mouth: dark, a pink gum along the lower jaw, the tongue low down. */
function drawMouth(ctx: CanvasRenderingContext2D, open: number): void {
  if (open < 0.004) return;
  const lower = [...MOUTH].reverse().map((p) => turn(p, PIVOT, open));
  const upper = [...SNOUT_UNDER.slice(-3), ...MOUTH.slice(1)];
  const shape = [...upper, ...lower];
  ctx.save();
  path(ctx, shape);
  const g = ctx.createLinearGradient(PIVOT.x, 0, -50, 0);
  g.addColorStop(0, '#0d0507');
  g.addColorStop(1, '#3c1f26');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  const floor = turn({ x: -95, y: 52 }, PIVOT, open);
  ctx.fillStyle = 'rgba(140,72,84,0.8)';
  ctx.beginPath();
  ctx.ellipse(floor.x, floor.y, 38, 9, open, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(168,100,109,0.9)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  lower.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y - 2) : ctx.moveTo(p.x, p.y - 2)));
  ctx.stroke();
  ctx.restore();
  // The far lip across the front of the gape.
  const tip = lower[lower.length - 1]!;
  const top = upper[0]!;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.quadraticCurveTo(tip.x - 12, (top.y + tip.y) / 2, tip.x - 1, tip.y - 2);
  ctx.stroke();
  ctx.restore();
}

function drawJawPart(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, box: Box, res: number, open: number): void {
  ctx.save();
  ctx.translate(PIVOT.x, PIVOT.y);
  ctx.rotate(open);
  ctx.translate(-PIVOT.x, -PIVOT.y);
  blit(ctx, c, box, res);
  ctx.restore();
}

/** The eye, live so it can widen: black, a catchlight, the ridge over it raised when worried. */
function drawEye(ctx: CanvasRenderingContext2D, worried: number, frame: number, w: number): void {
  const pen = new Pen(ctx, 8807 + frame * 977, 0.35);
  const { x, y } = EYE;
  const r = EYE_R * (1 + 0.85 * worried);
  pen.fill(ellipse(x, y, r * 1.45, r * 1.2, 18), DARK, 0.35);
  if (worried > 0.01) pen.fill(ellipse(x, y, r * 1.2, r * 1.14, 18), '#eef1f3', worried);
  pen.fill(ellipse(x, y, r, r * 0.96, 18), '#050608', 1);
  pen.dot(x + r * 0.34, y - r * 0.36, r * (0.2 + 0.1 * worried), '#ffffff', 0.95);
  if (worried > 0.01) pen.dot(x - r * 0.32, y + r * 0.38, r * 0.09, '#ffffff', 0.7 * worried);
  pen.stroke([...ellipse(x, y, r * (1 + 0.2 * worried), r * (0.96 + 0.18 * worried), 18), { x: x + r * (1 + 0.2 * worried), y }], 1.1 * w, INK, 1, false);
  // The ridge over the eye: low and level when calm, its front end raised when worried.
  const lift = worried * EYE_R;
  const ridge = spline([
    { x: x - r * 2, y: y - r * 0.9 },
    { x: x - r * 0.2, y: y - r * 1.55 - lift * 1.1 },
    { x: x + r * 1.6, y: y - r * 1.25 - lift * 2.8 },
  ], 6);
  pen.hair(ridge.map((p) => ({ x: p.x, y: p.y - 2.5 })), 1.4 * w, SHEEN, 0.45 + 0.3 * worried);
  pen.stroke(ridge, (1.2 + 1.3 * worried) * w, INK, 0.55 + 0.45 * worried, false);
  if (worried > 0.01) pen.hair(ridge.slice(4).map((p) => ({ x: p.x + 1, y: p.y - r * 0.55 })), 1 * w, INK, 0.6 * worried);
}

/**
 * Draws the great white with its snout at +x of its local frame: centre
 * (x, y) in screen px, `length` = snout to tail tip in screen px, `angle`
 * radians, `flip` mirrors vertically for leftward swimming, `t` seconds
 * (boil frame and the default tail beat).
 */
export function drawGreatWhite(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, t: number, pose: GreatWhitePose = {}, flip = false): void {
  const scale = length / LEN;
  const m = ctx.getTransform();
  const screen = scale * Math.hypot(m.a, m.b);
  const bucket = bucketFor(screen);
  const s = spritesFor(bucket);
  const f = Math.floor(t * BOIL_FPS) % BOIL_FRAMES;
  const jaw = Math.max(0, Math.min(1, pose.jaw ?? 0));
  const open = jaw * JAW_MAX;
  const slide = { x: PROTRUDE.x * jaw, y: PROTRUDE.y * jaw };
  const beat = pose.tail ?? t * TAIL_HZ * Math.PI * 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (flip) ctx.scale(1, -1);
  ctx.scale(scale, scale);
  ctx.translate(-CENTRE.x, -CENTRE.y);
  drawMouth(ctx, open);
  drawJawPart(ctx, s.lower[f]!, TEETH_BOX, s.res, open);
  ctx.save();
  ctx.translate(slide.x, slide.y);
  blit(ctx, s.upper[f]!, TEETH_BOX, s.res);
  ctx.restore();
  drawBody(ctx, s.body[f]!, s.res, beat, screen);
  drawJawPart(ctx, s.jaw[f]!, JAW_BOX, s.res, open);
  drawEye(ctx, Math.max(0, Math.min(1, pose.worried ?? 0)), f, bucket.w);
  ctx.restore();
}

// ---------------------------------------------------------------- kit preview

export const KIT: KitEntry = {
  name: 'greatWhite',
  draw(ctx, w, h, t) {
    previewSea(ctx, w, h);
    const jaw = 0.5 - 0.5 * Math.cos(Math.PI * t);
    const worried = 0.5 - 0.5 * Math.cos(Math.PI * t * 0.5);
    const tail = t * Math.PI * 2 * TAIL_HZ;
    // The close-up: the head, jaws open, filling the right of the frame.
    ctx.save();
    ctx.beginPath();
    ctx.rect(w * 0.4, 0, w * 0.6, h);
    ctx.clip();
    const big = w * 1.3;
    const snout = { x: w * 0.985, y: h * 0.48 };
    const a = -0.08;
    drawGreatWhite(ctx, snout.x - (Math.cos(a) * big) / 2, snout.y - (Math.sin(a) * big) / 2, big, a, t, { jaw: 0.3 + 0.7 * jaw, tail });
    ctx.restore();
    // Whole sharks down the left: cruising, fleeing left in a worry, and small ones.
    drawGreatWhite(ctx, w * 0.2, h * 0.2, w * 0.36, 0, t, { jaw: jaw * 0.6, tail });
    drawGreatWhite(ctx, w * 0.2, h * 0.53, w * 0.34, Math.PI - 0.1, t, { worried, tail: tail * 1.6 }, true);
    drawGreatWhite(ctx, w * 0.1, h * 0.83, 150, 0.12, t, { jaw, tail });
    drawGreatWhite(ctx, w * 0.29, h * 0.84, 300, -0.15, t, { worried: 1, tail: tail + 2 });
  },
};
