import { type Pt } from '../../../../src/art/pen';
import { drawGreatWhite } from '../../foodchain/art/greatWhite';
import { spline } from '../../kraken/whale';
import { path } from '../../seal/art/paint';
import { drawFish, fishOutline, type FishPose } from './fish';

/**
 * The small grey shark with a fish in its jaws. The shark is the painted
 * shark of ../../foodchain/art/greatWhite.ts (slate back, white belly; no
 * species is named anywhere), placed by its snout. The fish is bitten by the
 * front of its head: its snout goes in at the front of the gape, the shark's
 * front teeth are drawn again over it, biting in, and its body and tail hang
 * whole out of the mouth, in front of the lower jaw's tip. Only what really
 * lies inside the shark is hidden: the fish's nose behind the upper jaw and
 * whatever crosses the lower jaw, which is in front of it.
 *
 * The shark's own frame is the great white's: snout at 0,0 facing +x, y down,
 * LEN 1000 from the snout to the tail tip.
 */

export interface SharkPlace {
  readonly snout: Pt;
  /** Snout to tail tip, in the parent frame. */
  readonly len: number;
  readonly angle: number;
  /** 0 shut .. 1 wide. */
  readonly jaw: number;
  /** The tail beat's phase, radians. */
  readonly tail: number;
  readonly worried: number;
}

/** Copied from greatWhite.ts (its shape is fixed): the frame, the outline, the mouth line, the jaw's pivot and travel. */
const LEN = 1000;
const MOUTH: readonly Pt[] = spline([{ x: -50, y: 44 }, { x: -80, y: 50 }, { x: -112, y: 54 }, { x: -146, y: 56 }], 6);
const SNOUT_UNDER: readonly Pt[] = spline([{ x: 0, y: 8 }, { x: -8, y: 21 }, { x: -26, y: 35 }, { x: -50, y: 44 }], 5);
const PIVOT: Pt = MOUTH[MOUTH.length - 1]!;
const JAW_MAX = 0.62;
const PROTRUDE: Pt = { x: 5, y: 11 };
/** The back's top line (for where the osprey's feet go). */
const BACK: readonly Pt[] = spline([
  { x: 0, y: 8 }, { x: -6, y: -4 }, { x: -24, y: -24 }, { x: -60, y: -48 }, { x: -115, y: -70 }, { x: -190, y: -90 },
  { x: -280, y: -103 }, { x: -370, y: -106 }, { x: -460, y: -100 }, { x: -560, y: -84 }, { x: -650, y: -63 },
  { x: -730, y: -42 }, { x: -800, y: -27 }, { x: -860, y: -19 }, { x: -905, y: -1 },
], 6);
/** The underside from the front of the lower jaw to the tail stock. */
const BELLY: readonly Pt[] = spline([
  { x: -50, y: 44 }, { x: -53, y: 55 }, { x: -64, y: 65 }, { x: -88, y: 75 }, { x: -130, y: 86 }, { x: -190, y: 95 },
  { x: -270, y: 101 }, { x: -370, y: 103 }, { x: -470, y: 95 }, { x: -570, y: 80 }, { x: -660, y: 60 },
  { x: -740, y: 41 }, { x: -805, y: 28 }, { x: -860, y: 19 }, { x: -905, y: 1 },
], 6);
/** Where the lower jaw ends under the throat. */
const JAW_BACK_X = -186;

function edgeAt(line: readonly Pt[], x: number): number {
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1]!, line[i]!];
    if ((a.x - x) * (b.x - x) <= 0) return a.y + ((b.y - a.y) * (x - a.x)) / ((b.x - a.x) || 1);
  }
  return line[line.length - 1]!.y;
}

/** The lower jaw, shut (it turns about PIVOT as it opens). */
const JAW_SHAPE: readonly Pt[] = [
  ...MOUTH,
  ...spline([PIVOT, { x: -166, y: 76 }, { x: JAW_BACK_X, y: edgeAt(BELLY, JAW_BACK_X) }], 4).slice(1),
  ...BELLY.filter((p) => p.x > JAW_BACK_X).reverse(),
];

