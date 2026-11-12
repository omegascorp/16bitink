import type { SfxId } from '../../../src/audio/recipes';
import { clamp01, ramp, window01 } from '../short';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "This snake catches BATS right out of the air!": narrated, a pure function
 * of time, every beat timed from the words. Dinets 2017 (Animal Behavior and
 * Cognition): one cave in Desembarco del Granma National Park, Cuba; Cuban
 * boas (110–210 cm) hanging from the passage ceiling at dusk as a few
 * hundred Jamaican fruit bats flew out; up to three hunting at once, the
 * later boas taking the same stretch of passage as the first; 2 of 3 solo
 * hunts failed, every group hunt succeeded; they caught and ate the bats.
 * Never constricting or squeezing a bat, never a "pack" or a "team", never
 * planning or talking, never hundreds of snakes, never blood.
 *
 *   0     frame 1: a Cuban boa hanging from the rock ceiling, its front
 *         looping down, jaws shut on a fruit bat with its wings spread,
 *         against the dusk-orange glow of the cave mouth (hook)
 *   2.51  "Cuban boas hang from a cave ceiling at dusk…": down the passage
 *         to the glowing mouth, one boa hanging, swaying, tongue out
 *   5.58  "as hundreds of bats pour out.": bats streaming past it to the
 *         mouth, the camera jittery (nervous)
 *   7.64  "Then a SECOND boa… beside the first… and a THIRD!": two more
 *         boas drop out of the ceiling beside it, lined up across
 *   11.15 "A wall of snakes, and the bats can hardly get by!": closer, the
 *         three as a curtain, bats swerving through, one snatched on "hardly"
 *   14.0  "Alone, they often went hungry.": a lone boa snaps at a bat and
 *         misses (on the chuckle); ✗ ✗ ✓; it droops on "hungry"
 *   16.71 "Together? Every hunt worked.": the three, each snapping a bat
 *   18.95 "Smart plan… or just the best spot?": their heads turn to the
 *         camera, a "?" over each, the call to action; "Either way," dissolves into frame 1
 */
export const LOOP_S = 22.5;

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** Word i's start and end in the video, seconds. */
export const startOf = (i: number): number => WORDS[i]!.start / TEMPO;
export const endOf = (i: number): number => WORDS[i]!.end / TEMPO;

/** How many words each caption line holds, in order (the first two are the hook, on screen together). */
export const LINE_WORDS: readonly number[] = [4, 5, 3, 4, 2, 4, 2, 4, 3, 2, 3, 4, 3, 4, 1, 4, 1, 3, 2, 5, 2];

const FIRST = LINE_WORDS.map((_, i) => LINE_WORDS.slice(0, i).reduce((s, n) => s + n, 0));

export const BATS_AT = startOf(3);
export const AIR_AT = startOf(8);
export const CEILING_AT = startOf(15);
export const DUSK_AT = startOf(17);
export const HUNDREDS_AT = startOf(19);
export const SECOND_AT = startOf(26);
export const THIRD_AT = startOf(35);
export const WALL_AT = startOf(37);
export const HARDLY_AT = startOf(44);
export const OFTEN_AT = startOf(49);
export const HUNGRY_AT = startOf(51);
export const EVERY_AT = startOf(53);
export const WORKED_AT = startOf(55);
export const SMART_AT = startOf(56);
export const PLAN_AT = startOf(57);
export const SPOT_AT = startOf(62);
export const LAST_END = endOf(WORDS.length - 1);

/** The cuts between shots, each just before the first word of its beat (the lone boa's after "by!", for the chuckle). */
export const CUT = {
  cave: startOf(9) - 0.12,
  wall: startOf(36) - 0.12,
  alone: endOf(46) + 0.1,
  together: startOf(52) - 0.12,
  question: startOf(56) - 0.12,
} as const;

/** The last shot dissolves into frame 1 over the last of the loop. */
export const DISSOLVE_AT = LOOP_S - 0.45;

export type Scene = 'hook' | 'cave' | 'wall' | 'alone' | 'together' | 'question';

export const sceneAt = (t: number): Scene => {
  const u = wrap(t);
  if (u < CUT.cave) return 'hook';
  if (u < CUT.wall) return 'cave';
  if (u < CUT.alone) return 'wall';
  if (u < CUT.together) return 'alone';
  if (u < CUT.question) return 'together';
  return 'question';
};

