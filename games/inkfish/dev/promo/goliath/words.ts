/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-18: generation ki5u79pkLkuf7LILmkYp, its first
 * 0.113 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 19.5 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe,
 * less the 0.113 s), so divide by TEMPO for voice.mp3. Scribe's echoed audio
 * tags are dropped, and word edges are fixed from the waveform (silencedetect
 * at -40 dB): a word after a pause starts where the sound comes back, the word
 * before ends where the pause begins; the first word starts where the sound
 * does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So yes, / this fish swallowed a SHARK… in ONE bite!"
 */
export const TEMPO = 1.102;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.0, end: 0.207 },
  { text: 'fish', start: 0.287, end: 0.527 },
  { text: 'swallowed', start: 0.607, end: 0.927 },
  { text: 'a', start: 1.007, end: 1.167 },
  { text: 'SHARK…', start: 1.247, end: 1.702 },
  { text: 'in', start: 1.921, end: 2.207 },
  { text: 'ONE', start: 2.287, end: 2.447 },
  { text: 'bite!', start: 2.607, end: 3.068 },
  { text: 'Florida,', start: 3.599, end: 4.108 },
  { text: 'twenty', start: 4.306, end: 4.527 },
  { text: 'fourteen.', start: 4.607, end: 5.121 },
  { text: 'A', start: 5.651, end: 5.727 },
  { text: 'fisherman', start: 5.807, end: 6.127 },
  { text: 'is', start: 6.207, end: 6.367 },
  { text: 'reeling', start: 6.407, end: 6.687 },
  { text: 'in', start: 6.727, end: 6.767 },
  { text: 'a', start: 6.927, end: 6.967 },
  { text: 'four-foot', start: 7.007, end: 7.487 },
  { text: 'blacktip', start: 7.567, end: 8.047 },
  { text: 'shark…', start: 8.127, end: 8.509 },
  { text: 'when', start: 8.933, end: 9.007 },
  { text: 'something', start: 9.167, end: 9.567 },
  { text: 'HUGE', start: 9.807, end: 10.287 },
  { text: 'rises', start: 10.367, end: 10.687 },
  { text: 'from', start: 10.767, end: 10.847 },
  { text: 'below.', start: 10.927, end: 11.346 },
  { text: 'A', start: 11.751, end: 11.807 },
  { text: 'goliath', start: 11.887, end: 12.367 },
  { text: 'grouper,', start: 12.447, end: 12.986 },
  { text: 'as', start: 13.127, end: 13.247 },
  { text: 'big', start: 13.407, end: 13.487 },
  { text: 'as', start: 13.567, end: 13.647 },
  { text: 'a', start: 13.687, end: 13.727 },
  { text: 'door!', start: 13.887, end: 14.321 },
  { text: 'It', start: 14.69, end: 14.927 },
  { text: 'opens', start: 15.007, end: 15.247 },
  { text: 'its', start: 15.327, end: 15.487 },
  { text: 'mouth', start: 15.567, end: 15.807 },
  { text: 'and…', start: 15.887, end: 16.168 },
  { text: 'GULP!', start: 16.462, end: 17.606 },
  { text: 'There\'s', start: 17.773, end: 18.367 },
  { text: 'always', start: 18.527, end: 18.847 },
  { text: 'a', start: 18.927, end: 19.007 },
  { text: 'bigger', start: 19.087, end: 19.327 },
  { text: 'fish.', start: 19.407, end: 19.795 },
  { text: 'So', start: 20.177, end: 20.447 },
  { text: 'yes,', start: 20.607, end: 21.159 },
];
