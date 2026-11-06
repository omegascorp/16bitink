import { SoundBoard, type Sfx } from '../../src/audio/sfx';
import { foldLoop, peakTo, RATE, rotatedWav } from './audioKit';
import type { Cue } from './driver';
import { ACTIONS, LOOP_S, SEGMENT_START, SHIFT_S, SWAP_C, wrapCycle } from './plan';

/** The soundtrack peaks about this far below full scale. */
const PEAK_DB = -4;
/** The game's own minimum gap between two of the same sound (audio/sfx.ts GAP_MS), in seconds. */
const GAP_S: Readonly<Record<Sfx, number>> = { pull: 0.06, blocked: 0.15, jump: 0.12, stomp: 0.12, sizzle: 0.14, coin: 0.045, splash: 0.22, squelch: 0.2, win: 0.5, fail: 0.5, tap: 0.06, gate: 0.08, crack: 0.12, thud: 0.16, ruby: 0.06 };

/** A sound at video time `at` (seconds into the loop; before 0 wraps to the end). */
export interface Placed {
  readonly at: number;
  readonly name: Sfx;
  readonly strength: number;
  /** Relative loudness. */
  readonly gain: number;
}

const toVideoTime = (c: number): number => wrapCycle(c - SHIFT_S);

/**
 * Every sound of the loop, by video time: what the game's scene asked its
 * SoundBoard for (throttled by the board's own gaps), a soft tick for the
 * timer while the pins wait, and the finger landing on each pin.
 */
export function placeCues(cues: readonly Cue[]): Placed[] {
  const out: Placed[] = [];
  const last = new Map<Sfx, number>();
  for (const cue of [...cues].sort((a, b) => a.c - b.c)) {
    const prev = last.get(cue.name);
    if (prev !== undefined && cue.c - prev < GAP_S[cue.name]) continue;
    last.set(cue.name, cue.c);
    // The scene's pre-roll and wipes make no sounds of their own; the wipe's whoosh is added below.
    out.push({ at: toVideoTime(cue.c), name: cue.name, strength: cue.strength, gain: 1 });
  }
  // The timer: a tick every half second while the board waits for a pull, softer than the game's sounds.
  for (const seg of ['wrong', 'right'] as const) {
    const first = Math.min(...ACTIONS[seg].filter((a) => a.kind === 'tap').map((a) => a.at));
    const start = SEGMENT_START[seg] + (seg === 'wrong' ? 0.5 : 0.6);
    for (let c = start; c < SEGMENT_START[seg] + first - 0.2; c += 0.5) out.push({ at: toVideoTime(c), name: 'tap', strength: 1, gain: 0.35 });
  }
  // A finger landing on a pin, just before the pull.
  for (const seg of ['wrong', 'right'] as const) {
    for (const a of ACTIONS[seg]) if (a.kind === 'tap') out.push({ at: toVideoTime(SEGMENT_START[seg] + a.at - 0.04), name: 'tap', strength: 1, gain: 0.8 });
  }
  return out;
}

/** A pour: filtered noise that swells and falls, low and thick for lava, bright for water. */
function pour(ctx: OfflineAudioContext, out: AudioNode, noise: AudioBuffer, at: number, dur: number, from: number, to: number, gain: number): void {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 0.8;
  filter.frequency.setValueAtTime(from, at);
  filter.frequency.exponentialRampToValueAtTime(to, at + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + dur * 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(filter).connect(g).connect(out);
  src.start(at, 0.1);
  src.stop(at + dur + 0.05);
}

/** The ink wipe's whoosh: a quick bright sweep. */
function whoosh(ctx: OfflineAudioContext, out: AudioNode, noise: AudioBuffer, at: number): void {
  pour(ctx, out, noise, at, WIPE_SOUND_S, 600, 5200, 0.2);
}
const WIPE_SOUND_S = 0.5;

function noiseBuffer(ctx: OfflineAudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let seed = 7;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 16807) % 2147483647;
    data[i] = (seed / 2147483647) * 2 - 1;
  }
  return buf;
}

/** A context whose clock reads `at`, for the SoundBoard, which plays "now". */
function clockedAt(ctx: OfflineAudioContext, at: number): OfflineAudioContext {
  return new Proxy(ctx, {
    get(target, prop) {
      if (prop === 'currentTime') return at;
      const v = (target as unknown as Record<string | symbol, unknown>)[prop];
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
    },
  });
}

/** Renders the loop's sounds as a WAV that starts `start` seconds in. */
export async function renderAudio(cues: readonly Cue[], start: number): Promise<Blob> {
  const ctx = new OfflineAudioContext(2, Math.ceil((LOOP_S + 2) * RATE), RATE);
  const noise = noiseBuffer(ctx);
  const bus = (level: number): GainNode => {
    const g = ctx.createGain();
    g.gain.value = level;
    g.connect(ctx.destination);
    return g;
  };
  // The game's board plays through its own master (0.5 in the game); the timer's ticks and the finger's taps through a lower one.
  const loud = bus(0.5);
  const soft = bus(0.5 * 0.4);
  const board = new SoundBoard() as unknown as { ctx: unknown; master: unknown; noise: unknown; muted: boolean; lastAt: Map<Sfx, number>; play(name: Sfx, strength: number): void };
  board.noise = noise;
  board.muted = false;
  for (const p of placeCues(cues)) {
    board.master = p.gain < 1 ? soft : loud;
    board.ctx = clockedAt(ctx, p.at);
    board.lastAt.clear();
    board.play(p.name, p.strength);
  }
  // Pours: the water falls with a bright rush, the lava with a low, thick one; the wipes whoosh.
  const rush = (seg: 'wrong' | 'right', pin: string, dur: number, from: number, to: number, gain: number): void => {
    const a = ACTIONS[seg].find((x) => x.kind === 'tap' && x.pin === pin);
    if (a) pour(ctx, loud, noise, toVideoTime(SEGMENT_START[seg] + a.at), dur, from, to, gain);
  };
  rush('wrong', 'W', 1.4, 2800, 700, 0.5);
  rush('wrong', 'L', 1.1, 380, 140, 0.45);
  rush('right', 'L', 1.3, 380, 140, 0.5);
  rush('right', 'W', 1.6, 2800, 700, 0.5);
  whoosh(ctx, loud, noise, toVideoTime(0));
  whoosh(ctx, loud, noise, toVideoTime(SWAP_C));
  const rendered = await ctx.startRendering();
  const channels = foldLoop(rendered, LOOP_S);
  peakTo(channels, PEAK_DB);
  return rotatedWav(channels, LOOP_S, start);
}