/** How much of the frame is frame 1: all of it in its own shot, and fading in over the last shot at the end. */
export const hookMix = (t: number): number => {
  const u = wrap(t);
  if (u < CUT.cave) return 1;
  return u < DISSOLVE_AT ? 0 : clamp01((u - DISSOLVE_AT) / (LOOP_S - DISSOLVE_AT - 0.03));
};

const pulse = (u: number, at: number, up: number, down: number): number =>
  u < at ? 0 : u < at + up ? Math.sin(((u - at) / up) * Math.PI * 0.5) : Math.max(0, 1 - (u - at - up) / down) ** 2;

// ---------------------------------------------------------------- frame 1

/** The hook's own clock: the loop's end runs into frame 1 (negative before the loop point). */
export const hookClock = (t: number): number => {
  const u = wrap(t);
  return u >= DISSOLVE_AT ? u - LOOP_S : u;
};

export interface HookPose {
  /** The kick on "BATS" and "air!": the bat jerks, the camera jolts. */
  readonly kick: number;
  readonly zoom: number;
  /** The bat's struggle (radians) and the boa's sway (px). */
  readonly wiggle: number;
  readonly sway: number;
}

export function hookPose(t: number): HookPose {
  const u = hookClock(t);
  const kick = Math.max(pulse(u, BATS_AT - 0.04, 0.1, 0.45), pulse(u, AIR_AT - 0.04, 0.1, 0.45), pulse(u, -0.1, 0.1, 0.45));
  const run = (u + 0.45) / (CUT.cave + 0.45);
  return { kick, zoom: 1 + 0.03 * run + 0.025 * kick, wiggle: 0.05 * Math.sin(u * 7.5) + 0.06 * kick, sway: 6 * Math.sin(u * 1.7) };
}

// ---------------------------------------------------------------- the passage

/** Where each boa hangs across the passage: the first in the middle, the second to its left, the third to its right. */
export const BOA_X: readonly number[] = [500, 165, 828];
/** Which way each one's head points: +1 right, −1 left. */
export const BOA_DIR: readonly number[] = [1, 1, 1];

/** A boa dropping out of the ceiling: 0 up in the rock .. 1 hanging, overshooting a little and settling. */
function dropFrom(u: number, at: number): number {
  const p = clamp01((u - at) / 0.42);
  if (p >= 1) return 1 + 0.05 * Math.exp(-(u - at - 0.42) * 5) * Math.sin((u - at - 0.42) * 14);
  return 1 - (1 - p) ** 3 + 0.08 * Math.sin(p * Math.PI);
}

/** How far each boa is down (0..1): the first all along, the others dropping in on "SECOND" and "THIRD". */
export function dropAt(t: number, i: number): number {
  const u = wrap(t);
  // Hanging in every shot but the passage's first beats (frame 1 doesn't show them).
  if (i === 0 || u >= CUT.wall || u < CUT.cave) return 1;
  return dropFrom(u, (i === 1 ? SECOND_AT : THIRD_AT) - 0.18);
}

/** The camera on the passage: pushing in through the first beat, jittery as the bats pour out, closer for the wall and the question. */
export function passageCam(t: number): { readonly zoom: number; readonly dx: number; readonly dy: number } {
  const u = wrap(t);
  const nervous = window01(u, HUNDREDS_AT - 0.3, CUT.wall, 0.3) * (1 - ramp(u, SECOND_AT - 0.2, SECOND_AT + 0.3) * 0.6);
  const jitter = { dx: nervous * 5 * Math.sin(u * 37), dy: nervous * 4 * Math.sin(u * 29 + 1) };
  const thud = Math.max(pulse(u, SECOND_AT + 0.2, 0.06, 0.3), pulse(u, THIRD_AT + 0.2, 0.06, 0.3));
  if (u >= CUT.question) return { zoom: 1 + 0.04 * ramp(u, CUT.question, PLAN_AT + 0.4), dx: 0, dy: 0 };
  if (u >= CUT.together) return { zoom: 1.02 + 0.03 * ramp(u, CUT.together, CUT.question), dx: 0, dy: 0 };
  if (u >= CUT.wall) return { zoom: 1.04 + 0.03 * ramp(u, CUT.wall, CUT.alone), dx: jitter.dx * 0.5, dy: jitter.dy * 0.5 };
  return { zoom: 1 + 0.04 * ramp(u, CUT.cave, HUNDREDS_AT), dx: jitter.dx, dy: jitter.dy + thud * 14 };
}

