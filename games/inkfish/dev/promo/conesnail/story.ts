import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, curveAt, type Key, lerp, ramp, smooth, window01 } from '../short';
import { bellOf, type Bell, FISH_HALF_H, fishInBell, GROUND_Y, type Pt, type RostrumState } from './shape';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };
export type { Pt };

/**
 * "This snail swallows fish WHOLE": the geographic cone snail can't chase
 * anything, so it pours insulin into the water; the fish nearby get too
 * sleepy to swim away; its false mouth (the rostrum) opens like a net and
 * the fish goes in whole. Its sting has killed about three dozen people.
 * Told by a narrator (words.ts), every beat timed to the words, a new mood
 * on every sentence (the water's colour, the camera, the snail's eyes and
 * the sounds change with it). A function of time in seconds over LOOP_S.
 *
 *   0     CREEPY. "This snail swallows fish WHOLE.": close on the funnel of
 *         the snail's false mouth, stretched huge round a clownfish going in
 *         tail first, halfway, its eyes wide, the patterned shell behind; on
 *         "WHOLE." it slurps the fish in, the rim closes and the lump
 *         shrinks back into the snail
 *   2.6   COMIC. "A cone snail can't chase anything…": wide, bright: the
 *         snail creeps along the sand; a wrasse zips past it; "…" over it
 *   4.6   SLY. "so it pours INSULIN into the water,": violet; a shimmering
 *         cloud pours out of its mouth and drifts towards three fish; the
 *         snail's eyes narrow; "insulin" written in the cloud
 *   6.8   DROWSY. "and the fish get too sleepy to swim AWAY.": a lavender
 *         haze; the fish slow, droop and sink, their eyes closing, "z"s
 *         rising; the clownfish tries a feeble swim on "swim AWAY" and gives up
 *   9.2   SUSPENSE. "Then its mouth opens like a NET…": dark blue, a slow
 *         push in: the rostrum unfurls into a wide funnel behind the
 *         sleeping clownfish, a net of fine lines on "NET"
 *  11.6   SURPRISE. "and the fish goes in!": a flash: the fish's eyes pop
 *         open and it's slurped in, gulp
 *  12.4   GRAVE. "Its sting has killed about three DOZEN people.": near
 *         black, close on the mouth: a thin harpoon tooth shoots out with a
 *         glint; three rows of twelve little figures appear
 *  15.4   LAUGH. "So, no petting.": warm and sunny: a cartoon hand reaches
 *         down for the shell; a glint at the snail's mouth, and the hand
 *         snaps back with a boing
 *  17.0   CREEPY. "Because": close again, the funnel opening round a
 *         clownfish, into frame 1.
 */

/** The line boil steps at the game's 8 a second: 144 steps, 48 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
/** Whole cycles a loop, as a phase in radians at time t: wiggles that are where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

const word = (text: string, nth: number): (typeof WORDS)[number] => {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w;
};
/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export const said = (text: string, nth = 1): number => word(text, nth).start / TEMPO;
/** When it ends. */
export const ends = (text: string, nth = 1): number => word(text, nth).end / TEMPO;

export const SNAIL_AT = said('snail');
export const FISH_AT = said('fish');
export const WHOLE_AT = said('WHOLE.');
export const A_AT = said('A');
export const CONE_AT = said('cone');
export const CHASE_AT = said('chase');
export const ANYTHING_AT = said('anything…');
export const SO_AT = said('so');
export const POURS_AT = said('pours');
export const INSULIN_AT = said('INSULIN');
export const WATER_AT = said('water,');
export const AND_AT = said('and');
export const FISH2_AT = said('fish', 2);
export const SLEEPY_AT = said('sleepy');
export const SWIM_AT = said('swim');
export const AWAY_AT = said('AWAY.');
export const AWAY_END = ends('AWAY.');
export const THEN_AT = said('Then');
export const MOUTH_AT = said('mouth');
export const OPENS_AT = said('opens');
export const NET_AT = said('NET…');
export const AND2_AT = said('and', 2);
export const FISH3_AT = said('fish', 3);
export const GOES_AT = said('goes');
export const IN_AT = said('in!');
export const ITS_AT = said('Its');
export const STING_AT = said('sting');
export const KILLED_AT = said('killed');
export const THREE_AT = said('three');
export const DOZEN_AT = said('DOZEN');
export const PEOPLE_AT = said('people.');
export const SO2_AT = said('So,');
export const NO_AT = said('no');
export const PETTING_AT = said('petting.');
export const BECAUSE_AT = said('Because');

