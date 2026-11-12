import { addVoice, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { LOOP_S, SOUNDS } from './story';

/**
 * The soundtrack: the narrator (voice.mp3, starting with the loop) straight
 * to the output, InkSnake's own sound effects quiet under him, one mood per
 * beat (story.ts SOUNDS). Folded into a loop and set to peak at −4 dB. His
 * last words run up to the loop point, so the loop finishes his sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const SFX_GAIN = 0.8;
const PEAK = 10 ** (-4 / 20);

export async function renderBoaBatsAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, SFX_GAIN);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  await addVoice(ctx, VOICE_URL);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const peak = Math.max(...loop.map((ch) => ch.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));
  if (peak <= 0) throw new Error('boabats: silent soundtrack');
  return rotatedWav(loop.map((ch) => ch.map((v) => (v * PEAK) / peak)), LOOP_S, start);
}