export interface Strike {
  /** How far the head has lunged forward (0..1), and the gape (0 shut .. 1 wide). */
  readonly lunge: number;
  readonly gape: number;
  /** A bat in its jaws. */
  readonly caught: boolean;
}

/** A snap at `at`: the jaws open as the head goes, shut on `at`, and the head comes back. */
function strikeAt(u: number, at: number): Omit<Strike, 'caught'> {
  const lunge = ramp(u, at - 0.22, at) * (1 - ramp(u, at + 0.08, at + 0.45));
  const gape = ramp(u, at - 0.22, at - 0.1) * (1 - ramp(u, at - 0.05, at));
  return { lunge, gape };
}

export const SNATCH_AT = HARDLY_AT + 0.05;
/** The three snaps of "Every hunt worked.": left, middle, right. */
export const TOGETHER_SNAPS: readonly number[] = [EVERY_AT - 0.02, EVERY_AT + 0.14, EVERY_AT + 0.3];

export function strikeOf(t: number, i: number): Strike {
  const u = wrap(t);
  const none = { lunge: 0, gape: 0, caught: false };
  if (u >= CUT.wall && u < CUT.alone && i === 0) return { ...strikeAt(u, SNATCH_AT), caught: u >= SNATCH_AT };
  if (u >= CUT.together && u < CUT.question) {
    const at = TOGETHER_SNAPS[i === 1 ? 0 : i === 0 ? 1 : 2]!;
    return { ...strikeAt(u, at), caught: u >= at };
  }
  return none;
}

/** The heads turning to the camera on "Smart plan…" (0 side-on .. 1 facing us), one after another. */
export const turnAt = (t: number, i: number): number => {
  const u = wrap(t);
  if (u < CUT.question) return 0;
  const at = SMART_AT - 0.1 + [0.1, 0, 0.2][i]!;
  return ramp(u, at, at + 0.28);
};
export const askAt = (t: number): number => window01(wrap(t), PLAN_AT - 0.05, DISSOLVE_AT + 0.2, 0.15);
export const askPop = (t: number): number => pulse(wrap(t), PLAN_AT - 0.05, 0.14, 0.4);

/** The tongue (0 in .. 1 out) of the boa waiting in the passage. */
export function tongueAt(t: number): number {
  const u = wrap(t);
  for (const s of [CUT.cave + 0.35, CEILING_AT + 0.1, DUSK_AT + 0.2, CUT.together + 0.1]) if (u >= s && u < s + 0.24) return Math.sin(((u - s) / 0.24) * Math.PI);
  return 0;
}

// ---------------------------------------------------------------- the lone boa

export const ALONE_SNAP = CUT.alone + 0.42;
export const aloneStrike = (t: number): Omit<Strike, 'caught'> => strikeAt(wrap(t), ALONE_SNAP);
/** The bat it misses: 0 coming in .. 0.5 just past the snap .. 1 gone. */
export const missBat = (t: number): number => clamp01((wrap(t) - ALONE_SNAP + 0.42) / 0.9);
export const missMark = (t: number): number => window01(wrap(t), ALONE_SNAP, ALONE_SNAP + 0.55, 0.08);
/** The tally of solo hunts, ✗ ✗ ✓, ticked in on "often". */
export const tallyAt = (t: number, k: number): number => window01(wrap(t), OFTEN_AT - 0.08 + k * 0.13, CUT.together, 0.1);
/** The boa's head drooping on "hungry". */
export const droopAt = (t: number): number => ramp(wrap(t), HUNGRY_AT - 0.1, HUNGRY_AT + 0.3);

// ---------------------------------------------------------------- the bats

/** Bats stream out of the passage from just before "hundreds" through the wall (the three catches then stand out on their own). */
export const STREAM_FROM = HUNDREDS_AT - 0.35;
export const STREAM_TO = CUT.alone;
export const BAT_EVERY = 0.045;
export const BAT_LIFE = 1.35;

