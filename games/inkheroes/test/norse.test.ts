import { describe, expect, it } from 'vitest';
import { ASHFORD, OTHRYS } from '../src/level/borderMarch';
import { chapterById, CHAPTERS, comingSoon, installPaidMaps, partsOf } from '../src/level/maps';
import type { MapDef } from '../src/level/types';
import { LONG_WINTER_UNLOCKS, openIn, soldOn } from '../src/level/unlocks';
import { afterBattle, endDay, heroSide, playerTowns, startAdventure, terrainView, withTown, type Adventure } from '../src/logic/adventure';
import { armyOf } from '../src/logic/army';
import { act, activeStack, answers, breathOn, conquer, createBattle, stackById, type BattleField, type BattleSide } from '../src/logic/battle';
import { chooseAction } from '../src/logic/battleAi';
import { bestCast } from '../src/logic/battleCasts';
import { castSpell, spellAmount } from '../src/logic/battleSpells';
import { wound } from '../src/logic/battleTraits';
import type { BattleEvent, BattleHero, BattleState, Stack } from '../src/logic/battleTypes';
import { BUILDINGS } from '../src/logic/buildings';
import { creature, CREATURE_IDS, lineUnits, type CreatureId } from '../src/logic/creatures';
import { attackOf, rageOf, speedOf } from '../src/logic/damage';
import { buildingIdsOf, buildingOf, buildsAt, dwellingOf, FACTIONS, TOWN_FACTIONS } from '../src/logic/factions';
import { hexAt, type Hex } from '../src/logic/hex';
import { toBattleHero } from '../src/logic/hero';
import { storyVillains, tavernHeroes } from '../src/logic/heroes';
import { itemSays } from '../src/logic/items';
import { parseGrid } from '../src/logic/map';
import { stepCost } from '../src/logic/path';
import { rosterHero, rosterOf } from '../src/logic/roster';
import { NORSE_VILLAINS } from '../src/logic/roster/norse';
import { parseAdventure } from '../src/logic/save';
import { fortification, PART_HEX, standing } from '../src/logic/siege';
import { SCHOOLS, SPELLS } from '../src/logic/spells';
import { extraRounds, specialtyText } from '../src/logic/specialty';
import { BUILD_PLANS, buildAll, dwellings, meadIn, type Town } from '../src/logic/town';
import { battleArtId, figureArt } from '../src/scenes/battle/standIns';
import { UNIT_ART } from '../src/art/pixel/manifest';

type Placed = readonly [CreatureId, number, Hex];

const RUNE_HERO: BattleHero = { name: 'Heid', attack: 0, defense: 0, power: 2, mana: 60, spells: ['tiwaz', 'isa', 'thurisaz'], skills: {}, morale: 0, luck: 0, faction: 'norse' };

/** A battle with exactly these stacks on these hexes, no obstacles; `heroes` puts the rune hero on the left. Stack ids run left first, then right. */
function fieldOf(left: readonly Placed[], right: readonly Placed[], active: number, opts: { seed?: number; hero?: BattleHero | null; field?: BattleField } = {}): BattleState {
  const side = (ps: readonly Placed[], hero: BattleHero | null): BattleSide => ({ hero, army: armyOf(ps.map(([c, n]) => ({ creature: c, count: n }))) });
  const { state } = createBattle(side(left, opts.hero ?? null), side(right, null), opts.seed ?? 7, undefined, opts.field);
  const hexes = [...left, ...right].map(([, , h]) => h);
  return { ...state, obstacles: [], stacks: state.stacks.map((s, i) => ({ ...s, hex: hexes[i]! })), active };
}

const withStack = (s: BattleState, id: number, f: (x: Stack) => Stack): BattleState => ({ ...s, stacks: s.stacks.map((x) => (x.id === id ? f(x) : x)) });
const ofType = <T extends BattleEvent['type']>(events: readonly BattleEvent[], type: T) => events.filter((e): e is Extract<BattleEvent, { type: T }> => e.type === type);

