import { describe, expect, it } from 'vitest';
import { planReel, REEL, reelSeconds, type Shot } from '../src/logic/clips/reel';
import type { Moment } from '../src/logic/clips/moments';

const footage = [{ from: 0, to: 62 }];
const moments: Moment[] = [{ kind: 'birdCombo', at: 20, weight: 2 }, { kind: 'giant', at: 35 }];
const kinds = (shots: readonly Shot[]): string[] => shots.map((s) => s.kind);

describe('clip reel', () => {
  it('opens on the ending, then rewinds through the best moments', () => {
    const shots = planReel(60, moments, footage);
    expect(kinds(shots)).toEqual(['climax', 'hold', 'rewind', 'highlight', 'highlight', 'leadIn']);
  });

  it('loops: the lead-in ends on the frame the climax starts from', () => {
    const shots = planReel(60, moments, footage);
    expect(shots.at(-1)!.to).toBeCloseTo(shots[0]!.from);
    expect(shots.at(-1)!.to - shots.at(-1)!.from).toBeCloseTo(REEL.leadIn);
  });

  it('plays the climax slowed down, and highlights at full speed', () => {
    const shots = planReel(60, moments, footage);
    expect(shots[0]!.speed).toBeLessThan(1);
    for (const s of shots.filter((s) => s.kind === 'highlight')) expect(s.speed).toBe(1);
  });

  it('holds and rewinds on a still frame: the last frame of the climax', () => {
    const shots = planReel(60, moments, footage);
    const climax = shots[0]!;
    for (const s of shots.filter((s) => s.kind === 'hold' || s.kind === 'rewind')) {
      expect(s.from).toBe(climax.to);
      expect(s.to).toBe(climax.to);
      expect(s.seconds).toBeGreaterThan(0);
    }
  });

  it('keeps the climax within the footage there is after the ending', () => {
    const shots = planReel(60, [], [{ from: 0, to: 60.5 }]);
    expect(shots[0]!.to).toBe(60.5);
  });

  it('still makes a clip with no highlights', () => {
    expect(kinds(planReel(60, [], footage))).toEqual(['climax', 'hold', 'rewind', 'leadIn']);
  });

  it('shortens the lead-in when the level was shorter than it', () => {
    const shots = planReel(1.5, [], [{ from: 0, to: 3 }]);
    expect(shots.at(-1)!.from).toBe(0);
  });

  it('makes no clip when the ending was not recorded', () => {
    expect(planReel(60, moments, [{ from: 0, to: 30 }])).toEqual([]);
  });

  it('stays short enough for a short', () => {
    const many: Moment[] = Array.from({ length: 12 }, (_, i) => ({ kind: 'giant', at: i * 4 + 2 }));
    expect(reelSeconds(planReel(60, many, footage))).toBeLessThanOrEqual(16);
  });
});
