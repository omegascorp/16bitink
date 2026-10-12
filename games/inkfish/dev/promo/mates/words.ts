/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator", take 2 of 4, sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo. WORDS are its words with start and end times in the
 * original take (ElevenLabs Scribe), so divide by TEMPO for voice.mp3.
 *
 * The script ends mid-sentence ("…so rare that") so the loop's first line
 * finishes it: "…so rare that this tiny fish is about to become part of her body."
 */
export const TEMPO = 1.109;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0, end: 0.21 },
  { text: 'tiny', start: 0.24, end: 0.64 },
  { text: 'fish', start: 0.72, end: 1.2 },
  { text: 'is', start: 1.36, end: 1.44 },
  { text: 'about', start: 1.56, end: 1.68 },
  { text: 'to', start: 1.76, end: 1.8 },
  { text: 'become', start: 1.84, end: 2.08 },
  { text: 'part', start: 2.24, end: 2.48 },
  { text: 'of', start: 2.52, end: 2.56 },
  { text: 'her', start: 2.64, end: 2.8 },
  { text: 'body.', start: 2.88, end: 3.28 },
  { text: "He's", start: 3.76, end: 3.92 },
  { text: 'a', start: 4, end: 4.08 },
  { text: 'male', start: 4.16, end: 4.4 },
  { text: 'anglerfish.', start: 4.48, end: 5.44 },
  { text: 'She', start: 5.68, end: 5.76 },
  { text: 'can', start: 5.84, end: 5.92 },
  { text: 'be', start: 6, end: 6.16 },
  { text: 'sixty', start: 6.32, end: 6.64 },
  { text: 'times', start: 6.72, end: 7.12 },
  { text: 'longer', start: 7.2, end: 7.52 },
  { text: 'than', start: 7.6, end: 7.68 },
  { text: 'him.', start: 7.76, end: 8 },
  { text: 'When', start: 8.48, end: 8.56 },
  { text: 'he', start: 8.64, end: 8.72 },
  { text: 'finds', start: 8.8, end: 9.08 },
  { text: 'her', start: 9.12, end: 9.2 },
  { text: 'in', start: 9.24, end: 9.28 },
  { text: 'the', start: 9.36, end: 9.44 },
  { text: 'dark,', start: 9.64, end: 10.16 },
  { text: 'he', start: 10.28, end: 10.4 },
  { text: 'bites…', start: 10.44, end: 11.28 },
  { text: 'and', start: 11.36, end: 11.44 },
  { text: 'never', start: 11.6, end: 11.84 },
  { text: 'lets', start: 11.92, end: 12.08 },
  { text: 'go.', start: 12.16, end: 12.48 },
  { text: 'His', start: 12.96, end: 13.04 },
  { text: 'mouth', start: 13.2, end: 13.52 },
  { text: 'fuses', start: 13.6, end: 14.08 },
  { text: 'to', start: 14.12, end: 14.16 },
  { text: 'her', start: 14.24, end: 14.32 },
  { text: 'skin.', start: 14.4, end: 15 },
  { text: 'Their', start: 15.2, end: 15.36 },
  { text: 'blood', start: 15.48, end: 15.6 },
  { text: 'vessels', start: 15.68, end: 16.08 },
  { text: 'join.', start: 16.16, end: 16.84 },
  { text: 'Some', start: 17.12, end: 17.28 },
  { text: 'females', start: 17.36, end: 17.76 },
  { text: 'carry', start: 17.84, end: 18.08 },
  { text: 'up', start: 18.16, end: 18.24 },
  { text: 'to', start: 18.36, end: 18.48 },
  { text: 'eight', start: 18.56, end: 18.72 },
  { text: 'males', start: 18.8, end: 19.12 },
  { text: 'at', start: 19.2, end: 19.28 },
  { text: 'once.', start: 19.36, end: 20 },
  { text: 'Down', start: 20.24, end: 20.48 },
  { text: 'here,', start: 20.64, end: 21.12 },
  { text: 'a', start: 21.2, end: 21.28 },
  { text: 'partner', start: 21.36, end: 21.68 },
  { text: 'is', start: 21.76, end: 22 },
  { text: 'so', start: 22.12, end: 22.24 },
  { text: 'rare', start: 22.32, end: 22.64 },
  { text: 'that', start: 22.72, end: 22.96 },
];
