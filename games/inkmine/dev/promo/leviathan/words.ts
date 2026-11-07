/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations",
 * the take in voice-take.mp3 (16.24 s), sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end 0.3 s before the 15 s loop point. WORDS are its
 * words with start and end times in the take, so divide by TEMPO for
 * voice.mp3. Timings are from ElevenLabs Scribe (one run, 2026-11-06), the
 * script's own spelling and punctuation kept. Edges at the pauses are fixed
 * from the waveform (silencedetect at -40 dB): a word after a pause starts
 * where the sound comes back, the word before ends where the pause begins;
 * the first word starts where the sound does (no silence leads the take) and
 * the last ends where it fades out.
 *
 * The script ends mid-sentence, so the loop's first line finishes it:
 * "…So, a little advice: / NEVER drill near this thing."
 */
export const TEMPO = 1.0946;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'NEVER', start: 0, end: 0.64 },
  { text: 'drill', start: 0.72, end: 0.96 },
  { text: 'near', start: 1.04, end: 1.2 },
  { text: 'this', start: 1.4, end: 1.6 },
  { text: 'thing.', start: 1.66, end: 2.014 },
  { text: "It's", start: 2.549, end: 2.78 },
  { text: 'the', start: 2.82, end: 2.9 },
  { text: 'Leviathan,', start: 2.94, end: 3.592 },
  { text: 'asleep', start: 4.041, end: 4.46 },
  { text: 'in', start: 4.48, end: 4.54 },
  { text: 'a', start: 4.58, end: 4.66 },
  { text: 'flooded', start: 4.74, end: 5 },
  { text: 'cave…', start: 5.12, end: 5.592 },
  { text: 'Every', start: 6.109, end: 6.4 },
  { text: 'block', start: 6.44, end: 6.66 },
  { text: 'you', start: 6.7, end: 6.82 },
  { text: 'drill', start: 6.88, end: 7.12 },
  { text: 'makes', start: 7.2, end: 7.42 },
  { text: 'noise.', start: 7.48, end: 7.933 },
  { text: 'One', start: 8.452, end: 8.6 },
  { text: 'more…', start: 8.66, end: 9.013 },
  { text: 'one', start: 9.661, end: 9.8 },
  { text: 'more…', start: 9.9, end: 10.276 },
  { text: 'Its', start: 10.759, end: 10.96 },
  { text: 'eye', start: 10.98, end: 11.18 },
  { text: 'opens!', start: 11.26, end: 11.703 },
  { text: 'You', start: 12.072, end: 12.2 },
  { text: "can't", start: 12.28, end: 12.48 },
  { text: 'hurt', start: 12.52, end: 12.68 },
  { text: 'it.', start: 12.74, end: 12.86 },
  { text: 'You', start: 13.063, end: 13.22 },
  { text: 'can', start: 13.24, end: 13.34 },
  { text: 'only', start: 13.4, end: 13.58 },
  { text: 'RUN!', start: 13.74, end: 14.139 },
  { text: 'So,', start: 14.461, end: 14.92 },
  { text: 'a', start: 15.18, end: 15.22 },
  { text: 'little', start: 15.28, end: 15.44 },
  { text: 'advice:', start: 15.5, end: 16.091 },
];

/** When word `i` starts, in loop seconds. */
export const said = (i: number): number => WORDS[i]!.start / TEMPO;