describe('the Norse Kingdoms: the people', () => {
  const LINES = ['shieldmaiden', 'hunter', 'berserker', 'dwarf', 'warBoar', 'valkyrie', 'dragon'] as const;

  it('has seven lines of five ranks, 35 creatures, all of them Norse', () => {
    for (const [i, base] of LINES.entries()) {
      expect(lineUnits(base), base).toEqual([base, `${base}2`, `${base}3`, `${base}4`, `${base}5`]);
      for (const id of lineUnits(base)) expect(creature(id)).toMatchObject({ faction: 'norse', level: i + 1 });
    }
    expect(CREATURE_IDS.filter((id) => creature(id).faction === 'norse')).toHaveLength(35);
    // The War Boar's line has ids of its own: `boar` stays the Erymanthian Boar, a neutral.
    expect(creature('boar').faction).toBe('neutral');
    expect(creature('warBoar').name).toBe('War Boar');
    // The two fliers are the two at the top; the dragon breathes.
    expect(CREATURE_IDS.filter((id) => creature(id).faction === 'norse' && !creature(id).line && creature(id).flies)).toEqual(['valkyrie', 'dragon']);
    expect(lineUnits('dragon').every((id) => creature(id).breath)).toBe(true);
  });

  it("carries the table's numbers for the base units and their upgrades", () => {
    const row = (id: CreatureId): string => {
      const c = creature(id);
      return `${c.attack}/${c.defense} ${c.minDmg}-${c.maxDmg} ${c.hp} ${c.speed} ${c.cost.gold}${c.cost.gems ? `+${c.cost.gems}` : ''}`;
    };
    expect(LINES.map(row)).toEqual(['5/4 1-3 10 4 60', '6/3 2-3 10 4 100', '10/4 3-6 22 6 200', '9/13 5-8 38 4 300', '13/9 10-14 45 6 400', '16/14 16-24 95 9 1000', '21/18 40-50 200 11 3000+1']);
    expect(LINES.map((b) => creature(b).growth)).toEqual([14, 9, 7, 4, 3, 2, 1]);
    expect(LINES.map((b) => row(`${b}3` as CreatureId))).toEqual(['8/7 2-4 15 5 100', '8/4 3-4 12 6 170', '13/6 4-8 28 8 290', '12/16 7-10 48 5 430', '16/12 12-16 55 7 520', '19/17 20-28 115 11 1500', '26/22 50-60 270 15 4400+3']);
    expect(creature('shieldmaiden3').cleave).toBe(true);
    expect(creature('dwarf3').shieldWall).toBe(true);
    expect(creature('warBoar3').guardian).toBe(true);
    expect(creature('valkyrie3').morale).toBe(1);
    expect(creature('dragon3').noRetaliation).toBe(true);
    expect(creature('hunter2').shots).toBe(16);
    expect(creature('hunter3').shots).toBe(20);
  });

  it('adds the north’s neutrals, without ranks; the winter wolf has the wolf’s numbers', () => {
    const NEUTRALS = ['troll', 'frostGiant', 'skoll', 'draugr', 'barrowKing', 'wolfWinter'] as const;
    for (const id of NEUTRALS) expect(creature(id)).toMatchObject({ faction: 'neutral' });
    expect(NEUTRALS.every((id) => !creature(id).line && lineUnits(id).length === 1)).toBe(true);
    const { id: _a, name: _b, plural: _c, ...wolf } = creature('wolf');
    const { id: _d, name: _e, plural: _f, ...winter } = creature('wolfWinter');
    expect(winter).toEqual(wolf);
    expect(creature('troll')).toMatchObject({ level: 5, attack: 13, defense: 9, hp: 45, speed: 4, regen: 5 });
    expect(creature('barrowKing')).toMatchObject({ undead: true, curse: 0.25 });
    expect(creature('frostGiant')).toMatchObject({ level: 6, wide: true, guardian: true, hp: 130 });
    expect(creature('skoll')).toMatchObject({ level: 7, hexes: 3, cleave: true, hp: 240 });
    expect(creature('draugr')).toMatchObject({ undead: true, speed: 3 });
  });

  it('builds the one tree under Norse names, its dwellings hiring the Norse in their own order, with a Mead Hall of its own', () => {
    expect(TOWN_FACTIONS).toEqual(['crown', 'kemet', 'norse']);
    expect(buildingOf('norse', 'guardhouse')).toMatchObject({ name: 'Longhouse', dwelling: 'shieldmaiden' });
    expect(buildingOf('norse', 'seraphSpire3')).toMatchObject({ name: 'Root of Yggdrasil', dwelling: 'dragon3' });
    expect(buildingOf('norse', 'mageGuild1').name).toBe('Hof');
    expect(buildingOf('norse', 'blacksmith').name).toBe('Shipwright');
    expect(buildingOf('norse', 'stables').name).toBe('Ski Track');
    expect(dwellingOf('norse', 'monastery2')).toBe('warBoar2');
    expect(buildingOf('norse', 'griffinTower').needs).toEqual(['guardhouse']);
    expect(buildingOf('norse', 'tiltyard').needs).toEqual(['monastery', 'meadHall']);
    expect(buildsAt('norse', 'meadHall')).toBe(true);
    expect(buildsAt('kemet', 'meadHall') || buildsAt('crown', 'meadHall')).toBe(false);
    expect(buildsAt('norse', 'templeOsiris')).toBe(false);
    expect(BUILD_PLANS.norse).toContain('meadHall');
    expect(new Set(BUILD_PLANS.norse)).toEqual(new Set(buildingIdsOf('norse')));
    expect(FACTIONS.norse).toMatchObject({ school: 'runes', book: 'noviceRuneStaff', siege: { item: 'ram' } });
    // Everything built, a Norse town hires its seven lines (to Rare) and has its Mead Hall.
    const town: Town = buildAll({ ...startAdventure(OTHRYS).towns[0]!, faction: 'norse', built: ['villageHall'], builtToday: false }, []);
    expect(dwellings(town)).toEqual(['shieldmaiden', 'hunter', 'berserker', 'dwarf', 'warBoar', 'valkyrie', 'dragon']);
    expect(town.built).toContain('meadHall');
    expect(meadIn(town)).toBe(1);
  });
});

