import { bodyProportions, FISH_TEX } from '../../../src/art/fishArt';
import { BOAT_SPEC } from '../../../src/art/skyArt';
import { BOIL_FPS } from '../../../src/art/textures';
import { NOSE } from '../chain';
import type { View, WorldFish } from '../gameplay/fish';
import { clamp01, curveAt, type Key, lerp, ramp, window01 } from '../short';
import { lipsOf } from './swimmer';
import { TEMPO, WORDS } from './words';

export type { View, WorldFish };

/**
 * "This fish swallowed a shark in one bite": Florida's Gulf coast, 2014. An
 * angler reeling in a four-foot blacktip shark filmed a goliath grouper rise
 * out of the murk and swallow the shark whole, in one gulp. Told by a
 * narrator (words.ts), every beat timed to the words, a function of time in
 * seconds over a loop of LOOP_S.
 *
 * The story runs on its own clock (`storyAt`, story seconds): it opens on
 * the gulp itself in slow motion, rewinds to the boat, plays forwards to the
 * gulp again, and rewinds to the opening frame at the end. In the middle the
 * story clock is the video's clock, so the beats there sit on their words.
 *
 *   0     "This fish swallowed a SHARK… in ONE bite!": the grouper's mouth wide
 *         open, the shark half in head first, the line taut up out of frame;
 *         slow motion; the jaws shut on "bite!" (chomp, shake, bubbles)
 *   3.15  "Florida, twenty fourteen.": ⏪ the scene runs back, the grouper sinks
 *         into the murk, the shark rises up the line to the boat; "Florida, 2014"
 *   5.0   "A fisherman is reeling in a four-foot blacktip shark…": the boat and the
 *         angler at the surface, then down the line to the shark, "4 ft"
 *   8.1   "when something HUGE rises from below.": we pull back and down, a vast
 *         dark shape rises out of the murk under the shark
 *   10.7  "A goliath grouper, as big as a door!": the grouper out of the dark, an
 *         ink door beside it, the same height
 *   13.3  "It opens its mouth and… GULP!": it tips up at the shark, the mouth
 *         opens, water rushes in, the shark is sucked in head first; GULP: the
 *         jaws shut (payoff), shake, bubbles
 *   16.0  "There's always a bigger fish.": the hook tears free and springs back
 *         up, empty; the grouper's eyes close happily over a bulging belly
 *   18.5  "So yes,": ⏪ back to the shark half in the open mouth, frame 1.
 */
export const LOOP_S = 19.5;

/** The line boil steps at the game's 8 a second: 156 steps, 52 whole cycles a loop. */
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

export const SHARK_AT = said('SHARK…');
export const BITE_WORD_AT = said('bite!');
export const FLORIDA_AT = said('Florida,');
export const FISHERMAN_AT = said('fisherman');
export const REELING_AT = said('reeling');
export const FOUR_FOOT_AT = said('four-foot');
export const BLACKTIP_AT = said('blacktip');
export const WHEN_AT = said('when');
export const HUGE_AT = said('HUGE');
export const RISES_AT = said('rises');
export const BELOW_AT = said('below.');
export const GOLIATH_AT = said('goliath');
export const DOOR_AT = said('door!');
export const OPENS_AT = said('opens');
export const MOUTH_AT = said('mouth');
export const AND_AT = said('and…');
export const GULP_AT = said('GULP!');
export const THERES_AT = said("There's");
export const BIGGER_AT = said('bigger');
export const SO_AT = said('So');

