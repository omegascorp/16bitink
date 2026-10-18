/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-18: generation wQfC0X9P1c1CRwdaCzpz, its first
 * 0.046 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 22.5 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe,
 * less the 0.046 s), so divide by TEMPO for voice.mp3. Scribe's echoed audio
 * tags are dropped, and word edges are fixed from the waveform (silencedetect
 * at -40 dB): a word after a pause starts where the sound comes back, the word
 * before ends where the pause begins; the first word starts where the sound
 * does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…And no matter what, / this animal can grow back its own LEGS!"
 */
export const TEMPO = 1.1501;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.0, end: 0.194 },
  { text: 'animal', start: 0.354, end: 0.594 },
  { text: 'can', start: 0.674, end: 0.834 },
  { text: 'grow', start: 0.914, end: 1.074 },
  { text: 'back', start: 1.154, end: 1.314 },
  { text: 'its', start: 1.434, end: 1.554 },
  { text: 'own', start: 1.674, end: 1.794 },
  { text: 'LEGS!', start: 1.954, end: 2.536 },
  { text: 'Yes,', start: 2.712, end: 3.714 },
  { text: 'the', start: 3.794, end: 3.874 },
  { text: 'Minecraft', start: 3.914, end: 4.434 },
  { text: 'one', start: 4.514, end: 4.754 },
  { text: 'is', start: 4.874, end: 4.994 },
  { text: 'real.', start: 5.074, end: 5.448 },
  { text: 'Lose', start: 5.88, end: 6.114 },
  { text: 'a', start: 6.154, end: 6.194 },
  { text: 'leg,', start: 6.274, end: 6.754 },
  { text: 'and', start: 6.794, end: 6.834 },
  { text: 'in', start: 6.914, end: 6.954 },
  { text: 'a', start: 6.994, end: 7.074 },
  { text: 'few', start: 7.154, end: 7.314 },
  { text: 'weeks,', start: 7.514, end: 7.794 },
  { text: 'a', start: 7.834, end: 7.874 },
  { text: 'new', start: 8.034, end: 8.114 },
  { text: 'one', start: 8.194, end: 8.274 },
  { text: 'grows…', start: 8.354, end: 8.88 },
  { text: 'bones,', start: 9.255, end: 9.954 },
  { text: 'muscles,', start: 10.034, end: 10.49 },
  { text: 'even', start: 10.616, end: 10.914 },
  { text: 'TOES!', start: 10.994, end: 11.576 },
  { text: 'It', start: 11.949, end: 12.034 },
  { text: 'can', start: 12.114, end: 12.194 },
  { text: 'fix', start: 12.274, end: 12.434 },
  { text: 'parts', start: 12.514, end: 12.754 },
  { text: 'of', start: 12.794, end: 12.834 },
  { text: 'its', start: 12.954, end: 13.074 },
  { text: 'HEART', start: 13.154, end: 13.394 },
  { text: 'and', start: 13.514, end: 13.634 },
  { text: 'brain', start: 13.834, end: 14.034 },
  { text: 'too!', start: 14.114, end: 14.458 },
  { text: 'But', start: 14.929, end: 14.994 },
  { text: 'in', start: 15.034, end: 15.074 },
  { text: 'the', start: 15.154, end: 15.234 },
  { text: 'wild,', start: 15.474, end: 15.954 },
  { text: 'it', start: 16.034, end: 16.114 },
  { text: 'lives', start: 16.194, end: 16.354 },
  { text: 'in', start: 16.474, end: 16.594 },
  { text: 'just', start: 16.674, end: 16.914 },
  { text: 'one', start: 16.994, end: 17.074 },
  { text: 'place,', start: 17.154, end: 17.954 },
  { text: 'the', start: 17.994, end: 18.034 },
  { text: 'canals', start: 18.114, end: 18.514 },
  { text: 'of', start: 18.594, end: 18.674 },
  { text: 'Mexico', start: 18.874, end: 19.074 },
  { text: 'City…', start: 19.234, end: 20.034 },
  { text: 'and', start: 20.074, end: 20.114 },
  { text: 'it\'s', start: 20.194, end: 20.354 },
  { text: 'almost', start: 20.434, end: 20.754 },
  { text: 'gone.', start: 20.834, end: 21.16 },
  { text: 'Honestly?', start: 21.681, end: 22.3 },
  { text: 'It\'s', start: 22.733, end: 22.994 },
  { text: 'cuter', start: 23.074, end: 23.234 },
  { text: 'than', start: 23.314, end: 23.458 },
  { text: 'any', start: 23.591, end: 23.794 },
  { text: 'puppy.', start: 23.874, end: 24.248 },
  { text: 'And', start: 24.709, end: 24.834 },
  { text: 'no', start: 24.874, end: 24.914 },
  { text: 'matter', start: 24.994, end: 25.234 },
  { text: 'what,', start: 25.314, end: 25.532 },
];