describe('rage', () => {
  it('+1 Attack a tenth of the stack lost, to +10; double (to +20) from the Berserker of Odin up', () => {
    const st = fieldOf([['berserker', 10, hexAt(2, 5)], ['berserker3', 10, hexAt(2, 7)]], [['spearman', 10, hexAt(12, 5)]], 0);
    const at = (id: number, count: number): Stack => ({ ...stackById(st, id), count });
    expect([10, 9, 7, 1].map((n) => rageOf(at(0, n)))).toEqual([0, 1, 3, 9]);
    expect([10, 9, 7, 1].map((n) => rageOf(at(1, n)))).toEqual([0, 2, 6, 18]);
    expect(rageOf({ ...at(0, 1), startCount: 100 })).toBe(9);
    expect(attackOf(st, at(0, 7), true)).toBe(creature('berserker').attack + 3);
    // Shieldmaidens don't rage.
    expect(rageOf({ ...stackById(fieldOf([['shieldmaiden', 10, hexAt(2, 5)]], [['spearman', 10, hexAt(12, 5)]], 0), 0), count: 2 })).toBe(0);
  });

  it('shows in the blow: a bled company hits harder', () => {
    const st = fieldOf([['berserker', 10, hexAt(5, 5)]], [['dwarf', 30, hexAt(6, 5)]], 0);
    const fresh = act(st, { type: 'attack', target: 1, from: hexAt(5, 5) });
    const bled = act(withStack(st, 0, (x) => ({ ...x, count: 5 })), { type: 'attack', target: 1, from: hexAt(5, 5) });
    const first = (e: readonly BattleEvent[]) => ofType(e, 'strike')[0]!.damage;
    // Half the company does more than half the fresh company's damage: +5 Attack.
    expect(first(bled.events)).toBeGreaterThan(first(fresh.events) / 2);
  });
});

describe('breath', () => {
  it('a strike also burns the enemy in the hex behind the target, never a friend', () => {
    // The dragon (wide, its head at 4,5, its tail at 3,5) strikes the shieldmaidens at 5,5; the dwarves stand behind them at 6,5.
    const st = fieldOf([['dragon', 2, hexAt(4, 5)]], [['shieldmaiden', 20, hexAt(5, 5)], ['dwarf', 10, hexAt(6, 5)], ['hunter', 10, hexAt(6, 3)]], 0);
    expect(breathOn(st, stackById(st, 0), stackById(st, 1), hexAt(4, 5))?.id).toBe(2);
    const { events, state } = act(st, { type: 'attack', target: 1, from: hexAt(4, 5) });
    const burn = ofType(events, 'breath');
    expect(burn).toHaveLength(1);
    expect(burn[0]).toMatchObject({ stack: 0, target: 2 });
    expect(stackById(state, 2).count).toBeLessThan(10);
    // The burnt company doesn't answer; only the struck one does (the dragon's own retaliation).
    expect(ofType(events, 'strike').filter((e) => e.retaliation).map((e) => e.stack)).toEqual([1]);
    // A friend behind the target is spared.
    const friend = fieldOf([['dragon', 2, hexAt(4, 5)], ['shieldmaiden', 10, hexAt(6, 5)]], [['spearman', 20, hexAt(5, 5)]], 0);
    expect(breathOn(friend, stackById(friend, 0), stackById(friend, 2), hexAt(4, 5))).toBeUndefined();
  });

  it('passes through a wide target to the hex beyond it, and works from a wide breather striking on a slant', () => {
    // A War Boar (side 1, wide: 5,5 and 6,5) with a dwarf behind it at 7,5.
    const wide = fieldOf([['dragon', 2, hexAt(4, 5)]], [['warBoar', 4, hexAt(5, 5)], ['dwarf', 10, hexAt(7, 5)]], 0);
    expect(breathOn(wide, stackById(wide, 0), stackById(wide, 1), hexAt(4, 5))?.id).toBe(2);
    // On a slant: the dragon below-left of the target (4,6 to 4,5 on the staggered rows); the line runs on up-right, to 5,4.
    const slant = fieldOf([['dragon', 2, hexAt(4, 6)]], [['spearman', 10, hexAt(4, 5)], ['dwarf', 10, hexAt(5, 4)]], 0);
    expect(breathOn(slant, stackById(slant, 0), stackById(slant, 1), hexAt(4, 6))?.id).toBe(2);
    // Nobody behind: nothing more.
    const alone = fieldOf([['dragon', 2, hexAt(4, 5)]], [['spearman', 10, hexAt(5, 5)]], 0);
    expect(ofType(act(alone, { type: 'attack', target: 1, from: hexAt(4, 5) }).events, 'breath')).toEqual([]);
  });
});

