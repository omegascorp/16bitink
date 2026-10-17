import { describe, expect, it } from 'vitest';
import { fitInventories, NEW_PROFILE, type Profile } from '../src/logic/economy';
import { canLand, canLiftOff, canRefill, FUEL, land, liftOff, refill, refillCost, ROUND_TRIP } from '../src/logic/fuel';
import { countIn, addHoldTo } from '../src/logic/inventory';
import { parseProfile } from '../src/logic/save';
import { hasBeat } from '../src/logic/story';

const base = fitInventories({ ...NEW_PROFILE, repaired: ['printer', 'comms', 'hull', 'thrusters'] });
const withIce = (p: Profile, cargo: number, bag = 0): Profile => ({
  ...p,
  cargo: addHoldTo(p.cargo, cargo ? { ice: cargo } : {}).inv,
  suit: addHoldTo(p.suit, bag ? { ice: bag } : {}).inv,
});

describe('the fuel tank', () => {
  it('starts empty, and a refill needs ice on hand', () => {
    expect(NEW_PROFILE.fuel).toBe(0);
    expect(canRefill(base)).toBe('materials');
    expect(refill(base)).toEqual({ ok: false, why: 'materials' });
  });

  it('takes one lump a unit, from the cargo first, then the bag, never over the top', () => {
    const p = withIce(base, 4, 20);
    expect(refillCost(p)).toBe(FUEL.max);
    const r = refill(p);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.fuel).toBe(FUEL.max);
    expect(countIn(r.profile.cargo, 'ice')).toBe(0);
    expect(countIn(r.profile.suit, 'ice')).toBe(24 - FUEL.max);
    expect(canRefill(r.profile)).toBe('full');
  });

  it('tops up part way with what there is', () => {
    const r = refill(withIce({ ...base, fuel: 3 }, 2));
    expect(r.ok && r.profile.fuel).toBe(5);
  });

  it('lifts off only with the core fitted and enough to come back down, and lands for the rest', () => {
    expect(canLiftOff({ ...base, fuel: FUEL.max })).toBe('core');
    const fitted = { ...base, repaired: [...base.repaired, 'core'] as Profile['repaired'] };
    expect(canLiftOff({ ...fitted, fuel: ROUND_TRIP - 1 })).toBe('fuel');
    const r = liftOff({ ...fitted, fuel: FUEL.max });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.fuel).toBe(FUEL.max - FUEL.toOrbit);
    expect(r.profile.docked).toBe(true);
    expect(hasBeat(r.profile, 'flown')).toBe(true);
    expect(canLiftOff(r.profile)).toBe('docked');
    expect(canLand(base)).toBe('ground');
    const down = land(r.profile);
    expect(down.ok).toBe(true);
    if (!down.ok) return;
    expect(down.profile.docked).toBe(false);
    expect(down.profile.fuel).toBe(FUEL.max - ROUND_TRIP);
  });

  it('can refill aboard the starship too, from the ice carried up', () => {
    const r = refill(withIce({ ...base, docked: true, fuel: 0 }, 6));
    expect(r.ok && r.profile.fuel).toBe(6);
  });

  it('is saved, and a bad saved level is kept within the tank', () => {
    expect(parseProfile(JSON.parse(JSON.stringify({ ...base, fuel: 7 }))).fuel).toBe(7);
    expect(parseProfile({ ...base, fuel: 99 }).fuel).toBe(FUEL.max);
    expect(parseProfile({ ...base, fuel: 'lots' }).fuel).toBe(0);
    expect(parseProfile({ ...base, docked: true, shipFuel: 4, starship: ['power', 'warp', 'power'] })).toMatchObject({ docked: true, shipFuel: 4, starship: ['power'] });
  });
});
