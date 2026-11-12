/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), generation 2fHyYHYtr68GvP8Ze1b5
 * (voice-take.mp3, 21.44 s), its first 0.06 s of silence trimmed, then sped up
 * by TEMPO (pitch kept) with ffmpeg's atempo so its last word ends about 0.3 s
 * before the 19.5 s loop point. WORDS are its words with start and end times
 * in the trimmed take (ElevenLabs Scribe, one run, no tags echoed), so divide
 * by TEMPO for voice.mp3. Spelling, capitals and punctuation follow the script;
 * the first word's start and the last word's end are set from the waveform
 * (silencedetect at -40 dB), where Scribe stretched them.
 *
 * The script ends mid-sentence, and the loop's first line finishes it:
 * "…So the only witness is / This whale eats GIANT squid…"
 */
export const TEMPO = 1.107;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 19.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.0, end: 0.34 },
  { text: 'whale', start: 0.4, end: 0.64 },
  { text: 'eats', start: 0.72, end: 0.9 },
  { text: 'GIANT', start: 1.16, end: 1.56 },
  { text: 'squid…', start: 1.72, end: 2.14 },
  { text: 'without', start: 2.52, end: 2.9 },
  { text: 'chewing!', start: 3.0, end: 3.46 },
  { text: 'It', start: 3.92, end: 4.04 },
  { text: 'dives', start: 4.1, end: 4.34 },
  { text: 'a', start: 4.4, end: 4.42 },
  { text: 'thousand', start: 4.64, end: 5.06 },
  { text: 'feet', start: 5.24, end: 5.42 },
  { text: 'into', start: 5.48, end: 5.64 },
  { text: 'the', start: 5.68, end: 5.8 },
  { text: 'dark,', start: 5.84, end: 6.14 },
  { text: 'where', start: 6.58, end: 6.78 },
  { text: 'squid', start: 6.84, end: 7.1 },
  { text: 'as', start: 7.14, end: 7.24 },
  { text: 'long', start: 7.28, end: 7.44 },
  { text: 'as', start: 7.48, end: 7.56 },
  { text: 'a', start: 7.6, end: 7.64 },
  { text: 'BUS', start: 7.88, end: 8.16 },
  { text: 'are', start: 8.22, end: 8.36 },
  { text: 'waiting.', start: 8.4, end: 8.76 },
  { text: 'Teeth?', start: 9.52, end: 9.82 },
  { text: 'Only', start: 10.28, end: 10.46 },
  { text: 'on', start: 10.48, end: 10.56 },
  { text: 'the', start: 10.58, end: 10.62 },
  { text: 'bottom', start: 10.7, end: 10.94 },
  { text: 'jaw.', start: 11.04, end: 11.26 },
  { text: 'It', start: 11.62, end: 11.7 },
  { text: 'just…', start: 11.76, end: 11.9 },
  { text: 'swallows.', start: 12.38, end: 12.94 },
  { text: 'But', start: 13.4, end: 13.5 },
  { text: 'the', start: 13.52, end: 13.64 },
  { text: 'squid', start: 13.7, end: 14.0 },
  { text: 'fight', start: 14.12, end: 14.36 },
  { text: 'back:', start: 14.4, end: 14.7 },
  { text: 'whales', start: 15.16, end: 15.44 },
  { text: 'come', start: 15.48, end: 15.6 },
  { text: 'up', start: 15.64, end: 15.76 },
  { text: 'covered', start: 15.82, end: 16.12 },
  { text: 'in', start: 16.14, end: 16.219 },
  { text: 'sucker', start: 16.42, end: 16.68 },
  { text: 'SCARS!', start: 16.78, end: 17.22 },
  { text: 'And', start: 17.7, end: 17.84 },
  { text: 'nobody', start: 17.98, end: 18.38 },
  { text: 'has', start: 18.42, end: 18.74 },
  { text: 'ever', start: 18.82, end: 19.08 },
  { text: 'filmed', start: 19.12, end: 19.36 },
  { text: 'it.', start: 19.42, end: 19.52 },
  { text: 'So', start: 19.92, end: 20.0 },
  { text: 'the', start: 20.04, end: 20.18 },
  { text: 'only', start: 20.24, end: 20.48 },
  { text: 'witness', start: 20.52, end: 20.88 },
  { text: 'is', start: 20.96, end: 21.25 },
];