/** Whole cycles a loop, as a phase in radians at time t: for wiggles that must be where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

// ---------------------------------------------------------------- the story clock

/** The jaws shut on the shark: on "bite!" in the hook, and on "GULP!" in the story (story seconds, which are video seconds there). */
export const SHUT = GULP_AT + 0.2;
/** Water starts rushing in on "and…"; the shark reaches the lips; the hook tears free of the grouper's lips. */
export const SUCK_FROM = AND_AT;
export const LIPS_AT = 14.8;
export const RIP = THERES_AT - 0.1;
/** Frame 1: the story moment the loop opens on (the shark half way in), and how slowly it plays there. */
export const OPENING = 14.95;
const OPENING_RATE = 0.05;
/** The jaws shut in the hook, on "bite!". */
export const BITE_AT = BITE_WORD_AT + 0.1;
/** The two rewinds, video seconds. */
export const REWINDS = [
  { from: 3.15, to: 4.85 },
  { from: 18.55, to: 19.3 },
] as const;
/** Where the story plays at the video's own pace. */
export const LIVE = { from: 5.0, to: 18.35 } as const;

const CLOCK: readonly Key[] = [
  { t: 0, at: OPENING, rate: OPENING_RATE },
  { t: 2.15, at: 15.03, rate: 0.1 },
  { t: BITE_AT, at: SHUT, rate: 0.7 },
  { t: 3.0, at: SHUT + 0.42, rate: 0.35 },
  { t: REWINDS[0].from, at: SHUT + 0.47, rate: 0 },
  { t: 3.5, at: 14.5, rate: -4 },
  { t: 4.0, at: 9.6, rate: -8.5 },
  { t: 4.6, at: 6.1, rate: -2.8 },
  { t: LIVE.from, at: LIVE.from, rate: 1 },
  { t: LIVE.to, at: LIVE.to, rate: 1 },
  { t: REWINDS[1].from, at: 18.5, rate: 0 },
  { t: 19.25, at: OPENING - 0.05, rate: 0 },
  { t: LOOP_S, at: OPENING, rate: OPENING_RATE },
];

/** Story time at video time t. */
export const storyAt = (t: number): number => curveAt(CLOCK, wrap(t)).at;
/** How fast the story runs at video time t (negative: rewinding). */
export const storyRate = (t: number): number => curveAt(CLOCK, wrap(t)).rate;

/** The ⏪ over the picture while the story runs back, 0 .. 1. */
export const rewindAt = (t: number): number => Math.max(...REWINDS.map((r) => window01(wrap(t), r.from, r.to, 0.12)));

// ---------------------------------------------------------------- the world

/** World px per metre; world px are screen px at zoom 1. The surface is y = 0, deeper is down. */
export const PX_PER_M = 300;
/** A goliath grouper of about 500 lb, 2.2 m; the four-foot blacktip; a door, 2 m by 85 cm. */
export const GROUPER_LEN = 2.2 * PX_PER_M;
export const SHARK_LEN = 1.27 * PX_PER_M;
export const DOOR_SIZE = { w: 0.85 * PX_PER_M, h: 2.0 * PX_PER_M } as const;

/** The angler's skiff (the game's drawing): world px per game px, where it floats, and the rod tip the line hangs from. */
export const BOAT_SCALE = 4.6;
export const BOAT_X = 442;
const SKIFF = BOAT_SPEC.skiff;
export interface Pt {
  readonly x: number;
  readonly y: number;
}
/** The boat rides the swell: world px down at time t (seven swells a loop). */
export const boatBob = (t: number): number => 8 * Math.sin(cycles(7, t));
export const rodTipAt = (t: number): Pt => ({ x: BOAT_X + SKIFF.rod.x * BOAT_SCALE, y: (SKIFF.rod.y - SKIFF.waterline) * BOAT_SCALE + boatBob(t) });

interface Keyed {
  readonly s: number;
  readonly [k: string]: number;
}

/** A smooth curve of one field over story-time keys (eased: at rest at each key unless a rate is given). */
function track(keys: readonly Keyed[], field: string, rates: Readonly<Record<number, number>> = {}): readonly Key[] {
  return keys.map((k, i) => ({ t: k.s, at: k[field]!, rate: rates[i] ?? 0 }));
}

// ---------------------------------------------------------------- the camera

