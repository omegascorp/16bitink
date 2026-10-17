import { describe, expect, it } from 'vitest';
import { BlastSim } from '../src/logic/blastSim';
import { ORES } from '../src/logic/ore';
import { TILE, tileAt, volatileAt } from '../src/logic/terrain';
import { BLAST, VOLATILES } from '../src/logic/volatiles';
import { grid } from './helpers';

const burn = (sim: BlastSim, seconds: number) => {
  const blasts: ReturnType<BlastSim['step']>['blasts'] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) blasts.push(...sim.step(1 / 60).blasts);
  return blasts;
};

describe('firedamp and old charges', () => {
  it('sit inside the rock: a firedamp pocket keeps its stone round it until it goes', () => {
    const t = grid(['F']);
    expect(tileAt(t, 0, 0)).toBe(TILE.stone);
    expect(volatileAt(t, 0, 0)).toBe(VOLATILES.firedamp.id);
  });

  it('a pocket bursts soon after the drill opens it, breaking soil and stone round it but not deep rock or bedrock', () => {
    const t = grid(['sst', 'sFd', 'c#s']);
    const sim = new BlastSim(t);
    sim.light(1, 1);
    expect(burn(sim, VOLATILES.firedamp.fuse - 0.1)).toHaveLength(0);
    const blasts = burn(sim, 0.2);
    expect(blasts).toHaveLength(1);
    expect([tileAt(t, 1, 1), tileAt(t, 0, 0), tileAt(t, 2, 0)]).toEqual([TILE.air, TILE.air, TILE.air]);
    expect(tileAt(t, 2, 1)).toBe(TILE.deep);
    expect(tileAt(t, 1, 2)).toBe(TILE.bedrock);
    expect(blasts[0]!.ores).toEqual([{ ore: ORES.copper.id, tile: [0, 2] }]);
  });

  it('a line charge clears its row', () => {
    const t = grid(['sssssysssss']);
    const sim = new BlastSim(t);
    sim.light(5, 0);
    burn(sim, VOLATILES.lineCharge.fuse + 0.05);
    expect([...t.tiles].map((v) => (v === TILE.air ? '.' : 's')).join('')).toBe('s.........s');
  });

  it('a blast sets off what it reaches, which goes a moment later', () => {
    const t = grid(['sfbs']);
    const sim = new BlastSim(t);
    sim.light(1, 0);
    expect(burn(sim, VOLATILES.firedamp.fuse + 0.02)).toHaveLength(1);
    expect(sim.isLit(2, 0)).toBe(true);
    expect(burn(sim, BLAST.chainFuse + 0.02)).toHaveLength(1);
    expect(tileAt(t, 3, 0)).toBe(TILE.air);
  });

  it('knows where the old charges are, and forgets one once it has gone', () => {
    const t = grid(['sbsfsy']);
    const sim = new BlastSim(t);
    expect(sim.placed()).toEqual([{ tile: [1, 0], kind: 'charge' }, { tile: [5, 0], kind: 'lineCharge' }]);
    sim.light(1, 0);
    burn(sim, VOLATILES.charge.fuse + 0.05);
    expect(sim.placed().map((p) => p.kind)).toEqual(['lineCharge']);
  });
});
