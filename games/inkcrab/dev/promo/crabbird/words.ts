/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (eleven_v4), voice-take.mp3 sped up by TEMPO (pitch kept) with ffmpeg's
 * atempo: last word's end ÷ (16.5 − 0.3). WORDS are its words with start and
 * end times in the take, from ElevenLabs Scribe (one run, no tags echoed); the
 * first and last word edges come from silencedetect. Spelling and emphasis
 * follow the script. Divide by TEMPO for voice.mp3 and the loop (`inVoice`).
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "A scientist saw the whole thing, the night / This crab took down a
 * sleeping BIRD."
 */
export const TEMPO = 1.077;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

/** A time in the take, in the loop (the voice starts with it). */
export const inVoice = (takeSeconds: number): number => takeSeconds / TEMPO;

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.06, end: 0.36 },
  { text: 'crab', start: 0.42, end: 0.78 },
  { text: 'took', start: 0.84, end: 0.98 },
  { text: 'down', start: 1.02, end: 1.16 },
  { text: 'a', start: 1.2, end: 1.28 },
  { text: 'sleeping', start: 1.36, end: 1.72 },
  { text: 'BIRD.', start: 1.88, end: 2.32 },
  { text: 'Middle', start: 2.96, end: 3.16 },
  { text: 'of', start: 3.2, end: 3.3 },
  { text: 'the', start: 3.34, end: 3.4 },
  { text: 'night.', start: 3.44, end: 3.72 },
  { text: 'A', start: 4.38, end: 4.5 },
  { text: 'booby', start: 4.54, end: 4.78 },
  { text: 'dozes', start: 4.88, end: 5.22 },
  { text: 'on', start: 5.26, end: 5.32 },
  { text: 'a', start: 5.38, end: 5.44 },
  { text: 'low', start: 5.48, end: 5.62 },
  { text: 'branch…', start: 5.72, end: 6.12 },
  { text: 'and', start: 6.62, end: 6.72 },
  { text: 'a', start: 6.76, end: 6.86 },
  { text: 'coconut', start: 6.92, end: 7.34 },
  { text: 'crab', start: 7.4, end: 7.64 },
  { text: 'climbs', start: 7.74, end: 8.14 },
  { text: 'up!', start: 8.26, end: 8.44 },
  { text: 'It', start: 8.92, end: 9.02 },
  { text: 'grabs', start: 9.08, end: 9.4 },
  { text: 'the', start: 9.44, end: 9.52 },
  { text: 'wing,', start: 9.56, end: 9.74 },
  { text: 'and', start: 9.98, end: 10.06 },
  { text: 'SNAPS', start: 10.22, end: 10.64 },
  { text: 'it!', start: 10.7, end: 10.86 },
  { text: 'The', start: 11.36, end: 11.48 },
  { text: 'bird', start: 11.5, end: 11.7 },
  { text: 'falls…', start: 11.86, end: 12.3 },
  { text: 'and', start: 12.76, end: 12.86 },
  { text: 'five', start: 13.06, end: 13.3 },
  { text: 'MORE', start: 13.46, end: 13.7 },
  { text: 'crabs', start: 13.76, end: 14.06 },
  { text: 'arrive.', start: 14.12, end: 14.54 },
  { text: 'A', start: 15.02, end: 15.12 },
  { text: 'scientist', start: 15.18, end: 15.64 },
  { text: 'saw', start: 15.68, end: 15.82 },
  { text: 'the', start: 15.88, end: 16 },
  { text: 'whole', start: 16.079, end: 16.28 },
  { text: 'thing,', start: 16.4, end: 16.68 },
  { text: 'the', start: 16.96, end: 17.06 },
  { text: 'night', start: 17.12, end: 17.447 },
];
