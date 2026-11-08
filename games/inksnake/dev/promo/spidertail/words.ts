/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-11-04: generation eb7pq2fXX3RXd3cRZN8d (take 3 of 4), no leading silence trimmed.
 * Pauses longer than 0.42 s (silencedetect at -40 dB) were cut to 0.42 s from their middles, with 10 ms crossfades: 7 in the original take, 0.52 s, 0.57 s, 0.54 s, 0.46 s, 0.67 s, 0.57 s, 0.44 s long (original times 2.39-2.91 s; 3.92-4.49 s; 8.51-9.05 s; 10.53-10.98 s; 13.01-13.67 s; 14.64-15.20 s; 17.39-17.83 s).
 * Then sped up by TEMPO (pitch kept) with ffmpeg's atempo, to end about 0.3 s
 * before the 21 s loop point. WORDS are its words with start and end times in
 * the trimmed, pause-shortened take (ElevenLabs Scribe), so divide by TEMPO for
 * voice.mp3. Word edges are fixed from the waveform (silencedetect at -40 dB):
 * a word after a pause starts where the sound comes back, the word before ends
 * where the pause begins; the first word starts where the sound does, and the
 * last ends where it fades out.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…So yes, / " followed by the first line, "this snake's tail is a fake spider!".
 */
export const TEMPO = 1.18;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 21;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.080, end: 0.240 },
  { text: 'snake\'s', start: 0.400, end: 0.640 },
  { text: 'tail', start: 0.800, end: 0.960 },
  { text: 'is', start: 1.040, end: 1.120 },
  { text: 'a', start: 1.200, end: 1.320 },
  { text: 'FAKE', start: 1.440, end: 1.680 },
  { text: 'spider!', start: 1.760, end: 2.391 },
  { text: 'Western', start: 2.800, end: 3.171 },
  { text: 'Iran.', start: 3.251, end: 3.814 },
  { text: 'A', start: 4.209, end: 4.249 },
  { text: 'little', start: 4.289, end: 4.449 },
  { text: 'warbler', start: 4.609, end: 5.009 },
  { text: 'stops', start: 5.089, end: 5.409 },
  { text: 'on', start: 5.449, end: 5.489 },
  { text: 'a', start: 5.569, end: 5.649 },
  { text: 'bare', start: 5.769, end: 5.889 },
  { text: 'rock,', start: 5.969, end: 6.310 },
  { text: 'halfway', start: 6.552, end: 6.929 },
  { text: 'through', start: 7.009, end: 7.089 },
  { text: 'its', start: 7.169, end: 7.249 },
  { text: 'long', start: 7.329, end: 7.489 },
  { text: 'migration…', start: 7.569, end: 8.242 },
  { text: 'and', start: 8.653, end: 8.798 },
  { text: 'there,', start: 8.878, end: 9.358 },
  { text: 'on', start: 9.438, end: 9.518 },
  { text: 'the', start: 9.571, end: 9.625 },
  { text: 'stone…', start: 9.678, end: 10.124 },
  { text: 'a', start: 10.533, end: 10.671 },
  { text: 'spider!', start: 10.791, end: 11.274 },
  { text: 'Legs', start: 11.682, end: 12.031 },
  { text: 'twitching.', start: 12.111, end: 12.558 },
  { text: 'It', start: 12.968, end: 13.055 },
  { text: 'hops', start: 13.135, end: 13.375 },
  { text: 'closer…', start: 13.455, end: 13.934 },
  { text: 'Peck!', start: 14.344, end: 14.596 },
  { text: 'And', start: 14.984, end: 15.059 },
  { text: 'the', start: 15.139, end: 15.219 },
  { text: 'ROCK', start: 15.379, end: 15.699 },
  { text: 'bites', start: 15.779, end: 16.019 },
  { text: 'back!', start: 16.179, end: 16.527 },
  { text: 'A', start: 16.938, end: 17.108 },
  { text: 'fifth', start: 17.268, end: 17.508 },
  { text: 'of', start: 17.588, end: 17.668 },
  { text: 'a', start: 17.721, end: 17.775 },
  { text: 'second.', start: 17.828, end: 18.229 },
  { text: 'One', start: 18.506, end: 19.268 },
  { text: 'bird', start: 19.348, end: 19.588 },
  { text: 'pecked', start: 19.668, end: 19.868 },
  { text: 'the', start: 19.908, end: 20.068 },
  { text: 'whole', start: 20.148, end: 20.308 },
  { text: 'spider', start: 20.388, end: 20.708 },
  { text: 'clean', start: 20.868, end: 21.188 },
  { text: 'OFF!', start: 21.268, end: 21.559 },
  { text: 'Bad', start: 21.881, end: 22.228 },
  { text: 'day', start: 22.308, end: 22.388 },
  { text: 'for', start: 22.468, end: 22.548 },
  { text: 'the', start: 22.588, end: 22.628 },
  { text: 'snake.', start: 22.708, end: 23.182 },
  { text: 'So', start: 23.576, end: 23.908 },
  { text: 'yes,', start: 24.068, end: 24.423 },
];
