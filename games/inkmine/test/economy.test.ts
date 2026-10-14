import { describe, expect, it } from 'vitest';
import { canBuild, RECIPES, reserveFor, signatureReserve } from '../src/logic/blueprints';
import { build, isOpen, NEW_PROFILE, settle, upgradeShip, type Landing, type Profile } from '../src/logic/economy';
import { STARTER_LOADOUT } from '../src/logic/gear';
import { holdValue } from '../src/logic/hold';
import { EMPTY_TALLY, type MissionDef } from '../src/logic/mission';
import { ORES } from '../src/logic/ore';
import { capOf, laddersFor, landerLookOf, saleRate, winchKeeps } from '../src/logic/ship';

const HUNT: MissionDef = { goals: [{ kind: 'ore', ore: 'graphite', count: 3 }], fee: 70, blueprint: 'cell-1' };

const landing = (over: Partial<Landing> = {}): Landing => ({
  levelId: 'lead-lines',
  ending: 'won',
  tally: { ...EMPTY_TALLY, banked: { graphite: 5, copper: 8, galena: 2 } },
  mission: HUNT,
  contracts: [{ kind: 'clean', pay: 40 }, { kind: 'deep', depth: 15, pay: 40 }],
  signature: 'graphite',
  blueprints: [],
  ...over,
});

describe('lift-off', () => {
  it('pays the fee and met contracts, the guild takes the hunt, the hold keeps what the new blueprint needs', () => {
    const r = settle(NEW_PROFILE, landing());
    expect(r.taken).toEqual({ graphite: 3 });
    expect(r.blueprints).toEqual(['cell-1']);
    // Cell Mk 1 needs 4 graphite and 6 copper: the 2 graphite left and 6 copper stay; graphite is the signature, so it's all kept.
    expect(r.kept).toEqual({ graphite: 2, copper: 6 });
    expect(r.sold).toEqual({ copper: 2, galena: 2 });
    expect(r.soldFor).toBe(2 * ORES.copper.value + 2 * ORES.galena.value);
    // Clean job met (no hearts lost); 15 m not reached.
    expect(r.contracts.map((c) => c.paid)).toEqual([true, false]);
    expect(r.credits).toBe(r.soldFor + 70 + 40);
    expect(r.blots).toBe(2);
    expect(r.profile.credits).toBe(r.credits);
    expect(r.profile.levels['lead-lines']).toEqual({ won: true, blots: 2, paid: ['clean'] });
  });

  it('a failed landing still sells what was banked, but pays no fee, contract or blueprint', () => {
    const r = settle(NEW_PROFILE, landing({ ending: 'failed' }));
    expect(r.fee).toBe(0);
    expect(r.taken).toEqual({});
    expect(r.blueprints).toEqual([]);
    expect(r.contracts.every((c) => !c.paid)).toBe(true);
    expect(r.blots).toBe(0);
    // Graphite is kept for the planet's gear; the rest sells.
    expect(r.kept).toEqual({ graphite: 5 });
    expect(r.soldFor).toBe(holdValue({ copper: 8, galena: 2 }));
    expect(r.profile.levels['lead-lines']?.won).toBe(false);
  });

  it('leaving before the mission is done is not a win', () => {
    const r = settle(NEW_PROFILE, landing({ ending: 'left', tally: { ...EMPTY_TALLY, banked: { graphite: 1 } } }));
    expect(r.fee).toBe(0);
    expect(r.profile.levels['lead-lines']?.won).toBe(false);
  });

  it('pays each contract once, ever, and keeps the best blots', () => {
    const first = settle(NEW_PROFILE, landing()).profile;
    const again = settle(first, landing({ tally: { ...EMPTY_TALLY, banked: { graphite: 3 }, deepest: 20 } }));
    expect(again.contracts.map((c) => [c.paid, c.paidBefore])).toEqual([[false, true], [true, false]]);
    expect(again.profile.levels['lead-lines']).toEqual({ won: true, blots: 3, paid: ['clean', 'deep'] });
    // The blueprint isn't handed out twice.
    expect(again.blueprints).toEqual([]);
  });

  it('an order paid on an earlier landing takes no ore on a replay', () => {
    const order: Landing = landing({ contracts: [{ kind: 'order', ore: 'galena', count: 2, pay: 40 }] });
    const first = settle(NEW_PROFILE, order);
    expect(first.taken).toEqual({ graphite: 3, galena: 2 });
    const again = settle(first.profile, order);
    expect(again.taken).toEqual({ graphite: 3 });
    expect(again.sold.galena).toBe(2);
  });

  it('banked blueprints from the pouch count even when the landing fails', () => {
    const r = settle(NEW_PROFILE, landing({ ending: 'failed', blueprints: ['pack-1'] }));
    expect(r.profile.found).toEqual(['pack-1']);
  });

  it('the hopper raises what ore sells for', () => {
    const p: Profile = { ...NEW_PROFILE, ship: { ...NEW_PROFILE.ship, hopper: 2 } };
    const r = settle(p, landing({ ending: 'failed', tally: { ...EMPTY_TALLY, banked: { copper: 10 } } }));
    expect(r.soldFor).toBe(Math.floor(10 * ORES.copper.value * 1.2));
  });
});

