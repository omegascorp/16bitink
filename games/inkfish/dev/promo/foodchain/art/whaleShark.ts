import { PAPER_FILL } from '../../../../src/art/fish/kit';
import { ellipse, INK, makeCanvas, Pen } from '../../../../src/art/pen';
import { BOIL_FPS, BOIL_FRAMES } from '../../../../src/art/textures';
import { spline, type Pt } from '../../kraken/whale';
import type { KitEntry } from '../kit';

/**
 * The whale shark, the biggest fish, in the game's pen and ink but painted
 * like the sperm whale (kraken/whaleArt.ts): paper under a blue-grey wash
 * laid on a little off the outline, the light from above on its back, the
 * belly white and shaded with lines that follow its curve. It's drawn true:
 * a broad flat head with the mouth right across the front (not under it),
 * tiny eyes behind the corners of the mouth, five long gill slits, three
 * ridges running down each flank, a tall first dorsal, a crescent tail with
 * the bigger lobe on top, and its checkerboard of pale spots and thin pale
 * stripes (just spots on the head).
 *
 * Its own px ("local px"): snout tip at x 0, facing right, y down, tail tip
 * at x -LEN. The body (with its fins), the tail and the lower jaw are
 * separate sprites, one canvas each per line-boil frame, so the jaw can drop
 * open into a wide gape (the throat and its filter pads inside, another
 * sprite) and the tail can beat. Baked at 1 sprite px per local px, so it's
 * sharp up to LEN (2,400) screen px long: about 31 MB for all three boil
 * frames (body 2,090 x 900, tail 520 x 830, jaw 300 x 170, throat 400 x 340 px).
 */

/** Snout to tail tip, local px; and sprite px per local px. */
const LEN = 2400;
const RES = 1;
/** The point drawn at the caller's (x, y): halfway along, on the centre line. */
const CENTRE: Pt = { x: -LEN / 2, y: 0 };

const WASH = '#3d4b59';
const FIN_WASH = '#36434f';
const SHADOW = '#0f151c';
const LIGHT = '#eef3f2';
const PALE = '#f1f0e4';
const LINING = '#c2b3ad';
const W = 1.5;

interface Box { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number }

const BODY_BOX: Box = { x0: -2040, x1: 50, y0: -520, y1: 380 };
const TAIL_BOX: Box = { x0: -2420, x1: -1900, y0: -500, y1: 330 };
const JAW_BOX: Box = { x0: -280, x1: 20, y0: 0, y1: 170 };
const THROAT_BOX: Box = { x0: -260, x1: 140, y0: -90, y1: 250 };

// ---------------------------------------------------------------- shape (local px)

/** The top of the head and the back, from the tip of the upper lip to the tail stock. */
const BACK: readonly Pt[] = spline([
  { x: 8, y: 14 }, { x: 16, y: -12 }, { x: 13, y: -50 }, { x: -8, y: -80 }, { x: -52, y: -100 }, { x: -150, y: -118 },
  { x: -320, y: -148 }, { x: -520, y: -190 }, { x: -760, y: -226 }, { x: -960, y: -240 }, { x: -1160, y: -232 },
  { x: -1360, y: -204 }, { x: -1560, y: -158 }, { x: -1760, y: -104 }, { x: -1900, y: -68 }, { x: -2010, y: -46 },
], 8);

/** The upper lip, from its tip back to the corner of the mouth. */
const MOUTH: readonly Pt[] = spline([{ x: 8, y: 14 }, { x: -50, y: 19 }, { x: -110, y: 23 }, { x: -150, y: 26 }], 6);
/** Behind the corner of the mouth the throat drops away under the lower jaw. */
const CREASE: readonly Pt[] = spline([{ x: -150, y: 26 }, { x: -180, y: 62 }, { x: -208, y: 94 }, { x: -240, y: 120 }], 4);
/** The belly, from under the throat to the tail stock. */
const BELLY: readonly Pt[] = spline([
  { x: -240, y: 120 }, { x: -340, y: 152 }, { x: -500, y: 188 }, { x: -700, y: 214 }, { x: -900, y: 224 }, { x: -1100, y: 216 },
  { x: -1300, y: 192 }, { x: -1500, y: 154 }, { x: -1700, y: 106 }, { x: -1880, y: 66 }, { x: -2010, y: 46 },
], 8);

/** The body without its lower jaw, clockwise from the lip. */
const BODY: readonly Pt[] = [...BACK, ...[...BELLY].reverse().slice(0, -1), ...[...CREASE].reverse().slice(0, -1), ...[...MOUTH].reverse().slice(0, -1)];

/** The lower jaw, shut: the lower lip along its top, the chin under it; the part behind the hinge is hidden in the throat. */
const LOWER_LIP: readonly Pt[] = spline([{ x: 8, y: 17 }, { x: -50, y: 22 }, { x: -110, y: 26 }, { x: -150, y: 28 }], 6);
const CHIN: readonly Pt[] = spline([{ x: 8, y: 17 }, { x: 6, y: 36 }, { x: -26, y: 58 }, { x: -100, y: 86 }, { x: -175, y: 106 }, { x: -240, y: 122 }], 6);
const JAW: readonly Pt[] = [...LOWER_LIP, { x: -200, y: 32 }, { x: -270, y: 46 }, { x: -270, y: 128 }, ...[...CHIN].reverse()];
/** The jaw turns about the corner of the mouth; at full gape by this much. */
const HINGE: Pt = { x: -150, y: 26 };
const GAPE_MAX = 0.78;

