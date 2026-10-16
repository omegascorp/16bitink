/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), re-voiced 2026-10-16: take 2 of two (generation
 * qUVR6m7niQSe41dKAyzH), its first 0.076 s of silence trimmed, then sped up by
 * TEMPO (pitch kept) with ffmpeg's atempo. WORDS are its words with start and
 * end times in the trimmed take (ElevenLabs Scribe, less the 0.076 s), so
 * divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped, and
 * word edges are fixed from the waveform: Scribe runs words across the tags and
 * pauses, so a word starts where the sound comes back after a pause and the
 * word before ends where the pause begins; the first word starts where the
 * sound does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So, for the record: / your goldfish does NOT have a three-second memory."
 */
export const TEMPO = 1.1368;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'Your', start: 0.02, end: 0.164 },
  { text: 'goldfish', start: 0.324, end: 0.804 },
  { text: 'does', start: 0.884, end: 1.124 },
  { text: 'NOT', start: 1.204, end: 1.444 },
  { text: 'have', start: 1.524, end: 1.604 },
  { text: 'a', start: 1.684, end: 1.764 },
  { text: 'three-second', start: 1.884, end: 2.324 },
  { text: 'memory.', start: 2.404, end: 2.844 },
  { text: 'Scientists', start: 3.294, end: 3.784 },
  { text: 'taught', start: 3.884, end: 4.084 },
  { text: 'goldfish', start: 4.164, end: 4.644 },
  { text: 'to', start: 4.724, end: 4.804 },
  { text: 'push', start: 4.884, end: 4.964 },
  { text: 'a', start: 5.044, end: 5.124 },
  { text: 'lever', start: 5.284, end: 5.444 },
  { text: 'for', start: 5.564, end: 5.684 },
  { text: 'food.', start: 5.844, end: 6.064 },
  { text: 'Then', start: 6.394, end: 6.644 },
  { text: 'the', start: 6.724, end: 6.804 },
  { text: 'lever', start: 6.884, end: 7.164 },
  { text: 'only', start: 7.224, end: 7.524 },
  { text: 'worked', start: 7.604, end: 7.924 },
  { text: 'for', start: 8.164, end: 8.484 },
  { text: 'one', start: 8.564, end: 8.644 },
  { text: 'hour', start: 8.724, end: 9.044 },
  { text: 'a', start: 9.124, end: 9.284 },
  { text: 'day\u2026', start: 9.444, end: 9.664 },
  { text: 'and', start: 10.024, end: 10.164 },
  { text: 'the', start: 10.244, end: 10.324 },
  { text: 'goldfish', start: 10.484, end: 10.804 },
  { text: 'learned', start: 10.884, end: 11.284 },
  { text: 'WHEN', start: 11.324, end: 11.524 },
  { text: 'to', start: 11.604, end: 11.684 },
  { text: 'push', start: 11.764, end: 11.924 },
  { text: 'it.', start: 12.004, end: 12.174 },
  { text: 'Goldfish', start: 12.534, end: 12.964 },
  { text: 'can', start: 13.044, end: 13.124 },
  { text: 'remember', start: 13.324, end: 13.524 },
  { text: 'things', start: 13.644, end: 13.764 },
  { text: 'for', start: 13.924, end: 14.084 },
  { text: 'MONTHS.', start: 14.244, end: 14.804 },
  { text: 'So,', start: 15.404, end: 15.904 },
  { text: 'for', start: 16.004, end: 16.084 },
  { text: 'the', start: 16.124, end: 16.164 },
  { text: 'record:', start: 16.244, end: 16.711 },
];
