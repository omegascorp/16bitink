/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-31: generation RZfSHOIJRGUJLxtzME34, its first 0.0635 s of silence trimmed.
 * Pauses longer than 0.42 s (silencedetect at -40 dB): none worth cutting (the longest, before "Because", is 0.425 s), so none were shortened.
 * Then sped up by TEMPO (pitch kept) with ffmpeg's atempo (1.0257), to end about 0.3 s
 * before the 19.5 s loop point. WORDS are its words with start and end times in
 * the trimmed take (ElevenLabs Scribe), so divide by TEMPO for
 * voice.mp3. Scribe's echoed audio tags are dropped, and word edges are fixed
 * from the waveform (silencedetect at -40 dB): a word after a pause starts where
 * the sound comes back, the word before ends where the pause begins; the first
 * word starts where the sound does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So who's the predator now? Because / " followed by the first line, "this seal hunts sharks!".
 */
export const TEMPO = 1.0257;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 19.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.050, end: 0.440 },
  { text: 'seal', start: 0.540, end: 0.800 },
  { text: 'HUNTS', start: 0.920, end: 1.200 },
  { text: 'sharks!', start: 1.380, end: 2.006 },
  { text: 'Off', start: 2.424, end: 2.600 },
  { text: 'Cape', start: 2.720, end: 2.900 },
  { text: 'Point,', start: 3.000, end: 3.220 },
  { text: 'South', start: 3.320, end: 3.540 },
  { text: 'Africa,', start: 3.620, end: 4.067 },
  { text: 'great', start: 4.358, end: 4.700 },
  { text: 'whites', start: 4.820, end: 5.200 },
  { text: 'eat', start: 5.240, end: 5.400 },
  { text: 'seals…', start: 5.580, end: 6.109 },
  { text: 'but', start: 6.449, end: 6.720 },
  { text: 'one', start: 6.800, end: 7.000 },
  { text: 'young', start: 7.060, end: 7.220 },
  { text: 'seal', start: 7.340, end: 7.520 },
  { text: 'flipped', start: 7.700, end: 7.940 },
  { text: 'the', start: 7.960, end: 8.060 },
  { text: 'script!', start: 8.100, end: 8.546 },
  { text: 'It', start: 8.869, end: 9.040 },
  { text: 'caught', start: 9.080, end: 9.280 },
  { text: 'FIVE', start: 9.520, end: 9.820 },
  { text: 'blue', start: 9.920, end: 10.100 },
  { text: 'sharks', start: 10.200, end: 10.580 },
  { text: 'in', start: 10.620, end: 10.780 },
  { text: 'two', start: 10.860, end: 11.060 },
  { text: 'hours!', start: 11.260, end: 11.730 },
  { text: 'And', start: 11.954, end: 12.180 },
  { text: 'ate', start: 12.320, end: 12.520 },
  { text: 'only', start: 12.620, end: 12.860 },
  { text: 'the', start: 12.900, end: 13.060 },
  { text: 'best', start: 13.100, end: 13.320 },
  { text: 'bits.', start: 13.400, end: 13.707 },
  { text: 'Some', start: 14.100, end: 14.380 },
  { text: 'of', start: 14.420, end: 14.460 },
  { text: 'those', start: 14.500, end: 14.660 },
  { text: 'sharks', start: 14.720, end: 15.020 },
  { text: 'were', start: 15.060, end: 15.140 },
  { text: 'as', start: 15.180, end: 15.280 },
  { text: 'long', start: 15.360, end: 15.560 },
  { text: 'as', start: 15.600, end: 15.680 },
  { text: 'the', start: 15.720, end: 15.840 },
  { text: 'seal', start: 15.900, end: 16.079 },
  { text: 'itself…', start: 16.140, end: 16.775 },
  { text: 'So', start: 17.118, end: 17.520 },
  { text: 'who\'s', start: 17.580, end: 17.780 },
  { text: 'the', start: 17.820, end: 17.920 },
  { text: 'predator', start: 17.960, end: 18.280 },
  { text: 'now?', start: 18.380, end: 18.713 },
  { text: 'Because', start: 19.137, end: 19.694 },
];
