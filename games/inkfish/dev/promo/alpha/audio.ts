import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { SOUNDS } from './script';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it (script.ts lists them, one set a mood),
 * and a low hum of water. The voice's last words ("All we know is,") run up
 * to the loop point, so the loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.45;
/** Mark's take: the nervous hook peaks near -4.5 dB, the rest of the read near -10 to -12 dB. */
const VOICE_GAIN = 0.85;
/**
 * The read after the hook ridden up about 4 dB to sit level with it, and the
 * soft "It was inside something's stomach." (12.9–14.5 s, about 4 dB under the
 * take) up 1.5 dB more, each change in a pause. [time s, × VOICE_GAIN]
 */
const VOICE_RIDE: readonly (readonly [number, number])[] = [
  [0, 1], [2.25, 1], [2.55, 1.65], [12.5, 1.65], [12.85, 1.95], [14.5, 1.95], [14.85, 1.65], [19.25, 1.65], [19.45, 1],
];
/** The whole mix, lifted to peak around -4 dB. */
const OUT_GAIN = 1.07;

export async function renderAlphaAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  // Straight to the output (through its own gain): the effects' master gain is for their quiet synth levels.
  const level = ctx.createGain();
  for (const [at, k] of VOICE_RIDE) level.gain.linearRampToValueAtTime(VOICE_GAIN * k, at);
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
