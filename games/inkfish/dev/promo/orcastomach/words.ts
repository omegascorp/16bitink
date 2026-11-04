/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-11-04: generation WehkdEdBupErG2p6y9p6 (take 4 of 4), no leading silence trimmed.
 * Pauses longer than 0.42 s (silencedetect at -40 dB) were cut to 0.42 s from their middles, with 10 ms crossfades: 6 in the original take, 0.60 s, 0.45 s, 0.62 s, 0.62 s, 0.62 s, 0.53 s long (original times 6.54-7.14 s; 11.73-12.18 s; 13.89-14.51 s; 15.71-16.33 s; 17.32-17.94 s; 20.03-20.56 s).
 * Then sped up by TEMPO (pitch kept) with ffmpeg's atempo, to end about 0.3 s
 * before the 21 s loop point. WORDS are its words with start and end times in
 * the trimmed, pause-shortened take (ElevenLabs Scribe), so divide by TEMPO for
 * voice.mp3. Word edges are fixed from the waveform (silencedetect at -40 dB):
 * a word after a pause starts where the sound comes back, the word before ends
 * where the pause begins; the first word starts where the sound does, and the
 * last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So yes, / " followed by the first line, "this orca ate thirteen porpoises…".
 */
export const TEMPO = 1.153;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 21;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.080, end: 0.240 },
  { text: 'orca', start: 0.320, end: 0.640 },
  { text: 'ate', start: 0.720, end: 0.960 },
  { text: 'THIRTEEN', start: 1.040, end: 1.600 },
  { text: 'porpoises…', start: 1.680, end: 2.480 },
  { text: 'and', start: 2.600, end: 2.720 },
  { text: 'FOURTEEN', start: 2.880, end: 3.360 },
  { text: 'seals!', start: 3.520, end: 4.136 },
  { text: 'Denmark,', start: 4.468, end: 5.133 },
  { text: '1861.', start: 5.366, end: 6.544 },
  { text: 'A', start: 6.953, end: 7.010 },
  { text: 'scientist', start: 7.090, end: 7.570 },
  { text: 'opens', start: 7.650, end: 7.970 },
  { text: 'one', start: 8.130, end: 8.290 },
  { text: 'killer', start: 8.370, end: 8.610 },
  { text: 'whale\'s', start: 8.650, end: 8.930 },
  { text: 'stomach,', start: 9.010, end: 9.385 },
  { text: 'and', start: 9.602, end: 9.730 },
  { text: 'starts', start: 9.810, end: 10.130 },
  { text: 'counting', start: 10.210, end: 10.530 },
  { text: 'what\'s', start: 10.610, end: 10.730 },
  { text: 'left', start: 10.770, end: 10.930 },
  { text: 'inside.', start: 11.210, end: 11.541 },
  { text: 'Ten', start: 11.951, end: 12.137 },
  { text: 'fingers', start: 12.301, end: 12.969 },
  { text: 'weren\'t', start: 13.049, end: 13.209 },
  { text: 'enough.', start: 13.289, end: 13.659 },
  { text: 'Was', start: 14.035, end: 14.115 },
  { text: 'it', start: 14.195, end: 14.275 },
  { text: 'all', start: 14.355, end: 14.515 },
  { text: 'one', start: 14.675, end: 14.835 },
  { text: 'meal?', start: 14.915, end: 15.266 },
  { text: 'Nobody', start: 15.676, end: 15.986 },
  { text: 'thinks', start: 16.066, end: 16.306 },
  { text: 'so…', start: 16.386, end: 16.664 },
  { text: 'but', start: 17.074, end: 17.196 },
  { text: 'nobody', start: 17.411, end: 17.774 },
  { text: 'knows', start: 17.854, end: 18.014 },
  { text: 'how', start: 18.094, end: 18.174 },
  { text: 'long', start: 18.254, end: 18.414 },
  { text: 'it', start: 18.494, end: 18.574 },
  { text: 'took,', start: 18.654, end: 18.814 },
  { text: 'either.', start: 18.974, end: 19.161 },
  { text: 'One', start: 19.571, end: 19.810 },
  { text: 'thing\'s', start: 19.890, end: 20.050 },
  { text: 'for', start: 20.130, end: 20.210 },
  { text: 'sure:', start: 20.290, end: 20.548 },
  { text: 'that', start: 20.948, end: 21.170 },
  { text: 'orca', start: 21.370, end: 21.570 },
  { text: 'never', start: 21.810, end: 22.050 },
  { text: 'skipped', start: 22.130, end: 22.370 },
  { text: 'lunch.', start: 22.450, end: 22.803 },
  { text: 'So', start: 23.207, end: 23.410 },
  { text: 'yes,', start: 23.490, end: 23.866 },
];
