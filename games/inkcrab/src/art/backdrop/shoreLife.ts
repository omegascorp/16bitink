import { bezier, closed, cub, type Draw, oval, pt, ribbon } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { FAR } from './common';

/**
 * What the tide leaves on a granite shore: bladderwrack and kelp draped
 * over the rocks, barnacles, limpets and mussels, beadlet anemones,
 * a starfish, pink paint weed round the pools, a withy crab pot on its
 * rope, and pebbles.
 */
export const WRACK = '#7f6d2e';
export const KELP = '#5f4c22';
const BLADDER = '#a2903f';
const MUSSEL = '#2f3552';
const MUSSEL_SHEEN = '#7f93b8';
const LIMPET = '#bcae90';
const ANEMONE = '#a8413f';
const STAR = '#de8746';
const CORALLINE = '#d79aa0';
const GUTWEED = '#79b04f';
const POOL = '#6fa2a3';
const WITHY = '#b8995e';
const ROPE = '#d6a648';
const PEBBLES = ['#a9a59d', '#8c95a3', '#c4ad98', '#9b9a86', '#b8b2a8'] as const;

/**
 * Bladderwrack hanging from `at`: flat olive straps that fork again and
 * again, a midrib down each, and paired air bladders along them.
 */
export function wrack(t: Draw, at: Pt, len: number, ang = Math.PI / 2, depth = 3, w = 2.6): void {
  const { pen } = t;
  const sway = pen.jitter(0.5);
  const end = pt(at.x + Math.cos(ang) * len, at.y + Math.sin(ang) * len);
  const mid = pt((at.x + end.x) / 2 + Math.cos(ang + Math.PI / 2) * sway * len * 0.3, (at.y + end.y) / 2 + Math.sin(ang + Math.PI / 2) * sway * len * 0.3);
  const spine = bezier(at, mid, end, 8);
  const { shape } = ribbon(spine, (u) => w * (1 - u * 0.25));
  pen.fill(shape, WRACK, 0.62);
  pen.hair(closed(shape), 0.35, t.ink, FAR * 0.55);
  pen.hair(spine.slice(1, -1), 0.3, '#4f4416', 0.6);
  if (len > 6 && pen.rng() < 0.7) {
    const p = spine[4]!;
    for (const side of [-1, 1]) pen.fill(oval(p.x + side * w * 0.55, p.y, w * 0.45, w * 0.7, 8), BLADDER, 0.75);
  }
  if (depth > 0) {
    for (const side of [-1, 1]) wrack(t, end, len * (0.68 + pen.rng() * 0.2), ang + side * (0.3 + pen.rng() * 0.25), depth - 1, w * 0.85);
  }
}

/**
 * Bladderwrack lying slumped over a rock at low tide: a draped olive mat,
 * darker and wetter towards the bottom, with a lobed upper edge, fronds
 * forking down through it, pale air bladders and a wet gloss.
 */
