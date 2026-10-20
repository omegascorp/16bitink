import { createRng, type Rng } from '../../logic/rng';
import { MAP, type MapRegion } from '../../scenes/map/layout';
import { bezier, type Draw, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import { type Feature, type Geo, hash, seedOf } from './common';
import { kingcups, koi, lilyPad, reeds, ripple, shrub, steppingStone } from './flora';

/**
 * Chapter 2's band, "The Pond": the plan of the pond (geometry only; the
 * painting is in pondPaint). Water fills the band either side of a strip
 * of bank the groove's path runs along; twice the water cuts across the
 * strip, and the path crosses on a little wooden bridge. A small island
 * with stepping stones sits out in the widest water.
 */
/** How far the water's edge keeps from the groove. */
const BANK = 100;
/** Half the height of a channel across the path. */
const CHANNEL = 30;
const STEP_Y = 8;

export interface Channel {
  readonly y: number;
  readonly h: number;
}

export interface PondPlan {
  readonly region: MapRegion;
  /** The outer shores: the water's foot and head at x. */
  shoreLow(x: number): number;
  shoreHigh(x: number): number;
  /** The water's outline (both shores, past the page's edges). */
  readonly outer: readonly Pt[];
  /** Dry land inside it: the path's strip in pieces, and the island. */
  readonly lands: readonly (readonly Pt[])[];
  readonly channels: readonly Channel[];
  /** Path index ranges carried by bridges. */
  readonly bridges: readonly (readonly [number, number])[];
  inWater(x: number, y: number): boolean;
  /** On the path's strip of bank or the island. */
  onLand(x: number, y: number): boolean;
  /** Between the outer shores (water or the land inside it). */
  withinShores(x: number, y: number): boolean;
  /** In the water (lily pads, fish) and on the banks (reeds, kingcups). */
  readonly water: readonly Feature[];
  readonly banks: readonly Feature[];
}

/** A running mean, twice: rounds the corners a windowed min or max leaves. */
function soften(v: readonly number[], k = 5): number[] {
  const pass = (a: readonly number[]): number[] =>
    a.map((_, i) => {
      const part = a.slice(Math.max(0, i - k), i + k + 1);
      return part.reduce((s, x) => s + x, 0) / part.length;
    });
  return pass(pass(v));
}

interface Piece {
  readonly top: number;
  readonly bottom: number;
}

export function pondPlan(geo: Geo, region: MapRegion): PondPlan {
  const salt = 8000 + region.index * 101;
  const ph = [1, 2, 3, 4, 5, 6].map((k) => hash(salt, k) * TAU);
  const low = region.gate.y - 80;
  const high = region.top + 150;
  const shoreLow = (x: number): number => low + Math.sin(x / 130 + ph[0]!) * 14 + Math.sin(x / 47 + ph[1]!) * 6;
  const shoreHigh = (x: number): number => high + Math.sin(x / 150 + ph[2]!) * 18 + Math.sin(x / 53 + ph[3]!) * 7;
  // The strip of bank: as wide as the groove's swing nearby, plus BANK.
  const y0 = high - 120;
  const y1 = low + 120;
  const n = Math.ceil((y1 - y0) / STEP_Y) + 1;
  const gx = Array.from({ length: n }, (_, i) => geo.grooveX(y0 + i * STEP_Y));
  const reach = Array.from({ length: n }, (_, i) => BANK + Math.sin((y0 + i * STEP_Y) / 90 + ph[4]!) * 12 + Math.sin((y0 + i * STEP_Y) / 37 + ph[5]!) * 5);
  const win = 8;
  const lo = soften(gx.map((_, i) => Math.min(...gx.slice(Math.max(0, i - win), i + win + 1)) - reach[i]!));
  const hi = soften(gx.map((_, i) => Math.max(...gx.slice(Math.max(0, i - win), i + win + 1)) + reach[i]!));
  const sample = (arr: readonly number[], y: number): number => {
    const t = Math.max(0, Math.min(n - 1, (y - y0) / STEP_Y));
    const i = Math.floor(t);
    const j = Math.min(n - 1, i + 1);
    return arr[i]! + (arr[j]! - arr[i]!) * (t - i);
  };
  const xL = (y: number): number => sample(lo, y);
  const xR = (y: number): number => sample(hi, y);
  // Channels between the 3rd and 4th levels and the 7th and 8th.
  const nodes = geo.layout.nodes.filter((nd) => nd.region === region.index);
  const channels: Channel[] = [[2, 3], [6, 7]].flatMap(([a, b]) => (nodes[a!] && nodes[b!] ? [{ y: (nodes[a!]!.y + nodes[b!]!.y) / 2, h: CHANNEL }] : []));
  const cuts = [y1, ...channels.flatMap((c) => [c.y + c.h, c.y - c.h]), y0];
  const pieces: Piece[] = [];
  for (let i = 0; i + 1 < cuts.length; i += 2) pieces.push({ bottom: cuts[i]!, top: cuts[i + 1]! });
  const bankEnd = (y: number, dir: 1 | -1, open: boolean): Pt[] => {
    const a = pt(xL(y), y);
    const b = pt(xR(y), y);
    if (open) return [a, b];
    return bezier(a, pt((a.x + b.x) / 2, y + dir * 16), b, 10);
  };
  const strip = pieces.map((p) => {
    const left: Pt[] = [];
    for (let y = p.bottom; y > p.top; y -= STEP_Y) left.push(pt(xL(y), y));
    const right: Pt[] = [];
    for (let y = p.top; y < p.bottom; y += STEP_Y) right.push(pt(xR(y), y));
    const topEnd = bankEnd(p.top, -1, p.top === y0);
    const botEnd = bankEnd(p.bottom, 1, p.bottom === y1).reverse();
    return [...left, ...topEnd, ...right, ...botEnd];
  });
  const outer: Pt[] = [];
  for (let x = -60; x <= MAP.width + 60; x += 12) outer.push(pt(x, shoreLow(x)));
  for (let x = MAP.width + 60; x >= -60; x -= 12) outer.push(pt(x, shoreHigh(x)));
  // The island: out in the widest water, halfway up.
  const iy = (low + high) / 2 + 60;
  const leftWide = xL(iy) > MAP.width - xR(iy);
  const ix = leftWide ? xL(iy) * 0.45 : xR(iy) + (MAP.width - xR(iy)) * 0.55;
  const island: Pt[] = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * TAU;
    const r = 62 + Math.sin(a * 3 + ph[0]!) * 8 + Math.sin(a * 5 + ph[2]!) * 4;
    return pt(ix + Math.cos(a) * r * 1.2, iy + Math.sin(a) * r * 0.8);
  });
  const onStrip = (x: number, y: number): boolean => pieces.some((p) => y >= p.top && y <= p.bottom && x > xL(y) && x < xR(y));
  const onIsland = (x: number, y: number): boolean => ((x - ix) / 74) ** 2 + ((y - iy) / 50) ** 2 < 1;
  const withinShores = (x: number, y: number): boolean => y > shoreHigh(x) && y < shoreLow(x);
  const onLand = (x: number, y: number): boolean => onStrip(x, y) || onIsland(x, y);
  const inWater = (x: number, y: number): boolean => withinShores(x, y) && !onLand(x, y);
  const bridges = channels.map((c) => [geo.index(c.y + c.h + 24), geo.index(c.y - c.h - 24)] as const);
  const plan = { region, shoreLow, shoreHigh, outer, lands: [...strip, island], channels, bridges, inWater, onLand, withinShores };
  return { ...plan, ...pondThings(geo, plan, { x: ix, y: iy, leftWide }, salt) };
}