const CAM = [
  { s: 0, x: 760, y: 450, zoom: 0.42 },
  { s: 5.45, x: 760, y: 450, zoom: 0.42 },
  { s: 6.55, x: 770, y: 1170, zoom: 1.1 },
  { s: 8.0, x: 750, y: 1160, zoom: 1.1 },
  { s: 9.7, x: 620, y: 1580, zoom: 0.64 },
  { s: 11.0, x: 580, y: 1440, zoom: 0.74 },
  { s: 13.35, x: 580, y: 1420, zoom: 0.76 },
  { s: 14.4, x: 590, y: 1115, zoom: 1.2 },
  { s: 15.4, x: 560, y: 1105, zoom: 1.3 },
  { s: 16.6, x: 480, y: 1150, zoom: 0.95 },
  { s: 30, x: 480, y: 1150, zoom: 0.95 },
] as const;
const CAM_X = track(CAM, 'x');
const CAM_Y = track(CAM, 'y');
const CAM_ZOOM = CAM.map((k) => ({ t: k.s, at: Math.log(k.zoom), rate: 0 }));

/** World point at the screen's focus, and screen px per world px, at story time s. */
export function cameraAt(s: number): View {
  return { x: curveAt(CAM_X, s).at, y: curveAt(CAM_Y, s).at, zoom: Math.exp(curveAt(CAM_ZOOM, s).at) };
}

/** The screen point the camera centres on. */
export const FOCUS = { x: 540, y: 800 } as const;
export const toScreen = (v: View, p: Pt): Pt => ({ x: (p.x - v.x) * v.zoom + FOCUS.x, y: (p.y - v.y) * v.zoom + FOCUS.y });

/** Jolts of the picture as the jaws shut, px (video time). */
export function shakeAt(t: number): Pt {
  let x = 0;
  let y = 0;
  for (const j of [{ at: BITE_AT, amp: 16 }, { at: SHUT, amp: 24 }]) {
    const s = wrap(t) - j.at;
    if (s < 0 || s > 0.35) continue;
    const amp = j.amp * (1 - s / 0.35) ** 2;
    x += amp * Math.sin(s * 120);
    y += amp * 0.7 * Math.cos(s * 150);
  }
  return { x, y };
}

/** The comic snap bursting from the shut jaws, 0 .. 1 over its life (video time; outside it, out of range). */
export const chompAt = (t: number): readonly number[] => [BITE_AT, SHUT].map((at) => (wrap(t) - at) / 0.16);

// ---------------------------------------------------------------- the grouper

const GROUPER = [
  { s: 0, x: 500, y: 3000, tilt: 1.2 },
  { s: 8.1, x: 500, y: 3000, tilt: 1.2 },
  { s: 10.4, x: 430, y: 1800, tilt: 1.14 },
  { s: 13.4, x: 450, y: 1700, tilt: 1.1 },
  { s: 14.35, x: 340, y: 1300, tilt: 0.76 },
  { s: SHUT, x: 352, y: 1284, tilt: 0.74 },
  { s: 16.6, x: 345, y: 1300, tilt: 0.68 },
  { s: 18.5, x: 340, y: 1312, tilt: 0.66 },
  { s: 30, x: 340, y: 1312, tilt: 0.66 },
] as const;
const G_X = track(GROUPER, 'x');
// Still rising slowly as it comes out of the dark.
const G_Y = track(GROUPER, 'y', { 2: -60, 3: -20 });
const G_TILT = track(GROUPER, 'tilt');

/** The grouper at story time s (and video time t, for its fins and its slow bob). */
export function grouperAt(s: number, t: number): WorldFish {
  return {
    shape: 'grouper',
    x: curveAt(G_X, s).at,
    y: curveAt(G_Y, s).at + 5 * Math.sin(cycles(3, t)),
    length: GROUPER_LEN,
    facing: 1,
    tilt: curveAt(G_TILT, s).at + 0.015 * Math.sin(cycles(2, t)),
    beat: cycles(21, t),
    effort: 0.3 + 0.4 * window01(s, 8.4, 10.6, 0.6) + 0.4 * window01(s, 13.4, SHUT + 0.2, 0.3),
  };
}

