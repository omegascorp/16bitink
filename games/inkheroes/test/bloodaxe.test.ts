import { describe, expect, it } from 'vitest';
import { chapterById, chapterOf, installPaidMaps, nextMap, partNumber, partsOf } from '../src/level/maps';
import { BLOODAXE, LONG_WINTER_PARTS, UPPSALA } from '../src/level/longWinter';
import { BLOODAXE_LAND } from '../src/level/bloodaxe';
import { LONG_WINTER_UNLOCKS, lockedIn, soldOn } from '../src/level/unlocks';
import { parseMaps } from '../src/level/validate';
import {
  battleSides, buyMachine, cantBuyMachine, checkGoal, endDay, gridOf, liveObjects, planPath, rivalHeroes, startAdventure, stepHero, takeTown, townById, withTown, type Adventure,
} from '../src/logic/adventure';
import { armyOf } from '../src/logic/army';
import { act, createBattle } from '../src/logic/battle';
import type { BattleEvent, BattleState } from '../src/logic/battleTypes';
import { rideOn } from '../src/logic/chapter';
import { factionOf } from '../src/logic/factions';
import { tavernHeroes } from '../src/logic/heroes';
import { ITEMS, withGear } from '../src/logic/items';
import { kitted } from '../src/logic/lord/kit';
import { inGrid, passable, tileIndex } from '../src/logic/map';
import { townFootprint } from '../src/logic/objects';
import { armyStrength, rivalTurn } from '../src/logic/rival';
import { specialtyOf } from '../src/logic/roster';
import { parseAdventure } from '../src/logic/save';
import { LINES } from '../src/narration/lines';
import { upcoming } from '../src/narration/upcoming';

const def = BLOODAXE;
const KAUPANG = 'kaupang-town';
const AVALDSNES = 'avaldsnes-town';
/** The Bloodaxe's tiles in the chapter's own. */
const ax = (x: number, y: number): { x: number; y: number } => ({ x, y: y + 54 });

/** Uppsala won, as a rider leaves it, and the chapter ridden on into the Bloodaxe. */
const riddenOn = (): Adventure => {
  const fresh = { ...startAdventure(UPPSALA), prompts: [] };
  const town = townById(fresh, 'uppsala-town')!;
  const won = withTown(fresh, { ...town, owner: 'player', ally: undefined });
  return { ...opening(), prompts: [] };
  function opening(): Adventure {
    return rideOn({ ...won, day: 30, begun: 12, status: 'won', hero: { ...won.hero, x: town.x, y: town.y + 1 } }, UPPSALA, BLOODAXE);
  }
};
/** The ride-on with its cards still waiting. */
const openedCards = (): Adventure => {
  const fresh = { ...startAdventure(UPPSALA), prompts: [] };
  const town = townById(fresh, 'uppsala-town')!;
  const won = withTown(fresh, { ...town, owner: 'player', ally: undefined });
  return rideOn({ ...won, day: 30, begun: 12, status: 'won', hero: { ...won.hero, x: town.x, y: town.y + 1 } }, UPPSALA, BLOODAXE);
};

/** Plays `n` nights: the day ends, then Eirik rides; stops at a fight he starts. */
function nights(adv: Adventure, n: number): Adventure {
  let a = adv;
  for (let i = 0; i < n; i++) {
    const r = rivalTurn(endDay(a, def), def);
    a = r.adv;
    if (r.report.fight) return a;
  }
  return a;
}

/** The tiles a hero can walk to from (x, y), objects aside, with `shut` tiles closed. */
function reach(x: number, y: number, shut: readonly { x: number; y: number }[] = []): Set<number> {
  const g = gridOf(def);
  const closed = new Set(shut.map((p) => tileIndex(g, p.x, p.y)));
  const seen = new Set([tileIndex(g, x, y)]);
  const todo = [{ x, y }];
  while (todo.length) {
    const p = todo.pop()!;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const q = { x: p.x + dx, y: p.y + dy };
        if (!inGrid(g, q.x, q.y) || !passable(g, q.x, q.y) || seen.has(tileIndex(g, q.x, q.y)) || closed.has(tileIndex(g, q.x, q.y))) continue;
        seen.add(tileIndex(g, q.x, q.y));
        todo.push(q);
      }
    }
  }
  return seen;
}

