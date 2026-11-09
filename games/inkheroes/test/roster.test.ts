import { describe, expect, it } from 'vitest';
import { ASHFORD, OTHRYS, THORNWOOD } from '../src/level/borderMarch';
import { NEFERET, PASER } from '../src/level/recruits';
import { IANTHE } from '../src/level/recruits';
import { ABU, NEKHEN, RED_LAND } from '../src/level/twoLands';
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
import { KEMET_ROSTER } from '../src/logic/roster/kemet';
import { parseAdventure } from '../src/logic/save';
import { extraRounds, lineBonus, specialtyGold, specialtyText, SPECIALTY_GOLD } from '../src/logic/specialty';
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
    expect(rosterOf('kemet')).toHaveLength(10);
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

describe('the Egyptian roster', () => {
  const kemet = rosterOf('kemet');
  it("has the table's ten heroes (five Knights, five Clerics), each once, each of Egypt with a specialty", () => {
    expect(kemet).toBe(KEMET_ROSTER);
    expect(kemet.filter((h) => h.heroClass === 'knight')).toHaveLength(5);
    expect(new Set(kemet.map((h) => h.id)).size).toBe(10);
    expect(kemet.every((h) => !!h.specialty && h.faction === 'kemet' && h.army.length > 0)).toBe(true);
    expect(kemet.map((h) => h.id)).toEqual(['paser', 'sethi', 'apepi', 'weni', 'ahmose', 'neferet', 'imhotep', 'tiye', 'khaemwaset', 'nebet']);
    // Every army is Egypt's own, and a Cleric's magic is in a book.
    expect(kemet.every((h) => h.army.every((a) => creature(a.creature).faction === 'kemet'))).toBe(true);
    expect(kemet.filter((h) => h.heroClass === 'cleric').every((h) => !!h.gear?.book && h.spells.length > 0)).toBe(true);
  });

  it("agrees with the map heroes: Neferet's and Paser's are their first part's, Sethi's the Red Land's", () => {
    const { specialty: _n, ...neferet } = kemet.find((h) => h.id === 'neferet')!;
    expect(neferet).toEqual(NEFERET);
    expect(NEKHEN.hero).toMatchObject({ ...NEFERET, x: 9, y: 8 });
    const { specialty: _p, ...paser } = kemet.find((h) => h.id === 'paser')!;
    expect(paser).toEqual(PASER);
    const sethi = kemet.find((h) => h.id === 'sethi')!;
    expect(RED_LAND.rival!.hero).toMatchObject({ id: 'sethi', attack: sethi.attack, defense: sethi.defense, skills: sethi.skills });
    expect(heroFromDef(RED_LAND.rival!.hero).specialty).toEqual({ kind: 'line', line: 'jackal' });
    expect(heroFromDef(ABU.recruits![0]!).specialty).toEqual({ kind: 'line', line: 'chariot' });
  });

  it('gives the lines +1 Attack and Defense from level 1, the mummy line to the Pharaoh’s Mummies too', () => {
    const khaemwaset = stateWith(hero('khaemwaset', 4));
    for (const id of ['mummy', 'mummy2', 'mummy3'] as const) expect(attackOf(khaemwaset, stackOf(id), true)).toBe(creature(id).attack + 1 + 2);
    expect(attackOf(khaemwaset, stackOf('levy'), true)).toBe(creature('levy').attack + 1);
    expect(defenseOf(stateWith(hero('weni')), stackOf('levy3'))).toBe(creature('levy3').defense + 2 + 1);
  });

  it('spells: Ward soaks 50% more, the Rite brings back 50% more, the Curse a round more per 5 levels', () => {
    const plain = (spell: 'ward' | 'rebirth', h: Hero): number => spellAmount(stateWith({ ...h, specialty: undefined }), 0, spell);
    const neferet = hero('neferet');
    expect(spellAmount(stateWith(neferet), 0, 'ward')).toBe(Math.floor(plain('ward', neferet) * 1.5));
    expect(spellAmount(stateWith(neferet), 0, 'ward')).toBeGreaterThan(plain('ward', neferet));
    const imhotep = hero('imhotep');
    expect(spellAmount(stateWith(imhotep), 0, 'rebirth')).toBe(Math.floor(plain('rebirth', imhotep) * 1.5));
    // Only their own spell: Neferet's Rite (she knows none) and Imhotep's Ward are as any hero's.
    expect(spellAmount(stateWith(imhotep), 0, 'ward')).toBe(plain('ward', imhotep));
    const curseRounds = (id: string, level: number): number => {
      const h = { ...hero(id, level), power: 2 };
      const b = createBattle(heroSide(h, armyOf([{ creature: 'levy', count: 5 }])), { hero: null, army: armyOf([{ creature: 'wolf', count: 5 }]) }, 7).state;
      const foe = b.stacks.find((s) => s.side === 1)!;
      return castSpell(b, 0, 'curse', foe.id).state.stacks.find((s) => s.id === foe.id)!.effects.find((e) => e.kind === 'curse')!.rounds;
    };
    expect(curseRounds('tiye', 4)).toBe(2);
    expect(curseRounds('tiye', 5)).toBe(3);
    expect(curseRounds('tiye', 10)).toBe(4);
    expect(extraRounds({ kind: 'spell', spell: 'ward', level: 10 }, 'ward')).toBe(0);
  });

  it('a ward soaks the bigger amount in battle', () => {
    const ward = (id: string): number => {
      const h = hero(id);
      const b = createBattle(heroSide(h, armyOf([{ creature: 'levy', count: 5 }])), { hero: null, army: armyOf([{ creature: 'wolf', count: 5 }]) }, 7).state;
      const own = b.stacks.find((s) => s.side === 0)!;
      return castSpell({ ...b, heroes: [{ ...b.heroes[0]!, spells: ['ward'] }, b.heroes[1]] } as BattleState, 0, 'ward', own.id).state.stacks.find((s) => s.id === own.id)!.effects.find((e) => e.kind === 'ward')!.left!;
    };
    expect(ward('neferet')).toBeGreaterThan(ward('tiye'));
  });

  it('shows on the hero sheet and the Tavern card, in one line', () => {
    const name = (s: string): string => s;
    expect(specialtyText({ kind: 'spell', spell: 'ward' }, () => 'Ward of Isis')).toBe('Ward of Isis: soaks 50% more');
    expect(specialtyText({ kind: 'spell', spell: 'rebirth' }, () => 'Rite of Osiris')).toBe('Rite of Osiris: brings back 50% more');
    expect(specialtyText({ kind: 'spell', spell: 'curse' }, () => 'Curse of Set')).toBe('Curse of Set: lasts a round more per 5 levels');
    expect(name(heroSheet(hero('imhotep')).specialty!.text)).toMatch(/Rite of Osiris: brings back 50% more/);
    expect(heroSheet(hero('weni')).specialty?.text).toMatch(/Nile Levies: \+1 Attack and Defense/);
    expect(heroSheet(hero('nebet')).specialty?.text).toBe('Gold: +350 a day');
  });

  it("brings in Nebet's 350 gold a day", () => {
    const a = rich(startAdventure(RED_LAND));
    const withNebet: Adventure = { ...a, others: [...(a.others ?? []), { ...hero('nebet'), x: a.hero.x, y: a.hero.y }] };
    expect(dailyIncome(withNebet).gold - dailyIncome(a).gold).toBe(SPECIALTY_GOLD);
  });
});

