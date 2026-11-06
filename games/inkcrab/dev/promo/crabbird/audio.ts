import { foldLoop, offlineMix, RATE, rotatedWav } from '../audioKit';
import { clamp01 } from '../short';
import { AT, LOOP_S, MOVE_AT } from './story';

/**
 * The soundtrack, made the way the game makes its sounds (filtered noise and
 * short pitch slides): night insects, a soft sleeping breath, legs scratching
 * bark, the snap, the fall, then silence, then clicking claws; the game's own
 * effects for its last three seconds. No music. The whole mix is normalised
 * so the peak sits at -4 dB.
 */
const TAIL_S = 2;
const PEAK = 10 ** (-4 / 20);

/** White noise from a fixed seed, so every render is identical. */
function noiseBuffer(ctx: OfflineAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, RATE * 2, RATE);
  const data = buffer.getChannelData(0);
  let seed = 2016;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = seed / 2 ** 31 - 1;
  }
  return buffer;
}

interface Burst {
  readonly t: number;
  readonly dur: number;
  readonly freq: number;
  readonly gain: number;
  readonly q?: number;
  readonly type?: BiquadFilterType;
  readonly attack?: number;
  readonly pan?: number;
  /** Frequency at the end of the burst. */
  readonly to?: number;
}

/** A burst of filtered noise. */
function burst(ctx: OfflineAudioContext, out: AudioNode, noise: AudioBuffer, b: Burst): void {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = b.type ?? 'bandpass';
  f.frequency.setValueAtTime(b.freq, b.t);
  if (b.to) f.frequency.exponentialRampToValueAtTime(b.to, b.t + b.dur);
  f.Q.value = b.q ?? 1.2;
  const env = ctx.createGain();
  const attack = b.attack ?? 0.004;
  env.gain.setValueAtTime(0.0001, b.t);
  env.gain.exponentialRampToValueAtTime(b.gain, b.t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, b.t + b.dur);
  const pan = ctx.createStereoPanner();
  pan.pan.value = b.pan ?? 0;
  src.connect(f).connect(env).connect(pan).connect(out);
  src.start(b.t, (b.t * 3.7) % 1.8);
  src.stop(b.t + b.dur + 0.05);
}

