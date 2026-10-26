/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-26: generation PUneEPXwFnzDhzJaNyaq, its first
 * 0 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 19.5 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe),
 * so divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped,
 * and word edges are fixed from the waveform (silencedetect at -40 dB): a word
 * after a pause starts where the sound comes back, the word before ends where
 * the pause begins; the first word starts where the sound does, and the last
 * ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So yes, / this orca swam INSIDE a blue whale's mouth."
 */
export const TEMPO = 1.103;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 19.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.050, end: 0.360 },
  { text: 'orca', start: 0.520, end: 0.800 },
  { text: 'swam', start: 0.960, end: 1.220 },
  { text: 'INSIDE', start: 1.460, end: 2.120 },
  { text: 'a', start: 2.180, end: 2.300 },
  { text: 'blue', start: 2.340, end: 2.580 },
  { text: 'whale\'s', start: 2.680, end: 3.040 },
  { text: 'mouth.', start: 3.180, end: 3.634 },
  { text: 'Australia,', start: 4.198, end: 4.820 },
  { text: '2019.', start: 5.280, end: 5.931 },
  { text: 'A', start: 6.569, end: 6.680 },
  { text: 'pod', start: 6.740, end: 7.020 },
  { text: 'chased', start: 7.060, end: 7.300 },
  { text: 'a', start: 7.360, end: 7.460 },
  { text: 'blue', start: 7.500, end: 7.700 },
  { text: 'whale,', start: 7.780, end: 8.020 },
  { text: 'sixty', start: 8.520, end: 8.660 },
  { text: 'feet', start: 8.780, end: 8.960 },
  { text: 'long,', start: 9.040, end: 9.320 },
  { text: 'for', start: 9.440, end: 9.540 },
  { text: 'an', start: 9.560, end: 9.640 },
  { text: 'hour…', start: 9.900, end: 10.262 },
  { text: 'the', start: 10.627, end: 10.780 },
  { text: 'first', start: 10.860, end: 11.040 },
  { text: 'time', start: 11.080, end: 11.380 },
  { text: 'anyone', start: 11.440, end: 11.780 },
  { text: 'saw', start: 11.880, end: 12.080 },
  { text: 'orcas', start: 12.140, end: 12.460 },
  { text: 'KILL', start: 12.520, end: 12.740 },
  { text: 'one!', start: 12.840, end: 13.066 },
  { text: 'Then', start: 13.609, end: 13.800 },
  { text: 'one', start: 14.100, end: 14.220 },
  { text: 'went', start: 14.300, end: 14.420 },
  { text: 'in', start: 14.460, end: 14.600 },
  { text: 'head-first…', start: 14.660, end: 15.404 },
  { text: 'for', start: 15.860, end: 15.980 },
  { text: 'the', start: 16.040, end: 16.160 },
  { text: 'tongue.', start: 16.219, end: 16.645 },
  { text: 'The', start: 17.120, end: 17.220 },
  { text: 'biggest', start: 17.360, end: 17.660 },
  { text: 'prey', start: 17.760, end: 17.920 },
  { text: 'on', start: 17.980, end: 18.100 },
  { text: 'Earth,', start: 18.140, end: 18.440 },
  { text: 'and', start: 18.620, end: 18.760 },
  { text: 'they', start: 18.800, end: 18.960 },
  { text: 'want', start: 19.020, end: 19.200 },
  { text: 'the', start: 19.240, end: 19.400 },
  { text: 'TONGUE.', start: 19.480, end: 19.909 },
  { text: 'So', start: 20.308, end: 20.600 },
  { text: 'yes,', start: 20.660, end: 21.183 },
];