// ---------------------------------------------------------------- shots and moods

export type Shot = 'hook' | 'crawl' | 'cloud' | 'drowsy' | 'net' | 'sting' | 'pet';

/** Hard cuts, in the pauses between sentences. */
export const CUT_CRAWL = A_AT - 0.12;
export const CUT_CLOUD = SO_AT - 0.1;
export const CUT_DROWSY = AND_AT - 0.12;
export const CUT_NET = THEN_AT - 0.14;
export const CUT_STING = ITS_AT - 0.16;
export const CUT_PET = SO2_AT - 0.25;
export const CUT_HOOK = BECAUSE_AT - 0.26;

export const SHOTS: readonly (readonly [number, Shot])[] = [
  [0, 'hook'], [CUT_CRAWL, 'crawl'], [CUT_CLOUD, 'cloud'], [CUT_DROWSY, 'drowsy'], [CUT_NET, 'net'], [CUT_STING, 'sting'], [CUT_PET, 'pet'], [CUT_HOOK, 'hook'],
];

export function shotAt(t: number): Shot {
  const u = wrap(t);
  let shot: Shot = 'hook';
  for (const [at, s] of SHOTS) if (u >= at) shot = s;
  return shot;
}

export type Mood = 'creepy' | 'comic' | 'sly' | 'drowsy' | 'suspense' | 'surprise' | 'grave' | 'laugh';

/** A new mood on every sentence (and the gulp), [from, mood, fade s]; the end goes back to the opening's. */
export const MOOD_KEYS: readonly (readonly [number, Mood, number])[] = [
  [0, 'creepy', 0.1],
  [CUT_CRAWL, 'comic', 0.08],
  [CUT_CLOUD, 'sly', 0.3],
  [CUT_DROWSY, 'drowsy', 0.45],
  [CUT_NET, 'suspense', 0.3],
  [GOES_AT - 0.05, 'surprise', 0.1],
  [CUT_STING, 'grave', 0.5],
  [CUT_PET, 'laugh', 0.1],
  [CUT_HOOK, 'creepy', 0.1],
];

/** The mood now and the one it is fading from: `u` 0 (all `from`) .. 1 (all `to`). */
export function moodAt(t: number): { readonly from: Mood; readonly to: Mood; readonly u: number } {
  const v = wrap(t);
  let i = 0;
  while (i < MOOD_KEYS.length - 1 && v >= MOOD_KEYS[i + 1]![0]) i++;
  const [at, to, fade] = MOOD_KEYS[i]!;
  // The first key continues the last one round the loop.
  if (i === 0) return { from: MOOD_KEYS[MOOD_KEYS.length - 1]![1], to, u: 1 };
  return { from: MOOD_KEYS[i - 1]![1], to, u: ramp(v, at, at + fade) };
}

// ---------------------------------------------------------------- the hook's own clock

/**
 * The hook runs on its own clock from the cut back to it at the end, past
 * the loop point and on to the cut to the crawl: the funnel opening round
 * the clownfish and the slurp are one continuous moment across the seam.
 */
export const HOOK_FROM = CUT_HOOK;
export const hookTime = (t: number): number => wrap(t - HOOK_FROM);
/** Hook-clock moments: the loop point, "WHOLE.". */
export const H_SEAM = LOOP_S - HOOK_FROM;
export const H_WHOLE = H_SEAM + WHOLE_AT;

/** The funnel's heading in the hook: up and to the right. */
export const HOOK_HEADING = -0.75;
/** In the hook the rim is stretched tight round the fish, not spread like a net: a share of the net's width. */
export const HOOK_SPREAD = 0.5;
/** The clownfish's body length, sp. */
export const NEMO_LEN = 238;

