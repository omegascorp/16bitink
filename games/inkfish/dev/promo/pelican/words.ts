/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voice-take.mp3, 18.56 s, nothing trimmed.
 * Sped up by TEMPO (pitch kept) with ffmpeg's atempo, so the last word ends
 * about 0.3 s before the 18 s loop point. WORDS are its words with start and
 * end times in the take (ElevenLabs Scribe, 2026-11-07, flow
 * cUYB0izfmUmueut3bRWp), so divide by TEMPO for voice.mp3. Written as the
 * script spells them (caps and punctuation for the captions). Word edges are
 * fixed from the waveform (silencedetect at -40 dB): a word after a pause
 * starts where the sound comes back, the word before ends where the pause
 * begins; the first word starts where the sound does, the last ends where it
 * fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…but hey, at least / this pelican tried to swallow a CAPYBARA!"
 */
export const TEMPO = 1.04;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 18;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.032, end: 0.320 },
  { text: 'pelican', start: 0.380, end: 0.800 },
  { text: 'tried', start: 0.880, end: 1.040 },
  { text: 'to', start: 1.080, end: 1.180 },
  { text: 'swallow', start: 1.240, end: 1.540 },
  { text: 'a', start: 1.600, end: 1.680 },
  { text: 'CAPYBARA!', start: 1.740, end: 2.621 },
  { text: 'Its', start: 3.081, end: 3.280 },
  { text: 'pouch', start: 3.340, end: 3.620 },
  { text: 'holds', start: 3.660, end: 3.840 },
  { text: 'about', start: 3.880, end: 4.180 },
  { text: 'three', start: 4.240, end: 4.480 },
  { text: 'GALLONS…', start: 4.620, end: 5.195 },
  { text: 'so,', start: 5.447, end: 5.880 },
  { text: 'at', start: 6.300, end: 6.360 },
  { text: 'a', start: 6.420, end: 6.460 },
  { text: 'zoo', start: 6.560, end: 6.680 },
  { text: 'in', start: 6.700, end: 6.800 },
  { text: 'Japan,', start: 6.820, end: 7.280 },
  { text: 'it', start: 7.500, end: 7.660 },
  { text: 'picked', start: 7.720, end: 7.940 },
  { text: 'a', start: 8.000, end: 8.180 },
  { text: 'baby', start: 8.220, end: 8.480 },
  { text: 'capybara.', start: 8.580, end: 9.198 },
  { text: 'The', start: 9.583, end: 9.660 },
  { text: 'capybara?', start: 9.720, end: 10.414 },
  { text: 'Didn\'t', start: 10.643, end: 10.980 },
  { text: 'even', start: 11.020, end: 11.300 },
  { text: 'FLINCH!', start: 11.360, end: 11.828 },
  { text: 'So', start: 12.142, end: 12.500 },
  { text: 'the', start: 12.540, end: 12.600 },
  { text: 'pelican', start: 12.680, end: 13.040 },
  { text: 'tried', start: 13.140, end: 13.360 },
  { text: 'the', start: 13.380, end: 13.480 },
  { text: 'NEXT', start: 13.600, end: 13.840 },
  { text: 'baby.', start: 13.940, end: 14.276 },
  { text: 'Same', start: 14.641, end: 15.080 },
  { text: 'face.', start: 15.200, end: 15.594 },
  { text: 'It', start: 16.043, end: 16.160 },
  { text: 'gave', start: 16.280, end: 16.480 },
  { text: 'up…', start: 16.580, end: 16.876 },
  { text: 'but', start: 17.147, end: 17.280 },
  { text: 'hey,', start: 17.340, end: 17.576 },
  { text: 'at', start: 17.776, end: 17.940 },
  { text: 'least', start: 18.000, end: 18.402 },
];
