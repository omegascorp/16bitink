/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Cedric M – Engaging
 * Documentary Narrator" (eleven_v4), take 1 of 4, sped up by TEMPO (pitch kept)
 * with ffmpeg's atempo. WORDS are its words with start and end times in the
 * original take (ElevenLabs Scribe), so divide by TEMPO for voice.mp3.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…be careful what you order, because / one pufferfish can kill thirty people."
 */
export const TEMPO = 1.1375;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'One', start: 0, end: 0.32 },
  { text: 'pufferfish', start: 0.4, end: 0.96 },
  { text: 'can', start: 1.04, end: 1.2 },
  { text: 'kill', start: 1.32, end: 1.44 },
  { text: 'thirty', start: 1.6, end: 1.92 },
  { text: 'people.', start: 2.08, end: 2.72 },
  { text: 'Its', start: 2.96, end: 3.12 },
  { text: 'poison,', start: 3.2, end: 3.84 },
  { text: 'tetrodotoxin,', start: 3.88, end: 5.04 },
  { text: 'is', start: 5.16, end: 5.28 },
  { text: 'deadlier', start: 5.36, end: 5.76 },
  { text: 'than', start: 5.84, end: 5.92 },
  { text: 'cyanide,', start: 6.08, end: 6.96 },
  { text: 'and', start: 7, end: 7.04 },
  { text: "there's", start: 7.12, end: 7.44 },
  { text: 'no', start: 7.56, end: 7.68 },
  { text: 'antidote.', start: 7.8, end: 8.8 },
  { text: 'In', start: 8.84, end: 8.88 },
  { text: 'Japan,', start: 8.96, end: 9.6 },
  { text: "it's", start: 9.64, end: 9.76 },
  { text: 'a', start: 9.84, end: 9.92 },
  { text: 'delicacy,', start: 10, end: 10.88 },
  { text: 'and', start: 10.96, end: 11.04 },
  { text: 'only', start: 11.2, end: 11.36 },
  { text: 'chefs', start: 11.44, end: 11.68 },
  { text: 'with', start: 11.72, end: 11.76 },
  { text: 'a', start: 11.84, end: 12 },
  { text: 'special', start: 12.2, end: 12.4 },
  { text: 'licence', start: 12.48, end: 12.88 },
  { text: 'are', start: 12.96, end: 13.04 },
  { text: 'allowed', start: 13.16, end: 13.28 },
  { text: 'to', start: 13.36, end: 13.44 },
  { text: 'cut', start: 13.52, end: 13.68 },
  { text: 'it.', start: 13.76, end: 14.4 },
  { text: 'When', start: 14.48, end: 14.56 },
  { text: 'a', start: 14.6, end: 14.64 },
  { text: 'predator', start: 14.72, end: 15.12 },
  { text: 'attacks,', start: 15.4, end: 15.92 },
  { text: 'it', start: 16.04, end: 16.16 },
  { text: 'gulps', start: 16.213, end: 16.48 },
  { text: 'water', start: 16.56, end: 16.96 },
  { text: 'and', start: 17.08, end: 17.2 },
  { text: 'blows', start: 17.24, end: 17.52 },
  { text: 'up', start: 17.6, end: 17.76 },
  { text: 'into', start: 17.88, end: 18 },
  { text: 'a', start: 18.08, end: 18.16 },
  { text: 'spiky', start: 18.24, end: 18.64 },
  { text: 'ball.', start: 18.8, end: 19.44 },
  { text: 'So', start: 19.52, end: 19.6 },
  { text: 'be', start: 19.68, end: 19.76 },
  { text: 'careful', start: 19.88, end: 20.08 },
  { text: 'what', start: 20.16, end: 20.32 },
  { text: 'you', start: 20.36, end: 20.4 },
  { text: 'order,', start: 20.48, end: 21.04 },
  { text: 'because', start: 21.28, end: 21.84 },
];
