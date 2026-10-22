import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { SOUNDS } from './script';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it, one set a mood (script.ts lists them),
 * and a low hum of water. The voice's last words ("So yes,") run up to the
 * loop point, so the loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.45;
/** Mark's take peaks near -1.7 dB: brought down to about -6 dB, where the narrated shorts' voices sit against their effects. */
const VOICE_GAIN = 0.6;
/**
 * The whispered "Kayak and all." (7.54–8.32 s in voice.mp3) came out about 12 dB under the rest of the take,
 * too quiet to hear on a phone: ridden up about 10 dB in the pauses either side of it. [time s, × VOICE_GAIN]
 */
const VOICE_RIDE: readonly (readonly [number, number])[] = [
  [0, 1], [7.05, 1], [7.4, 3.2], [8.4, 3.2], [8.85, 1],
];
/** The whole mix, lifted to peak around -4 dB. */
const OUT_GAIN = 1.22;

export async function renderKayakAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  // Straight to the output (through its own gain): the effects' master gain is for their quiet synth levels.
  const level = ctx.createGain();
  for (const [t, k] of VOICE_RIDE) level.gain.linearRampToValueAtTime(VOICE_GAIN * k, t);
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
