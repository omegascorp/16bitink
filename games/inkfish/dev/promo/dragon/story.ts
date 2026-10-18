import { BOIL_FPS } from '../../../src/art/textures';
import { curveAt, type Key, lerp, ramp, smooth, window01 } from '../short';
import { branchAt, BUNCHES, fanOf, fanRoot, fingerSpine, gutAt, isLower, MOUTH, type Pt, STOMACH } from './shape';
import { TEMPO, WORDS } from './words';

export type { Pt };

/**
 * "This tiny slug eats the man o' war": the blue dragon (Glaucus atlanticus),
 * a sea slug about 3 cm long, floats upside down at the surface on a gulp of
 * air, eats the Portuguese man o' war, and swallows its stinging cells
 * without setting them off. It stores them in the tips of its cerata (its
 * "fingers"), so its sting can be even worse than the man o' war's. Told by
 * a narrator (words.ts), every beat timed to the words and a new mood on
 * every sentence: the colours, the camera, the slug's face and the sound
 * effects change with it. A function of time in seconds over a loop of LOOP_S.
 *
 *   0     SHOCK. "This tiny slug EATS the man o' war…": close on the slug,
 *         big in frame, its jaws clamped on a blue tentacle hanging from
 *         the man o' war's float at the surface; it chews, CHOMPS on "EATS"
 *         (a jolt, the float flinches) and the tentacle is reeled into it
 *   2.4   CHEEKY. "and steals its stingers!": in close on the head, little
 *         harpoon-shaped stinging capsules plucked off the tentacle fly
 *         into its mouth one by one; it side-eyes us, slyly
 *   4.3   CALM WONDER. "The blue dragon floats upside down, on a gulp of
 *         air.": we pull back into sunlit water; "blue dragon" flips over
 *         on "upside down"; it lets go, swims out from under the float, noses
 *         up to the surface and gulps a bubble of air, which sits in its belly
 *   7.7   TENSION. "It swallows the stinging cells WITHOUT setting them
 *         off…": dark, close and see-through: the capsules slide down its
 *         gut, coiled and unfired, trembling on "WITHOUT"
 *  10.5   DRAMATIC. "and stores them in its fingertips.": one by one the
 *         capsules run out into the six bunches and the fingertips light up
 *  12.6   DANGER. "So its sting can be even WORSE than the man o' war's!": the
 *         water turns red, sparks crackle off the fingertips on "sting", a
 *         red flash and a jolt on "WORSE", the slug bristling beside the float
 *  15.8   LAUGH. "Not bad for something smaller than your thumb.": bright
 *         again; a thumb slides in under it like a ruler, the slug about half
 *         its length, and nudges it (boing) on "thumb"; it grins
 *  18.4   "So yes,": back in close, it bites the tentacle into frame 1.
 */
export const LOOP_S = 19.5;

/** The line boil steps at the game's 8 a second: 156 steps, 52 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
/** Time since `at`, folded to -LOOP_S/2 .. LOOP_S/2 so events near the loop point work both sides of it. */
const since = (t: number, at: number): number => {
  const d = wrap(t - at);
  return d > LOOP_S / 2 ? d - LOOP_S : d;
};
/** Whole cycles a loop, as a phase in radians at time t: for wiggles that must be where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const SLUG_AT = said('slug');
export const EATS_AT = said('EATS');
export const MAN_AT = said('man');
export const WAR_AT = said('war…');
export const AND_AT = said('and');
export const STEALS_AT = said('steals');
export const STINGERS_AT = said('stingers!');
export const THE_AT = said('The');
export const BLUE_AT = said('blue');
export const DRAGON_AT = said('dragon');
export const FLOATS_AT = said('floats');
export const UPSIDE_AT = said('upside');
export const DOWN_AT = said('down,');
export const GULP_AT = said('gulp');
export const AIR_AT = said('air.');
export const IT_AT = said('It');
export const SWALLOWS_AT = said('swallows');
export const STINGING_AT = said('stinging');
export const CELLS_AT = said('cells');
export const WITHOUT_AT = said('WITHOUT');
export const OFF_AT = said('off…');
export const STORES_AT = said('stores');
export const FINGERTIPS_AT = said('fingertips.');
export const SO_AT = said('So');
export const STING_AT = said('sting');
export const WORSE_AT = said('WORSE');
export const MANS_AT = said('man', 2);
export const WARS_AT = said('war\'s!');
export const NOT_AT = said('Not');
export const SMALLER_AT = said('smaller');
export const THUMB_AT = said('thumb.');
export const SO_YES_AT = said('So', 2);
export const YES_AT = said('yes,');

// ---------------------------------------------------------------- the moods

export type Mood = 'shock' | 'cheeky' | 'calm' | 'tension' | 'dramatic' | 'danger' | 'laugh';

/** A new mood on every sentence, from just before its first word; "So yes," goes back to the opening's. */
export const MOOD_KEYS: readonly (readonly [number, Mood])[] = [
  [0, 'shock'],
  [AND_AT - 0.1, 'cheeky'],
  [THE_AT - 0.1, 'calm'],
  [IT_AT - 0.1, 'tension'],
  [said('and', 2) - 0.1, 'dramatic'],
  [SO_AT - 0.1, 'danger'],
  [NOT_AT - 0.05, 'laugh'],
  [SO_YES_AT - 0.15, 'shock'],
];
const MOOD_FADE_S = 0.45;

