import { bezier, C, FISH_TEX, heightAt, PAPER_FILL, ring, topAt, xAt, type Anatomy, type Kit } from '../../../../src/art/fish/kit';
import { ellipse, type Pt } from '../../../../src/art/pen';

/**
 * Drawing helpers for the survival video's new fish, in the game's idiom
 * (copied from the species files, which keep theirs private). The shared
 * kit stays untouched.
 */

/** One key of a hand-shaped body: at t, the back and belly lines in multiples of hh (y down). */
export type ProfileKey = readonly [t: number, top: number, bottom: number];

const smooth = (u: number): number => u * u * (3 - 2 * u);

/**
 * A body profile through keys (t ascending, the first at 0, the last at 1),
 * eased between them. `roundNose` rounds the snout over that much of t, so
 * the nose is a curve, not a flat face.
 */
export function keyedProfile(keys: readonly ProfileKey[], roundNose = 0): (t: number) => { top: number; bottom: number } {
  const first = keys[0]!;
  const mid = (first[1] + first[2]) / 2;
  return (t) => {
    let i = 0;
    while (i < keys.length - 2 && t > keys[i + 1]![0]) i++;
    const a = keys[i]!;
    const b = keys[i + 1]!;
    const u = smooth(Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0]))));
    let top = a[1] + (b[1] - a[1]) * u;
    let bottom = a[2] + (b[2] - a[2]) * u;
    if (roundNose > 0 && t < roundNose) {
      const s = 0.25 + 0.75 * Math.sqrt(t / roundNose);
      top = mid + (top - mid) * s;
      bottom = mid + (bottom - mid) * s;
    }
    return { top, bottom };
  };
}

/** A hand-placed eye (the engine's sits at a fixed spot): paper, iris ring, pupil looking `look`, a catch-light. */
export function eyeAt(k: Kit, x: number, y: number, r: number, look: Pt = { x: 0.1, y: 0 }, iris?: string): void {
  const { pen, ink } = k;
  pen.fill(ellipse(x, y, r, r, 18), PAPER_FILL, 1);
  if (iris) pen.fill(ellipse(x, y, r * 0.8, r * 0.8, 16), iris, 0.55);
  pen.stroke(ring(x, y, r, r, 18), 0.9, ink, 1, false);
  pen.hair(ring(x, y, r * 0.68, r * 0.68, 16), 0.45, ink, 0.7);
  const px = x + look.x * r;
  const py = y + look.y * r;
  pen.dot(px, py, r * 0.42, ink);
  pen.dot(px + r * 0.17, py - r * 0.2, Math.max(0.6, r * 0.15), PAPER_FILL);
  if (k.heavy) pen.stroke([{ x: x - r * 1.2, y: y - r * 1.3 }, { x: x + r * 1.1, y: y - r * 0.8 }], 1.6, ink, 1, false);
}

/** Where the engine draws its eye. */
export const engineEye = (k: Kit): Pt => ({ x: k.x(k.a.eye.t), y: C - k.h(k.a.eye.t) * 0.3 });

/** A second catch-light in the engine's eye: reads as a bright, friendly look. */
export function sparkle(k: Kit): void {
  const e = engineEye(k);
  const r = k.a.eye.r;
  k.pen.dot(e.x - r * 0.2, e.y + r * 0.22, Math.max(0.5, r * 0.08), PAPER_FILL, 0.9);
}

/** The engine's tail edge (see fishArt drawTail) for 'round' and 'fork', so a species can paint along it. */
export function tailEdge(a: Anatomy): { readonly edge: Pt[]; readonly root: Pt } {
  const x0 = xAt(a, 1) + 3;
  const base = Math.max(3, heightAt(a, 1));
  const L = a.hh * a.tailSize;
  const S = L * 0.85;
  const top = { x: x0, y: C - base * 0.9 };
  const bot = { x: x0, y: C + base * 0.9 };
  const edge = a.tail === 'fork'
    ? [
        ...bezier(top, { x: x0 - L * 0.5, y: C - S * 0.55 }, { x: x0 - L, y: C - S }),
        ...bezier({ x: x0 - L, y: C - S }, { x: x0 - L * 0.62, y: C - S * 0.25 }, { x: x0 - L * 0.55, y: C }),
        ...bezier({ x: x0 - L * 0.55, y: C }, { x: x0 - L * 0.62, y: C + S * 0.25 }, { x: x0 - L, y: C + S }),
        ...bezier({ x: x0 - L, y: C + S }, { x: x0 - L * 0.5, y: C + S * 0.55 }, bot),
      ]
    : [
        ...bezier(top, { x: x0 - L * 0.55, y: C - S * 0.95 }, { x: x0 - L * 0.95, y: C - S * 0.35 }),
        ...bezier({ x: x0 - L * 0.95, y: C - S * 0.35 }, { x: x0 - L * 1.08, y: C }, { x: x0 - L * 0.95, y: C + S * 0.35 }),
        ...bezier({ x: x0 - L * 0.95, y: C + S * 0.35 }, { x: x0 - L * 0.55, y: C + S * 0.95 }, bot),
      ];
  return { edge, root: { x: x0 + 2, y: C } };
}

