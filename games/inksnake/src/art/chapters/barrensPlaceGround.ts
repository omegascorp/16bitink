import { createRng, type Rng } from '../../logic/rng';
import type { LevelDef, SolidDef } from '../../level/types';
import { blob, edgeWash, edgenessOf, groundWash, wash } from '../groundKit';
import { type Draw, pt, TAU } from '../kit';
import { makeCanvas, type Pt, shrink } from '../pen';
import { PAPER_FILL } from '../palette';
import { type Busy, busyOf, distTo, keepsOf, noiseOf, perArea, seedOf, smoothstep } from '../places/farmKit';
import { specks } from '../places/farmGroundParts';
import { burntLitter, firebreak, scorch } from './barrensPlaceFire';
import { paintFloor } from './barrensPlaceFloor';
import {
  ASH, type Burn, burnDepth, burnOf, CHAR, SHADE, DUFF, fascicle, H, type Needle, NEEDLE, NEEDLE_DARK, NEEDLE_LIT, NEEDLE_OLD, needleShadows, SAND, SAND_BUFF, SAND_DEEP, SAND_GREY,
  setPaintingBurn, strokeNeedles, W,
} from './barrensPlaceKit';
import { Bare, planTrack, type PrintKind, sandPath, sandRoad, trail } from './barrensPlaceTracks';

/**
 * The Pine Barrens' ground (chapter 2), seen from above in autumn: pale
 * white-grey sugar sand, carpeted unevenly with rusty pitch-pine needles
 * (thick round each pine, thin and calm in the middle where the snake
 * hunts), a sand road or a trodden path with an animal's prints, and at the
 * edges reindeer lichen, wintergreen, bronze little bluestem and bracken
 * (barrensPlaceFloor.ts). Each level lies differently (seeded from its id);
 * the fire levels have their burn (barrensPlaceFire.ts).
 */

type Track = 'road' | 'path' | 'none';

export interface Look {
  readonly track: Track;
  readonly prints?: PrintKind;
  /** Damp ground: haircap moss in the hollows. */
  readonly damp?: boolean;
  /** Scrub oak near: its brown leaves among the needles. */
  readonly oak?: boolean;
  /** How much reindeer lichen (1 is usual). */
  readonly lichen: number;
  /** Bracken fronds reaching in from the edges. */
  readonly ferns: number;
  /** The sand's tone. */
  readonly tone: string;
}

const PLAIN: Look = { track: 'path', lichen: 1, ferns: 3, tone: SAND };
const LOOKS: Readonly<Record<string, Look>> = {
  'barrens-1': { track: 'road', prints: 'deer', lichen: 1, ferns: 4, tone: SAND },
  'barrens-2': { track: 'path', prints: 'raccoon', lichen: 1, ferns: 3, tone: '#d6cdb9' },
  'barrens-3': { track: 'path', damp: true, oak: true, lichen: 0.7, ferns: 5, tone: '#d3cab4' },
  'barrens-4': { track: 'road', lichen: 1.6, ferns: 2, tone: '#ddd5c1' },
  'barrens-5': { track: 'none', damp: true, lichen: 0.9, ferns: 6, tone: '#d4ccb6' },
  'barrens-6': { track: 'path', lichen: 0.8, ferns: 3, tone: SAND },
  'barrens-7': { track: 'road', prints: 'raccoon', lichen: 1, ferns: 3, tone: '#d8cfba' },
  'barrens-8': { track: 'none', lichen: 1, ferns: 3, tone: SAND },
  'barrens-9': { track: 'path', prints: 'deer', lichen: 1.2, ferns: 4, tone: '#d7cfbd' },
  'barrens-10': { track: 'road', prints: 'fox', lichen: 1, ferns: 4, tone: SAND },
};

/** How thick the needle litter lies at a spot (0..1): patchy, thick at the edges and round each pine, thin in the middle and by the snake's start. */
export type Litter = (x: number, y: number) => number;

