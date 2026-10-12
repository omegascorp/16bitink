import type { SfxId } from '../../audio/recipes';
import type { Shot } from './reel';

/** A sound effect at a time: on the recording's clock going in, on the clip's coming out. */
export interface Note {
  readonly t: number;
  readonly id: SfxId;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

/**
 * The clip's sounds: each sound from the level wherever its footage plays in
 * the clip (stretched and deeper in slow motion), and a whoosh on the rewind.
 */
export function placeSounds(shots: readonly Shot[], sounds: readonly Note[]): Note[] {
  const out: Note[] = [];
  let start = 0;
  for (const shot of shots) {
    if (shot.kind === 'rewind') out.push({ t: start, id: 'dash', pitch: 0.55, gain: 0.8, pan: 0 });
    if (shot.speed > 0) {
      for (const n of sounds) {
        if (n.t < shot.from || n.t >= shot.to) continue;
        out.push({ ...n, t: start + (n.t - shot.from) / shot.speed, pitch: n.pitch * Math.sqrt(shot.speed) });
      }
    }
    start += shot.seconds;
  }
  return out;
}
