import { synthesize } from '../../src/audio/synth';
import type { SfxId } from '../../src/audio/recipes';
import { CHAIN, LOOP_S, STAGE_S } from './chain';
import { BITE_SOUNDS } from './eating';
import { realTime } from './timing';

/**
 * The soundtrack, made with the game's own synthesized effects: each bite's
 * cues from eating.ts (alarm, rush of water, lunge, chomp, chews, bubbles),
 * deeper for the bigger fish of the chain.
 * Rendered offline a little past the loop, with the overflow folded back
 * onto the start, so the audio loops as seamlessly as the picture.
 */
const RATE = 48000;
const TAIL_S = 1.5;

/** The loop's soundtrack as WAV, rotated to begin `start` seconds in (to match a video that starts there). */
export async function renderAudio(start = 0): Promise<Blob> {
  const ctx = new OfflineAudioContext(2, Math.ceil((LOOP_S + TAIL_S) * RATE), RATE);
  const master = ctx.createGain();
  master.gain.value = 1.9;
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
  CHAIN.forEach((_, i) => {
    // Fish i is the eater of bite i; bigger fish sound deeper.
    const pitch = 1.35 - (i / (CHAIN.length - 1)) * 0.6;
    // Predators come in from alternating sides.
    const side = i % 2 === 0 ? -0.35 : 0.35;
    for (const cue of BITE_SOUNDS) {
      // A cue before the loop's start plays at its end instead, and folds round.
      // Cues are in story time; the bites play slowed down (timing.ts).
      const t = ((realTime(i + cue.age) * STAGE_S) % LOOP_S + LOOP_S) % LOOP_S;
      // The prey's alarm comes from the prey's side, the rest from the eater's.
      const pan = cue.id === 'spotted' ? -side * 0.6 : side * 0.5;
      play(cue.id, t, pitch * cue.pitch, cue.gain, pan);
    }
  });
  const rendered = await ctx.startRendering();
  const loop = foldLoop(rendered);
  const hum = ambience(loop[0]!.length);
  const offset = Math.round((((start % LOOP_S) + LOOP_S) % LOOP_S) * RATE);
  return wavOf(loop.map((ch, c) => {
    const mixed = ch.map((v, i) => v + hum[c]![i]!);
    return Float32Array.from({ length: mixed.length }, (_, i) => mixed[(i + offset) % mixed.length]!);
  }));
}

/**
 * A faint underwater hum: low-passed noise that breathes in and out. Built
 * directly at the loop's length, with the filter run round twice so its end
 * flows into its start: no click where the video loops.
 */
function ambience(frames: number): Float32Array[] {
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
    // Swells that repeat a whole number of times per loop.
    const twoPi = (2 * Math.PI) / frames;
    return out.map((v, i) => v * 0.35 * (0.75 + 0.25 * Math.sin(i * twoPi * CHAIN.length + c)));
  });
}

/** Adds everything past the loop's end back onto its start. */
function foldLoop(buffer: AudioBuffer): Float32Array[] {
  const loop = Math.round(LOOP_S * RATE);
  return Array.from({ length: buffer.numberOfChannels }, (_, c) => {
    const src = buffer.getChannelData(c);
    const out = src.slice(0, loop);
    for (let i = loop; i < src.length; i++) out[i - loop]! += src[i]!;
    return out;
  });
}

/** 16-bit PCM WAV. */
function wavOf(channels: readonly Float32Array[]): Blob {
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
