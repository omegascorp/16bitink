/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator" (eleven_v4), directed take 4 of 4 (generation
 * xMHQw8BiKslhk4Iyj7Yb), sped up by TEMPO (pitch kept) with ffmpeg's atempo.
 * WORDS are its words with start and end times in the original take
 * (ElevenLabs Scribe), so divide by TEMPO for voice.mp3. The audio tags
 * aren't spoken and are left out; the chuckle after "bidding." keeps its gap.
 * Scribe ran the last word on to the end of the file: its end here is where
 * the take falls silent (ffmpeg silencedetect).
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…But on that winter morning, / this fish sold for three MILLION dollars."
 */
export const TEMPO = 1.107;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.08, end: 0.32 },
  { text: 'fish', start: 0.4, end: 0.64 },
  { text: 'sold', start: 0.72, end: 0.96 },
  { text: 'for', start: 1.08, end: 1.2 },
  { text: 'three', start: 1.36, end: 1.52 },
  { text: 'MILLION', start: 1.76, end: 2.08 },
  { text: 'dollars.', start: 2.24, end: 3 },
  { text: 'One', start: 3.36, end: 3.52 },
  { text: 'bluefin', start: 3.68, end: 4.08 },
  { text: 'tuna,', start: 4.16, end: 4.8 },
  { text: 'two', start: 4.88, end: 4.96 },
  { text: 'hundred', start: 5.12, end: 5.36 },
  { text: 'and', start: 5.48, end: 5.6 },
  { text: 'seventy-eight', start: 5.64, end: 6.08 },
  { text: 'kilos,', start: 6.24, end: 6.88 },
  { text: 'at', start: 6.92, end: 6.96 },
  { text: 'the', start: 7.04, end: 7.2 },
  { text: 'first', start: 7.32, end: 7.44 },
  { text: 'auction', start: 7.52, end: 7.84 },
  { text: 'of', start: 7.92, end: 8 },
  { text: '2019', start: 8.16, end: 8.88 },
  { text: 'in', start: 8.96, end: 9.12 },
  { text: 'Tokyo.', start: 9.28, end: 10 },
  { text: 'The', start: 10.08, end: 10.16 },
  { text: 'first', start: 10.28, end: 10.4 },
  { text: 'tuna', start: 10.48, end: 10.72 },
  { text: 'of', start: 10.8, end: 10.88 },
  { text: 'the', start: 10.92, end: 10.96 },
  { text: 'year', start: 11.04, end: 11.28 },
  { text: 'brings', start: 11.32, end: 11.52 },
  { text: 'luck,', start: 11.68, end: 12.16 },
  { text: 'and', start: 12.28, end: 12.4 },
  { text: 'headlines,', start: 12.52, end: 13.2 },
  { text: 'so', start: 13.28, end: 13.52 },
  { text: 'a', start: 13.6, end: 13.68 },
  { text: 'sushi', start: 13.72, end: 14 },
  { text: 'boss', start: 14.08, end: 14.32 },
  { text: 'kept', start: 14.4, end: 14.64 },
  { text: 'on', start: 14.72, end: 14.8 },
  { text: 'bidding.', start: 14.88, end: 15.44 },
  { text: "He'd", start: 16.12, end: 16.32 },
  { text: 'planned', start: 16.36, end: 16.56 },
  { text: 'to', start: 16.6, end: 16.64 },
  { text: 'pay', start: 16.72, end: 16.8 },
  { text: 'a', start: 16.92, end: 17.04 },
  { text: 'fraction', start: 17.24, end: 17.44 },
  { text: 'of', start: 17.48, end: 17.52 },
  { text: 'that.', start: 17.6, end: 18.08 },
  { text: 'But', start: 18.453, end: 18.48 },
  { text: 'on', start: 18.56, end: 18.64 },
  { text: 'that', start: 18.72, end: 18.8 },
  { text: 'winter', start: 18.88, end: 19.12 },
  { text: 'morning,', start: 19.2, end: 19.59 },
];
