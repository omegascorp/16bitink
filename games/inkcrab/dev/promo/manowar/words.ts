/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-18: generation 6cmbkHPbK2m7ogHt2U10, its first
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
 * "…So whatever you do, remember: / this is NOT a jellyfish."
 */
export const TEMPO = 1.0933;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.0, end: 0.246 },
  { text: 'is', start: 0.406, end: 0.566 },
  { text: 'NOT', start: 0.806, end: 1.126 },
  { text: 'a', start: 1.286, end: 1.366 },
  { text: 'jellyfish.', start: 1.446, end: 2.189 },
  { text: 'The', start: 2.678, end: 2.806 },
  { text: 'Portuguese', start: 2.926, end: 3.286 },
  { text: 'man', start: 3.366, end: 3.526 },
  { text: 'o\'', start: 3.553, end: 3.606 },
  { text: 'war', start: 3.686, end: 3.846 },
  { text: 'is', start: 3.926, end: 4.006 },
  { text: 'a', start: 4.086, end: 4.166 },
  { text: 'whole', start: 4.326, end: 4.486 },
  { text: 'COLONY', start: 4.566, end: 5.046 },
  { text: 'of', start: 5.126, end: 5.206 },
  { text: 'tiny', start: 5.286, end: 5.526 },
  { text: 'animals,', start: 5.606, end: 6.086 },
  { text: 'living', start: 6.326, end: 6.566 },
  { text: 'as', start: 6.646, end: 6.806 },
  { text: 'one.', start: 6.886, end: 7.205 },
  { text: 'One', start: 7.603, end: 7.766 },
  { text: 'makes', start: 7.846, end: 8.006 },
  { text: 'the', start: 8.086, end: 8.166 },
  { text: 'float,', start: 8.246, end: 8.602 },
  { text: 'some', start: 8.764, end: 9.046 },
  { text: 'sting,', start: 9.206, end: 9.686 },
  { text: 'some', start: 9.846, end: 10.086 },
  { text: 'eat…', start: 10.166, end: 10.759 },
  { text: 'and', start: 10.91, end: 11.046 },
  { text: 'the', start: 11.126, end: 11.206 },
  { text: 'tentacles', start: 11.286, end: 11.686 },
  { text: 'can', start: 11.766, end: 11.846 },
  { text: 'grow', start: 11.966, end: 12.086 },
  { text: 'longer', start: 12.166, end: 12.406 },
  { text: 'than', start: 12.486, end: 12.566 },
  { text: 'a', start: 12.806, end: 12.846 },
  { text: 'BUS!', start: 12.886, end: 13.374 },
  { text: 'Even', start: 13.815, end: 14.043 },
  { text: 'dead', start: 14.218, end: 14.406 },
  { text: 'on', start: 14.446, end: 14.486 },
  { text: 'the', start: 14.566, end: 15.067 },
  { text: 'sand…', start: 15.192, end: 15.366 },
  { text: 'it', start: 15.659, end: 15.686 },
  { text: 'can', start: 15.806, end: 15.926 },
  { text: 'STILL', start: 16.086, end: 16.406 },
  { text: 'sting!', start: 16.486, end: 16.939 },
  { text: 'Oh,', start: 17.307, end: 17.633 },
  { text: 'and', start: 17.659, end: 17.686 },
  { text: 'the', start: 17.766, end: 17.846 },
  { text: 'sail?', start: 17.926, end: 18.195 },
  { text: 'Some', start: 18.537, end: 18.806 },
  { text: 'lean', start: 18.926, end: 19.046 },
  { text: 'left…', start: 19.366, end: 19.739 },
  { text: 'some', start: 19.793, end: 19.846 },
  { text: 'lean', start: 19.926, end: 20.086 },
  { text: 'right.', start: 20.166, end: 20.348 },
  { text: 'So', start: 20.826, end: 20.966 },
  { text: 'whatever', start: 21.046, end: 21.366 },
  { text: 'you', start: 21.446, end: 21.526 },
  { text: 'do,', start: 21.646, end: 21.803 },
  { text: 'remember:', start: 22.143, end: 22.631 },
];
