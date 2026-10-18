/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-18: generation tdxeUdxd24UJnWOO0X59, its first
 * 0.093 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 16.5 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe,
 * less the 0.093 s), so divide by TEMPO for voice.mp3. Scribe's echoed audio
 * tags are dropped, and word edges are fixed from the waveform (silencedetect
 * at -40 dB): a word after a pause starts where the sound comes back, the word
 * before ends where the pause begins; the first word starts where the sound
 * does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So believe it: / this shrimp's snap is almost as hot as the SUN!"
 */
export const TEMPO = 1.0549;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.0, end: 0.147 },
  { text: 'shrimp\'s', start: 0.227, end: 0.627 },
  { text: 'snap', start: 0.787, end: 0.947 },
  { text: 'is', start: 1.067, end: 1.187 },
  { text: 'almost', start: 1.267, end: 1.507 },
  { text: 'as', start: 1.587, end: 1.667 },
  { text: 'hot', start: 1.747, end: 1.907 },
  { text: 'as', start: 1.947, end: 1.987 },
  { text: 'the', start: 2.067, end: 2.227 },
  { text: 'SUN!', start: 2.307, end: 2.743 },
  { text: 'The', start: 3.209, end: 3.347 },
  { text: 'pistol', start: 3.387, end: 3.667 },
  { text: 'shrimp', start: 3.747, end: 3.987 },
  { text: 'snaps', start: 4.067, end: 4.387 },
  { text: 'its', start: 4.467, end: 4.547 },
  { text: 'claw', start: 4.627, end: 4.947 },
  { text: 'so', start: 5.027, end: 5.267 },
  { text: 'fast,', start: 5.347, end: 5.907 },
  { text: 'it', start: 5.987, end: 6.067 },
  { text: 'fires', start: 6.147, end: 6.387 },
  { text: 'a', start: 6.507, end: 6.627 },
  { text: 'bubble…', start: 6.787, end: 7.187 },
  { text: 'that', start: 7.393, end: 7.427 },
  { text: 'bursts', start: 7.507, end: 7.747 },
  { text: 'at', start: 7.827, end: 7.907 },
  { text: 'nearly', start: 8.04, end: 8.307 },
  { text: 'FIVE', start: 8.347, end: 8.652 },
  { text: 'thousand', start: 8.779, end: 9.107 },
  { text: 'degrees,', start: 9.187, end: 9.987 },
  { text: 'with', start: 10.124, end: 10.147 },
  { text: 'a', start: 10.227, end: 10.307 },
  { text: 'flash', start: 10.467, end: 10.627 },
  { text: 'and', start: 10.707, end: 10.787 },
  { text: 'a', start: 10.907, end: 10.988 },
  { text: 'BANG', start: 11.11, end: 11.427 },
  { text: 'that', start: 11.547, end: 11.667 },
  { text: 'stuns', start: 11.747, end: 11.987 },
  { text: 'its', start: 12.067, end: 12.227 },
  { text: 'prey!', start: 12.347, end: 12.637 },
  { text: 'In', start: 13.052, end: 13.267 },
  { text: 'World', start: 13.347, end: 13.507 },
  { text: 'War', start: 13.587, end: 13.667 },
  { text: 'Two,', start: 13.747, end: 14.186 },
  { text: 'submarines', start: 14.344, end: 14.947 },
  { text: 'hid', start: 15.027, end: 15.187 },
  { text: 'in', start: 15.227, end: 15.267 },
  { text: 'its', start: 15.347, end: 15.427 },
  { text: 'noise.', start: 15.507, end: 15.917 },
  { text: 'So', start: 16.219, end: 16.467 },
  { text: 'believe', start: 16.547, end: 16.867 },
  { text: 'it:', start: 16.947, end: 17.09 },
];
