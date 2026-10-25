/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-25: generation NX24XxqBoK19YYTyEVKJ, its first
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
 * "…So yes, / this octopus EATS sharks!"
 */
export const TEMPO = 1.127;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 18;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.071, end: 0.380 },
  { text: 'octopus', start: 0.460, end: 0.960 },
  { text: 'EATS', start: 1.100, end: 1.320 },
  { text: 'sharks!', start: 1.480, end: 2.076 },
  { text: 'The', start: 2.545, end: 2.660 },
  { text: 'Seattle', start: 2.720, end: 3.040 },
  { text: 'Aquarium', start: 3.100, end: 3.640 },
  { text: 'once', start: 3.720, end: 3.920 },
  { text: 'kept', start: 3.960, end: 4.200 },
  { text: 'giant', start: 4.280, end: 4.600 },
  { text: 'octopuses', start: 4.680, end: 5.280 },
  { text: 'in', start: 5.300, end: 5.360 },
  { text: 'a', start: 5.400, end: 5.440 },
  { text: 'big', start: 5.620, end: 5.860 },
  { text: 'tank', start: 5.920, end: 6.180 },
  { text: 'with', start: 6.220, end: 6.300 },
  { text: 'dogfish', start: 6.440, end: 6.940 },
  { text: 'sharks.', start: 6.980, end: 7.376 },
  { text: 'Bad', start: 7.915, end: 8.280 },
  { text: 'idea…', start: 8.340, end: 8.720 },
  { text: 'the', start: 9.280, end: 9.440 },
  { text: 'octopuses', start: 9.520, end: 10.100 },
  { text: 'started', start: 10.160, end: 10.429 },
  { text: 'EATING', start: 10.600, end: 10.960 },
  { text: 'the', start: 11.000, end: 11.100 },
  { text: 'sharks!', start: 11.180, end: 11.691 },
  { text: 'So', start: 12.385, end: 12.520 },
  { text: 'the', start: 12.560, end: 12.640 },
  { text: 'keepers', start: 12.680, end: 13.060 },
  { text: 'moved', start: 13.120, end: 13.280 },
  { text: 'the', start: 13.320, end: 13.380 },
  { text: 'octopuses', start: 13.460, end: 13.960 },
  { text: 'out.', start: 14.060, end: 14.192 },
  { text: 'It', start: 14.676, end: 14.780 },
  { text: 'wraps', start: 14.900, end: 15.220 },
  { text: 'them', start: 15.240, end: 15.340 },
  { text: 'in', start: 15.380, end: 15.458 },
  { text: 'eight', start: 15.622, end: 15.820 },
  { text: 'arms…', start: 15.980, end: 16.314 },
  { text: 'then', start: 16.583, end: 16.880 },
  { text: 'bites', start: 16.920, end: 17.160 },
  { text: 'with', start: 17.200, end: 17.280 },
  { text: 'a', start: 17.340, end: 17.500 },
  { text: 'beak', start: 17.540, end: 17.780 },
  { text: 'like', start: 17.820, end: 17.920 },
  { text: 'a', start: 17.960, end: 18.040 },
  { text: 'parrot\'s.', start: 18.100, end: 18.608 },
  { text: 'So', start: 19.036, end: 19.420 },
  { text: 'yes,', start: 19.500, end: 19.944 },
];
