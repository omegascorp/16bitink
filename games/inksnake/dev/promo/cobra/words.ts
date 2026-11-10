/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (voice-take.mp3, 23.60 s, last word ending at 23.50 s), sped up by TEMPO
 * (pitch kept) with ffmpeg's atempo so its last word ends 0.3 s before the
 * 21 s loop point. WORDS are its words with start and end times in the
 * take (ElevenLabs Scribe, one run; no tags were echoed), so divide by TEMPO
 * for voice.mp3. Spelling and capitals follow the script (Scribe heard
 * numbers and some compounds differently, e.g. "1914"/"45"/"headfirst"; the
 * script's wording is used). Word edges at pauses and the first and last
 * word are fixed from the waveform (silencedetect at -40 dB).
 *
 * The script ends mid-sentence, and the loop's first line finishes it:
 * "…Its scientific name literally means snake eater, because / <first line of the loop>"
 */
export const TEMPO = 1.13551;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.067, end: 0.3 },
  { text: 'snake', start: 0.38, end: 0.7 },
  { text: 'EATS', start: 0.82, end: 1.02 },
  { text: 'other', start: 1.2, end: 1.4 },
  { text: 'snakes!', start: 1.54, end: 2.049 },
  { text: 'A', start: 2.462, end: 2.58 },
  { text: 'king', start: 2.66, end: 2.9 },
  { text: 'cobra', start: 2.96, end: 3.32 },
  { text: 'bit', start: 3.48, end: 3.6 },
  { text: 'a', start: 3.64, end: 3.74 },
  { text: 'python…', start: 3.8, end: 4.381 },
  { text: 'then', start: 4.898, end: 5.06 },
  { text: 'just', start: 5.12, end: 5.28 },
  { text: 'WAITED.', start: 5.48, end: 5.936 },
  { text: 'Two', start: 6.41, end: 6.64 },
  { text: 'hours', start: 6.72, end: 6.96 },
  { text: 'later,', start: 7.04, end: 7.483 },
  { text: 'the', start: 7.735, end: 7.86 },
  { text: 'python', start: 7.9, end: 8.32 },
  { text: 'stopped', start: 8.46, end: 8.7 },
  { text: 'moving.', start: 8.82, end: 9.186 },
  { text: 'Then', start: 9.59, end: 9.86 },
  { text: 'a', start: 9.9, end: 9.96 },
  { text: 'monitor', start: 10.08, end: 10.44 },
  { text: 'lizard', start: 10.52, end: 10.76 },
  { text: 'showed', start: 10.84, end: 11.06 },
  { text: 'up!', start: 11.14, end: 11.268 },
  { text: 'The', start: 11.651, end: 11.76 },
  { text: 'cobra', start: 11.8, end: 12.1 },
  { text: 'faced', start: 12.28, end: 12.5 },
  { text: 'it', start: 12.54, end: 12.64 },
  { text: 'down,', start: 12.68, end: 12.96 },
  { text: 'and', start: 13.16, end: 13.24 },
  { text: 'the', start: 13.28, end: 13.38 },
  { text: 'lizard', start: 13.44, end: 13.72 },
  { text: 'backed', start: 13.88, end: 14.16 },
  { text: 'OFF.', start: 14.26, end: 14.51 },
  { text: 'Then', start: 14.9, end: 15.06 },
  { text: 'it', start: 15.1, end: 15.2 },
  { text: 'swallowed', start: 15.28, end: 15.6 },
  { text: 'the', start: 15.64, end: 15.7 },
  { text: 'whole', start: 15.88, end: 16.1 },
  { text: 'python,', start: 16.239, end: 16.744 },
  { text: 'head', start: 16.94, end: 17.22 },
  { text: 'first,', start: 17.22, end: 17.52 },
  { text: 'in', start: 17.76, end: 17.8 },
  { text: 'about', start: 17.84, end: 18 },
  { text: 'forty-five', start: 18.28, end: 18.7 },
  { text: 'minutes!', start: 18.74, end: 19.173 },
  { text: 'Its', start: 20.06, end: 20.2 },
  { text: 'scientific', start: 20.26, end: 20.74 },
  { text: 'name', start: 20.82, end: 20.98 },
  { text: 'literally', start: 21.26, end: 21.62 },
  { text: 'means', start: 21.7, end: 21.96 },
  { text: 'snake', start: 22.22, end: 22.5 },
  { text: 'eater,', start: 22.56, end: 22.8 },
  { text: 'because', start: 23, end: 23.505 },
];

/** Word i's start and end in the video, seconds. */
export const startOf = (i: number): number => WORDS[i]!.start / TEMPO;
export const endOf = (i: number): number => WORDS[i]!.end / TEMPO;