/** A pitched thump or tick. */
function tone(ctx: OfflineAudioContext, out: AudioNode, t: number, from: number, to: number, dur: number, gain: number, type: OscillatorType = 'sine'): void {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Night insects: when they're out, from the loop's start to the snap and back in over the last wash. */
export const insectsAt = (t: number): number => (t < AT.snap ? 1 : clamp01((t - AT.wash) / (LOOP_S - AT.wash)));

/** A loop-long bed of cricket chirps and a high shimmer, gated by insectsAt. */
function insects(frames: number): Float32Array[] {
  return [0, 1].map((c) => {
    const out = new Float32Array(frames);
    let seed = 913 + c * 77;
    let lo = 0;
    for (let i = 0; i < frames; i++) {
      const t = i / RATE;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const white = seed / 2 ** 31 - 1;
      lo += (white - lo) * 0.5;
      const hiss = (white - lo) * 0.042;
      // Whole numbers of cycles per loop, so the chirps come round.
      const chirpRate = Math.round(LOOP_S * 2.2) / LOOP_S;
      const pulses = Math.max(0, Math.sin(2 * Math.PI * t * (Math.round(LOOP_S * 34) / LOOP_S)));
      const gate = Math.max(0, Math.sin(2 * Math.PI * t * chirpRate + c * 1.7)) ** 3;
      const cricket = Math.sin(2 * Math.PI * t * (Math.round(LOOP_S * (4300 + c * 180)) / LOOP_S)) * pulses * gate * 0.17;
      out[i] = (hiss + cricket) * insectsAt(t);
    }
    return out;
  });
}

export async function renderCrabbirdAudio(start = 0): Promise<Blob> {
  const { ctx, play, master } = offlineMix(LOOP_S + TAIL_S, 1);
  const noise = noiseBuffer(ctx);

  // Sleep: a slow breath, in and out, through the hook and the calm.
  for (let b = 0; b < 6; b++) {
    const t = 1.8 * b + 0.05;
    if (t < AT.snap - 0.3) {
      burst(ctx, master, noise, { t, dur: 0.85, freq: 620, to: 900, gain: 0.15, q: 0.7, attack: 0.3 });
      burst(ctx, master, noise, { t: t + 0.9, dur: 0.8, freq: 800, to: 460, gain: 0.115, q: 0.7, attack: 0.25 });
    }
  }
  // Legs on bark, quickening as the crab climbs, a dry scratch per footfall.
  for (let t = AT.reach + 0.1, i = 0; t < AT.climbEnd + 0.15; t += 0.19 - Math.min(0.06, i * 0.005), i++) {
    burst(ctx, master, noise, { t, dur: 0.075, freq: 2600 + (i % 4) * 460, gain: 0.24 + 0.014 * i, q: 2.4, pan: (i % 2 ? 0.4 : -0.3) });
    tone(ctx, master, t, 240 + (i % 3) * 40, 120, 0.05, 0.1, 'triangle');
  }
  // The claw winding up, a tiny creak.
  burst(ctx, master, noise, { t: AT.climbEnd + 0.05, dur: 0.38, freq: 1400, to: 3400, gain: 0.06, q: 6, attack: 0.3 });
  // The snap: a hard crack with a low body.
  burst(ctx, master, noise, { t: AT.snap, dur: 0.11, freq: 5200, gain: 0.36, q: 0.8, attack: 0.001 });
  burst(ctx, master, noise, { t: AT.snap, dur: 0.05, freq: 1800, gain: 0.28, q: 1.2, attack: 0.001 });
  tone(ctx, master, AT.snap, 240, 58, 0.24, 0.26);
  tone(ctx, master, AT.snap + 0.003, 1500, 300, 0.05, 0.12, 'square');
  // Wings: the frantic flap, then the air of the fall.
  for (let i = 0; i < 5; i++) burst(ctx, master, noise, { t: AT.snap + 0.2 + i * 0.1, dur: 0.1, freq: 1000, gain: 0.42, q: 0.8, attack: 0.02 });
  burst(ctx, master, noise, { t: AT.fall, dur: 0.9, freq: 700, to: 200, gain: 0.78, q: 0.7, attack: 0.3 });
  // It lands, then silence.
  tone(ctx, master, AT.ground, 130, 44, 0.3, 0.42);
  burst(ctx, master, noise, { t: AT.ground, dur: 0.2, freq: 420, gain: 0.3, q: 0.7, attack: 0.002 });
  // Clicking claws: one crab, then many, closing in.
  const clicks: readonly (readonly [number, number])[] = [
    [AT.firstEyes + 0.05, 0.42], [AT.firstEyes + 0.28, 0.36],
    ...Array.from({ length: 22 }, (_, i) => [AT.moreEyes + i * 0.098 + (i % 3) * 0.024, 0.2 + 0.014 * i] as const),
  ];
  clicks.forEach(([t, gain], i) => {
    const pan = Math.sin(i * 2.4) * 0.7;
    burst(ctx, master, noise, { t, dur: 0.03, freq: 3100 + (i % 5) * 620, gain, q: 5, attack: 0.001, pan });
    tone(ctx, master, t, 1500 + (i % 4) * 330, 700, 0.022, gain * 0.5, 'triangle');
  });
  // The game's own effects.
  for (const t of [11.0, 11.45, 11.9]) {
    play('eat', t, 1 + (t - 11) * 0.2, 1.1);
    play('grow', t + 0.05, 1 + (t - 11) * 0.3, 0.75);
  }
  play('movein', MOVE_AT, 1, 1.2);

  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const bed = insects(loop[0]!.length);
  const mixed = loop.map((ch, c) => ch.map((v, i) => v + bed[c]![i]!));
  const peak = mixed.reduce((m, ch) => ch.reduce((p, v) => Math.max(p, Math.abs(v)), m), 1e-6);
  return rotatedWav(mixed.map((ch) => ch.map((v) => (v * PEAK) / peak)), LOOP_S, start);
}