/** The mood now and the one it is fading from: `u` 0 (all `from`) .. 1 (all `to`). */
export function moodAt(t: number): { readonly from: Mood; readonly to: Mood; readonly u: number } {
  const v = wrap(t);
  let i = 0;
  while (i < MOOD_KEYS.length - 1 && v >= MOOD_KEYS[i + 1]![0]) i++;
  const [at, to] = MOOD_KEYS[i]!;
  const from = MOOD_KEYS[(i + MOOD_KEYS.length - 1) % MOOD_KEYS.length]![1];
  return { from, to, u: ramp(v, at, at + MOOD_FADE_S) };
}

/** How much of one mood is showing, 0 .. 1. */
export function moodWeight(t: number, mood: Mood): number {
  const m = moodAt(t);
  return (m.from === mood ? 1 - m.u : 0) + (m.to === mood ? m.u : 0);
}

// ---------------------------------------------------------------- the slug

/** World px per slug px: the slug is about 690 world px long, most of the close-up's width. */
export const SLUG_K = 3.3;
export const SLUG_HOME = { x: 600, y: 735 } as const;
/** The surface of the sea, world px. */
export const SURFACE_Y = 470;

export interface Slug extends Pt {
  /** Radians, positive lifts the head. */
  readonly tilt: number;
  /** Stretch along and across the body (1 as drawn). */
  readonly sx: number;
  readonly sy: number;
}

/** It chews: the jaws open and snap shut at these moments (EATS the big one; one more into the loop point). */
export const CHOMPS: readonly number[] = [0.56, EATS_AT + 0.05, WAR_AT, SO_YES_AT + 0.5];

/** Rising to gulp air at the surface, 0 .. 1. */
export const riseAt = (t: number): number => {
  const u = wrap(t);
  return ramp(u, UPSIDE_AT - 0.05, GULP_AT - 0.1) * (1 - ramp(u, AIR_AT + 0.2, IT_AT + 0.25));
};

/** A decaying wobble `d` s after an event, 0 outside it. */
const wobble = (d: number, life: number, hz: number): number => (d < 0 || d > life ? 0 : Math.sin(2 * Math.PI * hz * d) * (1 - d / life) ** 2);

/** Bristling with stolen stings, 0 .. 1: from "sting" until the laugh. */
export const menaceAt = (t: number): number => window01(wrap(t), STING_AT - 0.25, NOT_AT + 0.35, 0.3);

export function slugAt(t: number): Slug {
  const u = wrap(t);
  const rise = riseAt(u);
  const lunge = CHOMPS.reduce((s, at) => {
    const d = since(u, at);
    return d < -0.15 || d > 0.3 ? s : s + 7 * (d < 0 ? smooth((d + 0.15) / 0.15) : 1 - d / 0.3);
  }, 0);
  // It swells as it bristles, and punches up bigger on "WORSE".
  const big = 1 + 0.06 * menaceAt(u) + 0.08 * Math.max(0, wobble(since(u, WORSE_AT), 0.7, 0.7));
  // Boing: squashed and stretched as the thumb pokes in.
  const boing = wobble(since(u, THUMB_AT + 0.05), 0.9, 3.2);
  return {
    // To gulp air it swims out from under the float and noses up to the surface.
    x: SLUG_HOME.x + 22 * Math.sin(cycles(1, u)) - 260 * rise - lunge,
    y: SLUG_HOME.y + 5 * Math.sin(cycles(3, u)) + 17 * rise - 10 * Math.max(0, boing),
    tilt: 0.95 * rise + 0.02 * Math.sin(cycles(2, u)),
    sx: big * (1 + 0.1 * boing),
    sy: big * (1 - 0.14 * boing),
  };
}

