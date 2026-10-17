import { describe, expect, it } from 'vitest';
import { recipeOf } from '../src/logic/blueprints';
import { NEW_PROFILE, type Profile } from '../src/logic/economy';
import { canLand, fuelOre, land } from '../src/logic/fuel';
import { addHoldTo, countIn } from '../src/logic/inventory';
import { CAP_SPRING, CAP_YIELD, SPORE_AIR } from '../src/logic/mine';
import { ORES } from '../src/logic/ore';
import { currentGoal, goalLine } from '../src/logic/repairs';
import { parseProfile } from '../src/logic/save';
import { STARSHIP_IDS } from '../src/logic/starship';
import { campVisit, distressDue, hasBeat, keptOres } from '../src/logic/story';
import { canPrintTool, printTool, TOOL_KINDS } from '../src/logic/tools';
import { designName, designSalvage } from '../src/logic/designs';
import { refillStore, storeCapacity, storeOre, storeRefill, STORES } from '../src/logic/stores';
import { fuelsAt } from '../src/logic/worlds';
import { canTravel, travel, tripFuel } from '../src/logic/travel';
import { TILE, tileAt, volatileAt } from '../src/logic/terrain';
import { blastBreaks } from '../src/logic/volatiles';
import { mine, run, standAt, T } from './helpers';

/** The highest the prospector's feet get over `seconds` of play after a jump. */
function peak(rows: readonly string[], col: number, row: number): number {
  const m = mine(rows);
  standAt(m, col, row);
  const ground = m.player.y;
  let top = ground;
  m.step(1 / 60, { ix: 0, iy: 0, jump: true, thrust: false, recall: false, feed: null });
  for (let i = 0; i < 90; i++) {
    run(m, 1 / 60);
    top = Math.min(top, m.player.y);
  }
  return (ground - top) / T;
}

const OPEN = Array.from({ length: 10 }, () => '..........');

describe("Mycel's cap mushrooms", () => {
  it('throw you about five tiles up off a jump, where plain ground gives two', () => {
    const soil = peak([...OPEN, 'ssssssssss', '##########'], 4, 10);
    const cap = peak([...OPEN.slice(0, 9), '....m.....', 'ssssssssss', '##########'], 4, 9);
    expect(soil).toBeLessThan(2.5);
    expect(cap).toBeGreaterThan(4.5);
  });

  it('give back half a fall when you land on one, and settle you in a bounce or two', () => {
    const m = mine([...OPEN.slice(0, 9), '....m.....', 'ssssssssss', '##########']);
    m.player = { ...m.player, x: 4 * T + (T - m.player.w) / 2, y: 2 * T, vy: 0, onGround: false };
    const events = run(m, 3);
    const bounces = events.filter((e) => e.kind === 'bounce');
    expect(bounces.length).toBeGreaterThanOrEqual(1);
    expect(bounces.length).toBeLessThanOrEqual(3);
    expect(m.player.onGround).toBe(true);
    expect(Math.floor((m.player.y + m.player.h) / T)).toBe(9);
  });

  it("don't bounce you when you're heading down", () => {
    const m = mine([...OPEN.slice(0, 9), '....m.....', 'ssssssssss', '##########']);
    m.player = { ...m.player, x: 4 * T + (T - m.player.w) / 2, y: 2 * T, vy: 0, onGround: false };
    expect(run(m, 1, { iy: 1 }).some((e) => e.kind === 'bounce')).toBe(false);
    expect(CAP_SPRING.jump).toBeGreaterThan(CAP_SPRING.min);
  });

  it('are stepped up onto like any low ledge, soft to drill down through, and a blast breaks them', () => {
    const m = mine(['....', '..m.', 'ssss', '####']);
    standAt(m, 1, 2);
    run(m, 0.6, { ix: 1 });
    expect(Math.floor((m.player.y + m.player.h) / T)).toBe(1);
    standAt(m, 2, 1);
    run(m, 1, { iy: 1 });
    expect(tileAt(m.terrain, 2, 1)).toBe(TILE.air);
    expect(blastBreaks(mine(['m']).terrain, 0, 0)).toBe(true);
  });

  it('break into carbon for the cell and water for the air when drilled', () => {
    const m = mine(['....', '..m.', 'ssss', '####']);
    standAt(m, 2, 1);
    const events = run(m, 1, { iy: 1 });
    expect(events.find((e) => e.kind === 'drilled')).toMatchObject({ ore: ORES.carbon.id });
    // Both pieces are picked up.
    const picked = events.flatMap((e) => (e.kind === 'ore' ? [e.ore] : []));
    expect(picked.sort()).toEqual([ORES.carbon.id, ORES.water.id].sort());
    expect(CAP_YIELD).toEqual(['carbon', 'water']);
  });
});

