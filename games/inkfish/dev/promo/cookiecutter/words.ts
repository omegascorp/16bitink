/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-25: generation agIX4YklhtHveDG4earm, its first
 * 0 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 18 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe),
 * so divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped,
 * and word edges are fixed from the waveform (silencedetect at -40 dB): a word
 * after a pause starts where the sound comes back, the word before ends where
 * the pause begins; the first word starts where the sound does, and the last
 * ends where it fades out. "Nope." is moved 0.33 s later than Scribe put it:
 * the chuckle before it runs into the word.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Just this little guy. So yes, / this tiny shark bites holes in SUBMARINES!"
 */
export const TEMPO = 1.124;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 18;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.047, end: 0.320 },
  { text: 'tiny', start: 0.380, end: 0.700 },
  { text: 'shark', start: 0.860, end: 1.140 },
  { text: 'bites', start: 1.240, end: 1.460 },
  { text: 'holes', start: 1.540, end: 1.820 },
  { text: 'in', start: 1.840, end: 2.020 },
  { text: 'SUBMARINES!', start: 2.100, end: 2.825 },
  { text: 'It\'s', start: 3.232, end: 3.380 },
  { text: 'just', start: 3.440, end: 3.600 },
  { text: 'twenty', start: 3.680, end: 3.920 },
  { text: 'inches', start: 3.980, end: 4.260 },
  { text: 'long,', start: 4.320, end: 4.663 },
  { text: 'with', start: 4.839, end: 4.940 },
  { text: 'a', start: 4.980, end: 5.120 },
  { text: 'belly', start: 5.160, end: 5.400 },
  { text: 'that', start: 5.440, end: 5.600 },
  { text: 'GLOWS.', start: 5.660, end: 6.269 },
  { text: 'It', start: 6.678, end: 6.820 },
  { text: 'latches', start: 6.920, end: 7.300 },
  { text: 'on', start: 7.380, end: 7.520 },
  { text: 'with', start: 7.560, end: 7.740 },
  { text: 'suction', start: 7.820, end: 8.180 },
  { text: 'lips…', start: 8.220, end: 8.506 },
  { text: 'then', start: 8.666, end: 8.960 },
  { text: 'SPINS,', start: 9.060, end: 9.580 },
  { text: 'cutting', start: 9.800, end: 10.020 },
  { text: 'out', start: 10.060, end: 10.180 },
  { text: 'a', start: 10.220, end: 10.252 },
  { text: 'perfect', start: 10.375, end: 10.800 },
  { text: 'circle.', start: 10.900, end: 11.269 },
  { text: 'In', start: 11.766, end: 11.880 },
  { text: 'the', start: 11.900, end: 12.000 },
  { text: 'seventies,', start: 12.020, end: 12.560 },
  { text: 'Navy', start: 12.840, end: 13.060 },
  { text: 'submarines', start: 13.180, end: 13.660 },
  { text: 'came', start: 13.700, end: 13.880 },
  { text: 'home', start: 13.920, end: 14.080 },
  { text: 'BITTEN!', start: 14.280, end: 14.625 },
  { text: 'They', start: 15.099, end: 15.160 },
  { text: 'suspected', start: 15.220, end: 15.680 },
  { text: 'a', start: 15.740, end: 15.820 },
  { text: 'secret', start: 15.900, end: 16.180 },
  { text: 'weapon…', start: 16.260, end: 16.614 },
  { text: 'Nope.', start: 17.238, end: 17.500 },
  { text: 'Just', start: 17.980, end: 18.120 },
  { text: 'this', start: 18.180, end: 18.300 },
  { text: 'little', start: 18.340, end: 18.520 },
  { text: 'guy.', start: 18.560, end: 18.808 },
  { text: 'So', start: 19.262, end: 19.480 },
  { text: 'yes,', start: 19.520, end: 19.886 },
];
