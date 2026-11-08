import type { Rng } from '../../logic/rng';
import type { Place } from '../../level/types';
import { MAP } from '../../scenes/map/layout';
import { closed, oval, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { blob, boxPts, type Brush, polar } from './brush';
import { footGrass, OAK, post, postAndRail, reachOf, ruled, runs, sandFence, splitRail, stoneWall, thornBoma } from './fences';
import { block, boulder, cairn } from './rocks';
import { creek, type WaterLook } from './water';

/**
 * Each chapter's threshold across the trail at its gate: the farm's
 * five-bar gate in a post-and-rail fence, the pine barrens' split-rail
 * fence, a sand fence on the dunes, a cattle grid through a thorn boma on
 * the savanna, a rope bridge over a creek in the rainforest, a boardwalk
 * over the reef's channel, cairns in the mountains, a ladder stile over the
 * heath's dry-stone wall, a ruined temple gateway in the jungle, and a log
 * bridge in the flooded forest. `under` lies flat (water), `over` stands.
 */
export interface Threshold {
  readonly under?: (b: Brush, gate: Pt, rng: Rng) => void;
  readonly over: (b: Brush, gate: Pt, rng: Rng) => void;
}

const OPEN = 46;
const CREEK: WaterLook = { shallow: '#8fb7a5', deep: '#3f6f68', bank: '#6a5a40' };
const CHANNEL: WaterLook = { shallow: '#8fd0d0', deep: '#2f8aa0', bank: '#e6d6a8' };
const BLACKWATER: WaterLook = { shallow: '#8a9a7a', deep: '#3a4a3a', bank: '#6a5a3a' };

/** A five-bar field gate, drawn from the front and swung open against the fence. */
function fieldGate(b: Brush, x0: number, x1: number, base: number, h: number, colour: string): void {
  const bars: Pt[][] = [];
  for (let k = 0; k < 5; k++) bars.push([pt(x0, base - 4 - (k * (h - 8)) / 4), pt(x1, base - 4 - (k * (h - 8)) / 4)]);
  bars.push([pt(x1 - 4, base - 4), pt(x0 + 4, base - h + 4)]);
  for (const bar of bars) b.stroke(bar.map((p) => pt(p.x + 8, p.y + 8)), 3, 0.1, b.d.ink);
  for (const bar of bars) {
    b.stroke(bar, 5, 0.95, mix(colour, b.d.ink, 0.5));
    if (!b.draft) b.pen.hair(bar.map((p) => pt(p.x, p.y - 0.8)), 2.6, colour, 0.95);
  }
  for (const x of [x0, x1]) {
    const stile = boxPts(x - 3, base - h - 2, x + 3, base + 1, 6);
    b.body(stile, colour, 0.8);
    b.edge(stile, 0.7, 0.85);
  }
}

const farm: Threshold = {
  over: (b, g, rng) => {
    const foot = g.y + 14;
    postAndRail(b, g.x, OPEN + 12, foot, rng);
    post(b, g.x - OPEN - 6, foot + 2, 16, 56, '#7a5a3a');
    post(b, g.x + OPEN + 6, foot + 2, 16, 56, '#7a5a3a');
    fieldGate(b, g.x - OPEN - 14 - 2 * OPEN - 10, g.x - OPEN - 14, foot + 10, 44, '#a88a5e');
  },
};

const barrens: Threshold = {
  over: (b, g, rng) => {
    const foot = g.y + 12;
    splitRail(b, g.x, OPEN + 6, foot, rng);
    for (const s of [-1, 1]) post(b, g.x + s * (OPEN + 2), foot + 4, 9, 46, '#8a7a62');
  },
};

const dunes: Threshold = {
  over: (b, g, rng) => {
    const foot = g.y + 12;
    sandFence(b, g.x, OPEN + 4, foot, rng);
    for (const s of [-1, 1]) post(b, g.x + s * (OPEN + 2), foot + 2, 9, 40, '#8a7a62');
  },
};

const savanna: Threshold = {
  under: (b, g) => {
    // The cattle grid: a pit across the trail, steel rails over it.
    const pit = boxPts(g.x - OPEN, g.y - 18, g.x + OPEN, g.y + 18, 10);
    b.body(pit, '#3a3028', 0.55);
    b.hatch(pit, 2.4, 0.9, 0.35);
    for (let y = g.y - 15; y <= g.y + 15; y += 6) {
      b.stroke([pt(g.x - OPEN - 4, y), pt(g.x + OPEN + 4, y)], 2.6, 0.9, '#6a6e72');
      b.glint([pt(g.x - OPEN, y - 0.8), pt(g.x + OPEN, y - 0.8)], 0.8, 0.6);
    }
    b.edge(pit, 1, 0.85);
  },
  over: (b, g, rng) => {
    const foot = g.y + 10;
    thornBoma(b, g.x, OPEN + 14, foot, rng);
    for (const s of [-1, 1]) post(b, g.x + s * (OPEN + 8), foot + 2, 12, 40, '#7a6a52');
  },
};

/** A rope bridge along the trail over a creek: slatted planks between two sagging hand ropes on posts. */
function ropeBridge(b: Brush, g: Pt, len: number, rng: Rng, plank = '#a8875e'): void {
  const y0 = g.y + len / 2;
  const y1 = g.y - len / 2;
  const half = 21;
  b.cast(boxPts(g.x - half, y1, g.x + half, y0, 10), 12, 0.14);
  for (let y = y0; y > y1; y -= 7) {
    const p = boxPts(g.x - half + (rng() - 0.5) * 2, y - 5.5, g.x + half + (rng() - 0.5) * 2, y, 8);
    b.body(p, mix(plank, '#d8c090', rng() * 0.4), 0.75);
    b.line(closed(p), 0.45, 0.75);
  }
  for (const s of [-1, 1]) {
    const x = g.x + s * (half + 4);
    const rope = Array.from({ length: 13 }, (_, i) => pt(x + s * Math.sin((Math.PI * i) / 12) * 5, y0 - ((y0 - y1) * i) / 12));
    b.stroke(rope.map((p) => pt(p.x + 8, p.y + 10)), 1.4, 0.12, b.d.ink);
    b.stroke(rope, 1.6, 0.85, '#8a6a3a');
    for (let i = 1; i < 12; i++) b.line([rope[i]!, pt(g.x + s * half, rope[i]!.y)], 0.4, 0.55);
    for (const y of [y0 + 6, y1 - 4]) post(b, x, y, 9, 20, '#6a4a30');
  }
}

const rainforest: Threshold = {
  under: (b, g, rng) => creek(b, g.y, 30, CREEK, rng, 5),
  over: (b, g, rng) => ropeBridge(b, g, 86, rng),
};

const reef: Threshold = {
  under: (b, g, rng) => creek(b, g.y, 34, CHANNEL, rng, 6),
  over: (b, g, rng) => {
    ropeBridge(b, g, 92, rng, '#b8a07a');
    // A rope of floats strung across the channel either side.
    const reach = reachOf(b, rng);
    for (const [from, to] of runs(g.x, 40, reach)) {
      const dir = Math.sign(to - from);
      b.line([pt(from, g.y + 4), pt((from + to) / 2, g.y + 8), pt(to, g.y + 4)], 0.7, 0.6);
      for (let x = from + dir * 20; dir * (to - x) > 0; x += dir * 34) {
        const f = oval(x, g.y + 6 + Math.sin(x / 40) * 2, 4.5, 3.5, 10);
        b.body(f, Math.round(x / 34) % 2 === 0 ? '#e0703a' : '#f2efe6', 0.9);
        b.edge(f, 0.6, 0.85);
      }
    }
  },
};

const mountains: Threshold = {
  over: (b, g, rng) => {
    ruled(b, g.y + 10);
    const reach = reachOf(b, rng);
    for (const s of [-1, 1]) cairn(b, pt(g.x + s * (OPEN + 18), g.y + 18), 52, rng);
    // A line of boulders across the band: an old moraine the trail passes through.
    for (const [from, to] of runs(g.x, OPEN + 50, reach)) {
      const dir = Math.sign(to - from);
      for (let x = from + dir * 10; dir * (to - x) > 0; x += dir * (26 + rng() * 40)) boulder(b, pt(x, g.y + 10 + (rng() - 0.5) * 18), 7 + rng() * 9, rng);
    }
  },
};

const heath: Threshold = {
  over: (b, g, rng) => {
    const foot = g.y + 14;
    const reach = reachOf(b, rng);
    ruled(b, foot);
    for (const [from, to] of runs(g.x, 0, reach)) stoneWall(b, from, to, foot, rng);
    // A ladder stile over the wall: two ladders leaning together, rungs across.
    for (const s of [-1, 1]) {
      const legs = [[pt(g.x - 24, foot + 14 * s), pt(g.x - 14, foot - 44)], [pt(g.x + 24, foot + 14 * s), pt(g.x + 14, foot - 44)]];
      for (const l of legs) {
        b.stroke(l.map((p) => pt(p.x + 8, p.y + 10)), 3, 0.1, b.d.ink);
        b.stroke(l, 3.6, 0.9, mix(OAK, b.d.ink, 0.25));
      }
      for (let k = 1; k < 5; k++) {
        const t = k / 5;
        const a = pt(legs[0]![0]!.x + (legs[0]![1]!.x - legs[0]![0]!.x) * t, legs[0]![0]!.y + (legs[0]![1]!.y - legs[0]![0]!.y) * t);
        const z = pt(legs[1]![0]!.x + (legs[1]![1]!.x - legs[1]![0]!.x) * t, a.y);
        b.stroke([a, z], 2.6, 0.85, OAK);
      }
    }
    footGrass(b, -30, MAP.width + 30, foot, rng, '#8a8a4a', 60);
  },
};

const jungle: Threshold = {
  over: (b, g, rng) => {
    const foot = g.y + 18;
    for (const s of [-1, 1]) {
      const x = g.x + s * (OPEN + 20);
      const pillar = boxPts(x - 16, foot - 78, x + 16, foot, 8);
      b.cast(boxPts(x - 16, foot - 6, x + 50, foot + 30, 8), 0, 0.14);
      b.body(pillar, '#b9b29a', 0.65);
      for (let y = foot - 66; y < foot; y += 16) b.line([pt(x - 15, y), pt(x + 15, y + 0.5)], 0.5, 0.55);
      b.line(Array.from({ length: 16 }, (_, k) => polar(pt(x, foot - 44), k * 0.75, k * 0.6)), 0.5, 0.55);
      b.pen.crescent(pillar, pt(-12, 0), () => (b.draft ? b.hatch(pillar, 2.4, 1.2, 0.38) : b.pen.fill(pillar, '#3a3a30', 0.25)));
      b.edge(pillar, 1, 0.9);
      // A creeper climbing it.
      const vine = Array.from({ length: 12 }, (_, k) => pt(x + Math.sin(k * 1.1 + s) * 13, foot - k * 6.5));
      b.line(vine, 0.9, 0.8, '#3f5a30');
      for (let k = 1; k < 12; k += 2) {
        const leaf = blob(pt(vine[k]!.x + 4, vine[k]!.y), 4.5, 2.6, rng, 0.1, 10, rng() * 3);
        b.body(leaf, '#5f8f4e', 0.75);
        b.line(closed(leaf), 0.35, 0.6);
      }
    }
    // The lintel fallen beside the gateway, broken in two.
    block(b, pt(g.x + OPEN + 92, foot + 22), 58, 18, 0.25, '#b9b29a');
    block(b, pt(g.x + OPEN + 146, foot + 34), 34, 17, -0.3, '#b0a890');
  },
};

/** A bridge of two logs laid side by side along the trail, lashed, a rope hand-line on stakes. */
function logBridge(b: Brush, g: Pt, len: number): void {
  const y0 = g.y + len / 2;
  const y1 = g.y - len / 2;
  for (const dx of [-10, 10]) {
    const log = boxPts(g.x + dx - 10, y1, g.x + dx + 10, y0, 10);
    b.cast(log, 10, 0.14);
    b.body(log, '#7a5a3a', 0.72);
    for (let y = y1 + 6; y < y0 - 4; y += 9) b.line([pt(g.x + dx - 7, y), pt(g.x + dx - 2, y + 4)], 0.4, 0.5);
    b.pen.crescent(log, pt(-8, 0), () => (b.draft ? b.hatch(log, 2.4, 1.2, 0.35) : b.pen.fill(log, '#2a1a10', 0.3)));
    b.edge(log, 0.9, 0.85);
    for (const y of [y1, y0]) {
      const end = oval(g.x + dx, y, 10, 5, 14);
      b.body(end, '#c49a6a', 0.85);
      b.line(closed(oval(g.x + dx, y, 5, 2.5, 10)), 0.4, 0.6);
      b.edge(end, 0.7, 0.85);
    }
  }
  for (const y of [y1 + 14, y0 - 14]) b.stroke([pt(g.x - 22, y), pt(g.x + 22, y)], 1.6, 0.8, '#8a6a3a');
  for (const y of [y0 + 4, y1 - 4]) post(b, g.x + 30, y, 7, 26, '#5a4030');
  b.line([pt(g.x + 30, y0 - 20), pt(g.x + 34, g.y), pt(g.x + 30, y1 - 28)], 0.8, 0.75);
}

const flooded: Threshold = {
  under: (b, g, rng) => creek(b, g.y, 32, BLACKWATER, rng, 7),
  over: (b, g) => logBridge(b, g, 90),
};

export const THRESHOLDS: Readonly<Record<Place, Threshold>> = { farm, barrens, dunes, savanna, rainforest, reef, mountains, heath, jungle, flooded };

/** A threshold for each place's chapter index (0-based), so a draft can still show its place's gate. */
export const thresholdFor = (place: Place): Threshold => THRESHOLDS[place];

