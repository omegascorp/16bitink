/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-11-01: generation OsSPdS98r4Jkr5119yTZ, no leading silence to trim.
 * Pauses longer than 0.42 s (silencedetect at -40 dB) were cut to 0.42 s from their middles, with 10 ms crossfades: 3 in the original take, 0.45 s, 0.46 s, 0.48 s long (original times 2.19-2.23 s; 11.23-11.27 s; 20.63-20.69 s).
 * Then sped up by TEMPO (pitch kept) with ffmpeg's atempo, to end about 0.3 s
 * before the 19.5 s loop point. WORDS are its words with start and end times in
 * the trimmed, pause-shortened take (ElevenLabs Scribe), so divide by TEMPO for
 * voice.mp3. Word edges are fixed from the waveform (silencedetect at -40 dB):
 * a word after a pause starts where the sound comes back, the word before ends
 * where the pause begins; the first word starts where the sound does, and the
 * last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…who would YOU bet on? Because / " followed by the first line, "this crocodile ate a shark!".
 */
export const TEMPO = 1.106;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 19.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.051, end: 0.340 },
  { text: 'crocodile', start: 0.420, end: 1.000 },
  { text: 'ate', start: 1.080, end: 1.180 },
  { text: 'a', start: 1.240, end: 1.340 },
  { text: 'SHARK!', start: 1.460, end: 1.981 },
  { text: 'Australia\'s', start: 2.395, end: 3.079 },
  { text: 'Adelaide', start: 3.162, end: 3.600 },
  { text: 'River,', start: 3.680, end: 4.024 },
  { text: 'twenty fourteen.', start: 4.223, end: 5.057 },
  { text: 'An', start: 5.469, end: 5.702 },
  { text: 'eighteen-foot', start: 5.820, end: 6.460 },
  { text: 'saltwater', start: 6.620, end: 7.020 },
  { text: 'croc', start: 7.140, end: 7.333 },
  { text: 'called', start: 7.416, end: 7.640 },
  { text: 'Brutus…', start: 7.760, end: 8.302 },
  { text: 'rose', start: 8.541, end: 8.940 },
  { text: 'up', start: 9.000, end: 9.100 },
  { text: 'with', start: 9.120, end: 9.200 },
  { text: 'a', start: 9.220, end: 9.375 },
  { text: 'bull', start: 9.465, end: 9.640 },
  { text: 'shark', start: 9.740, end: 10.000 },
  { text: 'in', start: 10.040, end: 10.100 },
  { text: 'his', start: 10.120, end: 10.340 },
  { text: 'JAWS!', start: 10.440, end: 10.975 },
  { text: 'Bull', start: 11.385, end: 11.540 },
  { text: 'sharks', start: 11.640, end: 12.000 },
  { text: 'swim', start: 12.080, end: 12.260 },
  { text: 'up', start: 12.340, end: 12.440 },
  { text: 'rivers…', start: 12.540, end: 13.147 },
  { text: 'and', start: 13.367, end: 13.560 },
  { text: 'this', start: 13.640, end: 13.820 },
  { text: 'one', start: 13.880, end: 14.040 },
  { text: 'picked', start: 14.160, end: 14.284 },
  { text: 'the', start: 14.384, end: 14.500 },
  { text: 'wrong', start: 14.660, end: 14.920 },
  { text: 'river.', start: 15.020, end: 15.320 },
  { text: 'Crocs', start: 16.160, end: 16.420 },
  { text: 'will', start: 16.460, end: 16.560 },
  { text: 'eat', start: 16.600, end: 16.740 },
  { text: 'almost', start: 16.780, end: 17.078 },
  { text: 'anything.', start: 17.194, end: 17.723 },
  { text: 'Shark', start: 18.137, end: 18.500 },
  { text: 'or', start: 18.520, end: 18.600 },
  { text: 'croc:', start: 18.700, end: 19.051 },
  { text: 'who', start: 19.434, end: 19.520 },
  { text: 'would', start: 19.540, end: 19.660 },
  { text: 'YOU', start: 19.820, end: 19.960 },
  { text: 'bet', start: 20.000, end: 20.140 },
  { text: 'on?', start: 20.200, end: 20.326 },
  { text: 'Because', start: 20.736, end: 21.240 },
];