/** A point on the slug, given in slug px, in world px. */
export function onSlug(s: Slug, p: Pt): Pt {
  const lx = p.x * SLUG_K * s.sx;
  const ly = p.y * SLUG_K * s.sy;
  const c = Math.cos(s.tilt);
  const n = Math.sin(s.tilt);
  return { x: s.x + lx * c - ly * n, y: s.y + lx * n + ly * c };
}

export const mouthAt = (t: number): Pt => onSlug(slugAt(t), MOUTH);

/** Jaw opening, 0 shut .. 1 wide: keys held, eased between; snapping shut is a slam. */
const JAW_KEYS: readonly (readonly [number, number])[] = (() => {
  const CLAMPED = 0.14;
  const chomp = (at: number, open: number, wind = 0.25): (readonly [number, number])[] => [[at - wind - 0.06, CLAMPED], [at - 0.05, open], [at + 0.02, 0.05], [at + 0.25, CLAMPED]];
  return [
    [0, CLAMPED],
    ...chomp(CHOMPS[0]!, 0.55),
    ...chomp(CHOMPS[1]!, 1, 0.4),
    ...chomp(CHOMPS[2]!, 0.5),
    // Slurping the stingers in.
    [STEALS_AT - 0.2, CLAMPED],
    [STEALS_AT, 0.42],
    [STINGERS_AT + 0.45, 0.42],
    [STINGERS_AT + 0.65, CLAMPED],
    // Lets go, then gulps the air.
    [FLOATS_AT, CLAMPED],
    [FLOATS_AT + 0.3, 0.04],
    [GULP_AT - 0.25, 0.04],
    [GULP_AT, 0.85],
    [GULP_AT + 0.25, 0.04],
    [IT_AT - 0.15, 0.04],
    [IT_AT + 0.15, CLAMPED],
    // Swallowing: little gulps as the capsules go down.
    ...[0, 1, 2, 3].flatMap((k): (readonly [number, number])[] => [[SWALLOWS_AT + 0.05 + k * 0.5, CLAMPED], [SWALLOWS_AT + 0.2 + k * 0.5, 0.32], [SWALLOWS_AT + 0.35 + k * 0.5, CLAMPED]]),
    ...chomp(CHOMPS[3]!, 0.75, 0.35),
    [LOOP_S, CLAMPED],
  ];
})();

export function jawAt(t: number): number {
  const u = wrap(t);
  let i = 0;
  while (i < JAW_KEYS.length - 2 && u >= JAW_KEYS[i + 1]![0]) i++;
  const [t0, v0] = JAW_KEYS[i]!;
  const [t1, v1] = JAW_KEYS[i + 1]!;
  const s = Math.min(1, Math.max(0, (u - t0) / (t1 - t0)));
  const e = v1 < v0 - 0.2 ? s * s : smooth(s);
  return lerp(v0, v1, e);
}

/** Holding the tentacle in its jaws, 0 .. 1: it lets go to gulp air, and grabs it again. */
export const gripAt = (t: number): number => 1 - window01(wrap(t), FLOATS_AT - 0.1, IT_AT + 0.05, 0.5);

// ---------------------------------------------------------------- the face

export interface Eyes {
  /** Upper lids down, 0 open .. 1 shut. */
  readonly lid: number;
  /** The lids' slant: + sly (drooping outwards), - angry (frowning in). */
  readonly slant: number;
  /** Squeezed shut in a grin, 0 .. 1. */
  readonly happy: number;
  /** The pupils' look, -1 .. 1 along the body (- forwards), and their size. */
  readonly look: number;
  readonly pupil: number;
}

export const slyAt = (t: number): number => window01(wrap(t), STEALS_AT - 0.1, THE_AT + 0.05, 0.25);
export const happyAt = (t: number): number => window01(wrap(t), said('bad') - 0.05, SO_YES_AT - 0.05, 0.25);

