import { describe, expect, it } from 'vitest';
import { RECIPES } from '../src/logic/blueprints';
import { claimPending, isOpen, NEW_PROFILE, onHand, printModule, printPart, settle, type Landing, type Profile } from '../src/logic/economy';
import { addHoldTo, contents, emptyInventory, type Inventory } from '../src/logic/inventory';
import { EMPTY_TALLY, type MissionDef } from '../src/logic/mission';
import { capOf, cargoSlots, laddersFor, landerLookOf, winchKeeps } from '../src/logic/ship';
import { parseProfile } from '../src/logic/save';
import type { Hold } from '../src/logic/hold';

const HUNT: MissionDef = { goals: [{ kind: 'ore', ore: 'graphite', count: 3 }], pays: { quartz: 2 }, blueprint: 'cell-1' };
const cargoWith = (h: Hold, slots = 16): Inventory => addHoldTo(emptyInventory(slots, 50), h).inv;
const bagWith = (h: Hold): Inventory => addHoldTo(emptyInventory(4, 10), h).inv;

const landing = (over: Partial<Landing> = {}): Landing => {
  const banked = { graphite: 5, copper: 8, galena: 2 };
  return {
    levelId: 'lead-lines',
    ending: 'won',
    tally: { ...EMPTY_TALLY, banked },
    mission: HUNT,
    contracts: [{ kind: 'clean', pay: { silver: 1 } }, { kind: 'deep', depth: 15, pay: { galena: 4 } }],
    blueprints: [],
    cargo: cargoWith(banked),
    bag: bagWith({ copper: 3 }),
    ...over,
  };
};

describe('lift-off', () => {
  it('keeps every banked piece as a resource; the guild takes the hunt and pays in resources', () => {
    const r = settle(NEW_PROFILE, landing());
    expect(r.taken).toEqual({ graphite: 3 });
    expect(r.blueprints).toEqual(['cell-1']);
    // Clean job met (no hearts lost); 15 m not reached.
    expect(r.contracts.map((c) => c.paid)).toEqual([true, false]);
    expect(r.rewards).toEqual({ quartz: 2, silver: 1 });
    expect(contents(r.profile.cargo)).toEqual({ graphite: 2, copper: 8, galena: 2, quartz: 2, silver: 1 });
    // What stayed in the bag comes home in it.
    expect(contents(r.profile.suit)).toEqual({ copper: 3 });
    expect(r.blots).toBe(2);
    expect(r.profile.levels['lead-lines']).toEqual({ won: true, blots: 2, paid: ['clean'] });
  });

  it('a suit that gives out loses its bag, but the cargo is safe; no pay or blueprint', () => {
    const r = settle(NEW_PROFILE, landing({ ending: 'failed' }));
    expect(r.lost).toEqual({ copper: 3 });
    expect(contents(r.profile.suit)).toEqual({});
    expect(contents(r.profile.cargo)).toEqual({ graphite: 5, copper: 8, galena: 2 });
    expect(r.rewards).toEqual({});
    expect(r.blueprints).toEqual([]);
    expect(r.blots).toBe(0);
    expect(r.profile.levels['lead-lines']?.won).toBe(false);
  });

  it('pays each contract once, ever, and keeps the best blots', () => {
    const first = settle(NEW_PROFILE, landing()).profile;
    const again = settle(first, landing({ tally: { ...EMPTY_TALLY, banked: { graphite: 3 }, deepest: 20 }, cargo: first.cargo }));
    expect(again.contracts.map((c) => [c.paid, c.paidBefore])).toEqual([[false, true], [true, false]]);
    expect(again.profile.levels['lead-lines']).toEqual({ won: true, blots: 3, paid: ['clean', 'deep'] });
    expect(again.blueprints).toEqual([]);
  });

  it('an order paid on an earlier landing takes no ore on a replay', () => {
    const order = landing({ contracts: [{ kind: 'order', ore: 'galena', count: 2, pay: { silver: 1 } }] });
    const first = settle(NEW_PROFILE, order);
    expect(first.taken).toEqual({ graphite: 3, galena: 2 });
    expect(settle(first.profile, order).taken).toEqual({ graphite: 3 });
  });

  it('a reward with no room in the cargo waits with the guild, and arrives once there is room', () => {
    const full = cargoWith({ copper: 50 }, 1);
    const r = settle({ ...NEW_PROFILE, cargo: full }, landing({ tally: { ...EMPTY_TALLY, banked: { graphite: 3 } }, cargo: addHoldTo(emptyInventory(2, 50), { copper: 50, graphite: 3 }).inv }));
    // Graphite taken frees its slot: quartz fits there; the clean job's silver doesn't.
    expect(contents(r.profile.cargo)).toEqual({ copper: 50, quartz: 2 });
    expect(r.pending).toEqual({ silver: 1 });
    const roomy: Profile = { ...r.profile, cargo: addHoldTo(emptyInventory(4, 50), contents(r.profile.cargo)).inv };
    expect(contents(claimPending(roomy).cargo)).toEqual({ copper: 50, quartz: 2, silver: 1 });
  });

  it('banked blueprints from the pouch count even when the landing fails', () => {
    expect(settle(NEW_PROFILE, landing({ ending: 'failed', blueprints: ['pack-1'] })).profile.found).toEqual(['pack-1']);
  });
});