describe('the fabricator', () => {
  const ready: Profile = { ...NEW_PROFILE, credits: 200, found: ['cell-1'], hold: { graphite: 5, copper: 6 } };

  it('builds a found blueprint from the hold and a fee', () => {
    const r = build(ready, 'cell-1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.gear.cell).toBe(1);
    expect(r.profile.hold).toEqual({ graphite: 1 });
    expect(r.profile.credits).toBe(200 - RECIPES['cell-1']!.fee);
    // Built is built.
    expect(build(r.profile, 'cell-1')).toEqual({ ok: false, why: 'built' });
  });

  it('says what is missing', () => {
    expect(build(NEW_PROFILE, 'cell-1')).toEqual({ ok: false, why: 'notFound' });
    expect(build({ ...ready, hold: { graphite: 4 } }, 'cell-1')).toEqual({ ok: false, why: 'materials' });
    expect(build({ ...ready, credits: 10 }, 'cell-1')).toEqual({ ok: false, why: 'credits' });
    expect(canBuild(RECIPES['cell-1']!, [], STARTER_LOADOUT, {}, 0)).toBe('notFound');
  });

  it('reserves what found blueprints need, and the signature for all unbuilt gear', () => {
    expect(reserveFor(['cell-1', 'drill-1'], STARTER_LOADOUT)).toEqual({ graphite: 10, copper: 6, galena: 4 });
    const all = Object.values(RECIPES).reduce((n, r) => n + (r.materials.graphite ?? 0), 0);
    expect(signatureReserve('graphite', STARTER_LOADOUT)).toEqual({ graphite: all });
    expect(signatureReserve('graphite', { ...STARTER_LOADOUT, cell: 1 })).toEqual({ graphite: all - 4 });
  });
});

describe('the ship', () => {
  it('modules are bought with credits, capped by the hull refit', () => {
    const rich: Profile = { ...NEW_PROFILE, credits: 5000 };
    const one = upgradeShip(rich, 'winch');
    expect(one.ok && one.profile.ship.winch).toBe(1);
    if (!one.ok) return;
    expect(one.profile.credits).toBe(5000 - 120);
    // The tin can takes one level of each module.
    expect(upgradeShip(one.profile, 'winch')).toEqual({ ok: false, why: 'hull' });
    const refit = upgradeShip(one.profile, 'hull');
    expect(refit.ok).toBe(true);
    if (!refit.ok) return;
    expect(landerLookOf(refit.profile.ship)).toBe(1);
    expect(capOf(refit.profile.ship, 'winch')).toBe(2);
    expect(upgradeShip(refit.profile, 'winch').ok).toBe(true);
    expect(upgradeShip({ ...NEW_PROFILE, credits: 10 }, 'winch')).toEqual({ ok: false, why: 'credits' });
  });

  it('each module does what it says', () => {
    const s = { winch: 2, hopper: 3, rack: 1, hull: 2 };
    expect(winchKeeps(s)).toBe(1);
    expect(saleRate(s)).toBeCloseTo(1.3);
    expect(laddersFor(s)).toBe(6);
    expect(landerLookOf(s)).toBe(2);
  });
});

describe('opening levels', () => {
  const order = ['a', 'b', 'c'];
  it('opens the first, and each next once the one before is won', () => {
    expect(isOpen(NEW_PROFILE, order, 'a')).toBe(true);
    expect(isOpen(NEW_PROFILE, order, 'b')).toBe(false);
    const p = { ...NEW_PROFILE, levels: { a: { won: false, blots: 0, paid: [] } } };
    expect(isOpen(p, order, 'b')).toBe(false);
    expect(isOpen({ ...p, levels: { a: { won: true, blots: 1, paid: [] } } }, order, 'b')).toBe(true);
  });
});
