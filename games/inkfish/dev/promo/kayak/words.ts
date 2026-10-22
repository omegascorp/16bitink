/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-22: generation dczVwF3TadV0EodiWsCS, its first
 * 0 s of silence trimmed, then sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo, to end about 0.3 s before the 18 s loop point. WORDS are
 * its words with start and end times in the trimmed take (ElevenLabs Scribe),
 * so divide by TEMPO for voice.mp3. The first word starts where the sound
 * does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…His dad filmed the whole thing. So yes, / this whale swallowed a KAYAKER!"
 */
export const TEMPO = 1.096;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 18;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.000, end: 0.280 },
  { text: 'whale', start: 0.440, end: 0.700 },
  { text: 'swallowed', start: 0.840, end: 1.160 },
  { text: 'a', start: 1.200, end: 1.280 },
  { text: 'KAYAKER!', start: 1.340, end: 2.060 },
  { text: 'In', start: 2.680, end: 2.820 },
  { text: 'Chile,', start: 2.900, end: 3.260 },
  { text: 'Adrián', start: 3.740, end: 4.120 },
  { text: 'was', start: 4.160, end: 4.320 },
  { text: 'paddling', start: 4.360, end: 4.720 },
  { text: 'next', start: 4.760, end: 4.920 },
  { text: 'to', start: 4.960, end: 5.040 },
  { text: 'his', start: 5.060, end: 5.220 },
  { text: 'dad…', start: 5.280, end: 5.600 },
  { text: 'then', start: 6.180, end: 6.420 },
  { text: 'everything', start: 6.500, end: 6.900 },
  { text: 'went', start: 6.940, end: 7.260 },
  { text: 'DARK.', start: 7.300, end: 7.680 },
  { text: 'Kayak', start: 8.260, end: 8.660 },
  { text: 'and', start: 8.700, end: 8.780 },
  { text: 'all.', start: 8.860, end: 9.120 },
  { text: 'Good', start: 9.780, end: 9.940 },
  { text: 'news?', start: 9.980, end: 10.300 },
  { text: 'A', start: 10.700, end: 10.740 },
  { text: 'humpback\'s', start: 10.780, end: 11.260 },
  { text: 'throat', start: 11.280, end: 11.540 },
  { text: 'is', start: 11.580, end: 11.760 },
  { text: 'too', start: 11.840, end: 12.060 },
  { text: 'narrow', start: 12.120, end: 12.460 },
  { text: 'for', start: 12.480, end: 12.580 },
  { text: 'a', start: 12.620, end: 12.680 },
  { text: 'person.', start: 12.740, end: 13.120 },
  { text: 'So', start: 13.820, end: 13.960 },
  { text: 'seconds', start: 14.180, end: 14.520 },
  { text: 'later…', start: 14.580, end: 14.820 },
  { text: 'it', start: 15.280, end: 15.400 },
  { text: 'spat', start: 15.520, end: 15.700 },
  { text: 'him', start: 15.740, end: 15.840 },
  { text: 'back', start: 15.880, end: 16.079 },
  { text: 'out!', start: 16.160, end: 16.360 },
  { text: 'His', start: 16.780, end: 16.980 },
  { text: 'dad', start: 17.040, end: 17.260 },
  { text: 'filmed', start: 17.360, end: 17.560 },
  { text: 'the', start: 17.600, end: 17.740 },
  { text: 'whole', start: 17.820, end: 18.020 },
  { text: 'thing.', start: 18.140, end: 18.400 },
  { text: 'So', start: 18.860, end: 19.000 },
  { text: 'yes,', start: 19.060, end: 19.400 },
];
