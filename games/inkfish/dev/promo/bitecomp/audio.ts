import type { SfxId } from '../../../src/audio/recipes';
import { ambience, offlineMix, RATE, wavOf } from '../audioKit';
import { EXTRA, type Extra } from '../swallowyou/audio';
import { CUTS } from './cutins';
import { SPECIES } from './species';
import { BITES, said, T, VIDEO_S } from './timeline';

/**
 * The soundtrack: the narrator straight to the output; a whoosh as each head
 * slides in; a hard chomp on every bite (the game's big gulp, a clang of
 * steel and a low hit, heavier for the bigger numbers); the gauge ticking
 * while the counter climbs; a stamp's thump on MEASURED / ESTIMATED; a
 * rustle on each cut-in; the game's gulps under the game card; and a low
 * bed of hum and drone that deepens as the bites grow.
 */

interface Cue {
  readonly id: SfxId | Extra;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan?: number;
}

const cue = (id: SfxId | Extra, t: number, pitch: number, gain: number, pan = 0): Cue => ({ id, t, pitch, gain, pan });

/** 0 (you, 135 lb) .. 1 (megalodon, 40,000 lb), on a log scale. */
const weight = (lb: number): number => Math.max(0, Math.min(1, Math.log10(lb / 72) / Math.log10(40000 / 72)));

function biteCues(): Cue[] {
  return BITES.flatMap((b) => {
    const k = weight(SPECIES[b.animal].lb);
    const ticks = Math.max(6, Math.round((b.land - b.at) * 11));
    return [
      ...(b.arrive > 0 ? [cue('dash', b.arrive + 0.15, 1.15 - 0.45 * k, 0.32, -0.5)] : []),
      cue('eatBig', b.at, 1.25 - 0.6 * k, 0.32),
      cue('clang', b.at, 1.1 - 0.5 * k, 0.18 + 0.08 * k, 0.2),
      cue('boom', b.at, 0.9 - 0.45 * k, 0.08 + 0.2 * k),
      cue('thump', b.at + 0.01, 1.1 - 0.5 * k, 0.24),
      // The gauge ticking up as the counter climbs, faster toward the top.
      ...Array.from({ length: ticks }, (_, i) => cue('tick', b.at + 0.08 + (b.land - b.at - 0.08) * (i / ticks) ** 1.6, 1 + 0.4 * (i / ticks), 0.22, 0.4)),
      cue('ding', b.land, 1.2, 0.12, 0.3),
      cue('thump', b.stamp, 1.7, 0.34, 0.5),
    ];
  });
}

export const CUES: readonly Cue[] = [
  ...biteCues(),
  ...CUTS.map((c) => cue('rustle', c.from + 0.02, c.kind === 'inset' ? 1.5 : 1, 0.3, c.kind === 'inset' ? 0.6 : 0)),
  // 1 · the psi lists crossed out, the rules, the fish in a hand, a person on one tooth.
  ...Array.from({ length: 6 }, (_, i) => cue('lash', T.psi + i * 0.1, 1.6, 0.12, -0.3 + 0.12 * i)),
  cue('drop', T.notBite, 0.8, 0.2),
  cue('thump', T.measured, 1.3, 0.26, -0.4),
  cue('thump', T.estimate, 1.2, 0.26, 0.4),
  cue('shimmer', T.fish, 1, 0.14),
  cue('boing', T.tooth - 0.3, 1.1, 0.14),
  // 2 · the shell cracks, the dogs chew, the lion holds on.
  cue('smash', T.shellWord, 1.1, 0.4, 0.6),
  ...Array.from({ length: 6 }, (_, i) => cue('eat', T.researchers + 0.4 + i * 0.3, 1.6 + 0.1 * (i % 3), 0.12, -0.5 + 0.2 * i)),
  cue('ding', T.hardest, 1.3, 0.2),
  cue('boing', T.average + 0.5, 0.9, 0.14),
  cue('swell', T.crush, 0.9, 0.25),
  // 3 · the game, the jump.
  cue('powerup', T.quick, 1, 0.18),
  cue('eat', T.biteUp - 0.4, 1.4, 0.3),
  cue('eat', T.biteUp + 0.5, 1.3, 0.3),
  cue('grow', T.biteUp + 1.3, 1, 0.22),
  cue('swell', T.jump - 0.6, 0.8, 0.35),
  cue('win', T.forWeight + 1, 1, 0.12),
  // 4 · the car, the record, the tape, the fish again.
  cue('thump', T.car, 0.7, 0.4, 0.6),
  cue('win', T.strongest, 1, 0.2),
  cue('rustle', T.tape, 1.8, 0.4),
  cue('rustle', T.tape + 0.25, 1.4, 0.35),
  cue('shimmer', T.remember, 1, 0.14),
  // 5 · the estimates get huge, the wireframe painted, the elephant, ×10.
  cue('swell', T.huge, 0.7, 0.4),
  cue('zap', T.greatWhite, 0.7, 0.08),
  cue('shimmer', T.model3d + 0.4, 0.8, 0.15),
  cue('thump', T.elephantWord, 0.6, 0.28, 0.6),
  cue('swell', T.megalodon, 0.55, 0.5),
  cue('boom', T.tenTimes, 0.5, 0.3),
  // 6 · the line-up, the piranha, ×30, one hand.
  cue('drop', T.forSizeTwist, 0.7, 0.25),
  ...Array.from({ length: 10 }, (_, i) => cue('dash', T.forSizeTwist + 0.1 + i * 0.07, 1.4 - 0.05 * i, 0.08, -0.6 + 0.13 * i)),
  cue('lunge', T.this + 0.4, 1.4, 0.25),
  cue('swell', T.thirty, 1.1, 0.3),
  ...Array.from({ length: 14 }, (_, i) => cue('tick', T.thirty + 0.3 + i * 0.1, 1 + 0.06 * i, 0.22)),
  cue('win', T.thirty + 1.7, 1.1, 0.2),
  cue('eat', T.fitsHand, 1.6, 0.3),
  cue('powerup', said('InkFish', T.ifYouLike), 1, 0.16),
];

const isExtra = (id: SfxId | Extra): id is Extra => id in EXTRA;

const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
/** The game's effects are quiet synths: the effects bus gets this lift. */
const MASTER = 3;
const VOICE_GAIN = 0.8;

/** How heavy the bites have got by t, 0 .. 1: the bed deepens with them, drops under the game card and the end. */
export function bedAt(t: number): number {
  if (t >= T.quick - 0.3 && t < T.speaking) return 0.1;
  if (t >= T.inkfishFree) return 0.1;
  if (t >= T.forSizeTwist) return 0.3;
  let k = 0.15;
  for (const b of BITES) if (t >= b.at && !b.preview) k = 0.25 + 0.75 * weight(SPECIES[b.animal].lb);
  if (t < BITES[1]!.at && t >= 0) k = t < T.online ? 0.7 : 0.25;
  return k;
}

/** The low drone: detuned triangles that get louder and drop in pitch as the bites grow. */
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

export async function renderBitecompAudio(start = 0): Promise<Blob> {
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
