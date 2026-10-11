import type { BiomeId } from '../../level/biomes';
import { createRng, type Rng } from '../../logic/rng';
import { cub, pt, ribbon } from '../../art/kit';
import type { Pt } from '../../art/pen';
import { MAP, type MapLayout, type MapRegion } from './layout';

/**
 * The parts of each island's outline that aren't a plain run of shore:
 * water inside it (a lagoon, creeks, fjords, backwaters) and extra land off
 * it (islets, a sand spit, a breakwater), plus where its name's cartouche
 * hangs. Pure geometry, shared by the chart's drawing and the scene's
 * labels, and kept clear of the level route.
 */
export type WaterKind = 'lagoon' | 'pass' | 'creek' | 'fjord' | 'pool' | 'canal' | 'lake';
export type IsletKind = 'cay' | 'rock' | 'mangrove' | 'cone' | 'stack' | 'spit' | 'breakwater';

export interface Water {
  readonly kind: WaterKind;
  readonly shape: readonly Pt[];
  /** The line a channel follows, mouth first (empty for a pool or lake). */
  readonly spine: readonly Pt[];
}

export interface Islet {
  readonly kind: IsletKind;
  readonly shape: readonly Pt[];
  readonly spine: readonly Pt[];
}

export interface IslandPlan {
  /** The name cartouche: its centre and size. */
  readonly label: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly waters: readonly Water[];
  readonly islets: readonly Islet[];
}

export const LABEL = { y: 54, w: 560, h: 88 } as const;

/** What a biome's planner gets: its island, shores and a seeded random source. */
interface Ctx {
  readonly r: MapRegion;
  readonly l: MapLayout;
  readonly rng: Rng;
  /** World x at u across the island. */
  at(u: number): number;
  /** The interior's middle line at x: halfway between the far shore and the sand. */
  inland(x: number): number;
}

/** A wobbly closed blob. */
function blob(rng: Rng, cx: number, cy: number, rx: number, ry: number, n = 14, amp = 0.18): Pt[] {
  const ph = rng() * 6;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + amp * (Math.sin(a * 3 + ph) * 0.6 + (rng() - 0.5));
    return pt(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k);
  });
}

/** A winding channel from `a` to `b`, `w0` wide at a and `w1` at b. */
function channel(rng: Rng, a: Pt, b: Pt, w0: number, w1: number, wander = 0.5): { shape: Pt[]; spine: Pt[] } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const side = (k: number): Pt => pt(-dy * k, dx * k);
  const k1 = (rng() - 0.5) * wander * 2;
  const k2 = (rng() - 0.5) * wander * 2;
  const c0 = pt(a.x + dx * 0.33 + side(k1).x, a.y + dy * 0.33 + side(k1).y);
  const c1 = pt(a.x + dx * 0.66 + side(k2).x, a.y + dy * 0.66 + side(k2).y);
  const spine = cub(a, c0, c1, b, 18);
  return { shape: ribbon(spine, (u) => w0 + (w1 - w0) * u).shape, spine };
}

/**
 * A river: a spine that meanders in gentle bends between `a` (the mouth) and
 * `b` (its head), straight at both ends, and banks that narrow quickly near
 * the mouth and slowly towards the head, as a tidal creek does.
 */
function river(rng: Rng, a: Pt, b: Pt, w0: number, w1: number, bends = 1.5, amp = 0.1): { shape: Pt[]; spine: Pt[] } {
  const n = 36;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const phase = rng() * Math.PI * 2;
  const spine = Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    const off = Math.sin(u * bends * Math.PI * 2 + phase) * amp * len * Math.sin(Math.PI * u);
    return pt(a.x + dx * u - (dy / len) * off, a.y + dy * u + (dx / len) * off);
  });
  return { shape: ribbon(spine, (u) => w1 + (w0 - w1) * (1 - u) ** 1.6).shape, spine };
}

