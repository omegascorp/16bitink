/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator", take 2 of 4, sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo. WORDS are its words with start and end times in the
 * original take (ElevenLabs Scribe), so divide by TEMPO for voice.mp3.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…don't panic. Even if / they call this the doomsday fish."
 */
export const TEMPO = 1.074;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'They', start: 0, end: 0.16 },
  { text: 'call', start: 0.24, end: 0.4 },
  { text: 'this', start: 0.48, end: 0.72 },
  { text: 'the', start: 0.88, end: 0.96 },
  { text: 'doomsday', start: 1.12, end: 1.6 },
  { text: 'fish.', start: 1.68, end: 2.08 },
  { text: 'The', start: 2.64, end: 2.72 },
  { text: 'oarfish', start: 2.8, end: 3.28 },
  { text: 'is', start: 3.36, end: 3.44 },
  { text: 'the', start: 3.48, end: 3.52 },
  { text: 'longest', start: 3.68, end: 4.08 },
  { text: 'bony', start: 4.16, end: 4.48 },
  { text: 'fish', start: 4.6, end: 4.72 },
  { text: 'in', start: 4.8, end: 4.88 },
  { text: 'the', start: 4.92, end: 4.96 },
  { text: 'world:', start: 5.12, end: 5.84 },
  { text: 'up', start: 5.92, end: 6 },
  { text: 'to', start: 6.12, end: 6.24 },
  { text: 'eight', start: 6.32, end: 6.48 },
  { text: 'metres.', start: 6.72, end: 7.52 },
  { text: 'It', start: 7.76, end: 7.92 },
  { text: 'lives', start: 8, end: 8.16 },
  { text: 'in', start: 8.24, end: 8.28 },
  { text: 'the', start: 8.32, end: 8.4 },
  { text: 'deep,', start: 8.48, end: 9.04 },
  { text: 'so', start: 9.12, end: 9.36 },
  { text: 'in', start: 9.52, end: 9.6 },
  { text: 'Japan,', start: 9.84, end: 10.4 },
  { text: 'legend', start: 10.48, end: 10.8 },
  { text: 'says', start: 10.88, end: 11.12 },
  { text: 'when', start: 11.2, end: 11.36 },
  { text: 'one', start: 11.44, end: 11.6 },
  { text: 'washes', start: 11.68, end: 11.92 },
  { text: 'ashore,', start: 12, end: 12.72 },
  { text: 'an', start: 12.84, end: 12.96 },
  { text: 'earthquake', start: 13.04, end: 13.44 },
  { text: 'is', start: 13.52, end: 13.6 },
  { text: 'coming.', start: 13.68, end: 14.28 },
  { text: 'But', start: 14.56, end: 14.72 },
  { text: 'eighty', start: 14.8, end: 15.08 },
  { text: 'years', start: 15.12, end: 15.36 },
  { text: 'of', start: 15.4, end: 15.44 },
  { text: 'sightings', start: 15.52, end: 16.08 },
  { text: 'matched', start: 16.16, end: 16.48 },
  { text: 'just', start: 16.6, end: 16.72 },
  { text: 'one', start: 16.88, end: 17.12 },
  { text: 'big', start: 17.2, end: 17.36 },
  { text: 'quake.', start: 17.44, end: 18.24 },
  { text: 'So', start: 18.36, end: 18.48 },
  { text: 'if', start: 18.64, end: 18.72 },
  { text: 'one', start: 18.8, end: 18.96 },
  { text: 'turns', start: 19.04, end: 19.24 },
  { text: 'up', start: 19.28, end: 19.36 },
  { text: 'on', start: 19.44, end: 19.52 },
  { text: 'your', start: 19.6, end: 19.68 },
  { text: 'beach,', start: 19.72, end: 20.32 },
  { text: "don't", start: 20.36, end: 20.56 },
  { text: 'panic.', start: 20.76, end: 21.36 },
  { text: 'Even', start: 21.52, end: 21.68 },
  { text: 'if', start: 21.84, end: 22.24 },
];
