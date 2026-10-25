import { createRng, type Rng } from '../../logic/rng';
import type { LevelDef } from '../../level/types';
import { blob, edgeWash, edgenessOf, groundWash, wash } from '../groundKit';
import { type Draw, pt, TAU } from '../kit';
import { makeCanvas, type Pt, shrink } from '../pen';
import { PAPER_FILL } from '../palette';
import { busyOf, keepsOf, noiseOf, perArea, seedOf, smoothstep } from '../places/farmKit';
import { specks } from '../places/farmGroundParts';
import { paintHeathFloor } from './heathPlaceFloor';
import {
  BLOOM, BLOOM_DEEP, BLOOM_LIT, H, LING, LING_BRONZE, LING_DEEP, LING_LIT, LING_RUST, type Look, lookOf, type Mark, markShadows, PEAT, SAND, SAND_BUFF, SAND_DEEP,
  SAND_GREY, rngAt, setPaintingBloom, sprig, strokeMarks, W,
} from './heathPlaceKit';
import { sandyPath, smoothPath } from './heathPlacePath';
import { peatPool } from './heathPlacePool';
import { sett, settsOf } from './heathPlaceSett';

/**
 * The Heath's ground (chapter 8), seen from above: English lowland heath on
 * pale podzol sand. Ling heather lies over most of it as a low carpet of
 * tiny sprigs on black peat, thickest at the edges, thinning to open sand
 * in the clearings: the sun patches (the zones the chapter's view lights
 * are left bare sand, the warm places an adder basks on) and round the
 * snake's start. A sandy path winds across most levels; Heron Pool has its
 * peaty pool, the Badger's level its setts. The floor's small things
 * (grass, lichen, moss, bracken, birch scrub) are in heathPlaceFloor.ts.
 * Each level lies differently (seeded from its id), its season set by its
 * look: last year's rusty heather in spring, purple in flower later.
 */

/** How thick the ling lies at a spot (0..1). */
export type Field = (x: number, y: number) => number;

/** What the floor's painters are told about the board. */
export interface Board {
  readonly look: Look;
  readonly field: Field;
  /** How busy the ground may be (low near the level's things and in the middle). */
  readonly busy: (x: number, y: number) => number;
  /** Open sand: a clearing, the path, round a sett or the pool (0..1). */
  readonly open: (x: number, y: number) => number;
  readonly pool: { readonly c: Pt; readonly r: number } | null;
  readonly setts: readonly Pt[];
}

function boardOf(level: LevelDef, look: Look, path: readonly Pt[] | null, rng: Rng): Board {
  const n1 = noiseOf(rng, 150);
  const n2 = noiseOf(rng, 42);
  const edge = edgenessOf(W, H, 0.25);
  const clearings = (level.zones ?? []).flatMap((z) => (z.kind === 'sun' && z.shape === 'circle' ? [{ x: z.x, y: z.y, r: z.r }] : []));
  const poolZone = (level.zones ?? []).find((z) => z.kind === 'water' && z.shape === 'circle');
  const pool = poolZone && poolZone.shape === 'circle' ? { c: pt(poolZone.x, poolZone.y), r: poolZone.r } : null;
  const setts = settsOf(level);
  const ragged = noiseOf(rng, 26);
  const lobes = noiseOf(rng, 70);
  const open = (x: number, y: number): number => {
    let v = 0;
    // The clearings' edges wander in bays and spits of heather.
    const wander = 13 * ragged(x, y) + 24 * lobes(x, y);
    for (const c of clearings) v = Math.max(v, smoothstep(1 - (Math.hypot(x - c.x, y - c.y) - c.r * 0.8 + wander) / (c.r * 0.38)));
    if (pool) v = Math.max(v, smoothstep(1 - (Math.hypot(x - pool.c.x, y - pool.c.y) - pool.r) / 26));
    for (const s of setts) v = Math.max(v, smoothstep(1 - (Math.hypot(x - s.x, y - s.y) - 30) / 30));
    if (path) v = Math.max(v, smoothstep(1 - (distToLine(path, x, y) - 9) / 9));
    return v;
  };
  const field = (x: number, y: number): number => {
    const mats = smoothstep((0.7 * n1(x, y) + 0.3 * n2(x, y) + 0.15) / 0.42);
    const v = 0.36 + 0.5 * mats + 0.4 * edge(x, y);
    return Math.max(0, Math.min(1, v * (1 - open(x, y))));
  };
  return { look, field, busy: busyOf(keepsOf(level)), open, pool, setts };
}

