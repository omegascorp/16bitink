import type { SfxId } from '../../../src/audio/recipes';
import { window01 } from '../short';
import {
  ANYTHING_AT, AND_AT, AWAY_AT, BECAUSE_AT, CHASE_AT, CONE_AT, CUT_CLOUD, CUT_CRAWL, CUT_DROWSY, CUT_HOOK, CUT_NET, CUT_PET, CUT_STING, DOZEN_AT,
  FISH_AT, GOES_AT, IN_AT, INSULIN_AT, LOOP_S, MOUTH_AT, NET_AT, NO_AT, OPENS_AT, PEOPLE_AT, POURS_AT, SLEEPY_AT, SNAIL_AT, SO2_AT, STING_AT, SWIM_AT,
  THREE_AT, WATER_AT, WHOLE_AT, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (captions and one label), and the sound effects under the voice. */

// ---------------------------------------------------------------- labels

/** "insulin", written in the cloud, from "INSULIN" until the cut to the sleepy fish. */
export const insulinLabel = (t: number): number => window01(wrap(t), INSULIN_AT - 0.04, CUT_DROWSY, 0.18);

/**
 * Where every line of text sits (baseline y and font size), so it can be
 * checked against the safe area: between y 270 and 1250. The "z"s are
 * placed by the story; their size range is here.
 */
export const TEXT = {
  caption: { y: 1200, size: 96 },
  insulin: { x: 760, y: 560, size: 92 },
  zed: { min: 34, max: 74 },
} as const;

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
    const full = !last || last.length >= 4 || /[.,!?…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
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

/** The insulin's eerie shimmer: soft high blips, scattered. */
const SHIMMER: readonly SoundCue[] = [0, 0.21, 0.37, 0.6, 0.78, 1.02, 1.19, 1.41].map((d, i) => cue('free', POURS_AT + d, 2.2 + (i % 3) * 0.35, 0.035, i % 2 ? 0.35 : -0.1));
/** Snores: a slow, low inhale and a bubbly pop, twice, then a yawn. */
const SNORES: readonly SoundCue[] = [
  cue('suck', SLEEPY_AT - 0.2, 0.36, 0.1, 0.3),
  cue('drop', SLEEPY_AT + 0.55, 0.42, 0.12, 0.35),
  cue('drop', SLEEPY_AT + 0.7, 0.5, 0.08, 0.4),
  cue('lose', SWIM_AT - 0.1, 0.55, 0.06, 0.2),
  cue('suck', AWAY_AT + 0.35, 0.34, 0.1, 0.3),
  cue('drop', CUT_NET - 0.15, 0.45, 0.08, 0.35),
];
/** A heartbeat under the net opening, quickening. */
const HEART: readonly SoundCue[] = [0, 0.55, 1.0, 1.38, 1.7, 1.96].flatMap((d, i) => [
  cue('boom', CUT_NET + 0.1 + d, 0.42, 0.1 + i * 0.015),
  cue('boom', CUT_NET + 0.27 + d, 0.5, 0.06 + i * 0.012),
]);
/** The people popping in, row by row. */
const PEOPLE: readonly SoundCue[] = [THREE_AT, THREE_AT + 0.22, DOZEN_AT].map((at, i) => cue('click', at + 0.05, 0.9 + i * 0.1, 0.12, -0.2 + i * 0.2));

/**
 * Quiet under the voice: it does the talking. A low drone and a slow slurp
 * for the creepy hook, then the gulp; a whoosh and three plinks for the
 * comic chase; an eerie shimmer for the insulin; snores, bubbles and a
 * yawn for the sleepy fish; a heartbeat and the hollow roar of the net
 * opening; the GULP on "in!"; a sharp metallic "shink" and a low boom for
 * the sting; a creeping rustle, the shink and a comic "nope" boing for the
 * hand; and the slurp rising again into the loop.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: something wet and hollow, the slurp on "WHOLE.", the lump sinking in.
  cue('boom', 0.02, 0.24, 0.16),
  cue('suck', 0.05, 0.42, 0.12, 0.15),
  cue('suck', SNAIL_AT + 0.3, 0.36, 0.1, 0.15),
  cue('hurt', FISH_AT + 0.05, 1.5, 0.05, 0.3),
  cue('suck', WHOLE_AT - 0.35, 0.55, 0.16, 0.15),
  cue('eatBig', WHOLE_AT + 0.12, 0.5, 0.3, 0.1),
  cue('boom', WHOLE_AT + 0.15, 0.3, 0.16),
  cue('eat', WHOLE_AT + 0.45, 0.45, 0.14, -0.1),
  // A cone snail can't chase anything: a creep, a whoosh past, three plinks.
  cue('rustle', CUT_CRAWL + 0.05, 0.6, 0.06, -0.2),
  cue('rustle', CONE_AT + 0.4, 0.55, 0.05, -0.2),
  cue('dash', CHASE_AT - 0.22, 1.3, 0.2, -0.6),
  cue('dash', CHASE_AT + 0.02, 1.6, 0.16, 0.6),
  cue('drop', ANYTHING_AT + 0.05, 1.3, 0.09),
  cue('drop', ANYTHING_AT + 0.17, 1.45, 0.09),
  cue('drop', ANYTHING_AT + 0.29, 1.6, 0.09),
  // The insulin: a sly rising shimmer.
  cue('suck', CUT_CLOUD + 0.1, 0.8, 0.07, 0.2),
  cue('powerup', POURS_AT + 0.05, 0.5, 0.05, 0.2),
  ...SHIMMER,
  cue('grow', INSULIN_AT + 0.05, 0.75, 0.05, 0.3),
  cue('powerup', WATER_AT, 0.45, 0.035, 0.4),
  // The fish nod off.
  cue('lose', AND_AT + 0.1, 0.42, 0.06, 0.3),
  ...SNORES,
  // The net: a heartbeat, the roar of it opening.
  ...HEART,
  cue('suck', MOUTH_AT - 0.1, 0.5, 0.16),
  cue('rustle', OPENS_AT + 0.1, 0.5, 0.08),
  cue('suck', NET_AT - 0.2, 0.62, 0.14),
  cue('lunge', NET_AT, 0.45, 0.12),
  // ...and the fish goes in!
  cue('spotted', GOES_AT - 0.05, 1.2, 0.07, 0.2),
  cue('suck', GOES_AT - 0.15, 0.75, 0.16),
  cue('eatBig', IN_AT + 0.02, 0.55, 0.34),
  cue('boom', IN_AT + 0.05, 0.36, 0.16),
  cue('eat', IN_AT + 0.35, 0.5, 0.14),
  // The sting: dark, a sharp shink.
  cue('boom', CUT_STING + 0.05, 0.22, 0.2),
  cue('lash', STING_AT - 0.08, 1.9, 0.08, 0.2),
  cue('clang', STING_AT + 0.06, 2.1, 0.11, 0.25),
  cue('hooked', STING_AT + 0.08, 1.2, 0.05, 0.25),
  ...PEOPLE,
  cue('boom', PEOPLE_AT, 0.26, 0.14),
  cue('lose', PEOPLE_AT + 0.25, 0.38, 0.05),
  // So, no petting: a creeping hand, the shink, the snap back with a boing.
  cue('rustle', SO2_AT - 0.1, 1.1, 0.06, 0.4),
  cue('rustle', SO2_AT + 0.35, 1.2, 0.05, 0.4),
  cue('clang', NO_AT - 0.12, 2.3, 0.07, -0.1),
  cue('dash', NO_AT, 1.4, 0.18, 0.5),
  cue('yuck', NO_AT + 0.05, 1.2, 0.1, 0.4),
  cue('free', NO_AT + 0.14, 0.55, 0.12, 0.4),
  cue('free', NO_AT + 0.28, 0.6, 0.08, 0.4),
  cue('free', NO_AT + 0.4, 0.66, 0.05, 0.4),
  // Because: the funnel opening again round a fish.
  cue('boom', CUT_HOOK + 0.02, 0.24, 0.16),
  cue('suck', BECAUSE_AT - 0.05, 0.48, 0.16, 0.15),
  cue('hurt', LOOP_S - 0.35, 1.5, 0.04, 0.3),
];

/** Shots the sounds cover (for the tests): every cut has a sound within half a second. */
export const CUT_TIMES: readonly number[] = [CUT_CRAWL, CUT_CLOUD, CUT_DROWSY, CUT_NET, CUT_STING, CUT_PET, CUT_HOOK];
