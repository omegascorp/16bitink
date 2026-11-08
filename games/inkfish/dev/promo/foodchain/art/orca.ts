import { PAPER_FILL } from '../../../../src/art/fish/kit';
import { ellipse, INK, makeCanvas, Pen } from '../../../../src/art/pen';
import { BOIL_FPS, BOIL_FRAMES } from '../../../../src/art/textures';
import { type Pt, resample, spline } from '../../kraken/whale';
import type { KitEntry } from '../kit';

/**
 * The orca (killer whale) in the game's pen and ink, painted like the sperm
 * whale in ../../kraken/whaleArt.ts: paper under a deep blue-black wash laid
 * on a little off the outline, the light from above catching the back in
 * broken pale strokes, the lower flank hatched darker. Its markings are crisp
 * paper: the eye patch, the white chin and throat, the belly sweeping up into
 * the flank patch; a soft grey saddle sits behind the tall dorsal fin.
 *
 * Parts are separate sprites, so poses are cheap: the body (with the flukes
 * and the near flipper), the dorsal fin (upright, or collapsed and drooping
 * like Port's and Starboard's), the lower jaw and both rows of conical teeth.
 * The jaw turns about the corner of the mouth over the dark inside (drawn
 * live), the tail half bends column by column as the flukes beat. One canvas
 * per line-boil frame, baked lazily at three sizes.
 */

export interface OrcaPose {
  /** 0 shut .. 1 wide. */
  readonly jaw?: number;
  /** The fluke beat's phase, radians (default: beating with time). */
  readonly tail?: number;
  /** The dorsal fin collapsed and drooping (Port and Starboard). */
  readonly floppy?: boolean;
}

// ---------------------------------------------------------------- shape (local px: snout at x 0, facing +x, y down)

/** Snout to fluke tips, local px; the middle of that is the centre `drawOrca` places. */
const LEN = 1000;
const CENTRE: Pt = { x: -LEN / 2, y: 0 };

/** The back, from the tip of the snout over the round melon to the tail stock. */
const BACK: readonly Pt[] = spline([
  { x: 0, y: 22 }, { x: -3, y: 6 }, { x: -16, y: -18 }, { x: -45, y: -46 }, { x: -95, y: -76 }, { x: -165, y: -99 },
  { x: -260, y: -115 }, { x: -370, y: -121 }, { x: -470, y: -115 }, { x: -570, y: -98 }, { x: -660, y: -76 },
  { x: -745, y: -56 }, { x: -815, y: -40 }, { x: -872, y: -30 }, { x: -915, y: -2 },
], 6);

/** The underside, from the tip of the snout under the chin and belly to the tail stock. */
const BELLY: readonly Pt[] = spline([
  { x: 0, y: 22 }, { x: -3, y: 36 }, { x: -18, y: 54 }, { x: -48, y: 70 }, { x: -95, y: 86 }, { x: -160, y: 100 },
  { x: -250, y: 112 }, { x: -350, y: 118 }, { x: -450, y: 113 }, { x: -550, y: 98 }, { x: -640, y: 78 },
  { x: -730, y: 58 }, { x: -810, y: 40 }, { x: -872, y: 29 }, { x: -915, y: 2 },
], 6);

/** The upper lip, from the tip of the snout back to the corner of the mouth. */
const MOUTH: readonly Pt[] = spline([{ x: 0, y: 22 }, { x: -28, y: 28 }, { x: -66, y: 32 }, { x: -110, y: 35 }], 6);
/** The jaw turns about the corner of the mouth, this far at most (radians). */
const PIVOT: Pt = MOUTH[MOUTH.length - 1]!;
const JAW_MAX = 0.5;
/** Where the lower jaw ends under the throat. */
const JAW_BACK_X = -150;

function edgeAt(line: readonly Pt[], x: number): number {
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    if ((a.x - x) * (b.x - x) <= 0) return a.y + ((b.y - a.y) * (x - a.x)) / ((b.x - a.x) || 1);
  }
  return line[line.length - 1]!.y;
}
const topAt = (x: number): number => edgeAt(BACK, x);
const bottomAt = (x: number): number => edgeAt(BELLY, x);

