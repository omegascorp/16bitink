import { describe, expect, it } from 'vitest';
import { Ladders } from '../src/logic/ladders';
import { newPiece, restingPiece } from '../src/logic/pieces';
import { captureWorld, savePieces } from '../src/logic/worldSave';
import { mine, run, standAt, T } from './helpers';

const SITE = [
  '..........',
  '..........',
  'ssssssssss',
  'ssssssssss',
  '##########',
];

describe('loose pieces', () => {
  it('are saved with the world at the tile they lie in', () => {
    const m = mine(SITE);
    const base = m.terrain.tiles.slice();
    m.pieces = [newPiece(1, 7.5 * T, 1.5 * T), newPiece(5, 2.5 * T, 1.5 * T)];
    const save = captureWorld(base, m.terrain, new Ladders(m.terrain), 1, [], null, savePieces(m.terrain, m.pieces, T));
    expect(save.pieces).toEqual([{ at: 1 * 10 + 7, ore: 1 }, { at: 1 * 10 + 2, ore: 5 }]);
  });

  it('come back where they lay when the world is built again, and stay until picked up', () => {
    const m = mine(SITE, { pieces: [{ at: 1 * 10 + 7, ore: 1 }] });
    standAt(m, 2, 2);
    run(m, 30);
    expect(m.pieces).toHaveLength(1);
    expect(Math.floor((m.pieces[0]!.x + m.pieces[0]!.w / 2) / T)).toBe(7);
    expect(m.pieces[0]!.onGround).toBe(true);
  });

  it('rest on the floor of their tile', () => {
    const p = restingPiece(2, 4, 1, T, 10);
    expect(p.y + p.h).toBe(2 * T);
    expect(p.x + p.w / 2).toBe(4.5 * T);
  });
});
