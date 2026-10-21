import { createRng, type Rng } from '../logic/rng';
import { arc, blob, body, castShadow, edgeWash, outline, type Edgeness, edgenessOf, groundWash, polar, SHADOW, softBand } from './groundKit';
import { grating, type Planting, pot, seedTray, TERRACOTTA, tomatoVine, wateringCan } from './greenhouseThings';
import { fits, type GroundKeep, type Room, roomOf, spotFor, type Taken } from './keep';
import { closed, type Draw, oval, pt, TAU } from './kit';
import { LEAF, PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { mix } from './wash';

/**
 * Chapter 3's page, "The Greenhouse": an old Victorian glasshouse floor seen
 * from above. Worn quarry tiles, warm and pale where play happens; slatted
 * timber staging along the walls crowded with pots, seed trays and tomato
 * vines trailing to the floor; pots, a watering can and a cast-iron grating
 * at the edges; and over it all the soft diagonal shadows of the glazing
 * bars. Everything raised keeps clear of `keep`. Board coordinates.
 */
const GROUT = '#d9c9ae';
const QUARRY = ['#c98762', '#bf7756', '#d39a6c', '#b98a6a'] as const;
const WOOD = '#b2946c';
const UNDER = '#3d3129';
const GLASS_SHADOW = '#6d6c8a';
const SUN = '#f6dca0';
/** Quarry tile pitch, board units. */
const TILE = 62;
/** Staging: how far its back runs off the board, its plank pitch, and the depths it comes in. */
const BACK = -30;
const PLANK = 16.5;
const DEPTHS = [92, 80, 68, 58] as const;
/** Watering can length; how far a vine's leaves reach from its stem. */
const CAN = 88;
const VINE_REACH = 50;
/** Side staging keeps this far from the top and bottom walls, clear of the long runs' ends. */
const SIDE_FROM = 112;
/** Glazing bars' shadows: direction (radians), spacing of the bars and of the transoms. */
const BAR_DIR = 2.25;
const BAR_GAP = 118;
const TRANSOM_GAP = 330;

type Wall = 'top' | 'bottom' | 'left' | 'right';

/** A run of staging along a wall: from u0 to u1, reaching `depth` onto the board. */
interface Staging {
  readonly wall: Wall;
  readonly u0: number;
  readonly u1: number;
  readonly depth: number;
}

/** The floor: quarry tiles in courses, each a little different, joints and colour fading out towards the middle. */
function tiles(d: Draw, w: number, h: number, edge: Edgeness, rng: Rng): void {
  const { pen } = d;
  const ox = -((w / 2) % TILE) - TILE / 2;
  const oy = -((h / 2) % TILE);
  const cols = Math.ceil(w / TILE) + 2;
  const rows = Math.ceil(h / TILE) + 2;
  const v = Array.from({ length: rows + 1 }, (_, j) => Array.from({ length: cols + 1 }, (_, i) => pt(ox + i * TILE + (rng() - 0.5) * 2.5, oy + j * TILE + (rng() - 0.5) * 2.5)));
  const g = 1.8;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const [a, b, c, e] = [v[j]![i]!, v[j]![i + 1]!, v[j + 1]![i + 1]!, v[j + 1]![i]!];
      const shape = [pt(a.x + g, a.y + g), pt(b.x - g, b.y + g), pt(c.x - g, c.y - g), pt(e.x + g, e.y - g)];
      const mid = pt((a.x + c.x) / 2, (a.y + c.y) / 2);
      const k = edge(mid.x, mid.y);
      pen.fill(shape, PAPER_FILL, 0.9);
      pen.fill(shape, QUARRY[Math.floor(rng() * QUARRY.length)]!, 0.05 + 0.26 * k + rng() * 0.07 * (0.3 + k));
      pen.clipped(shape, () => {
        for (let n = 0; n < 2; n++) pen.fill(oval(mid.x + (rng() - 0.5) * 50, mid.y + (rng() - 0.5) * 50, 8 + rng() * 18, 6 + rng() * 12, 14), rng() < 0.5 ? '#9c5b40' : '#efe0c4', 0.02 + 0.1 * k);
        // Worn hollow in the middle of busy tiles, paler.
        if (rng() < 0.3) pen.fill(oval(mid.x, mid.y, TILE * 0.32, TILE * 0.26, 16), PAPER_FILL, 0.25);
      });
      pen.crescent(shape, pt(-2.4, -3.4), () => pen.fill(shape, '#8a5a44', 0.08 + 0.1 * k));
      if (k > 0.3) pen.crescent(shape, pt(-6, -8.5), () => pen.hatch(shape, 4, 0.9, 0.42, { color: d.ink, alpha: 0.12 * k }));
      if (k > 0.15 && rng() < 0.18) {
        const p = polar(mid, rng() * TAU, 12);
        pen.hair([p, polar(p, rng() * TAU, 8 + rng() * 10), polar(p, rng() * TAU, 14 + rng() * 10)], 0.45, d.ink, 0.15 + 0.25 * k);
      }
    }
  }
  // Pen along the joints, broken, firmer towards the edges.
  const joint = (from: Pt, to: Pt): void => {
    const m = pt((from.x + to.x) / 2, (from.y + to.y) / 2);
    const k = edge(m.x, m.y);
    if (rng() < 0.25 + 0.6 * k) pen.stroke([from, m, to], 0.6 + 0.4 * k, d.ink, 0.1 + 0.35 * k, false);
  };
  for (let j = 0; j <= rows; j++) for (let i = 0; i < cols; i++) joint(v[j]![i]!, v[j]![i + 1]!);
  for (let i = 0; i <= cols; i++) for (let j = 0; j < rows; j++) joint(v[j]![i]!, v[j + 1]![i]!);
}

