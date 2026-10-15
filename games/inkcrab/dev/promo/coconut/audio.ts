import { addVoice, foldLoop, offlineMix, rotatedWav, surf } from '../audioKit';
import { SOUNDS } from './cues';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it (cues.ts lists them: knocks on the
 * coconut and its crunch, ticks and dings for the numbers, the crunch of
 * the pinch, nibbles and the grow and move-in chimes up the shell ladder),
 * and a faint surf on the island's beach. The voice's last word runs up to
 * the loop point, so the loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
/** The effects' master level (their synth levels are quiet). */
const SFX_GAIN = 3;
const SURF_GAIN = 0.5;
const SURF_SWELLS = 5;
/** The whole mix, lifted to peak around -3 dB. */
const OUT_GAIN = 1.2;

export async function renderCoconutAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, SFX_GAIN);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  await addVoice(ctx, VOICE_URL);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const waves = surf(loop[0]!.length, SURF_SWELLS);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + SURF_GAIN * waves[c]![i]!))), LOOP_S, start);
}
