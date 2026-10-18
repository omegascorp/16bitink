/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-18: generation fBU1y9MdgSi3iTqTCLXh, its first
 * 0.075 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 18 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe,
 * less the 0.075 s), so divide by TEMPO for voice.mp3. Scribe's echoed audio
 * tags are dropped, and word edges are fixed from the waveform (silencedetect
 * at -40 dB): a word after a pause starts where the sound comes back, the word
 * before ends where the pause begins; the first word starts where the sound
 * does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Nope. Because / this fish swallowed a fish FOUR times its length!"
 */
export const TEMPO = 1.1037;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.0, end: 0.245 },
  { text: 'fish', start: 0.325, end: 0.565 },
  { text: 'swallowed', start: 0.645, end: 0.965 },
  { text: 'a', start: 1.045, end: 1.125 },
  { text: 'fish', start: 1.285, end: 1.398 },
  { text: 'FOUR', start: 1.537, end: 1.765 },
  { text: 'times', start: 1.845, end: 2.085 },
  { text: 'its', start: 2.205, end: 2.325 },
  { text: 'length!', start: 2.525, end: 2.719 },
  { text: 'It\'s', start: 3.161, end: 3.285 },
  { text: 'a', start: 3.365, end: 3.472 },
  { text: 'black', start: 3.578, end: 3.685 },
  { text: 'swallower,', start: 3.765, end: 4.352 },
  { text: 'from', start: 4.497, end: 4.725 },
  { text: 'two', start: 4.805, end: 4.885 },
  { text: 'kilometres', start: 4.965, end: 5.365 },
  { text: 'down.', start: 5.445, end: 5.794 },
  { text: 'In', start: 6.188, end: 6.325 },
  { text: 'two', start: 6.405, end: 6.485 },
  { text: 'thousand', start: 6.565, end: 6.965 },
  { text: 'seven,', start: 7.285, end: 7.645 },
  { text: 'one', start: 7.685, end: 7.845 },
  { text: 'floated', start: 7.925, end: 8.245 },
  { text: 'up', start: 8.325, end: 8.485 },
  { text: 'off', start: 8.565, end: 8.645 },
  { text: 'the', start: 8.725, end: 8.805 },
  { text: 'Cayman', start: 8.858, end: 9.205 },
  { text: 'Islands…', start: 9.285, end: 9.925 },
  { text: 'with', start: 10.005, end: 10.085 },
  { text: 'an', start: 10.205, end: 10.221 },
  { text: 'eighty-six', start: 10.362, end: 10.965 },
  { text: 'centimetre', start: 11.045, end: 11.445 },
  { text: 'fish', start: 11.525, end: 11.765 },
  { text: 'coiled', start: 11.845, end: 12.085 },
  { text: 'inside!', start: 12.325, end: 12.608 },
  { text: 'Too', start: 13.115, end: 13.285 },
  { text: 'big', start: 13.365, end: 13.445 },
  { text: 'to', start: 13.525, end: 13.605 },
  { text: 'digest.', start: 13.925, end: 14.308 },
  { text: 'It', start: 14.715, end: 14.805 },
  { text: 'never', start: 14.885, end: 15.045 },
  { text: 'swam', start: 15.125, end: 15.365 },
  { text: 'again.', start: 15.565, end: 15.767 },
  { text: 'Eyes', start: 16.303, end: 16.565 },
  { text: 'bigger', start: 16.645, end: 16.885 },
  { text: 'than', start: 16.925, end: 16.965 },
  { text: 'its', start: 17.045, end: 17.205 },
  { text: 'stomach?', start: 17.285, end: 17.676 },
  { text: 'Nope.', start: 18.003, end: 18.479 },
  { text: 'Because', start: 18.717, end: 19.535 },
];