describe('the printer', () => {
  const ready: Profile = { ...NEW_PROFILE, found: ['cell-1', 'pack-1'], cargo: cargoWith({ graphite: 5, copper: 4 }), suit: bagWith({ copper: 10 }) };

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
    const r = printPart(ready, 'pack-1');
    expect(r.ok && r.profile.suit.slots.length).toBe(6);
  });

  it('says what is missing', () => {
    expect(printPart(NEW_PROFILE, 'cell-1')).toEqual({ ok: false, why: 'notFound' });
    expect(printPart({ ...ready, suit: emptyInventory(4, 10) }, 'cell-1')).toEqual({ ok: false, why: 'materials' });
    expect(Object.values(RECIPES).every((r) => !('fee' in r))).toBe(true);
  });
});

describe('the ship', () => {
  const stocked: Profile = { ...NEW_PROFILE, cargo: cargoWith({ copper: 50, galena: 50, graphite: 50, quartz: 20, silver: 30 }) };

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
    expect(printModule(NEW_PROFILE, 'winch')).toEqual({ ok: false, why: 'materials' });
  });

  it('a Cargo hold adds slots', () => {
    const r = printModule(stocked, 'cargo');
    expect(r.ok && r.profile.cargo.slots.length).toBe(cargoSlots({ ...NEW_PROFILE.ship, cargo: 1 }));
  });

  it('each module does what it says', () => {
    const s = { cargo: 3, winch: 2, rack: 1, hull: 2 };
    expect(winchKeeps(s)).toBe(1);
    expect(laddersFor(s)).toBe(6);
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
      pending: { silver: 2, bogus: 1 },
      gear: { pack: 1, drill: 99 }, found: ['cell-1', 'warp-9', 'cell-1'],
      ship: { winch: 1, hull: 9 }, levels: { 'first-strike': { won: true, blots: 2, paid: ['order', 'bogus'] }, 'BAD ID': { won: true, blots: 1, paid: [] } },
    });
    expect(contents(p.cargo)).toEqual({ graphite: 3 });
    expect(p.cargo.slots.length).toBe(16);
    expect(p.suit.slots.length).toBe(6);
    expect(p.pending).toEqual({ silver: 2 });
    expect(p.gear).toEqual({ drill: 0, cell: 0, pack: 1, suit: 0, helmet: 0, jetpack: 0 });
    expect(p.found).toEqual(['cell-1']);
    expect(p.ship).toEqual({ cargo: 0, winch: 1, rack: 0, hull: 0 });
    expect(p.levels).toEqual({ 'first-strike': { won: true, blots: 2, paid: ['order'] } });
  });

  it('round-trips through JSON', () => {
    const p = settle(NEW_PROFILE, landing()).profile;
    expect(parseProfile(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
});

describe('opening levels', () => {
  const order = ['a', 'b', 'c'];
  it('opens the first, and each next once the one before is won', () => {
    expect(isOpen(NEW_PROFILE, order, 'a')).toBe(true);
    expect(isOpen(NEW_PROFILE, order, 'b')).toBe(false);
    expect(isOpen({ ...NEW_PROFILE, levels: { a: { won: true, blots: 1, paid: [] } } }, order, 'b')).toBe(true);
  });
});