/** The first dorsal (tall, raked), second dorsal and anal fin: on the midline, so drawn behind the body's outline. */
const DORSAL: readonly Pt[] = [
  ...spline([{ x: -870, y: -214 }, { x: -880, y: -236 }, { x: -960, y: -316 }, { x: -1080, y: -428 }, { x: -1196, y: -490 }], 6),
  ...spline([{ x: -1196, y: -490 }, { x: -1174, y: -400 }, { x: -1186, y: -310 }, { x: -1226, y: -244 }, { x: -1266, y: -220 }], 6).slice(1),
  { x: -1266, y: -190 },
];
const DORSAL2: readonly Pt[] = [
  ...spline([{ x: -1630, y: -110 }, { x: -1640, y: -132 }, { x: -1690, y: -176 }, { x: -1756, y: -204 }], 5),
  ...spline([{ x: -1756, y: -204 }, { x: -1746, y: -166 }, { x: -1756, y: -128 }, { x: -1784, y: -106 }], 5).slice(1),
  { x: -1784, y: -86 },
];
const ANAL: readonly Pt[] = [
  ...spline([{ x: -1680, y: 96 }, { x: -1690, y: 110 }, { x: -1740, y: 150 }, { x: -1800, y: 170 }], 5),
  ...spline([{ x: -1800, y: 170 }, { x: -1792, y: 138 }, { x: -1800, y: 104 }, { x: -1826, y: 86 }], 5).slice(1),
  { x: -1826, y: 66 },
];
/** The near pectoral (big and sickle-shaped) and pelvic fin: drawn over the body. */
const PECTORAL: readonly Pt[] = [
  ...spline([{ x: -520, y: 112 }, { x: -585, y: 186 }, { x: -700, y: 282 }, { x: -880, y: 352 }], 7),
  ...spline([{ x: -880, y: 352 }, { x: -800, y: 292 }, { x: -728, y: 214 }, { x: -672, y: 160 }, { x: -636, y: 138 }], 6).slice(1),
  { x: -600, y: 118 },
];
const PELVIC: readonly Pt[] = [
  ...spline([{ x: -1236, y: 180 }, { x: -1270, y: 222 }, { x: -1330, y: 256 }, { x: -1384, y: 266 }], 5),
  ...spline([{ x: -1384, y: 266 }, { x: -1356, y: 234 }, { x: -1340, y: 198 }, { x: -1326, y: 172 }], 5).slice(1),
];

/** The crescent tail, the upper lobe the bigger, with a stub that runs forward into the tail stock (hidden by the body). */
const TAIL_UPPER_LEAD: readonly Pt[] = spline([{ x: -2000, y: -46 }, { x: -2096, y: -112 }, { x: -2210, y: -240 }, { x: -2324, y: -394 }, { x: -2400, y: -480 }], 7);
const TAIL_UPPER_TRAIL: readonly Pt[] = spline([{ x: -2400, y: -480 }, { x: -2296, y: -316 }, { x: -2226, y: -164 }, { x: -2196, y: -50 }, { x: -2190, y: 4 }], 7);
const TAIL_LOWER_TRAIL: readonly Pt[] = spline([{ x: -2190, y: 4 }, { x: -2216, y: 90 }, { x: -2272, y: 200 }, { x: -2344, y: 300 }], 6);
const TAIL_LOWER_LEAD: readonly Pt[] = spline([{ x: -2344, y: 300 }, { x: -2230, y: 196 }, { x: -2110, y: 98 }, { x: -2000, y: 46 }], 6);
const TAIL: readonly Pt[] = [
  { x: -1930, y: -52 }, ...TAIL_UPPER_LEAD, ...TAIL_UPPER_TRAIL.slice(1), ...TAIL_LOWER_TRAIL.slice(1), ...TAIL_LOWER_LEAD.slice(1), { x: -1930, y: 52 },
];
/** The tail beats about here; the body bends behind BEND_FROM. */
const TAIL_PIVOT: Pt = { x: -2005, y: 0 };
const BEND_FROM = -1250;
const FLEX = 9;

/** The small eye just behind the corner of the mouth, and the spiracle behind it. */
const EYE = { x: -186, y: -2, r: 8.5 } as const;
const SPIRACLE: Pt = { x: -242, y: -24 };
/** The five gill slits, front to back. */
const GILLS: readonly number[] = [-404, -436, -468, -500, -532];
/** The three ridges along the flank: where each starts, and how far down the flank it runs (0 back .. 1 belly) at its start and at the tail. */
const RIDGES: readonly { readonly from: number; readonly f0: number; readonly f1: number }[] = [
  { from: -360, f0: 0.13, f1: 0.3 },
  { from: -560, f0: 0.3, f1: 0.42 },
  { from: -640, f0: 0.47, f1: 0.5 },
];
/** Where the white belly starts, down the flank. */
const BELLY_LINE = 0.66;

// ---------------------------------------------------------------- shape helpers

function edgeAt(line: readonly Pt[], x: number): number {
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    if ((a.x - x) * (b.x - x) <= 0) return a.y + ((b.y - a.y) * (x - a.x)) / ((b.x - a.x) || 1);
  }
  return line[line.length - 1]!.y;
}
const topAt = (x: number): number => edgeAt(BACK, x);
const bottomAt = (x: number): number => (x > -240 ? edgeAt(CHIN, x) : edgeAt(BELLY, x));
/** A point on the flank: `f` 0 on the back .. 1 on the belly. */
const flank = (x: number, f: number): Pt => ({ x, y: topAt(x) + (bottomAt(x) - topAt(x)) * f });
const ridgeF = (r: (typeof RIDGES)[number], x: number): number => r.f0 + (r.f1 - r.f0) * Math.max(0, Math.min(1, (r.from - x) / (r.from + 2000)));

function rotateAbout(p: Pt, c: Pt, a: number): Pt {
  const cs = Math.cos(a);
  const sn = Math.sin(a);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * cs - dy * sn, y: c.y + dx * sn + dy * cs };
}
const openJaw = (p: Pt, gape: number): Pt => rotateAbout(p, HINGE, gape * GAPE_MAX);

