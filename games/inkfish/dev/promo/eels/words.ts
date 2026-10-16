/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), re-voiced 2026-10-16: take 1 of two (generation
 * KoJsYVLZvYHdTRRvBBRO), its first 0.083 s of silence trimmed, then sped up by
 * TEMPO (pitch kept) with ffmpeg's atempo. WORDS are its words with start and
 * end times in the trimmed take (ElevenLabs Scribe, less the 0.083 s), so
 * divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped, and
 * word edges are fixed from the waveform: Scribe runs words across the tags and
 * pauses, so a word starts where the sound comes back after a pause and the
 * word before ends where the pause begins ("for a male", which Scribe put in
 * the pause after it, is placed by hand); the first word starts where the sound
 * does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…A hundred and fifty years later, still… / nobody has EVER seen eels mate in the wild."
 */
export const TEMPO = 1.2031;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'Nobody', start: 0.02, end: 0.317 },
  { text: 'has', start: 0.397, end: 0.587 },
  { text: 'EVER', start: 0.757, end: 1.117 },
  { text: 'seen', start: 1.237, end: 1.357 },
  { text: 'eels', start: 1.437, end: 1.757 },
  { text: 'mate', start: 1.837, end: 1.997 },
  { text: 'in', start: 2.037, end: 2.077 },
  { text: 'the', start: 2.157, end: 2.237 },
  { text: 'wild.', start: 2.317, end: 2.767 },
  { text: 'Sigmund', start: 3.197, end: 3.677 },
  { text: 'Freud', start: 3.757, end: 4.077 },
  { text: 'tried', start: 4.117, end: 4.317 },
  { text: 'to', start: 4.397, end: 4.457 },
  { text: 'solve', start: 4.517, end: 4.717 },
  { text: 'it.', start: 4.797, end: 5.277 },
  { text: 'In', start: 5.357, end: 5.437 },
  { text: '1876,', start: 5.517, end: 6.627 },
  { text: 'he', start: 6.717, end: 6.877 },
  { text: 'cut', start: 6.957, end: 7.037 },
  { text: 'open', start: 7.157, end: 7.277 },
  { text: 'about', start: 7.357, end: 7.567 },
  { text: 'FOUR', start: 7.817, end: 8.157 },
  { text: 'HUNDRED', start: 8.237, end: 8.717 },
  { text: 'eels,', start: 8.797, end: 9.217 },
  { text: 'looking', start: 9.327, end: 9.677 },
  { text: 'for', start: 9.717, end: 9.837 },
  { text: 'a', start: 9.857, end: 9.937 },
  { text: 'male.', start: 9.957, end: 10.287 },
  { text: 'Every', start: 10.717, end: 11.037 },
  { text: 'single', start: 11.237, end: 11.437 },
  { text: 'one', start: 11.517, end: 11.677 },
  { text: 'was', start: 11.757, end: 11.997 },
  { text: 'female.', start: 12.037, end: 12.517 },
  { text: 'Eels', start: 12.967, end: 13.277 },
  { text: 'swim', start: 13.357, end: 13.627 },
  { text: 'thousands', start: 13.757, end: 14.237 },
  { text: 'of', start: 14.277, end: 14.317 },
  { text: 'kilometres', start: 14.397, end: 14.877 },
  { text: 'to', start: 14.957, end: 15.037 },
  { text: 'the', start: 15.077, end: 15.117 },
  { text: 'Sargasso', start: 15.197, end: 15.757 },
  { text: 'Sea', start: 15.837, end: 15.997 },
  { text: 'to', start: 16.077, end: 16.157 },
  { text: 'breed\u2026', start: 16.237, end: 16.537 },
  { text: 'and', start: 17.037, end: 17.197 },
  { text: 'there,', start: 17.357, end: 17.567 },
  { text: 'they', start: 17.947, end: 18.157 },
  { text: 'vanish.', start: 18.277, end: 18.707 },
  { text: 'A', start: 19.157, end: 19.277 },
  { text: 'hundred', start: 19.357, end: 19.517 },
  { text: 'and', start: 19.597, end: 19.757 },
  { text: 'fifty', start: 19.837, end: 19.997 },
  { text: 'years', start: 20.077, end: 20.237 },
  { text: 'later,', start: 20.317, end: 20.667 },
  { text: 'still\u2026', start: 20.817, end: 21.295 },
];
