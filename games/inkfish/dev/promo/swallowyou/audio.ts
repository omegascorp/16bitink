import type { SfxId } from '../../../src/audio/recipes';
import { ambience, offlineMix, RATE, wavOf } from '../audioKit';
import { MOODS } from './grade';
import { STAGES, tapeTicks } from './layout';
import { SPECIES } from './species';
import { ANIMALS, CROC_EYES, FLORIDA, ICE_WALK, SEAL, sectionStart, T, TESTS, VIDEO_S } from './timeline';

/**
 * The soundtrack: the narrator straight to the output; the game's gulps and
 * bites (src/audio/recipes) where mouths shut; a stamp's thump on every
 * verdict and a smaller one as it lands on the stamp card; a tick each time
 * the ruler's tape passes a labelled foot mark; dings as the tiger shark's
 * belly empties; a heartbeat in the humpback's dark; a sound for each
 * sentence's mood (a hit for the shocks, a boing for the jokes, a shimmer for
 * the wonder, a low swell for the dread); and a low bed of sea hum and drone
 * that grows as the animals do.
 */

type Extra = 'thump' | 'ding' | 'pft' | 'heart' | 'boing' | 'shimmer' | 'swell' | 'tick';

export interface Cue {
  readonly id: SfxId | Extra;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan?: number;
}

const cue = (id: SfxId | Extra, t: number, pitch: number, gain: number, pan = 0): Cue => ({ id, t, pitch, gain, pan });

function stageCues(): Cue[] {
  const out: Cue[] = [];
  STAGES.forEach((s, i) => {
    const big = i / (STAGES.length - 1);
    // Mouth-first: a low suck as the jaws fill the frame, a whoosh on the pull back, the name card's rustle.
    out.push(cue('suck', s.close + 0.05, 0.9 - 0.4 * big, 0.3));
    out.push(cue('dash', s.pullFrom, 0.7 - 0.3 * big, 0.3));
    out.push(cue('rustle', s.name + 0.1, 1.1, 0.12, -0.5));
    tapeTicks(s).forEach((at, k, all) => out.push(cue(k === all.length - 1 ? 'thump' : 'tick', at, k === all.length - 1 ? 1.6 : 1 + 0.04 * k, k === all.length - 1 ? 0.25 : 0.35)));
  });
  return out;
}

function testCues(): Cue[] {
  const out: Cue[] = [];
  for (const a of ANIMALS) {
    const test = TESTS[a];
    const fits = SPECIES[a].verdict === 'COULD';
    out.push(cue('dash', test.card, 1.2, 0.2, 0.5));
    out.push(cue(fits ? 'suck' : 'clang', test.drop + 0.35, fits ? 1.4 : 0.8, fits ? 0.35 : 0.18, 0.4));
    if (!fits) out.push(cue('clang', test.drop + 0.55, 0.9, 0.08, 0.4));
    out.push(cue('thump', test.stamp, fits ? 1.2 : 1, 0.32));
    out.push(cue('thump', test.stamp + 0.45, 1.8, 0.25, 0.6));
    if (fits) out.push(cue('win', test.stamp + 0.1, 1, 0.22));
  }
  out.push(cue('thump', T.notWhole, 1.15, 0.24));
  return out;
}

function moodCues(): Cue[] {
  const out: Cue[] = [];
  MOODS.forEach((m, i) => {
    if (i > 0 && MOODS[i - 1]!.mood === m.mood) return;
    if (m.mood === 'shock') out.push(cue('boom', m.t, 0.55, 0.18));
    if (m.mood === 'rosy') out.push(cue('boing', m.t + 0.1, 1, 0.14));
    if (m.mood === 'awe') out.push(cue('shimmer', m.t, 1, 0.12));
    if (m.mood === 'cold') out.push(cue('swell', m.t, 1, 0.25));
  });
  return out;
}

