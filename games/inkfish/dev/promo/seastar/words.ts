/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-26: generation 7cIcwHfaEm0JtYv0vYQy, its first
 * 0.047 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 16.5 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe),
 * so divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped,
 * and word edges are fixed from the waveform (silencedetect at -40 dB): a word
 * after a pause starts where the sound comes back, the word before ends where
 * the pause begins; the first word starts where the sound does, and the last
 * ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Because yes, / this starfish eats with its stomach OUTSIDE its body!"
 */
export const TEMPO = 1.121;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 16.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.053, end: 0.280 },
  { text: 'starfish', start: 0.380, end: 0.860 },
  { text: 'eats', start: 0.960, end: 1.140 },
  { text: 'with', start: 1.160, end: 1.240 },
  { text: 'its', start: 1.280, end: 1.420 },
  { text: 'stomach', start: 1.540, end: 1.900 },
  { text: 'OUTSIDE', start: 1.980, end: 2.580 },
  { text: 'its', start: 2.620, end: 2.820 },
  { text: 'body!', start: 2.860, end: 3.275 },
  { text: 'It', start: 3.753, end: 3.880 },
  { text: 'tugs', start: 3.940, end: 4.180 },
  { text: 'a', start: 4.220, end: 4.300 },
  { text: 'mussel', start: 4.340, end: 4.620 },
  { text: 'open,', start: 4.700, end: 4.960 },
  { text: 'a', start: 5.220, end: 5.300 },
  { text: 'crack', start: 5.360, end: 5.640 },
  { text: 'as', start: 5.700, end: 5.800 },
  { text: 'thin', start: 5.960, end: 6.100 },
  { text: 'as', start: 6.140, end: 6.280 },
  { text: 'PAPER…', start: 6.360, end: 6.788 },
  { text: 'then', start: 7.171, end: 7.420 },
  { text: 'pushes', start: 7.480, end: 7.760 },
  { text: 'its', start: 7.800, end: 7.940 },
  { text: 'stomach', start: 8.000, end: 8.420 },
  { text: 'out', start: 8.520, end: 8.620 },
  { text: 'of', start: 8.660, end: 8.720 },
  { text: 'its', start: 8.740, end: 8.900 },
  { text: 'mouth', start: 8.940, end: 9.160 },
  { text: 'and', start: 9.260, end: 9.360 },
  { text: 'INTO', start: 9.600, end: 9.840 },
  { text: 'the', start: 9.880, end: 9.980 },
  { text: 'shell!', start: 10.040, end: 10.408 },
  { text: 'It', start: 10.880, end: 11.000 },
  { text: 'digests', start: 11.020, end: 11.500 },
  { text: 'dinner', start: 11.540, end: 11.740 },
  { text: 'right', start: 11.920, end: 12.140 },
  { text: 'there,', start: 12.200, end: 12.479 },
  { text: 'like', start: 12.638, end: 12.940 },
  { text: 'eating', start: 12.960, end: 13.200 },
  { text: 'takeout', start: 13.260, end: 13.580 },
  { text: 'in', start: 13.620, end: 13.660 },
  { text: 'the', start: 13.700, end: 13.800 },
  { text: 'parking', start: 13.840, end: 14.160 },
  { text: 'lot.', start: 14.220, end: 14.406 },
  { text: 'Then', start: 14.815, end: 15.280 },
  { text: 'it', start: 15.340, end: 15.440 },
  { text: 'slurps', start: 15.580, end: 15.940 },
  { text: 'its', start: 15.980, end: 16.100 },
  { text: 'stomach', start: 16.160, end: 16.520 },
  { text: 'back', start: 16.560, end: 16.780 },
  { text: 'in.', start: 16.880, end: 17.045 },
  { text: 'Because', start: 17.377, end: 17.720 },
  { text: 'yes,', start: 17.780, end: 18.163 },
];
