import { foldLoop, offlineMix, RATE, rotatedWav } from '../audioKit';
import { window01 } from '../short';
import { SHUTTERS, SOUNDS } from './script';
import { CUTS, LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it, one set a mood (script.ts lists them),
 * a camera shutter made here (two quick clicks of filtered noise), and wind
 * high in the sky, softer over the beach. The voice's last word ("because")
 * runs up to the loop point, so the loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
/** The voice goes straight to the output; brought down so the whole mix, lifted by OUT_GAIN, peaks around -4 dB. */
const VOICE_GAIN = 0.7;
const OUT_GAIN = 1.24;
const WIND_GAIN = 0.11;
const SHUTTER_GAIN = 0.32;

/** A camera shutter at `at`: a sharp click as it opens, another as it closes. */
function shutter(ctx: OfflineAudioContext, at: number): void {
  const len = Math.round(0.03 * RATE);
  const buffer = ctx.createBuffer(1, len, RATE);
  const data = buffer.getChannelData(0);
  let seed = 31337;
  for (let i = 0; i < len; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = (seed / 2 ** 31 - 1) * Math.exp(-i / (0.006 * RATE));
  }
  for (const [dt, freq, gain] of [[0, 3200, 1], [0.075, 2400, 0.8]] as const) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = freq;
    band.Q.value = 1.4;
    const level = ctx.createGain();
    level.gain.value = SHUTTER_GAIN * gain;
    src.connect(band).connect(level).connect(ctx.destination);
    src.start(at + dt);
  }
}

/**
 * Wind: noise through a soft band-pass that gusts, built at the loop's length
 * and run round twice so its end flows into its start.
 */
function wind(frames: number): Float32Array[] {
  return [0, 1].map((c) => {
    let seed = 5150 + c * 91;
    const white = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 31 - 1;
    };
    const noise = Float32Array.from({ length: frames }, white);
    const out = new Float32Array(frames);
    let lo = 0;
    let lo2 = 0;
    let hi = 0;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < frames; i++) {
        lo += (noise[i]! - lo) * 0.06;
        lo2 += (lo - lo2) * 0.08;
        hi += (lo2 - hi) * 0.004;
        out[i] = lo2 - hi;
      }
    }
    const twoPi = (2 * Math.PI) / frames;
    return out.map((v, i) => {
      const t = i / RATE;
      // Softer while the wide shot shows the beach far below.
      const low = 1 - 0.6 * window01(t, CUTS.wide, CUTS.zoom + 0.6, 0.3);
      const gust = 0.65 + 0.35 * Math.sin(i * twoPi * 5 + c) * Math.sin(i * twoPi * 3 + 1.3);
      return v * gust * low;
    });
  });
}

export async function renderOspreySharkAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  for (const at of SHUTTERS) shutter(ctx, at);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const level = ctx.createGain();
  level.gain.value = VOICE_GAIN;
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const air = wind(loop[0]!.length);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + WIND_GAIN * air[c]![i]!))), LOOP_S, start);
}