/** Maps staging-local (u along the wall, v out from it) to the board. */
const onBoard =
  (wall: Wall, w: number, h: number) =>
  (u: number, v: number): Pt =>
    wall === 'top' ? pt(u, v) : wall === 'bottom' ? pt(u, h - v) : wall === 'left' ? pt(v, u) : pt(w - v, u);

/** Board to staging-local: [u along the wall, v out from it]. */
const local = (wall: Wall, w: number, h: number, p: Pt): readonly [number, number] =>
  wall === 'top' ? [p.x, p.y] : wall === 'bottom' ? [p.x, h - p.y] : wall === 'left' ? [p.y, p.x] : [p.y, w - p.x];

/** Where staging fits along a wall: runs at least 150 long, each at the deepest depth that keeps clear all along. */
function stagingRuns(room: Room, wall: Wall, w: number, h: number, rng: Rng): Staging[] {
  const L = onBoard(wall, w, h);
  const side = wall === 'left' || wall === 'right';
  const [from, to] = side ? [SIDE_FROM, h - SIDE_FROM] : [-20, w + 20];
  const STEP = 12;
  const depthAt = (u: number): number => DEPTHS.find((dep) => fits(room, Array.from({ length: Math.ceil((dep + 10 - BACK) / 14) }, (_, k) => L(u, BACK + k * 14)))) ?? 0;
  const out: Staging[] = [];
  let start = -1;
  let deep = Infinity;
  for (let u = from; u <= to + STEP; u += STEP) {
    const dep = u <= to ? depthAt(u) : 0;
    if (dep > 0) {
      if (start < 0) start = u;
      deep = Math.min(deep, dep);
    } else if (start >= 0) {
      const end = u - STEP;
      if (end - start >= 150) {
        // Long runs are built as separate benches with gaps between.
        for (let a = start; a < end - 120; ) {
          const b = Math.min(end, a + 300 + rng() * 260);
          if (b - a >= 120) out.push({ wall, u0: a, u1: b, depth: deep });
          a = b + 26 + rng() * 30;
        }
      }
      start = -1;
      deep = Infinity;
    }
  }
  return out;
}

/** One run of slatted staging: shadow beneath, bearers seen through the gaps, weathered planks, a front rail. */
function paintStaging(d: Draw, s: Staging, w: number, h: number, rng: Rng): void {
  const { pen } = d;
  const L = onBoard(s.wall, w, h);
  const rect = (u0: number, u1: number, v0: number, v1: number): Pt[] => [L(u0, v0), L(u1, v0), L(u1, v1), L(u0, v1)];
  const all = rect(s.u0, s.u1, BACK, s.depth);
  castShadow(d, all, 22, 0.08);
  castShadow(d, all, 14, 0.12);
  pen.fill(all, UNDER, 0.5);
  for (let u = s.u0 + 20; u < s.u1 - 10; u += 105 + rng() * 30) pen.fill(rect(u - 4, u + 4, BACK, s.depth), mix(WOOD, UNDER, 0.4), 0.8);
  const rail = s.depth - 9;
  for (let v = BACK; v < rail - 6; v += PLANK) {
    const plank = rect(s.u0, s.u1, v, Math.min(v + PLANK - 3.5, rail - 1.5));
    body(d, plank, mix(WOOD, '#c8b796', rng() * 0.5), 0.6);
    pen.clipped(plank, () => {
      for (let k = 0; k < (s.u1 - s.u0) / 30; k++) {
        const u = s.u0 + rng() * (s.u1 - s.u0);
        const y = v + 2 + rng() * (PLANK - 7);
        const l = 30 + rng() * 70;
        pen.hair([L(u, y), L(u + l * 0.5, y + (rng() - 0.5)), L(u + l, y + (rng() - 0.5) * 1.5)], 0.45, d.ink, 0.3);
      }
      // Flecks of old white paint.
      pen.stipple(plank, Math.round((s.u1 - s.u0) / 4), () => 0.5, 0.9, '#f4efe2');
    });
    pen.crescent(plank, pt(-SHADOW.x * 2, -SHADOW.y * 2.5), () => pen.fill(plank, mix(WOOD, d.ink, 0.5), 0.3));
    pen.stroke(outline(plank), 0.75, d.ink, 0.65, false);
  }
  const front = rect(s.u0 - 3, s.u1 + 3, rail, s.depth);
  body(d, front, mix(WOOD, UNDER, 0.15), 0.65);
  pen.crescent(front, pt(-SHADOW.x * 2.5, -SHADOW.y * 3), () => pen.fill(front, mix(WOOD, d.ink, 0.5), 0.35));
  pen.stroke(outline(front), 1.1, d.ink, 0.9);
}