function pathOf(ctx: CanvasRenderingContext2D, shape: readonly Pt[]): void {
  ctx.beginPath();
  shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

/** Strokes the parts of a contour that lie outside the x ranges in `gaps` (where a fin rises from it). */
function strokeOutside(pen: Pen, line: readonly Pt[], gaps: readonly (readonly [number, number])[], width: number): void {
  let run: Pt[] = [];
  const flush = (): void => {
    if (run.length > 1) pen.stroke(run, width, INK, 1, true);
    run = [];
  };
  for (const p of line) {
    if (gaps.some(([a, b]) => p.x <= a && p.x >= b)) flush();
    else run.push(p);
  }
  flush();
}

/** A vertical gradient that follows the body's own top and bottom, strip by strip (so the narrow tail is shaded like the deep middle). */
function flankShade(ctx: CanvasRenderingContext2D, clip: readonly Pt[], x0: number, x1: number, stops: readonly (readonly [number, string])[]): void {
  ctx.save();
  pathOf(ctx, clip);
  ctx.clip();
  // Whole-px strips that just meet, so no seam shows where two overlap.
  const step = 8;
  for (let x = Math.round(x0); x > x1; x -= step) {
    const top = topAt(x - step / 2);
    const bottom = bottomAt(x - step / 2);
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    for (const [at, colour] of stops) g.addColorStop(at, colour);
    ctx.fillStyle = g;
    ctx.fillRect(x - step, BODY_BOX.y0, step, BODY_BOX.y1 - BODY_BOX.y0);
  }
  ctx.restore();
}

function linearShade(ctx: CanvasRenderingContext2D, clip: readonly Pt[], from: Pt, to: Pt, stops: readonly (readonly [number, string])[]): void {
  ctx.save();
  pathOf(ctx, clip);
  ctx.clip();
  const g = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  ctx.fillStyle = g;
  ctx.fillRect(-3000, -1000, 4000, 2000);
  ctx.restore();
}

// ---------------------------------------------------------------- painting the body

/** A fin: paper, the wash, shade toward its tip, fine lines from the root, a few pale spots, then its free edges inked. */
function paintFin(pen: Pen, shape: readonly Pt[], root: Pt, tip: Pt, edges: readonly (readonly Pt[])[], spots: number): void {
  const { ctx } = pen;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    ctx.translate(4, 3);
    pen.fill(shape, FIN_WASH, 0.86);
    ctx.translate(-4, -3);
  });
  linearShade(ctx, shape, root, tip, [[0, 'rgba(238,243,242,0.1)'], [0.6, 'rgba(15,21,28,0.12)'], [1, 'rgba(15,21,28,0.42)']]);
  pen.clipped(shape, () => {
    for (let k = 0; k < 9; k++) {
      const p = shape[Math.round(((k + 0.5) / 9) * (shape.length - 1))]!;
      pen.hair([root, { x: (root.x + p.x) / 2 + pen.jitter(6), y: (root.y + p.y) / 2 }, p], 1, INK, 0.26);
    }
    for (let i = 0; i < spots; i++) {
      const u = 0.1 + pen.rng() * 0.6;
      const p = shape[Math.floor(pen.rng() * shape.length)]!;
      const at = { x: root.x + (p.x - root.x) * u, y: root.y + (p.y - root.y) * u };
      pen.fill(ellipse(at.x, at.y, 4 + pen.rng() * 3, 3.5 + pen.rng() * 3, 9), PALE, 0.6 * (1 - u * 0.6));
    }
  });
  for (const edge of edges) pen.stroke(edge, 4.2, INK, 1, true);
}

/** Small pale spots scattered over the head, none below the white of the throat. */
function headSpots(pen: Pen): void {
  const gap = 25;
  for (let x = -22; x > -470; x -= gap) {
    for (let f = 0.03; f < BELLY_LINE + 0.06; f += gap / Math.max(60, bottomAt(x) - topAt(x))) {
      const p = flank(x + pen.jitter(gap * 0.42), f + pen.jitter(0.04));
      if (Math.hypot(p.x - EYE.x, p.y - EYE.y) < 22 || pen.rng() < 0.12) continue;
      const r = 3.2 + pen.rng() * 3 + (-x / 470) * 1.5;
      const fade = 1 - Math.max(0, (f - 0.5) / 0.2);
      pen.fill(ellipse(p.x, p.y, r, r * (0.8 + pen.rng() * 0.25), 9), PALE, 0.78 * fade);
    }
  }
}

