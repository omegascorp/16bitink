import { describe, expect, it } from 'vitest';
import { INKHEROES_PAID_MAPS } from '../content/paid';
import { chapterById, CHAPTERS, installPaidMaps, nextMap } from '../src/level/maps';
import { ABU, NEKHEN, RED_LAND } from '../src/level/twoLands';
import { openIn, soldOn, TWO_LANDS_UNLOCKS } from '../src/level/unlocks';
import type { MapDef } from '../src/level/types';
import { parseMaps } from '../src/level/validate';
import {
  afterBattle, battleSides, DEFEND, endDay, gridOf, monsterArmy, startAdventure, stepHero, stormOn, terrainView, townById, withTown, type Adventure,
} from '../src/logic/adventure';
import { armyOf } from '../src/logic/army';
import { createBattle } from '../src/logic/battle';
import { rideOn } from '../src/logic/chapter';
import { creature } from '../src/logic/creatures';
import { tileIndex } from '../src/logic/map';
import { stepCost } from '../src/logic/path';
import { armyStrength, autoBattle, rivalTurn, stormSides } from '../src/logic/rival';
import { parseAdventure } from '../src/logic/save';
import { STORM_WORDS } from '../src/narration/lines';
import { upcoming } from '../src/narration/upcoming';
import { chapterEnd } from '../src/scenes/chapterEnd';

const def = RED_LAND;
const NUBT = 'nubt-town';
const GEBTU = 'gebtu-town';
/** Red Land tiles in the chapter's own. */
const red = (x: number, y: number): { x: number; y: number } => ({ x: x + 40, y: y + 24 });

/** Abu won on `day`, the hero with `army` at its gate: what part 5 leaves for part 6. */
function abuWon(day = 30, army = [{ creature: 'levy' as const, count: 60 }, { creature: 'nubian' as const, count: 30 }, { creature: 'jackal' as const, count: 16 }, { creature: 'chariot' as const, count: 8 }]): Adventure {
  const fresh = { ...startAdventure(ABU), prompts: [] };
  const abu = townById(fresh, 'abu-town')!;
  const won = withTown(fresh, { ...abu, owner: 'player', garrison: armyOf([]) });
  return { ...won, day, begun: day - 18, status: 'won', hero: { ...won.hero, x: abu.x, y: abu.y, army: armyOf(army) } };
}
const opened = (day = 30): Adventure => ({ ...rideOn(abuWon(day), ABU, RED_LAND), prompts: [] });

/** Plays `n` nights: the day ends, then Sethi rides; stops at a fight he starts. */
function nights(adv: Adventure, n: number): { adv: Adventure; notes: string[]; fight?: string } {
  let a = adv;
  const notes: string[] = [];
  for (let i = 0; i < n; i++) {
    const r = rivalTurn(endDay(a, def), def);
    a = { ...r.adv, prompts: [] };
    notes.push(...r.report.notes);
    if (r.report.fight) return { adv: a, notes, fight: r.report.fight };
  }
  return { adv: a, notes };
}

