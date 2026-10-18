import { RATE } from '../audioKit';
import { ramp } from '../short';
import { AT, LOOP_S, seam, wrap } from './story';

/**
 * The red sun's drone: a low, slightly beating chord under the forest and
 * the stars, quieter under the black leaf, silent on the bright page, back
 * on "Out there". Made sample by sample at the loop's length, every partial
 * a whole number of cycles a loop, so its end runs into its start.
 */

/** Partials (Hz, before rounding to whole cycles a loop) and their levels: a root, a dark minor third, a fifth, and a beating twin. */
const PARTIALS: readonly (readonly [number, number])[] = [[55, 1], [55.35, 0.7], [65.4, 0.35], [82.4, 0.45], [110, 0.18], [164.8, 0.06]];
const LEVEL = 0.07;

/** How loud the drone is at loop time t (0 .. 1). */
export function droneAt(t: number): number {
  const u = seam(t);
  const w = wrap(t);
  const forest = ramp(u, AT.outThere - LOOP_S - 0.4, AT.outThere - LOOP_S + 1.4) * (1 - ramp(u, AT.most + 0.6, AT.a + 0.3));
  const leaf = 0.35 * (ramp(w, AT.a - 0.2, AT.a + 0.8) - ramp(w, AT.nasa - 0.2, AT.nasa + 0.1));
  return Math.max(forest, Math.max(0, leaf));
}

export function droneBed(frames: number): Float32Array[] {
  const loopCycles = (hz: number): number => Math.round(hz * LOOP_S) / LOOP_S;
  const parts = PARTIALS.map(([hz, a]) => ({ w: 2 * Math.PI * loopCycles(hz), a }));
  // A slow swell in the drone itself, 3 times a loop.
  const breathe = (2 * Math.PI * 3) / LOOP_S;
  return [0, 1].map((c) => {
    const out = new Float32Array(frames);
    for (let i = 0; i < frames; i++) {
      const t = i / RATE;
      const env = droneAt(t);
      if (env <= 0) continue;
      let v = 0;
      parts.forEach((p, k) => {
        v += p.a * Math.sin(p.w * t + k * 1.3 + c * 0.4);
      });
      out[i] = LEVEL * env * (0.8 + 0.2 * Math.sin(breathe * t + c)) * v;
    }
    return out;
  });
}
