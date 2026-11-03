/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-11-03: generation mIfPHdumBxZhUcHeLNGy, its first 0.069 s of silence trimmed.
 * Pauses longer than 0.42 s (silencedetect at -40 dB) were cut to 0.42 s from their middles, with 10 ms crossfades: 3 in the original take, 0.56 s, 0.55 s, 0.43 s long (original times 3.73-4.30 s; 6.23-6.78 s; 14.12-14.54 s).
 * Then sped up by TEMPO (pitch kept) with ffmpeg's atempo, to end about 0.3 s
 * before the 19.5 s loop point. WORDS are its words with start and end times in
 * the trimmed, pause-shortened take (ElevenLabs Scribe), so divide by TEMPO for
 * voice.mp3. Word edges are fixed from the waveform (silencedetect at -40 dB):
 * a word after a pause starts where the sound comes back, the word before ends
 * where the pause begins; the first word starts where the sound does, and the
 * last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Nobody knows. But somehow, / " followed by the first line, "the slowest shark on Earth… had a polar bear in its stomach!".
 */
export const TEMPO = 1.027;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 19.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'The', start: 0.000, end: 0.140 },
  { text: 'slowest', start: 0.260, end: 0.680 },
  { text: 'shark', start: 0.740, end: 0.980 },
  { text: 'on', start: 1.040, end: 1.169 },
  { text: 'Earth…', start: 1.275, end: 1.633 },
  { text: 'had', start: 1.972, end: 2.100 },
  { text: 'a', start: 2.140, end: 2.186 },
  { text: 'POLAR', start: 2.294, end: 2.700 },
  { text: 'BEAR', start: 2.800, end: 2.980 },
  { text: 'in', start: 3.000, end: 3.060 },
  { text: 'its', start: 3.080, end: 3.200 },
  { text: 'stomach!', start: 3.280, end: 3.665 },
  { text: 'Svalbard,', start: 4.084, end: 4.823 },
  { text: 'two thousand eight.', start: 5.089, end: 6.011 },
  { text: 'Inside', start: 6.434, end: 6.840 },
  { text: 'a', start: 6.900, end: 6.980 },
  { text: 'Greenland', start: 7.020, end: 7.440 },
  { text: 'shark,', start: 7.520, end: 7.843 },
  { text: 'scientists', start: 8.013, end: 8.600 },
  { text: 'found', start: 8.640, end: 8.800 },
  { text: 'part', start: 8.920, end: 9.100 },
  { text: 'of', start: 9.120, end: 9.180 },
  { text: 'a', start: 9.240, end: 9.260 },
  { text: 'young', start: 9.420, end: 9.620 },
  { text: 'bear\'s', start: 9.720, end: 10.020 },
  { text: 'JAW.', start: 10.220, end: 10.611 },
  { text: 'This', start: 10.952, end: 11.400 },
  { text: 'shark', start: 11.460, end: 11.720 },
  { text: 'cruises', start: 11.780, end: 12.140 },
  { text: 'at', start: 12.160, end: 12.280 },
  { text: 'under', start: 12.340, end: 12.520 },
  { text: 'one', start: 12.760, end: 12.940 },
  { text: 'mile', start: 13.040, end: 13.260 },
  { text: 'an', start: 13.300, end: 13.380 },
  { text: 'hour!', start: 13.460, end: 13.771 },
  { text: 'So', start: 14.191, end: 14.580 },
  { text: 'did', start: 14.620, end: 14.700 },
  { text: 'it', start: 14.720, end: 14.860 },
  { text: 'catch', start: 14.940, end: 15.180 },
  { text: 'the', start: 15.220, end: 15.300 },
  { text: 'bear…', start: 15.320, end: 15.650 },
  { text: 'or', start: 15.775, end: 16.140 },
  { text: 'find', start: 16.320, end: 16.500 },
  { text: 'it', start: 16.520, end: 16.580 },
  { text: 'already', start: 16.640, end: 16.880 },
  { text: 'dead?', start: 17.000, end: 17.275 },
  { text: 'Nobody', start: 17.689, end: 18.160 },
  { text: 'knows.', start: 18.240, end: 18.851 },
  { text: 'But', start: 19.031, end: 19.160 },
  { text: 'somehow,', start: 19.220, end: 19.722 },
];
