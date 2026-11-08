import { createRng, type Rng } from '../../logic/rng';
import { BOARD, type LevelDef, type SolidDef } from '../../level/types';
import { blob, edgeWash, groundWash, polar, SHADOW, wash } from '../groundKit';
import { cub, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { paintBarnFloor } from './farmBarnFloor';
import { buttercup, cartTrack, clover, daisy, earthPatch, fallenLeaf, footpath, pebble, soilBed, specks, tuft } from './farmGroundParts';
import { type Busy, busyOf, perArea, distTo, EARTH, GRASS, GRASS_DEEP, GRASS_LIT, HAY, type Keep, keepsOf, noiseOf, resample, seedOf, strokes, SWARD, SWARD_DEEP, SWARD_LIT } from './farmKit';
import { brokenRail, coopYard, cornSpill, puddle, steppingStones } from './farmYard';

/**
 * The farm's ground (chapter 1): a farmyard garden from above in summer.
 * Mown grass, calm and mid-light in the middle where the snake hunts, a
 * trodden path or a cart track crossing it, worn earth where animals stand
 * (round a trough, the hen coop's scratched yard), dug beds under the
 * cabbages and pumpkins, longer grass, tufts, daisies, clover and pebbles
 * gathering towards the edges and away from the level's things. Each level
 * lies differently (seeded from its id) and some have their own touches:
 * spilt corn by the crib, the coop's yard, a stepping-stone path, autumn
 * leaves at harvest, a barn floor at night.
 */

type TrackKind = 'cart' | 'path' | 'stones';

interface Look {
  readonly tone: string;
  readonly tracks: readonly TrackKind[];
  readonly autumn?: boolean;
  readonly stripes?: boolean;
}

const PLAIN: Look = { tone: SWARD, tracks: ['path'] };
const LOOKS: Readonly<Record<string, Look>> = {
  'farm-1': { tone: SWARD, tracks: ['cart'] },
  'farm-2': { tone: SWARD, tracks: ['path'] },
  'farm-3': { tone: '#b4c47c', tracks: ['cart'] },
  'farm-4': { tone: SWARD, tracks: ['path'] },
  'farm-5': { tone: '#bccb80', tracks: [], stripes: true },
  'farm-6': { tone: SWARD, tracks: ['path'] },
  'farm-7': { tone: '#b6c77f', tracks: ['cart'] },
  'farm-8': { tone: '#c6c47a', tracks: ['cart'], autumn: true },
  'farm-10': { tone: SWARD, tracks: ['stones'], stripes: true },
};

const W = BOARD.w;
const H = BOARD.h;

/** Bare ground laid so far (tracks, patches, beds): grass marks keep off it. */
interface Bare {
  readonly lines: { readonly pts: readonly Pt[]; readonly half: number }[];
  readonly spots: { readonly x: number; readonly y: number; readonly r: number }[];
}

function isBare(b: Bare, x: number, y: number): boolean {
  if (b.spots.some((s) => Math.hypot(s.x - x, s.y - y) < s.r)) return true;
  return b.lines.some((l) => l.pts.some((p) => Math.abs(p.x - x) < l.half && Math.abs(p.y - y) < l.half && Math.hypot(p.x - x, p.y - y) < l.half));
}

/** The paper, the sward's wash, blooms where it dried unevenly, deeper green pooled at the edges; mower stripes on a kept lawn. */
function sward(d: Draw, look: Look, busy: Busy, rng: Rng): void {
  groundWash(d, W, H, look.tone, 0.55);
  for (let k = 0; k < perArea(70); k++) {
    const p = pt(rng() * W, rng() * H);
    const b = busy(p.x, p.y);
    const colour = rng() < 0.3 ? HAY : rng() < 0.55 ? SWARD_DEEP : PAPER_FILL;
    d.pen.fill(blob(p, 50 + rng() * 90, 30 + rng() * 50, rng, 0.3, 18, rng() * TAU), colour, 0.04 + 0.08 * b);
  }
  granulate(d, rng);
  edgeWash(d, W, H, look.autumn ? '#9a9a4e' : SWARD_DEEP, 0.34, W * 0.19);
  if (look.stripes) {
    const { ctx } = d.pen;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-0.12);
    for (let x = -W; x < W; x += 92) {
      ctx.fillStyle = `rgba(255,250,240,0.07)`;
      ctx.fillRect(x, -H, 46, H * 2);
    }
    ctx.restore();
  }
}