describe('shoots twice, and skis', () => {
  it('the Archer of Ullr shoots twice standing still; a Ski Bowman once', () => {
    const st = fieldOf([['hunter3', 10, hexAt(1, 5)]], [['dwarf', 30, hexAt(12, 5)]], 0);
    const { state, events } = act(st, { type: 'shoot', target: 1 });
    expect(ofType(events, 'strike')).toHaveLength(2);
    expect(stackById(state, 0).shots).toBe(18);
    const once = fieldOf([['hunter2', 10, hexAt(1, 5)]], [['dwarf', 30, hexAt(12, 5)]], 0);
    expect(ofType(act(once, { type: 'shoot', target: 1 }).events, 'strike')).toHaveLength(1);
  });

  it('on snow: +2 Speed, and a skier beside an enemy may glide off and shoot in the same turn, once', () => {
    const left: Placed[] = [['hunter3', 10, hexAt(4, 5)]];
    const right: Placed[] = [['spearman', 10, hexAt(5, 5)], ['dwarf', 10, hexAt(13, 9)]];
    const snow = fieldOf(left, right, 0, { field: { snow: true } });
    expect(snow.snow).toBe(true);
    expect(stackById(snow, 0).skiing).toBe(true);
    expect(speedOf(stackById(snow, 0))).toBe(creature('hunter3').speed + 2);
    // Glide two hexes back: the turn waits for the shot.
    const moved = act(snow, { type: 'move', to: hexAt(2, 5), hold: true });
    expect(moved.state.held?.stack).toBe(0);
    const shot = act(moved.state, { type: 'shoot', target: 1 });
    expect(ofType(shot.events, 'strike')).toHaveLength(1);
    expect(stackById(shot.state, 0).shots).toBe(19);
    expect(activeStack(shot.state)?.id).not.toBe(0);
    // The AI does it itself: glides clear, then shoots.
    const ai = chooseAction(snow);
    expect(ai).toMatchObject({ type: 'move', hold: true });
    const after = act(snow, ai);
    expect(chooseAction(after.state)).toMatchObject({ type: 'shoot' });
  });

  it('off snow, a skier is an ordinary shooter: table speed, and a move ends its turn', () => {
    const grass = fieldOf([['hunter3', 10, hexAt(4, 5)]], [['spearman', 10, hexAt(5, 5)], ['dwarf', 10, hexAt(13, 9)]], 0);
    expect(stackById(grass, 0).skiing).toBeUndefined();
    expect(speedOf(stackById(grass, 0))).toBe(creature('hunter3').speed);
    const moved = act(grass, { type: 'move', to: hexAt(2, 5), hold: true });
    expect(moved.state.held).toBeUndefined();
    expect(() => act({ ...moved.state, active: 0 }, { type: 'shoot', target: 1 })).not.toThrow();
    // A base Hunter has no skis, even on snow.
    expect(stackById(fieldOf([['hunter', 10, hexAt(1, 5)]], [['spearman', 1, hexAt(12, 5)]], 0, { field: { snow: true } }), 0).skiing).toBeUndefined();
  });

  it('draws a skier on foot off snow (`<id>Foot`), once that art is in; the ski picture until then', () => {
    expect(battleArtId('hunter2', 'snow')).toBe('hunter2');
    expect(battleArtId('hunter2', 'grass')).toBe(UNIT_ART.hunter2Foot ? 'hunter2Foot' : 'hunter2');
    expect(battleArtId('spearman', 'grass')).toBe('spearman');
    expect(battleArtId('hunter', 'grass')).toBe('hunter');
    // The War Boar's line, drawn as `warboar` and `boar2`…`boar5`, finds its art under those ids once in (never the Erymanthian Boar's own).
    if (UNIT_ART.boar2) expect(figureArt('warBoar2').url.idle).toBe(UNIT_ART.boar2.url.idle);
    // Every Norse and northern art id has a picture, its own or a stand-in's, so nothing is missing while the art lands.
    for (const id of CREATURE_IDS.filter((c) => creature(c).faction === 'norse' || ['troll', 'frostGiant', 'skoll', 'draugr', 'barrowKing', 'wolfWinter', 'ram', 'ram2', 'ram3'].includes(c))) {
      expect(figureArt(id).url.idle, id).toBeTruthy();
    }
  });
});

