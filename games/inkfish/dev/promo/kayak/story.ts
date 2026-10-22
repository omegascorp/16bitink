import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, curveAt, type Key, lerp, ramp, window01 } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This whale swallowed a KAYAKER!": the Strait of Magellan, Chile, February
 * 2025. A humpback surfaced under Adrián Simancas (24) in his yellow kayak,
 * closed its mouth round him and the kayak, and let him go a couple of
 * seconds later, unhurt. His father Dell, paddling next to him, filmed it.
 * Told by a narrator (words.ts), every beat timed to the words, a function of
 * time in seconds over a loop of LOOP_S. One mood a sentence; the colour, the
 * camera and the faces change with it:
 *
 *   0     "This whale swallowed a KAYAKER!" (excited): the humpback's mouth
 *         surging up out of the water round the yellow kayak, mid-gulp, its
 *         throat ballooning, water pouring off; slow motion, the jaws shut on
 *         "KAYAKER!"
 *   1.95  ⏪ the gulp runs back, the whale sinks away
 *   2.45  "In Chile, Adrián was paddling next to his dad…" (nervous): the two
 *         kayaks on the grey strait, "Chile, 2025"; a vast dark shape rises
 *         under Adrián; he glances down, "!"
 *   5.64  "then everything went DARK." (surprised): the whale bursts up round
 *         him, the jaws shut, the picture goes black on "DARK"
 *   6.73  "Kayak and all." (whispers, eerie): inside the mouth, a sliver of
 *         light between the lips, Adrián's white eyes in the dark
 *   8.92  "Good news? A humpback's throat is too narrow for a person." (cheeky):
 *         the light snaps on, a cutaway of the whale's head: its throat ringed,
 *         the kayak bonks against it twice, Adrián shrugs, the whale squints
 *  12.61  "So seconds later…" (chuckles): a stopwatch ticks, the whale's cheeks puff
 *  13.94  "it spat him back out!" (relief): the jaws open, he flies out and
 *         lands on the water, coughing, then grins; warm light, the whale dives
 *  15.31  "His dad filmed the whole thing. So yes," (mischievous): Dad smirks,
 *         his phone fills the screen, REC, replaying the gulp; on "So yes," we
 *         zoom into its screen, which is frame 1.
 */

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

export const KAYAKER_AT = said('KAYAKER!');
export const CHILE_AT = said('Chile,');
export const ADRIAN_AT = said('Adrián');
export const PADDLING_AT = said('paddling');
export const DAD_AT = said('dad…');
export const THEN_AT = said('then');
export const EVERYTHING_AT = said('everything');
export const DARK_AT = said('DARK.');
export const KAYAK_AT = said('Kayak');
export const ALL_AT = said('all.');
export const GOOD_AT = said('Good');
export const HUMPBACKS_AT = said("humpback's");
export const THROAT_AT = said('throat');
export const TOO_AT = said('too');
export const NARROW_AT = said('narrow');
export const PERSON_AT = said('person.');
export const SO_AT = said('So');
export const SECONDS_AT = said('seconds');
export const LATER_AT = said('later…');
export const SPAT_AT = said('spat');
export const OUT_AT = said('out!');
export const HIS_DAD_AT = said('His');
export const FILMED_AT = said('filmed');
export const WHOLE_AT = said('whole');
export const SO_YES_AT = said('So', 2);

/** Whole cycles a loop, as a phase in radians at time t: for wiggles that must be where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

export interface Pt {
  readonly x: number;
  readonly y: number;
}
export interface View {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

// ---------------------------------------------------------------- the story clock

/** Story seconds: the gulp's moments. The snout breaks the surface, the jaws are widest, and they shut. */
export const BURST_S = 5.45;
export const WIDE_S = 5.95;
export const SHUT_S = 6.62;
/** Frame 1: the story moment the loop opens on (the jaws half shut round the kayak), and how slowly it plays there. */
export const OPENING = 6.42;
export const OPENING_RATE = 0.08;
/** The rewind after the hook, video seconds, and where the story plays at the video's own pace. */
export const REWIND = { from: 1.95, to: 2.5 } as const;
export const LIVE_FROM = 2.5;

