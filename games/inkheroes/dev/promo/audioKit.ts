import type { SfxId } from '../../src/audio/sound';
import { synthesize } from '../../src/audio/synth';

/**
 * Soundtrack tools for the promo shorts: InkHeroes's own synthesized effects
 * rendered offline, folded so the end flows into the start (every short
 * loops), the narrator straight to the output, and WAV encoding.
 */
export const RATE = 48000;

/** One effect at a moment of the loop, quiet under the voice. */
export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

export const cue = (id: SfxId, t: number, pitch = 1, gain = 0.5, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

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

/** Plays the narrator's take (an mp3 next to the short) from 0, straight to the output at `gain`. */
export async function addVoice(ctx: OfflineAudioContext, url: string, gain = 1): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const level = ctx.createGain();
  level.gain.value = gain;
  // Straight to the output: the effects' master gain is for their quiet synth levels.
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
}

/** Channels rotated to begin `start` seconds in (to match a video that starts there), as WAV. */
export function rotatedWav(channels: readonly Float32Array[], loopS: number, start: number): Blob {
  const offset = Math.round((((start % loopS) + loopS) % loopS) * RATE);
  return wavOf(channels.map((ch) => Float32Array.from({ length: ch.length }, (_, i) => ch[(i + offset) % ch.length]!)));
}

/** Every narrated short peaks here on the recording (the playbook's −4 dB). */
export const PEAK_DB = -4;
const TAIL_S = 2;

/**
 * A narrated short's soundtrack: the voice (from 0, straight to the output),
 * the game's effects quiet under it (`sfxGain`), folded into the loop and set
 * to peak at PEAK_DB. The voice's last word ends ~0.3 s before the loop point,
 * so the loop finishes the sentence.
 */
export async function renderNarrated(o: {
  readonly name: string;
  readonly loopS: number;
  readonly voiceUrl: string;
  readonly sounds: readonly SoundCue[];
  readonly sfxGain: number;
  readonly start: number;
}): Promise<Blob> {
  const { ctx, play } = offlineMix(o.loopS + TAIL_S, o.sfxGain);
  for (const c of o.sounds) play(c.id, c.t, c.pitch, c.gain, c.pan);
  await addVoice(ctx, o.voiceUrl);
  const loop = foldLoop(await ctx.startRendering(), o.loopS);
  const peak = Math.max(...loop.map((ch) => ch.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));
  if (peak <= 0) throw new Error(`${o.name}: silent soundtrack`);
  const target = 10 ** (PEAK_DB / 20);
  return rotatedWav(loop.map((ch) => ch.map((v) => (v * target) / peak)), o.loopS, o.start);
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
