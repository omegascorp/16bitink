import { addVoice, foldLoop, offlineMix, rotatedWav, surf } from '../audioKit';
import { LOOP_S, SOUNDS } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quietly under it (story.ts lists them: a growing
 * arpeggio per animal turning crab, pencil toks for the tally and a sparkle
 * on "five", the shell swap, knocks for the gallery, a small fanfare for the
 * name), and a faint surf. The voice's last words run up to the loop point,
 * so the loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const SURF_GAIN = 0.35;
/** The whole mix, lifted to peak around -3 dB. */
const OUT_GAIN = 1.3;

export async function renderCrabsAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  await addVoice(ctx, VOICE_URL);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const sea = surf(loop[0]!.length, 2);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + SURF_GAIN * sea[c]![i]!))), LOOP_S, start);
}