const HOOK_INSIDE: readonly Key[] = [
  { t: 0, at: -0.42, rate: 0.5 },
  { t: 0.7, at: 0.2, rate: 0.55 },
  { t: H_SEAM, at: 0.45, rate: 0.12 },
  { t: H_SEAM + 1.6, at: 0.6, rate: 0.12 },
  { t: H_WHOLE + 0.06, at: 0.68, rate: 0.6 },
  { t: H_WHOLE + 0.32, at: 1.12, rate: 0 },
];
const HOOK_OPEN: readonly Key[] = [
  { t: 0, at: 0.42, rate: 0.9 },
  { t: 0.75, at: 0.96, rate: 0.15 },
  { t: H_SEAM, at: 1, rate: 0 },
  { t: H_WHOLE + 0.38, at: 1, rate: 0 },
  { t: H_WHOLE + 0.7, at: 0.06, rate: 0 },
];
const HOOK_ZOOM: readonly Key[] = [
  { t: 0, at: 1.7, rate: 0.1 },
  { t: H_SEAM, at: 1.88, rate: 0.05 },
  { t: H_WHOLE, at: 1.95, rate: 0.03 },
  { t: H_SEAM + CUT_CRAWL, at: 1.99, rate: 0.02 },
];

// ---------------------------------------------------------------- the camera

/** The camera: world point (x, y) at the screen's centre of action, `zoom` screen px per sp. */
export interface Camera {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}
export const SCREEN_C: Pt = { x: 540, y: 800 };
export const toScreen = (cam: Camera, p: Pt): Pt => ({ x: SCREEN_C.x + (p.x - cam.x) * cam.zoom, y: SCREEN_C.y + (p.y - cam.y) * cam.zoom });

/** Jolts: the hook's slurp, the gulp on "in!", the harpoon, the hand's snap. [at, px] */
const JOLTS: readonly (readonly [number, number])[] = [
  [WHOLE_AT + 0.16, 16],
  [IN_AT + 0.06, 26],
  [STING_AT + 0.06, 12],
  [NO_AT + 0.02, 10],
];
export function shakeAt(t: number): Pt {
  const u = wrap(t);
  let x = 0;
  let y = 0;
  for (const [at, px] of JOLTS) {
    const s = u - at;
    if (s < 0 || s > 0.45) continue;
    const amp = px * (1 - s / 0.45) ** 2;
    x += amp * Math.sin(s * 115);
    y += amp * 0.7 * Math.cos(s * 140);
  }
  return { x, y };
}

export function cameraAt(t: number): Camera {
  const u = wrap(t);
  switch (shotAt(u)) {
    case 'hook':
      return { x: 292, y: -14, zoom: curveAt(HOOK_ZOOM, hookTime(u)).at };
    case 'crawl':
      return { x: 170, y: -182, zoom: 1.1 };
    case 'cloud':
      return { x: lerp(250, 320, smooth((u - CUT_CLOUD) / (CUT_DROWSY - CUT_CLOUD))), y: -168, zoom: 1.12 };
    case 'drowsy': {
      const zoom = lerp(1.16, 1.24, smooth((u - CUT_DROWSY) / (CUT_NET - CUT_DROWSY)));
      return { x: 450, y: GROUND_Y - 330 / zoom, zoom };
    }
    case 'net': {
      const zoom = lerp(1.08, 1.28, ramp(u, CUT_NET, NET_AT + 0.3));
      return { x: lerp(400, 372, ramp(u, CUT_NET, NET_AT + 0.4)), y: GROUND_Y - 320 / zoom, zoom };
    }
    case 'sting': {
      const zoom = lerp(1.75, 1.85, ramp(u, CUT_STING, CUT_PET));
      return { x: lerp(290, 306, ramp(u, CUT_STING, CUT_PET)), y: GROUND_Y - 300 / zoom, zoom };
    }
    case 'pet':
      return { x: 70, y: GROUND_Y - 330 / 1.22, zoom: 1.22 };
  }
}

// ---------------------------------------------------------------- the snail

/** Where the snail is (its shell's middle): at home, except creeping along in the comic beat. */
export function snailAt(t: number): Pt {
  const u = wrap(t);
  return shotAt(u) === 'crawl' ? { x: 26 * (u - CUT_CRAWL), y: 0 } : { x: 0, y: 0 };
}

