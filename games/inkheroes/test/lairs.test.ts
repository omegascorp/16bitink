import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: { Loader: { Events: {} } } }));
import { THORNWOOD } from '../src/level/borderMarch';
import type { MapDef } from '../src/level/types';
import { lairProblems, parseMaps } from '../src/level/validate';
import { afterBattle, battleSides, endDay, liveObjects, startAdventure, stepHero, type Adventure } from '../src/logic/adventure';
import { createBattle } from '../src/logic/battle';
import type { BattleState } from '../src/logic/battleTypes';
import { lairDoor, lairGroupId, lairGroupSize, lairsOut } from '../src/logic/lairs';
import { dropOf, LAIR_DROP } from '../src/logic/loot';
import type { MapObject } from '../src/logic/objects';
import { parseAdventure } from '../src/logic/save';
import { visitSite } from '../src/logic/visits';
import { siteArtOf, siteSprite } from '../src/scenes/map/pixelMapArt';

/** The one lair of the tests: a wolves' den on Thornwood (part 2), in open country well away from its towns. */
const DEN: MapObject = { id: 'test-den', kind: 'lair', x: 55, y: 2, creature: 'wolf', count: 20, look: 'den' };
const FIXTURE: MapDef = { ...THORNWOOD, id: 'lair-fixture', objects: [...THORNWOOD.objects, DEN] };

const groupOf = (adv: Adventure): MapObject | undefined => liveObjects(adv).find((o) => o.kind === 'monster' && o.id.startsWith(`${DEN.id}@w`));
/** Days ended until `day`. */
function toDay(adv: Adventure, day: number): Adventure {
  let a = adv;
  while (a.day < day) a = endDay(a, FIXTURE);
  return a;
}
function wonBy(adv: Adventure, id: string): BattleState {
  const s = battleSides(adv, id);
  const st = createBattle(s.attacker, s.defender, s.seed, s.siege).state;
  return { ...st, winner: 0, stacks: st.stacks.map((x) => (x.side === 0 ? x : { ...x, count: 0 })) };
}

