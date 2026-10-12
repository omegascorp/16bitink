import { describe, expect, it } from 'vitest';
import { ChunkStore } from '../src/logic/clips/chunks';

/** Frames at 10 fps with a keyframe every second, `seconds` long. */
function film(store: ChunkStore<number>, from: number, seconds: number): void {
  for (let i = 0; i < seconds * 10; i++) {
    const t = from + i / 10;
    store.add({ t, key: i % 10 === 0, data: Math.round(t * 10) });
  }
}

describe('clip chunk store', () => {
  it('keeps only the last few seconds of a long recording', () => {
    const store = new ChunkStore<number>({ keepSeconds: 3, maxPins: 4 });
    film(store, 0, 20);
    store.prune(20);
    const spans = store.spans();
    expect(spans).toHaveLength(1);
    expect(spans[0]!.from).toBeGreaterThanOrEqual(16);
    expect(spans[0]!.from).toBeLessThanOrEqual(17);
    expect(spans[0]!.to).toBeCloseTo(20);
  });

  it('keeps pinned moments however old they are', () => {
    const store = new ChunkStore<number>({ keepSeconds: 3, maxPins: 4 });
    film(store, 0, 20);
    store.pin({ from: 4.5, to: 6.2, score: 10 });
    store.prune(20);
    const spans = store.spans();
    expect(spans).toHaveLength(2);
    // Whole seconds: footage is kept keyframe to keyframe.
    expect(spans[0]).toEqual({ from: 4, to: 7 });
  });

  it('drops the lowest-scoring pins when there are too many', () => {
    const store = new ChunkStore<number>({ keepSeconds: 1, maxPins: 2 });
    film(store, 0, 30);
    store.pin({ from: 2.2, to: 2.8, score: 5 });
    store.pin({ from: 10.2, to: 10.8, score: 1 });
    store.pin({ from: 20.2, to: 20.8, score: 9 });
    store.prune(30);
    const starts = store.spans().map((s) => s.from);
    expect(starts).toContain(2);
    expect(starts).toContain(20);
    expect(starts).not.toContain(10);
  });

  it('slices from the keyframe before the start, so the range can be decoded', () => {
    const store = new ChunkStore<number>({ keepSeconds: 30, maxPins: 4 });
    film(store, 0, 10);
    const slice = store.slice(3.45, 4.2);
    expect(slice[0]!.key).toBe(true);
    expect(slice[0]!.t).toBe(3);
    expect(slice.at(-1)!.t).toBeCloseTo(4.2);
  });

  it('slices nothing outside the footage it kept', () => {
    const store = new ChunkStore<number>({ keepSeconds: 2, maxPins: 4 });
    film(store, 0, 10);
    store.prune(10);
    expect(store.slice(1, 2)).toEqual([]);
  });

  it('forgets everything on clear', () => {
    const store = new ChunkStore<number>({ keepSeconds: 2, maxPins: 4 });
    film(store, 0, 3);
    store.clear();
    expect(store.spans()).toEqual([]);
  });

  it('ignores frames before the first keyframe: they cannot be decoded', () => {
    const store = new ChunkStore<number>({ keepSeconds: 30, maxPins: 4 });
    store.add({ t: 0, key: false, data: 0 });
    store.add({ t: 0.1, key: true, data: 1 });
    expect(store.spans()[0]!.from).toBe(0.1);
  });
});
