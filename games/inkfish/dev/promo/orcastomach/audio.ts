import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { SOUNDS } from './script';
import { LOOP_S, QUIET_FROM, QUIET_TO } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it, one set a mood (script.ts lists them),
 * and a low hum of water. The voice's last words ("So yes,") run up to the
 * loop point, so the loop finishes its sentence. "but nobody knows how long it
 * took, either" was recorded about 7.5 dB under the rest of the take, so the
 * voice is ridden up across exactly those words.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.45;
/** The voice goes straight to the output; brought down so the whole mix, lifted by OUT_GAIN, peaks around -4 dB. */
const VOICE_GAIN = 0.7;
const OUT_GAIN = 1.34;
/** The lift across the quiet words: 6 dB, with 40 ms ramps. */
const RIDE_GAIN = 2;
const RAMP_S = 0.04;

/** The gain automation for the voice as [time, gain] breakpoints: a pure function of the word times. */
export function rideCurve(): readonly (readonly [number, number])[] {
  return [
    [0, VOICE_GAIN],
    [QUIET_FROM - RAMP_S, VOICE_GAIN],
    [QUIET_FROM, VOICE_GAIN * RIDE_GAIN],
    [QUIET_TO, VOICE_GAIN * RIDE_GAIN],
    [QUIET_TO + RAMP_S, VOICE_GAIN],
  ];
}

export async function renderOrcastomachAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const level = ctx.createGain();
  const [first, ...rest] = rideCurve();
  level.gain.setValueAtTime(first![1], first![0]);
  for (const [t, g] of rest) level.gain.linearRampToValueAtTime(g, t);
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
