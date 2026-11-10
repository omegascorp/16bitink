import type { SfxId } from '../../../src/audio/recipes';
import { clamp01, ramp, window01 } from '../short';
import { endOf, startOf, TEMPO, WORDS, type Word } from './words';

/**
 * "This snake EATS other snakes!": narrated, a pure function of time, every
 * beat timed from the words. Sankar et al. 2021 (Nature in Singapore 14):
 * Sungei Buloh Wetland Reserve, Singapore, 22 June 2021. A king cobra about
 * 2.5 m (8.2 ft) bit a reticulated python about 1.5 m (4.9 ft) in the water;
 * the python crawled out, the cobra left; about two hours later the python
 * lay still. At 17:00 a water monitor of about 1.5 m came; the cobra swam
 * out and faced it, and it left. The cobra swallowed the python head first
 * from 17:45 to 18:25. Mangrove and mudflat (never "jungle"), never a fight
 * or a chase, never "alive".
 *
 *   0     frame 1: the cobra's jaws stretched round the python's body, mid-
 *         swallow, at dusk on the mudflat (hook)
 *   2.05  "A king cobra bit a python… then just WAITED.": the channel's edge
 *         by day, the two side by side with their lengths; the bite on
 *         "bit", the python crawls out onto the mud, the cobra draws off
 *   5.65  "Two hours later, the python stopped moving.": the clock runs two
 *         hours round, the light goes late, the python's wriggle dies away
 *   8.45  "Then a monitor lizard showed up!": a water monitor walks in
 *   10.14 "The cobra faced it down, and the lizard backed OFF.": close, the
 *         cobra rears, its narrow hood out; on "backed" the monitor backs off
 *   13.0  "Then it swallowed the whole python, head first, in about
 *         forty-five minutes!": the swallow at dusk; the python's head shown
 *         inside on "head first", a 45 min clock, 17:45 → 18:25
 *   17.55 "Its scientific name literally means snake eater, because": the
 *         cobra lies full on the mud, Ophiophagus = snake eater; the call to
 *         action
 *   20.38 the jaws open out of the mud into frame 1
 */
export const LOOP_S = 21;

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** How many words each caption line holds, in order (the first two are the hook, on screen together). */
export const LINE_WORDS: readonly number[] = [3, 2, 3, 3, 3, 3, 2, 2, 3, 3, 2, 3, 3, 2, 3, 3, 2, 2, 2, 3, 2, 3];

/** Index of the first word of each line. */
const FIRST = LINE_WORDS.map((_, i) => LINE_WORDS.slice(0, i).reduce((s, n) => s + n, 0));

export const EATS_AT = startOf(2);
export const KING_AT = startOf(6);
export const BIT_AT = startOf(8);
export const PYTHON_AT = startOf(10);
export const THEN_AT = startOf(11);
export const WAITED_AT = startOf(13);
export const TWO_AT = startOf(14);
export const LATER_END = endOf(16);
export const STOPPED_AT = startOf(19);
export const MOVING_END = endOf(20);
export const MONITOR_AT = startOf(21);
export const LIZARD_AT = startOf(24);
export const UP_END = endOf(26);
export const FACED_AT = startOf(29);
export const BACKED_AT = startOf(35);
export const SWALLOWED_AT = startOf(39);
export const HEAD_AT = startOf(43);
export const FIRST_END = endOf(44);
export const FORTY_AT = startOf(47);
export const MINUTES_END = endOf(48);
export const ITS_AT = startOf(49);
export const SNAKE_EATER_AT = startOf(54);
export const LAST_END = endOf(56);

/** The cuts between shots, each just before the first word of its beat. */
export const CUT = {
  flat: startOf(5) - 0.12,
  face: startOf(27) - 0.12,
  swallow: startOf(37) - 0.12,
  rest: ITS_AT - 0.12,
} as const;

/** The jaws open out of the mud into frame 1 over the last of the loop. */
export const IRIS_AT = LOOP_S - 0.62;

