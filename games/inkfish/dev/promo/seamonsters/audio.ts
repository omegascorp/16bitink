import type { SfxId } from '../../../src/audio/recipes';
import { ambience, offlineMix, RATE, wavOf } from '../audioKit';
import { EXTRA, type Extra } from '../swallowyou/audio';
import { LEGEND_BEATS } from './cards';
import { MEASURES, ROLL_S, STAMP_TIMES } from './hud';
import { MONSTERS } from './species';
import { ARRIVE, sectionStart, T, VIDEO_S } from './timeline';

/**
 * The soundtrack: the narrator straight to the output; a paper rustle as
 * each legend card comes up, a stamp's thump on its REAL and a rip as it
 * tears; a whoosh as each animal swims in; the counter ticking up and
 * thumping when it lands; a smaller thump as each legend on the map is
 * stamped; the game's gulps and splashes where the story needs them; a
 * sound per mood (a boom for the shocks, a boing for the jokes, a shimmer
 * for the wonder, a swell for the dread); and a low bed of sea hum and
 * drone that grows as the row does.
 */

export interface Cue {
  readonly id: SfxId | Extra;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan?: number;
}

const cue = (id: SfxId | Extra, t: number, pitch: number, gain: number, pan = 0): Cue => ({ id, t, pitch, gain, pan });
const s = sectionStart;

/** Each legend card: rustled up, stamped, torn. */
function legendCues(): Cue[] {
  return LEGEND_BEATS.flatMap((b) => [
    cue('rustle', b.from + 0.05, 0.8, 0.3, 0.3),
    cue('thump', b.stamp, 1, 0.34),
    cue('rustle', b.tear, 1.6, 0.4),
    cue('rustle', b.tear + 0.18, 1.3, 0.3),
  ]);
}

/** Each animal swimming in, lower for the bigger ones. */
function arriveCues(): Cue[] {
  return MONSTERS.map((m, i) => cue('dash', ARRIVE[m] + 0.3, 1.1 - 0.09 * i, 0.3, 0.5));
}

/** The counter: ticks as it rolls, a thump as it lands. */
function counterCues(): Cue[] {
  return MEASURES.flatMap((m) => [
    ...Array.from({ length: 7 }, (_, k) => cue('tick', m.at + (k * ROLL_S) / 7, 1 + 0.05 * k, 0.3)),
    cue('thump', m.at + ROLL_S, 1.5, 0.25),
  ]);
}

