import { describe, expect, it } from 'vitest';
import { roofRows } from '../src/art/ground';
import { PLANET_3 } from '../content/planet3';
import { buildWorld } from '../src/level/build';
import { recipeOf } from '../src/logic/blueprints';
import { NEW_PROFILE, type Profile } from '../src/logic/economy';
import { addHoldTo, contents, emptyInventory } from '../src/logic/inventory';
import { BRINE_SET, brineSetFound, currentGoal, goalLine, MYCEL_SET } from '../src/logic/repairs';
import { canFix, fix, shipTankCapacity, SHIP_TANK, STARSHIP_IDS } from '../src/logic/starship';
import { campVisit, craftVisit, crystalVisit, HEART, keptOres, RAISE, REEF_TRADE, reefVisit, withBeat } from '../src/logic/story';
import { airRate, AIR, STARTER, SUIT_STACK } from '../src/logic/suit';
import { canTravel, tripFuel } from '../src/logic/travel';
import { fuelsAt } from '../src/logic/worlds';
import { Water } from '../src/logic/water';
import { TILE } from '../src/logic/terrain';
import { grid, mine, run, standAt, T } from './helpers';

const beats = (p: Profile, ...bs: Parameters<typeof withBeat>[1][]): Profile => bs.reduce(withBeat, p);
const bag = (h: Parameters<typeof addHoldTo>[1]) => addHoldTo(emptyInventory(8, SUIT_STACK), h).inv;

/** A profile at the end of chapter 2: the ship whole, the last of the Aster awake on Mycel. */
const WOKEN: Profile = {
  ...beats(NEW_PROFILE, 'called', 'met', 'paid', 'core', 'flown', 'course', 'distress', 'asterFound', 'asterCamp', 'asterWoken'),
  at: 'mycel', visited: ['graphite', 'mycel'], docked: true, starship: [...STARSHIP_IDS], shipFuel: 4,
  repaired: ['printer', 'hull', 'thrusters', 'comms', 'core'], gear: { ...NEW_PROFILE.gear, drill: 2 },
  found: ['drill-1', 'pulse', ...MYCEL_SET], tools: ['receiver', 'pulse'],
};
/** Landed on Brine. */
const LANDED: Profile = { ...WOKEN, starship: [...STARSHIP_IDS, 'asterTank'], at: 'brine', visited: [...WOKEN.visited, 'brine'], docked: false };

describe('the way to Brine', () => {
  it('needs the tank the woken Aster draws, which doubles the ship\'s', () => {
    expect(canFix(beats(NEW_PROFILE, 'flown'), 'asterTank')).toBe('design');
    expect(currentGoal(WOKEN)).toEqual({ kind: 'brine' });
    const stocked = { ...WOKEN, hold: addHoldTo(WOKEN.hold, { lignite: 10, amber: 4, calcite: 4 }).inv };
    expect(canFix(stocked, 'asterTank')).toBe('ok');
    const r = fix(stocked, 'asterTank');
    expect(r.ok && shipTankCapacity(r.profile)).toBe(SHIP_TANK.aster);
  });

  it('is a trip the first tank can\'t hold, from Mycel or Graphite', () => {
    expect(tripFuel('mycel', 'brine')).toBe(14);
    expect(tripFuel('graphite', 'brine')).toBe(14);
    const full = { ...WOKEN, shipFuel: 10 };
    expect(canTravel(full, 'brine', () => true)).toBe('tank');
    const fitted = { ...full, starship: [...STARSHIP_IDS, 'asterTank'] as Profile['starship'] };
    expect(canTravel(fitted, 'brine', () => true)).toBe('fuel');
    expect(currentGoal(fitted)).toEqual({ kind: 'tripFuel', to: 'brine' });
    expect(canTravel({ ...fitted, shipFuel: 14 }, 'brine', () => true)).toBe('ok');
    expect(currentGoal({ ...fitted, shipFuel: 14 })).toEqual({ kind: 'setCourse', to: 'brine' });
    expect(canTravel({ ...fitted, shipFuel: 14 }, 'brine', () => false)).toBe('locked');
  });

  it('lands on Brine, which has its own fuels: fresh water and manganese nodules', () => {
    expect(currentGoal({ ...LANDED, visited: WOKEN.visited, docked: true })).toEqual({ kind: 'land', world: 'brine' });
    expect(fuelsAt('brine')).toEqual({ cell: ['nodule'], air: ['water'] });
  });
});