export function eyesAt(t: number): Eyes {
  const u = wrap(t);
  const sly = slyAt(u);
  const calm = moodWeight(u, 'calm');
  const tense = moodWeight(u, 'tension') + moodWeight(u, 'dramatic');
  const angry = menaceAt(u);
  return {
    lid: 0.18 + 0.4 * sly + 0.25 * calm - 0.18 * tense + 0.3 * angry,
    slant: sly - 1.1 * angry,
    happy: happyAt(u),
    look: -0.6 + 1.4 * sly - 0.6 * angry,
    pupil: 1 - 0.4 * tense,
  };
}

// ---------------------------------------------------------------- the fans and the fingertips

/** One bunch's sway and spread: radians (in its own frame, upper side) and a scale. */
export function fanPoseAt(t: number, i: number): { readonly rot: number; readonly scale: number } {
  const u = wrap(t);
  const m = menaceAt(u);
  return { rot: 0.06 * Math.sin(cycles(4, u) + i * 1.3) - 0.16 * m, scale: 1 + 0.1 * m };
}

/** A point given in bunch i's frame (root at the origin, as an upper bunch), in slug px. */
export function onFan(t: number, i: number, p: Pt): Pt {
  const { rot, scale } = fanPoseAt(t, i);
  const root = fanRoot(fanOf(i));
  const c = Math.cos(rot);
  const n = Math.sin(rot);
  const q = { x: root.x + scale * (p.x * c - p.y * n), y: root.y + scale * (p.x * n + p.y * c) };
  return isLower(i) ? { x: q.x, y: -q.y } : q;
}

export const tipAt = (t: number, i: number, j: number): Pt => onSlug(slugAt(t), onFan(t, i, fingerSpine(fanOf(i), j)[8]!));

/** The order the bunches fill and light up: front to back, upper then lower. */
export const FILL_ORDER: readonly number[] = [0, 3, 1, 4, 2, 5];

// ---------------------------------------------------------------- the stingers

/** Capsules plucked off the tentacle on "steals its stingers!". */
export const PLUCKS = 8;
const PLUCK_S = 0.42;
export const pluckStart = (i: number): number => STEALS_AT - 0.2 + i * 0.15;

/** One per bunch: swallowed on "It swallows the stinging cells", stored on "stores them in its fingertips". */
export const CAPSULES = BUNCHES;
const SLIDE_S = 1.25;
const STORE_S = 0.45;
export const swallowStart = (i: number): number => SWALLOWS_AT - 0.12 + i * 0.3;
export const storeStart = (i: number): number => STORES_AT - 0.2 + i * 0.17;
/** When bunch `fan`'s capsule reaches its fingertips. */
export const litFrom = (fan: number): number => storeStart(FILL_ORDER.indexOf(fan)) + STORE_S;

/** How lit a fingertip is, 0 .. 1: from its capsule arriving until the laugh. */
export const litAt = (t: number, fan: number, finger: number): number => {
  const u = wrap(t);
  const from = litFrom(fan) + 0.035 * finger;
  return ramp(u, from, from + 0.12) * (1 - ramp(u, NOT_AT + 0.15, NOT_AT + 0.75));
};

export interface Capsule extends Pt {
  /** Rotation, radians, pointing the harpoon end the way it travels. */
  readonly angle: number;
  readonly scale: number;
  readonly alpha: number;
  /** Lit up on its way to a fingertip. */
  readonly glow: number;
}

const tentacleBelow = (t: number, s: number): Pt => pointAlong(tentacleAt(t).lower, s);

/** The capsules flying off the tentacle into the mouth, world px. */
export function pluckedAt(t: number): Capsule[] {
  const u = wrap(t);
  const out: Capsule[] = [];
  for (let i = 0; i < PLUCKS; i++) {
    const v = (u - pluckStart(i)) / PLUCK_S;
    if (v < 0 || v > 1) continue;
    const from = tentacleBelow(pluckStart(i), 55 + 24 * (i % 4));
    const to = mouthAt(u);
    const c = { x: Math.min(from.x, to.x) - 70 - 18 * (i % 3), y: (from.y + to.y) / 2 + 10 };
    const e = smooth(v) ** 1.15;
    const p = quad(from, c, to, e);
    const ahead = quad(from, c, to, Math.min(1, e + 0.05));
    out.push({ ...p, angle: Math.atan2(ahead.y - p.y, ahead.x - p.x), scale: 1 - 0.55 * ramp(v, 0.75, 1), alpha: ramp(v, 0, 0.12), glow: 0 });
  }
  return out;
}