describe('Sethi, a rival lord of our own people', () => {
  it('plays Egypt: his hero and Nubt are kemet, Nubt flies his banner with its own red look, and he rides with an Earth Ramp', () => {
    const adv = startAdventure(def);
    const sethi = adv.rival!.hero!;
    expect(sethi).toMatchObject({ id: 'sethi', name: 'Sethi', faction: 'kemet', gear: { machine: 'ramp' } });
    expect(townById(adv, NUBT)).toMatchObject({ owner: 'rival', faction: 'kemet' });
    expect(def.towns!.find((t) => t.id === NUBT)?.look).toBe('nubt');
  });

  it('builds and hires through Egypt’s tree: Egypt’s units, never the Greeks’', () => {
    let adv = startAdventure(def);
    for (let i = 0; i < 8; i++) adv = rivalTurn(endDay(adv, def), def).adv;
    const nubt = townById(adv, NUBT)!;
    // A lord (since Nov 9) builds to his people's plan: a hall first, then Egypt's dwellings.
    expect(nubt.built.length).toBeGreaterThan(def.towns!.find((t) => t.id === NUBT)!.built.length);
    const units = [...(adv.rival!.hero?.army ?? []), ...(adv.rival!.others ?? []).flatMap((h) => h.army), ...nubt.garrison].filter(Boolean).map((s) => creature(s!.creature).faction);
    expect(units.length).toBeGreaterThan(0);
    expect(new Set(units)).toEqual(new Set(['kemet']));
  });

  it('buys a Brick Ramp at Nubt’s Workshop once his purse allows', () => {
    const adv = startAdventure(def);
    const rich = { ...adv, rival: { ...adv.rival!, purse: { ...adv.rival!.purse, gold: 50000 } } };
    const next = rivalTurn(endDay(rich, def), def).adv;
    expect(soldOn(def.n)).toEqual(['ramp', 'ramp2']);
    expect(next.rival!.hero?.gear?.machine).toBe('ramp2');
  });

  it('storms a walled town of ours with his ramp: the garrison fights a siege against it', () => {
    const adv = opened();
    const abu = townById(adv, 'abu-town')!;
    // Abu held by a few levies, Sethi strong at its gate.
    const held = withTown(adv, { ...abu, built: [...abu.built, 'citadel'], garrison: armyOf([{ creature: 'levy', count: 5 }]) });
    const foe = { ...held.rival!.hero!, army: armyOf([{ creature: 'chariot', count: 40 }, { creature: 'nubian', count: 60 }]) };
    const ready = { ...held, rival: { ...held.rival!, hero: foe }, hero: { ...held.hero, x: 2, y: 2 } };
    const setup = battleSides(ready, DEFEND + 'abu-town');
    expect(setup.siege).toBeDefined();
    // His Earth Ramp, or the Brick Ramp his head start bought at Nubt's Workshop.
    expect(setup.attacker.machine).toMatch(/^ramp2?$/);
    const st = autoBattle(setup.attacker, setup.defender, setup.seed, setup.siege);
    expect(st.siege?.ramps?.length, 'the AI raised its ramp').toBe(1);
    expect(st.winner).toBe(0);
  });

  it('storms a neutral walled town in an auto battle, choosing his ramp’s stretch', () => {
    const adv = startAdventure(def);
    const gebtu = townById(adv, GEBTU)!;
    const foe = { ...adv.rival!.hero!, army: armyOf([{ creature: 'chariot', count: 30 }, { creature: 'nubian', count: 50 }]) };
    const s = stormSides(adv, foe, gebtu);
    expect(s.siege).toBeDefined();
    expect(s.defender.towers?.some(Boolean)).toBe(true);
    const st = autoBattle(s.attacker, s.defender, 7, s.siege);
    expect(st.siege?.ramps?.length).toBe(1);
    expect(st.winner).toBe(0);
  });
});

describe('a rival town’s garrison (coordinator, Nov 8)', () => {
  it('grows from its recruits only to 1.5 times its strength on the map; the rest wait for him', () => {
    // Sethi a lord (Nov 9): his idle gold hires into Nubt's garrison up to the same 1.5 times (lord/towns.ts). Captains kept out
    // (`heroes: 1`): one hired at Nubt's Tavern would ride out with its garrison, as a lord's heroes do with no foe near.
    const lone: MapDef = { ...def, rival: { ...def.rival!, heroes: 1 } };
    const adv = opened(30);
    const start = armyStrength(armyOf(def.towns!.find((t) => t.id === NUBT)!.garrison));
    // Sethi far out of the way for three weeks, a deep purse.
    let a: Adventure = { ...adv, rival: { ...adv.rival!, hero: { ...adv.rival!.hero!, x: 9, y: 8, mp: 0, army: armyOf([]) }, purse: { ...adv.rival!.purse, gold: 1e6 } } };
    for (let i = 0; i < 21; i++) a = { ...rivalTurn(endDay(a, lone), lone).adv, prompts: [] };
    const nubt = townById(a, NUBT)!;
    expect(armyStrength(nubt.garrison)).toBeLessThanOrEqual(start * 1.5 + 1);
    expect(armyStrength(nubt.garrison)).toBeGreaterThan(start * 1.3);
    expect(Object.values(nubt.stock).some((n) => (n ?? 0) > 0), 'recruits wait in the dwellings').toBe(true);
  });

  it('gives Sethi a shorter head start than Kassander’s', () => {
    expect(def.rival!.headStart).toBe(0.6);
  });
});

