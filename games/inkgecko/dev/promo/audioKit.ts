import type { SfxId } from '../../src/audio/recipes';
import { synthesize } from '../../src/audio/synth';

/**
 * Soundtrack tools for the promo shorts: the game's own synthesized effects
 * (audio/synth.ts) rendered offline, folded so the end flows into the start
 * (every short loops), the game's bed under them (a breath of wind and the
 * low roll of marbles in their groove, audio/ambience.ts) built to loop
 * without a seam, and WAV encoding.
 */
export const RATE = 48000;

/** A context `seconds` long with a master gain into the destination, and a player for the game's effects. */
export function offlineMix(seconds: number, masterGain: number): {
  readonly ctx: OfflineAudioContext;
  readonly master: GainNode;
  readonly play: (id: SfxId, t: number, pitch: number, gain?: number, pan?: number) => void;
} {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * RATE), RATE);
  const master = ctx.createGain();
  master.gain.value = masterGain;
  master.connect(ctx.destination);
  const play = (id: SfxId, t: number, pitch: number, gain = 1, pan = 0): void => {
    const level = ctx.createGain();
    level.gain.value = gain;
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    level.connect(panner).connect(master);
    // The offline context has every node factory the synth uses.
    synthesize(id, { ctx: ctx as unknown as AudioContext, out: level, t, pitch });
  };
  return { ctx, master, play };
}

/** Adds everything past the loop's end (`loopS` seconds) back onto its start. */
export function foldLoop(buffer: AudioBuffer, loopS: number): Float32Array[] {
  const loop = Math.round(loopS * RATE);
  return Array.from({ length: buffer.numberOfChannels }, (_, c) => {
    const src = buffer.getChannelData(c);
    const out = src.slice(0, loop);
    for (let i = loop; i < src.length; i++) out[(i - loop) % loop]! += src[i]!;
    return out;
  });
}

/** Seeded white noise, the same every render. */
function noiseOf(frames: number, seed: number): Float32Array {
  let s = seed >>> 0;
  return Float32Array.from({ length: frames }, () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 31 - 1;
  });
}

/** A one-pole low-pass run round the loop twice, so its end flows into its start. */
function lowpassLoop(x: Float32Array, k: number): Float32Array {
  const out = new Float32Array(x.length);
  let y = 0;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < x.length; i++) {
      y += (x[i]! - y) * k;
      out[i] = y;
    }
  }
  return out;
}

/**
 * The game's bed under its effects, `frames` long and seamless round the
 * loop: wind in the leaves (band-passed noise swelling `swells` times a loop,
 * Ambience.wind), and the marbles' low roll in their groove with a faint
 * glassy clatter (Ambience.rumble), as loud as `roll(u)` says at each point u
 * (0..1) of the loop.
 */
export function bed(frames: number, swells: number, roll: (u: number) => number, wind = 1): Float32Array[] {
  return [0, 1].map((c) => {
    const white = noiseOf(frames, 4711 + c * 91);
    const lo = lowpassLoop(white, 0.06);
    const lo2 = lowpassLoop(lo, 0.04);
    const deep = lowpassLoop(white, 0.042);
    const deep2 = lowpassLoop(deep, 0.042);
    const hiss = lowpassLoop(white, 0.32);
    const twoPi = (2 * Math.PI) / frames;
    const out = new Float32Array(frames);
    for (let i = 0; i < frames; i++) {
      const u = i / frames;
      const sway = 0.55 + 0.45 * Math.sin(i * twoPi * swells + c * 0.6);
      const breeze = (lo[i]! - lo2[i]!) * 0.5 * sway * wind;
      const r = roll(u);
      // The roll: low rumble, and a clatter that flutters 13 times a second (a whole number of times a loop).
      const flutter = 0.8 + 0.2 * Math.sin(i * twoPi * Math.round((13 * frames) / RATE));
      const clatter = (hiss[i]! - lo[i]!) * 0.06 * flutter;
      out[i] = breeze + r * (deep2[i]! * 2.2 + clatter);
    }
    return out;
  });
}

/** Adds `b` (scaled by `gain`) onto `a`, channel by channel. */
export function mixInto(a: Float32Array[], b: readonly Float32Array[], gain = 1): void {
  a.forEach((ch, c) => {
    const src = b[c]!;
    for (let i = 0; i < ch.length; i++) ch[i]! += src[i % src.length]! * gain;
  });
}

/** Scales the channels so their loudest sample peaks at `dB` below full scale (the shorts peak about −4 dB). */
export function peakTo(channels: Float32Array[], dB: number): void {
  let peak = 0;
  for (const ch of channels) for (const v of ch) peak = Math.max(peak, Math.abs(v));
  if (peak <= 0) return;
  const k = 10 ** (dB / 20) / peak;
  for (const ch of channels) for (let i = 0; i < ch.length; i++) ch[i]! *= k;
}

/** Channels rotated to begin `start` seconds in (to match a video that starts there), as WAV. */
export function rotatedWav(channels: readonly Float32Array[], loopS: number, start: number): Blob {
  const offset = Math.round((((start % loopS) + loopS) % loopS) * RATE);
  return wavOf(channels.map((ch) => Float32Array.from({ length: ch.length }, (_, i) => ch[(i + offset) % ch.length]!)));
}

/** 16-bit PCM WAV. */
export function wavOf(channels: readonly Float32Array[]): Blob {
  const frames = channels[0]!.length;
  const bytes = 44 + frames * channels.length * 2;
  const view = new DataView(new ArrayBuffer(bytes));
  const text = (at: number, s: string): void => [...s].forEach((ch, i) => view.setUint8(at + i, ch.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, bytes - 8, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels.length, true);
  view.setUint32(24, RATE, true);
  view.setUint32(28, RATE * channels.length * 2, true);
  view.setUint16(32, channels.length * 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, frames * channels.length * 2, true);
  let at = 44;
  for (let i = 0; i < frames; i++) {
    for (const ch of channels) {
      view.setInt16(at, Math.round(Math.max(-1, Math.min(1, ch[i]!)) * 32767), true);
      at += 2;
    }
  }
  return new Blob([view.buffer], { type: 'audio/wav' });
}
