import { bezier, cub, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { BACKDROP_W, band, FAR, fadeBottom, tiled } from './common';
import { camel, camelthorn, deadTree, gemsbok, grass, kestrel, ruinedLighthouse, signpost, stones, tern, welwitschia, whaleBones, wreck } from './desert';
import { swells } from './water';

/**
 * Beach 2: where a Namib-style sand sea runs into the cold Atlantic. Far
 * off, a pale hot sky with a hazy sun and a mackerel sky; then the grey-green
 * ocean with a fog bank on the horizon and long lines of surf; giant apricot
 * star dunes with knife-edge crests plunging to the beach; nearest, a sandy
 * bank with welwitschia, camelthorn, dry grass, a signpost and whale bones.
 */
const W = BACKDROP_W;
const SKY_BLUE = '#b5c9d2';
const SKY_HEAT = '#f1d3a2';
const SEA = '#6f8f8c';
const SEA_PALE = '#a9bdb6';
const FOG = '#e9ecea';
const LIT = '#f0b27a';
const GLOW = '#f8d7a8';
const SHADOW = '#c0623a';
const WET = '#c9a479';
const CREAM = '#f3e2c2';
const GRAIN = '#a9875e';

/** A smooth wave that repeats exactly every tile, so anything shaped by it wraps seamlessly. */
const wave = (x: number, k: number, phase = 0): number => Math.sin((x / W) * Math.PI * 2 * k + phase);

export const DUNE_SKY_H = 220;
export const SEA_H = 170;
export const DUNES_H = 290;
const SHORE_HEADROOM = 70;
export const DESERT_H = 250 + SHORE_HEADROOM;
const DESERT_GROUND = 200 + SHORE_HEADROOM;

/** A soft, round glow, as a wet wash bleeds out on the paper. */
function glow(d: Draw, x: number, y: number, rx: number, ry: number, color: string, alpha: number): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  const n = parseInt(color.slice(1), 16);
  const rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(0.45, `rgba(${rgb},${alpha * 0.55})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

/** A mackerel sky: rows of small rounded cloudlets in a drifting patch, shrinking towards its edges. */
function mackerel(t: Draw, cx: number, cy: number, w: number, h: number, rows: number): void {
  const { pen } = t;
  for (let r = 0; r < rows; r++) {
    const v = ((r + 0.5) / rows) * 2 - 1;
    const half = (w / 2) * Math.sqrt(1 - v * v);
    const y = cy + (v * h) / 2;
    const cell = 5 + 3 * (r / rows);
    for (let x = cx - half + (r % 2) * cell * 0.8 + v * 12; x < cx + half; x += cell * 1.7 + pen.rng() * 2) {
      const edgeK = 1 - Math.abs(x - cx) / (half + 1);
      const rx = cell * (0.45 + 0.4 * edgeK);
      const ry = rx * 0.5;
      const cy0 = y + pen.jitter(1.2) + Math.sin(x * 0.04) * 1.5;
      const puff = oval(x, cy0, rx, ry, 12);
      pen.fill(puff, PAPER_FILL, 0.85);
      pen.fill(oval(x + 0.5, cy0 + ry * 0.45, rx * 0.85, ry * 0.45, 10), SKY_BLUE, 0.35);
      pen.hair(puff.slice(6, 13), 0.45, t.ink, FAR * 0.35);
    }
  }
}

export function sky(d: Draw): void {
  const H = DUNE_SKY_H;
  // Pale dusty blue overhead, warming to a hot haze lower down; both fade out at the layer's edges.
  band(d, 0, H * 0.3, SKY_BLUE, 0, 0.24);
  band(d, H * 0.3, H * 0.7, SKY_BLUE, 0.24, 0);
  band(d, H * 0.35, H * 0.75, SKY_HEAT, 0, 0.3);
  band(d, H * 0.75, H, SKY_HEAT, 0.3, 0);
  tiled(d, 911, (t) => {
    const { pen } = t;
    // A hazy sun, white-hot, bleeding into the sky: no rays, only a broken rim.
    glow(t, 250, 70, 110, 85, '#f9dca0', 0.55);
    glow(t, 250, 70, 40, 40, '#fffaf0', 0.9);
    pen.fill(oval(250, 70, 17, 17, 24), PAPER_FILL, 0.95);
    const rim = oval(250, 70, 18, 18, 36);
    for (let i = 0; i < 36; i += 6) pen.hair(rim.slice(i, i + 4), 0.8, t.ink, FAR * 0.55);
    mackerel(t, 560, 52, 300, 46, 6);
    mackerel(t, 880, 34, 170, 26, 4);
    mackerel(t, 60, 110, 120, 18, 3);
    // Long, thin bands of haze.
    for (const [x, y, w] of [[380, 150, 260], [760, 172, 200], [40, 186, 160]] as const) {
      pen.hair(bezier(pt(x, y), pt(x + w / 2, y - 2), pt(x + w, y + 1), 12), 1.2, PAPER_FILL, 0.8);
      pen.hair(bezier(pt(x + 12, y + 2.5), pt(x + w / 2, y + 1), pt(x + w - 20, y + 3), 12), 0.45, t.ink, FAR * 0.3);
    }
    kestrel(t, 700, 120, 0.9);
    for (const [x, y, s] of [[440, 120, 0.8], [462, 110, 0.65], [478, 126, 0.55], [930, 140, 0.7], [120, 58, 0.7]] as const) tern(t, x, y, s);
  });
}

const HORIZON = 40;

/** The fog bank lying on the cold sea: a soft white mass with a rolling top, thinning in places. */
function fogBank(t: Draw, y: number): void {
  const { pen } = t;
  const height = (x: number): number => 12 + 9 * wave(x, 2, 0.6) + 5 * wave(x, 5, 2.1) + 2 * wave(x, 13, 0.3);
  const top: Pt[] = [];
  for (let x = 0; x <= W; x += 4) top.push(pt(x, y - Math.max(0, height(x)) - 2 * Math.abs(wave(x, 23))));
  const shape = [...top, pt(W, y + 14), pt(0, y + 14)];
  const { ctx } = pen;
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, y - 30, 0, y + 14);
    g.addColorStop(0, 'rgba(250,250,246,0.95)');
    g.addColorStop(0.6, 'rgba(240,243,241,0.8)');
    g.addColorStop(1, 'rgba(233,236,234,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 40, W, 60);
  });
  // The rolling top, inked only in broken scallops.
  for (let i = 0; i + 5 < top.length; i += 7) if (height(top[i]!.x) > 8 && i % 14 === 0) pen.hair(top.slice(i, i + 5), 0.45, t.ink, FAR * 0.22);
}

/** Long lines of white surf rolling in, closer together and brighter towards the beach. */
function surf(t: Draw, y0: number, y1: number, rows: number): void {
  const { pen } = t;
  for (let r = 0; r < rows; r++) {
    const k = r / (rows - 1);
    const y = y0 + (y1 - y0) * k ** 0.8;
    for (let x = (r * 137) % 90 - 60; x < W; x += 0) {
      const len = 90 + pen.rng() * 160 + k * 80;
      const line = bezier(pt(x, y), pt(x + len / 2, y - 1 - k), pt(x + len, y + pen.jitter(1)), 16);
      pen.hair(line, 1 + k * 1.4, PAPER_FILL, 0.6 + 0.35 * k);
      pen.hair(line.map((p) => pt(p.x + 2, p.y + 1.6 + k)), 0.45, t.ink, FAR * (0.2 + 0.35 * k));
      // A few curls where the wave is breaking.
      for (let c = x + 10; c < x + len - 10; c += 30 + pen.rng() * 40) {
        pen.hair(bezier(pt(c, y + 1), pt(c + 3, y - 2 - k), pt(c + 6, y + 0.5), 4), 0.45, t.ink, FAR * 0.4 * (0.5 + k));
      }
      x += len + 20 + pen.rng() * 60;
    }
  }
}

/** The cold Atlantic: horizon and fog bank, an old lighthouse, swell and long lines of surf. */
export function sea(d: Draw): void {
  const H = SEA_H;
  band(d, HORIZON, H * 0.6, SEA, 0.42, 0.34);
  band(d, H * 0.6, H, SEA_PALE, 0.34, 0.4);
  tiled(d, 912, (t) => {
    const { pen } = t;
    pen.stroke([pt(-20, HORIZON), pt(W + 20, HORIZON)], 1, t.ink, FAR, false);
    ruinedLighthouse(t, 952, HORIZON, 1);
    fogBank(t, HORIZON + 2);
    swells(t, HORIZON + 10, HORIZON + 46);
    surf(t, HORIZON + 50, H - 8, 7);
    wreck(t, 640, HORIZON + 66, 0.85);
  });
}

interface Hump {
  /** Offset from the dune's centre, height, and half-widths to the left and right of its crest. */
  readonly dx: number;
  readonly h: number;
  readonly wl: number;
  readonly wr: number;
}

interface Peak {
  readonly x: number;
  /** The summit first, then lower shoulders on its arms. */
  readonly humps: readonly Hump[];
}

/** One hump's height above the foot: a rounded windward back meeting a steep slip face at a knife-sharp crest. */
function hump(p: Peak, k: Hump, x: number): number {
  const c = p.x + k.dx;
  const u = (x - c) / (x < c ? k.wl : k.wr);
  const v = Math.max(0, 1 - Math.abs(u));
  // Windward (left): a long apron swelling into a rounded back; lee (right): a straight, steep slip face.
  return k.h * (x < c ? (v * v * (3 - 2 * v)) ** 0.85 : v ** 1.3);
}

/** The dune's skyline: its humps merged with a soft maximum, so saddles between them stay rounded. */
function profile(p: Peak, x: number): number {
  const s = 7;
  const sum = p.humps.reduce((acc, k) => acc + Math.exp(hump(p, k, x) / s), 0) - (p.humps.length - 1);
  return s * Math.log(Math.max(1, sum)) + 1.2 * Math.sin(x * 0.09 + p.x) * Math.min(1, profile0(p, x) / 30);
}
const profile0 = (p: Peak, x: number): number => Math.max(...p.humps.map((k) => hump(p, k, x)));

/** A sinuous crest line from a summit down to the dune foot, swinging one way then the other. */
function crestLine(t: Draw, from: Pt, footX: number, foot: number): Pt[] {
  const drop = foot - from.y;
  const run = footX - from.x;
  const swing = (0.3 + t.pen.rng() * 0.25) * drop * (run >= 0 ? 1 : -1);
  return cub(from, pt(from.x + run * 0.15 + swing * 0.5, from.y + drop * 0.35), pt(footX - swing * 0.4, from.y + drop * 0.7), pt(footX, foot + 4), 20);
}

/**
 * A giant star dune. Light comes from the upper left, so the face left of
 * each knife-edge crest glows apricot and the face to its right falls into
 * burnt-orange shade, hatched; each shoulder casts its own. Wind ripples
 * comb the lit faces.
 */
function starDune(t: Draw, p: Peak, foot: number, far: number): void {
  const { pen } = t;
  const x0 = Math.min(...p.humps.map((k) => p.x + k.dx - k.wl));
  const x1 = Math.max(...p.humps.map((k) => p.x + k.dx + k.wr));
  const top: Pt[] = [];
  for (let x = x0; x <= x1; x += 3) top.push(pt(x, foot - profile(p, x)));
  top.push(pt(x1, foot));
  const shape = [...top, pt(x1, foot + 1.5), pt(x0, foot + 1.5)];
  const fade = 1 - far * 0.5;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, LIT, 0.5 * fade);
  const crests: Pt[][] = [];
  pen.clipped(shape, () => {
    // A warm glow low on the lit flank, where sand reflects into sand.
    const { ctx } = pen;
    const warm = ctx.createLinearGradient(0, foot - profile(p, p.x) * 0.6, 0, foot);
    warm.addColorStop(0, 'rgba(248,215,168,0)');
    warm.addColorStop(1, `rgba(248,215,168,${0.45 * fade})`);
    ctx.fillStyle = warm;
    ctx.fillRect(x0, foot - profile(p, p.x), x1 - x0, profile(p, p.x) + 8);
    // Shoulders first, so the summit's crest and shade lie over theirs.
    for (const k of [...p.humps].reverse()) {
      const c = p.x + k.dx;
      const summit = pt(c, foot - profile(p, c));
      const crest = crestLine(t, summit, c + k.wr * (0.3 + pen.rng() * 0.25), foot);
      const own: Pt[] = [];
      for (let x = c; x <= c + k.wr; x += 3) own.push(pt(x, foot - Math.max(hump(p, k, x), 0)));
      const shade = [...crest, pt(c + k.wr, foot + 6), ...[...own].reverse()];
      pen.fill(shade, SHADOW, 0.42 * fade);
      pen.hatch(shade, 2.3, 1.05, 0.42, { color: t.ink, alpha: FAR * 0.4 * fade });
      // Deeper shade right under the crest, where the slip face turns furthest from the sun.
      pen.clipped(shade, () => pen.fill(crest.map((q, i) => pt(q.x + 4 + i * 0.4, q.y)).concat([...crest].reverse()), SHADOW, 0.2 * fade));
      crests.push(crest);
      // A star dune's arm: a second crest swinging down the windward face, sunlit on its far side.
      if (k.h > 100) {
        const arm = crestLine(t, summit, c - k.wl * (0.35 + pen.rng() * 0.15), foot);
        const left = top.filter((q) => q.x <= c);
        pen.fill([...left, ...[...arm].reverse()], GLOW, 0.3 * fade);
        pen.fill([...arm, ...crest.slice().reverse()], SHADOW, 0.1 * fade);
        crests.unshift(arm);
      }
    }
    // Wind ripples on the lit faces: short, close, parallel scallops.
    for (let i = 0; i < (x1 - x0) * 0.7; i++) {
      const rx = x0 + pen.rng() * (x1 - x0);
      const hh = profile(p, rx);
      const ry = foot - hh * pen.rng() * 0.85 - 2;
      const len = 4 + pen.rng() * 6;
      pen.hair(bezier(pt(rx, ry), pt(rx + len * 0.5, ry - 1.3), pt(rx + len, ry + 0.9), 4), 0.4, t.ink, FAR * 0.26 * fade);
    }
    pen.stipple(shape, Math.round((x1 - x0) * 3), (_, y) => 0.2 + 0.5 * ((y - (foot - profile(p, p.x))) / (profile(p, p.x) + 1)), 0.45, GRAIN);
  });
  // The skyline, then the knife-edge crests, crisp.
  pen.stroke(top.slice(0, -1), 1, t.ink, FAR * fade, false);
  crests.forEach((c, i) => pen.stroke(c, i === crests.length - 1 ? 0.95 : 0.7, t.ink, FAR * (i === crests.length - 1 ? 1.05 : 0.8) * fade, false));
}

/** A drift of sea fog creeping over the dune foot. */
function fogWisp(t: Draw, x: number, y: number, w: number, h: number): void {
  glow(t, x, y, w / 2, h / 2, FOG, 0.85);
  t.pen.hair(bezier(pt(x - w * 0.35, y - h * 0.1), pt(x, y - h * 0.32), pt(x + w * 0.3, y - h * 0.12), 10), 0.45, t.ink, FAR * 0.22);
}

const DUNE_FOOT = DUNES_H - 40;

/**
 * The giant dunes: a towering star-dune massif to the left, lower dunes to
 * the right with the sea showing over them, gemsbok on a ridge, a camel
 * train, and their feet washed by surf along a strip of beach.
 */
export function dunes(d: Draw): void {
  const F = DUNE_FOOT;
  tiled(d, 913, (t) => {
    const { pen } = t;
    // Back to front.
    const back: [Peak, number][] = [
      [{ x: 150, humps: [{ dx: 0, h: 108, wl: 190, wr: 144 }, { dx: -120, h: 58, wl: 90, wr: 58 }] }, 0.65],
      [{ x: 560, humps: [{ dx: 0, h: 132, wl: 200, wr: 151 }, { dx: 115, h: 78, wl: 90, wr: 86 }] }, 0.45],
      [{ x: 910, humps: [{ dx: 0, h: 70, wl: 160, wr: 108 }, { dx: -80, h: 40, wl: 60, wr: 36 }] }, 0.4],
    ];
    for (const [p, far] of back) starDune(t, p, F, far);
    for (const x of [70, 82, 94]) camel(t, x, F - profile(back[0]![0], x) + 1, 0.55, x === 70);
    starDune(t, { x: 290, humps: [{ dx: 0, h: 192, wl: 300, wr: 230 }, { dx: -165, h: 96, wl: 120, wr: 79 }, { dx: 150, h: 118, wl: 110, wr: 122 }] }, F, 0);
    const low: Peak = { x: 770, humps: [{ dx: 0, h: 58, wl: 140, wr: 108 }, { dx: 75, h: 38, wl: 60, wr: 50 }] };
    starDune(t, low, F, 0.15);
    for (const [x, dir] of [[752, 1], [765, 1], [779, -1]] as const) gemsbok(t, x, F - profile(low, x) + 1, 0.6, dir);
    fogWisp(t, 860, F - 16, 280, 40);
    fogWisp(t, 600, F - 8, 220, 30);
    // The beach strip: surf along the dune foot, a band of wet sand, then dry.
    const shore = (x: number): number => F + 1.2 * wave(x, 6, 0.4);
    const edge: Pt[] = [];
    for (let x = 0; x <= W; x += 8) edge.push(pt(x, shore(x)));
    const sand = [...edge, pt(W, DUNES_H), pt(0, DUNES_H)];
    pen.fill(sand, PAPER_FILL, 1);
    pen.fill(sand, CREAM, 0.85);
    pen.fill([...edge, ...[...edge].reverse().map((p) => pt(p.x, p.y + 7))], WET, 0.35);
    for (let x = 0; x < W; x += 14 + pen.rng() * 18) {
      const w = 8 + pen.rng() * 10;
      const y = shore(x);
      pen.hair(bezier(pt(x, y + 0.5), pt(x + w * 0.4, y - 3), pt(x + w, y), 6), 1.3, PAPER_FILL, 0.95);
      pen.hair(bezier(pt(x + 1, y + 1.5), pt(x + w * 0.45, y - 1.5), pt(x + w, y + 1), 6), 0.45, t.ink, FAR * 0.5);
    }
    pen.hair(edge.map((p) => pt(p.x, p.y + 7.5)), 0.45, t.ink, FAR * 0.35);
  });
  fadeBottom(d, DUNES_H, 26);
}

/** Tyre tracks of a 4x4 wandering along the bank: two treads of short ticks. */
function tracks(t: Draw, top: (x: number) => number): void {
  const { pen } = t;
  const y = (x: number, off: number): number => top(x) + 15 + off + 4 * wave(x, 1, 1.2) + 2 * wave(x, 3);
  for (const off of [0, 5]) {
    pen.hair(Array.from({ length: 130 }, (_, i) => pt(-20 + i * 8.2, y(-20 + i * 8.2, off))), 0.4, t.ink, FAR * 0.35);
    for (let x = 0; x < W; x += 3) pen.hair([pt(x, y(x, off) - 0.9), pt(x + 1.2, y(x, off) + 0.9)], 0.35, GRAIN, 0.45);
  }
}

/** A jackal's trail: a line of small four-toed prints wandering across the sand. */
function jackal(t: Draw, x0: number, x1: number, top: (x: number) => number): void {
  const { pen } = t;
  for (let x = x0, k = 0; x < x1; x += 7, k++) {
    const y = top(x) + 24 + 3 * Math.sin(x * 0.03) + (k % 2) * 2.4;
    pen.fill(oval(x, y, 1, 0.7, 8), t.ink, FAR * 0.55);
    for (const [dx, dy] of [[-1, -1.2], [-0.3, -1.6], [0.5, -1.6], [1.1, -1.1]] as const) pen.dot(x + dx + 1.2, y + dy, 0.3, t.ink, FAR * 0.55);
  }
}

/** The near bank of pale sand, rippled by the wind. */
function bank(t: Draw, top: (x: number) => number): void {
  const { pen } = t;
  const edge: Pt[] = [];
  for (let x = 0; x <= W; x += 8) edge.push(pt(x, top(x)));
  const shape = [...edge, pt(W, DESERT_H), pt(0, DESERT_H)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, CREAM, 0.9);
  pen.stipple(shape, 1800, (_, y) => Math.max(0, 1 - (y - (DESERT_GROUND - 10)) / 50) * 0.5, 0.5, GRAIN);
  pen.stroke(Array.from({ length: 70 }, (_, i) => pt(-20 + i * 16, top(-20 + i * 16))), 1.1, t.ink, FAR, false);
  for (let x = 0; x < W; x += 10 + pen.rng() * 14) {
    const y = top(x) + 6 + pen.rng() * 26;
    const len = 6 + pen.rng() * 8;
    pen.hair(bezier(pt(x, y), pt(x + len * 0.5, y - 1.2), pt(x + len, y + 0.4), 4), 0.4, t.ink, FAR * 0.32);
  }
}

export function desert(d: Draw): void {
  const ground = DESERT_GROUND;
  const top = (x: number): number => ground - 6 * wave(x, 2, 0.7) - 2.5 * wave(x, 5, 1.9);
  tiled(d, 914, (t) => {
    camelthorn(t, 150, top(150), 104, 128);
    camelthorn(t, 655, top(655), 82, 96);
    deadTree(t, 880, top(880) + 3, 70);
    for (const [x, h] of [[40, 16], [92, 12], [232, 18], [372, 14], [430, 20], [535, 12], [600, 16], [742, 14], [850, 14], [1000, 15]] as const) grass(t, x, top(x) + 2, h);
    bank(t, top);
    tracks(t, top);
    jackal(t, 240, 520, top);
    welwitschia(t, 318, top(318) + 8, 1.4);
    welwitschia(t, 960, top(960) + 7, 1.1);
    signpost(t, 468, top(468) + 9, 1);
    whaleBones(t, 750, top(750) + 10, 1.3);
    stones(t, 560, top(560) + 12, 3);
    stones(t, 214, top(214) + 14, 2);
  });
  fadeBottom(d, DESERT_H, 40);
}
