import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { LOOP_S, SOUNDS } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it (story.ts lists them: whooshes and
 * splashes for the leaps, a crash for each landing, wet flops, a boing and a
 * sad trombone for "Great fishing trip."), and a faint sea hum. The voice's
 * last words ("So remember:") end just before the loop point, so the loop
 * finishes the sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
/** Quieter than in the deep shorts: most of this one is at the surface. */
const HUM_GAIN = 0.35;
/** The voice's level in the mix: Mark's takes are loud. */
const VOICE_GAIN = 0.8;
/** The whole mix, set so the recorded video peaks around -4 dB. */
const OUT_GAIN = 1.06;

export async function renderMakoAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const level = ctx.createGain();
  level.gain.value = VOICE_GAIN;
  // Straight to the output: the effects' master gain is for their quiet synth levels.
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
