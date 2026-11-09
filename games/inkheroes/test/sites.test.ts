import { describe, expect, it } from 'vitest';
import { OTHRYS } from '../src/level/borderMarch';
import { answerPrompt, endDay, startAdventure, stepHero, type Adventure } from '../src/logic/adventure';
import { armyOf, armySize } from '../src/logic/army';
import { act, createBattle, stackById, type BattleSide } from '../src/logic/battle';
import type { BattleState, Stack } from '../src/logic/battleTypes';
import { creature, type CreatureId } from '../src/logic/creatures';
import { damageRange } from '../src/logic/damage';
import { dwellingStock, growDwellings, hireAtDwelling } from '../src/logic/dwellings';
import { hexAt, neighbours, type Hex } from '../src/logic/hex';
import { intentAt } from '../src/logic/mapIntent';
import type { MapObject } from '../src/logic/objects';
import { purse } from '../src/logic/resources';
import { loadAdventure, saveAdventure } from '../src/logic/save';
import { visitSite } from '../src/logic/visits';
import { newTraits } from '../src/scenes/battle/unitCard';
import { mapById } from '../src/level/maps';

/** Othrys played fresh, the hero standing at (x, y), with these objects only (the rest of the map gone) and a rich purse. */
function at(x: number, y: number, objects: readonly MapObject[]): Adventure {
  const adv = startAdventure(OTHRYS);
  const keep = new Set(objects.map((o) => o.id));
  return {
    ...adv, prompts: [], purse: purse({ gold: 1e6, gems: 99 }), hero: { ...adv.hero, x, y, mp: 5000 },
    objects: [...adv.objects.filter((o) => !keep.has(o.id)).map((o) => ({ ...o, gone: true })), ...objects],
    explored: '1'.repeat(adv.explored.length),
  };
}
const obj = (adv: Adventure, id: string): MapObject => adv.objects.find((o) => o.id === id)!;
const memoryStore = (): { getItem(k: string): string | null; setItem(k: string, v: string): void } => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};
const roundTrip = (adv: Adventure): Adventure => {
  const store = memoryStore();
  saveAdventure(store, { current: adv, dayStart: adv });
  return loadAdventure(store, (id) => mapById(id))!.current;
};

// A clear patch of the plain (tiles from Othrys's land, east of x 72): the hero west of each site.
const X = 72 + 8;
const Y = 26;
const cave: MapObject = { id: 'cyclops-cave', kind: 'dwelling', x: X + 1, y: Y, look: 'cyclopsCave', creature: 'ogre', growth: 3, stock: 3, owner: 'neutral' };

describe('outer dwellings', () => {
  it('fly our flag once visited and offer what waits there, hired at the creature’s price into the hero’s army', () => {
    const adv = at(X, Y, [cave]);
    const seen = visitSite(adv, obj(adv, 'cyclops-cave')).adv;
    expect(obj(seen, 'cyclops-cave').owner).toBe('player');
    expect(seen.prompts.at(-1)).toMatchObject({ kind: 'dwelling', id: 'cyclops-cave' });
    const hired = answerPrompt(seen, 'hire');
    expect(obj(hired, 'cyclops-cave').stock).toBe(0);
    expect(hired.hero.army.find((s) => s?.creature === 'ogre')?.count).toBe(3);
    expect(hired.purse.gold).toBe(adv.purse.gold - 3 * creature('ogre').cost.gold!);
  });

  it('can be left: Leave hires nothing', () => {
    const adv = visitSite(at(X, Y, [cave]), cave).adv;
    const left = answerPrompt(adv);
    expect(obj(left, 'cyclops-cave').stock).toBe(3);
    expect(armySize(left.hero.army)).toBe(armySize(adv.hero.army));
  });

  it('hire no more than the purse pays for, nor into an army with no room', () => {
    const one = hireAtDwelling(cave, purse({ gold: 450 }), armyOf([]));
    expect(one.hired).toBe(1);
    const full = armyOf(['spearman', 'bowman', 'griffin', 'swordsman', 'monk', 'lancer', 'seraph'].map((c) => ({ creature: c as CreatureId, count: 1 })));
    expect(hireAtDwelling(cave, purse({ gold: 1e5 }), full).hired).toBe(0);
  });

  it('fill each Monday with their growth while flagged; a neutral one waits as it is', () => {
    const mine = { ...cave, owner: 'player' as const, stock: 1 };
    expect(growDwellings([mine, cave]).map(dwellingStock)).toEqual([4, 3]);
    // Day 7 to day 8: a new week.
    let adv = { ...at(X, Y, [mine]), day: 7 };
    adv = endDay(adv, OTHRYS);
    expect(obj(adv, 'cyclops-cave').stock).toBe(4);
  });

  it('are guarded by the monster beside them: the guard is fought first, and the tap reads as a fight', () => {
    const guard: MapObject = { id: 'cave-cyclopes', kind: 'monster', x: X + 2, y: Y + 1, creature: 'ogre', count: 20 };
    const adv = at(X, Y, [cave, guard]);
    expect(intentAt(adv, OTHRYS, X + 1, Y)).toBe('attack');
    const step = stepHero(adv, OTHRYS, { x: X + 1, y: Y, cost: 100, day: 0 } as never, { x: X + 1, y: Y });
    expect(step.battle).toBe('cave-cyclopes');
    expect(step.then).toBe('cyclops-cave');
    expect(intentAt(at(X, Y, [cave]), OTHRYS, X + 1, Y)).toBe('visit');
  });

  it('are taken back from the rival like mines', () => {
    const his = { ...cave, owner: 'rival' as const, stock: 0 };
    const adv = visitSite(at(X, Y, [his]), his).adv;
    expect(obj(adv, 'cyclops-cave').owner).toBe('player');
    // Nothing waits: a note, no hire card.
    expect(adv.prompts.at(-1)?.kind).toBe('message');
  });

  it('keep their flag, stock and an open hire card through a save', () => {
    const adv = visitSite(at(X, Y, [cave]), cave).adv;
    const back = roundTrip({ ...adv, objects: adv.objects.map((o) => (o.id === cave.id ? { ...o, stock: 2 } : o)) });
    expect(obj(back, 'cyclops-cave')).toMatchObject({ owner: 'player', stock: 2 });
    expect(back.prompts.at(-1)).toMatchObject({ kind: 'dwelling', id: 'cyclops-cave' });
  });
});

