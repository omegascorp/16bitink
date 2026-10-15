/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator" (eleven_v4), the directed read (audio tags, "DOG" in
 * caps), take 3 of 4 (generation X8OMGmAkju3uDSdAvIjc), sped up by TEMPO
 * (pitch kept) with ffmpeg's atempo. WORDS are its words with start and end
 * times in the original take (ElevenLabs Scribe; the tags it echoed are left
 * out, and the word edges next to them moved to where the take's silences
 * say they are), so divide by TEMPO for voice.mp3.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Dogs do. Cats do. But somehow, / this fish passed a test your dog fails."
 */
export const TEMPO = 1.0915;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.08, end: 0.32 },
  { text: 'fish', start: 0.48, end: 0.72 },
  { text: 'passed', start: 0.88, end: 1.12 },
  { text: 'a', start: 1.2, end: 1.28 },
  { text: 'test', start: 1.44, end: 1.6 },
  { text: 'your', start: 1.72, end: 1.84 },
  { text: 'DOG', start: 1.92, end: 2.24 },
  { text: 'fails.', start: 2.32, end: 2.78 },
  { text: 'Scientists', start: 3.32, end: 3.92 },
  { text: 'put', start: 4, end: 4.08 },
  { text: 'a', start: 4.16, end: 4.24 },
  { text: 'brown', start: 4.32, end: 4.56 },
  { text: 'mark', start: 4.64, end: 4.88 },
  { text: 'on', start: 4.92, end: 4.96 },
  { text: 'a', start: 5.04, end: 5.12 },
  { text: 'cleaner', start: 5.24, end: 5.44 },
  { text: "wrasse's", start: 5.48, end: 5.92 },
  { text: 'throat,', start: 6.12, end: 6.37 },
  { text: 'a', start: 6.8, end: 6.88 },
  { text: 'spot', start: 7.04, end: 7.2 },
  { text: 'it', start: 7.24, end: 7.28 },
  { text: 'could', start: 7.36, end: 7.52 },
  { text: 'only', start: 7.6, end: 7.92 },
  { text: 'see', start: 8, end: 8.08 },
  { text: 'in', start: 8.12, end: 8.16 },
  { text: 'a', start: 8.24, end: 8.32 },
  { text: 'mirror.', start: 8.48, end: 8.72 },
  { text: 'It', start: 9.08, end: 9.2 },
  { text: 'looked…', start: 9.28, end: 9.62 },
  { text: 'then', start: 9.94, end: 10.08 },
  { text: 'scraped', start: 10.16, end: 10.56 },
  { text: 'its', start: 10.64, end: 10.72 },
  { text: 'throat', start: 10.8, end: 10.96 },
  { text: 'on', start: 11.04, end: 11.12 },
  { text: 'the', start: 11.2, end: 11.28 },
  { text: 'sand,', start: 11.48, end: 11.84 },
  { text: 'trying', start: 11.96, end: 12.08 },
  { text: 'to', start: 12.16, end: 12.24 },
  { text: 'rub', start: 12.32, end: 12.4 },
  { text: 'it', start: 12.44, end: 12.48 },
  { text: 'off!', start: 12.56, end: 12.9 },
  { text: "That's", start: 13.36, end: 13.68 },
  { text: 'the', start: 13.76, end: 13.88 },
  { text: 'mirror', start: 14, end: 14.24 },
  { text: 'test.', start: 14.32, end: 14.69 },
  { text: 'Most', start: 15.08, end: 15.2 },
  { text: 'animals', start: 15.4, end: 15.6 },
  { text: 'fail', start: 15.68, end: 15.92 },
  { text: 'it.', start: 16, end: 16.12 },
  { text: 'Dogs', start: 16.5, end: 16.8 },
  { text: 'do.', start: 16.92, end: 17.1 },
  { text: 'Cats', start: 17.37, end: 17.68 },
  { text: 'do.', start: 17.76, end: 17.95 },
  { text: 'But', start: 18.34, end: 18.46 },
  { text: 'somehow,', start: 18.64, end: 19.32 },
];
