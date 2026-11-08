import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, curveAt, type Key, ramp, window01 } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This shark swallowed a three-foot SHARK!": Great Keppel Island, southern
 * Great Barrier Reef, 1 August 2011. A tasselled wobbegong (a flat carpet
 * shark with a fringe of skin tassels round its broad head, over 1.3 m long)
 * was found swallowing a brown-banded bamboo shark of about 1 m (3 ft),
 * head-first. Watched for about 30 minutes, it got about halfway; the
 * researchers guessed it would need at least several more hours.
 *
 * One continuous scene seen from above: the wobbegong lies on the reef with
 * the bamboo shark's back half sticking out of its mouth the whole time (it
 * never gets further than halfway). The camera, the light and the animals'
 * faces change with every sentence. World units are millimetres, the
 * wobbegong's mouth at the origin, its nose pointing up the screen.
 *
 *   0     SHOCK. "This shark swallowed a three-foot SHARK!": close on the
 *         broad tasselled head, the mouth stretched round the bamboo shark,
 *         its banded back half curling up out of it; a slow gulp, and on
 *         "SHARK!" a jolt and the tail flips
 *   2.8   WONDER. "Great Barrier Reef, 2011.": pull back over sunny coral,
 *         caustics dancing; "Great Barrier Reef" and "2011"
 *   5.0   PLAYFUL. "A wobbegong, a shark that looks like a shaggy carpet,":
 *         it lies flat, blending in; its name; the camera sways, the eyes
 *         glance; on "shaggy" the fringe fluffs, on "carpet" a chalk rug with
 *         tasselled ends draws round it and its pattern ripples
 *   7.9   EXCITED. "was found with a whole bamboo shark going down HEAD-first!":
 *         push in; the bamboo shark lights up, its swallowed front half
 *         seen through the wobbegong's head as an X-ray; a tape along it,
 *         "3 ft" / "1 m"; on "HEAD-first" an arrow down to its head
 *  11.7   LAUGH. "Thirty minutes later? Only HALFWAY.": a whip to a still shot;
 *         a clock jumps 30 minutes, a progress bar fills to 50% and stalls
 *  14.0   SARCASTIC. "Scientists guessed a few more HOURS.": two divers float
 *         in, one with a slate; the sun arcs over, the light goes gold, then
 *         dusky; the wobbegong hasn't moved
 *  16.0   LAZY. "No rush.": close on its eye, which half-closes, satisfied;
 *         a sigh of bubbles; the bamboo shark slips back a little
 *  16.9   "Because yes,": morning again, back down to the head, into frame 1.
 */

/** The line boil steps at the game's 8 a second: 144 steps, 48 whole cycles a loop. */
const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** Whole cycles a loop, as a phase in radians: wiggles that are where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

function wordOf(text: string, nth: number): { readonly start: number; readonly end: number } {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w;
}
/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export const said = (text: string, nth = 1): number => wordOf(text, nth).start / TEMPO;
/** When a word ends. */
export const ends = (text: string, nth = 1): number => wordOf(text, nth).end / TEMPO;

export const SWALLOWED_AT = said('swallowed');
export const THREE_AT = said('three-foot');
export const SHARK_AT = said('SHARK!');
export const SHARK_END = ends('SHARK!');
export const GREAT_AT = said('Great');
export const REEF_AT = said('Reef,');
export const YEAR_AT = said('2011.');
export const YEAR_END = ends('2011.');
export const A_AT = said('A');
export const WOBBEGONG_AT = said('wobbegong,');
export const LOOKS_AT = said('looks');
export const SHAGGY_AT = said('shaggy');
export const CARPET_AT = said('carpet,');
export const CARPET_END = ends('carpet,');
export const WAS_AT = said('was');
export const FOUND_AT = said('found');
export const WHOLE_AT = said('whole');
export const BAMBOO_AT = said('bamboo');
export const DOWN_AT = said('down');
export const HEAD_AT = said('HEAD-first!');
export const HEAD_END = ends('HEAD-first!');
export const THIRTY_AT = said('Thirty');
export const MINUTES_AT = said('minutes');
export const LATER_AT = said('later?');
export const ONLY_AT = said('Only');
export const HALFWAY_AT = said('HALFWAY.');
export const HALFWAY_END = ends('HALFWAY.');
export const SCIENTISTS_AT = said('Scientists');
export const GUESSED_AT = said('guessed');
export const FEW_AT = said('few');
export const HOURS_AT = said('HOURS.');
export const HOURS_END = ends('HOURS.');
export const NO_AT = said('No');
export const RUSH_AT = said('rush.');
export const RUSH_END = ends('rush.');
export const BECAUSE_AT = said('Because');
export const YES_AT = said('yes,');

