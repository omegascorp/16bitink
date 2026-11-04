import { type Pt } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import { dab, path, smoothLoop, softLine, taper } from '../../seal/art/paint';

/**
 * The wels catfish seen from above through the shallows: a giant tadpole with a
 * broad flat head, tiny eyes set wide, splayed pectorals, and two long whiskers
 * reaching ahead of it. The spine bends, so the fish can glide along the bank
 * or curl in towards the shore. Soft-edged and tinted by the water over it.
 */

export interface TopPose {
  /** The nose, in the world. */
  readonly x: number;
  readonly y: number;
  /** Length in px. */
  readonly len: number;
  /** The way the nose points, radians. */
  readonly heading: number;
  /** How far the body bends behind the head, radians. */
  readonly curl: number;
  /** Tail-beat phase, radians. */
  readonly beat: number;
}

const N = 40;
const WIDE = 0.106;
const HEAD = 0.17;

const halfAt = (s: number): number => {
  if (s < HEAD) return WIDE * Math.sqrt(1 - ((HEAD - s) / HEAD) ** 2) ** 0.8;
  return WIDE * (1 - ((s - HEAD) / (1 - HEAD)) ** 0.95) * 0.96 + 0.006;
};

/** The spine from nose to tail, with its direction and half-width at each step. */
function spine(p: TopPose): readonly { readonly at: Pt; readonly a: number; readonly half: number }[] {
  const out: { at: Pt; a: number; half: number }[] = [];
  let [x, y] = [p.x, p.y];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const a = p.heading + p.curl * Math.min(1, s / 0.42) + 0.34 * s * s * Math.sin(p.beat - s * 7);
    out.push({ at: { x, y }, a, half: halfAt(s) * p.len });
    x -= (Math.cos(a) * p.len) / N;
    y -= (Math.sin(a) * p.len) / N;
  }
  return out;
}

const across = (q: { at: Pt; a: number }, d: number): Pt => ({ x: q.at.x - Math.sin(q.a) * d, y: q.at.y + Math.cos(q.a) * d });

/** The two whisker roots, at the corners of the head. */
export function whiskerRoots(p: TopPose): readonly [Pt, Pt] {
  const sp = spine(p);
  const q = sp[3]!;
  return [across(q, -q.half * 0.92), across(q, q.half * 0.92)];
}

function fin(ctx: CanvasRenderingContext2D, base: Pt, a: number, len: number): void {
  const tip = { x: base.x + Math.cos(a) * len, y: base.y + Math.sin(a) * len };
  const [nx, ny] = [-Math.sin(a) * len * 0.34, Math.cos(a) * len * 0.34];
  const shape = smoothLoop([base, { x: (base.x + tip.x) / 2 + nx, y: (base.y + tip.y) / 2 + ny }, tip, { x: (base.x + tip.x) / 2 - nx * 0.5, y: (base.y + tip.y) / 2 - ny * 0.5 }], 5);
  ctx.fillStyle = '#26321f';
  path(ctx, shape);
  ctx.fill();
}

