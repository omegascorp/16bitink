import { type Pt } from '../../../../src/art/pen';
import { drawGreatWhite } from '../../foodchain/art/greatWhite';
import { spline } from '../../kraken/whale';
import { path } from '../../seal/art/paint';
import { drawFish, type FishPose } from './fish';

/**
 * The small grey shark with a fish in its jaws. The shark is the painted
 * shark of ../../foodchain/art/greatWhite.ts (slate back, white belly; no
 * species is named anywhere), placed by its snout. The fish is held by its
 * tail stock in the gape: it shows in the open mouth and in front of it, but
 * not through the snout or the lower jaw, and the shark's front teeth are
 * drawn again over it, biting in.
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

/** Copied from greatWhite.ts (its shape is fixed): the frame, the mouth line, the jaw's pivot and travel. */
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
const BELLY_Y = (x: number): number => 103 * Math.max(0, 1 - ((x + 370) / 540) ** 2);

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

/** The top of the back at own x. */
export function backAt(x: number): number {
  for (let i = 1; i < BACK.length; i++) {
    const [a, b] = [BACK[i - 1]!, BACK[i]!];
    if ((a.x - x) * (b.x - x) <= 0) return a.y + ((b.y - a.y) * (x - a.x)) / ((b.x - a.x) || 1);
  }
  return 0;
}
export const bellyAt = BELLY_Y;

function upperLine(jaw: number): Pt[] {
  const slide = { x: PROTRUDE.x * jaw, y: PROTRUDE.y * jaw };
  return MOUTH.map((p) => ({ x: p.x + slide.x, y: p.y + slide.y }));
}
const lowerLine = (jaw: number): Pt[] => MOUTH.map((p) => turn(p, PIVOT, jaw * JAW_MAX));

/** Where in the gape the fish is held (own frame), and its angle. */
export function gripAt(jaw: number): { readonly at: Pt; readonly a: number } {
  const up = upperLine(jaw);
  const lo = lowerLine(jaw);
  const i = Math.round(up.length * 0.45);
  return { at: { x: (up[i]!.x + lo[i]!.x) / 2, y: (up[i]!.y + lo[i]!.y) / 2 }, a: 0.95 };
}

/** The fish's own size in the shark's frame (fish units per shark unit). */
export const FISH_K = 2.3;

/** The fish as placed in the shark's frame. */
export function fishInShark(s: SharkPlace, fish: Pick<FishPose, 'worry' | 'wiggle' | 'look'>, swing: number): FishPose {
  const g = gripAt(s.jaw);
  const a = g.a + swing;
  // The fish's tail stock (own -80,0) sits at the grip.
  return { x: g.at.x + Math.cos(a) * 80 * FISH_K, y: g.at.y + Math.sin(a) * 80 * FISH_K, k: FISH_K, a, ...fish };
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
    const w = up ? 4.5 : 5.5;
    const h = up ? 10 : 13;
    const tri = [
      { x: p.x - (d.x / l) * w, y: p.y - (d.y / l) * w },
      { x: p.x + n.x * h, y: p.y + n.y * h },
      { x: p.x + (d.x / l) * w, y: p.y + (d.y / l) * w },
    ];
    path(ctx, tri);
    const g = ctx.createLinearGradient(p.x, p.y, tri[1]!.x, tri[1]!.y);
    g.addColorStop(0, '#d9cfc0');
    g.addColorStop(1, '#fbf7ee');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(27,26,31,0.75)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The shark with the fish in its jaws, placed. `fish` sets the fish's face
 * and struggle; `swing` turns it about its grip a little.
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
  const tipL = lo[0]!;
  // What the fish may show through: the gape and the open water in front of it.
  const show: Pt[] = [
    ...[...up].reverse(), ...[...SNOUT_UNDER].reverse(), { x: 0, y: 8 }, { x: 900, y: 8 }, { x: 900, y: 1600 },
    { x: tipL.x - 8, y: 1600 }, { x: tipL.x - 8, y: tipL.y + 26 }, ...lo,
  ];
  ctx.save();
  path(ctx, show);
  ctx.clip();
  // The dark of the mouth round the tail stock, then the fish.
  drawFish(ctx, fishInShark(s, fish, swing), boil);
  ctx.restore();
  ctx.save();
  path(ctx, show);
  ctx.clip();
  teeth(ctx, up, false, -58, -122);
  teeth(ctx, lo, true, -58, -122);
  ctx.restore();
  ctx.restore();
}
