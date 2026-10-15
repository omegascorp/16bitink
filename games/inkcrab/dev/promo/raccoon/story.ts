import { clamp01, curveAt, type Key, lerp, ramp, window01 } from '../short';
import type { Pt } from '../../../src/art/pen';
import { noseAt, type RaccoonPose } from './raccoonArt';
import { POOL, poolFloor } from './scene';
import { inVoice, WORDS } from './words';

/**
 * "Raccoons aren't washing their food": the dunking and rubbing (dousing)
 * happens even with clean food and in captivity, so it isn't cleaning; their
 * hands are packed with touch receptors, and wetting them makes those nerves
 * more responsive (Somatosensory Research, 1986), so they're feeling what
 * they caught. Told by a narrator (words.ts) at a tidepool on the kelp beach
 * by night, every beat timed to the words, a function of time in seconds
 * over a loop of LOOP_S.
 *
 *   0     the raccoon crouched at the pool, hands in the water rubbing a
 *         clam; "washing?" crossed out (✗ jolts on "AREN'T")
 *   2.2   "They dunk it in water": up and splash; "and rub it between their
 *         paws": rubbing, "water" and "paws" labelled; Procyon lotor, "washer"
 *   4.8   "even when the food is already clean": the clam lifted out, a
 *         sparkle and "already clean ✓" on "clean", then dunked anyway
 *   6.9   the payoff: a magnifier on its paw, "packed" with nerve endings
 *         that light up on "touch nerves"; on "and wet paws feel MORE" it
 *         splits, dry against wet, and the wet paw's nerves blaze, bars full
 *   10.6  "so they're really feeling": it looks away while its hands feel
 *         ("feeling, not washing"), and on "caught" it eats the clam
 *   12.7  "On a beach at night": the moon glows, a hermit crab walks into
 *         the pool; "that's usually a crab": the hands find it, it hides in
 *         its shell, the raccoon turns it over feeling it
 *   15.5  "So no,": it lets the crab go (it pops out and scuttles off),
 *         picks up the next clam, "washing?" ✗ again, and the loop finishes
 *         the sentence.
 */
export const LOOP_S = 16.5;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins in the loop (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return inVoice(w.start);
}

export const ARENT_AT = said("AREN'T");
export const WASHING_AT = said('washing');
export const THEY_AT = said('They');
export const DUNK_AT = said('dunk');
export const WATER_AT = said('water');
export const RUB_AT = said('rub');
export const PAWS_AT = said('paws,');
export const EVEN_AT = said('even');
export const FOOD_AT = said('food');
export const CLEAN_AT = said('clean.');
export const THEIR_PAWS_AT = said('paws', 1);
export const PACKED_AT = said('packed');
export const TOUCH_AT = said('touch');
export const NERVES_AT = said('nerves,');
export const AND_AT = said('and', 2);
export const WET_AT = said('wet');
export const MORE_AT = said('MORE,');
export const SO_THEY_AT = said('so');
export const FEELING_AT = said('feeling');
export const CAUGHT_AT = said('caught.');
export const BEACH_AT = said('beach');
export const NIGHT_AT = said('night,');
export const USUALLY_AT = said('usually');
export const CRAB_AT = said('crab.');
export const SO_AT = said('So');
export const NO_AT = said('no,');

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

// ---------------------------------------------------------------- the raccoon

/** Where it crouches (its ground point on the ledge) and how big: screen px per local unit. */
export const RACCOON = { x: 390, y: 1000, s: 7 } as const;
/** Screen px per unit for the clam and the hermit crab, and how far above their ground points their middles are. */
export const CLAM_SCALE = 3;
export const CLAM_RISE = 12 * CLAM_SCALE;
export const CRAB_SCALE = 1.15;
export const SHELL_DROP = 42;
export const toScreen = (p: Pt): Pt => ({ x: RACCOON.x + p.x * RACCOON.s, y: RACCOON.y + p.y * RACCOON.s });

/** The clam it eats: lifted to its mouth on "caught". */
export const EAT_AT = CAUGHT_AT + 0.28;
const EAT_TILT = 0.95;
const MOUTH = ((n) => ({ x: n.x - 1.5, y: n.y + 2.5 }))(noseAt(EAT_TILT));

