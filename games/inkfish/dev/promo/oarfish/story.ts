import type { SfxId } from '../../../src/audio/recipes';
import { clamp01, curveAt, type Key, lerp, ramp, smooth, window01 } from '../short';
import type { Pt, RibbonPose } from './body';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "They call this the doomsday fish": the giant oarfish, told by a narrator
 * (words.ts). Every beat is timed to the words, a function of time in
 * seconds over a loop of LOOP_S.
 *
 *   0     close on the oarfish's head in the dark, hanging upright, crest and fin rippling
 *   2.4   "The oarfish is the longest bony fish…": the camera runs down its body and pulls out;
 *         a diver beside it, and an "8 m" dimension line on "eight metres"
 *   7.1   "It lives in the deep": the camera backs off; a depth gauge shows 200–1,000 m
 *   8.3   "…so in Japan": up through the water to a Japanese shore, Fuji behind
 *   9.6   "legend says when one washes ashore": its name, then a wash carries one onto the sand
 *   11.9  "an earthquake is coming": the shore shakes, the ground cracks, a seismograph scrawls,
 *         a great wave rears up
 *   13.3  "But eighty years of sightings…": the wave breaks over the picture; behind it a chart
 *         of 336 sightings, one of them circled: the one big quake that matched
 *   16.8  "So if one turns up on your beach, don't panic": a wave washes the chart away; the beach
 *         is calm, someone takes a photo, the seismograph is flat
 *   19.2  "…Even if": down into the deep to the head, where the loop began.
 *
 * World units are metres, y down: sea level at y = 0, the shoreline at
 * x = 0 with the land to the right and the sea to the left.
 */
export const LOOP_S = 21;

