import { describe, expect, it } from 'vitest';
import { ASHFORD } from '../src/level/borderMarch';
import { heroTown, planPath, startAdventure, stepHero, type Adventure } from '../src/logic/adventure';
import { armyOf } from '../src/logic/army';
import { townFootprint } from '../src/logic/objects';
import { rideHere } from '../src/logic/rideHere';
import bootPng from '../src/art/pixel/cursors/boot.png?inline';
import gauntletPng from '../src/art/pixel/cursors/gauntlet.png?inline';
import longswordPng from '../src/art/pixel/cursors/longsword.png?inline';
import towerPng from '../src/art/pixel/cursors/tower.png?inline';
import { intentAt, ownTownPartAt, ownTownPictureAt, townTap, townToEnter, townWords } from '../src/logic/mapIntent';

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

  it('rides into its own town, and fights a garrison for a foreign one', () => {
    const town = adv.towns[0]!;
    expect(town.owner).toBe('player');
    // The hero stands at its gate: a tap opens it.
    expect(intentAt({ ...adv, hero: { ...adv.hero, x: town.x, y: town.y } }, def, town.x, town.y)).toBe('open');
    const out = { ...adv, hero: { ...adv.hero, x: town.x, y: town.y + 3 } };
    expect(intentAt(out, def, town.x, town.y)).toBe('enter');
    const held = { ...out, towns: out.towns.map((t) => (t.id === town.id ? { ...t, owner: 'neutral' as const, garrison: armyOf([{ creature: 'bandit', count: 5 }]) } : t)) };
    expect(intentAt(held, def, town.x, town.y)).toBe('attack');
    const ally = { ...held, towns: held.towns.map((t) => ({ ...t, ally: true })) };
    expect(intentAt(ally, def, town.x, town.y)).toBe('visit');
  });

  describe('a tap on the picture of a town of ours', () => {
    const town = adv.towns[0]!;
    const away = { ...adv, hero: { ...adv.hero, x: town.x, y: town.y + 6 } };
    const tiles = [{ x: town.x, y: town.y }, ...townFootprint(town.x, town.y)];
    const gateHalf = tiles.filter((t) => t.y >= town.y);
    const topHalf = tiles.filter((t) => t.y < town.y);

    it('splits it in two: the gate’s row and below ride in, the walls and roofs above open it', () => {
      expect(gateHalf.map((t) => [t.x - town.x, t.y - town.y]).sort()).toEqual([[-1, 0], [0, 0], [1, 0], [1, 1], [2, 0], [3, 0], [4, 0]].sort());
      expect(topHalf).toHaveLength(tiles.length - 7);
      for (const t of gateHalf) expect(ownTownPartAt(away, def, t.x, t.y)).toMatchObject({ part: 'gate', town: { id: town.id } });
      for (const t of topHalf) expect(ownTownPartAt(away, def, t.x, t.y)).toMatchObject({ part: 'top', town: { id: town.id } });
      expect(ownTownPictureAt(away, def, town.x + 8, town.y)).toBeUndefined();
    });

    it('shows the way in on the gate half and the tower on the top, and says so', () => {
      for (const t of gateHalf) {
        expect(intentAt(away, def, t.x, t.y)).toBe('enter');
        expect(townWords(away, def, t.x, t.y)).toBe(`Ride into ${town.name}`);
      }
      for (const t of topHalf) {
        expect(intentAt(away, def, t.x, t.y)).toBe('open');
        expect(townWords(away, def, t.x, t.y)).toBe(`Open ${town.name}`);
      }
      // At the gate already, the gate half opens it too.
      const atGate = { ...adv, hero: { ...adv.hero, x: town.x, y: town.y } };
      for (const t of gateHalf) expect(intentAt(atGate, def, t.x, t.y)).toBe('open');
    });

    it('opens the town from the top without moving the hero, plan or not', () => {
      for (const t of topHalf) {
        expect(townTap(away, def, t.x, t.y)).toMatchObject({ kind: 'open', town: { id: town.id } });
        expect(townTap(away, def, t.x, t.y, { x: town.x, y: town.y })?.kind).toBe('open');
        expect(townToEnter(away, def, t.x, t.y)?.id).toBe(town.id);
      }
    });

    it('rides in with two taps on the gate half: the first plans the way to the gate, the second rides, and arriving is a visit', () => {
      const wall = { x: town.x + 3, y: town.y };
      const first = townTap(away, def, wall.x, wall.y);
      expect(first).toMatchObject({ kind: 'plan', town: { id: town.id } });
      expect(townToEnter(away, def, wall.x, wall.y)).toBeUndefined();
      const path = planPath(away, def, town.x, town.y)!;
      expect(path.at(-1)).toMatchObject({ x: town.x, y: town.y });
      expect(townTap(away, def, wall.x, wall.y, path.at(-1))?.kind).toBe('ride');
      let a = away;
      let entered = false;
      for (const step of path) {
        const r = stepHero(a, def, step, path.at(-1));
        a = r.adv;
        entered ||= !!r.town;
        if (r.stop) break;
      }
      expect(entered).toBe(true);
      expect(heroTown(a)?.id).toBe(town.id);
      // Now at the gate: a tap anywhere on it opens the town.
      expect(townTap(a, def, wall.x, wall.y)?.kind).toBe('open');
    });

    it('rides nowhere in the fog, nor for a hero in a garrison', () => {
      const fogged = { ...away, explored: '0'.repeat(away.explored.length) };
      expect(townTap(fogged, def, town.x, town.y)).toBeUndefined();
      expect(intentAt(fogged, def, town.x, town.y)).toBeNull();
      const other = { ...town, id: 'elsewhere', x: away.hero.x, y: away.hero.y };
      const garrisoned = { ...away, hero: { ...away.hero, army: armyOf([]) }, towns: [...away.towns, other] };
      expect(intentAt(garrisoned, def, town.x, town.y)).toBeNull();
      expect(intentAt(garrisoned, def, town.x, town.y - 2)).toBe('open');
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

describe('the town signs', () => {
  /** A cursor sprite's size, from its PNG header (inlined as a data URL). */
  const size = (dataUrl: string): [number, number] => {
    const b = atob(dataUrl.split(',')[1]!);
    const u32 = (i: number): number => ((b.charCodeAt(i) << 24) | (b.charCodeAt(i + 1) << 16) | (b.charCodeAt(i + 2) << 8) | b.charCodeAt(i + 3)) >>> 0;
    return [u32(16), u32(20)];
  };


  it('draws the tower at the size of every other map cursor', () => {
    expect(size(towerPng)).toEqual([32, 32]);
    for (const other of [bootPng, gauntletPng, longswordPng]) expect(size(towerPng)).toEqual(size(other));
  });
});