export function weedMat(t: Draw, clip: readonly Pt[], x0: number, x1: number, edge: (x: number) => number, bottom: number): void {
  const { pen } = t;
  // A ragged upper edge: tongues of weed reaching up the rock between lobes of frond tips.
  const [p1, p2] = [pen.rng() * 6, pen.rng() * 6];
  const upper: Pt[] = [];
  for (let x = x0; x <= x1; x += 2) {
    const tongue = 5 * Math.max(0, Math.sin(x * 0.09 + p1)) ** 3 + 3 * Math.max(0, Math.sin(x * 0.23 + p2)) ** 2;
    upper.push(pt(x, edge(x) - tongue + 1.6 * Math.abs(Math.sin(x * 0.26)) + pen.jitter(0.4)));
  }
  const mat = [...upper, pt(x1, bottom), pt(x0, bottom)];
  const ys = upper.map((p) => p.y);
  const yTop = Math.min(...ys);
  pen.clipped(clip, () => {
    pen.fill(mat, WRACK, 0.58);
    pen.fill([...upper.map((p) => pt(p.x, p.y + (bottom - p.y) * 0.5)), pt(x1, bottom), pt(x0, bottom)], KELP, 0.3);
    pen.clipped(mat, () => {
      // A tangle of flat forked fronds lying every which way, mostly downhill, with their bladders.
      const n = Math.round(((x1 - x0) * (bottom - yTop)) / 16);
      for (let k = 0; k < n; k++) {
        const p = pt(x0 + pen.rng() * (x1 - x0), yTop + pen.rng() * (bottom - yTop));
        const a = Math.PI / 2 + pen.jitter(1.1);
        const l = 3 + pen.rng() * 4;
        const end = pt(p.x + Math.cos(a) * l, p.y + Math.sin(a) * l);
        const dark = pen.rng() < 0.6;
        pen.hair([p, end], 0.9, dark ? '#4f4217' : '#b9a65c', dark ? 0.45 : 0.5);
        for (const side of [-1, 1]) pen.hair([end, pt(end.x + Math.cos(a + side * 0.5) * l * 0.5, end.y + Math.sin(a + side * 0.5) * l * 0.5)], 0.6, dark ? '#4f4217' : '#b9a65c', 0.4);
        if (pen.rng() < 0.3) for (const side of [-1, 1]) pen.dot(p.x + Math.cos(a) * l * 0.5 + side * 0.8, p.y + Math.sin(a) * l * 0.5, 0.55, BLADDER, 0.85);
      }
    });
  });
  // The edge inked only in broken stretches, and a few loose fronds flung up over the bare rock.
  for (let i = 0; i + 4 < upper.length; i += 5 + Math.floor(pen.rng() * 6)) if (pen.rng() < 0.6) pen.hair(upper.slice(i, i + 4), 0.4, t.ink, FAR * 0.55);
  for (let i = 3; i < upper.length - 3; i += 6 + Math.floor(pen.rng() * 10)) {
    const p = upper[i]!;
    const a = -Math.PI / 2 + pen.jitter(1);
    const l = 3 + pen.rng() * 4;
    const end = pt(p.x + Math.cos(a) * l, p.y + 1 + Math.sin(a) * l);
    pen.clipped(clip, () => {
      pen.hair([pt(p.x, p.y + 1.5), end], 1.3, WRACK, 0.85);
      for (const side of [-1, 1]) pen.hair([end, pt(end.x + Math.cos(a + side * 0.6) * l * 0.45, end.y + Math.sin(a + side * 0.6) * l * 0.45)], 1, WRACK, 0.8);
    });
  }
}

/**
 * Kelp (oarweed) slumped over a ledge at low tide: a few long glossy
 * straps with crinkled edges, hanging down its face from `at` and lying
 * out along the rock below (`floor`), curling at their ends.
 */
export function kelp(t: Draw, at: Pt, floor: number, len: number, w: number, dir: 1 | -1): void {
  const { pen } = t;
  for (let k = 0; k < 3; k++) {
    const a = pt(at.x + k * w * 0.9 * dir + pen.jitter(1), at.y + k * 1.5);
    const drop = floor - a.y;
    const reach = len * (0.7 + pen.rng() * 0.5);
    const spine = cub(a, pt(a.x + dir * w * 0.6, a.y + drop * 0.7), pt(a.x + dir * reach * 0.3, floor + 1), pt(a.x + dir * reach, floor - 1 - pen.rng() * 3), 22);
    const phase = pen.rng() * 6;
    const strap = ribbon(spine, (u) => w * Math.min(1, 0.35 + u * 3) * (1 - u * 0.35) * (1 + 0.14 * Math.sin(u * 40 + phase)));
    pen.fill(strap.shape, PAPER_FILL, 0.9);
    pen.fill(strap.shape, '#4d3d18', 0.68);
    pen.clipped(strap.shape, () => pen.hair(strap.top.slice(3, -2).map((p) => pt(p.x + 0.8, p.y + 0.8)), 1.3, '#e0cf9a', 0.6));
    pen.hair(spine.slice(2, -3), 0.35, '#3a2e12', 0.4);
    pen.hair(closed(strap.shape), 0.4, t.ink, FAR * 0.75);
  }
}

