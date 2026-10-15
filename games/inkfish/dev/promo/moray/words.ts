/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator" (eleven_v4), the directed read (audio tags, CAPS
 * emphasis), take 3 of 4, sped up by TEMPO (pitch kept) with ffmpeg's
 * atempo. WORDS are its words with start and end times in the original take
 * (ElevenLabs Scribe), so divide by TEMPO for voice.mp3. The tags aren't
 * spoken and are left out; "2007." and "up," end where the take goes quiet
 * (Scribe stretched them over the pause after them).
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So if you thought the movie made it up, / Alien's second jaw is REAL."
 */
export const TEMPO = 1.067;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: "Alien's", start: 0.08, end: 0.56 },
  { text: 'second', start: 0.64, end: 0.96 },
  { text: 'jaw', start: 1.04, end: 1.28 },
  { text: 'is', start: 1.44, end: 1.6 },
  { text: 'REAL.', start: 1.76, end: 2.44 },
  { text: 'The', start: 2.848, end: 2.88 },
  { text: 'moray', start: 2.96, end: 3.36 },
  { text: 'eel', start: 3.52, end: 3.68 },
  { text: 'has', start: 3.8, end: 3.92 },
  { text: 'one', start: 3.96, end: 4 },
  { text: 'in', start: 4.08, end: 4.16 },
  { text: 'its', start: 4.28, end: 4.4 },
  { text: 'throat.', start: 4.6, end: 5.2 },
  { text: 'Its', start: 5.32, end: 5.44 },
  { text: 'head', start: 5.52, end: 5.6 },
  { text: 'is', start: 5.68, end: 5.76 },
  { text: 'too', start: 5.88, end: 6 },
  { text: 'narrow', start: 6.04, end: 6.32 },
  { text: 'to', start: 6.4, end: 6.48 },
  { text: 'suck', start: 6.56, end: 6.72 },
  { text: 'prey', start: 6.8, end: 6.96 },
  { text: 'in', start: 7.04, end: 7.12 },
  { text: 'like', start: 7.24, end: 7.36 },
  { text: 'most', start: 7.48, end: 7.6 },
  { text: 'fish.', start: 7.76, end: 8.32 },
  { text: 'So', start: 8.4, end: 8.8 },
  { text: 'after', start: 8.88, end: 9.12 },
  { text: 'it', start: 9.2, end: 9.28 },
  { text: 'bites,', start: 9.36, end: 9.92 },
  { text: 'the', start: 10, end: 10.08 },
  { text: 'second', start: 10.2, end: 10.32 },
  { text: 'jaw', start: 10.4, end: 10.64 },
  { text: 'shoots', start: 10.72, end: 11.04 },
  { text: 'forward,', start: 11.2, end: 11.6 },
  { text: 'grabs', start: 11.68, end: 11.92 },
  { text: 'the', start: 12, end: 12.08 },
  { text: 'prey,', start: 12.16, end: 12.56 },
  { text: 'and', start: 12.64, end: 12.72 },
  { text: 'drags', start: 12.8, end: 13.04 },
  { text: 'it', start: 13.12, end: 13.2 },
  { text: 'down.', start: 13.36, end: 13.92 },
  { text: 'Scientists', start: 14.08, end: 14.48 },
  { text: 'only', start: 14.56, end: 14.8 },
  { text: 'figured', start: 14.84, end: 15.04 },
  { text: 'this', start: 15.12, end: 15.2 },
  { text: 'out', start: 15.28, end: 15.36 },
  { text: 'in', start: 15.44, end: 15.52 },
  { text: '2007.', start: 15.6, end: 16.66 },
  { text: 'So', start: 17.04, end: 17.2 },
  { text: 'if', start: 17.28, end: 17.36 },
  { text: 'you', start: 17.44, end: 17.6 },
  { text: 'thought', start: 17.68, end: 17.76 },
  { text: 'the', start: 17.84, end: 17.92 },
  { text: 'movie', start: 18.04, end: 18.16 },
  { text: 'made', start: 18.24, end: 18.4 },
  { text: 'it', start: 18.44, end: 18.48 },
  { text: 'up,', start: 18.56, end: 18.88 },
];
