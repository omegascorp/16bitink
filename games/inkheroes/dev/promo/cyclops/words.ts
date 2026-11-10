/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (voice-take.mp3, 24.48 s, last word ending at 24.18 s), sped up by TEMPO
 * (pitch kept) with ffmpeg's atempo so its last word ends 0.3 s before the
 * 22.5 s loop point. WORDS are its words with start and end times in the
 * take (ElevenLabs Scribe, one run; no tags were echoed), so divide by TEMPO
 * for voice.mp3. Spelling and capitals follow the script (Scribe heard
 * numbers and some compounds differently, e.g. "1914"/"45"/"headfirst"; the
 * script's wording is used). Word edges at pauses and the first and last
 * word are fixed from the waveform (silencedetect at -40 dB).
 *
 * The script ends mid-sentence, and the loop's first line finishes it:
 * "…Nobody can prove it. But you have to admit, / <first line of the loop>"
 */
export const TEMPO = 1.08923;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.106, end: 0.4 },
  { text: 'skull', start: 0.46, end: 0.8 },
  { text: 'has', start: 0.84, end: 0.98 },
  { text: 'ONE', start: 1.24, end: 1.44 },
  { text: 'giant', start: 1.7, end: 2.1 },
  { text: 'eye', start: 2.26, end: 2.42 },
  { text: 'socket!', start: 2.56, end: 2.968 },
  { text: 'Except…', start: 3.367, end: 4.04 },
  { text: "it's", start: 4.34, end: 4.54 },
  { text: 'not', start: 4.6, end: 4.74 },
  { text: 'an', start: 4.78, end: 4.9 },
  { text: 'eye.', start: 4.98, end: 5.31 },
  { text: "It's", start: 5.654, end: 5.86 },
  { text: 'the', start: 5.9, end: 5.98 },
  { text: 'hole', start: 6.06, end: 6.3 },
  { text: 'for', start: 6.34, end: 6.42 },
  { text: 'a', start: 6.48, end: 6.56 },
  { text: 'TRUNK!', start: 6.64, end: 7.113 },
  { text: 'Tiny', start: 7.511, end: 7.94 },
  { text: 'elephants,', start: 8.1, end: 8.62 },
  { text: 'about', start: 8.76, end: 9.02 },
  { text: 'three', start: 9.08, end: 9.28 },
  { text: 'feet', start: 9.42, end: 9.62 },
  { text: 'tall,', start: 9.68, end: 9.96 },
  { text: 'lived', start: 10.08, end: 10.26 },
  { text: 'on', start: 10.3, end: 10.44 },
  { text: 'Sicily,', start: 10.5, end: 10.944 },
  { text: 'and', start: 11.318, end: 11.46 },
  { text: 'died', start: 11.5, end: 11.68 },
  { text: 'out', start: 11.74, end: 11.9 },
  { text: 'long', start: 12.02, end: 12.26 },
  { text: 'before', start: 12.3, end: 12.66 },
  { text: 'anyone', start: 12.74, end: 13.06 },
  { text: 'wrote', start: 13.1, end: 13.28 },
  { text: 'anything', start: 13.32, end: 13.68 },
  { text: 'down.', start: 13.72, end: 14.034 },
  { text: 'In', start: 14.471, end: 14.58 },
  { text: '1914,', start: 14.62, end: 15.62 },
  { text: 'a', start: 15.84, end: 15.92 },
  { text: 'scientist', start: 15.98, end: 16.379 },
  { text: 'guessed', start: 16.54, end: 16.78 },
  { text: 'the', start: 16.82, end: 16.92 },
  { text: 'Greeks', start: 16.96, end: 17.26 },
  { text: 'found', start: 17.34, end: 17.5 },
  { text: 'skulls', start: 17.58, end: 17.86 },
  { text: 'like', start: 17.9, end: 18.08 },
  { text: 'these…', start: 18.12, end: 18.365 },
  { text: 'and', start: 18.623, end: 18.82 },
  { text: 'imagined', start: 18.86, end: 19.38 },
  { text: 'a', start: 19.44, end: 19.46 },
  { text: 'one-eyed', start: 19.72, end: 20.04 },
  { text: 'GIANT!', start: 20.24, end: 20.745 },
  { text: 'Nobody', start: 21.64, end: 21.92 },
  { text: 'can', start: 21.98, end: 22.1 },
  { text: 'prove', start: 22.18, end: 22.42 },
  { text: 'it.', start: 22.46, end: 22.595 },
  { text: 'But', start: 23.084, end: 23.28 },
  { text: 'you', start: 23.34, end: 23.42 },
  { text: 'have', start: 23.46, end: 23.64 },
  { text: 'to', start: 23.66, end: 23.74 },
  { text: 'admit,', start: 23.78, end: 24.181 },
];

/** Word i's start and end in the video, seconds. */
export const startOf = (i: number): number => WORDS[i]!.start / TEMPO;
export const endOf = (i: number): number => WORDS[i]!.end / TEMPO;