const water = (kind: WaterKind, c: { shape: Pt[]; spine: Pt[] }): Water => ({ kind, ...c });
const pool = (kind: WaterKind, shape: Pt[]): Water => ({ kind, shape, spine: [] });
const islet = (kind: IsletKind, shape: Pt[], spine: Pt[] = []): Islet => ({ kind, shape, spine });

function atoll(c: Ctx): Omit<IslandPlan, 'label'> {
  const { l, rng } = c;
  const a = c.at(0) + 120;
  const b = c.at(1) - 120;
  const upper: Pt[] = [];
  const lower: Pt[] = [];
  for (let x = a; x <= b; x += 16) {
    const t = (x - a) / (b - a);
    const e = Math.sqrt(Math.sin(Math.PI * t));
    const top = l.topAt(x) + 34;
    const bot = l.coastAt(x) - MAP.sandBand - 30;
    const m = (top + bot) / 2;
    const h = ((bot - top) / 2) * e;
    upper.push(pt(x, m - h + (rng() - 0.5) * 6));
    lower.push(pt(x, m + h + (rng() - 0.5) * 6));
  }
  const waters: Water[] = [pool('lagoon', [...upper, ...lower.reverse()])];
  // Passes through the northern rim, leaving it a string of islets (motus).
  for (const u of [0.24, 0.64, 0.86]) {
    const x = c.at(u);
    waters.push(water('pass', channel(rng, pt(x + 12, l.topAt(x) - 30), pt(x, l.topAt(x) + 46), 28, 16, 0.2)));
  }
  const islets = [0.33, 0.67].map((u) => islet('cay', blob(rng, c.at(u), 618, 22, 8, 12, 0.2)));
  return { waters, islets };
}

function dunes(c: Ctx): Omit<IslandPlan, 'label'> {
  const { l, rng, r } = c;
  const ox = c.at(0.36);
  const waters = [pool('pool', blob(rng, ox, c.inland(ox) + 18, 26, 13, 14, 0.15))];
  // A long sand spit hooking north past the island's east end.
  const sx = r.x1 - 40;
  const hook = cub(pt(sx, l.coastAt(sx) - 40), pt(r.x1 + 110, l.coastAt(sx) + 10), pt(r.x1 + 190, 330), pt(r.x1 + 120, 250), 24);
  const spit = islet('spit', ribbon(hook, (u) => 40 - 30 * u).shape, hook);
  const bar = cub(pt(c.at(0.12), 622), pt(c.at(0.2), 604), pt(c.at(0.3), 612), pt(c.at(0.38), 628), 14);
  return { waters, islets: [spit, islet('cay', ribbon(bar, (u) => 3 + 9 * Math.sin(Math.PI * u)).shape, bar)] };
}

/** Small rocks or islets scattered at the given (u, y) spots. */
function scatter(c: Ctx, kind: IsletKind, spots: readonly (readonly [number, number])[], r0: number, r1: number, amp = 0.35): Islet[] {
  return spots.map(([u, y]) => {
    const r = r0 + c.rng() * (r1 - r0);
    return islet(kind, blob(c.rng, c.at(u) + (c.rng() - 0.5) * 20, y, r, r * 0.7, 10, amp));
  });
}

function rockpool(c: Ctx): Omit<IslandPlan, 'label'> {
  const islets = scatter(c, 'rock', [[0.06, 84], [0.17, 74], [0.93, 64], [0.12, 606], [0.27, 628], [0.43, 600], [0.58, 630], [0.74, 612], [-0.05, 330], [1.06, 380], [1.02, 560]], 8, 20, 0.45);
  const tx = c.at(0.3);
  return { waters: [pool('pool', blob(c.rng, tx, c.inland(tx), 20, 10))], islets };
}

