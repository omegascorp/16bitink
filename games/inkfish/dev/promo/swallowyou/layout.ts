import { FRAME } from '../descent/frame';
import { clamp01, lerp, smooth } from '../short';
import { SHOULDERS_IN, SPECIES, YOU_FT } from './species';
import { ANIMALS, CARD_HOLD_S, SECTION_OF, sectionEnd, sectionStart, T, TESTS, type Animal } from './timeline';

/**
 * Where everything sits, as plain numbers (no drawing, so the tests can
 * check it): the stage each animal stands on beside "you", its camera from
 * the mouth-first close-up out to the line-up, the size ruler's ticks, the
 * shoulder test's moves and the stamp card's verdicts.
 *
 * The stage is in feet: the ground (the ruler) at y = 0, up is negative.
 * "You" stand at x = YOU_X; every animal faces you, its snout at x = 0 and
 * its tail at x = its length.
 */

export const W = FRAME.width;
export const H = FRAME.height;
/** Text and HUD stay this far inside the frame. */
export const MARGIN = 48;

/** Where "you" stand, feet (the middle of your feet). */
export const YOU_X = -3.4;
/** The ruler's line on screen in the line-up. */
export const GROUND_Y = 900;
/** The line-up fits from this far left of the snout (feet) ... */
const FIT_LEFT = -6.8;
/** ... to this far past the tail, between these screen x. */
const FIT_RIGHT = 1.5;
const FIT_X0 = 150;
const FIT_X1 = 1790;

export interface Pt { readonly x: number; readonly y: number }

/** A camera on the stage: the feet point at the middle of the screen, and px per foot. */
export interface Camera {
  readonly cx: number;
  readonly cy: number;
  readonly ppf: number;
}

export const toScreen = (c: Camera, p: Pt): Pt => ({ x: W / 2 + (p.x - c.cx) * c.ppf, y: H / 2 + (p.y - c.cy) * c.ppf });

/** How each animal is framed: its mouth (along from the snout and down from the body's middle, in body lengths), and how much of it the close-up shows. */
interface Framing {
  readonly mouthAlong: number;
  readonly mouthDown: number;
  /** The close-up's width as a fraction of the body length. */
  readonly close: number;
}

const FRAMING: Readonly<Record<Animal, Framing>> = {
  grouper: { mouthAlong: 0.06, mouthDown: 0.02, close: 0.62 },
  tiger: { mouthAlong: 0.09, mouthDown: 0.035, close: 0.36 },
  white: { mouthAlong: 0.08, mouthDown: 0.04, close: 0.36 },
  croc: { mouthAlong: 0.09, mouthDown: 0.01, close: 0.34 },
  greenland: { mouthAlong: 0.07, mouthDown: 0.05, close: 0.32 },
  whaleShark: { mouthAlong: 0.03, mouthDown: 0.01, close: 0.3 },
  humpback: { mouthAlong: 0.12, mouthDown: 0.0, close: 0.36 },
  sperm: { mouthAlong: 0.16, mouthDown: 0.05, close: 0.4 },
};

/** How much of its length the close-up shows. */
export const closeFraction = (a: Animal): number => FRAMING[a].close;

/** The height of the middle of the body above the ground, feet: at least mid-"you", with room under it for a row of yous lying on the ruler. */
export function bodyMiddle(a: Animal): number {
  const sp = SPECIES[a];
  return Math.max(YOU_FT * 0.6, (sp.height * sp.feet) / 2 + 1.9);
}

/** The animal's mouth on the stage, feet. */
export function mouthOf(a: Animal): Pt {
  const sp = SPECIES[a];
  const f = FRAMING[a];
  return { x: f.mouthAlong * sp.feet, y: -bodyMiddle(a) + f.mouthDown * sp.feet };
}

/** The line-up: "you" and the whole animal on the ruler. */
export function lineupCamera(a: Animal): Camera {
  const ppf = (FIT_X1 - FIT_X0) / (SPECIES[a].feet - FIT_LEFT + FIT_RIGHT);
  return { ppf, cx: FIT_LEFT + (W / 2 - FIT_X0) / ppf, cy: -(GROUND_Y - H / 2) / ppf };
}