describe('Rune Magic', () => {
  const runeField = (spec?: BattleHero['specialty']): BattleState =>
    fieldOf([['berserker', 10, hexAt(5, 5)], ['dwarf', 10, hexAt(2, 8)]], [['spearman', 30, hexAt(6, 5)], ['wolf', 10, hexAt(12, 2)]], 0, { hero: { ...RUNE_HERO, ...(spec ? { specialty: spec } : {}) } });

  it('is the Norse divine school, three runes, each with its god or its ice', () => {
    expect(SCHOOLS.map((s) => s.id)).toContain('runes');
    expect((['tiwaz', 'isa', 'thurisaz'] as const).map((id) => [SPELLS[id].school, SPELLS[id].level, SPELLS[id].mana])).toEqual([['runes', 1, 6], ['runes', 1, 6], ['runes', 2, 10]]);
  });

  it('Tiwaz: +2 Attack for the battle, +1 each time the stack loses creatures, to +6 (higher for a Tiwaz specialist)', () => {
    const cast = castSpell(runeField(), 0, 'tiwaz', 0).state;
    const rune = () => (s: BattleState) => stackById(s, 0).effects.find((e) => e.kind === 'tiwaz');
    expect(rune()(cast)).toMatchObject({ bonus: 2, cap: 6 });
    expect(attackOf(cast, stackById(cast, 0), true)).toBe(creature('berserker').attack + 2);
    let s = cast;
    for (let i = 0; i < 6; i++) s = wound(s, 0, creature('berserker').hp, []).state;
    expect(rune()(s)?.bonus).toBe(6);
    // It never wears off with the rounds.
    const later = { ...s, stacks: s.stacks.map((x) => ({ ...x, acted: true })) };
    expect(rune()(act({ ...later, active: 0, stacks: later.stacks.map((x) => (x.id === 0 ? { ...x, acted: false } : x)) }, { type: 'defend' }).state)).toBeDefined();
    const thorbjorg = castSpell(runeField({ kind: 'spell', spell: 'tiwaz', level: 10 }), 0, 'tiwaz', 0).state;
    expect(rune()(thorbjorg)?.cap).toBe(8);
  });

  it('Isa: the enemy can’t answer strikes, for Spell Power rounds (a round more per 5 levels for an Isa specialist)', () => {
    const iced = castSpell(runeField(), 0, 'isa', 2).state;
    const ice = stackById(iced, 2).effects.find((e) => e.kind === 'isa');
    expect(ice?.rounds).toBe(RUNE_HERO.power);
    expect(answers(stackById(iced, 0), stackById(iced, 2))).toBe(false);
    const { events } = act(iced, { type: 'attack', target: 2, from: hexAt(5, 5) });
    expect(ofType(events, 'strike').filter((e) => e.retaliation)).toEqual([]);
    expect(extraRounds({ kind: 'spell', spell: 'isa', level: 10 }, 'isa')).toBe(2);
    expect(stackById(castSpell(runeField({ kind: 'spell', spell: 'isa', level: 10 }), 0, 'isa', 2).state, 2).effects.find((e) => e.kind === 'isa')?.rounds).toBe(4);
  });

  it('Thurisaz: each melee strike on its stack brings 5 × SP + 10 lightning down on the striker (half as much again for Heid)', () => {
    const carved = castSpell(runeField(), 0, 'thurisaz', 0).state;
    expect(spellAmount(carved, 0, 'thurisaz')).toBe(5 * RUNE_HERO.power + 10);
    // The hoplites strike the berserkers: lightning falls on the hoplites, and again when the berserkers' answer... is struck at no one.
    const theirs = { ...carved, active: 2 };
    const { events } = act(theirs, { type: 'attack', target: 0, from: hexAt(6, 5) });
    const bolts = ofType(events, 'lightning');
    expect(bolts).toHaveLength(1);
    expect(bolts[0]).toMatchObject({ stack: 0, target: 2, damage: 20 });
    // The berserkers striking, and the hoplites answering: the answer is a melee strike on the rune's stack too.
    const ours = act(carved, { type: 'attack', target: 2, from: hexAt(5, 5) });
    expect(ofType(ours.events, 'lightning').map((e) => e.target)).toEqual([2]);
    const heid = castSpell(runeField({ kind: 'spell', spell: 'thurisaz', level: 1 }), 0, 'thurisaz', 0).state;
    expect(stackById(heid, 0).effects.find((e) => e.kind === 'thurisaz')?.dose).toBe(30);
    expect(specialtyText({ kind: 'spell', spell: 'thurisaz' }, (s) => SPELLS[s].name)).toMatch(/50% harder/);
  });

  it('a stack bears one rune: a new one replaces the old', () => {
    const one = castSpell(runeField(), 0, 'tiwaz', 0).state;
    const two = castSpell({ ...one, cast: [false, false] }, 0, 'thurisaz', 0).state;
    expect(stackById(two, 0).effects.map((e) => e.kind)).toEqual(['thurisaz']);
    // Other spells stand beside a rune.
    const blessed = withStack(two, 0, (x) => ({ ...x, effects: [...x.effects, { kind: 'haste', rounds: 2 }] }));
    const three = castSpell({ ...blessed, cast: [false, false] }, 0, 'tiwaz', 0).state;
    expect(stackById(three, 0).effects.map((e) => e.kind).sort()).toEqual(['haste', 'tiwaz']);
  });

  it('the AI casts runes in its battles (and so does Auto), and never carves over a rune', () => {
    const cast = bestCast(runeField(), 0);
    expect(cast).not.toBeNull();
    expect(['tiwaz', 'isa', 'thurisaz']).toContain(cast!.action.spell);
    const tiwazOnly = { ...runeField(), heroes: [{ ...RUNE_HERO, spells: ['tiwaz'] }, null] } as BattleState;
    const carved = castSpell(tiwazOnly, 0, 'tiwaz', 0).state;
    const again = bestCast({ ...carved, cast: [false, false] }, 0);
    expect(again?.action.target).not.toBe(0);
  });
});

