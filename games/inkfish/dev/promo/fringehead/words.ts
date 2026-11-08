/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-25: generation ngxY5i8NLOcQrJgoJLvU, its first
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
 * "…So yes, / these fish fight by comparing MOUTHS!"
 */
export const TEMPO = 1.160;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 18;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'These', start: 0.107, end: 0.360 },
  { text: 'fish', start: 0.480, end: 0.660 },
  { text: 'fight', start: 0.820, end: 1.060 },
  { text: 'by', start: 1.080, end: 1.200 },
  { text: 'comparing', start: 1.240, end: 1.700 },
  { text: 'MOUTHS!', start: 1.880, end: 2.503 },
  { text: 'The', start: 2.907, end: 3.020 },
  { text: 'sarcastic', start: 3.060, end: 3.600 },
  { text: 'fringehead\'s', start: 3.700, end: 4.220 },
  { text: 'jaws', start: 4.320, end: 4.660 },
  { text: 'stretch', start: 4.720, end: 4.940 },
  { text: 'way', start: 5.200, end: 5.440 },
  { text: 'past', start: 5.480, end: 5.700 },
  { text: 'its', start: 5.740, end: 5.860 },
  { text: 'own', start: 5.920, end: 6.060 },
  { text: 'head.', start: 6.120, end: 6.419 },
  { text: 'When', start: 6.821, end: 7.020 },
  { text: 'two', start: 7.100, end: 7.220 },
  { text: 'males', start: 7.320, end: 7.620 },
  { text: 'meet,', start: 7.660, end: 7.900 },
  { text: 'they', start: 8.119, end: 8.340 },
  { text: 'open', start: 8.400, end: 8.620 },
  { text: 'wide…', start: 8.720, end: 9.074 },
  { text: 'and', start: 9.206, end: 9.460 },
  { text: 'SLAM', start: 9.700, end: 10.080 },
  { text: 'their', start: 10.100, end: 10.240 },
  { text: 'mouths', start: 10.280, end: 10.540 },
  { text: 'together!', start: 10.600, end: 11.002 },
  { text: 'Bigger', start: 11.769, end: 12.100 },
  { text: 'mouth,', start: 12.180, end: 12.480 },
  { text: 'better', start: 12.740, end: 12.960 },
  { text: 'odds.', start: 13.040, end: 13.383 },
  { text: 'Honestly?', start: 13.773, end: 14.325 },
  { text: 'We', start: 14.607, end: 14.760 },
  { text: 'should', start: 14.780, end: 14.940 },
  { text: 'try', start: 15.000, end: 15.240 },
  { text: 'that.', start: 15.300, end: 15.455 },
  { text: 'It', start: 15.852, end: 15.980 },
  { text: 'lives', start: 16.020, end: 16.219 },
  { text: 'in', start: 16.239, end: 16.400 },
  { text: 'old', start: 16.460, end: 16.620 },
  { text: 'bottles', start: 16.720, end: 17.040 },
  { text: 'and', start: 17.060, end: 17.140 },
  { text: 'cans,', start: 17.260, end: 17.680 },
  { text: 'and', start: 17.760, end: 17.840 },
  { text: 'picks', start: 17.940, end: 18.260 },
  { text: 'fights', start: 18.300, end: 18.580 },
  { text: 'with', start: 18.620, end: 18.760 },
  { text: 'scuba', start: 18.820, end: 19.120 },
  { text: 'divers.', start: 19.160, end: 19.619 },
  { text: 'So', start: 19.874, end: 20.100 },
  { text: 'yes,', start: 20.140, end: 20.525 },
];
