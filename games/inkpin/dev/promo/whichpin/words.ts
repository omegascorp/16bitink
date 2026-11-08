/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark - Natural Conversations"
 * (eleven_v4), the take in whichpin/voice-take.mp3 (16.96 s), its first TRIM
 * seconds cut and sped up by TEMPO (pitch kept) with ffmpeg's atempo, so it
 * ends about 0.35 s before the 16.5 s loop point.
 *
 * APPROXIMATE TIMINGS: these are NOT from ElevenLabs Scribe. Each phrase of
 * the script is bounded by the take's pauses (ffmpeg silencedetect, -35 dB,
 * 0.12 s), and the words inside a phrase are spread over it by their length.
 * Phrase edges are accurate to about a tenth of a second; single words can be
 * off by more. The beats are staged on phrase starts for that reason. Replace
 * WORDS (keep PHRASES' shape) with Scribe's timings when they exist.
 *
 * Script, which ends mid-sentence so the loop's first line finishes it:
 * "Which pin would you pull first? One holds back water. One holds back LAVA.
 * And Nib the raccoon is stuck with an angry boar... Water first? Bye, Nib.
 * But pull the LAVA first... and that boar is in big trouble! So, one question:"
 */
export const TEMPO = 1.03;
export const TRIM = 0.025;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
  /** Index into PHRASES. */
  readonly phrase: number;
}

/** A time in the original take, in voice.mp3 (and so in the loop: the voice starts with it). */
export const inVoice = (takeSeconds: number): number => (takeSeconds - TRIM) / TEMPO;

/** The script's sentences, with their start and end in the take (from the pauses). */
export const PHRASES: readonly { readonly text: string; readonly start: number; readonly end: number }[] = [
  { text: "Which pin would you pull first?", start: 0.025, end: 1.504 },
  { text: "One holds back water.", start: 1.933, end: 3.182 },
  { text: "One holds back LAVA.", start: 3.545, end: 5.092 },
  { text: "And Nib the raccoon is stuck with an angry boar…", start: 5.479, end: 8.441 },
  { text: "Water first?", start: 8.891, end: 9.722 },
  { text: "Bye, Nib.", start: 9.922, end: 10.871 },
  { text: "But pull the LAVA first…", start: 11.293, end: 12.751 },
  { text: "and that boar is in big trouble!", start: 12.969, end: 14.866 },
  { text: "So, one question:", start: 15.221, end: 16.666 },
];

export const WORDS: readonly Word[] = [
  { text: "Which", start: 0.025, end: 0.278, phrase: 0 },
  { text: "pin", start: 0.308, end: 0.474, phrase: 0 },
  { text: "would", start: 0.504, end: 0.756, phrase: 0 },
  { text: "you", start: 0.786, end: 0.952, phrase: 0 },
  { text: "pull", start: 0.982, end: 1.191, phrase: 0 },
  { text: "first?", start: 1.221, end: 1.474, phrase: 0 },
  { text: "One", start: 1.933, end: 2.147, phrase: 1 },
  { text: "holds", start: 2.177, end: 2.5, phrase: 1 },
  { text: "back", start: 2.53, end: 2.799, phrase: 1 },
  { text: "water.", start: 2.829, end: 3.152, phrase: 1 },
  { text: "One", start: 3.545, end: 3.831, phrase: 2 },
  { text: "holds", start: 3.861, end: 4.288, phrase: 2 },
  { text: "back", start: 4.318, end: 4.675, phrase: 2 },
  { text: "LAVA.", start: 4.705, end: 5.062, phrase: 2 },
  { text: "And", start: 5.479, end: 5.7, phrase: 3 },
  { text: "Nib", start: 5.73, end: 5.952, phrase: 3 },
  { text: "the", start: 5.982, end: 6.203, phrase: 3 },
  { text: "raccoon", start: 6.233, end: 6.679, phrase: 3 },
  { text: "is", start: 6.709, end: 6.874, phrase: 3 },
  { text: "stuck", start: 6.904, end: 7.237, phrase: 3 },
  { text: "with", start: 7.267, end: 7.545, phrase: 3 },
  { text: "an", start: 7.575, end: 7.74, phrase: 3 },
  { text: "angry", start: 7.77, end: 8.104, phrase: 3 },
  { text: "boar…", start: 8.134, end: 8.411, phrase: 3 },
  { text: "Water", start: 8.891, end: 9.277, phrase: 4 },
  { text: "first?", start: 9.306, end: 9.692, phrase: 4 },
  { text: "Bye,", start: 9.922, end: 10.367, phrase: 5 },
  { text: "Nib.", start: 10.396, end: 10.841, phrase: 5 },
  { text: "But", start: 11.293, end: 11.511, phrase: 6 },
  { text: "pull", start: 11.541, end: 11.813, phrase: 6 },
  { text: "the", start: 11.843, end: 12.061, phrase: 6 },
  { text: "LAVA", start: 12.091, end: 12.363, phrase: 6 },
  { text: "first…", start: 12.393, end: 12.721, phrase: 6 },
  { text: "and", start: 12.969, end: 13.179, phrase: 7 },
  { text: "that", start: 13.209, end: 13.473, phrase: 7 },
  { text: "boar", start: 13.503, end: 13.767, phrase: 7 },
  { text: "is", start: 13.797, end: 13.954, phrase: 7 },
  { text: "in", start: 13.984, end: 14.141, phrase: 7 },
  { text: "big", start: 14.171, end: 14.382, phrase: 7 },
  { text: "trouble!", start: 14.412, end: 14.836, phrase: 7 },
  { text: "So,", start: 15.221, end: 15.48, phrase: 8 },
  { text: "one", start: 15.51, end: 15.852, phrase: 8 },
  { text: "question:", start: 15.882, end: 16.636, phrase: 8 },
];