describe('the battering ram', () => {
  const HERO: BattleHero = { name: 'Eirik', attack: 0, defense: 0, power: 1, mana: 0, spells: [], skills: {}, morale: 0, luck: 0, faction: 'norse' };
  const siege = (machine: BattleSide['machine'], fort = fortification(['fort', 'citadel'])!): BattleState =>
    createBattle({ hero: HERO, army: armyOf([{ creature: 'shieldmaiden', count: 30 }, { creature: 'berserker', count: 10 }]), machine }, { hero: null, army: armyOf([{ creature: 'raider', count: 8 }]) }, 3, { fort, me: 0 }).state;
  /** Everyone defends until round `n` begins; the ram's work lands in the events. */
  const untilRound = (st: BattleState, n: number): { state: BattleState; events: BattleEvent[] } => {
    let s = st;
    const events: BattleEvent[] = [];
    while (s.round < n && s.winner === null) {
      const step = act(s, { type: 'defend' });
      s = step.state;
      events.push(...step.events);
    }
    return { state: s, events };
  };

  it('is three grades: the Shipwright sells the Ram from part 3 and the Iron Ram from part 4; the Ram of the Sea-Kings is a prize', () => {
    expect(['ram', 'ram2', 'ram3'].map((id) => creature(id as CreatureId).ram)).toEqual([{ round: 3 }, { round: 2 }, { round: 2, towers: true }]);
    expect([creature('ram').cost.gold, creature('ram2').cost.gold]).toEqual([1500, 3000]);
    expect([soldOn(9), soldOn(10), soldOn(11), soldOn(12)]).toEqual([[], [], ['ram'], ['ram', 'ram2']]);
    // The other chapters' sales are as they were.
    expect([soldOn(2), soldOn(6), soldOn(7)]).toEqual([['catapult'], ['ramp'], ['ramp', 'ramp2']]);
    expect(itemSays('ram')).toMatch(/gate at the end of round 3/);
    expect(itemSays('ram3')).toMatch(/wall beside it/);
  });

  it('the gate falls at the end of round 3 (the Iron Ram’s at the end of round 2), and the ram can’t be hit', () => {
    const st = siege('ram');
    const ram = st.stacks.find((s) => s.creature === 'ram')!;
    expect(ram.side).toBe(0);
    const r3 = untilRound(st, 3);
    expect(standing(r3.state.siege!, 'gate')).toBe(true);
    const r4 = untilRound(r3.state, 4);
    expect(standing(r4.state.siege!, 'gate')).toBe(false);
    expect(ofType(r4.events, 'ram')).toEqual([{ type: 'ram', stack: ram.id, parts: ['gate'] }]);
    // The walls beside the gate stand.
    expect(standing(r4.state.siege!, 'wallGateNorth') && standing(r4.state.siege!, 'wallGateSouth')).toBe(true);
    const iron = untilRound(siege('ram2'), 3);
    expect(standing(iron.state.siege!, 'gate')).toBe(false);
    expect(chooseAction({ ...st, active: ram.id })).toEqual({ type: 'defend' });
  });

  it('the Ram of the Sea-Kings breaks the gate at the end of round 2 and cracks the wall beside it', () => {
    const { state, events } = untilRound(siege('ram3'), 3);
    expect(['gate', 'wallGateNorth', 'wallGateSouth'].map((p) => standing(state.siege!, p as 'gate'))).toEqual([false, false, false]);
    expect(ofType(events, 'ram')[0]!.parts).toEqual(['gate', 'wallGateNorth', 'wallGateSouth']);
    expect(standing(state.siege!, 'wallNorth')).toBe(true);
  });

  it('a siege AI with a ram waits for the gate, never bashes it, then goes through', () => {
    let s = siege('ram');
    const bashed: string[] = [];
    let inside = false;
    for (let i = 0; i < 400 && s.winner === null; i++) {
      const me = activeStack(s)!;
      const a = chooseAction(s);
      if (a.type === 'bash' && a.part === 'gate') bashed.push(`${s.round}`);
      s = act(s, a).state;
      if (s.stacks.some((x) => x.side === 0 && x.count > 0 && !creature(x.creature).machine && [PART_HEX.gate].includes(x.hex))) inside = true;
      if (me.side === 0 && s.round > 3 && s.stacks.some((x) => x.side === 0 && x.count > 0 && x.hex % 15 >= 10 && !creature(x.creature).machine)) inside = true;
    }
    expect(bashed).toEqual([]);
    expect(inside).toBe(true);
    expect(s.winner).toBe(0);
  });
});