function turn(p: Pt, about: Pt, a: number): Pt {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = p.x - about.x;
  const dy = p.y - about.y;
  return { x: about.x + dx * c - dy * s, y: about.y + dx * s + dy * c };
}

/** The throat under the jaw: the lip turned down as far as the jaw opens, to where it meets the belly. Hidden by the jaw at every gape. */
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

/** The body without the lower jaw (the throat under it stays, for when the jaw drops). */
const BODY: readonly Pt[] = [...MOUTH, ...FOLD.slice(1), ...BELLY.filter((p) => p.x < FOLD_END.x), ...[...BACK].reverse().slice(1, -1)];
/** Its inked edges: belly, back and upper lip (not the hidden fold, nor the tail's point inside the flukes). */
const INKED_BELLY: readonly Pt[] = BELLY.filter((p) => p.x < FOLD_END.x && p.x > -866);
const INKED_TOP: readonly Pt[] = [...[...BACK].reverse().filter((p) => p.x > -866), ...MOUTH.slice(1)];

/** The lower jaw, shut: the lip on top, the chin under it, its back edge hidden in the throat. */
const JAW_BOTTOM: readonly Pt[] = BELLY.filter((p) => p.x > JAW_BACK_X);
const JAW_SHAPE: readonly Pt[] = [
  ...MOUTH,
  ...spline([PIVOT, { x: -128, y: 64 }, { x: JAW_BACK_X, y: bottomAt(JAW_BACK_X) }], 4).slice(1),
  ...[...JAW_BOTTOM].reverse(),
];

/** The white below: chin and throat, a strip along the belly, sweeping up into the flank patch behind the fin. */
const WHITE_EDGE: readonly Pt[] = spline([
  PIVOT, { x: -150, y: 54 }, { x: -215, y: 78 }, { x: -300, y: 98 }, { x: -400, y: 104 }, { x: -452, y: 94 },
  { x: -488, y: 58 }, { x: -522, y: 12 }, { x: -560, y: -14 }, { x: -612, y: -16 }, { x: -668, y: -3 },
  { x: -728, y: 16 }, { x: -690, y: 34 }, { x: -652, y: 58 }, { x: -620, y: 84 },
], 6);
const WHITE: readonly Pt[] = [...WHITE_EDGE, { x: -620, y: 300 }, { x: 40, y: 300 }, { x: 40, y: 95 }];

/** The eye patch: a long white oval above and behind the eye, its back end lifting. */
const EYE: Pt = { x: -122, y: 14 };
const EYE_R = 6;
const EYE_PATCH: readonly Pt[] = spline([
  { x: -137, y: 3 }, { x: -160, y: -12 }, { x: -200, y: -19 }, { x: -240, y: -18 }, { x: -262, y: -10 },
  { x: -244, y: 4 }, { x: -200, y: 9 }, { x: -158, y: 10 }, { x: -137, y: 3 },
], 5);

/** The grey saddle behind the dorsal fin. */
const SADDLE: readonly Pt[] = ellipse(-560, -98, 72, 26, 20).map((p) => turn(p, { x: -560, y: -98 }, 0.12));

/** The near flipper: a broad rounded paddle low behind the head. */
const FLIPPER: readonly Pt[] = spline([
  { x: -192, y: 78 }, { x: -206, y: 122 }, { x: -236, y: 168 }, { x: -270, y: 198 }, { x: -298, y: 204 },
  { x: -312, y: 190 }, { x: -304, y: 158 }, { x: -284, y: 122 }, { x: -262, y: 94 }, { x: -240, y: 82 }, { x: -192, y: 78 },
], 5);

/** The flukes, seen a little from above: the upper lobe raised, the lower dropped, a notch between. */
const FLUKES: readonly Pt[] = spline([
  { x: -860, y: -22 }, { x: -900, y: -48 }, { x: -950, y: -90 }, { x: -985, y: -116 }, { x: -1000, y: -121 },
  { x: -991, y: -98 }, { x: -973, y: -60 }, { x: -957, y: -22 }, { x: -952, y: -3 }, { x: -961, y: 30 },
  { x: -977, y: 70 }, { x: -993, y: 106 }, { x: -956, y: 92 }, { x: -910, y: 58 }, { x: -876, y: 30 }, { x: -860, y: 22 },
], 5);

