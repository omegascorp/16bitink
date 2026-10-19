import { describe, expect, it } from 'vitest';
import { NOTE_LINE, NOTE_LINES_MAX, placeNote, type PlacedNote } from '../src/logic/noteStack';

/** Writes notes one after another, as the game does, each placed clear of those before it. */
function write(asks: readonly { x: number; w: number; y: number }[]): number[] {
  const live: PlacedNote[] = [];
  return asks.map(({ x, w, y }) => {
    const at = placeNote(live, x, w, y);
    live.push({ x, w, at });
    return at;
  });
}

describe('notes written in the world', () => {
  it('go where they are asked when nothing is in the way', () => {
    expect(placeNote([], 100, 80, -40)).toBe(-40);
    // Side by side, far enough apart: neither moves.
    expect(write([{ x: 0, w: 80, y: 0 }, { x: 200, w: 80, y: 0 }])).toEqual([0, 0]);
  });

  it('never cover each other: a picked-up blueprint\'s two lines and the ore it spills', () => {
    // As salvaging writes them: the ore from just over the prospector, then both lines asked at the same height.
    const asks = [
      { x: 0, w: 120, y: -10 },
      { x: 0, w: 120, y: -10 },
      { x: 0, w: 180, y: -40 },
      { x: 0, w: 220, y: -40 },
    ];
    const at = write(asks);
    for (let i = 0; i < at.length; i++) {
      for (let j = i + 1; j < at.length; j++) expect(Math.abs(at[i]! - at[j]!)).toBeGreaterThanOrEqual(NOTE_LINE);
    }
    // The last written reads on top.
    expect(Math.min(...at)).toBe(at[3]);
  });

  it('move up past a note that only partly covers them, and past each above it in turn', () => {
    const live: PlacedNote[] = [{ x: 0, w: 100, at: -40 }, { x: 0, w: 100, at: -40 - NOTE_LINE }];
    expect(placeNote(live, 60, 100, -50)).toBe(-40 - NOTE_LINE * 2);
  });

  it('start again where they were asked after a long run, as a blast\'s worth of pieces does', () => {
    const at = write(Array.from({ length: NOTE_LINES_MAX + 3 }, () => ({ x: 0, w: 100, y: 0 })));
    expect(at.slice(0, NOTE_LINES_MAX + 1)).toEqual(Array.from({ length: NOTE_LINES_MAX + 1 }, (_, i) => 0 - i * NOTE_LINE));
    expect(at[NOTE_LINES_MAX + 1]).toBe(0);
  });
});
