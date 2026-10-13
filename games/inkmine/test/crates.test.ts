import { describe, expect, it } from 'vitest';
import { CrateSim } from '../src/logic/crateSim';
import { CRATE } from '../src/logic/crates';
import { ORES } from '../src/logic/ore';
import { TILE, tileAt } from '../src/logic/terrain';
import { grid } from './helpers';

const none = (_x: number, _y: number): boolean => false;
const burn = (sim: CrateSim, seconds: number, occupied: (x: number, y: number) => boolean = none) => {
  const out = { changed: [] as unknown[], blasts: [] as ReturnType<CrateSim['step']>['blasts'] };
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    const r = sim.step(1 / 60, occupied);
    out.changed.push(...r.changed);
    out.blasts.push(...r.blasts);
  }
  return out;
};

describe('crates', () => {
  it('a bomb breaks soil and stone around it but not deep rock or bedrock', () => {
    const t = grid(['sst', 'sbd', 'c#s']);
    const sim = new CrateSim(t);
    sim.light(1, 1);
    const { blasts } = burn(sim, CRATE.fuse + 0.05);
    expect(blasts).toHaveLength(1);
    expect(tileAt(t, 1, 1)).toBe(TILE.air);
    expect(tileAt(t, 0, 0)).toBe(TILE.air);
    expect(tileAt(t, 2, 0)).toBe(TILE.air);
    expect(tileAt(t, 2, 1)).toBe(TILE.deep);
    expect(tileAt(t, 1, 2)).toBe(TILE.bedrock);
    expect(blasts[0]!.ores).toEqual([{ ore: ORES.copper.id, tile: [0, 2] }]);
  });

  it('dynamite clears its row', () => {
    const t = grid(['sssssysssss']);
    const sim = new CrateSim(t);
    sim.light(5, 0);
    burn(sim, CRATE.fuse + 0.05);
    expect([...t.tiles].map((v) => (v === TILE.air ? '.' : 's')).join('')).toBe('s.........s');
  });

  it('a blast sets off the crates it reaches, which go a moment later', () => {
    const t = grid(['sbbs']);
    const sim = new CrateSim(t);
    sim.light(1, 0);
    expect(burn(sim, CRATE.fuse + 0.02).blasts).toHaveLength(1);
    expect(sim.isLit(2, 0)).toBe(true);
    expect(burn(sim, CRATE.chainFuse + 0.02).blasts).toHaveLength(1);
    expect(tileAt(t, 3, 0)).toBe(TILE.air);
  });

  it('crates fall when undermined, keep their fuse, and wait on whoever is under them', () => {
    const t = grid(['b', '.', '.', 's']);
    const sim = new CrateSim(t);
    sim.light(0, 0, 5);
    burn(sim, CRATE.fallStep * 4);
    expect(tileAt(t, 0, 2)).toBe(TILE.crate);
    expect(sim.isLit(0, 2)).toBe(true);
    const t2 = grid(['b', '.', 's']);
    const held = new CrateSim(t2);
    burn(held, 1, (x, y) => x === 0 && y === 1);
    expect(tileAt(t2, 0, 0)).toBe(TILE.crate);
  });
});