function litterOf(level: LevelDef, rng: Rng): Litter {
  const n1 = noiseOf(rng, 170);
  const n2 = noiseOf(rng, 55);
  const edge = edgenessOf(W, H, 0.3);
  const pines = (level.solids ?? []).filter((s): s is Extract<SolidDef, { kind: 'circle' }> => s.look === 'pine' && s.kind === 'circle');
  const { start } = level;
  return (x, y) => {
    // Mats of needles where they drifted, open sand between.
    const mats = smoothstep((0.75 * n1(x, y) + 0.25 * n2(x, y) + 0.04) / 0.34);
    let v = 0.12 + 0.55 * mats + 0.42 * edge(x, y);
    for (const p of pines) v += 0.8 * Math.max(0, 1 - (Math.hypot(x - p.x, y - p.y) - p.r) / 140) ** 1.6;
    const mid = Math.hypot((x - W / 2) / (W * 0.34), (y - H / 2) / (H * 0.38));
    v -= 0.2 * Math.max(0, 1 - mid);
    v -= 0.22 * Math.max(0, 1 - Math.hypot(x - start.x, y - start.y) / 110);
    return Math.max(0, Math.min(1, v));
  };
}

/** The paper, the sand's wash, blooms where it dried unevenly, its grains, umber pooled at the edges. */
function sand(d: Draw, look: Look, busy: Busy, rng: Rng): void {
  groundWash(d, W, H, look.tone, 0.66);
  for (let k = 0; k < perArea(80); k++) {
    const p = pt(rng() * W, rng() * H);
    const colour = rng() < 0.35 ? SAND_BUFF : rng() < 0.6 ? SAND_GREY : PAPER_FILL;
    d.pen.fill(blob(p, 40 + rng() * 90, 24 + rng() * 50, rng, 0.32, 18, rng() * TAU), colour, 0.05 + 0.08 * busy(p.x, p.y));
  }
  for (let k = 0; k < perArea(18); k++) {
    const p = pt(rng() * W, rng() * H);
    wash(d, blob(p, 36 + rng() * 70, 22 + rng() * 40, rng, 0.35, 24, rng() * TAU), rng() < 0.5 ? SAND_GREY : SAND_BUFF, 0.06, 0.8);
  }
  const at = (n: number, r0: number, r1: number): (readonly [number, number, number])[] => Array.from({ length: perArea(n) }, () => [rng() * W, rng() * H, r0 + rng() * (r1 - r0)] as const);
  specks(d, SAND_DEEP, 0.3, at(30000, 0.3, 0.75));
  specks(d, '#7c7468', 0.25, at(6000, 0.3, 0.6));
  specks(d, PAPER_FILL, 0.55, at(14000, 0.3, 0.7));
  edgeWash(d, W, H, '#8a6a4c', 0.3, W * 0.2);
}

/** The duff: the brown of old needles rotting into the sand, a soft wash where the litter lies thick. */
function duff(d: Draw, litter: Litter, rng: Rng): void {
  const cell = 6;
  const cols = Math.ceil(W / cell) + 1;
  const rows = Math.ceil(H / cell) + 1;
  const { canvas, ctx } = makeCanvas(cols, rows);
  const img = ctx.createImageData(cols, rows);
  const r = parseInt(DUFF.slice(1, 3), 16);
  const g = parseInt(DUFF.slice(3, 5), 16);
  const b = parseInt(DUFF.slice(5, 7), 16);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = Math.round(255 * 0.3 * litter(x * cell, y * cell) ** 1.5);
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
  // Wet edges where the wash pooled.
  for (let k = 0; k < perArea(50); k++) {
    const p = pt(rng() * W, rng() * H);
    if (litter(p.x, p.y) < 0.45) continue;
    wash(d, blob(p, 20 + rng() * 45, 14 + rng() * 26, rng, 0.4, 18, rng() * TAU), rng() < 0.6 ? DUFF : NEEDLE_OLD, 0.07, 0.7);
  }
}

/** The level's things the tracks steer round (not the snake's start: a track may run under it). */
function thingsOf(level: LevelDef): ReturnType<typeof keepsOf> {
  return keepsOf(level).slice(0, (level.solids?.length ?? 0) + (level.cover?.length ?? 0) + (level.nests?.length ?? 0));
}

function tracks(d: Draw, level: LevelDef, look: Look, burn: Burn | null, bare: Bare, rng: Rng): void {
  if (look.track === 'none') return;
  const avoid = (p: Pt): number => (burn && burnDepth(burn, p.x, p.y) > -30 ? 1.5 : 0);
  const pts = planTrack(thingsOf(level), avoid, rng);
  if (look.track === 'road') {
    sandRoad(d, pts, 26, rng);
    bare.line(pts, 30);
  } else {
    sandPath(d, pts, 12, rng);
    bare.line(pts, 15);
  }
  if (look.prints) trail(d, pts, look.prints, rng);
}

