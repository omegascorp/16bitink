import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { SOUNDS } from './script';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * a few quiet game effects under it (script.ts lists them: the thud on
 * "THIS", the camera's clicks, the whoosh into shark vision, the ding on
 * "APART", low sounds as the shark rises, the surfer's splashes), and a low
 * hum of the sea. The voice's last words run up to the loop point, so the
 * loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.45;
/**
 * Mark's take peaks near -3.7 dB (on "THIS", with the boom under it): brought down to about -7.3 dB,
 * a touch under where the narrated shorts' voices sit against their effects, so that hit peaks near -4.
 */
const VOICE_GAIN = 0.66;
/** The whole mix, lifted to peak around -4 dB. */
const OUT_GAIN = 1.35;

export async function renderSurferAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  // Straight to the output (through its own lift): the effects' master gain is for their quiet synth levels.
  const lift = ctx.createGain();
  lift.gain.value = VOICE_GAIN;
  voice.connect(lift).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
