import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DELTA_LAND } from '../src/level/delta';
import { chapterById, chapterOf, installPaidMaps, isOpen, mapById, nextMap } from '../src/level/maps';
import { DELTA, NEKHEN, RED_LAND, TWO_LANDS_PARTS } from '../src/level/twoLands';
import { lockedIn, openIn, soldOn, TWO_LANDS_UNLOCKS } from '../src/level/unlocks';
import type { MapDef } from '../src/level/types';
import { gridOf, isSeen, startAdventure, type Adventure } from '../src/logic/adventure';
import { BUILDING_IDS, BUILDINGS } from '../src/logic/buildings';
import { rideOn } from '../src/logic/chapter';
import { storyVillains } from '../src/logic/heroes';
import { passable } from '../src/logic/map';
import { objectFootprint, townFootprint } from '../src/logic/objects';
import { EMPTY_PROGRESS, loadAdventure, recordWin, saveAdventure } from '../src/logic/save';
import { upcoming } from '../src/narration/upcoming';
import { chapterEnd } from '../src/scenes/chapterEnd';

/** Every tile something stands on or blocks: objects, their footprints, towns' walls. */
function blockedTiles(def: MapDef): Set<string> {
  const out = new Set<string>();
  for (const o of def.objects) for (const t of [o, ...objectFootprint(o)]) out.add(`${t.x},${t.y}`);
  for (const t of [def.town, ...(def.towns ?? [])]) for (const f of townFootprint(t.x, t.y)) out.add(`${f.x},${f.y}`);
  return out;
}

/** The tiles a hero can walk to from (x, y), fighting every monster on the way (their own tiles and footprints stay solid). */
function walkable(def: MapDef, x: number, y: number, closed: readonly { x: number; y: number }[] = []): Set<string> {
  const g = gridOf(def);
  const blocked = blockedTiles(def);
  for (const c of closed) blocked.add(`${c.x},${c.y}`);
  const seen = new Set([`${x},${y}`]);
  const todo = [{ x, y }];
  while (todo.length) {
    const p = todo.pop()!;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const q = { x: p.x + dx, y: p.y + dy };
        const k = `${q.x},${q.y}`;
        if (seen.has(k) || blocked.has(k) || !passable(g, q.x, q.y)) continue;
        seen.add(k);
        todo.push(q);
      }
    }
  }
  return seen;
}
const besideOne = (reach: Set<string>, x: number, y: number): boolean => [-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => (dx || dy) && reach.has(`${x + dx},${y + dy}`)));

/** Where the Delta lies in the chapter: its top-left corner, and whether a tile is its (an L: the hole is Abu's and the Red Land's). */
const AT = { x: 32, y: 0 } as const;
const inDelta = (x: number, y: number): boolean => (x >= AT.x && y < 24) || x >= 80;
type Tile = { readonly x: number; readonly y: number };
/** Where each way in crosses the old land's edge: Nekhen's east desert, the head of the Red Land's north wadi, Nubt's basin. */
const WAY_TILES: Readonly<Record<'nekhen' | 'wadi' | 'basin', readonly Tile[]>> = {
  nekhen: [{ x: 31, y: 21 }, { x: 31, y: 22 }],
  wadi: [{ x: 56, y: 24 }, { x: 57, y: 24 }],
  basin: [{ x: 79, y: 32 }, { x: 79, y: 33 }],
};
const CUTS = new Set(Object.values(WAY_TILES).flat().map((t) => `${t.x},${t.y}`));

beforeEach(() => installPaidMaps(TWO_LANDS_PARTS));
afterEach(() => installPaidMaps([]));

