import type { SfxId } from '../../../src/audio/recipes';
import { ramp, window01 } from '../short';
import {
  APART_AT, COULDNT_AT, EYES_AT, FILMED_AT, IT_AT, LOOP_S, PADDLE_AT, PEOPLE_AT, REMEMBER_AT, SAW_AT, SCIENTISTS_AT, SEAL_AT, SEAL_IN, SEAL_TURN,
  SEALS_AT, SHARK_TURNS, SHARKS_AT, span01, SURFERS_AT, THIS_AT, YOU_AGAIN_AT, YOUNG_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (tags, notes and captions), and the sound effects under the voice. */

// ---------------------------------------------------------------- tags

export interface Tag {
  readonly text: string;
  readonly alpha: number;
  /** Picked out in red: the punchline tags. */
  readonly red: boolean;
}

/**
 * What the surfer is called as the story goes: "you" from "…next time you
 * paddle out" round to "surfers", "surfer" until "people", "person" until
 * "seal.", and "seal?" (in red) until "you" again.
 */
const SURFER_TAGS: readonly { readonly text: string; readonly from: number; readonly red: boolean }[] = [
  { text: 'you', from: YOU_AGAIN_AT, red: false },
  { text: 'surfer', from: SURFERS_AT, red: false },
  { text: 'person', from: PEOPLE_AT, red: false },
  { text: 'seal?', from: SEAL_AT, red: true },
];
/** Each tag gives way just as the next word comes: out over this long, then the next one in. */
const TAG_FADE = 0.12;

export function surferTags(t: number): readonly Tag[] {
  return SURFER_TAGS.map((tag, i) => {
    const next = SURFER_TAGS[(i + 1) % SURFER_TAGS.length]!;
    return { text: tag.text, alpha: span01(t, tag.from, next.from, TAG_FADE), red: tag.red };
  }).filter((tag) => tag.alpha > 0);
}

/** "seal" over the seal from "THIS" until it turns away; it swells a little on "seals". */
export const sealTag = (t: number): number => window01(t, THIS_AT - 0.05, SEAL_TURN + 0.3, 0.2);
export const sealTagPulse = (t: number): number => Math.sin(Math.PI * ramp(t, SEALS_AT - 0.05, SEALS_AT + 0.35));

/** The dashed "=" between the two silhouettes: on "THIS", and again on "APART". */
export const equalsAt = (t: number): number =>
  Math.max(window01(t, THIS_AT - 0.05, SCIENTISTS_AT + 0.2, 0.2), window01(t, APART_AT - 0.1, IT_AT + 0.35, 0.2));
/** How far the "=" is drawn out, 0 .. 1, each time it comes in. */
export const equalsDrawn = (t: number): number => (t < APART_AT - 0.2 ? ramp(t, THIS_AT - 0.05, THIS_AT + 0.25) : ramp(t, APART_AT - 0.1, APART_AT + 0.25));

// ---------------------------------------------------------------- notes

/** "scientists' camera" by the camera on the seabed. */
export const cameraLabel = (t: number): number => window01(t, SCIENTISTS_AT - 0.05, SAW_AT + 0.4, 0.25);
/** "shark vision" across the top while its view is grey. */
export const visionLabel = (t: number): number => window01(t, SAW_AT + 0.1, IT_AT + 0.3, 0.3);
/** "young white shark" under the shark. */
export const youngLabel = (t: number): number => window01(t, YOUNG_AT - 0.05, IT_AT + 0.3, 0.25);
/** A ring round its eye on "eyes", drawn round (0 .. 1). */
export const eyeRingAt = (t: number): number => window01(t, EYES_AT - 0.05, IT_AT + 0.2, 0.2);
export const eyeRingDrawn = (t: number): number => ramp(t, EYES_AT - 0.05, EYES_AT + 0.3);
/** The "?" over the shark on "couldn't", popping in a little big. */
export const questionAt = (t: number): number => Math.min(1.15 * ramp(t, COULDNT_AT - 0.05, COULDNT_AT + 0.12), 1 - ramp(t, IT_AT, IT_AT + 0.3));

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short lines: at most four words, broken after punctuation. */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  for (const w of WORDS) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const full = !last || last.length >= 4 || /[.,:…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
    if (full) groups.push([w]);
    else last.push(w);
  }
  return groups.map((g, i) => ({
    words: g,
    // The first line is up from the loop's first frame.
    from: i === 0 ? 0 : g[0]!.start / TEMPO,
    to: i + 1 < groups.length ? groups[i + 1]![0]!.start / TEMPO : LOOP_S,
  }));
})();

/** The line on screen at time t, and the word being spoken in it (-1: none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  let word = -1;
  line.words.forEach((w, i) => {
    if (t >= w.start / TEMPO) word = i;
  });
  return { line, word };
}

// ---------------------------------------------------------------- sounds

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

/** A quiet splash of the surfer's hands now and then. */
const PADDLES: readonly SoundCue[] = [0.35, PADDLE_AT + 0.05, REMEMBER_AT + 0.1].map((t, k) => ({
  id: 'splash', t, pitch: 1.3 + 0.1 * k, gain: 0.08, pan: -0.3,
}));

/**
 * Quiet under the voice, one mood a beat: a low thud on "THIS" (dramatic),
 * the camera's clicks (curious), a whoosh into shark vision, a bright
 * "spotted" and a ding on "couldn't tell them APART" (surprise), only low,
 * soft sounds while the shark rises (nothing funny there), and splashes as
 * the surfer paddles on.
 */
export const SOUNDS: readonly SoundCue[] = [
  ...PADDLES,
  // Softer than it was: Mark's "THIS" is his loudest word, and the boom on it pushed the mix to -1.6 dB.
  { id: 'boom', t: THIS_AT, pitch: 0.55, gain: 0.12, pan: 0 },
  { id: 'lunge', t: THIS_AT - 0.05, pitch: 0.6, gain: 0.14, pan: 0.3 },
  { id: 'click', t: FILMED_AT, pitch: 1.5, gain: 0.18, pan: -0.5 },
  { id: 'click', t: FILMED_AT + 0.14, pitch: 1.3, gain: 0.14, pan: -0.5 },
  { id: 'click', t: SEALS_AT + 0.1, pitch: 1.5, gain: 0.14, pan: -0.5 },
  { id: 'dash', t: SAW_AT - 0.1, pitch: 0.55, gain: 0.22, pan: 0 },
  { id: 'clang', t: YOUNG_AT, pitch: 1.4, gain: 0.12, pan: 0.2 },
  { id: 'spotted', t: COULDNT_AT, pitch: 0.95, gain: 0.2, pan: 0.2 },
  { id: 'clang', t: APART_AT, pitch: 1.7, gain: 0.22, pan: 0 },
  { id: 'dash', t: IT_AT, pitch: 0.7, gain: 0.14, pan: 0 },
  { id: 'lunge', t: SHARKS_AT - 0.2, pitch: 0.45, gain: 0.16, pan: 0.2 },
  { id: 'dash', t: SHARK_TURNS[2] + 0.1, pitch: 0.6, gain: 0.14, pan: 0.3 },
  { id: 'dash', t: SEAL_IN + 0.2, pitch: 1.1, gain: 0.08, pan: 0.6 },
];