/** The snail's face: its two eyes on stalks. */
export interface EyesNow {
  /** Upper lid, 0 open .. 1 shut. */
  readonly lid: number;
  /** The lid's tilt, radians: positive narrows the eye towards its front (sly, menacing). */
  readonly slant: number;
  /** Where the pupils look, as a vector of length 0 (straight out at us) .. 1. */
  readonly look: Pt;
  /** Stalk length, share of full. */
  readonly stalk: number;
}

const towards = (from: Pt, to: Pt, k = 1): Pt => {
  const d = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: ((to.x - from.x) / d) * k, y: ((to.y - from.y) / d) * k };
};
const mixPt = (a: Pt, b: Pt, u: number): Pt => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) });
const EYE_AT: Pt = { x: 236, y: 22 };

export function eyesAt(t: number): EyesNow {
  const u = wrap(t);
  switch (shotAt(u)) {
    case 'hook':
      return { lid: 0.24, slant: 0.32, look: { x: 0.7, y: -0.6 }, stalk: 1 };
    case 'crawl': {
      const zip = zipAt(u);
      const bored = { x: 0.55, y: 0.15 };
      const follow = zip ? towards({ x: EYE_AT.x + snailAt(u).x, y: EYE_AT.y }, zip) : bored;
      const w = window01(u, CHASE_AT - 0.25, CHASE_AT + 0.75, 0.12);
      const sag = ramp(u, ANYTHING_AT, ANYTHING_AT + 0.4);
      return { lid: lerp(0.48, 0.66, sag), slant: -0.12, look: mixPt(mixPt(bored, follow, w), { x: 0.25, y: 0.7 }, sag), stalk: lerp(1, 0.82, sag) };
    }
    case 'cloud':
      return { lid: lerp(0.3, 0.62, ramp(u, SO_AT, POURS_AT)), slant: lerp(0, 0.42, ramp(u, SO_AT, POURS_AT)), look: mixPt({ x: 0.1, y: 0.15 }, { x: 0.9, y: -0.3 }, ramp(u, INSULIN_AT, WATER_AT)), stalk: 1 };
    case 'drowsy':
      return { lid: 0.42, slant: 0.3, look: { x: 0.9, y: -0.35 }, stalk: 1 };
    case 'net': {
      const fed = ramp(u, IN_AT + 0.3, IN_AT + 0.6);
      return { lid: lerp(lerp(0.36, 0, ramp(u, MOUTH_AT, NET_AT)), 0.5, fed), slant: lerp(0.15, -0.2, fed), look: mixPt({ x: 0.85, y: -0.5 }, { x: 0.1, y: 0.2 }, fed), stalk: 1 };
    }
    case 'sting':
      return { lid: 0.3, slant: 0.45, look: { x: 0.15, y: 0.1 }, stalk: 1 };
    case 'pet': {
      const hand = handAt(u);
      const watch = hand ? towards(EYE_AT, hand.tip) : { x: 0.3, y: -0.2 };
      const smug = ramp(u, NO_AT + 0.15, NO_AT + 0.45);
      return { lid: lerp(lerp(0.3, 0.02, ramp(u, SO2_AT, NO_AT - 0.2)), 0.55, smug), slant: lerp(0, 0.3, smug), look: mixPt(watch, { x: 0.1, y: 0.25 }, smug), stalk: 1 };
    }
  }
}

// ---------------------------------------------------------------- the rostrum (the false mouth)

export interface RostrumNow extends RostrumState {
  /** The fine net of lines over the funnel, 0 .. 1. */
  readonly mesh: number;
  /** How see-through the funnel's wall is: 0 clear .. 1 solid. */
  readonly wall: number;
}

const tucked = (open: number): RostrumNow => ({ heading: 0.04, open, spread: 1, pucker: 0, mesh: 0, wall: 0.85 });
export const NET_HEADING = -0.67;
export const STING_HEADING = 0.06;

const NET_OPEN: readonly Key[] = [
  { t: CUT_NET, at: 0.06, rate: 0 },
  { t: MOUTH_AT - 0.05, at: 0.1, rate: 0.25 },
  { t: OPENS_AT + 0.25, at: 0.45, rate: 0.9 },
  { t: NET_AT + 0.06, at: 1.03, rate: 0.2 },
  { t: NET_AT + 0.45, at: 0.97, rate: 0 },
  { t: IN_AT + 0.3, at: 0.97, rate: 0 },
  { t: CUT_STING, at: 0.3, rate: 0 },
];