type Shape = Pick<PondPlan, 'region' | 'shoreLow' | 'shoreHigh' | 'channels' | 'inWater' | 'lands' | 'onLand'>;

function pondThings(geo: Geo, plan: Shape, isle: { x: number; y: number; leftWide: boolean }, salt: number): Pick<PondPlan, 'water' | 'banks'> {
  const rng = createRng(seedOf(salt, 9));
  const water: Feature[] = [];
  const banks: Feature[] = [];
  const add = (list: Feature[], p: Pt, r: number, draw: (d: Draw, rng: Rng) => void): void => {
    const seed = seedOf(salt, list === water ? 1 : 2, list.length);
    list.push({ y: p.y, r, seed, draw: (d) => draw(d, createRng(seed)) });
  };
  const { region } = plan;
  const yLo = region.gate.y - 60;
  const yHi = region.top + 140;
  const tries = (n: number, ok: (x: number, y: number) => boolean): Pt[] => {
    const out: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const p = pt(rng() * MAP.width, yHi + rng() * (yLo - yHi));
      if (ok(p.x, p.y)) out.push(p);
    }
    return out;
  };
  const wet = (x: number, y: number, r: number): boolean => plan.inWater(x, y) && plan.inWater(x - r, y) && plan.inWater(x + r, y) && plan.inWater(x, y - r) && plan.inWater(x, y + r);
  const nearShore = (x: number, y: number): boolean => !plan.inWater(x, y) && (plan.inWater(x - 22, y) || plan.inWater(x + 22, y) || plan.inWater(x, y - 22) || plan.inWater(x, y + 22));
  // Lily pads in rafts, out of the calm; a fish or two; rings where they rose.
  for (const p of tries(70, (x, y) => wet(x, y, 40) && geo.busy(x, y) > 0.45)) {
    const count = 3 + Math.floor(rng() * 4);
    add(water, p, 70, (d, r) => {
      for (let k = 0; k < count; k++) {
        const c = pt(p.x + (r() - 0.5) * 80, p.y + (r() - 0.5) * 46);
        if (!plan.inWater(c.x, c.y)) continue;
        lilyPad(d, c, 11 + r() * 9, r() * TAU, r, r() < 0.3 ? (r() < 0.5 ? '#e7a3b5' : '#f2efe6') : null);
      }
    });
  }
  for (const p of tries(20, (x, y) => wet(x, y, 40) && geo.busy(x, y) > 0.3).slice(0, 5)) add(water, p, 30, (d, r) => koi(d, p, 30 + r() * 12, r() * TAU, r));
  for (const p of tries(20, (x, y) => wet(x, y, 30) && geo.busy(x, y) > 0.2).slice(0, 6)) add(water, p, 30, (d, r) => ripple(d, p, 14 + r() * 10, r));
  // Stepping stones from the island down to the near shore.
  const from = pt(isle.x + (isle.leftWide ? 30 : -30), isle.y + 50);
  const to = pt(isle.x + (isle.leftWide ? 60 : -60), plan.shoreLow(isle.x) + 6);
  for (let k = 1; k <= 5; k++) {
    const t = k / 6;
    const c = pt(from.x + (to.x - from.x) * t + (rng() - 0.5) * 14, from.y + (to.y - from.y) * t);
    if (plan.inWater(c.x, c.y)) add(water, c, 20, (d, r) => steppingStone(d, c, 11 + r() * 4, r));
  }
  add(banks, pt(isle.x + 14, isle.y - 4), 60, (d, r) => shrub(d, pt(isle.x + 14, isle.y - 4), 30, r, '#f2efe6'));
  add(banks, pt(isle.x - 34, isle.y + 14), 40, (d, r) => kingcups(d, pt(isle.x - 34, isle.y + 14), r));
  // Reeds in stands along both outer shores, thinning towards the path; kingcups between them.
  const stand = (x: number, y: number): void => {
    const p = pt(x, y);
    add(banks, p, 80, (d, r) => {
      const n = 1 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) reeds(d, pt(p.x + (k - (n - 1) / 2) * 22 + (r() - 0.5) * 8, p.y + (r() - 0.5) * 8), 24 + r() * 14, r);
    });
  };
  for (const [shore, dy] of [[plan.shoreLow, 5], [plan.shoreHigh, -3]] as const) {
    for (let x = 20 + rng() * 40; x < MAP.width; x += 60 + rng() * 110) {
      const y = shore(x) + dy;
      if (plan.onLand(x, y - dy * 4) || geo.busy(x, y) < 0.45) continue;
      if (rng() < 0.7) stand(x, y);
      else add(banks, pt(x, y), 30, (d, r) => kingcups(d, pt(x, y + 6), r));
    }
  }
  for (const p of tries(90, (x, y) => nearShore(x, y) && geo.busy(x, y) > 0.5)) add(banks, p, 30, (d, r) => kingcups(d, p, r));
  // Either side of the arch, a stand of reeds, as if the arch were set in them.
  for (const side of [-1, 1]) stand(region.gate.x + side * 100, region.gate.y + 16);
  stand(region.gate.x - 160, region.gate.y + 30);
  return { water, banks };
}