/** When the `nth` time a word of the voiceover begins (0 the first), in the sped-up voice.mp3. */
export function said(text: string, nth = 0): number {
  const w = WORDS.filter((x) => x.text === text)[nth];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const TRAVEL_FROM = said('The');
export const WIDE_AT = said('world:') + 0.45;
export const DIVER_FROM = said('longest');
export const EIGHT_AT = said('eight');
export const DEEP_FROM = said('It');
export const RISE_FROM = said('so');
export const SHORE_AT = said('Japan,') + 0.5;
export const LEGEND_AT = said('legend');
export const WASH_FROM = said('when');
export const ASHORE_AT = said('ashore,');
export const QUAKE_AT = said('earthquake');
export const CHART_FROM = said('But');
export const SIGHTINGS_AT = said('sightings');
export const MATCH_AT = said('matched');
export const ONE_AT = said('one', 1);
export const BIG_AT = said('big');
export const CALM_FROM = said('So');
export const PANIC_AT = said('panic.');
export const DIVE_FROM = said('panic.') + 0.15;

// ---------------------------------------------------------------- the oarfish in the deep

/** Up to eight metres, the longest bony fish. */
export const OAR_LEN = 8;
/** Its snout, hanging head-up in the deep, offshore. */
export const HEAD: Pt = { x: -9.5, y: 10 };
/** Swimming waves along its body and ripples down its fin: whole numbers per loop, so they loop. */
const SWAY_CYCLES = 7;
const FIN_CYCLES = 22;
const CREST_CYCLES = 5;

/** The oarfish in the deep: upright, head up, the ribbon swaying and the fin rippling. */
export function deepFishAt(t: number): RibbonPose {
  const w = (2 * Math.PI * t) / LOOP_S;
  return {
    x: HEAD.x + 0.025 * Math.sin(w * SWAY_CYCLES + 0.6),
    y: HEAD.y + 0.02 * Math.sin(w * SWAY_CYCLES),
    heading: -Math.PI / 2 + 0.06,
    length: OAR_LEN,
    amp: 0.075,
    waves: 1.35,
    phase: w * SWAY_CYCLES,
    curve: 0,
    fin: w * FIN_CYCLES,
    crest: w * CREST_CYCLES,
    limp: 0,
  };
}

// ---------------------------------------------------------------- the shore

/** The sand's height (y, m: negative is up) at x on the beach. */
export const sandAt = (x: number): number => -0.06 * x - 0.04 * Math.sin(1.1 * x);
/** The seabed's x at depth y: a short sandy slope off the beach, then a steep drop into the deep. */
export const seabedAt = (y: number): number => -(Math.min(y, 1) + 0.06 * Math.max(0, y - 1));

/** The one that washes ashore, lying on the sand: a smaller one. */
export const BEACHED_LEN = 4.5;
const REST_HEAD = 4.1;
const SURF_HEAD = -0.2;
/** How far the wash has carried it, 0 (out in the surf) .. 1 (stranded). */
export const washed = (t: number): number => ramp(t, WASH_FROM + 0.1, ASHORE_AT + 0.45);

/** The beached oarfish: carried in head first by the wash, then lying limp, its crest and fin folded. */
export function beachedAt(t: number): RibbonPose | null {
  if (t < WASH_FROM - 0.2 || t >= DIVE_FROM + 1.2) return null;
  const u = washed(t);
  const headX = lerp(SURF_HEAD, REST_HEAD, u);
  const d = (BEACHED_LEN / 24) * 0.5;
  const alive = 1 - u;
  const w = (2 * Math.PI * t) / LOOP_S;
  return {
    x: headX,
    y: Math.min(sandAt(headX), 0.15) - d * 0.9 + 0.12 * alive * Math.sin(w * 14),
    heading: Math.atan(-0.06) + 0.05 * alive,
    length: BEACHED_LEN,
    amp: 0.12 * alive,
    waves: 1.6,
    phase: w * 14,
    curve: 0.06 * u,
    fin: w * 20,
    crest: w * 4,
    limp: u,
  };
}

/** The wash running up the beach (its front's x, m) and back out, from "when one washes ashore". */
export function washFront(t: number): number | null {
  const up = ramp(t, WASH_FROM - 0.15, ASHORE_AT + 0.25);
  const back = ramp(t, ASHORE_AT + 0.25, ASHORE_AT + 1.3);
  if (up <= 0 || back >= 1) return null;
  return lerp(-1.6, 5.4, up) - 4.9 * back;
}

/** The great wave out at sea: its height, m. Gentle at first; it rears up when the quake comes, gone in the calm. */
export function waveHeight(t: number): number {
  if (t < SHORE_AT - 1.2 || t >= CHART_FROM + 0.8) return 0;
  return 2.3 + 1.2 * ramp(t, QUAKE_AT, CHART_FROM);
}
/** Where the wave's base comes to, m: out at sea, edging in as it rears. */
export const waveFront = (t: number): number => -0.55 + 0.25 * ramp(t, QUAKE_AT, CHART_FROM);

/** The quake: how hard the shore shakes, 0..1. */
export const quake = (t: number): number => window01(t, QUAKE_AT - 0.05, CHART_FROM + 0.1, 0.25) * (1 - 0.55 * ramp(t, QUAKE_AT + 0.6, CHART_FROM));

/** The shake, screen px: a quick, irregular judder. */
export function shakeAt(t: number): Pt {
  const a = 11 * quake(t);
  return { x: a * (Math.sin(t * 61) * 0.7 + Math.sin(t * 97 + 1) * 0.4), y: a * (Math.sin(t * 73 + 2) * 0.5 + Math.sin(t * 131) * 0.3) };
}

/** The crack opening in the ground, 0..1 of its length, from the bottom up. */
export const crack = (t: number): number => (t < CHART_FROM + 0.8 ? ramp(t, QUAKE_AT + 0.05, QUAKE_AT + 0.55) : 0);

/** The seismograph: how much it is on screen, and its trace's height (-1..1) for the moment `when` the pen wrote it. */
export const seismograph = (t: number): number =>
  Math.max(window01(t, QUAKE_AT - 0.35, CHART_FROM + 0.05, 0.3), window01(t, CALM_FROM + 0.7, DIVE_FROM + 0.1, 0.35));
export function traceAt(when: number): number {
  const hard = window01(when, QUAKE_AT, CHART_FROM + 2, 0.12) * (1 - 0.6 * ramp(when, QUAKE_AT + 0.4, CHART_FROM));
  const calm = when > CALM_FROM ? 0.03 : 0.06;
  const n = Math.sin(when * 83) * 0.5 + Math.sin(when * 131 + 1.3) * 0.3 + Math.sin(when * 199 + 0.4) * 0.2;
  return n * (calm + 0.94 * hard);
}

/** "ryūgū no tsukai": the oarfish's name in Japan, while the legend is told. */
export const legendLabel = (t: number): number => window01(t, LEGEND_AT - 0.15, QUAKE_AT - 0.25, 0.3);

/** The beachgoer in the calm: walks up and stands by it, raising a phone. */
export const visitor = (t: number): number => window01(t, CALM_FROM + 0.3, DIVE_FROM + 0.5, 0.35);
export const phoneUp = (t: number): number => ramp(t, CALM_FROM + 1.1, PANIC_AT - 0.1);
/** The phone's flash, 0..1 over its life, or outside that. */
export const flash = (t: number): number => (t - (PANIC_AT + 0.05)) / 0.35;

// ---------------------------------------------------------------- the scale and the depth

/** The diver beside it (1.8 m, for scale), and the "8 m" dimension line drawing out on "eight metres". */
export const DIVER_H = 1.8;
export const diver = (t: number): number => window01(t, DIVER_FROM + 0.6, DEEP_FROM + 0.25, 0.45);
export const dimension = (t: number): number => (t < DEEP_FROM + 0.4 ? ramp(t, EIGHT_AT - 0.35, EIGHT_AT + 0.45) : 0);
export const dimensionAlpha = (t: number): number => window01(t, EIGHT_AT - 0.4, DEEP_FROM + 0.35, 0.3);

/** The depth gauge: shown from "It lives in the deep" and through the rise, reading the depth it marks (m). */
export const gauge = (t: number): number => window01(t, DEEP_FROM + 0.15, RISE_FROM + 0.6, 0.25);
/** Where the gauge's marker points, m deep: in the oarfish's 200–1,000 m, then up to the surface with the camera. */
export const gaugeDepth = (t: number): number => lerp(600, 0, smooth((t - RISE_FROM) / 0.65));

// ---------------------------------------------------------------- the chart

/** The chart's sightings and the one that matched a big quake (Tokai University, 2019: 336 sightings, 221 M6+ quakes, 1928–2011). */
export const SIGHTINGS = 336;
export const CHART_COLS = 16;
export const MATCH_INDEX = 11 * CHART_COLS + 9;
/** How many sightings are on the chart. */
export const sightingsShown = (t: number): number => Math.round(SIGHTINGS * ramp(t, said('eighty') + 0.15, MATCH_AT - 0.05));
/** All but the match fade on "matched"; the match turns red and is ringed on "one"; the result line on "big quake". */
export const dimmed = (t: number): number => ramp(t, MATCH_AT, MATCH_AT + 0.35);
export const ringed = (t: number): number => (t < CALM_FROM + 0.6 ? ramp(t, ONE_AT - 0.05, ONE_AT + 0.45) : 0);
export const verdict = (t: number): number => ramp(t, BIG_AT, BIG_AT + 0.35);

/** The wave washing across the picture: 0..1 while it passes, and which way (1 left to right). */
export function wipeAt(t: number): { readonly u: number; readonly dir: 1 | -1 } | null {
  const into = (t - (CHART_FROM - 0.2)) / 0.75;
  if (into > 0 && into < 1) return { u: into, dir: 1 };
  const out = (t - (CALM_FROM - 0.2)) / 0.75;
  if (out > 0 && out < 1) return { u: out, dir: -1 };
  return null;
}
/** Which scene is on show behind any wipe: the chart, from the first wave's passing to the second's. */
export const chartOn = (t: number): boolean => t >= CHART_FROM - 0.2 && t < CALM_FROM - 0.2;

// ---------------------------------------------------------------- the camera

export interface Camera {
  /** The world point at the middle of the picture, and px per metre. */
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

/** On its head: the head up in the picture, the crest beside it, the body running down past the captions. */
export const CLOSE = 640;
const ON_HEAD: Pt = { x: HEAD.x - 0.15, y: HEAD.y + 0.62 };
/** All eight metres, head near the top of the picture and tail just clear of the captions. */
export const WIDE = 96;
const ON_ALL: Pt = { x: HEAD.x + 0.25, y: HEAD.y + 6.85 };
/** Further back: small in all that dark. */
const DEEPER = 58;
const ON_DEEP: Pt = { x: HEAD.x - 0.8, y: HEAD.y + 7.8 };
/** Just under the surface off the beach, on the way up and down. */
const SURFACING: Pt = { x: -3.2, y: 3.0 };
/** The shore: the sea on the left, the beach on the right, sea level low in the picture. */
export const SHORE_ZOOM = 150;
export const ON_SHORE: Pt = { x: 0.93, y: -0.27 };
/** The dive ends by rushing in from the whole fish to its head. */
const PUSH_FROM = LOOP_S - 0.8;
const PUSH_ZOOM = 104;
const ON_ALL_DIVE: Pt = { x: HEAD.x + 0.2, y: HEAD.y + 6.2 };

/** The push in on the head: the zoom eases out, and the head moves steadily to its spot on screen (no swinging). */
function pushIn(t: number): Camera {
  const u = clamp01((t - PUSH_FROM) / (LOOP_S - PUSH_FROM));
  const e = 1 - (1 - u) ** 2 * (1 + 0.6 * u);
  const zoom = Math.exp(lerp(Math.log(PUSH_ZOOM), Math.log(CLOSE), e));
  const w = (1 / zoom - 1 / CLOSE) / (1 / PUSH_ZOOM - 1 / CLOSE);
  return { x: ON_HEAD.x + (ON_ALL_DIVE.x - ON_HEAD.x) * w, y: ON_HEAD.y + (ON_ALL_DIVE.y - ON_HEAD.y) * w, zoom };
}
/** How fast the push in starts (per second): x, y and log zoom, for the dive to hand over to it smoothly. */
const PUSH_RATE = (() => {
  const h = 1e-4;
  const [a, b] = [pushIn(PUSH_FROM), pushIn(PUSH_FROM + h)];
  return { x: (b.x - a.x) / h, y: (b.y - a.y) / h, zoom: (Math.log(b.zoom) - Math.log(a.zoom)) / h };
})();

interface CamKey {
  readonly t: number;
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
  /** Rates per second for x, y and log zoom; 0 for a still key; absent for a smooth pass through. */
  readonly rate?: { readonly x: number; readonly y: number; readonly zoom: number };
}
const STILL = { x: 0, y: 0, zoom: 0 } as const;

/** The camera's journey as keys: x, y and the log of the zoom each run a smooth curve through them. */
const KEYS: readonly CamKey[] = [
  { t: 0, ...ON_HEAD, zoom: CLOSE, rate: STILL },
  { t: TRAVEL_FROM, ...ON_HEAD, zoom: CLOSE * 1.07, rate: STILL },
  { t: TRAVEL_FROM + 1.25, x: HEAD.x, y: HEAD.y + 2.7, zoom: 270 },
  { t: WIDE_AT, ...ON_ALL, zoom: WIDE, rate: STILL },
  { t: DEEP_FROM + 0.1, ...ON_ALL, zoom: WIDE, rate: STILL },
  { t: RISE_FROM, ...ON_DEEP, zoom: DEEPER, rate: { x: 1.5, y: -4, zoom: 0.1 } },
  { t: RISE_FROM + 0.75, ...SURFACING, zoom: 105 },
  { t: SHORE_AT, ...ON_SHORE, zoom: SHORE_ZOOM, rate: STILL },
  { t: DIVE_FROM, ...ON_SHORE, zoom: SHORE_ZOOM, rate: STILL },
  { t: DIVE_FROM + 0.36, ...SURFACING, zoom: 112 },
  { t: PUSH_FROM, ...ON_ALL_DIVE, zoom: PUSH_ZOOM, rate: PUSH_RATE },
];

function curveOf(pick: (k: { readonly x: number; readonly y: number }) => number): readonly Key[] {
  return KEYS.map((k): Key => (k.rate ? { t: k.t, at: pick(k), rate: pick(k.rate) } : { t: k.t, at: pick(k) }));
}
const CURVES = { x: curveOf((k) => k.x), y: curveOf((k) => k.y), zoom: KEYS.map((k): Key => (k.rate ? { t: k.t, at: Math.log(k.zoom), rate: k.rate.zoom } : { t: k.t, at: Math.log(k.zoom) })) };

export function cameraAt(t: number): Camera {
  if (t >= PUSH_FROM) return pushIn(t);
  return { x: curveAt(CURVES.x, t).at, y: curveAt(CURVES.y, t).at, zoom: Math.exp(curveAt(CURVES.zoom, t).at) };
}

/** Where on screen (px) a world point is. */
export const onScreen = (cam: Camera, p: Pt): Pt => ({ x: 540 + (p.x - cam.x) * cam.zoom, y: 960 + (p.y - cam.y) * cam.zoom });

/**
 * How far the drifting snow has been carried across the screen by the
 * camera's travel, px (with some parallax): run forward from the loop's
 * start and back from its end, so it lines up at the loop point; the two
 * meet out of sight, while the camera is above the water.
 */
const SNOW_STEP = 1 / 240;
const SNOW_PARALLAX = 0.55;
const SNOW_TABLE = (() => {
  const n = Math.round(LOOP_S / SNOW_STEP);
  const vel = (t: number): Pt => {
    const a = cameraAt(Math.max(0, t - SNOW_STEP / 2));
    const b = cameraAt(Math.min(LOOP_S, t + SNOW_STEP / 2));
    const zoom = Math.min(a.zoom, 260);
    return { x: -(b.x - a.x) * zoom * SNOW_PARALLAX, y: -(b.y - a.y) * zoom * SNOW_PARALLAX };
  };
  const forward: Pt[] = [{ x: 0, y: 0 }];
  for (let i = 1; i <= n; i++) {
    const v = vel((i - 0.5) * SNOW_STEP);
    forward.push({ x: forward[i - 1]!.x + v.x, y: forward[i - 1]!.y + v.y });
  }
  const back: Pt[] = Array.from({ length: n + 1 }, () => ({ x: 0, y: 0 }));
  for (let i = n - 1; i >= 0; i--) {
    const v = vel((i + 0.5) * SNOW_STEP);
    back[i] = { x: back[i + 1]!.x - v.x, y: back[i + 1]!.y - v.y };
  }
  return { forward, back };
})();
const SNOW_SWITCH = (SHORE_AT + DIVE_FROM) / 2;
export function snowShift(t: number): Pt {
  const i = Math.max(0, Math.min(SNOW_TABLE.forward.length - 1, Math.round(t / SNOW_STEP)));
  return t < SNOW_SWITCH ? SNOW_TABLE.forward[i]! : SNOW_TABLE.back[i]!;
}

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** Words a line shouldn't end on: they belong with the next. */
const LEADING = new Set(['the', 'a', 'an', 'in', 'of', 'to', 'on', 'your', 'if', 'so', 'when', 'is', 'just']);

/** The voiceover cut into short lines: at most four words and ~18 letters, broken after punctuation, never ending on "the". */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  for (const w of WORDS) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const full = !last || last.length >= 4 || /[.,:…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
    if (full) groups.push([w]);
    else last.push(w);
  }
  // Carry a dangling "the" (and the like) over to the next line, where it fits.
  for (let i = 0; i + 1 < groups.length; i++) {
    for (;;) {
      const g = groups[i]!;
      const next = groups[i + 1]!;
      const tail = g[g.length - 1]!;
      const fits = next.length < 4 && [tail, ...next].map((x) => x.text).join(' ').length <= 22;
      if (g.length < 2 || !LEADING.has(tail.text.toLowerCase()) || !fits) break;
      groups[i] = g.slice(0, -1);
      groups[i + 1] = [tail, ...next];
    }
  }
  return groups.map((g, i) => ({
    words: g,
    from: g[0]!.start / TEMPO,
    to: i + 1 < groups.length ? groups[i + 1]![0]!.start / TEMPO : LOOP_S,
  }));
})();

