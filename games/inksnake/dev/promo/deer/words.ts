/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * on eleven_v4 (voice-take.mp3, 23.60 s, last word ending at 23.31 s), sped up by
 * TEMPO (pitch kept) with ffmpeg's atempo so its last word ends 0.3 s before the
 * 21 s loop point. WORDS are its words with start and end times in the
 * take (ElevenLabs Scribe, one run; no tags were echoed), so divide by TEMPO
 * for voice.mp3. Spelling and capitals follow the script (Scribe wrote "31"/"35" for the spoken numbers).
 * The last word's end is fixed from the waveform (silencedetect at -40 dB).
 *
 * The script ends mid-sentence, and the loop's first line finishes it:
 * "…So next time you can't finish dinner, remember: / this python swallowed a deer HEAVIER than itself!"
 */
export const TEMPO = 1.12609;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.16, end: 0.4 },
  { text: 'python', start: 0.44, end: 0.86 },
  { text: 'swallowed', start: 0.98, end: 1.28 },
  { text: 'a', start: 1.36, end: 1.38 },
  { text: 'deer', start: 1.64, end: 1.9 },
  { text: 'HEAVIER', start: 2.12, end: 2.46 },
  { text: 'than', start: 2.48, end: 2.58 },
  { text: 'itself!', start: 2.62, end: 3.3 },
  { text: 'The', start: 3.78, end: 3.88 },
  { text: 'snake:', start: 3.94, end: 4.22 },
  { text: 'thirty-one', start: 4.86, end: 5.4 },
  { text: 'pounds.', start: 5.44, end: 5.82 },
  { text: 'The', start: 6.24, end: 6.36 },
  { text: 'fawn:', start: 6.42, end: 6.7 },
  { text: 'THIRTY-FIVE!', start: 7.24, end: 8.1 },
  { text: 'Biologists', start: 8.66, end: 9.2 },
  { text: 'in', start: 9.24, end: 9.32 },
  { text: 'Florida', start: 9.46, end: 9.8 },
  { text: 'spotted', start: 9.9, end: 10.18 },
  { text: 'a', start: 10.24, end: 10.34 },
  { text: 'huge', start: 10.48, end: 10.78 },
  { text: 'lump', start: 10.96, end: 11.14 },
  { text: 'in', start: 11.18, end: 11.24 },
  { text: 'its', start: 11.26, end: 11.44 },
  { text: 'belly…', start: 11.48, end: 11.74 },
  { text: 'so', start: 12.14, end: 12.36 },
  { text: 'they', start: 12.4, end: 12.48 },
  { text: 'picked', start: 12.6, end: 12.8 },
  { text: 'it', start: 12.84, end: 12.92 },
  { text: 'up…', start: 13.02, end: 13.16 },
  { text: 'and', start: 13.62, end: 13.68 },
  { text: 'it', start: 13.72, end: 13.84 },
  { text: 'threw', start: 13.9, end: 14.08 },
  { text: 'the', start: 14.14, end: 14.2 },
  { text: 'whole', start: 14.34, end: 14.6 },
  { text: 'deer', start: 14.72, end: 14.9 },
  { text: 'back', start: 15, end: 15.2 },
  { text: 'UP!', start: 15.32, end: 15.52 },
  { text: 'Scientists', start: 16.079, end: 16.5 },
  { text: 'think', start: 16.56, end: 16.76 },
  { text: 'it\'s', start: 16.8, end: 16.92 },
  { text: 'the', start: 16.94, end: 17.02 },
  { text: 'biggest', start: 17.22, end: 17.54 },
  { text: 'meal', start: 17.64, end: 17.86 },
  { text: 'for', start: 17.88, end: 17.98 },
  { text: 'its', start: 18.02, end: 18.16 },
  { text: 'size', start: 18.2, end: 18.48 },
  { text: 'ever', start: 18.72, end: 18.96 },
  { text: 'recorded', start: 18.98, end: 19.46 },
  { text: 'in', start: 19.5, end: 19.54 },
  { text: 'a', start: 19.58, end: 19.68 },
  { text: 'Burmese', start: 19.7, end: 20.02 },
  { text: 'python.', start: 20.12, end: 20.58 },
  { text: 'So', start: 21.04, end: 21.12 },
  { text: 'next', start: 21.22, end: 21.4 },
  { text: 'time', start: 21.46, end: 21.64 },
  { text: 'you', start: 21.68, end: 21.74 },
  { text: 'can\'t', start: 21.8, end: 21.98 },
  { text: 'finish', start: 22.02, end: 22.24 },
  { text: 'dinner,', start: 22.32, end: 22.56 },
  { text: 'remember:', start: 22.86, end: 23.31 },
];