/** The pigment settled into the paper's tooth: fine specks of deeper green and of paper all over, and a few blooms with dried edges. */
function granulate(d: Draw, rng: Rng): void {
  const at = (n: number, r0: number, r1: number): (readonly [number, number, number])[] => Array.from({ length: perArea(n) }, () => [rng() * W, rng() * H, r0 + rng() * (r1 - r0)] as const);
  specks(d, SWARD_DEEP, 0.22, at(30000, 0.3, 0.8));
  specks(d, PAPER_FILL, 0.28, at(9000, 0.3, 0.7));
  for (let k = 0; k < perArea(16); k++) {
    const p = pt(rng() * W, rng() * H);
    wash(d, blob(p, 40 + rng() * 70, 26 + rng() * 40, rng, 0.35, 24, rng() * TAU), rng() < 0.5 ? SWARD_DEEP : HAY, 0.06, 0.9);
  }
}

/** A point just off one side of the board (0 top, 1 right, 2 bottom, 3 left). */
function offEdge(side: number, rng: Rng): Pt {
  const u = 0.12 + rng() * 0.76;
  return side === 0 ? pt(W * u, -30) : side === 1 ? pt(W + 30, H * u) : side === 2 ? pt(W * u, H + 30) : pt(-30, H * u);
}

/** The track that crosses the fewest of the level's things, of a dozen tried, kept off any already laid. */
function planTrack(things: readonly Keep[], laid: readonly (readonly Pt[])[], rng: Rng): Pt[] {
  let best: Pt[] = [];
  let bestScore = Infinity;
  for (let t = 0; t < 18; t++) {
    const s0 = Math.floor(rng() * 4);
    const s1 = (s0 + 1 + Math.floor(rng() * 3)) % 4;
    const p0 = offEdge(s0, rng);
    const p1 = offEdge(s1, rng);
    const c0 = pt(W * (0.15 + rng() * 0.7), H * (0.15 + rng() * 0.7));
    const c1 = pt(W * (0.15 + rng() * 0.7), H * (0.15 + rng() * 0.7));
    const pts = resample(cub(p0, c0, c1, p1, 60), 6);
    let score = 0;
    // A track bends gently: a sharp turn rules it out.
    for (let i = 3; i + 3 < pts.length; i += 3) {
      const a0 = Math.atan2(pts[i]!.y - pts[i - 3]!.y, pts[i]!.x - pts[i - 3]!.x);
      const a1 = Math.atan2(pts[i + 3]!.y - pts[i]!.y, pts[i + 3]!.x - pts[i]!.x);
      const turn = Math.abs(Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0)));
      if (turn > 0.3) score += 40 * (turn - 0.3);
    }
    for (const p of pts) {
      for (const k of things) score += Math.max(0, 1 - distTo(k, p.x, p.y) / 40);
      for (const l of laid) if (l.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 120)) score += 0.5;
    }
    if (score < bestScore) {
      bestScore = score;
      best = pts;
    }
  }
  return best;
}

/** The level's things the ground's tracks and patches steer round (not the snake's start: a track may run under it). */
function thingsOf(level: LevelDef): Keep[] {
  return keepsOf(level).slice(0, (level.solids?.length ?? 0) + (level.cover?.length ?? 0) + (level.nests?.length ?? 0));
}

function tracks(d: Draw, level: LevelDef, look: Look, bare: Bare, rng: Rng): void {
  const laid: Pt[][] = [];
  for (const kind of look.tracks) {
    const pts = planTrack(thingsOf(level), laid, rng);
    laid.push(pts);
    if (kind === 'cart') {
      cartTrack(d, pts, 40, rng);
      bare.lines.push({ pts, half: 30 });
    } else if (kind === 'path') {
      footpath(d, pts, 15, rng);
      bare.lines.push({ pts, half: 19 });
    } else {
      steppingStones(d, pts, rng);
      bare.lines.push({ pts, half: 26 });
    }
  }
}

