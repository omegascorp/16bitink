import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { LOOP_S, SOUNDS } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * a few quiet game effects under it (story.ts lists them), and a low hum of
 * the deep. The voice's last words run up to the loop point, so the loop
 * finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.45;
/** The take is a little quiet: lifted to peak about -5 dB in the mix. */
const VOICE_GAIN = 1.3;

export async function renderBarreleyeAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const level = ctx.createGain();
  level.gain.value = VOICE_GAIN;
  // Straight to the output: the effects' master gain is for their quiet synth levels.
  level.connect(ctx.destination);
  const voice = ctx.createBufferSource();
  voice.buffer = buffer;
  voice.connect(level);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => v + HUM_GAIN * hum[c]![i]!)), LOOP_S, start);
}
