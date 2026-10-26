/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-26: generation IvhqKcYpsmXPpDzIDTxS, its first
 * 0.016 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 16.5 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe),
 * so divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped,
 * and word edges are fixed from the waveform (silencedetect at -40 dB): a word
 * after a pause starts where the sound comes back, the word before ends where
 * the pause begins; the first word starts where the sound does, and the last
 * ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…And that's how / this fish swallowed a whole SHARK!"
 */
export const TEMPO = 1.081;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 16.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.050, end: 0.340 },
  { text: 'fish', start: 0.460, end: 0.640 },
  { text: 'swallowed', start: 0.740, end: 1.060 },
  { text: 'a', start: 1.120, end: 1.180 },
  { text: 'whole', start: 1.280, end: 1.480 },
  { text: 'SHARK!', start: 1.720, end: 2.203 },
  { text: 'Almost', start: 2.760, end: 3.140 },
  { text: 'fifteen', start: 3.280, end: 3.649 },
  { text: 'hundred', start: 3.649, end: 4.019 },
  { text: 'feet', start: 4.080, end: 4.220 },
  { text: 'down,', start: 4.320, end: 4.580 },
  { text: 'eleven', start: 5.000, end: 5.460 },
  { text: 'sharks', start: 5.580, end: 5.880 },
  { text: 'were', start: 5.900, end: 6.060 },
  { text: 'tearing', start: 6.140, end: 6.560 },
  { text: 'into', start: 6.600, end: 6.780 },
  { text: 'a', start: 6.840, end: 6.960 },
  { text: 'dead', start: 7.000, end: 7.160 },
  { text: 'swordfish…', start: 7.300, end: 7.877 },
  { text: 'then', start: 8.299, end: 8.540 },
  { text: 'a', start: 8.580, end: 8.620 },
  { text: 'wreckfish', start: 8.760, end: 9.220 },
  { text: 'showed', start: 9.280, end: 9.500 },
  { text: 'up!', start: 9.600, end: 9.721 },
  { text: 'It', start: 10.140, end: 10.320 },
  { text: 'couldn\'t', start: 10.380, end: 10.660 },
  { text: 'bite', start: 10.720, end: 10.900 },
  { text: 'the', start: 10.920, end: 11.020 },
  { text: 'swordfish…', start: 11.060, end: 11.845 },
  { text: 'so', start: 12.001, end: 12.360 },
  { text: 'it', start: 12.420, end: 12.480 },
  { text: 'ate', start: 12.520, end: 12.640 },
  { text: 'the', start: 12.680, end: 12.760 },
  { text: 'guy', start: 12.820, end: 12.980 },
  { text: 'who', start: 13.020, end: 13.160 },
  { text: 'COULD.', start: 13.200, end: 13.507 },
  { text: 'One', start: 13.934, end: 14.300 },
  { text: 'gulp.', start: 14.400, end: 14.743 },
  { text: 'Tail', start: 15.024, end: 15.320 },
  { text: 'still', start: 15.480, end: 15.680 },
  { text: 'wiggling.', start: 15.740, end: 16.155 },
  { text: 'And', start: 16.570, end: 16.800 },
  { text: 'that\'s', start: 16.880, end: 17.120 },
  { text: 'how', start: 17.180, end: 17.512 },
];