/** The tall dorsal fin of a grown male; its foot reaches into the back, where it fades out over the body. */
const FIN_UP: readonly Pt[] = spline([
  { x: -345, y: -121 }, { x: -366, y: -196 }, { x: -390, y: -272 }, { x: -410, y: -328 }, { x: -421, y: -342 },
  { x: -429, y: -330 }, { x: -440, y: -272 }, { x: -458, y: -200 }, { x: -480, y: -145 }, { x: -505, y: -118 }, { x: -535, y: -108 },
], 5);

/** The collapsed fin: the foot stands, the top half folds over and hangs down behind it. */
const FIN_STAND: readonly Pt[] = spline([
  { x: -345, y: -121 }, { x: -362, y: -172 }, { x: -386, y: -212 }, { x: -414, y: -236 }, { x: -446, y: -244 },
  { x: -480, y: -230 }, { x: -504, y: -205 }, { x: -518, y: -170 }, { x: -528, y: -136 }, { x: -548, y: -108 },
], 5);
const FIN_FLOP: readonly Pt[] = spline([
  { x: -404, y: -226 }, { x: -440, y: -251 }, { x: -485, y: -250 }, { x: -524, y: -230 }, { x: -552, y: -196 },
  { x: -567, y: -158 }, { x: -572, y: -128 }, { x: -566, y: -112 }, { x: -552, y: -116 }, { x: -540, y: -146 },
  { x: -518, y: -180 }, { x: -490, y: -203 }, { x: -458, y: -216 }, { x: -426, y: -222 }, { x: -404, y: -226 },
], 5);
/** Fins close their foot inside the body, below the back. */
const finShape = (edge: readonly Pt[]): Pt[] => [{ x: -320, y: -70 }, { x: -338, y: -112 }, ...edge, { x: -582, y: -98 }, { x: -582, y: -70 }];

/** Where the tail's point starts to hide its paper edge inside the flukes. */
const TAIL_HIDE_FROM = -856;
/** Where the tail starts to bend as it beats, and its tip; how far the flukes swing (local px). */
const BEND_FROM = -540;
const BEND_TO = -1000;
const TAIL_WAG = 34;
/** Beats a second when the pose doesn't give a phase. */
const TAIL_HZ = 0.9;

// ---------------------------------------------------------------- ink

const BLACK = '#172033';
const DEEP = '#04070d';
const SHEEN = '#bfd2e8';
const COOL = '#4f627a';
const IVORY = '#f3ead4';
const SADDLE_GREY = '#a0aab6';
const WOBBLE = 0.7;
/** The light from above, top of the back to the belly. */
const SKY_Y = -125;
const SEA_Y = 125;
const LIGHT_STOPS: readonly [number, string][] = [
  [0, 'rgba(182,205,234,0.3)'], [0.18, 'rgba(182,205,234,0.11)'], [0.42, 'rgba(182,205,234,0)'],
  [0.72, 'rgba(2,4,9,0.22)'], [1, 'rgba(2,4,9,0.42)'],
];

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

/** A vertical gradient over a shape. */
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

/** Paper, the blue-black wash laid on a little off it (`offset`), and the light from above. */
function blackSkin(k: Brush, shape: readonly Pt[], offset = 1.6): void {
  const { pen, ctx } = k;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    ctx.translate(offset, offset * 0.8);
    pen.fill(shape, BLACK, 0.95);
  });
  shade(ctx, shape, SKY_Y, SEA_Y, LIGHT_STOPS);
}

/** A line following the body at `v` of the way down (0 the back, 1 the belly), from x0 back to x1. */
function contour(v: number, x0: number, x1: number, step = 14): Pt[] {
  const pts: Pt[] = [];
  for (let x = x0; x >= x1; x -= step) pts.push({ x, y: topAt(x) + (bottomAt(x) - topAt(x)) * v });
  return pts;
}

/** Broken strokes along the body between v0 and v1, like a dry brush dragged along it. */
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

