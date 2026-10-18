/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-18: generation MBiDF2x9KE4ELkshwhvu, its first
 * 0.000 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 15 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe,
 * less the 0.000 s), so divide by TEMPO for voice.mp3. Scribe's echoed audio
 * tags are dropped, and word edges are fixed from the waveform (silencedetect
 * at -40 dB): a word after a pause starts where the sound comes back, the word
 * before ends where the pause begins; the first word starts where the sound
 * does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So remember: / this shark can jump INTO your boat!"
 */
export const TEMPO = 1.1311;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.0, end: 0.24 },
  { text: 'shark', start: 0.32, end: 0.56 },
  { text: 'can', start: 0.64, end: 0.8 },
  { text: 'jump', start: 0.88, end: 1.04 },
  { text: 'INTO', start: 1.12, end: 1.28 },
  { text: 'your', start: 1.4, end: 1.52 },
  { text: 'boat!', start: 1.72, end: 1.965 },
  { text: 'The', start: 2.448, end: 2.56 },
  { text: 'shortfin', start: 2.68, end: 2.96 },
  { text: 'mako', start: 3.04, end: 3.36 },
  { text: 'is', start: 3.44, end: 3.52 },
  { text: 'the', start: 3.64, end: 3.76 },
  { text: 'fastest', start: 3.84, end: 4.32 },
  { text: 'shark', start: 4.36, end: 4.48 },
  { text: 'in', start: 4.56, end: 4.64 },
  { text: 'the', start: 4.72, end: 4.8 },
  { text: 'sea,', start: 4.92, end: 5.083 },
  { text: 'and', start: 5.229, end: 5.44 },
  { text: 'it', start: 5.52, end: 5.6 },
  { text: 'can', start: 5.68, end: 5.76 },
  { text: 'leap', start: 5.84, end: 6.0 },
  { text: 'up', start: 6.08, end: 6.16 },
  { text: 'to', start: 6.24, end: 6.48 },
  { text: 'SIX', start: 6.56, end: 6.88 },
  { text: 'metres', start: 7.04, end: 7.52 },
  { text: 'out', start: 7.56, end: 7.6 },
  { text: 'of', start: 7.64, end: 7.68 },
  { text: 'the', start: 7.76, end: 7.84 },
  { text: 'water.', start: 8.04, end: 8.259 },
  { text: 'In', start: 8.738, end: 8.96 },
  { text: 'twenty', start: 9.08, end: 9.2 },
  { text: 'thirteen,', start: 9.28, end: 9.88 },
  { text: 'off', start: 9.92, end: 10.08 },
  { text: 'New', start: 10.16, end: 10.32 },
  { text: 'Jersey,', start: 10.44, end: 10.96 },
  { text: 'anglers', start: 11.08, end: 11.44 },
  { text: 'hooked', start: 11.52, end: 11.76 },
  { text: 'one…', start: 11.84, end: 12.24 },
  { text: 'and', start: 12.31, end: 12.32 },
  { text: 'it', start: 12.4, end: 12.48 },
  { text: 'landed', start: 12.56, end: 12.96 },
  { text: 'right', start: 13.04, end: 13.12 },
  { text: 'on', start: 13.2, end: 13.28 },
  { text: 'their', start: 13.4, end: 13.52 },
  { text: 'boat!', start: 13.68, end: 13.898 },
  { text: 'Great', start: 14.244, end: 14.72 },
  { text: 'fishing', start: 14.8, end: 15.12 },
  { text: 'trip.', start: 15.24, end: 15.411 },
  { text: 'So', start: 15.873, end: 16.0 },
  { text: 'remember:', start: 16.08, end: 16.628 },
];
