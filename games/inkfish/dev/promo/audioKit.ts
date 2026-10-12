import { RATE } from '../../src/audio/offline';

/**
 * Soundtrack tools shared by the promo shorts: the game's synthesized
 * effects rendered offline, folded so the end flows into the start (every
 * short loops), a faint underwater hum, and WAV encoding.
 */
export { foldLoop, offlineMix, RATE } from '../../src/audio/offline';

/** Channels rotated to begin `start` seconds in (to match a video that starts there), as WAV. */
export function rotatedWav(channels: readonly Float32Array[], loopS: number, start: number): Blob {
  const offset = Math.round((((start % loopS) + loopS) % loopS) * RATE);
  return wavOf(channels.map((ch) => Float32Array.from({ length: ch.length }, (_, i) => ch[(i + offset) % ch.length]!)));
}

/**
 * A faint underwater hum: low-passed noise that breathes in and out. Built
 * directly at the loop's length, with the filter run round twice so its end
 * flows into its start: no click where the video loops.
 */
export function ambience(frames: number, swells: number): Float32Array[] {
  return [0, 1].map((c) => {
    let seed = 9001 + c * 77;
    const white = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 31 - 1;
    };
    const noise = Float32Array.from({ length: frames }, white);
    const out = new Float32Array(frames);
    let lo = 0;
    let lo2 = 0;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < frames; i++) {
        lo += (noise[i]! - lo) * 0.012;
        lo2 += (lo - lo2) * 0.02;
        out[i] = lo2;
      }
    }
    // `swells` swells, a whole number per loop.
    const twoPi = (2 * Math.PI) / frames;
    return out.map((v, i) => v * 0.35 * (0.75 + 0.25 * Math.sin(i * twoPi * swells + c)));
  });
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
