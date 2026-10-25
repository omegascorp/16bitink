import type { SfxId } from '../../../src/audio/recipes';
import { window01 } from '../short';
import { WRAP_ORDER, wrapStart } from './sea';
import {
  BAD_AT, BEAK_AT, BITES_AT, CUTS, DOGFISH_AT, EATING_AT, EATS_AT, IDEA_AT, KEEPERS_AT, LOOP_S, MOVED_AT, OUT_AT, PARROT_AT, SHARKS1_AT, SHARKS2_AT,
  SO_AT, SO2_AT, STARTED_AT, THEN_AT, sceneAt, wrap,
} from './story';
import { toScreen } from './tank';
import { closeShark, lookAt } from './tankStory';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (labels and captions), and the sound effects under the voice. */

// ---------------------------------------------------------------- labels

/** "spiny dogfish" by the shark passing close on "dogfish sharks", until the cut. */
export const dogfishLabel = (t: number): number => window01(wrap(t), DOGFISH_AT - 0.05, BAD_AT - 0.08, 0.15);

/** The spoken line's baseline and size, screen px. */
export const CAPTION_Y = 1200;
export const CAPTION_SIZE = 96;

export interface Label {
  readonly text: string;
  readonly x: number;
  /** Baseline, screen px. */
  readonly y: number;
  readonly size: number;
  readonly alpha: number;
}

/** The close dogfish's name and size, just over it (screen px, so it stays upright and sized through the camera). */
export function dogfishLabels(t: number): Label[] {
  const alpha = sceneAt(t).scene === 'tank' ? dogfishLabel(t) : 0;
  if (alpha <= 0) return [];
  const s = lookAt(t);
  const shark = closeShark(t);
  const at = toScreen(s.cam, { x: shark.x, y: shark.y - shark.length * 0.2 });
  const x = Math.max(300, Math.min(780, at.x));
  return [
    { text: 'spiny dogfish', x, y: at.y - 52, size: 74, alpha },
    { text: '0.9–1.2 m (3–4 ft)', x, y: at.y + 6, size: 56, alpha },
  ];
}

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
const cutAt = (i: number): number => CUTS[i]!.at;

/** A tick as each arm wraps in the count, climbing in pitch: one, two, … eight. */
const COUNT: readonly SoundCue[] = WRAP_ORDER.map((_, k) => cue('drop', wrapStart(k) + 0.12, 0.9 + k * 0.09, 0.16, (k % 2 ? 0.25 : -0.25)));

/**
 * Quiet under the voice: it does the talking. The hook's wet whoosh and
 * squeeze (and the shark thrashing); small bubbles in the tank and a swish
 * as a shark passes close;
 * a tense low pulse under "Bad idea…"; the lunge, a splash, the arms
 * squeezing shut, the catch gone; a comic sploosh and a pail's clank, drips,
 * the sharks' sigh of bubbles; a rising tick for each arm in the count; a
 * crisp click for each bite of the beak and the parrot's squawk; and a
 * whoosh back into the hook.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: a wet whoosh, the squeeze, the tail thrashing.
  cue('dash', 0.02, 0.55, 0.2, -0.1),
  cue('suck', 0.12, 0.5, 0.2),
  cue('rustle', 0.45, 0.7, 0.14, 0.2),
  cue('suck', EATS_AT - 0.05, 0.42, 0.24),
  cue('lash', EATS_AT + 0.05, 0.75, 0.1, 0.3),
  cue('rustle', SHARKS1_AT, 0.8, 0.12, -0.2),
  cue('lash', SHARKS1_AT + 0.35, 0.7, 0.08, 0.3),
  // The tank: a cut in, bubbles, a shark swishing past close.
  cue('dash', cutAt(1), 1.5, 0.08, 0.3),
  cue('drop', 3.1, 1.6, 0.07, -0.3),
  cue('drop', 3.35, 1.8, 0.05, -0.3),
  cue('drop', 4.9, 1.5, 0.06, 0.2),
  cue('dash', DOGFISH_AT + 0.1, 1.1, 0.12, -0.2),
  // "Bad idea…": a tense low pulse, the arm creeping.
  cue('boom', BAD_AT, 0.26, 0.26),
  cue('boom', BAD_AT + 0.42, 0.26, 0.2),
  cue('boom', BAD_AT + 0.84, 0.27, 0.22),
  cue('rustle', IDEA_AT + 0.1, 0.45, 0.1, -0.3),
  cue('boom', STARTED_AT - 0.45, 0.27, 0.16),
  cue('boom', STARTED_AT - 0.03, 0.28, 0.16),
  // The lunge: whoosh, splash, the arms clamp shut, the catch gone.
  cue('lunge', EATING_AT - 0.1, 0.75, 0.3),
  cue('dash', EATING_AT - 0.05, 0.7, 0.18),
  cue('splash', EATING_AT + 0.08, 0.7, 0.24),
  cue('boom', EATING_AT + 0.08, 0.4, 0.16),
  cue('suck', SHARKS2_AT - 0.1, 0.5, 0.26),
  cue('rustle', SHARKS2_AT + 0.05, 0.6, 0.16, 0.2),
  cue('lash', SHARKS2_AT + 0.2, 0.8, 0.1, -0.2),
  cue('drop', SHARKS2_AT + 0.5, 0.55, 0.2),
  // The keeper: sploosh, the pail's clank, drips, a swing, the sharks' sigh.
  cue('splash', SO_AT, 1.0, 0.26),
  cue('clang', SO_AT + 0.18, 1.05, 0.14, 0.15),
  cue('drop', KEEPERS_AT, 1.5, 0.08, -0.2),
  cue('drop', KEEPERS_AT + 0.28, 1.35, 0.07, -0.2),
  cue('drop', MOVED_AT + 0.2, 1.4, 0.07, -0.2),
  cue('drop', MOVED_AT + 0.25, 1.7, 0.08, 0.3),
  cue('drop', MOVED_AT + 0.45, 1.9, 0.07, 0.3),
  cue('drop', MOVED_AT + 0.6, 2.1, 0.06, 0.3),
  cue('clang', OUT_AT - 0.2, 0.95, 0.08, 0.4),
  cue('dash', OUT_AT - 0.1, 1.2, 0.08, 0.4),
  // The count: a whoosh in, a rising tick for each arm, a squeeze at the end.
  cue('dash', cutAt(5), 0.7, 0.14),
  ...COUNT,
  cue('suck', wrapStart(7) + 0.3, 0.5, 0.2),
  // The beak: a click for each bite, the parrot's squawk.
  cue('dash', THEN_AT - 0.08, 1.3, 0.1),
  cue('click', BITES_AT + 0.14, 0.9, 0.34),
  cue('click', BITES_AT + 0.16, 1.4, 0.18),
  cue('click', BEAK_AT + 0.14, 1.0, 0.34),
  cue('click', BEAK_AT + 0.16, 1.5, 0.18),
  cue('dash', PARROT_AT - 0.3, 1.4, 0.1, 0.4),
  cue('squawk', PARROT_AT + 0.08, 1.0, 0.18, 0.3),
  // Back into the hook: a whoosh, the squeeze tightening.
  cue('dash', SO2_AT - 0.1, 0.6, 0.18, -0.1),
  cue('rustle', SO2_AT + 0.2, 0.75, 0.12, 0.2),
  cue('suck', SO2_AT + 0.55, 0.48, 0.16),
];