/** Bright green gutweed: a tuft of fine hairs in a damp crack. */
export function gutweed(t: Draw, x: number, y: number, s: number): void {
  const { pen } = t;
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + pen.jitter(1);
    const l = (3 + pen.rng() * 3) * s;
    pen.hair(bezier(pt(x, y), pt(x + Math.cos(a) * l * 0.5 + pen.jitter(1), y + Math.sin(a) * l * 0.5), pt(x + Math.cos(a) * l + l * 0.3, y + Math.sin(a) * l * 0.6), 5), 0.6, GUTWEED, 0.8);
  }
}

/** Acorn barnacles crowded on a rock: little white volcanoes, each with a dark slit. */
export function barnacles(t: Draw, clip: readonly Pt[], x0: number, x1: number, y0: number, y1: number, n: number): void {
  const { pen } = t;
  pen.clipped(clip, () => {
    for (let k = 0; k < n; k++) {
      const x = x0 + pen.rng() * (x1 - x0);
      const y = y0 + (y1 - y0) * Math.sqrt(pen.rng());
      const r = 0.5 + pen.rng() * 0.6;
      pen.fill(oval(x, y, r, r * 0.8, 8), '#ece6d6', 0.75);
      pen.dot(x, y + 0.1, 0.25, t.ink, FAR * 0.7);
    }
  });
}

/** A limpet clamped to the rock: a ribbed low cone. */
export function limpet(t: Draw, x: number, y: number, s: number): void {
  const { pen } = t;
  const cone = [pt(x - 3 * s, y), ...bezier(pt(x - 3 * s, y), pt(x - 0.6 * s, y - 3.4 * s), pt(x + 3 * s, y), 6).slice(1)];
  pen.fill(cone, PAPER_FILL, 1);
  pen.fill(cone, LIMPET, 0.75);
  for (let k = -2; k <= 2; k++) pen.hair([pt(x - 0.5 * s, y - 2 * s), pt(x + k * 1.2 * s, y)], 0.3, t.ink, FAR * 0.45);
  pen.hair(cone, 0.45, t.ink, FAR);
  pen.hair([pt(x - 3.2 * s, y + 0.2), pt(x + 3.2 * s, y + 0.2)], 0.4, t.ink, FAR * 0.7);
}

/** A mussel bed: blue-black shells packed together, pointing every way, catching the light. */
export function mussels(t: Draw, x: number, y: number, w: number, h: number, n: number): void {
  const { pen } = t;
  for (let k = 0; k < n; k++) {
    const u = pen.rng();
    const cx = x + (u - 0.5) * w;
    const cy = y - pen.rng() * h * Math.sin(Math.PI * u);
    const a = pen.jitter(1.4);
    const l = 2.6 + pen.rng() * 1.6;
    const shell = oval(0, 0, l, l * 0.42, 10).map((p) => pt(cx + p.x * Math.cos(a) - p.y * Math.sin(a), cy + p.x * Math.sin(a) + p.y * Math.cos(a)));
    pen.fill(shell, MUSSEL, 0.62);
    pen.hair(shell.slice(1, 5), 0.5, MUSSEL_SHEEN, 0.7);
    pen.hair(closed(shell), 0.3, t.ink, FAR * 0.8);
  }
}

/**
 * A beadlet anemone: out of water, a glossy dark-red blob with a ring of
 * blue beads; under water, open, with a crown of tentacles.
 */
export function anemone(t: Draw, x: number, y: number, s: number, open = false): void {
  const { pen } = t;
  if (open) {
    const col = [pt(x - 1.6 * s, y), pt(x + 1.6 * s, y), pt(x + 1.3 * s, y - 2.6 * s), pt(x - 1.3 * s, y - 2.6 * s)];
    pen.fill(col, ANEMONE, 0.6);
    pen.hair(closed(col), 0.35, t.ink, FAR * 0.6);
    for (let k = 0; k < 11; k++) {
      const a = Math.PI + (k / 10) * Math.PI;
      const l = (2.2 + pen.rng() * 1.2) * s;
      pen.hair(bezier(pt(x, y - 2.8 * s), pt(x + Math.cos(a) * l * 0.6, y - 2.8 * s + Math.sin(a) * l * 0.7 - 0.8 * s), pt(x + Math.cos(a) * l, y - 2.8 * s + Math.sin(a) * l * 0.55), 4), 0.45 * s, '#b75450', 0.85);
    }
    return;
  }
  const blob = [pt(x - 2.4 * s, y), ...bezier(pt(x - 2.4 * s, y), pt(x - 0.4 * s, y - 4.6 * s), pt(x + 2.4 * s, y), 8).slice(1)];
  pen.fill(blob, ANEMONE, 0.75);
  pen.hair(blob.slice(1, 5), 0.6, PAPER_FILL, 0.7);
  pen.hair(blob, 0.4, t.ink, FAR * 0.9);
  for (const dx of [-1.8, 0, 1.8]) pen.dot(x + dx * s, y - 0.4 * s - (dx === 0 ? 0.4 * s : 0), 0.35 * s, '#4f84c4', 0.9);
}