/** Chapter 3, part 3 (docs/inkheroes-design.md, "Part 3 as built: The Bloodaxe (Nov 11)"). */
describe('the Bloodaxe, chapter 3’s third part', () => {
  it('is the Long Winter’s part 3, named on its card, opening the Shipwright, the Castle, the Shield Hall and the rest', () => {
    expect(LONG_WINTER_PARTS.map((m) => m.id)).toEqual(['hladir', 'uppsala', 'bloodaxe', 'halogaland']);
    expect(chapterOf(def)?.id).toBe('longWinter');
    expect(partNumber(def)).toBe(3);
    expect(chapterById('longWinter').parts[2]).toEqual({ id: 'bloodaxe', n: 11, name: 'The Bloodaxe' });
    expect(def.off).toEqual(lockedIn(LONG_WINTER_UNLOCKS, 3));
    for (const b of LONG_WINTER_UNLOCKS[2]!) expect(def.off, b).not.toContain(b);
    expect(def.off).toContain('seraphSpire');
    expect([def.story, def.won]).toEqual(['part-bloodaxe', 'bloodaxe-won']);
    expect(def.goal).toMatchObject({ kind: 'overthrow', target: AVALDSNES });
    expect(def.parDays).toBe(35);
    // No recruits of its own: from part 3 on the Taverns offer two of the roster.
    expect(def.recruits).toBeUndefined();
    installPaidMaps(LONG_WINTER_PARTS);
    expect(partsOf(chapterById('longWinter')).map((m) => m.id)).toEqual(['hladir', 'uppsala', 'bloodaxe', 'halogaland']);
    expect(nextMap(UPPSALA)?.id).toBe('bloodaxe');
    installPaidMaps([]);
  });

  it('is served as the paid maps are, and every name in it is plain letters', () => {
    expect(parseMaps(JSON.parse(JSON.stringify([def])))).toEqual(JSON.parse(JSON.stringify([def])));
    const names = [def.name, ...(def.towns ?? []).map((t) => t.name), def.rival!.hero.name];
    for (const n of names) expect(n, n).toMatch(/^[A-Za-z ]+$/);
  });

  it('lies south of Uppsala over its fells, 40 × 86, the parts before kept and the pass opened', () => {
    const g = gridOf(def);
    expect([g.w, g.h]).toEqual([40, 86]);
    const changed = UPPSALA.rows.flatMap((row, y) => [...row].flatMap((ch, x) => (def.rows[y]![x] === ch ? [] : [`${x},${y}`])));
    expect(changed).toEqual(['18,52', '19,52', '18,53', '19,53']);
    expect(def.rows.slice(54)).toEqual(BLOODAXE_LAND.rows);
    // East of the old land, the sea: never walked.
    expect(def.rows.slice(0, 54).every((r) => r.slice(32) === '~'.repeat(8))).toBe(true);
    const count = (t: string): number => g.terrain.slice(54 * g.w).filter((x) => x === t).length;
    expect(count('snow')).toBeGreaterThan(700);
    expect(count('ice')).toBeGreaterThan(60);
    expect(count('grass') + count('sand')).toBe(0);
    for (const p of def.opening!.way) expect(passable(g, p.x, p.y), `${p.x},${p.y}`).toBe(true);
  });

  it('places every object on open ground it can be walked to, clear of the towns, with the north’s monsters', () => {
    const g = gridOf(def);
    const towns = [def.town, ...(def.towns ?? [])];
    const under = new Set(towns.flatMap((t) => townFootprint(t.x, t.y).map((p) => tileIndex(g, p.x, p.y))));
    const walked = reach(def.hero.x, def.hero.y);
    const ids = new Set<string>();
    for (const o of def.objects) {
      expect(passable(g, o.x, o.y), o.id).toBe(true);
      expect(under.has(tileIndex(g, o.x, o.y)), o.id).toBe(false);
      expect(ids.has(o.id), o.id).toBe(false);
      ids.add(o.id);
      if (o.y < 54) continue;
      expect(walked.has(tileIndex(g, o.x, o.y)), o.id).toBe(true);
      if (o.kind === 'monster') expect(['wolfWinter', 'draugr', 'troll', 'frostGiant'], o.id).toContain(o.creature);
      if (o.kind === 'lair') expect(passable(g, o.x, o.y + 1), `${o.id}'s door`).toBe(true);
    }
    for (const t of towns) expect(walked.has(tileIndex(g, t.x, t.y)), t.id).toBe(true);
  });

  it('keeps Avaldsnes behind its ridge, with two ways in: the coast road’s gap and the east gap', () => {
    const av = townById(startAdventure(def), AVALDSNES)!;
    const g = gridOf(def);
    const gaps = [[ax(9, 17), ax(10, 17)], [ax(16, 27), ax(16, 28)]];
    const from = (shut: readonly { x: number; y: number }[]): boolean => reach(def.hero.x, def.hero.y, shut).has(tileIndex(g, av.x, av.y + 1));
    expect(from([])).toBe(true);
    expect(from(gaps[0]!)).toBe(true);
    expect(from(gaps[1]!)).toBe(true);
    expect(from(gaps.flat())).toBe(false);
  });

  it('drops the green Raider set on the way for Hervor (Eirik wears its helm and mail) and two Skald pieces for Heid', () => {
    const drops = BLOODAXE_LAND.objects.flatMap((o) => (o.drop ? [o.drop] : []));
    const kit = def.rival!.kit!.eirik!;
    const raider = Object.entries(ITEMS).filter(([, d]) => 'set' in d && d.set === 'raider').map(([id]) => id);
    expect(new Set([...drops.filter((d) => raider.includes(d)), kit.helm, kit.cuirass])).toEqual(new Set(raider));
    expect(drops.filter((d) => (ITEMS[d] as { set?: string }).set === 'skald')).toEqual(['skaldCap', 'sagaSash']);
    for (const d of drops) expect(ITEMS[d]).toMatchObject({ quality: 'green', faction: 'norse' });
  });
});

