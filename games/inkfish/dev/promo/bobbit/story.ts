import { BOIL_FPS } from '../../../src/art/textures';
import { curveAt, type Key, ramp, window01 } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This worm's jaws can slice a fish in half": the bobbit worm (Eunice
 * aphroditois), an iridescent bristle worm up to 299 cm (about 10 ft) long
 * that hides in a burrow in the sand with only its scissor jaws and five
 * antennae showing, and strikes so fast its prey is sometimes cut in two.
 * "Barry" hid in a tank at the Blue Reef Aquarium, Newquay, England, for
 * months in 2009, snipping the coral.
 *
 * Every beat is a function of video time t (seconds) over a loop of LOOP_S,
 * timed to the narrator's words (words.ts). One scene at a time, with short
 * crossfades between them:
 *
 *   0     "This worm's jaws can slice a fish in HALF.": night; the worm bursts
 *         up out of the sand, its scissor jaws wide round a small fish, in a
 *         flashlight's beam; they snap shut on "HALF" and the fish is gone
 *   3.3   "Up to ten feet of worm hides in the sand,": a cut-away under the
 *         sand: the worm's whole length in its burrow; the bar "10 ft / 3 m"
 *         grows on "ten", a diver's outline beside it
 *   5.8   "with only its jaws showing…": above the sand again, just the jaws
 *         and antennae poking out; the camera creeps in
 *   7.7   "a fish brushes its feelers…": a fish noses an antenna; it twitches
 *   9.33  "SNAP!": the strike, a white flash, a jolt
 *   10.1  "Gone, down into the dark.": the worm yanks back down its hole;
 *         sand settles; the dark closes in
 *   12.5  "One like it hid in an English aquarium for MONTHS.": a warm room,
 *         a tank, a toppled coral, a Union Jack; the calendar's pages fly off
 *   15.4  "They named him Barry.": the camera rushes into the rock: the worm
 *         peeks out wearing a "BARRY" name tag, ta-da
 *   16.5  "And Barry knows:": into the dark crevice, and the worm bursts up out
 *         of the sand round the fish again: frame 1.
 */

/** The line boil steps at the game's 8 a second: 144 steps, 48 whole cycles a loop. */
const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** Back to its starting value once its scene is off screen, so every value is where it started at the seam. */
const after = (u: number, at: number): number => 1 - ramp(u, at, at + 0.15);

/** Whole cycles a loop, as a phase in radians: wiggles that are where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}
/** When a word ends. */
export function ends(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.end / TEMPO;
}

export const WORMS_AT = said("worm's");
export const JAWS_AT = said('jaws');
export const SLICE_AT = said('slice');
export const HALF_AT = said('HALF.');
export const UP_AT = said('Up');
export const TEN_AT = said('ten');
export const FEET_AT = said('feet');
export const WORM_AT = said('worm');
export const HIDES_AT = said('hides');
export const SAND_AT = said('sand,');
export const WITH_AT = said('with');
export const JAWS2_AT = said('jaws', 2);
export const SHOWING_AT = said('showing…');
export const FISH2_AT = said('fish', 2);
export const BRUSHES_AT = said('brushes');
export const FEELERS_AT = said('feelers…');
export const SNAP_AT = said('SNAP!');
export const GONE_AT = said('Gone,');
export const DOWN_AT = said('down');
export const DARK_AT = said('dark.');
export const ONE_AT = said('One');
export const HID_AT = said('hid');
export const ENGLISH_AT = said('English');
export const AQUARIUM_AT = said('aquarium');
export const MONTHS_AT = said('MONTHS.');
export const MONTHS_END = ends('MONTHS.');
export const THEY_AT = said('They');
export const BARRY_AT = said('Barry.');
export const AND_AT = said('And');
export const KNOWS_AT = said('knows:');

// ---------------------------------------------------------------- scenes

export type SceneId = 'strike' | 'burrow' | 'lurk' | 'tank';

/** Crossfades: [from, to, the scene before, the scene after]. */
export const CUTS: readonly (readonly [number, number, SceneId, SceneId])[] = [
  [UP_AT - 0.24, UP_AT + 0.02, 'strike', 'burrow'],
  [WITH_AT - 0.2, WITH_AT, 'burrow', 'lurk'],
  [ONE_AT - 0.3, ONE_AT - 0.04, 'lurk', 'tank'],
  [AND_AT - 0.12, AND_AT + 0.1, 'tank', 'strike'],
];

