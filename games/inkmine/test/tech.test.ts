import { describe, expect, it } from 'vitest';
import { fitInventories, NEW_PROFILE, type Profile } from '../src/logic/economy';
import type { Hold } from '../src/logic/hold';
import { addHoldTo } from '../src/logic/inventory';
import { defaultTab, focusOf, SHIP_MODULES, SHIP_SYSTEMS, SUIT_TECH, techKey, techOf, techState, type Tech } from '../src/logic/tech';

const withCargo = (p: Profile, h: Hold): Profile => ({ ...p, cargo: addHoldTo(p.cargo, h).inv });
const repaired = (...ids: Profile['repaired']): Profile => fitInventories({ ...NEW_PROFILE, repaired: ids });
const RICH: Hold = { copper: 40, galena: 40, graphite: 30, quartz: 20, silver: 20 };

describe('the technology slots', () => {
  it('lays out the suit as the six gear pieces and its tools, the ship as its systems and its modules', () => {
    expect(SUIT_TECH.map(techKey)).toEqual(['gear:drill', 'gear:cell', 'gear:pack', 'gear:suit', 'gear:helmet', 'gear:jetpack', 'tool:receiver', 'tool:pulse']);
    expect(SHIP_SYSTEMS.map(techKey)).toEqual(['repair:printer', 'repair:hull', 'repair:thrusters', 'repair:comms', 'repair:core']);
    expect(SHIP_MODULES.map(techKey)).toEqual(['module:cargo', 'module:winch', 'module:stores', 'module:hull']);
  });

  it('round-trips a key, and rejects one it does not know', () => {
    for (const t of [...SUIT_TECH, ...SHIP_SYSTEMS, ...SHIP_MODULES]) expect(techOf(techKey(t))).toEqual(t);
    expect(techOf('gear:spoon')).toBeUndefined();
    expect(techOf('nonsense')).toBeUndefined();
  });

  it('says a crashed system is broken until it can be repaired, then ready, then fitted', () => {
    const printer: Tech = { kind: 'repair', id: 'printer' };
    expect(techState(NEW_PROFILE, printer)).toBe('broken');
    expect(techState(withCargo(NEW_PROFILE, { copper: 6 }), printer)).toBe('ready');
    expect(techState(repaired('printer'), printer)).toBe('fitted');
  });

  it('says a module is empty until built, and ready only when the printer can print it', () => {
    const winch: Tech = { kind: 'module', key: 'winch' };
    expect(techState(withCargo(NEW_PROFILE, RICH), winch)).toBe('empty');
    expect(techState(withCargo(repaired('printer'), RICH), winch)).toBe('ready');
    expect(techState({ ...repaired('printer'), ship: { ...NEW_PROFILE.ship, winch: 1 } }, winch)).toBe('fitted');
  });

  it('says a tool is empty until printed, ready once there is a call to follow and ore for it', () => {
    const receiver: Tech = { kind: 'tool', id: 'receiver' };
    const heard = { ...withCargo(repaired('printer', 'comms'), RICH), beats: ['called'] as Profile['beats'] };
    expect(techState(withCargo(repaired('printer', 'comms'), RICH), receiver)).toBe('empty');
    expect(techState(heard, receiver)).toBe('ready');
    expect(techState({ ...heard, tools: ['receiver'] }, receiver)).toBe('fitted');
  });

  it('says a gear piece is ready once its blueprint is found and its ore is on hand', () => {
    const drill: Tech = { kind: 'gear', piece: 'drill' };
    const p = withCargo(repaired('printer'), RICH);
    expect(techState(p, drill)).toBe('fitted');
    expect(techState({ ...p, found: ['drill-1'] }, drill)).toBe('ready');
  });

  it('opens on the ship while it needs repairs, and on the suit when there is gear to print', () => {
    expect(defaultTab(NEW_PROFILE)).toBe('ship');
    expect(defaultTab({ ...repaired('printer', 'hull'), found: ['drill-1'] })).toBe('suit');
  });

  it('focuses the slot asked for when it is on the tab, else the first ready one, else the first broken one', () => {
    const p = withCargo(NEW_PROFILE, { copper: 6 });
    expect(techKey(focusOf(p, 'ship', 'module:winch'))).toBe('module:winch');
    expect(techKey(focusOf(p, 'ship', 'gear:drill'))).toBe('repair:printer');
    expect(techKey(focusOf(NEW_PROFILE, 'ship'))).toBe('repair:printer');
    expect(techKey(focusOf({ ...repaired('printer'), found: ['cell-1'], cargo: withCargo(NEW_PROFILE, RICH).cargo }, 'suit'))).toBe('gear:cell');
    expect(techKey(focusOf(NEW_PROFILE, 'suit'))).toBe('gear:drill');
  });
});