function distToLine(line: readonly Pt[], x: number, y: number): number {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((x - a.x) * ex + (y - a.y) * ey) / (ex * ex + ey * ey || 1)));
    best = Math.min(best, Math.hypot(x - a.x - ex * t, y - a.y - ey * t));
  }
  return best;
}

/** The paper, the sand's wash, blooms where it dried unevenly, its grains of quartz, peat-brown pooled at the edges. */
function sand(d: Draw, rng: Rng): void {
  groundWash(d, W, H, SAND, 0.68);
  for (let k = 0; k < perArea(80); k++) {
    const p = pt(rng() * W, rng() * H);
    const colour = rng() < 0.35 ? SAND_BUFF : rng() < 0.6 ? SAND_GREY : PAPER_FILL;
    d.pen.fill(blob(p, 40 + rng() * 90, 24 + rng() * 50, rng, 0.32, 18, rng() * TAU), colour, 0.07);
  }
  for (let k = 0; k < perArea(16); k++) {
    const p = pt(rng() * W, rng() * H);
    wash(d, blob(p, 36 + rng() * 70, 22 + rng() * 40, rng, 0.35, 24, rng() * TAU), rng() < 0.5 ? SAND_GREY : SAND_BUFF, 0.06, 0.8);
  }
  const at = (n: number, r0: number, r1: number): (readonly [number, number, number])[] => Array.from({ length: perArea(n) }, () => [rng() * W, rng() * H, r0 + rng() * (r1 - r0)] as const);
  specks(d, SAND_DEEP, 0.3, at(26000, 0.3, 0.75));
  specks(d, '#6d6658', 0.25, at(5000, 0.3, 0.6));
  specks(d, PAPER_FILL, 0.6, at(16000, 0.3, 0.7));
  edgeWash(d, W, H, '#5e4a38', 0.32, W * 0.2);
}

/** A colour as its three channels. */
const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

/**
 * The peat and the ling's mat over it, laid as one soft low-resolution wash
 * (smoothed up to the board): black-brown peat where the heather is thin,
 * the dense mat's deep olive, bronze and green where it is thick, mottled
 * as old and young bushes lie side by side; then wet-edged blooms.
 */
function mats(d: Draw, field: Field, rng: Rng): void {
  const cell = 4;
  const cols = Math.ceil(W / cell) + 1;
  const rows = Math.ceil(H / cell) + 1;
  const { canvas, ctx } = makeCanvas(cols, rows);
  const img = ctx.createImageData(cols, rows);
  const peat = rgb(PEAT);
  const deep = rgb(LING_DEEP);
  const mid = rgb(LING);
  const bronze = rgb(LING_BRONZE);
  const tone = noiseOf(rng, 60);
  const age = noiseOf(rng, 23);
  const fine = noiseOf(rng, 9);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const f = field(x * cell, y * cell);
      const mat = smoothstep((f - 0.32 + 0.07 * fine(x * cell, y * cell)) / 0.1);
      const t = 0.62 + 0.38 * tone(x * cell, y * cell);
      const a = 0.5 + 0.5 * age(x * cell, y * cell);
      const i = (y * cols + x) * 4;
      for (let c = 0; c < 3; c++) {
        const leaf = deep[c]! * (1 - t) + (mid[c]! * (1 - a) + bronze[c]! * a) * t;
        img.data[i + c] = Math.round(peat[c]! * (1 - mat) + leaf * mat);
      }
      img.data[i + 3] = Math.round(255 * Math.min(0.88, 0.12 * f + 0.74 * mat));
    }
  }
  ctx.putImageData(img, 0, 0);
  const out = d.pen.ctx;
  out.save();
  out.imageSmoothingEnabled = true;
  out.imageSmoothingQuality = 'high';
  out.drawImage(canvas, 0, 0, cols, rows, 0, 0, cols * cell, rows * cell);
  out.restore();
  shrink(canvas);
  for (let k = 0; k < perArea(90); k++) {
    const p = pt(rng() * W, rng() * H);
    if (field(p.x, p.y) < 0.45) continue;
    wash(d, blob(p, 14 + rng() * 34, 10 + rng() * 22, rng, 0.45, 18, rng() * TAU), rng() < 0.4 ? LING_DEEP : rng() < 0.6 ? LING_BRONZE : LING_LIT, 0.12, 0.6);
  }
}

