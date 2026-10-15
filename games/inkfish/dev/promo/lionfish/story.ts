import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, curveAt, type Key, lerp, ramp, smooth, window01 } from '../short';
import type { Fish } from './fish';
import { TEMPO, WORDS } from './words';

/**
 * "To save the reef… EAT this fish": lionfish, native to the Indo-Pacific,
 * were first recorded off Florida in 1985 and now range from the Carolinas
 * to Brazil, with few predators there. On small patch reefs in the Bahamas
 * one lionfish cut the young native fish settling there by 79% in five weeks
 * (Albins & Hixon 2008, MEPS 367). The spines are venomous; the meat is safe
 * to eat. Told by a narrator (words.ts) over one reef, every beat timed to
 * the words, a function of time in seconds over a loop of LOOP_S.
 *
 *   0     the lionfish sucks in a little chromis under a sign: a fork, a
 *         knife and "EAT this fish"; the fork and knife jab on "EAT"
 *   2.6   "Lionfish come from the Pacific and Indian Oceans…": a sketched
 *         world map unfolds (map.ts), its home oceans hatched as they're
 *         named; "since the 1980s": an arrow to Florida, "1985"; "spread
 *         through the Atlantic, from the Carolinas to Brazil": the map zooms
 *         in and red dots spread north and south as the places are said
 *   9.6   "Almost nothing there eats them": a grouper comes for it, its spines
 *         flare, "?", and the grouper backs off
 *   11.7  "On a small reef, one lionfish…": a school of young fish over the
 *         reef; the lionfish sweeps through them, gulping (school.ts), a
 *         counter falling to −79% on "EIGHTY", the calendar to five weeks
 *   16.6  "Its spines are venomous": they glow red. "…but its meat is safe":
 *         a chef's sign, "safe to eat". "So,": the sign flips back to "EAT
 *         this fish" as the next chromis is sucked in, finishing the sentence.
 */
export const LOOP_S = 19.5;

/** The line boil steps at the game's 8 a second: 156 steps, 52 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
/** Time since `at`, folded into (-LOOP_S/2, LOOP_S/2]: negative before it. */
export const since = (t: number, at: number): number => wrap(t - at + LOOP_S / 2) - LOOP_S / 2;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const EAT_AT = said('EAT');
export const LIONFISH_AT = said('Lionfish');
export const ALMOST_AT = said('Almost');
export const NOTHING_AT = said('nothing');
export const THERE_AT = said('there');
export const EATS_AT = said('eats');
export const SMALL_AT = said('small');
export const ONE_AT = said('one');
export const YOUNG_AT = said('young');
export const EIGHTY_AT = said('EIGHTY');
export const FIVE_AT = said('five');
export const WEEKS_AT = said('weeks.');
export const SPINES_AT = said('spines');
export const VENOMOUS_AT = said('venomous,');
export const MEAT_AT = said('meat');
export const SAFE_AT = said('safe.');
export const SO_AT = said('So,');

/** A value keyed through the loop that comes round smoothly: keys in [0, LOOP_S), the last running on into the first. */
function looped(keys: readonly Key[]): (t: number) => number {
  const eased = keys.map((k) => ({ ...k, rate: k.rate ?? 0 }));
  const ext = [
    ...eased.slice(-2).map((k) => ({ ...k, t: k.t - LOOP_S })),
    ...eased,
    ...eased.slice(0, 2).map((k) => ({ ...k, t: k.t + LOOP_S })),
  ];
  return (t: number) => curveAt(ext, wrap(t)).at;
}

/** 0 → 1 → 0 over [from, to]. */
const bump = (t: number, from: number, to: number): number => (t <= from || t >= to ? 0 : Math.sin((Math.PI * (t - from)) / (to - from)));

// ---------------------------------------------------------------- the map card

/** The map unfolds as the narrator says "Lionfish", and folds away after "Brazil". */
export const CARD_IN = LIONFISH_AT - 0.25;
export const CARD_OUT = said('Brazil.') + 0.8;
export const cardAt = (t: number): number => window01(t, CARD_IN, CARD_OUT, 0.3);

// ---------------------------------------------------------------- the lionfish

/** Where it hovers over the reef, facing left, its fins fanned out below it. */
export const HOME = { x: 680, y: 735 } as const;
export const LION_LEN = 460;

/** Its sweep through the young fish: left, turn, back right (the gulps are in school.ts), turn, home. */
export const SWEEP_FROM = ONE_AT - 0.1;
export const TURN1_AT = SWEEP_FROM + 0.85;
export const TURN_S = 0.3;
/** The last young fish goes down just before "EIGHTY". */
export const LAST_GULP = EIGHTY_AT - 0.05;
const RIGHT_END = LAST_GULP + 0.05;
const TURN2_AT = RIGHT_END + 0.1;
const SETTLED_AT = RIGHT_END + 1.5;

