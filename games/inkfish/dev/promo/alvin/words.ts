/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-11-04: generation ezD3tzfdvjuF44sN2pLf (take 4 of 4), no leading silence trimmed.
 * Pauses longer than 0.42 s (silencedetect at -40 dB) were cut to 0.42 s from their middles, with 10 ms crossfades: 4 in the original take, 0.43 s, 0.70 s, 0.47 s, 0.50 s long (original times 1.98-2.41 s; 3.85-4.55 s; 14.94-15.42 s; 21.31-21.81 s).
 * Then sped up by TEMPO (pitch kept) with ffmpeg's atempo, to end about 0.3 s
 * before the 22.5 s loop point. WORDS are its words with start and end times in
 * the trimmed, pause-shortened take (ElevenLabs Scribe), so divide by TEMPO for
 * voice.mp3. Word edges are fixed from the waveform (silencedetect at -40 dB):
 * a word after a pause starts where the sound comes back, the word before ends
 * where the pause begins; the first word starts where the sound does, and the
 * last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…But first, / " followed by the first line, "this fish stabbed a submarine!".
 */
export const TEMPO = 1.16;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 22.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.080, end: 0.240 },
  { text: 'fish', start: 0.320, end: 0.560 },
  { text: 'stabbed', start: 0.640, end: 0.960 },
  { text: 'a', start: 1.080, end: 1.200 },
  { text: 'SUBMARINE!', start: 1.320, end: 1.982 },
  { text: '1967.', start: 2.392, end: 3.830 },
  { text: 'Two', start: 4.239, end: 4.330 },
  { text: 'thousand', start: 4.410, end: 4.650 },
  { text: 'feet', start: 4.810, end: 4.970 },
  { text: 'down,', start: 5.050, end: 5.450 },
  { text: 'off', start: 5.530, end: 5.690 },
  { text: 'Florida,', start: 5.770, end: 6.233 },
  { text: 'three', start: 6.479, end: 6.810 },
  { text: 'men', start: 6.890, end: 7.130 },
  { text: 'sit', start: 7.210, end: 7.290 },
  { text: 'inside', start: 7.450, end: 7.610 },
  { text: 'a', start: 7.690, end: 7.770 },
  { text: 'tiny', start: 7.850, end: 8.170 },
  { text: 'sub', start: 8.250, end: 8.490 },
  { text: 'called', start: 8.570, end: 8.810 },
  { text: 'Alvin…', start: 8.970, end: 9.340 },
  { text: 'then', start: 9.676, end: 10.100 },
  { text: 'BANG!', start: 10.256, end: 10.890 },
  { text: 'An', start: 11.130, end: 11.370 },
  { text: 'eight-foot', start: 11.490, end: 11.850 },
  { text: 'swordfish', start: 11.930, end: 12.410 },
  { text: 'rams', start: 12.570, end: 13.002 },
  { text: 'it,', start: 13.184, end: 13.237 },
  { text: 'and', start: 13.263, end: 13.290 },
  { text: 'the', start: 13.370, end: 13.530 },
  { text: 'sword', start: 13.650, end: 13.770 },
  { text: 'gets', start: 13.850, end: 14.090 },
  { text: 'STUCK!', start: 14.250, end: 14.635 },
  { text: 'They', start: 15.045, end: 15.707 },
  { text: 'head', start: 15.787, end: 15.867 },
  { text: 'up…', start: 15.947, end: 16.093 },
  { text: 'with', start: 16.320, end: 16.507 },
  { text: 'the', start: 16.587, end: 16.667 },
  { text: 'fish', start: 16.747, end: 16.987 },
  { text: 'still', start: 17.147, end: 17.307 },
  { text: 'attached!', start: 17.387, end: 17.944 },
  { text: 'Next', start: 18.337, end: 18.587 },
  { text: 'day?', start: 18.707, end: 18.837 },
  { text: 'Steaks.', start: 19.204, end: 19.782 },
  { text: 'For', start: 20.036, end: 20.107 },
  { text: 'the', start: 20.147, end: 20.187 },
  { text: 'whole', start: 20.347, end: 20.507 },
  { text: 'crew.', start: 20.587, end: 20.933 },
  { text: 'Nineteen', start: 21.343, end: 21.855 },
  { text: 'years', start: 21.935, end: 22.095 },
  { text: 'later,', start: 22.175, end: 22.655 },
  { text: 'that', start: 22.775, end: 22.895 },
  { text: 'same', start: 22.975, end: 23.215 },
  { text: 'sub', start: 23.375, end: 23.615 },
  { text: 'reached', start: 23.695, end: 23.935 },
  { text: 'the', start: 23.975, end: 24.015 },
  { text: 'TITANIC.', start: 24.095, end: 24.763 },
  { text: 'But', start: 25.150, end: 25.215 },
  { text: 'first,', start: 25.295, end: 25.742 },
];