/** Pots, trays and tomato vines along a run of staging; vines may trail onto the floor where there's room. */
function stock(d: Draw, s: Staging, w: number, h: number, room: Room, rng: Rng): void {
  const L = onBoard(s.wall, w, h);
  const mid = (s.depth - 9) * 0.48;
  for (let u = s.u0 + 26 + rng() * 20; u < s.u1 - 26; ) {
    const roll = rng();
    if (roll < 0.25 && u + 80 < s.u1) {
      seedTray(d, L(u + 38, mid + 2), 72, Math.min(48, s.depth - 26), (s.wall === 'left' || s.wall === 'right' ? Math.PI / 2 : 0) + (rng() - 0.5) * 0.08, rng);
      u += 90 + rng() * 20;
    } else if (roll < 0.5) {
      const r = Math.min(21, (s.depth - 12) / 2.6);
      const c = L(u + r, mid + 4);
      // The vine: over the front rail and down onto the floor if it can, else along the bench.
      const out = L(u + r + 20 + rng() * 50, s.depth + 50 + rng() * 40);
      const trail = arc(c, out, (rng() - 0.5) * 30, 12);
      const along = arc(c, L(u + r + 60 + rng() * 30, mid + 8), 8, 10);
      tomatoVine(d, fits(room, trail, VINE_REACH) ? trail : along, rng);
      pot(d, c, r, rng, 'tomato');
      u += r * 2 + 18 + rng() * 14;
    } else {
      const n = 2 + Math.floor(rng() * 3);
      for (let k = 0; k < n && u < s.u1 - 26; k++) {
        const r = 11 + rng() * 6;
        const kinds: readonly Planting[] = ['seedlings', 'geranium', 'basil', 'seedlings', 'empty'];
        pot(d, L(u + r, mid + (rng() - 0.5) * 12), r, rng, kinds[Math.floor(rng() * kinds.length)]!);
        u += r * 2 + 4 + rng() * 6;
      }
      u += 14 + rng() * 16;
    }
  }
}

/** Whether a disc overlaps any staging. */
function onStaging(p: Pt, r: number, runs: readonly Staging[], w: number, h: number): boolean {
  return runs.some((s) => {
    const [u, v] = local(s.wall, w, h, p);
    return u > s.u0 - r && u < s.u1 + r && v < s.depth + r;
  });
}

