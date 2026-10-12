import { synthesize } from './synth';
import type { SfxId } from './recipes';

/**
 * The game's synthesized effects rendered offline, for soundtracks: the
 * promo shorts and the clips players share. Folded so whatever rings on past
 * the end comes back in at the start: both loop.
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
