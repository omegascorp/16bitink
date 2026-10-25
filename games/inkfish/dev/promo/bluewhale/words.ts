/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-25: generation gT2xbOjkDAbNZsGEOzgX, its first
 * 0 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 19.5 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe),
 * so divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped,
 * and word edges are fixed from the waveform (silencedetect at -40 dB): a word
 * after a pause starts where the sound comes back, the word before ends where
 * the pause begins; the first word starts where the sound does, and the last
 * ends where it fades out. "It" (in "It pushes…") starts 0.66 s after
 * Scribe put it: the chuckle runs into it.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So yes, / this whale's mouthful is BIGGER than its body!"
 */
export const TEMPO = 1.079;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 19.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.056, end: 0.340 },
  { text: 'whale\'s', start: 0.380, end: 0.700 },
  { text: 'mouthful', start: 0.820, end: 1.260 },
  { text: 'is', start: 1.340, end: 1.580 },
  { text: 'BIGGER', start: 1.620, end: 1.880 },
  { text: 'than', start: 1.920, end: 2.000 },
  { text: 'its', start: 2.040, end: 2.260 },
  { text: 'body!', start: 2.300, end: 2.790 },
  { text: 'A', start: 3.221, end: 3.360 },
  { text: 'blue', start: 3.400, end: 3.560 },
  { text: 'whale', start: 3.640, end: 3.820 },
  { text: 'lunges', start: 4.019, end: 4.380 },
  { text: 'into', start: 4.420, end: 4.620 },
  { text: 'krill', start: 4.680, end: 4.960 },
  { text: 'and', start: 5.000, end: 5.091 },
  { text: 'opens', start: 5.216, end: 5.580 },
  { text: 'wide…', start: 5.680, end: 6.070 },
  { text: 'and', start: 6.387, end: 6.580 },
  { text: 'its', start: 6.620, end: 6.820 },
  { text: 'throat', start: 6.860, end: 7.120 },
  { text: 'balloons', start: 7.220, end: 7.760 },
  { text: 'like', start: 7.780, end: 7.880 },
  { text: 'a', start: 7.940, end: 8.020 },
  { text: 'parachute!', start: 8.100, end: 8.718 },
  { text: 'One', start: 9.128, end: 9.460 },
  { text: 'gulp:', start: 9.560, end: 9.895 },
  { text: 'more', start: 10.243, end: 10.520 },
  { text: 'than', start: 10.560, end: 10.640 },
  { text: 'its', start: 10.680, end: 10.796 },
  { text: 'own', start: 10.917, end: 11.240 },
  { text: 'weight', start: 11.280, end: 11.460 },
  { text: 'in', start: 11.500, end: 11.580 },
  { text: 'water.', start: 11.680, end: 12.030 },
  { text: 'Four', start: 12.325, end: 12.720 },
  { text: 'hundred', start: 12.760, end: 13.058 },
  { text: 'thousand', start: 13.186, end: 13.600 },
  { text: 'POUNDS!', start: 13.720, end: 14.278 },
  { text: 'It', start: 15.160, end: 15.320 },
  { text: 'pushes', start: 15.360, end: 15.660 },
  { text: 'the', start: 15.700, end: 15.760 },
  { text: 'water', start: 15.800, end: 16.079 },
  { text: 'out', start: 16.160, end: 16.280 },
  { text: 'and', start: 16.340, end: 16.420 },
  { text: 'keeps', start: 16.540, end: 16.780 },
  { text: 'the', start: 16.820, end: 16.900 },
  { text: 'krill…', start: 16.960, end: 17.278 },
  { text: 'nearly', start: 17.657, end: 18.140 },
  { text: 'half', start: 18.180, end: 18.420 },
  { text: 'a', start: 18.480, end: 18.520 },
  { text: 'million', start: 18.680, end: 19.000 },
  { text: 'calories.', start: 19.100, end: 19.640 },
  { text: 'So', start: 20.090, end: 20.280 },
  { text: 'yes,', start: 20.340, end: 20.715 },
];
