import { MIN_GAP_MS, pitchForCombo, type SfxId } from '../../../src/audio/recipes';
import type { Pt } from '../../../src/logic/path';
import { FPS, type Recording, type StageEvent } from './director';

/**
 * The game's sound effects for a recorded board, the way GameScene.react
 * plays them: which effect each event makes, a pop pitched up a step per
 * combo link, the same throttling (MIN_GAP_MS), and each sound panned to
 * where it happens on screen. DOM-free, so the tests can check the cues.
 */
export interface Cue {
  readonly t: number;
  readonly id: SfxId;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

/** The effect an event makes in the game (GameScene.react), or null. */
function effectOf(e: StageEvent): { id: SfxId; pitch?: number } | null {
  switch (e.type) {
    case 'spit': return { id: e.dragonfly ? 'dragonfly' : e.geode ? 'crystal' : 'spit' };
    case 'swap': return { id: 'swap' };
    case 'stuck': return { id: 'stuck' };
    case 'pop': return { id: 'pop', pitch: pitchForCombo(e.combo) };
    case 'pull': return { id: 'pull' };
    case 'join': return { id: 'join' };
    case 'gap': return { id: 'gap' };
    case 'streak': return { id: 'streak' };
    case 'charm': return { id: 'charm' };
    case 'caught': return { id: 'catch' };
    case 'hedgehog': return { id: 'snuffle' };
    case 'munch': return { id: 'munch' };
    case 'danger': return { id: 'danger' };
    case 'rush': return { id: 'rush' };
    case 'well': return { id: 'well' };
    case 'filled': return { id: 'filled' };
    default: return null;
  }
}

/**
 * Every effect in the recorded loop, as cues at loop times [0, loopS). `where`
 * gives an event's screen x (for its pan), or null for the middle; `gains`
 * scales any effect (the mix's balance).
 */
export function cuesOf(rec: Recording, where: (p: Pt, t: number) => number | null, gains: Partial<Record<SfxId, number>> = {}): Cue[] {
  const last = new Map<SfxId, number>();
  const out: Cue[] = [];
  // Throttle as the game does, the loop before included (it decides what plays just after the seam).
  for (const { t, e } of [...rec.events].sort((a, b) => a.t - b.t)) {
    const fx = effectOf(e);
    if (!fx) continue;
    const prev = last.get(fx.id);
    if (prev !== undefined && (t - prev) * 1000 < MIN_GAP_MS[fx.id]) continue;
    last.set(fx.id, t);
    if (t < 0 || t >= rec.loopS) continue;
    const x = 'x' in e && 'y' in e ? where({ x: e.x, y: e.y }, t) : null;
    const pan = x === null ? 0 : Math.max(-1, Math.min(1, ((x - 540) / 540) * 0.8));
    out.push({ t, id: fx.id, pitch: fx.pitch ?? 1, gain: gains[fx.id] ?? 1, pan });
  }
  return out;
}

/** How hard the lines roll at each point u (0..1) of the loop, for the bed's rumble: the recording's own, eased as the game eases it (ROLL_TAU). */
export function rollOf(rec: Recording): (u: number) => number {
  const n = rec.frames.length;
  const raw = rec.frames.map((f) => f.rolling);
  // A one-pole ease, run round the loop twice so it has no seam.
  const k = 1 - Math.exp(-1 / (FPS * 0.15));
  const eased = new Array<number>(n).fill(raw[0] ?? 0);
  let y = raw[0] ?? 0;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      y += (raw[i]! - y) * k;
      eased[i] = y;
    }
  }
  return (u) => {
    const x = (((u % 1) + 1) % 1) * n;
    const i = Math.floor(x);
    const a = eased[i % n]!;
    const b = eased[(i + 1) % n]!;
    return a + (b - a) * (x - i);
  };
}