function paintFlukes(k: Brush): void {
  const { pen } = k;
  blackSkin(k, FLUKES);
  pen.clipped(FLUKES, () => {
    for (let i = 0; i < 12; i++) {
      const u = i / 11;
      for (const [tip, dir] of [[{ x: -998, y: -118 }, -1], [{ x: -991, y: 104 }, 1]] as const) {
        const from = { x: -880, y: dir * 8 };
        const to = { x: -940 + (tip.x + 940) * u, y: dir * 4 + (tip.y - dir * 4) * u };
        pen.hair([from, { x: (from.x + to.x) / 2 - 8, y: (from.y + to.y) / 2 }, to], 0.8 * k.w, dir < 0 ? SHEEN : DEEP, dir < 0 ? 0.22 : 0.4);
      }
    }
  });
  pen.stroke(FLUKES, 2.6 * k.w, INK, 1, true);
}

function paintFlipper(k: Brush): void {
  const { pen, ctx } = k;
  blackSkin(k, FLIPPER);
  shade(ctx, FLIPPER, 80, 205, [[0, 'rgba(2,4,9,0)'], [1, 'rgba(2,4,9,0.45)']]);
  pen.clipped(FLIPPER, () => {
    // The light along its leading edge, and the bones under the skin.
    for (let i = 0; i < 4; i++) pen.hair(FLIPPER.slice(1, 12).map((p) => ({ x: p.x - 4 - i * 4, y: p.y - 1 })), 1.1 * k.w, SHEEN, 0.28 - i * 0.06);
    for (let i = 0; i < 4; i++) pen.hair([{ x: -214 - i * 13, y: 92 }, { x: -240 - i * 12, y: 140 }, { x: -268 - i * 9, y: 178 }], 0.8 * k.w, DEEP, 0.4);
  });
  pen.stroke([...FLIPPER], 2.4 * k.w, INK, 1, false);
}

const WHITE_SHADE: readonly [number, string][] = [[0, 'rgba(79,98,122,0)'], [0.55, 'rgba(79,98,122,0.12)'], [1, 'rgba(79,98,122,0.5)']];

/** Lines following the belly in the white, closer together where it turns under. */
function whiteLines(k: Brush, x0: number, x1: number): void {
  for (let r = 1; r <= 9; r++) k.pen.hair(contour(1 - r * 0.028, x0, x1, 16).filter((p) => bottomAt(p.x) - topAt(p.x) > 120), 0.9 * k.w, COOL, 0.5 - r * 0.04);
}

/** The crisp white markings, shaded cool where they turn under into the sea's shadow. */
function paintWhite(k: Brush): void {
  const { pen, ctx } = k;
  pen.clipped(BODY, () => {
    pen.fill(WHITE, PAPER_FILL, 1);
    pen.fill(EYE_PATCH, PAPER_FILL, 1);
    pen.clipped(WHITE, () => {
      shade(ctx, BODY, 20, 125, WHITE_SHADE);
      whiteLines(k, -40, -860);
      pen.stipple(WHITE_EDGE.concat([{ x: -620, y: 130 }, { x: -120, y: 130 }]), 900, (_x, y) => Math.max(0, (y - 70) / 60), 0.9, COOL);
      // The flank patch turns away from the light at its top.
      for (let r = 0; r < 5; r++) pen.hair(WHITE_EDGE.slice(30, 62).map((p) => ({ x: p.x - 3 - r * 4, y: p.y + 4 + r * 5 })), 0.9 * k.w, COOL, 0.32 - r * 0.05);
    });
    pen.clipped(EYE_PATCH, () => {
      shade(ctx, EYE_PATCH, -20, 12, [[0, 'rgba(79,98,122,0)'], [1, 'rgba(79,98,122,0.35)']]);
      pen.hair(EYE_PATCH.slice(5, 9).map((p) => ({ x: p.x, y: p.y - 3 })), 0.8 * k.w, COOL, 0.4);
    });
    pen.hair(WHITE_EDGE, 1.1 * k.w, INK, 0.55);
    pen.hair(EYE_PATCH, 1.1 * k.w, INK, 0.6);
  });
}

function paintSaddle(k: Brush): void {
  const { pen, ctx } = k;
  pen.clipped(BODY, () => {
    ctx.filter = `blur(${Math.max(1, 7 * k.res)}px)`;
    pen.fill(SADDLE, SADDLE_GREY, 0.55);
    ctx.filter = 'none';
    pen.clipped(SADDLE, () => dryBrush(k, 0.02, 0.18, 4, -500, -640, SHEEN, () => 0.25, 1));
  });
}

