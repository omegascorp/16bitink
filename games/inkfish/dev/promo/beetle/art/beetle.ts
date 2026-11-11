import type { Pt } from '../../../../src/art/pen';
import { dab, smoothLoop, softLine, taper } from '../../seal/art/paint';
import { fillShape, inkLine, unitPx, within } from '../../pelican/art/ink';

/**
 * Regimbartia attenuata, a small water scavenger beetle (Hydrophilidae),
 * seen from above: one smooth glossy oval (the pronotum and wing cases run
 * together, a fine line between them and the seam down the back), very dark
 * brown-black with a warm sheen and a bright wet highlight, a small head with
 * dark eyes and short clubbed antennae, six slender legs, the hind pair long.
 * Painted to the bar of ../../seal/art/capeFurSeal.ts: washes, a catchlight
 * on the shell, thin interior ink, a firm outline.
 *
 * Own units: facing +x, the middle at 0,0, about 31 long (rear -15.4 to the
 * head's front at +15.4) and 18.6 wide.
 */

export interface BeetlePose {
  readonly x: number;
  readonly y: number;
  readonly k: number;
  /** Heading, radians (0 faces +x). */
  readonly a: number;
  /** Walking: the stride's phase (radians). */
  readonly step: number;
  /** 0 calm .. 1 every leg flailing. */
  readonly flail: number;
  /** 0 .. 1 a hard kick: the legs thrust straight out. */
  readonly kick: number;
  /** Seen from above (1) or squashed for a low three-quarter view on the ground (~0.55). */
  readonly tilt: number;
  /** 0 colour .. 1 a dim grey shape. */
  readonly dim: number;
  /** 0 .. 1 glowing warm (the X-ray). */
  readonly glow: number;
  /** A shake of the whole body, radians. */
  readonly wiggle: number;
  /** Clock time, for the flail's jitter. */
  readonly t: number;
  /** 0 gone .. 1 there. */
  readonly alpha?: number;
}

export const BEETLE_LEN = 31;

export const BEETLE_REST: Omit<BeetlePose, 'x' | 'y' | 'k'> = { a: 0, step: 0, flail: 0, kick: 0, tilt: 1, dim: 0, glow: 0, wiggle: 0, t: 0 };

const SHELL = smoothLoop([
  { x: 10.6, y: -5.2 }, { x: 7.4, y: -7.9 }, { x: 1.5, y: -9.2 }, { x: -5, y: -9.3 }, { x: -10.2, y: -7.9 }, { x: -14, y: -4.8 }, { x: -15.4, y: 0 },
  { x: -14, y: 4.8 }, { x: -10.2, y: 7.9 }, { x: -5, y: 9.3 }, { x: 1.5, y: 9.2 }, { x: 7.4, y: 7.9 }, { x: 10.6, y: 5.2 }, { x: 11.2, y: 0 },
], 6);
const HEAD = smoothLoop([{ x: 9.6, y: -4.3 }, { x: 13, y: -3.7 }, { x: 15, y: -1.8 }, { x: 15.4, y: 0 }, { x: 15, y: 1.8 }, { x: 13, y: 3.7 }, { x: 9.6, y: 4.3 }], 5);

interface Leg {
  readonly root: Pt;
  /** Rest angles of femur, tibia and tarsus (for the +y side; mirrored for -y). */
  readonly ang: readonly [number, number, number];
  readonly len: readonly [number, number, number];
  /** The tripod the leg walks in (0 or 1). */
  readonly set: 0 | 1;
}

const LEGS: readonly Leg[] = [
  { root: { x: 7.5, y: 6.2 }, ang: [1.05, 0.45, 0.25], len: [5, 5.6, 3.6], set: 0 },
  { root: { x: 1, y: 7.6 }, ang: [1.7, 2.2, 2.5], len: [5.4, 6, 4], set: 1 },
  { root: { x: -4.5, y: 7.8 }, ang: [2.25, 2.7, 2.95], len: [6.4, 8.2, 6.4], set: 0 },
];

const dir = (a: number, side: number): Pt => ({ x: Math.cos(a), y: Math.sin(a) * side });

