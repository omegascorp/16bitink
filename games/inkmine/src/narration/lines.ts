/**
 * The narrator's lines (spec, "Narration"): every story card with a `line`
 * id is read aloud by the narrator, from narration/<line>.mp3. The words
 * the recording says are kept with it (narration/lines.json), and
 * test/narration.test.ts says when a card's words have moved on from them.
 * Pure: no Phaser, no audio.
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
 * A line cut into subtitles: whole sentences where they fit, long ones cut
 * at a comma, colon or semicolon, else at a space, never past SUBTITLE_MAX.
 */
export function subtitles(text: string): string[] {
  const sentences = normal(text).split(/(?<=[.!?])\s+/).filter(Boolean);
  const out: string[] = [];
  for (const s of sentences) out.push(...cut(s));
  return out;
}

function cut(s: string): string[] {
  if (s.length <= SUBTITLE_MAX) return [s];
  const head = s.slice(0, SUBTITLE_MAX + 1);
  // The last pause that leaves a fair piece on both sides, else the last space.
  const pause = Math.max(head.lastIndexOf(', '), head.lastIndexOf(': '), head.lastIndexOf('; '));
  const at = pause > SUBTITLE_MAX * 0.35 ? pause + 1 : head.lastIndexOf(' ');
  const split = at > 0 ? at : SUBTITLE_MAX;
  return [s.slice(0, split).trim(), ...cut(s.slice(split).trim())];
}

/** How long to show a subtitle with no voice to time it by (muted, or not read yet): a steady reading pace, s. */
export function readingTime(text: string): number {
  return 1.2 + normal(text).length / 15;
}

/**
 * Which subtitle is showing `at` seconds into a line `duration` long:
 * each gets a share of the time by its length, plus a little for the
 * pause after it.
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
