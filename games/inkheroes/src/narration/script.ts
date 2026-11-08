/**
 * How the narrator's lines are recorded (spec, "Narration"): the voice and
 * the model. Only the recording uses this (test/narration.test.ts writes it
 * into narration/lines.json); the game plays what was recorded. Each line's
 * script, tags and all, is in lines.ts.
 */
export const NARRATOR = {
  /** ElevenLabs' "David - British Storyteller": an old British storyteller (picked by the user, Nov 8, 2026). */
  voice: 'BNgbHR0DNeZixGQVzloa',
  voiceName: 'David - British Storyteller',
  model: 'eleven_v4',
} as const;
