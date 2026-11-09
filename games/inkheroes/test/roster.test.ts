import { describe, expect, it } from 'vitest';
import { ASHFORD, OTHRYS, THORNWOOD } from '../src/level/borderMarch';
import { IANTHE } from '../src/level/recruits';
import { dailyIncome, endDay, heroFromDef, heroSide, ourHeroes, playerTowns, startAdventure, townById, type Adventure } from '../src/logic/adventure';
import { armyOf } from '../src/logic/army';
import { createBattle } from '../src/logic/battle';
import { castSpell, spellAmount } from '../src/logic/battleSpells';
import type { BattleState, Stack } from '../src/logic/battleTypes';
import { creature } from '../src/logic/creatures';
import { attackOf, defenseOf } from '../src/logic/damage';
import { toBattleHero, type Hero } from '../src/logic/hero';
import { cantHireHero, heroesInPlay, hireHero, MAX_HEROES, tavernHeroes, TAVERN_CHOICE, weekOffer } from '../src/logic/heroes';
import { hireScore, strongestLine } from '../src/logic/lord/recruits';
import { rosterHero, rosterOf, specialtyOf } from '../src/logic/roster';
import { GREEK_ROSTER, ROWAN } from '../src/logic/roster/greek';
import { parseAdventure } from '../src/logic/save';
import { lineBonus, specialtyGold, SPECIALTY_GOLD } from '../src/logic/specialty';
import { heroArtId } from '../src/scenes/battle/heroArtId';
import { heroSheet } from '../src/scenes/hud/heroSheetData';
import { tavernChoice } from '../src/scenes/town/tavernData';

/** Rowan as map 1 placed him before the roster (the campaign's numbers). */
const CHAPTER1_ROWAN = {
  id: 'rowan', name: 'Rowan', heroClass: 'knight', x: 6, y: 6,
  attack: 2, defense: 2, power: 1, knowledge: 1, skills: { leadership: 1 }, spells: [],
  army: [{ creature: 'spearman', count: 18 }, { creature: 'bowman', count: 7 }],
};
const hero = (id: string, level = 1): Hero => ({ ...heroFromDef(rosterHero(id)!), level });
const rich = (a: Adventure): Adventure => ({ ...a, prompts: [], purse: { ...a.purse, gold: 100000 } });
/** Othrys played fresh, the hero out of every gate, a full purse. */
const othrys = (): Adventure => rich(startAdventure(OTHRYS));
const stackOf = (creatureId: Stack['creature'], side: 0 | 1 = 0): Stack => ({ id: 0, side, creature: creatureId, count: 10, topHp: creature(creatureId).hp, startCount: 10, hex: 0, shots: 0, retaliationsLeft: 1, slot: 0, acted: false, waited: false, defending: false, moraleUsed: false, effects: [] });
const stateWith = (h: Hero): BattleState => ({ heroes: [toBattleHero(h), null] } as unknown as BattleState);

describe('the Greek roster', () => {
  it("has the table's ten heroes (six Knights, four Clerics), each once, each with a specialty", () => {
    const greek = rosterOf('crown');
    expect(greek).toHaveLength(10);
    expect(greek.filter((h) => h.heroClass === 'knight')).toHaveLength(6);
    expect(new Set(greek.map((h) => h.id)).size).toBe(10);
    expect(greek.every((h) => !!h.specialty)).toBe(true);
    expect(greek.map((h) => h.id)).toEqual(['rowan', 'kassander', 'lykaon', 'nyktimos', 'atalanta', 'peleus', 'ianthe', 'auge', 'kallisto', 'melampus']);
    expect(rosterOf('kemet')).toEqual([]);
  });

  it("keeps the story heroes' numbers: Rowan's are map 1's, Ianthe's her own", () => {
    expect(ASHFORD.hero).toMatchObject(CHAPTER1_ROWAN);
    const { specialty: _s, blurb: _b, ...rowan } = ROWAN;
    expect({ ...rowan, x: 6, y: 6 }).toMatchObject(CHAPTER1_ROWAN);
    const { specialty: _i, ...ianthe } = GREEK_ROSTER.find((h) => h.id === 'ianthe')!;
    expect(ianthe).toEqual(IANTHE);
  });

  it('gives a story hero placed by a map the roster specialty for their id', () => {
    expect(heroFromDef(OTHRYS.rival!.hero).specialty).toEqual({ kind: 'line', line: 'lancer' });
    expect(heroFromDef(THORNWOOD.recruits![0]!).specialty).toEqual({ kind: 'spell', spell: 'cure' });
    expect(specialtyOf({ id: 'nobody' })).toBeUndefined();
  });
});

