/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator" (eleven_v4), the directed read ([excited], [curious],
 * [softly], [surprised], [mischievously], "COCONUTS" in caps), take 2 of 4
 * (generation tDU3tg6IxgNmPYQ5EYJi), sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo. WORDS are its words with start and end times in the
 * original take (ElevenLabs Scribe; the tags it echoed are left out, and the
 * word edges next to them, and "problem, because", moved to where the take's
 * silences say they are), so divide by TEMPO for voice.mp3.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…No shell, no problem, because / this crab cracks open coconuts."
 */
export const TEMPO = 1.0681;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.08, end: 0.32 },
  { text: 'crab', start: 0.4, end: 0.8 },
  { text: 'cracks', start: 0.88, end: 1.12 },
  { text: 'open', start: 1.2, end: 1.44 },
  { text: 'COCONUTS.', start: 1.52, end: 2.3 },
  { text: 'The', start: 2.69, end: 2.8 },
  { text: 'coconut', start: 2.88, end: 3.28 },
  { text: 'crab', start: 3.36, end: 3.6 },
  { text: 'is', start: 3.68, end: 3.84 },
  { text: 'the', start: 3.96, end: 4.08 },
  { text: 'biggest', start: 4.16, end: 4.48 },
  { text: 'crab', start: 4.56, end: 4.72 },
  { text: 'on', start: 4.8, end: 4.96 },
  { text: 'land:', start: 5.12, end: 5.31 },
  { text: 'up', start: 5.56, end: 5.68 },
  { text: 'to', start: 5.8, end: 5.92 },
  { text: 'four', start: 6, end: 6.24 },
  { text: 'kilos,', start: 6.32, end: 7.01 },
  { text: 'with', start: 7.07, end: 7.12 },
  { text: 'legs', start: 7.2, end: 7.44 },
  { text: 'nearly', start: 7.48, end: 7.76 },
  { text: 'a', start: 7.88, end: 8 },
  { text: 'metre', start: 8.12, end: 8.32 },
  { text: 'across.', start: 8.4, end: 8.91 },
  { text: 'Its', start: 9.33, end: 9.6 },
  { text: 'pinch', start: 9.68, end: 10 },
  { text: 'beats', start: 10.08, end: 10.32 },
  { text: 'the', start: 10.4, end: 10.48 },
  { text: 'bite', start: 10.56, end: 10.64 },
  { text: 'of', start: 10.72, end: 10.8 },
  { text: 'almost', start: 10.88, end: 11.28 },
  { text: 'any', start: 11.36, end: 11.52 },
  { text: 'land', start: 11.6, end: 11.84 },
  { text: 'predator.', start: 11.92, end: 12.34 },
  { text: 'Yet', start: 12.93, end: 13.04 },
  { text: 'it', start: 13.12, end: 13.2 },
  { text: 'starts', start: 13.28, end: 13.6 },
  { text: 'life', start: 13.68, end: 13.92 },
  { text: 'as', start: 13.96, end: 14 },
  { text: 'a', start: 14.24, end: 14.37 },
  { text: 'tiny', start: 14.51, end: 14.64 },
  { text: 'hermit', start: 14.72, end: 15.04 },
  { text: 'crab', start: 15.12, end: 15.36 },
  { text: 'in', start: 15.4, end: 15.44 },
  { text: 'a', start: 15.52, end: 15.6 },
  { text: 'borrowed', start: 15.72, end: 16 },
  { text: 'snail', start: 16.08, end: 16.32 },
  { text: 'shell…', start: 16.4, end: 16.66 },
  { text: 'until', start: 17.08, end: 17.36 },
  { text: 'it', start: 17.4, end: 17.44 },
  { text: 'grows', start: 17.52, end: 17.76 },
  { text: 'too', start: 17.84, end: 18 },
  { text: 'big', start: 18.08, end: 18.24 },
  { text: 'for', start: 18.32, end: 18.4 },
  { text: 'any', start: 18.48, end: 18.64 },
  { text: 'shell', start: 18.72, end: 18.88 },
  { text: 'at', start: 18.96, end: 19.04 },
  { text: 'all.', start: 19.2, end: 19.38 },
  { text: 'No', start: 19.75, end: 20 },
  { text: 'shell,', start: 20.08, end: 20.56 },
  { text: 'no', start: 20.64, end: 20.72 },
  { text: 'problem,', start: 20.8, end: 21.25 },
  { text: 'because', start: 21.47, end: 22.11 },
];
