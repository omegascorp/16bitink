/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-25: generation IeIQjkl9KpZWaCZvdvB1, its first
 * 0 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 19.5 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe),
 * so divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped,
 * and word edges are fixed from the waveform (silencedetect at -40 dB): a word
 * after a pause starts where the sound comes back, the word before ends where
 * the pause begins; the first word starts where the sound does, and the last
 * ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…All we know is, / something ATE a great white shark!"
 */
export const TEMPO = 1.113;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 19.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'Something', start: 0.360, end: 0.880 },
  { text: 'ATE', start: 1.120, end: 1.280 },
  { text: 'a', start: 1.340, end: 1.420 },
  { text: 'great', start: 1.480, end: 1.700 },
  { text: 'white', start: 1.740, end: 1.940 },
  { text: 'shark!', start: 2.020, end: 2.451 },
  { text: 'In', start: 2.916, end: 3.040 },
  { text: 'two', start: 3.160, end: 3.303 },
  { text: 'thousand', start: 3.303, end: 3.683 },
  { text: 'three,', start: 3.683, end: 3.920 },
  { text: 'scientists', start: 4.220, end: 4.680 },
  { text: 'tagged', start: 4.740, end: 5.020 },
  { text: 'a', start: 5.060, end: 5.120 },
  { text: 'nine-foot', start: 5.280, end: 5.760 },
  { text: 'great', start: 5.880, end: 6.120 },
  { text: 'white', start: 6.220, end: 6.400 },
  { text: 'off', start: 6.460, end: 6.580 },
  { text: 'Australia.', start: 6.620, end: 7.227 },
  { text: 'Months', start: 7.550, end: 7.960 },
  { text: 'later,', start: 8.080, end: 8.380 },
  { text: 'its', start: 8.620, end: 8.780 },
  { text: 'tag', start: 8.860, end: 9.080 },
  { text: 'plunged', start: 9.200, end: 9.500 },
  { text: 'nearly', start: 9.540, end: 9.880 },
  { text: 'two', start: 10.300, end: 10.409 },
  { text: 'thousand', start: 10.409, end: 10.700 },
  { text: 'feet…', start: 10.880, end: 11.138 },
  { text: 'and', start: 11.630, end: 11.720 },
  { text: 'the', start: 11.760, end: 11.880 },
  { text: 'water', start: 11.940, end: 12.180 },
  { text: 'around', start: 12.280, end: 12.620 },
  { text: 'it', start: 12.660, end: 12.800 },
  { text: 'turned', start: 12.860, end: 13.100 },
  { text: 'WARM.', start: 13.340, end: 13.787 },
  { text: 'It', start: 14.394, end: 14.500 },
  { text: 'was', start: 14.540, end: 14.660 },
  { text: 'inside', start: 14.680, end: 15.160 },
  { text: 'something\'s', start: 15.200, end: 15.600 },
  { text: 'stomach.', start: 15.700, end: 16.082 },
  { text: 'A', start: 16.616, end: 16.760 },
  { text: 'bigger', start: 16.860, end: 17.060 },
  { text: 'great', start: 17.120, end: 17.320 },
  { text: 'white?', start: 17.360, end: 17.601 },
  { text: 'An', start: 17.943, end: 18.080 },
  { text: 'orca?', start: 18.140, end: 18.458 },
  { text: 'Nobody', start: 19.240, end: 19.540 },
  { text: 'knows.', start: 19.620, end: 19.959 },
  { text: 'All', start: 20.448, end: 20.640 },
  { text: 'we', start: 20.680, end: 20.800 },
  { text: 'know', start: 20.840, end: 21.000 },
  { text: 'is,', start: 21.080, end: 21.372 },
];
