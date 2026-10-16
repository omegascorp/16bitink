/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), re-voiced 2026-10-16: take 1 of two (generation
 * f3rMWpZBzSFPhcogrJbh), its first 0.079 s of silence trimmed, then sped up by
 * TEMPO (pitch kept) with ffmpeg's atempo. WORDS are its words with start and
 * end times in the trimmed take (ElevenLabs Scribe, less the 0.079 s), so
 * divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped, and
 * word edges are fixed from the waveform: Scribe runs words across the tags and
 * pauses, so a word starts where the sound comes back after a pause and the
 * word before ends where the pause begins; the first word starts where the
 * sound does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So yes, believe it or not: / fish CAN drown."
 */
export const TEMPO = 1.1483;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'Fish', start: 0.02, end: 0.241 },
  { text: 'CAN', start: 0.321, end: 0.481 },
  { text: 'drown.', start: 0.561, end: 1.161 },
  { text: 'A', start: 1.691, end: 1.761 },
  { text: 'tuna', start: 1.841, end: 2.161 },
  { text: 'breathes', start: 2.241, end: 2.641 },
  { text: 'by', start: 2.721, end: 2.881 },
  { text: 'swimming', start: 2.961, end: 3.201 },
  { text: 'with', start: 3.241, end: 3.281 },
  { text: 'its', start: 3.361, end: 3.601 },
  { text: 'mouth', start: 3.721, end: 3.841 },
  { text: 'open,', start: 3.921, end: 4.271 },
  { text: 'pushing', start: 4.401, end: 4.721 },
  { text: 'water', start: 4.801, end: 5.121 },
  { text: 'over', start: 5.201, end: 5.281 },
  { text: 'its', start: 5.401, end: 5.471 },
  { text: 'gills.', start: 5.531, end: 5.941 },
  { text: 'If', start: 6.481, end: 6.561 },
  { text: 'it', start: 6.641, end: 6.721 },
  { text: 'stops', start: 6.881, end: 7.041 },
  { text: 'swimming,', start: 7.081, end: 7.561 },
  { text: 'it', start: 8.031, end: 8.161 },
  { text: 'suffocates.', start: 8.241, end: 8.901 },
  { text: 'So', start: 9.341, end: 9.521 },
  { text: 'it', start: 9.601, end: 9.761 },
  { text: 'never', start: 9.841, end: 10.081 },
  { text: 'stops.', start: 10.161, end: 10.631 },
  { text: 'Not', start: 10.941, end: 11.121 },
  { text: 'to', start: 11.201, end: 11.281 },
  { text: 'rest.', start: 11.361, end: 11.721 },
  { text: 'Not', start: 12.061, end: 12.241 },
  { text: 'even', start: 12.321, end: 12.481 },
  { text: 'to', start: 12.601, end: 12.721 },
  { text: 'SLEEP.', start: 12.761, end: 13.191 },
  { text: 'A', start: 13.601, end: 13.681 },
  { text: 'bluefin', start: 13.761, end: 14.161 },
  { text: 'can', start: 14.241, end: 14.401 },
  { text: 'swim', start: 14.441, end: 14.561 },
  { text: 'across', start: 14.641, end: 14.961 },
  { text: 'an', start: 15.041, end: 15.081 },
  { text: 'entire', start: 15.121, end: 15.761 },
  { text: 'ocean.', start: 15.841, end: 16.331 },
  { text: 'So', start: 16.851, end: 17.041 },
  { text: 'yes,', start: 17.201, end: 17.701 },
  { text: 'believe', start: 17.781, end: 18.081 },
  { text: 'it', start: 18.121, end: 18.161 },
  { text: 'or', start: 18.201, end: 18.241 },
  { text: 'not:', start: 18.321, end: 18.602 },
];