// ---------------------------------------------------------------- the two views

/**
 * The hook is seen low and from the front, at the wobbegong's eye level:
 * its huge mouth gaping round the bamboo shark. On "Great Barrier Reef" the
 * camera rises off the reef and the picture becomes the overhead view the
 * rest of the story is told in; on "Because yes," it comes back down to the
 * front view, into frame 1. 0 the front view, 1 overhead.
 */
export const FRONT_OUT = { from: 2.62, to: 3.3 } as const;
export const FRONT_IN = { from: BECAUSE_AT + 0.05, to: YES_AT + 0.25 } as const;
export const topAt = (t: number): number => ramp(wrap(t), FRONT_OUT.from, FRONT_OUT.to) * (1 - ramp(wrap(t), FRONT_IN.from, FRONT_IN.to));

/** The front view's camera: zooming about FRONT_ANCHOR (px), the picture sinking `sink` px as the camera rises. */
export const FRONT_ANCHOR = { x: 540, y: 900 } as const;
/** Its slow push in, log zoom a second, the same either side of the seam. */
const FRONT_PUSH = 0.02;
const FRONT_ZOOM: readonly Key[] = [
  { t: 0, at: 0, rate: FRONT_PUSH },
  { t: 1.8, at: 0.036 },
  { t: SHARK_AT + 0.12, at: 0.08 },
  { t: FRONT_OUT.from, at: 0.075, rate: 0 },
  { t: FRONT_OUT.to, at: -0.3, rate: 0 },
  { t: BECAUSE_AT, at: -0.3, rate: 0 },
  { t: LOOP_S, at: 0, rate: FRONT_PUSH },
];
const FRONT_SINK: readonly Key[] = [
  { t: 0, at: 0, rate: 0 },
  { t: FRONT_OUT.from, at: 0, rate: 0 },
  { t: FRONT_OUT.to, at: 950, rate: 0 },
  { t: BECAUSE_AT, at: 950, rate: 0 },
  { t: YES_AT + 0.3, at: 30 },
  { t: LOOP_S, at: 0, rate: 0 },
];
export function frontCamAt(t: number): { readonly zoom: number; readonly sink: number } {
  const u = wrap(t);
  return { zoom: Math.exp(curveAt(FRONT_ZOOM, u).at), sink: curveAt(FRONT_SINK, u).at };
}
/** A front-view point (px at frame 1) on screen. */
export function frontToScreen(t: number, p: Pt): { x: number; y: number } {
  const c = frontCamAt(t);
  return { x: FRONT_ANCHOR.x + (p.x - FRONT_ANCHOR.x) * c.zoom, y: FRONT_ANCHOR.y + (p.y - FRONT_ANCHOR.y) * c.zoom + c.sink };
}

// ---------------------------------------------------------------- the camera

/** Where the camera's centre lands on screen. */
export const ANCHOR = { x: 540, y: 820 } as const;

/** World point (x, y) mm at the anchor, `zoom` screen px per mm, turned `rot` radians. */
export interface Camera {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
  readonly rot: number;
}

