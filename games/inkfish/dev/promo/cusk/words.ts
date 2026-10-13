/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator" (eleven_v4), take 1 of 4, sped up by TEMPO (pitch kept)
 * with ffmpeg's atempo. WORDS are its words with start and end times in the
 * original take (ElevenLabs Scribe), so divide by TEMPO for voice.mp3.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…they took one look and realised: / this fish has no face."
 */
export const TEMPO = 1.0875;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0, end: 0.21 },
  { text: 'fish', start: 0.24, end: 0.56 },
  { text: 'has', start: 0.64, end: 0.907 },
  { text: 'no', start: 0.96, end: 1.2 },
  { text: 'face.', start: 1.28, end: 1.84 },
  { text: 'The', start: 2.4, end: 2.48 },
  { text: 'faceless', start: 2.56, end: 2.96 },
  { text: 'cusk', start: 3.04, end: 3.44 },
  { text: 'lives', start: 3.52, end: 3.84 },
  { text: 'four', start: 3.92, end: 4 },
  { text: 'kilometres', start: 4.08, end: 4.56 },
  { text: 'down,', start: 4.64, end: 5.2 },
  { text: 'where', start: 5.28, end: 5.36 },
  { text: "there's", start: 5.4, end: 5.6 },
  { text: 'no', start: 5.68, end: 5.84 },
  { text: 'light', start: 5.92, end: 6.08 },
  { text: 'at', start: 6.16, end: 6.24 },
  { text: 'all.', start: 6.32, end: 7.04 },
  { text: 'Its', start: 7.16, end: 7.28 },
  { text: 'tiny', start: 7.36, end: 7.68 },
  { text: 'eyes', start: 7.84, end: 8.08 },
  { text: 'are', start: 8.16, end: 8.32 },
  { text: 'buried', start: 8.44, end: 8.72 },
  { text: 'under', start: 8.84, end: 8.96 },
  { text: 'its', start: 9.04, end: 9.12 },
  { text: 'skin,', start: 9.32, end: 9.84 },
  { text: 'and', start: 9.88, end: 9.92 },
  { text: 'its', start: 10.04, end: 10.16 },
  { text: 'mouth', start: 10.32, end: 10.48 },
  { text: 'is', start: 10.56, end: 10.72 },
  { text: 'tucked', start: 10.8, end: 11.04 },
  { text: 'underneath.', start: 11.16, end: 12.16 },
  { text: 'Scientists', start: 12.44, end: 12.72 },
  { text: 'first', start: 12.8, end: 13.04 },
  { text: 'found', start: 13.12, end: 13.28 },
  { text: 'it', start: 13.36, end: 13.44 },
  { text: 'in', start: 13.48, end: 13.52 },
  { text: 'the', start: 13.6, end: 13.68 },
  { text: '1870s.', start: 13.8, end: 15.2 },
  { text: 'When', start: 15.24, end: 15.28 },
  { text: 'Australian', start: 15.36, end: 15.84 },
  { text: 'researchers', start: 16.04, end: 16.48 },
  { text: 'hauled', start: 16.56, end: 16.72 },
  { text: 'one', start: 16.8, end: 16.88 },
  { text: 'up', start: 16.96, end: 17.04 },
  { text: 'again', start: 17.16, end: 17.28 },
  { text: 'in', start: 17.36, end: 17.44 },
  { text: '2017,', start: 17.56, end: 18.8 },
  { text: 'they', start: 18.88, end: 18.96 },
  { text: 'took', start: 19.08, end: 19.2 },
  { text: 'one', start: 19.28, end: 19.44 },
  { text: 'look', start: 19.52, end: 19.84 },
  { text: 'and', start: 19.92, end: 20 },
  { text: 'realised:', start: 20.16, end: 20.88 },
];