/** A common starfish spread on the rock: five soft orange arms, pimpled. */
export function starfish(t: Draw, x: number, y: number, r: number, rot: number): void {
  const { pen } = t;
  const pts: Pt[] = [];
  for (let k = 0; k < 10; k++) {
    const a = rot + (k / 10) * Math.PI * 2;
    const rr = k % 2 === 0 ? r * (0.9 + pen.rng() * 0.2) : r * 0.36;
    pts.push(pt(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8));
  }
  pen.fill(pts, PAPER_FILL, 1);
  pen.fill(pts, STAR, 0.7);
  pen.stipple(pts, Math.round(r * r * 2), () => 0.7, 0.3, '#f6d2a4');
  pen.stroke(closed(pts), 0.5, t.ink, FAR, false);
  for (let k = 0; k < 5; k++) {
    const a = rot + (k / 5) * Math.PI * 2;
    pen.hair([pt(x, y), pt(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.6)], 0.3, '#a5552a', 0.5);
  }
}

/** A rope: a tan line twisted with little diagonal ticks. */
export function rope(t: Draw, pts: readonly Pt[], w = 1.4): void {
  const { pen } = t;
  pen.hair(pts, w, ROPE, 0.85);
  pen.hair(pts.map((p) => pt(p.x, p.y + w * 0.4)), 0.3, t.ink, FAR * 0.6);
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const n = Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 1.6);
    for (let k = 0; k < n; k++) {
      const u = k / n;
      const c = pt(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u);
      pen.hair([pt(c.x - w * 0.3, c.y - w * 0.45), pt(c.x + w * 0.3, c.y + w * 0.45)], 0.3, '#8a6526', 0.6);
    }
  }
}

/**
 * A Cornish withy crab pot, woven of willow like an upturned basket, with
 * the funnel mouth in its top. Returns the point its rope ties on.
 */
export function creel(t: Draw, x: number, ground: number, s: number): Pt {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, ground + dy * s);
  const body = [P(-9, 0), ...cub(P(-9, 0), P(-11, -9), P(-5, -13), P(-2.5, -13), 8).slice(1), P(2.5, -13), ...cub(P(2.5, -13), P(5, -13), P(11, -9), P(9, 0), 8).slice(1)];
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, WITHY, 0.6);
  pen.clipped(body, () => {
    for (let k = -4; k <= 4; k++) pen.hair(bezier(P(k * 2.4, 0), P(k * 2.7, -8), P(k * 0.7, -13.5), 6), 0.35, t.ink, FAR * 0.5);
    for (let y = -1.6; y > -13; y -= 1.5) pen.hair([P(-11, y), P(11, y + 0.3)], 0.3, '#7a5f30', 0.55);
    pen.hatch(body, 1.4, 1.1, 0.3, { color: t.ink, alpha: FAR * 0.35, onlyBelow: ground - 6 * s });
  });
  pen.fill(oval(x, ground - 13 * s, 2.6 * s, 0.9 * s, 10), t.ink, FAR * 0.7);
  pen.stroke(closed(body), 0.6, t.ink, FAR, false);
  pen.fill(oval(x, ground + 0.5, 10 * s, 1.4 * s, 16), t.ink, 0.08);
  return P(-8, -4);
}

