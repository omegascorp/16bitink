/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-22: generation z0YUvxu4a6OLXWWZ5XRF, its first
 * 0.077 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 16.5 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe),
 * so divide by TEMPO for voice.mp3. The first word starts where the sound
 * does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So watch closely, because / this fish eats faster than you can BLINK!"
 */
export const TEMPO = 1.105;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 16.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.000, end: 0.220 },
  { text: 'fish', start: 0.360, end: 0.560 },
  { text: 'eats', start: 0.680, end: 0.840 },
  { text: 'faster', start: 1.000, end: 1.340 },
  { text: 'than', start: 1.360, end: 1.460 },
  { text: 'you', start: 1.500, end: 1.560 },
  { text: 'can', start: 1.580, end: 1.780 },
  { text: 'BLINK!', start: 1.800, end: 2.180 },
  { text: 'The', start: 2.660, end: 2.820 },
  { text: 'frogfish', start: 2.860, end: 3.400 },
  { text: 'sits', start: 3.500, end: 3.740 },
  { text: 'still,', start: 3.860, end: 4.200 },
  { text: 'pretending', start: 4.340, end: 4.920 },
  { text: 'to', start: 4.960, end: 5.040 },
  { text: 'be', start: 5.080, end: 5.140 },
  { text: 'a', start: 5.200, end: 5.280 },
  { text: 'sponge…', start: 5.400, end: 5.800 },
  { text: 'and', start: 6.220, end: 6.320 },
  { text: 'wiggles', start: 6.440, end: 6.800 },
  { text: 'a', start: 6.860, end: 6.900 },
  { text: 'little', start: 6.960, end: 7.240 },
  { text: 'fake', start: 7.300, end: 7.580 },
  { text: 'bait', start: 7.620, end: 7.800 },
  { text: 'on', start: 7.840, end: 7.920 },
  { text: 'its', start: 7.960, end: 8.119 },
  { text: 'head.', start: 8.140, end: 8.420 },
  { text: 'Then', start: 8.940, end: 9.060 },
  { text: 'its', start: 9.100, end: 9.260 },
  { text: 'mouth', start: 9.320, end: 9.520 },
  { text: 'grows', start: 9.580, end: 9.860 },
  { text: 'TWELVE', start: 9.900, end: 10.420 },
  { text: 'times', start: 10.460, end: 10.760 },
  { text: 'bigger…', start: 10.880, end: 11.160 },
  { text: 'gone!', start: 11.560, end: 11.940 },
  { text: 'It', start: 12.780, end: 12.900 },
  { text: 'even', start: 12.960, end: 13.140 },
  { text: 'swallows', start: 13.280, end: 13.620 },
  { text: 'fish', start: 13.720, end: 13.900 },
  { text: 'almost', start: 14.020, end: 14.320 },
  { text: 'TWICE', start: 14.400, end: 14.820 },
  { text: 'its', start: 14.860, end: 15.020 },
  { text: 'length.', start: 15.080, end: 15.400 },
  { text: 'So', start: 15.820, end: 16.000 },
  { text: 'watch', start: 16.059, end: 16.340 },
  { text: 'closely,', start: 16.379, end: 16.940 },
  { text: 'because', start: 17.260, end: 17.900 },
];