describe('lairs', () => {
  it('pass the map checks, stand a building tall, and are drawn with a stand-in until their art comes', () => {
    expect(lairProblems(FIXTURE)).toEqual([]);
    expect(lairProblems({ ...FIXTURE, objects: [...THORNWOOD.objects, { ...DEN, x: THORNWOOD.town.x + 2, y: THORNWOOD.town.y + 3 }] }).some((p) => /town/.test(p))).toBe(true);
    expect(lairProblems({ ...FIXTURE, n: 1 }).some((p) => /part 1/.test(p))).toBe(true);
    expect(siteArtOf(DEN)).toBe('den');
    expect(siteArtOf({ ...DEN, look: 'tomb' })).toBe('tomb');
    // Not drawn yet: each borrows a drawn sprite (a cave, a tomb).
    expect(siteSprite('den')).not.toBeNull();
    expect(siteSprite('tomb')).not.toBeNull();
  });

  it('send out a group at the door when the part opens', () => {
    const adv = startAdventure(FIXTURE);
    const g = groupOf(adv)!;
    expect(g).toMatchObject({ id: lairGroupId(DEN.id, 1), ...lairDoor(DEN), creature: 'wolf', count: 20 });
    // The lair is a site; its group guards it.
    const card = visitSite(adv, adv.objects.find((o) => o.id === DEN.id)!, FIXTURE).adv.prompts.at(-1);
    expect(card).toMatchObject({ kind: 'message', title: 'Den', text: expect.stringMatching(/wolves/i) });
  });

  it('send a new, bigger group on the first day of a week once the last is gone, and never two at once', () => {
    let adv = startAdventure(FIXTURE);
    // Not beaten: no second group next week.
    expect(liveObjects(toDay(adv, 8)).filter((o) => o.id.startsWith(`${DEN.id}@w`))).toHaveLength(1);
    const first = groupOf(adv)!;
    adv = { ...adv, objects: adv.objects.map((o) => (o.id === first.id ? { ...o, gone: true } : o)) };
    expect(groupOf(toDay(adv, 7))).toBeUndefined();
    const week2 = toDay(adv, 8);
    expect(groupOf(week2)).toMatchObject({ id: lairGroupId(DEN.id, 2), count: 24 });
    // The beaten group of week 1 is cleared away.
    expect(week2.objects.some((o) => o.id === first.id)).toBe(false);
    // Size: base × (1 + 0.2 × weeks since the part opened).
    expect(lairGroupSize({ count: 20, since: 1 }, 15)).toBe(28);
    expect(lairGroupSize({ count: 20, since: 8 }, 15)).toBe(24);
  });

  it('wait while someone stands at the door', () => {
    const adv = startAdventure(FIXTURE);
    const cleared = { ...adv, objects: adv.objects.filter((o) => o.id !== groupOf(adv)!.id), hero: { ...adv.hero, ...lairDoor(DEN) } };
    expect(groupOf(lairsOut({ ...cleared, day: 8 }))).toBeUndefined();
  });

  it('drop a piece 1 in 4, rolled on the part before\'s row, fixed by lair and week', () => {
    let hits = 0;
    for (let week = 1; week <= 400; week++) {
      const g: MapObject = { id: lairGroupId(DEN.id, week), kind: 'monster', x: 55, y: 3, creature: 'wolf', count: 20 };
      const id = dropOf(FIXTURE, g, []);
      expect(dropOf(FIXTURE, g, [])).toBe(id);
      if (id) hits += 1;
    }
    expect(hits / 400).toBeCloseTo(LAIR_DROP, 1);
  });

  it('a group is fought like any monster, and a beaten one leaves room for next week\'s', () => {
    const adv = startAdventure(FIXTURE);
    const g = groupOf(adv)!;
    const near = { ...adv, hero: { ...adv.hero, x: g.x + 1, y: g.y }, prompts: [] };
    const step = stepHero(near, FIXTURE, { x: g.x, y: g.y, cost: 0, straight: 0, day: 0 } as never);
    expect(step.battle).toBe(g.id);
    const won = afterBattle(near, FIXTURE, g.id, wonBy(near, g.id));
    expect(groupOf(won)).toBeUndefined();
    expect(won.objects.find((o) => o.id === DEN.id)?.gone).toBeUndefined();
  });

  it('keep their groups, week and start through a reload; a bad group is dropped', () => {
    let adv = startAdventure(FIXTURE);
    adv = { ...adv, objects: adv.objects.map((o) => (o.id === groupOf(adv)!.id ? { ...o, gone: true } : o)) };
    adv = toDay(adv, 8);
    const raw = JSON.parse(JSON.stringify(adv)) as Adventure;
    const back = parseAdventure(raw, FIXTURE)!;
    expect(groupOf(back)).toEqual(groupOf(adv));
    expect(back.objects.find((o) => o.id === DEN.id)).toMatchObject({ week: 2, since: 1 });
    // Moved, or for a lair the map doesn't have: not read back.
    const moved = { ...raw, objects: raw.objects.map((o) => (o.id === groupOf(adv)!.id ? { ...o, x: 1, y: 1, creature: 'wyvern' } : o)) };
    expect(groupOf(parseAdventure(moved, FIXTURE)!)).toMatchObject(lairDoor(DEN));
    expect(groupOf(parseAdventure(moved, FIXTURE)!)?.creature).toBe('wolf');
    const stray = { ...raw, objects: [...raw.objects, { id: 'nowhere@w2', kind: 'monster', x: 3, y: 3, creature: 'wolf', count: 5 }] };
    expect(parseAdventure(stray, FIXTURE)!.objects.some((o) => o.id === 'nowhere@w2')).toBe(false);
  });

  it('an old save from before lairs loads, and the lair sends its group the next Monday', () => {
    const adv = startAdventure(THORNWOOD);
    const old = parseAdventure(JSON.parse(JSON.stringify({ ...adv, mapId: FIXTURE.id, objects: [...adv.objects, { ...DEN }] })), FIXTURE)!;
    expect(groupOf(old)).toBeUndefined();
    expect(groupOf(toDay(old, 8))).toBeDefined();
  });

  it('the rival treats its groups as monsters: he fights one beside him', async () => {
    const { BLACK_BANNER } = await import('../src/level/borderMarch');
    const { rivalTurn } = await import('../src/logic/rival');
    const start = startAdventure(BLACK_BANNER);
    const foe = start.rival!.hero!;
    const group: MapObject = { id: lairGroupId('banner-den', 1), kind: 'monster', x: foe.x - 1, y: foe.y + 1, creature: 'goblin', count: 1 };
    const lone: Adventure = { ...start, objects: [group], rival: { ...start.rival!, purse: { ...start.rival!.purse, gold: 0 } } };
    expect(rivalTurn(lone, BLACK_BANNER).adv.objects[0]!.gone).toBe(true);
  });

  it('come through the server\'s map check with their creature, count and look', () => {
    const bad = (o: object): unknown => [{ ...JSON.parse(JSON.stringify(FIXTURE)), id: 'x-lair', n: 6, objects: [o] }];
    expect(() => parseMaps(bad({ ...DEN, look: 'castle' }))).toThrow();
    expect(() => parseMaps(bad({ ...DEN, creature: 'nobody' }))).toThrow();
  });
});
