import { describe, expect, it } from 'vitest';
import { JELLY_IDS, JELLY_INFO, pickJelly, STRAY_SHARE, ZONE_JELLY, zoneJellies } from '../src/levels/jellies';
import { ZONE_IDS, ZONE_NIGHT, ZONE_SKY } from '../src/levels/zones';
import type { ZoneId } from '../src/levels/types';
import { isGlowDecor } from '../src/art/decorGlow';
import { ZONE_DECOR } from '../src/scenes/game/seabedDecor';
import { createRng } from '../src/logic/rng';

describe('jellyfish', () => {
  it('gives every zone its own jelly, all different', () => {
    const own = ZONE_IDS.map((z) => ZONE_JELLY[z]);
    expect(new Set(own).size).toBe(ZONE_IDS.length);
    expect(new Set(own)).toEqual(new Set(JELLY_IDS));
  });

  it('mixes in a few strays from the zone above, never from below', () => {
    expect(zoneJellies('tidepool')).toEqual(['moonjelly']);
    expect(zoneJellies('midnight')).toEqual(['atolla', 'combjelly']);
    const rng = createRng(7);
    const picks = Array.from({ length: 2000 }, () => pickJelly('midnight', rng));
    const strays = picks.filter((k) => k === 'combjelly').length / picks.length;
    expect(picks.every((k) => k === 'atolla' || k === 'combjelly')).toBe(true);
    expect(strays).toBeGreaterThan(STRAY_SHARE - 0.05);
    expect(strays).toBeLessThan(STRAY_SHARE + 0.05);
  });

  it('keeps sizes close to the standard jelly so no zone gets an unfair sting', () => {
    for (const id of JELLY_IDS) {
      expect(JELLY_INFO[id].scale, id).toBeGreaterThanOrEqual(0.75);
      expect(JELLY_INFO[id].scale, id).toBeLessThanOrEqual(1.35);
    }
  });

  it('lights the jellies of the dark zones that really glow', () => {
    for (const z of ['twilight', 'midnight', 'abyss'] as const) expect(JELLY_INFO[ZONE_JELLY[z]].glow, z).toBeDefined();
    for (const z of ['tidepool', 'seagrass', 'kelp', 'reef', 'wreck'] as const) expect(JELLY_INFO[ZONE_JELLY[z]].glow, z).toBeUndefined();
  });
});

describe('deep-sea night', () => {
  it('falls only where the open sky ends, darker with every zone deeper', () => {
    for (const z of ZONE_IDS) expect(ZONE_NIGHT[z].alpha > 0, z).toBe(!ZONE_SKY[z]);
    const deep = ZONE_IDS.filter((z) => !ZONE_SKY[z]).map((z) => ZONE_NIGHT[z].alpha);
    expect(deep).toEqual([...deep].sort((a, b) => a - b));
    expect(Math.max(...deep)).toBeLessThan(0.95);
  });

  it('puts glowing scenery on the deep seabeds only', () => {
    const glowing = (z: ZoneId): boolean => [...ZONE_DECOR[z].common, ...ZONE_DECOR[z].landmarks].some(isGlowDecor);
    for (const z of ZONE_IDS) expect(glowing(z), z).toBe(!ZONE_SKY[z]);
    expect(ZONE_DECOR.trench.landmarks).toContain('volcano');
  });
});