describe('the race for Gebtu', () => {
  it('stands neutral and walled behind its garrison; it is never handed over', () => {
    const adv = opened();
    const g = townById(adv, GEBTU)!;
    expect(g).toMatchObject({ owner: 'neutral', faction: 'kemet' });
    expect(g.ally).toBeUndefined();
    expect(armyStrength(g.garrison)).toBeGreaterThan(0);
    // Riding in is a siege of its garrison.
    const at = { ...adv, hero: { ...adv.hero, x: g.x - 1, y: g.y + 1 } };
    expect(stepHero(at, def, { x: g.x, y: g.y, cost: 100, straight: 100, day: 0 }).battle).toBe(GEBTU);
    expect(battleSides(at, GEBTU).siege).toBeDefined();
  });

  it('is not his to run before the third night', () => {
    const r = nights(opened(), 2);
    expect(townById(r.adv, GEBTU)!.owner).toBe('neutral');
  });

  it('is lost to him if the player dawdles: Gebtu flies his banner and the night says so', () => {
    const start = opened();
    // The hero waits far back at Nekhen, out of his way.
    const r = nights({ ...start, hero: { ...start.hero, x: 9, y: 8 } }, 12);
    expect(townById(r.adv, GEBTU)!.owner).toBe('rival');
    expect(r.notes.some((n) => /banner flies over Gebtu/.test(n))).toBe(true);
  });
});

describe('Set’s sandstorms', () => {
  it('blow on every fourth day of the part, counted from its first', () => {
    const adv = opened(30);
    const begun = adv.begun!;
    const days = Array.from({ length: 12 }, (_, i) => begun + i).filter((d) => stormOn(def, adv, d));
    expect(days).toEqual([begun + 3, begun + 7, begun + 11]);
    expect(stormOn(ABU, adv, begun + 3)).toBe(false);
  });

  it('double the cost of sand for both sides on the storm day, and leave roads as they are', () => {
    const adv = opened(30);
    const storm = { ...adv, day: adv.begun! + 3 };
    const g = gridOf(def);
    const sand = red(5, 22);
    const road = red(5, 17);
    expect(g.terrain[tileIndex(g, sand.x, sand.y)]).toBe('sand');
    const step = (a: Adventure, who: 'player' | 'rival', from: { x: number; y: number }): number => stepCost(terrainView(a, def, who), from, { x: from.x + 1, y: from.y });
    expect(step(storm, 'player', sand)).toBe(step(adv, 'player', sand) * 2);
    expect(step(storm, 'rival', sand)).toBe(step(adv, 'rival', sand) * 2);
    expect(step(storm, 'player', road)).toBe(step(adv, 'player', road));
  });

  it('are warned of on the day card the morning before, and told on the day', () => {
    const adv = opened(30);
    const eve = endDay({ ...adv, day: adv.begun! + 1 }, def);
    expect(eve.prompts.at(-1)).toMatchObject({ kind: 'message', text: STORM_WORDS.rising });
    const day = endDay({ ...adv, day: adv.begun! + 2 }, def);
    expect(day.prompts.at(-1)).toMatchObject({ kind: 'message', text: STORM_WORDS.blowing });
    // Sethi's news joins the weather on the same card.
    const told = rivalTurn(endDay({ ...adv, day: adv.begun! + 1 }, def), def).adv.prompts.at(-1);
    expect(told?.kind === 'message' && told.text.startsWith(STORM_WORDS.rising)).toBe(true);
    // Maps without storms say nothing.
    expect(endDay({ ...startAdventure(ABU), prompts: [] }, ABU).prompts.at(-1)).toMatchObject({ text: '' });
  });

  it('keep their days through a save', () => {
    const adv = { ...opened(30), day: opened(30).begun! + 3 };
    const back = parseAdventure(JSON.parse(JSON.stringify(adv)), def)!;
    expect(back.begun).toBe(adv.begun);
    expect(terrainView(back, def).storm).toBe(true);
  });
});