const CLOCK: readonly Key[] = [
  { t: 0, at: OPENING, rate: OPENING_RATE },
  { t: 1.2, at: 6.52, rate: 0.12 },
  { t: 1.45, at: SHUT_S + 0.03, rate: 0.5 },
  { t: REWIND.from, at: SHUT_S + 0.3, rate: 0 },
  { t: 2.15, at: 5.1, rate: -12 },
  { t: 2.35, at: 2.6, rate: -5 },
  { t: LIVE_FROM, at: LIVE_FROM, rate: 1 },
  { t: LOOP_S, at: LOOP_S, rate: 1 },
];

/** Story time at video time t. */
export const storyAt = (t: number): number => curveAt(CLOCK, wrap(t)).at;
/** How fast the story runs at video time t (negative: rewinding). */
export const storyRate = (t: number): number => curveAt(CLOCK, wrap(t)).rate;
/** The ⏪ over the picture while the story runs back, 0 .. 1. */
export const rewindAt = (t: number): number => window01(wrap(t), REWIND.from, REWIND.to, 0.1);

/** The gulp replayed on Dad's phone: story time at video time t, arriving at frame 1's moment and pace at the loop point. */
const REPLAY: readonly Key[] = [
  { t: 15.4, at: 4.9, rate: 1 },
  { t: 17.0, at: 6.22, rate: 0.35 },
  { t: LOOP_S, at: OPENING, rate: OPENING_RATE },
];
export const replayAt = (t: number): number => curveAt(REPLAY, wrap(t)).at;
export const replayRate = (t: number): number => curveAt(REPLAY, wrap(t)).rate;

// ---------------------------------------------------------------- the camera

/** The screen point the camera centres on. */
export const FOCUS = { x: 540, y: 800 } as const;
export const toScreen = (v: View, p: Pt): Pt => ({ x: (p.x - v.x) * v.zoom + FOCUS.x, y: (p.y - v.y) * v.zoom + FOCUS.y });

/** Frame 1's camera: the gulp close up, the surface low in the frame. */
export const CAM0: View = { x: 175, y: -305, zoom: 1.5 };
/** On the whale's head held out of the water, for the cutaway; on Dad and his phone. */
const GAG: View = { x: 250, y: -200, zoom: 1.5 };
const DAD_CAM: View = { x: -190, y: -150, zoom: 1.3 };

const CAM: readonly (View & { readonly t: number })[] = [
  { t: 0, ...CAM0 },
  { t: REWIND.from, ...CAM0 },
  { t: 2.45, x: -210, y: 128, zoom: 1.2 },
  { t: 3.4, x: -210, y: 128, zoom: 1.2 },
  { t: 5.35, x: -130, y: 200, zoom: 1.28 },
  { t: 5.8, x: 70, y: -170, zoom: 1.25 },
  { t: 6.3, x: 110, y: -260, zoom: 1.45 },
  { t: 6.72, x: 118, y: -300, zoom: 1.62 },
  { t: 8.85, ...GAG },
  { t: SO_AT, ...GAG },
  { t: 13.5, x: 280, y: -190, zoom: 1.35 },
  { t: 14.0, x: 290, y: -190, zoom: 1.32 },
  { t: 14.6, x: 420, y: -160, zoom: 1.1 },
  { t: 15.2, x: 520, y: -110, zoom: 1.4 },
  { t: 15.85, ...DAD_CAM },
  { t: LOOP_S, ...DAD_CAM },
];
const CAM_X = CAM.map((k) => ({ t: k.t, at: k.x, rate: 0 }));
const CAM_Y = CAM.map((k) => ({ t: k.t, at: k.y, rate: 0 }));
const CAM_ZOOM = CAM.map((k) => ({ t: k.t, at: Math.log(k.zoom), rate: 0 }));