describe('the Mead Hall', () => {
  const norseAshford = (): { def: MapDef; adv: Adventure } => {
    const def = { ...ASHFORD, hero: { ...ASHFORD.hero, faction: 'norse' as const } };
    const start = startAdventure(def);
    const town = playerTowns(start)[0]!;
    const adv = withTown({ ...start, prompts: [], hero: { ...start.hero, x: town.x, y: town.y } }, { ...town, faction: 'norse', built: [...town.built, 'meadHall'] });
    return { def, adv };
  };

  it('a night in town with a Mead Hall: +1 morale until the end of the next battle', () => {
    const { def, adv } = norseAshford();
    const night = endDay(adv, def);
    expect(night.hero.mead).toBe(1);
    expect(heroSide(night.hero).hero!.morale).toBe(toBattleHero(adv.hero).morale + 1);
    // Kept in the save.
    expect(parseAdventure(JSON.parse(JSON.stringify(night)), def)!.hero.mead).toBe(1);
    // Spent in the next battle, won or lost.
    const monster = night.objects.find((o) => o.kind === 'monster' && !o.gone)!;
    const fought = createBattle(heroSide(night.hero), { hero: null, army: armyOf([{ creature: monster.creature!, count: 1 }]) }, 1).state;
    const after = afterBattle(night, def, monster.id, conquer(fought));
    expect(after.hero.mead).toBeUndefined();
    // No Mead Hall (or another people's town): nothing.
    const plain = endDay({ ...adv, towns: adv.towns.map((t) => ({ ...t, built: t.built.filter((b) => b !== 'meadHall') })) }, def);
    expect(plain.hero.mead).toBeUndefined();
    expect(BUILDINGS.meadHall).toMatchObject({ only: 'norse', needs: ['villageHall'] });
  });
});