describe('the Serpent of Apep', () => {
  const apep = def.objects.find((o) => o.id === 'apep')!;

  it('is the doc’s serpent: three hexes, poison and regeneration', () => {
    expect(creature('apep')).toMatchObject({ level: 6, attack: 17, defense: 13, minDmg: 14, maxDmg: 20, hp: 110, speed: 5, hexes: 3, poison: 0.1, regen: 10, growth: 1, cost: { gold: 1500 } });
  });

  it('lies coiled with its cobra brood, one fight, over the Ramp of the Pyramid Builders', () => {
    expect(apep).toMatchObject({ creature: 'apep', count: 1, brood: { creature: 'cobra' }, drop: 'ramp3' });
    const army = monsterArmy(apep).filter(Boolean);
    expect(army[0]).toMatchObject({ creature: 'apep', count: 1 });
    expect(army.slice(1).every((s) => s!.creature === 'cobra')).toBe(true);
    const adv = opened();
    const s = battleSides(adv, 'apep');
    const st = createBattle(s.attacker, s.defender, s.seed).state;
    const won = { ...st, winner: 0 as const, stacks: st.stacks.map((x) => (x.side === 0 ? x : { ...x, count: 0 })) };
    const after = afterBattle(adv, def, 'apep', won);
    const has = after.hero.gear?.machine === 'ramp3' || (after.hero.bag ?? []).includes('ramp3');
    expect(has, 'the prize is the hero’s').toBe(true);
  });
});

describe('the paid maps check a part with a rival', () => {
  it('reads part 6 back the same, rival, storms, race and look included', () => {
    const maps = parseMaps(JSON.parse(JSON.stringify(INKHEROES_PAID_MAPS)));
    const part = maps.find((m) => m.id === 'red-land')!;
    expect(part).toEqual(JSON.parse(JSON.stringify(RED_LAND)));
    expect(part.rival?.hero.id).toBe('sethi');
  });

  it('refuses a rival, storm, race or look that is off', () => {
    const ok = JSON.parse(JSON.stringify(RED_LAND)) as Record<string, unknown> & { rival: Record<string, unknown>; towns: Record<string, unknown>[] };
    const bad = (patch: Record<string, unknown>): unknown => [{ ...ok, ...patch }];
    expect(() => parseMaps(bad({ rival: { ...ok.rival, build: ['nothing'] } }))).toThrow();
    expect(() => parseMaps(bad({ rival: { ...ok.rival, hero: { ...(ok.rival.hero as object), heroClass: 'dragon' } } }))).toThrow();
    expect(() => parseMaps(bad({ rival: { ...ok.rival, purse: { gold: -1 } } }))).toThrow();
    expect(() => parseMaps(bad({ rival: 'sethi' }))).toThrow();
    expect(() => parseMaps(bad({ rival: { ...ok.rival, headStart: 2 } }))).toThrow();
    expect(() => parseMaps(bad({ stormEvery: 1 }))).toThrow();
    expect(() => parseMaps(bad({ stormEvery: 'often' }))).toThrow();
    expect(() => parseMaps(bad({ won: 'no-such-line' }))).toThrow();
    expect(() => parseMaps(bad({ towns: ok.towns.map((t, i) => (i === 1 ? { ...t, race: 'yes' } : t)) }))).toThrow();
    expect(() => parseMaps(bad({ towns: ok.towns.map((t, i) => (i === 2 ? { ...t, look: '__proto__' } : t)) }))).toThrow();
  });
});

