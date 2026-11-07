/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (voice-take.mp3, 18.24 s, last word ending at 17.92 s), sped up by TEMPO
 * (pitch kept) with ffmpeg's atempo so its last word ends 0.3 s before the
 * 16.5 s loop point. WORDS are its words with start and end times in the
 * take (ElevenLabs Scribe, one run; no tags were echoed), so divide by TEMPO
 * for voice.mp3. Spelling and capitals follow the script ("23-foot" as
 * Scribe wrote "twenty-three-foot"). Word edges at pauses are fixed from the
 * waveform (silencedetect at -40 dB); starts after a breath keep Scribe's.
 *
 * The script ends mid-sentence, and the loop's first line finishes it:
 * "…Still… you have to admit, / this python swallowed a whole BEAR!"
 */
export const TEMPO = 1.10605;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.06, end: 0.25 },
  { text: 'python', start: 0.343, end: 0.82 },
  { text: 'swallowed', start: 0.94, end: 1.28 },
  { text: 'a', start: 1.34, end: 1.4 },
  { text: 'whole', start: 1.48, end: 1.818 },
  { text: 'BEAR!', start: 1.93, end: 2.46 },
  { text: 'Scientists', start: 2.83, end: 3.4 },
  { text: 'were', start: 3.42, end: 3.6 },
  { text: 'following', start: 3.64, end: 3.94 },
  { text: 'a', start: 4.0, end: 4.08 },
  { text: 'sun', start: 4.18, end: 4.4 },
  { text: "bear's", start: 4.42, end: 4.74 },
  { text: 'radio', start: 4.78, end: 5.08 },
  { text: 'collar…', start: 5.18, end: 5.556 },
  { text: 'then', start: 5.872, end: 6.1 },
  { text: 'the', start: 6.14, end: 6.26 },
  { text: 'signal', start: 6.34, end: 6.58 },
  { text: 'came', start: 6.7, end: 6.88 },
  { text: 'from', start: 6.9, end: 7.064 },
  { text: 'INSIDE', start: 7.22, end: 7.9 },
  { text: 'a', start: 7.96, end: 8.02 },
  { text: '23-foot', start: 8.28, end: 8.92 },
  { text: 'snake!', start: 9.06, end: 9.482 },
  { text: 'They', start: 10.06, end: 10.2 },
  { text: 'waited', start: 10.3, end: 10.56 },
  { text: 'for', start: 10.58, end: 10.66 },
  { text: 'the', start: 10.7, end: 10.78 },
  { text: 'collar', start: 10.82, end: 11.06 },
  { text: 'to', start: 11.1, end: 11.18 },
  { text: 'come', start: 11.22, end: 11.38 },
  { text: 'out.', start: 11.46, end: 11.585 },
  { text: 'It', start: 12.04, end: 12.26 },
  { text: "didn't.", start: 12.3, end: 12.648 },
  { text: 'So', start: 12.986, end: 13.2 },
  { text: 'they', start: 13.22, end: 13.329 },
  { text: 'OPERATED…', start: 13.466, end: 14.113 },
  { text: 'and', start: 14.416, end: 14.52 },
  { text: 'set', start: 14.7, end: 14.825 },
  { text: 'the', start: 14.905, end: 15.02 },
  { text: 'snake', start: 15.1, end: 15.36 },
  { text: 'FREE.', start: 15.52, end: 15.836 },
  { text: 'Still…', start: 16.4, end: 16.771 },
  { text: 'you', start: 17.072, end: 17.18 },
  { text: 'have', start: 17.22, end: 17.38 },
  { text: 'to', start: 17.42, end: 17.5 },
  { text: 'admit,', start: 17.54, end: 17.918 },
];

/** How many words each caption line holds, in order (the first two are the hook, on screen together). */
export const LINE_WORDS: readonly number[] = [3, 3, 3, 3, 2, 3, 3, 3, 2, 3, 3, 2, 3, 2, 3, 1, 4];

/** Word i's start and end in the video, seconds. */
export const startOf = (i: number): number => WORDS[i]!.start / TEMPO;
export const endOf = (i: number): number => WORDS[i]!.end / TEMPO;
