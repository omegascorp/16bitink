import { describe, expect, it } from 'vitest';
import { ASHFORD, BLACK_BANNER, THORNWOOD } from '../src/level/borderMarch';
import { MAPS } from '../src/level/maps';
import { gridOf, isSeen, playerTowns, planPath, rivalHero, startAdventure, stepHero, townById, withTown, type Adventure } from '../src/logic/adventure';
import { armyOf } from '../src/logic/army';
import { openLand, partDays, rideOn } from '../src/logic/chapter';
import { strengthOf } from '../src/logic/creatures';
import { passable, tileIndex } from '../src/logic/map';
import type { MapObject } from '../src/logic/objects';
import { armyStrength } from '../src/logic/rival';
import { parseAdventure } from '../src/logic/save';

/** Ashford won on day 9: the hero by the old bridge with a grown army, a barracks built, a mine taken, the ogres gone. */
function ashfordWon(): Adventure {
  const start = startAdventure(ASHFORD);
  const town = townById(start, 'ashford-town')!;
  const objects = start.objects.map((o) => (o.id === 'ogres' ? { ...o, gone: true } : o.id === 'sawmill' ? { ...o, owner: 'player' as const } : o));
  return withTown({
    ...start, day: 9, status: 'won', prompts: [], lostStacks: 1, objects,
    hero: { ...start.hero, x: 24, y: 12, level: 3, xp: 3000, attack: 4, army: armyOf([{ creature: 'spearman', count: 40 }, { creature: 'swordsman', count: 6 }]) },
  }, { ...town, built: [...town.built, 'townHall', 'barracks'], garrison: armyOf([{ creature: 'bowman', count: 9 }]) });
}

/** Thornwood won on `day` with every monster behind the hero beaten: Rowan at its gate. */
function thornwoodWon(day: number): Adventure {
  const start = startAdventure(THORNWOOD);
  return withTown({
    ...start, day, status: 'won', prompts: [],
    objects: start.objects.map((o) => (o.kind === 'monster' ? { ...o, gone: true } : o)),
    hero: { ...start.hero, x: 63, y: 16 },
  }, { ...townById(start, 'thornwood-town')!, owner: 'player' });
}

