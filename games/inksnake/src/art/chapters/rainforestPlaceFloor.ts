import { createRng, type Rng } from '../../logic/rng';
import { BOARD, type LevelDef } from '../../level/types';
import { arc, SHADOW } from '../groundKit';
import { type Draw, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import { seedOf } from '../places/farmKit';
import { mix, rgba } from '../wash';
import {
  around, BARK, BARK_DARK, BARK_LIT, blot, FLECK, FLOOR, FLOOR_DEEP, fillLeaves, HAZE, type Leaf, LITTER, LITTER_LIT, LITTER_RED, MOSS_FLOOR, strokeLeaves,
  WATER, WATER_LIT,
} from './rainforestPlaceKit';

/**
 * The forest floor, seen far below through the gaps in the canopy: dim and
 * soft with distance, a damp umber-green, drifts of fallen leaves, mossy
 * fallen logs, the fans of understory palms and ferns, a stream on some
 * levels, a few flecks of sun that get all the way down, and over it all a
 * blue-green haze of the air between. Each level lies differently.
 */
const { w: W, h: H } = BOARD;
/** How bright the flecks of sun on the floor are. */
const FLECK_ALPHA = 0.18;

/** Which levels have a stream winding over the floor (water monitors hunt along them). */
const STREAMS: ReadonlySet<string> = new Set(['rainforest-2', 'rainforest-4', 'rainforest-8', 'rainforest-10']);

/** The ground's washes: the base, then big soft blots of litter brown, moss and shade. */
function washes(d: Draw, rng: Rng): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.fillStyle = FLOOR;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const tones = [LITTER, LITTER, MOSS_FLOOR, FLOOR_DEEP, LITTER_RED];
  for (let i = 0; i < 70; i++) {
    const tone = tones[Math.floor(rng() * tones.length)]!;
    blot(ctx, pt(rng() * W, rng() * H), 40 + rng() * 110, tone, 0.25 + rng() * 0.3, 0.3);
  }
}

/** Fallen leaves by the thousand, browns and rusts, soft: a lighter few on top. */
function litter(d: Draw, rng: Rng): void {
  const { ctx } = d.pen;
  const sets: Leaf[][] = [[], [], [], []];
  for (let i = 0; i < 5200; i++) {
    const l = 3 + rng() * 5;
    sets[Math.floor(rng() * 4)]!.push({ x: rng() * W, y: rng() * H, a: rng() * TAU, l, w: l * (0.45 + rng() * 0.2) });
  }
  fillLeaves(ctx, sets[0]!, LITTER, 0.55);
  fillLeaves(ctx, sets[1]!, LITTER_RED, 0.45);
  fillLeaves(ctx, sets[2]!, FLOOR_DEEP, 0.4);
  fillLeaves(ctx, sets[3]!, LITTER_LIT, 0.45);
  strokeLeaves(ctx, sets[0]!.concat(sets[3]!), FLOOR_DEEP, 0.35, 0.3);
}

/** A stream winding across the floor: dark water, a paler sheen down its middle, wet stones at its banks. */
function stream(d: Draw, rng: Rng): void {
  const { ctx } = d.pen;
  const vertical = rng() < 0.5;
  const ph = rng() * TAU;
  const at = (t: number): Pt => {
    const s = Math.sin(t * TAU * 1.3 + ph) * 60 + Math.sin(t * TAU * 2.9 + ph * 2) * 22;
    return vertical ? pt(W * (0.32 + 0.3 * t) + s, t * H) : pt(t * W, H * (0.55 + 0.1 * Math.sin(ph)) + s);
  };
  const path = Array.from({ length: 61 }, (_, i) => at(-0.05 + (i / 60) * 1.1));
  const band = (width: number, colour: string, alpha: number): void => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(colour, alpha);
    ctx.lineWidth = width;
    ctx.beginPath();
    path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
  };
  band(40, '#2a2a1e', 0.5);
  band(30, WATER, 0.9);
  band(14, mix(WATER, WATER_LIT, 0.25), 0.5);
  for (let i = 2; i < path.length - 2; i += 3) {
    const p = path[i]!;
    const q = path[i + 1]!;
    const a = Math.atan2(q.y - p.y, q.x - p.x);
    d.pen.hair([around(p, a + 1.57, rng() * 6 - 3), around(around(p, a, 9), a + 1.57, rng() * 6 - 3)], 0.6, WATER_LIT, 0.4);
    for (const side of [1, -1]) {
      if (rng() < 0.5) continue;
      const s = around(p, a + side * 1.57, 15 + rng() * 6);
      d.pen.dot(s.x, s.y, 1.5 + rng() * 2, mix('#7b7a66', FLOOR_DEEP, rng() * 0.5), 0.8);
    }
  }
  d.pen.hair(path.map((p) => pt(p.x, p.y - 15)), 0.6, d.ink, 0.25);
  d.pen.hair(path.map((p) => pt(p.x, p.y + 15)), 0.8, d.ink, 0.35);
}

