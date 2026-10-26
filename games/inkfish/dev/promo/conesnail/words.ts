/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-26: generation myWtJLJJylVBNL27QL7a, its first
 * 0 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 18 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe),
 * so divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped,
 * and word edges are fixed from the waveform (silencedetect at -40 dB): a word
 * after a pause starts where the sound comes back, the word before ends where
 * the pause begins; the first word starts where the sound does, and the last
 * ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Because / this snail swallows fish WHOLE."
 */
export const TEMPO = 1.1;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 18;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.270, end: 0.540 },
  { text: 'snail', start: 0.640, end: 1.000 },
  { text: 'swallows', start: 1.160, end: 1.620 },
  { text: 'fish', start: 1.680, end: 1.880 },
  { text: 'WHOLE.', start: 2.060, end: 2.505 },
  { text: 'A', start: 3.010, end: 3.120 },
  { text: 'cone', start: 3.180, end: 3.400 },
  { text: 'snail', start: 3.480, end: 3.760 },
  { text: 'can\'t', start: 3.820, end: 4.059 },
  { text: 'chase', start: 4.140, end: 4.400 },
  { text: 'anything…', start: 4.460, end: 4.998 },
  { text: 'so', start: 5.197, end: 5.460 },
  { text: 'it', start: 5.500, end: 5.620 },
  { text: 'pours', start: 5.680, end: 6.060 },
  { text: 'INSULIN', start: 6.140, end: 6.580 },
  { text: 'into', start: 6.620, end: 6.800 },
  { text: 'the', start: 6.840, end: 6.940 },
  { text: 'water,', start: 6.980, end: 7.240 },
  { text: 'and', start: 7.600, end: 7.660 },
  { text: 'the', start: 7.700, end: 7.820 },
  { text: 'fish', start: 7.860, end: 8.060 },
  { text: 'get', start: 8.100, end: 8.280 },
  { text: 'too', start: 8.360, end: 8.580 },
  { text: 'sleepy', start: 8.740, end: 9.060 },
  { text: 'to', start: 9.100, end: 9.220 },
  { text: 'swim', start: 9.280, end: 9.460 },
  { text: 'AWAY.', start: 9.520, end: 9.862 },
  { text: 'Then', start: 10.296, end: 10.440 },
  { text: 'its', start: 10.480, end: 10.660 },
  { text: 'mouth', start: 10.740, end: 10.940 },
  { text: 'opens', start: 11.080, end: 11.340 },
  { text: 'like', start: 11.360, end: 11.480 },
  { text: 'a', start: 11.520, end: 11.600 },
  { text: 'NET…', start: 11.740, end: 12.035 },
  { text: 'and', start: 12.290, end: 12.380 },
  { text: 'the', start: 12.420, end: 12.520 },
  { text: 'fish', start: 12.580, end: 12.740 },
  { text: 'goes', start: 12.820, end: 13.020 },
  { text: 'in!', start: 13.100, end: 13.342 },
  { text: 'Its', start: 13.831, end: 14.020 },
  { text: 'sting', start: 14.160, end: 14.460 },
  { text: 'has', start: 14.500, end: 14.660 },
  { text: 'killed', start: 14.700, end: 14.880 },
  { text: 'about', start: 14.940, end: 15.220 },
  { text: 'three', start: 15.280, end: 15.560 },
  { text: 'DOZEN', start: 15.760, end: 16.120 },
  { text: 'people.', start: 16.219, end: 16.613 },
  { text: 'So,', start: 17.240, end: 17.460 },
  { text: 'no', start: 17.960, end: 18.080 },
  { text: 'petting.', start: 18.200, end: 18.540 },
  { text: 'Because', start: 18.935, end: 19.463 },
];
