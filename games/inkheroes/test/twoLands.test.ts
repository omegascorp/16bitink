/// <reference types="vite/client" />
import { afterEach, describe, expect, it } from 'vitest';
import { INKHEROES_PAID_MAPS } from '../content/paid';
import { BLACK_BANNER, ASHFORD, OTHRYS } from '../src/level/borderMarch';
import { chapterById, chapterOf, CHAPTERS, installPaidMaps, isLoaded, loadedMaps, mapById, MAPS, nextMap, partNumber, partsIn, partsOf } from '../src/level/maps';
import { ABU, DELTA, NEKHEN, RED_LAND } from '../src/level/twoLands';
import { TWO_LANDS_UNLOCKS, openIn } from '../src/level/unlocks';
import { PASER } from '../src/level/recruits';
import { rideOn } from '../src/logic/chapter';
import { cantHireHero, hireHero, recruitsLeft } from '../src/logic/heroes';
import { gridOf, planPath, townById } from '../src/logic/adventure';
import { parseMaps } from '../src/level/validate';
import { afterBattle, battleSides, monsterArmy, startAdventure } from '../src/logic/adventure';
import { BUILDING_IDS } from '../src/logic/buildings';
import { ITEMS, SET_NAMES, type ItemId } from '../src/logic/items';
import { autoBattle } from '../src/logic/rival';
import { adventureKey, loadAdventure, parseAdventure, saveAdventure } from '../src/logic/save';
import { upcoming } from '../src/narration/upcoming';

/** Every client source file's text, by path. */
const SOURCES = import.meta.glob<string>('../src/**/*.ts', { query: '?raw', import: 'default', eager: true });

const memoryStore = (): { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void; keys(): string[] } => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), keys: () => [...m.keys()] };
};

const twoLands = chapterById('twoLands');
afterEach(() => installPaidMaps([]));

