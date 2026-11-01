import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { SOUNDS } from './script';
import { LOOP_S, STARVE_AT, WHOD_AT } from './story';
import { saidEnd } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it, one set a mood (script.ts lists them),
 * and a low hum of water. The voice's last word ("when") runs up to the loop
 * point, so the loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.4;
const VOICE_GAIN = 0.7;
/** The whole mix, lifted to peak around -4 dB. */
const OUT_GAIN = 1.34;
/** "who'd starve." was measured 7.4 dB under the take: raised by this over exactly those two words. */
const QUIET_DB = 6;
const RAMP_S = 0.06;

export async function renderLeopardAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const level = ctx.createGain();
  const boost = 10 ** (QUIET_DB / 20);
  const [from, to] = [WHOD_AT - 0.04, saidEnd('starve.') + 0.03];
  level.gain.setValueAtTime(VOICE_GAIN, 0);
  level.gain.setValueAtTime(VOICE_GAIN, from - RAMP_S);
  level.gain.linearRampToValueAtTime(VOICE_GAIN * boost, from);
  level.gain.setValueAtTime(VOICE_GAIN * boost, to);
  level.gain.linearRampToValueAtTime(VOICE_GAIN, to + RAMP_S);
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  void STARVE_AT;
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
