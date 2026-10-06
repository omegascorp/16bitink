import { bezier, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { BACKDROP_W, band, FAR, fadeBottom, tiled } from './common';
import { bird, cloud, dhoni, hammock, jetty, motu, palm, scrub, seaplane, SKY_WASH, villa } from './tropic';

/**
 * Beach 1: a coral island in the Maldives. Far off, a seaplane and towering
 * cumulus; then the deep blue ocean, the white line of the reef, a turquoise
 * lagoon with water villas and a dhoni; nearest, coconut palms and scrub
 * along a bank of white coral sand.
 */
const OCEAN = '#2f86b8';
const LAGOON = '#3fc0c0';
const SHALLOWS = '#b2ecdf';
const CORAL = '#2a8590';
const SAND_WHITE = '#f6efd9';
const WRACK = '#8a7a52';

export const SKY_H = 220;
export const LAGOON_H = 170;
export const SHORE_H = 250;

export function sky(d: Draw): void {
  // A soft wash, deepest a third of the way down, fading out at both edges of the layer.
  band(d, 0, SKY_H * 0.35, SKY_WASH, 0, 0.32);
  band(d, SKY_H * 0.35, SKY_H, SKY_WASH, 0.32, 0);
  tiled(d, 901, (t) => {
    const { pen } = t;
    // A high sun, rayed with short broken strokes.
    pen.circle(800, 58, 20, 1.2, t.ink);
    pen.fill(oval(800, 58, 19, 19, 20), PAPER_FILL, 0.7);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.1;
      const r0 = 27 + (i % 2) * 3;
      pen.hair([pt(800 + Math.cos(a) * r0, 58 + Math.sin(a) * r0), pt(800 + Math.cos(a) * (r0 + 8 - (i % 2) * 3), 58 + Math.sin(a) * (r0 + 8 - (i % 2) * 3))], 0.9, t.ink, FAR);
    }
    cloud(t, 150, 120, 190, 6);
    cloud(t, 480, 80, 120, 4);
    cloud(t, 640, 170, 90, 4);
    cloud(t, 960, 140, 150, 5);
    seaplane(t, 330, 60, 1.3);
    for (const [x, y, s] of [[560, 125, 1], [585, 112, 0.8], [720, 140, 0.7], [70, 60, 0.9]] as const) bird(t, x, y, s);
  });
}

/** Ripple marks on open water: short arcs, wider and further apart towards the viewer. */
function ripples(t: Draw, y0: number, y1: number, rows: number, alpha: number): void {
  for (let row = 0; row < rows; row++) {
    const k = row / Math.max(1, rows - 1);
    const y = y0 + (y1 - y0) * k ** 1.3;
    const len = 4 + 8 * k;
    for (let x = (row * 41) % 50; x < BACKDROP_W; x += 34 + 26 * k + t.pen.rng() * 20) {
      t.pen.hair(bezier(pt(x, y), pt(x + len / 2, y - 1.2 - k), pt(x + len, y), 5), 0.6 + 0.3 * k, t.ink, alpha * (0.5 + 0.5 * k));
    }
  }
}

/** The reef break: a ragged line of white surf with curling breakers and spray. */
function reef(t: Draw, y: number): void {
  const { pen } = t;
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let x = 0; x <= BACKDROP_W; x += 8) {
    top.push(pt(x, y - 1.5 - Math.abs(Math.sin(x * 0.05)) * 1.6));
    bot.push(pt(x, y + 3 + Math.sin(x * 0.11) * 1.2));
  }
  pen.fill([...top, ...[...bot].reverse()], PAPER_FILL, 0.95);
  for (let x = 6; x < BACKDROP_W; x += 18 + pen.rng() * 16) {
    const w = 7 + pen.rng() * 6;
    pen.hair(bezier(pt(x, y + 1), pt(x + w * 0.4, y - 3.5), pt(x + w, y - 0.5), 6), 0.7, t.ink, FAR * 0.8);
    pen.hair(bezier(pt(x + w * 0.55, y - 2), pt(x + w * 0.8, y - 1), pt(x + w * 0.7, y + 0.5), 3), 0.45, t.ink, FAR * 0.55);
  }
  pen.stipple([...top, ...[...bot].reverse()], 500, () => 0.6, 0.45, t.ink);
  pen.hair(bot, 0.6, t.ink, FAR * 0.5);
}

/** Coral heads under the lagoon: soft darker blotches with a few broken outlines. */
function coral(t: Draw, y0: number, y1: number): void {
  const { pen } = t;
  for (let i = 0; i < 14; i++) {
    const x = pen.rng() * BACKDROP_W;
    const y = y0 + pen.rng() * (y1 - y0);
    const k = (y - y0) / (y1 - y0);
    const blob = oval(x, y, 10 + 18 * k + pen.rng() * 8, 1.5 + 3 * k, 14).map((p) => pt(p.x + pen.jitter(2), p.y + pen.jitter(0.6)));
    pen.fill(blob, CORAL, 0.16);
    pen.hair(blob.slice(0, 7), 0.5, t.ink, FAR * 0.3);
  }
}

