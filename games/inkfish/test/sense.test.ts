import { describe, expect, it } from 'vitest';
import { SENSE, sensedPrey } from '../src/logic/sense';
import { PLAYER_STATS } from '../src/levels/playerStats';

describe('shark sense', () => {
  const me = { x: 0, y: 0, size: 40 };
  const fish = [
    { id: 'near snack', x: 200, y: 0, size: 10 },
    { id: 'far snack', x: SENSE.range + 50, y: 0, size: 10 },
    { id: 'near hunter', x: 100, y: 100, size: 90 },
    { id: 'diagonal snack', x: 300, y: 300, size: 12 },
  ];

  it('feels the prey close by, and nothing out of range', () => {
    expect(sensedPrey(me, fish).map((f) => f.id)).toEqual(['near snack', 'diagonal snack']);
  });

  it('only senses what it could eat', () => {
    expect(sensedPrey({ ...me, size: 5 }, fish)).toEqual([]);
  });

  it('belongs to the mako alone', () => {
    const sensing = Object.entries(PLAYER_STATS).filter(([, s]) => s.sense).map(([id]) => id);
    expect(sensing).toEqual(['mako']);
  });
});