const lionX = looped([
  { t: 1, at: HOME.x },
  { t: SWEEP_FROM, at: HOME.x },
  { t: TURN1_AT, at: 445, rate: -150 },
  { t: TURN1_AT + TURN_S, at: 430, rate: 105 },
  { t: RIGHT_END, at: 655, rate: 150 },
  { t: TURN2_AT + TURN_S, at: 675 },
  { t: SETTLED_AT, at: HOME.x },
]);
const lionY = looped([
  { t: 1, at: HOME.y },
  { t: SWEEP_FROM, at: HOME.y },
  { t: (SWEEP_FROM + TURN1_AT) / 2, at: 705 },
  { t: TURN1_AT + TURN_S / 2, at: 735 },
  { t: (TURN1_AT + RIGHT_END) / 2 + 0.15, at: 700 },
  { t: RIGHT_END, at: 735 },
  { t: SETTLED_AT, at: HOME.y },
]);

/** The chromis it sucks in across the loop point: in from the left as the narrator says "meat", sucked in after "So,", gulped at MEAL_GULP. */
export const MEAL = { x: 290, y: 775, len: 110 } as const;
const MEAL_IN = MEAT_AT - 0.35;
export const MEAL_SUCK_S = 0.6;
export const MEAL_SUCK_FROM = LOOP_S - 0.27;
export const MEAL_GULP = wrap(MEAL_SUCK_FROM + MEAL_SUCK_S);

/** Each gulp's jaw: open over `open` s before `at`, snapped shut just after, then (for a real meal) two chews. */
function gulpJaw(t: number, at: number, open: number, peak: number, chews: boolean): number {
  const d = since(t, at);
  if (d >= -open && d < 0) return peak * ramp(d, -open, -open + Math.min(0.15, open * 0.6));
  if (d >= 0 && d < 0.07) return peak * (1 - ramp(d, 0, 0.07));
  return chews ? Math.max(0.2 * bump(d, 0.16, 0.28), 0.14 * bump(d, 0.34, 0.44)) : 0;
}

/** Gulp times of the young fish (school.ts sets them; the lionfish only opens its mouth for them). */
export interface LionfishMeals {
  readonly gulps: readonly number[];
}

export function lionfishAt(t: number, meals: LionfishMeals): Fish {
  const moving = window01(t, SWEEP_FROM, RIGHT_END + 0.5, 0.25);
  const face = -1 + 2 * ramp(t, TURN1_AT, TURN1_AT + TURN_S) - 2 * ramp(t, TURN2_AT, TURN2_AT + TURN_S);
  const snack = Math.max(0, ...meals.gulps.map((g) => gulpJaw(t, g, 0.14, 0.75, false)));
  const meal = gulpJaw(t, MEAL_GULP, MEAL_SUCK_S + 0.12, 0.9, true);
  // The meal across the loop point swells its cheeks; the young fish fatten it up, one by one.
  const fed = 0.6 * ramp(since(t, MEAL_GULP), 0, 0.2) * (1 - ramp(since(t, MEAL_GULP), 0.5, 1.4));
  const school = Math.min(0.75, 0.07 * meals.gulps.filter((g) => t >= g).length) * (1 - ramp(t, SETTLED_AT, SETTLED_AT + 1));
  return {
    x: lionX(t),
    y: lionY(t) + 8 * Math.sin((2 * Math.PI * 3 * t) / LOOP_S),
    len: LION_LEN,
    face,
    tilt: 0.03 * Math.sin((2 * Math.PI * 2 * t) / LOOP_S + 0.5),
    beat: (2 * Math.PI * 26 * t) / LOOP_S,
    effort: 0.25 + 0.55 * moving,
    jaw: Math.max(snack, meal),
    lump: Math.max(fed, school),
    alpha: 1,
  };
}

/** The chromis from when it swims in until it's gone down (null otherwise), held where the suction took it. */
export function mealAt(t: number): Fish | null {
  const life = wrap(t - MEAL_IN);
  const taken = wrap(MEAL_SUCK_FROM - MEAL_IN);
  if (life >= taken + MEAL_SUCK_S) return null;
  const a = Math.min(life, taken);
  const u = smooth(a / 1.1);
  return {
    x: lerp(-130, MEAL.x, u),
    y: MEAL.y + 10 * Math.sin(a * 2.1),
    len: MEAL.len,
    face: 1,
    tilt: 0.05,
    beat: a * 12,
    effort: 0.3 + 0.4 * (1 - u),
    jaw: 0,
    lump: 0,
    alpha: 1,
  };
}

