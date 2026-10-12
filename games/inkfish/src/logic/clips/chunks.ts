import type { Span } from './moments';

/** One encoded video frame, timed on the recording's clock (seconds). */
export interface Timed<T> {
  readonly t: number;
  /** A keyframe: decoding can start here. */
  readonly key: boolean;
  readonly data: T;
}

interface Group<T> {
  readonly start: number;
  /** Where the next group starts, once it has. */
  end: number | null;
  readonly chunks: Timed<T>[];
}

interface Pin extends Span {
  readonly score: number;
}

export interface ChunkStoreOptions {
  /** Every frame from the last this many seconds is kept (the lead-in to the ending). */
  readonly keepSeconds: number;
  /** At most this many pinned moments; the lowest-scoring go first. */
  readonly maxPins: number;
}

/** Frame spacing assumed for the newest frame, before a later one shows the real spacing. */
const DEFAULT_FRAME_S = 1 / 30;

/**
 * The encoded video of a level, kept lean: the last few seconds, plus the
 * moments pinned as highlight material. Frames are kept and dropped a whole
 * group of pictures (keyframe to keyframe) at a time, so whatever is kept
 * can still be decoded.
 */
export class ChunkStore<T> {
  private groups: Group<T>[] = [];
  private pins: Pin[] = [];

  constructor(private readonly opts: ChunkStoreOptions) {}

  /** Frames must arrive in time order. */
  add(chunk: Timed<T>): void {
    const last = this.groups.at(-1);
    if (chunk.key) {
      if (last) last.end = chunk.t;
      this.groups.push({ start: chunk.t, end: null, chunks: [chunk] });
    } else if (last) {
      last.chunks.push(chunk);
    }
    // A frame before the first keyframe can't be decoded: dropped.
  }

  pin(pin: Pin): void {
    this.pins = [...this.pins, pin].sort((a, b) => b.score - a.score).slice(0, this.opts.maxPins);
  }

  /** Drops footage that is neither recent nor pinned. */
  prune(now: number): void {
    const cutoff = now - this.opts.keepSeconds;
    const last = this.groups.at(-1);
    this.groups = this.groups.filter((g) => {
      const span = this.spanOf(g);
      return g === last || span.to > cutoff || this.pins.some((p) => span.from < p.to && p.from < span.to);
    });
  }

  /** The stretches of footage kept, in order. */
  spans(): Span[] {
    const out: Span[] = [];
    for (const g of this.groups) {
      const span = this.spanOf(g);
      const prev = out.at(-1);
      if (prev && prev.to === span.from) out[out.length - 1] = { from: prev.from, to: span.to };
      else out.push(span);
    }
    return out;
  }

  /** Frames from the keyframe at or before `from` through `to`; empty when `from` isn't kept. */
  slice(from: number, to: number): Timed<T>[] {
    const first = this.groups.findIndex((g) => {
      const span = this.spanOf(g);
      return span.from <= from && span.to > from;
    });
    if (first < 0) return [];
    const out: Timed<T>[] = [];
    for (let i = first; i < this.groups.length; i++) {
      const g = this.groups[i]!;
      // A gap in the footage ends the slice.
      if (i > first && this.spanOf(this.groups[i - 1]!).to !== g.start) break;
      for (const c of g.chunks) {
        if (c.t > to + 1e-6) return out;
        out.push(c);
      }
    }
    return out;
  }

  clear(): void {
    this.groups = [];
    this.pins = [];
  }

  private spanOf(g: Group<T>): Span {
    if (g.end !== null) return { from: g.start, to: g.end };
    const n = g.chunks.length;
    const step = n > 1 ? g.chunks[n - 1]!.t - g.chunks[n - 2]!.t : DEFAULT_FRAME_S;
    return { from: g.start, to: g.chunks[n - 1]!.t + step };
  }
}
