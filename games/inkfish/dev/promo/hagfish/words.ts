/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-11-03: generation DJxoB5gxom5Xdmh9YpyZ, its first 0.073 s of silence trimmed.
 * Pauses longer than 0.42 s (silencedetect at -40 dB) were cut to 0.42 s from their middles, with 10 ms crossfades: 1 in the original take, 0.55 s long (original times 15.89-16.44 s).
 * Then sped up by TEMPO (pitch kept) with ffmpeg's atempo, to end about 0.3 s
 * before the 19.5 s loop point. WORDS are its words with start and end times in
 * the trimmed, pause-shortened take (ElevenLabs Scribe), so divide by TEMPO for
 * voice.mp3. Word edges are fixed from the waveform (silencedetect at -40 dB):
 * a word after a pause starts where the sound comes back, the word before ends
 * where the pause begins; the first word starts where the sound does, and the
 * last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…And yes, / " followed by the first line, "this shark bit a hagfish and instantly regretted it!".
 */
export const TEMPO = 0.992;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 19.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.120, end: 0.300 },
  { text: 'shark', start: 0.380, end: 0.640 },
  { text: 'bit', start: 0.740, end: 0.840 },
  { text: 'a', start: 0.900, end: 0.960 },
  { text: 'hagfish…', start: 1.060, end: 1.701 },
  { text: 'and', start: 1.849, end: 2.147 },
  { text: 'instantly', start: 2.271, end: 2.840 },
  { text: 'REGRETTED', start: 2.880, end: 3.380 },
  { text: 'it!', start: 3.440, end: 3.592 },
  { text: 'In', start: 3.997, end: 4.200 },
  { text: 'under', start: 4.260, end: 4.440 },
  { text: 'half', start: 4.600, end: 4.780 },
  { text: 'a', start: 4.840, end: 4.920 },
  { text: 'second,', start: 4.980, end: 5.280 },
  { text: 'the', start: 5.560, end: 5.660 },
  { text: 'hagfish', start: 5.720, end: 6.140 },
  { text: 'shot', start: 6.220, end: 6.400 },
  { text: 'out', start: 6.440, end: 6.560 },
  { text: 'SLIME…', start: 6.780, end: 7.319 },
  { text: 'straight', start: 7.437, end: 8.140 },
  { text: 'into', start: 8.180, end: 8.320 },
  { text: 'the', start: 8.360, end: 8.460 },
  { text: 'shark\'s', start: 8.500, end: 8.880 },
  { text: 'gills!', start: 8.940, end: 9.406 },
  { text: 'It', start: 9.847, end: 9.940 },
  { text: 'gagged,', start: 10.080, end: 10.437 },
  { text: 'choked…', start: 10.676, end: 11.150 },
  { text: 'and', start: 11.302, end: 11.560 },
  { text: 'let', start: 11.620, end: 11.740 },
  { text: 'go!', start: 11.860, end: 12.200 },
  { text: 'Then', start: 12.505, end: 12.840 },
  { text: 'the', start: 12.880, end: 12.960 },
  { text: 'hagfish', start: 13.000, end: 13.400 },
  { text: 'tied', start: 13.520, end: 13.720 },
  { text: 'itself', start: 13.740, end: 14.100 },
  { text: 'in', start: 14.120, end: 14.200 },
  { text: 'a', start: 14.240, end: 14.260 },
  { text: 'KNOT', start: 14.440, end: 14.740 },
  { text: 'to', start: 14.780, end: 14.880 },
  { text: 'wipe', start: 14.920, end: 15.080 },
  { text: 'the', start: 15.120, end: 15.220 },
  { text: 'slime', start: 15.280, end: 15.580 },
  { text: 'off.', start: 15.660, end: 15.820 },
  { text: 'Cameras', start: 16.240, end: 16.660 },
  { text: 'caught', start: 16.700, end: 16.900 },
  { text: 'this', start: 16.940, end: 17.097 },
  { text: 'fourteen', start: 17.232, end: 17.740 },
  { text: 'times.', start: 17.800, end: 18.220 },
  { text: 'And', start: 18.481, end: 18.620 },
  { text: 'yes,', start: 18.720, end: 19.047 },
];