export const CUES: readonly Cue[] = [
  // 0 · the kayak gulp, the question, "you", the eight mouths.
  cue('splash', 0, 0.7, 0.5),
  cue('eatBig', T.swallowed + 0.15, 0.55, 0.6),
  cue('splash', T.swallowed + 0.2, 0.9, 0.35),
  cue('pft', T.spat + 0.12, 1, 0.55),
  cue('splash', T.spat + 1.1, 1.3, 0.35),
  cue('suck', T.question, 0.5, 0.25),
  cue('boom', T.you, 0.6, 0.3),
  ...Array.from({ length: 8 }, (_, i) => cue('dash', T.smallest - 0.6 + i * 0.5, 1.4 - 0.12 * i, 0.16, -0.5 + i * 0.14)),
  cue('drop', T.onlyOne + 0.2, 0.6, 0.2),
  // 1 · you: the height bar, the shoulder bar, it lifts off.
  cue('tick', T.fiveNine, 1.2, 0.3),
  cue('zap', T.sixteen, 1.4, 0.1),
  cue('dash', T.downThroat, 1, 0.25),
  cue('powerup', T.testIt, 1, 0.16),
  ...stageCues(),
  ...testCues(),
  ...moodCues(),
  // 2 · grouper: the lid, Florida's gulp, the diver.
  cue('clang', T.trashLid + 0.2, 0.6, 0.1),
  cue('hooked', FLORIDA.from + 0.3, 1, 0.18),
  cue('lunge', T.grouperBite - 0.6, 0.6, 0.3),
  cue('eatBig', T.grouperBite, 0.65, 0.65),
  cue('lash', T.grouperBite + 0.1, 0.7, 0.2),
  cue('spotted', T.divers, 0.8, 0.12),
  // 3 · tiger shark: what's in its belly.
  ...[T.cans, T.cans + 0.25, T.bottle, T.sacks, T.sacks + 0.35].map((at, i) => cue('ding', at, 1 + 0.12 * i, 0.3, 0.3)),
  // 4 · great white: the seal, the splash, the film torn off.
  cue('lunge', SEAL.from + 0.6, 0.5, 0.3),
  cue('splash', T.bites - 0.35, 0.7, 0.6),
  cue('lash', T.bites, 0.8, 0.22),
  cue('lash', T.tears, 0.7, 0.22),
  cue('lash', T.shakes, 0.6, 0.22),
  cue('rustle', T.jawsLied + 0.6, 0.7, 0.3),
  // 5 · the game.
  cue('powerup', T.inkfish, 1, 0.18),
  cue('eat', T.eatUp - 0.4, 1.4, 0.3),
  cue('eat', T.eatUp + 0.5, 1.3, 0.3),
  cue('grow', T.eatUp + 1.3, 1, 0.22),
  // 6 · croc: the eyes, the snap, the small prey, the stones, the roll.
  cue('swell', CROC_EYES.from, 0.7, 0.3),
  cue('lash', T.croc - 0.2, 0.5, 0.35),
  cue('eat', T.wholeCroc, 0.9, 0.35),
  ...Array.from({ length: 6 }, (_, k) => cue('click', T.rocks + k * 0.12, 0.6 + 0.07 * k, 0.3)),
  cue('rustle', T.rolls, 0.5, 0.35),
  cue('splash', T.rolls + 0.3, 0.6, 0.35),
  // 7 · Greenland shark: footsteps on the ice, what's in its belly.
  ...Array.from({ length: 6 }, (_, k) => cue('click', ICE_WALK.from + 0.4 + k * 0.33, 0.5, 0.12, 0.3)),
  ...[T.reindeer, T.polarBear, T.moose].map((at, i) => cue('ding', at, 0.8 + 0.1 * i, 0.3, 0.3)),
  // 8 · whale shark: the bus, plankton in, spat out.
  cue('drop', T.bus, 0.8, 0.14),
  cue('suck', T.tiny, 1.2, 0.2),
  cue('pft', T.spit + 0.1, 1.2, 0.35),
  // 9 · humpback: the bump, the dark, the heartbeat, spat out into the light.
  cue('boom', T.bump, 0.4, 0.4),
  cue('eatBig', T.everything + 0.3, 0.4, 0.5),
  ...Array.from({ length: Math.floor((T.cameUp - T.dark) / 0.85) }, (_, k) => cue('heart', T.dark + k * 0.85, 1, 0.26)),
  cue('pft', T.spat9 + 0.05, 0.8, 0.6),
  cue('splash', T.spat9 + 0.1, 0.7, 0.5),
  // 10 · sperm whale: the squid swallowed whole, the hoax, the twist.
  cue('eatBig', T.swallowWhole, 0.45, 0.55),
  cue('rustle', T.story, 0.9, 0.3),
  cue('thump', T.fake, 0.9, 0.32),
  cue('spotted', T.noRecord, 0.9, 0.15),
  cue('dash', T.notInterested + 0.3, 0.6, 0.3),
];

