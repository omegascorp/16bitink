import { describe, expect, it } from 'vitest';
import { chapterById, chapterOf, installPaidMaps, nextMap, partNumber, partsOf } from '../src/level/maps';
import { HLADIR, LONG_WINTER_PARTS, UPPSALA } from '../src/level/longWinter';
import { HEID_RECRUIT, UPPSALA_LAND } from '../src/level/uppsala';
import { LONG_WINTER_UNLOCKS, lockedIn } from '../src/level/unlocks';
import { parseMaps } from '../src/level/validate';
import { checkGoal, gridOf, groundAt, liveObjects, lyingItem, planPath, startAdventure, stepHero, townById, type Adventure } from '../src/logic/adventure';
import { rideOn } from '../src/logic/chapter';
import { factionOf } from '../src/logic/factions';
import { cantHireHero, hireHero } from '../src/logic/heroes';
import { ITEMS } from '../src/logic/items';
import { inGrid, passable, tileIndex } from '../src/logic/map';
import { townFootprint } from '../src/logic/objects';
import { rosterOf, specialtyOf } from '../src/logic/roster';
import { LINES } from '../src/narration/lines';
import { upcoming } from '../src/narration/upcoming';

/** Hladir won, as a rider leaves it, and the chapter ridden on into Uppsala. */
const riddenOn = (): Adventure => rideOn({ ...startAdventure(HLADIR), status: 'won', prompts: [] }, HLADIR, UPPSALA);

/** The tiles a hero can walk to from (x, y), objects aside. */
function reach(def: typeof UPPSALA, x: number, y: number): Set<number> {
  const g = gridOf(def);
  const seen = new Set([tileIndex(g, x, y)]);
  const todo = [{ x, y }];
  while (todo.length) {
    const p = todo.pop()!;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const q = { x: p.x + dx, y: p.y + dy };
        if (!inGrid(g, q.x, q.y) || !passable(g, q.x, q.y) || seen.has(tileIndex(g, q.x, q.y))) continue;
        seen.add(tileIndex(g, q.x, q.y));
        todo.push(q);
      }
    }
  }
  return seen;
}