export function rostrumAt(t: number): RostrumNow {
  const u = wrap(t);
  switch (shotAt(u)) {
    case 'hook': {
      const h = hookTime(u);
      const pucker = ramp(h, H_WHOLE + 0.12, H_WHOLE + 0.34);
      // Lips stretched round the fish, pulsing as it struggles.
      const spread = HOOK_SPREAD * (1 + 0.05 * Math.sin(cycles(16, u)));
      return { heading: HOOK_HEADING + 0.03 * Math.sin(cycles(3, u)), open: curveAt(HOOK_OPEN, h).at, spread, pucker, mesh: 0.2, wall: lerp(0.66, 0.96, pucker) };
    }
    case 'crawl':
      return tucked(0.03);
    case 'cloud':
      // It opens a little to pour.
      return tucked(lerp(0.03, 0.16, ramp(u, SO_AT, POURS_AT + 0.2)));
    case 'drowsy':
      return tucked(0.13);
    case 'net': {
      const pucker = ramp(u, IN_AT + 0.02, IN_AT + 0.22);
      return {
        heading: NET_HEADING,
        open: curveAt(NET_OPEN, u).at,
        spread: 1,
        pucker,
        mesh: ramp(u, NET_AT - 0.15, NET_AT + 0.2) * (1 - 0.7 * pucker),
        wall: lerp(0.66, 0.96, pucker),
      };
    }
    case 'sting':
      return { heading: STING_HEADING, open: 0.16, spread: 1, pucker: 0, mesh: 0, wall: 0.85 };
    case 'pet':
      return tucked(0.04);
  }
}

export const bellAt = (t: number): Bell => bellOf(rostrumAt(t), snailAt(t));

// ---------------------------------------------------------------- the fish

export type FishId = 'nemo' | 'zip' | 'c1' | 'c2';
export type FishKind = 'clownfish' | 'chromis' | 'wrasse';

export interface FishNow {
  readonly id: FishId;
  readonly shape: FishKind;
  /** Body centre, sp, and body length. */
  readonly x: number;
  readonly y: number;
  readonly length: number;
  readonly facing: 1 | -1;
  /** Radians, positive lifts the nose. */
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
  /** Eyes popped wide, 0 .. 1, and the lids, 0 open .. 1 shut. */
  readonly wide: number;
  readonly lid: number;
  /** Going into the funnel: how far in (share of its length), and how much of it still shows. */
  readonly bell: { readonly inside: number; readonly seen: number } | null;
  /** Speed lines behind it, 0 .. 1. */
  readonly speed: number;
}

/** Where the three fish idle in front of the snail, sp. */
export const HOMES: Readonly<Record<'nemo' | 'c1' | 'c2', { readonly at: Pt; readonly len: number; readonly facing: 1 | -1; readonly phase: number }>> = {
  nemo: { at: { x: 520, y: -50 }, len: NEMO_LEN * 0.92, facing: 1, phase: 0 },
  c1: { at: { x: 700, y: -190 }, len: 160, facing: -1, phase: 2.1 },
  c2: { at: { x: 670, y: 40 }, len: 150, facing: 1, phase: 4.2 },
};

/** How sleepy the fish are, 0 .. 1: from "the fish get too sleepy". */
export const sleepAt = (t: number): number => {
  const u = wrap(t);
  return u < CUT_DROWSY || u >= CUT_STING ? 0 : ramp(u, FISH2_AT - 0.1, SLEEPY_AT + 0.5);
};
/** The clownfish's feeble try on "swim AWAY". */
export const tryAt = (t: number): number => window01(wrap(t), SWIM_AT - 0.12, AWAY_END + 0.25, 0.18);

/** The wrasse zipping past in the comic beat. */
export function zipAt(t: number): Pt | null {
  const u = wrap(t);
  if (shotAt(u) !== 'crawl') return null;
  const from = CHASE_AT - 0.22;
  const to = CHASE_AT + 0.42;
  if (u < from - 0.05 || u > to + 0.05) return null;
  return { x: lerp(-760, 1150, (u - from) / (to - from)), y: -190 + 12 * Math.sin((u - from) * 20) };
}

