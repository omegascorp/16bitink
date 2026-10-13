/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator" (eleven_v4), take 1 of 4, sped up by TEMPO (pitch kept)
 * with ffmpeg's atempo. WORDS are its words with start and end times in the
 * original take (ElevenLabs Scribe), so divide by TEMPO for voice.mp3.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Shine a lamp on it, and you'll see why / this fish is blacker than black."
 */
export const TEMPO = 1.1028;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0, end: 0.2 },
  { text: 'fish', start: 0.2, end: 0.24 },
  { text: 'is', start: 0.24, end: 0.32 },
  { text: 'blacker', start: 0.4, end: 1.248 },
  { text: 'than', start: 1.296, end: 1.52 },
  { text: 'black.', start: 1.54, end: 1.92 },
  { text: 'The', start: 2, end: 2.24 },
  { text: 'Pacific', start: 2.8, end: 3.051 },
  { text: "blackdragon's", start: 3.109, end: 3.813 },
  { text: 'skin', start: 3.867, end: 4.2 },
  { text: 'swallows', start: 4.25, end: 4.747 },
  { text: 'ninety-nine', start: 4.8, end: 5.6 },
  { text: 'point', start: 5.76, end: 6 },
  { text: 'nine', start: 6.08, end: 6.24 },
  { text: 'five', start: 6.4, end: 6.56 },
  { text: 'percent', start: 6.72, end: 7.12 },
  { text: 'of', start: 7.2, end: 7.28 },
  { text: 'the', start: 7.32, end: 7.36 },
  { text: 'light', start: 7.44, end: 7.6 },
  { text: 'that', start: 7.68, end: 7.76 },
  { text: 'hits', start: 7.84, end: 8.08 },
  { text: 'it.', start: 8.16, end: 8.64 },
  { text: 'Down', start: 8.96, end: 9.12 },
  { text: 'in', start: 9.2, end: 9.28 },
  { text: 'the', start: 9.32, end: 9.36 },
  { text: 'deep,', start: 9.44, end: 10 },
  { text: 'prey', start: 10.12, end: 10.32 },
  { text: 'glow,', start: 10.4, end: 11.12 },
  { text: 'and', start: 11.2, end: 11.28 },
  { text: 'light', start: 11.36, end: 11.6 },
  { text: 'bouncing', start: 11.64, end: 11.92 },
  { text: 'off', start: 12, end: 12.08 },
  { text: 'a', start: 12.12, end: 12.16 },
  { text: 'hunter', start: 12.24, end: 12.56 },
  { text: 'would', start: 12.68, end: 12.8 },
  { text: 'give', start: 12.84, end: 12.88 },
  { text: 'it', start: 12.96, end: 13 },
  { text: 'away.', start: 13.04, end: 13.72 },
  { text: 'So', start: 14, end: 14.08 },
  { text: 'its', start: 14.16, end: 14.24 },
  { text: 'skin', start: 14.32, end: 14.56 },
  { text: 'is', start: 14.68, end: 14.8 },
  { text: 'packed', start: 14.96, end: 15.12 },
  { text: 'with', start: 15.24, end: 15.36 },
  { text: 'pigment', start: 15.48, end: 15.76 },
  { text: 'that', start: 15.88, end: 16 },
  { text: 'traps', start: 16.08, end: 16.4 },
  { text: 'the', start: 16.44, end: 16.48 },
  { text: 'light.', start: 16.56, end: 17.28 },
  { text: 'Shine', start: 17.32, end: 17.52 },
  { text: 'a', start: 17.6, end: 17.64 },
  { text: 'lamp', start: 17.68, end: 17.84 },
  { text: 'on', start: 17.92, end: 18 },
  { text: 'it,', start: 18.08, end: 18.4 },
  { text: 'and', start: 18.44, end: 18.48 },
  { text: "you'll", start: 18.56, end: 18.72 },
  { text: 'see', start: 18.8, end: 18.88 },
  { text: 'why', start: 18.96, end: 19.52 },
];
