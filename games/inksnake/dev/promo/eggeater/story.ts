import { clamp01, curveAt, type Key, lerp, ramp, window01 } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This snake swallows eggs wider than its own HEAD!": the common egg-eater
 * (Dasypeltis scabra), seen side on at ground level, told by a narrator
 * (words.ts). Every beat is a pure function of time over a loop of LOOP_S.
 *
 *   hook     "This snake swallows eggs wider than its own HEAD!" (surprised):
 *            close on the jaws stretched round a speckled egg, mid-gulp; on
 *            "HEAD" a pulse and two brackets: the egg against the head
 *   teeth    "Africa's egg-eater has almost no teeth." (curious): the egg
 *            slides into the neck, a bulge; the empty mouth opens, pink gums
 *   crack    "Instead, it cracks the egg INSIDE its neck, on spikes from its
 *            BACKBONE!" (dramatic): an x-ray of the neck, the backbone's
 *            spikes light up, the egg cracks
 *   spit     "It gulps the yolk… then spits the shell back out, folded flat!"
 *            (laughing): a golden glow slides down the body, the shell comes
 *            back up and pops out of the mouth, folding flat
 *   smug     "No teeth, no plate, no problem. Because" (sarcastic): a smug
 *            snake beside the flat shell, which it flicks away; a new egg
 *            drops and rolls into the jaws: frame 1 again
 */

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** Whole cycles a loop, as a phase in radians at time t: for wiggles that must be where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * wrap(t)) / LOOP_S;

/** When a word of the voiceover begins in voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

/** When a word of the voiceover ends. */
export function ends(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.end / TEMPO;
}

export const HEAD_AT = said('HEAD!');
export const AFRICA_AT = said('Africa\'s');
export const NO_AT = said('no');
export const TEETH_AT = said('teeth.');
export const INSTEAD_AT = said('Instead,');
export const CRACKS_AT = said('cracks');
export const EGG_AT = said('egg');
export const INSIDE_AT = said('INSIDE');
export const SPIKES_AT = said('spikes');
export const BACKBONE_AT = said('BACKBONE!');
export const GULPS_AT = said('gulps');
export const YOLK_AT = said('yolk…');
export const THEN_AT = said('then');
export const SPITS_AT = said('spits');
export const BACK_AT = said('back');
export const OUT_AT = said('out,');
export const FOLDED_AT = said('folded');
export const FLAT_AT = said('flat!');
export const NO2_AT = said('No');
export const PROBLEM_AT = said('problem.');
export const BECAUSE_AT = said('Because');

/** The shell cracks just after "BACKBONE!" has been said. */
export const CRACK_AT = ends('BACKBONE!') + 0.05;
/** The shell pops out of the mouth. */
export const POP_AT = OUT_AT + 0.08;

// ---------------------------------------------------------------- the snake's world

/** World units: x right, y down, the ground at y = 0, the snout tip at x = 0 facing left, the body running off right. */
export const EGG = { rx: 24, ry: 18 } as const;
/** Half the body's depth: the slim body, and the head. */
export const BODY_HALF = 3.6;
export const HEAD_HALF = 5.4;
/** Where the jaws' hinge is, along the body. */
export const HINGE_S = 15;
export const BODY_LEN = 330;

// ---------------------------------------------------------------- beats

const sound = (t: number, from: number, to: number, fade: number): number => window01(t, from, to, fade);

/** Mood weights: one per sentence, a smooth crossfade at each seam (sum 1); the last gives back to the first as the new egg comes. */
export const MOODS = ['surprised', 'curious', 'dramatic', 'laugh', 'sarcastic'] as const;
export type Mood = (typeof MOODS)[number];

export function moodWeights(t: number): Readonly<Record<Mood, number>> {
  const u = wrap(t);
  const a = ramp(u, AFRICA_AT - 0.35, AFRICA_AT + 0.05);
  const b = ramp(u, INSTEAD_AT - 0.3, INSTEAD_AT + 0.1);
  const c = ramp(u, CRACK_AT + 0.05, CRACK_AT + 0.45);
  const d = ramp(u, NO2_AT - 0.35, NO2_AT + 0.05);
  const e = ramp(u, 17.15, 17.8);
  const w = {
    surprised: 1 - a + e,
    curious: a * (1 - b),
    dramatic: b * (1 - c),
    laugh: c * (1 - d),
    sarcastic: d * (1 - e),
  };
  return w;
}

