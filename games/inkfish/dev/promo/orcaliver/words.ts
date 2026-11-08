/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-26: generation cuIU9bgZefwptIMv9E7S, its first
 * 0.055 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 16.5 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe),
 * so divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped,
 * and word edges are fixed from the waveform (silencedetect at -40 dB): a word
 * after a pause starts where the sound comes back, the word before ends where
 * the pause begins; the first word starts where the sound does, and the last
 * ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Because yes, / orcas only eat ONE part of a great white."
 */
export const TEMPO = 1.067;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 16.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'Orcas', start: 0.050, end: 0.420 },
  { text: 'only', start: 0.560, end: 0.760 },
  { text: 'eat', start: 0.860, end: 1.020 },
  { text: 'ONE', start: 1.260, end: 1.480 },
  { text: 'part', start: 1.580, end: 1.740 },
  { text: 'of', start: 1.780, end: 1.820 },
  { text: 'a', start: 1.860, end: 1.920 },
  { text: 'great', start: 1.960, end: 2.160 },
  { text: 'white.', start: 2.240, end: 2.550 },
  { text: 'Off', start: 3.025, end: 3.340 },
  { text: 'Mexico,', start: 3.440, end: 3.940 },
  { text: 'a', start: 4.360, end: 4.440 },
  { text: 'pod', start: 4.500, end: 4.760 },
  { text: 'flipped', start: 4.860, end: 5.120 },
  { text: 'young', start: 5.180, end: 5.340 },
  { text: 'great', start: 5.380, end: 5.580 },
  { text: 'whites', start: 5.640, end: 5.940 },
  { text: 'upside', start: 6.020, end: 6.420 },
  { text: 'down…', start: 6.460, end: 6.873 },
  { text: 'and', start: 7.262, end: 7.340 },
  { text: 'a', start: 7.400, end: 7.480 },
  { text: 'shark', start: 7.540, end: 7.760 },
  { text: 'on', start: 7.800, end: 7.860 },
  { text: 'its', start: 7.900, end: 8.119 },
  { text: 'back', start: 8.160, end: 8.380 },
  { text: 'goes', start: 8.420, end: 8.620 },
  { text: 'LIMP.', start: 8.820, end: 9.172 },
  { text: 'Then', start: 9.505, end: 9.740 },
  { text: 'they', start: 9.760, end: 9.860 },
  { text: 'went', start: 9.900, end: 10.060 },
  { text: 'straight', start: 10.180, end: 10.440 },
  { text: 'for', start: 10.480, end: 10.580 },
  { text: 'the', start: 10.620, end: 10.720 },
  { text: 'LIVER!', start: 10.820, end: 11.224 },
  { text: 'It\'s', start: 11.568, end: 11.680 },
  { text: 'about', start: 11.740, end: 11.880 },
  { text: 'a', start: 11.920, end: 12.000 },
  { text: 'QUARTER', start: 12.100, end: 12.420 },
  { text: 'of', start: 12.460, end: 12.520 },
  { text: 'a', start: 12.560, end: 12.620 },
  { text: 'shark\'s', start: 12.660, end: 12.980 },
  { text: 'body,', start: 13.020, end: 13.320 },
  { text: 'all', start: 13.520, end: 13.780 },
  { text: 'fat', start: 13.840, end: 14.040 },
  { text: 'and', start: 14.060, end: 14.140 },
  { text: 'energy.', start: 14.260, end: 14.666 },
  { text: 'Picky', start: 15.030, end: 15.380 },
  { text: 'eaters.', start: 15.460, end: 15.882 },
  { text: 'Because', start: 16.354, end: 16.740 },
  { text: 'yes,', start: 16.900, end: 17.281 },
];
