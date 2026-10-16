import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, curveAt, type Key, lerp, ramp, smooth, window01 } from '../short';
import { TEMPO, WORDS } from './words';

/**
 * "Nobody has ever seen eels mate in the wild": in 1876, aged 19, Sigmund
 * Freud worked at the marine station in Trieste and dissected about 400
 * eels looking for testes; every one he opened was female. European eels
 * migrate thousands of kilometres to the Sargasso Sea to spawn, and nobody
 * has ever watched them do it (satellite tags in 2022 only tracked them
 * there). Told by a narrator (words.ts), every beat timed to the words, a
 * function of time in seconds over a loop of LOOP_S.
 *
 *   0     the deep: two of the game's eels circle a big "?", under a
 *         crossed-out eye, "eels mating: never seen"
 *   2.4   "Sigmund Freud…": his lab, a young bearded man at a bench with a
 *         microscope; "…tried to solve it": a "?" by his head
 *   4.4   "In 1876": chalked on the board, "1876 · Trieste"
 *   5.6   "…about FOUR HUNDRED eels": specimen jars fill the shelves as the
 *         chalked count ticks up to 400 (nothing cut open on screen)
 *   7.7   "…looking for a male": a magnifier with a ♂ sweeps the jars
 *   8.9   "Every single one was female": ♀ tags stamp onto the jars
 *   10.6  "Eels swim thousands of kilometres…": an ink map, a dotted route
 *         from Europe across the Atlantic to the Sargasso Sea, eels on it
 *   14.2  "…and there, they vanish": the map sinks into the deep blue
 *   16.0  "A hundred and fifty years later, still…": the year rolls from
 *         1876 to 2026, and the eels circle again as the loop comes round.
 */
export const LOOP_S = 18;

/** The line boil steps at the game's 8 a second: 144 steps, 48 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const EVER_AT = said('EVER');
export const SIGMUND_AT = said('Sigmund');
export const FREUD_AT = said('Freud');
export const SOLVE_AT = said('solve');
export const IN_AT = said('In');
export const YEAR_AT = said('1876,');
export const CUT_AT = said('cut');
export const FOUR_AT = said('FOUR');
export const HUNDRED_AT = said('HUNDRED');
export const JAR_EELS_AT = said('eels,');
export const LOOKING_AT = said('looking');
export const MALE_AT = said('male.');
export const EVERY_AT = said('Every');
export const FEMALE_AT = said('female.');
export const SWIM_EELS_AT = said('Eels');
export const THOUSANDS_AT = said('thousands');
export const SARGASSO_AT = said('Sargasso');
export const BREED_AT = said('breed…');
export const THERE_AT = said('there,');
export const THEY_AT = said('they');
export const VANISH_AT = said('vanish.');
export const A_AT = said('A');
export const LATER_AT = said('later,');
export const STILL_AT = said('still…');

// ---------------------------------------------------------------- the three scenes

/** The lab comes in on "Sigmund" and gives way to the map just before "Eels swim". */
export const LAB_IN = SIGMUND_AT - 0.25;
export const LAB_OUT = SWIM_EELS_AT - 0.3;
const FADE_S = 0.3;

/** How much of the lab shows, 0 .. 1. */
export const labAt = (t: number): number => window01(t, LAB_IN, LAB_OUT + FADE_S, FADE_S);

/** How much of the map shows: in as the lab goes, sinking away on "vanish". */
export const mapAt = (t: number): number => Math.min(ramp(t, LAB_OUT, LAB_OUT + FADE_S), 1 - ramp(t, VANISH_AT - 0.1, VANISH_AT + 0.6));

/** The deep water's wash: there through the loop point, gone as the lab comes in, rising again as the eels vanish. */
export const deepAt = (t: number): number => (t < LOOP_S / 2 ? 1 - ramp(t, LAB_IN, LAB_IN + FADE_S) : ramp(t, VANISH_AT - 0.2, VANISH_AT + 0.5));

// ---------------------------------------------------------------- the hook: two eels circling a "?"

/** One fish on screen (face passes through 0 as it turns side-on; -1 left .. 1 right). */
export interface Fish {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly face: number;
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
  readonly alpha: number;
}

/** The circle the pair swim round, seen from a little above: a flat ellipse round the "?". */
export const RING = { x: 540, y: 800, rx: 320, ry: 115 } as const;
export const PAIR_LEN = 440;
/** Three laps a loop (one every 6 s), and about two tail beats a second. */
const LAPS = 3;
const BEATS = 36;