/** How far the murk still hides it: 1 hidden .. 0 in plain view. Out of the dark on "goliath". */
export const murkAt = (s: number): number => 1 - 0.4 * ramp(s, HUGE_AT - 0.2, RISES_AT + 0.2) - 0.6 * ramp(s, GOLIATH_AT - 0.3, GOLIATH_AT + 0.3);

const CHEWS = [{ at: SHUT + 0.4, size: 0.25 }, { at: SHUT + 0.8, size: 0.18 }, { at: BIGGER_AT - 0.1, size: 0.12 }] as const;
const CHEW_LEN = 0.22;

/** Its jaw: opened on "opens its mouth", held wide as the shark goes in, shut on it, then chewing. */
export function jawAt(s: number): number {
  if (s < SHUT - 0.1) return 1.1 * ramp(s, OPENS_AT, MOUTH_AT + 0.1);
  if (s < SHUT) return 1.1 * (1 - ramp(s, SHUT - 0.1, SHUT));
  let open = 0;
  for (const c of CHEWS) if (s > c.at && s < c.at + CHEW_LEN) open = Math.max(open, c.size * Math.sin((Math.PI * (s - c.at)) / CHEW_LEN));
  return open;
}

/** Water rushing into the open mouth, 0 .. 1. */
export const suctionAt = (s: number): number => (s < SHUT ? ramp(s, SUCK_FROM - 0.1, SUCK_FROM + 0.15) : 0);

/** The whole fish jolting as its jaw shuts. */
export const snapAt = (s: number): number => (s > SHUT - 0.02 && s < SHUT + 0.14 ? Math.sin((Math.PI * (s - SHUT + 0.02)) / 0.16) : 0);

/** Eyes squeezed for the gulp, then closed happily on "There's always a bigger fish". */
export function eyesAt(s: number): 'squeeze' | 'happy' | null {
  if (s >= SHUT - 0.05 && s < SHUT + 0.3) return 'squeeze';
  if (s >= THERES_AT + 0.1 && s < SO_AT + 0.1) return 'happy';
  return null;
}

/** A point of a fish's drawing (texture px, facing right) in the world, where its head is (the head doesn't bend). */
export function onFish(f: WorldFish, tex: Pt): Pt {
  const k = f.length / (2 * bodyProportions(f.shape).hl);
  const lx = (tex.x - FISH_TEX / 2) * k;
  const ly = (tex.y - FISH_TEX / 2) * k;
  const c = Math.cos(-f.tilt);
  const sn = Math.sin(-f.tilt);
  return { x: f.x + f.facing * (lx * c - ly * sn), y: f.y + lx * sn + ly * c };
}

/** Where the grouper's lips meet, or would: the middle of its mouth's opening, in the world. */
export function lipsAt(s: number, t: number): Pt {
  return onFish(grouperAt(s, t), lipsOf('grouper', jawAt(s)).mid);
}

// ---------------------------------------------------------------- the shark

/** How far the shark is in, as a share of its length past the lips: half way in frame 1, all of it as the jaws shut. */
const INSERTION: readonly Key[] = [
  { t: LIPS_AT, at: 0, rate: 2.5 },
  { t: OPENING, at: 0.34, rate: 1.2 },
  { t: 15.03, at: 0.43, rate: 1.2 },
  { t: SHUT, at: 1.04, rate: 5 },
];
export const insertionAt = (s: number): number => (s < LIPS_AT ? 0 : Math.min(1.04, curveAt(INSERTION, s).at));

/** How frantic the shark is on the line: fighting, then fighting harder once something huge rises. */
const furyAt = (s: number): number => 1 + 0.7 * ramp(s, HUGE_AT, RISES_AT + 0.3);