/** The floor at the edges: a grating, pot clusters, a watering can, shards and fallen leaves. */
function floorThings(d: Draw, w: number, h: number, room: Room, runs: readonly Staging[], rng: Rng): void {
  const taken: Taken[] = [];
  const spot = (r: number, boxes: readonly (readonly [number, number, number, number])[]): Pt | null => {
    for (let t = 0; t < 4; t++) {
      for (const box of boxes) {
        const p = spotFor(rng, room, box, r, taken, 10, 12);
        if (p && !onStaging(p, r, runs, w, h)) return p;
      }
    }
    return null;
  };
  const sides = [[10, 60, 170, h - 60], [w - 170, 60, w - 10, h - 60]] as const;
  const anywhere = [...sides, [60, 10, w - 60, 150], [60, h - 150, w - 60, h - 10]] as const;
  // A grating along a wall, over the heating pipes.
  for (const [x, len] of [[16, 260], [w - 86, 260], [16, 170], [w - 86, 170]] as const) {
    const y = 120 + rng() * (h - 240 - len);
    const box = [pt(x, y), pt(x + 70, y), pt(x + 70, y + len), pt(x, y + len), pt(x + 35, y + len / 2)];
    const edgeOf = Array.from({ length: Math.ceil(len / 20) + 1 }, (_, k) => [pt(x, y + k * 20), pt(x + 70, y + Math.min(len, k * 20))]).flat();
    if (fits(room, [...box, ...edgeOf]) && !box.some((p) => onStaging(p, 0, runs, w, h))) {
      grating(d, x, y, 70, len, rng);
      taken.push({ x: x + 35, y: y + len / 2, r: len / 2 });
      break;
    }
  }
  const can = spot(CAN * 0.62, anywhere);
  if (can) {
    wateringCan(d, can, CAN, rng() * TAU, rng);
    taken.push({ x: can.x, y: can.y, r: CAN * 0.62 });
  }
  for (let c = 0; c < 3; c++) {
    const at = spot(46, anywhere);
    if (!at) break;
    taken.push({ x: at.x, y: at.y, r: 46 });
    const n = 3 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      const r = 12 + rng() * 14;
      const p = polar(at, (k / n) * TAU + rng() * 0.5, k === 0 ? 0 : 30 + rng() * 8);
      // Leaves spill past a pot's rim by up to half its radius.
      if (room(p.x, p.y) < r * 1.5 + 3) continue;
      if (rng() < 0.3) {
        pot(d, p, r + 3, rng, 'empty');
        pot(d, pt(p.x - 1.5, p.y - 2), r, rng, 'empty');
      } else pot(d, p, r, rng, (['geranium', 'seedlings', 'basil', 'empty'] as const)[Math.floor(rng() * 4)]!);
    }
  }
  // Shards of broken pot, spilt compost and fallen leaves, small and flat.
  for (let k = 0; k < 26; k++) {
    const p = spot(4, anywhere);
    if (!p) continue;
    const roll = rng();
    if (roll < 0.35) {
      const shard = blob(p, 5 + rng() * 5, 3 + rng() * 3, rng, 0.3, 7, rng() * TAU);
      castShadow(d, shard, 2, 0.15);
      body(d, shard, TERRACOTTA, 0.75);
      d.pen.stroke(closed(shard), 0.7, d.ink, 0.85, false);
    } else if (roll < 0.55) {
      d.pen.stipple(blob(p, 16, 9, rng, 0.4, 12, rng() * TAU), 70, () => 0.8, 0.9, '#5e4636');
    } else {
      const a = rng() * TAU;
      const leafShape = [...arc(p, polar(p, a, 12 + rng() * 8), 4, 6), ...arc(polar(p, a, 12), p, 4, 6).slice(1)];
      castShadow(d, leafShape, 2, 0.1);
      body(d, leafShape, rng() < 0.5 ? mix(LEAF, '#c9a54a', 0.6) : '#c98a3e', 0.6);
      d.pen.hair(closed(leafShape), 0.45, d.ink, 0.6);
    }
  }
}

/** Long soft shadows of the glazing bars and transoms, with warmer sun between, laid over the whole floor. */
function glazing(d: Draw, w: number, h: number): void {
  const dir = pt(Math.cos(BAR_DIR), Math.sin(BAR_DIR));
  const nrm = pt(-dir.y, dir.x);
  const reach = Math.hypot(w, h);
  const line = (off: number, along: Pt, across: Pt): Pt[] => [pt(w / 2 + across.x * off - along.x * reach, h / 2 + across.y * off - along.y * reach), pt(w / 2 + across.x * off + along.x * reach, h / 2 + across.y * off + along.y * reach)];
  for (let off = -reach / 2; off < reach / 2; off += BAR_GAP) {
    softBand(d, line(off + BAR_GAP / 2, dir, nrm), BAR_GAP * 0.5, SUN, 0.1);
    softBand(d, line(off, dir, nrm), 24, GLASS_SHADOW, 0.04);
    softBand(d, line(off, dir, nrm), 8, GLASS_SHADOW, 0.1);
  }
  for (let off = -reach / 2 + 60; off < reach / 2; off += TRANSOM_GAP) softBand(d, line(off, nrm, dir), 12, GLASS_SHADOW, 0.05);
}

/** The greenhouse page: see the module comment. */
export function paintGreenhouse(d: Draw, w: number, h: number, keep: GroundKeep): void {
  const rng = createRng(3310);
  const edge = edgenessOf(w, h, 0.45);
  const room = roomOf(keep, w, h);
  groundWash(d, w, h, GROUT, 0.42);
  tiles(d, w, h, edge, rng);
  edgeWash(d, w, h, '#b07a5c', 0.22);
  const runs = (['top', 'bottom', 'left', 'right'] as const).flatMap((wall) => stagingRuns(room, wall, w, h, rng));
  for (const s of runs) paintStaging(d, s, w, h, rng);
  for (const s of runs) stock(d, s, w, h, room, rng);
  floorThings(d, w, h, room, runs, rng);
  glazing(d, w, h);
}
