/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-11-05: generation I0aXtZy4IixLdxvBgDHJ
 * (the only take: the account ran out of credits), 0.07 s of leading silence trimmed.
 * Then sped up by TEMPO (pitch kept) with ffmpeg's atempo, to end about 0.3 s
 * before the 19.5 s loop point. WORDS are its words with start and end times in
 * the trimmed take (ElevenLabs Scribe), so divide by TEMPO for voice.mp3. The
 * first word starts and the last ends where the sound does (silencedetect at -40 dB).
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Caught on camera off Mexico, / " followed by the first line, "these orcas flip whale sharks upside down!".
 */
export const TEMPO = 1.098;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 19.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: "These", start: 0.00, end: 0.23 },
  { text: "orcas", start: 0.39, end: 0.75 },
  { text: "flip", start: 0.93, end: 1.15 },
  { text: "WHALE", start: 1.31, end: 1.53 },
  { text: "SHARKS", start: 1.65, end: 1.95 },
  { text: "upside", start: 2.11, end: 2.51 },
  { text: "down!", start: 2.55, end: 2.99 },
  { text: "The", start: 3.41, end: 3.61 },
  { text: "biggest", start: 3.65, end: 3.97 },
  { text: "fish", start: 4.07, end: 4.23 },
  { text: "on", start: 4.29, end: 4.39 },
  { text: "Earth…", start: 4.57, end: 4.89 },
  { text: "and", start: 5.33, end: 5.43 },
  { text: "this", start: 5.49, end: 5.63 },
  { text: "one's", start: 5.67, end: 5.83 },
  { text: "just", start: 5.89, end: 6.01 },
  { text: "a", start: 6.07, end: 6.17 },
  { text: "KID,", start: 6.25, end: 6.59 },
  { text: "twenty", start: 7.13, end: 7.27 },
  { text: "feet", start: 7.39, end: 7.53 },
  { text: "long!", start: 7.63, end: 8.01 },
  { text: "They", start: 8.43, end: 8.61 },
  { text: "hit", start: 8.67, end: 8.79 },
  { text: "it", start: 8.83, end: 8.91 },
  { text: "at", start: 8.95, end: 9.05 },
  { text: "full", start: 9.25, end: 9.41 },
  { text: "speed,", start: 9.59, end: 9.85 },
  { text: "again", start: 10.17, end: 10.69 },
  { text: "and", start: 10.73, end: 10.81 },
  { text: "again,", start: 10.87, end: 11.31 },
  { text: "until", start: 11.79, end: 12.01 },
  { text: "its", start: 12.05, end: 12.29 },
  { text: "belly", start: 12.33, end: 12.59 },
  { text: "faces", start: 12.75, end: 13.07 },
  { text: "the", start: 13.11, end: 13.21 },
  { text: "sky…", start: 13.27, end: 13.67 },
  { text: "Why?", start: 14.29, end: 14.61 },
  { text: "Scientists", start: 15.17, end: 15.63 },
  { text: "suspect", start: 15.67, end: 16.05 },
  { text: "the", start: 16.09, end: 16.19 },
  { text: "liver.", start: 16.25, end: 16.53 },
  { text: "But", start: 17.17, end: 17.29 },
  { text: "it", start: 17.35, end: 17.49 },
  { text: "sinks", start: 17.57, end: 17.81 },
  { text: "before", start: 17.85, end: 18.11 },
  { text: "anyone", start: 18.17, end: 18.41 },
  { text: "can", start: 18.49, end: 18.61 },
  { text: "check!", start: 18.67, end: 18.99 },
  { text: "Caught", start: 19.45, end: 19.63 },
  { text: "on", start: 19.69, end: 19.83 },
  { text: "camera", start: 19.89, end: 20.21 },
  { text: "off", start: 20.27, end: 20.45 },
  { text: "Mexico,", start: 20.49, end: 21.08 },
];
