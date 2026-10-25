import { createRng, type Rng } from '../../logic/rng';
import type { LevelDef, SolidDef } from '../../level/types';
import { blob, edgeWash, groundWash, polar, softBand, wash } from '../groundKit';
import { type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { type Busy, busyOf, distTo, keepsOf, perArea, seedOf } from '../places/farmKit';
import { mix } from '../wash';
import { Bare, planTrack } from './barrensPlaceTracks';
import { paintShortGrass, paintTallGrass, swardOf, type Tall, tallOf } from './savannaPlaceGrass';
import {
  DUST, dots, EARTH, EARTH_DEEP, EARTH_PALE, EARTH_RED, H, setPaintingNests, SHADE, W,
} from './savannaPlaceKit';
import { acaciaLitter } from './savannaPlaceLitter';

/**
 * The Savanna's ground (chapter 4), seen from above in the dry season: red
 * laterite earth washed pale by the sun, blooms where the wash dried
 * unevenly, grit and quartz, a few cracked crusts, a game trail worn bare
 * by hooves, short straw-dry grass in tufts (thick at the edges, thin where
 * the snake hunts), the tall grass zones as stands of rusty red oat grass,
 * and under each acacia the dappled shade of its crown with its fallen
 * leaflets, coiled pods and thorns (savannaPlaceLitter.ts). Each level lies
 * differently (seeded from its id).
 */

type Circle = Extract<SolidDef, { kind: 'circle' }>;

/** The paper, the earth's wash, blooms where it dried unevenly, its grit, umber pooled at the edges. */
function earth(d: Draw, busy: Busy, rng: Rng): void {
  groundWash(d, W, H, EARTH, 0.62);
  for (let k = 0; k < perArea(90); k++) {
    const p = pt(rng() * W, rng() * H);
    const colour = rng() < 0.4 ? EARTH_RED : rng() < 0.6 ? DUST : PAPER_FILL;
    d.pen.fill(blob(p, 40 + rng() * 100, 26 + rng() * 54, rng, 0.34, 18, rng() * TAU), colour, 0.07 + 0.07 * busy(p.x, p.y));
  }
  for (let k = 0; k < perArea(20); k++) {
    const p = pt(rng() * W, rng() * H);
    wash(d, blob(p, 34 + rng() * 70, 22 + rng() * 40, rng, 0.36, 24, rng() * TAU), rng() < 0.6 ? EARTH_RED : EARTH_DEEP, 0.07, 0.9);
  }
  const at = (n: number, r0: number, r1: number): (readonly [number, number, number])[] => Array.from({ length: perArea(n) }, () => [rng() * W, rng() * H, r0 + rng() * (r1 - r0)] as const);
  dots(d, EARTH_DEEP, 0.32, at(26000, 0.3, 0.75));
  dots(d, '#6e4a36', 0.25, at(5000, 0.3, 0.65));
  dots(d, PAPER_FILL, 0.55, at(12000, 0.3, 0.7));
  edgeWash(d, W, H, '#8a5236', 0.3, W * 0.2);
}

/** A cracked crust where a puddle dried: a paler sunk patch, its polygons of cracks in fine line, curled edges catching the light. */
function crust(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const shape = blob(c, r, r * (0.6 + rng() * 0.3), rng, 0.25, 22, rng() * TAU);
  pen.fill(shape, EARTH_PALE, 0.35);
  pen.clipped(shape, () => {
    // A jittered grid of cells, each cell's edges drawn as cracks.
    const cell = 6 + rng() * 3;
    const ptAt = new Map<string, Pt>();
    const node = (i: number, j: number): Pt => {
      const key = `${i},${j}`;
      let p = ptAt.get(key);
      if (!p) {
        p = pt(c.x + i * cell + (rng() - 0.5) * cell * 0.7, c.y + j * cell + (rng() - 0.5) * cell * 0.7);
        ptAt.set(key, p);
      }
      return p;
    };
    const n = Math.ceil(r / cell) + 1;
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        const a = node(i, j);
        pen.hair([a, node(i + 1, j)], 0.45, EARTH_DEEP, 0.55);
        pen.hair([a, node(i, j + 1)], 0.45, EARTH_DEEP, 0.55);
        pen.hair([pt(a.x - 0.6, a.y - 0.8), pt(node(i + 1, j).x - 0.6, node(i + 1, j).y - 0.8)], 0.35, PAPER_FILL, 0.35);
      }
    }
  });
  pen.hair([...shape, shape[0]!].slice(0, 14), 0.5, d.ink, 0.25);
}

/** The game trail: a band of trodden earth, paler and smoother, dust drifted along it, cloven hoofprints in pairs. */
function trail(d: Draw, pts: readonly Pt[], bare: Bare, rng: Rng): void {
  softBand(d, pts, 22, EARTH_PALE, 0.55);
  softBand(d, pts, 12, DUST, 0.35);
  bare.line(pts, 13);
  for (let i = 2; i < pts.length - 2; i++) {
    if (rng() > 0.55) continue;
    const p = pts[i]!;
    const q = pts[i + 1]!;
    const a = Math.atan2(q.y - p.y, q.x - p.x) + (rng() < 0.5 ? 0 : Math.PI);
    const at = polar(p, a + Math.PI / 2, (rng() - 0.5) * 12);
    hoof(d, at, a + (rng() - 0.5) * 0.4, 1.8 + rng() * 0.6);
  }
}

