/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator", take 2 of 4, sped up by TEMPO (pitch kept) with
 * ffmpeg's atempo. WORDS are its words with start and end times in the
 * original take (ElevenLabs Scribe), so divide by TEMPO for voice.mp3.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…living to a hundred, even though / this fish was supposed to be extinct."
 */
export const TEMPO = 1.07;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0, end: 0.24 },
  { text: 'fish', start: 0.32, end: 0.56 },
  { text: 'was', start: 0.64, end: 0.8 },
  { text: 'supposed', start: 0.92, end: 1.28 },
  { text: 'to', start: 1.32, end: 1.36 },
  { text: 'be', start: 1.44, end: 1.52 },
  { text: 'extinct.', start: 1.68, end: 2.44 },
  { text: 'Scientists', start: 2.72, end: 3.2 },
  { text: 'knew', start: 3.24, end: 3.36 },
  { text: 'the', start: 3.44, end: 3.52 },
  { text: 'coelacanth', start: 3.6, end: 4.24 },
  { text: 'only', start: 4.4, end: 4.56 },
  { text: 'from', start: 4.64, end: 4.72 },
  { text: 'fossils,', start: 4.88, end: 5.6 },
  { text: 'and', start: 5.68, end: 5.76 },
  { text: 'thought', start: 5.84, end: 5.92 },
  { text: 'it', start: 6, end: 6.08 },
  { text: 'died', start: 6.12, end: 6.32 },
  { text: 'out', start: 6.4, end: 6.48 },
  { text: 'with', start: 6.52, end: 6.56 },
  { text: 'the', start: 6.64, end: 6.68 },
  { text: 'dinosaurs,', start: 6.72, end: 7.68 },
  { text: 'sixty-six', start: 7.8, end: 8.4 },
  { text: 'million', start: 8.64, end: 8.96 },
  { text: 'years', start: 9.04, end: 9.2 },
  { text: 'ago.', start: 9.28, end: 10.16 },
  { text: 'Then,', start: 10.32, end: 10.64 },
  { text: 'in', start: 10.72, end: 10.8 },
  { text: '1938,', start: 10.88, end: 12.16 },
  { text: 'a', start: 12.2, end: 12.24 },
  { text: 'museum', start: 12.32, end: 12.72 },
  { text: 'curator', start: 12.8, end: 13.2 },
  { text: 'in', start: 13.28, end: 13.36 },
  { text: 'South', start: 13.48, end: 13.6 },
  { text: 'Africa', start: 13.68, end: 14.08 },
  { text: 'found', start: 14.24, end: 14.56 },
  { text: 'one', start: 14.68, end: 14.8 },
  { text: 'in', start: 14.84, end: 14.88 },
  { text: 'a', start: 14.96, end: 15.04 },
  { text: "fisherman's", start: 15.12, end: 15.52 },
  { text: 'catch.', start: 15.6, end: 16.24 },
  { text: 'It', start: 16.48, end: 16.56 },
  { text: 'had', start: 16.6, end: 16.64 },
  { text: 'been', start: 16.76, end: 16.88 },
  { text: 'hiding', start: 16.96, end: 17.28 },
  { text: 'in', start: 17.4, end: 17.52 },
  { text: 'deep', start: 17.64, end: 17.76 },
  { text: 'sea', start: 17.84, end: 18 },
  { text: 'caves', start: 18.08, end: 18.48 },
  { text: 'all', start: 18.6, end: 18.72 },
  { text: 'along.', start: 18.8, end: 19.44 },
  { text: 'And', start: 19.68, end: 19.76 },
  { text: "it's", start: 19.8, end: 19.92 },
  { text: 'still', start: 20.08, end: 20.24 },
  { text: 'down', start: 20.36, end: 20.48 },
  { text: 'there', start: 20.56, end: 20.64 },
  { text: 'today,', start: 20.84, end: 21.36 },
  { text: 'living', start: 21.44, end: 21.68 },
  { text: 'to', start: 21.76, end: 21.84 },
  { text: 'a', start: 21.92, end: 22 },
  { text: 'hundred,', start: 22.08, end: 22.8 },
  { text: 'even', start: 22.96, end: 23.12 },
  { text: 'though', start: 23.28, end: 23.76 },
];