/** The pair's visibility: gone as the lab comes in, back from the deep on "still…". */
export const pairAt = (t: number): number => (t < LOOP_S / 2 ? 1 - ramp(t, LAB_IN - 0.05, LAB_IN + 0.25) : ramp(t, STILL_AT - 0.6, STILL_AT + 0.25));

/** Eel k (0 or 1) of the pair: half a lap apart, each chasing the other round the ring. */
export function pairEel(k: number, t: number): Fish {
  const a = (2 * Math.PI * LAPS * t) / LOOP_S + Math.PI * k + 1.1;
  const s = Math.sin(a);
  const near = s;
  return {
    x: RING.x + RING.rx * Math.cos(a),
    y: RING.y + RING.ry * s + 10 * Math.sin(2 * a),
    len: PAIR_LEN * (1 + 0.12 * near),
    // Swimming left along the near side, right along the far side: side-on to us at the ends of the ring.
    face: -Math.sign(s) * Math.abs(s) ** 0.6,
    tilt: -0.28 * Math.cos(a),
    beat: (2 * Math.PI * BEATS * t) / LOOP_S + k * 2,
    effort: 0.55,
    alpha: pairAt(t) * (0.82 + 0.18 * near),
  };
}

/** The hook's signs: the crossed-out eye, "never seen" and the "?", there with the pair. */
export const hookAt = (t: number): number => (t < LOOP_S / 2 ? 1 - ramp(t, LAB_IN - 0.05, LAB_IN + 0.25) : ramp(t, STILL_AT - 0.05, STILL_AT + 0.3));

// ---------------------------------------------------------------- the lab

/** "1876 · Trieste" chalked on the board as the year is said: how much of it is written, 0 .. 1. */
export const CHALK_FROM = YEAR_AT - 0.05;
/** Done by "he" (this read says the year and runs straight on). */
export const CHALK_TO = Math.min(YEAR_AT + 1.15, said('he'));
export const chalkWritten = (t: number): number => clamp01((t - CHALK_FROM) / (CHALK_TO - CHALK_FROM));

/** The jars: three shelves of five. */
export const JAR_ROWS = 3;
export const JAR_COLS = 5;
export const JARS = JAR_ROWS * JAR_COLS;
export const JAR_COUNT = 400;

/** The chalked count ticks up from "cut" and lands on 400 as "eels" is said, slowing as it goes. */
const COUNT_FROM = CUT_AT;
const COUNT_TO = JAR_EELS_AT + 0.05;
export function countAt(t: number): number {
  const u = clamp01((t - COUNT_FROM) / (COUNT_TO - COUNT_FROM));
  return Math.round(JAR_COUNT * (1 - (1 - u) ** 2));
}
/** Jar k goes up on the shelf as the count passes its share. */
export const JAR_AT: readonly number[] = Array.from({ length: JARS }, (_, k) => COUNT_FROM + (COUNT_TO - COUNT_FROM) * (1 - Math.sqrt(1 - (k + 1) / JARS)));

/** The magnifier sweeps the jars from "looking" until "Every". */
export const MAG_IN = LOOKING_AT - 0.2;
export const MAG_OUT = EVERY_AT;
export const magAt = (t: number): number => window01(t, MAG_IN, MAG_OUT, 0.2);
const MAG_X: readonly Key[] = [
  { t: MAG_IN, at: 1120, rate: -900 },
  { t: MAG_IN + 0.35, at: 900 },
  { t: MALE_AT, at: 690 },
  { t: MALE_AT + 0.35, at: 820 },
  { t: MAG_OUT, at: 960, rate: 300 },
];
const MAG_Y: readonly Key[] = [
  { t: MAG_IN, at: 860, rate: 0 },
  { t: MAG_IN + 0.35, at: 690 },
  { t: MALE_AT, at: 830 },
  { t: MALE_AT + 0.35, at: 980 },
  { t: MAG_OUT, at: 860, rate: -300 },
];
/** Where the magnifier's lens is. */
export const magPos = (t: number): { readonly x: number; readonly y: number } => ({ x: curveAt(MAG_X, t).at, y: curveAt(MAG_Y, t).at });

/** The ♀ tags: one per jar, from "Every" to just after "female", the first few slow, then faster and faster. */
export const TAG_AT: readonly number[] = Array.from({ length: JARS }, (_, k) => EVERY_AT - 0.02 + (FEMALE_AT + 0.25 - EVERY_AT) * (k / (JARS - 1)) ** 1.4);

/** A pop: 0 → 1 with a little overshoot over `s` seconds from `at`. */
export const popIn = (t: number, at: number, s = 0.2): number => {
  const u = clamp01((t - at) / s);
  return u >= 1 ? 1 : u * (1 + 0.6 * Math.sin(Math.PI * u));
};

