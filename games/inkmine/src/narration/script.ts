/**
 * How the narrator's lines are recorded (spec, "Narration"): the voice,
 * and the script each line's words are turned into for it. Only the
 * recording uses this (test/narration.test.ts writes it into
 * narration/lines.json); the game plays what was recorded.
 */
export const NARRATOR = {
  /** ElevenLabs' George: a warm British storyteller. */
  voice: 'JBFqnCBsd6RMkjVDRZzb',
  model: 'eleven_v4',
  /** The delivery tag every script starts with. */
  tag: '[warm, storytelling]',
} as const;

/** Words the narrator says differently from how the cards write them. */
const SAID: readonly (readonly [RegExp, string])[] = [
  // "Drill Mk 3" is "Drill Mark 3", not "M K 3".
  [/\bMk (\d+)/g, 'Mark $1'],
];

/** What the narrator is given to read for a card's words. */
export const spokenScript = (text: string): string => `${NARRATOR.tag} ${SAID.reduce((t, [from, to]) => t.replace(from, to), text)}`;
