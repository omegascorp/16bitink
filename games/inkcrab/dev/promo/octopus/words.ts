/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator" (eleven_v4), the directed read (audio tags, "THREE"
 * and "BLUE" in caps), take 3 of 4 (generation UGx0Vvv46GFBGpKlAVuB), sped up
 * by TEMPO (pitch kept) with ffmpeg's atempo. WORDS are its words with start
 * and end times in the original take (ElevenLabs Scribe; the tags it echoed
 * are left out, and the word edges next to them moved to where the take's
 * silences say they are), so divide by TEMPO for voice.mp3.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Count them again: / this animal has three hearts."
 */
export const TEMPO = 1.073;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.08, end: 0.24 },
  { text: 'animal', start: 0.4, end: 0.72 },
  { text: 'has', start: 0.88, end: 1.12 },
  { text: 'THREE', start: 1.2, end: 1.52 },
  { text: 'hearts.', start: 1.6, end: 2.17 },
  { text: 'Two', start: 2.63, end: 2.8 },
  { text: 'pump', start: 2.96, end: 3.2 },
  { text: 'blood', start: 3.32, end: 3.44 },
  { text: 'through', start: 3.52, end: 3.6 },
  { text: 'its', start: 3.68, end: 3.84 },
  { text: 'gills,', start: 3.92, end: 4.4 },
  { text: 'and', start: 4.7, end: 4.88 },
  { text: 'one', start: 4.96, end: 5.2 },
  { text: 'pumps', start: 5.28, end: 5.52 },
  { text: 'it', start: 5.56, end: 5.6 },
  { text: 'round', start: 5.72, end: 5.84 },
  { text: 'the', start: 5.88, end: 5.92 },
  { text: 'body.', start: 6.08, end: 6.22 },
  { text: 'And', start: 6.66, end: 6.76 },
  { text: 'its', start: 6.8, end: 6.96 },
  { text: 'blood', start: 7.04, end: 7.2 },
  { text: 'is', start: 7.28, end: 7.52 },
  { text: 'BLUE:', start: 7.76, end: 8.01 },
  { text: 'it', start: 8.33, end: 8.48 },
  { text: 'carries', start: 8.56, end: 8.8 },
  { text: 'oxygen', start: 8.88, end: 9.2 },
  { text: 'with', start: 9.32, end: 9.44 },
  { text: 'copper,', start: 9.52, end: 10 },
  { text: 'not', start: 10.08, end: 10.24 },
  { text: 'iron.', start: 10.32, end: 10.66 },
  { text: 'Oh,', start: 11.04, end: 11.52 },
  { text: 'and', start: 11.6, end: 11.84 },
  { text: 'the', start: 11.92, end: 12 },
  { text: 'main', start: 12.12, end: 12.24 },
  { text: 'heart', start: 12.32, end: 12.56 },
  { text: 'stops', start: 12.64, end: 12.96 },
  { text: 'beating', start: 13.04, end: 13.36 },
  { text: 'while', start: 13.44, end: 13.52 },
  { text: 'it', start: 13.6, end: 13.68 },
  { text: 'swims.', start: 13.76, end: 14.24 },
  { text: 'Bad', start: 14.57, end: 14.88 },
  { text: 'news', start: 14.96, end: 15.12 },
  { text: 'for', start: 15.2, end: 15.28 },
  { text: 'crabs:', start: 15.36, end: 15.78 },
  { text: 'it', start: 16.11, end: 16.24 },
  { text: 'hunts', start: 16.28, end: 16.48 },
  { text: 'them', start: 16.56, end: 16.64 },
  { text: 'by', start: 16.72, end: 16.96 },
  { text: 'feel,', start: 17.04, end: 17.33 },
  { text: 'poking', start: 17.63, end: 17.92 },
  { text: 'its', start: 18.04, end: 18.16 },
  { text: 'arms', start: 18.24, end: 18.4 },
  { text: 'into', start: 18.48, end: 18.8 },
  { text: 'every', start: 18.88, end: 19.2 },
  { text: 'hole.', start: 19.36, end: 19.49 },
  { text: 'Count', start: 19.97, end: 20.12 },
  { text: 'them', start: 20.18, end: 20.28 },
  { text: 'again:', start: 20.33, end: 20.6 },
];