/** The mouth-first close-up. */
export function closeCamera(a: Animal): Camera {
  const m = mouthOf(a);
  const ppf = W / (FRAMING[a].close * SPECIES[a].feet);
  // The mouth a little left of centre: the head runs off to the right.
  return { ppf, cx: m.x + (0.12 * W) / ppf, cy: m.y };
}

/** One animal's turn on the stage. */
export interface Stage {
  readonly animal: Animal;
  /** The close-up from `close`; the pull-back to the line-up over [pullFrom, pullTo]; the ruler's tape runs out from `measure`. */
  readonly close: number;
  readonly pullFrom: number;
  readonly pullTo: number;
  readonly measure: number;
  /** The name card's entrance. */
  readonly name: number;
  /** "It's N yous long": the row of yous along the ruler, from here (or never). */
  readonly yous: number | null;
  readonly end: number;
}

const stage = (animal: Animal, close: number, name: number, pullFrom: number, pullTo: number, yous: number | null = null): Stage => ({
  animal, close, name, pullFrom, pullTo, measure: pullTo - 0.2, yous, end: sectionEnd(SECTION_OF[animal]) + 0.9,
});

export const STAGES: readonly Stage[] = [
  stage('grouper', sectionStart(2), T.grouper, T.grouper + 0.6, T.grouperPounds - 0.1),
  stage('tiger', sectionStart(3), T.tiger, T.tiger + 0.5, T.eatAnything - 0.1, T.eatAnything + 0.3),
  stage('white', sectionStart(4), T.greatWhite, T.greatWhite, T.twentyFeet - 0.1),
  stage('croc', T.croc - 0.3, T.croc, T.crocTwenty - 0.4, T.crocTwenty + 0.5, T.crocTwenty + 0.9),
  stage('greenland', sectionStart(7), T.greenland, T.greenland + 0.5, T.twentyOne),
  stage('whaleShark', sectionStart(8), T.whaleShark, T.goBig + 0.6, T.whaleShark + 0.4),
  stage('humpback', sectionStart(9), T.humpback, T.humpback - 0.3, T.humpback + 0.7),
  stage('sperm', T.sperm - 0.4, T.sperm, T.sixty - 0.6, T.sixty + 0.5, T.sixty + 0.5),
];

export const stageOf = (a: Animal): Stage => STAGES.find((s) => s.animal === a)!;

/** The stage's camera at t: the close-up, the pull back (zooming in log scale), then the line-up with a slow drift. */
export function stageCamera(s: Stage, t: number): Camera {
  const a = closeCamera(s.animal);
  const b = lineupCamera(s.animal);
  const u = smooth((t - s.pullFrom) / (s.pullTo - s.pullFrom));
  // The close-up pushes in slowly while the jaws work; the line-up breathes out a little.
  const push = 1 + 0.06 * clamp01((t - s.close) / Math.max(0.5, s.pullFrom - s.close));
  const drift = 1 - 0.025 * clamp01((t - s.pullTo) / 8);
  const ppf = Math.exp(lerp(Math.log(a.ppf * push), Math.log(b.ppf * drift), u));
  // Keep the point the two cameras agree on still: interpolate where the mouth is on screen.
  const m = mouthOf(s.animal);
  const sa = toScreen(a, m);
  const sb = toScreen(b, m);
  const sx = lerp(sa.x, sb.x, u);
  const sy = lerp(sa.y, sb.y, u);
  const cam = { ppf, cx: m.x - (sx - W / 2) / ppf, cy: m.y - (sy - H / 2) / ppf };
  return zoomTo(cam, focusAt(s, t));
}

/** A push in on part of the stage for a beat: where (feet), how close (px per foot), and how far in (0 .. 1). */
interface Focus { readonly at: Pt; readonly ppf: number; readonly amount: number }

