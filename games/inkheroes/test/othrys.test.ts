import { describe, expect, it } from 'vitest';
import { BLACK_BANNER, OTHRYS } from '../src/level/borderMarch';
import { CHAPTERS, MAPS, chapterOf, isOpen, mapById, nextMap } from '../src/level/maps';
import { loadAdventure, recordWin, saveAdventure, EMPTY_PROGRESS } from '../src/logic/save';
import { OTHRYS_LAND } from '../src/level/othrys';
import { lockedOn, openBy, soldOn, UNLOCKS } from '../src/level/unlocks';
import type { MapDef } from '../src/level/types';
import { gridOf, isSeen, startAdventure, type Adventure } from '../src/logic/adventure';
import { BUILDING_IDS, BUILDINGS } from '../src/logic/buildings';
import { rideOn } from '../src/logic/chapter';
import { passable } from '../src/logic/map';
import { objectFootprint, townFootprint } from '../src/logic/objects';
import { BUILD_PLAN } from '../src/logic/town';

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

/** Where each way in crosses the old land's east edge (x 71). */
type Tile = { readonly x: number; readonly y: number };
const WAY_TILES: Readonly<Record<'coast' | 'ford' | 'pass', readonly Tile[]>> = { coast: [{ x: 71, y: 7 }], ford: [{ x: 71, y: 40 }, { x: 71, y: 41 }], pass: [{ x: 71, y: 64 }, { x: 71, y: 65 }] };
const OTHRYS_X = 72;

