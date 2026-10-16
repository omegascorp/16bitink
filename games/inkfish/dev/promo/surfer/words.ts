/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), re-voiced 2026-10-16: take 1 of two (generation
 * myrVYF6OMnPb9FmODAPx), its first 0.082 s of silence trimmed, then sped up by
 * TEMPO (pitch kept) with ffmpeg's atempo. WORDS are its words with start and
 * end times in the trimmed take (ElevenLabs Scribe, less the 0.082 s), so
 * divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped, and
 * word edges are fixed from the waveform: Scribe runs words across the tags and
 * pauses, so a word starts where the sound comes back after a pause and the
 * word before ends where the pause begins; the first word starts where the
 * sound does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So next time you paddle out, remember: / to a shark, you look like THIS."
 */
export const TEMPO = 1.1343;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'To', start: 0.02, end: 0.078 },
  { text: 'a', start: 0.158, end: 0.238 },
  { text: 'shark,', start: 0.398, end: 0.888 },
  { text: 'you', start: 1.358, end: 1.598 },
  { text: 'look', start: 1.678, end: 1.838 },
  { text: 'like', start: 1.918, end: 2.238 },
  { text: 'THIS.', start: 2.318, end: 2.758 },
  { text: 'Scientists', start: 3.348, end: 3.708 },
  { text: 'filmed', start: 3.788, end: 4.158 },
  { text: 'surfers', start: 4.238, end: 4.638 },
  { text: 'and', start: 4.678, end: 4.718 },
  { text: 'seals', start: 4.878, end: 5.118 },
  { text: 'from', start: 5.198, end: 5.358 },
  { text: 'below,', start: 5.558, end: 5.908 },
  { text: 'then', start: 6.058, end: 6.318 },
  { text: 'saw', start: 6.398, end: 6.558 },
  { text: 'them', start: 6.638, end: 6.718 },
  { text: 'the', start: 6.758, end: 6.798 },
  { text: 'way', start: 6.878, end: 7.038 },
  { text: 'a', start: 7.118, end: 7.198 },
  { text: 'young', start: 7.318, end: 7.438 },
  { text: 'white', start: 7.518, end: 7.758 },
  { text: 'shark', start: 7.838, end: 8.078 },
  { text: 'does.', start: 8.158, end: 8.378 },
  { text: 'The', start: 8.878, end: 9.038 },
  { text: "shark's", start: 9.078, end: 9.438 },
  { text: 'eyes', start: 9.518, end: 9.758 },
  { text: "couldn't", start: 9.838, end: 10.078 },
  { text: 'tell', start: 10.158, end: 10.238 },
  { text: 'them', start: 10.278, end: 10.318 },
  { text: 'APART.', start: 10.478, end: 10.878 },
  { text: 'It', start: 11.378, end: 11.548 },
  { text: 'may', start: 11.608, end: 11.838 },
  { text: 'be', start: 11.918, end: 11.998 },
  { text: 'why', start: 12.118, end: 12.238 },
  { text: 'sharks', start: 12.278, end: 12.598 },
  { text: 'bite', start: 12.688, end: 12.878 },
  { text: 'people:', start: 12.968, end: 13.378 },
  { text: 'they', start: 13.848, end: 14.078 },
  { text: 'think', start: 14.158, end: 14.238 },
  { text: "you're", start: 14.318, end: 14.398 },
  { text: 'a', start: 14.478, end: 14.638 },
  { text: 'seal.', start: 14.718, end: 15.438 },
  { text: 'So', start: 16.278, end: 16.398 },
  { text: 'next', start: 16.558, end: 16.718 },
  { text: 'time', start: 16.798, end: 16.958 },
  { text: 'you', start: 17.038, end: 17.118 },
  { text: 'paddle', start: 17.225, end: 17.438 },
  { text: 'out,', start: 17.518, end: 17.698 },
  { text: 'remember:', start: 17.868, end: 18.375 },
];
