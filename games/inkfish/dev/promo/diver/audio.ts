import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { SOUNDS } from './script';
import { ALL_AT, LOOP_S, RETURN_AT } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it, one set a mood (script.ts lists them),
 * and a low hum of water. The voice's last words ("Which is how") run up to
 * the loop point, so the loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.45;
/** The take peaks near -3.0 dB: brought down so the whole mix, lifted by OUT_GAIN, peaks around -4 dB. */
const VOICE_GAIN = 0.7;
/**
 * The tender "All he could think of was his family." (18.05-19.6 s in voice.mp3) was read
 * quietly: about 5 dB under the rest of the take. Ridden up 5 dB (x1.8) in the pauses either side.
 * [time s, x VOICE_GAIN]
 */
const VOICE_RIDE: readonly (readonly [number, number])[] = [
  [0, 1], [ALL_AT - 0.45, 1], [ALL_AT - 0.1, 1.8], [RETURN_AT - 0.1, 1.8], [RETURN_AT + 0.1, 1],
];
/** The whole mix, lifted to peak around -4 dB. */
const OUT_GAIN = 1.22;

export async function renderDiverAudio(start = 0): Promise<Blob> {
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
