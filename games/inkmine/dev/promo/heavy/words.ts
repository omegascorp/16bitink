/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-18: generation YZQwcWxMDdecBvSXzGE4, its first
 * 0.114 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 24 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe,
 * less the 0.114 s), so divide by TEMPO for voice.mp3. Scribe's echoed audio
 * tags are dropped, and word edges are fixed from the waveform (silencedetect
 * at -40 dB): a word after a pause starts where the sound comes back, the word
 * before ends where the pause begins; the first word starts where the sound
 * does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Because / on a planet with THREE times our gravity, a deer might look like THIS."
 */
export const TEMPO = 1.1035;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'On', start: 0.0, end: 0.046 },
  { text: 'a', start: 0.126, end: 0.166 },
  { text: 'planet', start: 0.206, end: 0.606 },
  { text: 'with', start: 0.726, end: 0.846 },
  { text: 'THREE', start: 0.886, end: 1.086 },
  { text: 'times', start: 1.246, end: 1.486 },
  { text: 'our', start: 1.566, end: 1.646 },
  { text: 'gravity,', start: 1.726, end: 2.23 },
  { text: 'a', start: 2.36, end: 2.606 },
  { text: 'deer', start: 2.686, end: 2.926 },
  { text: 'might', start: 3.006, end: 3.166 },
  { text: 'look', start: 3.246, end: 3.406 },
  { text: 'like', start: 3.526, end: 3.646 },
  { text: 'THIS.', start: 3.726, end: 4.191 },
  { text: 'Every', start: 4.418, end: 5.326 },
  { text: 'step,', start: 5.486, end: 5.886 },
  { text: 'you\'d', start: 5.926, end: 6.046 },
  { text: 'carry', start: 6.246, end: 6.446 },
  { text: 'two', start: 6.526, end: 6.606 },
  { text: 'more', start: 6.766, end: 6.926 },
  { text: 'of', start: 7.006, end: 7.086 },
  { text: 'you', start: 7.126, end: 7.166 },
  { text: 'on', start: 7.246, end: 7.326 },
  { text: 'your', start: 7.406, end: 7.486 },
  { text: 'back!', start: 7.686, end: 7.895 },
  { text: 'Galileo', start: 8.246, end: 8.766 },
  { text: 'found', start: 8.846, end: 9.006 },
  { text: 'the', start: 9.046, end: 9.086 },
  { text: 'rule', start: 9.166, end: 9.406 },
  { text: 'in', start: 9.486, end: 9.646 },
  { text: '1638:', start: 9.766, end: 10.651 },
  { text: 'double', start: 11.092, end: 11.326 },
  { text: 'an', start: 11.406, end: 11.486 },
  { text: 'animal\'s', start: 11.606, end: 11.886 },
  { text: 'size,', start: 12.086, end: 12.366 },
  { text: 'and', start: 12.406, end: 12.446 },
  { text: 'it', start: 12.486, end: 12.526 },
  { text: 'gets', start: 12.606, end: 12.784 },
  { text: 'EIGHT', start: 12.967, end: 13.166 },
  { text: 'times', start: 13.246, end: 13.566 },
  { text: 'heavier…', start: 13.646, end: 14.039 },
  { text: 'but', start: 14.392, end: 14.446 },
  { text: 'its', start: 14.566, end: 14.686 },
  { text: 'legs', start: 14.766, end: 15.006 },
  { text: 'only', start: 15.166, end: 15.326 },
  { text: 'FOUR', start: 15.366, end: 15.566 },
  { text: 'times', start: 15.686, end: 15.806 },
  { text: 'stronger!', start: 15.886, end: 16.402 },
  { text: 'Thin', start: 16.771, end: 17.006 },
  { text: 'legs', start: 17.086, end: 17.326 },
  { text: 'would', start: 17.406, end: 17.486 },
  { text: 'just…', start: 17.566, end: 17.708 },
  { text: 'snap.', start: 17.986, end: 18.642 },
  { text: 'It\'s', start: 19.113, end: 19.246 },
  { text: 'why', start: 19.326, end: 19.406 },
  { text: 'elephants', start: 19.486, end: 19.886 },
  { text: 'can\'t', start: 19.966, end: 20.126 },
  { text: 'jump.', start: 20.206, end: 20.492 },
  { text: 'So', start: 20.95, end: 21.166 },
  { text: 'heavy', start: 21.286, end: 21.406 },
  { text: 'worlds', start: 21.486, end: 21.766 },
  { text: 'would', start: 21.806, end: 21.886 },
  { text: 'grow', start: 21.966, end: 22.126 },
  { text: 'short,', start: 22.286, end: 22.687 },
  { text: 'wide…', start: 22.809, end: 23.352 },
  { text: 'maybe', start: 23.667, end: 23.966 },
  { text: 'SIX-legged', start: 24.046, end: 24.606 },
  { text: 'animals!', start: 24.846, end: 25.135 },
  { text: 'Because', start: 25.384, end: 26.154 },
];
