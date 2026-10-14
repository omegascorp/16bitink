import type { SfxId } from '../../../src/audio/recipes';
import { ambience, offlineMix, RATE, wavOf } from '../audioKit';
import { BITES, CALLOUTS, LANDER } from './cast';
import { SNAPS } from './open';
import { sectionStart, T, VIDEO_S } from './timeline';
import { darknessAt, depthAt } from './world';

/**
 * The soundtrack: the narrator (voice.mp3, laid on its own track with the
 * section pauses already in it), the game's synthesized effects on the
 * beats, kept quiet under the voice, and a low hum of the water that grows
 * heavier with depth.
 */

interface Cue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan?: number;
}

const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): Cue => ({ id, t, pitch, gain, pan });

const CHAPTERS = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11].map(sectionStart);

export const CUES: readonly Cue[] = [
  // The cold open.
  ...SNAPS.map((s) => cue('eat', s, 0.62, 0.5)),
  cue('dash', T.heads - 0.15, 0.5, 0.2, -0.3),
  cue('dash', T.searchlights - 0.15, 0.5, 0.2, 0.3),
  cue('zap', T.searchlights + 0.1, 0.4, 0.1),
  cue('dash', T.keepGoing + 0.1, 0.42, 0.35),
  cue('dash', T.keepGoing + 1.3, 0.38, 0.3),
  cue('boom', T.theyStop + 0.2, 0.5, 0.22),
  cue('rustle', T.line, 0.9, 0.22),
  cue('dash', LANDER.open.sink, 0.5, 0.15, 0.4),
  cue('click', LANDER.open.lamp, 0.7, 0.35, 0.4),
  cue('suck', T.swam + 0.2, 0.55, 0.14, -0.4),
  cue('dash', T.toSee + 0.3, 0.6, 0.35),
  cue('dash', T.toSee + 1.4, 0.7, 0.3),
  cue('dash', T.toSee + 2.4, 0.8, 0.25),
  cue('splash', T.puddle, 1, 0.5),
  // A page turns for each chapter; a click as each dial is drawn.
  ...CHAPTERS.map((t) => cue('rustle', t, 1.1, 0.16)),
  cue('click', T.lightFades, 1.2, 0.2, 0.5),
  cue('click', T.foodRunsOut, 1.1, 0.2, 0.6),
  cue('click', T.pressureClimbs, 1, 0.2, 0.7),
  // Bites, crunches and the perch's miss.
  ...BITES.map((b) => (b.sound === 'crunch' ? cue('smash', b.t, 1.4, 0.26) : b.sound === 'miss' ? cue('lunge', b.t - 0.2, 0.8, 0.35) : cue(b.eater === 'seadevil' ? 'eatBig' : 'eat', b.t, b.eater === 'inkling' ? 1.3 : 0.9, 0.35))),
  cue('dash', T.bigger - 0.2, 1.2, 0.25, -0.3),
  // A soft pop as each animal is ringed.
  ...CALLOUTS.map((c) => cue('drop', c.from, 1.35, 0.1)),
  // The big numbers.
  ...[T.onePercent, T.quarter, T.threeInFour, T.migration, T.fourDegrees, T.continents].map((t) => cue('click', t, 1.25, 0.14)),
  cue('splash', T.sand, 1.6, 0.12),
  // The game card, and the lights going off.
  cue('powerup', T.inkfish, 1, 0.18),
  cue('click', T.lightsOff + 0.25, 0.7, 0.5),
  // The deep.
  cue('zap', T.loosejaw, 0.35, 0.1),
  cue('boom', T.everest + 1.7, 0.55, 0.28),
  cue('suck', T.squeezes, 0.5, 0.2),
  cue('drop', T.molecule, 1.6, 0.12),
  cue('drop', T.molecule + 0.4, 1.8, 0.1),
  cue('drop', T.deeperMore, 1.7, 0.1),
  cue('splash', T.pushIn, 0.6, 0.2),
  cue('clang', T.thatsTheLine, 0.6, 0.18),
  cue('smash', T.notDeepest + 0.4, 1.6, 0.14),
  cue('spotted', T.japan, 1, 0.15),
  cue('dash', LANDER.close.sink, 0.5, 0.15, 0.4),
  cue('click', LANDER.close.lamp, 0.7, 0.35, 0.4),
  cue('grow', T.baby, 0.8, 0.25),
  cue('win', T.startTidePool + 0.3, 1, 0.3),
];

const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const MASTER = 3;

/** How loud the water's hum is at time t: barely there in the sunlit shallows, heavy in the deep. */
const humAt = (t: number): number => (t < T.puddle ? 0.7 : 0.18 + 0.6 * darknessAt(depthAt(t)));

export async function renderDescentAudio(start = 0): Promise<Blob> {
  if (start !== 0) throw new Error('The long-form soundtrack starts at 0: it doesn’t loop');
  const { ctx, play } = offlineMix(VIDEO_S, MASTER);
  for (const c of CUES) if (c.t >= 0 && c.t < VIDEO_S) play(c.id, c.t, c.pitch, c.gain, c.pan);
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  voice.connect(ctx.destination);
  voice.start(0);
  const mix = await ctx.startRendering();
  const frames = mix.length;
  const hum = ambience(frames, Math.round(VIDEO_S / 12));
  // The hum's level, eased per 10 ms so it never steps.
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