function mangrove(c: Ctx): Omit<IslandPlan, 'label'> {
  const { l, rng } = c;
  const waters: Water[] = [];
  for (const u of [0.13, 0.36, 0.6, 0.85]) {
    const x = c.at(u);
    const mouth = pt(x, l.topAt(x) - 28);
    const head = pt(x + (rng() - 0.5) * 70, l.scrubAt(x) - 18);
    const main = river(rng, mouth, head, 30, 1.5);
    waters.push(water('creek', main));
    // A side creek joining it partway up, its mouth inside the main creek so the two run together.
    const from = main.spine[Math.round(main.spine.length * 0.42)]!;
    const dir = rng() < 0.5 ? -1 : 1;
    waters.push(water('creek', river(rng, from, pt(from.x + dir * 80, from.y + 56), 12, 1, 1, 0.08)));
  }
  const islets = scatter(c, 'mangrove', [[0.07, 82], [0.94, 76], [0.2, 610], [0.41, 626], [0.63, 606], [0.8, 622]], 16, 28, 0.25);
  return { waters, islets };
}

function basalt(c: Ctx): Omit<IslandPlan, 'label'> {
  const { rng, r } = c;
  return {
    waters: [],
    islets: [
      islet('cone', blob(rng, c.at(0.8), 612, 34, 22, 14, 0.12)),
      islet('stack', blob(rng, r.x0 - 70, 440, 9, 7, 8, 0.3)),
      islet('stack', blob(rng, r.x0 - 40, 500, 6, 5, 8, 0.3)),
      islet('stack', blob(rng, r.x1 + 80, 470, 8, 6, 8, 0.3)),
    ],
  };
}

function kelp(c: Ctx): Omit<IslandPlan, 'label'> {
  const { l, rng } = c;
  const waters: Water[] = [];
  for (const u of [0.18, 0.47, 0.77]) {
    const x = c.at(u);
    const main = channel(rng, pt(x, l.topAt(x) - 44), pt(x + (rng() - 0.5) * 90, l.scrubAt(x) - 34), 36, 5, 0.45);
    waters.push(water('fjord', main));
    const from = main.spine[8]!;
    const dir = rng() < 0.5 ? -1 : 1;
    waters.push(water('fjord', channel(rng, from, pt(from.x + dir * 80, from.y + 26), 14, 3, 0.3)));
  }
  const islets = scatter(c, 'stack', [[-0.04, 420], [-0.02, 470], [1.04, 400], [1.06, 452], [0.24, 606], [0.69, 620]], 5, 10, 0.3);
  return { waters, islets };
}

function wreck(c: Ctx): Omit<IslandPlan, 'label'> {
  const { l, rng } = c;
  const px = c.at(0.8);
  const pond = blob(rng, px, c.inland(px) + 10, 46, 17, 16, 0.2);
  const creek = channel(rng, pt(px - 12, l.topAt(px) - 26), pt(px - 6, c.inland(px)), 16, 8, 0.4);
  return { waters: [pool('lake', pond), water('creek', creek)], islets: [islet('cay', blob(rng, c.at(0.5), 612, 26, 8, 12, 0.2))] };
}

function harbour(c: Ctx): Omit<IslandPlan, 'label'> {
  const { l, rng } = c;
  // Backwaters running east-west behind the shore, opening to the sea in the west.
  const west = c.at(0.07);
  const inlet = channel(rng, pt(west, l.topAt(west) - 30), pt(c.at(0.13), c.inland(c.at(0.13))), 26, 22, 0.2);
  const path: Pt[] = [];
  for (let u = 0.13; u <= 0.72; u += 0.02) {
    const x = c.at(u);
    path.push(pt(x, c.inland(x) + 14 * Math.sin(u * 19)));
  }
  const back = ribbon(path, (u) => 24 - 10 * u).shape;
  const cx = c.at(0.42);
  const canal = channel(rng, pt(cx, c.inland(cx) + 4), pt(cx + 20, l.topAt(cx + 20) - 30), 9, 12, 0.1);
  // A stone breakwater hooking east off the shore, sheltering the harbour inside it.
  const bx = c.at(0.6);
  const mole = cub(pt(bx, l.coastAt(bx) - 6), pt(bx - 14, l.coastAt(bx) + 90), pt(c.at(0.66), l.coastAt(bx) + 140), pt(c.at(0.78), l.coastAt(bx) + 128), 20);
  return {
    waters: [water('canal', inlet), water('canal', { shape: back, spine: path }), water('canal', canal)],
    islets: [islet('breakwater', ribbon(mole, () => 12).shape, mole)],
  };
}