describe('chapter 2 stays out of the free game', () => {
  it('no client code imports the paid maps', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(50);
    for (const [file, text] of Object.entries(SOURCES)) {
      if (/level\/(twoLands|nekhen|abu|redLand|delta|longWinter|hladir)\.ts$/.test(file)) continue;
      const specs = [...text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]!);
      for (const spec of specs) {
        expect(spec, file).not.toMatch(/content\/paid/);
        expect(spec, file).not.toMatch(/(^|\/)(twoLands|nekhen|abu|redLand|delta|longWinter|hladir)$/);
      }
    }
  });

  it('serves the paid maps as JSON the client checks and reads back the same', () => {
    expect(INKHEROES_PAID_MAPS.map((m) => m.id)).toEqual(['nekhen', 'abu', 'red-land', 'delta', 'hladir']);
    expect(parseMaps(JSON.parse(JSON.stringify(INKHEROES_PAID_MAPS)))).toEqual(JSON.parse(JSON.stringify(INKHEROES_PAID_MAPS)));
  });

  it('refuses a payload that is off in any way', () => {
    const ok = JSON.parse(JSON.stringify(NEKHEN)) as Record<string, unknown>;
    const bad = (patch: Record<string, unknown>): unknown => [{ ...ok, ...patch }];
    expect(() => parseMaps(bad({ id: 'ashford' }))).toThrow();
    expect(() => parseMaps(bad({ id: '__proto__' }))).toThrow();
    expect(() => parseMaps(bad({ n: 2 }))).toThrow();
    // Part 4 is Othrys, chapter 1's last (free): never a paid map's number.
    expect(() => parseMaps(bad({ n: 4 }))).toThrow();
    // Not in any paid chapter's range: it would be saved in chapter 1's slot (chapter 3 runs 9 to 12).
    expect(() => parseMaps(bad({ n: 13 }))).toThrow();
    expect(() => parseMaps(bad({ n: 99 }))).toThrow();
    // A win is recorded only for a lowercase id (src/logic/save.ts).
    expect(() => parseMaps(bad({ id: 'Nekhen2' }))).toThrow();
    expect(() => parseMaps(bad({ rows: ['ss', 'sX'] }))).toThrow();
    expect(() => parseMaps(bad({ rows: ['sss', 'ss'] }))).toThrow();
    expect(() => parseMaps(bad({ objects: [{ id: 'm', kind: 'monster', x: 1, y: 1, creature: 'wyvern', count: 3 }] }))).toThrow();
    expect(() => parseMaps(bad({ objects: [{ id: 'm', kind: 'monster', x: 1, y: 1, creature: 'hyena', count: 1e9 }] }))).toThrow();
    expect(() => parseMaps(bad({ off: ['nothing'] }))).toThrow();
    expect(() => parseMaps(bad({ story: 'no-such-line' }))).toThrow();
    // A boss's own line (Hrímgrímnir's) must be one the narrator has.
    expect(() => parseMaps(bad({ objects: [{ id: 'm', kind: 'monster', x: 1, y: 1, creature: 'hyena', count: 3, line: 'no-such-line' }] }))).toThrow();
    expect(() => parseMaps({})).toThrow();
    expect(() => parseMaps([ok, ok])).toThrow();
  });

  it('a player without the full game has chapter 1 only, and it never rides on into chapter 2', () => {
    expect(isLoaded(twoLands)).toBe(false);
    expect(partsOf(twoLands)).toEqual([]);
    expect(mapById('nekhen')).toBeUndefined();
    expect(loadedMaps()).toEqual(MAPS);
    expect(nextMap(OTHRYS)).toBeUndefined();
    // The menu still names the locked chapter's parts without its maps.
    expect(twoLands.parts).toEqual([NEKHEN, ABU, RED_LAND, DELTA].map((m) => ({ id: m.id, n: m.n, name: m.name })));
    expect(twoLands.paid).toBe(true);
  });

  it('an owner has chapter 2 as a chapter of its own', () => {
    installPaidMaps(parseMaps(JSON.parse(JSON.stringify(INKHEROES_PAID_MAPS))));
    expect(isLoaded(twoLands)).toBe(true);
    expect(partsOf(twoLands).map((m) => m.id)).toEqual(['nekhen', 'abu', 'red-land', 'delta']);
    expect(mapById('nekhen')?.name).toBe('Nekhen');
    expect(chapterOf(NEKHEN)?.id).toBe('twoLands');
    expect(chapterOf(ASHFORD)?.id).toBe('borderMarch');
    expect(chapterOf({ n: 9 })?.id).toBe('longWinter');
    expect(chapterOf({ n: 13 })).toBeUndefined();
    expect(nextMap({ ...NEKHEN, n: 9 })).toBeUndefined();
    expect(partsOf(chapterById('borderMarch'))).toEqual(MAPS);
    expect(nextMap(OTHRYS)).toBeUndefined();
    expect(nextMap(NEKHEN)?.id).toBe('abu');
    expect(nextMap(ABU)?.id).toBe('red-land');
    expect(nextMap(RED_LAND)?.id).toBe('delta');
    expect(nextMap(DELTA)).toBeUndefined();
    // Each chapter's parts are 1, 2, 3, 4 to the player; inside, `n` runs on through the campaign and decides the chapter.
    expect(CHAPTERS.map((c) => [c.first, c.last])).toEqual([[1, 4], [5, 8], [9, 12]]);
    expect([...MAPS, NEKHEN, ABU, RED_LAND, DELTA].map(partNumber)).toEqual([1, 2, 3, 4, 1, 2, 3, 4]);
    expect(CHAPTERS.map(partsIn)).toEqual([4, 4, 4]);
  });
});

describe("chapter 2's saved game", () => {
  it('has a slot of its own: chapter 1 saves where it always did, and neither sees the other', () => {
    const store = memoryStore();
    const one = startAdventure(ASHFORD);
    const two = startAdventure(NEKHEN);
    saveAdventure(store, { current: one, dayStart: one });
    saveAdventure(store, { current: two, dayStart: two }, twoLands.slot);
    expect(adventureKey()).toBe('inkheroes.adventure.v1');
    expect(store.keys().sort()).toEqual(['inkheroes.adventure.twoLands.v1', 'inkheroes.adventure.v1']);
    expect(loadAdventure(store, mapById)?.current).toEqual(one);
    installPaidMaps([NEKHEN]);
    const inTwo = (id: string) => partsOf(twoLands).find((m) => m.id === id);
    expect(loadAdventure(store, inTwo, twoLands.slot)?.current).toEqual(two);
    // A chapter-1 game never opens in chapter 2's slot, nor the other way round.
    expect(loadAdventure(store, inTwo)).toBeNull();
    expect(loadAdventure(store, (id) => MAPS.find((m) => m.id === id), twoLands.slot)).toBeNull();
    // Throwing chapter 2's game away leaves chapter 1's.
    saveAdventure(store, null, twoLands.slot);
    expect(loadAdventure(store, inTwo, twoLands.slot)).toBeNull();
    expect(loadAdventure(store, mapById)?.current).toEqual(one);
  });

  it('keeps an Egyptian game through a save: the people, the Papyrus, the Ankhs', () => {
    const adv = startAdventure(NEKHEN);
    const back = parseAdventure(JSON.parse(JSON.stringify(adv)), NEKHEN)!;
    expect(back).toEqual(adv);
    expect(back.hero).toMatchObject({ name: 'Neferet', faction: 'kemet', ankhs: 2, spells: ['curse', 'ward'], gear: { book: 'novicePapyrus' } });
    expect(back.towns[0]).toMatchObject({ name: 'Nekhen', faction: 'kemet', built: ['villageHall', 'tavern', 'guardhouse'] });
  });
});

