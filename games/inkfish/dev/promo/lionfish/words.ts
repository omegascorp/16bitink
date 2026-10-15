/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator" (eleven_v4), directed take 4 of 4 (generation
 * yhxPyJnvJFKm3upIa5G4), its first 0.1 s of silence trimmed, then sped up by
 * TEMPO (pitch kept) with ffmpeg's atempo. WORDS are its words with start and
 * end times in the trimmed take (ElevenLabs Scribe), so divide by TEMPO for
 * voice.mp3. Scribe ran the last word on to the end of the file; its end is
 * where the take falls silent (ffmpeg silencedetect).
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…but its meat is safe. So, / to save the reef… EAT this fish."
 */
export const TEMPO = 1.145;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'To', start: 0, end: 0.14 },
  { text: 'save', start: 0.22, end: 0.46 },
  { text: 'the', start: 0.54, end: 0.62 },
  { text: 'reef…', start: 0.7, end: 1.38 },
  { text: 'EAT', start: 1.66, end: 1.82 },
  { text: 'this', start: 1.94, end: 2.06 },
  { text: 'fish.', start: 2.14, end: 2.82 },
  { text: 'Lionfish', start: 3.18, end: 3.74 },
  { text: 'come', start: 3.82, end: 3.9 },
  { text: 'from', start: 3.98, end: 4.06 },
  { text: 'the', start: 4.14, end: 4.22 },
  { text: 'Pacific', start: 4.46, end: 4.7 },
  { text: 'and', start: 4.78, end: 4.86 },
  { text: 'Indian', start: 4.94, end: 5.26 },
  { text: 'Oceans,', start: 5.34, end: 5.98 },
  { text: 'but', start: 6.06, end: 6.22 },
  { text: 'since', start: 6.3, end: 6.38 },
  { text: 'the', start: 6.46, end: 6.54 },
  { text: '1980s', start: 6.58, end: 7.42 },
  { text: "they've", start: 7.5, end: 7.74 },
  { text: 'spread', start: 7.9, end: 8.06 },
  { text: 'through', start: 8.14, end: 8.22 },
  { text: 'the', start: 8.26, end: 8.3 },
  { text: 'Atlantic,', start: 8.74, end: 9.207 },
  { text: 'from', start: 9.233, end: 9.26 },
  { text: 'the', start: 9.34, end: 9.42 },
  { text: 'Carolinas', start: 9.58, end: 10.14 },
  { text: 'to', start: 10.18, end: 10.22 },
  { text: 'Brazil.', start: 10.3, end: 11.191 },
  { text: 'Almost', start: 11.26, end: 11.66 },
  { text: 'nothing', start: 11.74, end: 12.06 },
  { text: 'there', start: 12.18, end: 12.3 },
  { text: 'eats', start: 12.38, end: 12.54 },
  { text: 'them.', start: 12.62, end: 13.287 },
  { text: 'On', start: 13.313, end: 13.34 },
  { text: 'a', start: 13.5, end: 13.607 },
  { text: 'small', start: 13.713, end: 13.82 },
  { text: 'reef,', start: 13.94, end: 14.34 },
  { text: 'one', start: 14.38, end: 14.54 },
  { text: 'lionfish', start: 14.62, end: 15.1 },
  { text: 'cut', start: 15.18, end: 15.26 },
  { text: 'the', start: 15.34, end: 15.42 },
  { text: 'young', start: 15.54, end: 15.66 },
  { text: 'fish', start: 15.78, end: 15.9 },
  { text: 'by', start: 15.98, end: 16.06 },
  { text: 'nearly', start: 16.193, end: 16.46 },
  { text: 'EIGHTY', start: 16.54, end: 16.82 },
  { text: 'percent', start: 16.86, end: 17.34 },
  { text: 'in', start: 17.46, end: 17.58 },
  { text: 'five', start: 17.74, end: 17.9 },
  { text: 'weeks.', start: 18.34, end: 18.804 },
  { text: 'Its', start: 18.996, end: 19.02 },
  { text: 'spines', start: 19.1, end: 19.34 },
  { text: 'are', start: 19.42, end: 19.5 },
  { text: 'venomous,', start: 19.58, end: 20.18 },
  { text: 'but', start: 20.22, end: 20.3 },
  { text: 'its', start: 20.42, end: 20.54 },
  { text: 'meat', start: 20.58, end: 20.78 },
  { text: 'is', start: 20.86, end: 20.94 },
  { text: 'safe.', start: 21.02, end: 21.7 },
  { text: 'So,', start: 21.74, end: 21.99 },
];
