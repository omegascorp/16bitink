/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-11-03: generation NNzD1ASyfcy8z6lxZ6jk, its first 0.100 s of silence trimmed.
 * Pauses longer than 0.42 s (silencedetect at -40 dB) were cut to 0.42 s from their middles, with 10 ms crossfades: 2 in the original take, 0.50 s, 0.42 s long (original times 2.88-3.38 s; 15.35-15.78 s).
 * Then sped up by TEMPO (pitch kept) with ffmpeg's atempo, to end about 0.3 s
 * before the 18 s loop point. WORDS are its words with start and end times in
 * the trimmed, pause-shortened take (ElevenLabs Scribe), so divide by TEMPO for
 * voice.mp3. Word edges are fixed from the waveform (silencedetect at -40 dB):
 * a word after a pause starts where the sound comes back, the word before ends
 * where the pause begins; the first word starts where the sound does, and the
 * last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…no problem. Because / " followed by the first line, "this snake swallows eggs wider than its own head!".
 */
export const TEMPO = 1.058;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 18;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.060, end: 0.220 },
  { text: 'snake', start: 0.320, end: 0.580 },
  { text: 'swallows', start: 0.680, end: 1.000 },
  { text: 'eggs', start: 1.160, end: 1.380 },
  { text: 'wider', start: 1.520, end: 1.800 },
  { text: 'than', start: 1.820, end: 1.900 },
  { text: 'its', start: 1.940, end: 2.080 },
  { text: 'own', start: 2.120, end: 2.260 },
  { text: 'HEAD!', start: 2.400, end: 2.782 },
  { text: 'Africa\'s', start: 3.202, end: 3.780 },
  { text: 'egg-eater', start: 3.840, end: 4.300 },
  { text: 'has', start: 4.340, end: 4.540 },
  { text: 'almost', start: 4.600, end: 4.940 },
  { text: 'no', start: 5.060, end: 5.240 },
  { text: 'teeth.', start: 5.300, end: 5.684 },
  { text: 'Instead,', start: 6.100, end: 6.620 },
  { text: 'it', start: 6.920, end: 7.020 },
  { text: 'cracks', start: 7.100, end: 7.420 },
  { text: 'the', start: 7.460, end: 7.600 },
  { text: 'egg', start: 7.640, end: 7.800 },
  { text: 'INSIDE', start: 7.980, end: 8.420 },
  { text: 'its', start: 8.440, end: 8.640 },
  { text: 'neck,', start: 8.780, end: 9.020 },
  { text: 'on', start: 9.320, end: 9.500 },
  { text: 'spikes', start: 9.640, end: 9.940 },
  { text: 'from', start: 9.960, end: 10.060 },
  { text: 'its', start: 10.080, end: 10.300 },
  { text: 'BACKBONE!', start: 10.320, end: 10.900 },
  { text: 'It', start: 11.245, end: 11.600 },
  { text: 'gulps', start: 11.740, end: 12.020 },
  { text: 'the', start: 12.080, end: 12.160 },
  { text: 'yolk…', start: 12.200, end: 12.659 },
  { text: 'then', start: 12.824, end: 12.940 },
  { text: 'spits', start: 13.160, end: 13.360 },
  { text: 'the', start: 13.400, end: 13.500 },
  { text: 'shell', start: 13.520, end: 13.700 },
  { text: 'back', start: 13.780, end: 13.980 },
  { text: 'out,', start: 14.060, end: 14.240 },
  { text: 'folded', start: 14.440, end: 14.680 },
  { text: 'flat!', start: 14.820, end: 15.173 },
  { text: 'No', start: 15.593, end: 15.780 },
  { text: 'teeth,', start: 15.900, end: 16.219 },
  { text: 'no', start: 16.420, end: 16.520 },
  { text: 'plate,', start: 16.620, end: 16.871 },
  { text: 'no', start: 17.032, end: 17.280 },
  { text: 'problem.', start: 17.380, end: 17.850 },
  { text: 'Because', start: 18.153, end: 18.721 },
];
