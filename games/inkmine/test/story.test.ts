import { describe, expect, it } from 'vitest';
import { FUEL } from '../src/logic/fuel';
import { fitInventories, NEW_PROFILE, type Profile } from '../src/logic/economy';
import type { Hold } from '../src/logic/hold';
import { addHoldTo, countIn, emptyInventory, type Inventory } from '../src/logic/inventory';
import { canRepair, currentGoal, goalLine, repair } from '../src/logic/repairs';
import { parseProfile } from '../src/logic/save';
import { callDue, hasBeat, keptOres, signalBars, TRADE, visit, withBeat } from '../src/logic/story';
import { canPrintTool, printTool, TOOLS } from '../src/logic/tools';

const repaired = (...ids: Profile['repaired']): Profile => fitInventories({ ...NEW_PROFILE, repaired: ids });
/** Past the drill: what the goals after the radio build on. */
const drilled = (p: Profile): Profile => ({ ...p, found: ['drill-1'], gear: { ...p.gear, drill: 1 } });
const bagWith = (silver: number): Inventory => addHoldTo(emptyInventory(4, 10), silver ? { silver } : {}).inv;
const withCargo = (p: Profile, h: Hold): Profile => ({ ...p, cargo: addHoldTo(p.cargo, h).inv });
const met = (...ids: Profile['repaired']): Profile => withBeat(withBeat(drilled(repaired(...ids)), 'called'), 'met');

describe('the call', () => {
  it('comes once the radio works, and only until it has been taken', () => {
    expect(callDue(repaired('printer'))).toBe(false);
    const p = repaired('printer', 'comms');
    expect(callDue(p)).toBe(true);
    expect(callDue(withBeat(p, 'called'))).toBe(false);
  });

  it('can be followed with a receiver: more bars the closer you are, none from the far side of the moon', () => {
    expect(signalBars(0)).toBe(5);
    expect(signalBars(6)).toBe(5);
    expect(signalBars(30)).toBeGreaterThan(signalBars(60));
    expect(signalBars(60)).toBeGreaterThan(0);
    expect(signalBars(128)).toBe(0);
  });

  it('lists a beat once', () => {
    const p = withBeat(withBeat(NEW_PROFILE, 'called'), 'called');
    expect(p.beats).toEqual(['called']);
    expect(hasBeat(p, 'called')).toBe(true);
    expect(hasBeat(p, 'met')).toBe(false);
  });
});

describe('the Lamplighters', () => {
  it('meet you the first time, and show by pictures what they want', () => {
    const p = withBeat(drilled(repaired('printer', 'comms')), 'called');
    const v = visit(p, bagWith(0));
    expect(v.says).toBe('meet');
    expect(hasBeat(v.profile, 'met')).toBe(true);
  });

  it('remind you what they want while the bag is short of it', () => {
    const v = visit(met('printer', 'comms'), bagWith(TRADE.silver! - 1));
    expect(v.says).toBe('want');
    expect(countIn(v.bag, 'silver')).toBe(TRADE.silver! - 1);
    expect(hasBeat(v.profile, 'paid')).toBe(false);
  });

  it('take the silver from the bag, and keep the core until the ship is whole', () => {
    const v = visit(met('printer', 'comms'), bagWith(TRADE.silver! + 2));
    expect(v.says).toBe('paid');
    expect(countIn(v.bag, 'silver')).toBe(2);
    expect(hasBeat(v.profile, 'paid')).toBe(true);
    expect(hasBeat(v.profile, 'core')).toBe(false);
    const later = visit(v.profile, v.bag);
    expect(later.says).toBe('waitShip');
  });

  it('hand over the core once paid and the hull and thrusters are mended', () => {
    const whole = met('printer', 'comms', 'hull', 'thrusters');
    const v = visit(whole, bagWith(TRADE.silver!));
    expect(v.says).toBe('core');
    expect(hasBeat(v.profile, 'paid') && hasBeat(v.profile, 'core')).toBe(true);
    expect(countIn(v.bag, 'silver')).toBe(0);
    expect(visit(withBeat(whole, 'paid'), bagWith(0)).says).toBe('core');
    expect(visit(v.profile, v.bag).says).toBe('thanks');
  });

  it('have nothing to say before the call', () => {
    expect(visit(drilled(repaired('printer')), bagWith(0)).says).toBe(null);
  });
});

describe('the drive core', () => {
  it("can't be repaired until the Lamplighters have handed it over, and then needs no ore", () => {
    const whole = met('printer', 'comms', 'hull', 'thrusters');
    expect(canRepair(whole, 'core')).toBe('given');
    const given = withBeat(withBeat(whole, 'paid'), 'core');
    expect(canRepair(given, 'core')).toBe('ok');
    const r = repair(given, 'core');
    expect(r.ok && r.profile.repaired).toContain('core');
  });
});