/** The camera at video time t (before any shake). */
export function cameraAt(t: number): View {
  const u = wrap(t);
  return { x: curveAt(CAM_X, u).at, y: curveAt(CAM_Y, u).at, zoom: Math.exp(curveAt(CAM_ZOOM, u).at) };
}

/** Jolts as the whale bursts out and as its jaws shut (story time, only while it plays forwards), screen px. */
export function shakeAt(s: number, rate: number): Pt {
  if (rate <= 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const j of [{ at: BURST_S, amp: 18 }, { at: SHUT_S, amp: 22 }]) {
    const d = s - j.at;
    if (d < 0 || d > 0.4) continue;
    const amp = j.amp * (1 - d / 0.4) ** 2;
    x += amp * Math.sin(d * 110);
    y += amp * 0.7 * Math.cos(d * 140);
  }
  return { x, y };
}

// ---------------------------------------------------------------- the whale

/** World px per metre. The surface is y = 0; up is negative. */
export const PX_PER_M = 100;
/** How far the lower jaw swings open at its widest, radians. */
export const GAPE_MAX = 0.95;

export type EyeMood = 'calm' | 'wide' | 'squint' | 'smug';

export interface WhalePose {
  /** Where its jaws hinge, world px, and how far its snout is tipped up (radians; π/2 straight up). */
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
  /** Jaws 0 shut .. 1 widest; throat 0 slack .. 1 ballooned full of water. */
  readonly gape: number;
  readonly balloon: number;
  readonly eye: EyeMood;
  /** The near pectoral fin's sweep, radians. */
  readonly fin: number;
}

interface Keyed {
  readonly s: number;
  readonly [k: string]: number;
}
function track(keys: readonly Keyed[], field: string, rates: Readonly<Record<number, number>> = {}): readonly Key[] {
  return keys.map((k, i) => ({ t: k.s, at: k[field]!, rate: rates[i] ?? 0 }));
}

/** Where the whale's head is held out of the water for the cutaway. */
export const GAG_WHALE = { x: 40, y: -230, tilt: 0.42 } as const;

const WHALE = [
  { s: 0, x: 40, y: 1500, tilt: 1.42 },
  { s: 3.6, x: 40, y: 1500, tilt: 1.42 },
  { s: 4.9, x: 40, y: 800, tilt: 1.42 },
  { s: BURST_S - 0.05, x: 40, y: 470, tilt: 1.42 },
  { s: WIDE_S + 0.05, x: 40, y: -122, tilt: 1.42 },
  { s: SHUT_S, x: 40, y: -132, tilt: 1.42 },
  { s: 7.0, x: 40, y: -136, tilt: 1.4 },
  { s: 8.6, ...GAG_WHALE },
  { s: SPAT_AT - 0.05, ...GAG_WHALE },
  { s: SPAT_AT + 0.45, x: 60, y: -210, tilt: 0.36 },
  { s: 15.7, x: -40, y: 420, tilt: -0.15 },
  { s: LOOP_S + 1, x: -200, y: 1100, tilt: -0.3 },
] as const;
// Accelerating up out of the deep, and still rising a little as the jaws open.
const W_X = track(WHALE, 'x');
const W_Y = track(WHALE, 'y', { 2: -500, 3: -1500, 4: -60, 10: 700 });
const W_TILT = track(WHALE, 'tilt');

