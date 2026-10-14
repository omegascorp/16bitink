import type { Key } from '../short';
import { FRAME } from './frame';
import { sectionEnd, sectionStart, T } from './timeline';

/**
 * The dive: one tall world, world y in px (0 at the sea surface, down is
 * positive), mapped to real depth through a knot per zone boundary, so each
 * of the game's ten zones gets a band of the same height and the deep isn't
 * all black water. The camera is the world y at the middle of the picture.
 */

/** Depth (m) → world y (px) at each zone boundary of the game (src/levels/zones.ts), and the record and the trench floor. */
export const KNOTS: readonly (readonly [number, number])[] = [
  [0, 0], [5, 1300], [15, 2700], [30, 4100], [50, 5500], [120, 6900], [200, 8300],
  [1000, 10300], [4000, 12300], [6000, 14300], [8336, 16300], [11000, 17500],
];

export function yAt(metres: number): number {
  if (metres <= 0) return metres * (KNOTS[1]![1] / KNOTS[1]![0]);
  for (let i = 1; i < KNOTS.length; i++) {
    const [m0, y0] = KNOTS[i - 1]!;
    const [m1, y1] = KNOTS[i]!;
    if (metres <= m1 || i === KNOTS.length - 1) return y0 + ((metres - m0) / (m1 - m0)) * (y1 - y0);
  }
  throw new Error('unreachable');
}

export function metresAt(y: number): number {
  if (y <= 0) return y * (KNOTS[1]![0] / KNOTS[1]![1]);
  for (let i = 1; i < KNOTS.length; i++) {
    const [m0, y0] = KNOTS[i - 1]!;
    const [m1, y1] = KNOTS[i]!;
    if (y <= y1 || i === KNOTS.length - 1) return m0 + ((y - y0) / (y1 - y0)) * (m1 - m0);
  }
  throw new Error('unreachable');
}

/** The record (the snailfish, 2022) and the line fish shouldn't cross (~8,200 m). */
export const RECORD_M = 8336;
export const LINE_M = 8200;
/** The tide pool's floor, the shelf's edge, the abyssal plain's mud and where the trench opens in it. */
export const POOL_FLOOR_M = 2.5;
export const SHELF_EDGE_M = 150;
export const PLAIN_M = 5200;

// ---------------------------------------------------------------- the camera

const CENTRE = FRAME.height / 2;
/** Camera that puts world y at screen height `screenY`. */
const putting = (y: number, screenY: number): number => y - screenY + CENTRE;

/** Camera keys (world y at the middle of the picture). Hermite through them: a key with rate 0 is a stop. */
const KEYS: readonly Key[] = (() => {
  const k = (t: number, at: number, rate?: number): Key => (rate === undefined ? { t, at } : { t, at, rate });
  const s = sectionStart;
  const e = sectionEnd;
  return [
    // The cold open: deep, then the plunge to the line, under it, then the rush back up to the surface.
    k(0, yAt(1000), 0),
    k(T.keepGoing, yAt(1000), 0),
    k(T.theyStop + 0.4, putting(yAt(LINE_M), 760), 0),
    k(T.in2022, putting(yAt(LINE_M), 760), 0),
    k(T.swam - 0.3, putting(yAt(RECORD_M), 600), 0),
    k(T.toSee + 0.2, putting(yAt(RECORD_M), 600), 0),
    k(T.puddle - 0.1, putting(0, 250), 0),
    // 1 · tide pool: the surface high in the picture, the pool's floor low.
    k(e(1) + 0.3, putting(0, 230)),
    // 2–6 · drifting down a little through each stop, gliding between them.
    k(s(2), 2000), k(e(2), 2250),
    k(s(3), 3350), k(e(3), 3650),
    k(s(4), 4750), k(e(4), 5050),
    k(s(5), 6050), k(e(5), 6300),
    k(s(6), 6950), k(T.shelf, putting(yAt(SHELF_EDGE_M), 560)), k(e(6), 8050),
    // 7 · the game card covers the picture; under it the camera reaches 200 m.
    k(T.lightsOff, yAt(200) + 100, 0),
    // 8–9 · the twilight and the midnight zone.
    k(s(8), yAt(200) + 300), k(e(8), 10000),
    k(s(9), 10550), k(e(9), 12000),
    // 10 · down to the abyssal plain, resting just over the mud.
    k(s(10), 12550), k(T.tripodfish, putting(yAt(PLAIN_M), 900), 0), k(e(10) + 0.6, putting(yAt(PLAIN_M), 900), 0),
    // 11 · into the trench, slowly to the line, then the last stretch to the record.
    k(T.hadal, putting(yAt(PLAIN_M), 620)),
    k(T.pressureWins, yAt(6600)),
    k(T.around8200, putting(yAt(LINE_M), 700)),
    k(T.thatsTheLine + 1, putting(yAt(LINE_M), 560), 0),
    k(T.lowered, putting(yAt(LINE_M), 560), 0),
    k(T.payoff, putting(yAt(RECORD_M), 600), 0),
    // 12 · the reveal; a look below it; back to the snailfish.
    k(T.belowIt, putting(yAt(RECORD_M), 600), 0),
    k(T.noMoreFish + 0.4, putting(yAt(RECORD_M), 260), 0),
    k(T.beThisFish + 0.2, putting(yAt(RECORD_M), 600), 0),
    k(T.end, putting(yAt(RECORD_M), 600), 0),
  ];
})();

