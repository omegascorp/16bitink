/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-11-01: generation A0pZoOZn9Lc6oJjJa67B, its first 0.063 s of silence trimmed.
 * Pauses longer than 0.42 s (silencedetect at -40 dB) were cut to 0.42 s from their middles, with 10 ms crossfades: 2 in the original take, 0.47 s, 0.51 s long (original times 4.35-4.40 s; 20.00-20.09 s).
 * Then sped up by TEMPO (pitch kept) with ffmpeg's atempo, to end about 0.3 s
 * before the 19.5 s loop point. WORDS are its words with start and end times in
 * the trimmed, pause-shortened take (ElevenLabs Scribe), so divide by TEMPO for
 * voice.mp3. Word edges are fixed from the waveform (silencedetect at -40 dB):
 * a word after a pause starts where the sound comes back, the word before ends
 * where the pause begins; the first word starts where the sound does, and the
 * last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…And it all started when / " followed by the first line, "this leopard seal put a photographer's head in her mouth.".
 */
export const TEMPO = 1.106;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 19.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.050, end: 0.580 },
  { text: 'leopard', start: 0.640, end: 0.940 },
  { text: 'seal', start: 1.040, end: 1.240 },
  { text: 'put', start: 1.320, end: 1.420 },
  { text: 'a', start: 1.460, end: 1.520 },
  { text: 'photographer\'s', start: 1.540, end: 2.240 },
  { text: 'head…', start: 2.300, end: 2.540 },
  { text: 'in', start: 3.180, end: 3.260 },
  { text: 'her', start: 3.300, end: 3.440 },
  { text: 'MOUTH.', start: 3.560, end: 4.074 },
  { text: 'Antarctica,', start: 4.487, end: 5.317 },
  { text: 'two thousand six.', start: 5.414, end: 6.704 },
  { text: 'Her', start: 7.099, end: 7.260 },
  { text: 'head', start: 7.280, end: 7.440 },
  { text: 'was', start: 7.480, end: 7.740 },
  { text: 'bigger', start: 7.760, end: 8.000 },
  { text: 'than', start: 8.039, end: 8.119 },
  { text: 'a', start: 8.160, end: 8.260 },
  { text: 'grizzly', start: 8.320, end: 8.720 },
  { text: 'bear\'s!', start: 8.800, end: 9.195 },
  { text: 'But', start: 9.536, end: 9.840 },
  { text: 'she', start: 9.900, end: 10.020 },
  { text: 'didn\'t', start: 10.040, end: 10.280 },
  { text: 'bite…', start: 10.320, end: 10.635 },
  { text: 'she', start: 10.930, end: 11.160 },
  { text: 'brought', start: 11.180, end: 11.360 },
  { text: 'him', start: 11.360, end: 11.440 },
  { text: 'a', start: 11.500, end: 11.600 },
  { text: 'PENGUIN!', start: 11.660, end: 12.180 },
  { text: 'Then', start: 12.760, end: 12.880 },
  { text: 'another.', start: 12.920, end: 13.355 },
  { text: 'And', start: 13.642, end: 13.900 },
  { text: 'another.', start: 13.940, end: 14.490 },
  { text: 'For', start: 14.764, end: 14.860 },
  { text: 'four', start: 15.080, end: 15.300 },
  { text: 'DAYS!', start: 15.440, end: 15.992 },
  { text: 'He', start: 16.406, end: 16.480 },
  { text: 'says', start: 16.580, end: 16.780 },
  { text: 'she', start: 16.820, end: 16.980 },
  { text: 'thought', start: 17.020, end: 17.200 },
  { text: 'he', start: 17.240, end: 17.320 },
  { text: 'was', start: 17.360, end: 17.440 },
  { text: 'a', start: 17.520, end: 17.560 },
  { text: 'useless', start: 17.760, end: 18.100 },
  { text: 'hunter…', start: 18.160, end: 18.581 },
  { text: 'who\'d', start: 18.882, end: 19.100 },
  { text: 'starve.', start: 19.200, end: 19.665 },
  { text: 'And', start: 20.075, end: 20.160 },
  { text: 'it', start: 20.200, end: 20.280 },
  { text: 'all', start: 20.340, end: 20.500 },
  { text: 'started', start: 20.580, end: 20.920 },
  { text: 'when', start: 20.980, end: 21.240 },
];