/** The crab: in on "beach", found on "usually", lifted on "crab", let go after "So". */
export const GRAB_AT = USUALLY_AT + 0.08;
export const DROP_AT = SO_AT + 0.22;
const LAND_AT = DROP_AT + 0.24;
export const POP_AT = LAND_AT;
const RUN_FROM = POP_AT + 0.04;
const RUN_TO = LOOP_S - 0.06;
/** The next clam, lying on the pool's floor, picked up after the crab is let go. */
export const CLAM_B = { x: 650, at: NO_AT + 0.22 } as const;
const CRAB_STOP_X = 730;
/** A screen point in the raccoon's local units. */
const toLocal = (x: number, y: number): Pt => ({ x: (x - RACCOON.x) / RACCOON.s, y: (y - RACCOON.y) / RACCOON.s });
/** Its grip on the crab's shell, and on the next clam, where they lie on the floor. */
const CRAB_GRIP = toLocal(CRAB_STOP_X - 6, poolFloor(CRAB_STOP_X) - SHELL_DROP);
const CLAM_GRIP = toLocal(CLAM_B.x, poolFloor(CLAM_B.x) - CLAM_RISE + 4);

/** Where its hands meet, local units: rubbing in the water, lifted to show the clam, at its mouth, on the floor. */
const RUB = { x: 46, y: 3.5 };
const gripX = looped([
  { t: 0.3, at: RUB.x },
  { t: DUNK_AT - 0.3, at: 44 },
  { t: DUNK_AT + 0.14, at: 47 },
  { t: EVEN_AT, at: RUB.x },
  { t: FOOD_AT, at: 43 },
  { t: CLEAN_AT + 0.4, at: 44 },
  { t: CLEAN_AT + 0.78, at: 47 },
  { t: CAUGHT_AT - 0.4, at: RUB.x },
  { t: EAT_AT - 0.1, at: MOUTH.x },
  { t: EAT_AT + 0.25, at: MOUTH.x },
  { t: EAT_AT + 0.65, at: 44 },
  { t: NIGHT_AT, at: 49 },
  { t: GRAB_AT, at: CRAB_GRIP.x },
  { t: CRAB_AT + 0.15, at: 43 },
  { t: SO_AT - 0.05, at: 44 },
  { t: DROP_AT, at: 46 },
  { t: CLAM_B.at, at: CLAM_GRIP.x },
  { t: LOOP_S - 0.12, at: RUB.x },
]);
const gripY = looped([
  { t: 0.3, at: RUB.y },
  { t: DUNK_AT - 0.3, at: -6 },
  { t: DUNK_AT + 0.14, at: 9 },
  { t: EVEN_AT, at: RUB.y },
  { t: FOOD_AT, at: -15 },
  { t: CLEAN_AT + 0.4, at: -14 },
  { t: CLEAN_AT + 0.78, at: 9 },
  { t: CAUGHT_AT - 0.4, at: RUB.y },
  { t: EAT_AT - 0.1, at: MOUTH.y },
  { t: EAT_AT + 0.25, at: MOUTH.y },
  { t: EAT_AT + 0.65, at: 8 },
  { t: NIGHT_AT, at: 8 },
  { t: GRAB_AT, at: CRAB_GRIP.y },
  { t: CRAB_AT + 0.15, at: -16 },
  { t: SO_AT - 0.05, at: -15 },
  { t: DROP_AT, at: -2 },
  { t: CLAM_B.at, at: CLAM_GRIP.y },
  { t: LOOP_S - 0.12, at: RUB.y },
]);