/**
 * Each key's rate: its own if it gives one, else the Fritsch–Carlson
 * monotone choice, so the camera never overshoots a key (a long hold
 * before a fast glide would otherwise swing it back up first).
 */
const RATES: readonly number[] = (() => {
  const n = KEYS.length;
  const slope = (i: number): number => (KEYS[i + 1]!.at - KEYS[i]!.at) / (KEYS[i + 1]!.t - KEYS[i]!.t);
  return KEYS.map((k, i) => {
    if (k.rate !== undefined) return k.rate;
    if (i === 0 || i === n - 1) return 0;
    const a = slope(i - 1);
    const b = slope(i);
    if (a * b <= 0) return 0;
    // Weighted harmonic mean of the neighbouring slopes (Fritsch–Butland): never more than three times either.
    const h0 = KEYS[i]!.t - KEYS[i - 1]!.t;
    const h1 = KEYS[i + 1]!.t - KEYS[i]!.t;
    const w0 = 2 * h1 + h0;
    const w1 = h1 + 2 * h0;
    return (w0 + w1) / (w0 / a + w1 / b);
  });
})();

function curve(t: number): { readonly at: number; readonly rate: number } {
  const time = Math.min(Math.max(t, KEYS[0]!.t), KEYS[KEYS.length - 1]!.t);
  let i = 0;
  while (i < KEYS.length - 2 && time > KEYS[i + 1]!.t) i++;
  const k0 = KEYS[i]!;
  const k1 = KEYS[i + 1]!;
  const h = k1.t - k0.t;
  const m0 = RATES[i]!;
  const m1 = RATES[i + 1]!;
  const s = (time - k0.t) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  return {
    at: (2 * s3 - 3 * s2 + 1) * k0.at + (s3 - 2 * s2 + s) * h * m0 + (-2 * s3 + 3 * s2) * k1.at + (s3 - s2) * h * m1,
    rate: ((6 * s2 - 6 * s) * k0.at + (-6 * s2 + 6 * s) * k1.at) / h + (3 * s2 - 4 * s + 1) * m0 + (3 * s2 - 2 * s) * m1,
  };
}

/** World y at the middle of the picture. The cuts (the cold open's montage, the game card) draw over it. */
export function cameraAt(t: number): number {
  return curve(t).at;
}

/** How fast the camera moves, world px/s (for streaking the snow). */
export function cameraSpeed(t: number): number {
  return curve(t).rate;
}

/** Screen y of world y. */
export const toScreen = (y: number, t: number): number => y - cameraAt(t) + CENTRE;

/** The depth the counter reads: a little below the middle of the picture, where the fish swim (never above the surface). */
export const READ_Y = 600;
export const depthAt = (t: number): number => Math.max(0, metresAt(cameraAt(t) + READ_Y - CENTRE));

// ---------------------------------------------------------------- the water

/** How dark the water is at a depth, 0 sunlit paper .. 1 black. */
export function darknessAt(metres: number): number {
  if (metres <= 0) return 0;
  return Math.min(1, 1 - Math.exp(-metres / 260)) * (0.86 + 0.14 * Math.min(1, Math.max(0, (metres - 1000) / 7336)));
}

/** The three dials, 0 .. 1: sunlight left, food (plenty → scraps) and pressure (atm, 1 at the surface). */
export const lightAt = (metres: number): number => Math.exp(-Math.max(0, metres) / 45);
export const foodAt = (metres: number): number => (metres < 200 ? 1 - 0.25 * (metres / 200) : 0.75 * Math.exp(-(metres - 200) / 900) + 0.03);
export const atmAt = (metres: number): number => 1 + Math.max(0, metres) / 10;