/** The checkerboard on the body: thin pale stripes down the flank and along the ridges, a pale spot or two in every cell. */
function bodyPattern(pen: Pen): void {
  const fade = (f: number): number => Math.max(0, Math.min(1, 1 - (f - BELLY_LINE + 0.08) / 0.12));
  const columns: number[] = [];
  for (let x = -470; x > -1990;) {
    columns.push(x);
    x -= 58 * (0.55 + 0.45 * ((bottomAt(x) - topAt(x)) / 410)) + pen.jitter(5);
  }
  // Stripes down the flank: thin, wavering, broken here and there, fading into the white below.
  for (const x of columns) {
    const width = 2.2 + pen.rng() * 1.4;
    const lean = 10 + pen.jitter(10);
    let run: Pt[] = [];
    for (let f = 0.02; f < BELLY_LINE + 0.04; f += 0.035) {
      run.push(flank(x + Math.sin(f * 9 + x) * 3 + f * lean, f));
      if (pen.rng() < 0.07 || f + 0.035 >= BELLY_LINE + 0.04) {
        pen.hair(run, width, PALE, (0.45 + pen.rng() * 0.2) * fade(f));
        run = [];
      }
    }
  }
  // Stripes along the ridges.
  for (const r of RIDGES) {
    const pts: Pt[] = [];
    for (let x = r.from + 30; x > -1990; x -= 24) pts.push(flank(x, ridgeF(r, x) - 0.02));
    pen.hair(pts, 2.6, PALE, 0.42);
  }
  // A spot or two in each cell.
  const levels = [0, ...RIDGES.map((r) => r), null];
  for (let c = 0; c < columns.length - 1; c++) {
    const xa = columns[c]!;
    const xb = columns[c + 1]!;
    for (let l = 0; l < levels.length - 1; l++) {
      const x = (xa + xb) / 2;
      const upper = l === 0 ? 0.02 : ridgeF(RIDGES[l - 1]!, x);
      const lower = l === RIDGES.length ? BELLY_LINE : ridgeF(RIDGES[l]!, x);
      const span = lower - upper;
      const depth = bottomAt(x) - topAt(x);
      const count = span * depth > 70 ? 2 : 1;
      for (let s = 0; s < count; s++) {
        const f = upper + span * ((s + 0.5) / count) + pen.jitter(span * 0.12);
        const p = flank(x + pen.jitter((xa - xb) * 0.14), f);
        if (pen.rng() < 0.06) continue;
        const r = Math.min((xa - xb) * 0.24, 9.5) * (0.6 + pen.rng() * 0.55);
        pen.fill(ellipse(p.x, p.y, r * (0.9 + pen.rng() * 0.25), r * (0.8 + pen.rng() * 0.2), 10), PALE, (0.6 + pen.rng() * 0.2) * fade(f));
      }
    }
  }
}

/** The three ridges: a fold catching the light along its top, a dark crease and soft shadow under it; each rises out of the skin over its first stretch. */
function ridges(pen: Pen): void {
  const RISE = 8;
  for (const r of RIDGES) {
    const line: Pt[] = [];
    for (let x = r.from; x > -2000; x -= 20) line.push(flank(x, ridgeF(r, x)));
    for (let k = 0; k < 3; k++) pen.fill([...line, ...[...line].reverse().map((p, i) => ({ x: p.x, y: p.y + (6 + k * 7) * Math.min(1, (line.length - 1 - i) / RISE) }))], SHADOW, 0.09);
    for (let i = 0; i < RISE; i++) {
      const piece = line.slice(i, i + 2);
      const a = (i + 1) / (RISE + 1);
      pen.hair(piece.map((p) => ({ x: p.x, y: p.y - 4 })), 3.4, LIGHT, 0.42 * a);
      pen.hair(piece, 2.6, INK, 0.8 * a);
    }
    pen.hair(line.slice(RISE - 1).map((p) => ({ x: p.x, y: p.y - 4 })), 3.4, LIGHT, 0.42);
    pen.hair(line.slice(RISE - 1), 2.6, INK, 0.8);
  }
}

/** Five long gill slits, each a dark cut with a pale flap of skin behind it. */
function gills(pen: Pen): void {
  GILLS.forEach((x, i) => {
    const slit = Array.from({ length: 9 }, (_, k) => {
      const f = 0.17 + (k / 8) * (0.66 - i * 0.01);
      return flank(x - Math.sin((k / 8) * Math.PI) * 10, f);
    });
    pen.fill([...slit, ...[...slit].reverse().map((p) => ({ x: p.x + 5, y: p.y }))], SHADOW, 0.75);
    pen.hair(slit.map((p) => ({ x: p.x - 6, y: p.y })), 2.4, LIGHT, 0.32);
    pen.stroke(slit, 2.6, INK, 1, false);
  });
}

/** Lines that follow the belly's curve, shading the underside; and a band of hatching where the flank turns under, away from the light. */
function bellyLines(pen: Pen): void {
  for (let r = 1; r <= 7; r++) {
    const pts: Pt[] = [];
    for (let x = -260 - pen.rng() * 40; x > -1990 + r * 10; x -= 24) {
      const depth = bottomAt(x) - topAt(x);
      pts.push({ x, y: bottomAt(x) - r * 10 * (depth / 410) });
    }
    pen.hair(pts, 1.1, INK, 0.5 * (1 - r / 9));
  }
  const band: Pt[] = [];
  for (let x = -120; x > -2000; x -= 30) band.push(flank(x, 0.5));
  for (let x = -2000; x < -120; x += 30) band.push(flank(x, 0.74));
  pen.hatch(band, 9, -1.15, 0.9, { alpha: 0.13 });
}

/** Big soft blotches of darker and lighter wash, so the skin isn't one flat tone. */
function mottle(pen: Pen): void {
  for (let i = 0; i < 70; i++) {
    const x = -40 - pen.rng() * 1950;
    const p = flank(x, 0.05 + pen.rng() * 0.6);
    const r = 30 + pen.rng() * 90;
    const dark = pen.rng() < 0.6;
    pen.fill(ellipse(p.x, p.y, r, r * (0.4 + pen.rng() * 0.3), 14), dark ? SHADOW : LIGHT, dark ? 0.06 : 0.05);
  }
}

function eye(pen: Pen): void {
  const { x, y, r } = EYE;
  // A small eye in a fold of skin, a lid line over it.
  pen.fill(ellipse(x, y, r * 2, r * 1.5, 16), SHADOW, 0.28);
  pen.fill(ellipse(x, y, r, r * 0.8, 14), '#c8c3b1', 1);
  pen.dot(x + r * 0.15, y + r * 0.05, r * 0.62, INK);
  pen.dot(x + r * 0.35, y - r * 0.25, r * 0.2, PAPER_FILL);
  pen.stroke([...ellipse(x, y, r, r * 0.8, 14), { x: x + r, y }], 2.2, INK, 1, false);
  pen.stroke(spline([{ x: x - r * 1.8, y: y - r * 0.2 }, { x, y: y - r * 1.3 }, { x: x + r * 1.7, y: y - r * 0.4 }], 5), 2.4, INK, 1, false);
  // The spiracle, a small dark hole behind it.
  pen.fill(ellipse(SPIRACLE.x, SPIRACLE.y, 5, 3, 10), SHADOW, 0.9);
  pen.hair(spline([{ x: SPIRACLE.x - 7, y: SPIRACLE.y + 2 }, { x: SPIRACLE.x, y: SPIRACLE.y - 4 }, { x: SPIRACLE.x + 7, y: SPIRACLE.y + 1 }], 4), 1.4, INK, 0.9);
}