interface CamKey {
  readonly t: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly r?: number;
  /** Stops here (an ease out and in) rather than gliding through. */
  readonly hold?: boolean;
}

/** Frame 1: close on the head and the bamboo shark curling out of it. */
export const CLOSE = { x: 45, y: -100, z: 1.68 } as const;
/** The slow push in on frame 1, in log zoom a second, the same on both sides of the seam. */
const PUSH = 0.018;

const CAM: readonly CamKey[] = [
  { t: 0, ...CLOSE },
  { t: 1.8, x: 44, y: -98, z: 1.74 },
  { t: SHARK_AT + 0.12, x: 42, y: -90, z: 1.86 },
  { t: 2.62, x: 42, y: -88, z: 1.84, hold: true },
  // Wonder: up and away over the reef.
  { t: YEAR_AT + 0.05, x: 0, y: 470, z: 0.4, hold: true },
  { t: A_AT - 0.05, x: 10, y: 480, z: 0.41 },
  // Playful: a little closer, swaying.
  { t: 5.75, x: -25, y: 520, z: 0.5, r: -0.035 },
  { t: 6.65, x: 25, y: 530, z: 0.51, r: 0.035 },
  { t: CARPET_AT + 0.25, x: 0, y: 530, z: 0.5, r: -0.01 },
  { t: WAS_AT - 0.05, x: 0, y: 530, z: 0.5, r: 0, hold: true },
  // Excited: in on the bamboo shark, a punch on "HEAD-first".
  { t: WHOLE_AT + 0.1, x: 40, y: 90, z: 0.92, hold: true },
  { t: HEAD_AT - 0.1, x: 40, y: 100, z: 0.96 },
  { t: HEAD_AT + 0.25, x: 30, y: 300, z: 1.12, hold: true },
  { t: THIRTY_AT - 0.45, x: 30, y: 290, z: 1.08 },
  // Laugh: a whip to a still shot, room for the clock and the bar above.
  { t: THIRTY_AT + 0.05, x: 30, y: -230, z: 0.74, hold: true },
  { t: SCIENTISTS_AT - 0.2, x: 30, y: -230, z: 0.75, hold: true },
  // Sarcastic: back, the divers either side, the sun overhead.
  { t: GUESSED_AT + 0.2, x: 0, y: 440, z: 0.45, hold: true },
  { t: HOURS_END, x: 0, y: 450, z: 0.46 },
  // Lazy: close on its eye, the mouth still in the corner.
  { t: RUSH_AT + 0.15, x: 70, y: 70, z: 1.95, hold: true },
  { t: BECAUSE_AT, x: 68, y: 66, z: 2.02 },
  { t: LOOP_S, ...CLOSE },
];

const keysOf = (pick: (k: CamKey) => number, edgeRate: number): Key[] =>
  CAM.map((k, i) => ({ t: k.t, at: pick(k), rate: i === 0 || i === CAM.length - 1 ? edgeRate : k.hold ? 0 : undefined }));
const CAM_X = keysOf((k) => k.x, 0);
const CAM_Y = keysOf((k) => k.y, 0);
const CAM_Z = keysOf((k) => Math.log(k.z), PUSH);
const CAM_R = keysOf((k) => k.r ?? 0, 0);

/** Jolts of the picture on "SHARK!", px. */
export function shakeAt(t: number): { readonly x: number; readonly y: number } {
  const s = wrap(t) - SHARK_AT - 0.05;
  if (s < 0 || s > 0.5) return { x: 0, y: 0 };
  const amp = 22 * (1 - s / 0.5) ** 2;
  return { x: amp * Math.sin(s * 105), y: amp * 0.7 * Math.cos(s * 131) };
}

