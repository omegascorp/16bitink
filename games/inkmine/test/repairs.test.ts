import { describe, expect, it } from 'vitest';
import { fitInventories, NEW_PROFILE, onHand, printModule, printPart, type Profile } from '../src/logic/economy';
import { addHoldTo, contents, emptyInventory } from '../src/logic/inventory';
import { canRepair, currentGoal, goalLine, REPAIRS, repair, wreckOf } from '../src/logic/repairs';
import { parseProfile } from '../src/logic/save';
import type { Hold } from '../src/logic/hold';

const withCargo = (p: Profile, h: Hold): Profile => ({ ...p, cargo: addHoldTo(p.cargo, h).inv });
const repaired = (...ids: Profile['repaired']): Profile => fitInventories({ ...NEW_PROFILE, repaired: ids });

describe('the lander after the crash', () => {
  it('starts with everything broken and the hold breached', () => {
    expect(NEW_PROFILE.repaired).toEqual([]);
    expect(NEW_PROFILE.cargo.slots.length).toBe(10);
    expect(wreckOf(NEW_PROFILE)).toEqual({ printer: true, comms: true, hull: true, thrusters: true });
  });

  it('can only be repaired in order: the printer first, the core last', () => {
    const rich = withCargo(NEW_PROFILE, { copper: 20, quartz: 10, galena: 20, graphite: 20, silver: 10 });
    expect(canRepair(rich, 'comms')).toBe('order');
    expect(canRepair(rich, 'printer')).toBe('ok');
    expect(canRepair(withCargo(repaired('printer'), { copper: 20, quartz: 10 }), 'comms')).toBe('ok');
    expect(canRepair(repaired('printer', 'comms', 'hull', 'thrusters'), 'core')).toBe('given');
    expect(canRepair(repaired('printer'), 'printer')).toBe('done');
    // The comms second (the start teaches the game), then the hull and the thrusters in either order.
    expect(canRepair(withCargo(repaired('printer'), REPAIRS.hull.needs!), 'hull')).toBe('order');
    expect(canRepair(repaired('printer', 'comms'), 'hull')).toBe('materials');
    expect(canRepair(withCargo(repaired('printer', 'comms'), REPAIRS.thrusters.needs!), 'thrusters')).toBe('ok');
  });

  it('a repair spends from the cargo first, then the bag', () => {
    const p = { ...withCargo(NEW_PROFILE, { copper: 4 }), suit: addHoldTo(emptyInventory(4, 10), { copper: 5 }).inv };
    const r = repair(p, 'printer');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.repaired).toEqual(['printer']);
    expect(contents(r.profile.cargo)).toEqual({});
    expect(onHand(r.profile)).toEqual({ copper: 3 });
  });

  it('says why a repair cannot happen, and changes nothing', () => {
    expect(repair(NEW_PROFILE, 'printer')).toEqual({ ok: false, why: 'materials' });
    expect(repair(NEW_PROFILE, 'core')).toEqual({ ok: false, why: 'order' });
  });

  it('sealing the hull brings the breached cargo slots back', () => {
    const p = withCargo(repaired('printer', 'comms'), REPAIRS.hull.needs!);
    const r = repair(p, 'hull');
    expect(r.ok && r.profile.cargo.slots.length).toBe(16);
  });
});

describe('the printer', () => {
  it('prints nothing until it is repaired', () => {
    const p = withCargo({ ...NEW_PROFILE, found: ['cell-1'] }, { graphite: 10, copper: 10, galena: 20 });
    expect(printPart(p, 'cell-1')).toEqual({ ok: false, why: 'offline' });
    expect(printModule(p, 'cargo')).toEqual({ ok: false, why: 'offline' });
    expect(printPart({ ...p, repaired: ['printer'] }, 'cell-1').ok).toBe(true);
  });
});

describe('what to do next', () => {
  it('walks the chapter: printer, then the drill, then comms, hull, thrusters, and last the core', () => {
    expect(currentGoal(NEW_PROFILE)).toEqual({ kind: 'repair', id: 'printer' });
    const printer = repaired('printer');
    expect(currentGoal(printer)).toEqual({ kind: 'find', blueprint: 'drill-1' });
    expect(currentGoal({ ...printer, found: ['drill-1'] })).toEqual({ kind: 'print', blueprint: 'drill-1' });
    const drilled = { ...printer, found: ['drill-1'], gear: { ...printer.gear, drill: 1 } };
    expect(currentGoal(drilled)).toEqual({ kind: 'repair', id: 'comms' });
    expect(currentGoal({ ...drilled, repaired: ['printer', 'comms'] })).toEqual({ kind: 'repair', id: 'hull' });
    expect(currentGoal({ ...drilled, repaired: ['printer', 'comms', 'hull'] })).toEqual({ kind: 'repair', id: 'thrusters' });
    expect(currentGoal({ ...drilled, repaired: ['printer', 'comms', 'hull', 'thrusters'] })).toEqual({ kind: 'repair', id: 'core' });
  });

  it('counts what you have toward a repair, and says when to go aboard', () => {
    expect(goalLine(NEW_PROFILE, { kind: 'repair', id: 'printer' })).toBe('Repair the printer: native copper 0/6');
    const ready = withCargo(NEW_PROFILE, { copper: 6 });
    expect(goalLine(ready, { kind: 'repair', id: 'printer' })).toBe('Repair the printer: go aboard (L at the lander)');
    expect(goalLine(NEW_PROFILE, { kind: 'find', blueprint: 'drill-1' })).toMatch(/drill/i);
  });
});

describe('the saved repairs', () => {
  it('keeps known repairs once each, and sizes the cargo to the hull', () => {
    const p = parseProfile({ repaired: ['printer', 'hull', 'printer', 'warp', 7] });
    expect(p.repaired).toEqual(['printer', 'hull']);
    expect(p.cargo.slots.length).toBe(16);
    expect(parseProfile({}).repaired).toEqual([]);
  });
});