function idler(id: 'nemo' | 'c1' | 'c2', u: number): FishNow {
  const home = HOMES[id];
  const s = sleepAt(u);
  const effortful = id === 'nemo' ? tryAt(u) : 0;
  const deep = shotAt(u) === 'net' ? 1 : s;
  return {
    id,
    shape: id === 'nemo' ? 'clownfish' : 'chromis',
    x: home.at.x + home.facing * (8 * Math.sin(cycles(4, u) + home.phase) * (1 - deep) + 22 * effortful),
    y: home.at.y + 7 * Math.sin(cycles(5, u) + home.phase) + 30 * deep - 10 * effortful,
    length: home.len,
    facing: home.facing,
    tilt: -0.3 * deep + 0.22 * effortful,
    beat: cycles(id === 'nemo' ? 27 : 31, u) + home.phase,
    effort: lerp(0.55, 0.05, deep) + 0.8 * effortful,
    wide: 0,
    lid: Math.min(1, 0.92 * deep * (1 - 0.6 * effortful) + (shotAt(u) === 'net' ? 0.08 : 0)),
    bell: null,
    speed: 0,
  };
}

/** The clownfish on the funnel's axis, going in tail first. */
function inBell(u: number, bell: Bell, inside: number, length: number, seen: number): FishNow {
  const at = fishInBell(bell, inside, length);
  const heading = Math.atan2(bell.dir.y, bell.dir.x);
  return {
    id: 'nemo',
    shape: 'clownfish',
    x: at.x,
    y: at.y,
    length,
    facing: 1,
    // Wriggling to get free.
    tilt: -heading + 0.05 * Math.sin(cycles(40, u)),
    beat: cycles(54, u),
    effort: 1,
    wide: 1,
    lid: 0,
    bell: { inside, seen },
    speed: 0,
  };
}

const NET_INSIDE: readonly Key[] = [
  { t: NET_AT - 0.3, at: -0.06, rate: 0 },
  { t: NET_AT + 0.2, at: 0.1, rate: 0 },
  { t: GOES_AT - 0.02, at: 0.14, rate: 0.15 },
  { t: IN_AT + 0.08, at: 1.12, rate: 0.5 },
  { t: IN_AT + 0.4, at: 1.2, rate: 0 },
];
/** How far the sleeping clownfish has been drawn onto the funnel's axis as the net opens, 0 .. 1. */
export const drawnAt = (t: number): number => (shotAt(t) === 'net' ? ramp(wrap(t), NET_AT - 0.45, NET_AT + 0.1) : 0);

export function fishAt(t: number): FishNow[] {
  const u = wrap(t);
  const shot = shotAt(u);
  if (shot === 'hook') {
    const h = hookTime(u);
    return [inBell(u, bellAt(u), curveAt(HOOK_INSIDE, h).at, NEMO_LEN, 1 - ramp(h, H_WHOLE + 0.3, H_WHOLE + 0.62))];
  }
  if (shot === 'crawl') {
    const z = zipAt(u);
    if (!z) return [];
    return [{ id: 'zip', shape: 'wrasse', x: z.x, y: z.y, length: 230, facing: 1, tilt: 0.04, beat: cycles(80, u), effort: 1, wide: 0, lid: 0, bell: null, speed: 1 }];
  }
  if (shot === 'cloud' || shot === 'drowsy') return [idler('nemo', u), idler('c1', u), idler('c2', u)];
  if (shot === 'net') {
    const others = [idler('c1', u), idler('c2', u)];
    const drawn = drawnAt(u);
    const sleepy = idler('nemo', u);
    if (drawn <= 0) return [sleepy, ...others];
    const len = HOMES.nemo.len;
    const axis = inBell(u, bellAt(u), curveAt(NET_INSIDE, u).at, len, 1 - ramp(u, IN_AT + 0.25, IN_AT + 0.55));
    const woke = ramp(u, GOES_AT - 0.08, GOES_AT + 0.06);
    const blended: FishNow = {
      ...axis,
      x: lerp(sleepy.x, axis.x, drawn),
      y: lerp(sleepy.y, axis.y, drawn),
      tilt: lerp(sleepy.tilt, axis.tilt, drawn),
      effort: lerp(0.06, 1, woke),
      wide: woke,
      lid: lerp(1, 0, woke),
      bell: drawn >= 1 ? axis.bell : null,
    };
    return [blended, ...others];
  }
  return [];
}