export function cameraAt(t: number): Camera {
  const u = wrap(t);
  return { x: curveAt(CAM_X, u).at, y: curveAt(CAM_Y, u).at, zoom: Math.exp(curveAt(CAM_Z, u).at), rot: curveAt(CAM_R, u).at };
}

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** A world point (mm) on screen (px). */
export function toScreen(cam: Camera, p: Pt): { x: number; y: number } {
  const dx = (p.x - cam.x) * cam.zoom;
  const dy = (p.y - cam.y) * cam.zoom;
  const c = Math.cos(cam.rot);
  const s = Math.sin(cam.rot);
  return { x: ANCHOR.x + dx * c - dy * s, y: ANCHOR.y + dx * s + dy * c };
}

/** Sets ctx so world mm draw where the camera sees them (call inside save/restore). */
export function applyCamera(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  const jolt = shakeAt(t);
  ctx.translate(ANCHOR.x + jolt.x, ANCHOR.y + jolt.y);
  ctx.rotate(cam.rot);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);
}

// ---------------------------------------------------------------- the swallow

/** How much of the bamboo shark (mm of its 1,000) is inside: a slow gulp in frame 1, slipping back on "No rush". */
const IN_KEYS: readonly Key[] = [
  { t: 0, at: 488, rate: 9 },
  { t: 1.5, at: 500 },
  { t: SHARK_AT + 0.15, at: 518, rate: 14 },
  { t: 2.9, at: 522, rate: 0 },
  { t: HALFWAY_AT + 0.05, at: 522, rate: 0 },
  { t: HALFWAY_AT + 0.3, at: 527, rate: 0 },
  { t: NO_AT, at: 526, rate: 0 },
  { t: BECAUSE_AT + 0.2, at: 482, rate: 0 },
  { t: LOOP_S, at: 488, rate: 9 },
];
export const inAt = (t: number): number => curveAt(IN_KEYS, wrap(t)).at;

/** The gape: the jaws stretching wider, 0 .. 1, a swell through frame 1 that peaks on "SHARK!". */
export function gapeAt(t: number): number {
  const u = wrap(t);
  const hook = Math.exp(-(((u - SHARK_AT - 0.1) / 0.45) ** 2));
  const lead = Math.exp(-(((u - LOOP_S - SHARK_AT - 0.1) / 0.45) ** 2));
  const halfway = 0.35 * Math.exp(-(((u - HALFWAY_AT - 0.25) / 0.2) ** 2));
  return clamp01(0.55 + 0.45 * (hook + lead) + halfway + 0.06 * Math.sin(cycles(4, u)));
}

/**
 * The bamboo shark's tail: how far its back half bends (1 its resting
 * curl), and a flip (radians at the tail) that kicks on "SHARK!", again on
 * "HALFWAY" and lazily on "No rush", with a steady small wave between.
 */
export function tailAt(t: number): { readonly bend: number; readonly flip: number; readonly wave: number } {
  const u = wrap(t);
  const kick = (at: number, amp: number, hz: number, decay: number): number => {
    const s = u - at;
    // Faded right out a few decays on, so nothing is left ringing at the seam.
    return s < 0 ? 0 : amp * Math.exp(-s / decay) * Math.sin(2 * Math.PI * hz * s) * (1 - ramp(s, 3 * decay, 4 * decay));
  };
  const flip = kick(SHARK_AT, 0.75, 2.6, 0.4) + kick(HALFWAY_AT + 0.2, 0.4, 3, 0.25) + kick(NO_AT + 0.1, 0.25, 0.9, 0.4);
  // The struggle eases off as the story goes on, and comes back for the seam.
  const bend = 1 + 0.06 * Math.sin(cycles(3, u));
  return { bend, flip, wave: cycles(15, u) };
}

// ---------------------------------------------------------------- the wobbegong's face

interface EyeKey {
  readonly t: number;
  /** Upper lid, 0 open .. 1 shut. */
  readonly lid: number;
  /** Where it looks, -1 .. 1 each way (screen x, y with its nose up). */
  readonly lx: number;
  readonly ly: number;
  /** How smug (a lower lid pushing up): 0 .. 1. */
  readonly smug: number;
}