describe('riding on into the Red Land', () => {
  it('opens east of Abu through the dunes, with Pharaoh’s grant, its unlocks and only the start of the desert road seen', () => {
    const won = abuWon();
    const next = rideOn(won, ABU, RED_LAND);
    expect(next.mapId).toBe('red-land');
    expect(gridOf(def)).toMatchObject({ w: 80, h: 56 });
    expect(next.purse.gold).toBe(won.purse.gold + 3000);
    expect(next.towns.map((t) => t.id)).toEqual(['nekhen-town', 'abu-town', GEBTU, NUBT]);
    expect(townById(next, 'abu-town')!.owner).toBe('player');
    const g = gridOf(def);
    const seen = (p: { x: number; y: number }): boolean => next.explored[p.x + p.y * g.w] === '1';
    for (const p of def.opening!.way) expect(seen(p), `${p.x},${p.y}`).toBe(true);
    expect(seen(townById(next, GEBTU)!)).toBe(false);
    expect(seen(townById(next, NUBT)!)).toBe(false);
    expect(next.prompts.at(-1)).toMatchObject({ kind: 'message', line: 'part-redLand' });
    expect(openIn(TWO_LANDS_UNLOCKS, 3)).toEqual(new Set([...openIn(TWO_LANDS_UNLOCKS, 2), 'castle', 'treasury', 'tiltyard', 'monastery2', 'guardhouse3', 'archeryRange3', 'griffinTower3', 'barracks3', 'portal2']));
    expect(def.off).not.toContain('tiltyard');
    expect(def.off).toContain('seraphSpire');
    expect(def.parDays).toBe(35);
  });

  it('brings Sethi in as a lord: no head start, at home in Nubt with the army the map gives him', () => {
    expect(def.rival!.mind).toBe('lord');
    const early = rideOn(abuWon(20), ABU, RED_LAND).rival!.hero!;
    const late = rideOn(abuWon(36), ABU, RED_LAND).rival!.hero!;
    const start = armyStrength(armyOf(def.rival!.hero.army));
    expect(armyStrength(early.army)).toBe(start);
    expect(armyStrength(late.army)).toBe(start);
    expect(late).toMatchObject({ x: townById(startAdventure(def), NUBT)!.x });
  });

  it('every object stands on open ground of the land', () => {
    const g = gridOf(def);
    for (const o of def.objects) expect(g.terrain[tileIndex(g, o.x, o.y)], o.id).not.toBe('water');
  });
});

describe('the end of chapter 2', () => {
  it('moved on to the Delta (part 8): the Red Land’s win is a part’s end that rides on north', () => {
    installPaidMaps(parseMaps(JSON.parse(JSON.stringify(INKHEROES_PAID_MAPS))));
    expect(nextMap(ABU)?.id).toBe('red-land');
    expect(nextMap(RED_LAND)?.id).toBe('delta');
    installPaidMaps([]);
    const two = chapterById('twoLands');
    expect(two.ending).toBe('twoLands-won');
    expect(ABU.won).toBe('abu-won');
    expect(RED_LAND.won).toBe('redLand-won');
    expect(upcoming({ ...opened(), prompts: [] }, 2)).toEqual(['redLand-won', 'part-delta']);
  });

  it('plays the "Chapter 2 complete" card (now the Delta’s) as chapter 1’s, generalised: days, towns, heroes, and the next chapter (its first part built)', () => {
    const adv = { ...opened(40), status: 'won' as const };
    const end = chapterEnd(chapterById('twoLands'), adv, false, () => true);
    expect(end.title).toBe('Chapter 2 complete');
    // Chapter 3 is named, with its teaser: its first part is built, so an owner rides on into it.
    expect(end.next?.id).toBe('longWinter');
    expect(end.body[0]).toMatch(/Two Lands are one/);
    expect(end.body[1]).toBe('40 days on the march, 2 towns under your banner, one hero riding.');
    expect(end.body.join(' ')).toMatch(/Chapter 3, The Long Winter, sails north to the Norse kingdoms.*It waits for you now\./);
    // Heard from the narrator: the card leaves the story out.
    expect(chapterEnd(chapterById('twoLands'), adv, true, () => true).body[0]).toMatch(/days on the march/);
    // Chapter 1's card still points on to chapter 2.
    const one = chapterEnd(chapterById('borderMarch'), adv, true, () => false);
    expect(one).toMatchObject({ title: 'Chapter 1 complete', next: { id: 'twoLands' } });
    expect(one.body.join(' ')).toMatch(/Chapter 2, The Two Lands, crosses to Egypt.*It is part of the full game\./);
    expect(CHAPTERS.map((c) => c.ending)).toEqual(['chapter-won', 'twoLands-won', 'longWinter-won']);
  });

  it('keeps its other parts as they were', () => {
    expect(NEKHEN.rows).toHaveLength(24);
    expect(ABU.rows[0]).toHaveLength(40);
  });
});
