/// <reference types="vite/client" />
import { afterEach, describe, expect, it } from 'vitest';
import { INKHEROES_PAID_MAPS } from '../content/paid';
import { BLACK_BANNER, ASHFORD } from '../src/level/borderMarch';
import { chapterById, chapterOf, CHAPTERS, installPaidMaps, isLoaded, loadedMaps, mapById, MAPS, nextMap, partsOf } from '../src/level/maps';
import { NEKHEN } from '../src/level/twoLands';
import { TWO_LANDS_UNLOCKS, openIn } from '../src/level/unlocks';
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
      if (/level\/(twoLands|nekhen)\.ts$/.test(file)) continue;
      const specs = [...text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]!);
      for (const spec of specs) {
        expect(spec, file).not.toMatch(/content\/paid/);
        expect(spec, file).not.toMatch(/(^|\/)(twoLands|nekhen)$/);
      }
    }
  });

  it('serves the paid maps as JSON the client checks and reads back the same', () => {
    expect(INKHEROES_PAID_MAPS.map((m) => m.id)).toEqual(['nekhen']);
    expect(parseMaps(JSON.parse(JSON.stringify(INKHEROES_PAID_MAPS)))).toEqual(JSON.parse(JSON.stringify(INKHEROES_PAID_MAPS)));
  });

  it('refuses a payload that is off in any way', () => {
    const ok = JSON.parse(JSON.stringify(NEKHEN)) as Record<string, unknown>;
    const bad = (patch: Record<string, unknown>): unknown => [{ ...ok, ...patch }];
    expect(() => parseMaps(bad({ id: 'ashford' }))).toThrow();
    expect(() => parseMaps(bad({ id: '__proto__' }))).toThrow();
    expect(() => parseMaps(bad({ n: 2 }))).toThrow();
    // Not in any paid chapter's range: it would be saved in chapter 1's slot.
    expect(() => parseMaps(bad({ n: 7 }))).toThrow();
    expect(() => parseMaps(bad({ n: 99 }))).toThrow();
    // A win is recorded only for a lowercase id (src/logic/save.ts).
    expect(() => parseMaps(bad({ id: 'Nekhen2' }))).toThrow();
    expect(() => parseMaps(bad({ rows: ['ss', 'sX'] }))).toThrow();
    expect(() => parseMaps(bad({ rows: ['sss', 'ss'] }))).toThrow();
    expect(() => parseMaps(bad({ objects: [{ id: 'm', kind: 'monster', x: 1, y: 1, creature: 'dragon', count: 3 }] }))).toThrow();
    expect(() => parseMaps(bad({ objects: [{ id: 'm', kind: 'monster', x: 1, y: 1, creature: 'hyena', count: 1e9 }] }))).toThrow();
    expect(() => parseMaps(bad({ off: ['nothing'] }))).toThrow();
    expect(() => parseMaps(bad({ story: 'no-such-line' }))).toThrow();
    expect(() => parseMaps({})).toThrow();
    expect(() => parseMaps([ok, ok])).toThrow();
  });

  it('a player without the full game has chapter 1 only, and it never rides on into chapter 2', () => {
    expect(isLoaded(twoLands)).toBe(false);
    expect(partsOf(twoLands)).toEqual([]);
    expect(mapById('nekhen')).toBeUndefined();
    expect(loadedMaps()).toEqual(MAPS);
    expect(nextMap(BLACK_BANNER)).toBeUndefined();
    // The menu still names the locked chapter's parts without its maps.
    expect(twoLands.parts).toEqual([{ id: NEKHEN.id, n: NEKHEN.n, name: NEKHEN.name }]);
    expect(twoLands.paid).toBe(true);
  });

  it('an owner has chapter 2 as a chapter of its own', () => {
    installPaidMaps(parseMaps(JSON.parse(JSON.stringify(INKHEROES_PAID_MAPS))));
    expect(isLoaded(twoLands)).toBe(true);
    expect(partsOf(twoLands).map((m) => m.id)).toEqual(['nekhen']);
    expect(mapById('nekhen')?.name).toBe('Nekhen');
    expect(chapterOf(NEKHEN)?.id).toBe('twoLands');
    expect(chapterOf(ASHFORD)?.id).toBe('borderMarch');
    expect(chapterOf({ n: 7 })).toBeUndefined();
    expect(nextMap({ ...NEKHEN, n: 7 })).toBeUndefined();
    expect(partsOf(chapterById('borderMarch'))).toEqual(MAPS);
    expect(nextMap(BLACK_BANNER)).toBeUndefined();
    expect(nextMap(NEKHEN)).toBeUndefined();
    // Part numbers run on through the campaign.
    expect(CHAPTERS.map((c) => [c.first, c.last])).toEqual([[1, 3], [4, 6]]);
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

  it('tells its ending next once it opens', () => {
    expect(upcoming({ ...startAdventure(NEKHEN), prompts: [] }, 2)).toEqual(['nekhen-won']);
  });
});