/** Chapter 3, part 2 (docs/inkheroes-design.md, "Part 2 as built: Uppsala (Nov 11)"). */
describe('Uppsala, chapter 3’s second part', () => {
  it('is the Long Winter’s part 2, named on its card, opening the Hof’s two floors, the Boar Pen and the rest', () => {
    expect(LONG_WINTER_PARTS.map((m) => m.id)).toEqual(['hladir', 'uppsala', 'bloodaxe', 'halogaland']);
    expect(chapterOf(UPPSALA)?.id).toBe('longWinter');
    expect(partNumber(UPPSALA)).toBe(2);
    expect(chapterById('longWinter').parts.slice(0, 2)).toEqual([{ id: 'hladir', n: 9, name: 'Hladir' }, { id: 'uppsala', n: 10, name: 'Uppsala' }]);
    expect(UPPSALA.off).toEqual(lockedIn(LONG_WINTER_UNLOCKS, 2));
    for (const b of ['mageGuild1', 'mageGuild2', 'monastery', 'marketplace', 'storehouse', 'stables', 'portal'] as const) expect(UPPSALA.off, b).not.toContain(b);
    // The Shipwright and the Shield Hall wait for part 3.
    expect(UPPSALA.off).toContain('blacksmith');
    expect(UPPSALA.off).toContain('tiltyard');
    expect([UPPSALA.story, UPPSALA.won]).toEqual(['part-uppsala', 'uppsala-won']);
    expect(UPPSALA.goal).toMatchObject({ kind: 'defeat', target: 'aun' });
    installPaidMaps(LONG_WINTER_PARTS);
    expect(partsOf(chapterById('longWinter')).map((m) => m.id).slice(0, 2)).toEqual(['hladir', 'uppsala']);
    expect(nextMap(HLADIR)?.id).toBe('uppsala');
    installPaidMaps([]);
  });

  it('is served as the paid maps are, and every name in it is plain letters', () => {
    expect(parseMaps(JSON.parse(JSON.stringify([UPPSALA])))).toEqual(JSON.parse(JSON.stringify([UPPSALA])));
    const names = [UPPSALA.name, ...(UPPSALA.towns ?? []).map((t) => t.name), ...UPPSALA.objects.flatMap((o) => (o.name ? [o.name] : [])), HEID_RECRUIT.name];
    for (const n of names) expect(n, n).toMatch(/^[A-Za-z ]+$/);
  });

  it('lies south of Hladir over the fells, 32 × 54, with Hladir’s own tiles kept and the pass opened', () => {
    const g = gridOf(UPPSALA);
    expect([g.w, g.h]).toEqual([32, 54]);
    const changed = HLADIR.rows.flatMap((row, y) => [...row].flatMap((ch, x) => (UPPSALA.rows[y]![x] === ch ? [] : [`${x},${y}`])));
    expect(changed).toEqual(['19,23', '20,23']);
    expect(UPPSALA.rows.slice(24)).toEqual(UPPSALA_LAND.rows);
    // Hervor rides from Hladir's gate over the pass to Uppsala's.
    const a = riddenOn();
    const uppsala = townById(a, 'uppsala-town')!;
    expect(planPath({ ...a, hero: { ...a.hero, x: HLADIR.town.x, y: HLADIR.town.y + 1, mp: 1e9 } }, UPPSALA, uppsala.x, uppsala.y)).not.toBeNull();
    const count = (t: string): number => g.terrain.slice(24 * g.w).filter((x) => x === t).length;
    // Snow and the frozen Fyris: no grass, sand or open water.
    expect(count('snow')).toBeGreaterThan(500);
    expect(count('ice')).toBeGreaterThan(40);
    expect(count('grass') + count('sand') + count('water')).toBe(0);
    for (const p of UPPSALA.opening!.way) expect(passable(g, p.x, p.y), `${p.x},${p.y}`).toBe(true);
    // A fight on the road through the snow is a snow battle (skiers glide), not one on bare dirt.
    const road = UPPSALA.objects.find((o) => o.id === 'pass-wolves')!;
    expect(UPPSALA.rows[road.y]![road.x]).toBe('=');
    expect(groundAt(UPPSALA, road.x, road.y)).toBe('snow');
  });

  it('places every object on open ground it can be walked to, clear of the towns, with the north’s monsters', () => {
    const g = gridOf(UPPSALA);
    const towns = [UPPSALA.town, ...(UPPSALA.towns ?? [])];
    const under = new Set(towns.flatMap((t) => townFootprint(t.x, t.y).map((p) => tileIndex(g, p.x, p.y))));
    const walked = reach(UPPSALA, UPPSALA.hero.x, UPPSALA.hero.y);
    const ids = new Set<string>();
    for (const o of UPPSALA.objects) {
      expect(passable(g, o.x, o.y), o.id).toBe(true);
      expect(under.has(tileIndex(g, o.x, o.y)), o.id).toBe(false);
      expect(ids.has(o.id), o.id).toBe(false);
      ids.add(o.id);
      if (o.y < 24) continue;
      expect(walked.has(tileIndex(g, o.x, o.y)), o.id).toBe(true);
      if (o.kind === 'monster') expect(['wolfWinter', 'draugr', 'troll', 'barrowKing'], o.id).toContain(o.creature);
      if (o.kind === 'lair') expect(passable(g, o.x, o.y + 1), `${o.id}'s door`).toBe(true);
    }
    for (const t of towns) expect(walked.has(tileIndex(g, t.x, t.y)), t.id).toBe(true);
    // The king's three mounds send out their dead week after week.
    expect(UPPSALA.objects.filter((o) => o.kind === 'lair' && o.creature === 'draugr' && o.look === 'tomb')).toHaveLength(3);
  });

  it('keeps the Novice’s Rune Staff on the altar behind the Barrow Kings at the temple’s only gate, and Aun the Old beyond it', () => {
    const staff = UPPSALA.objects.find((o) => o.kind === 'spellbook')!;
    expect(staff).toMatchObject({ item: 'noviceRuneStaff', spell: 'tiwaz' });
    expect(ITEMS.noviceRuneStaff.slot).toBe('book');
    const guard = UPPSALA.objects.find((o) => o.id === 'altar-kings')!;
    expect(guard).toMatchObject({ kind: 'monster', creature: 'barrowKing' });
    const aun = UPPSALA.objects.find((o) => o.id === 'aun')!;
    expect(aun).toMatchObject({ kind: 'monster', creature: 'barrowKing', name: 'Aun the Old', line: 'aun', brood: { creature: 'draugr' } });
    // Fought on the yard's snow: skiers glide there.
    expect(groundAt(UPPSALA, aun.x - 1, aun.y)).toBe('snow');
    const a = riddenOn();
    const before = { ...a, hero: { ...a.hero, x: 19, y: 30, mp: 1e9 } };
    // With the gate held, neither the altar nor Aun can be reached without beating its kings.
    expect(planPath(before, UPPSALA, staff.x, staff.y)).toBeNull();
    expect(planPath(before, UPPSALA, aun.x, aun.y)).toBeNull();
    const open = { ...before, objects: before.objects.map((o) => (o.id === guard.id ? { ...o, gone: true } : o)) };
    expect(planPath(open, UPPSALA, staff.x, staff.y)).not.toBeNull();
    expect(planPath(open, UPPSALA, aun.x, aun.y)).not.toBeNull();
  });

  it('stands the temple in its yard: its 3 × 3 tiles blocked, the row before it open, the altar at its door and the gate in front', () => {
    const temple = UPPSALA_LAND.landmarks!.find((l) => l.id === 'temple')!;
    const g = gridOf(UPPSALA_LAND);
    for (let dy = -2; dy <= 0; dy++) for (let dx = -1; dx <= 1; dx++) expect(passable(g, temple.x + dx, temple.y + dy), `${temple.x + dx},${temple.y + dy}`).toBe(false);
    for (let dx = -1; dx <= 1; dx++) expect(passable(g, temple.x + dx, temple.y + 1), `front ${temple.x + dx}`).toBe(true);
    const at = (id: string): { x: number; y: number } => UPPSALA_LAND.objects.find((o) => o.id === id)!;
    const near = (o: { x: number; y: number }, n: number): boolean => Math.abs(o.x - temple.x) <= n && o.y - temple.y >= 0 && o.y - temple.y <= n;
    // The altar and Aun just before it; the gate's kings further out, between it and the road; nothing stands on it.
    expect(near(at('altar-staff'), 2)).toBe(true);
    expect(near(at('aun'), 3)).toBe(true);
    expect(at('altar-kings').x).toBeLessThan(at('altar-staff').x);
    for (const o of UPPSALA_LAND.objects) expect(Math.abs(o.x - temple.x) <= 1 && o.y >= temple.y - 2 && o.y <= temple.y, o.id).toBe(false);
  });

  it('wins when Aun is beaten, his drop taken or left lying for a full bag', () => {
    const a = riddenOn();
    const aun = a.objects.find((o) => o.id === 'aun')!;
    expect(checkGoal(a, UPPSALA).status).toBe('playing');
    expect(checkGoal({ ...a, objects: a.objects.map((o) => (o.id === 'aun' ? { ...o, gone: true } : o)) }, UPPSALA).status).toBe('won');
    expect(checkGoal({ ...a, objects: a.objects.map((o) => (o.id === 'aun' ? lyingItem(aun, 'barkShoes') : o)) }, UPPSALA).status).toBe('won');
  });

  it('drops the gray Volva set on the way, for Heid', () => {
    const drops = UPPSALA_LAND.objects.flatMap((o) => (o.drop ? [o.drop] : []));
    const volva = Object.entries(ITEMS).filter(([, d]) => 'set' in d && d.set === 'volva').map(([id]) => id);
    expect(new Set(drops)).toEqual(new Set(volva));
  });
});

