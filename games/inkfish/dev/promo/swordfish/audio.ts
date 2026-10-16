import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { SOUNDS } from './script';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * a few quiet game effects under it (script.ts lists them: a sting for the
 * hook, the dive's whoosh and an icy ding, the heater's warm swell, the
 * mackerel's whoosh and the boom of "×10", the seat's pop and whip), and a
 * low hum of the sea. The voice's last words run up to the loop point, so
 * the loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.45;
/** Mark's take peaks near -3.5 dB: brought down to about -6.6 dB, where the narrated shorts' voices sit against their effects. */
const VOICE_GAIN = 0.7;
/** The whole mix, lifted to peak around -4 dB. */
const OUT_GAIN = 1.35;

export async function renderSwordfishAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  // Straight to the output: the effects' master gain is for their quiet synth levels.
  const lift = ctx.createGain();
  lift.gain.value = VOICE_GAIN;
  voice.connect(lift);
  lift.connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
