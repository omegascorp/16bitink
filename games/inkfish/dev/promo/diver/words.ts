/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-10-31: generation ANmuNIEysT7BmfzSjVK6, its first 0.084 s of silence trimmed.
 * Pauses longer than 0.42 s (silencedetect at -40 dB) were cut to 0.42 s from their middles, with 10 ms crossfades: 3 in the original take, 0.51 s, 0.50 s, 0.49 s long (original times 4.84-4.93 s; 19.77-19.85 s; 21.95-22.02 s).
 * Then sped up by TEMPO (pitch kept) with ffmpeg's atempo, to end about 0.3 s
 * before the 21 s loop point. WORDS are its words with start and end times in
 * the trimmed, pause-shortened take (ElevenLabs Scribe), so divide by TEMPO for
 * voice.mp3. Scribe's echoed audio tags are dropped, and word edges are fixed
 * from the waveform (silencedetect at -40 dB): a word after a pause starts where
 * the sound comes back, the word before ends where the pause begins; the first
 * word starts where the sound does, and the last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…Which is how / " followed by the first line, which finishes the sentence.
 */
export const TEMPO = 1.096;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 21;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.050, end: 0.540 },
  { text: 'diver', start: 0.580, end: 0.860 },
  { text: 'spent', start: 1.060, end: 1.240 },
  { text: 'about', start: 1.300, end: 1.500 },
  { text: 'forty', start: 1.860, end: 1.980 },
  { text: 'seconds…', start: 2.100, end: 2.500 },
  { text: 'inside', start: 3.040, end: 3.380 },
  { text: 'a', start: 3.440, end: 3.560 },
  { text: 'whale\'s', start: 3.620, end: 3.960 },
  { text: 'MOUTH.', start: 4.120, end: 4.549 },
  { text: 'Cape', start: 4.961, end: 5.200 },
  { text: 'Cod,', start: 5.280, end: 5.600 },
  { text: 'twenty twenty-one.', start: 6.040, end: 6.757 },
  { text: 'Forty-five', start: 7.157, end: 7.860 },
  { text: 'feet', start: 7.920, end: 8.080 },
  { text: 'down,', start: 8.160, end: 8.460 },
  { text: 'everything', start: 8.920, end: 9.280 },
  { text: 'went', start: 9.320, end: 9.560 },
  { text: 'DARK!', start: 9.620, end: 10.032 },
  { text: 'He', start: 10.409, end: 10.560 },
  { text: 'thought,', start: 10.580, end: 10.895 },
  { text: 'a', start: 11.034, end: 11.320 },
  { text: 'shark', start: 11.400, end: 11.680 },
  { text: 'got', start: 11.720, end: 11.880 },
  { text: 'me…', start: 11.940, end: 12.115 },
  { text: 'but,', start: 12.412, end: 12.515 },
  { text: 'no', start: 12.810, end: 13.080 },
  { text: 'teeth?', start: 13.160, end: 13.526 },
  { text: 'A', start: 13.870, end: 14.000 },
  { text: 'humpback', start: 14.080, end: 14.500 },
  { text: 'had', start: 14.520, end: 14.680 },
  { text: 'scooped', start: 14.740, end: 15.000 },
  { text: 'him', start: 15.020, end: 15.100 },
  { text: 'up', start: 15.160, end: 15.260 },
  { text: 'by', start: 15.280, end: 15.400 },
  { text: 'MISTAKE!', start: 15.440, end: 15.980 },
  { text: 'It', start: 16.440, end: 16.560 },
  { text: 'surfaced,', start: 16.640, end: 17.130 },
  { text: 'shook', start: 17.235, end: 17.620 },
  { text: 'its', start: 17.660, end: 17.780 },
  { text: 'head…', start: 17.820, end: 18.126 },
  { text: 'and', start: 18.276, end: 18.540 },
  { text: 'spat', start: 18.760, end: 18.980 },
  { text: 'him', start: 19.000, end: 19.100 },
  { text: 'out!', start: 19.200, end: 19.376 },
  { text: 'All', start: 19.786, end: 19.920 },
  { text: 'he', start: 19.960, end: 20.040 },
  { text: 'could', start: 20.060, end: 20.220 },
  { text: 'think', start: 20.260, end: 20.460 },
  { text: 'of', start: 20.520, end: 20.620 },
  { text: 'was', start: 20.680, end: 20.780 },
  { text: 'his', start: 20.800, end: 20.940 },
  { text: 'family.', start: 21.020, end: 21.460 },
  { text: 'Which', start: 21.870, end: 22.040 },
  { text: 'is', start: 22.080, end: 22.200 },
  { text: 'how', start: 22.260, end: 22.691 },
];
