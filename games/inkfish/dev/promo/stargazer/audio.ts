import { ambience, foldLoop, offlineMix, RATE, rotatedWav } from '../audioKit';
import { HUSHES, SOUNDS, WHISTLE } from './script';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it (script.ts lists them, one set per mood),
 * two sounds the game doesn't have (a referee's whistle for the joke and a
 * hushed breath of water as the fish buries itself), and a low hum of water.
 * The voice's last word ("Remember,") runs up to the loop point, so the loop
 * finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.42;
/** Mark's take peaks near -4 dB; the nervous hook (to 2.1 s) sits about 3 dB under the rest. */
const VOICE_GAIN = 0.85;
/** The hook ridden up about 2.5 dB, back to level in the pause before "and eats". [time s, × VOICE_GAIN] */
const VOICE_RIDE: readonly (readonly [number, number])[] = [[0, 1.33], [1.8, 1.33], [2.1, 1], [LOOP_S, 1]];
/** The whole mix, set so the recorded video peaks around -4 dB. */
const OUT_GAIN = 1.1;

/** White noise, `seconds` long (fixed seed, so every render is the same). */
function noiseBuffer(ctx: OfflineAudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.ceil(seconds * RATE), RATE);
  const data = buf.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < data.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    data[i] = (s / 0x7fffffff) * 2 - 1;
  }
  return buf;
}

/** A pea whistle: a shrill tone trilled by the pea, "tweet-tweeet". */
function whistle(ctx: OfflineAudioContext, t: number, gain: number): void {
  const blasts: readonly (readonly [number, number])[] = [[0, 0.12], [0.18, 0.3]];
  for (const [at, len] of blasts) {
    const osc = ctx.createOscillator();
    osc.frequency.value = 2850;
    const trill = ctx.createOscillator();
    trill.type = 'square';
    trill.frequency.value = 32;
    const depth = ctx.createGain();
    depth.gain.value = 140;
    trill.connect(depth).connect(osc.frequency);
    const env = ctx.createGain();
    const s = t + at;
    env.gain.setValueAtTime(0, s);
    env.gain.linearRampToValueAtTime(gain, s + 0.015);
    env.gain.setValueAtTime(gain, s + len - 0.03);
    env.gain.linearRampToValueAtTime(0, s + len);
    osc.connect(env).connect(ctx.destination);
    osc.start(s);
    trill.start(s);
    osc.stop(s + len + 0.01);
    trill.stop(s + len + 0.01);
  }
}

/** A hushed breath of water: low noise swelling and fading. */
function hush(ctx: OfflineAudioContext, noise: AudioBuffer, t: number, dur: number, gain: number): void {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const low = ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 520;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + dur * 0.4);
  env.gain.linearRampToValueAtTime(0, t + dur);
  src.connect(low).connect(env).connect(ctx.destination);
  src.start(t);
  src.stop(t + dur + 0.01);
}

export async function renderStargazerAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  whistle(ctx, WHISTLE.t, WHISTLE.gain);
  const noise = noiseBuffer(ctx, 2);
  for (const h of HUSHES) hush(ctx, noise, h.t, h.dur, h.gain);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  // Straight to the output (through its own gain): the effects' master gain is for their quiet synth levels.
  const level = ctx.createGain();
  for (const [at, k] of VOICE_RIDE) level.gain.linearRampToValueAtTime(VOICE_GAIN * k, at);
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