describe('learning stones', () => {
  const stone: MapObject = { id: 'stone-plain-x', kind: 'learningStone', x: X + 1, y: Y };
  it('give each hero 1000 experience, once', () => {
    const adv = at(X, Y, [stone]);
    const once = visitSite(adv, stone).adv;
    expect(once.hero.xp).toBe(adv.hero.xp + 1000);
    expect(obj(once, stone.id).visitedBy).toEqual(['rowan']);
    const twice = visitSite(once, obj(once, stone.id)).adv;
    expect(twice.hero.xp).toBe(once.hero.xp);
    // Another hero reads it too.
    const ianthe = visitSite({ ...once, hero: { ...once.hero, id: 'ianthe' } }, obj(once, stone.id)).adv;
    expect(ianthe.hero.xp).toBe(once.hero.xp + 1000);
  });

  it('remember who read them through a save', () => {
    const once = visitSite(at(X, Y, [stone]), stone).adv;
    // The test stone isn't the map's: save with the map's own stone read instead.
    const real = OTHRYS.objects.find((o) => o.kind === 'learningStone')!;
    const adv = { ...once, objects: once.objects.map((o) => (o.id === real.id ? { ...o, gone: false, visitedBy: ['rowan'] } : o)) };
    expect(obj(roundTrip(adv), real.id).visitedBy).toEqual(['rowan']);
  });
});

describe('the treasure keep', () => {
  const keep: MapObject = { id: 'treasure-keep', kind: 'bank', x: X + 1, y: Y, look: 'keep', prize: { gold: 6000, crystal: 4 }, item: 'alexandrianCodex' };
  it('gives its prize and its piece of gear once', () => {
    const adv = at(X, Y, [keep]);
    const looted = visitSite(adv, keep).adv;
    expect(looted.purse.gold).toBe(adv.purse.gold + 6000);
    expect(looted.purse.crystal).toBe(adv.purse.crystal + 4);
    expect(obj(looted, keep.id).looted).toBe(true);
    const again = visitSite(looted, obj(looted, keep.id)).adv;
    expect(again.purse).toEqual(looted.purse);
  });

  it('keeps the piece for later when the bag is full, but pays out its gold only once', () => {
    const adv = at(X, Y, [keep]);
    const full = { ...adv, hero: { ...adv.hero, gear: { ...adv.hero.gear, book: 'noviceSpellbook' as const }, bag: ['bronzeHelm', 'bronzeHelm', 'bronzeHelm', 'bronzeHelm'] as never } };
    const first = visitSite(full, keep).adv;
    expect(obj(first, keep.id).looted).toBeUndefined();
    expect(first.purse.gold).toBe(full.purse.gold + 6000);
    const roomy = { ...first, hero: { ...first.hero, bag: [] } };
    const second = visitSite(roomy, obj(first, keep.id)).adv;
    expect(second.purse.gold).toBe(first.purse.gold);
    expect(obj(second, keep.id).looted).toBe(true);
  });
});