function paintEye(k: Brush): void {
  const { pen } = k;
  const { x, y } = EYE;
  const r = EYE_R;
  pen.fill(ellipse(x, y, r * 1.6, r * 1.15, 16), '#3a4558', 0.85);
  pen.fill(ellipse(x, y, r, r * 0.8, 14), '#05070b', 1);
  pen.dot(x + r * 0.3, y - r * 0.28, r * 0.28, '#eef3f8');
  pen.stroke([...ellipse(x, y, r * 1.05, r * 0.85, 14), { x: x + r * 1.05, y }], 1.2 * k.w, INK, 1, false);
  pen.hair(spline([{ x: x - r * 2, y: y - r * 0.4 }, { x, y: y - r * 1.5 }, { x: x + r * 1.8, y: y - r * 0.5 }], 4), 0.9 * k.w, SHEEN, 0.4);
}

/** The tail's point runs on inside the flukes: wash over its edge there, ramping in, so no paper shows along it. */
function hideTailEdge(k: Brush): void {
  const { ctx } = k;
  ctx.save();
  path(ctx, BODY);
  ctx.clip();
  ctx.fillStyle = BLACK;
  for (let x = TAIL_HIDE_FROM; x > TAIL_HIDE_FROM - 100; x -= 2) {
    ctx.globalAlpha = 0.95 * Math.min(1, (TAIL_HIDE_FROM - x) / 24);
    ctx.fillRect(x - 2, -80, 2.2, 160);
  }
  ctx.restore();
}

function paintBody(k: Brush): void {
  const { pen, ctx } = k;
  paintFlukes(k);
  blackSkin(k, BODY);
  hideTailEdge(k);
  pen.clipped(BODY, () => {
    // The light catching the back in broken strokes; the lower flank hatched into shadow.
    dryBrush(k, 0.03, 0.34, 14, -30, -860, SHEEN, (v) => 0.34 * (1 - v / 0.38), 1.3);
    // Hatching into the shadow low on the flank, denser lower down.
    for (const [v, alpha] of [[0.46, 0.22], [0.6, 0.24], [0.74, 0.26]] as const) {
      pen.clipped([...contour(v, 60, -900, 30), { x: -900, y: 200 }, { x: 60, y: 200 }], () => pen.hatch(BODY, 7.5, -1.05, 0.75 * k.w, { color: DEEP, alpha }));
    }
    pen.stipple(BODY, 1400, (_x, y) => 0.45 * Math.max(0, 1 - (y + 125) / 110), 0.55, 'rgba(191,210,232,0.45)');
    // The round melon catching the light.
    ctx.filter = `blur(${Math.max(1, 10 * k.res)}px)`;
    pen.fill(ellipse(-62, -42, 50, 24, 18).map((p) => turn(p, { x: -62, y: -42 }, 0.62)), SHEEN, 0.12);
    ctx.filter = 'none';
    for (let i = 0; i < 5; i++) pen.hair(spline([{ x: -8, y: 8 - i * 6 }, { x: -40, y: -36 - i * 5 }, { x: -110, y: -76 - i * 4 }], 6), 1 * k.w, SHEEN, 0.3 - i * 0.05);
  });
  paintWhite(k);
  paintSaddle(k);
  // The blowhole, a crescent on top of the head.
  pen.stroke(spline([{ x: -150, y: topAt(-150) + 4 }, { x: -160, y: topAt(-160) + 7 }, { x: -172, y: topAt(-172) + 5 }], 3), 1.6 * k.w, INK, 1, false);
  pen.stroke(INKED_BELLY, 2.8 * k.w, INK, 1, true);
  pen.stroke(INKED_TOP, 2.8 * k.w, INK, 1, true);
  pen.hair(MOUTH.map((p) => ({ x: p.x, y: p.y - 3 })), 1 * k.w, SHEEN, 0.35);
  paintFlipper(k);
  paintEye(k);
}

