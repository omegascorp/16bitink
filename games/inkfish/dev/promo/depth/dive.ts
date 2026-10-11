import type { FishShape } from '../../../src/art/fishArt';
import { lerp, ramp, smooth, VIDEO, window01 } from '../short';

/**
 * "How deep do fish actually live?": the camera sinks from the surface,
 * stopping at six depths to show the real fish that live there (the counter
 * still, the names readable), down to a snailfish at 8,336 m, the deepest
 * fish ever filmed (Izu-Ogasawara Trench, 2022). Then a bubble from the
 * snailfish rushes back up to the surface, which is where the loop began.
 *
 * The world is one tall strip: world y in px, 0 at the sea surface, mapped
 * to real depth in metres through knots (the deep zones get squeezed, or the
 * video would be all black water). Every beat is a function of time, in
 * seconds, over a loop of LOOP_S.
 */
export const LOOP_S = 24;
/** Resting at the surface under the hook line before the dive. */
const INTRO_S = 1.2;
/** Holding on the snailfish, and rushing back up. */
const PAYOFF_S = 3;
const REWIND_S = 1.8;
export const REWIND_FROM = LOOP_S - REWIND_S;

export const SNAILFISH_M = 8336;

/**
 * World y (px) → depth (m). A knot at each stop (STOP_METRES below), evenly
 * spaced so a stop shows only its own fish, and the snailfish further down.
 */
const STOP_GAP = 1600;
const KNOTS: readonly (readonly [number, number])[] = [
  [0, 0], [900, 10], [900 + STOP_GAP, 100], [900 + 2 * STOP_GAP, 500], [900 + 3 * STOP_GAP, 1500], [900 + 4 * STOP_GAP, 3000],
  [900 + 5 * STOP_GAP, 5000], [900 + 5 * STOP_GAP + 2000, SNAILFISH_M], [900 + 5 * STOP_GAP + 3400, 11000],
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

/** Smootherstep: starts and ends at rest, gentler than smoothstep. */
const smoother = (u: number): number => {
  const c = Math.max(0, Math.min(1, u));
  return c * c * c * (c * (c * 6 - 15) + 10);
};

/** Camera (screen-middle world y) that puts a depth at READ_Y. */
const cameraFor = (metres: number): number => yAt(metres) + CENTRE - READ_Y;
/** A glide between stops takes longer the further it goes. */
const glideTime = (from: number, to: number): number => 0.5 + Math.abs(to - from) / 2600;

/** Where the camera stops on the way down, in metres (the fish at each are listed below; each is a knot above). */
export const STOP_METRES: readonly number[] = KNOTS.slice(1, 7).map(([, m]) => m);

/** Camera keyframes: it holds still between consecutive keys at the same height and glides (smootherstep) between different ones. */
interface Key { readonly t: number; readonly y: number }

const PLAN = (() => {
  const heights = [...STOP_METRES.map(cameraFor), END];
  let at = START;
  const glides = heights.map((y) => {
    const d = glideTime(at, y);
    at = y;
    return d;
  });
  const hold = (REWIND_FROM - PAYOFF_S - INTRO_S - glides.reduce((a, b) => a + b, 0)) / STOP_METRES.length;
  const keys: Key[] = [{ t: 0, y: START }, { t: INTRO_S, y: START }];
  const holds: { readonly from: number; readonly to: number }[] = [];
  let t = INTRO_S;
  heights.forEach((y, i) => {
    t += glides[i]!;
    keys.push({ t, y });
    if (i < STOP_METRES.length) {
      holds.push({ from: t, to: t + hold });
      t += hold;
      keys.push({ t, y });
    }
  });
  keys.push({ t: REWIND_FROM, y: END }, { t: LOOP_S, y: START });
  return { keys, holds, hold, arrive: keys[keys.length - 3]!.t };
})();

/** The camera comes to rest on the snailfish here. */
export const ARRIVE_AT = PLAN.arrive;
/** How long the camera holds still at each stop, s. */
export const HOLD_S = PLAN.hold;
/** When the camera is still at each stop. */
export const STOP_HOLDS: readonly { readonly from: number; readonly to: number }[] = PLAN.holds;

/** World y at the middle of the screen. */
export function cameraAt(t: number): number {
  const keys = PLAN.keys;
  if (t <= 0) return START;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]!;
    const b = keys[i]!;
    if (t < b.t) return lerp(a.y, b.y, smoother((t - a.t) / (b.t - a.t)));
  }
  return START;
}

/** Screen y of world y at time t. */
export const toScreen = (y: number, t: number): number => y - cameraAt(t) + CENTRE;