/** A battle with these stacks on these hexes. */
function field(left: readonly (readonly [CreatureId, number, Hex])[], right: readonly (readonly [CreatureId, number, Hex])[]): BattleState {
  const side = (ps: readonly (readonly [CreatureId, number, Hex])[]): BattleSide => ({ hero: null, army: armyOf(ps.map(([c, n]) => ({ creature: c, count: n }))) });
  const { state } = createBattle(side(left), side(right), 7);
  const hexes = [...left, ...right].map(([, , h]) => h);
  return { ...state, obstacles: [], stacks: state.stacks.map((s, i) => ({ ...s, hex: hexes[i]! })), active: 0 };
}
const stack = (s: BattleState, id: number): Stack => stackById(s, id);

describe('the third level’s own traits (Othrys)', () => {
  it('Cretan Archers shoot as hard at any range; Peltasts lose half far off', () => {
    const s = field([['bowman3', 10, hexAt(0, 5)], ['bowman2', 10, hexAt(0, 7)]], [['spearman', 50, hexAt(14, 5)]]);
    const far = { ranged: true, distance: 14, moved: 0 };
    const near = { ...far, distance: 3 };
    expect(damageRange(s, stack(s, 0), stack(s, 2), far)).toEqual(damageRange(s, stack(s, 0), stack(s, 2), near));
    expect(damageRange(s, stack(s, 1), stack(s, 2), far).max).toBeLessThan(damageRange(s, stack(s, 1), stack(s, 2), near).max);
    expect(newTraits('bowman2', 'bowman3')).toContain('Shoots as hard at any range');
  });

  it('Cataphracts take half damage from shots, and full from blows', () => {
    const s = field([['bowman', 20, hexAt(0, 5)], ['swordsman', 20, hexAt(0, 8)]], [['lancer3', 5, hexAt(10, 5)], ['lancer2', 5, hexAt(10, 8)]]);
    const shot = { ranged: true, distance: 3, moved: 0 };
    const vsCata = damageRange(s, stack(s, 0), stack(s, 2), shot);
    const vsRoyal = damageRange(s, stack(s, 0), stack(s, 3), shot);
    // Defense differs too (18 against 16): the shield's half is on top of it.
    expect(vsCata.max).toBeLessThanOrEqual(Math.ceil(vsRoyal.max / 2));
    const blow = { ranged: false, distance: 0, moved: 0 };
    // A Minotaur's blow: only the two points of Defense between them.
    expect(damageRange(s, stack(s, 1), stack(s, 2), blow).max).toBeGreaterThan(0.75 * damageRange(s, stack(s, 1), stack(s, 3), blow).max);
    expect(newTraits('lancer2', 'lancer3')).toContain('Shield wall: shots against it do half');
  });

  it('a Titan Lord strikes every enemy beside it; an Elder Titan only its target', () => {
    const at0 = hexAt(6, 5);
    const [e1, e2, e3] = neighbours(at0).filter((h) => h !== hexAt(5, 5));
    const lord = field([['seraph3', 1, at0]], [['spearman', 30, e1!], ['spearman', 30, e2!], ['spearman', 30, e3!]]);
    const struck = act(lord, { type: 'attack', target: 2, from: at0 }).state;
    for (const id of [1, 2, 3]) expect(stack(struck, id).count, `${id}`).toBeLessThan(30);
    const elder = field([['seraph2', 1, at0]], [['spearman', 30, e1!], ['spearman', 30, e2!], ['spearman', 30, e3!]]);
    const one = act(elder, { type: 'attack', target: 2, from: at0 }).state;
    expect([1, 2, 3].filter((id) => stack(one, id).count < 30)).toEqual([2]);
    expect(newTraits('seraph2', 'seraph3')).toContain('Strikes all around it');
    expect(creature('seraph3')).toMatchObject({ flies: true, morale: 1 });
  });

  it('the Gigas throws boulders (4 shots) and strikes as hard hand to hand', () => {
    expect(creature('gigas')).toMatchObject({ faction: 'neutral', level: 7, attack: 19, defense: 16, minDmg: 30, maxDmg: 40, hp: 220, speed: 6, growth: 1, shots: 4, wide: true, cost: { gold: 3500 } });
    const s = field([['gigas', 2, hexAt(5, 5)], ['monk', 2, hexAt(5, 8)]], [['spearman', 50, hexAt(6, 5)]]);
    const blow = { ranged: false, distance: 0, moved: 0 };
    const shot = { ranged: true, distance: 1, moved: 0 };
    expect(damageRange(s, stack(s, 0), stack(s, 2), blow)).toEqual(damageRange(s, stack(s, 0), stack(s, 2), shot));
    // A centaur, a plain shooter, still loses half hand to hand.
    expect(damageRange(s, stack(s, 1), stack(s, 2), blow).max).toBeLessThan(damageRange(s, stack(s, 1), stack(s, 2), shot).max);
  });
});
