import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INKHEROES_PAID_MAPS } from '../content/paid';
import { installPaidMaps, mapById } from '../src/level/maps';
import { DELTA, TWO_LANDS_PARTS } from '../src/level/twoLands';
import { parseMaps } from '../src/level/validate';
import { answerPrompt, startAdventure, type Adventure } from '../src/logic/adventure';
import { armyOf } from '../src/logic/army';
import { act, createBattle, stackById, type BattleSide } from '../src/logic/battle';
import type { BattleEvent, BattleState } from '../src/logic/battleTypes';
import { creature, type CreatureId } from '../src/logic/creatures';
import { dwellingName } from '../src/logic/dwellings';
import { occupiedHexes } from '../src/logic/footprint';
import { hexAt, neighbours, type Hex } from '../src/logic/hex';
import { ITEMS } from '../src/logic/items';
import { bankName, type MapObject } from '../src/logic/objects';
import { purse } from '../src/logic/resources';
import { loadAdventure, saveAdventure } from '../src/logic/save';
import { visitSite } from '../src/logic/visits';
import { armyUnitInfo, newTraits } from '../src/scenes/battle/unitCard';

beforeEach(() => installPaidMaps(TWO_LANDS_PARTS));
afterEach(() => installPaidMaps([]));

/** The Delta played fresh, the hero standing at (x, y), with these objects only (the rest of the map gone) and a rich purse. */
function at(x: number, y: number, objects: readonly MapObject[]): Adventure {
  const adv = startAdventure(DELTA);
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

// A clear patch of the fields (the Delta's tiles start at x 32): the hero west of each site.
const X = 32 + 20;
const Y = 18;
const site = (id: string): MapObject => ({ ...DELTA.objects.find((o) => o.id === id)!, x: X + 1, y: Y });

describe('the Delta’s outer dwellings', () => {
  it('are named on the map, and hire their creature at its price', () => {
    expect(['crocodile-marsh', 'lion-rocks', 'benben-house'].map((id) => dwellingName(site(id)))).toEqual(['Crocodile Marsh', 'Lion Rocks', 'The House of the Benben']);
    const house = site('benben-house');
    const adv = at(X, Y, [house]);
    const hired = answerPrompt(visitSite(adv, house).adv, 'hire');
    expect(obj(hired, 'benben-house')).toMatchObject({ owner: 'player', stock: 0 });
    expect(hired.hero.army.find((s) => s?.creature === 'bennu')?.count).toBe(1);
    // Bennu before the Benben Stone: 3000 gold and a gem.
    expect(adv.purse.gold - hired.purse.gold).toBe(creature('bennu').cost.gold);
    expect(adv.purse.gems - hired.purse.gems).toBe(1);
  });

  it('keep their look through the server’s check and a save', () => {
    const maps = parseMaps(JSON.parse(JSON.stringify(INKHEROES_PAID_MAPS)));
    const delta = maps.find((m) => m.id === 'delta')!;
    expect(delta.objects.filter((o) => o.kind === 'dwelling' || o.kind === 'bank').map((o) => o.look).sort()).toEqual(['benbenHouse', 'crocodileMarsh', 'lionRocks', 'mastaba']);
    const bad = JSON.parse(JSON.stringify(DELTA)) as { objects: Record<string, unknown>[] };
    bad.objects = bad.objects.map((o) => (o.id === 'mastaba' ? { ...o, look: 'pyramid' } : o));
    expect(() => parseMaps([bad])).toThrow();
    const store = memoryStore();
    const adv = visitSite(at(X, Y, [site('crocodile-marsh')]), site('crocodile-marsh')).adv;
    saveAdventure(store, { current: adv, dayStart: adv }, 'twoLands');
    expect(obj(loadAdventure(store, mapById, 'twoLands')!.current, 'crocodile-marsh')).toMatchObject({ owner: 'player', look: 'crocodileMarsh' });
  });
});

describe('the mastaba', () => {
  it('is a treasure keep by another name: its prize and its piece once', () => {
    const tomb = site('mastaba');
    expect(bankName(tomb)).toBe('Mastaba');
    const adv = at(X, Y, [tomb]);
    const looted = visitSite(adv, tomb).adv;
    expect(looted.purse.gold).toBe(adv.purse.gold + tomb.prize!.gold!);
    expect(looted.prompts.at(-1)).toMatchObject({ kind: 'message', title: 'Mastaba', item: 'alexandrianCodex' });
    const again = visitSite(looted, obj(looted, 'mastaba')).adv;
    expect(again.purse).toEqual(looted.purse);
    expect(again.prompts.at(-1)).toMatchObject({ title: 'Mastaba', text: expect.stringMatching(/tomb stands empty/) });
  });
});

describe('Ammit and the Crook and Flail', () => {
  it('Ammit: level 7, three hexes, its strikes never answered', () => {
    expect(creature('ammit')).toMatchObject({ faction: 'neutral', level: 7, attack: 19, defense: 17, minDmg: 30, maxDmg: 40, hp: 220, speed: 7, growth: 1, hexes: 3, noRetaliation: true, cost: { gold: 3500 } });
    expect(armyUnitInfo('ammit', 1).notes).toContain('Strikes are never answered');
  });

  it('the Crook and Flail is Legendary, as the Helm of Kronos', () => {
    expect(ITEMS.crookAndFlail).toMatchObject({ name: 'Crook and Flail', quality: 'gold' });
    expect(ITEMS.kronosHelm.quality).toBe('gold');
  });
});

/** A battle with these stacks on these hexes. */
function field(left: readonly (readonly [CreatureId, number, Hex])[], right: readonly (readonly [CreatureId, number, Hex])[], seed = 7): BattleState {
  const side = (ps: readonly (readonly [CreatureId, number, Hex])[]): BattleSide => ({ hero: null, army: armyOf(ps.map(([c, n]) => ({ creature: c, count: n }))) });
  const { state } = createBattle(side(left), side(right), seed);
  const hexes = [...left, ...right].map(([, , h]) => h);
  return { ...state, obstacles: [], stacks: state.stacks.map((s, i) => ({ ...s, hex: hexes[i]! })), active: 0 };
}
const turned = (events: readonly BattleEvent[], id: number): boolean => events.some((e) => e.type === 'stone' && e.stack === id && !e.lost);

describe('Egypt’s third level’s own traits (the Delta)', () => {
  it('a Chariot of Horus strikes every enemy beside it; a Royal Chariot only its target', () => {
    const head = hexAt(8, 5);
    const body = occupiedHexes({ ...field([['chariot3', 1, head]], [['levy', 1, hexAt(14, 0)]]).stacks[0]!, hex: head });
    const [e1, e2, e3] = neighbours(head).filter((h) => !body.includes(h));
    const lord = field([['chariot3', 6, head]], [['levy', 30, e1!], ['levy', 30, e2!], ['levy', 30, e3!]]);
    const struck = act(lord, { type: 'attack', target: 2, from: head }).state;
    for (const id of [1, 2, 3]) expect(stackById(struck, id).count, `${id}`).toBeLessThan(30);
    const royal = field([['chariot2', 6, head]], [['levy', 30, e1!], ['levy', 30, e2!], ['levy', 30, e3!]]);
    const one = act(royal, { type: 'attack', target: 2, from: head }).state;
    expect([1, 2, 3].filter((id) => stackById(one, id).count < 30)).toEqual([2]);
    expect(newTraits('chariot2', 'chariot3')).toContain('Strikes all around it');
  });

  it('a Great Sphinx may turn what it strikes to stone, about one strike in five', () => {
    const from = hexAt(5, 5);
    const hit = (seed: number) => act(field([['sphinx3', 2, from]], [['levy', 60, hexAt(6, 5)]], seed), { type: 'attack', target: 1, from });
    const n = 300;
    const landed = Array.from({ length: n }, (_, i) => turned(hit(i + 1).events, 1)).filter(Boolean).length / n;
    expect(landed).toBeGreaterThan(0.12);
    expect(landed).toBeLessThan(0.28);
    expect(creature('sphinx2').petrify).toBeUndefined();
    expect(newTraits('sphinx2', 'sphinx3')).toContain('May turn its target to stone (20%)');
  });

  it('a Pharaoh’s Mummy rewraps: heals 10 at the start of its turn', () => {
    const hp = creature('mummy3').hp;
    const s = field([['levy', 1, hexAt(0, 0)]], [['mummy3', 3, hexAt(12, 9)]]);
    const wounded = { ...s, stacks: s.stacks.map((x) => (x.id === 1 ? { ...x, topHp: hp - 15 } : x)) };
    const step = act(wounded, { type: 'defend' });
    expect(stackById(step.state, 1).topHp).toBe(hp - 5);
    expect(step.events).toContainEqual({ type: 'heal', stack: 1, target: 1, amount: 10 });
    expect(newTraits('mummy2', 'mummy3')).toContain('Regrows 10 health a round');
  });
});
