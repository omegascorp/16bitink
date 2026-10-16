/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), re-voiced 2026-10-16: take 1 of two (generation
 * Wjpg1gLt9YEQm0PgD8YD), its first 0.065 s of silence trimmed, then sped up by
 * TEMPO (pitch kept) with ffmpeg's atempo. WORDS are its words with start and
 * end times in the trimmed take (ElevenLabs Scribe, less the 0.065 s), so
 * divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped, and
 * word edges are fixed from the waveform: Scribe runs words across the tags and
 * pauses, so a word starts where the sound comes back after a pause and the
 * word before ends where the pause begins; the first word starts where the
 * sound does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Forget heated seats. / This fish has HEATED eyes."
 */
export const TEMPO = 1.2383;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.02, end: 0.255 },
  { text: 'fish', start: 0.335, end: 0.575 },
  { text: 'has', start: 0.695, end: 0.815 },
  { text: 'HEATED', start: 0.895, end: 1.215 },
  { text: 'eyes.', start: 1.375, end: 1.925 },
  { text: 'Swordfish', start: 2.415, end: 2.895 },
  { text: 'hunt', start: 2.975, end: 3.215 },
  { text: 'deep', start: 3.295, end: 3.535 },
  { text: 'down,', start: 3.595, end: 4.005 },
  { text: 'where', start: 4.145, end: 4.255 },
  { text: 'the', start: 4.295, end: 4.335 },
  { text: 'water', start: 4.415, end: 4.655 },
  { text: 'is', start: 4.735, end: 4.815 },
  { text: 'close', start: 4.895, end: 5.135 },
  { text: 'to', start: 5.215, end: 5.295 },
  { text: 'freezing.', start: 5.375, end: 5.885 },
  { text: 'So', start: 6.415, end: 6.495 },
  { text: 'a', start: 6.575, end: 6.655 },
  { text: 'muscle', start: 6.735, end: 6.865 },
  { text: 'next', start: 6.945, end: 7.295 },
  { text: 'to', start: 7.375, end: 7.455 },
  { text: 'each', start: 7.535, end: 7.735 },
  { text: 'eye', start: 7.795, end: 8.095 },
  { text: 'works', start: 8.215, end: 8.335 },
  { text: 'like', start: 8.415, end: 8.495 },
  { text: 'a', start: 8.575, end: 8.655 },
  { text: 'heater,', start: 8.735, end: 9.135 },
  { text: 'keeping', start: 9.455, end: 9.695 },
  { text: 'its', start: 9.815, end: 9.895 },
  { text: 'eyes', start: 9.965, end: 10.255 },
  { text: 'and', start: 10.335, end: 10.415 },
  { text: 'brain', start: 10.575, end: 10.735 },
  { text: 'up', start: 10.815, end: 10.895 },
  { text: 'to', start: 11.015, end: 11.135 },
  { text: 'fifteen', start: 11.215, end: 11.395 },
  { text: 'degrees', start: 11.455, end: 12.095 },
  { text: 'warmer.', start: 12.175, end: 12.615 },
  { text: 'Warm', start: 13.025, end: 13.375 },
  { text: 'eyes', start: 13.455, end: 13.775 },
  { text: 'follow', start: 13.855, end: 14.175 },
  { text: 'fast', start: 14.255, end: 14.495 },
  { text: 'prey', start: 14.575, end: 14.895 },
  { text: 'up', start: 14.975, end: 15.055 },
  { text: 'to', start: 15.175, end: 15.295 },
  { text: 'TEN', start: 15.335, end: 15.535 },
  { text: 'times', start: 15.615, end: 16.015 },
  { text: 'better.', start: 16.095, end: 16.655 },
  { text: 'Forget', start: 17.255, end: 17.455 },
  { text: 'heated', start: 17.495, end: 17.775 },
  { text: 'seats.', start: 17.855, end: 18.203 },
];
