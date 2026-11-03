import type { SfxId } from '../../../src/audio/recipes';
import { offlineMix, RATE, rotatedWav } from '../audioKit';
import { TIP_TIMES } from './beats';
import { BEAT_S } from './cards';
import { COUNTER_ROLL_S, COUNTER_STEPS } from './hud';
import { LINEUP_WINDOWS } from './lineup';
import { CORN_STEP, DEER_STEP, FAWN_STEP, HYENA_STEP, keyed, OLIVE_STEP, type Step } from './steps';
import { GAME_STEP } from './game';
import { T, sectionStart as s, VIDEO_S } from './timeline';

/**
 * The soundtrack: the narrator (voice.mp3) straight to the output, and
 * InkSnake's own synthesized effects under it (audioKit.ts): the jaws'
 * gulps as each meal goes in and a long swallow as it finishes, a tick per
 * step of the counter, a clunk as the balance tips, a heartbeat under the
 * heart, a crack for the egg, whooshes into the line-up, a record scratch
 * on "not even close"; and a quiet low drone that deepens with every meal.
 */

const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const SFX_GAIN = 0.32;
const VOICE_GAIN = 0.9;
const DRONE = 0.009;

interface Cue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
}

/** A gulp each time the jaws step forward, a swallow when the meal is in. */
function gulps(st: Step, pitch: number): Cue[] {
  const out: Cue[] = [];
  let last = -1;
  for (let t = st.gulp[0]![0]; t < st.lump[0] + 0.1; t += 0.05) {
    const p = keyed(st.gulp, t);
    if (p <= 0 || p >= 1) continue;
    const n = Math.floor(p * 7);
    if (n !== last) out.push({ id: 'gulp', t, pitch, gain: 0.6 });
    last = n;
  }
  out.push({ id: 'swallow', t: st.lump[0], pitch, gain: 0.8 });
  return out;
}

function cues(): Cue[] {
  const out: Cue[] = [
    ...gulps(CORN_STEP, 1.3), ...gulps(OLIVE_STEP, 0.95).filter((c) => c.t > T.tookDown), ...gulps(GAME_STEP, 1.2),
    ...gulps(FAWN_STEP, 0.8), ...gulps(HYENA_STEP, 0.7),
    // The deer: frame 1's gulps, and its finish in section 5.
    ...gulps(DEER_STEP, 0.72).filter((c) => c.t < T.lining || c.t > s(5)),
    { id: 'gulp', t: 0.05, pitch: 0.72, gain: 0.7 }, { id: 'bump', t: T.seventySeven + 0.1, pitch: 0.7, gain: 1 },
    { id: 'squeeze', t: T.coiled, pitch: 0.9, gain: 0.7 }, { id: 'squeeze', t: T.squeezed, pitch: 0.85, gain: 0.8 },
    { id: 'squeeze', t: T.tenReal, pitch: 1.2, gain: 0.5 },
    { id: 'card', t: T.unhinge + 0.2, pitch: 1, gain: 0.7 }, { id: 'card', t: T.australia, pitch: 1, gain: 0.7 },
    { id: 'knot', t: T.wasnt, pitch: 1, gain: 0.5 },
    { id: 'bump', t: T.crack + 0.05, pitch: 2.2, gain: 1 }, { id: 'click', t: T.crack + 0.08, pitch: 1, gain: 1 },
    { id: 'win', t: T.barely7 - 0.1, pitch: 1, gain: 0.35 },
    ...TIP_TIMES.map((t) => ({ id: 'bump' as const, t: t + 0.45, pitch: 0.55, gain: 1 })),
    ...LINEUP_WINDOWS.slice(1).map(([t]) => ({ id: 'dive' as const, t: t - 0.25, pitch: 1, gain: 0.5 })),
  ];
  for (const c of COUNTER_STEPS) for (let k = 0; k * 0.09 < COUNTER_ROLL_S; k++) out.push({ id: 'tick', t: c.at + k * 0.09, pitch: 1 + k * 0.03, gain: 0.45 });
  for (let t = T.heart - 0.4; t < s(6) - 0.4; t += BEAT_S) {
    out.push({ id: 'bump', t, pitch: 0.42, gain: 0.9 }, { id: 'bump', t: t + 0.22, pitch: 0.38, gain: 0.6 });
  }
  return out;
}

/** A quiet low drone, a step deeper with each meal. */
function drone(ctx: OfflineAudioContext): void {
  const steps: readonly (readonly [number, number])[] = [[0, 55], [s(1), 65], [T.fiveOrSix, 58], [T.thirtyFive, 52], [T.deer77, 46], [T.hundredFifty, 41], [s(7), 49]];
  const level = ctx.createGain();
  level.gain.setValueAtTime(0, 0);
  level.gain.linearRampToValueAtTime(DRONE, 1.5);
  level.gain.setValueAtTime(DRONE, VIDEO_S - 1);
  level.gain.linearRampToValueAtTime(0, VIDEO_S);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 260;
  lp.connect(level).connect(ctx.destination);
  for (const [mul, type] of [[1, 'sawtooth'], [1.5, 'triangle'], [0.5, 'sine']] as const) {
    const osc = ctx.createOscillator();
    osc.type = type;
    steps.forEach(([t, f]) => osc.frequency.setTargetAtTime(f * mul, t, 0.4));
    osc.connect(lp);
    osc.start(0);
    osc.stop(VIDEO_S);
  }
}

/** A record scratch: a burst of band-passed noise swept fast down then up. */
function scratch(ctx: OfflineAudioContext, at: number): void {
  const len = Math.round(0.45 * RATE);
  const buf = ctx.createBuffer(1, len, RATE);
  const d = buf.getChannelData(0);
  let seed = 99;
  for (let i = 0; i < len; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    d[i] = (seed / 2 ** 31 - 1) * Math.sin((i / len) * Math.PI);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 6;
  bp.frequency.setValueAtTime(2400, at);
  bp.frequency.exponentialRampToValueAtTime(300, at + 0.2);
  bp.frequency.exponentialRampToValueAtTime(1800, at + 0.42);
  const g = ctx.createGain();
  g.gain.value = 0.06;
  src.connect(bp).connect(g).connect(ctx.destination);
  src.start(at);
}

export async function renderSwallowAudio(start = 0): Promise<Blob> {
  const { ctx, play } = offlineMix(VIDEO_S + 2, SFX_GAIN);
  for (const c of cues()) if (c.t >= 0 && c.t < VIDEO_S) play(c.id, c.t, c.pitch, c.gain);
  drone(ctx);
  scratch(ctx, T.notClose - 0.05);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const level = ctx.createGain();
  level.gain.value = VOICE_GAIN;
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
  const rendered = await ctx.startRendering();
  const frames = Math.round(VIDEO_S * RATE);
  const channels = Array.from({ length: rendered.numberOfChannels }, (_, c) => rendered.getChannelData(c).slice(0, frames));
  return rotatedWav(channels, VIDEO_S, start);
}
