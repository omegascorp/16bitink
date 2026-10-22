/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-22: generation wJV7GZzAFZAuCZ5UK1Pe, its first
 * 0.112 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 18 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe),
 * so divide by TEMPO for voice.mp3. The first word starts where the sound
 * does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So right now, somewhere down there, / the Kraken is REAL… and THIS whale eats it!"
 */
export const TEMPO = 1.07;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 18;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'The', start: 0.000, end: 0.120 },
  { text: 'Kraken', start: 0.200, end: 0.640 },
  { text: 'is', start: 0.700, end: 0.880 },
  { text: 'REAL…', start: 0.980, end: 1.300 },
  { text: 'and', start: 1.680, end: 1.900 },
  { text: 'THIS', start: 1.960, end: 2.240 },
  { text: 'whale', start: 2.280, end: 2.520 },
  { text: 'eats', start: 2.760, end: 2.980 },
  { text: 'it!', start: 3.040, end: 3.220 },
  { text: 'Sperm', start: 3.880, end: 4.140 },
  { text: 'whales', start: 4.160, end: 4.440 },
  { text: 'dive', start: 4.480, end: 4.720 },
  { text: 'a', start: 4.760, end: 4.840 },
  { text: 'KILOMETER', start: 4.880, end: 5.540 },
  { text: 'down', start: 5.660, end: 5.920 },
  { text: 'to', start: 5.960, end: 6.040 },
  { text: 'hunt', start: 6.080, end: 6.320 },
  { text: 'giant', start: 6.380, end: 6.640 },
  { text: 'squid.', start: 6.740, end: 7.140 },
  { text: 'The', start: 7.600, end: 7.700 },
  { text: 'squid', start: 7.760, end: 8.020 },
  { text: 'fights', start: 8.140, end: 8.340 },
  { text: 'back.', start: 8.460, end: 8.760 },
  { text: 'Its', start: 9.240, end: 9.380 },
  { text: 'suckers', start: 9.440, end: 9.760 },
  { text: 'leave', start: 9.800, end: 9.940 },
  { text: 'scars', start: 10.060, end: 10.420 },
  { text: 'all', start: 10.620, end: 10.780 },
  { text: 'over', start: 10.840, end: 11.000 },
  { text: 'the', start: 11.040, end: 11.120 },
  { text: 'whale\'s', start: 11.140, end: 11.380 },
  { text: 'face!', start: 11.520, end: 11.900 },
  { text: 'It', start: 12.260, end: 12.380 },
  { text: 'probably', start: 12.440, end: 12.840 },
  { text: 'happens', start: 12.880, end: 13.320 },
  { text: 'EVERY', start: 13.420, end: 13.680 },
  { text: 'day…', start: 13.820, end: 14.120 },
  { text: 'and', start: 14.600, end: 14.760 },
  { text: 'nobody', start: 14.840, end: 15.180 },
  { text: 'has', start: 15.220, end: 15.480 },
  { text: 'ever', start: 15.580, end: 15.780 },
  { text: 'filmed', start: 15.900, end: 16.160 },
  { text: 'it.', start: 16.219, end: 16.340 },
  { text: 'So', start: 16.780, end: 16.900 },
  { text: 'right', start: 17.020, end: 17.200 },
  { text: 'now,', start: 17.260, end: 17.540 },
  { text: 'somewhere', start: 17.900, end: 18.300 },
  { text: 'down', start: 18.320, end: 18.560 },
  { text: 'there,', start: 18.600, end: 18.900 },
];