describe('Nekhen', () => {
  it('starts Neferet in Nekhen as the design has it', () => {
    const adv = startAdventure(NEKHEN);
    expect(NEKHEN.rows).toHaveLength(24);
    expect(NEKHEN.rows.every((r) => r.length === 32)).toBe(true);
    expect(adv.hero.army.filter(Boolean)).toEqual([{ creature: 'levy', count: 18 }, { creature: 'nubian', count: 7 }]);
    expect(adv.hero).toMatchObject({ attack: 1, defense: 1, power: 2, knowledge: 3, skills: { wisdom: 1 } });
    expect(adv.towns[0]!.stock.levy).toBeGreaterThan(0);
  });

  it('opens what the design opens on part 4, and nothing else', () => {
    const open = BUILDING_IDS.filter((b) => !NEKHEN.off.includes(b));
    expect(open).toEqual(BUILDING_IDS.filter((b) => openIn(TWO_LANDS_UNLOCKS, 1).has(b)));
    expect(new Set(open)).toEqual(new Set(['villageHall', 'townHall', 'fort', 'citadel', 'tavern', 'mageGuild1', 'templeOsiris', 'guardhouse', 'archeryRange', 'griffinTower', 'barracks']));
  });

  it('has the Nile down the land, crossed by a bridge and a ford, with floodplain and desert', () => {
    const rows = NEKHEN.rows.join('\n');
    expect(rows).toMatch(/b/);
    expect(NEKHEN.rows.slice(1, 23).every((r) => r.includes('~') || r.includes('b') || /g{3}s{3}g{3}/.test(r))).toBe(true);
    expect(rows.match(/s/g)!.length).toBeGreaterThan(rows.match(/g/g)!.length);
  });

  it('drops the gray Faience set, one piece per slot, from fixed monsters', () => {
    const faience = (Object.keys(ITEMS) as ItemId[]).filter((id) => (ITEMS[id] as { set?: string }).set === 'faience');
    expect(SET_NAMES.faience).toBe('Faience set');
    expect(new Set(faience.map((id) => ITEMS[id].slot))).toEqual(new Set(['helm', 'cuirass', 'bracers', 'belt', 'greaves', 'boots']));
    expect(faience.every((id) => ITEMS[id].quality === 'gray')).toBe(true);
    const drops = NEKHEN.objects.filter((o) => o.kind === 'monster' && o.drop).map((o) => o.drop);
    expect(new Set(drops)).toEqual(new Set(faience));
  });

  it('puts the Petsuchos and its brood in one fight at the sluice, and beating it wins the part', () => {
    const boss = NEKHEN.objects.find((o) => o.id === NEKHEN.goal.target)!;
    expect(monsterArmy(boss).filter(Boolean).map((s) => s!.creature)).toEqual(['petsuchos', 'crocodile', 'crocodile', 'crocodile']);
    const adv = { ...startAdventure(NEKHEN), prompts: [] };
    const strong = { ...adv, hero: { ...adv.hero, army: [{ creature: 'chariot' as const, count: 60 }, { creature: 'nubian' as const, count: 80 }, null, null, null, null, null] } };
    const setup = battleSides(strong, boss.id);
    const st = autoBattle(setup.attacker, setup.defender, setup.seed);
    expect(afterBattle(strong, NEKHEN, boss.id, st).status).toBe('won');
  });

  it('tells Abu’s story next once it opens', () => {
    expect(upcoming({ ...startAdventure(NEKHEN), prompts: [] }, 2)).toEqual(['part-abu']);
  });
});

