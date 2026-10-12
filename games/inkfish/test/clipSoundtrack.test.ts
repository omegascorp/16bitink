import { describe, expect, it } from 'vitest';
import { placeSounds } from '../src/logic/clips/soundtrack';
import type { Shot } from '../src/logic/clips/reel';

const note = (t: number, pitch = 1) => ({ t, id: 'eat' as const, pitch, gain: 1, pan: 0 });
const shots: Shot[] = [
  { kind: 'climax', from: 10, to: 11, speed: 0.5, seconds: 2 },
  { kind: 'hold', from: 11, to: 11, speed: 0, seconds: 1 },
  { kind: 'rewind', from: 11, to: 11, speed: 0, seconds: 0.5 },
  { kind: 'highlight', from: 2, to: 4, speed: 1, seconds: 2 },
  { kind: 'leadIn', from: 8, to: 10, speed: 1, seconds: 2 },
];

describe('clip soundtrack', () => {
  it('places each sound where its footage plays in the clip', () => {
    const placed = placeSounds(shots, [note(3), note(9)]).filter((n) => n.id === 'eat');
    // The highlight starts 3.5 s in (2 + 1 + 0.5); 3 is a second into it.
    expect(placed.map((n) => n.t)).toEqual([4.5, 6.5]);
  });

  it('stretches and deepens sounds in slow motion', () => {
    const [placed] = placeSounds(shots, [note(10.5)]).filter((n) => n.id === 'eat');
    expect(placed!.t).toBeCloseTo(1);
    expect(placed!.pitch).toBeLessThan(1);
  });

  it('plays a sound in every shot whose footage it falls in', () => {
    const overlapping: Shot[] = [
      { kind: 'highlight', from: 0, to: 2, speed: 1, seconds: 2 },
      { kind: 'leadIn', from: 1, to: 3, speed: 1, seconds: 2 },
    ];
    expect(placeSounds(overlapping, [note(1.5)]).map((n) => n.t)).toEqual([1.5, 2.5]);
  });

  it('leaves out sounds from footage the clip skips', () => {
    expect(placeSounds(shots, [note(6)]).filter((n) => n.id === 'eat')).toEqual([]);
  });

  it('whooshes on the rewind', () => {
    const whoosh = placeSounds(shots, []).find((n) => n.id === 'dash');
    expect(whoosh?.t).toBe(3);
  });
});
