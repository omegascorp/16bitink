/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator", take 1 of 4, sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo. WORDS are its words with start and end times in the
 * original take (ElevenLabs Scribe), so divide by TEMPO for voice.mp3.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…whatever the internet tells you, / this is not what a blobfish looks like."
 */
export const TEMPO = 1.103;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0, end: 0.32 },
  { text: 'is', start: 0.4, end: 0.56 },
  { text: 'not', start: 0.72, end: 0.96 },
  { text: 'what', start: 1.04, end: 1.12 },
  { text: 'a', start: 1.2, end: 1.24 },
  { text: 'blobfish', start: 1.28, end: 1.68 },
  { text: 'looks', start: 1.76, end: 2 },
  { text: 'like.', start: 2.12, end: 2.32 },
  { text: 'A', start: 2.8, end: 2.88 },
  { text: 'kilometre', start: 2.96, end: 3.36 },
  { text: 'down,', start: 3.44, end: 4 },
  { text: 'the', start: 4.04, end: 4.08 },
  { text: 'water', start: 4.16, end: 4.4 },
  { text: 'squeezes', start: 4.48, end: 4.88 },
  { text: 'it', start: 4.96, end: 5.12 },
  { text: 'a', start: 5.24, end: 5.36 },
  { text: 'hundred', start: 5.4, end: 5.68 },
  { text: 'times', start: 5.76, end: 6.08 },
  { text: 'harder', start: 6.16, end: 6.48 },
  { text: 'than', start: 6.56, end: 6.64 },
  { text: 'up', start: 6.72, end: 6.8 },
  { text: 'here.', start: 6.88, end: 7.4 },
  { text: 'That', start: 7.68, end: 7.84 },
  { text: 'pressure', start: 7.92, end: 8.24 },
  { text: 'holds', start: 8.4, end: 8.64 },
  { text: 'its', start: 8.72, end: 8.88 },
  { text: 'soft', start: 9, end: 9.12 },
  { text: 'body', start: 9.2, end: 9.44 },
  { text: 'in', start: 9.52, end: 9.68 },
  { text: 'shape:', start: 9.84, end: 10.4 },
  { text: 'a', start: 10.48, end: 10.56 },
  { text: 'perfectly', start: 10.64, end: 11.12 },
  { text: 'normal', start: 11.28, end: 11.52 },
  { text: 'fish.', start: 11.6, end: 12.24 },
  { text: 'But', start: 12.48, end: 12.56 },
  { text: 'haul', start: 12.64, end: 12.8 },
  { text: 'it', start: 12.84, end: 12.88 },
  { text: 'up', start: 12.96, end: 13.12 },
  { text: 'too', start: 13.2, end: 13.28 },
  { text: 'fast,', start: 13.44, end: 14 },
  { text: 'and', start: 14.04, end: 14.08 },
  { text: 'with', start: 14.16, end: 14.24 },
  { text: 'the', start: 14.28, end: 14.32 },
  { text: 'pressure', start: 14.4, end: 14.64 },
  { text: 'gone,', start: 14.72, end: 15.36 },
  { text: 'its', start: 15.44, end: 15.6 },
  { text: 'jelly-like', start: 15.68, end: 16.16 },
  { text: 'flesh', start: 16.24, end: 16.56 },
  { text: 'sags...', start: 16.72, end: 17.68 },
  { text: 'and', start: 17.76, end: 17.84 },
  { text: 'melts', start: 17.92, end: 18.32 },
  { text: 'into', start: 18.48, end: 18.72 },
  { text: 'this.', start: 18.8, end: 19.28 },
  { text: 'So', start: 19.92, end: 20.08 },
  { text: 'whatever', start: 20.32, end: 20.64 },
  { text: 'the', start: 20.68, end: 20.72 },
  { text: 'internet', start: 20.8, end: 21.12 },
  { text: 'tells', start: 21.2, end: 21.44 },
  { text: 'you,', start: 21.52, end: 22 },
];
