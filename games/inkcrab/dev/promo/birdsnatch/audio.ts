import { foldLoop, offlineMix, RATE, rotatedWav, surf } from '../audioKit';
import { CUES, LOOP_S, loopOf } from './story';

/**
 * No voice: the game's own effects (hide, tok, out), the osprey's wing
 * beats and stoop as filtered noise, a clang on the shell, and a faint surf.
 * Rendered a few seconds past the loop and folded back onto its start, so
 * the stoop that begins before the loop point carries across it.
 */
const TAIL_S = 3;
const SURF_GAIN = 0.5;
/** Peak of the finished mix, -4 dB. */
const PEAK = 10 ** (-4 / 20);

function noiseBuffer(ctx: OfflineAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, RATE, RATE);
  const data = buffer.getChannelData(0);
  let seed = 2026;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = seed / 2 ** 31 - 1;
  }
  return buffer;
}

/** Band-passed noise whose band glides from `from` to `to` Hz, swelling to `peakAt` of its length. */
function sweep(ctx: OfflineAudioContext, out: AudioNode, noise: AudioBuffer, t: number, dur: number, from: number, to: number, gain: number, peakAt: number, q = 1.2): void {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = q;
  band.frequency.setValueAtTime(from, t);
  band.frequency.exponentialRampToValueAtTime(to, t + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + dur * peakAt);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(band).connect(env).connect(out);
  src.start(t, (t * 3.7) % 0.8);
  src.stop(t + dur + 0.05);
}

/** A struck piece of metal-ish ring: two partials decaying, over a dull thunk. */
function clang(ctx: OfflineAudioContext, out: AudioNode, t: number, gain: number): void {
  for (const [freq, len, g] of [[1180, 0.5, 1], [1910, 0.34, 0.6], [3140, 0.2, 0.35]] as const) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain * g, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0005, t + len);
    osc.connect(env).connect(out);
    osc.start(t);
    osc.stop(t + len + 0.05);
  }
  const thunk = ctx.createOscillator();
  thunk.type = 'sine';
  thunk.frequency.setValueAtTime(190, t);
  thunk.frequency.exponentialRampToValueAtTime(55, t + 0.16);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain * 1.6, t + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0005, t + 0.2);
  thunk.connect(env).connect(out);
  thunk.start(t);
  thunk.stop(t + 0.25);
}

export async function renderBirdSnatchAudio(start: number): Promise<Blob> {
  const { ctx, master, play } = offlineMix(LOOP_S + TAIL_S, 1);
  const noise = noiseBuffer(ctx);
  const at = (tau: number): number => loopOf(tau);
  // The osprey's wingbeats while it hangs over the crab (story time 1.3 .. 5.8), and flapping away after the strike.
  for (let tau = 0.5; tau < 5.8; tau += 0.31) sweep(ctx, master, noise, at(tau), 0.22, 420, 180, 0.22, 0.4, 0.8);
  for (let tau = 7.85; tau < 9.4; tau += 0.27) sweep(ctx, master, noise, at(tau), 0.2, 480, 200, 0.26 * (1 - (tau - 7.85) / 2), 0.4, 0.8);
  // The stoop: a rising rush that ends in the strike.
  sweep(ctx, master, noise, at(CUES.whoosh), 2.0, 380, 2600, 0.85, 0.93, 0.9);
  play('stoop', at(CUES.whoosh + 0.9), 1.1, 0.7);
  play('hide', at(CUES.hide), 1, 1.1);
  clang(ctx, master, at(CUES.tok), 0.55);
  play('tok', at(CUES.tok), 1, 1.6);
  sweep(ctx, master, noise, at(CUES.tok + 0.05), 0.9, 1800, 500, 0.5, 0.15, 0.7);
  play('out', at(CUES.out), 1.15, 1);
  play('grow', at(CUES.smug), 1.5, 0.6);
  const rendered = await ctx.startRendering();
  const loop = foldLoop(rendered, LOOP_S);
  const bed = surf(loop[0]!.length, 4);
  loop.forEach((ch, c) => ch.forEach((_, i) => { ch[i] = ch[i]! + bed[c]![i]! * SURF_GAIN * 0.4; }));
  const peak = loop.reduce((m, ch) => ch.reduce((a, v) => Math.max(a, Math.abs(v)), m), 0);
  const k = peak > 0 ? PEAK / peak : 1;
  return rotatedWav(loop.map((ch) => ch.map((v) => v * k)), LOOP_S, start);
}
