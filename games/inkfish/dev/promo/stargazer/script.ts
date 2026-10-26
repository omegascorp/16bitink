import type { SfxId } from '../../../src/audio/recipes';
import { curveAt, ramp, window01 } from '../short';
import {
  A2_AT, AND_AT, BLINK_AT, BURST_T, DRIFTS_AT, EATS_AT, EYES_AT, FIFTY_AT, FISH2_AT, HIDES_AT, HONESTLY_AT, LOOP_S, MOUTH_AT, OCEAN_AT, OVER_AT,
  PLUS_AT, POINTING_AT, REMEMBER_AT, SAND_AT, SNAP_T, SOME_AT, SPINES_AT, STARGAZER_AT, STRIKE_SNAP, STRIKE_T, TOP_AT, UNFAIR_AT, UP_AT, UP_END, VENOM_AT,
  VOLTS_AT, wrap, YOU_AT, ZAP_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's drawn over the picture (chalk marks, labels, captions), and the sound effects under the voice. */

// ---------------------------------------------------------------- chalk marks and labels

/** Little stars twinkling over its upturned eyes, on "stargazer". */
export const starsAt = (t: number): number => window01(wrap(t), STARGAZER_AT - 0.05, EYES_AT + 0.35, 0.2);
/** Chalk rings drawn round the eyes on "eyes on top", 0 .. 1 drawn, and how much shows. */
export const ringsDrawn = (t: number): number => ramp(wrap(t), EYES_AT - 0.05, TOP_AT + 0.1);
export const ringsAt = (t: number): number => window01(wrap(t), EYES_AT - 0.05, UP_END + 0.3, 0.15);
/** The curved arrow up out of the mouth on "mouth pointing UP". */
export const arrowDrawn = (t: number): number => ramp(wrap(t), MOUTH_AT - 0.05, UP_AT + 0.05);
export const arrowAt = (t: number): number => window01(wrap(t), MOUTH_AT - 0.05, UP_END + 0.3, 0.15);

/** Electric arcs round its head, 0 .. 1: from "zap" to "Plus", brightest on "VOLTS". */
export function zapAt(t: number): number {
  const u = wrap(t);
  return window01(u, ZAP_AT - 0.08, PLUS_AT - 0.05, 0.1) * (0.75 + 0.25 * window01(u, VOLTS_AT - 0.05, VOLTS_AT + 0.45, 0.1));
}
/** The diver's hand: -0.1 out of frame, 1 reaching in to touch the head; it jerks back on "you". */
export const handAt = (t: number): number =>
  curveAt([
    { t: SOME_AT, at: -0.1, rate: 0 },
    { t: ZAP_AT - 0.02, at: 1, rate: 0 },
    { t: YOU_AT - 0.02, at: 1, rate: 0 },
    { t: YOU_AT + 0.35, at: -0.1, rate: 0 },
    { t: FIFTY_AT, at: -0.1, rate: 0 },
  ], wrap(t)).at;
/** The hand shaking with the shock. */
export const shockAt = (t: number): number => window01(wrap(t), ZAP_AT, YOU_AT + 0.25, 0.05);
/** "50 V", from "fifty" until "Plus". */
export const voltsAt = (t: number): number => window01(wrap(t), FIFTY_AT - 0.05, PLUS_AT - 0.05, 0.15);
/** The spines pushed out from behind the gill covers, from "venom" through the joke. */
export const spinesAt = (t: number): number => window01(wrap(t), VENOM_AT - 0.15, 16.9, 0.25);
/** Glints running along the spines: two flashes, on "venom" and "spines". */
export const glintAt = (t: number): number => {
  const u = wrap(t);
  return Math.max(window01(u, VENOM_AT + 0.05, VENOM_AT + 0.45, 0.15), window01(u, SPINES_AT + 0.05, SPINES_AT + 0.5, 0.15));
};
/** The referee's yellow card, held up on "Honestly?", until the sink at the end. */
export const cardAt = (t: number): number => window01(wrap(t), HONESTLY_AT - 0.05, 16.95, 0.15);
/** The "UNFAIR!" stamp: 0 off; slams down on "unfair" (big to normal size), then holds. */
export const stampAt = (t: number): number => window01(wrap(t), UNFAIR_AT - 0.02, 16.95, 0.12);
export const stampScale = (t: number): number => {
  const u = wrap(t);
  return u < UNFAIR_AT - 0.02 ? 1 : 1 + (TEXT.stampPop - 1) * (1 - ramp(u, UNFAIR_AT - 0.02, UNFAIR_AT + 0.12));
};

/**
 * Where every line of text sits (baseline y and font size), so it can be
 * checked against the safe area: between y 270 and 1240. The stamp lands
 * from up to `stampPop` times its size.
 */
export const TEXT = {
  caption: { y: 1200, size: 96 },
  volts: { y: 470, size: 210 },
  stamp: { x: 600, y: 520, size: 150 },
  stampPop: 1.4,
} as const;

/** The highest point (screen y) the stamp's box reaches when it's biggest: half its height, turned. */
export const STAMP_HALF_H = 0.62;

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short lines: at most four words and 18 letters, broken after punctuation. */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  for (const w of WORDS) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const full = !last || last.length >= 4 || /[.,!?…:]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
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
  const u = wrap(t);
  const line = LINES.find((l) => u >= l.from && u < l.to);
  if (!line) return null;
  let word = -1;
  line.words.forEach((w, i) => {
    if (u >= w.start / TEMPO) word = i;
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

const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/** A slow heartbeat under the dread and the suspense. */
const heart = (from: number, beats: number, gap: number): SoundCue[] =>
  Array.from({ length: beats }, (_, i) => [cue('boom', from + i * gap, 0.4, 0.12 + i * 0.015), cue('boom', from + i * gap + 0.17, 0.48, 0.08 + i * 0.01)]).flat();
/** The crackle of the electric organ: a burst of zaps. */
const CRACKLE: readonly SoundCue[] = [0, 0.13, 0.24, 0.41, 0.55, 0.62, 0.8, 0.95, 1.12, 1.3, 1.38, 1.56, 1.7].map((d, i) =>
  cue('zap', ZAP_AT - 0.05 + d, 0.8 + 0.25 * ((i * 7) % 3), 0.07 + 0.02 * (i % 2), ((i * 5) % 3) * 0.3 - 0.3));

/**
 * Quiet under the voice: it does the talking. Water roaring into the mouth
 * and the snap for the terror; a hush and a sand hiss as it buries itself;
 * a heartbeat under the dread; bright plinks for the curious stars and the
 * chalk; the heartbeat again for the suspense; a blink-quick snap, a boom and
 * sand for the shock; crackling zaps and a jolt; tiny "ting" glints for the
 * sarcastic spines; a whistle (audio.ts) and a stamp's thump for the laugh;
 * a cheeky sting and the strike rising into frame 1.
 */
export const SOUNDS: readonly SoundCue[] = [
  // TERROR: the mouth sucking water in, the snap on "fish", sand spraying.
  cue('suck', 0.02, 0.5, 0.18, 0.05),
  cue('rustle', 0.05, 0.7, 0.1, -0.2),
  cue('eatBig', SNAP_T, 0.55, 0.32),
  cue('smash', SNAP_T + 0.01, 0.8, 0.07),
  cue('boom', SNAP_T + 0.02, 0.36, 0.18),
  // EERIE: sinking back under (hush in audio.ts), a soft sand hiss.
  cue('rustle', HIDES_AT + 0.1, 0.55, 0.12, 0.2),
  cue('rustle', SAND_AT, 0.45, 0.1, -0.2),
  cue('drop', SAND_AT + 0.25, 0.5, 0.08),
  // DREAD: a heartbeat as the little fish swims over the eyes.
  ...heart(AND_AT, 4, 0.55),
  cue('dash', EATS_AT, 0.6, 0.06, -0.5),
  cue('dash', OVER_AT, 0.7, 0.06, 0.4),
  // CURIOUS: the sand sliding off, twinkling stars, the chalk going on, a rising blip on "UP".
  cue('rustle', STARGAZER_AT, 1.0, 0.12),
  cue('drop', STARGAZER_AT + 0.15, 2.1, 0.08, -0.3),
  cue('drop', STARGAZER_AT + 0.35, 2.4, 0.07, 0.3),
  cue('drop', STARGAZER_AT + 0.55, 2.2, 0.06, 0),
  cue('click', EYES_AT, 1.6, 0.12, -0.3),
  cue('click', EYES_AT + 0.2, 1.7, 0.12, 0.3),
  cue('click', MOUTH_AT, 1.5, 0.1),
  cue('free', POINTING_AT + 0.1, 1.3, 0.1),
  cue('powerup', UP_AT, 1.1, 0.05),
  cue('rustle', UP_END + 0.1, 0.6, 0.1),
  // SUSPENSE: the heartbeat, the fish drifting by.
  ...heart(A2_AT, 2, 0.5),
  cue('dash', FISH2_AT, 0.5, 0.05, 0.4),
  cue('dash', DRIFTS_AT + 0.2, 0.45, 0.05, 0.2),
  // SHOCK: the strike, gone in a blink.
  cue('lunge', STRIKE_T, 0.7, 0.22),
  cue('suck', STRIKE_T + 0.02, 0.6, 0.2),
  cue('eatBig', STRIKE_SNAP, 0.6, 0.3),
  cue('boom', STRIKE_T + 0.05, 0.42, 0.2),
  cue('splash', STRIKE_T + 0.08, 0.5, 0.12),
  cue('click', BLINK_AT + 0.05, 1.2, 0.26),
  cue('rustle', BLINK_AT + 0.15, 0.6, 0.1),
  // ELECTRIC: crackling arcs, the hand jolted on "you", a deep hit on "VOLTS".
  cue('grow', SOME_AT, 0.5, 0.06),
  ...CRACKLE,
  cue('hurt', YOU_AT, 1.1, 0.12, 0.4),
  cue('zap', YOU_AT + 0.02, 0.6, 0.14, 0.3),
  cue('boom', VOLTS_AT, 0.4, 0.16),
  cue('zap', VOLTS_AT + 0.05, 0.5, 0.12),
  cue('zap', VOLTS_AT + 0.25, 0.7, 0.08),
  // SARCASTIC: two tiny tings as the spines glint.
  cue('lash', VENOM_AT - 0.1, 1.4, 0.05, 0.3),
  cue('drop', VENOM_AT + 0.1, 2.8, 0.09, 0.4),
  cue('drop', SPINES_AT + 0.1, 3.0, 0.09, 0.4),
  // LAUGH: the whistle (audio.ts), the stamp's thump, a cheeky sting.
  cue('free', HONESTLY_AT + 0.6, 1.6, 0.06),
  cue('smash', UNFAIR_AT + 0.08, 0.55, 0.12),
  cue('boom', UNFAIR_AT + 0.08, 0.5, 0.18),
  cue('free', OCEAN_AT + 0.1, 1.2, 0.08),
  // MISCHIEF: sinking, the fish drifting in, and the strike rising into frame 1.
  cue('rustle', 16.95, 0.6, 0.1),
  cue('dash', REMEMBER_AT, 0.5, 0.06, -0.5),
  cue('lunge', BURST_T + 0.05, 0.6, 0.2),
  cue('splash', BURST_T + 0.12, 0.45, 0.1),
  cue('rustle', BURST_T + 0.15, 0.7, 0.12),
  cue('suck', LOOP_S - 0.35, 0.5, 0.16, 0.05),
].filter((c) => c.t >= 0 && c.t < LOOP_S);

/** The referee's whistle on "Honestly?" (synthesized in audio.ts): when and how loud. */
export const WHISTLE = { t: HONESTLY_AT - 0.25, gain: 0.05 } as const;
/** A hushed breath of water as it sinks into the sand (audio.ts). */
export const HUSHES: readonly { readonly t: number; readonly dur: number; readonly gain: number }[] = [
  { t: HIDES_AT - 0.1, dur: 1.4, gain: 0.07 },
  { t: A2_AT - 0.3, dur: 1.1, gain: 0.05 },
];
