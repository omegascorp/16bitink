/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), re-voiced 2026-10-16: take 2 of two (generation
 * wzwZMgXnMbwLwCy2ecOe), its first 0.108 s of silence trimmed, then sped up by
 * TEMPO (pitch kept) with ffmpeg's atempo. WORDS are its words with start and
 * end times in the trimmed take (ElevenLabs Scribe, less the 0.108 s), so
 * divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped, and
 * word edges are fixed from the waveform: Scribe runs words across the tags and
 * pauses, so a word starts where the sound comes back after a pause and the
 * word before ends where the pause begins; the first word starts where the
 * sound does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So don't let anyone tell you fish are dumb. Some… / fish can POINT."
 */
export const TEMPO = 1.1118;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'Fish', start: 0.02, end: 0.292 },
  { text: 'can', start: 0.372, end: 0.532 },
  { text: 'POINT.', start: 0.612, end: 1.152 },
  { text: 'When', start: 1.602, end: 1.732 },
  { text: 'prey', start: 1.812, end: 2.052 },
  { text: 'hides', start: 2.132, end: 2.372 },
  { text: 'in', start: 2.412, end: 2.452 },
  { text: 'the', start: 2.492, end: 2.532 },
  { text: 'coral,', start: 2.612, end: 3.052 },
  { text: 'a', start: 3.292, end: 3.492 },
  { text: 'grouper', start: 3.532, end: 3.892 },
  { text: 'swims', start: 3.972, end: 4.212 },
  { text: 'up', start: 4.292, end: 4.372 },
  { text: 'to', start: 4.412, end: 4.452 },
  { text: 'a', start: 4.532, end: 4.612 },
  { text: 'moray', start: 4.732, end: 5.012 },
  { text: 'eel', start: 5.092, end: 5.332 },
  { text: 'and', start: 5.452, end: 5.572 },
  { text: 'shakes', start: 5.612, end: 5.812 },
  { text: 'its', start: 5.892, end: 6.052 },
  { text: 'head:', start: 6.172, end: 6.342 },
  { text: "let's", start: 6.712, end: 7.172 },
  { text: 'hunt.', start: 7.222, end: 7.582 },
  { text: 'Then', start: 7.962, end: 8.132 },
  { text: 'it', start: 8.172, end: 8.212 },
  { text: 'does', start: 8.292, end: 8.372 },
  { text: 'a', start: 8.452, end: 8.612 },
  { text: 'HEADSTAND', start: 8.732, end: 9.172 },
  { text: 'over', start: 9.252, end: 9.332 },
  { text: 'the', start: 9.412, end: 9.492 },
  { text: 'hiding', start: 9.599, end: 9.812 },
  { text: 'spot,', start: 9.972, end: 10.162 },
  { text: 'pointing,', start: 10.392, end: 10.882 },
  { text: 'like', start: 11.032, end: 11.172 },
  { text: 'a', start: 11.199, end: 11.225 },
  { text: 'hunting', start: 11.252, end: 11.572 },
  { text: 'dog.', start: 11.652, end: 11.952 },
  { text: 'The', start: 12.372, end: 12.452 },
  { text: 'eel', start: 12.532, end: 12.772 },
  { text: 'slides', start: 12.932, end: 13.332 },
  { text: 'into', start: 13.412, end: 13.492 },
  { text: 'the', start: 13.572, end: 13.652 },
  { text: 'crack,', start: 13.732, end: 14.092 },
  { text: 'and', start: 14.542, end: 14.772 },
  { text: 'one', start: 14.852, end: 14.932 },
  { text: 'of', start: 15.012, end: 15.092 },
  { text: 'them', start: 15.172, end: 15.332 },
  { text: 'gets', start: 15.492, end: 15.732 },
  { text: 'lunch.', start: 15.892, end: 16.332 },
  { text: 'So', start: 16.772, end: 16.852 },
  { text: "don't", start: 16.932, end: 17.012 },
  { text: 'let', start: 17.092, end: 17.252 },
  { text: 'anyone', start: 17.332, end: 17.732 },
  { text: 'tell', start: 17.812, end: 17.892 },
  { text: 'you', start: 17.972, end: 18.132 },
  { text: 'fish', start: 18.212, end: 18.292 },
  { text: 'are', start: 18.372, end: 18.532 },
  { text: 'dumb.', start: 18.612, end: 18.922 },
  { text: 'Some\u2026', start: 19.322, end: 19.679 },
];
