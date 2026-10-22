import { ambience, foldLoop, offlineMix, RATE, rotatedWav } from '../audioKit';
import { AND_AT, DROP_AT, EVERY_AT, GULF_AT, LOOP_S, SEA_AT, SKY_AT, SO_AT } from './beats';
import { SOUNDS } from './script';
import { BOLTS, rainAt } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it (script.ts lists them, one set per
 * mood), and three made here: rain hissing whenever it rains in the picture,
 * thunder rolling after each bolt of lightning, and birdsong (soft twitters
 * for the flock at sunset, frantic cheeps from the birds in trouble). A low
 * hum of the sea under it all. The voice's last words ("So yes,") run up to
 * the loop point, so the loop finishes its sentence.
 */
const TAIL_S = 3;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const VOICE_GAIN = 0.72;
/** The voice's level through the loop (time, multiple of VOICE_GAIN), ramped in the pauses between sentences. */
const VOICE_RIDE: readonly (readonly [number, number])[] = [
  [0, 1], [2.6, 1], [2.95, 1.8], [6.45, 1.8], [6.85, 1.3], [9.5, 1.3], [9.9, 1],
];
const HUM_GAIN = 0.4;
const RAIN_GAIN = 0.05;
const THUNDER_GAIN = 0.32;
/** The whole mix, set so the recorded video peaks around -4 dB. */
const OUT_GAIN = 1.12;

/** A little deterministic noise source. */
function noise(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 31 - 1;
  };
}

/** Rain: bright noise (white less its low end), its loudness following the rain in the picture; run round twice so it loops without a click. */
function rain(frames: number): Float32Array[] {
  return [0, 1].map((c) => {
    const white = noise(7001 + c * 31);
    const src = Float32Array.from({ length: frames }, white);
    const out = new Float32Array(frames);
    let lo = 0;
    let hi = 0;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < frames; i++) {
        lo += (src[i]! - lo) * 0.08;
        hi += (src[i]! - lo - hi) * 0.5;
        out[i] = hi;
      }
    }
    return out.map((v, i) => v * RAIN_GAIN * rainAt(i / RATE) * (0.85 + 0.15 * Math.sin((i / frames) * Math.PI * 2 * 17 + c)));
  });
}

/** Thunder after each bolt: a crack, then low rolling noise dying away, wrapped round the loop. */
function thunder(frames: number): Float32Array[] {
  const out = [new Float32Array(frames), new Float32Array(frames)];
  BOLTS.forEach((bolt, k) => {
    const start = Math.round(bolt.t * RATE);
    const len = Math.round(3.2 * RATE);
    for (let c = 0; c < 2; c++) {
      const white = noise(9100 + k * 17 + c * 5);
      let lo = 0;
      let lo2 = 0;
      for (let i = 0; i < len; i++) {
        const s = i / RATE;
        const w = white();
        lo += (w - lo) * 0.02;
        lo2 += (lo - lo2) * 0.05;
        const crack = s < 0.12 ? w * (1 - s / 0.12) * 0.35 : 0;
        const roll = lo2 * 6 * Math.min(1, s / 0.05) * Math.exp(-s * 1.3) * (0.7 + 0.3 * Math.sin(s * 9 + c));
        out[c]![(start + i) % frames]! += THUNDER_GAIN * (crack + roll);
      }
    }
  });
  return out;
}

/** One cheep: a quick whistle sweeping `from` → `to` Hz. */
function cheep(ctx: OfflineAudioContext, t: number, from: number, to: number, dur: number, gain: number, pan: number): void {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  const level = ctx.createGain();
  level.gain.setValueAtTime(0, t);
  level.gain.linearRampToValueAtTime(gain, t + dur * 0.2);
  level.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const panner = ctx.createStereoPanner();
  panner.pan.value = pan;
  osc.connect(level).connect(panner).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Birdsong: soft twitters while the flock flies, frantic cheeps for the bird in the hook and the ones the storm knocks down. */
function birdsong(ctx: OfflineAudioContext): void {
  const rnd = noise(4242);
  const r = (): number => (rnd() + 1) / 2;
  // The flock at sunset: little two- and three-note twitters, here and there.
  for (let t = EVERY_AT - 0.2; t < GULF_AT + 0.9; t += 0.18 + r() * 0.3) {
    const notes = 2 + Math.floor(r() * 2);
    const base = 3600 + r() * 1800;
    const pan = r() * 1.6 - 0.8;
    for (let n = 0; n < notes; n++) cheep(ctx, t + n * 0.07, base * (1 + 0.12 * n), base * (1.25 + 0.1 * n), 0.055, 0.016, pan);
  }
  // Frantic: the bird in the hook (round the seam) and the birds falling in the storm.
  const frantic = (from: number, to: number, gain: number): void => {
    for (let t = from; t < to; t += 0.11 + r() * 0.12) {
      const base = 4200 + r() * 1500;
      cheep(ctx, t, base * 1.3, base * 0.8, 0.07, gain, 0.2 + r() * 0.3);
    }
  };
  frantic(SO_AT + 0.3, LOOP_S, 0.022);
  frantic(0.02, SKY_AT, 0.02);
  frantic(AND_AT + 0.5, DROP_AT + 0.4, 0.016);
  frantic(DROP_AT + 0.4, SEA_AT, 0.02);
}

export async function renderTigerSharkAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  birdsong(ctx);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  // Straight to the output: the effects' master gain is for their quiet synth levels.
  const level = ctx.createGain();
  // The soft lines ("Every autumn…" whispered, "and when a storm hits…" nervous) came out quieter: ridden up in the gaps before them.
  for (const [t, k] of VOICE_RIDE) level.gain.linearRampToValueAtTime(VOICE_GAIN * k, t);
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const frames = loop[0]!.length;
  const hum = ambience(frames, 3);
  const wet = rain(frames);
  const boom = thunder(frames);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]! + wet[c]![i]! + boom[c]![i]!))), LOOP_S, start);
}

