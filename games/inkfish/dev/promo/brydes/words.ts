/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-31: generation EZQMAKUj6KQo2cv3TMYi, its first 0.100 s of silence trimmed.
 * Pauses longer than 0.42 s (silencedetect at -40 dB) were cut to 0.42 s from their middles, with 10 ms crossfades: 3 in the original take, 0.48 s, 0.45 s, 0.46 s long (original times 2.26-2.32 s; 5.00-5.03 s; 10.44-10.48 s).
 * Then sped up by TEMPO (pitch kept) with ffmpeg's atempo, to end about 0.3 s
 * before the 19.5 s loop point. WORDS are its words with start and end times in
 * the trimmed, pause-shortened take (ElevenLabs Scribe), so divide by TEMPO for
 * voice.mp3. Scribe's echoed audio tags are dropped, and word edges are fixed
 * from the waveform (silencedetect at -40 dB): a word after a pause starts where
 * the sound comes back, the word before ends where the pause begins; the first
 * word starts where the sound does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So / " followed by the first line, which finishes the sentence.
 */
export const TEMPO = 1.087;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 19.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.050, end: 0.360 },
  { text: 'whale', start: 0.500, end: 0.720 },
  { text: 'doesn\'t', start: 0.760, end: 1.040 },
  { text: 'CHASE', start: 1.120, end: 1.380 },
  { text: 'its', start: 1.420, end: 1.560 },
  { text: 'food…', start: 1.640, end: 1.946 },
  { text: 'it', start: 2.357, end: 2.480 },
  { text: 'just', start: 2.540, end: 2.760 },
  { text: 'opens', start: 2.860, end: 3.160 },
  { text: 'wide', start: 3.280, end: 3.661 },
  { text: 'and', start: 3.748, end: 3.880 },
  { text: 'WAITS!', start: 4.100, end: 4.622 },
  { text: 'In', start: 5.032, end: 5.120 },
  { text: 'the', start: 5.160, end: 5.240 },
  { text: 'Gulf', start: 5.260, end: 5.440 },
  { text: 'of', start: 5.500, end: 5.560 },
  { text: 'Thailand,', start: 5.660, end: 6.200 },
  { text: 'forty-foot', start: 6.660, end: 7.000 },
  { text: 'Bryde\'s', start: 7.140, end: 7.520 },
  { text: 'whales', start: 7.580, end: 7.800 },
  { text: 'hang', start: 7.960, end: 8.140 },
  { text: 'at', start: 8.160, end: 8.240 },
  { text: 'the', start: 8.280, end: 8.380 },
  { text: 'surface,', start: 8.440, end: 8.920 },
  { text: 'jaws', start: 9.036, end: 9.580 },
  { text: 'open…', start: 9.680, end: 10.019 },
  { text: 'and', start: 10.442, end: 10.620 },
  { text: 'the', start: 10.660, end: 10.800 },
  { text: 'fish', start: 10.860, end: 11.060 },
  { text: 'drift', start: 11.160, end: 11.400 },
  { text: 'right', start: 11.580, end: 11.800 },
  { text: 'in!', start: 11.860, end: 12.060 },
  { text: 'No', start: 12.920, end: 13.040 },
  { text: 'lunging.', start: 13.140, end: 13.628 },
  { text: 'No', start: 13.721, end: 14.020 },
  { text: 'chasing.', start: 14.100, end: 14.589 },
  { text: 'And', start: 14.920, end: 15.040 },
  { text: 'the', start: 15.080, end: 15.180 },
  { text: 'calves', start: 15.240, end: 15.600 },
  { text: 'seem', start: 15.640, end: 15.760 },
  { text: 'to', start: 15.800, end: 15.880 },
  { text: 'COPY', start: 15.940, end: 16.280 },
  { text: 'their', start: 16.320, end: 16.420 },
  { text: 'moms!', start: 16.500, end: 16.975 },
  { text: 'Honestly?', start: 17.354, end: 17.898 },
  { text: 'Laziest', start: 18.127, end: 18.740 },
  { text: 'genius', start: 18.940, end: 19.280 },
  { text: 'in', start: 19.320, end: 19.400 },
  { text: 'the', start: 19.420, end: 19.500 },
  { text: 'ocean.', start: 19.560, end: 19.932 },
  { text: 'So', start: 20.309, end: 20.876 },
];
