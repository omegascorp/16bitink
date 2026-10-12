import { foldLoop, offlineMix, RATE } from '../audio/offline';
import { placeSounds } from '../logic/clips/soundtrack';
import type { Shot } from '../logic/clips/reel';
import type { SoundNote } from './types';

/** Overall loudness of the clip's effects. */
const MASTER = 1.4;
/** Sounds near the end ring on this long, then fold round to the start (the clip loops). */
const TAIL_S = 1.5;

/** The clip's soundtrack, rebuilt from the game's own synthesized effects, `seconds` long. */
export async function renderSoundtrack(shots: readonly Shot[], sounds: readonly SoundNote[], seconds: number): Promise<AudioBuffer> {
  const { ctx, play } = offlineMix(seconds + TAIL_S, MASTER);
  for (const n of placeSounds(shots, sounds)) play(n.id, n.t, n.pitch, n.gain, n.pan);
  const channels = foldLoop(await ctx.startRendering(), seconds);
  const buffer = new AudioBuffer({ length: channels[0]!.length, numberOfChannels: channels.length, sampleRate: RATE });
  channels.forEach((ch, c) => buffer.copyToChannel(ch as Float32Array<ArrayBuffer>, c));
  return buffer;
}
