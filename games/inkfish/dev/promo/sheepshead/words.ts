/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-25: generation a0J0W13N5x4cLMWbeTHg, its first
 * 0.15 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 19.5 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe),
 * so divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped,
 * and word edges are fixed from the waveform (silencedetect at -40 dB): a word
 * after a pause starts where the sound comes back, the word before ends where
 * the pause begins; the first word starts where the sound does, and the last
 * ends where it fades out. "Its" starts 0.63 s after Scribe's time: the
 * [chuckles] runs into it, and Scribe started the word at the chuckle.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Still… no kisses. Because / this fish has HUMAN teeth."
 */
export const TEMPO = 1.090;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 19.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.000, end: 0.400 },
  { text: 'fish', start: 0.540, end: 0.780 },
  { text: 'has', start: 0.820, end: 1.160 },
  { text: 'HUMAN', start: 1.340, end: 1.660 },
  { text: 'teeth.', start: 1.780, end: 2.125 },
  { text: 'Front', start: 2.667, end: 2.960 },
  { text: 'teeth', start: 3.000, end: 3.180 },
  { text: 'like', start: 3.220, end: 3.380 },
  { text: 'ours…', start: 3.480, end: 3.906 },
  { text: 'and', start: 4.111, end: 4.240 },
  { text: 'rows', start: 4.380, end: 4.620 },
  { text: 'of', start: 4.660, end: 4.780 },
  { text: 'molars', start: 4.880, end: 5.240 },
  { text: 'behind', start: 5.260, end: 5.640 },
  { text: 'them!', start: 5.680, end: 5.885 },
  { text: 'It\'s', start: 6.368, end: 6.500 },
  { text: 'a', start: 6.540, end: 6.620 },
  { text: 'sheepshead,', start: 6.700, end: 7.279 },
  { text: 'and', start: 7.443, end: 7.580 },
  { text: 'it', start: 7.600, end: 7.680 },
  { text: 'crunches', start: 7.740, end: 8.080 },
  { text: 'crabs,', start: 8.160, end: 8.680 },
  { text: 'oysters,', start: 8.880, end: 9.347 },
  { text: 'even', start: 9.482, end: 9.900 },
  { text: 'barnacles', start: 9.940, end: 10.400 },
  { text: 'right', start: 10.600, end: 10.740 },
  { text: 'off', start: 10.800, end: 10.920 },
  { text: 'the', start: 10.960, end: 11.060 },
  { text: 'pier!', start: 11.080, end: 11.409 },
  { text: 'Its', start: 12.422, end: 12.560 },
  { text: 'stripes', start: 12.640, end: 12.960 },
  { text: 'earned', start: 13.040, end: 13.160 },
  { text: 'it', start: 13.180, end: 13.240 },
  { text: 'a', start: 13.300, end: 13.340 },
  { text: 'nickname:', start: 13.400, end: 13.851 },
  { text: 'the', start: 14.098, end: 14.240 },
  { text: 'convict', start: 14.300, end: 14.760 },
  { text: 'fish.', start: 14.840, end: 15.158 },
  { text: 'Honestly?', start: 15.615, end: 16.201 },
  { text: 'Better', start: 16.446, end: 16.720 },
  { text: 'teeth', start: 16.760, end: 16.920 },
  { text: 'than', start: 16.940, end: 17.060 },
  { text: 'most', start: 17.080, end: 17.300 },
  { text: 'people.', start: 17.340, end: 17.710 },
  { text: 'Still…', start: 18.239, end: 18.708 },
  { text: 'no', start: 19.147, end: 19.340 },
  { text: 'kisses.', start: 19.380, end: 19.856 },
  { text: 'Because', start: 20.426, end: 20.924 },
];