function paintBody(ctx: CanvasRenderingContext2D, seed: number): void {
  const pen = new Pen(ctx, seed, W);
  // The midline fins, behind the outline.
  paintFin(pen, DORSAL, { x: -1040, y: -200 }, { x: -1196, y: -470 }, [DORSAL.slice(1, -1)], 10);
  paintFin(pen, DORSAL2, { x: -1700, y: -95 }, { x: -1756, y: -190 }, [DORSAL2.slice(1, -1)], 2);
  paintFin(pen, ANAL, { x: -1750, y: 80 }, { x: -1800, y: 164 }, [ANAL.slice(1, -1)], 1);

  // Paper, then the wash laid on a little off the outline.
  pen.fill(BODY, PAPER_FILL, 1);
  pen.clipped(BODY, () => {
    ctx.translate(6, 4);
    pen.fill(BODY, WASH, 0.88);
    ctx.translate(-6, -4);
    mottle(pen);
    headSpots(pen);
    bodyPattern(pen);
    // The white belly, its edge soft and ragged, washed on in a few thin layers.
    for (let layer = 0; layer < 4; layer++) {
      const knots: Pt[] = [];
      for (let x = 60; x > -2090; x -= 70) knots.push(flank(x, BELLY_LINE + 0.05 - layer * 0.025 + pen.jitter(0.03) + 0.4 * Math.max(0, (-1550 - x) / 450)));
      pen.fill([...spline(knots, 6), { x: -2090, y: 400 }, { x: 60, y: 400 }], PAPER_FILL, 0.3);
    }
  });
  // The tail stock darkens into the tail (and the offset wash leaves no paper edge where they meet).
  pen.clipped(BODY, () => pen.fill([{ x: -1990, y: -80 }, { x: -2040, y: -80 }, { x: -2040, y: 80 }, { x: -1990, y: 80 }], WASH, 0.88));
  linearShade(ctx, BODY, { x: -1800, y: 0 }, { x: -2010, y: 0 }, [[0, 'rgba(54,67,79,0)'], [1, 'rgba(54,67,79,0.75)']]);
  // The light from above: lit across the back, the core shadow low on the flank, a little light bounced back under the belly.
  flankShade(ctx, BODY, 60, -2020, [
    [0, 'rgba(238,243,242,0.3)'], [0.18, 'rgba(238,243,242,0.06)'], [0.45, 'rgba(15,21,28,0.1)'],
    [0.72, 'rgba(15,21,28,0.3)'], [0.9, 'rgba(15,21,28,0.42)'], [1, 'rgba(15,21,28,0.3)'],
  ]);
  pen.clipped(BODY, () => {
    // The broad snout turns away from the light.
    linearShade(ctx, BODY, { x: -90, y: 0 }, { x: 14, y: 0 }, [[0, 'rgba(15,21,28,0)'], [1, 'rgba(15,21,28,0.34)']]);
    ridges(pen);
    gills(pen);
    bellyLines(pen);
    pen.stipple(BODY, 5200, (_x, y) => 0.1 + 0.4 * Math.max(0, Math.min(1, (y + 40) / 240)), 1.2, INK);
    // The light along the top of the head and back.
    for (let k = 1; k <= 2; k++) pen.hair(BACK.filter((p) => p.x < -30 && p.x > -1800).map((p) => ({ x: p.x, y: p.y + 6 + k * 9 })), 3 - k * 0.8, LIGHT, 0.3 - k * 0.1);
    // A fold of skin over the throat.
    pen.hair(CREASE.map((p) => ({ x: p.x - 6, y: p.y + 4 })), 1.4, INK, 0.3);
  });
  // The outline: not across the fins' roots.
  strokeOutside(pen, BACK, [[-886, -1262], [-1638, -1780]], 6);
  strokeOutside(pen, BELLY, [[-1686, -1822]], 5.5);
  pen.stroke(MOUTH, 4.6, INK, 1, false);
  pen.hair(MOUTH.map((p) => ({ x: p.x, y: p.y - 4 })), 1.8, LIGHT, 0.35);
  pen.hair(CREASE, 2, INK, 0.45);

  paintFin(pen, PELVIC, { x: -1290, y: 170 }, { x: -1384, y: 254 }, [PELVIC], 1);
  paintFin(pen, PECTORAL, { x: -580, y: 128 }, { x: -880, y: 352 }, [PECTORAL.slice(0, -1)], 9);
  // Where the pectoral leaves the body: a crease.
  pen.hair(spline([{ x: -512, y: 106 }, { x: -560, y: 122 }, { x: -610, y: 122 }], 4), 2, INK, 0.7);
  eye(pen);
}

