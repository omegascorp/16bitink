import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { SOUNDS } from './script';
import { LOOP_S } from './story';
import { TEMPO, WORDS } from './words';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it (script.ts lists them), and a low hum of
 * water. The voice's last word ("Because") runs up to the loop point, so the
 * loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.45;
/** Mark's take peaks near -4.2 dB: brought down a touch so the mix peaks around -4 dB with the effects. */
const VOICE_GAIN = 0.9;
/** The soft "Still… no kisses." came out 6.4 dB under the rest of the take: lifted about 5 dB (×1.78), with 40 ms ramps. */
export const QUIET_LIFT = 1.78;
export const RAMP_S = 0.04;
const wordAt = (text: string): { readonly start: number; readonly end: number } => {
  const w = WORDS.find((x) => x.text === text);
  if (!w) throw new Error(`"${text}" isn't in the voiceover`);
  return { start: w.start / TEMPO, end: w.end / TEMPO };
};
export const QUIET = { from: wordAt('Still…').start, to: wordAt('kisses.').end } as const;
/** The voice's level through the take: [time s, × VOICE_GAIN]. */
export const VOICE_RIDE: readonly (readonly [number, number])[] = [
  [0, 1], [QUIET.from - RAMP_S, 1], [QUIET.from, QUIET_LIFT], [QUIET.to, QUIET_LIFT], [QUIET.to + RAMP_S, 1],
];
/** The whole mix, lifted to peak around -4 dB. */
const OUT_GAIN = 1.12;

export async function renderSheepsheadAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  // Straight to the output (through its own gain): the effects' master gain is for their quiet synth levels.
  const level = ctx.createGain();
  level.gain.setValueAtTime(VOICE_GAIN, 0);
  for (const [t, k] of VOICE_RIDE) level.gain.linearRampToValueAtTime(VOICE_GAIN * k, t);
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