const turn = (p: Pt, o: Pt, a: number): Pt => {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  return { x: o.x + (p.x - o.x) * c - (p.y - o.y) * s, y: o.y + (p.x - o.x) * s + (p.y - o.y) * c };
};

/** The shark's own frame to its parent's. */
export function sharkToWorld(s: SharkPlace, p: Pt): Pt {
  const k = s.len / LEN;
  const [c, n] = [Math.cos(s.angle), Math.sin(s.angle)];
  return { x: s.snout.x + (p.x * c - p.y * n) * k, y: s.snout.y + (p.x * n + p.y * c) * k };
}

/** The top of the back, and the underside, at own x. */
export const backAt = (x: number): number => edgeAt(BACK, x);
export const bellyAt = (x: number): number => edgeAt(BELLY, x);

function upperLine(jaw: number): Pt[] {
  const slide = { x: PROTRUDE.x * jaw, y: PROTRUDE.y * jaw };
  return MOUTH.map((p) => ({ x: p.x + slide.x, y: p.y + slide.y }));
}
const lowerLine = (jaw: number): Pt[] => MOUTH.map((p) => turn(p, PIVOT, jaw * JAW_MAX));

/** The fish's own size in the shark's frame (fish units per shark unit). */
export const FISH_K = 2.3;
/** Where on the fish the teeth close (fish own x, on its midline): just in front of the eye. */
const BITE_X = 96;
/** The fish hangs this far down and forward of straight down out of the mouth (radians from +x, its body's direction). */
const HANG = 1.2;

/** Where the fish is bitten (own frame): in the front of the gape, a little inside the lips. */
export function biteAt(jaw: number): Pt {
  const up = upperLine(jaw)[1]!;
  const lo = lowerLine(jaw)[1]!;
  return { x: (up.x + lo.x) / 2 - 2, y: (up.y + lo.y) / 2 };
}

/**
 * The fish as placed in the shark's frame: its head in the jaws, pointing up
 * and back into the mouth, the body hanging down out of the front of it,
 * its back turned forward (away from the shark).
 */
export function fishInShark(s: SharkPlace, fish: Pick<FishPose, 'worry' | 'wiggle' | 'look'>, swing: number): FishPose {
  const bite = biteAt(s.jaw);
  const a = HANG - Math.PI + swing;
  return { x: bite.x - Math.cos(a) * BITE_X * FISH_K, y: bite.y - Math.sin(a) * BITE_X * FISH_K, k: FISH_K, a, flip: true, bitten: true, ...fish };
}

/** A point of the fish (its own units) in the shark's frame. */
export function fishToShark(f: FishPose, p: Pt): Pt {
  const [c, n] = [Math.cos(f.a), Math.sin(f.a)];
  const y = f.flip ? -p.y : p.y;
  return { x: f.x + (p.x * c - y * n) * f.k, y: f.y + (p.x * n + y * c) * f.k };
}

/** The shark without its lower jaw and gape: snout, head, body (the fins are far from the fish). */
function headAndBody(jaw: number): Pt[] {
  const up = upperLine(jaw);
  return [...SNOUT_UNDER, ...up, { x: JAW_BACK_X - 14, y: bellyAt(JAW_BACK_X - 14) }, ...BELLY.filter((p) => p.x < JAW_BACK_X - 14), ...[...BACK].reverse()];
}
const jawShape = (jaw: number): Pt[] => JAW_SHAPE.map((p) => turn(p, PIVOT, jaw * JAW_MAX));

/** Clips everything outside `shape` (so what is drawn next goes behind it). */
function clipOut(ctx: CanvasRenderingContext2D, shape: readonly Pt[]): void {
  ctx.beginPath();
  ctx.rect(-4000, -4000, 8000, 8000);
  shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip('evenodd');
}