function paintTail(ctx: CanvasRenderingContext2D, seed: number): void {
  const pen = new Pen(ctx, seed, W);
  pen.fill(TAIL, PAPER_FILL, 1);
  pen.clipped(TAIL, () => {
    ctx.translate(5, 4);
    pen.fill(TAIL, FIN_WASH, 0.88);
    ctx.translate(-5, -4);
    // Lines along each lobe, from the stock out to the trailing edge, and pale spots.
    for (let k = 0; k < 14; k++) {
      const u = (k + 0.5) / 14;
      for (const [lead, trail] of [[TAIL_UPPER_LEAD, TAIL_UPPER_TRAIL], [TAIL_LOWER_LEAD, TAIL_LOWER_TRAIL]] as const) {
        const to = trail[Math.round(u * (trail.length - 1))]!;
        const from = lead[lead === TAIL_UPPER_LEAD ? 1 : lead.length - 2]!;
        pen.hair([from, { x: (from.x + to.x) / 2 - 10, y: (from.y + to.y) / 2 }, to], 1, INK, 0.26);
      }
    }
    for (let i = 0; i < 16; i++) {
      const lead = i % 3 === 0 ? TAIL_LOWER_LEAD : TAIL_UPPER_LEAD;
      const p = lead[Math.floor(pen.rng() * lead.length)]!;
      const q = { x: p.x - 20 - pen.rng() * 50, y: p.y * (0.55 + pen.rng() * 0.3) };
      pen.fill(ellipse(q.x, q.y, 5 + pen.rng() * 3, 4.5 + pen.rng() * 2.5, 9), PALE, 0.55);
    }
  });
  linearShade(ctx, TAIL, { x: 0, y: -470 }, { x: 0, y: 270 }, [[0, 'rgba(238,243,242,0.14)'], [0.45, 'rgba(15,21,28,0.08)'], [1, 'rgba(15,21,28,0.45)']]);
  // The keel on the tail stock, where the lowest ridge ends.
  pen.hair([{ x: -1930, y: 2 }, { x: -2060, y: 0 }, { x: -2130, y: 6 }], 2, INK, 0.5);
  pen.stroke([...TAIL_UPPER_LEAD, ...TAIL_UPPER_TRAIL.slice(1), ...TAIL_LOWER_TRAIL.slice(1), ...TAIL_LOWER_LEAD.slice(1)], 5, INK, 1, true);
}

/** The lower jaw, shut: white under the chin, spotted along its side, the lower lip inked. */
function paintJaw(ctx: CanvasRenderingContext2D, seed: number): void {
  const pen = new Pen(ctx, seed, W * 0.8);
  pen.fill(JAW, PAPER_FILL, 1);
  pen.clipped(JAW, () => {
    pen.fill(JAW, WASH, 0.85);
    for (let i = 0; i < 9; i++) {
      const x = -12 - i * 18 + pen.jitter(4);
      pen.fill(ellipse(x, edgeAt(LOWER_LIP, x) + 10 + pen.jitter(3), 3.4, 3, 8), PALE, 0.6);
    }
    const under = [...CHIN.map((p) => ({ x: p.x, y: p.y - 18 - Math.max(0, p.x) })), { x: -280, y: 160 }, { x: 30, y: 160 }];
    pen.fill(under, PAPER_FILL, 0.84);
  });
  linearShade(ctx, JAW, { x: 0, y: 12 }, { x: 0, y: 112 }, [[0, 'rgba(238,243,242,0.12)'], [0.6, 'rgba(15,21,28,0.18)'], [1, 'rgba(15,21,28,0.42)']]);
  pen.clipped(JAW, () => {
    for (let k = 1; k <= 3; k++) pen.hair(CHIN.map((p) => ({ x: p.x - 2, y: p.y - k * 7 })), 1, INK, 0.45 - k * 0.1);
  });
  pen.stroke(LOWER_LIP, 4, INK, 1, false);
  pen.stroke(CHIN, 5, INK, 1, true);
}

/** The inside of the mouth: a pale lining at the lips, darkening into the throat, the spongy filter pads arching across the back. */
function paintThroat(ctx: CanvasRenderingContext2D, seed: number): void {
  const pen = new Pen(ctx, seed, 0.8);
  const g = ctx.createRadialGradient(-130, 60, 10, -110, 60, 240);
  g.addColorStop(0, '#080b0f');
  g.addColorStop(0.35, '#192028');
  g.addColorStop(0.62, '#3d3c40');
  g.addColorStop(0.85, '#7d716f');
  g.addColorStop(1, '#a89a94');
  ctx.fillStyle = g;
  ctx.fillRect(THROAT_BOX.x0, THROAT_BOX.y0, THROAT_BOX.x1 - THROAT_BOX.x0, THROAT_BOX.y1 - THROAT_BOX.y0);
  // The filter pads: arches of fine mesh, dark gaps between.
  for (let k = 0; k < 5; k++) {
    const cx = -150 + k * 16;
    const ry = 70 - k * 4;
    const arch = Array.from({ length: 13 }, (_, i) => {
      const a = -Math.PI / 2 + (i / 12) * Math.PI;
      return { x: cx + Math.cos(a) * 12, y: 50 + Math.sin(a) * ry };
    });
    pen.stroke(arch, 6, '#4b5258', 0.75, false);
    for (let i = 0; i < 12; i++) pen.hair([arch[i]!, { x: arch[i]!.x + 8, y: arch[i + 1]!.y }], 0.9, '#8d9295', 0.55);
    pen.hair(arch.map((p) => ({ x: p.x + 5, y: p.y })), 1.4, SHADOW, 0.85);
  }
  // The floor of the mouth, the thick tongue pad.
  pen.fill(ellipse(-40, 150, 120, 40, 20), '#8b7c78', 0.45);
  pen.hair(spline([{ x: -150, y: 128 }, { x: -60, y: 116 }, { x: 60, y: 130 }], 6), 1.6, SHADOW, 0.5);
}

// ---------------------------------------------------------------- baking

interface Sprites {
  readonly body: readonly HTMLCanvasElement[];
  readonly tail: readonly HTMLCanvasElement[];
  readonly jaw: readonly HTMLCanvasElement[];
  readonly throat: readonly HTMLCanvasElement[];
}

let sprites: Sprites | null = null;

const seedOf = (f: number): number => 4201 + f * 977;

function sheet(box: Box, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(Math.ceil((box.x1 - box.x0) * RES), Math.ceil((box.y1 - box.y0) * RES));
  ctx.scale(RES, RES);
  ctx.translate(-box.x0, -box.y0);
  draw(ctx);
  return canvas;
}