/** The trembling of the swallowed capsules on "WITHOUT setting them off…", 0 .. 1. */
export const trembleAt = (t: number): number => window01(wrap(t), WITHOUT_AT - 0.1, OFF_AT + 0.4, 0.15);

/** The swallowed capsules inside the slug, in slug px (the render shows them through its see-through body). */
export function insideAt(t: number): Capsule[] {
  const u = wrap(t);
  const out: Capsule[] = [];
  const shake = trembleAt(u);
  for (let i = 0; i < CAPSULES; i++) {
    const a = swallowStart(i);
    const b = storeStart(i);
    if (u < a || u > b + STORE_S) continue;
    const jiggle = { x: shake * 0.9 * Math.sin(u * 61 + i * 2), y: shake * 0.7 * Math.cos(u * 47 + i) };
    const wait = { x: STOMACH.x + 5 * Math.cos(i * 2.4) - 2, y: 3.5 * Math.sin(i * 2.4) };
    if (u < a + SLIDE_S) {
      const v = smooth((u - a) / SLIDE_S);
      const p = v < 0.92 ? gutAt(v / 0.92) : { x: lerp(gutAt(1).x, wait.x, (v - 0.92) / 0.08), y: lerp(gutAt(1).y, wait.y, (v - 0.92) / 0.08) };
      out.push({ x: p.x + jiggle.x, y: p.y + jiggle.y, angle: 0.08 * Math.sin(u * 7 + i), scale: 1, alpha: ramp(u, a, a + 0.15), glow: 0 });
    } else if (u < b) {
      out.push({ x: wait.x + jiggle.x, y: wait.y + jiggle.y, angle: 0.5 * i + 0.1 * Math.sin(u * 3 + i), scale: 1, alpha: 1, glow: 0 });
    } else {
      // Out along the branch to its bunch, then up the middle finger to the tip.
      const fan = FILL_ORDER[i]!;
      const v = smooth((u - b) / STORE_S);
      const mid = Math.floor(fanOf(fan).fingers / 2);
      const spine = fingerSpine(fanOf(fan), mid);
      const p = v < 0.55 ? branchAt(fan, v / 0.55) : onFan(u, fan, spine[Math.min(8, Math.round(((v - 0.55) / 0.45) * 8))]!);
      const q = v < 0.55 ? branchAt(fan, Math.min(1, v / 0.55 + 0.05)) : onFan(u, fan, spine[8]!);
      out.push({ ...p, angle: Math.atan2(q.y - p.y, q.x - p.x), scale: 1 - 0.4 * ramp(v, 0.8, 1), alpha: 1 - ramp(v, 0.9, 1), glow: ramp(v, 0, 0.3) });
    }
  }
  return out;
}

// ---------------------------------------------------------------- the see-through body and the air bubble

/** The body turned see-through, 0 .. 1: from "It swallows" until the fingertips are lit. */
export const xrayAt = (t: number): number => window01(wrap(t), IT_AT - 0.1, FINGERTIPS_AT + 0.65, 0.4);

export interface Bubble extends Pt {
  readonly r: number;
  readonly alpha: number;
  /** True while it is inside the slug (x, y in slug px), false at the surface (world px). */
  readonly inside: boolean;
}

/** The gulp of air: a bubble at the surface sucked into its mouth, then sitting in its belly. */
export function bubbleAt(t: number): Bubble | null {
  const u = wrap(t);
  const from = GULP_AT - 0.05;
  if (u < from || u > FINGERTIPS_AT + 1) return null;
  const inMouth = GULP_AT + 0.22;
  if (u < inMouth) {
    const m = mouthAt(u);
    const v = smooth((u - from) / (inMouth - from));
    return { x: m.x - 10, y: lerp(SURFACE_Y + 8, m.y, v), r: 9 * SLUG_K * (0.6 + 0.4 * smooth(v * 2)), alpha: 1, inside: false };
  }
  const v = smooth((u - inMouth) / 0.45);
  const p = { x: lerp(MOUTH.x + 6, STOMACH.x, v), y: 0 };
  return { ...p, r: 8.5 * (0.7 + 0.3 * v), alpha: 1 - ramp(u, FINGERTIPS_AT + 0.4, FINGERTIPS_AT + 1), inside: true };
}