const GAPE: readonly Key[] = [
  { t: BURST_S, at: 0, rate: 0 },
  { t: WIDE_S, at: 1, rate: 0 },
  { t: 6.1, at: 0.96, rate: -0.6 },
  { t: OPENING, at: 0.5, rate: -2.0 },
  { t: SHUT_S, at: 0, rate: 0 },
];
/** The jaws: open as it bursts up, half shut round the kayak in frame 1, shut on "DARK"; open again to spit him out. */
export function gapeAt(s: number): number {
  if (s < SHUT_S + 1) return clamp01(curveAt(GAPE, s).at);
  return 0.62 * window01(s, SPAT_AT - 0.02, SPAT_AT + 0.75, 0.2);
}

/** The throat: ballooning as the water rushes in, full through the cutaway, puffing on "seconds later", emptied by the spit. */
export function balloonAt(s: number): number {
  const fill = ramp(s, BURST_S + 0.1, WIDE_S + 0.25);
  const settle = 1 - 0.18 * ramp(s, 7.2, 8.6);
  const puff = 0.12 * Math.max(0, Math.sin(Math.PI * clamp01((s - SECONDS_AT) / 0.45))) + 0.18 * ramp(s, LATER_AT, SPAT_AT);
  const spat = 1 - 0.75 * ramp(s, SPAT_AT, SPAT_AT + 0.35);
  return fill * clamp01(settle + puff) * spat;
}

/** Its eye: calm, wide as it bursts up and as it spits; squinting at the kayak in its throat; smug as it puffs its cheeks. */
export function whaleEyeAt(s: number): EyeMood {
  if (s >= BURST_S - 0.1 && s < SHUT_S + 0.1) return 'wide';
  if (s >= TOO_AT - 0.1 && s < SO_AT) return 'squint';
  if (s >= SO_AT && s < SPAT_AT - 0.05) return 'smug';
  if (s >= SPAT_AT - 0.05 && s < SPAT_AT + 0.6) return 'wide';
  return 'calm';
}

export function whaleAt(s: number, t: number): WhalePose {
  return {
    x: curveAt(W_X, s).at,
    y: curveAt(W_Y, s).at + 4 * Math.sin(cycles(4, t)),
    tilt: curveAt(W_TILT, s).at + 0.012 * Math.sin(cycles(3, t)),
    gape: gapeAt(s),
    balloon: balloonAt(s),
    eye: whaleEyeAt(s),
    fin: 0.12 * Math.sin(cycles(5, t)),
  };
}

/** A point of the whale's own frame (px, snout along +x, belly +y, the jaw hinge at the origin) in the world. */
export function onWhale(w: Pick<WhalePose, 'x' | 'y' | 'tilt'>, p: Pt): Pt {
  const c = Math.cos(-w.tilt);
  const n = Math.sin(-w.tilt);
  return { x: w.x + p.x * c - p.y * n, y: w.y + p.x * n + p.y * c };
}

// ---------------------------------------------------------------- the people

export type Arms = 'paddle' | 'flail' | 'shrug' | 'thumb' | 'phone' | 'cough';
export type Face = 'calm' | 'nervous' | 'shock' | 'sheepish' | 'cough' | 'grin' | 'smirk';

export interface Paddler {
  /** The kayak's middle at the waterline, world px; its tilt (bow up, radians); bow to the right (1) or left (-1). */
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
  readonly facing: 1 | -1;
  readonly scale: number;
  /** The paddle stroke's phase, radians. */
  readonly stroke: number;
  readonly arms: Arms;
  readonly face: Face;
}

export const KAYAK_LEN = 2.8 * PX_PER_M;
export const DAD_X = -420;
/** Where Adrián lands when he's spat out. */
export const LAND = { x: 600, y: 0 } as const;
export const LAND_AT = OUT_AT + 0.12;

const bobAt = (t: number, phase: number): number => 5 * Math.sin(cycles(6, t) + phase);

/**
 * Adrián in the whale's mouth, from the jaws. Wide open, the kayak lies
 * across the mouth with him sitting up out of it; as the jaws shut it tips
 * to lie along them, upside down, his body towards the throat, so the
 * snout and the throat close over all of him.
 */