describe('Eirik Bloodaxe, the rival king', () => {
  it('is a Norse Knight lord with the Shieldmaiden specialty, riding from Avaldsnes in green Raider gear that costs his balance nothing', () => {
    const r = def.rival!;
    expect(r).toMatchObject({ mind: 'lord', holds: AVALDSNES, heroes: 1 });
    expect(r.hero).toMatchObject({ id: 'eirik', name: 'Eirik Bloodaxe', heroClass: 'knight', faction: 'norse' });
    expect(r.hero.specialty).toBeUndefined();
    expect(specialtyOf(r.hero)).toEqual({ kind: 'line', line: 'shieldmaiden' });
    const av = townById(startAdventure(def), AVALDSNES)!;
    expect([r.hero.x, r.hero.y]).toEqual([av.x, av.y]);
    expect(av).toMatchObject({ owner: 'rival', faction: 'norse' });
    expect(av.built).toEqual(expect.arrayContaining(['fort', 'citadel', 'blacksmith']));
    // Wearing the kit, his four stats are the map's.
    const hero = rivalHeroes(riddenOn())[0]!;
    expect(hero.gear).toMatchObject(r.kit!.eirik!);
    const worn = withGear(kitted(hero, undefined));
    expect([worn.attack, worn.defense, worn.power, worn.knowledge]).toEqual([r.hero.attack, r.hero.defense, r.hero.power, r.hero.knowledge]);
  });

  it('comes in as a lord when the chapter rides on: no head start, at home in Avaldsnes', () => {
    const a = openedCards();
    expect(a.mapId).toBe('bloodaxe');
    expect(armyStrength(a.rival!.hero!.army)).toBe(armyStrength(armyOf(def.rival!.hero.army)));
    expect(a.prompts.at(-1)).toMatchObject({ kind: 'message', line: 'part-bloodaxe' });
    expect(a.towns.map((t) => [t.id, t.owner])).toEqual([['hladir-town', 'player'], ['uppsala-town', 'player'], [KAUPANG, 'neutral'], [AVALDSNES, 'rival']]);
  });

  it('leaves Avaldsnes’s huscarls behind its walls when he rides (`holds`), so storming it is a siege', () => {
    const a = riddenOn();
    const before = armyStrength(townById(a, AVALDSNES)!.garrison);
    const later = nights(a, 5);
    expect(armyStrength(townById(later, AVALDSNES)!.garrison)).toBeGreaterThanOrEqual(before);
    expect(rivalHeroes(later).some((h) => h.x !== townById(later, AVALDSNES)!.x || h.y !== townById(later, AVALDSNES)!.y)).toBe(true);
  });

  it('is told the first time he is seen, once, and the flag is saved', () => {
    const a = riddenOn();
    expect(a.rival!.seen).toBeUndefined();
    expect(upcoming(a, 2)).toEqual(['eirik', 'kaupang-lost']);
    const av = townById(a, AVALDSNES)!;
    // Hervor rides up through the coast gap and looks on his fort.
    const near = { ...a, hero: { ...a.hero, x: av.x + 4, y: av.y - 3, mp: 2000 } };
    const r = stepHero(near, def, { x: av.x + 3, y: av.y - 2, cost: 100, straight: 100, day: 0 });
    expect(r.adv.prompts.filter((p) => p.kind === 'message' && p.line === 'eirik')).toHaveLength(1);
    expect(r.adv.rival!.seen).toBe(true);
    const again = stepHero({ ...r.adv, prompts: [] }, def, { x: av.x + 4, y: av.y - 3, cost: 100, straight: 100, day: 0 }).adv;
    expect(again.prompts.some((p) => p.kind === 'message' && p.line === 'eirik')).toBe(false);
    expect(parseAdventure(JSON.parse(JSON.stringify(again)), def)?.rival?.seen).toBe(true);
    expect(LINES.eirik.script).toMatch(/Eirik Bloodaxe/);
  });

  it('flees north to his queen when beaten with no town left, and the part’s win leads on to Gunnhild in Halogaland', () => {
    expect(LINES['bloodaxe-won'].script).toMatch(/Gunnhild/);
    expect(LINES['bloodaxe-won'].script).toMatch(/Halogaland/);
    expect(LINES['eirik-flees'].script).toMatch(/Avaldsnes/);
    expect(LINES['uppsala-won'].script).toMatch(/Avaldsnes/);
    const a = riddenOn();
    // Avaldsnes ours and Eirik gone from the field: won.
    const taken = a.towns.map((t) => (t.id === AVALDSNES ? { ...t, owner: 'player' as const } : t));
    expect(checkGoal({ ...a, towns: taken }, def).status).toBe('playing');
    expect(checkGoal({ ...a, towns: taken, rival: { ...a.rival!, hero: null } }, def).status).toBe('won');
  });
});