// ---------------------------------------------------------------- the man o' war

/** Where the float sits on the surface (its waterline's middle), world px. */
export const FLOAT_HOME = { x: 640, y: SURFACE_Y } as const;
/** Where the bitten tentacle hangs from, on the float's underside (float px = world px). */
export const FLOAT_ANCHOR: Pt = { x: -280, y: 22 };

export interface Float extends Pt {
  readonly tilt: number;
  /** Squashed by a flinch, 1 as drawn. */
  readonly squash: number;
}

export function floatAt(t: number): Float {
  const u = wrap(t);
  const flinch = CHOMPS.reduce((s, at) => s + wobble(since(u, at + 0.04), 0.6, 2.4) * (at === CHOMPS[1] ? 1 : 0.45), 0);
  const tremble = 0.012 * menaceAt(u) * Math.sin(u * 47);
  return {
    x: FLOAT_HOME.x + 14 * Math.sin(cycles(1, u) + 0.6),
    y: FLOAT_HOME.y + 4 * Math.sin(cycles(3, u) + 1),
    tilt: 0.03 * Math.sin(cycles(2, u)) + tremble,
    squash: 1 + 0.06 * flinch,
  };
}

export function onFloat(f: Float, p: Pt): Pt {
  const c = Math.cos(f.tilt);
  const n = Math.sin(f.tilt);
  const x = p.x / f.squash;
  const y = p.y * f.squash;
  return { x: f.x + x * c - y * n, y: f.y + x * n + y * c };
}

/** The spacing of the stinging beads along a tentacle, world px. */
export const BEAD_GAP = 34;
/** How far the tentacle has been reeled into the mouth, in bead gaps, while it eats: whole gaps a loop, so the beads loop. */
const REELS: readonly (readonly [number, number, number])[] = [
  [0.1, WAR_AT + 0.4, 3],
  [STEALS_AT - 0.2, STINGERS_AT + 0.6, 2],
  [SWALLOWS_AT, OFF_AT + 0.3, 3],
  [SO_YES_AT, LOOP_S - 0.05, 1],
];
export const reelAt = (t: number): number => BEAD_GAP * REELS.reduce((s, [a, b, n]) => s + n * ramp(wrap(t), a, b), 0);
export const REEL_TOTAL = BEAD_GAP * REELS.reduce((s, r) => s + r[2], 0);

export interface Tentacle {
  /** From the float to where it is held (or hangs), and on down. */
  readonly upper: readonly Pt[];
  readonly lower: readonly Pt[];
}

const quad = (a: Pt, c: Pt, b: Pt, u: number): Pt => ({
  x: (1 - u) ** 2 * a.x + 2 * u * (1 - u) * c.x + u * u * b.x,
  y: (1 - u) ** 2 * a.y + 2 * u * (1 - u) * c.y + u * u * b.y,
});
const sampled = (a: Pt, c: Pt, b: Pt, n: number): Pt[] => Array.from({ length: n + 1 }, (_, i) => quad(a, c, b, i / n));

/** A point `s` world px along a polyline from its start (clamped to its end). */
export function pointAlong(line: readonly Pt[], s: number): Pt {
  let left = Math.max(0, s);
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= d) return { x: a.x + ((b.x - a.x) * left) / d, y: a.y + ((b.y - a.y) * left) / d };
    left -= d;
  }
  return line[line.length - 1]!;
}

/** Hanging straight down from the float when it isn't held. */
const REST: Pt = { x: 335, y: 790 };

/** The bitten tentacle: from the float down to the slug's jaws, and on down into the deep. */
export function tentacleAt(t: number): Tentacle {
  const u = wrap(t);
  const a = onFloat(floatAt(u), FLOAT_ANCHOR);
  const g = gripAt(u);
  const m = mouthAt(u);
  const sway = 26 * Math.sin(cycles(2, u) + 0.4);
  // Pulled into the jaws, under the snout.
  const held = { x: lerp(REST.x + sway * 0.3, m.x + 8, g), y: lerp(REST.y, m.y, g) };
  // Held, both strands leave the jaws forwards, like a noodle being slurped; let go, it just hangs.
  const loose = { x: (a.x + held.x) / 2 - 22, y: (a.y + held.y) / 2 + 8 };
  const upper = sampled(a, { x: lerp(loose.x, m.x - 95, g), y: lerp(loose.y, m.y - 120, g) }, held, 18);
  const end = { x: held.x - 50 + sway, y: 3400 };
  const lower = sampled(held, { x: lerp(held.x + 40 + sway * 0.6, m.x - 170, g), y: lerp(held.y + 700, m.y + 300, g) }, end, 70);
  return { upper, lower };
}

