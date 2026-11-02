/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-11-01: generation Gji6bKsieZie8DpMycpv, its first 0.064 s of silence trimmed.
 * Pauses longer than 0.42 s (silencedetect at -40 dB) were cut to 0.42 s from their middles, with 10 ms crossfades: 7 in the original take, 0.56 s, 0.63 s, 0.48 s, 0.53 s, 0.44 s, 0.61 s, 0.51 s long (original times 3.36-3.50 s; 5.84-6.05 s; 8.62-8.68 s; 15.91-16.02 s; 19.55-19.57 s; 20.34-20.53 s; 21.79-21.88 s).
 * Then sped up by TEMPO (pitch kept) with ffmpeg's atempo, to end about 0.3 s
 * before the 19.5 s loop point. WORDS are its words with start and end times in
 * the trimmed, pause-shortened take (ElevenLabs Scribe), so divide by TEMPO for
 * voice.mp3. Word edges are fixed from the waveform (silencedetect at -40 dB):
 * a word after a pause starts where the sound comes back, the word before ends
 * where the pause begins; the first word starts where the sound does, and the
 * last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Nobody knows… But / " followed by the first line, "this whale saved a seal from orcas!".
 */
export const TEMPO = 1.132;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 19.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.050, end: 0.280 },
  { text: 'whale', start: 0.480, end: 0.780 },
  { text: 'saved', start: 0.920, end: 1.140 },
  { text: 'a', start: 1.180, end: 1.280 },
  { text: 'seal…', start: 1.380, end: 1.765 },
  { text: 'from', start: 2.070, end: 2.304 },
  { text: 'ORCAS!', start: 2.419, end: 3.085 },
  { text: 'Antarctica,', start: 3.495, end: 4.200 },
  { text: 'two thousand nine.', start: 4.680, end: 5.410 },
  { text: 'Orcas', start: 5.821, end: 6.140 },
  { text: 'washed', start: 6.280, end: 6.560 },
  { text: 'a', start: 6.600, end: 6.700 },
  { text: 'seal', start: 6.780, end: 7.020 },
  { text: 'off', start: 7.060, end: 7.180 },
  { text: 'its', start: 7.220, end: 7.400 },
  { text: 'ice', start: 7.480, end: 7.660 },
  { text: 'floe…', start: 7.720, end: 7.975 },
  { text: 'then', start: 8.385, end: 8.560 },
  { text: 'a', start: 8.620, end: 8.720 },
  { text: 'humpback', start: 8.800, end: 9.220 },
  { text: 'rolled', start: 9.300, end: 9.480 },
  { text: 'over,', start: 9.560, end: 9.760 },
  { text: 'and', start: 10.120, end: 10.200 },
  { text: 'the', start: 10.220, end: 10.340 },
  { text: 'seal', start: 10.440, end: 10.660 },
  { text: 'landed', start: 10.760, end: 11.080 },
  { text: 'on', start: 11.120, end: 11.180 },
  { text: 'its', start: 11.220, end: 11.460 },
  { text: 'CHEST!', start: 11.560, end: 12.077 },
  { text: 'It', start: 12.443, end: 12.700 },
  { text: 'arched', start: 12.760, end: 13.020 },
  { text: 'up', start: 13.100, end: 13.240 },
  { text: 'and', start: 13.260, end: 13.360 },
  { text: 'lifted', start: 13.500, end: 13.740 },
  { text: 'the', start: 13.780, end: 13.880 },
  { text: 'seal', start: 13.920, end: 14.100 },
  { text: 'right', start: 14.320, end: 14.480 },
  { text: 'out', start: 14.520, end: 14.600 },
  { text: 'of', start: 14.620, end: 14.660 },
  { text: 'the', start: 14.700, end: 14.740 },
  { text: 'water!', start: 14.820, end: 15.188 },
  { text: 'Humpbacks', start: 15.598, end: 16.059 },
  { text: 'have', start: 16.079, end: 16.180 },
  { text: 'crashed', start: 16.260, end: 16.580 },
  { text: 'orca', start: 16.700, end: 16.920 },
  { text: 'hunts', start: 16.980, end: 17.240 },
  { text: 'over', start: 17.300, end: 17.500 },
  { text: 'a HUNDRED', start: 17.740, end: 18.180 },
  { text: 'times.', start: 18.240, end: 18.711 },
  { text: 'Why?', start: 19.121, end: 19.475 },
  { text: 'Nobody', start: 19.885, end: 20.220 },
  { text: 'knows…', start: 20.280, end: 20.729 },
  { text: 'But', start: 21.139, end: 21.740 },
];
