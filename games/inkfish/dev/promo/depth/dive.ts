import type { FishShape } from '../../../src/art/fishArt';
import { lerp, ramp, smooth, VIDEO, window01 } from '../short';

/**
 * "How deep do fish actually live?": the camera sinks from the surface,
 * through the ocean's zones, to a snailfish at 8,336 m, the deepest fish
 * ever filmed (Izu-Ogasawara Trench, 2022). Then a bubble from the
 * snailfish rushes back up to the surface, which is where the loop began.
 *
 * The world is one tall strip: world y in px, 0 at the sea surface, mapped
 * to real depth in metres through knots (the deep zones get squeezed, or the
 * video would be all black water). Every beat is a function of time, in
 * seconds, over a loop of LOOP_S.
 */
export const LOOP_S = 18;
/** The descent ends here, the camera holds on the snailfish, then rushes back up. */
export const ARRIVE_AT = 14.6;
export const REWIND_FROM = 16.5;

export const SNAILFISH_M = 8336;

/** World y (px) → depth (m). Steep where little happens, so the counter races through the deep. */
const KNOTS: readonly (readonly [number, number])[] = [
  [0, 0], [700, 10], [1400, 50], [2200, 200], [3500, 1000], [5200, 4000], [6300, 6000], [7800, SNAILFISH_M], [9800, 11000],
];

/** Depth in metres at world y (negative above the surface). */
export function metresAt(y: number): number {
  if (y <= 0) return y * (KNOTS[1]![1] / KNOTS[1]![0]);
  for (let i = 1; i < KNOTS.length; i++) {
    const [y0, m0] = KNOTS[i - 1]!;
    const [y1, m1] = KNOTS[i]!;
    if (y <= y1 || i === KNOTS.length - 1) return m0 + ((y - y0) / (y1 - y0)) * (m1 - m0);
  }
  throw new Error('unreachable');
}

/** World y at a depth in metres. */
export function yAt(metres: number): number {
  if (metres <= 0) return metres * (KNOTS[1]![0] / KNOTS[1]![1]);
  for (let i = 1; i < KNOTS.length; i++) {
    const [y0, m0] = KNOTS[i - 1]!;
    const [y1, m1] = KNOTS[i]!;
    if (metres <= m1 || i === KNOTS.length - 1) return y0 + ((metres - m0) / (m1 - m0)) * (y1 - y0);
  }
  throw new Error('unreachable');
}

// ---------------------------------------------------------------- camera

const CENTRE = VIDEO.height / 2;
/**
 * The screen height the depth is read at: where the sea surface sits at the
 * loop point (under the hook line in the sky), and where the snailfish hangs
 * at the bottom, clear of the platforms' buttons and captions.
 */
export const READ_Y = 720;
const START = CENTRE - READ_Y;
/** The descent stops with the snailfish's depth at READ_Y. */
const END = yAt(SNAILFISH_M) + CENTRE - READ_Y;

/** Descent speed profile (unscaled): eases in from rest, cruises, eases out to rest on the snailfish. */
const pace = (t: number): number => smooth(t / 1.6) * (1 - smooth((t - (ARRIVE_AT - 2.8)) / 2.8));

/** Cumulative descent, sampled: the camera's distance is the integral of its pace. */
const STEPS = 4000;
const CUMULATIVE = (() => {
  const out = new Float64Array(STEPS + 1);
  const dt = ARRIVE_AT / STEPS;
  for (let i = 1; i <= STEPS; i++) out[i] = out[i - 1]! + ((pace((i - 1) * dt) + pace(i * dt)) / 2) * dt;
  return out;
})();

/** Smootherstep: starts and ends at rest, gentler than smoothstep. */
const smoother = (u: number): number => {
  const c = Math.max(0, Math.min(1, u));
  return c * c * c * (c * (c * 6 - 15) + 10);
};

/** World y at the middle of the screen. */
export function cameraAt(t: number): number {
  if (t <= 0) return START;
  if (t < ARRIVE_AT) {
    const f = (t / ARRIVE_AT) * STEPS;
    const i = Math.min(STEPS - 1, Math.floor(f));
    const done = lerp(CUMULATIVE[i]!, CUMULATIVE[i + 1]!, f - i) / CUMULATIVE[STEPS]!;
    return lerp(START, END, done);
  }
  if (t < REWIND_FROM) return END;
  return lerp(END, START, smoother((t - REWIND_FROM) / (LOOP_S - REWIND_FROM)));
}