export type Scene = 'hook' | 'flat' | 'face' | 'swallow' | 'rest';

export const sceneAt = (t: number): Scene => {
  const u = wrap(t);
  if (u < CUT.flat) return 'hook';
  if (u < CUT.face) return 'flat';
  if (u < CUT.swallow) return 'face';
  if (u < CUT.rest) return 'swallow';
  return 'rest';
};

/** How much of the frame the hook covers: all of it in its own shot, and a widening circle over the last shot at the end. */
export const irisAt = (t: number): number => {
  const u = wrap(t);
  if (u < CUT.flat) return 1;
  return u < IRIS_AT ? 0 : clamp01((u - IRIS_AT) / (LOOP_S - IRIS_AT - 0.05));
};

const pulse = (u: number, at: number, up: number, down: number): number =>
  u < at ? 0 : u < at + up ? Math.sin(((u - at) / up) * Math.PI * 0.5) : Math.max(0, 1 - (u - at - up) / down) ** 2;

// ---------------------------------------------------------------- the swallow (frame 1 and the swallow shot)

/** The hook's own clock: the loop's end runs into frame 1 (negative before the loop point). */
export const hookClock = (t: number): number => {
  const u = wrap(t);
  return u >= IRIS_AT ? u - LOOP_S : u;
};

export interface SwallowPose {
  /** How much of the python is inside, 0 (its head at the lips) .. 1. */
  readonly depth: number;
  /** The gulp: the neck swells and the camera kicks. */
  readonly gulp: number;
  readonly zoom: number;
  /** The head's nod as the jaws walk on (radians). */
  readonly nod: number;
  /** The light: 0 late afternoon .. 1 dusk. */
  readonly dusk: number;
}

/** Frame 1's depth, and how fast the jaws walk on over the hook. */
export const HOOK_DEPTH = 0.52;
const HOOK_RATE = 0.012;

/** The swallow shot's depth: from the head just in, on to nearly done by "minutes!". */
const swallowDepth = (u: number): number => 0.06 + 0.58 * ramp(u, CUT.swallow, MINUTES_END + 0.3) + 0.03 * pulse(u, SWALLOWED_AT, 0.15, 0.4);

export function swallowPose(t: number): SwallowPose {
  const scene = sceneAt(t);
  const u = scene === 'swallow' ? wrap(t) : hookClock(t);
  if (scene === 'swallow') {
    const gulp = Math.max(pulse(u, SWALLOWED_AT - 0.04, 0.12, 0.5), pulse(u, FORTY_AT - 0.04, 0.12, 0.5));
    return { depth: swallowDepth(u), gulp, zoom: 0.94 + 0.03 * ramp(u, CUT.swallow, CUT.rest) + 0.04 * gulp, nod: 0.025 * Math.sin(u * 3.6), dusk: 0.6 + 0.4 * ramp(u, CUT.swallow, MINUTES_END) };
  }
  const gulp = pulse(u, EATS_AT - 0.04, 0.12, 0.5);
  return { depth: HOOK_DEPTH + HOOK_RATE * (u + 0.62), gulp, zoom: 1 + 0.02 * ((u + 0.62) / 2.7) + 0.04 * gulp, nod: 0.02 * Math.sin(u * 4.2), dusk: 1 };
}

/** The python's head shown inside the cobra on "head first". */
export const headInside = (t: number): number => (sceneAt(t) === 'swallow' ? window01(wrap(t), HEAD_AT - 0.08, FORTY_AT - 0.1, 0.18) : 0);
/** The 45-minute clock, its hand going round from "in about" to "minutes!" (0..1 of 45 minutes). */
export const clock45 = (t: number): { readonly show: number; readonly hand: number } => {
  const u = wrap(t);
  return { show: sceneAt(t) === 'swallow' ? window01(u, startOf(45) - 0.1, CUT.rest, 0.18) : 0, hand: ramp(u, startOf(45), MINUTES_END) };
};

