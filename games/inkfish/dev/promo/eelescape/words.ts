/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-26: generation WGfwtZYgA31Qqw0juPor, its first
 * 0.039 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 18 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe),
 * so divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped,
 * and word edges are fixed from the waveform (silencedetect at -40 dB): a word
 * after a pause starts where the sound comes back, the word before ends where
 * the pause begins; the first word starts where the sound does, and the last
 * ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So yes, / this eel got swallowed alive… and ESCAPED!"
 */
export const TEMPO = 1.091;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 18;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.050, end: 0.360 },
  { text: 'eel', start: 0.460, end: 0.620 },
  { text: 'got', start: 0.700, end: 0.900 },
  { text: 'swallowed', start: 0.980, end: 1.340 },
  { text: 'alive…', start: 1.400, end: 1.986 },
  { text: 'and', start: 2.334, end: 2.440 },
  { text: 'ESCAPED!', start: 2.500, end: 3.222 },
  { text: 'Scientists', start: 3.690, end: 4.300 },
  { text: 'in', start: 4.320, end: 4.400 },
  { text: 'Japan', start: 4.440, end: 4.920 },
  { text: 'X-rayed', start: 5.220, end: 5.460 },
  { text: 'fish', start: 5.620, end: 5.860 },
  { text: 'that', start: 5.900, end: 5.980 },
  { text: 'had', start: 6.000, end: 6.180 },
  { text: 'just', start: 6.280, end: 6.540 },
  { text: 'eaten', start: 6.600, end: 6.800 },
  { text: 'young', start: 6.900, end: 7.140 },
  { text: 'eels.', start: 7.220, end: 7.606 },
  { text: 'Inside', start: 8.018, end: 8.440 },
  { text: 'the', start: 8.480, end: 8.580 },
  { text: 'stomach,', start: 8.700, end: 9.060 },
  { text: 'an', start: 9.320, end: 9.460 },
  { text: 'eel', start: 9.540, end: 9.720 },
  { text: 'lasts', start: 9.780, end: 10.040 },
  { text: 'about', start: 10.100, end: 10.400 },
  { text: 'three', start: 10.460, end: 10.680 },
  { text: 'minutes…', start: 10.780, end: 11.218 },
  { text: 'so', start: 11.552, end: 11.720 },
  { text: 'they', start: 11.760, end: 11.900 },
  { text: 'swam', start: 11.960, end: 12.260 },
  { text: 'BACKWARDS,', start: 12.420, end: 13.003 },
  { text: 'up', start: 13.199, end: 13.420 },
  { text: 'the', start: 13.460, end: 13.560 },
  { text: 'throat,', start: 13.580, end: 13.930 },
  { text: 'and', start: 14.102, end: 14.340 },
  { text: 'squeezed', start: 14.460, end: 14.900 },
  { text: 'out', start: 14.960, end: 15.100 },
  { text: 'through', start: 15.120, end: 15.240 },
  { text: 'the', start: 15.280, end: 15.420 },
  { text: 'GILLS!', start: 15.460, end: 15.939 },
  { text: 'About', start: 16.600, end: 16.940 },
  { text: 'one', start: 17.080, end: 17.200 },
  { text: 'in', start: 17.240, end: 17.400 },
  { text: 'four', start: 17.460, end: 17.640 },
  { text: 'made', start: 17.740, end: 17.920 },
  { text: 'it.', start: 17.960, end: 18.080 },
  { text: 'So', start: 18.436, end: 18.800 },
  { text: 'yes,', start: 18.860, end: 19.312 },
];
