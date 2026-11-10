/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (voice-take.mp3, 23.04 s, last word ending at 22.91 s), sped up by TEMPO
 * (pitch kept) with ffmpeg's atempo so its last word ends 0.3 s before the
 * 21 s loop point. WORDS are its words with start and end times in the
 * take (ElevenLabs Scribe, one run; no tags were echoed), so divide by TEMPO
 * for voice.mp3. Spelling and capitals follow the script (Scribe heard
 * numbers and some compounds differently, e.g. "1914"/"45"/"headfirst"; the
 * script's wording is used). Word edges at pauses and the first and last
 * word are fixed from the waveform (silencedetect at -40 dB).
 *
 * The script ends mid-sentence, and the loop's first line finishes it:
 * "…So travel light, because / <first line of the loop>"
 */
export const TEMPO = 1.10657;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'If', start: 0.095, end: 0.3 },
  { text: 'your', start: 0.34, end: 0.5 },
  { text: 'heart', start: 0.64, end: 0.92 },
  { text: 'was', start: 0.98, end: 1.16 },
  { text: 'too', start: 1.22, end: 1.34 },
  { text: 'heavy…', start: 1.46, end: 1.875 },
  { text: 'THIS', start: 2.264, end: 2.7 },
  { text: 'ate', start: 2.94, end: 3.1 },
  { text: 'it!', start: 3.16, end: 3.382 },
  { text: 'Meet', start: 3.785, end: 4.1 },
  { text: 'Ammit:', start: 4.36, end: 4.758 },
  { text: 'a', start: 5.1, end: 5.18 },
  { text: "crocodile's", start: 5.24, end: 5.82 },
  { text: 'head,', start: 5.86, end: 6.196 },
  { text: 'a', start: 6.37, end: 6.44 },
  { text: "lion's", start: 6.58, end: 7.02 },
  { text: 'body…', start: 7.04, end: 7.423 },
  { text: 'and', start: 8.119, end: 8.32 },
  { text: 'a', start: 8.36, end: 8.44 },
  { text: "hippo's", start: 8.52, end: 8.94 },
  { text: 'backside.', start: 8.98, end: 9.539 },
  { text: 'Three', start: 9.896, end: 10.18 },
  { text: 'animals', start: 10.32, end: 10.68 },
  { text: 'the', start: 10.72, end: 10.78 },
  { text: 'Egyptians', start: 10.82, end: 11.32 },
  { text: 'feared', start: 11.48, end: 11.823 },
  { text: 'in', start: 12.102, end: 12.22 },
  { text: 'ONE', start: 12.44, end: 12.62 },
  { text: 'monster.', start: 12.74, end: 13.27 },
  { text: 'When', start: 13.713, end: 13.9 },
  { text: 'you', start: 13.92, end: 14.02 },
  { text: 'died,', start: 14.06, end: 14.42 },
  { text: 'your', start: 14.74, end: 14.84 },
  { text: 'heart', start: 14.94, end: 15.14 },
  { text: 'was', start: 15.18, end: 15.32 },
  { text: 'weighed', start: 15.38, end: 15.58 },
  { text: 'against', start: 15.62, end: 15.86 },
  { text: 'a', start: 15.88, end: 16 },
  { text: 'feather.', start: 16.059, end: 16.39 },
  { text: 'Heavier?', start: 16.794, end: 17.312 },
  { text: 'Ammit', start: 17.635, end: 17.92 },
  { text: 'gobbled', start: 18.12, end: 18.4 },
  { text: 'it', start: 18.44, end: 18.52 },
  { text: 'up,', start: 18.6, end: 18.839 },
  { text: 'and', start: 19.118, end: 19.22 },
  { text: 'you', start: 19.26, end: 19.36 },
  { text: 'never', start: 19.48, end: 19.76 },
  { text: 'reached', start: 19.78, end: 20.02 },
  { text: 'the', start: 20.06, end: 20.12 },
  { text: 'afterlife…', start: 20.22, end: 20.761 },
  { text: 'So', start: 21.134, end: 21.34 },
  { text: 'travel', start: 21.4, end: 21.72 },
  { text: 'light,', start: 21.78, end: 22.137 },
  { text: 'because', start: 22.334, end: 22.906 },
];

/** Word i's start and end in the video, seconds. */
export const startOf = (i: number): number => WORDS[i]!.start / TEMPO;
export const endOf = (i: number): number => WORDS[i]!.end / TEMPO;
