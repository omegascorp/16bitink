import type { SfxId } from '../../src/audio/recipes';
import { synthesize } from '../../src/audio/synth';

/**
 * Soundtrack tools for the promo shorts: InkSnake's own synthesized effects
 * (src/audio/synth.ts: the strike's hiss, the gulps, the slither…) rendered
 * offline, folded so the end flows into the start (every short loops), a
 * faint surf, the narrator, and WAV encoding. (InkMine's kit, on InkSnake's
 * sounds.)
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
    for (let i = loop; i < src.length; i++) out[i - loop]! += src[i]!;
    return out;
  });
}

/** Plays the narrator's take (an mp3 next to the short) from 0 at `gain`, straight to the output. */
export async function addVoice(ctx: OfflineAudioContext, url: string, gain = 1): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  // Straight to the output: the effects' master gain is for their quiet synth levels.
  const level = ctx.createGain();
  level.gain.value = gain;
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
}

/** Channels rotated to begin `start` seconds in (to match a video that starts there), as WAV. */
export function rotatedWav(channels: readonly Float32Array[], loopS: number, start: number): Blob {
  const offset = Math.round((((start % loopS) + loopS) % loopS) * RATE);
  return wavOf(channels.map((ch) => Float32Array.from({ length: ch.length }, (_, i) => ch[(i + offset) % ch.length]!)));
}

/**
 * A faint surf (or the hush of water): band-passed noise that washes in and
 * out `swells` times a loop. Built at the loop's length with the filters run
 * round twice, so its end flows into its start: no click where the video loops.
 */
export function surf(frames: number, swells: number): Float32Array[] {
  return [0, 1].map((c) => {
    let seed = 4711 + c * 91;
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
        lo += (noise[i]! - lo) * 0.06;
        lo2 += (lo - lo2) * 0.04;
        // Keep the hiss (lo - lo2 is the band between the two filters).
        out[i] = lo - lo2;
      }
    }
    const twoPi = (2 * Math.PI) / frames;
    return out.map((v, i) => {
      const wash = 0.5 + 0.5 * Math.sin(i * twoPi * swells + c * 0.6);
      return v * 0.5 * wash * wash;
    });
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