/** The man o' war's other tentacles, hanging from its float: where along it (float px), how long, and their sway. */
export const OTHERS: readonly { readonly x: number; readonly len: number; readonly phase: number; readonly w: number }[] = [
  { x: -160, len: 2600, phase: 0.4, w: 0.9 },
  { x: -40, len: 3000, phase: 1.7, w: 0.7 },
  { x: 70, len: 2400, phase: 2.9, w: 1 },
  { x: 160, len: 3200, phase: 0.9, w: 0.75 },
  { x: 240, len: 2700, phase: 2.2, w: 0.85 },
];

export function otherTentacleAt(t: number, k: number): Pt[] {
  const u = wrap(t);
  const o = OTHERS[k]!;
  const f = floatAt(u);
  const a = onFloat(f, { x: o.x, y: 26 });
  const sway = 40 * Math.sin(cycles(2, u) + o.phase);
  const end = { x: a.x + sway - 60 + (k % 3) * 40, y: a.y + o.len };
  // Loosely coiled, the coils drifting down it.
  return sampled(a, { x: a.x + sway * 0.5 + 30, y: a.y + o.len * 0.45 }, end, 80).map((p, i) => ({
    x: p.x + 16 * Math.sin(i * 0.55 + o.phase - cycles(4, u)) * Math.min(1, i / 8),
    y: p.y,
  }));
}

// ---------------------------------------------------------------- danger, the label and the thumb

/** The red of the danger beat, 0 .. 1. */
export const dangerAt = (t: number): number => window01(wrap(t), SO_AT - 0.1, NOT_AT + 0.35, 0.4);
/** The red flash on "WORSE", 0 .. 1. */
export const redFlashAt = (t: number): number => {
  const d = wrap(t) - WORSE_AT;
  return d < 0 || d > 0.7 ? 0 : 0.45 * (1 - d / 0.7) ** 2;
};
/** Sparks crackling between the fingertips: on "sting", and again on "WORSE"; 0 .. 1 over each, or null. */
export function sparksAt(t: number): number | null {
  const u = wrap(t);
  for (const [at, life] of [[STING_AT, 0.7], [WORSE_AT, 0.9]] as const) {
    if (u >= at && u < at + life) return (u - at) / life;
  }
  return null;
}

/** "blue dragon" beside it, from "blue" until it gulps; it turns upside down on "upside down". */
export const dragonLabelAt = (t: number): number => window01(wrap(t), BLUE_AT - 0.05, GULP_AT - 0.05, 0.25);
export const labelTurnAt = (t: number): number => Math.PI * ramp(wrap(t), UPSIDE_AT, DOWN_AT + 0.2);

export interface Thumb extends Pt {
  /** The way it points (tip first), radians. */
  readonly angle: number;
}

/** The thumb's angle: pointing up and to the left, in from the lower right. */
export const THUMB_ANGLE = Math.PI + 0.04;
/** Where its tip comes to rest, world px: just below the slug, level with its head, like a ruler. */
export const THUMB_TIP = { x: 270, y: 1195 } as const;
const THUMB_IN = [NOT_AT + 0.45, SMALLER_AT + 0.25] as const;
const THUMB_OUT = [SO_YES_AT - 0.45, SO_YES_AT + 0.2] as const;

/** The thumb, its tip in world px: slides in along itself, pokes on "thumb", slides back out. */
export function thumbAt(t: number): Thumb | null {
  const u = wrap(t);
  if (u < THUMB_IN[0] || u > THUMB_OUT[1]) return null;
  const away = 1 - smooth((u - THUMB_IN[0]) / (THUMB_IN[1] - THUMB_IN[0])) + smooth((u - THUMB_OUT[0]) / (THUMB_OUT[1] - THUMB_OUT[0]));
  // It nudges up at the slug on "thumb": boing.
  const poke = 30 * Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (u - THUMB_AT + 0.12) / 0.3))));
  const back = 1500 * away;
  // It drops away as it goes, out of the bottom of the picture.
  const drop = 600 * smooth((u - THUMB_OUT[0]) / (THUMB_OUT[1] - THUMB_OUT[0]));
  return { x: THUMB_TIP.x - Math.cos(THUMB_ANGLE) * back, y: THUMB_TIP.y - Math.sin(THUMB_ANGLE) * back - poke + drop, angle: THUMB_ANGLE };
}

