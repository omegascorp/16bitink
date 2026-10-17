import { describe, expect, it } from 'vitest';
import { fitInventories, NEW_PROFILE, type Profile } from '../src/logic/economy';
import { addHoldTo, countIn } from '../src/logic/inventory';
import { parseProfile } from '../src/logic/save';
import { STARTER_SHIP, upgrade } from '../src/logic/ship';
import { canRefillStore, refillStore, restockFrom, solarCharge, storeCapacity, storeRefillCost, STORES } from '../src/logic/stores';
import { newSuit, STARTER } from '../src/logic/suit';

const withCargo = (p: Profile, h: Parameters<typeof addHoldTo>[1]): Profile => ({ ...p, cargo: addHoldTo(p.cargo, h).inv });
const base = fitInventories({ ...NEW_PROFILE, repaired: ['printer', 'hull'] });

describe("the lander's stores", () => {
  it('start full, big enough for several suit refills, and grow with the supply tanks', () => {
    const cap = storeCapacity(STARTER_SHIP);
    expect(NEW_PROFILE.stores).toEqual({ air: cap, power: cap });
    expect(cap / STARTER.air).toBeGreaterThanOrEqual(5);
    const one = upgrade(STARTER_SHIP, 'stores');
    expect(storeCapacity(one)).toBeGreaterThan(cap);
    expect(storeCapacity(upgrade(one, 'stores'))).toBeGreaterThan(storeCapacity(one));
  });

  it('top the suit up at the lander from what they hold, hearts and the jetpack for free', () => {
    const worn = { ...newSuit(STARTER), air: 40, energy: 70, hearts: 1, fuel: 0 };
    const r = restockFrom(worn, { air: 500, power: 500 });
    expect(r.suit.air).toBe(STARTER.air);
    expect(r.suit.energy).toBe(STARTER.energy);
    expect(r.suit.hearts).toBe(STARTER.hearts);
    expect(r.suit.fuel).toBe(STARTER.fuel);
    expect(r.stores).toEqual({ air: 440, power: 470 });
    expect(r.short).toEqual([]);
  });

  it('give what they have when they run low, and say which fell short', () => {
    const worn = { ...newSuit(STARTER), air: 40, energy: 70 };
    const r = restockFrom(worn, { air: 10, power: 500 });
    expect(r.suit.air).toBe(50);
    expect(r.stores.air).toBe(0);
    expect(r.short).toEqual(['air']);
    expect(restockFrom(r.suit, r.stores).short).toEqual(['air']);
  });

  it('are refilled from ice and graphite on hand, one lump at a time, never over the top', () => {
    const p = withCargo({ ...base, stores: { air: 100, power: 590 } }, { ice: 40, graphite: 3 });
    expect(storeRefillCost(p, 'air')).toBe(Math.ceil((storeCapacity(p.ship) - 100) / STORES.air.per));
    const r = refillStore(p, 'air');
    expect(r.ok && r.profile.stores.air).toBe(storeCapacity(p.ship));
    expect(r.ok && countIn(r.profile.cargo, 'ice')).toBe(40 - storeRefillCost(p, 'air'));
    const pw = refillStore(p, 'power');
    expect(pw.ok && pw.profile.stores.power).toBe(storeCapacity(p.ship));
    expect(pw.ok && countIn(pw.profile.cargo, 'graphite')).toBe(2);
  });

  it('say why they cannot be refilled', () => {
    expect(canRefillStore({ ...base, stores: { air: storeCapacity(base.ship), power: 0 } }, 'air')).toBe('full');
    expect(canRefillStore({ ...base, stores: { air: 0, power: 0 } }, 'air')).toBe('materials');
  });

  it('charge the battery slowly from the panels, but never the air', () => {
    const cap = storeCapacity(STARTER_SHIP);
    const s = solarCharge({ air: 100, power: 100 }, cap, 10);
    expect(s.air).toBe(100);
    expect(s.power).toBeCloseTo(100 + STORES.solar * 10);
    expect(solarCharge({ air: 0, power: cap - 1 }, cap, 100).power).toBe(cap);
  });

  it('are saved, kept within the tanks, and full for a save from before they existed', () => {
    const cap = storeCapacity(STARTER_SHIP);
    expect(parseProfile({}).stores).toEqual({ air: cap, power: cap });
    expect(parseProfile({ stores: { air: 120.5, power: 9999 } }).stores).toEqual({ air: 120.5, power: cap });
    expect(parseProfile({ stores: { air: -3, power: 'x' } }).stores).toEqual({ air: 0, power: cap });
  });
});