/** One leg's joints, posed. */
function legPoints(leg: Leg, side: 1 | -1, i: number, p: BeetlePose): Pt[] {
  const set = side > 0 ? leg.set : 1 - leg.set;
  const swing = 0.32 * Math.sin(p.step + set * Math.PI);
  const jit = p.flail * 0.7 * Math.sin(p.t * (21 + i * 3.3) + i * 1.9 + (side > 0 ? 0 : 2.4));
  const jit2 = p.flail * 0.5 * Math.sin(p.t * (27 + i * 2.1) + i * 0.7 + (side > 0 ? 1.1 : 0));
  // A kick straightens each leg along its femur, pointing back and out.
  const kickTo = i === 0 ? 1.35 : i === 1 ? 2.15 : 2.75;
  const angs = leg.ang.map((a, j) => {
    const flail = a + jit * (j === 0 ? 0.8 : 1) + jit2 * (j === 2 ? 1 : 0.4) - p.flail * 0.25 * (j === 0 ? -1 : 1);
    const walked = flail + swing * (j === 0 ? 1 : 0.6);
    return walked + (kickTo - walked) * p.kick;
  });
  const lens = leg.len.map((l, j) => l * (1 + p.kick * (j === 1 ? 0.15 : 0.1)));
  const pts: Pt[] = [{ x: leg.root.x, y: leg.root.y * side }];
  angs.forEach((a, j) => {
    const prev = pts[pts.length - 1]!;
    const d = dir(a, side);
    pts.push({ x: prev.x + d.x * lens[j]!, y: prev.y + d.y * lens[j]! });
  });
  return pts;
}

function drawLegs(ctx: CanvasRenderingContext2D, p: BeetlePose, colour: string, hairs: boolean): void {
  LEGS.forEach((leg, i) => {
    for (const side of [1, -1] as const) {
      const [a, b, c, d] = legPoints(leg, side, i, p);
      taper(ctx, [a!, b!], 2.4, 1.7, colour, 1);
      taper(ctx, [b!, c!], 1.7, 1.1, colour, 1);
      taper(ctx, [c!, d!], 1.1, 0.6, colour, 1);
      // The hind legs' swimming fringe.
      if (hairs && i === 2) {
        for (let h = 1; h < 5; h++) {
          const u = h / 5;
          const q = { x: b!.x + (c!.x - b!.x) * u, y: b!.y + (c!.y - b!.y) * u };
          const n = { x: -(c!.y - b!.y), y: c!.x - b!.x };
          const len = Math.hypot(n.x, n.y) || 1;
          taper(ctx, [q, { x: q.x + (n.x / len) * 1.6 * side, y: q.y + (n.y / len) * 1.6 * side }], 0.35, 0.1, colour, 0.7);
        }
      }
    }
  });
}

/** Little "kick" strokes beside the hind legs' feet. */
function drawKickLines(ctx: CanvasRenderingContext2D, p: BeetlePose): void {
  if (p.kick < 0.05) return;
  LEGS.forEach((leg, i) => {
    for (const side of [1, -1] as const) {
      const pts = legPoints(leg, side, i, p);
      const tip = pts[pts.length - 1]!;
      const back = pts[pts.length - 2]!;
      const d = { x: tip.x - back.x, y: tip.y - back.y };
      const len = Math.hypot(d.x, d.y) || 1;
      const u = { x: d.x / len, y: d.y / len };
      const n = { x: -u.y, y: u.x };
      for (const o of [-1.8, 0, 1.8]) {
        const s = { x: tip.x + u.x * 2.2 + n.x * o, y: tip.y + u.y * 2.2 + n.y * o };
        const e = { x: s.x + u.x * (3 + 3 * p.kick), y: s.y + u.y * (3 + 3 * p.kick) };
        inkLine(ctx, [s, e], 3.2, 0.85 * p.kick, 0, false, '#ffe7b8');
      }
    }
  });
}

