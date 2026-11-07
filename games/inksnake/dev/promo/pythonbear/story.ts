import type { SfxId } from '../../../src/audio/recipes';
import { clamp01, ramp, window01 } from '../short';
import { endOf, LINE_WORDS, startOf, TEMPO, WORDS, type Word } from './words';

/**
 * "This python swallowed a whole BEAR!": narrated, a pure function of time,
 * every beat timed from the words. Borneo (East Kalimantan), July 1999: a
 * radio-collared sun bear (23 kg / 51 lb) was traced to the stomach of a
 * reticulated python 6.95 m (23 ft) long. Nobody saw the swallow; the team
 * kept the python hoping it would pass the collar, it didn't, so the collar
 * was taken out surgically and the snake set free.
 *
 *   0     frame 1: the python's jaws stretched round the bear's rump (hook)
 *   2.4   "Scientists were following a sun bear's radio collar…": the
 *         researcher with his antenna, the bear with its collar (curious)
 *   5.2   "then the signal came from INSIDE a 23-foot snake!": the signal
 *         leads to a python with a bear-shaped bulge; INSIDE punches in
 *         (surprised); 7 m / 23 ft
 *   8.9   "They waited for the collar to come out. It didn't.": the calendar
 *         flies, the bulge goes down, the signal still comes (sarcastic)
 *   11.6  "So they OPERATED…": the vet's table, the lamp, the collar held
 *         up (dramatic)
 *   13.0  "and set the snake FREE. Still… you have to admit,": the python
 *         slides off into the forest, bandaged, and looks back (warm, then
 *         mischievous); the call to action
 *   15.9  the jaws open out of the forest into frame 1
 */
export const LOOP_S = 16.5;

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** Index of the first word of each line. */
const FIRST = LINE_WORDS.map((_, i) => LINE_WORDS.slice(0, i).reduce((s, n) => s + n, 0));

export const BEAR_AT = startOf(5);
export const SCIENTISTS_AT = startOf(6);
export const SUN_AT = startOf(10);
export const RADIO_AT = startOf(12);
export const COLLAR_END = endOf(13);
export const THEN_AT = startOf(14);
export const SIGNAL_AT = startOf(16);
export const INSIDE_AT = startOf(19);
export const FOOT_AT = startOf(21);
export const SNAKE_END = endOf(22);
export const THEY_AT = startOf(23);
export const OUT_END = endOf(30);
export const IT_AT = startOf(31);
export const DIDNT_END = endOf(32);
export const SO_AT = startOf(33);
export const OPERATED_AT = startOf(35);
export const AND_AT = startOf(36);
export const FREE_AT = startOf(40);
export const STILL_AT = startOf(41);
export const ADMIT_AT = startOf(45);
export const LAST_END = endOf(45);

/** The cuts between shots, each just before the first word of its beat. */
export const CUT = {
  jungle: SCIENTISTS_AT - 0.12,
  signal: THEN_AT - 0.1,
  wait: THEY_AT - 0.2,
  vet: SO_AT - 0.12,
  free: AND_AT - 0.15,
} as const;

/** The jaws open out of the forest into frame 1 over the last of the loop. */
export const IRIS_AT = LOOP_S - 0.62;

export type Scene = 'hook' | 'jungle' | 'signal' | 'wait' | 'vet' | 'free';

export const sceneAt = (t: number): Scene => {
  const u = wrap(t);
  if (u < CUT.jungle) return 'hook';
  if (u < CUT.signal) return 'jungle';
  if (u < CUT.wait) return 'signal';
  if (u < CUT.vet) return 'wait';
  if (u < CUT.free) return 'vet';
  return 'free';
};

/** How much of the frame the hook covers: all of it in its own shot, and a widening circle over the forest at the end. */
export const irisAt = (t: number): number => {
  const u = wrap(t);
  if (u < CUT.jungle) return 1;
  return u < IRIS_AT ? 0 : clamp01((u - IRIS_AT) / (LOOP_S - IRIS_AT - 0.05));
};

// ---------------------------------------------------------------- the hook

/** The hook's own clock: the loop's end runs into frame 1 (negative before the loop point). */
export const hookClock = (t: number): number => {
  const u = wrap(t);
  return u >= IRIS_AT ? u - LOOP_S : u;
};

const pulse = (u: number, at: number, up: number, down: number): number =>
  u < at ? 0 : u < at + up ? Math.sin(((u - at) / up) * Math.PI * 0.5) : Math.max(0, 1 - (u - at - up) / down) ** 2;