const EYE: readonly EyeKey[] = [
  { t: 0, lid: 0, lx: 0, ly: -0.3, smug: 0 },
  { t: 2.6, lid: 0, lx: 0.2, ly: -0.4, smug: 0 },
  { t: 3.2, lid: 0.2, lx: 0, ly: 0, smug: 0 },
  { t: A_AT, lid: 0.2, lx: 0, ly: 0, smug: 0 },
  { t: WOBBEGONG_AT + 0.4, lid: 0.35, lx: -0.9, ly: 0.1, smug: 0.4 },
  { t: SHAGGY_AT, lid: 0.35, lx: -0.9, ly: 0.1, smug: 0.4 },
  { t: CARPET_AT + 0.1, lid: 0.35, lx: 0.9, ly: 0.1, smug: 0.4 },
  { t: WAS_AT, lid: 0.3, lx: 0.9, ly: 0, smug: 0.3 },
  { t: FOUND_AT + 0.2, lid: 0, lx: 0.6, ly: -0.8, smug: 0 },
  { t: HEAD_END, lid: 0, lx: 0.6, ly: -0.8, smug: 0 },
  { t: THIRTY_AT + 0.1, lid: 0.45, lx: 0, ly: -1, smug: 0 },
  { t: HALFWAY_END, lid: 0.45, lx: 0, ly: -1, smug: 0 },
  { t: SCIENTISTS_AT + 0.3, lid: 0.5, lx: -0.9, ly: -0.5, smug: 0.2 },
  { t: HOURS_AT, lid: 0.5, lx: 0.8, ly: -0.6, smug: 0.2 },
  { t: NO_AT + 0.05, lid: 0.45, lx: 0, ly: -0.2, smug: 0.4 },
  { t: RUSH_AT + 0.2, lid: 0.66, lx: 0, ly: 0, smug: 1 },
  { t: BECAUSE_AT + 0.1, lid: 0.66, lx: 0, ly: 0, smug: 1 },
  { t: YES_AT + 0.15, lid: 0, lx: 0, ly: -0.3, smug: 0 },
  { t: LOOP_S, lid: 0, lx: 0, ly: -0.3, smug: 0 },
];

/** Eases from each key to the next (a held look between moves). */
function stepped<K extends { readonly t: number }>(keys: readonly K[], u: number, mix: (a: K, b: K, f: number) => K, ease = 0.3): K {
  let i = 0;
  while (i < keys.length - 2 && u >= keys[i + 1]!.t) i++;
  const a = keys[i]!;
  const b = keys[i + 1]!;
  return mix(a, b, ramp(u, Math.max(a.t, b.t - ease), b.t));
}

const lerpN = (a: number, b: number, f: number): number => a + (b - a) * f;

export function eyeAt(t: number): EyeKey {
  return stepped(EYE, wrap(t), (a, b, f) => ({ t: 0, lid: lerpN(a.lid, b.lid, f), lx: lerpN(a.lx, b.lx, f), ly: lerpN(a.ly, b.ly, f), smug: lerpN(a.smug, b.smug, f) }));
}

/** The fringe fluffing up on "shaggy", 0 .. 1. */
export const shagAt = (t: number): number => window01(wrap(t), SHAGGY_AT - 0.05, CARPET_END + 0.45, 0.25);
/** The pattern's ripple running nose to tail on "carpet": where the bright band is (0 .. 1 down the body) and how bright. */
export function rippleAt(t: number): { readonly at: number; readonly strength: number } {
  const u = wrap(t);
  return { at: ramp(u, CARPET_AT - 0.1, CARPET_AT + 0.9) * 1.3 - 0.15, strength: window01(u, CARPET_AT - 0.15, CARPET_AT + 1.0, 0.2) };
}
/** The chalk rug drawn round it on "carpet", 0 .. 1 drawn, and its fade. */
export const rugDrawAt = (t: number): number => ramp(wrap(t), CARPET_AT - 0.2, CARPET_AT + 0.35);
export const rugAt = (t: number): number => window01(wrap(t), CARPET_AT - 0.2, WAS_AT + 0.15, 0.15);

