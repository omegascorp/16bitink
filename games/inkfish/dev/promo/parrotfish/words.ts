/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator" (eleven_v4), take 1 of 4, sped up by TEMPO (pitch kept)
 * with ffmpeg's atempo. WORDS are its words with start and end times in the
 * original take (ElevenLabs Scribe), so divide by TEMPO for voice.mp3.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…remember: / white sand beaches are fish poop."
 */
export const TEMPO = 1.116;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'White', start: 0, end: 0.288 },
  { text: 'sand', start: 0.32, end: 0.53 },
  { text: 'beaches', start: 0.56, end: 1.2 },
  { text: 'are', start: 1.32, end: 1.44 },
  { text: 'fish', start: 1.56, end: 1.68 },
  { text: 'poop.', start: 1.76, end: 2.64 },
  { text: 'Parrotfish', start: 2.72, end: 3.28 },
  { text: 'bite', start: 3.4, end: 3.52 },
  { text: 'off', start: 3.6, end: 3.68 },
  { text: 'chunks', start: 3.76, end: 4 },
  { text: 'of', start: 4.08, end: 4.16 },
  { text: 'coral,', start: 4.28, end: 4.8 },
  { text: 'grind', start: 4.88, end: 5.12 },
  { text: 'them', start: 5.2, end: 5.28 },
  { text: 'up', start: 5.36, end: 5.44 },
  { text: 'in', start: 5.48, end: 5.52 },
  { text: 'their', start: 5.6, end: 5.68 },
  { text: 'throats,', start: 5.76, end: 6.4 },
  { text: 'and', start: 6.48, end: 6.56 },
  { text: 'poop', start: 6.6, end: 6.8 },
  { text: 'out', start: 6.96, end: 7.12 },
  { text: 'fine', start: 7.32, end: 7.52 },
  { text: 'white', start: 7.68, end: 7.84 },
  { text: 'sand.', start: 8.04, end: 8.72 },
  { text: 'A', start: 8.8, end: 8.88 },
  { text: 'big', start: 9, end: 9.12 },
  { text: 'one', start: 9.2, end: 9.36 },
  { text: 'can', start: 9.44, end: 9.52 },
  { text: 'make', start: 9.6, end: 9.84 },
  { text: 'hundreds', start: 9.88, end: 10.24 },
  { text: 'of', start: 10.32, end: 10.4 },
  { text: 'kilos', start: 10.52, end: 10.8 },
  { text: 'a', start: 10.84, end: 10.88 },
  { text: 'year.', start: 10.96, end: 11.68 },
  { text: 'One', start: 11.76, end: 11.92 },
  { text: 'island', start: 12, end: 12.32 },
  { text: 'in', start: 12.36, end: 12.4 },
  { text: 'the', start: 12.44, end: 12.48 },
  { text: 'Maldives', start: 12.56, end: 13.04 },
  { text: 'is', start: 13.12, end: 13.36 },
  { text: 'mostly', start: 13.56, end: 13.76 },
  { text: 'made', start: 13.84, end: 13.92 },
  { text: 'of', start: 13.96, end: 14 },
  { text: 'it.', start: 14.08, end: 14.76 },
  { text: 'So', start: 14.8, end: 15.2 },
  { text: 'next', start: 15.28, end: 15.52 },
  { text: 'time', start: 15.6, end: 15.68 },
  { text: 'you', start: 15.76, end: 15.84 },
  { text: 'lie', start: 15.92, end: 16 },
  { text: 'on', start: 16.04, end: 16.08 },
  { text: 'a', start: 16.16, end: 16.24 },
  { text: 'tropical', start: 16.373, end: 16.64 },
  { text: 'beach,', start: 16.72, end: 17.28 },
  { text: 'remember:', start: 17.36, end: 18.08 },
];