/** A cloven hoofprint: two half-moons pressed into the dust, their far walls shaded. */
function hoof(d: Draw, p: Pt, a: number, s: number): void {
  const { pen } = d;
  for (const side of [-1, 1]) {
    const c = polar(p, a + Math.PI / 2, side * s * 0.55);
    const half = Array.from({ length: 9 }, (_, i) => {
      const t = (i / 8) * Math.PI;
      return polar(c, a + Math.PI / 2 * side + t * -side, s * (i === 0 || i === 8 ? 0.45 : 1));
    });
    pen.fill(half.map((q) => polar(q, a, s * 0.4)), EARTH_DEEP, 0.28);
    pen.fill(half, mix(EARTH_DEEP, SHADE, 0.3), 0.2);
  }
}

/** Pebbles and small stones out at the edges: quartz white, ironstone dark. */
function stones(d: Draw, busy: Busy, clear: (p: Pt) => boolean, rng: Rng): void {
  const { pen } = d;
  for (let k = 0; k < perArea(220); k++) {
    const p = pt(rng() * W, rng() * H);
    if (rng() > busy(p.x, p.y) || !clear(p)) continue;
    const r = 1.4 + rng() * 2.6;
    const s = blob(p, r, r * (0.6 + rng() * 0.3), rng, 0.25, 10, rng() * TAU);
    const tone = rng() < 0.45 ? '#ece4d4' : rng() < 0.6 ? '#7a5a46' : '#b49a82';
    pen.fill(s.map((q) => pt(q.x + 0.9, q.y + 1.3)), SHADE, 0.25);
    pen.fill(s, tone, 0.92);
    pen.crescent(s, pt(-0.8, -1), () => pen.fill(s, SHADE, 0.25));
    pen.hair([...s, s[0]!], 0.35, d.ink, 0.4);
  }
}

/** The shade of each acacia's flat crown overhead: dappled, broad, cast a little down-right of the trunk. */
function crownShade(d: Draw, acacias: readonly Circle[], rng: Rng): void {
  for (const s of acacias) {
    const c = pt(s.x + 24, s.y + 32);
    // The umbrella's whole shadow, soft, then the dapple of its layered foliage over it.
    d.pen.fill(blob(c, 92, 80, rng, 0.22, 30, rng() * TAU), SHADE, 0.07);
    d.pen.fill(blob(c, 76, 64, rng, 0.3, 26, rng() * TAU), SHADE, 0.05);
    for (let i = 0; i < 40; i++) {
      const p = polar(c, rng() * TAU, Math.sqrt(rng()) * 80);
      d.pen.fill(blob(p, 10 + rng() * 22, 7 + rng() * 14, rng, 0.55, 14, rng() * TAU), SHADE, 0.05);
    }
    // Sun flecks through the crown.
    for (let i = 0; i < 26; i++) {
      const p = polar(c, rng() * TAU, Math.sqrt(rng()) * 72);
      d.pen.fill(blob(p, 2.5 + rng() * 5, 1.8 + rng() * 3, rng, 0.4, 10, rng() * TAU), DUST, 0.22);
    }
  }
}

/** The Savanna's ground for a level: see the module comment. */
export function paintSavannaGround(d: Draw, level: LevelDef): void {
  const rng = createRng(seedOf(level.id));
  const keeps = keepsOf(level);
  const busy = busyOf(keeps);
  const clear = (p: Pt, room = 6): boolean => keeps.every((k) => distTo(k, p.x, p.y) > room);
  const tall: Tall = tallOf(level.zones ?? [], rng);
  const acacias = (level.solids ?? []).filter((s): s is Circle => s.kind === 'circle' && s.look === 'acacia');
  setPaintingNests(level.nests ?? [], acacias);
  const bare = new Bare();
  earth(d, busy, rng);
  for (let k = 0, made = 0; k < 40 && made < 2 + Math.floor(rng() * 2); k++) {
    const p = pt(60 + rng() * (W - 120), 50 + rng() * (H - 100));
    const r = 18 + rng() * 22;
    if (!clear(p, r + 10) || [0, 1, 2, 3, 4].some((i) => tall(p.x + Math.cos(i * 1.6) * r * 1.6 * Math.min(1, i), p.y + Math.sin(i * 1.6) * r * 1.6 * Math.min(1, i)) > 0)) continue;
    crust(d, p, r, rng);
    bare.spot(p, r);
    made++;
  }
  const things = keeps.slice(0, (level.solids?.length ?? 0) + (level.nests?.length ?? 0));
  trail(d, planTrack(things, (p) => tall(p.x, p.y) * 1.5, rng), bare, rng);
  // Bare, scuffed earth round each trunk, where animals stand in the shade.
  for (const s of acacias) bare.spot(pt(s.x + 6, s.y + 8), s.r + 26);
  paintShortGrass(d, swardOf(busy, tall, (x, y) => bare.at(x, y), rng), rng);
  paintTallGrass(d, level.zones ?? [], tall, rng);
  stones(d, busy, clear, rng);
  crownShade(d, acacias, rng);
  for (const s of acacias) acaciaLitter(d, pt(s.x, s.y), s.r, clear, rng);
}
