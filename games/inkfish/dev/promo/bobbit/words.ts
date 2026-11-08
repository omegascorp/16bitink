/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-26: generation tw83MqITsMpmwWgW70Z7, its first
 * 0.045 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 18 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe),
 * so divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped,
 * and word edges are fixed from the waveform (silencedetect at -40 dB): a word
 * after a pause starts where the sound comes back, the word before ends where
 * the pause begins; the first word starts where the sound does, and the last
 * ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…And Barry knows: / this worm's jaws can slice a fish in HALF."
 */
export const TEMPO = 1.062;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 18;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.340, end: 0.520 },
  { text: 'worm\'s', start: 0.640, end: 1.020 },
  { text: 'jaws', start: 1.100, end: 1.380 },
  { text: 'can', start: 1.460, end: 1.660 },
  { text: 'slice', start: 1.780, end: 2.060 },
  { text: 'a', start: 2.100, end: 2.260 },
  { text: 'fish', start: 2.300, end: 2.460 },
  { text: 'in', start: 2.500, end: 2.580 },
  { text: 'HALF.', start: 2.760, end: 3.224 },
  { text: 'Up', start: 3.704, end: 3.820 },
  { text: 'to', start: 3.860, end: 4.000 },
  { text: 'ten', start: 4.059, end: 4.320 },
  { text: 'feet', start: 4.460, end: 4.580 },
  { text: 'of', start: 4.620, end: 4.800 },
  { text: 'worm', start: 4.840, end: 5.100 },
  { text: 'hides', start: 5.200, end: 5.420 },
  { text: 'in', start: 5.460, end: 5.520 },
  { text: 'the', start: 5.560, end: 5.660 },
  { text: 'sand,', start: 5.720, end: 6.080 },
  { text: 'with', start: 6.260, end: 6.440 },
  { text: 'only', start: 6.520, end: 6.740 },
  { text: 'its', start: 6.760, end: 6.940 },
  { text: 'jaws', start: 7.020, end: 7.320 },
  { text: 'showing…', start: 7.360, end: 7.721 },
  { text: 'a', start: 8.173, end: 8.320 },
  { text: 'fish', start: 8.380, end: 8.560 },
  { text: 'brushes', start: 8.700, end: 9.000 },
  { text: 'its', start: 9.040, end: 9.200 },
  { text: 'feelers…', start: 9.260, end: 9.692 },
  { text: 'SNAP!', start: 9.913, end: 10.409 },
  { text: 'Gone,', start: 10.703, end: 11.220 },
  { text: 'down', start: 11.560, end: 11.820 },
  { text: 'into', start: 11.860, end: 12.040 },
  { text: 'the', start: 12.080, end: 12.200 },
  { text: 'dark.', start: 12.240, end: 12.604 },
  { text: 'One', start: 13.440, end: 13.600 },
  { text: 'like', start: 13.640, end: 13.760 },
  { text: 'it', start: 13.800, end: 13.880 },
  { text: 'hid', start: 13.940, end: 14.060 },
  { text: 'in', start: 14.080, end: 14.140 },
  { text: 'an', start: 14.180, end: 14.320 },
  { text: 'English', start: 14.360, end: 14.620 },
  { text: 'aquarium', start: 14.660, end: 15.120 },
  { text: 'for', start: 15.220, end: 15.340 },
  { text: 'MONTHS.', start: 15.540, end: 15.938 },
  { text: 'They', start: 16.383, end: 16.480 },
  { text: 'named', start: 16.500, end: 16.680 },
  { text: 'him', start: 16.700, end: 16.840 },
  { text: 'Barry.', start: 16.880, end: 17.241 },
  { text: 'And', start: 17.608, end: 17.780 },
  { text: 'Barry', start: 17.900, end: 18.200 },
  { text: 'knows:', start: 18.300, end: 18.800 },
];
