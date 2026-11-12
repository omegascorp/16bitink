import type { SfxId } from '../../../src/audio/recipes';
import { ambience, offlineMix, wavOf } from '../audioKit';
import { env, EXTRA, noise, osc, type Extra } from '../swallowyou/audio';
import { LINEUP } from './species';
import { T, VIDEO_S } from './timeline';
import { TUNA_HAIL, VERDICTS } from './verdicts';

/**
 * The soundtrack: the narrator straight through; under him, quiet: a buzzer,
 * a stamp's thump, a counter tick and the crowd's "ooh" on every OUT (one
 * sad piano note instead of the buzzer for the soft ones), a chime on every
 * pass, a cheer for the eel's coin flip and the winner, the game's own
 * effects for the props, and a soft drum bed that tightens round by round
 * and falls silent before every verdict.
 */

type Own = 'buzzer' | 'chime' | 'ooh' | 'cheer' | 'piano' | 'tom' | 'shake';

interface Cue {
  readonly id: SfxId | Extra | Own;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan?: number;
}

const cue = (id: Cue['id'], t: number, pitch: number, gain: number, pan = 0): Cue => ({ id, t, pitch, gain, pan });

/** A crowd's voices: detuned saws gliding, through a vowel-ish filter. */
function voices(ctx: OfflineAudioContext, out: AudioNode, t: number, p: number, dur: number, glide: number, centre: number): void {
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = centre * p;
  f.Q.value = 1.1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.18);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  f.connect(g).connect(out);
  for (let i = 0; i < 9; i++) {
    const n = ctx.createOscillator();
    n.type = 'sawtooth';
    const hz = (165 + ((i * 37) % 110)) * p;
    n.frequency.setValueAtTime(hz, t);
    n.frequency.exponentialRampToValueAtTime(hz * glide, t + dur);
    n.connect(f);
    n.start(t + i * 0.012);
    n.stop(t + dur + 0.05);
  }
}

const OWN: Readonly<Record<Own, (ctx: OfflineAudioContext, out: AudioNode, t: number, p: number) => void>> = {
  buzzer: (ctx, out, t, p) => {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1500;
    f.connect(env(ctx, out, t, 0.5, 0.01, 0.55));
    for (const hz of [110, 116.5]) {
      const n = ctx.createOscillator();
      n.type = 'square';
      n.frequency.value = hz * p;
      n.connect(f);
      n.start(t);
      n.stop(t + 0.6);
    }
  },
  chime: (ctx, out, t, p) => {
    osc(ctx, out, { t, type: 'sine', from: 1046 * p, dur: 0.9, gain: 0.3, attack: 0.003 });
    osc(ctx, out, { t: t + 0.09, type: 'sine', from: 1568 * p, dur: 0.9, gain: 0.25, attack: 0.003 });
    osc(ctx, out, { t: t + 0.09, type: 'sine', from: 3136 * p, dur: 0.4, gain: 0.05, attack: 0.003 });
  },
  ooh: (ctx, out, t, p) => voices(ctx, out, t, p, 1.3, 0.82, 420),
  cheer: (ctx, out, t, p) => {
    voices(ctx, out, t, p * 1.25, 1.6, 1.25, 700);
    noise(ctx, out, { t, dur: 1.8, gain: 0.35, type: 'bandpass', from: 1500 * p, to: 2400 * p, q: 0.6, attack: 0.25 });
  },
  piano: (ctx, out, t, p) => {
    for (const [k, g] of [[1, 0.5], [2, 0.16], [3, 0.06]] as const) osc(ctx, out, { t, type: 'sine', from: 330 * p * k, dur: 2.2, gain: g, attack: 0.004 });
  },
  tom: (ctx, out, t, p) => {
    osc(ctx, out, { t, type: 'sine', from: 120 * p, to: 52 * p, dur: 0.22, gain: 0.7, attack: 0.002 });
    noise(ctx, out, { t, dur: 0.05, gain: 0.15, type: 'lowpass', from: 600 });
  },
  shake: (ctx, out, t, p) => noise(ctx, out, { t, dur: 0.06, gain: 0.3, type: 'highpass', from: 5000 * p, attack: 0.003 }),
};