/** Screen y of world y at time t. */
export const toScreen = (y: number, t: number): number => y - cameraAt(t) + CENTRE;

/** The depth shown on the counter: at READ_Y, never above the surface. */
export const counterMetres = (t: number): number => Math.max(0, Math.round(metresAt(cameraAt(t) - CENTRE + READ_Y)));

/** First time the middle of the screen reaches world y on the way down. */
export function passTime(y: number): number {
  let lo = 0;
  let hi = ARRIVE_AT;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (cameraAt(mid) < y) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// ---------------------------------------------------------------- zones

export interface Zone {
  readonly name: string;
  /** Where it starts, m. */
  readonly from: number;
}

/** The ocean's real zones (and the game's chapters run the same way down). */
export const ZONES: readonly Zone[] = [
  { name: 'sunlit zone', from: 0 },
  { name: 'twilight zone', from: 200 },
  { name: 'midnight zone', from: 1000 },
  { name: 'the abyss', from: 4000 },
  { name: 'hadal trench', from: 6000 },
];

export const zoneAt = (metres: number): Zone => [...ZONES].reverse().find((z) => metres >= z.from) ?? ZONES[0]!;

/** How dark the water is at a depth, 0 sunlit paper .. 1 black. */
export function darknessAt(metres: number): number {
  if (metres <= 0) return 0;
  // Sunlight fades fast: half gone by about 100 m, all but gone by 1,000 m.
  return Math.min(1, 1 - Math.exp(-metres / 260)) * (0.86 + 0.14 * ramp(metres, 1000, SNAILFISH_M));
}

/** The abyssal plain's floor, where the trench opens in it. */
export const PLAIN_M = 6000;

// ---------------------------------------------------------------- fish

export interface Swimmer {
  readonly shape: FishShape;
  readonly name: string;
  readonly metres: number;
  /** Body length, px. */
  readonly length: number;
  /** 1 swims right, -1 left. */
  readonly dir: 1 | -1;
  /** Where it is across the screen as the camera passes it, px. */
  readonly x: number;
  /** Swimming speed, px/s. */
  readonly speed: number;
}

/** Real fish at depths they really live at, top to bottom. */
export const SWIMMERS: readonly Swimmer[] = [
  { shape: 'clownfish', name: 'clownfish', metres: 6, length: 190, dir: 1, x: 380, speed: 70 },
  { shape: 'garibaldi', name: 'garibaldi', metres: 20, length: 230, dir: -1, x: 680, speed: 80 },
  { shape: 'parrotfish', name: 'parrotfish', metres: 35, length: 280, dir: 1, x: 420, speed: 80 },
  { shape: 'barracuda', name: 'barracuda', metres: 80, length: 420, dir: -1, x: 600, speed: 120 },
  { shape: 'shark', name: 'reef shark', metres: 150, length: 480, dir: 1, x: 500, speed: 140 },
  { shape: 'lanternfish', name: 'lanternfish', metres: 450, length: 210, dir: -1, x: 640, speed: 110 },
  { shape: 'barreleye', name: 'barreleye', metres: 750, length: 250, dir: 1, x: 420, speed: 50 },
  { shape: 'dragonfish', name: 'dragonfish', metres: 1300, length: 330, dir: -1, x: 620, speed: 90 },
  { shape: 'fangtooth', name: 'fangtooth', metres: 1900, length: 250, dir: 1, x: 420, speed: 70 },
  { shape: 'seadevil', name: 'anglerfish', metres: 2700, length: 300, dir: -1, x: 640, speed: 50 },
  { shape: 'gulper', name: 'gulper eel', metres: 3400, length: 460, dir: 1, x: 460, speed: 90 },
  { shape: 'cuskeel', name: 'cusk-eel', metres: 4800, length: 380, dir: -1, x: 620, speed: 80 },
  { shape: 'rattail', name: 'rattail', metres: 5500, length: 340, dir: 1, x: 440, speed: 70 },
];

/**
 * When the swimmers' clocks wrap: as the rush back up starts, with the
 * camera on the snailfish and every swimmer far off screen, so the ones near
 * the surface are back where they started by the loop point.
 */
export const WRAP_AT = REWIND_FROM;
const swimClock = (t: number): number => (t >= WRAP_AT ? t - LOOP_S : t);

/** A swimmer's position on screen at time t; it crosses `x` as the camera passes its depth. */
export function swimmerAt(s: Swimmer, t: number): { readonly x: number; readonly y: number; readonly beat: number } {
  const y = yAt(s.metres);
  const clock = swimClock(t);
  const dt = clock - passTime(y);
  return { x: s.x + s.dir * s.speed * dt, y: toScreen(y, t) + 14 * Math.sin(clock * 1.3 + s.metres), beat: 2 * Math.PI * 1.6 * clock };
}

export const SNAIL_LENGTH = 400;
const SNAIL_IN_FROM = ARRIVE_AT - 3.2;

/** The star: it glides in from the left as the camera slows, and hangs in the middle of the screen. */
export function snailfishAt(t: number): { readonly x: number; readonly y: number; readonly beat: number; readonly tilt: number } {
  const come = smooth((t - SNAIL_IN_FROM) / 3);
  const y = yAt(SNAILFISH_M) + 10 * Math.sin(t * 1.4);
  return { x: lerp(-260, VIDEO.width / 2 + 20, come), y: toScreen(y, t), beat: 2 * Math.PI * (0.9 * t), tilt: 0.05 * Math.sin(t * 1.4 + 1) };
}

// ---------------------------------------------------------------- the bubble that leads the way back up

/** The bubble leaves the snailfish here, rises to its spot on screen, and leads the camera up; it pops at the surface. */
const BUBBLE_FROM = REWIND_FROM - 0.6;
export const POP_AT = LOOP_S - 0.12;

/** Screen position and size of the bubble, or null when there is none. */
export function bubbleAt(t: number): { readonly x: number; readonly y: number; readonly r: number } | null {
  if (t < BUBBLE_FROM || t >= POP_AT) return null;
  const snail = snailfishAt(Math.min(t, REWIND_FROM));
  const mouth = { x: snail.x + SNAIL_LENGTH * 0.45, y: snail.y - 10 };
  const rise = ramp(t, BUBBLE_FROM, REWIND_FROM + 0.4);
  // On the way up it holds above the middle; at the end it meets the surface.
  const surface = toScreen(0, t);
  const y = Math.max(lerp(mouth.y, READ_Y - 160, rise), surface + 4);
  return { x: lerp(mouth.x, VIDEO.width / 2 + 40, rise) + 12 * Math.sin(t * 7), y, r: lerp(9, 22, rise) };
}

// ---------------------------------------------------------------- words

export interface Caption {
  readonly text: string;
  readonly y: number;
  readonly size: number;
  readonly weight: 500 | 700;
  /** Shown over [from, to] seconds (may run past either end of the loop and wrap round). */
  readonly from: number;
  readonly to: number;
}

/** The hook, over the sky at the start; it fades in again as the bubble reaches the surface, so it spans the loop point. */
export const HOOK_CAPTIONS: readonly Caption[] = [
  { text: 'how deep do fish', y: 330, size: 112, weight: 700, from: -0.6, to: 2.4 },
  { text: 'actually live?', y: 445, size: 112, weight: 700, from: -0.6, to: 2.4 },
];

/** The payoff, under the snailfish. */
export const PAYOFF_CAPTIONS: readonly Caption[] = [
  { text: 'the deepest fish ever filmed', y: 960, size: 84, weight: 700, from: ARRIVE_AT - 0.6, to: REWIND_FROM + 0.2 },
  { text: 'snailfish · Izu-Ogasawara Trench, 2022', y: 1032, size: 52, weight: 500, from: ARRIVE_AT - 0.2, to: REWIND_FROM + 0.2 },
];

const FADE = 0.3;

export function captionAlpha(c: Caption, t: number): number {
  return Math.max(...[-LOOP_S, 0, LOOP_S].map((shift) => window01(t + shift, c.from, c.to, FADE)));
}

/** The depth counter shows whenever the hook doesn't. */
export const counterAlpha = (t: number): number => 1 - captionAlpha(HOOK_CAPTIONS[0]!, t);

/** "8,336 m". */
export const formatMetres = (m: number): string => `${m.toLocaleString('en-US')} m`;