describe("Mycel's spore pockets", () => {
  it('only puff when drilled: the pocket opens, no blast, and the cloud costs air', () => {
    const m = mine(['.....', '.....', 'ssss.', 'spss.', '#####'], { lander: { col: 4, row: 3 } });
    standAt(m, 1, 2);
    const air = m.suit.air;
    const events = run(m, 1.5, { iy: 1 });
    expect(events.some((e) => e.kind === 'spores')).toBe(true);
    expect(events.some((e) => e.kind === 'blast')).toBe(false);
    expect(volatileAt(m.terrain, 1, 3)).toBe(0);
    expect(m.suit.air).toBeLessThanOrEqual(air - SPORE_AIR + 0.5);
  });

  it('catch fire from a blast and burst in turn', () => {
    const m = mine(['......', '......', 'sfpsss', 'ssssss', '######'], { lander: { col: 5, row: 2 } });
    standAt(m, 1, 2);
    run(m, 0.3, { iy: 1 });
    const blasts = run(m, 2).filter((e) => e.kind === 'blast');
    expect(blasts.map((e) => (e.kind === 'blast' ? e.blast.kind : null))).toEqual(['firedamp', 'spores']);
  });
});

const whole: Profile = { ...NEW_PROFILE, docked: true, starship: [...STARSHIP_IDS], shipFuel: 10, beats: ['flown', 'aboard', 'firstLight'] };

describe('travel between the sister moons', () => {
  it('flies Graphite to Mycel and back for six units either way', () => {
    expect(tripFuel('graphite', 'mycel')).toBe(6);
    expect(tripFuel('mycel', 'graphite')).toBe(6);
  });

  it('needs you aboard a whole ship with the fuel, and Mycel loaded', () => {
    const has = () => true;
    expect(canTravel(whole, 'graphite', has)).toBe('here');
    expect(canTravel({ ...whole, docked: false }, 'mycel', has)).toBe('docked');
    expect(canTravel({ ...whole, starship: ['power'] }, 'mycel', has)).toBe('ship');
    expect(canTravel({ ...whole, shipFuel: 5 }, 'mycel', has)).toBe('fuel');
    expect(canTravel(whole, 'mycel', () => false)).toBe('locked');
    expect(canTravel(whole, 'mycel', has)).toBe('ok');
  });

  it('arrives in orbit, the fuel burnt, chapter 1 over; landing counts the world as visited', () => {
    const there = travel(whole, 'mycel');
    expect(there).toMatchObject({ at: 'mycel', docked: true, shipFuel: 4 });
    expect(hasBeat(there, 'course')).toBe(true);
    expect(currentGoal(there)).toEqual({ kind: 'land' });
    expect(canLand({ ...there, fuel: 6 })).toBe('ok');
    const down = land({ ...there, fuel: 6 });
    expect(down.ok && down.profile.visited).toEqual(['graphite', 'mycel']);
  });

  it('saves where you are and where you have been; nonsense falls back to Graphite', () => {
    const back = parseProfile(JSON.parse(JSON.stringify({ ...whole, at: 'mycel', visited: ['mycel', 'graphite'] })));
    expect(back.at).toBe('mycel');
    expect(back.visited).toEqual(['graphite', 'mycel']);
    expect(parseProfile({ ...whole, at: 'atlantis', visited: 'everywhere' })).toMatchObject({ at: 'graphite', visited: ['graphite'] });
    expect(parseProfile({}).visited).toEqual(['graphite']);
  });
});

