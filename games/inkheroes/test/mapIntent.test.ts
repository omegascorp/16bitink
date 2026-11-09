import { describe, expect, it } from 'vitest';
import { ASHFORD } from '../src/level/borderMarch';
import { startAdventure, type Adventure } from '../src/logic/adventure';
import { armyOf } from '../src/logic/army';
import { townFootprint } from '../src/logic/objects';
import { rideHere } from '../src/logic/rideHere';
import { intentAt, ownTownPictureAt, townToEnter } from '../src/logic/mapIntent';

const everywhere = (adv: Adventure): Adventure => ({ ...adv, explored: '1'.repeat(adv.explored.length), prompts: [] });

describe('what a tap on the map would do', () => {
  const def = ASHFORD;
  const adv = everywhere(startAdventure(def));
  const monster = adv.objects.find((o) => o.kind === 'monster')!;
  const site = adv.objects.find((o) => o.kind !== 'monster' && !adv.objects.some((m) => m.kind === 'monster' && Math.abs(m.x - o.x) <= 1 && Math.abs(m.y - o.y) <= 1))!;

  it('fights a monster, and on the tiles it guards', () => {
    expect(intentAt(adv, def, monster.x, monster.y)).toBe('attack');
    const beside = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => intentAt(adv, def, monster.x + dx!, monster.y + dy!));
    expect(beside).toContain('attack');
    expect(beside).not.toContain('move');
  });

  it('picks or meets another hero of ours', () => {
    const friend = { ...adv.hero, id: 'ianthe', name: 'Ianthe', x: adv.hero.x + 3, y: adv.hero.y };
    expect(intentAt({ ...adv, others: [friend] }, def, friend.x, friend.y)).toBe('visit');
  });

  it('visits a site', () => {
    expect(intentAt(adv, def, site.x, site.y)).toBe('visit');
  });

  it('fights for a guarded site first', () => {
    const guarded = { ...adv, objects: adv.objects.map((o) => (o.id === monster.id ? { ...o, x: site.x + 1, y: site.y } : o)) };
    expect(intentAt(guarded, def, site.x, site.y)).toBe('attack');
  });

  it('rides over open ground', () => {
    const h = adv.hero;
    const open = [[2, 0], [-2, 0], [0, 2], [0, -2], [3, 3], [-3, 3]].map(([dx, dy]) => intentAt(adv, def, h.x + dx!, h.y + dy!));
    expect(open).toContain('move');
  });

  it('does nothing in the fog or off the map, or on the hero in open country', () => {
    const fogged = { ...adv, explored: '0'.repeat(adv.explored.length) };
    expect(intentAt(fogged, def, site.x, site.y)).toBeNull();
    expect(intentAt(adv, def, -1, 0)).toBeNull();
    const out = { ...adv, hero: { ...adv.hero, x: adv.hero.x + 2 } };
    expect(intentAt(out, def, out.hero.x, out.hero.y)).toBeNull();
  });

  it('enters its own town, and fights a garrison for a foreign one', () => {
    const town = adv.towns[0]!;
    expect(town.owner).toBe('player');
    expect(intentAt(adv, def, town.x, town.y)).toBe('visit');
    const out = { ...adv, hero: { ...adv.hero, x: town.x, y: town.y + 3 } };
    expect(intentAt(out, def, town.x, town.y)).toBe('visit');
    const held = { ...out, towns: out.towns.map((t) => (t.id === town.id ? { ...t, owner: 'neutral' as const, garrison: armyOf([{ creature: 'bandit', count: 5 }]) } : t)) };
    expect(intentAt(held, def, town.x, town.y)).toBe('attack');
    const ally = { ...held, towns: held.towns.map((t) => ({ ...t, ally: true })) };
    expect(intentAt(ally, def, town.x, town.y)).toBe('visit');
  });

  describe('a tap on the picture of a town of ours', () => {
    const town = adv.towns[0]!;
    const away = { ...adv, hero: { ...adv.hero, x: town.x, y: town.y + 6 } };
    const tiles = [{ x: town.x, y: town.y }, ...townFootprint(town.x, town.y)];

    it('opens it from every tile, whichever the hero, and shows the enter intent there', () => {
      for (const t of tiles) {
        expect(ownTownPictureAt(away, def, t.x, t.y)?.id).toBe(town.id);
        expect(townToEnter(away, def, t.x, t.y)?.id).toBe(town.id);
        expect(intentAt(away, def, t.x, t.y)).toBe('visit');
      }
      expect(ownTownPictureAt(away, def, town.x + 8, town.y)).toBeUndefined();
    });

    it('rides as before when a path to the gate is planned, and not in the fog', () => {
      const wall = townFootprint(town.x, town.y)[6]!;
      expect(townToEnter(away, def, wall.x, wall.y, { x: town.x, y: town.y })).toBeUndefined();
      expect(townToEnter(away, def, wall.x, wall.y, { x: 1, y: 1 })?.id).toBe(town.id);
      const fogged = { ...away, explored: '0'.repeat(away.explored.length) };
      expect(townToEnter(fogged, def, wall.x, wall.y)).toBeUndefined();
    });

    it('leaves a town not ours as it was: no entering, a fight for a garrison', () => {
      const held = { ...away, towns: away.towns.map((t) => (t.id === town.id ? { ...t, owner: 'rival' as const, garrison: armyOf([{ creature: 'bandit', count: 5 }]) } : t)) };
      const wall = townFootprint(town.x, town.y)[6]!;
      expect(townToEnter(held, def, wall.x, wall.y)).toBeUndefined();
      expect(intentAt(held, def, town.x, town.y)).toBe('attack');
    });

    it('offers a ride to its gate, or says why not', () => {
      expect('path' in rideHere(away, def, town)).toBe(true);
      const stuck = { ...away, hero: { ...away.hero, mp: 0 }, explored: away.explored };
      expect(rideHere(stuck, def, town)).toBeDefined();
      const inOther = { ...away, hero: { ...away.hero, army: armyOf([]) }, towns: [...away.towns] };
      const other = { ...town, id: 'elsewhere', x: away.hero.x, y: away.hero.y };
      const garrisoned = { ...inOther, towns: [...away.towns, other] };
      expect(rideHere(garrisoned, def, town)).toMatchObject({ why: expect.stringContaining('garrison') });
    });
  });
});
