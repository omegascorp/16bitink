import type { SfxId } from '../../../src/audio/recipes';
import { bed, foldLoop, mixInto, offlineMix, peakTo, rotatedWav } from '../audioKit';
import type { Recording } from '../play/director';
import { cuesOf, rollOf } from '../play/sounds';
import { toScreen } from '../play/stage';
import { viewAt } from './story';

/** The mix's balance against the game's own levels: the heartbeat and the Hedgehog up front, the clacks a touch under. */
const GAINS: Partial<Record<SfxId, number>> = { danger: 1.5, snuffle: 1.3, munch: 1.25, charm: 1.1, stuck: 0.9, join: 0.9 };
/** The bed (the allotment's breeze and the roll of the line) under the effects. */
const BED_GAIN = 0.55;
const TAIL_S = 2;

/** The game's effects for the recorded loop, over the game's bed, peaking at −4 dB like the other shorts. */
export async function renderHedgehogAudio(rec: Recording, start: number): Promise<Blob> {
  const L = rec.loopS;
  const { ctx, play } = offlineMix(L + TAIL_S, 0.75);
  for (const c of cuesOf(rec, (p, t) => toScreen(p, viewAt(t)).x, GAINS)) play(c.id, c.t, c.pitch, c.gain, c.pan);
  const channels = foldLoop(await ctx.startRendering(), L);
  mixInto(channels, bed(channels[0]!.length, 2, rollOf(rec)), BED_GAIN);
  peakTo(channels, -4);
  return rotatedWav(channels, L, start);
}
