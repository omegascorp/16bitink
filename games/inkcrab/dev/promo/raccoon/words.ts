/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator" (eleven_v4), the directed read ([mischievously],
 * [curious], [surprised], [softly], [nervous], [sarcastic]; "AREN'T" and
 * "MORE" in caps), take 2 of 4 (generation Jfoqhxugz8kbTKdnkLpS), its first
 * TRIM seconds of silence cut and sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo. WORDS are its words with start and end times in the
 * original take (ElevenLabs Scribe; the tags it echoed are left out, and
 * the word edges moved to where the take's silences and loudness say they
 * are), so subtract TRIM and divide by TEMPO for voice.mp3 (`inVoice`).
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…On a beach at night, that's usually a crab. So no, / raccoons AREN'T
 * washing their food."
 */
export const TEMPO = 1.099;
export const TRIM = 0.1;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

/** A time in the original take, in voice.mp3 (and so in the loop: the voice starts with it). */
export const inVoice = (takeSeconds: number): number => (takeSeconds - TRIM) / TEMPO;

export const WORDS: readonly Word[] = [
  { text: 'Raccoons', start: 0.115, end: 0.72 },
  { text: "AREN'T", start: 0.8, end: 0.96 },
  { text: 'washing', start: 1.04, end: 1.36 },
  { text: 'their', start: 1.48, end: 1.6 },
  { text: 'food.', start: 1.68, end: 2.075 },
  { text: 'They', start: 2.49, end: 2.64 },
  { text: 'dunk', start: 2.72, end: 2.88 },
  { text: 'it', start: 2.96, end: 3 },
  { text: 'in', start: 3.04, end: 3.2 },
  { text: 'water', start: 3.28, end: 3.6 },
  { text: 'and', start: 3.72, end: 3.84 },
  { text: 'rub', start: 3.92, end: 4 },
  { text: 'it', start: 4.04, end: 4.08 },
  { text: 'between', start: 4.16, end: 4.4 },
  { text: 'their', start: 4.52, end: 4.64 },
  { text: 'paws,', start: 4.68, end: 5.15 },
  { text: 'even', start: 5.4, end: 5.56 },
  { text: 'when', start: 5.6, end: 5.88 },
  { text: 'the', start: 6, end: 6.06 },
  { text: 'food', start: 6.08, end: 6.26 },
  { text: 'is', start: 6.28, end: 6.34 },
  { text: 'already', start: 6.36, end: 6.62 },
  { text: 'clean.', start: 6.69, end: 7.13 },
  { text: 'Their', start: 7.69, end: 7.84 },
  { text: 'paws', start: 7.92, end: 8.16 },
  { text: 'are', start: 8.24, end: 8.4 },
  { text: 'packed', start: 8.48, end: 8.8 },
  { text: 'with', start: 8.92, end: 9.04 },
  { text: 'touch', start: 9.16, end: 9.28 },
  { text: 'nerves,', start: 9.36, end: 9.74 },
  { text: 'and', start: 9.96, end: 10.08 },
  { text: 'wet', start: 10.12, end: 10.25 },
  { text: 'paws', start: 10.38, end: 10.64 },
  { text: 'feel', start: 10.74, end: 10.94 },
  { text: 'MORE,', start: 10.98, end: 11.29 },
  { text: 'so', start: 11.71, end: 11.84 },
  { text: "they're", start: 11.88, end: 12.16 },
  { text: 'really', start: 12.24, end: 12.56 },
  { text: 'feeling', start: 12.6, end: 12.88 },
  { text: 'what', start: 12.92, end: 12.96 },
  { text: 'they', start: 13.04, end: 13.12 },
  { text: 'caught.', start: 13.2, end: 13.51 },
  { text: 'On', start: 14.02, end: 14.1 },
  { text: 'a', start: 14.14, end: 14.22 },
  { text: 'beach', start: 14.34, end: 14.56 },
  { text: 'at', start: 14.6, end: 14.7 },
  { text: 'night,', start: 14.74, end: 15.21 },
  { text: "that's", start: 15.3, end: 15.66 },
  { text: 'usually', start: 15.72, end: 16.24 },
  { text: 'a', start: 16.28, end: 16.34 },
  { text: 'crab.', start: 16.36, end: 16.8 },
  { text: 'So', start: 17.17, end: 17.42 },
  { text: 'no,', start: 17.5, end: 17.906 },
];
