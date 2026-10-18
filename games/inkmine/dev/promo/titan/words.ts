/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-18: generation w9RHpNKmHKh3HT2Eeq8S, its first
 * 0.074 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 21 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe,
 * less the 0.074 s), so divide by TEMPO for voice.mp3. Scribe's echoed audio
 * tags are dropped, and word edges are fixed from the waveform (silencedetect
 * at -40 dB): a word after a pause starts where the sound comes back, the word
 * before ends where the pause begins; the first word starts where the sound
 * does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So wear a REALLY warm coat, because / on Saturn's moon Titan, you could FLY…"
 */
export const TEMPO = 1.0822;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'On', start: 0.0, end: 0.166 },
  { text: 'Saturn\'s', start: 0.246, end: 0.646 },
  { text: 'moon', start: 0.766, end: 0.886 },
  { text: 'Titan,', start: 1.086, end: 1.526 },
  { text: 'you', start: 1.606, end: 1.686 },
  { text: 'could', start: 1.806, end: 1.926 },
  { text: 'FLY…', start: 2.046, end: 2.439 },
  { text: 'just', start: 2.675, end: 2.886 },
  { text: 'by', start: 3.006, end: 3.126 },
  { text: 'flapping', start: 3.166, end: 3.526 },
  { text: 'your', start: 3.606, end: 3.686 },
  { text: 'arms!', start: 3.926, end: 4.193 },
  { text: 'Strap', start: 4.487, end: 4.886 },
  { text: 'on', start: 4.966, end: 5.046 },
  { text: 'some', start: 5.126, end: 5.286 },
  { text: 'wings,', start: 5.366, end: 5.846 },
  { text: 'flap', start: 5.926, end: 6.246 },
  { text: 'hard…', start: 6.406, end: 6.625 },
  { text: 'and', start: 6.764, end: 7.046 },
  { text: 'you\'re', start: 7.086, end: 7.206 },
  { text: 'off!', start: 7.286, end: 7.633 },
  { text: 'The', start: 8.031, end: 8.166 },
  { text: 'air', start: 8.246, end: 8.406 },
  { text: 'is', start: 8.526, end: 8.646 },
  { text: 'four', start: 8.726, end: 8.966 },
  { text: 'times', start: 9.166, end: 9.366 },
  { text: 'THICKER', start: 9.446, end: 9.686 },
  { text: 'than', start: 9.766, end: 9.846 },
  { text: 'ours,', start: 9.926, end: 10.326 },
  { text: 'and', start: 10.446, end: 10.566 },
  { text: 'you\'d', start: 10.619, end: 10.726 },
  { text: 'weigh', start: 10.806, end: 10.886 },
  { text: 'about', start: 11.006, end: 11.126 },
  { text: 'as', start: 11.206, end: 11.286 },
  { text: 'much', start: 11.366, end: 11.446 },
  { text: 'as', start: 11.486, end: 11.526 },
  { text: 'a', start: 11.606, end: 11.686 },
  { text: 'toddler.', start: 11.726, end: 12.152 },
  { text: 'One', start: 12.562, end: 12.966 },
  { text: 'catch:', start: 13.046, end: 13.558 },
  { text: 'it\'s', start: 13.719, end: 14.086 },
  { text: 'minus', start: 14.286, end: 14.486 },
  { text: 'one', start: 14.566, end: 14.726 },
  { text: 'hundred', start: 14.806, end: 14.966 },
  { text: 'eighty', start: 15.126, end: 15.326 },
  { text: 'degrees…', start: 15.366, end: 16.022 },
  { text: 'and', start: 16.25, end: 16.326 },
  { text: 'the', start: 16.366, end: 16.406 },
  { text: 'lake', start: 16.486, end: 16.566 },
  { text: 'below', start: 16.646, end: 16.886 },
  { text: 'you?', start: 16.966, end: 17.17 },
  { text: 'Liquid', start: 17.477, end: 17.926 },
  { text: 'natural', start: 18.086, end: 18.566 },
  { text: 'GAS!', start: 18.726, end: 19.321 },
  { text: 'So', start: 19.507, end: 20.006 },
  { text: 'wear', start: 20.086, end: 20.246 },
  { text: 'a', start: 20.326, end: 20.566 },
  { text: 'REALLY', start: 20.646, end: 20.886 },
  { text: 'warm', start: 20.966, end: 21.126 },
  { text: 'coat,', start: 21.206, end: 21.846 },
  { text: 'because', start: 22.086, end: 22.402 },
];
