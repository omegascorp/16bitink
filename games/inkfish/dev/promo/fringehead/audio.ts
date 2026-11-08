import type { SfxId } from '../../../src/audio/recipes';
import { ambience, foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { type CustomSfx, SOUNDS } from './script';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, starting with the loop),
 * the game's effects quiet under it plus four made here (script.ts lists
 * them all), and a low hum of water. The voice's last words ("So yes,") run
 * up to the loop point, so the loop finishes its sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const HUM_GAIN = 0.45;
/** Mark's take, brought down to where the narrated shorts' voices sit against their effects. */
const VOICE_GAIN = 0.62;
/** The whole mix, lifted to peak around -4 dB. */
const OUT_GAIN = 1.36;

const CUSTOM: ReadonlySet<string> = new Set<CustomSfx>(['whine', 'boing', 'rubber', 'deflate']);

/** A gain envelope into `out`: up to `peak` over `attack`, down to silence by `end`. */
function envelope(ctx: BaseAudioContext, out: AudioNode, t: number, attack: number, end: number, peak: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + end);
  g.connect(out);
  return g;
}

/** An oscillator whose pitch wobbles at `rate` Hz by `depth` Hz (the wobble's depth can be ramped by the caller). */
function wobbly(ctx: BaseAudioContext, type: OscillatorType, t: number, end: number, rate: number, depth: number): { osc: OscillatorNode; wobble: GainNode } {
  const osc = ctx.createOscillator();
  osc.type = type;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = rate;
  const wobble = ctx.createGain();
  wobble.gain.setValueAtTime(depth, t);
  lfo.connect(wobble).connect(osc.frequency);
  lfo.start(t);
  lfo.stop(t + end + 0.05);
  osc.start(t);
  osc.stop(t + end + 0.05);
  return { osc, wobble };
}

/** The four effects made here, into `out` (the effects' master). */
function playCustom(ctx: BaseAudioContext, out: AudioNode, id: CustomSfx, t: number, gain: number, dur = 1): void {
  const level = ctx.createGain();
  level.gain.value = gain;
  level.connect(out);
  if (id === 'whine') {
    // Tension: a thin tone rising and tightening its vibrato, then cut dead.
    const { osc, wobble } = wobbly(ctx, 'sawtooth', t, dur, 6, 6);
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(980, t + dur);
    wobble.gain.linearRampToValueAtTime(22, t + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + dur * 0.9);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.03);
    osc.connect(lp).connect(g).connect(level);
    return;
  }
  if (id === 'boing') {
    // A sitcom spring: a sliding tone that wobbles fast and settles.
    const { osc, wobble } = wobbly(ctx, 'sine', t, 0.7, 17, 110);
    osc.frequency.setValueAtTime(170, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.6);
    wobble.gain.exponentialRampToValueAtTime(4, t + 0.65);
    osc.connect(envelope(ctx, level, t, 0.008, 0.7, 0.45));
    const { osc: o2 } = wobbly(ctx, 'triangle', t, 0.5, 17, 220);
    o2.frequency.setValueAtTime(340, t);
    o2.frequency.exponentialRampToValueAtTime(600, t + 0.5);
    o2.connect(envelope(ctx, level, t, 0.008, 0.5, 0.12));
    return;
  }
  if (id === 'rubber') {
    // A rubbery flare: a quick wobbling stretch upwards.
    const { osc } = wobbly(ctx, 'triangle', t, 0.3, 28, 35);
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.22);
    osc.connect(envelope(ctx, level, t, 0.02, 0.3, 0.35));
    return;
  }
  // Deflate: a sagging, buzzing raspberry.
  const { osc } = wobbly(ctx, 'sawtooth', t, 0.75, 19, 30);
  osc.frequency.setValueAtTime(420, t);
  osc.frequency.exponentialRampToValueAtTime(90, t + 0.7);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(1800, t);
  lp.frequency.exponentialRampToValueAtTime(400, t + 0.7);
  osc.connect(lp).connect(envelope(ctx, level, t, 0.03, 0.75, 0.22));
}

export async function renderFringeheadAudio(start = 0): Promise<Blob> {
  const { ctx, master, play } = offlineMix(LOOP_S + TAIL_S, 3);
  for (const c of SOUNDS) {
    // Cues before 0 (the swing-in's run-up) come round from the end.
    const at = c.t < 0 ? c.t + LOOP_S : c.t;
    if (CUSTOM.has(c.id)) playCustom(ctx, master, c.id as CustomSfx, at, c.gain, c.dur);
    else play(c.id as SfxId, at, c.pitch, c.gain, c.pan);
  }
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  // Straight to the output (through its own gain): the effects' master gain is for their quiet synth levels.
  const level = ctx.createGain();
  level.gain.value = VOICE_GAIN;
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const hum = ambience(loop[0]!.length, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + HUM_GAIN * hum[c]![i]!))), LOOP_S, start);
}
