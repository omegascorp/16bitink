import { describe, expect, it } from 'vitest';
import { fitInventories, NEW_PROFILE, type Profile } from '../src/logic/economy';
import type { Hold } from '../src/logic/hold';
import { addHoldTo, countIn } from '../src/logic/inventory';
import { canFix, canRefillShip, canSetCourse, FIRST_COURSE, fix, mapOpen, refillShip, setCourse, SHIP_TANK, STARSHIP, STARSHIP_IDS } from '../src/logic/starship';
import { hasBeat, withBeat } from '../src/logic/story';
import { tabsFor } from '../src/logic/tech';

const aboard = (cargo: Hold = {}): Profile => {
  const p = fitInventories({ ...NEW_PROFILE, repaired: ['printer', 'comms', 'hull', 'thrusters', 'core'], docked: true });
  return withBeat({ ...p, cargo: addHoldTo(p.cargo, cargo).inv }, 'flown');
};
const RICH: Hold = { copper: 20, silver: 10, graphite: 30, quartz: 5, ice: 20 };

describe('the starship', () => {
  it('is mended aboard her only, power first, from the ore carried up', () => {
    const p = aboard(RICH);
    expect(canFix({ ...p, docked: false }, 'power')).toBe('away');
    expect(canFix(p, 'tank')).toBe('order');
    expect(canFix(aboard(), 'power')).toBe('materials');
    const r = fix(p, 'power');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.starship).toEqual(['power']);
    expect(countIn(r.profile.cargo, 'copper')).toBe(RICH.copper! - STARSHIP.power.needs!.copper!);
    expect(canFix(r.profile, 'power')).toBe('done');
    expect(canFix(r.profile, 'tank')).toBe('ok');
  });

  it('opens the star map only once her telescope is mended, and keeps her jump drive past mending', () => {
    const p = aboard(RICH);
    expect(mapOpen(p)).toBe(false);
    expect(canFix(p, 'telescope')).toBe('order');
    const powered = { ...p, starship: ['power'] as Profile['starship'] };
    const r = fix(powered, 'telescope');
    expect(r.ok && mapOpen(r.profile)).toBe(true);
    expect(canFix(p, 'jump')).toBe('never');
  });

  it('keeps a hold of her own, used for repairs only while docked', () => {
    const p = aboard();
    const stocked = { ...p, hold: addHoldTo(p.hold, { copper: 10, silver: 4 }).inv };
    expect(canFix(stocked, 'power')).toBe('ok');
    const r = fix(stocked, 'power');
    expect(r.ok && countIn(r.profile.hold, 'copper')).toBe(0);
    expect(canFix({ ...stocked, docked: false }, 'power')).toBe('away');
  });

  it('fills her tank only once it is mended, from ice, never over the top', () => {
    const p = aboard(RICH);
    expect(canRefillShip(p)).toBe('tank');
    const mended = { ...p, starship: ['power', 'telescope', 'tank'] as Profile['starship'] };
    const r = refillShip(mended);
    expect(r.ok && r.profile.shipFuel).toBe(SHIP_TANK.capacity);
    expect(canRefillShip({ ...mended, docked: false })).toBe('away');
  });

  it('sets course for the first sister moon once mended and fuelled: the end of chapter 1', () => {
    const p = aboard();
    expect(canSetCourse(p)).toBe('broken');
    const whole = { ...p, starship: [...STARSHIP_IDS] as Profile['starship'] };
    expect(canSetCourse(whole)).toBe('fuel');
    const fuelled = { ...whole, shipFuel: FIRST_COURSE.fuel };
    expect(canSetCourse({ ...fuelled, docked: false })).toBe('away');
    const r = setCourse(fuelled);
    expect(r.ok && hasBeat(r.profile, 'course')).toBe(true);
    if (r.ok) expect(canSetCourse(r.profile)).toBe('set');
  });

  it('shows her tab once you have flown up to her, not before', () => {
    expect(tabsFor(NEW_PROFILE)).toEqual(['suit', 'ship']);
    expect(tabsFor({ beats: ['called', 'met', 'paid', 'core'] })).toEqual(['suit', 'ship']);
    expect(tabsFor(withBeat(NEW_PROFILE, 'flown'))).toEqual(['suit', 'ship', 'starship']);
  });
});
