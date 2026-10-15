/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator" (eleven_v4), the directed read ([excited], [curious],
 * [surprised], [warmly], [mischievously]; "FIFTY" and "BRIDGES" in caps),
 * take 4 of 4 (generation 5iCnROb6HRJIdEZvVnKm), sped up by TEMPO (pitch
 * kept) with ffmpeg's atempo. WORDS are its words with start and end times in
 * the original take (ElevenLabs Scribe; the tags it echoed are left out, and
 * the word edges next to them moved to where the take's silences say they
 * are), so divide by TEMPO for voice.mp3.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Next year, again: / fifty million crabs march to the sea."
 */
export const TEMPO = 1.12;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'FIFTY', start: 0.12, end: 0.48 },
  { text: 'million', start: 0.72, end: 1.12 },
  { text: 'crabs', start: 1.2, end: 1.6 },
  { text: 'march', start: 1.84, end: 2.08 },
  { text: 'to', start: 2.16, end: 2.24 },
  { text: 'the', start: 2.32, end: 2.4 },
  { text: 'sea.', start: 2.48, end: 2.78 },
  { text: 'Every', start: 3.3, end: 3.6 },
  { text: 'year', start: 3.68, end: 3.92 },
  { text: 'on', start: 4, end: 4.16 },
  { text: 'Christmas', start: 4.36, end: 4.56 },
  { text: 'Island,', start: 4.64, end: 4.98 },
  { text: 'red', start: 5.33, end: 5.52 },
  { text: 'crabs', start: 5.6, end: 5.92 },
  { text: 'leave', start: 6, end: 6.16 },
  { text: 'the', start: 6.24, end: 6.4 },
  { text: 'forest', start: 6.56, end: 6.72 },
  { text: 'for', start: 6.76, end: 6.8 },
  { text: 'the', start: 6.88, end: 6.96 },
  { text: 'coast,', start: 7.04, end: 7.6 },
  { text: 'covering', start: 7.68, end: 8 },
  { text: 'roads,', start: 8.08, end: 8.64 },
  { text: 'gardens,', start: 8.72, end: 9.36 },
  { text: 'even', start: 9.44, end: 9.68 },
  { text: 'houses.', start: 9.96, end: 10.25 },
  { text: 'Rangers', start: 10.65, end: 11.12 },
  { text: 'close', start: 11.2, end: 11.52 },
  { text: 'the', start: 11.56, end: 11.6 },
  { text: 'roads,', start: 11.68, end: 12.04 },
  { text: 'and', start: 12.08, end: 12.24 },
  { text: 'built', start: 12.36, end: 12.48 },
  { text: 'crab', start: 12.56, end: 12.8 },
  { text: 'BRIDGES', start: 12.88, end: 13.2 },
  { text: 'to', start: 13.24, end: 13.28 },
  { text: 'get', start: 13.36, end: 13.44 },
  { text: 'them', start: 13.48, end: 13.52 },
  { text: 'across.', start: 13.6, end: 14.11 },
  { text: 'Then,', start: 14.47, end: 15.04 },
  { text: 'with', start: 15.12, end: 15.2 },
  { text: 'the', start: 15.24, end: 15.28 },
  { text: 'moon,', start: 15.36, end: 15.92 },
  { text: 'the', start: 16, end: 16.08 },
  { text: 'mothers', start: 16.12, end: 16.4 },
  { text: 'release', start: 16.48, end: 16.88 },
  { text: 'their', start: 16.96, end: 17.04 },
  { text: 'eggs', start: 17.12, end: 17.44 },
  { text: 'into', start: 17.56, end: 17.68 },
  { text: 'the', start: 17.76, end: 17.84 },
  { text: 'waves.', start: 18.04, end: 18.28 },
  { text: 'Next', start: 18.65, end: 18.96 },
  { text: 'year,', start: 19.04, end: 19.36 },
  { text: 'again:', start: 19.44, end: 19.83 },
];

/** How many words each caption line takes, in order: short lines, broken where the narrator breathes. */
export const LINE_SIZES: readonly number[] = [3, 4, 3, 2, 3, 2, 3, 2, 3, 4, 4, 4, 4, 3, 2, 3, 3];