/** Freud's slight sway as he works: whole cycles a loop. */
export const swayAt = (t: number): number => Math.sin((2 * Math.PI * 4 * t) / LOOP_S);

// ---------------------------------------------------------------- the map

/** The map's projection: longitude and latitude (degrees) to px, Europe on the right, the Caribbean on the left. */
export const project = (lon: number, lat: number): { readonly x: number; readonly y: number } => ({ x: (lon + 90) * 9.82, y: 1110 - (lat - 8) * 13 });

/** The Sargasso Sea: an oval round 27°N, 55°W. */
export const SARGASSO = { ...project(-55, 27), rx: 150, ry: 92 } as const;

/** The route: a cubic Bézier from the mouth of the Loire, out across the Atlantic, down to the Sargasso. */
const ROUTE = [project(-2.4, 47.2), project(-20, 46), project(-36, 24), SARGASSO] as const;
export function routeAt(s: number): { readonly x: number; readonly y: number; readonly dx: number; readonly dy: number } {
  const [p0, p1, p2, p3] = ROUTE;
  const u = clamp01(s);
  const v = 1 - u;
  const at = (a: number, b: number, c: number, d: number): number => v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d;
  const slope = (a: number, b: number, c: number, d: number): number => 3 * v * v * (b - a) + 6 * v * u * (c - b) + 3 * u * u * (d - c);
  return { x: at(p0.x, p1.x, p2.x, p3.x), y: at(p0.y, p1.y, p2.y, p3.y), dx: slope(p0.x, p1.x, p2.x, p3.x), dy: slope(p0.y, p1.y, p2.y, p3.y) };
}

/** The dotted route draws itself out ahead of the eels, from "Eels" to "Sargasso". */
export const routeDrawn = (t: number): number => ramp(t, SWIM_EELS_AT - 0.1, SARGASSO_AT + 0.2);

/** The migrating eels: three, a little apart, setting off on "Eels", arriving on "breed". */
export const MIGRANTS = 3;
export const MIGRANT_LEN = 130;
const SET_OFF = SWIM_EELS_AT - 0.05;
const ARRIVE = BREED_AT + 0.25;

export function migrantAt(k: number, t: number): Fish {
  const from = SET_OFF + 0.18 * k;
  const to = ARRIVE + 0.12 * k;
  const u = clamp01((t - from) / (to - from));
  // Easing out of the river and into the oval.
  const s = smooth(u);
  const p = routeAt(s);
  const n = Math.hypot(p.dx, p.dy) || 1;
  const side = (k - 1) * 22;
  // Once there, they mill about in the oval.
  const mill = ramp(t, to - 0.2, to + 0.6);
  const a = (2 * Math.PI * 3 * t) / LOOP_S + k * 2.1;
  return {
    x: p.x - (p.dy / n) * side + mill * 45 * Math.cos(a),
    y: p.y + (p.dx / n) * side + mill * 22 * Math.sin(a),
    len: MIGRANT_LEN,
    face: -1,
    tilt: -0.7 * Math.atan2(p.dy, Math.abs(p.dx)) * (1 - mill),
    beat: (2 * Math.PI * 48 * t) / LOOP_S + k,
    effort: 0.6,
    alpha: mapAt(t) * ramp(t, SET_OFF - 0.1, SET_OFF + 0.25) * (1 - ramp(t, THEY_AT, VANISH_AT + 0.35)),
  };
}

/** The camera sinks into the Sargasso on "there, they vanish": the zoom, and how far the oval has moved to the middle. */
export function mapZoomAt(t: number): { readonly scale: number; readonly toMiddle: number } {
  const u = ramp(t, THERE_AT, VANISH_AT + 0.6);
  return { scale: lerp(1, 2.6, u ** 1.4), toMiddle: u };
}
export const MAP_MIDDLE = { x: 540, y: 700 } as const;

// ---------------------------------------------------------------- 150 years later

/** The year rolls from 1876 on "A hundred…", landing on 2026 just after "later". */
export const ROLL_FROM = A_AT;
export const ROLL_TO = LATER_AT + 0.15;
export const yearAt = (t: number): number => Math.round(1876 + 150 * ramp(t, ROLL_FROM, ROLL_TO));
/** The rolling year shows from "A hundred…" until "still…", where the hook's signs take its place. */
export const yearShown = (t: number): number => window01(t, ROLL_FROM - 0.15, STILL_AT - 0.05, 0.25);