export const CUES: readonly Cue[] = [
  // 0 · cold open: the engravings, the rip, the real eye, the row, the string.
  cue('swell', 0, 0.8, 0.35),
  cue('rustle', 0.1, 0.7, 0.3),
  cue('splash', T.serpents + 0.2, 0.7, 0.35),
  cue('boom', T.island + 0.7, 0.55, 0.25),
  cue('clang', T.whaleShip + 0.6, 0.5, 0.25),
  cue('boom', T.whaleShip + 0.6, 0.45, 0.35),
  cue('rustle', T.justMaking, 1.7, 0.5),
  cue('rustle', T.justMaking + 0.2, 1.3, 0.35),
  cue('shimmer', T.real, 1, 0.16),
  ...Array.from({ length: 7 }, (_, i) => cue('dash', T.lining + i * 0.42, 1.3 - 0.1 * i, 0.15, -0.5 + i * 0.16)),
  cue('thump', T.megalodon + 0.4, 0.9, 0.3),
  cue('thump', T.godzilla + 0.4, 0.85, 0.3),
  cue('swell', T.longest, 0.9, 0.3),
  cue('drop', T.oneAnimal + 0.2, 0.6, 0.2),
  ...legendCues(),
  ...arriveCues(),
  ...counterCues(),
  ...STAMP_TIMES.map((at) => cue('thump', at + 0.4, 1.9, 0.18, 0.7)),
  // 1 · you
  cue('boing', T.small, 1.1, 0.12),
  // 2 · frilled shark: the teeth, the calendar.
  cue('lash', T.teeth, 0.9, 0.25),
  ...Array.from({ length: 4 }, (_, k) => cue('rustle', T.pregnant + 0.15 + k * 0.4, 1.4, 0.18)),
  cue('ding', T.years, 1.2, 0.25),
  cue('swell', T.scientist, 1, 0.2),
  // 3 · manatee: the quote, the joke, the blink.
  cue('boing', T.pretty + 0.6, 0.9, 0.14),
  ...Array.from({ length: 6 }, (_, k) => cue('click', T.salad + k * 0.16, 0.5, 0.14)),
  cue('boing', T.rude, 1, 0.16),
  // 4 · oarfish: the wonder, the quake, no link.
  cue('shimmer', T.oarfish, 1, 0.14),
  cue('boom', T.earthquake, 0.35, 0.4),
  cue('swell', T.earthquake, 0.6, 0.3),
  ...Array.from({ length: 10 }, (_, k) => cue('click', T.checked + 0.1 + k * 0.15, 1.2 + 0.03 * k, 0.12)),
  cue('thump', T.noLink, 0.9, 0.3),
  cue('boing', T.badDay, 0.8, 0.14),
  // 5 · the game.
  cue('powerup', T.game, 1, 0.18),
  cue('eat', T.eatUp - 0.4, 1.4, 0.3),
  cue('eat', T.eatUp + 0.5, 1.3, 0.3),
  cue('grow', T.eatUp + 1.3, 1, 0.22),
  // 6 · basking shark: the carcass, the headline, the tunnel mouth, the rot.
  cue('swell', s(6), 0.7, 0.3),
  cue('boom', T.dinosaurs, 0.55, 0.3),
  cue('suck', T.plankton - 0.3, 0.7, 0.3),
  cue('rustle', T.jaw, 0.6, 0.3),
  cue('drop', T.plesiosaur, 0.8, 0.2),
  cue('boing', T.nessie, 0.9, 0.15),
  // 7 · giant squid: the island's eye, the plate, the camera, the dark.
  cue('swell', T.kraken, 0.75, 0.3),
  cue('boom', T.islandWord + 0.3, 0.5, 0.3),
  cue('shimmer', T.plates, 1.1, 0.15),
  cue('zap', T.y2012 - 0.4, 0.6, 0.08),
  cue('swell', T.dark, 0.55, 0.4),
  // 8 · sperm whale: the brain, the Essex hit twice and sunk, the book.
  cue('shimmer', T.brain, 0.9, 0.14),
  cue('boom', T.essex + 0.2, 0.45, 0.4),
  cue('clang', T.essex + 0.2, 0.5, 0.2),
  cue('boom', T.twice + 0.1, 0.4, 0.45),
  cue('clang', T.twice + 0.1, 0.45, 0.22),
  cue('splash', T.sank, 0.5, 0.5),
  cue('rustle', T.melville, 0.8, 0.3),
  cue('boing', T.fight + 0.5, 0.85, 0.12),
  // 9 · blue whale: its shadow, two slow heartbeats, seventeen yous.
  cue('swell', T.noSailor, 0.6, 0.4),
  cue('heart', T.twoBeats, 0.8, 0.5),
  cue('heart', T.twoBeats + 1.6, 0.8, 0.5),
  cue('shimmer', T.biggestEver, 0.9, 0.15),
  ...Array.from({ length: 17 }, (_, k) => cue('tick', T.seventeen + (k * 1.6) / 17, 1 + 0.03 * k, 0.22)),
  // 10 · the siphonophore: the twist, the ROV, the clones, the crowd, every monster real.
  cue('drop', T.notLength, 0.7, 0.25),
  cue('swell', T.notLength, 0.8, 0.3),
  cue('zap', T.y2020, 0.8, 0.08),
  cue('shimmer', T.string, 1.2, 0.16),
  cue('boom', T.longer, 0.6, 0.3),
  cue('shimmer', T.clones, 1.3, 0.14),
  cue('ding', T.swim, 1, 0.25),
  cue('ding', T.sting, 1.12, 0.25),
  cue('ding', T.eat, 1.26, 0.25),
  cue('boing', T.crowd + 0.6, 1, 0.12),
  cue('boing', T.crowd + 1.7, 0.85, 0.12),
  cue('win', T.allReal + 0.3, 1, 0.2),
  cue('boom', T.weirder + 0.6, 0.5, 0.3),
];

const isExtra = (id: SfxId | Extra): id is Extra => id in EXTRA;

const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
/** The game's effects are quiet synths: the effects bus gets this lift. */
const MASTER = 3;
const VOICE_GAIN = 0.8;

/** How big the row is at t, 0 .. 1: the bed grows with it, and drops under the game card and the end. */
export function bedAt(t: number): number {
  if (t >= s(5) - 0.3 && t < s(6) - 0.4) return 0.15;
  if (t >= T.end) return 0.1;
  const arrived = MONSTERS.filter((m) => t >= ARRIVE[m]).length;
  return 0.25 + (0.75 * arrived) / MONSTERS.length;
}

/** The low drone under the bed: detuned low triangles whose level follows bedAt. */
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

export async function renderSeamonstersAudio(start = 0): Promise<Blob> {
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
