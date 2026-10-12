/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator", take 1 of 4, sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo. WORDS are its words with start and end times in the
 * original take (ElevenLabs Scribe), so divide by TEMPO for voice.mp3.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…remember: / this shark may have been born before Isaac Newton."
 */
export const TEMPO = 1.125;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0, end: 0.24 },
  { text: 'shark', start: 0.32, end: 0.64 },
  { text: 'may', start: 0.72, end: 0.88 },
  { text: 'have', start: 0.96, end: 1.04 },
  { text: 'been', start: 1.12, end: 1.2 },
  { text: 'born', start: 1.28, end: 1.52 },
  { text: 'before', start: 1.76, end: 2 },
  { text: 'Isaac', start: 2.16, end: 2.4 },
  { text: 'Newton.', start: 2.48, end: 3.2 },
  { text: 'Greenland', start: 3.52, end: 3.92 },
  { text: 'sharks', start: 4, end: 4.32 },
  { text: 'grow', start: 4.4, end: 4.56 },
  { text: 'about', start: 4.72, end: 4.88 },
  { text: 'one', start: 4.96, end: 5.12 },
  { text: 'centimetre', start: 5.2, end: 5.76 },
  { text: 'a', start: 5.84, end: 5.92 },
  { text: 'year.', start: 6, end: 6.52 },
  { text: 'Scientists', start: 6.8, end: 7.36 },
  { text: 'aged', start: 7.52, end: 7.68 },
  { text: 'them', start: 7.76, end: 7.84 },
  { text: 'by', start: 7.92, end: 8 },
  { text: 'the', start: 8.04, end: 8.08 },
  { text: 'lenses', start: 8.16, end: 8.56 },
  { text: 'of', start: 8.6, end: 8.64 },
  { text: 'their', start: 8.72, end: 8.88 },
  { text: 'eyes,', start: 9.08, end: 9.52 },
  { text: 'and', start: 9.56, end: 9.6 },
  { text: 'the', start: 9.68, end: 9.84 },
  { text: 'oldest', start: 9.92, end: 10.32 },
  { text: 'came', start: 10.44, end: 10.56 },
  { text: 'out', start: 10.64, end: 10.72 },
  { text: 'at', start: 10.8, end: 10.88 },
  { text: 'around', start: 11.08, end: 11.28 },
  { text: 'four', start: 11.36, end: 11.52 },
  { text: 'hundred', start: 11.68, end: 12.08 },
  { text: 'years.', start: 12.16, end: 13.04 },
  { text: 'They', start: 13.12, end: 13.2 },
  { text: "don't", start: 13.24, end: 13.36 },
  { text: 'even', start: 13.44, end: 13.52 },
  { text: 'have', start: 13.6, end: 13.76 },
  { text: 'babies', start: 13.84, end: 14.24 },
  { text: 'until', start: 14.36, end: 14.48 },
  { text: "they're", start: 14.56, end: 14.64 },
  { text: 'about', start: 14.72, end: 14.88 },
  { text: 'a', start: 14.92, end: 14.96 },
  { text: 'hundred', start: 15.04, end: 15.28 },
  { text: 'and', start: 15.36, end: 15.44 },
  { text: 'fifty.', start: 15.48, end: 16.4 },
  { text: 'So', start: 16.48, end: 16.64 },
  { text: 'if', start: 16.88, end: 17.04 },
  { text: 'you', start: 17.12, end: 17.2 },
  { text: 'ever', start: 17.32, end: 17.44 },
  { text: 'meet', start: 17.52, end: 17.6 },
  { text: 'one', start: 17.68, end: 17.76 },
  { text: 'under', start: 17.84, end: 18 },
  { text: 'the', start: 18.04, end: 18.08 },
  { text: 'Arctic', start: 18.12, end: 18.4 },
  { text: 'ice,', start: 18.48, end: 19.12 },
  { text: 'remember:', start: 19.36, end: 19.92 },
];
