/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-31: generation nN3spkFET5GAht5I0ybr, no leading silence to trim.
 * Pauses longer than 0.42 s (silencedetect at -40 dB) were cut to 0.42 s from their middles, with 10 ms crossfades: 4 in the original take, 0.45 s, 0.46 s, 0.59 s, 0.56 s long (original times 2.76-2.79 s; 10.96-10.99 s; 17.08-17.25 s; 19.76-19.89 s).
 * Then sped up by TEMPO (pitch kept) with ffmpeg's atempo, to end about 0.3 s
 * before the 19.5 s loop point. WORDS are its words with start and end times in
 * the trimmed, pause-shortened take (ElevenLabs Scribe), so divide by TEMPO for
 * voice.mp3. Scribe's echoed audio tags are dropped, and word edges are fixed
 * from the waveform (silencedetect at -40 dB): a word after a pause starts where
 * the sound comes back, the word before ends where the pause begins; the first
 * word starts where the sound does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Because / " followed by the first line, which finishes the sentence.
 */
export const TEMPO = 1.146;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 19.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.074, end: 0.320 },
  { text: 'snake', start: 0.440, end: 0.680 },
  { text: 'swallowed', start: 0.780, end: 1.100 },
  { text: 'a', start: 1.160, end: 1.200 },
  { text: 'whole', start: 1.360, end: 1.620 },
  { text: 'CROCODILE!', start: 1.680, end: 2.549 },
  { text: 'Australia,', start: 2.960, end: 3.654 },
  { text: 'twenty fourteen.', start: 3.826, end: 4.697 },
  { text: 'A', start: 5.018, end: 5.265 },
  { text: 'ten-foot', start: 5.346, end: 5.800 },
  { text: 'python', start: 5.920, end: 6.280 },
  { text: 'grabbed', start: 6.360, end: 6.580 },
  { text: 'a', start: 6.620, end: 6.720 },
  { text: 'three-foot', start: 6.780, end: 7.240 },
  { text: 'croc', start: 7.380, end: 7.640 },
  { text: 'in', start: 7.680, end: 7.740 },
  { text: 'a', start: 7.800, end: 7.860 },
  { text: 'lake…', start: 7.940, end: 8.220 },
  { text: 'and', start: 8.840, end: 8.940 },
  { text: 'they', start: 8.980, end: 9.120 },
  { text: 'fought,', start: 9.260, end: 9.580 },
  { text: 'and', start: 10.020, end: 10.100 },
  { text: 'fought.', start: 10.300, end: 10.708 },
  { text: 'Hours', start: 11.118, end: 11.480 },
  { text: 'later,', start: 11.560, end: 11.896 },
  { text: 'it', start: 12.028, end: 12.300 },
  { text: 'swallowed', start: 12.380, end: 12.720 },
  { text: 'the', start: 12.760, end: 12.840 },
  { text: 'croc…', start: 12.900, end: 13.167 },
  { text: 'HEAD first!', start: 13.356, end: 14.320 },
  { text: 'Its', start: 15.140, end: 15.260 },
  { text: 'belly', start: 15.380, end: 15.620 },
  { text: 'looked', start: 15.660, end: 15.780 },
  { text: 'like', start: 15.820, end: 15.920 },
  { text: 'a', start: 15.960, end: 16.059 },
  { text: 'suitcase.', start: 16.180, end: 16.779 },
  { text: 'Then', start: 17.192, end: 17.300 },
  { text: 'it', start: 17.340, end: 17.452 },
  { text: 'barely', start: 17.570, end: 17.900 },
  { text: 'moved', start: 17.960, end: 18.280 },
  { text: 'for', start: 18.320, end: 18.397 },
  { text: 'ten', start: 18.493, end: 18.800 },
  { text: 'days.', start: 18.880, end: 19.278 },
  { text: 'Who', start: 19.688, end: 19.860 },
  { text: 'would', start: 19.880, end: 20.000 },
  { text: 'YOU', start: 20.200, end: 20.300 },
  { text: 'have', start: 20.360, end: 20.520 },
  { text: 'bet', start: 20.560, end: 20.700 },
  { text: 'on?', start: 20.760, end: 20.955 },
  { text: 'Because', start: 21.368, end: 21.999 },
];