export interface FlyingBat {
  readonly k: number;
  /** How far along: 0 by the camera .. 1 out at the mouth. */
  readonly s: number;
  readonly entry: number;
  readonly aim: number;
}

const hash = (k: number, n: number): number => {
  const v = Math.sin(k * 127.1 + n * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/** The bats in the air at t: each enters near the camera and flies away down the passage to the mouth. */
export function streamAt(t: number): FlyingBat[] {
  const u = wrap(t);
  if (u < STREAM_FROM || u >= STREAM_TO + BAT_LIFE || sceneAt(u) === 'alone' || sceneAt(u) === 'hook') return [];
  const out: FlyingBat[] = [];
  const k0 = Math.max(0, Math.ceil((u - BAT_LIFE - STREAM_FROM) / BAT_EVERY));
  const k1 = Math.floor((Math.min(u, STREAM_TO) - STREAM_FROM) / BAT_EVERY);
  for (let k = k0; k <= k1; k++) {
    const p = (u - STREAM_FROM - k * BAT_EVERY) / BAT_LIFE;
    if (p < 0 || p >= 1) continue;
    out.push({ k, s: 1 - (1 - p) ** 2, entry: hash(k, 1), aim: hash(k, 2) });
  }
  return out;
}

/** How much the bats swerve round the boas: from the wall on. */
export const swerveAt = (t: number): number => (wrap(t) >= CUT.wall ? 1 : 0);

// ---------------------------------------------------------------- the words

export interface Line {
  readonly words: readonly Word[];
  readonly from: number;
  readonly to: number;
}

/** When the hook's words come up over the last of the dissolve, ready for frame 1. */
const HOOK_FROM = LOOP_S - 0.24;

export const LINES: readonly Line[] = LINE_WORDS.map((n, i) => {
  const first = FIRST[i]!;
  return {
    words: WORDS.slice(first, first + n),
    from: i === 0 ? 0 : startOf(first),
    to: i + 1 < LINE_WORDS.length ? startOf(FIRST[i + 1]!) : HOOK_FROM,
  };
});

/** The two hook lines stand together from frame 1, in full, so it works with the sound off. */
export const HOOK_LINES = 2;
export const HOOK_TO = LINES[HOOK_LINES]!.from;

export const hookAlpha = (t: number): number => {
  const u = wrap(t);
  return u < HOOK_TO ? 1 : ramp(u, HOOK_FROM, LOOP_S - 0.04);
};

export const TEXT = {
  hook: { y: 400, gap: 124, size: 132 },
  line: { y: 452, size: 128 },
} as const;

export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const u = wrap(t);
  const line = LINES.slice(HOOK_LINES).find((l) => u >= l.from && u < l.to);
  if (!line) return null;
  return { line, word: line.words.reduce((now, w, i) => (u >= w.start / TEMPO ? i : now), -1) };
}

export function hookWord(t: number): number {
  const u = wrap(t);
  return u < HOOK_TO ? WORDS.slice(0, FIRST[HOOK_LINES]!).reduce((now, w, i) => (u >= startOf(i) ? i : now), -1) : -1;
}

// ---------------------------------------------------------------- the call to action

export const CTA_AT = PLAN_AT + 0.05;
export const CTA_END = LOOP_S - 0.6;

/** The credit for this short: it comes in with the call to action, never before. */
export const CREDIT = { text: 'InkSnake · 16bit.ink/snake', from: CTA_AT } as const;

export const ctaAt = (t: number): number => window01(wrap(t), CTA_AT, CTA_END, 0.2);
export const arrowDraw = (t: number): number => clamp01((wrap(t) - CTA_AT - 0.15) / 0.45);

export const CTA = {
  big: { text: '16bit.ink/snake', y: 720, size: 132 },
  free: { text: '10 levels free', y: 830, size: 100 },
  small: { text: 'tap the channel name', y: 925, size: 84 },
  arrow: { from: { x: 236, y: 965 }, c0: { x: 268, y: 1180 }, c1: { x: 225, y: 1360 }, tip: { x: 160, y: 1470 } },
} as const;

// ---------------------------------------------------------------- the sound

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch = 1, gain = 0.5, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/** The bats' wingbeats and squeaks through the stream, quiet and scattered. */
const FLUTTER: readonly SoundCue[] = Array.from({ length: 34 }, (_, i) => {
  const at = STREAM_FROM + 0.1 + i * 0.27;
  return i % 4 === 3 ? cue('squeak', at, 1.6 + hash(i, 5) * 0.5, 0.16, hash(i, 6) - 0.5) : cue('flap', at, 1.2 + hash(i, 7) * 0.4, 0.2, hash(i, 8) - 0.5);
}).filter((c) => c.t < STREAM_TO && (c.t < CUT.alone || c.t >= CUT.together));

/** Quiet under the voice, one mood per beat. */
export const SOUNDS: readonly SoundCue[] = [
  cue('flap', 0.1, 1.3, 0.3, 0.2),
  cue('squeak', BATS_AT, 1.7, 0.25, 0.2),
  cue('flap', AIR_AT - 0.05, 1.2, 0.3, 0.2),
  cue('appear', CUT.cave + 0.05, 0.5, 0.3),
  cue('tick', DUSK_AT, 0.7, 0.2),
  ...FLUTTER,
  cue('bump', SECOND_AT + 0.2, 0.5, 0.5, -0.4),
  cue('bump', THIRD_AT + 0.2, 0.6, 0.55, 0.4),
  cue('grown', CUT.wall + 0.05, 0.6, 0.3),
  cue('strike', SNATCH_AT - 0.04, 1, 0.4),
  cue('squeak', SNATCH_AT + 0.02, 1.9, 0.25),
  cue('flap', CUT.alone + 0.15, 1.1, 0.3, -0.3),
  cue('strike', ALONE_SNAP - 0.04, 0.9, 0.4),
  cue('miss', ALONE_SNAP + 0.04, 1, 0.35, 0.3),
  cue('click', OFTEN_AT - 0.06, 0.8, 0.3),
  cue('click', OFTEN_AT + 0.07, 0.8, 0.3),
  cue('click', OFTEN_AT + 0.2, 1.2, 0.3),
  cue('lose', HUNGRY_AT, 0.8, 0.25),
  ...TOGETHER_SNAPS.map((at, i) => cue('strike', at - 0.04, 1 + i * 0.1, 0.4, (i - 1) * 0.5)),
  cue('win', WORKED_AT - 0.05, 1, 0.3),
  cue('tick', SMART_AT, 1.2, 0.25),
  cue('appear', PLAN_AT, 1.1, 0.25),
  cue('click', SPOT_AT - 0.05, 1, 0.3),
  cue('strike', LOOP_S - 0.12, 0.9, 0.35),
];

/** Every value the picture is drawn from at t, by name. */
export function stateAt(t: number): Readonly<Record<string, number>> {
  const h = hookPose(t);
  const cam = passageCam(t);
  const s = [0, 1, 2].map((i) => strikeOf(t, i));
  const a = aloneStrike(t);
  const scene = sceneAt(t);
  // How much of each shot shows: the passage's values count only while it does (frame 1 covers it at the loop point).
  const passage = scene === 'hook' || scene === 'alone' ? 0 : 1 - hookMix(t);
  const alone = scene === 'alone' ? 1 : 0;
  const p = (v: number): number => v * passage;
  return {
    hookMix: hookMix(t), hookClock: hookClock(t), kick: h.kick, zoom: h.zoom, wiggle: h.wiggle, sway: h.sway, hook: hookAlpha(t),
    drop1: p(dropAt(t, 1)), drop2: p(dropAt(t, 2)), camZoom: 1 + p(cam.zoom - 1), camDx: p(cam.dx), camDy: p(cam.dy),
    lunge0: p(s[0]!.lunge), lunge1: p(s[1]!.lunge), lunge2: p(s[2]!.lunge), caught0: p(+s[0]!.caught), caught1: p(+s[1]!.caught), caught2: p(+s[2]!.caught),
    turn0: p(turnAt(t, 0)), turn1: p(turnAt(t, 1)), turn2: p(turnAt(t, 2)), ask: p(askAt(t)), tongue: p(tongueAt(t)),
    aloneLunge: alone * a.lunge, miss: alone * missBat(t), tally: alone * tallyAt(t, 2), droop: alone * droopAt(t),
    bats: p(streamAt(t).length), cta: ctaAt(t),
  };
}