/**
 * The ling: tens of thousands of sprigs, each a stem with its scale leaves,
 * in deep, mid, bronze and lit greens as it lies in shade or catches the
 * light, flowering purple in drifts in its season or carrying last year's
 * rusty heads, each mark throwing its hair of shadow.
 */
function ling(d: Draw, board: Board, rng: Rng): void {
  const { field, look } = board;
  const groups = { deep: [] as Mark[], mid: [] as Mark[], bronze: [] as Mark[], lit: [] as Mark[] };
  const stems: Mark[] = [];
  const bloom: Mark[] = [];
  const bloomLit: Mark[] = [];
  const old: Mark[] = [];
  const tone = noiseOf(rng, 120);
  const drift = noiseOf(rng, 90);
  for (let k = 0; k < perArea(64000); k++) {
    const x = rng() * W;
    const y = rng() * H;
    const f = field(x, y);
    if (rng() > smoothstep((f - 0.29) / 0.16) ** 1.3 * 0.95 + 0.002) continue;
    const t = tone(x, y);
    const pick = rng();
    const into = pick < 0.26 ? groups.deep : pick < 0.34 + 0.25 * Math.max(0, t) ? groups.bronze : pick < 0.84 ? groups.mid : groups.lit;
    const flowering = look.bloom * smoothstep(0.5 + drift(x, y) * 1.6) * smoothstep((f - 0.3) / 0.4);
    const flowers = rng() < flowering ? (rng() < 0.3 ? bloomLit : bloom) : rng() < 0.3 * (1 - look.bloom) * f ? old : null;
    sprig(x, y, rng() * TAU, 3 + rng() * 4.5, rng, stems, into, flowers);
  }
  markShadows(d, [...groups.deep, ...groups.mid, ...groups.bronze, ...groups.lit], 0.16, 1.1, 0.9);
  strokeMarks(d, stems, '#3e2e24', 0.55, 0.45);
  strokeMarks(d, groups.deep, LING_DEEP, 0.8, 0.8);
  strokeMarks(d, groups.bronze, LING_BRONZE, 0.75, 0.75);
  strokeMarks(d, groups.mid, LING, 0.78, 0.75);
  strokeMarks(d, groups.lit, LING_LIT, 0.75, 0.65);
  markShadows(d, [...bloom, ...bloomLit, ...old], 0.14, 1.1, 0.7);
  strokeMarks(d, old, LING_RUST, 0.7, 0.9);
  strokeMarks(d, bloom, BLOOM, 0.85, 1);
  strokeMarks(d, bloom.filter((_, i) => i % 3 === 0), BLOOM_DEEP, 0.6, 0.7);
  strokeMarks(d, bloomLit, BLOOM_LIT, 0.85, 0.9);
}

/** The Heath's ground for a level: see the module comment. */
export function paintHeathGround(d: Draw, level: LevelDef): void {
  const rng = createRng(seedOf(level.id));
  const look = lookOf(level);
  setPaintingBloom(look.bloom);
  const path = look.path ? smoothPath(look.path) : null;
  const board = boardOf(level, look, path, rng);
  sand(d, rng);
  mats(d, board.field, rng);
  if (path) sandyPath(d, path, 13, rng);
  if (board.pool) peatPool(d, board.pool.c, board.pool.r, rng);
  ling(d, board, rng);
  paintHeathFloor(d, level, board, rng);
  for (const s of board.setts) sett(d, s, rngAt(s.x, s.y, 5));
}