/** Nekhen won, as a bot leaves it: the sluice taken, day `day`, the army `army`. */
function nekhenWon(day = 14, army = [{ creature: 'levy' as const, count: 60 }, { creature: 'nubian' as const, count: 25 }, { creature: 'jackal' as const, count: 12 }, null, null, null, null]) {
  const adv = { ...startAdventure(NEKHEN), prompts: [] };
  const objects = adv.objects.map((o) => (o.id === NEKHEN.goal.target ? { ...o, gone: true } : o));
  return { ...adv, day, objects, status: 'won' as const, hero: { ...adv.hero, army } };
}

describe('Abu', () => {
  it('is 40 × 32 south of Nekhen, the Nile running on from one into the other', () => {
    expect(ABU.rows).toHaveLength(56);
    expect(ABU.rows.every((r) => r.length === 40)).toBe(true);
    // Nekhen's tiles are Nekhen's, unchanged, in the bigger land.
    expect(ABU.rows.slice(0, 24).map((r) => r.slice(0, 32))).toEqual(NEKHEN.rows);
    // The river runs on: water under Nekhen's last row of water.
    for (const x of [15, 16, 17]) expect([NEKHEN.rows[23]![x], ABU.rows[24]![x]]).toEqual(['~', '~']);
    // The cataract's granite belt crosses the river, and Abu stands on its island, reached by a causeway and a ford.
    const abu = ABU.towns![0]!;
    expect(abu).toMatchObject({ id: 'abu-town', name: 'Abu', faction: 'kemet' });
    expect(ABU.rows.slice(40, 44).some((r) => /~k|k~/.test(r))).toBe(true);
    expect(ABU.rows[abu.y + 1]!.slice(abu.x - 3, abu.x)).toMatch(/b/);
    expect(ABU.rows.slice(abu.y + 2, abu.y + 6).some((r) => /~s{4,}g/.test(r))).toBe(true);
  });

  it('opens what the design opens on part 6, Egypt’s Workshop with the Earth Ramp among it', () => {
    const open = new Set(BUILDING_IDS.filter((b) => !ABU.off.includes(b)));
    expect(open).toEqual(openIn(TWO_LANDS_UNLOCKS, 2));
    for (const b of ['cityHall', 'marketplace', 'mageGuild2', 'blacksmith', 'storehouse', 'stables', 'monastery', 'guardhouse2', 'archeryRange2', 'griffinTower2', 'barracks2'] as const) expect(open.has(b), b).toBe(true);
    expect(open.has('castle')).toBe(false);
    expect(ABU).toMatchObject({ n: 6, parDays: 28, story: 'part-abu', goal: { kind: 'capture', target: 'abu-town' }, grant: { gold: 2500, wood: 5, ore: 5 } });
  });

  it('holds Abu with raiders on its tower, hyenas, cobras and lions behind a Fort’s walls', () => {
    const abu = ABU.towns![0]!;
    expect(new Set(abu.garrison.filter(Boolean).map((s) => s!.creature))).toEqual(new Set(['raider', 'hyena', 'cobra', 'lion']));
    expect(abu.built).toEqual(['villageHall', 'townHall', 'fort', 'tavern', 'guardhouse', 'archeryRange']);
    const adv = rideOn(nekhenWon(), NEKHEN, ABU);
    const setup = battleSides(adv, 'abu-town');
    expect(setup.siege).toBeDefined();
    expect(setup.defender.towers?.[0]?.creature).toBe('raider');
  });

  it('rides on from Nekhen: the land grows round the hero, Pharaoh’s grant comes, the way south is shown and Abu is still to find', () => {
    const won = nekhenWon();
    const next = rideOn(won, NEKHEN, ABU);
    expect(next.mapId).toBe('abu');
    expect(next.purse.gold).toBe(won.purse.gold + 2500);
    expect(next.towns.map((t) => t.id)).toEqual(['nekhen-town', 'abu-town']);
    expect(townById(next, 'abu-town')).toMatchObject({ owner: 'neutral', faction: 'kemet' });
    const g = gridOf(ABU);
    const seen = (x: number, y: number): boolean => next.explored[x + y * g.w] === '1';
    for (const p of ABU.opening!.way) expect(seen(p.x, p.y), `${p.x},${p.y}`).toBe(true);
    expect(seen(ABU.towns![0]!.x, ABU.towns![0]!.y)).toBe(false);
    expect(next.prompts.at(-1)).toMatchObject({ kind: 'message', line: 'part-abu' });
    // The road south is open from Nekhen.
    expect(planPath({ ...next, hero: { ...next.hero, x: 9, y: 8, mp: 1e9 } }, ABU, 12, 30)).not.toBeNull();
  });

  it('drops the gray Scale set, one piece per slot, on the west bank where Paser is hired', () => {
    const scale = (Object.keys(ITEMS) as ItemId[]).filter((id) => (ITEMS[id] as { set?: string }).set === 'scale');
    expect(SET_NAMES.scale).toBe('Scale set');
    expect(new Set(scale.map((id) => ITEMS[id].slot))).toEqual(new Set(['helm', 'cuirass', 'bracers', 'belt', 'greaves', 'boots']));
    for (const id of scale) expect(Object.keys(ITEMS[id].gives).every((k) => ['attack', 'defense', 'morale'].includes(k)), id).toBe(true);
    const dropping = ABU.objects.filter((o) => o.kind === 'monster' && o.drop && scale.includes(o.drop));
    expect(new Set(dropping.map((o) => o.drop))).toEqual(new Set(scale));
    // The west bank: west of the river's water (columns 15 to 17 down the road, the causeway's foot at the cataract).
    for (const o of dropping) expect(o.x, o.id).toBeLessThanOrEqual(12);
  });

  it('brings the cataract’s cobras and lions', () => {
    const kinds = new Set(ABU.objects.filter((o) => o.kind === 'monster' && o.y >= 24).map((o) => o.creature));
    for (const c of ['cobra', 'lion', 'raider'] as const) expect(kinds.has(c), c).toBe(true);
  });

  it('hires Paser at any Tavern of ours, once, for 2500 gold', () => {
    expect(PASER).toMatchObject({ id: 'paser', heroClass: 'knight', attack: 3, defense: 2, power: 1, knowledge: 1, skills: { offense: 1 }, spells: [] });
    expect(PASER.army).toEqual([{ creature: 'levy', count: 15 }, { creature: 'chariot', count: 3 }]);
    expect(PASER.gear?.book).toBeUndefined();
    expect(NEKHEN.recruits ?? []).toEqual([]);
    expect(ABU.recruits).toEqual([PASER]);
    const adv = rideOn(nekhenWon(), NEKHEN, ABU);
    // Neferet rides out of Nekhen's gate first, so the gate is free.
    const out = { ...adv, hero: { ...adv.hero, x: 12, y: 30 } };
    const nekhen = townById(out, 'nekhen-town')!;
    expect(cantHireHero(out, ABU, nekhen)).toBeNull();
    const hired = hireHero(out, ABU, 'nekhen-town')!;
    expect(hired.purse.gold).toBe(out.purse.gold - 2500);
    expect(hired.hero).toMatchObject({ id: 'paser', name: 'Paser', faction: 'kemet', x: nekhen.x, y: nekhen.y });
    expect(recruitsLeft(hired, ABU)).toEqual([]);
    expect(hireHero({ ...hired, hero: { ...hired.hero, x: 12, y: 30 } }, ABU, 'nekhen-town')).toBeNull();
  });

  it('can be stormed with an Earth Ramp, and taking it wins the part', () => {
    const adv = rideOn(nekhenWon(), NEKHEN, ABU);
    const strong = { ...adv, hero: { ...adv.hero, gear: { ...adv.hero.gear, machine: 'ramp' as const }, army: [{ creature: 'chariot' as const, count: 40 }, { creature: 'nubian' as const, count: 80 }, { creature: 'jackal' as const, count: 40 }, null, null, null, null] } };
    const setup = battleSides(strong, 'abu-town');
    expect(setup.attacker.machine).toBe('ramp');
    const st = autoBattle(setup.attacker, setup.defender, setup.seed, setup.siege);
    expect(st.siege?.ramps?.length).toBe(1);
    expect(afterBattle(strong, ABU, 'abu-town', st).status).toBe('won');
  });

  it('tells its win next', () => {
    // Since part 6: a part's end, told as the chapter rides on east.
    expect(upcoming({ ...rideOn(nekhenWon(), NEKHEN, ABU), prompts: [] }, 2)).toEqual(['abu-won', 'part-redLand']);
    expect(ABU.won).toBe('abu-won');
    expect(twoLands.ending).toBe('twoLands-won');
  });
});