/** How far the chromis has been dragged into the lionfish's mouth, 0 .. 1 (null when it isn't). */
export function mealEatenAt(t: number): number | null {
  const u = wrap(t - MEAL_SUCK_FROM) / MEAL_SUCK_S;
  return u < 1 ? u : null;
}

/** Its "!" as the lionfish's mouth opens on it, from "So," until it's in. */
export const mealAlarm = (t: number): number => window01(wrap(t - SO_AT), 0, wrap(MEAL_GULP - SO_AT) - 0.15, 0.08);

/** Water rushing into the open mouth while the chromis goes in. */
export const suctionAt = (t: number): number => window01(wrap(t - MEAL_SUCK_FROM + 0.1), 0, MEAL_SUCK_S + 0.1, 0.12);
/** The ink burst of the gulp, 0 .. 1 over its life. */
export const chompAt = (t: number): number => since(t, MEAL_GULP) / 0.16;

// ---------------------------------------------------------------- the grouper

/** It swims in after "Almost", noses up to the lionfish on "nothing there", flinches at the spines, backs off on "eats them" and leaves. */
export const GROUPER_IN = ALMOST_AT - 0.3;
export const GROUPER_LEN = 440;
const G_OUT = 3.1;
const G_TURN = EATS_AT - GROUPER_IN + 0.55;

const G_X: readonly Key[] = [
  { t: 0, at: -330, rate: 520 },
  { t: NOTHING_AT - GROUPER_IN + 0.3, at: 140, rate: 60 },
  { t: EATS_AT - GROUPER_IN, at: 160, rate: 0 },
  { t: G_TURN, at: 40, rate: -200 },
  { t: G_OUT, at: -420, rate: -520 },
];

export function grouperAt(t: number): Fish | null {
  const b = t - GROUPER_IN;
  if (b < 0 || b >= G_OUT) return null;
  const x = curveAt(G_X, b);
  const reach = THERE_AT - GROUPER_IN;
  return {
    x: x.at,
    y: 615 + 6 * Math.sin(b * 3) + 14 * ramp(b, reach, reach + 0.4),
    len: GROUPER_LEN,
    face: 1 - 2 * ramp(b, G_TURN, G_TURN + 0.3),
    tilt: -0.04 + 0.1 * bump(b, reach, reach + 0.9),
    beat: 2 * Math.PI * 1.6 * b,
    effort: 0.3 + 0.6 * ramp(Math.abs(x.rate), 80, 500),
    jaw: 0.45 * ramp(b, reach - 0.5, reach - 0.15) * (1 - ramp(b, reach + 0.05, reach + 0.15)),
    lump: 0,
    alpha: 1,
  };
}

/** The "?" over the grouper, from "there" until it turns away. */
export const puzzledAt = (t: number): number => window01(t, THERE_AT - 0.05, GROUPER_IN + G_TURN + 0.25, 0.12);
/** "grouper", over it as it comes in. */
export const grouperLabel = (t: number): number => window01(t, GROUPER_IN + 0.35, EATS_AT + 0.4, 0.2);

// ---------------------------------------------------------------- spines, meat and the sign

/** How hard the spines glow red, 0 .. 1: a flare at the grouper, and from "spines" to "So,". */
export const spinesAt = (t: number): number =>
  Math.max(0.75 * window01(t, THERE_AT - 0.25, EATS_AT + 0.5, 0.15), window01(t, SPINES_AT - 0.05, SO_AT + 0.1, 0.2));
/** "venomous spines", on "venomous". */
export const venomLabel = (t: number): number => window01(t, VENOMOUS_AT - 0.05, SO_AT + 0.1, 0.2);
/** A dashed ring round its body on "meat". */
export const meatAt = (t: number): number => window01(t, MEAT_AT - 0.05, SO_AT + 0.15, 0.2);

/** The sign up top left: "safe to eat" from "safe", flipping to "EAT this fish" on "So,", folded away as the map comes. */
export function signAt(t: number): { readonly shown: number; readonly face: 'eat' | 'safe'; readonly width: number } {
  if (t < LOOP_S / 2) return { shown: 1 - ramp(t, CARD_IN - 0.2, CARD_IN + 0.1), face: 'eat', width: 1 };
  const u = clamp01((t - SO_AT - 0.05) / 0.36);
  return { shown: ramp(t, SAFE_AT - 0.08, SAFE_AT + 0.18), face: u < 0.5 ? 'safe' : 'eat', width: Math.abs(Math.cos(Math.PI * u)) };
}

/** The fork and knife stab at the lionfish on "EAT". */
export const jabAt = (t: number): number => bump(t, EAT_AT - 0.05, EAT_AT + 0.4);
