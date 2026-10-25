import { ambience, foldLoop, offlineMix, RATE, rotatedWav } from '../audioKit';
import { SOUNDS } from './script';
import { BAD_AT, CUTS, LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it (script.ts lists them), a muffled hum of
 * visitors in the aquarium's gallery while we look through the glass, and a
 * low hum of water. The voice's last words ("So yes,") run up to the loop
 * point, so the loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.45;
/** Mark's take peaks near -2 dB: brought down to about -6 dB, where the narrated shorts' voices sit against their effects. */
const VOICE_GAIN = 0.62;
/** The gallery's murmur, under everything. */
const CROWD_GAIN = 0.05;
/** The whole mix, lifted to peak around -4 dB. */
const OUT_GAIN = 1.52;

/**
 * A crowd heard through glass: a few voices of low-passed noise, each
 * babbling in syllables at its own pace, all muffled, faded in at the cut to
 * the tank and out at "Bad idea".
 */
function crowd(frames: number): Float32Array[] {
  const from = CUTS[1]!.at;
  const to = BAD_AT - 0.05;
  return [0, 1].map((c) => {
    let seed = 4242 + c * 101;
    const white = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 31 - 1;
    };
    const out = new Float32Array(frames);
    const voices = Array.from({ length: 5 }, (_, v) => ({ rate: 3.2 + v * 0.7 + c * 0.3, phase: v * 1.7 + c, lo: 0, lo2: 0, hi: 0, k: 0.05 + v * 0.012 }));
    for (let i = 0; i < frames; i++) {
      const t = i / RATE;
      const env = Math.min(1, Math.max(0, (t - from) / 0.25), Math.max(0, (to - t) / 0.25));
      if (env <= 0) continue;
      let s = 0;
      for (const v of voices) {
        const n = white();
        // A band of speech-ish noise: low-passed twice, the lowest rumble taken out.
        v.lo += (n - v.lo) * v.k;
        v.lo2 += (v.lo - v.lo2) * v.k;
        v.hi += (v.lo2 - v.hi) * 0.004;
        const syllable = Math.max(0, Math.sin(2 * Math.PI * v.rate * t + v.phase) * 0.7 + 0.3 * Math.sin(2 * Math.PI * v.rate * 0.37 * t + v.phase * 2));
        s += (v.lo2 - v.hi) * syllable;
      }
      out[i] = s * env;
    }
    return out;
  });
}

export async function renderOctopusAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
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
  const frames = loop[0]!.length;
  const hum = ambience(frames, 3);
  const murmur = crowd(frames);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]! + CROWD_GAIN * 8 * murmur[c]![i]!))), LOOP_S, start);
}
