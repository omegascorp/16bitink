import { addVoice, foldLoop, offlineMix, rotatedWav, surf } from '../audioKit';
import { SOUNDS } from './cues';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it, a new colour of sound for each mood
 * (cues.ts lists them), and a faint surf on the beach. The voice's last word
 * runs up to the loop point, so the loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
/** The effects' master level (their synth levels are quiet). */
const SFX_GAIN = 3;
const SURF_GAIN = 0.45;
const SURF_SWELLS = 4;
/** The whole mix, set so it peaks around -4 dB (the take itself peaks at -2.9 dB). */
const OUT_GAIN = 0.88;

export async function renderManowarAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, SFX_GAIN);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  await addVoice(ctx, VOICE_URL);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const waves = surf(loop[0]!.length, SURF_SWELLS);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + SURF_GAIN * waves[c]![i]!))), LOOP_S, start);
}
