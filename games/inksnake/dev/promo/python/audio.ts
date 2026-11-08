import { foldLoop, offlineMix, rotatedWav, surf } from '../audioKit';
import { SOUNDS } from './script';
import { LOOP_S, THEN_AT, DAYS_AT } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * InkSnake's own effects quiet under it (script.ts lists them), and a faint
 * hush of water. The voice's last word ("Because") runs up to the loop
 * point, so the loop finishes its sentence. The quiet line ("Then it barely
 * moved for ten days.", measured 7.5 dB under the rest) is raised to within
 * 3 dB of the rest.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const SURF_GAIN = 0.3;
const VOICE_GAIN = 0.7;
/** How much louder the quiet line is made (4.5 dB), over its words and a breath either side. */
const QUIET_BOOST = 1.68;
const QUIET_FROM = THEN_AT - 0.12;
const QUIET_TO = DAYS_AT + 0.15;
const RAMP_S = 0.1;
const SFX_GAIN = 2.2;
const OUT_GAIN = 1.12;

export async function renderPythonAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, SFX_GAIN);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const level = ctx.createGain();
  level.gain.setValueAtTime(VOICE_GAIN, 0);
  level.gain.setValueAtTime(VOICE_GAIN, QUIET_FROM - RAMP_S);
  level.gain.linearRampToValueAtTime(VOICE_GAIN * QUIET_BOOST, QUIET_FROM);
  level.gain.setValueAtTime(VOICE_GAIN * QUIET_BOOST, QUIET_TO);
  level.gain.linearRampToValueAtTime(VOICE_GAIN, QUIET_TO + RAMP_S);
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hush = surf(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + SURF_GAIN * hush[c]![i]!))), LOOP_S, start);
}