// ---------------------------------------------------------------- the channel's edge: bite, wait, monitor

/** Where the strike reaches: 0 drawn back, 1 on the python (the bite on "bit"), back off after. */
export const strikeAt = (t: number): number => {
  const u = wrap(t);
  return pulse(u, BIT_AT - 0.12, 0.12, 0.7);
};
/** The python crawling out onto the mud after the bite (0 in the water .. 1 lying on the flat). */
export const crawlOut = (t: number): number => ramp(wrap(t), PYTHON_AT, WAITED_AT + 0.2);
/** The cobra drawing off after the bite (0 by the python .. 1 off to the left, waiting). */
export const drawOff = (t: number): number => ramp(wrap(t), BIT_AT + 0.4, WAITED_AT);
/** How much the python still moves: wriggling after the bite, dying away to still on "stopped moving". */
export const stir = (t: number): number => {
  const u = wrap(t);
  return u < BIT_AT ? 0.3 : 1 - ramp(u, TWO_AT, MOVING_END);
};
/** The two-hour clock: shown from "Two hours" to the monitor, its hand going twice round. */
export const clock2h = (t: number): { readonly show: number; readonly hand: number } => {
  const u = wrap(t);
  return { show: window01(u, TWO_AT - 0.1, MONITOR_AT - 0.1, 0.18), hand: 2 * ramp(u, TWO_AT, LATER_END + 0.3) };
};
/** The light over the channel: day until the clock runs, late after. */
export const lateAt = (t: number): number => ramp(wrap(t), TWO_AT, LATER_END + 0.4);
/** The monitor walking in from the right, 0 off screen .. 1 stopped by the python. */
export const monitorIn = (t: number): number => ramp(wrap(t), MONITOR_AT - 0.2, UP_END + 0.05);
/** The lengths, popping in as each is named. */
export const cobraLabel = (t: number): number => window01(wrap(t), KING_AT - 0.05, TWO_AT - 0.1, 0.18);
export const pythonLabel = (t: number): number => window01(wrap(t), PYTHON_AT - 0.05, TWO_AT - 0.1, 0.18);
export const monitorLabel = (t: number): number => window01(wrap(t), LIZARD_AT - 0.05, CUT.face, 0.18);
/** "Singapore, 2021", small, while the story is set. */
export const placeLabel = (t: number): number => window01(wrap(t), CUT.flat + 0.1, TWO_AT - 0.1, 0.25);

// ---------------------------------------------------------------- the face-off

/** The cobra rearing (0 low .. 1 up, hood out) from "The cobra". */
export const rear = (t: number): number => ramp(wrap(t), CUT.face, FACED_AT + 0.1);
/** The monitor backing off from "backed": 0 standing .. 1 gone back out to the right. */
export const backOff = (t: number): number => ramp(wrap(t), BACKED_AT - 0.1, CUT.swallow + 0.2);

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

// ---------------------------------------------------------------- the last shot and the call to action

/** "Ophiophagus", then "= snake eater" on "snake eater". */
export const latinName = (t: number): number => window01(wrap(t), ITS_AT + 0.3, LOOP_S - 0.6, 0.2);
export const snakeEater = (t: number): number => window01(wrap(t), SNAKE_EATER_AT - 0.05, LOOP_S - 0.6, 0.2);

export const CTA_AT = ITS_AT - 0.1;
export const CTA_END = LOOP_S - 0.6;

/** The credit for this short: it comes in with the call to action, never before. */
export const CREDIT = { text: 'InkSnake · 16bit.ink/snake', from: CTA_AT } as const;

export const ctaAt = (t: number): number => window01(wrap(t), CTA_AT, CTA_END, 0.2);
export const arrowDraw = (t: number): number => clamp01((wrap(t) - CTA_AT - 0.15) / 0.45);

export const CTA = {
  big: { text: '10 levels free', y: 1095, size: 158 },
  small: { text: 'tap the channel name', y: 1195, size: 88 },
} as const;