/** How dark the scene is (0..1): the x-ray's night. */
export const darkness = (t: number): number => moodWeights(t).dramatic;

// ---------------------------------------------------------------- the egg

/** The slow gulp that works the egg in the jaws while it is held mid-swallow (whole cycles a loop, so the seam is clean). */
const gulpEnvelope = (u: number): number => 1 - ramp(u, 2.2, 2.9) + ramp(u, 17.7, 17.95);
const gulp = (t: number): number => gulpEnvelope(wrap(t)) * 0.9 * Math.sin(cycles(9, t));

/** The egg's centre along the body (its distance behind the snout): in the jaws, slid into the neck, held there, then the shell hauled back. */
const SWALLOW: readonly Key[] = [
  { t: 0, at: 4, rate: 0 },
  { t: 3.05, at: 4, rate: 0 },
  { t: 4.45, at: 70, rate: 0 },
  { t: 12.3, at: 70, rate: 0 },
  { t: 13.3, at: 12, rate: -10 },
  { t: 13.4, at: 4 },
];
/** The new egg: waiting out on the left, rolling into the jaws. */
const ROLL: readonly Key[] = [
  { t: 16.7, at: -30, rate: 0 },
  { t: 17.2, at: -30, rate: 0 },
  { t: 17.85, at: 4, rate: 0 },
];

/** The egg or shell's centre along the body (world x), or null when there is none. */
export function eggAt(t: number): number | null {
  const u = wrap(t);
  if (u >= POP_AT && u < 16.7) return null;
  const base = u >= 16.7 ? curveAt(ROLL, u).at : curveAt(SWALLOW, Math.min(u, 13.4)).at;
  const ripple = u > 3.05 && u < 4.45 ? 1.6 * Math.sin((u - 3.05) * 14) * Math.sin(((u - 3.05) / 1.4) * Math.PI) : 0;
  return base + ripple + gulp(u);
}

/** How high the egg is above the ground (the new egg drops in from above and bounces once). */
export function eggLift(t: number): number {
  const u = wrap(t);
  if (u < POP_AT) return 0;
  if (u < 17.05) {
    const k = Math.max(0, (u - 16.7) / 0.35);
    return 120 * (1 - k * k);
  }
  if (u < 17.25) return 6 * Math.sin((Math.PI * (u - 17.05)) / 0.2);
  return 0;
}

/** 0 a whole egg, 1 the cracked, crushed shell (a small lump). */
export const crush = (t: number): number => (wrap(t) >= 16.6 ? 0 : ramp(wrap(t), CRACK_AT, CRACK_AT + 0.65));
/** The crack lines on the shell, 0..1. */
export const cracked = (t: number): number => (wrap(t) >= 16.6 ? 0 : ramp(wrap(t), CRACK_AT, CRACK_AT + 0.12));
/** Which the object in the neck is: the whole egg, or the shell lump after the crack. */
export const isWhole = (t: number): boolean => wrap(t) < CRACK_AT + 0.3 || wrap(t) >= 16.6;

/** The yolk's glow: where it is along the body, and how bright. */
const YOLK_PATH: readonly Key[] = [
  { t: CRACK_AT + 0.2, at: 70, rate: 0 },
  { t: CRACK_AT + 0.9, at: 82, rate: 12 },
  { t: THEN_AT + 0.1, at: 190, rate: 0 },
];
export const yolkAt = (t: number): number => curveAt(YOLK_PATH, wrap(t)).at;
export const yolkGlow = (t: number): number => window01(wrap(t), CRACK_AT + 0.1, THEN_AT + 0.25, 0.3);

// ---------------------------------------------------------------- the neck, seen through