export function inMouth(w: WhalePose): { readonly at: Pt; readonly tilt: number } {
  const a = w.gape * GAPE_MAX;
  const d = lerp(240, 290, w.gape);
  const local = { x: d * Math.cos(a * 0.5), y: d * Math.sin(a * 0.5) + lerp(10, 26, w.gape) };
  // The kayak's turn in the whale's frame: π lies along the jaws, deck towards the throat; π/2 + a/2 lies across them, deck out of the mouth.
  const turn = lerp(Math.PI, Math.PI / 2 + a / 2, Math.min(1, w.gape * 1.4));
  return { at: onWhale(w, local), tilt: w.tilt - turn };
}

const onSurface = (x: number, t: number, phase: number): Pt => ({ x, y: bobAt(t, phase) });

/** Adrián's arms and face at story time s. */
function adrianMood(s: number): { readonly arms: Arms; readonly face: Face } {
  if (s < 4.45) return { arms: 'paddle', face: 'calm' };
  if (s < BURST_S - 0.05) return { arms: 'paddle', face: 'nervous' };
  if (s < 7.0) return { arms: 'flail', face: 'shock' };
  if (s < LAND_AT) return { arms: 'flail', face: 'shock' };
  if (s < LAND_AT + 0.45) return { arms: 'cough', face: 'cough' };
  return { arms: 'thumb', face: 'grin' };
}

/** Adrián and his kayak in the world, or null while he's inside the whale (the inside and the cutaway draw him there). */
export function adrianAt(s: number, t: number): Paddler | null {
  const mood = adrianMood(s);
  // Slowing as he notices the shape below.
  const stroke = cycles(13, t);
  const base = { facing: 1 as const, scale: 1, stroke, ...mood };
  if (s < BURST_S - 0.05) {
    const p = onSurface(0, t, 0);
    return { ...base, ...p, tilt: 0.03 * Math.sin(cycles(5, t)) };
  }
  if (s < 7.0) {
    const w = whaleAt(s, t);
    const m = inMouth(w);
    const e = ramp(s, BURST_S - 0.05, WIDE_S + 0.1) ** 1.3;
    const from = onSurface(0, t, 0);
    return { ...base, x: lerp(from.x, m.at.x, e), y: lerp(from.y, m.at.y, e), tilt: lerp(0, m.tilt, e) };
  }
  const spitFrom = SPAT_AT + 0.08;
  if (s < spitFrom) return null;
  if (s < LAND_AT) {
    // Out of the mouth in an arc, tumbling.
    const w = whaleAt(spitFrom, t);
    const start = onWhale(w, { x: 360, y: 10 });
    const u = (s - spitFrom) / (LAND_AT - spitFrom);
    return {
      ...base,
      x: lerp(start.x, LAND.x, u),
      y: lerp(start.y, LAND.y, u) - 260 * Math.sin(Math.PI * u) * (1 - 0.3 * u),
      tilt: 0.9 * (1 - u) * Math.sin(Math.PI * u * 1.5),
    };
  }
  // Landed: a plunge and a bob, then floating.
  const d = s - LAND_AT;
  const plunge = 26 * Math.exp(-5 * d) * Math.cos(11 * d);
  const p = onSurface(LAND.x, t, 1.3);
  return { ...base, x: p.x, y: p.y + plunge, tilt: 0.12 * Math.exp(-4 * d) * Math.sin(13 * d) + 0.03 * Math.sin(cycles(5, t) + 1) };
}

/** Dad, a few lengths behind: paddling, then filming with his phone held up; smirking at the end. */
export function dadAt(s: number, t: number): Paddler {
  const p = onSurface(DAD_X, t, 2.1);
  const arms: Arms = s < 4.6 ? 'paddle' : 'phone';
  let face: Face = 'calm';
  if (s >= BURST_S && s < 8) face = 'shock';
  if (s >= HIS_DAD_AT - 0.1) face = 'smirk';
  return { x: p.x, y: p.y, tilt: 0.03 * Math.sin(cycles(5, t) + 2), facing: 1, scale: 1, stroke: cycles(12, t) + 1.9, arms, face };
}