describe('the Delta, the land', () => {
  it('is chapter 2’s eighth part, paid, 80 × 56 laid round the 80 × 56 land: 112 × 56', () => {
    expect(DELTA).toMatchObject({ id: 'delta', n: 8, story: 'part-delta', goal: { kind: 'overthrow', target: 'avaris-town' }, parDays: 45 });
    expect(TWO_LANDS_PARTS.at(-1)).toBe(DELTA);
    expect(chapterOf(DELTA)).toMatchObject({ id: 'twoLands', paid: true, first: 5, last: 8 });
    expect(DELTA_LAND.rows.length).toBe(56);
    expect(DELTA_LAND.rows[0]!.length).toBe(80);
    expect(gridOf(DELTA)).toMatchObject({ w: 112, h: 56 });
    // Tiles of parts 5–7 keep their places (but for the three ways cut through their edge).
    RED_LAND.rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch !== '~' && !CUTS.has(`${x},${y}`)) expect(DELTA.rows[y]![x], `${x},${y}`).toBe(ch);
    }));
    // And the Delta's own lie where twoLands.ts lays them.
    DELTA_LAND.rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (inDelta(x + AT.x, y)) expect(DELTA.rows[y]![x + AT.x], `${x},${y}`).toBe(ch);
    }));
  });

  it('opens the rest of Egypt’s tree: nothing of Egypt’s is off, and the Workshop adds nothing', () => {
    expect(TWO_LANDS_UNLOCKS[3]).toEqual(['capitol', 'tiltyard2', 'tiltyard3', 'monastery3', 'seraphSpire', 'seraphSpire2', 'seraphSpire3', 'portal3']);
    expect(DELTA.off).toEqual(lockedIn(TWO_LANDS_UNLOCKS, 4));
    expect(DELTA.off.filter((b) => !BUILDINGS[b].only)).toEqual([]);
    expect(BUILDING_IDS.filter((b) => !BUILDINGS[b].only && !openIn(TWO_LANDS_UNLOCKS, 4).has(b))).toEqual([]);
    expect(soldOn(8)).toEqual(soldOn(7));
    // The Red Land kept its own: the Benben Stone was still closed there.
    expect(RED_LAND.off).toContain('seraphSpire');
  });

  it('every object stands on open ground, outside every town, and nothing stands on anything else', () => {
    const g = gridOf(DELTA);
    const towns = [DELTA.town, ...(DELTA.towns ?? [])];
    const walls = new Set(towns.flatMap((t) => townFootprint(t.x, t.y)).map((t) => `${t.x},${t.y}`));
    const taken = new Map<string, string>();
    for (const o of DELTA_LAND.objects) {
      const p = { x: o.x + AT.x, y: o.y + AT.y };
      expect(passable(g, p.x, p.y), o.id).toBe(true);
      for (const t of [p, ...objectFootprint({ ...o, ...p })]) {
        const k = `${t.x},${t.y}`;
        expect(walls.has(k), `${o.id} in a town`).toBe(false);
        expect(taken.get(k), `${o.id} on ${taken.get(k)}`).toBeUndefined();
        taken.set(k, o.id);
      }
    }
    const ids = DELTA.objects.map((o) => o.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('every site, mine and town gate can be reached from where Neferet starts, fighting what is in the way', () => {
    const reach = walkable(DELTA, DELTA.hero.x, DELTA.hero.y);
    for (const o of DELTA.objects.filter((p) => inDelta(p.x, p.y))) expect(besideOne(reach, o.x, o.y), o.id).toBe(true);
    for (const t of DELTA.towns!.filter((p) => inDelta(p.x, p.y))) expect(reach.has(`${t.x},${t.y + 1}`), t.name).toBe(true);
  });

  it('has three ways in, each enough alone: from Nekhen past the White Walls, up the north wadi, out of Nubt’s basin', () => {
    const avaris = DELTA.towns!.find((t) => t.id === 'avaris-town')!;
    for (const [way, tiles] of Object.entries(WAY_TILES)) {
      const others = Object.entries(WAY_TILES).filter(([w]) => w !== way).flatMap(([, t]) => t);
      const reach = walkable(DELTA, DELTA.hero.x, DELTA.hero.y, others);
      for (const t of tiles) expect(reach.has(`${t.x},${t.y}`), way).toBe(true);
      expect(reach.has(`${avaris.x},${avaris.y + 1}`), `${way} to Avaris`).toBe(true);
    }
    // All three closed, the Delta can't be reached.
    const shut = walkable(DELTA, DELTA.hero.x, DELTA.hero.y, Object.values(WAY_TILES).flat());
    expect([...shut].some((k) => inDelta(...(k.split(',').map(Number) as [number, number])))).toBe(false);
  });

  it('holds Iunu on its rise: two ways up, and none other', () => {
    const house = DELTA.objects.find((o) => o.id === 'benben-house')!;
    const ways = [[38, 17], [38, 18], [39, 17], [39, 18], [40, 17], [40, 18], [50, 10], [51, 10], [51, 11], [52, 11], [52, 12], [51, 12], [53, 11], [52, 10]].map(([x, y]) => ({ x: x! + AT.x, y: y! }));
    expect(besideOne(walkable(DELTA, DELTA.hero.x, DELTA.hero.y, ways), house.x, house.y)).toBe(false);
    for (const way of [ways.slice(0, 6), ways.slice(6)]) expect(besideOne(walkable(DELTA, DELTA.hero.x, DELTA.hero.y, way), house.x, house.y)).toBe(true);
  });

  it('holds two neutral towns to race for and Apepi’s two, in his look; Ammit guards the House of the Benben and its Legendary prize', () => {
    const towns = new Map(DELTA.towns!.map((t) => [t.id, t]));
    for (const id of ['men-nefer-town', 'per-wadjet-town']) expect(towns.get(id), id).toMatchObject({ race: true, faction: 'kemet' });
    for (const id of ['men-nefer-town', 'per-wadjet-town']) expect(towns.get(id)!.owner, id).toBeUndefined();
    for (const id of ['men-nefer-town', 'per-wadjet-town']) expect(towns.get(id)!.built).toEqual(expect.arrayContaining(['fort', 'townHall']));
    for (const id of ['avaris-town', 'per-bastet-town']) expect(towns.get(id), id).toMatchObject({ owner: 'rival', look: 'avaris', faction: 'kemet' });
    // Avaris as Lykosoura: halls, Fort, Citadel, Tavern, Marketplace, House of Life 1, Workshop, lines 1–5 and the first upgrades of 1–4.
    expect(towns.get('avaris-town')!.built).toEqual(expect.arrayContaining(['citadel', 'marketplace', 'mageGuild1', 'blacksmith', 'monastery', 'barracks2']));
    const house = DELTA.objects.find((o) => o.id === 'benben-house')!;
    expect(house).toMatchObject({ kind: 'dwelling', look: 'benbenHouse', creature: 'bennu', growth: 1 });
    const guard = DELTA.objects.find((o) => o.id === 'benben-ammit')!;
    expect(guard).toMatchObject({ creature: 'ammit', drop: 'crookAndFlail' });
    expect(Math.max(Math.abs(guard.x - house.x), Math.abs(guard.y - house.y))).toBe(1);
    const kinds = (k: string) => DELTA_LAND.objects.filter((o) => o.kind === k);
    expect(kinds('learningStone')).toHaveLength(2);
    expect(kinds('dwelling').map((o) => [o.look, o.creature, o.growth]).sort()).toEqual([['benbenHouse', 'bennu', 1], ['crocodileMarsh', 'crocodile', 4], ['lionRocks', 'lion', 3]]);
    expect(kinds('bank').map((o) => o.look)).toEqual(['mastaba']);
    expect(new Set(kinds('mine').map((o) => o.resource))).toEqual(new Set(['gold', 'wood', 'ore', 'mercury', 'sulfur', 'crystal', 'gems']));
    expect(kinds('mine').filter((o) => o.owner === 'rival')).toHaveLength(2);
    for (const k of ['mercCamp', 'watchtower', 'stables', 'standingStone', 'shrine', 'chest', 'pile', 'campfire']) expect(kinds(k).length, k).toBeGreaterThan(0);
  });

  it('has Apepi as a lord: his own mind, at Avaris’s gate; no recruits of its own, and never Apepi in our Taverns', () => {
    expect(DELTA.rival!.mind).toBe('lord');
    const avaris = DELTA.towns!.find((t) => t.id === 'avaris-town')!;
    expect(DELTA.rival!.hero).toMatchObject({ id: 'apepi', name: 'Apepi', heroClass: 'knight', faction: 'kemet', x: avaris.x, y: avaris.y });
    expect(DELTA.recruits).toBeUndefined();
    expect([...storyVillains(DELTA)].sort()).toEqual(['apepi', 'sethi']);
  });
});

/** The Red Land just won: Nubt and Gebtu ours, Sethi beaten. */
function redWon(): Adventure {
  const adv = startAdventure(RED_LAND);
  return {
    ...adv, status: 'won', prompts: [], day: 40,
    towns: adv.towns.map((t) => ({ ...t, owner: 'player' as const })),
    hero: { ...adv.hero, x: 57, y: 27 },
    rival: { ...adv.rival!, hero: null },
  };
}

describe('riding on into the Delta', () => {
  it('follows the Red Land, which no longer ends the chapter: its win tells a part’s end', () => {
    expect(nextMap(RED_LAND)).toBe(DELTA);
    expect(RED_LAND.won).toBe('redLand-won');
    expect(nextMap(DELTA)).toBeUndefined();
    expect(chapterById('twoLands').ending).toBe('twoLands-won');
    expect(DELTA.won).toBeUndefined();
  });

  it('brings Apepi in fresh, with no head start, Pharaoh’s grant, and only the start of each way seen', () => {
    const won = redWon();
    const adv = rideOn(won, RED_LAND, DELTA);
    expect(adv.mapId).toBe('delta');
    expect(adv.rival?.hero).toMatchObject({ id: 'apepi', x: 98, y: 9 });
    expect(adv.rival!.hero!.army.filter(Boolean).map((s) => s!.count)).toEqual(DELTA.rival!.hero.army.map((s) => s.count));
    expect(adv.towns.find((t) => t.id === 'avaris-town')!.built).toEqual(DELTA.towns!.find((t) => t.id === 'avaris-town')!.built);
    expect(adv.purse.gold).toBe(won.purse.gold + DELTA.grant!.gold!);
    for (const w of DELTA.opening!.way) expect(isSeen(adv, DELTA, w.x, w.y)).toBe(true);
    // Not the land between the ways, nor the towns.
    expect(isSeen(adv, DELTA, 70, 14)).toBe(false);
    for (const id of ['men-nefer-town', 'per-wadjet-town', 'avaris-town', 'per-bastet-town']) {
      const t = adv.towns.find((x) => x.id === id)!;
      expect(isSeen(adv, DELTA, t.x, t.y), id).toBe(false);
    }
    // The towns won before stay ours.
    for (const id of ['nekhen-town', 'abu-town', 'gebtu-town', 'nubt-town']) expect(adv.towns.find((t) => t.id === id)!.owner, id).toBe('player');
    expect(adv.prompts.at(-1)).toMatchObject({ kind: 'message', line: 'part-delta' });
  });

  it('played fresh, starts at the head of the north wadi with every town of the chapter ours', () => {
    const adv = startAdventure(DELTA);
    expect(adv.hero).toMatchObject({ id: 'neferet', x: 57, y: 26 });
    for (const id of ['nekhen-town', 'abu-town', 'gebtu-town', 'nubt-town']) expect(adv.towns.find((t) => t.id === id)?.owner, id).toBe('player');
    expect(adv.towns.find((t) => t.id === 'gebtu-town')!.owner).toBe('player');
    expect(adv.rival?.hero?.id).toBe('apepi');
    // The old land's mines, Sethi's among them, fly our banner, as a rider leaves them (twoLands.ts `flagged`).
    for (const id of ['nubt-gold-mine', 'nubt-ore-pit', 'red-gold-mine']) expect(adv.objects.find((o) => o.id === id)!.owner, id).toBe('player');
    expect(adv.objects.find((o) => o.id === 'avaris-sawmill')!.owner).toBe('rival');
  });

  it('takes up an old save: a Red Land left won rides on into the Delta, and its recorded win opens it (keyed by id, not number)', () => {
    const m = new Map<string, string>();
    const store = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    const won = redWon();
    saveAdventure(store, { current: won, dayStart: won }, 'twoLands');
    const back = loadAdventure(store, mapById, 'twoLands')!.current;
    expect(back.status).toBe('won');
    const next = nextMap(mapById(back.mapId)!)!;
    expect(next.id).toBe('delta');
    expect(rideOn(back, RED_LAND, next).mapId).toBe('delta');
    expect(isOpen(DELTA, recordWin(EMPTY_PROGRESS, 'red-land', 1, 40).maps)).toBe(true);
    expect(isOpen(DELTA, {})).toBe(false);
  });

  it('turns the beaten lord’s holdings neutral: Sethi’s mines, and a town he still held (with its garrison)', () => {
    const won = redWon();
    const nubt = won.towns.find((t) => t.id === 'nubt-town')!;
    const his = { ...won, towns: won.towns.map((t) => (t.id === nubt.id ? { ...t, owner: 'rival' as const } : t)) };
    const adv = rideOn(his, RED_LAND, DELTA);
    for (const id of ['nubt-gold-mine', 'nubt-ore-pit']) expect(adv.objects.find((o) => o.id === id)!.owner, id).toBe('neutral');
    expect(adv.towns.find((t) => t.id === 'nubt-town')).toMatchObject({ owner: 'neutral', garrison: nubt.garrison });
    expect(adv.towns.filter((t) => t.owner === 'rival').map((t) => t.id).sort()).toEqual(['avaris-town', 'per-bastet-town']);
  });

  it('ends the chapter: its win tells the Two Lands one, and "Chapter 2 complete"', () => {
    const adv = { ...startAdventure(DELTA), prompts: [] };
    expect(upcoming(adv, 2)).toEqual(['twoLands-won']);
    const end = chapterEnd(chapterById('twoLands'), { ...adv, status: 'won' }, false, () => true);
    expect(end.title).toBe('Chapter 2 complete');
    expect(end.body[0]).toMatch(/Apepi falls.*Two Lands are one/);
    expect(NEKHEN.n).toBe(5);
  });
});