describe('the race for Kaupang', () => {
  it('stands neutral, unwalled, behind its own guards, with a Shipwright that sells the Ram; it is never handed over', () => {
    const a = riddenOn();
    const k = townById(a, KAUPANG)!;
    expect(k).toMatchObject({ owner: 'neutral', faction: 'norse' });
    expect(factionOf(k)).toBe('norse');
    expect(k.ally).toBeUndefined();
    expect(k.built).toContain('blacksmith');
    expect(k.built).not.toContain('fort');
    expect(def.towns!.find((t) => t.id === KAUPANG)).toMatchObject({ race: true });
    expect(soldOn(def.n)).toEqual(['ram']);
    expect(armyStrength(k.garrison)).toBeGreaterThan(0);
    // Taken, its Shipwright sells the Ram even to a hero whose bag is full (the machine's slot is empty).
    const ours = withTown({ ...a, purse: { ...a.purse, gold: 5000 } }, { ...k, owner: 'player', garrison: armyOf([]) });
    const full = { ...ours, hero: { ...ours.hero, x: k.x, y: k.y, bag: Array.from({ length: 12 }, () => 'ironCap' as const) } };
    expect(cantBuyMachine(full, 'ram')).toBeNull();
    expect(buyMachine(full, 'ram').hero.gear?.machine).toBe('ram');
  });

  it('is not his before the third night, and is lost to him if we dawdle: the narrator says so', () => {
    const a = riddenOn();
    expect(townById(nights(a, 2), KAUPANG)!.owner).toBe('neutral');
    const home = townById(a, 'uppsala-town')!;
    let late = { ...a, hero: { ...a.hero, x: home.x, y: home.y } };
    let told = false;
    for (let i = 0; i < 10 && townById(late, KAUPANG)!.owner !== 'rival'; i++) {
      const r = rivalTurn(endDay(late, def), def);
      told ||= r.adv.prompts.some((p) => p.kind === 'message' && p.line === 'kaupang-lost');
      late = { ...r.adv, prompts: [] };
      if (r.report.fight) break;
    }
    expect(townById(late, KAUPANG)!.owner).toBe('rival');
    expect(told).toBe(true);
  });

  it('is won by a straight ride down from the pass', () => {
    const a = riddenOn();
    const k = townById(a, KAUPANG)!;
    expect(planPath({ ...a, hero: { ...a.hero, mp: 1e9 } }, def, k.x, k.y)).not.toBeNull();
  });
});