/** The line on screen at time t, and the word being spoken in it (-1: none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  let word = -1;
  line.words.forEach((w, i) => {
    if (t >= w.start / TEMPO) word = i;
  });
  return { line, word };
}

// ---------------------------------------------------------------- sounds

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

/** Quiet under the voice: it does the talking. */
export const SOUNDS: readonly SoundCue[] = [
  { id: 'dash', t: TRAVEL_FROM + 0.05, pitch: 0.45, gain: 0.14, pan: 0 },
  { id: 'grow', t: EIGHT_AT - 0.3, pitch: 0.7, gain: 0.1, pan: -0.2 },
  { id: 'suck', t: DEEP_FROM + 0.2, pitch: 0.45, gain: 0.12, pan: 0 },
  { id: 'dash', t: RISE_FROM + 0.05, pitch: 0.7, gain: 0.2, pan: 0.1 },
  { id: 'splash', t: SHORE_AT - 0.35, pitch: 1, gain: 0.28, pan: -0.2 },
  { id: 'splash', t: WASH_FROM + 0.15, pitch: 0.65, gain: 0.26, pan: -0.4 },
  { id: 'drop', t: ASHORE_AT + 0.35, pitch: 0.55, gain: 0.2, pan: 0.2 },
  { id: 'boom', t: QUAKE_AT, pitch: 0.35, gain: 0.32, pan: 0 },
  { id: 'smash', t: QUAKE_AT + 0.08, pitch: 0.45, gain: 0.16, pan: 0.15 },
  { id: 'splash', t: CHART_FROM - 0.1, pitch: 0.45, gain: 0.34, pan: -0.3 },
  ...[0, 1, 2, 3, 4, 5].map((i): SoundCue => ({ id: 'click', t: said('eighty') + 0.2 + i * 0.16, pitch: 1.1 + i * 0.07, gain: 0.12, pan: -0.25 + i * 0.1 })),
  { id: 'spotted', t: ONE_AT, pitch: 1, gain: 0.18, pan: 0.1 },
  { id: 'splash', t: CALM_FROM - 0.1, pitch: 0.9, gain: 0.22, pan: 0.3 },
  { id: 'click', t: PANIC_AT + 0.05, pitch: 1.6, gain: 0.3, pan: 0.25 },
  { id: 'splash', t: DIVE_FROM + 0.3, pitch: 0.8, gain: 0.24, pan: -0.2 },
  { id: 'dash', t: DIVE_FROM + 0.45, pitch: 0.5, gain: 0.16, pan: 0 },
];

/** The scenes are lit by `clamp01`, re-exported for the drawing. */
export { clamp01 };
