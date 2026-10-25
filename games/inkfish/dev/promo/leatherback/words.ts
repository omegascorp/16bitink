/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-25: generation uPUsIyGn6k1nfcF226Xo, its first
 * 0 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 18 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe),
 * so divide by TEMPO for voice.mp3. Scribe's echoed audio tags are dropped,
 * and word edges are fixed from the waveform (silencedetect at -40 dB): a word
 * after a pause starts where the sound comes back, the word before ends where
 * the pause begins; the first word starts where the sound does, and the last
 * ends where it fades out. Fixed by ear (2026-10-25): "This" starts at 0.32 s
 * (the sound before it is a breath), and "Once" 0.4 s later than Scribe put it
 * (the chuckle runs into it).
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Cute shell, though. But / this turtle's mouth is a NIGHTMARE."
 */
export const TEMPO = 1.123;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 18;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.320, end: 0.560 },
  { text: 'turtle\'s', start: 0.620, end: 1.020 },
  { text: 'mouth', start: 1.100, end: 1.340 },
  { text: 'is', start: 1.380, end: 1.480 },
  { text: 'a', start: 1.540, end: 1.580 },
  { text: 'NIGHTMARE.', start: 1.780, end: 2.387 },
  { text: 'Its', start: 2.923, end: 3.180 },
  { text: 'throat', start: 3.220, end: 3.480 },
  { text: 'is', start: 3.520, end: 3.640 },
  { text: 'lined', start: 3.680, end: 3.880 },
  { text: 'with', start: 3.920, end: 4.000 },
  { text: 'spikes…', start: 4.240, end: 4.770 },
  { text: 'and', start: 5.000, end: 5.120 },
  { text: 'they', start: 5.160, end: 5.273 },
  { text: 'ALL', start: 5.398, end: 5.720 },
  { text: 'point', start: 5.760, end: 6.100 },
  { text: 'down!', start: 6.160, end: 6.698 },
  { text: 'Once', start: 7.322, end: 7.500 },
  { text: 'a', start: 7.560, end: 7.620 },
  { text: 'jellyfish', start: 7.660, end: 8.080 },
  { text: 'goes', start: 8.160, end: 8.380 },
  { text: 'in,', start: 8.460, end: 8.580 },
  { text: 'it\'s', start: 9.020, end: 9.240 },
  { text: 'not', start: 9.320, end: 9.520 },
  { text: 'coming', start: 9.580, end: 9.820 },
  { text: 'out.', start: 9.900, end: 10.046 },
  { text: 'It\'s', start: 10.492, end: 10.660 },
  { text: 'the', start: 10.700, end: 10.920 },
  { text: 'biggest', start: 10.960, end: 11.280 },
  { text: 'turtle', start: 11.320, end: 11.600 },
  { text: 'alive,', start: 11.660, end: 12.192 },
  { text: 'up', start: 12.332, end: 12.540 },
  { text: 'to', start: 12.560, end: 12.640 },
  { text: 'a', start: 12.840, end: 12.884 },
  { text: 'thousand', start: 12.884, end: 13.240 },
  { text: 'pounds…', start: 13.360, end: 13.860 },
  { text: 'and', start: 14.140, end: 14.340 },
  { text: 'it', start: 14.380, end: 14.480 },
  { text: 'eats', start: 14.520, end: 14.680 },
  { text: 'around', start: 14.740, end: 15.040 },
  { text: 'two', start: 15.240, end: 15.396 },
  { text: 'hundred', start: 15.396, end: 15.760 },
  { text: 'sixty', start: 15.760, end: 16.020 },
  { text: 'jellyfish', start: 16.079, end: 16.580 },
  { text: 'a', start: 16.640, end: 16.660 },
  { text: 'DAY!', start: 16.860, end: 17.233 },
  { text: 'Cute', start: 17.870, end: 18.100 },
  { text: 'shell,', start: 18.160, end: 18.360 },
  { text: 'though.', start: 18.420, end: 18.674 },
  { text: 'But', start: 19.155, end: 19.871 },
];