/** The whale shark's mouth, pushed in on for "five feet wide… you'd fit in that mouth easily". */
function focusAt(s: Stage, t: number): Focus | null {
  if (s.animal === 'sperm') {
    // "You're not squid": in on "you", shrugging.
    const amount = smooth((t - T.wantsSquid) / 0.9);
    return amount > 0 ? { at: { x: YOU_X + 1.5, y: -YOU_FT * 0.62 }, ppf: 95, amount } : null;
  }
  if (s.animal !== 'whaleShark') return null;
  const m = mouthOf('whaleShark');
  const amount = smooth((t - T.fiveFeet + 0.5) / 0.8) * (1 - smooth((t - T.itsThroat + 0.3) / 0.8));
  return amount > 0 ? { at: { x: m.x + 3, y: m.y + 0.6 }, ppf: 105, amount } : null;
}

function zoomTo(cam: Camera, f: Focus | null): Camera {
  if (!f) return cam;
  return {
    ppf: Math.exp(lerp(Math.log(cam.ppf), Math.log(f.ppf), f.amount)),
    cx: lerp(cam.cx, f.at.x, f.amount),
    cy: lerp(cam.cy, f.at.y, f.amount),
  };
}

// ---------------------------------------------------------------- the ruler

export interface Tick {
  readonly ft: number;
  readonly major: boolean;
}

/** The ruler's ticks for a camera: spaced so they're at least ~36 px apart, labelled every ~120 px. */
export function rulerSteps(ppf: number): { readonly step: number; readonly label: number } {
  const steps = [1, 2, 5, 10, 20];
  const step = steps.find((k) => k * ppf >= 36) ?? 20;
  const label = steps.find((k) => k >= step && k * ppf >= 120) ?? 20;
  return { step, label };
}

export function rulerTicks(ppf: number, upTo: number): Tick[] {
  const { step, label } = rulerSteps(ppf);
  const out: Tick[] = [];
  for (let ft = 0; ft <= upTo + 1e-6; ft += step) out.push({ ft, major: Math.abs(ft / label - Math.round(ft / label)) < 1e-6 });
  return out;
}

/** How long the tape takes to run out to the animal's length. */
export const MEASURE_S = 1.3;

/** How far the tape has run out at t, feet. */
export const tapeAt = (s: Stage, t: number): number => SPECIES[s.animal].feet * smooth((t - s.measure) / MEASURE_S);

/** When the tape passes each labelled tick (for the ruler's tick sounds). */
export function tapeTicks(s: Stage): number[] {
  const L = SPECIES[s.animal].feet;
  const { label } = rulerSteps(lineupCamera(s.animal).ppf);
  const out: number[] = [];
  for (let ft = label; ft <= L + 1e-6; ft += label) {
    // Invert smoothstep by bisection.
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (smooth(mid) * L < ft) lo = mid;
      else hi = mid;
    }
    out.push(s.measure + lo * MEASURE_S);
  }
  out.push(s.measure + MEASURE_S);
  return out;
}

// ---------------------------------------------------------------- the shoulder test

/** The test card, and the ring's middle on it. */
export const CARD = { x: 1180, y: 300, width: 660, height: 560 } as const;
export const RING_AT: Pt = { x: CARD.x + CARD.width / 2, y: CARD.y + 330 };
/** Card px per inch. */
export const CARD_PPI = 21;
export const BAR_PX = SHOULDERS_IN * CARD_PPI;
export const SHOULDERS_LABEL = 'your shoulders · 16 in / 40 cm';

export type TestPhase = 'off' | 'hover' | 'drop' | 'done';

export interface TestState {
  readonly phase: TestPhase;
  /** The card's slide in and out, 0 .. 1. */
  readonly show: number;
  /** The bar's height above the ring's plane, px (0 on it), and how far it has gone through (0 .. 1, only if it fits). */
  readonly lift: number;
  readonly through: number;
  /** Does the bar fit? */
  readonly fits: boolean;
  /** The stamp's thump, 0 not yet .. 1 landed (overshoots while landing). */
  readonly stamp: number;
}

/** The bar falls for this long before it lands on (or into) the ring. */
const FALL_S = 0.35;