/** A band along the tail's outer edge, `depth` of the way in towards its root, between edge fractions `from`..`to`. */
export function tailBand(k: Kit, depth: number, color: string, alpha: number, from = 0.12, to = 0.88): void {
  const { edge, root } = tailEdge(k.a);
  const outer = edge.slice(Math.round(from * (edge.length - 1)), Math.round(to * (edge.length - 1)) + 1);
  const inner = outer.map((p) => ({ x: p.x + (root.x - p.x) * depth, y: p.y + (root.y - p.y) * depth }));
  const band = [...outer, ...[...inner].reverse()];
  k.pen.fill(band, color, alpha);
  k.pen.hair(inner, 0.5, k.ink, 0.5);
  k.pen.stroke(outer, 1.1, k.ink, 1, false);
}

/** Tints whatever is already drawn between two x positions (body and fins), leaving the paper around it. */
export function tintAtop(k: Kit, x0: number, x1: number, color: string, alpha: number): void {
  const { ctx } = k.pen;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  k.pen.fill([{ x: x0, y: 0 }, { x: x1, y: 0 }, { x: x1, y: FISH_TEX }, { x: x0, y: FISH_TEX }], color, alpha);
  ctx.restore();
}

/** Fades from `color` at x `solid` to nothing at x `clear`, over whatever is drawn (body and fins). */
export function fadeAtop(k: Kit, solid: number, clear: number, color: string, alpha: number): void {
  const { ctx } = k.pen;
  const grad = ctx.createLinearGradient(solid, 0, clear, 0);
  grad.addColorStop(0, color);
  grad.addColorStop(1, `${color}00`);
  const far = solid > clear ? FISH_TEX : 0;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = grad;
  ctx.fillRect(Math.min(far, clear), 0, Math.abs(far - clear), FISH_TEX);
  ctx.restore();
}

/** Fills the body above the line at fraction `level` of the half height (-1 back .. 1 belly). */
export function darkBack(k: Kit, color: string, alpha: number, level: number): void {
  const n = 40;
  const top = Array.from({ length: n + 1 }, (_, i) => ({ x: k.x(i / n), y: topAt(k.a, i / n) - 3 }));
  const mid = Array.from({ length: n + 1 }, (_, i) => ({ x: k.x(1 - i / n), y: C + k.h(1 - i / n) * level }));
  k.pen.clipped(k.body, () => k.pen.fill([...top, ...mid], color, alpha));
}

/** Soft, irregular blotches (no outline) over the flank, between `v` limits of the half height. */
export function mottle(k: Kit, count: number, r: readonly [number, number], color: string, alpha: number, from = 0.08, to = 0.95, v: readonly [number, number] = [-0.95, 0.95]): void {
  k.pen.clipped(k.body, () => {
    for (let i = 0; i < count; i++) {
      const t = from + k.pen.rng() * (to - from);
      const y = C + k.h(t) * (v[0] + k.pen.rng() * (v[1] - v[0]));
      const rr = r[0] + k.pen.rng() * (r[1] - r[0]);
      const blob = ellipse(k.x(t), y, rr * (1 + k.pen.rng() * 0.6), rr * (0.6 + k.pen.rng() * 0.4), 9)
        .map((p) => ({ x: p.x + k.pen.jitter(rr * 0.25), y: p.y + k.pen.jitter(rr * 0.25) }));
      k.pen.fill(blob, color, alpha);
    }
  });
}

/** A fin membrane outside the engine's slots: paper, wash, rays fanning from `root`, outline. */
export function membrane(k: Kit, shape: readonly Pt[], root: Pt, rays: number, wash?: string, alpha?: number): void {
  const { pen, ink } = k;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, wash ?? k.a.finWash ?? k.a.wash, alpha ?? k.a.finAlpha ?? (k.heavy ? 0.3 : 0.18));
  for (let i = 1; i < rays; i++) {
    const p = shape[Math.round((i / rays) * (shape.length - 1))]!;
    pen.hair([root, { x: (root.x + p.x) / 2 + pen.jitter(0.6), y: (root.y + p.y) / 2 }, p], 0.5, ink, 0.55);
  }
  pen.stroke([...shape, shape[0]!], 1.1, ink, 1, false);
}

