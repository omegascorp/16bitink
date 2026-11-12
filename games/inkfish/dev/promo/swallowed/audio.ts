import type { SfxId } from '../../../src/audio/recipes';
import { ambience, offlineMix, RATE, wavOf } from '../audioKit';
import { EXTRA, type Extra } from '../swallowyou/audio';
import { STEP_ORDER } from './species';
import { TIMES } from './steps';
import { sectionStart as s, T, VIDEO_S } from './timeline';

/**
 * The soundtrack: the narrator straight to the output; a whoosh as each
 * fish swims in; the game's suck and big gulp on every swallow (deeper as
 * the meals grow); the counter ticking as it climbs; a stamp's thump on
 * every verdict; a white "zap" on the frogfish's strike; the game's gulps
 * under the game card; and a low bed of hum and drone that deepens with
 * each step, darkest under the black swallower.
 */

interface Cue {
  readonly id: SfxId | Extra;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan?: number;
}

const cue = (id: SfxId | Extra, t: number, pitch: number, gain: number, pan = 0): Cue => ({ id, t, pitch, gain, pan });

function stepCues(): Cue[] {
  return STEP_ORDER.flatMap((id, i) => {
    const time = TIMES[id];
    const p = time.plan;
    const k = i / (STEP_ORDER.length - 1);
    const ticks = Math.max(6, Math.round(time.climbS * 10));
    return [
      cue('dash', p.enter + 0.3, 1.1 - 0.3 * k, 0.28, -0.5),
      cue('dash', (p.mealEnter ?? p.enter + 0.4) + 0.3, 1.4 - 0.3 * k, 0.2, 0.5),
      cue('suck', p.gulp, 1.2 - 0.4 * k, 0.3),
      cue('eatBig', p.gulp + p.gulpS * 0.85, 1.2 - 0.5 * k, 0.34),
      cue('boom', p.gulp + p.gulpS * 0.85, 0.9 - 0.4 * k, 0.06 + 0.12 * k),
      ...Array.from({ length: ticks }, (_, j) => cue('tick', time.climb + time.climbS * (j / ticks) ** 1.4, 1 + 0.5 * (j / ticks), 0.2, 0.5)),
      cue('ding', time.climb + time.climbS, 1.2, 0.12, 0.5),
      cue('thump', time.stamp, 1.6, 0.34, 0.5),
    ];
  });
}

export const CUES: readonly Cue[] = [
  ...stepCues(),
  // 0 · the balloon, the question, the outline, the promise.
  cue('swell', T.balloon - 0.3, 0.8, 0.3),
  cue('boing', T.nobodyKnows, 1, 0.16),
  cue('lash', T.fourTimes, 1.2, 0.18),
  cue('shimmer', T.soToday, 1, 0.16),
  ...STEP_ORDER.map((_, i) => cue('ding', T.smallest + i * 0.35, 1 + 0.2 * i, 0.12, -0.6 + 0.4 * i)),
  cue('thump', T.measuredOpen, 1.3, 0.3),
  // 1 · the game.
  cue('powerup', T.quick, 1, 0.18),
  cue('eat', T.eatUp - 0.4, 1.4, 0.3),
  cue('eat', T.eatUp + 0.5, 1.3, 0.3),
  cue('grow', T.eatUp + 1.3, 1, 0.22),
  // 2 · the lionfish's claim and verdict.
  cue('rustle', T.lionfish + 1.1, 1, 0.3),
  cue('thump', T.couldnt, 1.1, 0.34),
  // 3 · the strike, the pelican eel's gulp of nothing much.
  cue('zap', T.bam, 1.2, 0.2),
  cue('lunge', T.bam, 1.3, 0.3),
  cue('rustle', T.soTheFish + 0.3, 1, 0.3),
  cue('suck', T.crustaceans, 1.8, 0.2),
  cue('eat', T.crustaceans + 0.25, 2, 0.16),
  cue('thump', T.crustaceans + 0.5, 1.1, 0.34),
  // 4 · the rot, the float, the end.
  cue('drop', T.rot, 0.7, 0.25),
  cue('swell', T.floats, 1.2, 0.3),
  cue('shimmer', T.floats + 1.2, 1.1, 0.16),
  cue('boing', T.fromJuly + 0.4, 0.9, 0.14),
  cue('powerup', T.inkfishFree, 1, 0.16),
];

const isExtra = (id: SfxId | Extra): id is Extra => id in EXTRA;

const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
/** The game's effects are quiet synths: the effects bus gets this lift. */
const MASTER = 3;
const VOICE_GAIN = 0.8;

/** How deep the bed is at t, 0 .. 1: a notch per step, quiet under the game card and the end. */
export function bedAt(t: number): number {
  if (t >= T.quick - 0.3 && t < s(2)) return 0.1;
  if (t >= T.outro) return 0.1;
  if (t < T.soToday) return 0.6;
  let k = 0.2;
  STEP_ORDER.forEach((id, i) => {
    if (t >= TIMES[id].plan.enter) k = 0.25 + 0.25 * i;
  });
  return k;
}

/** The low drone: detuned triangles that get louder and drop in pitch as the steps go. */
function drone(ctx: OfflineAudioContext, out: AudioNode, seconds: number): void {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, 0);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 200;
  f.connect(g).connect(out);
  const oscs = [1, 1.012, 1.5].map((ratio) => {
    const n = ctx.createOscillator();
    n.type = 'triangle';
    n.frequency.setValueAtTime(62 * ratio, 0);
    n.connect(f);
    n.start(0);
    n.stop(seconds);
    return { n, ratio };
  });
  for (let t = 0.5; t < seconds; t += 0.5) {
    const k = bedAt(t);
    g.gain.linearRampToValueAtTime(0.06 * k ** 1.4, t);
    for (const { n, ratio } of oscs) n.frequency.linearRampToValueAtTime((62 - 26 * k) * ratio, t);
  }
}

export async function renderSwallowedAudio(start = 0): Promise<Blob> {
  if (start !== 0) throw new Error('The long-form soundtrack starts at 0: it doesn’t loop');
  const { ctx, master, play } = offlineMix(VIDEO_S, MASTER);
  for (const c of CUES) {
    if (c.t < 0 || c.t >= VIDEO_S) continue;
    if (!isExtra(c.id)) {
      play(c.id, c.t, c.pitch, c.gain, c.pan);
      continue;
    }
    const level = ctx.createGain();
    level.gain.value = c.gain;
    const pan = ctx.createStereoPanner();
    pan.pan.value = c.pan ?? 0;
    level.connect(pan).connect(master);
    EXTRA[c.id](ctx, level, c.t, c.pitch);
  }
  drone(ctx, ctx.destination, VIDEO_S);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const gain = ctx.createGain();
  gain.gain.value = VOICE_GAIN;
  voice.connect(gain).connect(ctx.destination);
  voice.start(0);
  const mix = await ctx.startRendering();
  const frames = mix.length;
  const hum = ambience(frames, Math.round(VIDEO_S / 12));
  const step = Math.round(RATE / 100);
  const level = Float32Array.from({ length: Math.ceil(frames / step) + 1 }, (_, i) => bedAt((i * step) / RATE));
  const channels = [0, 1].map((c) => {
    const out = mix.getChannelData(c).slice();
    const h = hum[c]!;
    for (let i = 0; i < frames; i++) {
      const k = i / step;
      const k0 = Math.floor(k);
      const g = level[k0]! + (level[Math.min(k0 + 1, level.length - 1)]! - level[k0]!) * (k - k0);
      out[i] = out[i]! + 0.5 * g * h[i]!;
    }
    return out;
  });
  return wavOf(channels);
}