function bake(): Sprites {
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => f);
  return {
    body: frames.map((f) => sheet(BODY_BOX, (ctx) => paintBody(ctx, seedOf(f)))),
    tail: frames.map((f) => sheet(TAIL_BOX, (ctx) => paintTail(ctx, seedOf(f) + 13))),
    jaw: frames.map((f) => sheet(JAW_BOX, (ctx) => paintJaw(ctx, seedOf(f) + 29))),
    throat: frames.map((f) => sheet(THROAT_BOX, (ctx) => paintThroat(ctx, seedOf(f) + 41))),
  };
}

function ensure(): Sprites {
  sprites ??= bake();
  return sprites;
}

export async function prepare(): Promise<void> {
  ensure();
}

// ---------------------------------------------------------------- drawing (local px; the caller's transform is set up in enter())

export interface WhaleSharkPose {
  /** 0 shut .. 1 gaping wide, filter-feeding. */
  readonly gape?: number;
  /** Tail-beat phase, radians. */
  readonly tail?: number;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

function blit(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, box: Box): void {
  ctx.drawImage(c, box.x0, box.y0, c.width / RES, c.height / RES);
}

/** How far the body is bent at x (local px) by the tail beat. */
function flexAt(x: number, phase: number): number {
  const b = clamp01((x - BEND_FROM) / (TAIL_PIVOT.x - BEND_FROM));
  return FLEX * b * b * Math.sin(phase - 2.2 * b);
}

function drawBody(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, phase: number): void {
  const k = 1 / RES;
  const split = Math.round((BEND_FROM - BODY_BOX.x0) * RES);
  ctx.drawImage(c, split, 0, c.width - split, c.height, BODY_BOX.x0 + split * k, BODY_BOX.y0, (c.width - split) * k, c.height * k);
  const step = 6;
  for (let sx = 0; sx < split; sx += step) {
    const w = Math.min(step, split - sx);
    const dy = flexAt(BODY_BOX.x0 + (sx + w / 2) * k, phase);
    ctx.drawImage(c, sx, 0, w, c.height, BODY_BOX.x0 + sx * k, BODY_BOX.y0 + dy, w * k + 0.6, c.height * k);
  }
}

/** The tail swings across, toward and away from us: it narrows as it turns edge-on, and rides the bend of the tail stock. */
function drawTail(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, phase: number): void {
  const dy = flexAt(TAIL_PIVOT.x, phase);
  const slope = (flexAt(TAIL_PIVOT.x, phase) - flexAt(TAIL_PIVOT.x + 40, phase)) / 40;
  ctx.save();
  ctx.translate(TAIL_PIVOT.x, TAIL_PIVOT.y + dy);
  ctx.rotate(-slope * 1.5);
  ctx.scale(0.8 + 0.2 * Math.cos(phase), 1);
  ctx.translate(-TAIL_PIVOT.x, -TAIL_PIVOT.y);
  blit(ctx, c, TAIL_BOX);
  ctx.restore();
}

/** The mouth's opening at a gape: the upper lip, the dropped lower lip, and the far lip bulging forward (it's turned a little toward us, so the opening reads as an oval). */
interface Opening {
  readonly shape: Pt[];
  readonly lower: Pt[];
  readonly rim: Pt[];
  readonly farLip: Pt[];
  readonly centre: Pt;
  readonly radius: number;
}

function mouthOpening(gape: number): Opening {
  const lower = LOWER_LIP.map((p) => openJaw(p, gape));
  const top = MOUTH[0]!;
  const bottom = lower[0]!;
  const h = Math.hypot(bottom.x - top.x, bottom.y - top.y);
  const bulge = { x: Math.max(top.x, bottom.x) + h * 0.42, y: (top.y + bottom.y) / 2 + h * 0.08 };
  const rim = Array.from({ length: 15 }, (_, i) => {
    const u = i / 14;
    const a = (1 - u) * (1 - u);
    const b = 2 * u * (1 - u);
    const c = u * u;
    return { x: a * bottom.x + b * bulge.x + c * top.x, y: a * bottom.y + b * bulge.y + c * top.y };
  });
  const centre = { x: (top.x + bottom.x) / 2 - h * 0.05, y: (top.y + bottom.y) / 2 };
  // The far lip: a crescent along the rim, thickest at the front.
  const inner = rim.map((p, i) => {
    const d = Math.hypot(centre.x - p.x, centre.y - p.y) || 1;
    const th = h * 0.13 * Math.sin((Math.PI * i) / (rim.length - 1));
    return { x: p.x + ((centre.x - p.x) / d) * th, y: p.y + ((centre.y - p.y) / d) * th };
  });
  return {
    shape: [...MOUTH, ...[...lower].reverse(), ...rim.slice(1, -1)],
    lower,
    rim,
    farLip: [...rim, ...[...inner].reverse()],
    centre: { x: centre.x + h * 0.2, y: centre.y },
    radius: Math.max(14, h * 0.5),
  };
}

function drawThroat(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, gape: number): void {
  const { shape, lower } = mouthOpening(gape);
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  blit(ctx, c, THROAT_BOX);
  // The pale lining just inside both lips.
  ctx.strokeStyle = LINING;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  for (const lip of [MOUTH.map((p) => ({ x: p.x, y: p.y + 6 })), lower.map((p) => ({ x: p.x, y: p.y - 6 }))]) {
    ctx.beginPath();
    lip.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.restore();
}

/** Skin stretched between the dropped jaw and the throat, so no gap opens under the corner of the mouth. */
function drawThroatSkin(ctx: CanvasRenderingContext2D, pen: Pen, gape: number): void {
  const under = CHIN.slice(Math.floor(CHIN.length * 0.45)).map((p) => openJaw(p, gape));
  const skin = [...CREASE, ...BELLY.slice(1, 4), ...[...under].reverse()];
  pen.fill(skin, PAPER_FILL, 1);
  pen.fill(skin, WASH, 0.12);
  linearShade(ctx, skin, { x: 0, y: 30 }, { x: 0, y: 150 }, [[0, 'rgba(15,21,28,0.35)'], [0.5, 'rgba(15,21,28,0.12)'], [1, 'rgba(15,21,28,0.3)']]);
  pen.clipped(skin, () => {
    // Pleats of stretched skin fanning back from the corner of the mouth.
    for (let k = 1; k < 5; k++) pen.hair([{ x: HINGE.x - 6, y: HINGE.y + 8 }, under[Math.min(under.length - 1, k * 2)]!], 1.2, INK, 0.3 * gape);
  });
  const outline = spline([under[0]!, under[Math.floor(under.length / 2)]!, BELLY[2]!], 6);
  pen.stroke(outline, 5, INK, 1, false);
}

function drawFarLip(pen: Pen, gape: number): void {
  const { rim, farLip } = mouthOpening(gape);
  pen.fill(farLip, PAPER_FILL, 1);
  pen.fill(farLip, WASH, 0.7);
  pen.hair(farLip.slice(rim.length + 2, -2), 2.2, LINING, 0.7);
  pen.stroke(rim, 4, INK, 1, false);
}

/** Moves the context into the shark's local px. */
function enter(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, flip: boolean): void {
  const s = length / LEN;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(s, flip ? -s : s);
  ctx.translate(-CENTRE.x, -CENTRE.y);
}

/** Snout at +x of the local frame: centre (x, y) in screen px, `length` = snout to tail tip in screen px, `angle` radians, `flip` mirrors vertically, `t` seconds. */
export function drawWhaleShark(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, t: number, pose: WhaleSharkPose = {}, flip = false): void {
  const s = ensure();
  const boil = Math.floor(t * BOIL_FPS + 1e-9) % BOIL_FRAMES;
  const gape = clamp01(pose.gape ?? 0);
  const phase = pose.tail ?? 0;
  const pen = new Pen(ctx, 8801 + boil * 977, W * 0.8);
  ctx.save();
  enter(ctx, x, y, length, angle, flip);
  if (gape > 0.002) {
    drawThroat(ctx, s.throat[boil]!, gape);
    drawThroatSkin(ctx, pen, gape);
  }
  ctx.save();
  ctx.translate(HINGE.x, HINGE.y);
  ctx.rotate(gape * GAPE_MAX);
  ctx.translate(-HINGE.x, -HINGE.y);
  blit(ctx, s.jaw[boil]!, JAW_BOX);
  ctx.restore();
  drawTail(ctx, s.tail[boil]!, phase);
  drawBody(ctx, s.body[boil]!, phase);
  if (gape > 0.002) drawFarLip(pen, gape);
  ctx.restore();
}

/** Where the mouth opening is in screen px (so copepods can be drawn streaming in). */
export function whaleSharkMouth(x: number, y: number, length: number, angle: number, pose: WhaleSharkPose = {}, flip = false): { x: number; y: number; radius: number } {
  const { centre, radius } = mouthOpening(clamp01(pose.gape ?? 0));
  const s = length / LEN;
  const lx = (centre.x - CENTRE.x) * s;
  const ly = (centre.y - CENTRE.y) * s * (flip ? -1 : 1);
  return { x: x + lx * Math.cos(angle) - ly * Math.sin(angle), y: y + lx * Math.sin(angle) + ly * Math.cos(angle), radius: radius * s };
}

// ---------------------------------------------------------------- kit preview

/** Sunlit, plankton-rich water: blue-green, light from above, motes drifting. */
function drawWater(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#6fb3a6');
  g.addColorStop(0.5, '#3f8d8e');
  g.addColorStop(1, '#25617a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const x0 = ((i * 0.17 + 0.05) % 1) * w + Math.sin(t * 0.4 + i) * 30;
    const ray = ctx.createLinearGradient(0, 0, 0, h);
    ray.addColorStop(0, 'rgba(255,250,215,0.12)');
    ray.addColorStop(1, 'rgba(255,250,215,0)');
    ctx.fillStyle = ray;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0 + 60 + i * 9, 0);
    ctx.lineTo(x0 - 120 + i * 30, h);
    ctx.lineTo(x0 - 240 + i * 22, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(240,250,225,0.5)';
  for (let i = 0; i < 260; i++) {
    const px = ((i * 0.6180339 + Math.sin(i) * 0.1) % 1) * w;
    const py = (((i * 0.3819 + t * 0.01 * (1 + (i % 3))) % 1) + 1) % 1 * h;
    ctx.fillRect(px, py, 1.5 + (i % 3), 1.5 + (i % 3));
  }
}

export const KIT: KitEntry = {
  name: 'whaleShark',
  draw(ctx, w, h, t) {
    drawWater(ctx, w, h, t);
    const pose = { gape: 0.5 - 0.5 * Math.cos(t * (Math.PI / 2)), tail: t * 2.4 };
    // Full body, gliding, mouth working; and a big crop of the head, gaping.
    const len = Math.min(w * 0.55, h * 1.1);
    drawWhaleShark(ctx, w * 0.32, h * 0.27, len, -0.04, t, pose);
    const close = len * 2.4;
    drawWhaleShark(ctx, w * 0.9 - close * 0.5, h * 0.86, close, -0.06, t, { gape: 0.8 + 0.2 * Math.sin(t), tail: t * 2.4 });
    // Small and far off, swimming the other way (mirrored and turned round), to check the smallest size and `flip`.
    drawWhaleShark(ctx, w * 0.8, h * 0.18, 220, Math.PI + 0.1, t, pose, true);
  },
};
