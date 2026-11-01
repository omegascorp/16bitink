import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { SOUNDS } from './script';
import { KNOWS_AT, LOOP_S, NOBODY_AT } from './story';
import { TEMPO, WORDS } from './words';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop), the
 * game's effects quiet under it, one set a mood (script.ts lists them), and a
 * low hum of water. The voice's last word ("But") runs up to the loop point, so
 * the loop finishes its sentence. "Nobody knows…" was measured 6.6 dB under the
 * take, so the voice is raised about 5 dB over exactly those two words.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.45;
/** Brought down so the whole mix, lifted by OUT_GAIN, peaks around -4 dB. */
const VOICE_GAIN = 0.7;
const OUT_GAIN = 1.34;
/** The quiet line: +5 dB over its two words, with short ramps. */
const QUIET_DB = 5;
const RAMP_S = 0.06;

export async function renderOrcasaveAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  // Straight to the output (through its own gain): the effects' master gain is for their quiet synth levels.
  const level = ctx.createGain();
  const lift = 10 ** (QUIET_DB / 20);
  const [from, to] = [NOBODY_AT, WORDS[WORDS.findIndex((w) => w.text === 'knows…')]!.end / TEMPO];
  void KNOWS_AT;
  level.gain.setValueAtTime(VOICE_GAIN, 0);
  level.gain.setValueAtTime(VOICE_GAIN, from - RAMP_S);
  level.gain.linearRampToValueAtTime(VOICE_GAIN * lift, from);
  level.gain.setValueAtTime(VOICE_GAIN * lift, to);
  level.gain.linearRampToValueAtTime(VOICE_GAIN, to + RAMP_S);
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
