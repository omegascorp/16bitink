import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { LOOP_S, SOUNDS } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's own effects quiet under it (story.ts lists them, one mood a
 * beat), and a low hum of the deep. The voice's last word ("Because") runs
 * up to the loop point, so the loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
/** This take peaks near -3 dB on its own: a touch under, so the mix peaks about -4 dB. */
const VOICE_GAIN = 0.86;
const SFX_GAIN = 3;
const HUM_GAIN = 0.4;

export async function renderSwallowerAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, SFX_GAIN);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  // Straight to the output: the effects' master gain is for their quiet synth levels.
  const level = ctx.createGain();
  level.gain.value = VOICE_GAIN;
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => v + HUM_GAIN * hum[c]![i]!)), LOOP_S, start);
}