/** A smooth, rayless fin (sharks): paper, wash, shading along the trailing edge, outline. */
export function smoothFin(k: Kit, shape: readonly Pt[], wash: string, alpha: number): void {
  const { pen, ink } = k;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, wash, alpha);
  pen.clipped(shape, () => {
    const cx = shape.reduce((s, p) => s + p.x, 0) / shape.length;
    const cy = shape.reduce((s, p) => s + p.y, 0) / shape.length;
    for (const f of [0.15, 0.3]) pen.hair(shape.map((p) => ({ x: p.x + (cx - p.x) * f, y: p.y + (cy - p.y) * f })), 0.45, ink, 0.4 - f * 0.6);
  });
  pen.stroke([...shape, shape[0]!], 1.2, ink, 1, false);
}

/** A thin, tapering filament (a thread-like fin, a barbel, a streamer) along a curve. */
export function filament(k: Kit, root: Pt, ctrl: Pt, tip: Pt, width: number, color?: string): void {
  const pts = bezier(root, ctrl, tip, 12);
  const { pen } = k;
  for (let i = 1; i < pts.length; i++) {
    const w = width * (1 - (i / pts.length) * 0.75);
    pen.hair([pts[i - 1]!, pts[i]!], w, color ?? k.ink, 0.95);
  }
}

/** A fleshy, muscled limb (mudskipper pectoral) from `root` towards `ang`, ending in a fan of rays. */
export function limb(k: Kit, root: Pt, ang: number, stalk: number, fan: number, width: number, wash?: string): void {
  const { pen, ink } = k;
  const d = { x: Math.cos(ang), y: Math.sin(ang) };
  const n = { x: -d.y, y: d.x };
  const end = { x: root.x + d.x * stalk, y: root.y + d.y * stalk };
  // The fan spreads back along the ground from the end of the arm.
  const back = { x: -1, y: 0.15 };
  const fanTip = { x: end.x + back.x * fan, y: end.y + back.y * fan };
  const fanShape = [
    { x: end.x + 2, y: end.y - width * 0.5 },
    ...bezier({ x: end.x + 2, y: end.y - width * 0.5 }, { x: end.x - fan * 0.4, y: end.y - width * 1.1 }, { x: fanTip.x, y: fanTip.y - width * 0.3 }, 8),
    ...bezier({ x: fanTip.x, y: fanTip.y - width * 0.3 }, { x: fanTip.x + fan * 0.1, y: fanTip.y + width * 0.5 }, { x: end.x - fan * 0.3, y: end.y + width * 0.55 }, 6),
    { x: end.x + 1, y: end.y + width * 0.4 },
  ];
  membrane(k, fanShape, end, 8, wash);
  // The muscled stalk: thick at the shoulder, a bend at the "elbow".
  const w = width * 0.55;
  // A bent arm: the outer side bulges at the elbow, the wrist narrows and rounds off.
  const mid = { x: (root.x + end.x) / 2, y: (root.y + end.y) / 2 };
  const wrist = { x: end.x + d.x * w * 0.5, y: end.y + d.y * w * 0.5 };
  const arm = [
    ...bezier({ x: root.x + n.x * w * 1.3, y: root.y + n.y * w * 1.3 }, { x: mid.x + n.x * w * 2.1, y: mid.y + n.y * w * 2.1 }, { x: end.x + n.x * w * 0.7, y: end.y + n.y * w * 0.7 }, 10),
    ...bezier({ x: end.x + n.x * w * 0.7, y: end.y + n.y * w * 0.7 }, wrist, { x: end.x - n.x * w * 0.7, y: end.y - n.y * w * 0.7 }, 5).slice(1),
    ...bezier({ x: end.x - n.x * w * 0.7, y: end.y - n.y * w * 0.7 }, { x: mid.x - n.x * w * 0.6, y: mid.y - n.y * w * 0.6 }, { x: root.x - n.x * w * 1.3, y: root.y - n.y * w * 1.3 }, 10).slice(1),
  ];
  pen.fill(arm, PAPER_FILL, 1);
  pen.fill(arm, k.a.wash, k.heavy ? 0.7 : 0.6);
  pen.clipped(arm, () => {
    for (let i = 1; i < 4; i++) {
      const f = i / 4;
      const c = { x: root.x + (end.x - root.x) * f, y: root.y + (end.y - root.y) * f };
      pen.hair([{ x: c.x + n.x * w * 1.3, y: c.y + n.y * w * 1.3 }, { x: c.x - n.x * w * 1.3 + d.x * 2, y: c.y - n.y * w * 1.3 + d.y * 2 }], 0.45, ink, 0.5);
    }
  });
  pen.stroke([...arm, arm[0]!], 1.15, ink, 1, false);
}

/** The region above the back line from t0 to t1, for clipping things that sit on top of the head. */
export function aboveBack(k: Kit, t0: number, t1: number, inset = 1.5): Pt[] {
  const n = 16;
  const line = Array.from({ length: n + 1 }, (_, i) => {
    const t = t0 + ((t1 - t0) * i) / n;
    return { x: k.x(t), y: topAt(k.a, t) + inset };
  });
  return [...line, { x: line[n]!.x, y: 0 }, { x: line[0]!.x, y: 0 }];
}
