import { addVoice, foldLoop, offlineMix, RATE, rotatedWav, surf } from '../audioKit';
import { SOUNDS, type WaterCue, WATER_CUES } from './beats';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it (beats.ts lists them), the water the
 * raccoon works in (the game has no water sound, so it's made here the same
 * way the game makes its sounds: filtered noise and short pitch slides), and
 * the night surf. The voice's last words run up to the loop point, so the
 * loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const SURF_GAIN = 0.32;
/** The whole mix, lifted to peak around -3 dB. */
const OUT_GAIN = 1.65;

/** Shared white noise for the water. */
function noiseBuffer(ctx: OfflineAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, RATE, RATE);
  const data = buffer.getChannelData(0);
  let seed = 1986;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = seed / 2 ** 31 - 1;
  }
  return buffer;
}

/** A burst of band-passed noise: water slapping. */
function wash(ctx: OfflineAudioContext, out: AudioNode, noise: AudioBuffer, t: number, dur: number, freq: number, gain: number): void {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.setValueAtTime(freq, t);
  band.frequency.exponentialRampToValueAtTime(freq * 0.5, t + dur);
  band.Q.value = 1.4;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.01);
  env.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(band).connect(env).connect(out);
  src.start(t, (t * 7.3) % 0.8);
  src.stop(t + dur + 0.05);
}

/** A drop of water: a sine sliding up fast, the "bloop" of a bubble closing. */
function bloop(ctx: OfflineAudioContext, out: AudioNode, t: number, from: number, gain: number): void {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(from * 2.6, t + 0.07);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.006);
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + 0.12);
}

function playWater(ctx: OfflineAudioContext, out: AudioNode, noise: AudioBuffer, c: WaterCue): void {
  if (c.kind === 'dabble') {
    wash(ctx, out, noise, c.t, 0.14, 1700, 0.05 * c.gain);
    bloop(ctx, out, c.t + 0.03, 520 + (c.t * 97) % 160, 0.04 * c.gain);
  } else if (c.kind === 'splash') {
    wash(ctx, out, noise, c.t, 0.45, 2400, 0.22 * c.gain);
    wash(ctx, out, noise, c.t + 0.02, 0.25, 700, 0.18 * c.gain);
    bloop(ctx, out, c.t + 0.04, 380, 0.12 * c.gain);
    bloop(ctx, out, c.t + 0.13, 610, 0.07 * c.gain);
  } else {
    bloop(ctx, out, c.t, 440, 0.1 * c.gain);
    wash(ctx, out, noise, c.t, 0.18, 1500, 0.06 * c.gain);
  }
}

export async function renderRaccoonAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const water = ctx.createGain();
  water.gain.value = 1;
  const pan = ctx.createStereoPanner();
  pan.pan.value = 0.15;
  water.connect(pan).connect(ctx.destination);
  const noise = noiseBuffer(ctx);
  for (const c of WATER_CUES) playWater(ctx, water, noise, c);
  await addVoice(ctx, VOICE_URL);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const waves = surf(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + SURF_GAIN * waves[c]![i]!))), LOOP_S, start);
}
