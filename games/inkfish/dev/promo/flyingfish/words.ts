/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator" (eleven_v4), take 4 of 4, sped up by TEMPO (pitch kept)
 * with ffmpeg's atempo. WORDS are its words with start and end times in the
 * original take (ElevenLabs Scribe), so divide by TEMPO for voice.mp3.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…To get away, / this fish flew for forty-five seconds."
 */
export const TEMPO = 1.0875;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0, end: 0.21 },
  { text: 'fish', start: 0.24, end: 0.5 },
  { text: 'flew', start: 0.56, end: 0.84 },
  { text: 'for', start: 0.88, end: 0.88 },
  { text: 'forty-five', start: 1.04, end: 1.68 },
  { text: 'seconds.', start: 1.72, end: 2.4 },
  { text: 'A', start: 2.48, end: 2.56 },
  { text: 'Japanese', start: 2.8, end: 3.68 },
  { text: 'TV', start: 3.76, end: 4.08 },
  { text: 'crew', start: 4.16, end: 4.4 },
  { text: 'filmed', start: 4.56, end: 4.8 },
  { text: 'the', start: 4.84, end: 4.88 },
  { text: 'record', start: 5.08, end: 5.28 },
  { text: 'in', start: 5.36, end: 5.52 },
  { text: '2008.', start: 5.56, end: 7.04 },
  { text: 'Flying', start: 7.2, end: 7.36 },
  { text: 'fish', start: 7.44, end: 7.76 },
  { text: 'burst', start: 7.84, end: 8.16 },
  { text: 'out', start: 8.24, end: 8.32 },
  { text: 'of', start: 8.36, end: 8.4 },
  { text: 'the', start: 8.48, end: 8.56 },
  { text: 'water,', start: 8.76, end: 9.28 },
  { text: 'spread', start: 9.44, end: 9.6 },
  { text: 'their', start: 9.72, end: 9.84 },
  { text: 'fins', start: 9.92, end: 10.08 },
  { text: 'like', start: 10.16, end: 10.32 },
  { text: 'wings,', start: 10.4, end: 11.04 },
  { text: 'and', start: 11.16, end: 11.28 },
  { text: 'flick', start: 11.32, end: 11.52 },
  { text: 'their', start: 11.64, end: 11.76 },
  { text: 'tails', start: 11.92, end: 12.08 },
  { text: 'on', start: 12.12, end: 12.16 },
  { text: 'the', start: 12.24, end: 12.32 },
  { text: 'waves', start: 12.48, end: 12.64 },
  { text: 'to', start: 12.72, end: 12.8 },
  { text: 'keep', start: 12.88, end: 13.12 },
  { text: 'going,', start: 13.28, end: 13.76 },
  { text: 'up', start: 13.84, end: 13.92 },
  { text: 'to', start: 14.04, end: 14.16 },
  { text: 'four', start: 14.24, end: 14.48 },
  { text: 'hundred', start: 14.56, end: 14.88 },
  { text: 'metres.', start: 14.96, end: 16 },
  { text: 'Mahi-mahi', start: 16.08, end: 16.72 },
  { text: 'hunt', start: 16.84, end: 16.96 },
  { text: 'them', start: 17.04, end: 17.12 },
  { text: 'from', start: 17.2, end: 17.28 },
  { text: 'below,', start: 17.36, end: 18 },
  { text: 'and', start: 18.04, end: 18.08 },
  { text: 'seabirds', start: 18.24, end: 18.72 },
  { text: 'from', start: 18.8, end: 18.88 },
  { text: 'above.', start: 19.12, end: 19.84 },
  { text: 'To', start: 19.92, end: 20 },
  { text: 'get', start: 20.08, end: 20.16 },
  { text: 'away,', start: 20.36, end: 20.88 },
];