export function testAt(a: Animal, t: number): TestState {
  const test = TESTS[a];
  const fits = SPECIES[a].throat > SHOULDERS_IN;
  const show = Math.min(smooth((t - test.card) / 0.4), 1 - smooth((t - test.stamp - CARD_HOLD_S) / 0.4));
  if (show <= 0) return { phase: 'off', show: 0, lift: 0, through: 0, fits, stamp: 0 };
  const hover = 150 + 8 * Math.sin(t * 5);
  if (t < test.drop) return { phase: 'hover', show, lift: hover, through: 0, fits, stamp: 0 };
  const fall = clamp01((t - test.drop) / FALL_S);
  let lift = hover * (1 - fall * fall);
  let through = 0;
  if (fall >= 1) {
    const since = t - test.drop - FALL_S;
    if (fits) through = smooth(since / 0.7);
    else lift = 46 * Math.abs(Math.sin(since * 11)) * Math.exp(-since * 5.5);
  }
  const u = (t - test.stamp) / 0.16;
  const stamp = u <= 0 ? 0 : u >= 1 ? 1 : 1 + 0.9 * (1 - u) * (1 - u);
  return { phase: t < test.stamp ? 'drop' : 'done', show, lift, through, fits, stamp };
}

/** The test that's on screen at t, if any. */
export function activeTest(t: number): Animal | null {
  return ANIMALS.find((a) => testAt(a, t).show > 0) ?? null;
}

// ---------------------------------------------------------------- the stamp card

/** Top right: eight slots in two rows of four. */
export const STAMP_CARD = { x: 1400, y: 52, width: 472, height: 214, cols: 4 } as const;

export function slotOf(i: number): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  const w = (STAMP_CARD.width - 24) / STAMP_CARD.cols;
  const h = (STAMP_CARD.height - 54) / 2;
  return { x: STAMP_CARD.x + 12 + (i % STAMP_CARD.cols) * w, y: STAMP_CARD.y + 42 + Math.floor(i / STAMP_CARD.cols) * h, width: w, height: h };
}

/** Where the shoulder gauge rests between tests (under the stamp card), and the box it and its label take. */
export const GAUGE = { x: STAMP_CARD.x + STAMP_CARD.width / 2, y: STAMP_CARD.y + STAMP_CARD.height + 40, length: 200 } as const;
export const GAUGE_BOX = { x: GAUGE.x - 230, y: GAUGE.y - 12, width: 460, height: 70 } as const;

/** Each slot's stamp: 0 empty .. 1 stamped (popping in just after the big stamp lands). */
export const slotStampAt = (a: Animal, t: number): number => smooth((t - TESTS[a].stamp - 0.45) / 0.25);

/** How many verdicts are in at t. */
export const verdictsIn = (t: number): number => ANIMALS.filter((a) => t >= TESTS[a].stamp).length;

/** The stamp card shows from "Let's test it" to the end card. */
export const stampCardAlpha = (t: number): number => Math.min(smooth((t - T.testIt) / 0.5), 1 - smooth((t - T.end) / 0.4));

// ---------------------------------------------------------------- text

/** A line of text and the box it must fit in (centre x, or left x with `left`). */
export interface TextBox {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly maxWidth: number;
  readonly left?: boolean;
}

/** The name card, top left. */
export const NAME_CARD = {
  name: { x: 78, y: 112, size: 74, maxWidth: 1000, left: true },
  us: { x: 82, y: 178, size: 58, maxWidth: 900, left: true },
  metric: { x: 84, y: 226, size: 40, maxWidth: 900, left: true },
} as const satisfies Record<string, TextBox>;

/** Is a box inside the frame's margins (its height taken as the font size)? */
export function inFrame(b: TextBox): boolean {
  const x0 = b.left ? b.x : b.x - b.maxWidth / 2;
  const x1 = b.left ? b.x + b.maxWidth : b.x + b.maxWidth / 2;
  return x0 >= MARGIN - 1e-6 && x1 <= W - MARGIN + 1e-6 && b.y - b.size >= MARGIN * 0.5 && b.y + b.size * 0.3 <= H - MARGIN * 0.5;
}