/** The "!" over Adrián's head as he sees the shape under him, 0 .. 1 (popping). */
export const alarmAt = (s: number): number => {
  const d = s - (DAD_AT + 0.25);
  if (d < 0 || s > BURST_S) return 0;
  return Math.min(1.2 * ramp(d, 0, 0.12), 1 - ramp(s, BURST_S - 0.15, BURST_S));
};

// ---------------------------------------------------------------- the cutaway gag

/** The cutaway of the whale's head, 0 .. 1: from "Good news?" to just after "So". */
export const cutawayAt = (s: number): number => window01(s, GOOD_AT - 0.02, SO_AT + 0.45, 0.12);
/** The chalk ring round its throat, drawn on "throat" (0 .. 1), and shown. */
export const ringDrawnAt = (s: number): number => ramp(s, THROAT_AT - 0.05, THROAT_AT + 0.3);
export const ringAt = (s: number): number => window01(s, THROAT_AT - 0.05, SO_AT + 0.3, 0.15);

/** The two bonks of the kayak against the throat. */
export const BONKS = [NARROW_AT + 0.02, PERSON_AT - 0.3] as const;

/** How far the kayak has slid back towards the throat, 0 floating .. 1 jammed in its mouth. */
export function slideAt(s: number): number {
  const keys: readonly Key[] = [
    { t: TOO_AT - 0.1, at: 0, rate: 0 },
    { t: BONKS[0], at: 1, rate: 3 },
    { t: BONKS[0] + 0.14, at: 0.55, rate: 0 },
    { t: BONKS[1], at: 1, rate: 3 },
    { t: BONKS[1] + 0.16, at: 0.45, rate: 0 },
    { t: PERSON_AT + 0.4, at: 0.1, rate: 0 },
  ];
  if (s < keys[0]!.t) return 0;
  if (s < BONKS[0]) return clamp01(curveAt(keys.slice(0, 2), s).at);
  return clamp01(curveAt(keys.slice(1), s).at);
}

/** A bonk's jolt, 0 .. 1, decaying from each bonk. */
export function bonkAt(s: number): number {
  let b = 0;
  for (const at of BONKS) {
    const d = s - at;
    if (d >= 0 && d < 0.35) b = Math.max(b, (1 - d / 0.35) ** 2);
  }
  return b;
}

/** Adrián's arms and face in the cutaway. */
export function gagMood(s: number): { readonly arms: Arms; readonly face: Face } {
  if (s >= PERSON_AT - 0.05) return { arms: 'shrug', face: 'sheepish' };
  if (s >= BONKS[0] - 0.05) return { arms: 'flail', face: 'shock' };
  return { arms: 'flail', face: 'nervous' };
}

/** The stopwatch on "seconds later…": shown, and its hand's sweep (whole ticks). */
export const stopwatchAt = (s: number): number => window01(s, SECONDS_AT - 0.08, SPAT_AT + 0.25, 0.15);
export const stopwatchHandAt = (s: number): number => Math.floor(Math.max(0, s - SECONDS_AT + 0.08) / 0.27);

// ---------------------------------------------------------------- dark and light