/** The depth shown on the counter: at READ_Y, never above the surface. */
export const counterMetres = (t: number): number => Math.max(0, Math.round(metresAt(cameraAt(t) - CENTRE + READ_Y)));

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
  /** Which stop it is shown at (STOP_METRES). */
  readonly stop: number;
  /** Body length, px. */
  readonly length: number;
  /** 1 swims right, -1 left. */
  readonly dir: 1 | -1;
  /** Where it is on screen in the middle of its stop, px. */
  readonly x: number;
  readonly y: number;
  /** Swimming speed, px/s: slow, so it stays put enough to read. */
  readonly speed: number;
}

/** Real fish, two or three to a depth they really live at, top to bottom. */
export const SWIMMERS: readonly Swimmer[] = [
  { shape: 'clownfish', name: 'clownfish', stop: 0, length: 190, dir: 1, x: 330, y: 620, speed: 30 },
  { shape: 'garibaldi', name: 'garibaldi', stop: 0, length: 230, dir: -1, x: 760, y: 840, speed: 30 },
  { shape: 'parrotfish', name: 'parrotfish', stop: 0, length: 280, dir: 1, x: 380, y: 1080, speed: 35 },
  { shape: 'barracuda', name: 'barracuda', stop: 1, length: 400, dir: -1, x: 620, y: 650, speed: 45 },
  { shape: 'shark', name: 'reef shark', stop: 1, length: 470, dir: 1, x: 460, y: 1030, speed: 45 },
  { shape: 'lanternfish', name: 'lanternfish', stop: 2, length: 210, dir: 1, x: 360, y: 650, speed: 40 },
  { shape: 'barreleye', name: 'barreleye', stop: 2, length: 250, dir: -1, x: 720, y: 1010, speed: 25 },
  { shape: 'dragonfish', name: 'dragonfish', stop: 3, length: 330, dir: -1, x: 620, y: 650, speed: 35 },
  { shape: 'fangtooth', name: 'fangtooth', stop: 3, length: 250, dir: 1, x: 400, y: 1020, speed: 30 },
  { shape: 'seadevil', name: 'anglerfish', stop: 4, length: 300, dir: 1, x: 380, y: 660, speed: 25 },
  { shape: 'gulper', name: 'gulper eel', stop: 4, length: 460, dir: -1, x: 620, y: 1040, speed: 40 },
  { shape: 'cuskeel', name: 'cusk-eel', stop: 5, length: 380, dir: -1, x: 620, y: 650, speed: 35 },
  { shape: 'rattail', name: 'rattail', stop: 5, length: 340, dir: 1, x: 420, y: 1020, speed: 30 },
];

/** The depth a swimmer is shown at, m. */
export const swimmerMetres = (s: Swimmer): number => STOP_METRES[s.stop]!;

/**
 * When the swimmers' clocks wrap: as the rush back up starts, with the
 * camera on the snailfish and every swimmer far off screen, so the ones near
 * the surface are back where they started by the loop point.
 */
export const WRAP_AT = REWIND_FROM;
const swimClock = (t: number): number => (t >= WRAP_AT ? t - LOOP_S : t);

/** A swimmer's position on screen at time t: at (x, y) in the middle of its stop, drifting slowly along. */
export function swimmerAt(s: Swimmer, t: number): { readonly x: number; readonly y: number; readonly beat: number } {
  const hold = STOP_HOLDS[s.stop]!;
  const world = cameraFor(swimmerMetres(s)) + s.y - CENTRE;
  const clock = swimClock(t);
  const dt = clock - (hold.from + hold.to) / 2;
  return { x: s.x + s.dir * s.speed * dt, y: toScreen(world, t) + 10 * Math.sin(clock * 1.3 + s.stop * 2 + s.x), beat: 2 * Math.PI * 1.4 * clock };
}

export const SNAIL_LENGTH = 400;
const SNAIL_IN_FROM = ARRIVE_AT - 1.6;

/** The star: it glides in from the left as the camera slows, and hangs in the middle of the screen. */
export function snailfishAt(t: number): { readonly x: number; readonly y: number; readonly beat: number; readonly tilt: number } {
  const come = smooth((t - SNAIL_IN_FROM) / 2.4);
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
  { text: 'how deep do fish', y: 330, size: 112, weight: 700, from: -0.6, to: INTRO_S + 0.4 },
  { text: 'actually live?', y: 445, size: 112, weight: 700, from: -0.6, to: INTRO_S + 0.4 },
];

/** The payoff, under the snailfish. */
export const PAYOFF_CAPTIONS: readonly Caption[] = [
  { text: 'the deepest fish ever filmed', y: 960, size: 84, weight: 700, from: ARRIVE_AT - 0.3, to: REWIND_FROM + 0.2 },
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