function paintShell(ctx: CanvasRenderingContext2D): void {
  within(ctx, SHELL, () => {
    const g = ctx.createRadialGradient(-2, -3.5, 1, -1, 0, 17);
    g.addColorStop(0, '#6b4524');
    g.addColorStop(0.35, '#3b2412');
    g.addColorStop(0.75, '#1a0f08');
    g.addColorStop(1, '#0b0705');
    ctx.fillStyle = g;
    ctx.fillRect(-17, -11, 30, 22);
    // A warm bounce along the lower flank, the dark rim, rows of fine punctures.
    softLine(ctx, [{ x: -12, y: 6.2 }, { x: -4, y: 8.2 }, { x: 6, y: 7 }], 3, '#8a5428', 0.4, 4);
    for (const side of [1, -1]) {
      for (const r of [2.6, 5.2, 7.2]) {
        softLine(ctx, [{ x: 3, y: side * r * 0.92 }, { x: -6, y: side * r }, { x: -13, y: side * r * 0.62 }], 0.45, '#7a5434', 0.35, 1);
      }
    }
    // The wet highlight: a long soft streak and a hard catchlight.
    softLine(ctx, [{ x: -11.5, y: -4.4 }, { x: -5, y: -6.4 }, { x: 2, y: -6 }], 3.4, '#fff0d2', 0.6, 5);
    softLine(ctx, [{ x: -8, y: -5.6 }, { x: -3, y: -6.6 }], 1.1, '#ffffff', 0.85, 2);
    dab(ctx, 7.4, -3.4, 2.6, '255,236,200', 0.55);
    dab(ctx, -3, 5, 6, '0,0,0', 0.25);
  });
  // The fine line between pronotum and wing cases, and the seam down the back.
  inkLine(ctx, [{ x: 4.6, y: -8.6 }, { x: 3.6, y: -4 }, { x: 3.3, y: 0 }, { x: 3.6, y: 4 }, { x: 4.6, y: 8.6 }], 1, 0.75, 0, false, '#050302');
  inkLine(ctx, [{ x: 3.3, y: 0 }, { x: -15, y: 0 }], 0.9, 0.7, 0, false, '#050302');
}

function paintHead(ctx: CanvasRenderingContext2D): void {
  // Short clubbed antennae.
  for (const side of [1, -1]) {
    taper(ctx, [{ x: 14.4, y: side * 2.2 }, { x: 16.2, y: side * 3.6 }, { x: 17.2, y: side * 4.4 }], 0.7, 0.6, '#2a1a0e', 1);
    ctx.fillStyle = '#3a2614';
    ctx.beginPath();
    ctx.ellipse(17.9, side * 5, 1.3, 0.9, side * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  within(ctx, HEAD, () => {
    const g = ctx.createLinearGradient(9, -4, 15, 4);
    g.addColorStop(0, '#4a2e17');
    g.addColorStop(1, '#0d0806');
    ctx.fillStyle = g;
    ctx.fillRect(9, -5, 7, 10);
    dab(ctx, 12.5, -1.6, 1.8, '255,230,190', 0.4);
  });
  for (const side of [1, -1]) {
    ctx.fillStyle = '#050403';
    ctx.beginPath();
    ctx.ellipse(12.6, side * 3.1, 1.5, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(12.9, side * 3.1 - 0.4, 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Grey shapes over the beetle for its dim (didn't-light-up) look. */
function paintDim(ctx: CanvasRenderingContext2D, p: BeetlePose): void {
  ctx.save();
  ctx.globalAlpha = p.dim * 0.82;
  drawLegs(ctx, p, '#4c5658', false);
  fillShape(ctx, SHELL, '#4c5658');
  fillShape(ctx, HEAD, '#4c5658');
  ctx.restore();
}

/** The painted beetle, placed. */
export function drawBeetle(ctx: CanvasRenderingContext2D, p: BeetlePose, boil: number): void {
  ctx.save();
  ctx.globalAlpha *= p.alpha ?? 1;
  ctx.translate(p.x, p.y);
  ctx.scale(p.k, p.k * p.tilt);
  ctx.rotate(p.a + p.wiggle);
  const px = unitPx(ctx);
  const line = Math.max(1.1, Math.min(2.6, 0.09 / px));
  if (p.glow > 0) {
    dab(ctx, 0, 0, 30, '255,196,96', 0.5 * p.glow);
    dab(ctx, 0, 0, 16, '255,220,150', 0.5 * p.glow);
  }
  // A soft shadow under the body.
  if (p.tilt < 0.95 && p.dim < 0.5) dab(ctx, -1, 3, 18, '0,0,0', 0.35);
  drawLegs(ctx, p, '#22150c', true);
  drawKickLines(ctx, p);
  paintHead(ctx);
  paintShell(ctx);
  inkLine(ctx, HEAD, line * 0.8, 0.85, boil, true, '#050302');
  inkLine(ctx, SHELL, line, 0.9, boil, true, '#050302');
  if (p.glow > 0) inkLine(ctx, SHELL, line * 1.2, 0.8 * p.glow, boil, true, '#ffd27a');
  if (p.dim > 0) paintDim(ctx, p);
  ctx.restore();
}
