/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * on eleven_v4 (voice-take.mp3, generation DZjmTAwCFkRcWwdY52U9, 24.32 s).
 * voice.mp3 is the take with its first LEAD seconds of silence trimmed, sped
 * up by TEMPO (pitch kept) with ffmpeg's atempo, so its last word ends 0.3 s
 * before the 22.5 s loop point (22.20 s). WORDS are its words with start and
 * end times in the trimmed take (ElevenLabs Scribe, one run, minus LEAD; no
 * tags were echoed), so divide by TEMPO for voice.mp3. Spelling, capitals and
 * punctuation follow the script; the last word's end is fixed from the
 * waveform (silencedetect at -40 dB: 24.03 s in the take).
 *
 * The script ends mid-sentence, and the loop's first line finishes it:
 * "…Either way, / this snake catches BATS right out of the air!"
 */
export const LEAD = 0.08;
export const TEMPO = 1.079;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.06, end: 0.2 },
  { text: 'snake', start: 0.3, end: 0.52 },
  { text: 'catches', start: 0.58, end: 0.84 },
  { text: 'BATS', start: 0.98, end: 1.24 },
  { text: 'right', start: 1.46, end: 1.62 },
  { text: 'out', start: 1.66, end: 1.72 },
  { text: 'of', start: 1.76, end: 1.8 },
  { text: 'the', start: 1.84, end: 1.94 },
  { text: 'air!', start: 2.02, end: 2.28 },
  { text: 'Cuban', start: 2.84, end: 3.14 },
  { text: 'boas', start: 3.22, end: 3.6 },
  { text: 'hang', start: 3.68, end: 3.939 },
  { text: 'from', start: 3.979, end: 4.08 },
  { text: 'a', start: 4.12, end: 4.18 },
  { text: 'cave', start: 4.26, end: 4.5 },
  { text: 'ceiling', start: 4.64, end: 4.92 },
  { text: 'at', start: 4.96, end: 5.12 },
  { text: 'dusk…', start: 5.16, end: 5.5 },
  { text: 'as', start: 6.02, end: 6.14 },
  { text: 'hundreds', start: 6.2, end: 6.7 },
  { text: 'of', start: 6.74, end: 6.88 },
  { text: 'bats', start: 6.92, end: 7.26 },
  { text: 'pour', start: 7.3, end: 7.48 },
  { text: 'out.', start: 7.56, end: 7.72 },
  { text: 'Then', start: 8.24, end: 8.34 },
  { text: 'a', start: 8.4, end: 8.5 },
  { text: 'SECOND', start: 8.64, end: 8.98 },
  { text: 'boa', start: 9.04, end: 9.28 },
  { text: 'hangs', start: 9.32, end: 9.52 },
  { text: 'right', start: 9.66, end: 9.82 },
  { text: 'beside', start: 9.86, end: 10.14 },
  { text: 'the', start: 10.18, end: 10.3 },
  { text: 'first…', start: 10.34, end: 10.66 },
  { text: 'and', start: 11.0, end: 11.06 },
  { text: 'a', start: 11.12, end: 11.22 },
  { text: 'THIRD!', start: 11.28, end: 11.7 },
  { text: 'A', start: 12.16, end: 12.2 },
  { text: 'wall', start: 12.42, end: 12.62 },
  { text: 'of', start: 12.66, end: 12.72 },
  { text: 'snakes,', start: 12.84, end: 13.18 },
  { text: 'and', start: 13.4, end: 13.46 },
  { text: 'the', start: 13.5, end: 13.54 },
  { text: 'bats', start: 13.64, end: 13.88 },
  { text: 'can', start: 13.9, end: 14.06 },
  { text: 'hardly', start: 14.1, end: 14.42 },
  { text: 'get', start: 14.44, end: 14.62 },
  { text: 'by!', start: 14.66, end: 15.0 },
  { text: 'Alone,', start: 16.18, end: 16.54 },
  { text: 'they', start: 16.74, end: 16.88 },
  { text: 'often', start: 16.94, end: 17.14 },
  { text: 'went', start: 17.22, end: 17.32 },
  { text: 'hungry.', start: 17.38, end: 17.76 },
  { text: 'Together?', start: 18.16, end: 18.56 },
  { text: 'Every', start: 19.04, end: 19.3 },
  { text: 'hunt', start: 19.42, end: 19.64 },
  { text: 'worked.', start: 19.76, end: 20.06 },
  { text: 'Smart', start: 20.58, end: 20.8 },
  { text: 'plan…', start: 20.9, end: 21.3 },
  { text: 'or', start: 21.64, end: 21.8 },
  { text: 'just', start: 21.98, end: 22.14 },
  { text: 'the', start: 22.2, end: 22.28 },
  { text: 'best', start: 22.32, end: 22.48 },
  { text: 'spot?', start: 22.6, end: 22.92 },
  { text: 'Either', start: 23.42, end: 23.64 },
  { text: 'way,', start: 23.68, end: 23.953 },
];