/** A fin: its foot fades out over the back, so it grows out of the body without a seam. */
function paintFin(k: Brush, edge: readonly Pt[], flop: readonly Pt[] | null): void {
  const { pen, ctx } = k;
  const shape = finShape(edge);
  // No offset wash here: the foot must match the back it fades into.
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, BLACK, 0.95);
  shade(ctx, shape, -345, -100, [[0, 'rgba(182,205,234,0.04)'], [1, 'rgba(182,205,234,0.22)']]);
  pen.clipped(shape, () => {
    const apex = edge.reduce((a, p) => (p.y < a.y ? p : a));
    for (let i = 0; i < 9; i++) {
      const u = i / 8;
      const foot = { x: -350 - u * 165, y: -110 };
      const tip = { x: apex.x - 6 + u * 4, y: apex.y + 14 + u * 30 };
      pen.hair([foot, { x: (foot.x + tip.x) / 2 - 6, y: (foot.y + tip.y) / 2 }, tip], 0.9 * k.w, u < 0.35 ? SHEEN : DEEP, u < 0.35 ? 0.2 * (1 - u) : 0.45 * u);
    }
  });
  pen.stroke(edge, 2.6 * k.w, INK, 1, true);
  if (flop) {
    // The standing foot in the shadow of the fold.
    pen.clipped(shape, () => pen.hatch(flop.map((p) => ({ x: p.x + 6, y: p.y + 14 })), 4, 0.9, 0.8 * k.w, { color: DEEP, alpha: 0.5 }));
    blackSkin(k, flop, 0);
    shade(ctx, flop, -255, -110, [[0, 'rgba(182,205,234,0.3)'], [0.25, 'rgba(182,205,234,0.08)'], [1, 'rgba(2,4,9,0.55)']]);
    pen.clipped(flop, () => {
      for (let i = 0; i < 6; i++) pen.hair(flop.slice(0, 18).map((p) => ({ x: p.x - i * 3, y: p.y + 4 + i * 5 })), 0.9 * k.w, i < 2 ? SHEEN : DEEP, 0.3);
    });
    pen.stroke(flop, 2.6 * k.w, INK, 1, true);
    // The crease where it folds.
    pen.hair(spline([{ x: -416, y: -244 }, { x: -436, y: -246 }, { x: -458, y: -240 }], 3), 1.3 * k.w, INK, 0.8);
  }
  // Fade the foot out over the back.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';
  const g = ctx.createLinearGradient(0, -106, 0, -88);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-600, -400, 320, 340);
  ctx.restore();
}

function paintJaw(k: Brush): void {
  const { pen, ctx } = k;
  pen.fill(JAW_SHAPE, PAPER_FILL, 1);
  shade(ctx, JAW_SHAPE, 20, 125, WHITE_SHADE);
  pen.clipped(JAW_SHAPE, () => {
    whiteLines(k, 20, -170);
    pen.stipple(JAW_SHAPE, 200, (_x, y) => Math.max(0, (y - 70) / 60), 0.9, COOL);
    // The dark lip.
    pen.fill([...MOUTH, ...[...MOUTH].reverse().map((p) => ({ x: p.x, y: p.y + 4.5 }))], BLACK, 0.92);
  });
  pen.stroke(MOUTH, 2.2 * k.w, INK, 1, false);
  pen.stroke(JAW_BOTTOM.filter((p) => p.x > -125), 2.6 * k.w, INK, 1, true);
}

/** A cone of a tooth on the lip at `base`, pointing `dir` (1 down, -1 up), curving back toward the throat. */
function tooth(k: Brush, base: Pt, dir: number, h: number): void {
  const { pen } = k;
  const w = h * 0.34;
  const tip = { x: base.x - h * 0.22, y: base.y + dir * h };
  const shape = [
    { x: base.x + w, y: base.y - dir * 4 },
    ...spline([{ x: base.x + w, y: base.y }, { x: base.x + w * 0.55, y: base.y + dir * h * 0.6 }, tip], 4),
    ...spline([tip, { x: base.x - w * 0.8, y: base.y + dir * h * 0.5 }, { x: base.x - w, y: base.y }], 4).slice(1),
    { x: base.x - w, y: base.y - dir * 4 },
  ];
  pen.fill(shape, IVORY, 1);
  pen.hair([{ x: base.x - w * 0.4, y: base.y + dir * 1 }, { x: tip.x + 1, y: tip.y - dir * 3 }], 0.7 * k.w, '#b7a67c', 0.75);
  pen.stroke(shape.slice(1, -1), 1 * k.w, INK, 1, false);
}

