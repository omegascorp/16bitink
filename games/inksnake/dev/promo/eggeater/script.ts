import type { SfxId } from '../../../src/audio/recipes';
import { TEMPO, WORDS, type Word } from './words';
import {
  AFRICA_AT, BACKBONE_AT, BECAUSE_AT, CRACK_AT, FLAT_AT, GULPS_AT, HEAD_AT, INSIDE_AT, INSTEAD_AT, LOOP_S, NO2_AT, NO_AT, POP_AT,
  PROBLEM_AT, SPIKES_AT, SPITS_AT, TEETH_AT, THEN_AT, wrap, YOLK_AT,
} from './story';

export interface Line {
  readonly words: readonly Word[];
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

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t: wrap(t), pitch, gain, pan });

const every = (id: SfxId, from: number, to: number, step: number, pitch: number, gain: number, pan = 0): SoundCue[] => {
  const out: SoundCue[] = [];
  for (let t = from; t < to; t += step) out.push(cue(id, t, pitch, gain, pan));
  return out;
};

/**
 * Quiet under the voice, matching each sentence's mood, all from InkSnake's
 * own effects (it has none for a crack or a pop, so: a dry bump and a nip
 * for the crack, a plop for the pop). Surprised: wet gulps, a big swallow on
 * "HEAD", a bright ping. Curious: the egg sliding down, soft ticks for the
 * few teeth. Dramatic: a low growl, creaking squeeze, ticks quickening to
 * the strike on "BACKBONE", then the crack. Laughing: gulps, a squeak, the
 * plop of the pop and a hen's cluck. Sarcastic: dry ticks and clicks, a
 * whoosh, the egg's plop, and the first gulp of the loop.
 */
export const SOUNDS: readonly SoundCue[] = [
  // Surprised: the jaws working on the egg, the swallow on "HEAD".
  ...every('gulp', 0.5, HEAD_AT - 0.3, 0.55, 0.8, 0.2),
  cue('swallow', HEAD_AT - 0.1, 0.9, 0.34),
  cue('appear', HEAD_AT + 0.1, 1.5, 0.18),
  // Curious: the egg goes down the neck.
  cue('appear', AFRICA_AT, 1.2, 0.16),
  cue('swallow', AFRICA_AT + 0.25, 0.7, 0.36),
  ...every('gulp', AFRICA_AT + 0.7, AFRICA_AT + 1.6, 0.34, 0.6, 0.2),
  cue('plop', NO_AT - 0.1, 0.6, 0.14),
  cue('tick', NO_AT + 0.05, 1.6, 0.16),
  cue('tick', TEETH_AT - 0.05, 1.3, 0.14),
  cue('squeak', TEETH_AT + 0.25, 1.4, 0.1),
  // Dramatic: a low growl, the neck squeezing, ticks quickening, the strike, the crack.
  cue('growl', INSTEAD_AT + 0.2, 0.45, 0.24),
  cue('squeeze', INSIDE_AT - 0.05, 1.0, 0.3),
  cue('squeeze', INSIDE_AT + 0.7, 0.9, 0.2),
  ...every('tick', SPIKES_AT - 0.05, BACKBONE_AT - 0.05, 0.22, 1.1, 0.12),
  ...every('tick', BACKBONE_AT - 0.45, CRACK_AT - 0.05, 0.12, 1.6, 0.12),
  cue('strike', BACKBONE_AT + 0.02, 1.3, 0.4),
  cue('bump', CRACK_AT, 1.7, 0.5),
  cue('nip', CRACK_AT + 0.02, 1.9, 0.4),
  cue('knot', CRACK_AT + 0.06, 1.8, 0.28),
  // Laughing: gulp the yolk, the shell comes back up, the pop.
  cue('appear', CRACK_AT + 0.45, 1.5, 0.16),
  cue('swallow', GULPS_AT - 0.05, 1.1, 0.3),
  cue('gulp', GULPS_AT + 0.3, 1.0, 0.26),
  cue('gulp', YOLK_AT + 0.1, 1.2, 0.24),
  cue('squeak', THEN_AT + 0.05, 1.2, 0.14),
  ...every('steps', SPITS_AT, POP_AT - 0.1, 0.17, 1.4, 0.14),
  cue('plop', POP_AT, 1.9, 0.5),
  cue('cluck', POP_AT + 0.15, 1.1, 0.14),
  cue('plop', POP_AT + 0.4, 1.0, 0.2),
  cue('card', FLAT_AT - 0.05, 1.3, 0.3),
  cue('squeak', FLAT_AT + 0.25, 1.6, 0.12),
  // Sarcastic: dry ticks and clicks with each "no", a whoosh as the shell goes, the new egg.
  cue('click', NO2_AT, 0.8, 0.22),
  cue('tick', 15.03, 0.8, 0.2),
  cue('click', 15.52, 0.8, 0.22),
  cue('click', 16.1, 0.7, 0.24),
  cue('squeak', PROBLEM_AT + 0.05, 0.7, 0.1),
  cue('dive', 16.55, 1.1, 0.26),
  cue('appear', 16.72, 1.3, 0.2),
  cue('plop', 17.05, 1.2, 0.34),
  cue('plop', 17.15, 1.9, 0.14),
  ...every('steps', 17.25, 17.8, 0.15, 1.1, 0.14),
  cue('gulp', BECAUSE_AT + 0.45, 0.8, 0.2),
];
