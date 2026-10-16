/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), re-voiced 2026-10-16: take 1 of two (generation
 * QYEmcZPW1wSoDJvWe0Da), its first 0.053 s of silence trimmed, then sped up by
 * TEMPO (pitch kept) with ffmpeg's atempo. WORDS are its words with start and
 * end times in the trimmed take (ElevenLabs Scribe, less the 0.053 s), so
 * divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped, and
 * word edges are fixed from the waveform: Scribe runs words across the tags and
 * pauses, so a word starts where the sound comes back after a pause and the
 * word before ends where the pause begins; the first word starts where the
 * sound does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So next time you have sushi, remember: / shark skin is covered in tiny TEETH."
 */
export const TEMPO = 1.0656;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'Shark', start: 0.02, end: 0.427 },
  { text: 'skin', start: 0.507, end: 0.667 },
  { text: 'is', start: 0.747, end: 0.907 },
  { text: 'covered', start: 0.987, end: 1.227 },
  { text: 'in', start: 1.307, end: 1.387 },
  { text: 'tiny', start: 1.467, end: 1.787 },
  { text: 'TEETH.', start: 1.867, end: 2.267 },
  { text: 'Every', start: 2.757, end: 2.987 },
  { text: 'scale', start: 3.147, end: 3.467 },
  { text: 'is', start: 3.547, end: 3.707 },
  { text: 'built', start: 3.787, end: 3.867 },
  { text: 'like', start: 3.947, end: 4.027 },
  { text: 'a', start: 4.187, end: 4.227 },
  { text: 'tooth,', start: 4.267, end: 4.567 },
  { text: 'and', start: 4.88, end: 4.92 },
  { text: 'they', start: 4.987, end: 5.087 },
  { text: 'all', start: 5.157, end: 5.387 },
  { text: 'point', start: 5.507, end: 5.627 },
  { text: 'to', start: 5.667, end: 5.707 },
  { text: 'the', start: 5.787, end: 5.867 },
  { text: 'tail.', start: 6.027, end: 6.267 },
  { text: 'Stroke', start: 6.777, end: 7.067 },
  { text: 'a', start: 7.147, end: 7.227 },
  { text: 'shark', start: 7.307, end: 7.547 },
  { text: 'from', start: 7.627, end: 7.787 },
  { text: 'nose', start: 7.827, end: 8.027 },
  { text: 'to', start: 8.107, end: 8.187 },
  { text: 'tail,', start: 8.267, end: 8.647 },
  { text: 'and', start: 8.88, end: 8.92 },
  { text: 'it', start: 8.987, end: 9.067 },
  { text: 'feels', start: 9.147, end: 9.387 },
  { text: 'smooth.', start: 9.627, end: 9.807 },
  { text: 'The', start: 10.207, end: 10.427 },
  { text: 'other', start: 10.547, end: 10.667 },
  { text: 'way?', start: 10.947, end: 11.137 },
  { text: 'Like', start: 11.257, end: 11.547 },
  { text: 'SANDPAPER.', start: 11.627, end: 12.327 },
  { text: 'In', start: 12.787, end: 12.907 },
  { text: 'Japan,', start: 12.987, end: 13.627 },
  { text: 'some', start: 13.707, end: 13.947 },
  { text: 'chefs', start: 13.987, end: 14.267 },
  { text: 'grate', start: 14.307, end: 14.507 },
  { text: 'wasabi', start: 14.667, end: 15.067 },
  { text: 'on', start: 15.147, end: 15.307 },
  { text: 'shark', start: 15.347, end: 15.547 },
  { text: 'skin.', start: 15.627, end: 16.267 },
  { text: 'So', start: 16.907, end: 16.987 },
  { text: 'next', start: 17.067, end: 17.227 },
  { text: 'time', start: 17.307, end: 17.387 },
  { text: 'you', start: 17.467, end: 17.507 },
  { text: 'have', start: 17.547, end: 17.687 },
  { text: 'sushi,', start: 17.747, end: 18.147 },
  { text: 'remember:', start: 18.407, end: 18.861 },
];
