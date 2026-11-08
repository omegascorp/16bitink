import { HOOK_BACK_AT, LOOP_S } from './story';
import { said, TEMPO, WORDS, type Word } from './words';

/** The voiceover in short phrases. The first line isn't here: "NEVER drill near this thing" is the hook caption, on screen from frame 1. */
export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** Where each phrase begins (a word index): broken where the narrator breathes. */
const BREAKS = [5, 8, 13, 19, 21, 23, 26, 30, 34] as const;

export const LINES: readonly Line[] = BREAKS.map((first, i) => {
  const next = BREAKS[i + 1];
  return {
    words: WORDS.slice(first, next ?? WORDS.length),
    from: said(first),
    // The last line gives way to the hook coming back.
    to: next === undefined ? Math.min(HOOK_BACK_AT, LOOP_S) : said(next),
  };
});

/** The line on screen at time t, and the word being spoken in it. */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  let word = 0;
  line.words.forEach((w, i) => {
    if (t >= w.start / TEMPO) word = i;
  });
  return { line, word };
}