/** The bamboo shark lit up, from "whole bamboo" to the whip. */
export const highlightAt = (t: number): number => window01(wrap(t), WHOLE_AT - 0.05, THIRTY_AT - 0.2, 0.2);
/** Its swallowed front half seen through the wobbegong's head, from "going down" (half already on "bamboo shark"). */
export const xrayAt = (t: number): number =>
  Math.max(0.55 * window01(wrap(t), BAMBOO_AT + 0.1, THIRTY_AT - 0.2, 0.25), window01(wrap(t), DOWN_AT - 0.2, THIRTY_AT - 0.2, 0.2));
/** The arrow down its throat to its head on "HEAD-first", drawn 0 .. 1. */
export const arrowAt = (t: number): number => Math.min(ramp(wrap(t), HEAD_AT - 0.05, HEAD_AT + 0.3), 1 - ramp(wrap(t), THIRTY_AT - 0.4, THIRTY_AT - 0.2));

// ---------------------------------------------------------------- the clock, the bar, the divers, the sun

/** The clock on screen, 0 .. 1 (it pops up on "Thirty" and goes as the divers come). */
export const clockAt = (t: number): number => window01(wrap(t), THIRTY_AT - 0.1, SCIENTISTS_AT + 0.15, 0.18);
/** Minutes gone on the clock: a jump to 30 on "minutes later", overshooting. */
export function minutesAt(t: number): number {
  const u = wrap(t) - MINUTES_AT;
  if (u <= 0) return 0;
  const k = Math.min(1, u / 0.35);
  return 30 * (1 - (1 - k) ** 3) + 4 * Math.sin(Math.min(u, 1.2) * 9) * Math.exp(-u * 4) * (u > 0.35 ? 1 : 0);
}
/** The progress bar on screen, 0 .. 1. */
export const barAt = (t: number): number => window01(wrap(t), ONLY_AT - 0.2, SCIENTISTS_AT + 0.25, 0.18);
/** How full the bar is, 0 .. 1: it races to 48%, creeps to 50% on "HALFWAY" and stalls there. */
export function fillAt(t: number): number {
  const u = wrap(t);
  return 0.48 * ramp(u, ONLY_AT, HALFWAY_AT) + 0.02 * ramp(u, HALFWAY_AT, HALFWAY_AT + 0.3);
}

/** The divers floating in from either side, 0 .. 1 (in, then out again on "No rush"). */
export const diversAt = (t: number): number => window01(wrap(t), SCIENTISTS_AT - 0.25, NO_AT + 0.25, 0.45);

/** The sun across the top: 0 rising at the left .. 1 setting at the right, and how much it shows. */
export function sunAt(t: number): { readonly arc: number; readonly shown: number } {
  const u = wrap(t);
  return { arc: ramp(u, GUESSED_AT, HOURS_END + 0.1), shown: window01(u, GUESSED_AT - 0.15, NO_AT + 0.15, 0.2) };
}

/** The shadows' throw, mm: the sun's from up-left, swinging round as it crosses, back for the morning on "Because yes". */
export function shadowAt(t: number): { readonly x: number; readonly y: number } {
  const u = wrap(t);
  const swing = ramp(u, GUESSED_AT, HOURS_END + 0.1) - ramp(u, BECAUSE_AT, YES_AT + 0.2);
  const a = 0.85 + 1.6 * swing;
  const len = 34 + 26 * Math.sin(Math.PI * swing);
  return { x: len * Math.cos(a), y: len * Math.sin(a) };
}

/** A sigh of bubbles from its spiracle on "No rush", 0 .. 1 through the sigh (-1: none). */
export function sighAt(t: number): number {
  const u = wrap(t) - NO_AT + 0.05;
  return u < 0 || u > 1.3 ? -1 : u / 1.3;
}

