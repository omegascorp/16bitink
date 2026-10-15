/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator" (eleven_v4), the directed read (audio tags and CAPS
 * emphasis), take 2 of 4, sped up by TEMPO (pitch kept) with ffmpeg's atempo.
 * WORDS are its words with start and end times in the original take
 * (ElevenLabs Scribe, the unspoken tags left out), so divide by TEMPO for
 * voice.mp3. Scribe stretched the last word to the file's end; its end here
 * is where the sound stops.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So happy Father's Day, because / in this family, dads get pregnant."
 */
export const TEMPO = 1.1136;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'In', start: 0.14, end: 0.16 },
  { text: 'this', start: 0.28, end: 0.4 },
  { text: 'family,', start: 0.48, end: 0.95 },
  { text: 'DADS', start: 1.28, end: 1.6 },
  { text: 'get', start: 1.72, end: 1.84 },
  { text: 'pregnant.', start: 1.96, end: 2.38 },
  { text: 'Pipefish', start: 2.8, end: 3.2 },
  { text: 'and', start: 3.28, end: 3.36 },
  { text: 'seahorses', start: 3.44, end: 4 },
  { text: 'are', start: 4.04, end: 4.08 },
  { text: 'the', start: 4.16, end: 4.4 },
  { text: 'only', start: 4.48, end: 4.72 },
  { text: 'animals', start: 4.8, end: 5.2 },
  { text: 'where', start: 5.28, end: 5.36 },
  { text: 'the', start: 5.44, end: 5.52 },
  { text: 'males', start: 5.6, end: 5.84 },
  { text: 'get', start: 5.92, end: 6.08 },
  { text: 'pregnant.', start: 6.16, end: 6.54 },
  { text: 'The', start: 6.96, end: 7.04 },
  { text: 'female', start: 7.12, end: 7.52 },
  { text: 'lays', start: 7.64, end: 7.76 },
  { text: 'her', start: 7.84, end: 7.92 },
  { text: 'eggs', start: 8, end: 8.24 },
  { text: 'in', start: 8.28, end: 8.32 },
  { text: 'a', start: 8.48, end: 8.507 },
  { text: 'pouch', start: 8.533, end: 8.8 },
  { text: 'on', start: 8.84, end: 8.88 },
  { text: 'his', start: 8.96, end: 9.12 },
  { text: 'belly.', start: 9.2, end: 9.4 },
  { text: 'He', start: 10.027, end: 10.08 },
  { text: 'gives', start: 10.133, end: 10.24 },
  { text: 'them', start: 10.32, end: 10.48 },
  { text: 'oxygen', start: 10.56, end: 10.96 },
  { text: 'while', start: 11.04, end: 11.12 },
  { text: 'they', start: 11.2, end: 11.28 },
  { text: 'grow…', start: 11.36, end: 11.63 },
  { text: 'and', start: 12.206, end: 12.24 },
  { text: 'weeks', start: 12.4, end: 12.56 },
  { text: 'later,', start: 12.64, end: 12.97 },
  { text: 'he', start: 13.28, end: 13.36 },
  { text: 'gives', start: 13.44, end: 13.6 },
  { text: 'birth', start: 13.72, end: 13.84 },
  { text: 'to', start: 13.88, end: 13.92 },
  { text: 'a', start: 14.08, end: 14.12 },
  { text: 'cloud', start: 14.16, end: 14.48 },
  { text: 'of', start: 14.56, end: 14.64 },
  { text: 'tiny', start: 14.8, end: 14.96 },
  { text: 'fish!', start: 15.12, end: 15.49 },
  { text: 'So', start: 16.046, end: 16.08 },
  { text: 'happy', start: 16.16, end: 16.4 },
  { text: "Father's", start: 16.56, end: 16.88 },
  { text: 'Day,', start: 16.96, end: 17.15 },
  { text: 'because', start: 17.52, end: 18.04 },
];
