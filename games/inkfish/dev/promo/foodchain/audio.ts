import type { SfxId } from '../../../src/audio/recipes';
import { ambience, offlineMix, RATE, wavOf } from '../audioKit';
import { createClimbChain, createOpenChain } from './chains';
import { SMOKE_AT } from './corner';
import { sectionStart, T, VIDEO_S } from './timeline';

/**
 * The soundtrack: the narrator (voice.mp3, the section pauses already in
 * it), a gulp on every bite (high for plankton, deep for the orca), a dash
 * on every zoom, ticks while the weight tag counts up and a cheer when the
 * jump pops, and the sea's hum, swelling as the animals get bigger.
 */

interface Cue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan?: number;
}

const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): Cue => ({ id, t, pitch, gain, pan });

/** Ticks through a count-up: fast at first, slowing as the number settles. */
const ticks = (from: number, to: number, n: number): Cue[] =>
  Array.from({ length: n }, (_, i) => cue('click', from + (to - from) * Math.sqrt(i / n), 1.5 - 0.4 * (i / n), 0.09));

function chainCues(): Cue[] {
  const out: Cue[] = [];
  const open = createOpenChain();
  open.links.forEach((l, i) => {
    if (i === 0) return;
    out.push(cue('dash', l.gulp - 0.35, 0.6 + 0.1 * i, 0.3, l.dir * -0.3));
    out.push(cue(i >= 3 ? 'eatBig' : 'eat', l.gulp, 1.5 - 0.22 * i, 0.45));
  });
  const climb = createClimbChain();
  climb.links.forEach((l, i) => {
    if (i === 0) return;
    out.push(cue('dash', l.zoomFrom + 0.1, 0.5 + 0.08 * i, 0.32));
    out.push(cue(i >= 4 ? 'eatBig' : 'eat', l.gulp, 1.6 - 0.2 * i, 0.42));
    out.push(...ticks(l.zoomFrom + 0.3, l.zoomFrom + 2.2, 14));
    out.push(cue('powerup', l.zoomFrom + 2.25, 1, 0.16));
  });
  return out;
}

export const CUES: readonly Cue[] = [
  ...chainCues(),
  // The cold open: the empty top, the blue whale's lunge, the orcas.
  cue('boom', T.isnt + 0.1, 0.45, 0.2),
  cue('suck', T.paperclip - 1.2, 0.45, 0.3),
  cue('drop', T.paperclip, 1.4, 0.16),
  cue('lash', T.lessThanHalf, 0.6, 0.22),
  cue('splash', T.grainOfSalt, 1.6, 0.35),
  // The rings, and the pyramid's bands drawing in.
  cue('drop', T.glass, 1.35, 0.12),
  cue('drop', T.oneEye, 1.5, 0.12),
  cue('drop', T.net, 1.3, 0.12),
  cue('click', T.hundred, 1.1, 0.2),
  ...SMOKE_AT.map((t) => cue('rustle', t, 1.2, 0.14)),
  // The tuna: the piano lands, the muscles warm.
  cue('clang', T.piano, 0.55, 0.16),
  cue('zap', T.warm, 0.6, 0.1),
  // The game card.
  cue('powerup', T.inkfish, 1, 0.18),
  cue('eat', T.eatUp - 0.4, 1.4, 0.3),
  cue('eat', T.eatUp + 0.5, 1.3, 0.3),
  cue('grow', T.eatUp + 1.3, 1, 0.22),
  cue('lunge', T.sideDish, 0.7, 0.3),
  // The orca: the stopwatch, the great whites, the empty top.
  ...Array.from({ length: 8 }, (_, i) => cue('click', T.halfHour + i * 0.4, 0.8, 0.12, 0.6)),
  cue('spotted', T.notAFish, 1, 0.14),
  cue('dash', T.portStarboard - 0.5, 0.55, 0.35),
  cue('dash', T.greatWhites, 0.75, 0.3),
  cue('rustle', T.left, 1, 0.16),
  cue('boom', T.nothing + 0.1, 0.4, 0.22),
  // Why it stops: a seventh band that isn't there.
  cue('clang', T.hunter + 0.3, 0.5, 0.14),
  // The giants.
  cue('dash', T.whaleShark - 0.2, 0.4, 0.3),
  cue('suck', T.eatsCopepods, 0.5, 0.25),
  cue('boom', T.blueWhale, 0.35, 0.28),
  cue('suck', T.eatsKrill, 0.4, 0.35),
  cue('drop', T.paperclip9, 1.4, 0.16),
  ...ticks(T.sixteen, T.sixteen + 1.2, 10),
  cue('rustle', T.notTop, 1, 0.16),
  // The payoff.
  cue('lash', T.chaseDown, 0.55, 0.3),
  cue('splash', T.win, 0.6, 0.4),
  cue('win', T.start, 1, 0.26),
];

const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const MASTER = 3;

/** The sea's hum: light under the plankton, fuller with the big animals, quiet on the game card and the end card. */
function humAt(t: number): number {
  if (t >= sectionStart(6) && t < sectionStart(7)) return 0.15;
  if (t >= T.start) return 0.1;
  if (t < sectionStart(1)) return 0.5;
  return 0.25 + 0.5 * Math.min(1, (t - sectionStart(1)) / (sectionStart(10) - sectionStart(1)));
}

export async function renderFoodchainAudio(start = 0): Promise<Blob> {
  if (start !== 0) throw new Error('The long-form soundtrack starts at 0: it doesn’t loop');
  const { ctx, play } = offlineMix(VIDEO_S, MASTER);
  for (const c of CUES) if (c.t >= 0 && c.t < VIDEO_S) play(c.id, c.t, c.pitch, c.gain, c.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  // Mark's takes are louder than the old narrator's (see the shorts playbook).
  const gain = ctx.createGain();
  gain.gain.value = 0.8;
  voice.connect(gain).connect(ctx.destination);
  voice.start(0);
  const mix = await ctx.startRendering();
  const frames = mix.length;
  const hum = ambience(frames, Math.round(VIDEO_S / 12));
  const step = Math.round(RATE / 100);
  const level = Float32Array.from({ length: Math.ceil(frames / step) + 1 }, (_, i) => humAt((i * step) / RATE));
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
