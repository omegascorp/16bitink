import { describe, expect, it } from 'vitest';
import { ASHFORD, BLACK_BANNER, THORNWOOD } from '../src/level/borderMarch';
import { MAPS } from '../src/level/maps';
import { gridOf, isSeen, playerTowns, startAdventure, stepHero, townById, withTown, type Adventure } from '../src/logic/adventure';
import { armyOf } from '../src/logic/army';
import { partDays, rideOn } from '../src/logic/chapter';
import { passable } from '../src/logic/map';
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

  it('rides on into the Black Banner: the rival lord rides, and Eudora waits for the hero', () => {
    const next = blackBanner();
    expect(next.mapId).toBe('blackBanner');
    expect(playerTowns(next).map((t) => t.name)).toEqual(['Ashford', 'Thornwood']);
    expect(townById(next, 'eudora-town')).toMatchObject({ owner: 'neutral', ally: true });
    expect(townById(next, 'korax-town')!.owner).toBe('rival');
    expect(next.rival?.hero?.name).toBe('Kassander');
    expect(isSeen(next, BLACK_BANNER, townById(next, 'eudora-town')!.x, townById(next, 'eudora-town')!.y)).toBe(true);
    expect(parseAdventure(JSON.parse(JSON.stringify(next)), BLACK_BANNER)).toEqual(next);
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
