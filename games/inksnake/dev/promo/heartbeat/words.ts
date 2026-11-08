/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (voice-take.mp3, 17.92 s), sped up by TEMPO (pitch kept) with ffmpeg's atempo
 * so its last word ends 0.3 s before the 16.5 s loop point. WORDS are its words
 * with start and end times in the take (ElevenLabs Scribe, one run), so divide
 * by TEMPO for voice.mp3. Spelling and capitals follow the script. Word edges
 * at pauses are fixed from the waveform (silencedetect at -40 dB; the first
 * word's start at -50 dB); "off…" keeps Scribe's end, its breath being no word.
 *
 * The script ends mid-sentence, and the loop's first line finishes it:
 * "…So it just waits, because / this snake squeezes until the heart STOPS."
 */
export const TEMPO = 1.09772;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.106, end: 0.340 },
  { text: 'snake', start: 0.420, end: 0.700 },
  { text: 'squeezes', start: 0.840, end: 1.400 },
  { text: 'until', start: 1.420, end: 1.640 },
  { text: 'the', start: 1.680, end: 1.740 },
  { text: 'heart', start: 1.860, end: 2.100 },
  { text: 'STOPS.', start: 2.200, end: 2.622 },
  { text: 'A', start: 3.140, end: 3.400 },
  { text: 'boa', start: 3.440, end: 3.700 },
  { text: 'feels', start: 3.840, end: 4.059 },
  { text: 'a', start: 4.120, end: 4.180 },
  { text: 'heartbeat…', start: 4.240, end: 4.673 },
  { text: 'through', start: 5.049, end: 5.340 },
  { text: 'its', start: 5.380, end: 5.540 },
  { text: 'coils.', start: 5.580, end: 6.154 },
  { text: 'Scientists', start: 6.536, end: 7.120 },
  { text: 'hid', start: 7.160, end: 7.280 },
  { text: 'a', start: 7.320, end: 7.480 },
  { text: 'fake', start: 7.540, end: 7.780 },
  { text: 'heart', start: 7.840, end: 8.100 },
  { text: 'in', start: 8.140, end: 8.200 },
  { text: 'a', start: 8.240, end: 8.400 },
  { text: 'dead', start: 8.440, end: 8.620 },
  { text: 'rat!', start: 8.760, end: 9.146 },
  { text: 'Left', start: 9.497, end: 9.800 },
  { text: 'beating,', start: 9.920, end: 10.200 },
  { text: 'the', start: 10.500, end: 10.600 },
  { text: 'boa', start: 10.640, end: 10.820 },
  { text: 'squeezed', start: 10.900, end: 11.220 },
  { text: 'nearly', start: 11.280, end: 11.580 },
  { text: 'TWICE', start: 11.660, end: 12.040 },
  { text: 'as', start: 12.100, end: 12.200 },
  { text: 'long.', start: 12.260, end: 12.604 },
  { text: 'Switched', start: 13.058, end: 13.460 },
  { text: 'off…', start: 13.560, end: 13.820 },
  { text: 'it', start: 14.486, end: 14.620 },
  { text: 'let', start: 14.680, end: 14.800 },
  { text: 'go', start: 14.880, end: 14.980 },
  { text: 'sooner.', start: 15.120, end: 15.435 },
  { text: 'So', start: 15.833, end: 16.079 },
  { text: 'it', start: 16.140, end: 16.219 },
  { text: 'just', start: 16.320, end: 16.500 },
  { text: 'waits,', start: 16.560, end: 17.027 },
  { text: 'because', start: 17.222, end: 17.783 },
];

/** How many words each caption line holds, in order. */
export const LINE_WORDS: readonly number[] = [3, 4, 3, 2, 3, 2, 3, 4, 2, 3, 4, 2, 4, 4, 1];

/** Word i's start and end in the video, seconds. */
export const startOf = (i: number): number => WORDS[i]!.start / TEMPO;
export const endOf = (i: number): number => WORDS[i]!.end / TEMPO;