/** The rows of teeth: 9 in each jaw, the lower ones fitting between the upper, smaller toward the corner of the mouth. */
function paintTeeth(k: Brush, lower: boolean): void {
  const pts = resample(MOUTH, 40);
  for (let i = 0; i < 9; i++) {
    const at = 3 + i * 4 + (lower ? 2 : 0);
    const p = pts[at]!;
    const h = 7 + 5 * Math.sin(Math.PI * (0.15 + 0.85 * (1 - at / 40)));
    tooth(k, { x: p.x, y: p.y + (lower ? -1 : 1) }, lower ? -1 : 1, h);
  }
}

// ---------------------------------------------------------------- sprites

interface Box { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number }
const BODY_BOX: Box = { x0: -1010, x1: 14, y0: -138, y1: 216 };
const FIN_BOX: Box = { x0: -590, x1: -315, y0: -360, y1: -82 };
const JAW_BOX: Box = { x0: -165, x1: 10, y0: 12, y1: 112 };
const TEETH_BOX: Box = { x0: -125, x1: 12, y0: 5, y1: 60 };

/** Bake sizes: sprite px per local px, the extra line weight, used up to this many screen px per local px. */
interface Bucket { readonly res: number; readonly w: number }
const BUCKETS: readonly Bucket[] = [{ res: 0.45, w: 1.7 }, { res: 1.1, w: 1.2 }, { res: 2.5, w: 1 }];

interface Sprites {
  readonly res: number;
  readonly body: readonly HTMLCanvasElement[];
  readonly fin: readonly HTMLCanvasElement[];
  readonly floppy: readonly HTMLCanvasElement[];
  readonly jaw: readonly HTMLCanvasElement[];
  readonly upper: readonly HTMLCanvasElement[];
  readonly lower: readonly HTMLCanvasElement[];
}

const seedOf = (f: number): number => 4201 + f * 977;

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
    fin: frames.map((s) => sheet(FIN_BOX, b, s + 11, (k) => paintFin(k, FIN_UP, null))),
    floppy: frames.map((s) => sheet(FIN_BOX, b, s + 13, (k) => paintFin(k, FIN_STAND, FIN_FLOP))),
    jaw: frames.map((s) => sheet(JAW_BOX, b, s + 17, paintJaw)),
    upper: frames.map((s) => sheet(TEETH_BOX, b, s + 19, (k) => paintTeeth(k, false))),
    lower: frames.map((s) => sheet(TEETH_BOX, b, s + 23, (k) => paintTeeth(k, true))),
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

/** The smallest bake that's at least as fine as the screen. */
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

/** The body, the tail half column by column, bent by the beat. */
function drawBody(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, res: number, beat: number, scale: number): void {
  const box = BODY_BOX;
  const k = 1 / res;
  const split = Math.round((BEND_FROM - box.x0) * res);
  ctx.drawImage(c, split, 0, c.width - split, c.height, box.x0 + split * k, box.y0, (c.width - split) * k, c.height * k);
  const step = Math.max(2, Math.round((3 * res) / scale));
  for (let sx = 0; sx < split; sx += step) {
    const x = box.x0 + (sx + step / 2) * k;
    const b = Math.max(0, Math.min(1, (x - BEND_FROM) / (BEND_TO - BEND_FROM)));
    const dy = TAIL_WAG * b * b * Math.sin(beat - 2.4 * b);
    const w = Math.min(step, split - sx);
    ctx.drawImage(c, sx, 0, w, c.height, box.x0 + sx * k, box.y0 + dy, w * k + 1.2 / scale, c.height * k);
  }
}

