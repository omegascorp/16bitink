import { describe, expect, it } from 'vitest';
import { decorKinds, planDecor, ZONE_DECOR } from '../src/scenes/game/seabedDecor';
import { causeOfBite, deathText } from '../src/logic/deaths';
import { aboveSeabed, keepInWater, seabedFor } from '../src/logic/water';
import { ZONE_IDS } from '../src/levels/zones';

const world = { width: 3200, height: 1800 };
const sample = (id: string): number[] => Array.from({ length: 40 }, (_, i) => seabedFor(id, world).floorAt(i * 80));

describe('seabed shape', () => {
  it('is the same every time for a level', () => {
    expect(sample('c3-l4')).toEqual(sample('c3-l4'));
  });

  it('differs between levels, even in the same chapter', () => {
    expect(sample('c3-l4')).not.toEqual(sample('c3-l5'));
    expect(sample('c3-l4')).not.toEqual(sample('c4-l4'));
  });

  it('stays inside the bottom band of the world', () => {
    for (const id of ['c1-l1', 'c5-l7', 'c10-l10']) {
      for (const y of sample(id)) {
        expect(y).toBeGreaterThan(world.height - 120);
        expect(y).toBeLessThan(world.height - 30);
      }
    }
  });

  it('lets swimmers down to the sand but not into it', () => {
    const floor = 1720;
    expect(keepInWater(1800, 50, 20, world.height, floor).y).toBe(aboveSeabed(floor, 20));
    expect(aboveSeabed(floor, 20)).toBeLessThan(floor);
    expect(aboveSeabed(floor, 20)).toBeGreaterThan(floor - 20);
  });
});

describe('seabed scenery', () => {
  it('gives every zone common pieces and a landmark', () => {
    for (const zone of ZONE_IDS) {
      expect(ZONE_DECOR[zone].common.length).toBeGreaterThanOrEqual(3);
      expect(ZONE_DECOR[zone].landmarks.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('lays out one landmark and a handful of pieces, within the world', () => {
    const plan = planDecor('c4-l2', 'reef', world.width);
    expect(plan.filter((d) => d.landmark)).toHaveLength(1);
    expect(plan.length).toBeGreaterThan(5);
    expect(plan.every((d) => d.x > 0 && d.x < world.width)).toBe(true);
    expect(decorKinds(plan).every((k) => [...ZONE_DECOR.reef.common, ...ZONE_DECOR.reef.landmarks].includes(k))).toBe(true);
  });

  it('mixes a different seabed for each level of a zone', () => {
    const plans = Array.from({ length: 10 }, (_, i) => JSON.stringify(planDecor(`c4-l${i + 1}`, 'reef', world.width)));
    expect(new Set(plans).size).toBe(10);
  });
});

describe('crawler bites', () => {
  it('pinch with claws, prick with spines', () => {
    expect(causeOfBite('shorecrab')).toBe('pinched');
    expect(causeOfBite('lobster')).toBe('pinched');
    expect(causeOfBite('urchin')).toBe('spiked');
    expect(causeOfBite('seapig')).toBe('eaten');
    expect(deathText({ cause: 'pinched', killer: 'lobster' }).line).toBe('A lobster caught you in its claws.');
  });
});
