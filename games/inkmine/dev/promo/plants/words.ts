/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-18: generation ajfXZ8MazHibDhQVSP2f, its first
 * 0.102 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 22.5 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe,
 * less the 0.102 s), so divide by TEMPO for voice.mp3. Scribe's echoed audio
 * tags are dropped, and word edges are fixed from the waveform (silencedetect
 * at -40 dB): a word after a pause starts where the sound comes back, the word
 * before ends where the pause begins; the first word starts where the sound
 * does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Out there, under a red sun… / around most stars in our galaxy, plants could be… BLACK."
 */
export const TEMPO = 1.0796;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'Around', start: 0.0, end: 0.218 },
  { text: 'most', start: 0.378, end: 0.618 },
  { text: 'stars', start: 0.778, end: 0.938 },
  { text: 'in', start: 0.978, end: 1.018 },
  { text: 'our', start: 1.098, end: 1.178 },
  { text: 'galaxy,', start: 1.258, end: 1.903 },
  { text: 'plants', start: 2.15, end: 2.458 },
  { text: 'could', start: 2.538, end: 2.698 },
  { text: 'be…', start: 2.818, end: 3.037 },
  { text: 'BLACK.', start: 3.489, end: 4.024 },
  { text: 'Most', start: 4.567, end: 4.858 },
  { text: 'stars', start: 4.938, end: 5.338 },
  { text: 'are', start: 5.418, end: 5.578 },
  { text: 'red', start: 5.658, end: 5.818 },
  { text: 'dwarfs,', start: 5.898, end: 6.487 },
  { text: 'dim', start: 6.664, end: 7.178 },
  { text: 'and', start: 7.258, end: 7.418 },
  { text: 'red.', start: 7.498, end: 7.874 },
  { text: 'A', start: 8.466, end: 8.538 },
  { text: 'plant', start: 8.618, end: 8.858 },
  { text: 'there', start: 8.938, end: 9.098 },
  { text: 'would', start: 9.218, end: 9.338 },
  { text: 'soak', start: 9.378, end: 9.578 },
  { text: 'up', start: 9.738, end: 9.742 },
  { text: 'EVERY', start: 9.903, end: 10.298 },
  { text: 'colour', start: 10.378, end: 10.618 },
  { text: 'of', start: 10.698, end: 10.778 },
  { text: 'light', start: 10.858, end: 10.938 },
  { text: 'it', start: 11.018, end: 11.098 },
  { text: 'gets…', start: 11.178, end: 11.619 },
  { text: 'and', start: 11.996, end: 12.138 },
  { text: 'look', start: 12.258, end: 12.32 },
  { text: 'pitch', start: 12.445, end: 12.698 },
  { text: 'black.', start: 12.778, end: 13.18 },
  { text: 'NASA', start: 13.667, end: 14.058 },
  { text: 'scientists', start: 14.138, end: 14.618 },
  { text: 'worked', start: 14.698, end: 14.858 },
  { text: 'this', start: 14.938, end: 15.018 },
  { text: 'out!', start: 15.098, end: 15.401 },
  { text: 'Our', start: 15.811, end: 15.978 },
  { text: 'plants?', start: 16.058, end: 16.465 },
  { text: 'They', start: 16.712, end: 16.938 },
  { text: 'bounce', start: 17.058, end: 17.178 },
  { text: 'green', start: 17.258, end: 17.498 },
  { text: 'light', start: 17.578, end: 17.818 },
  { text: 'straight', start: 17.898, end: 18.298 },
  { text: 'back.', start: 18.458, end: 18.615 },
  { text: 'Honestly,', start: 18.993, end: 19.607 },
  { text: 'Earth\'s', start: 19.75, end: 19.978 },
  { text: 'plants', start: 20.058, end: 20.298 },
  { text: 'are', start: 20.378, end: 20.458 },
  { text: 'doing', start: 20.578, end: 20.698 },
  { text: 'it', start: 20.818, end: 20.938 },
  { text: 'WRONG.', start: 21.018, end: 21.374 },
  { text: 'Out', start: 21.856, end: 22.058 },
  { text: 'there,', start: 22.138, end: 22.448 },
  { text: 'under', start: 22.875, end: 23.098 },
  { text: 'a', start: 23.178, end: 23.258 },
  { text: 'red', start: 23.338, end: 23.578 },
  { text: 'sun…', start: 23.658, end: 23.968 },
];
