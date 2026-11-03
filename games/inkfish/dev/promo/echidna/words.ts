/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-11-03: generation oOF5KxbFdMoCZU0sjkPa, its first 0.101 s of silence trimmed.
 * Pauses longer than 0.42 s (silencedetect at -40 dB) were cut to 0.42 s from their middles, with 10 ms crossfades: 4 in the original take, 0.49 s, 0.59 s, 0.42 s, 0.45 s long (original times 5.82-6.31 s; 14.16-14.75 s; 16.08-16.51 s; 18.28-18.73 s).
 * Then sped up by TEMPO (pitch kept) with ffmpeg's atempo, to end about 0.3 s
 * before the 21 s loop point. WORDS are its words with start and end times in
 * the trimmed, pause-shortened take (ElevenLabs Scribe), so divide by TEMPO for
 * voice.mp3. Word edges are fixed from the waveform (silencedetect at -40 dB):
 * a word after a pause starts where the sound comes back, the word before ends
 * where the pause begins; the first word starts where the sound does, and the
 * last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So yes, / " followed by the first line, "this shark swallowed a spiky animal from land!".
 */
export const TEMPO = 1.036;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 21;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.080, end: 0.240 },
  { text: 'shark', start: 0.340, end: 0.620 },
  { text: 'swallowed', start: 0.720, end: 1.020 },
  { text: 'a', start: 1.060, end: 1.160 },
  { text: 'spiky', start: 1.340, end: 1.700 },
  { text: 'animal…', start: 1.800, end: 2.118 },
  { text: 'from', start: 2.353, end: 2.620 },
  { text: 'LAND!', start: 2.740, end: 3.291 },
  { text: 'Australia,', start: 3.690, end: 4.500 },
  { text: 'twenty twenty-two.', start: 4.710, end: 5.720 },
  { text: 'Scientists', start: 6.140, end: 6.700 },
  { text: 'caught', start: 6.760, end: 6.960 },
  { text: 'a', start: 7.020, end: 7.061 },
  { text: 'ten-foot', start: 7.163, end: 7.680 },
  { text: 'tiger', start: 7.820, end: 8.119 },
  { text: 'shark', start: 8.200, end: 8.400 },
  { text: 'to', start: 8.440, end: 8.540 },
  { text: 'tag', start: 8.600, end: 8.860 },
  { text: 'it…', start: 8.900, end: 9.242 },
  { text: 'and', start: 9.478, end: 9.680 },
  { text: 'it', start: 9.720, end: 9.820 },
  { text: 'coughed', start: 9.880, end: 10.160 },
  { text: 'up', start: 10.220, end: 10.320 },
  { text: 'a', start: 10.380, end: 10.460 },
  { text: 'whole', start: 10.520, end: 10.720 },
  { text: 'ECHIDNA!', start: 10.820, end: 11.631 },
  { text: 'Spines,', start: 11.846, end: 12.480 },
  { text: 'legs,', start: 12.740, end: 13.145 },
  { text: 'everything.', start: 13.372, end: 13.987 },
  { text: 'The', start: 14.410, end: 14.500 },
  { text: 'echidna', start: 14.540, end: 14.960 },
  { text: 'didn\'t', start: 14.980, end: 15.200 },
  { text: 'make', start: 15.260, end: 15.440 },
  { text: 'it…', start: 15.500, end: 15.742 },
  { text: 'the', start: 16.162, end: 16.341 },
  { text: 'shark', start: 16.495, end: 16.920 },
  { text: 'was', start: 16.960, end: 17.100 },
  { text: 'totally', start: 17.140, end: 17.520 },
  { text: 'fine.', start: 17.620, end: 17.940 },
  { text: 'Tiger', start: 18.360, end: 18.680 },
  { text: 'sharks', start: 18.740, end: 19.020 },
  { text: 'eat', start: 19.120, end: 19.280 },
  { text: 'almost', start: 19.340, end: 19.712 },
  { text: 'ANYTHING.', start: 19.876, end: 20.454 },
  { text: 'So', start: 20.790, end: 21.000 },
  { text: 'yes,', start: 21.060, end: 21.452 },
];
