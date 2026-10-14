import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { LOOP_S, SOUNDS } from './story';
import { realAt } from './timing';

/** The short's soundtrack from the game's own effects (story.ts lists the cues, in story time; they play at the real time the slow motion puts them), over a faint sea hum, looping like the picture. */
const TAIL_S = 1.5;
/** Quieter than under the water: this short sits at the surface. */
const HUM_GAIN = 0.6;

export async function renderLeapAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, realAt(cue.t), cue.pitch, cue.gain, cue.pan);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 4);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => v + HUM_GAIN * hum[c]![i]!)), LOOP_S, start);
}