describe("the Aster's distress call", () => {
  it('plays aboard over Graphite once the power is back, once', () => {
    const dark = { ...whole, starship: [] };
    expect(distressDue(dark)).toBe(false);
    expect(distressDue({ ...dark, starship: ['power'] })).toBe(true);
    expect(distressDue({ ...dark, starship: ['power'], docked: false })).toBe(false);
    expect(distressDue({ ...dark, starship: ['power'], beats: [...dark.beats, 'distress'] })).toBe(false);
    expect(distressDue({ ...whole, at: 'mycel' })).toBe(false);
  });

  it('is kept in the save', () => {
    const back = parseProfile(JSON.parse(JSON.stringify({ ...whole, beats: [...whole.beats, 'distress', 'asterFound'] })));
    expect(hasBeat(back, 'distress') && hasBeat(back, 'asterFound')).toBe(true);
  });
});

describe('on Mycel', () => {
  const landed: Profile = { ...whole, at: 'mycel', docked: false, visited: ['graphite', 'mycel'], beats: [...whole.beats, 'course', 'distress', 'asterFound'], gear: { ...whole.gear, drill: 1 }, found: ['pulse'], tools: ['receiver', 'pulse'] };

  it('splits its tanks from water and charges the battery from lignite', () => {
    expect(fuelOre(landed)).toBe('water');
    expect(storeOre(landed, 'air')).toBe('water');
    expect(storeOre(landed, 'power')).toBe('lignite');
    const low = { ...landed, stores: { air: 100, power: 100 }, cargo: addHoldTo(landed.cargo, { water: 4, lignite: 3, ice: 9 }).inv };
    const r = refillStore(low, 'air');
    expect(r.ok && r.profile.stores.air).toBe(Math.min(storeCapacity(low.ship), 100 + 4 * STORES.air.per));
  });

  it("charges the battery from lignite first, then from caps' carbon", () => {
    const flat = { ...landed, stores: { air: 100, power: 0 }, cargo: addHoldTo(landed.cargo, { lignite: 1, carbon: 40 }).inv };
    const need = Math.ceil(storeCapacity(flat.ship) / STORES.power.per);
    expect(storeRefill(flat, 'power')).toEqual({ lignite: 1, carbon: need - 1 });
    const r = refillStore(flat, 'power');
    expect(r.ok && r.profile.stores.power).toBe(storeCapacity(flat.ship));
    expect(fuelsAt('mycel').cell).toEqual(['lignite', 'carbon']);
  });

  it("first follows the Aster's distress call to their wreck", () => {
    const fresh = { ...landed, beats: landed.beats.filter((b) => b !== 'asterFound') };
    expect(currentGoal(fresh)).toEqual({ kind: 'distress' });
    expect(goalLine(fresh, currentGoal(fresh))).toMatch(/distress call with the receiver/);
    expect(currentGoal({ ...fresh, docked: true, visited: ['graphite'] })).toEqual({ kind: 'land' });
  });

  it("studies the Aster's resonator by the wreck and prints the pulse before anything else", () => {
    const atWreck = { ...landed, found: [], tools: ['receiver'] as Profile['tools'], repaired: ['printer', 'hull', 'thrusters', 'comms', 'core'] as Profile['repaired'] };
    expect(currentGoal(atWreck)).toEqual({ kind: 'find', blueprint: 'pulse' });
    expect(goalLine(atWreck, currentGoal(atWreck))).toMatch(/isn't gear/);
    const studied = { ...atWreck, found: ['pulse'] };
    expect(currentGoal(studied)).toEqual({ kind: 'pulse' });
    expect(canPrintTool(atWreck, 'pulse')).toBe('nothing');
    expect(canPrintTool(studied, 'pulse')).toBe('materials');
    const rich = { ...studied, cargo: addHoldTo(studied.cargo, TOOL_KINDS.pulse.recipe).inv };
    const r = printTool(rich, 'pulse');
    expect(r.ok && r.profile.tools).toEqual(['receiver', 'pulse']);
    expect(r.ok && currentGoal(r.profile)).toEqual({ kind: 'find', blueprint: 'drill-2' });
    // Taken apart, the broken one gives half its makings back.
    expect(designSalvage('pulse')).toEqual({ pyrite: 1, malachite: 1, lignite: 1 });
    expect(designName('pulse')).toBe('Pulse');
  });

  it("leads to Mycel's drill, then the rest of its designs", () => {
    expect(currentGoal(landed)).toEqual({ kind: 'find', blueprint: 'drill-2' });
    expect(goalLine(landed, currentGoal(landed))).toMatch(/Mycel's stone/);
    expect(currentGoal({ ...landed, found: ['pulse', 'drill-2'] })).toEqual({ kind: 'print', blueprint: 'drill-2' });
    const printed = { ...landed, found: ['pulse', 'drill-2', 'cell-2'], gear: { ...landed.gear, drill: 2 } };
    expect(currentGoal(printed)).toEqual({ kind: 'explore', found: 2, of: 6 });
    const all = { ...printed, found: ['pulse', ...['cell', 'pack', 'drill', 'helmet', 'jetpack', 'suit'].map((p) => `${p}-2`)] };
    expect(currentGoal(all)).toEqual({ kind: 'trail' });
    expect(recipeOf('drill-2')!.materials).toEqual({ pyrite: 6, malachite: 4 });
  });

  it("then follows the crew's trail to their camp, wakes the last of them, and points on to Brine", () => {
    const all: Profile = { ...landed, found: ['pulse', ...['cell', 'pack', 'drill', 'helmet', 'jetpack', 'suit'].map((p) => `${p}-2`)], gear: { ...landed.gear, drill: 2 } };
    expect(goalLine(all, currentGoal(all))).toMatch(/walking east/);
    // The camp found: the pod waits for its charge, counted from the bag.
    const camp = campVisit(all, all.suit);
    expect(camp.says).toBe('camp');
    expect(currentGoal(camp.profile)).toEqual({ kind: 'wake' });
    expect(goalLine(camp.profile, currentGoal(camp.profile))).toMatch(/pyrite 0\/6 · calcite 0\/4/);
    expect(keptOres(camp.profile)).toEqual(['pyrite', 'calcite']);
    // Not all of it: the pod goes on waiting, the bag untouched.
    const some = addHoldTo(camp.profile.suit, { pyrite: 6, calcite: 3 }).inv;
    expect(campVisit(camp.profile, some)).toEqual({ profile: camp.profile, bag: some, says: 'pod' });
    // All of it: taken from the bag, and the sleeper wakes.
    const enough = addHoldTo(camp.profile.suit, { pyrite: 7, calcite: 4 }).inv;
    const woken = campVisit(camp.profile, enough);
    expect(woken.says).toBe('woken');
    expect(countIn(woken.bag, 'pyrite')).toBe(1);
    expect(countIn(woken.bag, 'calcite')).toBe(0);
    expect(currentGoal(woken.profile)).toEqual({ kind: 'brine' });
    expect(goalLine(woken.profile, currentGoal(woken.profile))).toMatch(/Brine/);
    expect(keptOres(woken.profile)).toEqual([]);
    expect(campVisit(woken.profile, woken.bag).says).toBe('awake');
    // Saved and loaded, it stays where it was.
    expect(currentGoal(parseProfile(JSON.parse(JSON.stringify(woken.profile))))).toEqual({ kind: 'brine' });
  });
});
