import { describe, expect, it } from 'vitest';
import { morselDropX, morselsToDrop, MAX_SINKING } from '../src/logic/foodFall';
import { FOOD_IDS, FOODS, foodOf, ZONE_FOOD } from '../src/levels/foodFalls';
import { ZONE_IDS } from '../src/levels/zones';

describe('food falls', () => {
  it('keeps a couple of pieces sinking until enough are eaten', () => {
    expect(morselsToDrop(10, 0, 0)).toBe(MAX_SINKING);
    expect(morselsToDrop(10, 0, MAX_SINKING)).toBe(0);
    expect(morselsToDrop(10, 4, 1)).toBe(MAX_SINKING - 1);
  });

  it('never drops more than are still needed, and none once the job is done', () => {
    expect(morselsToDrop(10, 9, 0)).toBe(1);
    expect(morselsToDrop(10, 9, 1)).toBe(0);
    expect(morselsToDrop(10, 10, 0)).toBe(0);
    expect(morselsToDrop(10, 12, 0)).toBe(0);
  });

  it('drops pieces within reach of the player, on either side', () => {
    for (const playerX of [1600, 0, 3200, -9000, 25000]) {
      for (const r of [0, 0.25, 0.5, 0.999]) {
        const x = morselDropX(playerX, () => r);
        expect(Math.abs(x - playerX)).toBeLessThanOrEqual(900);
        expect(Math.abs(x - playerX)).toBeGreaterThanOrEqual(150);
      }
    }
  });

  it('gives every zone its own food, with words for the intro card and the HUD', () => {
    const used = ZONE_IDS.map((z) => ZONE_FOOD[z]);
    expect(new Set(used).size).toBe(ZONE_IDS.length);
    expect([...used].sort()).toEqual([...FOOD_IDS].sort());
    for (const z of ZONE_IDS) {
      const f = foodOf(z);
      expect(f).toBe(FOODS[ZONE_FOOD[z]]);
      for (const s of [f.one, f.many, f.lore, f.scavenger.one, f.scavenger.many]) expect(s.length).toBeGreaterThan(2);
      // A treat, never a bug or a carcass.
      expect(`${f.one} ${f.many} ${f.lore}`).not.toMatch(/\bink\b|bottle|dead|beetle|\bants?\b|carcass|scrap/i);
    }
  });
});
