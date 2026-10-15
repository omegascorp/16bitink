import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { LOOP_S, SOUNDS } from './story';

/** The short's soundtrack from the game's own effects (story.ts lists the cues), over a faint hum, looping like the picture. */
const TAIL_S = 1.5;

export async function renderBaitAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  // A whole number of swells per loop, so the hum loops too.
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => v + hum[c]![i]!)), LOOP_S, start);
}
