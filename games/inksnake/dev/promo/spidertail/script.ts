import type { SfxId } from '../../../src/audio/recipes';
import { BITE_AT, BURST_AT, CUT_HOME, CUT_SAD, FLY_AT, HOOK_END, HOPS, IT_AT, LEGS_AT, LOOP_S, OFF_AT, ONE_AT, PECK_AT, PECKED_AT, REGROW, ROCK_AT, SO_AT, SPIDER2_AT, STOPS_AT, WESTERN_AT, wrap } from './story';
import { TEMPO, WORDS, type Word } from './words';

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

/** The big "0.2 s" of the freeze: one text, metric time, placed inside the clear area. */
export const STAMP = { text: '0.2 s', x: 300, y: 450, size: 190 } as const;

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
 * Quiet under the voice, all from InkSnake's own effects, one mood a sentence.
 * Surprise: a bright ping, a chirp, wings. Calm: a soft shimmer. Tender: wings,
 * a soft landing, small tired chirps. Nervous: a slow heartbeat, tiny ticks as
 * the legs twitch. Tension: a low growl and a step for every hop. Shock: the
 * peck, the strike, a shriek, the jaws shutting. Dramatic: a slow low dive and
 * one deep thud. Laughing: a cheeky squeak, wings, the bulb popping off. Sarcastic: a low sad sting, a
 * tumbleweed's steps. Then a regrowing shimmer and a whoosh for the cut.
 */
export const SOUNDS: readonly SoundCue[] = [
  cue('appear', 0.05, 1.3, 0.18),
  cue('squeak', 0.7, 1.9, 0.1),
  cue('squeak', 1.5, 1.6, 0.08),
  ...every('flap', HOOK_END, HOOK_END + 0.5, 0.17, 1.2, 0.2),
  cue('appear', WESTERN_AT, 0.8, 0.14),
  cue('appear', WESTERN_AT + 0.35, 1.0, 0.1),
  ...every('flap', 3.75, STOPS_AT + 0.1, 0.19, 1.0, 0.16),
  cue('plop', STOPS_AT + 0.22, 1.4, 0.12),
  cue('squeak', 5.9, 1.7, 0.07),
  cue('squeak', 6.5, 1.5, 0.07),
  ...every('bump', 7.5, 10.6, 0.85, 0.5, 0.14),
  cue('appear', SPIDER2_AT - 0.05, 0.9, 0.12),
  ...every('tick', LEGS_AT, LEGS_AT + 0.75, 0.11, 1.9, 0.08),
  cue('growl', IT_AT, 0.4, 0.14),
  ...HOPS.map((h) => cue('steps', h.land - 0.02, 1.4, 0.16)),
  cue('tick', PECK_AT + 0.02, 2.0, 0.42),
  cue('strike', BURST_AT, 1.1, 0.42),
  cue('bump', BURST_AT + 0.01, 0.8, 0.5),
  cue('cry', ROCK_AT + 0.05, 1.6, 0.14),
  cue('nip', BITE_AT, 1.5, 0.3),
  cue('dive', BURST_AT + 0.35, 0.45, 0.22),
  cue('bump', ONE_AT - 0.5, 0.5, 0.32),
  cue('squeak', ONE_AT + 0.35, 2.0, 0.1),
  ...every('flap', PECKED_AT + 0.1, OFF_AT + 0.4, 0.2, 1.1, 0.18),
  cue('nip', FLY_AT, 2.0, 0.16),
  cue('appear', OFF_AT, 1.6, 0.12),
  cue('lose', CUT_SAD + 0.02, 0.6, 0.3),
  ...every('steps', CUT_SAD + 0.4, SO_AT - 0.1, 0.38, 0.8, 0.06),
  cue('squeak', 19.5, 0.8, 0.07),
  cue('grown', REGROW[0] + 0.05, 1.3, 0.2),
  cue('appear', REGROW[0] + 0.3, 1.5, 0.12),
  cue('dive', CUT_HOME - 0.15, 1.8, 0.2),
  cue('click', CUT_HOME, 1.1, 0.2),
];