/** Whole rubbing strokes a loop, so the stroke comes round with it. */
const STROKES = 48;
/** How hard it is rubbing, 0 .. 1: whenever its hands are in the water with food, gently while it feels about for more. */
export function rubbingAt(t: number): number {
  const food = Math.max(
    1 - ramp(t, DUNK_AT - 0.45, DUNK_AT - 0.25),
    window01(t, DUNK_AT + 0.25, EVEN_AT + 0.1, 0.2),
    window01(t, CLEAN_AT + 0.8, CAUGHT_AT - 0.35, 0.2),
    ramp(t, CLAM_B.at + 0.05, LOOP_S - 0.1),
  );
  const feel = 0.35 * window01(t, EAT_AT + 0.6, GRAB_AT - 0.1, 0.2);
  // Turning the crab over in its paws.
  const turn = 0.5 * window01(t, CRAB_AT + 0.1, DROP_AT - 0.05, 0.15);
  return Math.max(food, feel, turn);
}

/** Head turn: watching the water, the clam it shows, away while it feels, down to eat. */
const tiltAt = looped([
  { t: 0.5, at: 0.62 },
  { t: EVEN_AT + 0.2, at: 0.62 },
  { t: FOOD_AT + 0.1, at: 0.32 },
  { t: CLEAN_AT + 0.5, at: 0.36 },
  { t: CLEAN_AT + 0.9, at: 0.62 },
  { t: SO_THEY_AT, at: 0.6 },
  { t: FEELING_AT - 0.2, at: -0.22 },
  { t: CAUGHT_AT - 0.1, at: -0.2 },
  { t: EAT_AT - 0.05, at: EAT_TILT },
  { t: EAT_AT + 0.3, at: EAT_TILT },
  { t: EAT_AT + 0.7, at: 0.6 },
  { t: CRAB_AT + 0.1, at: 0.5 },
  { t: CRAB_AT + 0.4, at: 0.3 },
  { t: DROP_AT, at: 0.34 },
  { t: CLAM_B.at, at: 0.65 },
]);

/** Fingers spread: to take the crab, to let it go. */
export function openAt(t: number): number {
  return Math.max(window01(t, GRAB_AT - 0.3, GRAB_AT + 0.05, 0.15) * 0.6, window01(t, DROP_AT - 0.05, CLAM_B.at, 0.15));
}

export function raccoonAt(t: number): RaccoonPose {
  const tt = wrap(t);
  return {
    grip: { x: gripX(tt), y: gripY(tt) },
    rub: rubbingAt(tt) * Math.sin((2 * Math.PI * STROKES * tt) / LOOP_S),
    open: openAt(tt),
    tilt: tiltAt(tt),
    sway: Math.sin((2 * Math.PI * 5 * tt) / LOOP_S),
    breath: Math.sin((2 * Math.PI * 7 * tt) / LOOP_S),
  };
}

/** Whether the hands are under the surface. */
export const handsInWater = (t: number): boolean => toScreen(raccoonAt(t).grip).y > POOL.surface + 4;

// ---------------------------------------------------------------- what it holds

export type Held = 'clam' | 'crab' | null;
/** What is in its hands: the clam until it's eaten, the crab while it's held, the next clam from the floor. */
export function heldAt(t: number): Held {
  const tt = wrap(t);
  if (tt < EAT_AT + 0.1 || tt >= CLAM_B.at) return 'clam';
  if (tt >= GRAB_AT + 0.05 && tt < DROP_AT) return 'crab';
  return null;
}
/** The clam shrinking as it's eaten, 1 .. 0. */
export const clamSizeAt = (t: number): number => (wrap(t) >= CLAM_B.at ? 1 : 1 - ramp(t, EAT_AT - 0.05, EAT_AT + 0.12));
/** The next clam lying on the floor, 0 .. 1 (it settles there while the lenses have everyone's attention). */
export const floorClamAt = (t: number): number => (wrap(t) >= CLAM_B.at ? 0 : ramp(t, PACKED_AT, PACKED_AT + 0.8));

// ---------------------------------------------------------------- the crab

export interface Crab {
  readonly x: number;
  /** Ground point (where its shell sits). */
  readonly y: number;
  readonly facing: number;
  /** 0 out walking .. 1 shut in its shell. */
  readonly hidden: number;
  readonly rotation: number;
  /** Walking: its legs step with the line boil. */
  readonly walking: boolean;
  /** Bigger while it's lifted up to the raccoon's face (nearer the viewer). */
  readonly scale: number;
}

