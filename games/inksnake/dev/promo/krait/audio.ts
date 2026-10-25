import { foldLoop, offlineMix, rotatedWav, surf } from '../audioKit';
import { SOUNDS } from './script';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * InkSnake's own effects quiet under it (script.ts lists them), and a faint
 * hush of water. The voice's last words ("So yes,") run up to the loop
 * point, so the loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const SURF_GAIN = 0.35;
const VOICE_GAIN = 0.7;
/** The effects' level into the mix (their synth levels are quiet). */
const SFX_GAIN = 2.2;
/** The whole mix, lifted to peak around -4 dB. */
const OUT_GAIN = 1.12;

export async function renderKraitAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, SFX_GAIN);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  // Straight to the output (through its own gain): the effects' master gain is for their quiet synth levels.
  const level = ctx.createGain();
  level.gain.value = VOICE_GAIN;
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hush = surf(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + SURF_GAIN * hush[c]![i]!))), LOOP_S, start);
}