/** The x-ray: the skin turns glassy on "INSIDE" and clears again as the shell is spat. */
export const xray = (t: number): number => ramp(wrap(t), INSIDE_AT - 0.05, INSIDE_AT + 0.35) * (1 - ramp(wrap(t), CRACK_AT + 0.7, CRACK_AT + 1.3));
/** The backbone's spikes grow out on "spikes". */
export const spikesOut = (t: number): number => ramp(wrap(t), SPIKES_AT - 0.1, SPIKES_AT + 0.3) * (1 - ramp(wrap(t), CRACK_AT + 1.2, CRACK_AT + 1.5));
/** The spikes light up on "BACKBONE", and go out after the crack. */
export const spikesLit = (t: number): number => ramp(wrap(t), BACKBONE_AT, BACKBONE_AT + 0.14) * (1 - ramp(wrap(t), CRACK_AT + 0.6, CRACK_AT + 1.1));
/** The squeeze on "INSIDE" (a pulse), then the neck working harder as the crack nears: scales the bulge's height. */
export function squeeze(t: number): number {
  const u = wrap(t);
  const pulse = u > INSIDE_AT && u < INSIDE_AT + 0.6 ? Math.sin(((u - INSIDE_AT) / 0.6) * Math.PI) : 0;
  const work = u > INSIDE_AT + 0.6 && u < CRACK_AT ? Math.sin((u - INSIDE_AT) * 12) * ramp(u, INSIDE_AT + 0.6, CRACK_AT - 0.2) : 0;
  const snap = u >= CRACK_AT && u < CRACK_AT + 0.25 ? -Math.sin(((u - CRACK_AT) / 0.25) * Math.PI) : 0;
  return 0.07 * pulse + 0.035 * work + 0.05 * snap;
}

/** A white flash and shake at the crack. */
export const crackFlash = (t: number): number => {
  const u = wrap(t) - CRACK_AT;
  return u < 0 || u > 0.35 ? 0 : (1 - u / 0.35) ** 2;
};

// ---------------------------------------------------------------- the mouth and face

const bell = (u: number, from: number, to: number): number => (u <= from || u >= to ? 0 : Math.sin(((u - from) / (to - from)) * Math.PI));

/** How wide the jaws are open (0..1): the empty mouth on "no teeth", then the pop of the shell. */
export function gape(t: number): number {
  const u = wrap(t);
  const empty = sound(u, NO_AT - 0.15, INSTEAD_AT - 0.1, 0.22);
  const pop = bell(u, POP_AT - 0.22, POP_AT + 0.4);
  return Math.max(empty, Math.min(1, pop * 1.6));
}

/** The eyelid's droop (0 open .. 1 shut): half down and smug through the last sentence. */
export const lid = (t: number): number => 0.5 * window01(wrap(t), NO2_AT + 0.2, 17.1, 0.3);

/** The tongue flicking out (0..1), in short bursts. */
export function tongue(t: number): number {
  const u = wrap(t);
  return Math.max(bell(u, 5.85, 6.2), bell(u, 15.25, 15.55), bell(u, 16.2, 16.5)) * 0.9;
}

// ---------------------------------------------------------------- the shell outside

export interface ShellPose {
  readonly x: number;
  readonly y: number;
  readonly rot: number;
  /** 0 crumpled mound .. 1 folded flat. */
  readonly fold: number;
  readonly alpha: number;
}

const FLY_S = 0.42;
const TOSS_AT = 16.55;
const TOSS_S = 0.5;
const SHELL_REST = -22;

/** The shell after the pop: out of the mouth in an arc to the ground, folding flat, then flicked away; null while there is none. */
export function shellAt(t: number): ShellPose | null {
  const u = wrap(t);
  if (u < POP_AT || u >= TOSS_AT + TOSS_S) return null;
  const fold = ramp(u, FOLDED_AT, FLAT_AT + 0.3);
  if (u < POP_AT + FLY_S) {
    const k = (u - POP_AT) / FLY_S;
    return { x: lerp(3, SHELL_REST, k), y: lerp(-8, -1, k * k) - 20 * Math.sin(Math.PI * k), rot: -0.6 * Math.sin(Math.PI * k), fold: 0, alpha: 1 };
  }
  if (u < TOSS_AT) {
    const land = Math.max(0, 1 - (u - POP_AT - FLY_S) / 0.25);
    return { x: SHELL_REST, y: -1 - 2.2 * land * Math.abs(Math.sin((u - POP_AT) * 18)), rot: 0, fold, alpha: 1 };
  }
  const k = (u - TOSS_AT) / TOSS_S;
  return { x: SHELL_REST - 70 * k, y: -1 - 38 * Math.sin(Math.PI * Math.min(1, k * 0.9)), rot: -9 * k, fold, alpha: 1 - ramp(k, 0.75, 1) };
}