describe('specialties', () => {
  it('line: +1 Attack and Defense from level 1 and +1 more per 4 levels, to all three levels of the line, nobody else', () => {
    expect([1, 3, 4, 7, 8, 12].map(lineBonus)).toEqual([1, 1, 2, 2, 3, 4]);
    const rowan = stateWith(hero('rowan', 8));
    for (const id of ['spearman', 'spearman2', 'spearman3'] as const) {
      expect(attackOf(rowan, stackOf(id), true)).toBe(creature(id).attack + 2 + 3);
      expect(defenseOf(rowan, stackOf(id))).toBe(creature(id).defense + 2 + 3);
    }
    expect(attackOf(rowan, stackOf('bowman'), false)).toBe(creature('bowman').attack + 2);
    // A fresh Rowan's Hoplites get +1 already.
    const fresh = hero('rowan');
    expect(attackOf(stateWith(fresh), stackOf('spearman'), true)).toBe(creature('spearman').attack + fresh.attack + 1);
    // The other side's hoplites get nothing of Rowan's.
    expect(attackOf(rowan, stackOf('spearman', 1), true)).toBe(creature('spearman').attack);
  });

  it('spell: Healing heals 50% more, the Thunderbolt +5% a level, Slow a round more per 5 levels', () => {
    const plain = (spell: 'cure' | 'lightningBolt', h: Hero): number => spellAmount(stateWith({ ...h, specialty: undefined }), 0, spell);
    const ianthe = hero('ianthe');
    expect(spellAmount(stateWith(ianthe), 0, 'cure')).toBe(Math.floor(plain('cure', ianthe) * 1.5));
    const kallisto = hero('kallisto', 10);
    expect(spellAmount(stateWith(kallisto), 0, 'lightningBolt')).toBe(Math.floor(plain('lightningBolt', kallisto) * 1.5));
    const slowRounds = (level: number): number => {
      const auge = { ...hero('auge', level), power: 2 };
      const b = createBattle(heroSide(auge, armyOf([{ creature: 'spearman', count: 5 }])), { hero: null, army: armyOf([{ creature: 'wolf', count: 5 }]) }, 7).state;
      const foe = b.stacks.find((s) => s.side === 1)!;
      return castSpell(b, 0, 'slow', foe.id).state.stacks.find((s) => s.id === foe.id)!.effects.find((e) => e.kind === 'slow')!.rounds;
    };
    expect(slowRounds(4)).toBe(2);
    expect(slowRounds(5)).toBe(3);
    expect(slowRounds(10)).toBe(4);
  });

  it("gold: +350 a day in the day's income, for us and for the rival lord", () => {
    expect(specialtyGold([hero('peleus'), hero('rowan')])).toBe(SPECIALTY_GOLD);
    const a = othrys();
    const withPeleus: Adventure = { ...a, others: [...(a.others ?? []), { ...hero('peleus'), x: a.hero.x, y: a.hero.y }] };
    expect(dailyIncome(withPeleus).gold - dailyIncome(a).gold).toBe(SPECIALTY_GOLD);
    expect(endDay(withPeleus, OTHRYS).purse.gold - endDay(a, OTHRYS).purse.gold).toBe(SPECIALTY_GOLD);
    const his: Adventure = { ...a, rival: { ...a.rival!, others: [hero('peleus')] } };
    expect(endDay(his, OTHRYS).rival!.purse.gold - endDay(a, OTHRYS).rival!.purse.gold).toBe(SPECIALTY_GOLD);
  });

  it('shows on the hero sheet and the Tavern card, in one line', () => {
    expect(heroSheet(hero('nyktimos')).specialty?.text).toMatch(/Griffins: \+1 Attack and Defense, \+1 more per 4 levels/);
    expect(heroSheet(hero('peleus')).specialty?.text).toBe('Gold: +350 a day');
    expect(heroSheet(hero('ianthe')).specialty?.text).toMatch(/Healing: heals 50% more/);
    const a = othrys();
    const t = townById(a, 'ashford-town')!;
    const c = tavernChoice(a, OTHRYS, t);
    expect(c.cards).toHaveLength(2);
    expect(c.cards.every((k) => !!k.specialty?.text && !!k.title)).toBe(true);
  });
});

