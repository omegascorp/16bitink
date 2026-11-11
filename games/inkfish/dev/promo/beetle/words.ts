/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * on eleven_v4 (voice-take.mp3, 22.88 s, last word ending at 22.68 s), sped up by
 * TEMPO (pitch kept) with ffmpeg's atempo so its last word ends 0.3 s before the
 * 21 s loop point. WORDS are its words with start and end times in the
 * take (ElevenLabs Scribe, one run; no tags were echoed), so divide by TEMPO
 * for voice.mp3. Spelling and capitals follow the script (Scribe wrote "10" for "ten").
 * The last word's end is fixed from the waveform (silencedetect at -40 dB).
 *
 * The script ends mid-sentence, and the loop's first line finishes it:
 * "…And somewhere, right now, / this beetle got swallowed ALIVE!"
 */
export const TEMPO = 1.09565;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.14, end: 0.3 },
  { text: 'beetle', start: 0.46, end: 0.7 },
  { text: 'got', start: 0.78, end: 0.92 },
  { text: 'swallowed', start: 1.08, end: 1.48 },
  { text: 'ALIVE!', start: 1.6, end: 2.32 },
  { text: 'Frogs', start: 3.02, end: 3.34 },
  { text: 'don\'t', start: 3.38, end: 3.5 },
  { text: 'even', start: 3.54, end: 3.8 },
  { text: 'chew.', start: 3.9, end: 4.24 },
  { text: 'Down', start: 4.82, end: 5.02 },
  { text: 'the', start: 5.06, end: 5.16 },
  { text: 'throat…', start: 5.2, end: 5.58 },
  { text: 'into', start: 6.22, end: 6.42 },
  { text: 'the', start: 6.46, end: 6.54 },
  { text: 'stomach…', start: 6.62, end: 6.98 },
  { text: 'total', start: 7.74, end: 8.02 },
  { text: 'darkness.', start: 8.1, end: 8.6 },
  { text: 'Then', start: 9.24, end: 9.38 },
  { text: 'its', start: 9.42, end: 9.6 },
  { text: 'tiny', start: 9.66, end: 9.96 },
  { text: 'legs', start: 10.02, end: 10.24 },
  { text: 'start', start: 10.3, end: 10.5 },
  { text: 'KICKING!', start: 10.64, end: 11.1 },
  { text: 'It', start: 11.48, end: 11.6 },
  { text: 'crawls', start: 11.68, end: 12.1 },
  { text: 'through', start: 12.14, end: 12.28 },
  { text: 'the', start: 12.32, end: 12.46 },
  { text: 'WHOLE', start: 12.58, end: 12.82 },
  { text: 'frog…', start: 12.98, end: 13.38 },
  { text: 'and', start: 13.8, end: 13.9 },
  { text: 'walks', start: 14.02, end: 14.26 },
  { text: 'out', start: 14.3, end: 14.42 },
  { text: 'the', start: 14.46, end: 14.56 },
  { text: 'back', start: 14.6, end: 14.76 },
  { text: 'door!', start: 14.84, end: 15.16 },
  { text: 'Nine', start: 15.6, end: 15.78 },
  { text: 'out', start: 15.82, end: 15.88 },
  { text: 'of', start: 15.92, end: 16 },
  { text: 'ten', start: 16.04, end: 16.219 },
  { text: 'made', start: 16.26, end: 16.379 },
  { text: 'it', start: 16.4, end: 16.48 },
  { text: 'out,', start: 16.56, end: 16.74 },
  { text: 'some', start: 17, end: 17.14 },
  { text: 'in', start: 17.16, end: 17.24 },
  { text: 'just', start: 17.3, end: 17.46 },
  { text: 'six', start: 17.56, end: 17.8 },
  { text: 'minutes!', start: 17.86, end: 18.24 },
  { text: 'Four', start: 18.72, end: 18.9 },
  { text: 'other', start: 18.96, end: 19.12 },
  { text: 'kinds', start: 19.16, end: 19.36 },
  { text: 'of', start: 19.38, end: 19.46 },
  { text: 'frog?', start: 19.5, end: 19.78 },
  { text: 'Same', start: 20.16, end: 20.32 },
  { text: 'escape.', start: 20.36, end: 20.74 },
  { text: 'And', start: 21.16, end: 21.28 },
  { text: 'somewhere,', start: 21.44, end: 21.86 },
  { text: 'right', start: 22.1, end: 22.3 },
  { text: 'now,', start: 22.36, end: 22.68 },
];
