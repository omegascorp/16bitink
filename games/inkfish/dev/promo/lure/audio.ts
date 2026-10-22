import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { LOOP_S, SOUNDS } from './story';

/** The short's soundtrack from the game's own effects (story.ts lists the cues), over a faint hum, looping like the picture. */
const TAIL_S = 1.5;
/** Master gain: the mix peaks around -4 dB, like the other shorts (slurp/ has the same). */
const OUT_GAIN = 2.6;

export async function renderLureAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, OUT_GAIN);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 4);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => v + hum[c]![i]!)), LOOP_S, start);
}