/** Worn earth: mud round each trough, a gateway at the end of a fence, the hen coop's yard, a dug bed under each cabbage and pumpkin patch. */
function patches(d: Draw, level: LevelDef, bare: Bare, rng: Rng): void {
  const solids = level.solids ?? [];
  for (const s of solids) {
    if (s.look !== 'trough' || s.kind !== 'rect') continue;
    const c = pt(s.x + s.w / 2, s.y + s.h / 2);
    earthPatch(d, c, s.w / 2 + 46, s.h / 2 + 40, rng, mix(EARTH, '#8a6a48', 0.35), (rng() - 0.5) * 0.2);
    puddle(d, pt(c.x + s.w * 0.3, c.y + s.h / 2 + 20), 18, rng);
    bare.spots.push({ x: c.x, y: c.y, r: s.w / 2 + 40 });
  }
  const coop = solids.find((s) => s.look === 'coop');
  if (coop && coop.kind === 'rect') {
    const area = coopYard(d, coop, level.nests ?? [], rng);
    bare.spots.push(...area);
  }
  for (const s of solids) if (s.look === 'crib' && s.kind === 'rect') cornSpill(d, s, rng);
  for (const c of level.cover ?? []) {
    if (c.look !== 'cabbage' && c.look !== 'pumpkin') continue;
    soilBed(d, pt(c.x, c.y), c.r, rng);
    bare.spots.push({ x: c.x, y: c.y, r: c.r * 1.3 });
  }
}

/** Fence posts in a row: a strip of uncut grass along the line (the mower can't get in) and an old rail lying in it. */
function fenceLines(d: Draw, level: LevelDef, rng: Rng): void {
  const posts = (level.solids ?? []).filter((s): s is Extract<SolidDef, { kind: 'circle' }> => s.look === 'post' && s.kind === 'circle');
  const rows = new Map<number, Pt[]>();
  for (const p of posts) rows.set(p.y, [...(rows.get(p.y) ?? []), pt(p.x, p.y)]);
  for (const row of rows.values()) {
    if (row.length < 2) continue;
    const xs = row.map((p) => p.x);
    const [x0, x1] = [Math.min(...xs) - 24, Math.max(...xs) + 24];
    const y = row[0]!.y;
    const len = x1 - x0;
    for (const [colour, alpha, wd] of [[GRASS_DEEP, 0.5, 1.1], [GRASS, 0.55, 0.9], [GRASS_LIT, 0.5, 0.75]] as const) {
      strokes(d, colour, alpha, wd, Math.round(len * 1.2), () => {
        const x = x0 + rng() * len;
        const t = (rng() - 0.5) * 2;
        const near = Math.min(...row.map((p) => Math.abs(p.x - x)));
        if (Math.abs(t) > 0.5 + 0.5 * Math.max(0, 1 - near / 30) && rng() < 0.6) return null;
        return [x, y + t * 16, -Math.PI / 2 + (rng() - 0.5) * 2.6, 5 + rng() * (near < 20 ? 12 : 8), (rng() - 0.5) * 3];
      });
    }
    brokenRail(d, pt(x0 + len * (0.3 + rng() * 0.4), y + 26 + rng() * 6), Math.min(90, len * 0.4), (rng() - 0.5) * 0.25, rng);
  }
}

/** Blades round the foot of every solid thing, where the mower missed. */
function footFringe(d: Draw, level: LevelDef, bare: Bare, rng: Rng): void {
  const roots: [Pt, number][] = [];
  for (const s of level.solids ?? []) {
    if (s.look === 'coop') continue;
    if (s.kind === 'circle') {
      const n = Math.round(s.r * 1.6);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU + rng() * 0.2;
        roots.push([polar(s, a, s.r - 1), a]);
      }
    } else {
      for (let x = s.x; x < s.x + s.w; x += 4) roots.push([pt(x, s.y + 1), -Math.PI / 2], [pt(x, s.y + s.h - 1), Math.PI / 2]);
      for (let y = s.y; y < s.y + s.h; y += 4) roots.push([pt(s.x + 1, y), Math.PI], [pt(s.x + s.w - 1, y), 0]);
    }
  }
  for (const [colour, alpha, wd] of [[GRASS_DEEP, 0.65, 1.1], [GRASS, 0.7, 0.9], [GRASS_LIT, 0.55, 0.7]] as const) {
    let i = 0;
    strokes(d, colour, alpha, wd, roots.length, () => {
      const [p, a] = roots[i++]!;
      if (rng() < 0.3 || isBare(bare, p.x, p.y)) return null;
      return [p.x, p.y, a + (rng() - 0.5) * 1.4, 3 + rng() * 7, (rng() - 0.5) * 2];
    });
  }
}