function frost(c: Ctx): Omit<IslandPlan, 'label'> {
  const { l, rng } = c;
  const waters: Water[] = [0.22, 0.56, 0.84].map((u) => pool('lake', blob(rng, c.at(u), c.inland(c.at(u)) + (rng() - 0.5) * 30, 30, 13, 14, 0.25)));
  const ix = c.at(0.38);
  waters.push(water('fjord', channel(rng, pt(ix, l.topAt(ix) - 36), pt(ix + 30, c.inland(ix) + 10), 30, 6, 0.4)));
  const islets = scatter(c, 'rock', [[0.05, 82], [0.13, 66], [0.88, 80], [0.96, 60], [0.1, 604], [0.24, 628], [0.37, 610], [0.52, 632], [0.66, 604], [0.79, 626], [-0.06, 380], [1.07, 420]], 9, 22, 0.4);
  return { waters, islets };
}

function moonlit(c: Ctx): Omit<IslandPlan, 'label'> {
  const { l, rng } = c;
  const cx = c.at(0.28);
  const creek = channel(rng, pt(cx, l.topAt(cx) - 30), pt(cx + 40, c.inland(cx) + 8), 20, 5, 0.5);
  const lx = c.at(0.72);
  return {
    waters: [water('creek', creek), pool('lake', blob(rng, lx, c.inland(lx), 30, 12, 14, 0.2))],
    islets: [islet('cay', blob(rng, c.at(0.5), 600, 30, 10, 14, 0.2)), islet('cay', blob(rng, c.at(0.36), 640, 14, 6, 10, 0.2))],
  };
}

const PLANNERS: Readonly<Record<BiomeId, (c: Ctx) => Omit<IslandPlan, 'label'>>> = {
  atoll, dunes, rockpool, mangrove, basalt, kelp, wreck, harbour, frost, moonlit,
};

/** Where the name cartouche hangs, as u across the island (clear of a volcano's bulge). */
const LABEL_U: Partial<Record<BiomeId, number>> = { basalt: 0.62 };

const cache = new WeakMap<MapLayout, IslandPlan[]>();

/** Every island's plan, computed once per layout. */
export function islandPlans(layout: MapLayout): readonly IslandPlan[] {
  const hit = cache.get(layout);
  if (hit) return hit;
  const plans = layout.regions.map((r, i) => {
    const id = r.beach.biome.id;
    const at = (u: number): number => r.x0 + (r.x1 - r.x0) * u;
    const ctx: Ctx = {
      r, l: layout, rng: createRng(7000 + i * 131), at,
      inland: (x) => (Math.max(0, layout.topAt(x)) + layout.scrubAt(x)) / 2,
    };
    return { label: { x: at(LABEL_U[id] ?? 0.5), ...LABEL }, ...PLANNERS[id](ctx) };
  });
  cache.set(layout, plans);
  return plans;
}

/** Whether p lies inside a closed polygon (even-odd). */
export function inside(poly: readonly Pt[], p: Pt): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

/** Distance from p to a polygon's outline. */
export function edgeDistance(poly: readonly Pt[], p: Pt): number {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j]!;
    const b = poly[i]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t));
  }
  return best;
}

/** How far south the sea route swings between islands (its low point stays above the tab bar). */
const ROUTE_SEA = 650;

/** The dashed sea route from island i's last level to island i + 1's first, swinging out through the strait. */
export function seaRoutePath(layout: MapLayout, i: number): Pt[] {
  const a = layout.nodes.filter((n) => n.region === i).at(-1);
  const b = layout.nodes.find((n) => n.region === i + 1);
  if (!a || !b) return [];
  return cub(pt(a.x + MAP.nodeRadius, a.y + 10), pt(a.x + 320, ROUTE_SEA), pt(b.x - 320, ROUTE_SEA), pt(b.x - MAP.nodeRadius, b.y + 10), 60);
}