export interface HookPose {
  /** How far the bear has slid in, screen px. */
  readonly slide: number;
  /** The legs' swing (radians), near and far. */
  readonly near: number;
  readonly far: number;
  /** The gulp on "BEAR!": the neck swells and the camera kicks. */
  readonly gulp: number;
  readonly zoom: number;
  /** The head's nod as the jaws walk on (radians). */
  readonly nod: number;
}

export function hookPose(t: number): HookPose {
  const u = hookClock(t);
  const gulp = pulse(u, BEAR_AT - 0.04, 0.12, 0.5);
  return {
    slide: 16 * (u + 0.62) + 14 * ramp(u, BEAR_AT - 0.05, BEAR_AT + 0.25),
    near: 0.07 * Math.sin(u * 3.1 + 0.4),
    far: 0.06 * Math.sin(u * 2.7 + 1.9),
    gulp,
    zoom: 1 + 0.025 * (u + 0.62) / 3 + 0.045 * gulp,
    nod: 0.02 * Math.sin(u * 4.2),
  };
}

// ---------------------------------------------------------------- the jungle: researcher and bear

/** The bear's label (sun bear, 23 kg / 51 lb) pops on "sun bear's"; the collar is ringed on "radio collar". */
export const bearLabel = (t: number): number => window01(wrap(t), SUN_AT - 0.05, CUT.signal, 0.2);
export const collarRing = (t: number): number => window01(wrap(t), RADIO_AT - 0.05, CUT.signal, 0.18);
/** Radio waves from the collar to the antenna (a phase that runs 0..1 per wave). */
export const wavePhase = (t: number): number => (wrap(t) * 1.6) % 1;
export const jungleZoom = (t: number): number => 1 + 0.06 * ramp(wrap(t), CUT.jungle, CUT.signal) + 0.05 * ramp(wrap(t), RADIO_AT, COLLAR_END);

// ---------------------------------------------------------------- the signal: INSIDE a snake

/** The camera pans from the researcher to the snake over "then the signal came from". */
export const signalPan = (t: number): number => ramp(wrap(t), CUT.signal, INSIDE_AT - 0.05);
/** The punch-in on "INSIDE". */
export const insideKick = (t: number): number => pulse(wrap(t), INSIDE_AT - 0.03, 0.08, 0.6);
export const insideShown = (t: number): number => (wrap(t) >= INSIDE_AT - 0.03 && sceneAt(t) === 'signal' ? 1 : 0);
/** The length bar along the snake, 7 m / 23 ft, from "23-foot". */
export const lengthBar = (t: number): number => window01(wrap(t), FOOT_AT - 0.08, CUT.wait, 0.18);

// ---------------------------------------------------------------- waiting

/** The calendar's pages flying from "waited" to "out" (the whole part is pages gone, the rest the one flying); then still on "It didn't.". */
export const CALENDAR_PAGES = 14;
export const calendarAt = (t: number): number => {
  const u = wrap(t);
  const from = startOf(24);
  return u < from ? 0 : u >= OUT_END ? CALENDAR_PAGES : (CALENDAR_PAGES * (u - from)) / (OUT_END - from);
};
/** The bulge going down as the days go by (1 a bear, 0 just the collar left). */
export const bulgeAt = (t: number): number => {
  const u = wrap(t);
  if (sceneAt(t) !== 'wait') return 1;
  return 1 - ramp(u, startOf(24), OUT_END + 0.1);
};
/** The signal still coming, on "It didn't." */
export const stillSignal = (t: number): number => window01(wrap(t), IT_AT - 0.05, CUT.vet, 0.15);

// ---------------------------------------------------------------- the vet's table

/** The collar lifted up into the lamp's light on "OPERATED". */
export const collarLift = (t: number): number => ramp(wrap(t), OPERATED_AT - 0.05, OPERATED_AT + 0.45);
export const lampOn = (t: number): number => ramp(wrap(t), CUT.vet, CUT.vet + 0.12);

// ---------------------------------------------------------------- free

/** How far the python has slid into the forest, screen px. */
export const freeSlide = (t: number): number => {
  const u = wrap(t);
  return 230 * ramp(u, CUT.free, STILL_AT) + 70 * clamp01((u - CUT.free) / 3);
};
/** The head turning back to look at us, from "Still…". */
export const lookBack = (t: number): number => ramp(wrap(t), STILL_AT - 0.05, STILL_AT + 0.35);
/** The tongue, 0 in .. 1 out. */
export function tongueAt(t: number): number {
  const u = wrap(t);
  for (const s of [CUT.free + 0.5, FREE_AT + 0.05, ADMIT_AT - 0.05, ADMIT_AT + 0.22]) if (u >= s && u < s + 0.22) return Math.sin(((u - s) / 0.22) * Math.PI);
  return 0;
}

// ---------------------------------------------------------------- the words