/** The turf: short flecks of blade all over, sparse and pale in the middle, longer, darker uncut grass towards the edges. */
function turf(d: Draw, look: Look, busy: Busy, bare: Bare, rng: Rng): void {
  const short = (): readonly [number, number, number, number, number] | null => {
    const x = rng() * W;
    const y = rng() * H;
    if (rng() > 0.35 + busy(x, y) || isBare(bare, x, y)) return null;
    return [x, y, rng() * TAU, 1.5 + rng() * 2.5, (rng() - 0.5) * 0.8];
  };
  strokes(d, SWARD_DEEP, 0.32, 0.65, perArea(5200), short);
  strokes(d, '#a9bf6c', 0.38, 0.6, perArea(4200), short);
  strokes(d, SWARD_LIT, 0.4, 0.6, perArea(3000), short);
  const wind = noiseOf(rng, 220);
  const passes: readonly (readonly [string, number, number, number])[] = [
    [GRASS_DEEP, 0.4, 1.1, 1.4],
    [look.autumn ? '#9a9a4e' : GRASS, 0.5, 0.9, 0],
    [look.autumn ? HAY : '#88a94f', 0.45, 0.8, 0],
    [GRASS_LIT, 0.5, 0.7, -0.6],
  ];
  for (const [colour, alpha, width, shift] of passes) {
    strokes(d, colour, alpha, width, perArea(3600), () => {
      const x = rng() * W;
      const y = rng() * H;
      const t = busy(x, y);
      if (rng() > (t - 0.25) * 1.3 || isBare(bare, x, y)) return null;
      return [x + SHADOW.x * shift, y + SHADOW.y * shift, -2.2 + wind(x, y) * 1.1 + (rng() - 0.5) * 0.8, 5 + 12 * t + rng() * 5, (rng() - 0.5) * 4];
    });
  }
}

/** Tufts, drifts of daisies, clover and buttercups, pebbles; thick at the edges, a stray flower or two in the open. */
function scatter(d: Draw, look: Look, busy: Busy, bare: Bare, rng: Rng): void {
  const ok = (p: Pt, min: number): boolean => busy(p.x, p.y) > min && !isBare(bare, p.x, p.y);
  for (let k = 0, made = 0; k < 400 && made < perArea(46); k++) {
    const p = pt(rng() * W, rng() * H);
    if (!ok(p, 0.35 + rng() * 0.3)) continue;
    tuft(d, p, 9 + rng() * 9, rng);
    made++;
  }
  const flowers = [daisy, clover, clover, buttercup, daisy] as const;
  for (let k = 0, made = 0; k < 300 && made < perArea(22); k++) {
    const c = pt(rng() * W, rng() * H);
    if (!ok(c, 0.3 + rng() * 0.3)) continue;
    const kind = flowers[Math.floor(rng() * flowers.length)]!;
    const n = 3 + Math.floor(rng() * 8);
    for (let i = 0; i < n; i++) {
      const p = polar(c, rng() * TAU, Math.sqrt(rng()) * 34);
      if (ok(p, 0.15)) kind(d, p, kind === clover ? 3.2 + rng() : 3 + rng() * 1.4, rng);
    }
    made++;
  }
  for (let k = 0, made = 0; k < 200 && made < perArea(6); k++) {
    const p = pt(rng() * W, rng() * H);
    if (!ok(p, 0.08) || busy(p.x, p.y) > 0.3) continue;
    (rng() < 0.5 ? daisy : clover)(d, p, 3, rng);
    made++;
  }
  for (let k = 0, made = 0; k < 200 && made < perArea(10); k++) {
    const c = pt(rng() * W, rng() * H);
    if (!ok(c, 0.4)) continue;
    for (let i = 0; i < 2 + rng() * 5; i++) pebble(d, polar(c, rng() * TAU, rng() * 16), 1.6 + rng() * 2.6, rng);
    made++;
  }
  if (look.autumn) {
    for (let k = 0; k < perArea(900); k++) {
      const p = pt(rng() * W, rng() * H);
      if (rng() > busy(p.x, p.y) ** 1.5 || isBare(bare, p.x, p.y)) continue;
      fallenLeaf(d, p, 6 + rng() * 5, rng);
    }
  }
}

/** The farm's ground for a level: see the module comment. */
export function paintFarmGround(d: Draw, level: LevelDef): void {
  if (level.id === 'farm-9') {
    paintBarnFloor(d, level);
    return;
  }
  const rng = createRng(seedOf(level.id));
  const look = LOOKS[level.id] ?? PLAIN;
  const busy = busyOf(keepsOf(level));
  const bare: Bare = { lines: [], spots: [] };
  sward(d, look, busy, rng);
  tracks(d, level, look, bare, rng);
  patches(d, level, bare, rng);
  turf(d, look, busy, bare, rng);
  fenceLines(d, level, rng);
  footFringe(d, level, bare, rng);
  scatter(d, look, busy, bare, rng);
}