export function lagoon(d: Draw): void {
  const H = LAGOON_H;
  const horizon = 50;
  const reefY = 74;
  band(d, horizon, reefY, OCEAN, 0.5, 0.42);
  band(d, reefY, H, LAGOON, 0.45, 0.22);
  band(d, reefY + 30, H, SHALLOWS, 0, 0.5);
  tiled(d, 902, (t) => {
    const { pen } = t;
    motu(t, 150, horizon, 120);
    motu(t, 690, horizon, 46);
    motu(t, 760, horizon, 22);
    pen.stroke([pt(-20, horizon), pt(BACKDROP_W + 20, horizon)], 1, t.ink, FAR, false);
    ripples(t, horizon + 4, reefY - 4, 5, FAR * 0.9);
    reef(t, reefY);
    coral(t, reefY + 10, H - 20);
    ripples(t, reefY + 8, H - 10, 7, FAR * 0.7);
    dhoni(t, 255, reefY + 8, 0.45);
    // The water villas, out on their jetty.
    jetty(t, 340, H - 4, 372, 104, 650);
    for (let i = 0; i < 6; i++) villa(t, 390 + i * 50, 104, 0.95);
    dhoni(t, 870, 132, 1.05);
  });
}

/** The bank of coral sand along the near shore. */
function berm(t: Draw, top: (x: number) => number): void {
  const { pen } = t;
  const edge: Pt[] = [];
  for (let x = -20; x <= BACKDROP_W + 20; x += 12) edge.push(pt(x, top(x)));
  const shape = [...edge, pt(BACKDROP_W + 20, SHORE_H), pt(-20, SHORE_H)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, SAND_WHITE, 0.9);
  pen.stipple(shape, 1600, (_, y) => Math.max(0, 1 - (y - 190) / 50) * 0.5, 0.5, '#9c8a62');
  pen.stroke(edge, 1.1, t.ink, FAR, false);
  // The wrack line: dashes of dried seagrass where the last tide reached.
  for (let x = 10; x < BACKDROP_W; x += 9 + pen.rng() * 14) {
    const y = top(x) + 12 + Math.sin(x * 0.02) * 2;
    pen.hair([pt(x, y), pt(x + 3 + pen.rng() * 4, y + pen.jitter(0.6))], 0.7, WRACK, 0.5);
  }
}

/** Beach morning glory: a runner trailing over the sand with heart-shaped leaves. */
function vine(t: Draw, x: number, y: number, len: number): void {
  const { pen } = t;
  const run = bezier(pt(x, y), pt(x + len * 0.5, y - 5), pt(x + len, y + 2), 12);
  pen.hair(run, 0.6, t.ink, FAR * 0.8);
  for (let i = 2; i < run.length; i += 2) {
    const p = run[i]!;
    const leaf = oval(p.x, p.y - 2.5, 2.4, 2, 8);
    pen.fill(leaf, '#6fa65c', 0.5);
    pen.hair([...leaf, leaf[0]!], 0.4, t.ink, FAR * 0.6);
  }
}

export function shore(d: Draw): void {
  const ground = 200;
  const top = (x: number): number => ground - 4 * Math.sin((x / BACKDROP_W) * Math.PI * 4 + 0.7) - 2 * Math.sin((x / BACKDROP_W) * Math.PI * 10);
  tiled(d, 903, (t) => {
    const trunks: Pt[][] = [];
    for (const [x, h, lean] of [[70, 168, 0.16], [232, 196, -0.1], [296, 150, 0.32], [520, 182, 0.06], [705, 158, -0.24], [900, 190, 0.12]] as const) {
      trunks.push(palm(t, x, top(x) - 6, h, lean));
    }
    for (const [x, w, h] of [[20, 90, 26], [150, 110, 34], [380, 120, 30], [470, 60, 22], [610, 130, 36], [800, 100, 28], [960, 80, 24]] as const) scrub(t, x, top(x) + 2, w, h);
    // A hammock between the two palms leaning apart.
    const at = (spine: Pt[], y: number): Pt => spine.reduce((best, p) => (Math.abs(p.y - y) < Math.abs(best.y - y) ? p : best));
    hammock(t, at(trunks[1]!, ground - 34), at(trunks[2]!, ground - 30));
    berm(t, top);
    for (const [x, len] of [[120, 40], [430, 55], [760, 46]] as const) vine(t, x, top(x) + 7, len);
    // Fallen coconuts.
    for (const x of [84, 92, 540, 912]) {
      const nut = oval(x, top(x) + 3, 3.2, 2.8, 10);
      t.pen.fill(nut, '#a8934e', 0.7);
      t.pen.stroke([...nut, nut[0]!], 0.7, t.ink, FAR, false);
    }
  });
  fadeBottom(d, SHORE_H, 40);
}