/** Where the hook sits in the shark's mouth while it fights the line: reeled slowly up, jerked about. */
export function hookedMouthAt(s: number, t: number): Pt {
  const fury = furyAt(s);
  return {
    x: lerp(600, 600, clamp01((s - 4) / 10.4)) + 14 * fury * Math.sin(cycles(37, t)),
    y: lerp(1130, 980, clamp01((s - 4) / 10.4)) + 9 * fury * Math.sin(cycles(45, t) + 1),
  };
}

/** A body centre that puts the nose of a fish `length` long, facing and tilted so, at `nose`. */
function centreFor(nose: Pt, length: number, facing: 1 | -1, tilt: number): Pt {
  return { x: nose.x - facing * Math.cos(tilt) * NOSE * length, y: nose.y + Math.sin(tilt) * NOSE * length };
}

/** The fish's nose, where the hook is. */
export function noseOf(f: WorldFish): Pt {
  return { x: f.x + f.facing * Math.cos(f.tilt) * NOSE * f.length, y: f.y - Math.sin(f.tilt) * NOSE * f.length };
}

function hookedShark(s: number, t: number): WorldFish {
  const fury = furyAt(s);
  // Hauled nose-up by the line, swinging as it fights.
  const tilt = 0.32 + 0.12 * fury * Math.sin(cycles(41, t));
  const c = centreFor(hookedMouthAt(s, t), SHARK_LEN, -1, tilt);
  return { shape: 'shark', x: c.x, y: c.y, length: SHARK_LEN, facing: -1, tilt, beat: cycles(61, t), effort: 1 };
}

/** The shark `d` of its length into the grouper's mouth, head first. */
function sharkIn(s: number, t: number, d: number): WorldFish {
  const g = grouperAt(s, t);
  const lips = lipsOf('grouper', jawAt(s));
  const mid = onFish(g, lips.mid);
  const hinge = onFish(g, lips.hinge);
  const dist = Math.hypot(hinge.x - mid.x, hinge.y - mid.y);
  const u = { x: (hinge.x - mid.x) / dist, y: (hinge.y - mid.y) / dist };
  // Its nose is d into the throat; its centre half a length back out.
  const back = (0.5 - d) * SHARK_LEN;
  const thrash = 0.09 * Math.sin(cycles(41, t)) * (1 - clamp01(d));
  return {
    shape: 'shark', x: mid.x - u.x * back, y: mid.y - u.y * back, length: SHARK_LEN, facing: -1, tilt: Math.atan2(-u.y, -u.x) + thrash, beat: cycles(79, t), effort: 1,
  };
}

/** How the shark is squeezed in the jaws. */
const SQUEEZE = 0.88;

export type SharkState =
  | { readonly kind: 'gone' }
  | { readonly kind: 'hooked'; readonly fish: WorldFish }
  | { readonly kind: 'swallowed'; readonly fish: WorldFish; readonly squash: number; readonly stretch: number };

export function sharkAt(s: number, t: number): SharkState {
  if (s >= SHUT) return { kind: 'gone' };
  if (s < SUCK_FROM) return { kind: 'hooked', fish: hookedShark(s, t) };
  if (s < LIPS_AT) {
    // Dragged from the line to the lips.
    const e = ((s - SUCK_FROM) / (LIPS_AT - SUCK_FROM)) ** 1.6;
    const from = hookedShark(s, t);
    const to = sharkIn(s, t, 0);
    return {
      kind: 'swallowed',
      fish: { ...to, x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e), tilt: lerp(from.tilt, to.tilt, e), beat: from.beat },
      squash: lerp(1, SQUEEZE, e),
      stretch: 1 + 0.06 * e,
    };
  }
  return { kind: 'swallowed', fish: sharkIn(s, t, insertionAt(s)), squash: SQUEEZE, stretch: 1.06 };
}

