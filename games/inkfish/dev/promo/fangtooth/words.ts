/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator", take 1 of 4, sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo. WORDS are its words with start and end times in the
 * original take (ElevenLabs Scribe), so divide by TEMPO for voice.mp3.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…tiny body, giant bite, because / this fish has the biggest teeth in the ocean, for its size."
 */
export const TEMPO = 1.105;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0, end: 0.21 },
  { text: 'fish', start: 0.24, end: 0.5 },
  { text: 'has', start: 0.56, end: 0.747 },
  { text: 'the', start: 0.8, end: 1.04 },
  { text: 'biggest', start: 1.12, end: 1.46 },
  { text: 'teeth', start: 1.52, end: 1.733 },
  { text: 'in', start: 1.76, end: 1.88 },
  { text: 'the', start: 1.92, end: 2.053 },
  { text: 'ocean,', start: 2.08, end: 2.72 },
  { text: 'for', start: 2.8, end: 2.88 },
  { text: 'its', start: 2.96, end: 3.04 },
  { text: 'size.', start: 3.28, end: 4 },
  { text: 'The', start: 4.08, end: 4.16 },
  { text: 'fangtooth', start: 4.32, end: 4.72 },
  { text: 'is', start: 4.8, end: 4.88 },
  { text: 'smaller', start: 4.96, end: 5.28 },
  { text: 'than', start: 5.36, end: 5.44 },
  { text: 'your', start: 5.52, end: 5.68 },
  { text: 'hand,', start: 5.88, end: 6.4 },
  { text: 'but', start: 6.44, end: 6.48 },
  { text: 'its', start: 6.56, end: 6.72 },
  { text: 'fangs', start: 6.8, end: 7.12 },
  { text: 'are', start: 7.2, end: 7.44 },
  { text: 'so', start: 7.56, end: 7.68 },
  { text: 'long', start: 7.76, end: 8.24 },
  { text: 'that', start: 8.32, end: 8.4 },
  { text: 'when', start: 8.48, end: 8.56 },
  { text: 'it', start: 8.64, end: 8.72 },
  { text: 'shuts', start: 8.76, end: 8.96 },
  { text: 'its', start: 9.04, end: 9.2 },
  { text: 'mouth,', start: 9.48, end: 9.84 },
  { text: 'they', start: 9.92, end: 10 },
  { text: 'slide', start: 10.16, end: 10.32 },
  { text: 'into', start: 10.48, end: 10.64 },
  { text: 'two', start: 10.72, end: 10.8 },
  { text: 'sockets', start: 10.96, end: 11.36 },
  { text: 'beside', start: 11.44, end: 11.68 },
  { text: 'its', start: 11.8, end: 11.92 },
  { text: 'brain.', start: 12.12, end: 13.28 },
  { text: 'Down', start: 13.32, end: 13.36 },
  { text: 'in', start: 13.44, end: 13.52 },
  { text: 'the', start: 13.68, end: 13.84 },
  { text: 'dark,', start: 14.08, end: 14.24 },
  { text: 'it', start: 14.36, end: 14.48 },
  { text: 'can', start: 14.6, end: 14.72 },
  { text: 'barely', start: 14.88, end: 15.2 },
  { text: 'see.', start: 15.76, end: 15.84 },
  { text: 'So', start: 15.92, end: 16 },
  { text: 'it', start: 16.08, end: 16.24 },
  { text: 'hangs', start: 16.32, end: 16.96 },
  { text: 'still,', start: 17.04, end: 17.2 },
  { text: 'and', start: 17.28, end: 17.36 },
  { text: 'snaps', start: 17.6, end: 17.84 },
  { text: 'at', start: 17.92, end: 18.24 },
  { text: 'anything', start: 18.32, end: 18.4 },
  { text: 'that', start: 18.52, end: 18.64 },
  { text: 'brushes', start: 18.8, end: 19.2 },
  { text: 'past.', start: 19.76, end: 20.08 },
  { text: 'Tiny', start: 20.16, end: 20.48 },
  { text: 'body,', start: 20.88, end: 20.96 },
  { text: 'giant', start: 21.28, end: 21.68 },
  { text: 'bite,', start: 22.08, end: 22.64 },
  { text: 'because', start: 22.8, end: 22.88 },
];