describe('Taverns from the Red Land on', () => {
  const red = (): Adventure => rich(startAdventure(RED_LAND));
  const tavernTown = (a: Adventure) => playerTowns(a).find((t) => t.built.includes('tavern'))!;

  it("keep Paser the part-6 hire, then offer two of Egypt's roster, never Neferet or Sethi while in play", () => {
    const a1 = startAdventure(ABU);
    expect(tavernHeroes(a1, ABU, townById(a1, 'abu-town') ?? playerTowns(a1)[0]!).map((h) => h.id)).toEqual(['paser']);
    const a = red();
    const t = tavernTown(a);
    const offer = tavernHeroes(a, RED_LAND, t);
    expect(offer).toHaveLength(TAVERN_CHOICE);
    expect(offer.every((h) => h.faction === 'kemet')).toBe(true);
    const taken = heroesInPlay(a, RED_LAND);
    expect(taken.has('neferet') && taken.has('sethi')).toBe(true);
    expect(offer.some((h) => taken.has(h.id))).toBe(false);
    // The story's villain (Sethi) is never ours to hire, and Apepi, the next one, is not offered to us.
    for (const day of [1, 8, 15, 22, 29, 36, 43]) {
      expect(weekOffer({ ...a, day }, RED_LAND, t).some((h) => h.id === 'sethi' || h.id === 'neferet')).toBe(false);
    }
    const loaded = parseAdventure(JSON.parse(JSON.stringify(a)), RED_LAND)!;
    expect(tavernHeroes(loaded, RED_LAND, tavernTown(loaded))).toEqual(offer);
  });

  it('hire an Egyptian, who keeps their specialty through a save', () => {
    const a = red();
    const t = tavernTown(a);
    const pick = tavernHeroes(a, RED_LAND, t)[0]!;
    const hired = hireHero(a, RED_LAND, t.id, pick.id)!;
    expect(hired.hero.specialty).toEqual(pick.specialty);
    const back = parseAdventure(JSON.parse(JSON.stringify(hired)), RED_LAND)!;
    expect(back.hero).toMatchObject({ id: pick.id, faction: 'kemet', specialty: pick.specialty });
  });

  it('a lord of Egypt hires from the same roster', () => {
    expect(hireScore(rosterHero('weni')!, 'main', 'levy')).toBeGreaterThan(hireScore(rosterHero('weni')!, 'main', 'jackal'));
    expect(hireScore(rosterHero('nebet')!, 'runner', null)).toBeGreaterThan(hireScore(rosterHero('ahmose')!, 'runner', null) - 1);
  });
});

describe('hero art for the Egyptians', () => {
  it("falls back to Egypt's own drawn heroes, else the Greeks' stand-ins, and never fails", () => {
    const drawn = ['player', 'rival', 'ianthe', 'neferet', 'paser', 'sethi'];
    expect(heroArtId(drawn, 'player', 'imhotep')).toBe('neferet');
    expect(heroArtId(drawn, 'player', 'weni')).toBe('paser');
    expect(heroArtId(drawn, 'rival', 'apepi')).toBe('paser');
    expect(heroArtId(drawn, 'rival', 'sethi')).toBe('sethi');
    expect(heroArtId(['player', 'rival', 'ianthe'], 'player', 'tiye')).toBe('ianthe');
    expect(heroArtId(['player', 'rival'], 'rival', 'khaemwaset')).toBe('rival');
    // Their own art, once drawn, wins.
    expect(heroArtId([...drawn, 'weni'], 'player', 'weni')).toBe('weni');
    for (const h of KEMET_ROSTER) expect(typeof heroArtId(drawn, 'player', h.id)).toBe('string');
  });
});