/** What's on screen at t: one scene, or two mixing (`mix` of the second over the first). */
export interface SceneMix {
  readonly a: SceneId;
  readonly b: SceneId | null;
  readonly mix: number;
}

export function sceneAt(t: number): SceneMix {
  const u = wrap(t);
  for (let i = CUTS.length - 1; i >= 0; i--) {
    const [from, to, before, after] = CUTS[i]!;
    if (u >= to) return { a: after, b: null, mix: 0 };
    if (u >= from) return { a: before, b: after, mix: ramp(u, from, to) };
  }
  return { a: 'strike', b: null, mix: 0 };
}

// ---------------------------------------------------------------- the worm

/** A point in a scene's own coordinates (px at zoom 1). */
export interface Pt {
  readonly x: number;
  readonly y: number;
}

/**
 * The worm as drawn: where its head is (the hinge of the jaws), which way it
 * points (radians from straight up, + leans right), how wide its jaws are
 * (0 shut, the blades crossed like scissors .. 1 gaping), and how hard its
 * antennae twitch (0 .. 1).
 */
export interface Worm {
  readonly head: Pt;
  readonly axis: number;
  readonly jaw: number;
  readonly twitch: number;
  /** The antennae's length, × the usual. */
  readonly reach?: number;
}

/** The night scenes' seabed: the burrow's mouth and the sand's surface (scene px). */
export const HOLE: Pt = { x: 540, y: 1250 };
/** How far the head stands above the hole fully out, px. */
export const REACH = 560;
/** The body's width, the jaw blades' length (each a hooked claw, curling 240°), px. */
export const BODY_W = 170;
export const JAW_LEN = 480;
/**
 * Each claw's swing about its hinge (radians out from the head's axis):
 * gaping wide, and shut (the two curled claws closed into a ring over the
 * head, tips crossed like a sprung bear trap).
 */
export const JAW_GAPE = 2.62;
export const JAW_SHUT = 1.36;

// ---------------------------------------------------------------- the strike (frame 1 and the end)

/**
 * The strike runs on its own clock s: 0 is frame 1 (the worm bursting out,
 * its claws slammed round the fish, their tips already on its back and
 * belly), 1 the jaws shut, below 0 the worm still under the sand. The hook plays it in slow motion and snaps it shut on
 * "HALF"; the end runs it up from under the sand to 0, at the same pace.
 */
export const SNAP_T = HALF_AT + 0.05;
const OPENING_RATE = 0.24;
const HOOK_CLOCK: readonly Key[] = [
  { t: 0, at: 0, rate: OPENING_RATE },
  { t: SLICE_AT, at: 0.42 },
  { t: SNAP_T - 0.12, at: 0.8 },
  { t: SNAP_T, at: 1, rate: 1.6 },
  { t: UP_AT + 0.1, at: 1.7, rate: 0.6 },
];
const END_CLOCK: readonly Key[] = [
  { t: AND_AT - 0.1, at: -1.3, rate: 0.3 },
  { t: KNOWS_AT - 0.2, at: -0.62 },
  { t: LOOP_S, at: 0, rate: OPENING_RATE },
];

export function strikeClock(t: number): number {
  const u = wrap(t);
  return u < 8 ? curveAt(HOOK_CLOCK, u).at : curveAt(END_CLOCK, u).at;
}

const k = (t: number, at: number, rate?: number): Key => (rate === undefined ? { t, at } : { t, at, rate });
/** How far out of the sand the worm is (0 under it .. 1 standing at full REACH), by the strike clock. */
const EMERGE: readonly Key[] = [k(-1.3, -0.3, 0), k(-0.8, -0.08), k(-0.35, 0.2), k(0, 0.27, 0.06), k(1, 0.33, 0.05), k(1.7, 0.3)];
/** The jaws' gape by the strike clock, before they snap: flung wide as it rises, slammed onto the fish, pressing, then (at 0.86 .. 1) shut. */
const GAPE: readonly Key[] = [k(-1.3, 0.15, 0), k(-0.75, 0.8), k(-0.32, 1), k(0, 0.31, -0.12), k(0.86, 0.25, 0)];
/** The claws' gape at frame 1, where their tips meet the fish. */
export const FRAME1_JAW = 0.31;

