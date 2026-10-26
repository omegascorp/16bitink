/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-26: generation wRuu2FXZo2o8Jq9FsEXl, its first
 * 0 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 18 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe),
 * so divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped,
 * and word edges are fixed from the waveform (silencedetect at -40 dB): a word
 * after a pause starts where the sound comes back, the word before ends where
 * the pause begins; the first word starts where the sound does, and the last
 * ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Remember, / this fish hides in the sand…"
 */
export const TEMPO = 1.132;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 18;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.375, end: 0.560 },
  { text: 'fish', start: 0.700, end: 0.900 },
  { text: 'hides', start: 0.980, end: 1.260 },
  { text: 'in', start: 1.280, end: 1.340 },
  { text: 'the', start: 1.380, end: 1.480 },
  { text: 'sand…', start: 1.540, end: 1.900 },
  { text: 'and', start: 2.454, end: 2.720 },
  { text: 'eats', start: 2.840, end: 3.060 },
  { text: 'whatever', start: 3.180, end: 3.540 },
  { text: 'swims', start: 3.580, end: 3.820 },
  { text: 'OVER', start: 3.900, end: 4.080 },
  { text: 'it.', start: 4.140, end: 4.300 },
  { text: 'A', start: 4.773, end: 4.860 },
  { text: 'stargazer:', start: 4.940, end: 5.582 },
  { text: 'eyes', start: 5.983, end: 6.200 },
  { text: 'on', start: 6.260, end: 6.380 },
  { text: 'top,', start: 6.440, end: 6.767 },
  { text: 'mouth', start: 6.951, end: 7.200 },
  { text: 'pointing', start: 7.300, end: 7.720 },
  { text: 'UP.', start: 7.800, end: 7.968 },
  { text: 'A', start: 8.432, end: 8.540 },
  { text: 'fish', start: 8.620, end: 8.780 },
  { text: 'drifts', start: 8.840, end: 9.100 },
  { text: 'by…', start: 9.140, end: 9.406 },
  { text: 'gone,', start: 9.712, end: 10.116 },
  { text: 'in', start: 10.276, end: 10.340 },
  { text: 'a', start: 10.400, end: 10.480 },
  { text: 'blink!', start: 10.500, end: 10.858 },
  { text: 'Some', start: 11.248, end: 11.680 },
  { text: 'even', start: 11.720, end: 11.920 },
  { text: 'zap', start: 12.100, end: 12.380 },
  { text: 'you,', start: 12.440, end: 12.560 },
  { text: 'about', start: 12.820, end: 13.000 },
  { text: 'fifty', start: 13.220, end: 13.480 },
  { text: 'VOLTS.', start: 13.640, end: 14.113 },
  { text: 'Plus', start: 14.375, end: 14.740 },
  { text: 'venom', start: 14.920, end: 15.180 },
  { text: 'spines.', start: 15.320, end: 15.720 },
  { text: 'Honestly?', start: 16.280, end: 16.740 },
  { text: 'The', start: 17.200, end: 17.260 },
  { text: 'most', start: 17.300, end: 17.480 },
  { text: 'unfair', start: 17.680, end: 18.120 },
  { text: 'fish', start: 18.240, end: 18.420 },
  { text: 'in', start: 18.460, end: 18.540 },
  { text: 'the', start: 18.580, end: 18.640 },
  { text: 'ocean.', start: 18.720, end: 19.100 },
  { text: 'Remember,', start: 19.476, end: 20.033 },
];
