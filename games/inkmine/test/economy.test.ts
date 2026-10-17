import { describe, expect, it } from 'vitest';
import { RECIPES } from '../src/logic/blueprints';
import { findBlueprint, NEW_PROFILE, onHand, printModule, printPart, type Profile } from '../src/logic/economy';
import { addHoldTo, contents, emptyInventory, type Inventory } from '../src/logic/inventory';
import { capOf, cargoSlots, landerLookOf, winchKeeps } from '../src/logic/ship';
import { parseProfile } from '../src/logic/save';
import type { Hold } from '../src/logic/hold';

const cargoWith = (h: Hold, slots = 16): Inventory => addHoldTo(emptyInventory(slots, 50), h).inv;
const bagWith = (h: Hold): Inventory => addHoldTo(emptyInventory(4, 10), h).inv;

describe('finding blueprints', () => {
  it('lists a real blueprint once', () => {
    const once = findBlueprint(NEW_PROFILE, 'cell-1');
    expect(once.found).toEqual(['cell-1']);
    expect(findBlueprint(once, 'cell-1')).toBe(once);
    expect(findBlueprint(NEW_PROFILE, 'warp-9')).toBe(NEW_PROFILE);
  });
});

/** A profile whose printer works and whose hold is sealed, as after the first repairs. */
const FIXED: Profile = { ...NEW_PROFILE, repaired: ['printer', 'comms', 'hull'], cargo: emptyInventory(16, 50) };

describe('the printer', () => {
  const ready: Profile = { ...FIXED, found: ['cell-1', 'pack-1'], cargo: cargoWith({ graphite: 5, copper: 4 }), suit: bagWith({ copper: 10 }) };

  it('prints a found blueprint from the cargo first, then the bag', () => {
    const r = printPart(ready, 'cell-1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.gear.cell).toBe(1);
    expect(onHand(r.profile)).toEqual({ graphite: 1, copper: 8 });
    expect(contents(r.profile.cargo)).toEqual({ graphite: 1 });
    expect(printPart(r.profile, 'cell-1')).toEqual({ ok: false, why: 'built' });
  });

  it('a new Pack grows the bag', () => {
    const r = printPart({ ...ready, cargo: cargoWith({ graphite: 6, copper: 4 }) }, 'pack-1');
    expect(r.ok && r.profile.suit.slots.length).toBe(6);
  });

  it('says what is missing', () => {
    expect(printPart(FIXED, 'cell-1')).toEqual({ ok: false, why: 'notFound' });
    expect(printPart({ ...ready, suit: emptyInventory(4, 10) }, 'cell-1')).toEqual({ ok: false, why: 'materials' });
    expect(Object.values(RECIPES).every((r) => !('fee' in r))).toBe(true);
  });
});

describe('the ship', () => {
  const stocked: Profile = { ...FIXED, cargo: cargoWith({ copper: 50, galena: 50, graphite: 50, quartz: 20, silver: 30 }) };

  it('modules are printed from resources, capped by the hull refit', () => {
    const one = printModule(stocked, 'winch');
    expect(one.ok).toBe(true);
    if (!one.ok) return;
    expect(contents(one.profile.cargo).galena).toBe(42);
    expect(printModule(one.profile, 'winch')).toEqual({ ok: false, why: 'hull' });
    const refit = printModule(one.profile, 'hull');
    expect(refit.ok).toBe(true);
    if (!refit.ok) return;
    expect(landerLookOf(refit.profile.ship)).toBe(1);
    expect(capOf(refit.profile.ship, 'winch')).toBe(2);
    expect(printModule(FIXED, 'winch')).toEqual({ ok: false, why: 'materials' });
  });

  it('a Cargo hold adds slots', () => {
    const r = printModule(stocked, 'cargo');
    expect(r.ok && r.profile.cargo.slots.length).toBe(cargoSlots({ ...FIXED.ship, cargo: 1 }));
  });

  it('each module does what it says', () => {
    const s = { cargo: 3, winch: 2, hull: 2 };
    expect(winchKeeps(s)).toBe(1);
    expect(landerLookOf(s)).toBe(2);
    expect(cargoSlots(s)).toBe(34);
  });
});

describe('the saved profile', () => {
  it('drops anything malformed and sizes the inventories to the gear', () => {
    expect(parseProfile(null)).toEqual(NEW_PROFILE);
    const p = parseProfile({
      cargo: { stack: 50, slots: [{ ore: 'graphite', n: 3 }, { ore: 'gold', n: 2 }, { ore: 'copper', n: 99 }, null] },
      suit: { stack: 10, slots: 'nope' },
      gear: { pack: 1, drill: 99 }, found: ['cell-1', 'warp-9', 'cell-1'],
      // A Ladder rack from before ladders were taken out: dropped.
      ship: { winch: 1, hull: 9, rack: 2 },
      // Left over from a level-based save: ignored.
      levels: { 'first-strike': { won: true, blots: 2, paid: ['order'] } }, pending: { silver: 2 },
    });
    expect(contents(p.cargo)).toEqual({ graphite: 3 });
    // The hull is still breached in this save: six slots out of use.
    expect(p.cargo.slots.length).toBe(10);
    expect(p.suit.slots.length).toBe(6);
    expect(p.gear).toEqual({ drill: 0, cell: 0, pack: 1, suit: 0, helmet: 0, jetpack: 0 });
    expect(p.found).toEqual(['cell-1']);
    expect(p.ship).toEqual({ cargo: 0, winch: 1, hull: 0 });
    expect(Object.keys(p).sort()).toEqual(['beats', 'cargo', 'docked', 'found', 'fuel', 'gear', 'hold', 'repaired', 'ship', 'shipFuel', 'starship', 'started', 'suit', 'tools']);
    expect(p.started).toBe(false);
    expect(parseProfile({ started: true }).started).toBe(true);
    expect(parseProfile({ started: 'yes' }).started).toBe(false);
  });

  it('round-trips through JSON', () => {
    const p: Profile = { ...NEW_PROFILE, cargo: cargoWith({ copper: 7, quartz: 2 }), suit: bagWith({ galena: 3 }), found: ['pack-1'], gear: { ...NEW_PROFILE.gear, cell: 1 } };
    expect(parseProfile(JSON.parse(JSON.stringify(p)))).toEqual(parseProfile(p));
    expect(parseProfile(JSON.parse(JSON.stringify(p))).found).toEqual(['pack-1']);
  });
});
