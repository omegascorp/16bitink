/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator" (eleven_v4), the directed read ([surprised],
 * [curious], [excited], [warmly]; "QUEUE UP" and "SECONDS" in caps), take 3
 * of 4 (generation fhrkeCLha8iVz7yG148v), sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo. WORDS are its words with start and end times in the
 * original take (ElevenLabs Scribe; the tags it echoed are left out, and the
 * word edges next to them and at the ends of the take moved to where the
 * take's silences say they are), so divide by TEMPO for voice.mp3.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Scientists call it a vacancy chain. So yes, / hermit crabs queue up to
 * swap houses."
 */
export const TEMPO = 1.1375;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'Hermit', start: 0.06, end: 0.4 },
  { text: 'crabs', start: 0.48, end: 0.8 },
  { text: 'QUEUE', start: 0.88, end: 1.04 },
  { text: 'UP', start: 1.12, end: 1.2 },
  { text: 'to', start: 1.28, end: 1.36 },
  { text: 'swap', start: 1.44, end: 1.68 },
  { text: 'houses.', start: 1.76, end: 2.39 },
  { text: 'When', start: 2.9, end: 2.96 },
  { text: 'a', start: 3.04, end: 3.12 },
  { text: 'big', start: 3.2, end: 3.36 },
  { text: 'empty', start: 3.44, end: 3.76 },
  { text: 'shell', start: 3.84, end: 4.08 },
  { text: 'turns', start: 4.16, end: 4.4 },
  { text: 'up,', start: 4.48, end: 4.55 },
  { text: 'crabs', start: 4.96, end: 5.28 },
  { text: 'gather', start: 5.4, end: 5.52 },
  { text: 'round', start: 5.6, end: 5.84 },
  { text: 'and', start: 5.96, end: 6.08 },
  { text: 'wait,', start: 6.24, end: 6.64 },
  { text: 'sometimes', start: 6.88, end: 7.12 },
  { text: 'for', start: 7.2, end: 7.36 },
  { text: 'hours,', start: 7.52, end: 7.95 },
  { text: 'lining', start: 8.32, end: 8.56 },
  { text: 'up', start: 8.64, end: 8.8 },
  { text: 'from', start: 8.92, end: 9.04 },
  { text: 'biggest', start: 9.12, end: 9.44 },
  { text: 'to', start: 9.48, end: 9.52 },
  { text: 'smallest.', start: 9.6, end: 10.16 },
  { text: 'Then', start: 10.6, end: 10.88 },
  { text: 'the', start: 10.96, end: 11.2 },
  { text: 'biggest', start: 11.28, end: 11.52 },
  { text: 'moves', start: 11.6, end: 11.84 },
  { text: 'in,', start: 11.92, end: 12.24 },
  { text: 'and', start: 12.28, end: 12.32 },
  { text: 'the', start: 12.4, end: 12.56 },
  { text: 'whole', start: 12.68, end: 12.8 },
  { text: 'line', start: 12.88, end: 13.12 },
  { text: 'swaps,', start: 13.28, end: 13.73 },
  { text: 'each', start: 14.12, end: 14.24 },
  { text: 'crab', start: 14.32, end: 14.56 },
  { text: 'taking', start: 14.64, end: 14.88 },
  { text: 'the', start: 14.96, end: 15.04 },
  { text: 'next', start: 15.12, end: 15.28 },
  { text: 'shell', start: 15.4, end: 15.52 },
  { text: 'up,', start: 15.6, end: 15.84 },
  { text: 'in', start: 15.92, end: 16.16 },
  { text: 'SECONDS.', start: 16.2, end: 16.75 },
  { text: 'Scientists', start: 17.2, end: 17.68 },
  { text: 'call', start: 17.76, end: 17.92 },
  { text: 'it', start: 18, end: 18.08 },
  { text: 'a', start: 18.16, end: 18.24 },
  { text: 'vacancy', start: 18.32, end: 18.8 },
  { text: 'chain.', start: 18.88, end: 19.16 },
  { text: 'So', start: 19.6, end: 19.68 },
  { text: 'yes,', start: 19.76, end: 20.13 },
];
