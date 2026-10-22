import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { SOUNDS } from './script';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it (script.ts lists them, one set per mood:
 * the slow-motion roar of water into the mouth and the blink, tiptoe plinks,
 * a ticking clock, the jolt and the boom of the mouth ballooning, the big
 * GULP on "gone!" and a whistle, gulps and a boing and a burp, a heartbeat
 * and the strike), and a low hum of water. The voice's last word
 * ("because") runs up to the loop point, so the loop finishes the sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
/** Mark's takes peak near -3 dB: brought down to where the narrated shorts' voices sit against their effects. */
const VOICE_GAIN = 0.7;
const HUM_GAIN = 0.4;
/**
 * Two lines came out too quiet to hear on a phone, so they're ridden up in the pauses either side:
 * "The frogfish sits still, pretending to be a sponge…" (2.41–5.25 s in voice.mp3, read mischievously, 5–7 dB
 * under the rest of the take) by about 5 dB, and the whispered "and wiggles a little fake bait on its head."
 * (5.63–7.62 s, about 11 dB under) by about 9.5 dB. [time s, × VOICE_GAIN]
 */
const VOICE_RIDE: readonly (readonly [number, number])[] = [
  [0, 1], [2.0, 1], [2.35, 1.8], [5.25, 1.8], [5.55, 3], [7.7, 3], [8.0, 1],
];
/** The whole mix, set so the recorded video peaks around -4 dB. */
const OUT_GAIN = 0.88;

export async function renderFrogfishAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  // Straight to the output: the effects' master gain is for their quiet synth levels.
  const level = ctx.createGain();
  for (const [t, k] of VOICE_RIDE) level.gain.linearRampToValueAtTime(VOICE_GAIN * k, t);
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