function verdictCues(): Cue[] {
  return VERDICTS.flatMap((v): Cue[] => {
    if (v.kind === 'pass') return [cue('chime', v.at, v.fish === 'rivulus' ? 1.12 : 1, 0.14, 0.3), ...(v.fish === 'eel' && v.at < T.round3 ? [cue('cheer', v.at, 1, 0.1)] : [])];
    const loud = v.big ? 1.3 : 1;
    return [
      v.soft ? cue('piano', v.at, v.fish === 'goldfish' ? 0.9 : 1, 0.16) : cue('buzzer', v.at, 1, 0.09 * loud),
      cue('thump', v.at, v.soft ? 1.3 : 1.1, (v.soft ? 0.12 : 0.2) * loud),
      cue('tick', v.at + 0.12, 1.3, 0.2, 0.6),
      cue('ooh', v.at + 0.2, v.soft ? 0.85 : 1, (v.big ? 0.12 : 0.07)),
      ...(v.big ? [cue('boom', v.at, 0.8, 0.08)] : []),
      cue('dash', (v.leave ?? v.at + 0.9) + 0.1, 1, 0.12, -0.6),
    ];
  });
}

const hail = (): Cue[] => Array.from({ length: 26 }, (_, i) => {
  const t = TUNA_HAIL.from + (i / 26) * (TUNA_HAIL.to - TUNA_HAIL.from);
  return cue(i % 2 ? 'thump' : 'tick', t, 1.4 + (i % 5) * 0.08, i % 2 ? 0.16 : 0.12, ((i * 7) % 11) / 5.5 - 1);
});

export const CUES: readonly Cue[] = [
  ...verdictCues(),
  ...hail(),
  cue('buzzer', TUNA_HAIL.from, 1, 0.08),
  cue('ooh', TUNA_HAIL.to, 1, 0.1),
  // The cold open: the counter slamming in, the promise's stamp, the squid.
  cue('boom', 0.05, 1, 0.16),
  cue('thump', T.real, 1.3, 0.2),
  cue('boing', T.mollusc, 1, 0.12),
  cue('thump', T.mollusc + 0.1, 1.1, 0.2),
  cue('pft', T.bye, 0.9, 0.2),
  cue('dash', T.bye, 1.3, 0.2, -0.5),
  // The line-up: a whoosh as each fish swims on, a ding on each card, dread before the sharks.
  ...LINEUP.map((c, i) => cue('dash', [T.three, T.three + 0.25, T.three + 0.5, T.four - 0.3, T.twenty - 0.3, T.twenty, T.salmon29 - 0.3, T.tuna31 - 0.3, T.cod39 - 0.3, T.mako9 - 0.3, T.white15 - 0.2][i]! + 0.2, 1.4 - i * 0.07, 0.14, 0.5)),
  ...[T.desert, T.mudskippers, T.rivulus, T.goldfish, T.eel, T.icefish, T.salmon, T.tuna31 + 0.6, T.cod, T.mako9 + 0.6, T.white15 + 0.5].map((at, i) => cue('ding', at, 1 + i * 0.04, 0.08, -0.5)),
  cue('boing', T.remember, 1.1, 0.1),
  cue('swell', T.serious, 0.9, 0.22),
  cue('boom', T.white15, 0.7, 0.18),
  ...LINEUP.map((_, i) => cue('tick', T.most + i * 0.1, 1 + i * 0.03, 0.14)),
  // Round 1.
  cue('tom', T.round1, 1, 0.18),
  cue('rustle', T.stop, 1, 0.2),
  cue('click', T.fiveMin, 1, 0.2),
  cue('rustle', T.nurse - 0.4, 1, 0.2),
  // The speed round and the game.
  cue('dash', T.sailfish, 1.1, 0.2),
  cue('rustle', T.mph68, 1, 0.2),
  cue('drop', T.burst, 1, 0.2),
  cue('thump', T.cancelled - 0.4, 1, 0.2),
  cue('powerup', T.inkfish, 1, 0.16),
  cue('eat', T.eatUp - 0.4, 1.4, 0.24),
  cue('eat', T.eatUp + 0.5, 1.3, 0.24),
  cue('grow', T.eatUp + 1.3, 1, 0.2),
  // Round 2: the heat, the rewind.
  cue('tom', T.round2, 1, 0.18),
  cue('swell', T.heat, 1.1, 0.2),
  cue('boing', T.f57, 0.7, 0.12),
  cue('heart', T.f99, 1, 0.25),
  cue('heart', T.f99 + 0.9, 1, 0.25),
  cue('heart', T.f100 + 0.6, 1, 0.25),
  // Round 3: the salt.
  cue('tom', T.round3, 1.06, 0.18),
  ...Array.from({ length: 10 }, (_, i) => cue('shake', T.into + 0.4 + i * 0.16, 1, 0.12)),
  // Round 4: the drain, the cut-ins, the 66 days.
  cue('tom', T.round4, 1.12, 0.18),
  cue('splash', T.drain, 0.7, 0.22),
  cue('swell', T.drain + 0.2, 1.3, 0.14),
  cue('dash', T.flying, 1.5, 0.18),
  cue('thump', T.no45, 1.2, 0.26),
  cue('rustle', T.lungfish, 1, 0.2),
  cue('thump', T.cocoon + 0.4, 1.2, 0.22),
  cue('shimmer', T.days66, 1, 0.16),
  cue('cheer', T.days66 + 0.7, 1, 0.14),
  // The final.
  cue('tom', T.final, 1.18, 0.18),
  ...Array.from({ length: 8 }, (_, i) => cue('shake', T.brine + 0.4 + i * 0.18, 1.1, 0.12)),
  cue('splash', T.fresh, 1.1, 0.22),
  ...[0, 1, 2, 3].map((i) => cue('tick', T.mudFresh + 1 + i * 0.85, 1, 0.16)),
  // The winner.
  cue('win', T.winner, 1, 0.2),
  cue('cheer', T.winner + 0.1, 1, 0.16),
  cue('shimmer', T.winner + 0.6, 1.1, 0.14),
  cue('rustle', T.crab - 0.2, 1, 0.16),
  cue('rustle', T.logs - 0.2, 1, 0.16),
  cue('rustle', T.air, 1, 0.16),
  cue('thump', T.beat + 0.5, 1.1, 0.16),
];