describe('the snow rule', () => {
  it('a Norse hero crosses snow as grass; anyone else pays snow’s cost', () => {
    const grid = parseGrid(['nnn', 'ggg']);
    const view = { grid, solid: new Set<number>(), stopAt: new Set<number>(), pathfinding: 0 };
    expect(stepCost(view, { x: 0, y: 0 }, { x: 1, y: 0 })).toBe(150);
    expect(stepCost({ ...view, snowWalker: true }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBe(100);
    expect(stepCost({ ...view, snowWalker: true }, { x: 0, y: 1 }, { x: 1, y: 1 })).toBe(100);
    const adv = startAdventure(ASHFORD);
    expect(terrainView(adv, ASHFORD).snowWalker).toBeUndefined();
    expect(terrainView({ ...adv, hero: { ...adv.hero, faction: 'norse' } }, ASHFORD).snowWalker).toBe(true);
  });
});

describe('the Norse heroes', () => {
  it('ten, five Knights and five Clerics, each with a specialty, Hervor first and without a rune staff', () => {
    const norse = rosterOf('norse');
    expect(norse.map((h) => h.id)).toEqual(['hervor', 'eirik', 'einar', 'sigurd', 'harald', 'heid', 'gunnhild', 'thorbjorg', 'brynhild', 'egil']);
    expect(norse.filter((h) => h.heroClass === 'knight')).toHaveLength(5);
    expect(norse.every((h) => h.faction === 'norse' && !!h.specialty)).toBe(true);
    expect(rosterHero('hervor')).toMatchObject({ specialty: { kind: 'line', line: 'berserker' }, spells: [] });
    expect(rosterHero('hervor')!.gear?.book).toBeUndefined();
    expect(rosterHero('harald')!.specialty).toEqual({ kind: 'gold', gold: 350 });
    expect(rosterHero('heid')!.specialty).toEqual({ kind: 'spell', spell: 'thurisaz' });
    expect(rosterHero('gunnhild')!.specialty).toEqual({ kind: 'spell', spell: 'isa' });
    expect(rosterHero('thorbjorg')!.specialty).toEqual({ kind: 'spell', spell: 'tiwaz' });
    expect(rosterHero('egil')!.specialty).toEqual({ kind: 'line', line: 'warBoar' });
    // Every Cleric who knows a rune carries the staff to cast it with.
    for (const h of norse.filter((x) => x.spells.length)) expect(h.gear?.book, h.id).toBe('noviceRuneStaff');
  });

  it("never offers the story villains (Eirik, Gunnhild) at the player's Taverns on a chapter 3 map", () => {
    const base = OTHRYS;
    const def: MapDef = { ...base, id: 'norse-test', n: 9, rival: undefined, recruits: undefined, hero: { ...base.hero, faction: 'norse' }, towns: (base.towns ?? []).map((t) => ({ ...t, faction: 'norse' as const })) };
    installPaidMaps([def]);
    expect(partsOf(chapterById('longWinter')).map((m) => m.id)).toEqual(['norse-test']);
    expect([...storyVillains(def)].sort()).toEqual([...NORSE_VILLAINS].sort());
    const a = startAdventure(def);
    const weeks = Array.from({ length: 12 }, (_, i) => ({ ...a, day: 1 + i * 7 }));
    const offered = weeks.flatMap((w) => playerTowns(w).filter((t) => t.built.includes('tavern')).flatMap((t) => tavernHeroes(w, def, t).map((h) => h.id)));
    expect(offered.length).toBeGreaterThan(0);
    expect(offered.some((id) => NORSE_VILLAINS.includes(id))).toBe(false);
    installPaidMaps([]);
  });
});

describe("chapter 3's skeleton", () => {
  it('is a paid chapter of its own, parts 9 to 12, its own save slot, part 1 (Hlaðir) built', () => {
    const c = chapterById('longWinter');
    expect(c).toMatchObject({ n: 3, name: 'The Long Winter', first: 9, last: 12, paid: true, slot: 'longWinter', parts: [{ id: 'hladir', n: 9, name: 'Hlaðir' }] });
    expect(comingSoon(c)).toBe(false);
    expect(comingSoon(chapterById('twoLands'))).toBe(false);
    expect(c.planned!.map((p) => p.name)).toEqual(['Hlaðir', 'Uppsala', 'The Bloodaxe', 'Hálogaland']);
    expect(c.teaser).toMatch(/^sails north to the Norse kingdoms/);
    expect(new Set(CHAPTERS.map((x) => x.slot)).size).toBe(CHAPTERS.length);
    // Part 1 opens the halls, walls, Tavern, Mead Hall and lines 1–4, no Hof; part 2 the Hof and line 5.
    expect([...openIn(LONG_WINTER_UNLOCKS, 1)].sort()).toEqual(['archeryRange', 'barracks', 'citadel', 'fort', 'griffinTower', 'guardhouse', 'meadHall', 'tavern', 'townHall', 'villageHall']);
    expect(openIn(LONG_WINTER_UNLOCKS, 2).has('mageGuild1') && openIn(LONG_WINTER_UNLOCKS, 2).has('monastery')).toBe(true);
    expect(openIn(LONG_WINTER_UNLOCKS, 4).size).toBe(buildingIdsOf('norse').length);
  });
});