/** The needle litter: thousands of fallen fascicles, old grey ones under rust ones under fresh lit ones; charred black and ash-grey in a burn, singed orange at its edge. */
function needles(d: Draw, litter: Litter, burn: Burn | null, bare: Bare, rng: Rng): void {
  const old: Needle[] = [];
  const dark: Needle[] = [];
  const rust: Needle[] = [];
  const lit: Needle[] = [];
  const charred: Needle[] = [];
  const ashen: Needle[] = [];
  const singed: Needle[] = [];
  const wind = noiseOf(rng, 260);
  const age = noiseOf(rng, 140);
  for (let k = 0; k < perArea(42000); k++) {
    const x = rng() * W;
    const y = rng() * H;
    const p = litter(x, y) * (1 - bare.at(x, y) * 0.88);
    if (rng() > p ** 2.3 * 0.95 + 0.02) continue;
    // Needles settle a little combed by the wind, but mostly anyhow.
    const a = rng() < 0.4 ? wind(x, y) * 3 + (rng() - 0.5) * 1.2 : rng() * TAU;
    const set = fascicle(x, y, a, 6 + rng() * 7, rng);
    const depth = burn ? burnDepth(burn, x, y) : -Infinity;
    const pick = rng();
    const into = depth > 0 ? (pick < 0.72 ? charred : ashen) : depth > -26 ? (pick < 0.55 ? singed : pick < 0.85 ? dark : charred) : pick < 0.22 + age(x, y) * 0.2 ? old : pick < 0.36 ? dark : pick < 0.86 ? rust : lit;
    into.push(...set);
  }
  needleShadows(d, [...old, ...dark, ...rust, ...lit, ...singed], 0.11, 0.7, 0.7);
  needleShadows(d, [...charred, ...ashen], 0.12, 0.7, 0.7);
  strokeNeedles(d, old, NEEDLE_OLD, 0.5, 0.55);
  strokeNeedles(d, dark, NEEDLE_DARK, 0.5, 0.55);
  strokeNeedles(d, rust, NEEDLE, 0.66, 0.55);
  strokeNeedles(d, singed, '#a86a3e', 0.7, 0.55);
  strokeNeedles(d, lit, NEEDLE_LIT, 0.75, 0.5);
  strokeNeedles(d, charred, CHAR, 0.55, 0.55);
  strokeNeedles(d, ashen, ASH, 0.55, 0.5);
}

/** The Pine Barrens' ground for a level: see the module comment. */
export function paintBarrensGround(d: Draw, level: LevelDef): void {
  const rng = createRng(seedOf(level.id));
  const look = LOOKS[level.id] ?? PLAIN;
  const keeps = keepsOf(level);
  const busy = busyOf(keeps);
  const burn = burnOf(level);
  setPaintingBurn(burn);
  const litter = litterOf(level, rng);
  const bare = new Bare();
  sand(d, look, busy, rng);
  duff(d, litter, rng);
  tracks(d, level, look, burn, bare, rng);
  if (burn) scorch(d, burn, rng);
  if (burn?.firebreak) firebreak(d, burn.firebreak, 18, bare, rng);
  needles(d, litter, burn, bare, rng);
  const clear = (p: Pt, room = 6): boolean => keeps.every((k) => distTo(k, p.x, p.y) > room);
  if (burn) burntLitter(d, burn, (p) => clear(p, 4) && bare.at(p.x, p.y) < 0.3, rng);
  paintFloor(d, level, look, { busy, bare, burn, litter, clear }, rng);
  canopyShade(d, rng);
}

/** The shade of crowns overhead, out of the picture: big soft dapples over the edges of the board, none in the middle. */
function canopyShade(d: Draw, rng: Rng): void {
  const edge = edgenessOf(W, H, 0.35);
  for (let k = 0, made = 0; k < 200 && made < 9; k++) {
    const c = pt(-60 + rng() * (W + 120), -60 + rng() * (H + 120));
    if (edge(Math.max(0, Math.min(W, c.x)), Math.max(0, Math.min(H, c.y))) < 0.6) continue;
    for (let i = 0; i < 9; i++) {
      const p = pt(c.x + (rng() - 0.5) * 140, c.y + (rng() - 0.5) * 110);
      d.pen.fill(blob(p, 26 + rng() * 40, 18 + rng() * 30, rng, 0.5, 16, rng() * TAU), SHADE, 0.03);
    }
    made++;
  }
}

/** What the floor's painters are told about the board. */
export interface Board {
  readonly busy: Busy;
  readonly bare: Bare;
  readonly burn: Burn | null;
  readonly litter: Litter;
  readonly clear: (p: Pt, room?: number) => boolean;
}
