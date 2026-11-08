/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-26: generation wjjlYLuOP8B6qx5tUeMA, its first
 * 0.038 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 18 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe),
 * so divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped,
 * and word edges are fixed from the waveform (silencedetect at -40 dB): a word
 * after a pause starts where the sound comes back, the word before ends where
 * the pause begins; the first word starts where the sound does, and the last
 * ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Because yes, / this shark swallowed a three-foot SHARK!"
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
  { text: 'This', start: 0.050, end: 0.320 },
  { text: 'shark', start: 0.400, end: 0.660 },
  { text: 'swallowed', start: 0.760, end: 1.080 },
  { text: 'a', start: 1.160, end: 1.340 },
  { text: 'three-foot', start: 1.380, end: 1.920 },
  { text: 'SHARK!', start: 2.140, end: 2.653 },
  { text: 'Great', start: 3.037, end: 3.280 },
  { text: 'Barrier', start: 3.360, end: 3.660 },
  { text: 'Reef,', start: 3.760, end: 4.051 },
  { text: '2011.', start: 4.293, end: 4.987 },
  { text: 'A', start: 5.551, end: 5.660 },
  { text: 'wobbegong,', start: 5.700, end: 6.240 },
  { text: 'a', start: 6.520, end: 6.600 },
  { text: 'shark', start: 6.640, end: 6.860 },
  { text: 'that', start: 6.880, end: 6.980 },
  { text: 'looks', start: 7.000, end: 7.180 },
  { text: 'like', start: 7.200, end: 7.300 },
  { text: 'a', start: 7.360, end: 7.440 },
  { text: 'shaggy', start: 7.500, end: 7.800 },
  { text: 'carpet,', start: 7.900, end: 8.280 },
  { text: 'was', start: 8.700, end: 8.880 },
  { text: 'found', start: 8.920, end: 9.120 },
  { text: 'with', start: 9.160, end: 9.240 },
  { text: 'a', start: 9.300, end: 9.360 },
  { text: 'whole', start: 9.480, end: 9.680 },
  { text: 'bamboo', start: 9.900, end: 10.300 },
  { text: 'shark', start: 10.440, end: 10.740 },
  { text: 'going', start: 10.780, end: 11.000 },
  { text: 'down', start: 11.040, end: 11.200 },
  { text: 'HEAD-first!', start: 11.320, end: 12.150 },
  { text: 'Thirty', start: 12.900, end: 13.120 },
  { text: 'minutes', start: 13.180, end: 13.420 },
  { text: 'later?', start: 13.500, end: 13.797 },
  { text: 'Only', start: 14.184, end: 14.460 },
  { text: 'HALFWAY.', start: 14.500, end: 15.034 },
  { text: 'Scientists', start: 15.384, end: 15.960 },
  { text: 'guessed', start: 16.000, end: 16.219 },
  { text: 'a', start: 16.260, end: 16.340 },
  { text: 'few', start: 16.400, end: 16.580 },
  { text: 'more', start: 16.620, end: 16.780 },
  { text: 'HOURS.', start: 16.860, end: 17.298 },
  { text: 'No', start: 17.570, end: 17.780 },
  { text: 'rush.', start: 17.860, end: 18.206 },
  { text: 'Because', start: 18.564, end: 18.920 },
  { text: 'yes,', start: 19.080, end: 19.465 },
];