const midpoint = (xs: readonly number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
const groups = (objects: readonly MapObject[]): number[] => objects.filter((o) => o.kind === 'monster').map((o) => strengthOf(o.creature!, o.count ?? 1));

describe('the way into the Black Banner', () => {
  it('is a road the hero can see from the moment the part opens, through the forest and no further', () => {
    const next = rideOn(thornwoodWon(30), THORNWOOD, BLACK_BANNER);
    const g = gridOf(BLACK_BANNER);
    for (let y = 31; y <= 40; y++) {
      expect(g.cover[tileIndex(g, 38, y)]).toBe('road');
      expect(isSeen(next, BLACK_BANNER, 38, y)).toBe(true);
    }
    // Only the way: Eudora has to be found, and the hills beyond the ridge stay dark.
    expect(isSeen(next, BLACK_BANNER, 32, 59)).toBe(false);
    expect(isSeen(next, BLACK_BANNER, 37, 50)).toBe(false);
    expect(isSeen(next, BLACK_BANNER, 63, 40)).toBe(false);
  });

  it('leads a hero from Thornwood to Eudora along it', () => {
    const next = rideOn(thornwoodWon(30), THORNWOOD, BLACK_BANNER);
    const path = planPath({ ...next, hero: { ...next.hero, mp: 1500 } }, BLACK_BANNER, 32, 59);
    expect(path).not.toBeNull();
    expect(path!.some((s) => s.x === 38 && s.y === 32)).toBe(true);
  });

  it('changes nothing when shown again', () => {
    const next = rideOn(thornwoodWon(30), THORNWOOD, BLACK_BANNER);
    expect(openLand(next, BLACK_BANNER).explored).toBe(next.explored);
  });

  it('lights up a game saved before the way was shown', () => {
    const old = { ...rideOn(thornwoodWon(30), THORNWOOD, BLACK_BANNER) };
    const dark = { ...old, explored: '0'.repeat(old.explored.length) };
    expect(isSeen(openLand(dark, BLACK_BANNER), BLACK_BANNER, 38, 35)).toBe(true);
  });
});

describe('the Black Banner, ridden on into', () => {
  it('finds Kassander as far on as the days gone by', () => {
    const early = rideOn(thornwoodWon(22), THORNWOOD, BLACK_BANNER);
    const late = rideOn(thornwoodWon(44), THORNWOOD, BLACK_BANNER);
    const fresh = armyStrength(armyOf(BLACK_BANNER.rival!.hero.army));
    expect(armyStrength(rivalHero(early)!.army)).toBeGreaterThan(fresh * 2);
    expect(armyStrength(rivalHero(late)!.army)).toBeGreaterThan(armyStrength(rivalHero(early)!.army) * 1.5);
    expect(townById(late, 'korax-town')!.built.length).toBeGreaterThan(BLACK_BANNER.towns!.find((t) => t.id === 'korax-town')!.built.length);
  });

  it('leaves the hero, the purse and the day alone while he catches up', () => {
    const won = thornwoodWon(30);
    const next = rideOn(won, THORNWOOD, BLACK_BANNER);
    expect(next.day).toBe(30);
    expect(next.hero.army).toEqual(won.hero.army);
    expect(next.purse.gold).toBe(won.purse.gold + BLACK_BANNER.grant!.gold!);
    expect(rivalHero(next)).toMatchObject({ x: BLACK_BANNER.rival!.hero.x, y: BLACK_BANNER.rival!.hero.y });
  });

  it('is no easier than the part before it', () => {
    const part2 = THORNWOOD.objects.filter((o) => !ASHFORD.objects.some((p) => p.id === o.id));
    const part3 = BLACK_BANNER.objects.filter((o) => !THORNWOOD.objects.some((p) => p.id === o.id));
    expect(midpoint(groups(part3))).toBeGreaterThan(midpoint(groups(part2)));
    expect(Math.max(...groups(part3))).toBeGreaterThan(Math.max(...groups(part2)));
    const garrison = (id: string): number => armyStrength(armyOf(BLACK_BANNER.towns!.find((t) => t.id === id)!.garrison));
    expect(garrison('korax-town')).toBeGreaterThan(garrison('thornwood-town') * 1.5);
  });
});

describe('the chapter as one land', () => {
  it('cuts every part from the same land: each one starts at the same corner and holds the one before it', () => {
    for (let i = 1; i < MAPS.length; i++) {
      const before = gridOf(MAPS[i - 1]!);
      const now = gridOf(MAPS[i]!);
      expect(now.w).toBeGreaterThanOrEqual(before.w);
      expect(now.h).toBeGreaterThanOrEqual(before.h);
      MAPS[i - 1]!.rows.forEach((row, y) => expect(MAPS[i]!.rows[y]!.slice(0, before.w)).toBe(row));
      // Everything the part before had is still there, in the same place.
      for (const o of MAPS[i - 1]!.objects) expect(MAPS[i]!.objects.find((p) => p.id === o.id)).toEqual(o);
      expect(new Set(MAPS[i]!.objects.map((o) => o.id)).size).toBe(MAPS[i]!.objects.length);
    }
  });

  it('opens a road from each part into the next', () => {
    // The north road on past the old bridge, and the forest trail down to the Black Banner's vale.
    expect(passable(gridOf(THORNWOOD), 32, 12)).toBe(true);
    expect(passable(gridOf(BLACK_BANNER), 37, 31)).toBe(true);
    expect(passable(gridOf(BLACK_BANNER), 37, 32)).toBe(true);
  });

  it('rides on from Ashford into Thornwood with the hero, the town, the mines and the land seen', () => {
    const won = ashfordWon();
    const next = rideOn(won, ASHFORD, THORNWOOD);
    expect(next.mapId).toBe('thornwood');
    expect(next.status).toBe('playing');
    expect(next.day).toBe(9);
    expect(next.begun).toBe(9);
    expect(next.lostStacks).toBe(0);
    expect(next.hero).toEqual(won.hero);
    const town = townById(next, 'ashford-town')!;
    expect(town.built).toContain('barracks');
    expect(town.garrison).toEqual(won.towns[0]!.garrison);
    expect(townById(next, 'thornwood-town')!.owner).toBe('neutral');
    expect(next.objects.find((o) => o.id === 'ogres')!.gone).toBe(true);
    expect(next.objects.find((o) => o.id === 'sawmill')!.owner).toBe('player');
    expect(next.purse.gold).toBe(won.purse.gold + THORNWOOD.grant!.gold!);
    expect(next.explored).toHaveLength(gridOf(THORNWOOD).w * gridOf(THORNWOOD).h);
    expect(isSeen(next, THORNWOOD, ASHFORD.town.x, ASHFORD.town.y)).toBe(isSeen(won, ASHFORD, ASHFORD.town.x, ASHFORD.town.y));
    // Across the bridge comes into view.
    expect(isSeen(next, THORNWOOD, 28, 12)).toBe(true);
    expect(next.prompts[0]).toMatchObject({ kind: 'message', title: 'Thornwood' });
    // It saves and loads as Thornwood.
    expect(parseAdventure(JSON.parse(JSON.stringify(next)), THORNWOOD)).toEqual(next);
  });

  it('counts the par from the day the part began', () => {
    const next = rideOn(ashfordWon(), ASHFORD, THORNWOOD);
    expect(partDays({ ...next, day: 12 })).toBe(4);
    expect(partDays(startAdventure(ASHFORD))).toBe(1);
  });

  const blackBanner = (): Adventure => {
    const tw = rideOn(ashfordWon(), ASHFORD, THORNWOOD);
    const taken = withTown({ ...tw, status: 'won', day: 20 }, { ...townById(tw, 'thornwood-town')!, owner: 'player', garrison: armyOf([]) });
    return rideOn(taken, THORNWOOD, BLACK_BANNER);
  };

  it('rides on into the Black Banner: the rival lord rides, and Eudora waits, unseen, for the hero', () => {
    const next = blackBanner();
    expect(next.mapId).toBe('blackBanner');
    expect(playerTowns(next).map((t) => t.name)).toEqual(['Ashford', 'Thornwood']);
    expect(townById(next, 'eudora-town')).toMatchObject({ owner: 'neutral', ally: true });
    expect(townById(next, 'korax-town')!.owner).toBe('rival');
    expect(next.rival?.hero?.name).toBe('Kassander');
    expect(isSeen(next, BLACK_BANNER, townById(next, 'eudora-town')!.x, townById(next, 'eudora-town')!.y)).toBe(false);
    // Lair groups sit where they came out, a parse lists them after the map's objects: compare by id.
    const byId = <T extends { objects: readonly { id: string }[] }>(a: T): T => ({ ...a, objects: [...a.objects].sort((x, y) => (x.id < y.id ? -1 : 1)) });
    expect(byId(parseAdventure(JSON.parse(JSON.stringify(next)), BLACK_BANNER)!)).toEqual(byId(next));
  });

  it('opens Eudora to the hero without a fight, and its garrison joins', () => {
    const next = blackBanner();
    const eudora = townById(next, 'eudora-town')!;
    const beside = { ...next, hero: { ...next.hero, x: eudora.x, y: eudora.y + 1, mp: 1000 } };
    const r = stepHero(beside, BLACK_BANNER, { x: eudora.x, y: eudora.y, cost: 100, straight: 100, day: 0 });
    expect(r.battle).toBeUndefined();
    expect(playerTowns(r.adv).map((t) => t.name)).toEqual(['Ashford', 'Thornwood', 'Eudora']);
    const joined = townById(r.adv, 'eudora-town')!;
    expect(joined.ally).toBeUndefined();
    expect(joined.garrison).toEqual(eudora.garrison);
    expect(r.adv.prompts.at(-1)).toMatchObject({ kind: 'message', title: 'Eudora opens its gates' });
  });

  it('still starts a fresh map 3 at home in Eudora', () => {
    expect(townById(startAdventure(BLACK_BANNER), 'eudora-town')).toMatchObject({ owner: 'player' });
  });
});