/** The shark in the grouper's belly: the swelling's size, centre and length in body lengths. */
export function bellyAt(s: number): { readonly size: number; readonly at: number; readonly width: number } {
  const hinge = 0.3;
  if (s < SHUT) {
    const inside = Math.max(0, insertionAt(s) * SHARK_LEN - hinge * GROUPER_LEN) / GROUPER_LEN;
    return { size: Math.min(1, inside * 4) * 0.3, at: hinge + 0.05 + inside * 0.4, width: 0.2 + inside * 0.9 };
  }
  // The gulp lands: the belly swells (overshooting) and stays round.
  const since = s - SHUT;
  const pop = 1 + 0.25 * Math.exp(-6 * since) * Math.sin(16 * since);
  return { size: 0.5 * pop * ramp(s, SHUT, SHUT + 0.1), at: lerp(0.4, 0.5, ramp(s, SHUT, SHUT + 0.8)), width: 0.62 };
}

// ---------------------------------------------------------------- the line and the hook

/** The hook, tracked by its bend: in the shark's mouth, then gone in at the grouper's lips, then torn free and reeled up empty. */
export function hookAt(s: number, t: number): { readonly at: Pt; readonly shown: boolean } {
  const shark = sharkAt(s, t);
  if (s < LIPS_AT && shark.kind !== 'gone') return { at: noseOf(shark.fish), shown: s < SUCK_FROM + 0.2 };
  if (s < RIP) return { at: lipsAt(s, t), shown: false };
  // Torn free: it springs up and away, then is reeled up out of the picture.
  const from = lipsAt(RIP, t);
  const since = s - RIP;
  const spring = 1 - Math.exp(-5 * since) * Math.cos(9 * since);
  const top = rodTipAt(t);
  return {
    at: { x: from.x + (top.x - from.x) * 0.1 * spring + (top.x - from.x) * 0.05 * since, y: from.y - 200 * spring - 150 * since },
    shown: true,
  };
}

/** How much the line bows sideways, px at its middle: taut while the fish fights; whipping slack when it tears free. */
export function lineBowAt(s: number): number {
  if (s < RIP) return 0;
  const since = s - RIP;
  return 90 * Math.exp(-2.2 * since) * Math.sin(10 * since);
}

/** How far the grouper's head is tugged towards the line as it tears free, 0 .. 1. */
export const tugAt = (s: number): number => window01(s, RIP - 0.25, RIP + 0.08, 0.12);

// ---------------------------------------------------------------- bubbles

/** Bubbles let out with the gulp, rising from the mouth (story time, so they run back in a rewind). */
export interface Bubble {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly alpha: number;
}

const BUBBLE_SEEDS = Array.from({ length: 14 }, (_, k) => ({
  delay: ((k * 37) % 11) / 22,
  dx: (((k * 53) % 17) / 17 - 0.5) * 130,
  r: 7 + ((k * 29) % 13),
  wobble: k * 1.7,
}));

export function bubblesAt(s: number): readonly Bubble[] {
  const since = s - SHUT;
  if (since < 0 || since > 2.6) return [];
  const from = lipsAt(SHUT, 0);
  return BUBBLE_SEEDS.flatMap((b) => {
    const u = since - b.delay;
    if (u < 0) return [];
    return [{ x: from.x + b.dx * Math.min(1, u * 2) + 12 * Math.sin(u * 6 + b.wobble), y: from.y - 40 - u * 300, r: b.r * (1 + 0.3 * u), alpha: 0.8 * Math.max(0, 1 - u / 2) }];
  });
}

// ---------------------------------------------------------------- the door

/** The door stands beside the grouper as big as it, top at its nose and foot at its tail, where it is on "door". */
export const DOOR: { readonly x: number; readonly top: number } = (() => {
  const g = grouperAt(DOOR_AT, 0);
  const half = g.length / 2;
  const top = g.y - Math.sin(g.tilt) * half;
  const bottom = g.y + Math.sin(g.tilt) * half;
  return { x: g.x + 500, top: (top + bottom) / 2 - DOOR_SIZE.h / 2 };
})();
