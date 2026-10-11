import { foldLoop, offlineMix, RATE, rotatedWav } from '../audioKit';
import { ARRIVE_AT, counterMetres, darknessAt, LOOP_S, POP_AT, REWIND_FROM, ZONES } from './dive';

/**
 * The dive's soundtrack: the game's effects (a splash in, the counter's
 * pencil ticks, a chime on the snailfish, a rush of water back up, the
 * bubble's pop), a sonar ping at each new zone, and a hum that sinks lower
 * and darker the deeper the camera goes. Loops like the picture.
 */
const TAIL_S = 2;

/** The counter ticks each time it passes a round number: every 10 m near the top, coarser deeper. */
const tickStep = (m: number): number => (m < 200 ? 10 : m < 1000 ? 50 : 250);

/** When the counter first reaches each depth in `marks`, on the way down. */
function crossings(): { readonly ticks: number[]; readonly zones: number[] } {
  const ticks: number[] = [];
  const zones: number[] = [];
  let last = 0;
  let lastTick = -1;
  for (let t = 0; t <= ARRIVE_AT; t += 1 / 400) {
    const m = counterMetres(t);
    if (Math.floor(m / tickStep(m)) !== Math.floor(last / tickStep(m)) && t - lastTick > 0.07) {
      ticks.push(t);
      lastTick = t;
    }
    for (const z of ZONES) if (z.from > 0 && last < z.from && m >= z.from) zones.push(t);
    last = m;
  }
  return { ticks, zones };
}

/** A sonar ping with one echo. */
function ping(ctx: OfflineAudioContext, out: AudioNode, t: number): void {
  for (const [delay, gain] of [[0, 0.16], [0.42, 0.06]] as const) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1180;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t + delay);
    env.gain.exponentialRampToValueAtTime(gain, t + delay + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, t + delay + 1.5);
    osc.connect(env).connect(out);
    osc.start(t + delay);
    osc.stop(t + delay + 1.6);
  }
}

/** Low rumbling water that gets darker and louder with depth; the filter runs round twice so the end flows into the start. */
function hum(frames: number): Float32Array[] {
  const block = 256;
  const depthDark = Array.from({ length: Math.ceil(frames / block) }, (_, b) => darknessAt(counterMetres(((b * block) / RATE) % LOOP_S)));
  return [0, 1].map((c) => {
    let seed = 4001 + c * 91;
    const noise = Float32Array.from({ length: frames }, () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 31 - 1;
    });
    const out = new Float32Array(frames);
    let lo = 0;
    let lo2 = 0;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < frames; i++) {
        const dark = depthDark[Math.floor(i / block)]!;
        const k = 0.02 * (1 - dark) + 0.004;
        lo += (noise[i]! - lo) * k;
        lo2 += (lo - lo2) * k * 1.5;
        out[i] = lo2 * (0.35 + 0.9 * dark) * (2.2 - 1.6 * (1 - dark));
      }
    }
    return out;
  });
}

export async function renderDepthAudio(start = 0): Promise<Blob> {
  const { ctx, master, play } = offlineMix(LOOP_S + TAIL_S, 1.6);
  const { ticks, zones } = crossings();
  play('splash', 0.25, 0.8, 0.55);
  ticks.forEach((t, i) => play('click', t, 1, 0.14, i % 2 ? 0.15 : -0.15));
  zones.forEach((t) => ping(ctx, master, t));
  play('grow', ARRIVE_AT - 0.4, 0.75, 0.5);
  play('suck', REWIND_FROM - 0.1, 1.6, 0.55);
  play('dash', REWIND_FROM, 0.55, 0.8);
  play('dash', REWIND_FROM + 0.55, 0.9, 0.6);
  play('drop', POP_AT, 1, 0.5);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const rumble = hum(loop[0]!.length);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => v + rumble[c]![i]!)), LOOP_S, start);
}