/** The ones the game has no sound for, in the same soft synth style. */
const EXTRA: Readonly<Record<Extra, (ctx: OfflineAudioContext, out: AudioNode, t: number, p: number) => void>> = {
  // A rubber stamp slammed down.
  thump: (ctx, out, t, p) => {
    osc(ctx, out, { t, type: 'sine', from: 150 * p, to: 48 * p, dur: 0.24, gain: 0.8, attack: 0.002 });
    noise(ctx, out, { t, dur: 0.09, gain: 0.45, type: 'lowpass', from: 1700 * p });
  },
  // A bright little ding.
  ding: (ctx, out, t, p) => {
    osc(ctx, out, { t, type: 'sine', from: 1568 * p, dur: 0.7, gain: 0.35, attack: 0.002 });
    osc(ctx, out, { t, type: 'sine', from: 2350 * p, dur: 0.45, gain: 0.12, attack: 0.002 });
  },
  // Spat out: a puff of air and a wet pop.
  pft: (ctx, out, t, p) => {
    noise(ctx, out, { t, dur: 0.22, gain: 0.5, type: 'bandpass', from: 2400 * p, to: 700 * p, q: 1.2, attack: 0.004 });
    osc(ctx, out, { t: t + 0.02, type: 'sine', from: 260 * p, to: 720 * p, dur: 0.1, gain: 0.35, attack: 0.003 });
  },
  // A heartbeat: lub-dub.
  heart: (ctx, out, t, p) => {
    osc(ctx, out, { t, type: 'sine', from: 70 * p, to: 44 * p, dur: 0.16, gain: 0.9, attack: 0.004 });
    osc(ctx, out, { t: t + 0.22, type: 'sine', from: 62 * p, to: 40 * p, dur: 0.14, gain: 0.6, attack: 0.004 });
  },
  // A cartoon boing for the jokes.
  boing: (ctx, out, t, p) => {
    const n = ctx.createOscillator();
    n.type = 'triangle';
    n.frequency.setValueAtTime(180 * p, t);
    n.frequency.exponentialRampToValueAtTime(420 * p, t + 0.08);
    n.frequency.exponentialRampToValueAtTime(260 * p, t + 0.35);
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 14;
    depth.gain.value = 30 * p;
    lfo.connect(depth).connect(n.frequency);
    n.connect(env(ctx, out, t, 0.35, 0.01, 0.4));
    for (const node of [n, lfo]) {
      node.start(t);
      node.stop(t + 0.45);
    }
  },
  // A soft glassy shimmer for the wonder.
  shimmer: (ctx, out, t, p) => {
    [1047, 1319, 1568, 2093].forEach((hz, i) => osc(ctx, out, { t: t + i * 0.08, type: 'triangle', from: hz * p, dur: 0.8, gain: 0.1, attack: 0.05 }));
  },
  // A low swell of dread.
  swell: (ctx, out, t, p) => {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 300 * p;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 1.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
    f.connect(g).connect(out);
    for (const hz of [55, 58.3]) {
      const n = ctx.createOscillator();
      n.type = 'sawtooth';
      n.frequency.value = hz * p;
      n.connect(f);
      n.start(t);
      n.stop(t + 3.1);
    }
  },
  // The ruler's tick: a short wooden click.
  tick: (ctx, out, t, p) => {
    noise(ctx, out, { t, dur: 0.03, gain: 0.6, type: 'bandpass', from: 3200 * p, q: 4, attack: 0.001 });
    osc(ctx, out, { t, type: 'sine', from: 1900 * p, dur: 0.05, gain: 0.2, attack: 0.001 });
  },
};