/** The worm in the strike, by its clock: rising, gaping, then snapping shut at s = 1. */
export function strikeWormAt(s: number, t: number): Worm {
  const emerge = curveAt(EMERGE, s).at;
  const shut = ramp(s, 0.86, 1);
  const jaw = curveAt(GAPE, Math.min(s, 0.86)).at * (1 - shut);
  const sway = 0.035 * Math.sin(cycles(2, t));
  return {
    head: { x: HOLE.x + 10 * Math.sin(cycles(2, t)), y: HOLE.y - REACH * emerge },
    axis: sway,
    jaw,
    twitch: 0.6,
    reach: 0.55,
  };
}

/** The fish in the strike: hovering over the hole, caught between the jaws; gone once they shut. */
export interface Fish {
  readonly x: number;
  readonly y: number;
  readonly length: number;
  readonly facing: 1 | -1;
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
}

export const STRIKE_FISH_LEN = 150;
/** At frame 1 the fish is caught between the claws' tips, about 190 px above their hinges (the hinges sit 0.12 body widths over the head). */
const FISH_Y = HOLE.y - 0.27 * REACH - 0.12 * BODY_W - 190;
/**
 * The fish in the strike: drifting calmly over the hole, then, as the sand
 * bursts, panicking: wide-eyed, nose up to flee, body bent, caught between
 * the claws and held there; gone once they shut.
 */
export function strikeFishAt(s: number, t: number): Fish | null {
  if (s >= 0.97) return null;
  const panic = ramp(s, -0.85, -0.3);
  return {
    x: HOLE.x + 10 * Math.sin(cycles(2, t)) + 16 * Math.sin(cycles(3, t)) * (1 - panic) + 4 * Math.sin(cycles(23, t)) * panic,
    y: FISH_Y + 10 * Math.sin(cycles(2, t)) * (1 - panic) - 14 * panic,
    length: STRIKE_FISH_LEN,
    facing: -1,
    tilt: 0.05 + 1.1 * panic,
    beat: cycles(9, t) * (1 - panic) + (1.9 + 0.5 * Math.sin(cycles(14, t))) * panic,
    effort: 0.3 + 0.7 * panic,
  };
}

/** How panicked the fish is (wide eye, shake lines), 0 .. 1, by the strike clock. */
export const fishPanicAt = (s: number): number => ramp(s, -0.85, -0.3);

/** Sand flung up as the worm bursts out, by the strike clock: 0 before, rising and falling, then gone. */
export const sprayAt = (s: number): number => s + 0.82;

// ---------------------------------------------------------------- the lurk, the snap and "gone"

/** The camera on the night scene during the lurk: world point `focus` at screen point `at`, zoomed. */
export interface Camera {
  readonly focus: Pt;
  readonly at: Pt;
  readonly zoom: number;
}
export const STRIKE_CAM: Camera = { focus: { x: 540, y: HOLE.y - 0.27 * REACH }, at: { x: 540, y: 1060 }, zoom: 2.15 };
export const toScreen = (cam: Camera, p: Pt): Pt => ({ x: cam.at.x + (p.x - cam.focus.x) * cam.zoom, y: cam.at.y + (p.y - cam.focus.y) * cam.zoom });

const LURK_ZOOM: readonly Key[] = [
  k(WITH_AT - 0.3, 0.92), k(FISH2_AT, 1.06), k(SNAP_AT - 0.1, 1.16, 0.05), k(SNAP_AT + 0.12, 1.32, 0), k(GONE_AT + 0.3, 1.18), k(ONE_AT, 1.32),
];
export function lurkCamAt(t: number): Camera {
  const u = wrap(t);
  return { focus: { x: 540, y: 1020 }, at: { x: 540, y: 880 }, zoom: curveAt(LURK_ZOOM, u).at };
}

/** The fish's spot when it noses the leftmost antenna, and where the worm's lunge takes its head. */
const NIBBLE: Pt = { x: 360, y: 870 };
const LUNGE_HEAD: Pt = { x: 410, y: 1060 };
/** Where the jaws close in the lunge: halfway up the blades, leaning to the fish. */
const GRAB: Pt = { x: 320, y: 840 };
export const STRIKE_LEN = 0.12;
/** The lunge: 0 lurking .. 1 struck, out and back as one move. */
export const lungeAt = (t: number): number => ramp(wrap(t), SNAP_AT - 0.08, SNAP_AT + 0.06) * (1 - ramp(wrap(t), GONE_AT, GONE_AT + 0.42));
/** The jaws shut in the lunge. */
export const LURK_SNAP_T = SNAP_AT + 0.07;
/** Down the hole and out of sight on "Gone". */
export const sinkAt = (t: number): number => ramp(wrap(t), GONE_AT, GONE_AT + 0.42) * after(wrap(t), ONE_AT + 0.1);