/**
 * A rock pool lying in the shelf: a still lens of cold green water with
 * the sky's light laid across it in broken strokes, rimmed with pink paint
 * weed. `y` is the water surface.
 */
export function pool(t: Draw, x0: number, x1: number, y: number, depth: number): Pt[] {
  const { pen } = t;
  const water = [pt(x0, y), pt(x1, y), ...bezier(pt(x1, y), pt((x0 + x1) / 2, y + depth * 2), pt(x0, y), 16).slice(1)];
  pen.fill(water, PAPER_FILL, 1);
  pen.fill(water, POOL, 0.5);
  pen.clipped(water, () => {
    for (let k = 0; k < (x1 - x0) / 6; k++) {
      const yy = y + 1 + pen.rng() * depth * 0.9;
      const xx = x0 + pen.rng() * (x1 - x0);
      const l = 3 + pen.rng() * 9;
      pen.hair([pt(xx, yy), pt(xx + l, yy)], 0.7, PAPER_FILL, 0.75);
    }
    pen.hair(water.slice(3).map((p) => pt(p.x, p.y - 1)), 1.6, CORALLINE, 0.6);
  });
  pen.hair([pt(x0 - 1, y), pt(x1 + 1, y)], 0.7, t.ink, FAR * 0.8);
  pen.hair(water.slice(2), 0.4, t.ink, FAR * 0.5);
  for (const px of [x0 + 2, x1 - 3]) pen.fill(oval(px, y - 0.5, 3, 1.2, 10), CORALLINE, 0.55);
  return water;
}

/** Pebbles and cobbles of granite, slate and quartz, worn round. */
export function pebbles(t: Draw, x0: number, x1: number, ground: (x: number) => number, n: number): void {
  const { pen } = t;
  for (let k = 0; k < n; k++) {
    const x = x0 + pen.rng() * (x1 - x0);
    const r = 1.2 + pen.rng() * 2.6;
    const y = ground(x) + pen.rng() * 6;
    const stone = oval(x, y - r * 0.5, r * 1.3, r * 0.75, 12);
    pen.fill(stone, PAPER_FILL, 1);
    pen.fill(stone, PEBBLES[k % PEBBLES.length]!, 0.65);
    pen.hair(stone.slice(5, 12), 0.35, PAPER_FILL, 0.6);
    pen.hair(closed(stone), 0.4, t.ink, FAR * 0.75);
  }
}

/** A herring gull standing on a rock, watching: white head and breast, grey back, black wingtips, yellow bill. */
export function standingGull(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, ground + dy * s);
  for (const dx of [-0.8, 0.8]) pen.hair([P(dx, 0), P(dx * 0.6, -3.6)], 0.5, '#d99a86', 0.9);
  const body = [P(-3.6, -4.8), ...cub(P(-3.6, -4.8), P(-4, -9.5), P(1, -10), P(3.6, -7.5), 8).slice(1), ...cub(P(3.6, -7.5), P(5, -5.6), P(2, -3.2), P(-1, -3.6), 6).slice(1), P(-7.5, -5.2)];
  pen.fill(body, PAPER_FILL, 1);
  const back = [P(-7.6, -5.4), P(-3.4, -8.6), P(1.6, -8.4), P(2.6, -6.8), P(-1.2, -5.6)];
  pen.fill(back, '#a7b1bf', 0.85);
  pen.fill([P(-7.6, -5.4), P(-5.2, -6.8), P(-4.6, -5.5)], t.ink, FAR * 1.2);
  pen.stroke(closed(body), 0.55, t.ink, FAR * 1.1, false);
  const head = oval(x + 3.1 * s, ground - 10.6 * s, 1.9 * s, 1.7 * s, 12);
  pen.fill(head, PAPER_FILL, 1);
  pen.hair(closed(head), 0.45, t.ink, FAR);
  pen.fill([P(4.8, -10.9), P(7.2, -10.6), P(4.8, -10)], '#e3b23c', 0.95);
  pen.dot(x + 3.6 * s, ground - 11 * s, 0.35 * s, t.ink, 0.9);
  pen.dot(x + 6.6 * s, ground - 10.5 * s, 0.25 * s, '#c0473a', 0.8);
}
