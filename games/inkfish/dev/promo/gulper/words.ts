/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator" (eleven_v4), take 1 of 4, sped up by TEMPO (pitch kept)
 * with ffmpeg's atempo. WORDS are its words with start and end times in the
 * original take (ElevenLabs Scribe), so divide by TEMPO for voice.mp3.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…It mostly eats tiny shrimp. Still, / its mouth is bigger than its body."
 */
export const TEMPO = 1.0542;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'Its', start: 0, end: 0.24 },
  { text: 'mouth', start: 0.32, end: 0.64 },
  { text: 'is', start: 0.72, end: 0.96 },
  { text: 'bigger', start: 1, end: 1.28 },
  { text: 'than', start: 1.36, end: 1.44 },
  { text: 'its', start: 1.52, end: 1.6 },
  { text: 'body.', start: 1.68, end: 2.56 },
  { text: 'The', start: 2.64, end: 2.72 },
  { text: 'gulper', start: 2.76, end: 3.12 },
  { text: 'eel', start: 3.24, end: 3.36 },
  { text: 'lives', start: 3.44, end: 3.6 },
  { text: 'up', start: 3.68, end: 3.76 },
  { text: 'to', start: 3.84, end: 4 },
  { text: 'three', start: 4.08, end: 4.24 },
  { text: 'kilometres', start: 4.4, end: 4.96 },
  { text: 'down.', start: 5.04, end: 5.84 },
  { text: 'When', start: 5.96, end: 6.08 },
  { text: 'food', start: 6.2, end: 6.32 },
  { text: 'drifts', start: 6.4, end: 6.72 },
  { text: 'close,', start: 6.92, end: 7.44 },
  { text: 'it', start: 7.52, end: 7.68 },
  { text: 'throws', start: 7.84, end: 8 },
  { text: 'its', start: 8.08, end: 8.24 },
  { text: 'jaws', start: 8.28, end: 8.56 },
  { text: 'open', start: 8.64, end: 8.96 },
  { text: 'and', start: 9.04, end: 9.12 },
  { text: 'balloons', start: 9.24, end: 9.68 },
  { text: 'up,', start: 9.76, end: 10.24 },
  { text: 'swallowing', start: 10.32, end: 10.8 },
  { text: 'water', start: 11, end: 11.2 },
  { text: 'and', start: 11.32, end: 11.44 },
  { text: 'prey', start: 11.52, end: 11.76 },
  { text: 'in', start: 11.88, end: 12 },
  { text: 'one', start: 12.08, end: 12.24 },
  { text: 'gulp,', start: 12.32, end: 13.04 },
  { text: 'then', start: 13.16, end: 13.28 },
  { text: 'squeezes', start: 13.32, end: 13.76 },
  { text: 'the', start: 13.84, end: 13.92 },
  { text: 'water', start: 14.08, end: 14.24 },
  { text: 'out', start: 14.32, end: 14.48 },
  { text: 'through', start: 14.56, end: 14.64 },
  { text: 'its', start: 14.76, end: 14.88 },
  { text: 'gills.', start: 14.92, end: 15.84 },
  { text: 'The', start: 15.88, end: 15.92 },
  { text: 'strange', start: 16, end: 16.24 },
  { text: 'part?', start: 16.32, end: 17.04 },
  { text: 'It', start: 17.16, end: 17.28 },
  { text: 'mostly', start: 17.48, end: 17.68 },
  { text: 'eats', start: 17.72, end: 18 },
  { text: 'tiny', start: 18.2, end: 18.4 },
  { text: 'shrimp.', start: 18.48, end: 19.44 },
  { text: 'Still,', start: 19.64, end: 20.24 },
];