export interface Line {
  readonly words: readonly Word[];
  readonly from: number;
  readonly to: number;
}

/** When the hook's words come up over the last of the iris, ready for frame 1. */
const HOOK_FROM = LOOP_S - 0.24;

/** The voiceover cut into short lines, each on screen from its first word until the next takes over. */
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
  hook: { y: 392, gap: 128, size: 136 },
  line: { y: 452, size: 128 },
} as const;

/** The line on screen after the hook, and the word being said in it (−1 none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const u = wrap(t);
  const line = LINES.slice(HOOK_LINES).find((l) => u >= l.from && u < l.to);
  if (!line) return null;
  return { line, word: line.words.reduce((now, w, i) => (u >= w.start / TEMPO ? i : now), -1) };
}

/** The word being said in the hook lines, counted through both (−1 none). */
export function hookWord(t: number): number {
  const u = wrap(t);
  return u < HOOK_TO ? WORDS.slice(0, FIRST[HOOK_LINES]!).reduce((now, w, i) => (u >= startOf(i) ? i : now), -1) : -1;
}

// ---------------------------------------------------------------- the call to action

export const CTA_AT = FREE_AT - 0.1;
export const CTA_END = LOOP_S - 0.6;

/** The credit for this short: it comes in with the call to action, never before. */
export const CREDIT = { text: 'InkSnake · 16bit.ink/snake', from: CTA_AT } as const;

export const ctaAt = (t: number): number => window01(wrap(t), CTA_AT, CTA_END, 0.2);
export const arrowDraw = (t: number): number => clamp01((wrap(t) - CTA_AT - 0.15) / 0.45);

export const CTA = {
  big: { text: '10 levels free', y: 1095, size: 158 },
  small: { text: 'tap the channel name', y: 1195, size: 88 },
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

/** Quiet under the voice, one mood per beat: the gulp, the forest, the punch of INSIDE, the calendar, the lamp, the slither off. */
export const SOUNDS: readonly SoundCue[] = [
  cue('swallow', 0.05, 0.62, 0.5),
  cue('gulp', BEAR_AT - 0.02, 0.5, 0.75),
  cue('squeeze', BEAR_AT + 0.12, 0.6, 0.35),
  cue('steps', SCIENTISTS_AT, 0.9, 0.35, -0.3),
  cue('steps', SCIENTISTS_AT + 0.42, 0.85, 0.3, -0.3),
  cue('appear', SUN_AT, 0.9, 0.35, 0.3),
  cue('tick', RADIO_AT + 0.1, 1.6, 0.25, 0.2),
  cue('tick', RADIO_AT + 0.5, 1.6, 0.2, 0.2),
  cue('steps', SIGNAL_AT, 0.8, 0.3, -0.2),
  cue('strike', INSIDE_AT - 0.03, 0.7, 0.55),
  cue('bump', INSIDE_AT, 0.5, 0.6),
  cue('grown', FOOT_AT, 0.8, 0.35),
  ...Array.from({ length: 6 }, (_, i) => cue('card', startOf(24) + i * 0.17, 1 + 0.05 * i, 0.4, 0.25)),
  cue('tick', IT_AT, 1, 0.35),
  cue('miss', startOf(32), 0.7, 0.4),
  cue('click', CUT.vet + 0.02, 0.7, 0.9),
  cue('bump', OPERATED_AT - 0.02, 0.35, 0.6),
  cue('appear', OPERATED_AT + 0.2, 0.8, 0.4),
  cue('steps', AND_AT, 0.6, 0.35, 0.2),
  cue('win', FREE_AT - 0.04, 1, 0.3),
  cue('steps', FREE_AT + 0.4, 0.55, 0.3, 0.4),
  cue('squeak', STILL_AT + 0.2, 1.3, 0.25),
  cue('swallow', IRIS_AT + 0.1, 0.62, 0.35),
];

/** Every value the picture is drawn from at t, by name (each shot's values only while that shot shows). */
export function stateAt(t: number): Readonly<Record<string, number>> {
  const h = hookPose(t);
  const forest = sceneAt(t) === 'free' ? 1 - irisAt(t) : 0;
  return {
    iris: irisAt(t), hookClock: hookClock(t), slide: h.slide, near: h.near, far: h.far, gulp: h.gulp, zoom: h.zoom, nod: h.nod,
    hook: hookAlpha(t), cta: ctaAt(t), label: bearLabel(t), collar: collarRing(t), bar: lengthBar(t), bulge: bulgeAt(t),
    lift: sceneAt(t) === 'vet' ? collarLift(t) : 0, look: forest * lookBack(t), tongue: forest * tongueAt(t), slither: forest * freeSlide(t),
  };
}
