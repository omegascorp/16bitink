/**
 * How a narrated line is shown while it's heard (spec, "Narration"): cut
 * into subtitles of at most two short lines, each timed to the voice by its
 * length. As InkMine's. Pure: no Phaser, no audio.
 */

/** The same text however it was wrapped or spaced. */
const normal = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** A text's words alone: lower case, no punctuation. */
const wordsOf = (text: string): string => normal(text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' '));

/** Whether two texts say the same words: a comma or a capital moved isn't worth recording again. */
export const sameWords = (a: string, b: string): boolean => wordsOf(a) === wordsOf(b);

/** At most this many characters a subtitle: two lines of about 42 (the BBC's guideline is two lines of 37 to 42). */
export const SUBTITLE_MAX = 84;

/**
 * A line cut into subtitles: whole sentences (or thoughts ending in "…")
 * where they fit; a long one cut in two near its middle, at a comma, colon,
 * semicolon or "…" where there's one, else at a space, never past SUBTITLE_MAX.
 */
export function subtitles(text: string): string[] {
  return normal(text).split(/(?<=[.!?…])\s+/).filter(Boolean).flatMap(cut);
}

function cut(s: string): string[] {
  if (s.length <= SUBTITLE_MAX) return [s];
  // Where a cut may go: after a pause, or at a space, leaving the first piece no longer than SUBTITLE_MAX.
  const spaces = [...s.matchAll(/ /g)].map((m) => m.index).filter((i) => i > 0 && i <= SUBTITLE_MAX);
  const pauses = spaces.filter((i) => /[,:;…]/.test(s[i - 1]!));
  // Near the middle when the rest fits in one more subtitle; else as far on as it can go.
  const aim = s.length <= SUBTITLE_MAX * 2 ? s.length / 2 : SUBTITLE_MAX;
  const nearest = (xs: number[]): number | undefined => [...xs].sort((a, b) => Math.abs(a - aim) - Math.abs(b - aim))[0];
  // A pause wins unless it leaves a piece much shorter than a space would.
  const pause = nearest(pauses.filter((i) => s.length - i <= SUBTITLE_MAX || aim === SUBTITLE_MAX));
  const space = nearest(spaces);
  const at = pause !== undefined && Math.abs(pause - aim) < s.length * 0.3 ? pause : (space ?? SUBTITLE_MAX);
  return [s.slice(0, at).trim(), ...cut(s.slice(at).trim())];
}

/** How long to show a line with no voice to time it by (the recording not decoded yet), s: a steady reading pace. */
export function readingTime(text: string): number {
  return 1.2 + normal(text).length / 15;
}

/**
 * Which subtitle is showing `at` seconds into a line `duration` long: each
 * gets a share of the time by its length, plus a little for the pause after it.
 */
export function subtitleAt(chunks: readonly string[], at: number, duration: number): number {
  if (!chunks.length) return -1;
  const weights = chunks.map((c) => c.length + 12);
  const total = weights.reduce((a, b) => a + b, 0);
  let t = 0;
  for (let i = 0; i < chunks.length; i++) {
    t += (weights[i]! / total) * duration;
    if (at < t) return i;
  }
  return chunks.length - 1;
}
