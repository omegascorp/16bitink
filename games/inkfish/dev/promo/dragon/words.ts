/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-18: generation q8nBt6xbWYRVGzyJl4BB, its first
 * 0.088 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 19.5 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe,
 * less the 0.088 s), so divide by TEMPO for voice.mp3. Scribe's echoed audio
 * tags are dropped, and word edges are fixed from the waveform (silencedetect
 * at -40 dB): a word after a pause starts where the sound comes back, the word
 * before ends where the pause begins; the first word starts where the sound
 * does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So yes, / this tiny slug EATS the man o' war…"
 */
export const TEMPO = 1.081;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.0, end: 0.152 },
  { text: 'tiny', start: 0.232, end: 0.552 },
  { text: 'slug', start: 0.712, end: 1.079 },
  { text: 'EATS', start: 1.251, end: 1.512 },
  { text: 'the', start: 1.592, end: 1.672 },
  { text: 'man', start: 1.752, end: 1.912 },
  { text: 'o\'', start: 1.939, end: 1.992 },
  { text: 'war…', start: 2.072, end: 2.472 },
  { text: 'and', start: 2.712, end: 2.872 },
  { text: 'steals', start: 3.032, end: 3.352 },
  { text: 'its', start: 3.432, end: 3.592 },
  { text: 'stingers!', start: 3.672, end: 4.297 },
  { text: 'The', start: 4.73, end: 4.792 },
  { text: 'blue', start: 4.872, end: 5.032 },
  { text: 'dragon', start: 5.112, end: 5.512 },
  { text: 'floats', start: 5.592, end: 5.912 },
  { text: 'upside', start: 6.032, end: 6.392 },
  { text: 'down,', start: 6.472, end: 6.872 },
  { text: 'on', start: 6.952, end: 7.032 },
  { text: 'a', start: 7.112, end: 7.192 },
  { text: 'gulp', start: 7.312, end: 7.432 },
  { text: 'of', start: 7.512, end: 7.592 },
  { text: 'air.', start: 7.672, end: 7.986 },
  { text: 'It', start: 8.431, end: 8.552 },
  { text: 'swallows', start: 8.632, end: 9.032 },
  { text: 'the', start: 9.112, end: 9.192 },
  { text: 'stinging', start: 9.232, end: 9.512 },
  { text: 'cells', start: 9.592, end: 9.912 },
  { text: 'WITHOUT', start: 10.152, end: 10.392 },
  { text: 'setting', start: 10.512, end: 10.632 },
  { text: 'them', start: 10.712, end: 10.792 },
  { text: 'off…', start: 10.872, end: 11.138 },
  { text: 'and', start: 11.491, end: 11.672 },
  { text: 'stores', start: 11.752, end: 12.072 },
  { text: 'them', start: 12.152, end: 12.312 },
  { text: 'in', start: 12.352, end: 12.392 },
  { text: 'its', start: 12.512, end: 12.632 },
  { text: 'fingertips.', start: 12.712, end: 13.405 },
  { text: 'So', start: 13.753, end: 13.992 },
  { text: 'its', start: 14.072, end: 14.232 },
  { text: 'sting', start: 14.312, end: 14.552 },
  { text: 'can', start: 14.632, end: 14.712 },
  { text: 'be', start: 14.792, end: 14.872 },
  { text: 'even', start: 15.072, end: 15.272 },
  { text: 'WORSE', start: 15.325, end: 15.592 },
  { text: 'than', start: 15.672, end: 15.752 },
  { text: 'the', start: 15.805, end: 15.859 },
  { text: 'man', start: 15.912, end: 16.072 },
  { text: 'o\'', start: 16.099, end: 16.152 },
  { text: 'war\'s!', start: 16.232, end: 17.013 },
  { text: 'Not', start: 17.169, end: 17.752 },
  { text: 'bad', start: 17.872, end: 17.992 },
  { text: 'for', start: 18.072, end: 18.152 },
  { text: 'something', start: 18.312, end: 18.472 },
  { text: 'smaller', start: 18.592, end: 18.792 },
  { text: 'than', start: 18.872, end: 18.952 },
  { text: 'your', start: 19.032, end: 19.112 },
  { text: 'thumb.', start: 19.192, end: 19.533 },
  { text: 'So', start: 20.042, end: 20.232 },
  { text: 'yes,', start: 20.312, end: 20.756 },
];