/** The inside of the mouth: dark, pink gums along both lips, the tongue on the floor. */
function drawMouth(ctx: CanvasRenderingContext2D, open: number): void {
  if (open < 0.004) return;
  const lower = [...MOUTH].reverse().map((p) => turn(p, PIVOT, open));
  const shape = [...MOUTH, ...lower];
  ctx.save();
  path(ctx, shape);
  const g = ctx.createLinearGradient(PIVOT.x, 0, 0, 0);
  g.addColorStop(0, '#0e0508');
  g.addColorStop(1, '#3f2229');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  const floor = turn({ x: -55, y: 40 }, PIVOT, open);
  ctx.fillStyle = 'rgba(160,82,94,0.85)';
  ctx.beginPath();
  ctx.ellipse(floor.x, floor.y, 46, 12, open, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(184,108,118,0.75)';
  ctx.lineWidth = 7;
  for (const lip of [MOUTH, lower]) {
    ctx.beginPath();
    lip.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.restore();
  // The far lip across the front of the gape.
  const tip = lower[lower.length - 1]!;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(MOUTH[0]!.x - 1, MOUTH[0]!.y + 2);
  ctx.quadraticCurveTo(tip.x - 9, (MOUTH[0]!.y + tip.y) / 2, tip.x - 1, tip.y - 2);
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

/**
 * Draws the orca with its snout at +x of its local frame: centre (x, y) in
 * screen px, `length` = snout to fluke tip in screen px, `angle` radians,
 * `flip` mirrors vertically for leftward swimming, `t` seconds (boil frame
 * and the default tail beat).
 */
export function drawOrca(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, t: number, pose: OrcaPose = {}, flip = false): void {
  const scale = length / LEN;
  const m = ctx.getTransform();
  const s = spritesFor(bucketFor(scale * Math.hypot(m.a, m.b)));
  const f = Math.floor(t * BOIL_FPS) % BOIL_FRAMES;
  const open = Math.max(0, Math.min(1, pose.jaw ?? 0)) * JAW_MAX;
  const beat = pose.tail ?? t * TAIL_HZ * Math.PI * 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (flip) ctx.scale(1, -1);
  ctx.scale(scale, scale);
  ctx.translate(-CENTRE.x, -CENTRE.y);
  drawMouth(ctx, open);
  drawJawPart(ctx, s.lower[f]!, TEETH_BOX, s.res, open);
  blit(ctx, s.upper[f]!, TEETH_BOX, s.res);
  drawBody(ctx, s.body[f]!, s.res, beat, scale * Math.hypot(m.a, m.b));
  blit(ctx, (pose.floppy ? s.floppy : s.fin)[f]!, FIN_BOX, s.res);
  drawJawPart(ctx, s.jaw[f]!, JAW_BOX, s.res, open);
  ctx.restore();
}

// ---------------------------------------------------------------- kit preview

/** Open water, the blue the orca is seen on in the video. */
export function previewSea(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2f6d9c');
  g.addColorStop(1, '#173e64');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export const KIT: KitEntry = {
  name: 'orca',
  draw(ctx, w, h, t) {
    previewSea(ctx, w, h);
    const jaw = 0.5 - 0.5 * Math.cos(Math.PI * t);
    const tail = t * Math.PI * 2 * TAIL_HZ;
    // The cold open / thumbnail close-up: the head, jaws open, filling the right of the frame.
    ctx.save();
    ctx.beginPath();
    ctx.rect(w * 0.4, 0, w * 0.6, h);
    ctx.clip();
    const big = w * 1.3;
    const snout = { x: w * 0.985, y: h * 0.5 };
    const a = -0.1;
    drawOrca(ctx, snout.x - (Math.cos(a) * big) / 2, snout.y - (Math.sin(a) * big) / 2, big, a, t, { jaw: 0.35 + 0.65 * jaw, tail });
    ctx.restore();
    // Whole animals down the left: swimming right, Port (fin collapsed) swimming left, and small ones.
    drawOrca(ctx, w * 0.2, h * 0.2, w * 0.36, 0, t, { jaw, tail });
    drawOrca(ctx, w * 0.2, h * 0.52, w * 0.33, Math.PI, t, { floppy: true, tail: tail + 1 }, true);
    drawOrca(ctx, w * 0.1, h * 0.82, 150, 0.15, t, { jaw, tail });
    drawOrca(ctx, w * 0.29, h * 0.84, 300, -0.2, t, { tail: tail + 2 });
  },
};