describe('Uppsala’s ring fort and Heid', () => {
  it('waits for Hervor as an ally, and opening its gates tells Heid’s news: someone is singing the winter', () => {
    const a = riddenOn();
    const town = townById(a, 'uppsala-town')!;
    expect(town).toMatchObject({ owner: 'neutral', ally: true });
    expect(factionOf(town)).toBe('norse');
    expect(town.built).toContain('mageGuild1');
    expect(upcoming(a, 3)).toEqual(['part-uppsala', 'uppsala-joins', 'aun']);
    const at = { ...a, prompts: [], hero: { ...a.hero, x: town.x, y: town.y + 1, mp: 2000 } };
    const r = stepHero(at, UPPSALA, { x: town.x, y: town.y, cost: 100, straight: 100, day: 0 });
    expect(townById(r.adv, 'uppsala-town')?.owner).toBe('player');
    expect(r.adv.prompts).toEqual([expect.objectContaining({ kind: 'message', line: 'uppsala-joins', title: LINES['uppsala-joins'].title })]);
    expect(LINES['uppsala-joins'].script).toMatch(/singing/);
    expect(upcoming({ ...r.adv, prompts: [] }, 2)).toEqual(['aun', 'uppsala-won']);
  });

  it('hires Heid at Uppsala’s Tavern, once, for 2500 gold, with her Thurisaz specialty from the roster', () => {
    expect(UPPSALA.recruits).toEqual([HEID_RECRUIT]);
    expect(HEID_RECRUIT).toMatchObject({ id: 'heid', heroClass: 'cleric', faction: 'norse', spells: ['thurisaz'], gear: { book: 'noviceRuneStaff' } });
    expect(HEID_RECRUIT.specialty).toBeUndefined();
    expect(specialtyOf(HEID_RECRUIT)).toEqual({ kind: 'spell', spell: 'thurisaz' });
    expect(rosterOf('norse').map((h) => h.id)).toContain('heid');
    const a = riddenOn();
    const town = townById(a, 'uppsala-town')!;
    const joined = stepHero({ ...a, prompts: [], hero: { ...a.hero, x: town.x, y: town.y + 1, mp: 2000 } }, UPPSALA, { x: town.x, y: town.y, cost: 100, straight: 100, day: 0 }).adv;
    // Hervor rides out of the gate first, so it is free.
    const out = { ...joined, prompts: [], hero: { ...joined.hero, x: town.x, y: town.y + 2 } };
    expect(cantHireHero(out, UPPSALA, townById(out, 'uppsala-town')!)).toBeNull();
    const hired = hireHero(out, UPPSALA, 'uppsala-town')!;
    expect(hired.purse.gold).toBe(out.purse.gold - 2500);
    expect(hired.hero).toMatchObject({ id: 'heid', name: 'Heid', x: town.x, y: town.y });
    expect(hireHero({ ...hired, hero: { ...hired.hero, x: town.x, y: town.y + 2 } }, UPPSALA, 'uppsala-town')).toBeNull();
  });

  it('tells of Aun the first time Hervor sees him, and the part’s win leads on to Eirik at Avaldsnes', () => {
    const a = riddenOn();
    expect(liveObjects(a).filter((o) => o.line).map((o) => o.id)).toEqual(['hrimgrimnir', 'aun']);
    expect(LINES['uppsala-won'].script).toMatch(/Eirik Bloodaxe/);
    expect(LINES['uppsala-won'].script).toMatch(/Avaldsnes/);
    expect(LINES['hladir-won'].script).toMatch(/Uppsala/);
  });

  it('can be played fresh: Hervor at the top of the pass, Hladir hers, Uppsala waiting', () => {
    const a = startAdventure(UPPSALA);
    expect([a.hero.x, a.hero.y]).toEqual([19, 25]);
    expect(a.hero.gear?.book).toBeUndefined();
    expect(a.towns.map((t) => [t.id, t.owner])).toEqual([['hladir-town', 'player'], ['uppsala-town', 'neutral']]);
  });
});
