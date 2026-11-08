import { addVoice, foldLoop, offlineMix, RATE, rotatedWav, surf } from '../audioKit';
import { AT, LOOP_S, said } from './story';

/**
 * The soundtrack: the narrator (voice.mp3, starting with the loop) straight to
 * the output, with the marsh under him: lapping shallows the whole way round,
 * wading splashes, the stab, the poke, the heron's harsh "quok" squawks, the
 * two pinches of the claws, frantic wing flaps, the crab's splash, and the
 * game's own sounds for the score and for the invitation (the crab hiding in
 * its shell). No music. The whole mix is normalised so the peak sits at -4 dB.
 */
const TAIL_S = 2;
const PEAK = 10 ** (-4 / 20);
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
/** The effects' level under the voice. */
const UNDER_VOICE = 0.42;
/** The marsh water bed, relative to the effects. */
const BED = 0.55;

function noiseBuffer(ctx: OfflineAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, RATE * 2, RATE);
  const data = buffer.getChannelData(0);
  let seed = 2012;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = seed / 2 ** 31 - 1;
  }
  return buffer;
}

interface Burst {
  readonly t: number;
  readonly dur: number;
  readonly freq: number;
  readonly gain: number;
  readonly q?: number;
  readonly type?: BiquadFilterType;
  readonly attack?: number;
  readonly pan?: number;
  readonly to?: number;
}

function burst(ctx: OfflineAudioContext, out: AudioNode, noise: AudioBuffer, b: Burst): void {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = b.type ?? 'bandpass';
  f.frequency.setValueAtTime(b.freq, b.t);
  if (b.to) f.frequency.exponentialRampToValueAtTime(b.to, b.t + b.dur);
  f.Q.value = b.q ?? 1.2;
  const env = ctx.createGain();
  const attack = b.attack ?? 0.004;
  env.gain.setValueAtTime(0.0001, b.t);
  env.gain.exponentialRampToValueAtTime(b.gain, b.t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, b.t + b.dur);
  const pan = ctx.createStereoPanner();
  pan.pan.value = b.pan ?? 0;
  src.connect(f).connect(env).connect(pan).connect(out);
  src.start(b.t, (b.t * 3.7) % 1.8);
  src.stop(b.t + b.dur + 0.05);
}

