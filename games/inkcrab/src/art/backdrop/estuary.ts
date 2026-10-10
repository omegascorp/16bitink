import { bezier, closed, cub, type Draw, oval, pt, ribbon } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { BACKDROP_W, edges, FAR } from './common';
import { reflection } from './water';

/**
 * Props for a tropical river mouth: cumulus towering over the hinterland,
 * misty hills and the far bank's line of forest, a fishing village on
 * stilts, a kelong (a fish trap on poles with its stake fences), a sampan
 * and a longtail boat, the boardwalk winding into the mangroves, and what
 * lies abandoned on the mud: an old dugout and a bamboo crab trap.
 */
const W = BACKDROP_W;
const TIMBER = '#a88a62';
const ATTAP = '#9a8058';
const ZINC = '#8f9aa0';
const HULL = '#8f6a44';
const PAINT = '#2f6f86';
const AWNING = '#d9573e';
const BAMBOO = '#c2a66d';
const FAR_FOREST = '#5f7d55';

interface Puff {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/** A soft, round glow, as a wet wash bleeds out on the paper. */
export function glow(t: Draw, x: number, y: number, rx: number, ry: number, color: string, alpha: number): void {
  const { ctx } = t.pen;
  const n = parseInt(color.slice(1), 16);
  const rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(0.5, `rgba(${rgb},${alpha * 0.5})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

/**
 * A cumulus tower building over the land in the afternoon heat: tiers of
 * puffs narrowing upwards to a cauliflower head, sunlit on top and greyed
 * with moisture underneath, cut off flat at its base.
 */
export function towering(t: Draw, x: number, base: number, w: number, h: number): void {
  const { pen } = t;
  const { ctx } = pen;
  const puffs: Puff[] = [];
  const tiers = Math.max(2, Math.round(h / (w * 0.3)));
  for (let k = 0; k < tiers; k++) {
    const u = k / (tiers - 1);
    const tw = w * (1 - 0.5 * u);
    const cx = x + u * w * 0.1;
    const n = Math.max(2, Math.round(tw / (w * 0.22)));
    for (let i = 0; i < n; i++) {
      const v = i / (n - 1);
      const r = (tw / n) * (0.7 + pen.rng() * 0.3) * (k === tiers - 1 ? 1.2 : 1);
      puffs.push({ x: cx - tw / 2 + r * 0.6 + (tw - r * 1.2) * v, y: base - r * 0.55 - (h - r * 1.4) * u - Math.sin(Math.PI * v) * r * 0.3, r });
    }
  }
  const x0 = x - w;
  const top = base - h * 1.4;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, top, w * 2, base - top);
  ctx.clip();
  ctx.beginPath();
  for (const p of puffs) {
    ctx.moveTo(p.x + p.r, p.y);
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  }
  ctx.clip();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(x0, top, w * 2, base - top);
  ctx.globalAlpha = 1;
  const g = ctx.createLinearGradient(0, base - h, 0, base);
  g.addColorStop(0, 'rgba(250,238,205,0.45)');
  g.addColorStop(0.45, 'rgba(250,238,205,0)');
  g.addColorStop(0.75, 'rgba(150,156,150,0.12)');
  g.addColorStop(1, 'rgba(150,156,150,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(x0, top, w * 2, base - top);
  pen.hatch([pt(x + w * 0.1, top), pt(x + w, top), pt(x + w, base), pt(x + w * 0.1, base)], 2.4, 1.15, 0.4, { color: t.ink, alpha: FAR * 0.2 });
  pen.hatch([pt(x0, base - h * 0.2), pt(x + w, base - h * 0.2), pt(x + w, base), pt(x0, base)], 2.4, 0.1, 0.4, { color: t.ink, alpha: FAR * 0.25 });
  ctx.restore();
  puffs.forEach((p, i) => {
    const arc = oval(p.x, p.y, p.r, p.r, 30);
    let run: Pt[] = [];
    const flush = (): void => {
      if (run.length > 2) pen.hair(run, 0.6, t.ink, FAR * 0.55);
      run = [];
    };
    for (const q of [...arc, arc[0]!]) {
      if (q.y < base - 1 && !puffs.some((o, k) => k !== i && Math.hypot(q.x - o.x, q.y - o.y) < o.r - 0.4)) run.push(q);
      else flush();
    }
    flush();
  });
}

/** A range of low hills lost in the haze, `height(x)` above the horizon; heights must repeat every tile. */
export function hills(t: Draw, horizon: number, height: (x: number) => number, color: string, alpha: number): void {
  const { pen } = t;
  const top: Pt[] = [];
  for (let x = 0; x <= W; x += 4) top.push(pt(x, horizon - height(x)));
  pen.fill([...top, pt(W, horizon + 1), pt(0, horizon + 1)], color, alpha);
  for (let i = 0; i + 8 < top.length; i += 14) pen.hair(top.slice(i, i + 8), 0.45, t.ink, FAR * 0.28);
}

/**
 * The far bank: a long, dark line of mangrove forest sitting on the water,
 * its top scalloped by crowns, laid over the water again as a reflection.
 */
export function farBank(t: Draw, horizon: number, height: (x: number) => number): void {
  const { pen } = t;
  const top: Pt[] = [];
  for (let x = 0; x <= W; x += 3) {
    const h = height(x);
    const crowns = 0.9 * Math.abs(Math.sin((x / W) * Math.PI * 97)) + 0.7 * Math.abs(Math.sin((x / W) * Math.PI * 61 + 1));
    top.push(pt(x, horizon - h - (h > 1.5 ? crowns : 0)));
  }
  const shape = [...top, pt(W, horizon), pt(0, horizon)];
  pen.fill(shape, PAPER_FILL, 0.9);
  pen.fill(shape, FAR_FOREST, 0.5);
  pen.fill([...top.map((p) => pt(p.x, Math.max(p.y, horizon - 2.5))), pt(W, horizon), pt(0, horizon)], '#3a4f38', 0.25);
  let run: Pt[] = [];
  for (const p of top) {
    if (horizon - p.y > 1.5) run.push(p);
    else if (run.length) {
      if (run.length > 2) pen.hair(run, 0.6, t.ink, FAR * 0.6);
      run = [];
    }
  }
  if (run.length > 2) pen.hair(run, 0.6, t.ink, FAR * 0.6);
  // Its reflection: dark broken strokes under it, shortening downwards.
  for (let y = horizon + 1.5; y < horizon + 9; y += 1.5) {
    const k = (y - horizon) / 9;
    for (let x = pen.rng() * 6; x < W; x += 4 + pen.rng() * 6) {
      if (height(x) < 2 + k * 8) continue;
      pen.hair([pt(x, y), pt(x + 2 + pen.rng() * 6, y)], 0.8, FAR_FOREST, 0.3 * (1 - k));
    }
  }
}

/** A house on stilts over the water: plank walls, a thatched roof, a dark doorway. */
export function stiltHouse(t: Draw, x: number, water: number, s: number, wall = TIMBER): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, water + dy * s);
  reflection(t, x, water + 0.5, 10 * s, 6 * s, '#7d6a4c', 0.3);
  for (const dx of [-4, -1.4, 1.4, 4]) pen.hair([P(dx, -5), P(dx, 0.6)], 0.5, t.ink, FAR * 0.8);
  const walls = [P(-4.5, -5), P(4.5, -5), P(4.5, -10), P(-4.5, -10)];
  pen.fill(walls, PAPER_FILL, 1);
  pen.fill(walls, wall, 0.5);
  pen.fill([P(-1, -5), P(1, -5), P(1, -8.5), P(-1, -8.5)], t.ink, FAR * 0.6);
  pen.stroke(edges(walls), 0.5, t.ink, FAR, false);
  const roof = [P(-6, -9.5), P(6, -9.5), P(3.2, -14), P(-3.2, -14)];
  pen.fill(roof, PAPER_FILL, 1);
  pen.fill(roof, ATTAP, 0.6);
  pen.clipped(roof, () => {
    for (let k = -7; k < 7; k += 1.3) pen.hair([P(k, -9.5), P(k + 1.2, -14)], 0.3, t.ink, FAR * 0.4);
  });
  pen.stroke(edges(roof), 0.55, t.ink, FAR, false);
  pen.hair([P(-6.5, -5), P(6.5, -5)], 0.6, t.ink, FAR);
}

/**
 * A kelong: a fishing platform raised on a forest of poles in the shallows,
 * a hut with a tin roof, a lift net on its boom, and two long fences of
 * stakes reaching out across the water to lead the fish in.
 */
export function kelong(t: Draw, x: number, water: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, water + dy * s);
  for (const side of [-1, 1]) {
    let last: Pt | undefined;
    for (let k = 0; k <= 16; k++) {
      const u = k / 16;
      const base = P(side * (16 + 64 * u), 1 + 15 * u);
      const tip = pt(base.x, base.y - (2 + 3.5 * u) * s);
      pen.hair([base, tip], 0.4 + 0.3 * u, t.ink, FAR * 0.75);
      if (last) pen.hair([last, tip], 0.3, t.ink, FAR * 0.35);
      last = tip;
    }
  }
  reflection(t, x, water + 0.5, 34 * s, 6 * s, '#6f6248', 0.3);
  for (let dx = -16; dx <= 16; dx += 2.6) pen.hair([P(dx, -6), P(dx, 0.8)], 0.45, t.ink, FAR * 0.8);
  const deck = [P(-18, -7.4), P(18, -7.4), P(18, -6), P(-18, -6)];
  pen.fill(deck, TIMBER, 0.6);
  pen.stroke(edges(deck), 0.5, t.ink, FAR, false);
  const hut = [P(-11, -7.4), P(5, -7.4), P(5, -13), P(-11, -13)];
  pen.fill(hut, PAPER_FILL, 1);
  pen.fill(hut, TIMBER, 0.45);
  pen.fill([P(-6, -7.4), P(-3.6, -7.4), P(-3.6, -11), P(-6, -11)], t.ink, FAR * 0.55);
  pen.stroke(edges(hut), 0.5, t.ink, FAR, false);
  const roof = [P(-12.5, -12.6), P(6.5, -12.6), P(4.4, -16.6), P(-10.4, -16.6)];
  pen.fill(roof, PAPER_FILL, 1);
  pen.fill(roof, ZINC, 0.55);
  pen.clipped(roof, () => {
    for (let k = -12; k < 7; k += 1.6) pen.hair([P(k, -12.6), P(k + 0.6, -16.6)], 0.3, t.ink, FAR * 0.4);
  });
  pen.stroke(edges(roof), 0.55, t.ink, FAR, false);
  // The lift net: a boom leaning out over the water, its net hanging in a sag.
  pen.hair([P(9, -7.4), P(16, -19)], 0.6, t.ink, FAR);
  pen.hair([P(16, -19), P(12, -1)], 0.3, t.ink, FAR * 0.6);
  pen.hair([P(16, -19), P(21, -1)], 0.3, t.ink, FAR * 0.6);
  pen.hair(bezier(P(12, -1), P(16.5, 1.5), P(21, -1), 6), 0.4, t.ink, FAR * 0.6);
}

/** A sampan with a fisherman under his conical hat, rod out over the water. `rod` (-1..1) lifts or dips the rod's tip. */
export function sampan(t: Draw, x: number, water: number, s: number, rod = 0): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, water + dy * s);
  reflection(t, x, water + 0.5, 18 * s, 4 * s, '#5b4a36', 0.3);
  const hull = [...bezier(P(-9, -2.6), P(0, -1), P(9, -3.4), 8), ...bezier(P(7.5, 0), P(0, 1), P(-7.5, 0), 8)];
  pen.fill(hull, PAPER_FILL, 1);
  pen.fill(hull, HULL, 0.6);
  pen.stroke(closed(hull), 0.55, t.ink, FAR, false);
  const body = [P(-5.4, -1.6), P(-2.6, -1.6), P(-3, -6), P(-5, -6)];
  pen.fill(body, '#5f7fa0', 0.6);
  pen.hair(closed(body), 0.4, t.ink, FAR);
  const hat = [P(-7.2, -6.2), P(-0.8, -6.2), P(-4, -9.2)];
  pen.fill(hat, '#e3cf96', 0.85);
  pen.hair(closed(hat), 0.45, t.ink, FAR);
  const tip = { x: 10 + rod * 0.6, y: -13 - rod * 3.5 };
  pen.hair([P(-3, -4.5), P(tip.x, tip.y)], 0.4, t.ink, FAR * 0.9);
  // The line hangs slack from the tip, tightening as the rod lifts.
  pen.hair(bezier(P(tip.x, tip.y), P(tip.x + 2 + rod, (tip.y - 0.5) / 2), P(12.5, 0.5 - Math.max(0, rod) * 0.5), 5), 0.25, t.ink, FAR * 0.6);
}

/** A tiny figure: shirt and head. */
function figure(t: Draw, x: number, base: number, s: number, h: number, shirt: string): void {
  const { pen } = t;
  const body = [pt(x - 1.2 * s, base), pt(x + 1.2 * s, base), pt(x + 1 * s, base - (h - 2) * s), pt(x - 1 * s, base - (h - 2) * s)];
  pen.fill(body, shirt, 0.7);
  pen.hair(edges(body), 0.4, t.ink, FAR);
  const head = oval(x, base - (h - 0.6) * s, 1.1 * s, 1.2 * s, 10);
  pen.fill(head, '#a9774f', 0.8);
  pen.hair(closed(head), 0.35, t.ink, FAR);
}

/**
 * A longtail boat (rua hang yao): a long, low hull with a swept-up prow
 * hung with garlands, a striped awning, the boatman standing at the stern
 * steering the car engine on its pivot, its long shaft trailing to the
 * propeller churning behind. Faces right.
 */
export function longtail(t: Draw, x: number, water: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, water + dy * s);
  reflection(t, x, water + 0.5, 46 * s, 7 * s, '#5b4a36', 0.3);
  // The shaft, behind the hull, and the white water it throws up.
  pen.stroke([P(-22, -8.5), P(-43, 1.5)], 0.9 * s, t.ink, FAR, false);
  for (let k = 0; k < 6; k++) pen.hair(bezier(P(-43, 1.5), P(-45 - k, -1.5 - k * 0.4), P(-47 - k * 1.6, 0.5), 4), 0.6, PAPER_FILL, 0.9);
  for (let k = 0; k < 3; k++) pen.hair([P(-48 - k * 6, 1.5 + k * 0.6), P(-54 - k * 8, 1.5 + k * 0.6)], 0.6, PAPER_FILL, 0.8 - k * 0.2);
  const sheer = cub(P(-24, -6), P(-8, -4.5), P(14, -5), P(27, -13), 16);
  const keel = cub(P(24, -2.5), P(12, 1.2), P(-10, 1.2), P(-23, -1), 14);
  const hull = [...sheer, ...bezier(P(27, -13), P(26, -6), P(24, -2.5), 4).slice(1), ...keel.slice(1), P(-24, -6)];
  pen.fill(hull, PAPER_FILL, 1);
  pen.fill(hull, HULL, 0.6);
  const band = ribbon(sheer.slice(0, -3), () => 2.2 * s);
  pen.clipped(hull, () => {
    pen.fill(band.shape.map((p) => pt(p.x, p.y + 1.4 * s)), PAINT, 0.6);
    pen.hair(sheer.map((p) => pt(p.x, p.y + 3.6 * s)).slice(0, -4), 0.35, t.ink, FAR * 0.5);
  });
  pen.stroke(edges(hull), 0.7, t.ink, FAR * 1.05, false);
  // Garlands on the prow.
  for (const [dx, c] of [[0, '#c0473a'], [0.8, '#e3b23c'], [1.6, '#3f9a6a']] as const) pen.hair([P(25.6 + dx * 0.4, -11.8 + dx), P(25.2 + dx * 0.6, -8.4 + dx)], 0.9, c, 0.85);
  // The awning on its posts, a passenger under it, the boatman at the stern.
  for (const dx of [-6, 10]) pen.hair([P(dx, -5), P(dx, -16)], 0.5, t.ink, FAR);
  const roof = [P(-8, -16), P(12, -16), P(11, -18), P(-7, -18)];
  pen.fill(roof, PAPER_FILL, 1);
  pen.fill(roof, AWNING, 0.55);
  pen.clipped(roof, () => {
    for (let k = -7; k < 12; k += 3) pen.fill([P(k, -16), P(k + 1.4, -16), P(k + 1.4, -18), P(k, -18)], PAPER_FILL, 0.6);
  });
  pen.stroke(edges(roof), 0.5, t.ink, FAR, false);
  figure(t, x + 2 * s, water - 5 * s, s, 6, '#3f7fae');
  figure(t, x - 17 * s, water - 5.5 * s, s, 10, '#e0b04a');
  const engine = [P(-25.5, -11.5), P(-20, -11.5), P(-20, -7.5), P(-25.5, -7.5)];
  pen.fill(engine, '#5a5f66', 0.7);
  pen.stroke(edges(engine), 0.5, t.ink, FAR, false);
  pen.hair([P(-22, -7.5), P(-22, -5.5)], 0.6, t.ink, FAR);
  pen.hair([P(-20, -10), P(-15.6, -11)], 0.6, t.ink, FAR);
}

/** A point on a boardwalk's line, with its depth scale. */
export interface WalkNode {
  readonly x: number;
  readonly y: number;
  readonly s: number;
}

/**
 * A plank boardwalk on posts winding through the mangroves, `nodes` from
 * near to far: the deck narrowing and the posts shortening as it recedes,
 * with a handrail along it and the posts' reflections in the water.
 */
export function boardwalk(t: Draw, nodes: readonly WalkNode[]): void {
  const { pen } = t;
  const path: WalkNode[] = [];
  for (let i = 0; i + 1 < nodes.length; i++) {
    const a = nodes[i]!;
    const b = nodes[i + 1]!;
    const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
    for (let k = 0; k < n; k++) path.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n, s: a.s + ((b.s - a.s) * k) / n });
  }
  path.push(nodes[nodes.length - 1]!);
  const posts: WalkNode[] = [];
  let run = 0;
  path.forEach((p, i) => {
    if (i > 0) run += Math.hypot(p.x - path[i - 1]!.x, p.y - path[i - 1]!.y);
    if (i === 0 || run > 9 * p.s) {
      posts.push(p);
      run = 0;
    }
  });
  for (const p of posts) {
    pen.hair([pt(p.x, p.y), pt(p.x, p.y + 9 * p.s)], 0.5 + 0.3 * p.s, t.ink, FAR * 0.8);
    pen.hair([pt(p.x, p.y + 9.5 * p.s), pt(p.x, p.y + 13 * p.s)], 0.5, t.ink, FAR * 0.25);
  }
  const top = path.map((p) => pt(p.x, p.y - 3.2 * p.s));
  const mid = path.map((p) => pt(p.x, p.y));
  const face = path.map((p) => pt(p.x, p.y + 1.6 * p.s));
  pen.fill([...top, ...[...mid].reverse()], PAPER_FILL, 1);
  pen.fill([...top, ...[...mid].reverse()], TIMBER, 0.6);
  pen.fill([...mid, ...[...face].reverse()], '#6f5a3e', 0.5);
  for (let i = 0; i < path.length; i += 1) {
    const p = path[i]!;
    if (i % 2 === 0) pen.hair([pt(p.x, p.y - 3.2 * p.s), pt(p.x + 0.4 * p.s, p.y)], 0.3, t.ink, FAR * 0.45);
  }
  pen.hair(top, 0.55, t.ink, FAR);
  pen.hair(face, 0.5, t.ink, FAR * 0.8);
  const rail: Pt[] = [];
  const midRail: Pt[] = [];
  posts.forEach((p) => {
    pen.hair([pt(p.x, p.y - 3.2 * p.s), pt(p.x, p.y - 9.5 * p.s)], 0.45 + 0.3 * p.s, t.ink, FAR * 0.9);
    rail.push(pt(p.x, p.y - 9.5 * p.s));
    midRail.push(pt(p.x, p.y - 6.4 * p.s));
  });
  pen.hair(rail, 1, TIMBER, 0.9);
  pen.hair(rail, 0.4, t.ink, FAR * 0.8);
  pen.hair(midRail, 0.35, t.ink, FAR * 0.55);
}

/**
 * An old dugout canoe half sunk in the mud and left to rot: a split hull
 * lying aslant, rainwater standing in it, its stern swallowed by the mud.
 */
export function dugout(t: Draw, x: number, ground: number, s: number, mud: string): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, ground + dy * s);
  const rim = bezier(P(-28, -6), P(-2, -9.5), P(26, -3), 14);
  const inner = bezier(P(-25, -4.6), P(-2, -7.6), P(23, -2), 14);
  const hull = [...rim, ...bezier(P(26, -3), P(0, 2.5), P(-28, 0), 14), P(-29, -3)];
  pen.fill(hull, PAPER_FILL, 1);
  pen.fill(hull, HULL, 0.5);
  const pool = [...inner, ...bezier(P(23, -2), P(0, -3.5), P(-25, -4.6), 10)];
  pen.fill(pool, '#c9d6d2', 0.7);
  pen.hair([P(-14, -5.5), P(-2, -6.4)], 0.6, PAPER_FILL, 0.9);
  pen.clipped(hull, () => {
    for (const dy of [-1.5, 0.5]) pen.hair(bezier(P(-26, dy - 2), P(0, dy + 1), P(24, dy - 1.5), 10), 0.35, t.ink, FAR * 0.45);
    pen.hair([P(-6, -6), P(2, -1), P(4, 1.5)], 0.4, t.ink, FAR * 0.7);
    pen.hatch(hull, 1.6, 2.4, 0.35, { color: t.ink, alpha: FAR * 0.35, onlyBelow: ground - 2 * s });
  });
  pen.stroke(edges(hull), 0.65, t.ink, FAR, false);
  pen.hair(inner, 0.4, t.ink, FAR * 0.7);
  for (let k = 0; k < 14; k++) pen.dot(x + (-24 + pen.rng() * 44) * s, ground - pen.rng() * 1.8 * s, 0.45, '#ece6d6', 0.8);
  // The mud lipping over its stern.
  const lip = [P(14, 1), ...bezier(P(14, 1), P(22, -6), P(34, 0), 8).slice(1), P(34, 3), P(14, 3)];
  pen.fill(lip, PAPER_FILL, 1);
  pen.fill(lip, mud, 0.7);
  pen.hair(lip.slice(1, 8), 0.45, t.ink, FAR * 0.7);
}

/** A bamboo fish trap (bubu) lying on its side in the mud: hooped and woven, its funnel mouth gaping. */
export function crabTrap(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, ground + dy * s);
  const body = [...bezier(P(-8, -9), P(4, -9.5), P(12, -5), 8), ...bezier(P(12, -5), P(13, -2), P(11, 0.5), 4).slice(1), P(-8, 0.5)];
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, BAMBOO, 0.55);
  pen.clipped(body, () => {
    for (let k = 0; k < 6; k++) pen.hair(bezier(P(-8, -8 + k * 1.6), P(3, -8 + k * 1.5), P(12, -4.8 + k * 0.9), 8), 0.3, t.ink, FAR * 0.5);
    for (const dx of [-3, 2, 7]) pen.hair(oval(x + dx * s, ground - 4.4 * s, 1.2 * s, 5 * s, 12).slice(0, 7), 0.5, '#7a5f30', 0.6);
  });
  pen.stroke(edges(body), 0.55, t.ink, FAR, false);
  const mouth = oval(x - 8 * s, ground - 4.5 * s, 2.6 * s, 4.8 * s, 16);
  pen.fill(mouth, PAPER_FILL, 1);
  pen.fill(mouth, BAMBOO, 0.4);
  pen.fill(oval(x - 7.6 * s, ground - 4.5 * s, 1.2 * s, 2.4 * s, 10), t.ink, FAR * 0.6);
  pen.hair(closed(mouth), 0.5, t.ink, FAR);
  pen.fill(oval(x + 2 * s, ground + 0.8, 12 * s, 1.4 * s, 16), t.ink, 0.08);
}