/** A fallen log: a long mossy cylinder, its bark lined, its shadow under it, moss in cushions along it. */
function log(d: Draw, c: Pt, a: number, len: number, rng: Rng): void {
  const { pen } = d;
  const r = 7 + rng() * 5;
  const u = pt(Math.cos(a), Math.sin(a));
  const n = pt(-u.y, u.x);
  const end0 = pt(c.x - (u.x * len) / 2, c.y - (u.y * len) / 2);
  const end1 = pt(c.x + (u.x * len) / 2, c.y + (u.y * len) / 2);
  const side = (k: number): Pt[] => arc(pt(end0.x + n.x * r * k, end0.y + n.y * r * k), pt(end1.x + n.x * r * k, end1.y + n.y * r * k), rng() * 3, 12);
  const shape = [...side(1), ...side(-1).reverse()];
  pen.fill(shape.map((p) => pt(p.x + SHADOW.x * 6, p.y + SHADOW.y * 6)), FLOOR_DEEP, 0.6);
  pen.fill(shape, BARK, 0.95);
  pen.crescent(shape, pt(SHADOW.x * r * 0.8, SHADOW.y * r * 0.8), () => pen.fill(shape, BARK_LIT, 0.45));
  pen.crescent(shape, pt(-SHADOW.x * r * 0.8, -SHADOW.y * r * 0.8), () => pen.fill(shape, BARK_DARK, 0.5));
  for (let k = -0.6; k <= 0.6; k += 0.4) pen.hair(side(k).slice(1 + Math.floor(rng() * 3), 9 + Math.floor(rng() * 3)), 0.5, BARK_DARK, 0.55);
  for (let i = 0; i < len / 9; i++) {
    const p = around(c, a, (rng() - 0.5) * len);
    const m = around(p, a + 1.57, (rng() - 0.5) * r * 1.2);
    blot(d.pen.ctx, m, 4 + rng() * 5, MOSS_FLOOR, 0.8, 0.5);
    pen.dot(m.x - 1, m.y - 1, 1.6, '#6f8a45', 0.5);
  }
  pen.hair([...side(1)], 0.7, d.ink, 0.45);
  pen.hair([...side(-1)], 1, d.ink, 0.55);
  pen.dot(end1.x, end1.y, r * 0.8, '#7a6248', 0.8);
  pen.hair(Array.from({ length: 13 }, (_, i) => around(end1, (i / 12) * TAU, r * 0.5)), 0.4, BARK_DARK, 0.5);
}

/** An understory palm (or a tree fern) seen from above: long pinnate fronds fanning out from a dark heart. */
function palm(d: Draw, c: Pt, size: number, rng: Rng): void {
  const { ctx } = d.pen;
  const n = 6 + Math.floor(rng() * 4);
  const leaflets: Leaf[] = [];
  const shadows: Leaf[] = [];
  const ribs: Pt[][] = [];
  const ph = rng() * TAU;
  for (let i = 0; i < n; i++) {
    const a = ph + (i / n) * TAU + (rng() - 0.5) * 0.4;
    const len = size * (0.75 + rng() * 0.4);
    const rib = arc(c, around(c, a, len), (rng() - 0.5) * len * 0.3, 14);
    ribs.push(rib);
    for (let k = 2; k < rib.length; k++) {
      const p = rib[k]!;
      const q = rib[k - 1]!;
      const along = Math.atan2(p.y - q.y, p.x - q.x);
      const l = (size * 0.32) * (1 - k / rib.length) ** 0.4;
      for (const s of [1, -1]) {
        const m = around(p, along + s * 1.1, l * 0.5);
        leaflets.push({ x: m.x, y: m.y, a: along + s * 1.1, l, w: l * 0.22 });
        shadows.push({ x: m.x + SHADOW.x * 3, y: m.y + SHADOW.y * 3, a: along + s * 1.1, l, w: l * 0.22 });
      }
    }
  }
  fillLeaves(ctx, shadows, FLOOR_DEEP, 0.4);
  fillLeaves(ctx, leaflets, '#46693a', 0.9);
  strokeLeaves(ctx, leaflets, '#7c9a52', 0.6, 0.4);
  for (const rib of ribs) d.pen.hair(rib, 0.6, d.ink, 0.5);
  d.pen.dot(c.x, c.y, size * 0.08, FLOOR_DEEP, 0.9);
}

/** Sun reaching the floor in a few soft flecks. */
function flecks(d: Draw, rng: Rng): void {
  for (let i = 0; i < 7; i++) blot(d.pen.ctx, pt(rng() * W, rng() * H), 6 + rng() * 12, FLECK, FLECK_ALPHA * (0.6 + rng() * 0.6), 0.45);
}

/** The air between: a blue-green haze over the whole floor, deeper at the board's edges. */
function haze(d: Draw): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.fillStyle = rgba(HAZE, 0.14);
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
  g.addColorStop(0, rgba(FLOOR_DEEP, 0));
  g.addColorStop(1, rgba(FLOOR_DEEP, 0.4));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** The whole floor, for a level. */
export function paintFloor(d: Draw, level: LevelDef): void {
  const rng = createRng(seedOf(level.id));
  washes(d, rng);
  litter(d, rng);
  if (STREAMS.has(level.id)) stream(d, rng);
  for (let i = 0; i < 2 + Math.floor(rng() * 2); i++) log(d, pt(80 + rng() * (W - 160), 60 + rng() * (H - 120)), rng() * TAU, 90 + rng() * 90, rng);
  for (let i = 0; i < 9; i++) palm(d, pt(rng() * W, rng() * H), 26 + rng() * 26, rng);
  flecks(d, rng);
  haze(d);
}
