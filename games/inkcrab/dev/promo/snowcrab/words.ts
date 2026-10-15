/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator" (eleven_v4), the directed read ([surprised],
 * [curious], [softly], [dramatically], [nervous]; "TEN BILLION" and "EVER" in
 * caps), take 2 of 4 (generation oXoLpPiESjfPVxdKdqVV, the tightest), sped up
 * by TEMPO (pitch kept) with ffmpeg's atempo. WORDS are its words with start
 * and end times in the original take (ElevenLabs Scribe; the tags it echoed
 * are left out, and the edges next to them and the years, which Scribe
 * smeared, moved to where the take's silences and loudness say they are), so
 * divide by TEMPO for voice.mp3.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…The count still says: / ten billion crabs vanished."
 */
export const TEMPO = 1.0812;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'TEN', start: 0.04, end: 0.46 },
  { text: 'BILLION', start: 0.64, end: 1.08 },
  { text: 'crabs', start: 1.16, end: 1.6 },
  { text: 'vanished.', start: 1.76, end: 2.33 },
  { text: 'Between', start: 2.7, end: 3.04 },
  { text: '2018', start: 3.06, end: 3.92 },
  { text: 'and', start: 3.96, end: 4.06 },
  { text: '2021,', start: 4.08, end: 4.85 },
  { text: 'the', start: 5.14, end: 5.28 },
  { text: 'snow', start: 5.4, end: 5.52 },
  { text: 'crabs', start: 5.6, end: 5.84 },
  { text: 'of', start: 5.88, end: 5.92 },
  { text: "Alaska's", start: 6, end: 6.56 },
  { text: 'Bering', start: 6.667, end: 6.88 },
  { text: 'Sea', start: 6.96, end: 7.2 },
  { text: 'just…', start: 7.28, end: 7.43 },
  { text: 'disappeared.', start: 7.77, end: 8.45 },
  { text: 'A', start: 9, end: 9.04 },
  { text: 'marine', start: 9.12, end: 9.44 },
  { text: 'heatwave', start: 9.52, end: 10.08 },
  { text: 'warmed', start: 10.16, end: 10.48 },
  { text: 'their', start: 10.56, end: 10.64 },
  { text: 'icy', start: 10.72, end: 11.04 },
  { text: 'water,', start: 11.08, end: 11.46 },
  { text: 'warm', start: 11.81, end: 12.08 },
  { text: 'crabs', start: 12.16, end: 12.48 },
  { text: 'burn', start: 12.56, end: 12.72 },
  { text: 'more', start: 12.8, end: 12.88 },
  { text: 'energy,', start: 12.96, end: 13.34 },
  { text: 'and', start: 13.71, end: 14 },
  { text: 'many', start: 14.12, end: 14.24 },
  { text: 'likely', start: 14.32, end: 14.64 },
  { text: 'starved.', start: 14.72, end: 15.11 },
  { text: 'In', start: 15.52, end: 15.62 },
  { text: '2022,', start: 15.78, end: 16.6 },
  { text: 'Alaska', start: 16.84, end: 17.44 },
  { text: 'cancelled', start: 17.68, end: 17.92 },
  { text: 'the', start: 17.96, end: 18 },
  { text: 'snow', start: 18.08, end: 18.24 },
  { text: 'crab', start: 18.32, end: 18.56 },
  { text: 'season', start: 18.76, end: 18.96 },
  { text: 'for', start: 19, end: 19.04 },
  { text: 'the', start: 19.16, end: 19.28 },
  { text: 'first', start: 19.44, end: 19.6 },
  { text: 'time', start: 19.88, end: 20.16 },
  { text: 'EVER.', start: 20.24, end: 20.5 },
  { text: 'The', start: 20.99, end: 21.2 },
  { text: 'count', start: 21.36, end: 21.52 },
  { text: 'still', start: 21.6, end: 21.84 },
  { text: 'says:', start: 21.92, end: 22.38 },
];
