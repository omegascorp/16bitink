/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator" (eleven_v4), directed take 4 of 4 (generation
 * OVVzE5rOW7mUBIwoYJWv), its first 0.12 s of silence trimmed and sped up by
 * TEMPO (pitch kept) with ffmpeg's atempo. WORDS are its words with start and
 * end times in the trimmed take (ElevenLabs Scribe, minus the 0.12 s; the
 * audio tags it echoed are left out), so divide by TEMPO for voice.mp3. The
 * last word's end is where the audio falls silent (Scribe ran it on to 21.88).
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…It lets the food come to it. That's why / this fish stands on stilts."
 */
export const TEMPO = 1.1255;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.04, end: 0.2 },
  { text: 'fish', start: 0.36, end: 0.68 },
  { text: 'stands', start: 0.76, end: 1.08 },
  { text: 'on', start: 1.16, end: 1.24 },
  { text: 'STILTS.', start: 1.4, end: 2.12 },
  { text: 'The', start: 2.6, end: 2.68 },
  { text: 'tripodfish', start: 2.76, end: 3.56 },
  { text: 'lives', start: 3.64, end: 3.88 },
  { text: 'on', start: 3.92, end: 3.96 },
  { text: 'the', start: 4.04, end: 4.12 },
  { text: 'mud', start: 4.2, end: 4.36 },
  { text: 'of', start: 4.4, end: 4.44 },
  { text: 'the', start: 4.52, end: 4.6 },
  { text: 'deep', start: 4.68, end: 4.92 },
  { text: 'sea', start: 5, end: 5.16 },
  { text: 'floor,', start: 5.24, end: 5.88 },
  { text: 'up', start: 5.96, end: 6.04 },
  { text: 'to', start: 6.12, end: 6.2 },
  { text: 'four', start: 6.28, end: 6.36 },
  { text: 'and', start: 6.44, end: 6.52 },
  { text: 'a', start: 6.56, end: 6.6 },
  { text: 'half', start: 6.72, end: 6.84 },
  { text: 'kilometres', start: 6.92, end: 7.48 },
  { text: 'down.', start: 7.56, end: 8.36 },
  { text: 'It', start: 8.44, end: 8.52 },
  { text: 'props', start: 8.64, end: 8.76 },
  { text: 'itself', start: 8.84, end: 9.16 },
  { text: 'up', start: 9.24, end: 9.4 },
  { text: 'on', start: 9.52, end: 9.64 },
  { text: 'three', start: 9.76, end: 9.88 },
  { text: 'fin', start: 10.04, end: 10.2 },
  { text: 'rays', start: 10.28, end: 10.6 },
  { text: 'longer', start: 10.72, end: 10.92 },
  { text: 'than', start: 11, end: 11.08 },
  { text: 'its', start: 11.16, end: 11.24 },
  { text: 'body,', start: 11.32, end: 11.8 },
  { text: 'and', start: 11.88, end: 11.96 },
  { text: 'faces', start: 12.04, end: 12.44 },
  { text: 'into', start: 12.52, end: 12.68 },
  { text: 'the', start: 12.76, end: 12.84 },
  { text: 'current.', start: 13.04, end: 13.347 },
  { text: 'Its', start: 13.64, end: 13.88 },
  { text: 'front', start: 14, end: 14.12 },
  { text: 'fins', start: 14.28, end: 14.52 },
  { text: 'reach', start: 14.6, end: 14.84 },
  { text: 'forward', start: 14.92, end: 15.24 },
  { text: 'like', start: 15.36, end: 15.48 },
  { text: 'hands,', start: 15.56, end: 16.28 },
  { text: 'feeling', start: 16.36, end: 16.68 },
  { text: 'for', start: 16.76, end: 16.84 },
  { text: 'tiny', start: 17, end: 17.16 },
  { text: 'crustaceans', start: 17.24, end: 17.96 },
  { text: 'drifting', start: 18.04, end: 18.36 },
  { text: 'by.', start: 18.44, end: 18.92 },
  { text: 'It', start: 19.24, end: 19.32 },
  { text: 'lets', start: 19.4, end: 19.56 },
  { text: 'the', start: 19.64, end: 19.72 },
  { text: 'food', start: 19.8, end: 20.04 },
  { text: 'come', start: 20.16, end: 20.28 },
  { text: 'to', start: 20.36, end: 20.44 },
  { text: 'it.', start: 20.56, end: 21.08 },
  { text: "That's", start: 21.16, end: 21.32 },
  { text: 'why', start: 21.4, end: 21.61 },
];
