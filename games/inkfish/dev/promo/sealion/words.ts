/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-11-01: generation HWp5CbdBERdr4pkFCgLs, no leading silence to trim.
 * Pauses longer than 0.42 s (silencedetect at -40 dB) were cut to 0.42 s from their middles, with 10 ms crossfades: 2 in the original take, 0.48 s, 0.50 s long (original times 3.23-3.29 s; 10.74-10.82 s).
 * Then sped up by TEMPO (pitch kept) with ffmpeg's atempo, to end about 0.3 s
 * before the 18 s loop point. WORDS are its words with start and end times in
 * the trimmed, pause-shortened take (ElevenLabs Scribe), so divide by TEMPO for
 * voice.mp3. Word edges are fixed from the waveform (silencedetect at -40 dB):
 * a word after a pause starts where the sound comes back, the word before ends
 * where the pause begins; the first word starts where the sound does, and the
 * last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So yes, / " followed by the first line, "this whale caught a sea lion… by mistake!".
 */
export const TEMPO = 1.089;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 18;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.083, end: 0.300 },
  { text: 'whale', start: 0.480, end: 0.760 },
  { text: 'caught', start: 0.860, end: 0.980 },
  { text: 'a', start: 1.040, end: 1.140 },
  { text: 'sea', start: 1.220, end: 1.420 },
  { text: 'lion…', start: 1.460, end: 1.817 },
  { text: 'by', start: 2.093, end: 2.300 },
  { text: 'MISTAKE!', start: 2.360, end: 3.024 },
  { text: 'Monterey', start: 3.434, end: 3.920 },
  { text: 'Bay,', start: 4.019, end: 4.300 },
  { text: 'twenty nineteen:', start: 4.620, end: 5.340 },
  { text: 'humpbacks', start: 5.649, end: 6.220 },
  { text: 'gulping', start: 6.420, end: 6.820 },
  { text: 'anchovies…', start: 6.920, end: 7.576 },
  { text: 'and', start: 7.894, end: 8.119 },
  { text: 'one', start: 8.360, end: 8.460 },
  { text: 'came', start: 8.580, end: 8.740 },
  { text: 'up', start: 8.780, end: 8.880 },
  { text: 'with', start: 8.920, end: 9.000 },
  { text: 'a', start: 9.020, end: 9.140 },
  { text: 'sea', start: 9.300, end: 9.500 },
  { text: 'lion', start: 9.560, end: 9.800 },
  { text: 'in', start: 9.840, end: 9.900 },
  { text: 'its', start: 9.940, end: 10.080 },
  { text: 'MOUTH!', start: 10.140, end: 10.460 },
  { text: 'But', start: 10.871, end: 11.020 },
  { text: 'a', start: 11.080, end: 11.140 },
  { text: 'humpback\'s', start: 11.200, end: 11.720 },
  { text: 'throat', start: 11.760, end: 12.080 },
  { text: 'is', start: 12.120, end: 12.209 },
  { text: 'only', start: 12.342, end: 12.640 },
  { text: 'about', start: 12.700, end: 12.880 },
  { text: 'as', start: 12.920, end: 13.060 },
  { text: 'wide', start: 13.120, end: 13.300 },
  { text: 'as', start: 13.340, end: 13.420 },
  { text: 'your', start: 13.460, end: 13.520 },
  { text: 'fist.', start: 13.720, end: 14.060 },
  { text: 'So', start: 14.700, end: 14.840 },
  { text: 'the', start: 14.880, end: 15.000 },
  { text: 'whale', start: 15.040, end: 15.240 },
  { text: 'just', start: 15.280, end: 15.402 },
  { text: 'paused…', start: 15.514, end: 15.960 },
  { text: 'and', start: 16.320, end: 16.420 },
  { text: 'the', start: 16.460, end: 16.540 },
  { text: 'sea', start: 16.620, end: 16.760 },
  { text: 'lion', start: 16.820, end: 17.040 },
  { text: 'slipped', start: 17.140, end: 17.360 },
  { text: 'right', start: 17.520, end: 17.720 },
  { text: 'out!', start: 17.800, end: 17.980 },
  { text: 'So', start: 18.376, end: 18.720 },
  { text: 'yes,', start: 18.880, end: 19.280 },
];
