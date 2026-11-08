import { foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { SOUNDS } from './script';
import { LOOP_S } from './story';
import { TEMPO, WORDS } from './words';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop)
 * and InkSnake's own effects quiet under it (script.ts lists them). The
 * voice's last words ("So yes,") end just before the loop point, so the
 * loop finishes the sentence. "It hops closer…" was recorded 11 dB under the
 * rest of the take, so the voice's gain rides up by RIDE_DB across exactly
 * those words.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
export const VOICE_GAIN = 0.7;
const SFX_GAIN = 2.2;
const OUT_GAIN = 1.26;
export const RIDE_DB = 9;
const RAMP_S = 0.04;

/** The span of the quiet line "It hops closer…" in the loop (seconds). */
export function quietLine(): { readonly from: number; readonly to: number } {
  const first = WORDS.findIndex((w) => w.text === 'It');
  const last = WORDS.findIndex((w) => w.text === 'closer…');
  return { from: WORDS[first]!.start / TEMPO, to: WORDS[last]!.end / TEMPO };
}

/** The voice's gain over time as ramp points (time, gain): a pure function of the word times. */
export function voiceRide(): readonly (readonly [number, number])[] {
  const { from, to } = quietLine();
  const up = VOICE_GAIN * 10 ** (RIDE_DB / 20);
  return [[0, VOICE_GAIN], [from - RAMP_S, VOICE_GAIN], [from, up], [to, up], [to + RAMP_S, VOICE_GAIN]];
}

export async function renderSpidertailAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, SFX_GAIN);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const level = ctx.createGain();
  const [first, ...rest] = voiceRide();
  level.gain.setValueAtTime(first![1], first![0]);
  for (const [t, g] of rest) level.gain.linearRampToValueAtTime(g, t);
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  return rotatedWav(loop.map((ch) => ch.map((v) => OUT_GAIN * v)), LOOP_S, start);
}