/** The drum bed's tempo (beats per minute) at t, 0 where it rests: faster each round, silent before every verdict. */
export function bedAt(t: number): number {
  if (t < T.round1 || t >= T.mudOut + 1 || (t >= T.inkfish - 0.3 && t < T.round2 - 0.3)) return 0;
  if (VERDICTS.some((v) => t >= v.at - 1.1 && t < v.at + 0.5)) return 0;
  if (t >= T.final - 0.6) return 132;
  if (t >= T.round4) return 120;
  if (t >= T.round3) return 110;
  if (t >= T.round2) return 100;
  return 90;
}

function bedCues(): Cue[] {
  const out: Cue[] = [];
  let beat = 0;
  for (let t = T.round1; t < VIDEO_S; ) {
    const bpm = bedAt(t);
    if (bpm === 0) {
      t += 0.05;
      continue;
    }
    out.push(cue(beat % 2 === 0 ? 'tom' : 'shake', t, beat % 4 === 0 ? 0.9 : 1, beat % 2 === 0 ? 0.07 : 0.04, beat % 2 === 0 ? 0 : 0.4));
    beat++;
    t += 60 / bpm;
  }
  return out;
}

const isOwn = (id: Cue['id']): id is Own => id in OWN;
const isExtra = (id: Cue['id']): id is Extra => id in EXTRA;

const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
/** The game's effects are quiet synths: the effects bus gets this lift. */
const MASTER = 3;
const VOICE_GAIN = 0.8;

export async function renderSurvivalAudio(start = 0): Promise<Blob> {
  if (start !== 0) throw new Error('The long-form soundtrack starts at 0: it doesn’t loop');
  const { ctx, master, play } = offlineMix(VIDEO_S, MASTER);
  for (const c of [...CUES, ...bedCues()]) {
    if (c.t < 0 || c.t >= VIDEO_S) continue;
    if (!isOwn(c.id) && !isExtra(c.id)) {
      play(c.id, c.t, c.pitch, c.gain, c.pan);
      continue;
    }
    const level = ctx.createGain();
    level.gain.value = c.gain;
    const pan = ctx.createStereoPanner();
    pan.pan.value = c.pan ?? 0;
    level.connect(pan).connect(master);
    if (isOwn(c.id)) OWN[c.id](ctx, level, c.t, c.pitch);
    else EXTRA[c.id](ctx, level, c.t, c.pitch);
  }
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
  const channels = [0, 1].map((c) => {
    const out = mix.getChannelData(c).slice();
    const h = hum[c]!;
    for (let i = 0; i < frames; i++) out[i] = out[i]! + 0.1 * h[i]!;
    return out;
  });
  return wavOf(channels);
}