// ---------------------------------------------------------------- camera

export interface Camera {
  /** World point at the screen's centre x, and at y = CAM_Y. */
  readonly cx: number;
  readonly cy: number;
  /** Screen px per world unit. */
  readonly k: number;
}

/** Where on the screen the camera's point sits (inside the safe area). */
export const CAM_Y = 700;
export const SCREEN_W = 1080;

interface CamKey {
  readonly t: number;
  readonly cx: number;
  readonly cy: number;
  readonly k: number;
}

const CAM_KEYS: readonly CamKey[] = [
  { t: 0, cx: 4, cy: -13.6, k: 11 },
  { t: 2.9, cx: 4, cy: -13.6, k: 11 },
  { t: 3.9, cx: 30, cy: -19, k: 11.5 },
  { t: 4.45, cx: 46, cy: -19, k: 10.5 },
  { t: 4.65, cx: 46, cy: -19, k: 10.5 },
  { t: 5.05, cx: 12, cy: -7, k: 20 },
  { t: 5.55, cx: 12, cy: -7, k: 20 },
  { t: 6.1, cx: 42, cy: -17, k: 13 },
  { t: 7.0, cx: 68, cy: -20, k: 12.5 },
  { t: 7.6, cx: 68, cy: -21, k: 13.5 },
  { t: 10.4, cx: 70, cy: -22, k: 15.5 },
  { t: 11.0, cx: 92, cy: -14, k: 10.5 },
  { t: 12.0, cx: 104, cy: 1, k: 9 },
  { t: 12.3, cx: 102, cy: 1, k: 9 },
  { t: 13.0, cx: 30, cy: -12, k: 11 },
  { t: 13.35, cx: 8, cy: -10, k: 14 },
  { t: 14.0, cx: -4, cy: -8, k: 14 },
  { t: 14.6, cx: -3, cy: -8, k: 14.5 },
  { t: 16.3, cx: -2, cy: -9, k: 15.5 },
  { t: 16.7, cx: -2, cy: -9, k: 15.5 },
  { t: LOOP_S, cx: 4, cy: -13.6, k: 11 },
];

const track = (pick: (c: CamKey) => number, t: number, rate0 = 0): number =>
  curveAt(CAM_KEYS.map((c, i) => ({ t: c.t, at: pick(c), ...(i === 0 || i === CAM_KEYS.length - 1 ? { rate: rate0 } : {}) })), t).at;

/** The pulse on "HEAD": the camera pushes in a little and back. */
export const headPulse = (t: number): number => bell(wrap(t), HEAD_AT - 0.05, HEAD_AT + 0.6);

export function cameraAt(t: number): Camera {
  const u = wrap(t);
  const k = Math.exp(track((c) => Math.log(c.k), u));
  return { cx: track((c) => c.cx, u), cy: track((c) => c.cy, u), k: k * (1 + 0.06 * headPulse(u)) };
}

/** A small shake for the crack and the pop. */
export function shakeAt(t: number): { readonly x: number; readonly y: number } {
  const u = wrap(t);
  const a = crackFlash(u) * 26 + bell(u, POP_AT - 0.02, POP_AT + 0.25) * 10;
  return { x: a * Math.sin(u * 83), y: a * Math.cos(u * 71) };
}

// ---------------------------------------------------------------- marks

/** The brackets that set the egg's width against the head's, on "HEAD". */
export const bracketsShown = (t: number): number => window01(wrap(t), HEAD_AT - 0.25, 3.2, 0.25);

/** A white-hot ring where something is struck (0..1), driven by the effects' own cues. */
export const ringAt = (t: number, from: number, len = 0.5): number => {
  const u = wrap(t) - from;
  return u < 0 || u > len ? 0 : u / len;
};

export const clampUnit = clamp01;
