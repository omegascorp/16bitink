/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator" (eleven_v4), take 2 of 4, sped up by TEMPO (pitch
 * kept) with ffmpeg's atempo. WORDS are its words with start and end times
 * in the original take (ElevenLabs Scribe), so divide by TEMPO for voice.mp3.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So when the barracuda ate Nemo's mother, / Nemo's dad should have become his mom."
 */
export const TEMPO = 1.075;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: "Nemo's", start: 0, end: 0.48 },
  { text: 'dad', start: 0.56, end: 0.88 },
  { text: 'should', start: 0.96, end: 1.04 },
  { text: 'have', start: 1.12, end: 1.2 },
  { text: 'become', start: 1.28, end: 1.44 },
  { text: 'his', start: 1.52, end: 1.68 },
  { text: 'mom.', start: 1.76, end: 2.16 },
  { text: 'Every', start: 2.64, end: 2.88 },
  { text: 'clownfish', start: 2.96, end: 3.52 },
  { text: 'is', start: 3.6, end: 3.68 },
  { text: 'born', start: 3.76, end: 4 },
  { text: 'male.', start: 4.08, end: 4.48 },
  { text: 'They', start: 4.96, end: 5.04 },
  { text: 'live', start: 5.12, end: 5.36 },
  { text: 'in', start: 5.44, end: 5.48 },
  { text: 'an', start: 5.52, end: 5.6 },
  { text: 'anemone,', start: 5.68, end: 6.4 },
  { text: 'ranked', start: 6.48, end: 6.72 },
  { text: 'by', start: 6.8, end: 6.88 },
  { text: 'size:', start: 6.96, end: 7.84 },
  { text: 'the', start: 7.88, end: 7.92 },
  { text: 'biggest', start: 8, end: 8.4 },
  { text: 'is', start: 8.48, end: 8.56 },
  { text: 'the', start: 8.6, end: 8.64 },
  { text: 'female,', start: 8.72, end: 9.44 },
  { text: 'the', start: 9.48, end: 9.52 },
  { text: 'next', start: 9.6, end: 9.84 },
  { text: 'biggest', start: 9.92, end: 10.24 },
  { text: 'is', start: 10.32, end: 10.4 },
  { text: 'her', start: 10.48, end: 10.56 },
  { text: 'mate,', start: 10.64, end: 11.2 },
  { text: 'and', start: 11.28, end: 11.36 },
  { text: 'the', start: 11.4, end: 11.44 },
  { text: 'rest', start: 11.6, end: 11.76 },
  { text: 'stay', start: 11.92, end: 12.16 },
  { text: 'small,', start: 12.36, end: 12.8 },
  { text: 'waiting', start: 12.96, end: 13.12 },
  { text: 'their', start: 13.2, end: 13.28 },
  { text: 'turn.', start: 13.36, end: 14 },
  { text: 'When', start: 14.32, end: 14.4 },
  { text: 'the', start: 14.48, end: 14.52 },
  { text: 'female', start: 14.56, end: 14.88 },
  { text: 'dies,', start: 15.04, end: 15.68 },
  { text: 'her', start: 15.76, end: 15.84 },
  { text: 'mate', start: 15.92, end: 16.16 },
  { text: 'turns', start: 16.32, end: 16.52 },
  { text: 'into', start: 16.56, end: 16.72 },
  { text: 'a', start: 16.8, end: 16.88 },
  { text: 'female.', start: 16.96, end: 17.68 },
  { text: 'So', start: 18, end: 18.24 },
  { text: 'when', start: 18.4, end: 18.48 },
  { text: 'the', start: 18.56, end: 18.6 },
  { text: 'barracuda', start: 18.64, end: 19.28 },
  { text: 'ate', start: 19.4, end: 19.52 },
  { text: "Nemo's", start: 19.56, end: 20 },
  { text: 'mother,', start: 20.16, end: 20.64 },
];