function env(ctx: OfflineAudioContext, out: AudioNode, t: number, peak: number, attack: number, dur: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(out);
  return g;
}

function osc(ctx: OfflineAudioContext, out: AudioNode, o: { t: number; type: OscillatorType; from: number; to?: number; dur: number; gain: number; attack?: number }): void {
  const n = ctx.createOscillator();
  n.type = o.type;
  n.frequency.setValueAtTime(o.from, o.t);
  if (o.to !== undefined) n.frequency.exponentialRampToValueAtTime(o.to, o.t + o.dur);
  n.connect(env(ctx, out, o.t, o.gain, o.attack ?? 0.008, o.dur));
  n.start(o.t);
  n.stop(o.t + o.dur + 0.05);
}

function noise(ctx: OfflineAudioContext, out: AudioNode, o: { t: number; dur: number; gain: number; type: BiquadFilterType; from: number; to?: number; q?: number; attack?: number }): void {
  const buf = ctx.createBuffer(1, Math.ceil(RATE * (o.dur + 0.1)), RATE);
  const data = buf.getChannelData(0);
  let seed = Math.round(o.t * 1000) + 7;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = seed / 2 ** 31 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = o.type;
  f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(o.from, o.t);
  if (o.to !== undefined) f.frequency.exponentialRampToValueAtTime(o.to, o.t + o.dur);
  src.connect(f).connect(env(ctx, out, o.t, o.gain, o.attack ?? 0.005, o.dur));
  src.start(o.t);
  src.stop(o.t + o.dur + 0.05);
}

const isExtra = (id: SfxId | Extra): id is Extra => id in EXTRA;

const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
/** The game's effects are quiet synths: the effects bus gets this lift. */
const MASTER = 3;
const VOICE_GAIN = 0.8;

/** How big the animals are at t, 0 (the cold open) .. 1 (the sperm whale): the bed grows with them. */
export function bedAt(t: number): number {
  if (t >= sectionStart(5) - 0.3 && t < sectionStart(6) - 0.4) return 0.15;
  if (t >= T.end) return 0.1;
  let level = t < sectionStart(2) ? 0.25 : 0.3;
  STAGES.forEach((s, i) => {
    if (t >= s.close) level = 0.3 + (0.7 * (i + 1)) / STAGES.length;
  });
  return level;
}

/** The low drone under the bed: two detuned low sines whose level follows bedAt. */
function drone(ctx: OfflineAudioContext, out: AudioNode, seconds: number): void {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, 0);
  for (let t = 0; t < seconds; t += 0.5) g.gain.linearRampToValueAtTime(0.05 * bedAt(t) ** 1.5, t);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 180;
  f.connect(g).connect(out);
  for (const hz of [41.2, 41.7, 61.7]) {
    const n = ctx.createOscillator();
    n.type = 'triangle';
    n.frequency.value = hz;
    n.connect(f);
    n.start(0);
    n.stop(seconds);
  }
}

export async function renderSwallowyouAudio(start = 0): Promise<Blob> {
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
      out[i] = out[i]! + 0.6 * g * h[i]!;
    }
    return out;
  });
  return wavOf(channels);
}