describe('the siege of Avaldsnes', () => {
  /** Hervor at Avaldsnes's gate with `machine`, Eirik out riding. */
  function atGate(machine?: 'ram'): ReturnType<typeof battleSides> {
    const a = riddenOn();
    const av = townById(a, AVALDSNES)!;
    const away = { ...a, rival: { ...a.rival!, hero: { ...a.rival!.hero!, x: 30, y: 60 } } };
    const hero = { ...away.hero, x: av.x, y: av.y + 1, gear: { ...away.hero.gear, ...(machine ? { machine } : {}) } };
    return battleSides({ ...away, hero }, AVALDSNES, def);
  }
  const untilRound = (st: BattleState, n: number): BattleEvent[] => {
    let s = st;
    const events: BattleEvent[] = [];
    for (let i = 0; i < 400 && s.round < n && s.winner === null; i++) {
      const step = act(s, { type: 'defend' });
      s = step.state;
      events.push(...step.events);
    }
    return events;
  };

  it('is fought behind its ring fort’s walls, and a Ram brings its gate down at the end of round 3', () => {
    const s = atGate('ram');
    expect(s.siege).toBeDefined();
    const st = createBattle(s.attacker, s.defender, s.seed, s.siege).state;
    expect(st.stacks.some((x) => x.creature === 'ram')).toBe(true);
    const events = untilRound(st, 4);
    expect(events.filter((e) => e.type === 'ram')).toEqual([expect.objectContaining({ type: 'ram', parts: ['gate'] })]);
    // Without one there is no ram on the field: the gate is bashed by hand.
    const bare = atGate();
    expect(createBattle(bare.attacker, bare.defender, bare.seed, bare.siege).state.stacks.some((x) => x.creature === 'ram')).toBe(false);
  });

  it('is the goal: taking it leaves Eirik riding, so the part goes on until he is beaten', () => {
    const won = checkGoal(takeTown(riddenOn(), AVALDSNES), def);
    expect(townById(won, AVALDSNES)!.owner).toBe('player');
    expect(won.status).toBe('playing');
  });
});

describe('the Taverns from part 3 on', () => {
  it('offer two of the Norse roster, never Eirik or Gunnhild', () => {
    installPaidMaps(LONG_WINTER_PARTS);
    const a = riddenOn();
    for (const week of [0, 7, 14, 21]) {
      const offered = tavernHeroes({ ...a, day: a.day + week }, def, townById(a, 'hladir-town')!).map((h) => h.id);
      expect(offered).toHaveLength(2);
      expect(offered).not.toContain('eirik');
      expect(offered).not.toContain('gunnhild');
    }
    installPaidMaps([]);
  });

  it('can be played fresh: Hervor at the pass with a rune staff, Hladir and Uppsala hers, the old land’s mines flying her banner', () => {
    const a = startAdventure(def);
    expect([a.hero.x, a.hero.y]).toEqual([19, 55]);
    expect(a.hero.gear?.book).toBe('noviceRuneStaff');
    expect(a.towns.map((t) => [t.id, t.owner])).toEqual([['hladir-town', 'player'], ['uppsala-town', 'player'], [KAUPANG, 'neutral'], [AVALDSNES, 'rival']]);
    expect(liveObjects(a).filter((o) => o.kind === 'mine' && o.y < 54).every((o) => o.owner === 'player')).toBe(true);
  });
});