describe('Othrys, the land', () => {
  it('is chapter 1’s fourth part, free, about 56 × 68 laid east of the 72 × 68 land', () => {
    expect(OTHRYS).toMatchObject({ id: 'othrys', n: 4, story: 'part-othrys', goal: { kind: 'overthrow', target: 'lykosoura-town' }, parDays: 45 });
    expect(MAPS.at(-1)).toBe(OTHRYS);
    expect(chapterOf(OTHRYS)).toMatchObject({ id: 'borderMarch', paid: false, first: 1, last: 4 });
    expect(OTHRYS_LAND.rows.length).toBe(68);
    expect(OTHRYS_LAND.rows[0]!.length).toBe(56);
    expect(gridOf(OTHRYS)).toMatchObject({ w: 128, h: 68 });
    // Tiles of parts 1–3 keep their places.
    BLACK_BANNER.rows.forEach((row, y) => expect(OTHRYS.rows[y]!.slice(0, 72)).toBe(row));
  });

  it('opens the rest of the Greek tree: nothing Greek is off, and the Blacksmith adds nothing', () => {
    expect(UNLOCKS[3]).toEqual(['capitol', 'tiltyard2', 'tiltyard3', 'monastery3', 'seraphSpire', 'seraphSpire2', 'seraphSpire3']);
    expect(OTHRYS.off).toEqual(lockedOn(4));
    expect(OTHRYS.off.filter((b) => !BUILDINGS[b].only)).toEqual([]);
    expect(BUILDING_IDS.filter((b) => !BUILDINGS[b].only && !openBy(4).has(b))).toEqual([]);
    expect(soldOn(4)).toEqual(soldOn(3));
    // The town's suggestion walks the whole tree.
    for (const b of ['capitol', 'seraphSpire', 'seraphSpire2', 'seraphSpire3', 'tiltyard3', 'monastery3'] as const) expect(BUILD_PLAN).toContain(b);
  });

  it('every object stands on open ground, outside every town, and nothing stands on anything else', () => {
    const g = gridOf(OTHRYS);
    const towns = [OTHRYS.town, ...(OTHRYS.towns ?? [])];
    const walls = new Set(towns.flatMap((t) => townFootprint(t.x, t.y)).map((t) => `${t.x},${t.y}`));
    const taken = new Map<string, string>();
    for (const o of OTHRYS_LAND.objects) {
      const p = { x: o.x + OTHRYS_X, y: o.y };
      expect(passable(g, p.x, p.y), o.id).toBe(true);
      for (const t of [p, ...objectFootprint({ ...o, ...p })]) {
        const k = `${t.x},${t.y}`;
        expect(walls.has(k), `${o.id} in a town`).toBe(false);
        expect(taken.get(k), `${o.id} on ${taken.get(k)}`).toBeUndefined();
        taken.set(k, o.id);
      }
    }
  });

  it('every site, mine and town gate can be reached from where Rowan starts, fighting what is in the way', () => {
    const reach = walkable(OTHRYS, OTHRYS.hero.x, OTHRYS.hero.y);
    for (const o of OTHRYS.objects.filter((p) => p.x >= OTHRYS_X)) expect(besideOne(reach, o.x, o.y), o.id).toBe(true);
    for (const t of OTHRYS.towns!.filter((p) => p.x >= OTHRYS_X)) expect(reach.has(`${t.x},${t.y + 1}`), t.name).toBe(true);
  });

  it('has three ways in, each enough alone: the coast road, the ford by Korax, the pass from the Black Banner', () => {
    const iolkos = OTHRYS.towns!.find((t) => t.id === 'iolkos-town')!;
    for (const [way, tiles] of Object.entries(WAY_TILES)) {
      const others = Object.entries(WAY_TILES).filter(([w]) => w !== way).flatMap(([, t]) => t);
      const reach = walkable(OTHRYS, OTHRYS.hero.x, OTHRYS.hero.y, others);
      expect(reach.has(`${tiles[0]!.x + 1},${tiles[0]!.y}`), way).toBe(true);
      expect(reach.has(`${iolkos.x},${iolkos.y + 1}`), `${way} to Iolkos`).toBe(true);
    }
    // All three closed, Othrys can't be reached.
    const shut = walkable(OTHRYS, OTHRYS.hero.x, OTHRYS.hero.y, Object.values(WAY_TILES).flat());
    expect([...shut].some((k) => Number(k.split(',')[0]) >= OTHRYS_X)).toBe(false);
  });

  it('holds two neutral towns to race for and Lykaon’s two, in his look; the Gigantes guard the forge and its Legendary helm', () => {
    const towns = new Map(OTHRYS.towns!.map((t) => [t.id, t]));
    for (const id of ['pherai-town', 'iolkos-town']) expect(towns.get(id), id).toMatchObject({ race: true });
    for (const id of ['pherai-town', 'iolkos-town']) expect(towns.get(id)!.owner, id).toBeUndefined();
    for (const id of ['lykosoura-town', 'tegea-town']) expect(towns.get(id), id).toMatchObject({ owner: 'rival', look: 'lykosoura' });
    for (const id of ['pherai-town', 'iolkos-town']) expect(towns.get(id)!.built).toContain('fort');
    const forge = OTHRYS.objects.find((o) => o.id === 'titan-forge')!;
    expect(forge).toMatchObject({ kind: 'dwelling', look: 'titanForge', creature: 'seraph', growth: 1 });
    const guard = OTHRYS.objects.find((o) => o.id === 'forge-gigantes')!;
    expect(guard).toMatchObject({ creature: 'gigas', drop: 'kronosHelm' });
    expect(Math.max(Math.abs(guard.x - forge.x), Math.abs(guard.y - forge.y))).toBe(1);
    const kinds = (k: string) => OTHRYS_LAND.objects.filter((o) => o.kind === k);
    expect(kinds('learningStone')).toHaveLength(2);
    expect(kinds('dwelling').map((o) => o.look).sort()).toEqual(['cyclopsCave', 'griffinCliff', 'titanForge']);
    expect(kinds('bank')).toHaveLength(1);
    expect(new Set(kinds('mine').map((o) => o.resource))).toEqual(new Set(['gold', 'wood', 'ore', 'mercury', 'sulfur', 'crystal', 'gems']));
  });

  it('has Lykaon as a lord: his own mind, at Lykosoura’s gate', () => {
    expect(OTHRYS.rival!.mind).toBe('lord');
    const lykosoura = OTHRYS.towns!.find((t) => t.id === 'lykosoura-town')!;
    expect(OTHRYS.rival!.hero).toMatchObject({ id: 'lykaon', name: 'Lykaon', heroClass: 'knight', x: lykosoura.x, y: lykosoura.y });
  });
});

/** The Black Banner just won: Korax ours, Kassander beaten. */
function bannerWon(): Adventure {
  const adv = startAdventure(BLACK_BANNER);
  return {
    ...adv, status: 'won', prompts: [], day: 30,
    towns: adv.towns.map((t) => ({ ...t, owner: 'player' as const })),
    hero: { ...adv.hero, x: 63, y: 41 },
    rival: { ...adv.rival!, hero: null },
  };
}