describe("Brine's story", () => {
  it('goes craft, song, copper, drill, rebreather, the drowned village, the hull, the heart, the crystal, home to Mycel and the reunion', () => {
    const kinds: string[] = [];
    let p = LANDED;
    const step = (f: (q: Profile) => Profile): void => {
      kinds.push(currentGoal(p).kind);
      p = f(p);
    };
    step((q) => craftVisit(q, q.suit).profile);
    step((q) => reefVisit(q, q.suit, brineSetFound).profile);
    step((q) => reefVisit(q, bag(REEF_TRADE), brineSetFound).profile);
    step((q) => ({ ...q, gear: { ...q.gear, drill: 3 } }));
    step((q) => ({ ...q, tools: [...q.tools, 'rebreather'] }));
    step((q) => ({ ...q, found: [...new Set([...q.found, ...BRINE_SET])] }));
    step((q) => reefVisit(q, bag(RAISE), brineSetFound).profile);
    step((q) => craftVisit(q, bag(HEART)).profile);
    step((q) => crystalVisit(q)!);
    step((q) => craftVisit(q, q.suit).profile);
    step((q) => ({ ...q, docked: true, shipFuel: 14 }));
    step((q) => ({ ...q, at: 'mycel', shipFuel: 0 }));
    step((q) => campVisit(q, q.suit).profile);
    kinds.push(currentGoal(p).kind);
    expect(kinds).toEqual(['craft', 'song', 'reefTrade', 'print', 'rebreather', 'explore', 'raise', 'heart', 'crystal', 'flight', 'tripFuel', 'setCourse', 'reunion', 'brineEnd']);
    for (const g of kinds) expect(g.length).toBeGreaterThan(0);
  });

  it('pays the Tidesingers from the bag, and they give the drill and the crew the rebreather', () => {
    const met = beats(LANDED, 'craftFound', 'reefMet');
    expect(reefVisit(met, bag({ copper: 3 }), brineSetFound).says).toBe('want');
    const r = reefVisit(met, bag({ copper: 9 }), brineSetFound);
    expect(r.says).toBe('paid');
    expect(contents(r.bag)).toEqual({ copper: 1 });
    expect(r.profile.found).toEqual(expect.arrayContaining(['drill-3', 'rebreather']));
    expect(recipeOf('drill-3')!.materials).toEqual({ copper: 5, nodule: 4 });
  });

  it('keeps what each one waits for in the bag at the lander, and only until it is handed over', () => {
    const met = beats(LANDED, 'craftFound', 'reefMet');
    expect(keptOres(met)).toEqual(['copper']);
    const crew = beats(met, 'reefPaid', 'crewMet');
    expect(keptOres(crew)).toEqual(['magnetite']);
    expect(keptOres(beats(crew, 'craftRaised'))).toEqual(['nodule', 'pearl']);
    expect(keptOres(beats(crew, 'craftRaised', 'craftMended'))).toEqual([]);
  });

  it('asks for the hull patch only once the drowned village is studied, and the heart only once the craft is up', () => {
    const crew = beats(LANDED, 'craftFound', 'reefMet', 'reefPaid', 'crewMet');
    expect(reefVisit(crew, bag(RAISE), brineSetFound).says).toBe('wait');
    const studied = { ...crew, found: [...crew.found, ...BRINE_SET] };
    expect(reefVisit(studied, bag({ magnetite: 2 }), brineSetFound).says).toBe('patch');
    expect(craftVisit(studied, bag(HEART)).says).toBeNull();
    const up = reefVisit(studied, bag(RAISE), brineSetFound);
    expect(up.says).toBe('raised');
    expect(craftVisit(up.profile, bag({ nodule: 6 })).says).toBe('heart');
    expect(craftVisit(up.profile, bag(HEART)).says).toBe('mended');
  });

  it('says every goal in a line', () => {
    const lines = [LANDED, beats(LANDED, 'craftFound'), beats(LANDED, 'craftFound', 'reefMet')].map((p) => goalLine(p, currentGoal(p)));
    expect(lines[0]).toMatch(/reef/);
    expect(lines[1]).toMatch(/under water/);
    expect(lines[2]).toMatch(/copper 0\/8/);
  });
});