describe('the goals after the comms', () => {
  it('print a receiver, follow the signal, mend the hull and thrusters, trade for the core, fit it, then fly', () => {
    const heard = withBeat(drilled(repaired('printer', 'comms')), 'called');
    expect(currentGoal(heard)).toEqual({ kind: 'receiver' });
    const comms = { ...heard, tools: ['receiver'] as Profile['tools'] };
    expect(currentGoal(comms)).toEqual({ kind: 'signal' });
    const m = withBeat(comms, 'met');
    expect(currentGoal(m)).toEqual({ kind: 'repair', id: 'hull' });
    const whole = { ...m, repaired: [...m.repaired, 'hull', 'thrusters'] as Profile['repaired'] };
    expect(currentGoal(whole)).toEqual({ kind: 'trade' });
    expect(currentGoal(withBeat(m, 'paid'))).toEqual({ kind: 'repair', id: 'hull' });
    expect(currentGoal(withBeat(whole, 'paid'))).toEqual({ kind: 'collect' });
    const given = withBeat(withBeat(whole, 'paid'), 'core');
    expect(currentGoal(given)).toEqual({ kind: 'repair', id: 'core' });
    const fitted = { ...given, repaired: [...given.repaired, 'core'] as Profile['repaired'] };
    expect(currentGoal(fitted)).toEqual({ kind: 'fuel' });
    expect(currentGoal({ ...fitted, fuel: FUEL.toOrbit })).toEqual({ kind: 'done' });
    expect(currentGoal(withBeat(fitted, 'flown'))).toEqual({ kind: 'done' });
  });

  it('say what to print, how to follow the call, and what to bring, counting the silver in the bag', () => {
    const heard = withBeat(drilled(repaired('printer', 'comms')), 'called');
    expect(goalLine(heard, { kind: 'receiver' })).toMatch(/receiver.*native copper 0\/4/i);
    expect(goalLine(heard, { kind: 'signal' })).toMatch(/receiver/i);
    const whole = { ...met('printer', 'comms', 'hull', 'thrusters'), suit: bagWith(3) };
    expect(goalLine(whole, { kind: 'trade' })).toMatch(/silver 3\/10/);
    expect(goalLine(whole, { kind: 'collect' })).toMatch(/core/i);
    const given = withBeat(withBeat(whole, 'paid'), 'core');
    expect(goalLine(given, { kind: 'repair', id: 'core' })).toMatch(/go aboard/);
    expect(goalLine(given, { kind: 'fuel' })).toMatch(/water ice 0\/10/);
    expect(goalLine(withCargo(given, { ice: 10 }), { kind: 'fuel' })).toMatch(/refill/);
    expect(goalLine(given, { kind: 'done' })).toMatch(/Lift off/);
    expect(goalLine(withBeat(given, 'flown'), { kind: 'done' })).toMatch(/star map/);
  });
});

describe('the saved story', () => {
  it('keeps known beats once each', () => {
    expect(parseProfile({ beats: ['called', 'met', 'called', 'warp', 3] }).beats).toEqual(['called', 'met']);
    expect(parseProfile({}).beats).toEqual([]);
  });
});

describe('the receiver', () => {
  const heard = withBeat(drilled(repaired('printer', 'comms')), 'called');
  const stocked = { ...heard, cargo: addHoldTo(heard.cargo, { copper: 4, quartz: 2 }).inv };

  it('is printed aboard once there is a call to follow, from copper and quartz', () => {
    expect(TOOLS).toEqual(['receiver']);
    expect(canPrintTool(drilled(repaired('printer', 'comms')), 'receiver')).toBe('nothing');
    expect(canPrintTool(heard, 'receiver')).toBe('materials');
    expect(canPrintTool({ ...stocked, repaired: ['comms'] }, 'receiver')).toBe('offline');
    const r = printTool(stocked, 'receiver');
    expect(r.ok && r.profile.tools).toEqual(['receiver']);
    if (r.ok) expect(canPrintTool(r.profile, 'receiver')).toBe('have');
  });

  it('is saved, once', () => {
    expect(parseProfile({ tools: ['receiver', 'receiver', 'laser'] }).tools).toEqual(['receiver']);
  });
});

describe('the silver in the bag', () => {
  it('stays in the bag at the lander from when the Lamplighters ask for it until they have it', () => {
    const whole = met('printer', 'comms', 'hull', 'thrusters');
    expect(keptOres(whole)).toEqual(['silver']);
    expect(keptOres(met('printer', 'comms'))).toEqual(['silver']);
    expect(keptOres(drilled(repaired('printer')))).toEqual([]);
    expect(keptOres(withBeat(whole, 'paid'))).toEqual([]);
  });

  it('keeps the bag\'s locks in the save, dropping any out of range', () => {
    const p = parseProfile({ suit: { stack: 10, slots: [{ ore: 'silver', n: 3 }, null, null, null], locked: [0, 2, 0, 99, -1, 'x'] } });
    expect(p.suit.locked).toEqual([0, 2]);
  });
});