// ---------------------------------------------------------------- the light

/** A mood's light: a wash over everything, the dark at the edges, the caustics, a spot on the head. */
export interface Grade {
  readonly tint: readonly [number, number, number];
  readonly tintA: number;
  readonly vignette: number;
  readonly caustics: number;
  readonly spot: number;
  readonly glow: readonly [number, number, number];
  readonly glowA: number;
  /** The reef darkened behind the sharks, so they stand out: 0 .. 1. */
  readonly dim: number;
}

const g = (
  tint: readonly [number, number, number], tintA: number, vignette: number, caustics: number, spot: number, glow: readonly [number, number, number], glowA: number, dim = 0,
): Grade => ({ tint, tintA, vignette, caustics, spot, glow, glowA, dim });

export const SHOCK = g([150, 190, 200], 0.24, 0.9, 0.35, 0.22, [255, 236, 200], 0.05, 0.55);
const WONDER = g([160, 220, 228], 0.22, 0.4, 0.9, 0, [255, 245, 210], 0.12);
const PLAY = g([240, 196, 132], 0.3, 0.5, 0.75, 0, [255, 220, 160], 0.1);
const EXCITE = g([235, 170, 150], 0.22, 0.62, 0.6, 0.15, [255, 210, 150], 0.1, 0.25);
const LAUGH = g([175, 190, 200], 0.34, 0.5, 0.45, 0, [255, 255, 255], 0.04);
const NOON = g([255, 236, 190], 0.22, 0.42, 0.95, 0, [255, 240, 200], 0.14);
const SUNSET = g([235, 130, 70], 0.48, 0.6, 0.5, 0, [255, 170, 90], 0.16);
const DUSK = g([95, 80, 150], 0.5, 0.78, 0.12, 0, [255, 160, 120], 0.05, 0.3);

const GRADES: readonly (readonly [number, Grade])[] = [
  [0, SHOCK], [2.62, SHOCK], [3.3, WONDER], [A_AT, WONDER], [5.45, PLAY], [WAS_AT - 0.1, PLAY], [FOUND_AT + 0.15, EXCITE], [THIRTY_AT - 0.2, EXCITE],
  [THIRTY_AT + 0.05, LAUGH], [SCIENTISTS_AT - 0.1, LAUGH], [GUESSED_AT, NOON], [FEW_AT + 0.25, SUNSET], [HOURS_END, DUSK], [BECAUSE_AT + 0.1, DUSK],
  [YES_AT + 0.25, SHOCK], [LOOP_S, SHOCK],
];

const mixGrade = (a: Grade, b: Grade, f: number): Grade => {
  const m3 = (p: readonly [number, number, number], q: readonly [number, number, number]): [number, number, number] => [lerpN(p[0], q[0], f), lerpN(p[1], q[1], f), lerpN(p[2], q[2], f)];
  return {
    tint: m3(a.tint, b.tint), tintA: lerpN(a.tintA, b.tintA, f), vignette: lerpN(a.vignette, b.vignette, f), caustics: lerpN(a.caustics, b.caustics, f),
    spot: lerpN(a.spot, b.spot, f), glow: m3(a.glow, b.glow), glowA: lerpN(a.glowA, b.glowA, f), dim: lerpN(a.dim, b.dim, f),
  };
};

export function gradeAt(t: number): Grade {
  const u = wrap(t);
  let i = 0;
  while (i < GRADES.length - 2 && u >= GRADES[i + 1]![0]) i++;
  const [ta, a] = GRADES[i]!;
  const [tb, b] = GRADES[i + 1]!;
  return mixGrade(a, b, ramp(u, ta, tb));
}

/** A flash of light as the morning comes back on "Because yes", 0 .. 1. */
export const morningAt = (t: number): number => window01(wrap(t), BECAUSE_AT + 0.2, YES_AT + 0.45, 0.3) * 0.18;