/** A jolt of the picture: on the chomps (hard on "EATS") and on "WORSE", px. */
export function shakeAt(t: number): Pt {
  const u = wrap(t);
  let x = 0;
  let y = 0;
  const kick = (d: number, life: number, size: number): void => {
    if (d < 0 || d > life) return;
    const fade = (1 - d / life) ** 2;
    x += size * fade * Math.sin(d * 90);
    y += size * 0.7 * fade * Math.cos(d * 71);
  };
  CHOMPS.forEach((at, i) => kick(since(u, at + 0.03), i === 1 ? 0.45 : 0.22, i === 1 ? 16 : 4));
  kick(u - WORSE_AT, 0.6, 24);
  return { x, y };
}

// ---------------------------------------------------------------- the camera

/** World px shown at the screen's centre, and the zoom. */
export const CENTRE = { x: 540, y: 800 } as const;

interface Shot {
  readonly zoom: number;
  readonly x: number;
  readonly y: number;
}
const CLOSE: Shot = { zoom: 1, x: 560, y: 800 };
const PUSH: Shot = { zoom: 1.08, x: 545, y: 790 };
const BITE: Shot = { zoom: 1.6, x: 395, y: 760 };
const WIDE: Shot = { zoom: 0.55, x: 700, y: 1150 };
const GULP: Shot = { zoom: 0.88, x: 330, y: 770 };
const XRAY: Shot = { zoom: 1.35, x: 470, y: 770 };
const FANS_SHOT: Shot = { zoom: 1, x: 600, y: 770 };
const DANGER: Shot = { zoom: 0.8, x: 620, y: 860 };
const PUNCH: Shot = { zoom: 1.04, x: 570, y: 770 };
const MOW: Shot = { zoom: 0.86, x: 640, y: 720 };
const THUMB: Shot = { zoom: 0.65, x: 790, y: 951 };

const SHOTS: readonly (readonly [number, Shot])[] = [
  [0, CLOSE],
  [WAR_AT + 0.35, PUSH],
  [STEALS_AT - 0.05, BITE],
  [STINGERS_AT + 0.75, BITE],
  [FLOATS_AT + 0.5, WIDE],
  [DOWN_AT + 0.2, WIDE],
  [GULP_AT + 0.05, GULP],
  [AIR_AT + 0.3, GULP],
  [SWALLOWS_AT + 0.45, XRAY],
  [OFF_AT + 0.4, XRAY],
  [STORES_AT + 0.35, FANS_SHOT],
  [FINGERTIPS_AT + 0.75, FANS_SHOT],
  [STING_AT + 0.1, DANGER],
  [WORSE_AT - 0.08, DANGER],
  [WORSE_AT + 0.16, PUNCH],
  [WORSE_AT + 0.4, PUNCH],
  [WARS_AT + 0.15, MOW],
  [NOT_AT + 0.25, MOW],
  [SMALLER_AT - 0.1, THUMB],
  [SO_YES_AT - 0.05, THUMB],
  [YES_AT + 0.35, CLOSE],
  [LOOP_S, CLOSE],
];
const keysOf = (f: (s: Shot) => number): Key[] => SHOTS.map(([t, s]) => ({ t, at: f(s), rate: 0 }));
// Zoom eases in log space, so a pull back feels even.
const ZOOM_KEYS = keysOf((s) => Math.log(s.zoom));
const X_KEYS = keysOf((s) => s.x);
const Y_KEYS = keysOf((s) => s.y);

export interface Camera extends Shot {}

export function cameraAt(t: number): Camera {
  const u = wrap(t);
  return { zoom: Math.exp(curveAt(ZOOM_KEYS, u).at), x: curveAt(X_KEYS, u).at, y: curveAt(Y_KEYS, u).at };
}

export const toScreen = (cam: Camera, p: Pt): Pt => ({ x: (p.x - cam.x) * cam.zoom + CENTRE.x, y: (p.y - cam.y) * cam.zoom + CENTRE.y });
