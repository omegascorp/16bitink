/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (eleven_v4), voice-take.mp3 sped up by TEMPO (pitch kept) with ffmpeg's
 * atempo: last word's end (18.10 s, silencedetect) ÷ (16.5 − 0.3). WORDS are
 * its words with start and end times in the take, from ElevenLabs Scribe (one
 * run, no tags echoed); the first word's start and the last word's end come
 * from silencedetect. Spelling and emphasis follow the script. Divide by
 * TEMPO for voice.mp3 and the loop (`inVoice`).
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Which proves / this heron picked the WRONG crab!"
 */
export const TEMPO = 1.1175;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

/** A time in the take, in the loop (the voice starts with it). */
export const inVoice = (takeSeconds: number): number => takeSeconds / TEMPO;

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.08, end: 0.34 },
  { text: 'heron', start: 0.42, end: 0.72 },
  { text: 'picked', start: 0.82, end: 1 },
  { text: 'the', start: 1.04, end: 1.14 },
  { text: 'WRONG', start: 1.26, end: 1.62 },
  { text: 'crab!', start: 1.72, end: 2.18 },
  { text: 'A', start: 2.66, end: 2.74 },
  { text: 'young', start: 2.78, end: 3.02 },
  { text: 'night', start: 3.06, end: 3.26 },
  { text: 'heron', start: 3.32, end: 3.56 },
  { text: 'spots', start: 3.64, end: 3.92 },
  { text: 'a', start: 3.96, end: 4.019 },
  { text: 'crab', start: 4.08, end: 4.4 },
  { text: 'in', start: 4.44, end: 4.5 },
  { text: 'the', start: 4.54, end: 4.62 },
  { text: 'marsh…', start: 4.66, end: 5.04 },
  { text: 'It', start: 5.48, end: 5.58 },
  { text: 'strikes,', start: 5.68, end: 6.08 },
  { text: 'and', start: 6.28, end: 6.34 },
  { text: 'the', start: 6.38, end: 6.44 },
  { text: 'crab', start: 6.5, end: 6.7 },
  { text: 'pokes', start: 6.84, end: 7.08 },
  { text: 'it', start: 7.12, end: 7.18 },
  { text: 'in', start: 7.22, end: 7.28 },
  { text: 'the', start: 7.3, end: 7.44 },
  { text: 'EYE!', start: 7.54, end: 7.86 },
  { text: 'Second', start: 8.42, end: 8.68 },
  { text: 'try?', start: 8.76, end: 9.02 },
  { text: 'The', start: 9.46, end: 9.54 },
  { text: 'crab', start: 9.6, end: 9.82 },
  { text: 'clamps', start: 9.92, end: 10.16 },
  { text: 'BOTH', start: 10.36, end: 10.58 },
  { text: 'claws', start: 10.66, end: 10.94 },
  { text: 'on', start: 10.98, end: 11.04 },
  { text: 'its', start: 11.08, end: 11.28 },
  { text: 'bill!', start: 11.32, end: 11.64 },
  { text: 'The', start: 12.18, end: 12.28 },
  { text: 'heron', start: 12.34, end: 12.6 },
  { text: 'shakes…', start: 12.74, end: 13.1 },
  { text: 'and', start: 13.48, end: 13.58 },
  { text: 'flies', start: 13.7, end: 14 },
  { text: 'off.', start: 14.08, end: 14.32 },
  { text: 'Crab,', start: 14.76, end: 15.08 },
  { text: 'one.', start: 15.2, end: 15.46 },
  { text: 'Heron,', start: 15.82, end: 16.219 },
  { text: 'zero.', start: 16.379, end: 16.76 },
  { text: 'Which', start: 17.22, end: 17.38 },
  { text: 'proves', start: 17.52, end: 18.1 },
];
