/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voice-take.mp3, 16.72 s, nothing trimmed.
 * Sped up by TEMPO (pitch kept) with ffmpeg's atempo, so the last word ends
 * about 0.3 s before the 16.5 s loop point (16.60 / 1.025 = 16.20 s). WORDS
 * are its words with start and end times in the take (ElevenLabs Scribe,
 * 2026-11-07, flow kW8uD60HZ31LjFekc6WK), so divide by TEMPO for voice.mp3.
 * Written as the script spells them (caps and punctuation for the captions;
 * "four hundred" as "400"). Word edges are fixed from the waveform
 * (silencedetect at -40 dB): a word after a pause starts where the sound
 * comes back, the word before ends where the pause begins; the first word
 * starts where the sound does, the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Bad day to be the fish, because / this bird caught a SHARK… that caught a FISH!"
 */
export const TEMPO = 1.025;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 16.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.030, end: 0.400 },
  { text: 'bird', start: 0.440, end: 0.700 },
  { text: 'caught', start: 0.760, end: 0.900 },
  { text: 'a', start: 0.940, end: 1.060 },
  { text: 'SHARK…', start: 1.180, end: 1.596 },
  { text: 'that', start: 1.806, end: 2.020 },
  { text: 'caught', start: 2.060, end: 2.220 },
  { text: 'a', start: 2.260, end: 2.280 },
  { text: 'FISH!', start: 2.460, end: 2.903 },
  { text: 'An', start: 3.309, end: 3.460 },
  { text: 'osprey,', start: 3.540, end: 4.025 },
  { text: '400', start: 4.178, end: 4.880 },
  { text: 'feet', start: 5.020, end: 5.180 },
  { text: 'over', start: 5.280, end: 5.520 },
  { text: 'Florida.', start: 5.560, end: 5.971 },
  { text: 'The', start: 6.364, end: 6.420 },
  { text: 'photographer', start: 6.460, end: 6.960 },
  { text: 'zoomed', start: 7.080, end: 7.320 },
  { text: 'in…', start: 7.400, end: 7.579 },
  { text: 'a', start: 7.896, end: 8.020 },
  { text: 'shark\'s', start: 8.119, end: 8.500 },
  { text: 'TAIL!', start: 8.560, end: 8.874 },
  { text: 'And', start: 9.241, end: 9.360 },
  { text: 'in', start: 9.400, end: 9.460 },
  { text: 'its', start: 9.500, end: 9.660 },
  { text: 'mouth?', start: 9.720, end: 10.040 },
  { text: 'Another', start: 10.360, end: 10.760 },
  { text: 'FISH!', start: 10.980, end: 11.433 },
  { text: 'He', start: 11.820, end: 12.040 },
  { text: 'called', start: 12.100, end: 12.300 },
  { text: 'it', start: 12.340, end: 12.400 },
  { text: 'a', start: 12.480, end: 12.500 },
  { text: 'one', start: 12.680, end: 12.840 },
  { text: 'in', start: 12.860, end: 12.920 },
  { text: 'a', start: 12.980, end: 13.060 },
  { text: 'TRILLION', start: 13.140, end: 13.620 },
  { text: 'shot.', start: 13.740, end: 13.990 },
  { text: 'Bad', start: 14.449, end: 14.800 },
  { text: 'day', start: 14.860, end: 15.000 },
  { text: 'to', start: 15.020, end: 15.080 },
  { text: 'be', start: 15.120, end: 15.180 },
  { text: 'the', start: 15.260, end: 15.380 },
  { text: 'fish,', start: 15.440, end: 15.760 },
  { text: 'because', start: 16.020, end: 16.597 },
];