export function lurkWormAt(t: number): Worm {
  const u = wrap(t);
  const lunge = lungeAt(u);
  const sink = sinkAt(u);
  const idle = { x: HOLE.x + 4 * Math.sin(cycles(3, u)), y: HOLE.y - 0.13 * REACH + 6 * Math.sin(cycles(4, u)) };
  const out = 1 - ramp(u, GONE_AT, GONE_AT + 0.42);
  const head = {
    x: idle.x + (LUNGE_HEAD.x - idle.x) * lunge,
    y: (idle.y + (LUNGE_HEAD.y - idle.y) * lunge) * out + (HOLE.y + 140) * (1 - out),
  };
  // The jaws ease open as the fish noses in, gape in the lunge, and shut on the fish.
  const tease = 0.28 + 0.06 * Math.sin(cycles(6, u)) + 0.18 * ramp(u, BRUSHES_AT, FEELERS_AT + 0.3);
  const gape = Math.max(tease, ramp(u, SNAP_AT - 0.2, SNAP_AT - 0.02));
  const jaw = gape * (1 - ramp(u, LURK_SNAP_T - 0.06, LURK_SNAP_T));
  return { head, axis: -0.42 * lunge * (1 - sink), jaw: Math.max(0, jaw * (1 - sink)), twitch: twitchAt(u), reach: 1.6 };
}

/** The antennae twitching as the fish brushes them. */
export const twitchAt = (t: number): number => window01(wrap(t), BRUSHES_AT - 0.05, SNAP_AT - 0.1, 0.12);

export const LURK_FISH_LEN = 130;
/** The fish swims in from the left, noses the feelers, and is gone in the snap. */
export function lurkFishAt(t: number): Fish | null {
  const u = wrap(t);
  if (u < FISH2_AT - 0.6 || u >= LURK_SNAP_T) return null;
  const arrive = ramp(u, FISH2_AT - 0.6, BRUSHES_AT + 0.05);
  const nose = 0.5 * LURK_FISH_LEN;
  const nibble = 10 * Math.max(0, Math.sin((u - BRUSHES_AT) * 11)) * ramp(u, BRUSHES_AT - 0.1, BRUSHES_AT + 0.1);
  // Pulled into the jaws as they shut.
  const grab = lungeAt(u) ** 2;
  return {
    x: (-120 + (NIBBLE.x - nose + 120) * arrive + nibble) * (1 - grab) + GRAB.x * grab,
    y: (NIBBLE.y - 40 * (1 - arrive) + 5 * Math.sin(u * 5)) * (1 - grab) + GRAB.y * grab,
    length: LURK_FISH_LEN,
    facing: 1,
    tilt: -0.08 * (1 - arrive),
    beat: u * 14,
    effort: 0.25 + 0.5 * (1 - arrive),
  };
}

// ---------------------------------------------------------------- the picture's mood

/** Jolts as the jaws shut (the hook's snap and the lurk's), px. */
export function shakeAt(t: number): Pt {
  const u = wrap(t);
  for (const [at, amp0] of [[SNAP_T, 22], [LURK_SNAP_T, 34]] as const) {
    const s = u - at;
    if (s < 0 || s > 0.45) continue;
    const amp = amp0 * (1 - s / 0.45) ** 2;
    return { x: amp * Math.sin(s * 115), y: amp * 0.7 * Math.cos(s * 140) };
  }
  return { x: 0, y: 0 };
}

/** The white flash of a snap, 0 .. 1. */
export const flashAt = (t: number): number => {
  const u = wrap(t);
  const pulse = (at: number, peak: number, fade: number): number => (u < at - 0.03 || u > at + fade ? 0 : peak * (u < at ? (u - at + 0.03) / 0.03 : 1 - (u - at) / fade));
  return Math.max(pulse(SNAP_T, 0.55, 0.3), pulse(LURK_SNAP_T, 0.9, 0.45));
};