describe('Taverns from Othrys on', () => {
  it('keep the map lists before it: none on map 1, Ianthe alone on part 2', () => {
    const a1 = startAdventure(ASHFORD);
    expect(tavernHeroes(a1, ASHFORD, townById(a1, 'ashford-town')!)).toEqual([]);
    const a2 = startAdventure(THORNWOOD);
    expect(tavernHeroes(a2, THORNWOOD, townById(a2, 'ashford-town')!).map((h) => h.id)).toEqual(['ianthe']);
  });

  it('offer two of the roster, none in play on either side, the same after a reload', () => {
    const a = othrys();
    const t = townById(a, 'ashford-town')!;
    const offer = tavernHeroes(a, OTHRYS, t);
    expect(offer).toHaveLength(TAVERN_CHOICE);
    const taken = heroesInPlay(a, OTHRYS);
    expect(taken.has('rowan') && taken.has('lykaon')).toBe(true);
    expect(offer.some((h) => taken.has(h.id))).toBe(false);
    const loaded = parseAdventure(JSON.parse(JSON.stringify(a)), OTHRYS)!;
    expect(tavernHeroes(loaded, OTHRYS, townById(loaded, 'ashford-town')!)).toEqual(offer);
    // A new week deals again (the same seed, so the same again on a reload).
    const weeks = [1, 8, 15, 22, 29].map((day) => weekOffer({ ...a, day }, OTHRYS, t).map((h) => h.id).join());
    expect(new Set(weeks).size).toBeGreaterThan(1);
  });

  it('give each Tavern of ours its own pair, no hero in two at once', () => {
    const a = othrys();
    const taverns = playerTowns(a).filter((t) => t.built.includes('tavern'));
    expect(taverns.length).toBeGreaterThanOrEqual(2);
    const ids = taverns.flatMap((t) => tavernHeroes(a, OTHRYS, t).map((h) => h.id));
    // Two each while the pool lasts (ten less Rowan, Lykaon and Kassander: seven).
    expect(ids).toHaveLength(Math.min(taverns.length * TAVERN_CHOICE, 7));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('refill a hired place at once from the pool, so another can be hired the same day', () => {
    const a = othrys();
    const t = townById(a, 'ashford-town')!;
    const [first, second] = tavernHeroes(a, OTHRYS, t);
    const hired = hireHero(a, OTHRYS, t.id, second!.id)!;
    expect(hired.hero.id).toBe(second!.id);
    expect(hired.hero.specialty).toEqual(second!.specialty);
    const next = tavernHeroes(hired, OTHRYS, t);
    expect(next).toHaveLength(2);
    expect(next.map((h) => h.id)).toContain(first!.id);
    expect(next.map((h) => h.id)).not.toContain(second!.id);
    // The new hire stands in the gate: once they ride out (here: into the garrison), the Tavern hires again today.
    const out = { ...hired, hero: { ...hired.hero, army: armyOf([]) } };
    const again = hireHero(out, OTHRYS, t.id, next[1]!.id)!;
    expect(ourHeroes(again)).toHaveLength(ourHeroes(a).length + 2);
    // A hero not offered here can't be hired here.
    expect(hireHero(a, OTHRYS, t.id, 'lykaon')).toBeNull();
  });

  it(`stop at ${MAX_HEROES} heroes of ours, those in a garrison too, and the card says so`, () => {
    const a = othrys();
    const t = townById(a, 'ashford-town')!;
    const extra = GREEK_ROSTER.filter((h) => !['rowan', 'lykaon'].includes(h.id)).slice(0, MAX_HEROES - 1).map((h) => ({ ...heroFromDef(h), x: a.hero.x, y: a.hero.y }));
    // One of them waits in Ashford's garrison (no companies of their own): they count too.
    const kept = { ...extra[0]!, x: t.x, y: t.y, army: armyOf([]) };
    const full: Adventure = { ...a, others: [kept, ...extra.slice(1)] };
    expect(ourHeroes(full)).toHaveLength(MAX_HEROES);
    expect(cantHireHero(full, OTHRYS, t)).toMatch(/8 heroes already ride with you/);
    expect(hireHero(full, OTHRYS, t.id)).toBeNull();
    const card = tavernChoice(full, OTHRYS, t);
    expect(card.note).toMatch(/8 heroes/);
    expect(card.cards.every((k) => !k.enabled)).toBe(true);
    const seven: Adventure = { ...a, others: extra.slice(1) };
    expect(cantHireHero(seven, OTHRYS, t)).toBeNull();
  });
});

describe('story villains', () => {
  it("are never offered at the player's Taverns on a campaign map, but stay for a lord's and for custom maps", () => {
    const a = othrys();
    const villains = ['kassander', 'lykaon'];
    const weeks = Array.from({ length: 12 }, (_, i) => ({ ...a, day: 1 + i * 7 }));
    const ours = weeks.flatMap((w) => playerTowns(w).filter((t) => t.built.includes('tavern')).flatMap((t) => tavernHeroes(w, OTHRYS, t).map((h) => h.id)));
    expect(ours.some((id) => villains.includes(id))).toBe(false);
    const t = townById(a, 'ashford-town')!;
    // A lord's Taverns (the mirrored map) may offer Kassander, never our Rowan.
    const his = weeks.flatMap((w) => tavernHeroes(w, OTHRYS, t, 'lord').map((h) => h.id));
    expect(his).toContain('kassander');
    expect(his).not.toContain('rowan');
    // On a map that isn't a part of the campaign, Kassander may come to our Tavern.
    const custom = { ...OTHRYS, id: 'custom-greek', rival: undefined };
    const free = weeks.flatMap((w) => tavernHeroes({ ...w, rival: undefined }, custom, t).map((h) => h.id));
    expect(free).toContain('kassander');
  });
});

describe("the lord's hires", () => {
  it('a runner takes the gold hero or a Knight with Logistics; the main army hero a specialist of his strongest line', () => {
    const peleus = rosterHero('peleus')!;
    const others = GREEK_ROSTER.filter((h) => h.id !== 'peleus');
    expect(others.every((h) => hireScore(peleus, 'runner', null) > hireScore(h, 'runner', null))).toBe(true);
    const army = armyOf([{ creature: 'spearman', count: 10 }, { creature: 'griffin2', count: 20 }]);
    expect(strongestLine(army)).toBe('griffin');
    const best = [...GREEK_ROSTER].sort((x, y) => hireScore(y, 'main', 'griffin') - hireScore(x, 'main', 'griffin'))[0]!;
    expect(best.id).toBe('nyktimos');
  });
});

describe('saves with the roster', () => {
  it('keep the stats of heroes in play, load an old id under its new name, and a hero nobody knows', () => {
    const a = othrys();
    const vet = { ...hero('nyktimos'), attack: 9, level: 3, xp: 2500, x: a.hero.x, y: a.hero.y };
    const old = { ...hero('auge'), id: 'mainalos', name: 'Mainalos', x: a.hero.x, y: a.hero.y };
    const stranger = { ...hero('kallisto'), id: 'theseus', name: 'Theseus', heroClass: 'knight' as const, specialty: undefined, x: a.hero.x, y: a.hero.y };
    const saved = { ...a, rival: { ...a.rival!, others: [vet, old, stranger] } };
    const back = parseAdventure(JSON.parse(JSON.stringify(saved)), OTHRYS)!;
    expect(back).not.toBeNull();
    const [n, au, th] = back.rival!.others!;
    expect(n).toMatchObject({ id: 'nyktimos', attack: 9, level: 3, specialty: { kind: 'line', line: 'griffin' } });
    expect(au).toMatchObject({ id: 'auge', name: 'Auge', specialty: { kind: 'spell', spell: 'slow' } });
    expect(th).toMatchObject({ id: 'theseus', name: 'Theseus', heroClass: 'knight' });
    expect(th!.specialty).toBeUndefined();
  });

  it('load a roster hire of ours', () => {
    const a = othrys();
    const t = townById(a, 'ashford-town')!;
    const pick = tavernHeroes(a, OTHRYS, t)[0]!;
    const hired = hireHero(a, OTHRYS, t.id, pick.id)!;
    const back = parseAdventure(JSON.parse(JSON.stringify(hired)), OTHRYS)!;
    expect(back.hero).toMatchObject({ id: pick.id, name: pick.name, specialty: pick.specialty });
  });
});

describe('hero art for the roster', () => {
  it("uses a hero's own art when drawn, else the class's: a Cleric Ianthe's, a Knight the side's", () => {
    const drawn = ['player', 'rival', 'ianthe', 'nyktimos'];
    expect(heroArtId(drawn, 'rival', 'nyktimos')).toBe('nyktimos');
    expect(heroArtId(drawn, 'player', 'kallisto')).toBe('ianthe');
    expect(heroArtId(drawn, 'player', 'peleus')).toBe('player');
    expect(heroArtId(drawn, 'rival', 'peleus')).toBe('rival');
    expect(heroArtId(drawn, 'player', 'rowan')).toBe('player');
    expect(heroArtId(drawn, 'player', 'kassander')).toBe('rival');
  });
});
