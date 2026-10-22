/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-22: generation 7P1HEh79qHw5ZMGPJYdc, its first
 * 0.083 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 19.5 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe),
 * so divide by TEMPO for voice.mp3. The first word starts where the sound
 * does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Bird, fish… whatever floats. So yes, / these sharks eat birds that fall out of the SKY!"
 */
export const TEMPO = 1.073;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 19.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'These', start: 0.000, end: 0.260 },
  { text: 'sharks', start: 0.320, end: 0.620 },
  { text: 'eat', start: 0.700, end: 0.820 },
  { text: 'birds', start: 0.980, end: 1.240 },
  { text: 'that', start: 1.280, end: 1.360 },
  { text: 'fall', start: 1.500, end: 1.660 },
  { text: 'out', start: 1.680, end: 1.760 },
  { text: 'of', start: 1.800, end: 1.840 },
  { text: 'the', start: 1.880, end: 2.000 },
  { text: 'SKY!', start: 2.080, end: 2.600 },
  { text: 'Every', start: 3.360, end: 3.620 },
  { text: 'autumn,', start: 3.700, end: 3.980 },
  { text: 'millions', start: 4.440, end: 4.800 },
  { text: 'of', start: 4.840, end: 4.900 },
  { text: 'songbirds', start: 5.020, end: 5.540 },
  { text: 'fly', start: 5.660, end: 5.860 },
  { text: 'across', start: 5.900, end: 6.260 },
  { text: 'the', start: 6.300, end: 6.400 },
  { text: 'Gulf…', start: 6.440, end: 6.760 },
  { text: 'and', start: 7.420, end: 7.540 },
  { text: 'when', start: 7.700, end: 7.780 },
  { text: 'a', start: 7.820, end: 7.900 },
  { text: 'storm', start: 8.000, end: 8.260 },
  { text: 'hits,', start: 8.300, end: 8.600 },
  { text: 'some', start: 8.960, end: 9.180 },
  { text: 'drop', start: 9.220, end: 9.440 },
  { text: 'into', start: 9.480, end: 9.640 },
  { text: 'the', start: 9.680, end: 9.780 },
  { text: 'sea.', start: 9.840, end: 10.080 },
  { text: 'Right', start: 10.740, end: 10.940 },
  { text: 'below:', start: 10.980, end: 11.340 },
  { text: 'young', start: 11.840, end: 12.080 },
  { text: 'tiger', start: 12.240, end: 12.540 },
  { text: 'sharks.', start: 12.640, end: 13.020 },
  { text: 'Scientists', start: 13.560, end: 13.960 },
  { text: 'found', start: 14.000, end: 14.180 },
  { text: 'birds', start: 14.260, end: 14.500 },
  { text: 'inside', start: 14.540, end: 14.840 },
  { text: 'FORTY-ONE', start: 15.040, end: 15.780 },
  { text: 'of', start: 15.820, end: 15.880 },
  { text: 'a', start: 15.920, end: 15.960 },
  { text: 'hundred', start: 16.020, end: 16.239 },
  { text: 'and', start: 16.260, end: 16.340 },
  { text: 'five!', start: 16.480, end: 16.900 },
  { text: 'Bird,', start: 17.360, end: 17.760 },
  { text: 'fish…', start: 18.040, end: 18.360 },
  { text: 'whatever', start: 18.800, end: 19.060 },
  { text: 'floats.', start: 19.160, end: 19.520 },
  { text: 'So', start: 20.060, end: 20.180 },
  { text: 'yes,', start: 20.240, end: 20.600 },
];