describe('riding on into Othrys', () => {
  it('follows the Black Banner, which no longer ends the chapter: its win tells a part’s end', () => {
    expect(nextMap(BLACK_BANNER)).toBe(OTHRYS);
    expect(BLACK_BANNER.won).toBe('blackBanner-won');
    expect(nextMap(OTHRYS)).toBeUndefined();
    expect(CHAPTERS[0]!.ending).toBe('chapter-won');
    expect(OTHRYS.won).toBe('othrys-won');
  });

  it('brings Lykaon in fresh, with no head start, the Crown’s grant, and only the start of each way seen', () => {
    const won = bannerWon();
    const adv = rideOn(won, BLACK_BANNER, OTHRYS);
    expect(adv.mapId).toBe('othrys');
    expect(adv.rival?.hero).toMatchObject({ id: 'lykaon', x: 102, y: 58 });
    // No head start: his army is the map's, his town as built.
    expect(adv.rival!.hero!.army.filter(Boolean).map((s) => s!.count)).toEqual(OTHRYS.rival!.hero.army.map((s) => s.count));
    expect(adv.towns.find((t) => t.id === 'lykosoura-town')!.built).toEqual(OTHRYS.towns!.find((t) => t.id === 'lykosoura-town')!.built);
    expect(adv.purse.gold).toBe(won.purse.gold + OTHRYS.grant!.gold!);
    for (const w of OTHRYS.opening!.way) expect(isSeen(adv, OTHRYS, w.x, w.y)).toBe(true);
    // Not the land between the ways, nor the towns.
    expect(isSeen(adv, OTHRYS, 73, 24)).toBe(false);
    for (const id of ['pherai-town', 'iolkos-town', 'lykosoura-town']) {
      const t = adv.towns.find((x) => x.id === id)!;
      expect(isSeen(adv, OTHRYS, t.x, t.y), id).toBe(false);
    }
    // The towns won before stay ours.
    for (const id of ['korax-town', 'eudora-town', 'thornwood-town']) expect(adv.towns.find((t) => t.id === id)!.owner).toBe('player');
  });

  it('played fresh, starts by the ford east of Korax with every town of the chapter ours', () => {
    const adv = startAdventure(OTHRYS);
    expect(adv.hero).toMatchObject({ id: 'rowan', x: 66, y: 41 });
    for (const id of ['ashford-town', 'thornwood-town', 'eudora-town', 'korax-town']) expect(adv.towns.find((t) => t.id === id)?.owner, id).toBe('player');
    expect(adv.rival?.hero?.id).toBe('lykaon');
  });

  it('takes up an old save: a Black Banner left won rides on into Othrys, and its recorded win opens it (keyed by id, not number)', () => {
    const m = new Map<string, string>();
    const store = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    const won = bannerWon();
    saveAdventure(store, { current: won, dayStart: won });
    const back = loadAdventure(store, mapById)!.current;
    expect(back.status).toBe('won');
    const next = nextMap(mapById(back.mapId)!)!;
    expect(next.id).toBe('othrys');
    expect(rideOn(back, BLACK_BANNER, next).mapId).toBe('othrys');
    expect(isOpen(OTHRYS, recordWin(EMPTY_PROGRESS, 'blackBanner', 1, 30).maps)).toBe(true);
    expect(isOpen(OTHRYS, {})).toBe(false);
  });

  it('turns the beaten lord’s holdings neutral, ridden on or played fresh: his mines, dwellings and towns (with their garrisons)', () => {
    const won = bannerWon();
    // Kassander still flies his banner over his mines, and (say) over Korax with a garrison.
    const korax = won.towns.find((t) => t.id === 'korax-town')!;
    const his = { ...won, towns: won.towns.map((t) => (t.id === korax.id ? { ...t, owner: 'rival' as const } : t)) };
    const adv = rideOn(his, BLACK_BANNER, OTHRYS);
    for (const id of ['korax-sawmill', 'korax-ore-pit']) expect(adv.objects.find((o) => o.id === id)!.owner, id).toBe('neutral');
    const town = adv.towns.find((t) => t.id === 'korax-town')!;
    expect(town.owner).toBe('neutral');
    expect(town.garrison).toEqual(korax.garrison);
    // Lykaon's own stay his.
    expect(adv.objects.find((o) => o.id === 'lykosoura-sawmill')!.owner).toBe('rival');
    expect(adv.towns.filter((t) => t.owner === 'rival').map((t) => t.id).sort()).toEqual(['lykosoura-town', 'tegea-town']);
    const fresh = startAdventure(OTHRYS);
    for (const id of ['korax-sawmill', 'korax-ore-pit']) expect(fresh.objects.find((o) => o.id === id)!.owner, id).toBe('neutral');
    expect(fresh.objects.find((o) => o.id === 'lykosoura-ore-pit')!.owner).toBe('rival');
    // The map itself is unchanged: the parts still hold the same objects.
    expect(OTHRYS.objects.find((o) => o.id === 'korax-sawmill')!.owner).toBe('rival');
    // Played fresh, the Black Banner keeps Kassander's.
    expect(startAdventure(BLACK_BANNER).objects.find((o) => o.id === 'korax-sawmill')!.owner).toBe('rival');
  });
});
