/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-25: generation 6zNu22uEy7AL5jVItkUv, its first
 * 0 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 16.5 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe),
 * so divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped,
 * and word edges are fixed from the waveform (silencedetect at -40 dB): a word
 * after a pause starts where the sound comes back, the word before ends where
 * the pause begins; the first word starts where the sound does, and the last
 * ends where it fades out. "Then" is moved 0.38 s later than Scribe put it:
 * the chuckle before it runs into the word.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So yes, / this snake swallows eels WHOLE!"
 */
export const TEMPO = 1.059;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 16.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.029, end: 0.260 },
  { text: 'snake', start: 0.360, end: 0.620 },
  { text: 'swallows', start: 0.720, end: 1.200 },
  { text: 'eels', start: 1.260, end: 1.580 },
  { text: 'WHOLE!', start: 1.680, end: 2.194 },
  { text: 'The', start: 2.583, end: 2.720 },
  { text: 'banded', start: 2.760, end: 3.040 },
  { text: 'sea', start: 3.180, end: 3.360 },
  { text: 'krait', start: 3.400, end: 3.620 },
  { text: 'slides', start: 3.780, end: 4.100 },
  { text: 'its', start: 4.120, end: 4.280 },
  { text: 'head', start: 4.320, end: 4.460 },
  { text: 'into', start: 4.480, end: 4.660 },
  { text: 'cracks', start: 4.740, end: 5.060 },
  { text: 'in', start: 5.080, end: 5.140 },
  { text: 'the', start: 5.180, end: 5.240 },
  { text: 'reef…', start: 5.340, end: 5.646 },
  { text: 'hunting', start: 6.103, end: 6.460 },
  { text: 'for', start: 6.500, end: 6.640 },
  { text: 'hiding', start: 6.680, end: 7.020 },
  { text: 'eels.', start: 7.100, end: 7.532 },
  { text: 'One', start: 7.884, end: 8.180 },
  { text: 'bite', start: 8.260, end: 8.400 },
  { text: 'of', start: 8.440, end: 8.540 },
  { text: 'venom,', start: 8.580, end: 8.880 },
  { text: 'and', start: 9.000, end: 9.140 },
  { text: 'down', start: 9.320, end: 9.600 },
  { text: 'goes', start: 9.620, end: 9.840 },
  { text: 'the', start: 9.880, end: 9.980 },
  { text: 'eel!', start: 10.060, end: 10.391 },
  { text: 'It', start: 10.784, end: 10.880 },
  { text: 'can', start: 10.900, end: 11.020 },
  { text: 'hold', start: 11.080, end: 11.240 },
  { text: 'its', start: 11.280, end: 11.460 },
  { text: 'breath', start: 11.500, end: 11.720 },
  { text: 'for', start: 11.740, end: 11.820 },
  { text: 'nearly', start: 11.880, end: 12.220 },
  { text: 'TWO', start: 12.300, end: 12.500 },
  { text: 'hours.', start: 12.740, end: 13.216 },
  { text: 'Then', start: 13.902, end: 14.020 },
  { text: 'it', start: 14.060, end: 14.160 },
  { text: 'crawls', start: 14.220, end: 14.520 },
  { text: 'onto', start: 14.580, end: 14.780 },
  { text: 'land', start: 14.840, end: 15.060 },
  { text: 'to', start: 15.100, end: 15.180 },
  { text: 'sleep', start: 15.240, end: 15.440 },
  { text: 'it', start: 15.480, end: 15.540 },
  { text: 'off.', start: 15.620, end: 15.870 },
  { text: 'So', start: 16.217, end: 16.560 },
  { text: 'yes,', start: 16.720, end: 17.151 },
];