function tone(ctx: OfflineAudioContext, out: AudioNode, t: number, from: number, to: number, dur: number, gain: number, type: OscillatorType = 'sine'): void {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** A night heron's harsh "quok!": a buzzy falling call through a nasal band. */
function squawk(ctx: OfflineAudioContext, out: AudioNode, noise: AudioBuffer, t: number, gain: number, dur = 0.2): void {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(820, t);
  osc.frequency.exponentialRampToValueAtTime(430, t + dur);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1300;
  f.Q.value = 2.2;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  env.gain.setValueAtTime(gain, t + dur * 0.5);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(f).connect(env).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
  burst(ctx, out, noise, { t, dur: dur * 0.8, freq: 2400, gain: gain * 0.5, q: 1.5 });
}

/** A claw pinching shut: a hard click with a crunch under it. */
function pinch(ctx: OfflineAudioContext, out: AudioNode, noise: AudioBuffer, t: number, gain: number, pan: number): void {
  burst(ctx, out, noise, { t, dur: 0.05, freq: 4200, gain, q: 1, attack: 0.001, pan });
  burst(ctx, out, noise, { t: t + 0.01, dur: 0.09, freq: 1500, gain: gain * 0.7, q: 1.4, attack: 0.001, pan });
  tone(ctx, out, t, 900, 260, 0.06, gain * 0.4, 'square');
}

/** One wing beat: a soft whump of air. */
function flap(ctx: OfflineAudioContext, out: AudioNode, noise: AudioBuffer, t: number, gain: number, pan = 0): void {
  burst(ctx, out, noise, { t, dur: 0.13, freq: 700, to: 300, gain, q: 0.7, attack: 0.03, pan });
}

/** Water: a splash of `size` 0 .. 1. */
function splash(ctx: OfflineAudioContext, out: AudioNode, noise: AudioBuffer, t: number, size: number, pan = 0): void {
  burst(ctx, out, noise, { t, dur: 0.18 + 0.3 * size, freq: 2200, to: 900, gain: 0.25 + 0.45 * size, q: 0.8, attack: 0.004, pan });
  burst(ctx, out, noise, { t: t + 0.03, dur: 0.12 + 0.2 * size, freq: 600, gain: 0.2 + 0.3 * size, q: 0.9, pan });
  for (let i = 0; i < 4; i++) tone(ctx, out, t + 0.05 + i * 0.05, 1200 + i * 340, 2200 + i * 300, 0.04, 0.05 * size + 0.02, 'sine');
}

export async function renderHeronCrabAudio(start = 0): Promise<Blob> {
  const { ctx, master, play } = offlineMix(LOOP_S + TAIL_S, UNDER_VOICE);
  const noise = noiseBuffer(ctx);

  // The hook: a choked squawk round the clamped bill, the crab's claws creaking.
  squawk(ctx, master, noise, 0.32, 0.22, 0.16);
  burst(ctx, master, noise, { t: 0.9, dur: 0.3, freq: 1600, to: 3200, gain: 0.08, q: 6, attack: 0.2 });
  for (let i = 0; i < 3; i++) flap(ctx, master, noise, 1.25 + i * 0.12, 0.3, -0.3);
  // Wading: slow careful steps in the shallows, then still.
  for (let t = AT.hookOut + 0.35; t < AT.spots + 0.1; t += 0.48) splash(ctx, master, noise, t, 0.18, -0.3);
  // The strike: a whoosh, the bill into water.
  play('stoop', AT.strike - 0.06, 1.3, 0.7);
  splash(ctx, master, noise, AT.strike + 0.08, 0.7, 0.2);
  // The poke in the eye: a dry tok, a squawk on "EYE!".
  play('knock', AT.poke + 0.02, 1.4, 1);
  pinch(ctx, master, noise, AT.poke + 0.02, 0.35, 0.2);
  squawk(ctx, master, noise, AT.poke + 0.12, 0.3, 0.14);
  squawk(ctx, master, noise, AT.eye, 0.42, 0.24);
  // Jumped back, wings up: big flaps and a splash; the stand-off flutters.
  for (let i = 0; i < 5; i++) flap(ctx, master, noise, AT.poke + 0.18 + i * 0.1, 0.55 - i * 0.05, -0.2);
  splash(ctx, master, noise, AT.eye + 0.05, 0.5, -0.3);
  for (let i = 0; i < 4; i++) flap(ctx, master, noise, AT.standoff + i * 0.16, 0.22, -0.2);
  // The second try, both claws clamping shut on their words.
  play('stoop', AT.strike2 - 0.04, 1.5, 0.6);
  splash(ctx, master, noise, AT.close + 0.02, 0.45, 0.2);
  pinch(ctx, master, noise, AT.clamp1, 0.6, -0.15);
  pinch(ctx, master, noise, AT.clamp2, 0.6, 0.15);
  squawk(ctx, master, noise, AT.clamp2 + 0.12, 0.26, 0.12);
  // Lifted out: water running off.
  for (let i = 0; i < 8; i++) tone(ctx, master, AT.lift + i * 0.11, 1500 + (i % 3) * 400, 2600, 0.035, 0.05, 'sine');
  // The shake: flailing wings, choked squawks.
  for (let t = AT.shake + 0.05, i = 0; t < AT.drop; t += 0.11, i++) flap(ctx, master, noise, t, 0.4, i % 2 ? 0.4 : -0.4);
  squawk(ctx, master, noise, AT.shake + 0.3, 0.3, 0.14);
  squawk(ctx, master, noise, AT.shake + 0.75, 0.3, 0.12);
  // Let go: the crab hits the water; the heron beats away, fading.
  splash(ctx, master, noise, AT.after + 0.05, 1, 0.1);
  for (let i = 0; i < 9; i++) flap(ctx, master, noise, AT.after + 0.08 + i * 0.185, 0.6 * (1 - i / 10), 0.2 + i * 0.07);
  squawk(ctx, master, noise, said('off.') + 0.1, 0.12, 0.18);
  // The score: a bright win for the crab, a flat note for the heron.
  play('win', AT.one + 0.05, 1, 0.45);
  play('lose', AT.zero + 0.05, 1, 0.4);
  // The invitation: the card's crab ducks into its shell.
  play('hide', AT.ctaStart + 0.95, 1, 0.8);
  await addVoice(ctx, VOICE_URL);

  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  // The lapping shallows, seamless across the loop point.
  const bed = surf(loop[0]!.length, 4);
  const mixed = loop.map((ch, c) => ch.map((v, i) => v + UNDER_VOICE * BED * bed[c]![i]!));
  const peak = mixed.reduce((m, ch) => ch.reduce((p, v) => Math.max(p, Math.abs(v)), m), 1e-6);
  return rotatedWav(mixed.map((ch) => ch.map((v) => (v * PEAK) / peak)), LOOP_S, start);
}
