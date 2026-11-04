/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-11-04: generation 6O4FFZa92UscAJYOEQK5 (take 1 of 4), no leading silence trimmed.
 * Pauses longer than 0.42 s (silencedetect at -40 dB) were cut to 0.42 s from their middles, with 10 ms crossfades: 6 in the original take, 0.44 s, 0.52 s, 0.43 s, 0.47 s, 0.52 s, 0.44 s long (original times 2.62-3.06 s; 4.19-4.71 s; 9.79-10.23 s; 16.77-17.24 s; 17.70-18.22 s; 22.19-22.63 s).
 * Then sped up by TEMPO (pitch kept) with ffmpeg's atempo, to end about 0.3 s
 * before the 22.5 s loop point. WORDS are its words with start and end times in
 * the trimmed, pause-shortened take (ElevenLabs Scribe), so divide by TEMPO for
 * voice.mp3. Word edges are fixed from the waveform (silencedetect at -40 dB):
 * a word after a pause starts where the sound comes back, the word before ends
 * where the pause begins; the first word starts where the sound does, and the
 * last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…it's because / " followed by the first line, "this fish comes out of the water…".
 */
export const TEMPO = 1.135;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 22.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.080, end: 0.240 },
  { text: 'fish', start: 0.400, end: 0.640 },
  { text: 'comes', start: 0.720, end: 0.880 },
  { text: 'out', start: 0.920, end: 0.960 },
  { text: 'of', start: 1.040, end: 1.080 },
  { text: 'the', start: 1.120, end: 1.200 },
  { text: 'WATER', start: 1.280, end: 1.520 },
  { text: 'to', start: 1.600, end: 1.680 },
  { text: 'eat', start: 1.800, end: 1.920 },
  { text: 'pigeons!', start: 1.960, end: 2.625 },
  { text: 'Albi,', start: 3.035, end: 3.491 },
  { text: 'France.', start: 3.651, end: 4.161 },
  { text: 'Pigeons', start: 4.571, end: 4.903 },
  { text: 'washing', start: 4.983, end: 5.303 },
  { text: 'on', start: 5.383, end: 5.463 },
  { text: 'a', start: 5.516, end: 5.570 },
  { text: 'gravel', start: 5.623, end: 5.943 },
  { text: 'island…', start: 6.103, end: 6.606 },
  { text: 'and', start: 6.929, end: 7.303 },
  { text: 'something', start: 7.463, end: 7.863 },
  { text: 'huge', start: 8.103, end: 8.503 },
  { text: 'sliding', start: 8.583, end: 8.903 },
  { text: 'up', start: 8.983, end: 9.063 },
  { text: 'behind', start: 9.143, end: 9.383 },
  { text: 'them.', start: 9.463, end: 9.656 },
  { text: 'WHAM!', start: 10.066, end: 10.638 },
  { text: 'A', start: 10.878, end: 10.958 },
  { text: 'five-foot', start: 11.118, end: 11.598 },
  { text: 'catfish,', start: 11.678, end: 12.318 },
  { text: 'half', start: 12.438, end: 12.558 },
  { text: 'out', start: 12.638, end: 12.718 },
  { text: 'of', start: 12.745, end: 12.771 },
  { text: 'the', start: 12.798, end: 12.838 },
  { text: 'river!', start: 12.878, end: 13.278 },
  { text: 'Four', start: 13.758, end: 13.918 },
  { text: 'seconds,', start: 14.078, end: 14.478 },
  { text: 'tops,', start: 14.638, end: 14.878 },
  { text: 'and', start: 14.918, end: 14.958 },
  { text: 'it\'s', start: 15.038, end: 15.198 },
  { text: 'gone,', start: 15.278, end: 15.646 },
  { text: 'with', start: 15.839, end: 16.078 },
  { text: 'lunch!', start: 16.158, end: 16.607 },
  { text: 'The', start: 17.017, end: 17.134 },
  { text: 'trick?', start: 17.174, end: 17.476 },
  { text: 'Pigeons', start: 17.886, end: 18.223 },
  { text: 'that', start: 18.263, end: 18.303 },
  { text: 'stand', start: 18.383, end: 18.623 },
  { text: 'still', start: 18.703, end: 19.023 },
  { text: 'get', start: 19.103, end: 19.263 },
  { text: 'ignored.', start: 19.503, end: 19.778 },
  { text: 'It', start: 20.151, end: 20.223 },
  { text: 'only', start: 20.303, end: 20.543 },
  { text: 'grabs', start: 20.623, end: 20.863 },
  { text: 'the', start: 20.903, end: 20.943 },
  { text: 'ones', start: 21.023, end: 21.183 },
  { text: 'that', start: 21.263, end: 21.343 },
  { text: 'MOVE.', start: 21.503, end: 21.857 },
  { text: 'So', start: 22.267, end: 22.515 },
  { text: 'if', start: 22.595, end: 22.675 },
  { text: 'a', start: 22.715, end: 22.755 },
  { text: 'pigeon', start: 22.835, end: 23.075 },
  { text: 'ever', start: 23.235, end: 23.395 },
  { text: 'looks', start: 23.475, end: 23.635 },
  { text: 'nervous…', start: 23.715, end: 24.175 },
  { text: 'it\'s', start: 24.492, end: 24.635 },
  { text: 'because', start: 24.675, end: 25.186 },
];