/** The body: to be clipped to the water by the caller. */
export function drawCatfishTop(ctx: CanvasRenderingContext2D, p: TopPose, alpha: number): void {
  if (alpha <= 0.01) return;
  const sp = spine(p);
  const left = sp.map((q) => across(q, -q.half));
  const right = sp.map((q) => across(q, q.half));
  const shape = smoothLoop([...left, ...[...right].reverse()].filter((_, i) => i % 2 === 0), 3);
  const line = sp.map((q) => q.at);
  ctx.save();
  ctx.globalAlpha = alpha;
  // Its shadow on the river bed, soft and wide.
  softLine(ctx, line.slice(1, 36).map((q) => ({ x: q.x + 8, y: q.y + 14 })), p.len * WIDE * 2.5, '#123f42', 0.5, 6);
  const q0 = sp[12]!;
  fin(ctx, across(q0, -q0.half * 0.85), q0.a - Math.PI + 1.25, p.len * 0.13);
  fin(ctx, across(q0, q0.half * 0.85), q0.a + Math.PI - 1.25, p.len * 0.13);
  const tail = sp[N]!;
  fin(ctx, tail.at, tail.a + Math.PI, p.len * 0.05);
  ctx.save();
  path(ctx, shape);
  ctx.clip();
  ctx.fillStyle = '#212b1f';
  ctx.fillRect(p.x - 2000, p.y - 2000, 4000, 4000);
  softLine(ctx, line, p.len * 0.05, '#0d140e', 0.75, 5);
  softLine(ctx, sp.map((q) => across(q, -q.half * 0.62)), p.len * 0.024, '#5a6a46', 0.65, 4);
  softLine(ctx, sp.map((q) => across(q, q.half * 0.62)), p.len * 0.024, '#5a6a46', 0.65, 4);
  const rng = createRng(95);
  for (let i = 0; i < 90; i++) {
    const q = sp[Math.floor(rng() * N)]!;
    const c = across(q, (rng() - 0.5) * 1.9 * q.half);
    const dark = rng() < 0.6;
    dab(ctx, c.x, c.y, p.len * (0.012 + rng() * 0.026), dark ? '4,8,5' : '120,134,88', dark ? 0.6 : 0.42);
  }
  const brow = sp[6]!;
  dab(ctx, brow.at.x, brow.at.y, p.len * 0.09, '176,200,160', 0.34);
  ctx.restore();
  // Tiny eyes, far apart.
  const e = sp[5]!;
  for (const s of [-1, 1]) {
    const c = across(e, s * e.half * 0.74);
    dab(ctx, c.x, c.y, p.len * 0.012, '6,8,6', 0.9);
    dab(ctx, c.x, c.y, p.len * 0.005, '226,200,110', 1);
  }
  ctx.restore();
}

/**
 * The two long whiskers, reaching to `tips`, wriggling: on top of the gravel as
 * well as the water, so they're drawn after the shore. Thick at the root.
 */
export function drawTopWhiskers(ctx: CanvasRenderingContext2D, p: TopPose, tips: readonly [Pt, Pt], wriggle: number, alpha: number): void {
  if (alpha <= 0.01) return;
  const roots = whiskerRoots(p);
  ctx.save();
  ctx.globalAlpha = alpha;
  tips.forEach((tip, side) => {
    const root = roots[side]!;
    const [dx, dy] = [tip.x - root.x, tip.y - root.y];
    const len = Math.hypot(dx, dy) || 1;
    const bow = (side ? 1 : -1) * len * 0.28;
    const pts = Array.from({ length: 22 }, (_, i) => {
      const u = i / 21;
      const off = bow * Math.sin(u * Math.PI) ** 0.8 + 16 * u * Math.sin(wriggle + u * 8 + side);
      return { x: root.x + dx * u - (dy / len) * off, y: root.y + dy * u + (dx / len) * off };
    });
    for (const [r, colour] of [[10, '#10140e'], [8, '#4a5438']] as const) {
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.arc(root.x, root.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const shadow = pts.map((q) => ({ x: q.x + 5, y: q.y + 8 }));
    taper(ctx, shadow, 15, 3, '#1c2622', 0.32);
    taper(ctx, pts, 19, 3, '#10140e', 1);
    taper(ctx, pts, 15, 2, '#4a5438', 1);
    taper(ctx, pts.slice(0, 18).map((q) => ({ x: q.x - 2.2, y: q.y - 2.4 })), 3, 0.6, '#e6ecd2', 0.8);
  });
  ctx.restore();
}

/** The whole of the fish's outline points, for ripples over it. */
export function topMarks(p: TopPose): readonly Pt[] {
  return spine(p).filter((_, i) => i % 7 === 2).map((q) => q.at);
}