// ---------------------------------------------------------------- the insulin cloud and the "z"s

export interface Puff {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly alpha: number;
  /** A twinkle on it, 0 .. 1. */
  readonly sparkle: number;
}

const PUFFS = Array.from({ length: 140 }, (_, i) => {
  // A fixed scatter (golden-angle steps): same cloud every loop.
  const g = (i * 0.618034) % 1;
  const h = (i * 0.754877) % 1;
  return { born: i * 0.016, angle: -0.42 + (g - 0.5) * 1.3, speed: 150 + 170 * h, twinkle: 3 + (i % 5), phase: i * 2.4 };
});
const CLOUD_FROM = POURS_AT - 0.1;

/** How much of the cloud is there, 0 .. 1: from "pours" until the cut to the sting. */
export const cloudAt = (t: number): number => {
  const u = wrap(t);
  return u >= CLOUD_FROM && u < CUT_STING ? ramp(u, CLOUD_FROM, CLOUD_FROM + 0.4) * (1 - 0.5 * ramp(u, IN_AT, IN_AT + 0.5)) : 0;
};

export function puffsAt(t: number): Puff[] {
  const u = wrap(t);
  const amount = cloudAt(u);
  if (amount <= 0) return [];
  const mouth = bellOf(tucked(0.16)).centre;
  return PUFFS.flatMap((p) => {
    const age = u - CLOUD_FROM - p.born;
    if (age <= 0) return [];
    const run = 1.8 * (1 - Math.exp(-age / 1.8));
    return [{
      x: mouth.x + Math.cos(p.angle) * p.speed * run + 18 * age + 14 * Math.sin(cycles(2, u) + p.phase),
      y: mouth.y + Math.sin(p.angle) * p.speed * run - 9 * age + 10 * Math.cos(cycles(3, u) + p.phase),
      r: 16 + 64 * (1 - Math.exp(-age / 1.1)),
      alpha: amount * clamp01(age / 0.3) * 0.085 * (1 - 0.5 * clamp01((age - 1.5) / 2)),
      sparkle: amount * Math.max(0, Math.sin(cycles(p.twinkle * 4, u) + p.phase)) ** 6,
    }];
  });
}

export interface Zed {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly alpha: number;
  readonly turn: number;
}

/** "z"s rising from the sleeping fish's heads, one every 0.5 s each, sp. */
export function zedsAt(t: number): Zed[] {
  const u = wrap(t);
  const s = sleepAt(u);
  if (s < 0.3) return [];
  const fishes = fishAt(u).filter((f) => f.lid > 0.6 && f.id !== 'zip');
  return fishes.flatMap((f, k) => {
    const head = { x: f.x + f.facing * f.length * 0.32, y: f.y - f.length * 0.25 };
    return [0, 1, 2].flatMap((n) => {
      const age = (((u + k * 0.17 + n * 0.5) % 1.5) + 1.5) % 1.5;
      const fade = Math.min(1, age / 0.25, (1.5 - age) / 0.4);
      return [{
        x: head.x - age * 26 + 10 * Math.sin(age * 5 + k),
        y: head.y - age * 85,
        size: 34 + age * 26,
        alpha: fade * clamp01((s - 0.3) / 0.4) * (f.lid > 0.6 ? 1 : 0),
        turn: -0.25 + 0.15 * Math.sin(age * 4 + n),
      }];
    });
  });
}

// ---------------------------------------------------------------- the comic "…"

/** The three dots over the snail popping up on "anything…", 0 .. 1 each (with a little overshoot). */
export function dotsAt(t: number): number[] {
  const u = wrap(t);
  if (shotAt(u) !== 'crawl') return [0, 0, 0];
  return [0, 1, 2].map((i) => {
    const s = u - (ANYTHING_AT + 0.04 + i * 0.12);
    if (s <= 0) return 0;
    return s > 0.2 ? 1 : 1 + 0.35 * Math.sin((s / 0.2) * Math.PI) * (1 - s / 0.2) + (smooth(s / 0.08) - 1);
  });
}

// ---------------------------------------------------------------- the harpoon, the people, the hand

