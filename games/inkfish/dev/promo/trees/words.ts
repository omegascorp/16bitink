/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator" (eleven_v4), the directed read (audio tags and caps
 * emphasis), take 4 of 4, its first 0.12 s of silence trimmed, then sped up
 * by TEMPO (pitch kept) with ffmpeg's atempo. WORDS are its words with start
 * and end times in the trimmed take (ElevenLabs Scribe, less the 0.12 s), so
 * divide by TEMPO for voice.mp3. Two times are fixed from the waveform: the
 * first word starts where the sound does, and the last ends where it fades
 * out (Scribe ran both out to the file's edges).
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So next time you walk through a forest, remember: / sharks are older than trees."
 */
export const TEMPO = 1.125;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'Sharks', start: 0.033, end: 0.6 },
  { text: 'are', start: 0.68, end: 0.92 },
  { text: 'older', start: 1, end: 1.32 },
  { text: 'than', start: 1.44, end: 1.56 },
  { text: 'TREES.', start: 1.64, end: 2.56 },
  { text: 'The', start: 2.888, end: 2.92 },
  { text: 'first', start: 3, end: 3.24 },
  { text: 'sharks', start: 3.32, end: 3.64 },
  { text: 'swam', start: 3.68, end: 3.88 },
  { text: 'about', start: 3.96, end: 4.28 },
  { text: 'four', start: 4.36, end: 4.44 },
  { text: 'hundred', start: 4.52, end: 4.76 },
  { text: 'and', start: 4.88, end: 5 },
  { text: 'fifty', start: 5.107, end: 5.32 },
  { text: 'million', start: 5.56, end: 5.88 },
  { text: 'years', start: 5.96, end: 6.12 },
  { text: 'ago.', start: 6.2, end: 6.867 },
  { text: 'The', start: 6.893, end: 6.92 },
  { text: 'first', start: 7, end: 7.24 },
  { text: 'trees', start: 7.32, end: 7.72 },
  { text: 'grew', start: 7.8, end: 7.88 },
  { text: 'around', start: 7.96, end: 8.36 },
  { text: 'sixty', start: 8.48, end: 8.68 },
  { text: 'million', start: 8.76, end: 9 },
  { text: 'years', start: 9.08, end: 9.24 },
  { text: 'later.', start: 9.32, end: 10.04 },
  { text: 'Sharks', start: 10.2, end: 10.52 },
  { text: 'survived', start: 10.6, end: 10.92 },
  { text: 'the', start: 11, end: 11.08 },
  { text: 'asteroid', start: 11.24, end: 11.56 },
  { text: 'that', start: 11.68, end: 11.8 },
  { text: 'wiped', start: 11.88, end: 12.04 },
  { text: 'out', start: 12.12, end: 12.2 },
  { text: 'the', start: 12.28, end: 12.36 },
  { text: 'dinosaurs,', start: 12.48, end: 13.267 },
  { text: 'and', start: 13.293, end: 13.32 },
  { text: "they're", start: 13.4, end: 13.64 },
  { text: 'still', start: 13.72, end: 13.88 },
  { text: 'at', start: 13.92, end: 13.96 },
  { text: 'the', start: 14.04, end: 14.12 },
  { text: 'top', start: 14.2, end: 14.28 },
  { text: 'of', start: 14.32, end: 14.36 },
  { text: 'the', start: 14.44, end: 14.52 },
  { text: 'food', start: 14.64, end: 14.76 },
  { text: 'chain.', start: 14.84, end: 15.48 },
  { text: 'So', start: 15.56, end: 15.72 },
  { text: 'next', start: 15.84, end: 15.96 },
  { text: 'time', start: 16.04, end: 16.12 },
  { text: 'you', start: 16.2, end: 16.28 },
  { text: 'walk', start: 16.36, end: 16.52 },
  { text: 'through', start: 16.6, end: 16.68 },
  { text: 'a', start: 16.84, end: 17 },
  { text: 'forest,', start: 17.16, end: 17.64 },
  { text: 'remember:', start: 17.72, end: 18.23 },
];