/** The black as the jaws shut on "DARK", and the inside of the mouth, shown from just after "DARK" until "Good news?". */
export const INSIDE = { from: DARK_AT + 0.08, to: GOOD_AT } as const;
export const insideAt = (t: number): boolean => wrap(t) >= INSIDE.from && wrap(t) < INSIDE.to;
/** Black over the picture as the jaws shut, 0 .. 1. */
export const blackoutAt = (t: number): number => {
  const u = wrap(t);
  return u < INSIDE.from ? ramp(u, DARK_AT - 0.12, INSIDE.from) : 0;
};
/** The faint light inside the mouth, coming up out of the black, 0 .. 1. */
export const insideLightAt = (t: number): number => ramp(wrap(t), INSIDE.from + 0.05, INSIDE.from + 0.7);
/** Adrián's eyes blinking in the dark (closed at these moments). */
export const blinkAt = (t: number): boolean => [KAYAK_AT - 0.2, ALL_AT + 0.2].some((b) => Math.abs(wrap(t) - b) < 0.06);
/** Where his eyes look in the dark: -1 left .. 1 right. */
export const glanceAt = (t: number): number => {
  const u = wrap(t);
  return -0.8 * ramp(u, KAYAK_AT - 0.1, KAYAK_AT + 0.15) + 1.6 * ramp(u, ALL_AT - 0.15, ALL_AT + 0.1) - 0.8 * ramp(u, GOOD_AT - 0.4, GOOD_AT - 0.1);
};
/** The flash as the light snaps on for "Good news?", and as the whale bursts up. */
export const flashAt = (t: number, s: number): number =>
  0.85 * (1 - ramp(wrap(t), GOOD_AT, GOOD_AT + 0.3)) * (wrap(t) >= GOOD_AT ? 1 : 0) + 0.35 * window01(s, BURST_S - 0.02, BURST_S + 0.3, 0.12);

// ---------------------------------------------------------------- the moods

export interface Grade {
  /** Cold, drained grey-blue (nervous); a warm golden light (relief); a rosy pop (cheeky); a sly purple (mischievous). */
  readonly cold: number;
  readonly warm: number;
  readonly rosy: number;
  readonly sly: number;
}

/** The mood at video time t. Frame 1 (and the replay on the phone) has none. */
export function gradeAt(t: number): Grade {
  const u = wrap(t);
  return {
    cold: window01(u, LIVE_FROM - 0.1, THEN_AT + 0.25, 0.4),
    rosy: window01(u, GOOD_AT, SO_AT + 0.2, 0.15),
    warm: window01(u, SO_AT, HIS_DAD_AT + 0.3, 0.4),
    sly: window01(u, HIS_DAD_AT, LOOP_S - 0.1, 0.35),
  };
}

// ---------------------------------------------------------------- the phone

/** Dad's phone over the picture: popping up out of his hands on "filmed", filling the screen on "So yes,". */
export const PHONE_BIG = { x: 330, y: 300, w: 560 } as const;
/** 0 in his hands .. 1 big; then 0 .. 1 filling the frame. */
export const phoneUpAt = (t: number): number => ramp(wrap(t), FILMED_AT - 0.08, FILMED_AT + 0.3);
export const phoneFillAt = (t: number): number => ramp(wrap(t), SO_YES_AT, LOOP_S - 0.02);
/** The REC dot and timer on its screen. */
export const recAt = (t: number): number => (wrap(t) < FILMED_AT - 0.1 ? 0 : 1 - ramp(wrap(t), SO_YES_AT + 0.1, LOOP_S - 0.2));
export const recBlinkAt = (t: number): boolean => Math.floor(wrap(t) * 2.5) % 2 === 0;

/** The phone's screen rect, screen px, given where it is in Dad's hands. */
export function phoneRectAt(t: number, inHands: Pt): { readonly x: number; readonly y: number; readonly w: number; readonly h: number } {
  const up = phoneUpAt(t);
  const fill = phoneFillAt(t);
  const smallW = 56;
  const small = { x: inHands.x - smallW / 2, y: inHands.y - (smallW * 16) / 9 / 2, w: smallW };
  const big = PHONE_BIG;
  const x = lerp(lerp(small.x, big.x, up), 0, fill);
  const y = lerp(lerp(small.y, big.y, up), 0, fill);
  const w = lerp(lerp(small.w, big.w, up), 1080, fill);
  return { x, y, w, h: (w * 16) / 9 };
}