function teeth(ctx: CanvasRenderingContext2D, line: readonly Pt[], up: boolean, from: number, to: number): void {
  ctx.save();
  for (let i = 1; i < line.length - 1; i++) {
    const p = line[i]!;
    if (p.x > from || p.x < to || i % 2) continue;
    const q = line[i + 1]!;
    const d = { x: q.x - p.x, y: q.y - p.y };
    const l = Math.hypot(d.x, d.y) || 1;
    // Upper teeth point down into the gape, lower teeth up.
    const n0 = { x: -d.y / l, y: d.x / l };
    const n = (up ? n0.y > 0 : n0.y < 0) ? { x: -n0.x, y: -n0.y } : n0;
    const w = up ? 5 : 6;
    const h = up ? 12 : 15;
    const tri = [
      { x: p.x - (d.x / l) * w, y: p.y - (d.y / l) * w },
      { x: p.x + n.x * h, y: p.y + n.y * h },
      { x: p.x + (d.x / l) * w, y: p.y + (d.y / l) * w },
    ];
    // The dent each tooth presses into the fish.
    const g0 = ctx.createRadialGradient(tri[1]!.x, tri[1]!.y, 0, tri[1]!.x, tri[1]!.y, 7);
    g0.addColorStop(0, 'rgba(40,24,30,0.55)');
    g0.addColorStop(1, 'rgba(40,24,30,0)');
    ctx.fillStyle = g0;
    ctx.fillRect(tri[1]!.x - 7, tri[1]!.y - 7, 14, 14);
    path(ctx, tri);
    const g = ctx.createLinearGradient(p.x, p.y, tri[1]!.x, tri[1]!.y);
    g.addColorStop(0, '#d9cfc0');
    g.addColorStop(1, '#fbf7ee');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(27,26,31,0.8)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
  ctx.restore();
}

/** Where the lips close on the fish: a soft dark pinch along both jaws' edges. */
function pinch(ctx: CanvasRenderingContext2D, up: readonly Pt[], lo: readonly Pt[]): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (const [line, dy] of [[up, 5], [lo, -5]] as const) {
    ctx.strokeStyle = 'rgba(30,22,30,0.32)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    line.slice(0, 9).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + dy) : ctx.moveTo(p.x, p.y + dy)));
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The shark with the fish in its jaws, placed. `fish` sets the fish's face
 * and struggle; `swing` turns it about the bite a little.
 */
export function drawSharkWithFish(ctx: CanvasRenderingContext2D, s: SharkPlace, t: number, fish: Pick<FishPose, 'worry' | 'wiggle' | 'look'> | null, swing: number, boil: number): void {
  const k = s.len / LEN;
  const centre = sharkToWorld(s, { x: -LEN / 2, y: 0 });
  drawGreatWhite(ctx, centre.x, centre.y, s.len, s.angle, t, { jaw: s.jaw, tail: s.tail, worried: s.worried });
  if (!fish) return;
  ctx.save();
  ctx.translate(s.snout.x, s.snout.y);
  ctx.rotate(s.angle);
  ctx.scale(k, k);
  const up = upperLine(s.jaw);
  const lo = lowerLine(s.jaw);
  const placed = fishInShark(s, fish, swing);
  const outline = fishOutline(placed);
  // The fish over the dark of the gape, but behind the snout and the lower jaw.
  ctx.save();
  clipOut(ctx, headAndBody(s.jaw));
  clipOut(ctx, jawShape(s.jaw));
  drawFish(ctx, placed, boil);
  path(ctx, outline);
  ctx.clip();
  pinch(ctx, up, lo);
  ctx.restore();
  // The front teeth again, over the fish where they bite into it.
  ctx.save();
  path(ctx, outline);
  ctx.clip();
  teeth(ctx, up, false, -50, -100);
  teeth(ctx, lo, true, -50, -100);
  ctx.restore();
  ctx.restore();
}