export interface HarpoonNow {
  readonly from: Pt;
  readonly heading: number;
  readonly len: number;
  readonly glint: number;
}

export function harpoonAt(t: number): HarpoonNow | null {
  const u = wrap(t);
  const shot = shotAt(u);
  const bell = bellAt(u);
  const heading = Math.atan2(bell.dir.y, bell.dir.x);
  if (shot === 'sting') {
    const out = ramp(u, STING_AT, STING_AT + 0.09) * (1 - 0.35 * ramp(u, PEOPLE_AT + 0.3, CUT_PET));
    if (out <= 0) return null;
    return { from: bell.centre, heading, len: 190 * out, glint: Math.max(window01(u, STING_AT + 0.06, STING_AT + 0.7, 0.1), 0.8 * window01(u, DOZEN_AT, DOZEN_AT + 0.6, 0.12)) };
  }
  if (shot === 'pet') {
    const out = window01(u, NO_AT - 0.14, NO_AT + 0.32, 0.07);
    if (out <= 0) return null;
    return { from: bell.centre, heading: -0.55, len: 70 * out, glint: out };
  }
  return null;
}

/** Three rows of twelve little figures, each popping in, 0 .. 1: "three DOZEN people". */
export const PEOPLE_ROWS = 3;
export const PEOPLE_PER_ROW = 12;
const ROW_AT = [THREE_AT - 0.02, THREE_AT + 0.2, DOZEN_AT + 0.02];
export function peopleAt(t: number): number[][] {
  const u = wrap(t);
  const on = shotAt(u) === 'sting';
  return ROW_AT.map((at) => Array.from({ length: PEOPLE_PER_ROW }, (_, j) => (on ? ramp(u, at + j * 0.022, at + j * 0.022 + 0.12) : 0)));
}

export interface HandNow {
  /** The fingertip, sp, and the way the finger points (canvas radians). */
  readonly tip: Pt;
  readonly angle: number;
  /** The comic wobble after the snap, radians. */
  readonly wobble: number;
  /** Motion lines, 0 .. 1. */
  readonly whoosh: number;
}

/** The shell's top, where the finger is going. */
export const PET_SPOT: Pt = { x: -30, y: -104 };
/** The hand comes down from the top right. */
const ARM: Pt = { x: 0.5, y: -0.866 };
const HAND_DIST: readonly Key[] = [
  { t: CUT_PET, at: 780, rate: 0 },
  { t: SO2_AT + 0.05, at: 560, rate: -420 },
  { t: NO_AT - 0.1, at: 46, rate: -60 },
  { t: NO_AT, at: 34, rate: 0 },
  { t: NO_AT + 0.16, at: 760, rate: 2200 },
  { t: NO_AT + 0.4, at: 1000, rate: 0 },
];

export function handAt(t: number): HandNow | null {
  const u = wrap(t);
  if (shotAt(u) !== 'pet') return null;
  const d = curveAt(HAND_DIST, u).at;
  if (d > 960) return null;
  const s = u - NO_AT;
  const wobble = s > 0 ? 0.28 * Math.sin(s * 34) * Math.exp(-s / 0.3) : 0.04 * Math.sin(u * 7);
  return {
    tip: { x: PET_SPOT.x + ARM.x * d, y: PET_SPOT.y + ARM.y * d },
    angle: Math.atan2(-ARM.y, -ARM.x),
    wobble,
    whoosh: window01(u, NO_AT, NO_AT + 0.3, 0.06),
  };
}

// ---------------------------------------------------------------- flashes

/** White flashes: the slurp, the gulp, the harpoon's glint, the snap. */
export function flashAt(t: number): number {
  const u = wrap(t);
  const pop = (at: number, k: number): number => {
    const s = u - at;
    return s < 0 || s > 0.3 ? 0 : k * (1 - s / 0.3) ** 2;
  };
  return Math.max(pop(WHOLE_AT + 0.15, 0.18), pop(IN_AT + 0.04, 0.45), pop(STING_AT + 0.07, 0.22), pop(NO_AT - 0.02, 0.12));
}

/** The lump of the swallowed fish in the funnel, sp half-width (0: none). */
export const lumpOf = (f: FishNow): number => (f.bell ? FISH_HALF_H * f.length * f.bell.seen : 0);