describe('swimming', () => {
  const POOL = ['ssssssssss', 's........s', 's........s', 's........s', 's........s', 's........s', 'ssssssssss', '##########'];
  /** A pool full of water from row `from` down, the prospector standing in it on the bottom. */
  function pool(from: number, over = {}) {
    const t = grid(POOL);
    const wet = new Uint8Array(t.width * t.height);
    for (let y = from; y <= 5; y++) for (let x = 1; x <= 8; x++) wet[y * t.width + x] = 1;
    const water = new Water(t, null, wet);
    const m = mine(POOL, { terrain: t, water, lander: { col: 20, row: 1 }, ...over });
    standAt(m, 4, 6);
    return m;
  }

  it('sinks slowly and strokes up on jump; the jetpack never fires in water', () => {
    const m = pool(1);
    run(m, 1 / 60);
    expect(m.swimming).toBe(true);
    const y0 = m.player.y;
    run(m, 0.5, { thrust: true });
    expect(m.player.y).toBeLessThan(y0 - T);
    expect(m.jetting).toBe(false);
    const fuel = m.suit.fuel;
    expect(fuel).toBe(STARTER.fuel);
  });

  it('drains air faster the deeper you are, and a rebreather stops depth mattering', () => {
    expect(airRate(0, false)).toBe(1);
    expect(airRate(10, false)).toBe(2);
    expect(airRate(20, false)).toBe(3);
    expect(airRate(80, false)).toBe(4);
    expect(airRate(30, true)).toBe(1);
    const deep = pool(1);
    const shallow = pool(5, {});
    run(deep, 6);
    run(shallow, 6);
    expect(AIR.full - deep.suit.air).toBeGreaterThan(AIR.full - shallow.suit.air);
  });

  it('pours water into a tunnel dug into a pocket, and says so', () => {
    const rows = ['ssssssssss', 'ssssssssss', 's.....ssss', 'ssssssssss', '##########'];
    const t = grid(rows);
    // A pocket of water in the soil up and to the right of the tunnel's end.
    for (const x of [6, 7]) t.tiles[1 * 10 + x] = TILE.air;
    const wet = new Uint8Array(50);
    wet[16] = wet[17] = 1;
    const water = Water.carved(t, null, wet, new Uint8Array(50), roofRows(t));
    const m = mine(rows, { terrain: t, water, lander: { col: 20, row: 1 } });
    standAt(m, 5, 3);
    m.facing = 1;
    const events = run(m, 2, { ix: 1 });
    expect(events.some((e) => e.kind === 'flood' && e.near)).toBe(true);
    run(m, 1);
    // Its two tiles fell to the tunnel's floor, and the pocket is empty.
    expect(water.wet.reduce((a, b) => a + b, 0)).toBe(2);
    expect(water.isWet(6, 1) || water.isWet(7, 1)).toBe(false);
  });
});

describe('the world of Brine', () => {
  const built = buildWorld(PLANET_3, { ...LANDED }, null);
  const { terrain: t, water } = built.setup;

  it('has a sea round its islands, and the lander on dry ground', () => {
    const w = water!;
    const lander = PLANET_3.world.site.landerCol;
    expect(w.isWet(lander, PLANET_3.world.site.surface - 1)).toBe(false);
    // Out at sea, the water stands from sea level down to the bed.
    expect(w.isWet(200, PLANET_3.world.site.surface + PLANET_3.world.site.sea!.level)).toBe(true);
    expect(w.isWet(200, PLANET_3.world.site.surface + PLANET_3.world.site.sea!.level - 1)).toBe(false);
  });

  it('keeps the Tidesingers\' reef flooded and their air bell dry', () => {
    const [col, depth] = PLANET_3.world.reef!.at;
    const y = PLANET_3.world.site.surface + depth;
    expect(water!.isWet(col, y)).toBe(true);
    const bell = PLANET_3.world.site.bells![0]!;
    expect(water!.isWet(bell.at[0], PLANET_3.world.site.surface + bell.at[1])).toBe(false);
    expect(t.tiles[(PLANET_3.world.site.surface + bell.at[1]) * t.width + bell.at[0]]).toBe(TILE.air);
  });

  it('is bigger than Graphite and Mycel', () => {
    expect(t.width * t.height).toBeGreaterThan(256 * 160);
  });

  it('keeps the reef shallow, with the craft two metres under', () => {
    const col = PLANET_3.world.craft!;
    let y = 0;
    while (t.tiles[y * t.width + col] === TILE.air) y++;
    expect(y - (PLANET_3.world.site.surface + PLANET_3.world.site.sea!.level)).toBe(2);
  });
});

void STARTER;
