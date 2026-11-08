/**
 * Soundtrack tools for the promo short: the offline mix is folded so the end
 * flows into the start (the short loops), scaled to a peak, and encoded as WAV.
 */
export const RATE = 48000;

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