/** The crab's size while it's held: lifted towards us on "crab". */
export const heldScaleAt = (t: number): number => 1 + 0.4 * ramp(t, GRAB_AT + 0.05, CRAB_AT + 0.15);

/** The crab's path: along the rim and down into the pool. */
export function crabGround(x: number): number {
  const rim = RACCOON.y - 8;
  if (x >= POOL.x1 + 20) return rim;
  if (x <= POOL.x1 - 50) return poolFloor(x);
  return lerp(poolFloor(POOL.x1 - 50), rim, (x - (POOL.x1 - 50)) / 70);
}

const ENTER_FROM = NIGHT_AT - 0.75;
const ENTER_TO = GRAB_AT - 0.15;
const OFF_X = 1160;

/** The crab when it isn't in the raccoon's hands (null: off screen, or held). */
export function crabAt(t: number): Crab | null {
  const tt = wrap(t);
  if (tt >= ENTER_FROM && tt < GRAB_AT + 0.05) {
    const x = lerp(OFF_X, CRAB_STOP_X, ramp(tt, ENTER_FROM, ENTER_TO));
    return { x, y: crabGround(x), facing: -1, hidden: ramp(tt, GRAB_AT - 0.1, GRAB_AT + 0.05), rotation: 0, walking: tt < ENTER_TO, scale: 1 };
  }
  if (tt >= DROP_AT && tt < RUN_TO) {
    const fall = ramp(tt, DROP_AT, LAND_AT);
    const from = toScreen(raccoonAt(DROP_AT).grip);
    const x = tt < RUN_FROM ? lerp(from.x, CRAB_STOP_X, fall) : lerp(CRAB_STOP_X, OFF_X, clamp01((tt - RUN_FROM) / (RUN_TO - RUN_FROM)) ** 1.2);
    const y = tt < RUN_FROM ? lerp(from.y + SHELL_DROP * heldScaleAt(DROP_AT), crabGround(CRAB_STOP_X), fall) : crabGround(x);
    return {
      x, y, facing: 1, hidden: 1 - ramp(tt, POP_AT, POP_AT + 0.1), rotation: heldTurnAt(DROP_AT) * (1 - fall), walking: tt > RUN_FROM,
      scale: lerp(heldScaleAt(DROP_AT), 1, fall),
    };
  }
  return null;
}

/** It turns the crab over in its paws, feeling it. */
export function heldTurnAt(t: number): number {
  return 0.75 * Math.sin((2 * Math.PI * (wrap(t) - GRAB_AT)) / 0.9) * ramp(t, CRAB_AT - 0.1, CRAB_AT + 0.2);
}

/** The "!" over the crab as the hands close on it. */
export const alarmAt = (t: number): number => window01(t, GRAB_AT - 0.1, CRAB_AT - 0.02, 0.12);

// ---------------------------------------------------------------- water

/** A ring spreads from the hands every RIPPLE_S while they're in the water. */
export const RIPPLE_S = LOOP_S / 30;
export const RIPPLE_LIFE = 1.2;
export const RIPPLES: readonly number[] = Array.from({ length: 30 }, (_, k) => k * RIPPLE_S).filter((at) => handsInWater(at) || handsInWater(at - 0.1));

/** Splashes: the dunk, the dunk again after "clean", the crab dropped in, the next clam scooped up. */
export interface Splash {
  readonly at: number;
  readonly x: number;
  readonly size: number;
}
export const SPLASH_S = 0.6;
export const SPLASHES: readonly Splash[] = [
  { at: DUNK_AT + 0.02, x: toScreen({ x: 46, y: 0 }).x, size: 1 },
  { at: CLEAN_AT + 0.62, x: toScreen({ x: 45, y: 0 }).x, size: 0.9 },
  { at: DROP_AT + 0.1, x: CRAB_STOP_X - 10, size: 0.8 },
];
/** How stirred the surface is, 0 .. 1. */
export const stirAt = (t: number): number => Math.max(0.3 * rubbingAt(t), ...SPLASHES.map((s) => window01(t, s.at - 0.05, s.at + 0.9, 0.2)));