/** Tension: red creeping in as the fish noses the feelers, 0 .. 1. */
export const tensionAt = (t: number): number => window01(wrap(t), FISH2_AT, SNAP_AT + 0.6, 0.5) * (0.4 + 0.6 * ramp(wrap(t), BRUSHES_AT, SNAP_AT));
/** Eerie: the colour draining out after the snap, 0 .. 1. */
export const eerieAt = (t: number): number => window01(wrap(t), GONE_AT - 0.1, ONE_AT, 0.4);
/** The dark closing in round the hole on "down into the dark", 0 open .. 1 black. */
export const darkAt = (t: number): number => ramp(wrap(t), DOWN_AT, ONE_AT - 0.3) * (1 - ramp(wrap(t), ONE_AT - 0.3, ONE_AT));
/** Sand settling back after the worm goes down, 0 .. 1 (its own clock), -1 when there's none. */
export const settleAt = (t: number): number => {
  const u = wrap(t);
  return u < GONE_AT || u > ONE_AT ? -1 : (u - GONE_AT) / (ONE_AT - GONE_AT);
};

// ---------------------------------------------------------------- the burrow cut-away

/** The camera rushing back from the hole to the whole burrow, 0 close .. 1 the whole worm. */
export const revealAt = (t: number): number => ramp(wrap(t), UP_AT - 0.1, TEN_AT + 0.15) * after(wrap(t), WITH_AT + 0.1);
/** The "10 ft" bar growing down beside the worm, 0 .. 1, and its labels. */
export const barAt = (t: number): number => ramp(wrap(t), TEN_AT - 0.05, FEET_AT + 0.15) * (1 - ramp(wrap(t), WITH_AT, WITH_AT + 0.25));
export const barLabelAt = (t: number): number => window01(wrap(t), FEET_AT - 0.1, WITH_AT, 0.15);
/** The diver's outline for scale. */
export const diverAt = (t: number): number => window01(wrap(t), TEN_AT, WITH_AT, 0.3);

// ---------------------------------------------------------------- the aquarium

/** The camera in the room: pulled back on the tank, rushing in to the rock on "They named him". */
const TANK_ZOOM: readonly Key[] = [
  k(ONE_AT - 0.3, 1.16, 0), k(ONE_AT + 0.4, 1, 0), k(THEY_AT - 0.05, 1, 0), k(BARRY_AT, 2.5, 0.4), k(AND_AT - 0.35, 2.7), k(AND_AT + 0.12, 7, 30),
];
export const tankZoomAt = (t: number): number => 1.16 + (curveAt(TANK_ZOOM, wrap(t)).at - 1.16) * after(wrap(t), AND_AT + 0.15);
/** Months gone by on the calendar: a page torn off every flip, from "for" to "MONTHS". */
export const FLIPS = 6;
export const pagesAt = (t: number): number =>
  Math.max(0, Math.min(FLIPS, ((wrap(t) - (MONTHS_AT - 0.35)) / (MONTHS_END + 0.25 - (MONTHS_AT - 0.35))) * FLIPS)) * after(wrap(t), AND_AT + 0.15);
/** The Union Jack popping up on "English", 0 .. 1 (with an overshoot in the drawing). */
export const flagAt = (t: number): number => ramp(wrap(t), ENGLISH_AT - 0.08, ENGLISH_AT + 0.22) * after(wrap(t), AND_AT + 0.15);
/** The coral the worm snipped, toppling on "hid", 0 standing .. 1 lying. */
export const coralFallAt = (t: number): number => ramp(wrap(t), HID_AT, HID_AT + 0.3) ** 2 * after(wrap(t), AND_AT + 0.15);
/** Barry peeking out of the rock with his name tag, 0 hidden .. 1 out. */
export const peekAt = (t: number): number => ramp(wrap(t), THEY_AT + 0.05, BARRY_AT - 0.05) * (1 - ramp(wrap(t), AND_AT - 0.3, AND_AT - 0.04));
export const tagAt = (t: number): number => ramp(wrap(t), BARRY_AT - 0.08, BARRY_AT + 0.12) * (1 - ramp(wrap(t), AND_AT - 0.44, AND_AT - 0.27));
/** Barry clacking his jaws at the camera, a cheeky wave, 0 .. 1. */
export const waveAt = (t: number): number => {
  const u = wrap(t) - BARRY_AT - 0.1;
  return u < 0 || u > 0.75 ? 0 : 0.55 * Math.max(0, Math.sin(u * 4 * Math.PI));
};
/** Laughter: a warm pink glow and sparkles on "Barry", 0 .. 1. */
export const laughAt = (t: number): number => window01(wrap(t), BARRY_AT - 0.1, AND_AT + 0.05, 0.2);