/** The tongue flicking in the last shot, 0 in .. 1 out. */
export function tongueAt(t: number): number {
  const u = wrap(t);
  for (const s of [CUT.rest + 0.35, SNAKE_EATER_AT + 0.1, LAST_END - 0.35]) if (u >= s && u < s + 0.24) return Math.sin(((u - s) / 0.24) * Math.PI);
  return 0;
}

// ---------------------------------------------------------------- the sound

/** The voice's gain envelope (audio.ts): the take dips on its second and third sentences. */
export const VOICE_LIFT: readonly { readonly from: number; readonly to: number; readonly db: number }[] = [
  { from: startOf(5), to: endOf(13), db: 4 },
  { from: startOf(14), to: endOf(20), db: 2.5 },
];

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch = 1, gain = 0.5, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/** Quiet under the voice, one mood per beat: the gulp, the strike, the clock, the monitor's steps, the hiss, the swallow. */
export const SOUNDS: readonly SoundCue[] = [
  cue('swallow', 0.05, 0.6, 0.45),
  cue('gulp', EATS_AT - 0.02, 0.55, 0.65),
  cue('plop', CUT.flat + 0.05, 0.7, 0.3, -0.2),
  cue('strike', BIT_AT - 0.12, 0.85, 0.5, -0.2),
  cue('bump', BIT_AT, 0.5, 0.5),
  cue('steps', PYTHON_AT + 0.1, 0.8, 0.3, 0.3),
  cue('steps', WAITED_AT - 0.2, 0.6, 0.25, -0.3),
  ...Array.from({ length: 8 }, (_, i) => cue('tick', TWO_AT + i * 0.24, 1.2, 0.22, 0.2)),
  cue('miss', STOPPED_AT, 0.6, 0.3),
  cue('steps', MONITOR_AT, 0.55, 0.35, 0.4),
  cue('steps', MONITOR_AT + 0.55, 0.5, 0.3, 0.3),
  cue('appear', LIZARD_AT, 0.8, 0.3, 0.3),
  cue('strike', FACED_AT - 0.05, 0.6, 0.45, -0.2),
  cue('steps', BACKED_AT, 0.5, 0.35, 0.4),
  cue('win', startOf(36), 0.9, 0.22),
  cue('swallow', SWALLOWED_AT - 0.05, 0.6, 0.45),
  cue('gulp', SWALLOWED_AT + 0.05, 0.5, 0.6),
  cue('squeeze', HEAD_AT, 0.6, 0.3),
  cue('tick', startOf(45), 1, 0.25),
  cue('gulp', FORTY_AT, 0.5, 0.6),
  cue('grown', ITS_AT + 0.1, 0.8, 0.3),
  cue('click', SNAKE_EATER_AT, 0.8, 0.3),
  cue('swallow', IRIS_AT + 0.1, 0.6, 0.35),
];

/** Every value the picture is drawn from at t, by name (each shot's values only while that shot shows). */
export function stateAt(t: number): Readonly<Record<string, number>> {
  const s = swallowPose(t);
  const flat = sceneAt(t) === 'flat' ? 1 : 0;
  const face = sceneAt(t) === 'face' ? 1 : 0;
  const rest = sceneAt(t) === 'rest' ? 1 - irisAt(t) : 0;
  return {
    iris: irisAt(t), hookClock: hookClock(t), depth: s.depth, gulp: s.gulp, zoom: s.zoom, nod: s.nod, dusk: s.dusk,
    hook: hookAlpha(t), cta: ctaAt(t), latin: latinName(t), eater: snakeEater(t), tongue: rest * tongueAt(t),
    strike: flat * strikeAt(t), crawl: flat * crawlOut(t), off: flat * drawOff(t), stir: flat * stir(t), late: flat * lateAt(t),
    monitor: flat * monitorIn(t), clock: clock2h(t).show, rear: face * rear(t), back: face * backOff(t),
    inside: headInside(t), clock45: clock45(t).show,
  };
}
