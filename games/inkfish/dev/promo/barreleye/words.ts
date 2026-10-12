/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator", take 3 of 4, sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo. WORDS are its words with start and end times in the
 * original take (ElevenLabs Scribe), so divide by TEMPO for voice.mp3.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…because unlike most fish, / this fish can see through its own head."
 */
export const TEMPO = 1.082;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0, end: 0.24 },
  { text: 'fish', start: 0.4, end: 0.72 },
  { text: 'can', start: 0.88, end: 1.04 },
  { text: 'see', start: 1.12, end: 1.36 },
  { text: 'through', start: 1.44, end: 1.52 },
  { text: 'its', start: 1.64, end: 1.76 },
  { text: 'own', start: 1.84, end: 2 },
  { text: 'head.', start: 2.08, end: 2.76 },
  { text: 'The', start: 3.04, end: 3.12 },
  { text: 'barreleye', start: 3.2, end: 3.68 },
  { text: 'lives', start: 3.72, end: 4 },
  { text: 'seven', start: 4.16, end: 4.32 },
  { text: 'hundred', start: 4.4, end: 4.64 },
  { text: 'metres', start: 4.72, end: 5.04 },
  { text: 'down.', start: 5.12, end: 5.8 },
  { text: 'Those', start: 6.08, end: 6.24 },
  { text: 'two', start: 6.32, end: 6.4 },
  { text: 'dots', start: 6.48, end: 6.8 },
  { text: "aren't", start: 6.88, end: 7.12 },
  { text: 'its', start: 7.2, end: 7.28 },
  { text: 'eyes.', start: 7.36, end: 7.92 },
  { text: "They're", start: 8.08, end: 8.16 },
  { text: 'its', start: 8.24, end: 8.4 },
  { text: 'nostrils.', start: 8.48, end: 9.28 },
  { text: 'Its', start: 9.52, end: 9.76 },
  { text: 'real', start: 9.84, end: 10.08 },
  { text: 'eyes', start: 10.16, end: 10.48 },
  { text: 'are', start: 10.56, end: 10.64 },
  { text: 'the', start: 10.72, end: 10.8 },
  { text: 'glowing', start: 10.88, end: 11.2 },
  { text: 'green', start: 11.28, end: 11.52 },
  { text: 'domes', start: 11.6, end: 12 },
  { text: 'inside', start: 12.2, end: 12.4 },
  { text: 'its', start: 12.52, end: 12.64 },
  { text: 'clear', start: 12.8, end: 12.96 },
  { text: 'head,', start: 13.04, end: 13.6 },
  { text: 'staring', start: 13.68, end: 14.08 },
  { text: 'straight', start: 14.28, end: 14.48 },
  { text: 'up', start: 14.56, end: 14.72 },
  { text: 'for', start: 14.76, end: 14.8 },
  { text: 'the', start: 14.88, end: 14.96 },
  { text: 'shadows', start: 15.04, end: 15.36 },
  { text: 'of', start: 15.44, end: 15.52 },
  { text: 'prey.', start: 15.6, end: 16.2 },
  { text: 'When', start: 16.48, end: 16.56 },
  { text: 'it', start: 16.64, end: 16.72 },
  { text: 'spots', start: 16.88, end: 17.04 },
  { text: 'one,', start: 17.12, end: 17.6 },
  { text: 'its', start: 17.72, end: 17.84 },
  { text: 'eyes', start: 18, end: 18.16 },
  { text: 'swivel', start: 18.24, end: 18.56 },
  { text: 'forward,', start: 18.64, end: 19.12 },
  { text: 'and', start: 19.24, end: 19.36 },
  { text: 'up', start: 19.44, end: 19.52 },
  { text: 'it', start: 19.6, end: 19.68 },
  { text: 'goes.', start: 19.76, end: 20.56 },
  { text: 'Because', start: 20.8, end: 21.04 },
  { text: 'unlike', start: 21.12, end: 21.44 },
  { text: 'most', start: 21.56, end: 21.68 },
  { text: 'fish,', start: 21.76, end: 22.4 },
];
