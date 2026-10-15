/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator" (eleven_v4), the directed read ([dramatically],
 * [curious], [surprised], [mischievously], [whispers]; "CRABS" in caps),
 * take 3 of 4 (generation fEo5dW0etYV8zffEiqqh). TRIM seconds of silence cut
 * from its start, then sped up by TEMPO (pitch kept) with ffmpeg's atempo.
 * WORDS are its words with start and end times in the original take
 * (ElevenLabs Scribe; the tags it echoed are left out, and the word edges
 * next to them moved to where the take's silences say they are), so
 * subtract TRIM and divide by TEMPO for voice.mp3 (story.ts's `voiceTime`).
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…scientists gave it a name: carcinization. Face it: / Evolution keeps making crabs."
 */
export const TRIM = 0.08;
export const TEMPO = 1.128;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'Evolution', start: 0.13, end: 0.8 },
  { text: 'keeps', start: 1.04, end: 1.36 },
  { text: 'making', start: 1.52, end: 1.84 },
  { text: 'CRABS.', start: 1.92, end: 2.6 },
  { text: 'A', start: 3.13, end: 3.2 },
  { text: 'crab-shaped', start: 3.28, end: 3.84 },
  { text: 'body', start: 3.92, end: 4.24 },
  { text: 'evolved', start: 4.32, end: 4.64 },
  { text: 'at', start: 4.72, end: 4.8 },
  { text: 'least', start: 4.96, end: 5.12 },
  { text: 'five', start: 5.2, end: 5.52 },
  { text: 'separate', start: 5.6, end: 5.84 },
  { text: 'times,', start: 6.12, end: 6.56 },
  { text: 'in', start: 6.64, end: 6.72 },
  { text: 'animals', start: 6.92, end: 7.12 },
  { text: 'that', start: 7.2, end: 7.28 },
  { text: 'started', start: 7.36, end: 7.68 },
  { text: 'out', start: 7.76, end: 7.84 },
  { text: 'as', start: 7.92, end: 8 },
  { text: 'something', start: 8.16, end: 8.32 },
  { text: 'else.', start: 8.52, end: 8.73 },
  { text: 'King', start: 9.13, end: 9.36 },
  { text: 'crabs', start: 9.44, end: 9.76 },
  { text: 'probably', start: 9.84, end: 10.24 },
  { text: 'began', start: 10.32, end: 10.56 },
  { text: 'as', start: 10.64, end: 10.72 },
  { text: 'hermit', start: 10.8, end: 11.12 },
  { text: 'crabs,', start: 11.2, end: 11.76 },
  { text: 'then', start: 11.88, end: 12 },
  { text: 'swapped', start: 12.04, end: 12.32 },
  { text: 'the', start: 12.4, end: 12.48 },
  { text: 'borrowed', start: 12.6, end: 12.8 },
  { text: 'shell', start: 12.88, end: 13.12 },
  { text: 'for', start: 13.2, end: 13.36 },
  { text: 'armour', start: 13.44, end: 13.68 },
  { text: 'of', start: 13.72, end: 13.76 },
  { text: 'their', start: 13.84, end: 14 },
  { text: 'own.', start: 14.16, end: 14.29 },
  { text: 'It', start: 14.75, end: 14.88 },
  { text: 'happened', start: 14.92, end: 15.28 },
  { text: 'so', start: 15.4, end: 15.52 },
  { text: 'often,', start: 15.68, end: 16 },
  { text: 'scientists', start: 16.08, end: 16.64 },
  { text: 'gave', start: 16.72, end: 16.8 },
  { text: 'it', start: 16.88, end: 16.96 },
  { text: 'a', start: 17, end: 17.04 },
  { text: 'name:', start: 17.2, end: 17.39 },
  { text: 'carcinization.', start: 17.77, end: 18.75 },
  { text: 'Face', start: 19.45, end: 19.76 },
  { text: 'it:', start: 19.84, end: 20.04 },
];
