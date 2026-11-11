import { describe, expect, it } from 'vitest';
import { chapterById, chapterOf, installPaidMaps, partNumber, partsOf } from '../src/level/maps';
import { HLADIR, LONG_WINTER_PARTS } from '../src/level/longWinter';
import { LONG_WINTER_UNLOCKS, lockedIn } from '../src/level/unlocks';
import { battleSides, gridOf, groundAt, isSeen, liveObjects, startAdventure, stepHero, terrainView, type Adventure } from '../src/logic/adventure';
import { creature } from '../src/logic/creatures';
import { factionOf } from '../src/logic/factions';
import { passable, parseGrid, tileIndex } from '../src/logic/map';
import { townFootprint } from '../src/logic/objects';
import { stepCost } from '../src/logic/path';
import { LINES } from '../src/narration/lines';
import { upcoming } from '../src/narration/upcoming';
import { composeGround, GROUND_BORDER, MAP_TILE } from '../src/scenes/map/pixelGround';
import { emptyPlots, stagePieces } from '../src/scenes/town/townStage';

/** Chapter 3, part 1 (docs/inkheroes-design.md, "Part 1 as built (Nov 11)"). */
describe('Hladir, chapter 3’s first part', () => {
  it('is the Long Winter’s part 1, named on its card, opening what the design says and no Hof', () => {
    expect(LONG_WINTER_PARTS.map((m) => m.id)).toEqual(['hladir']);
    expect(chapterOf(HLADIR)?.id).toBe('longWinter');
    expect(partNumber(HLADIR)).toBe(1);
    expect(chapterById('longWinter').parts).toEqual([{ id: 'hladir', n: 9, name: 'Hladir' }]);
    expect(HLADIR.off).toEqual(lockedIn(LONG_WINTER_UNLOCKS, 1));
    expect(HLADIR.off).toContain('mageGuild1');
    expect(HLADIR.off).not.toContain('meadHall');
    expect([HLADIR.story, HLADIR.won]).toEqual(['part-hladir', 'hladir-won']);
    installPaidMaps(LONG_WINTER_PARTS);
    expect(partsOf(chapterById('longWinter')).map((m) => m.id)).toEqual(['hladir']);
    installPaidMaps([]);
  });

  it('is Hervor’s Norse town and army, the land 32 × 24 of snow, pine, fells and the fjord’s ice', () => {
    const g = gridOf(HLADIR);
    expect([g.w, g.h]).toEqual([32, 24]);
    expect(factionOf(HLADIR.town)).toBe('norse');
    expect(factionOf(HLADIR.hero)).toBe('norse');
    expect(HLADIR.hero.id).toBe('hervor');
    const count = (t: string): number => g.terrain.filter((x) => x === t).length;
    // Snow wherever skis should matter, and the fjord as wide ice: no grass, sand or open water.
    expect(count('snow')).toBeGreaterThan(400);
    expect(count('ice')).toBeGreaterThan(100);
    expect(count('grass') + count('sand') + count('water')).toBe(0);
    expect(g.cover.filter((c) => c === 'pine').length).toBeGreaterThan(30);
  });

  it('places every object on open ground, clear of the town, and its monsters are the north’s', () => {
    const g = gridOf(HLADIR);
    const town = new Set(townFootprint(HLADIR.town.x, HLADIR.town.y).map((t) => tileIndex(g, t.x, t.y)));
    const ids = new Set<string>();
    for (const o of HLADIR.objects) {
      expect(passable(g, o.x, o.y), o.id).toBe(true);
      expect(town.has(tileIndex(g, o.x, o.y)), o.id).toBe(false);
      expect(ids.has(o.id), o.id).toBe(false);
      ids.add(o.id);
      if (o.kind === 'monster') expect(['wolfWinter', 'draugr', 'troll', 'frostGiant'], o.id).toContain(o.creature);
    }
    expect(passable(g, HLADIR.hero.x, HLADIR.hero.y)).toBe(true);
    // Trolls stand where the berserkers' rage shows: hard hitters, out from home.
    expect(HLADIR.objects.filter((o) => o.creature === 'troll').length).toBeGreaterThanOrEqual(3);
  });

  it('has Hrimgrimnir, by name, with his wolves, on the ice at the fjord’s mouth: the goal', () => {
    const boss = HLADIR.objects.find((o) => o.id === HLADIR.goal.target)!;
    expect(boss).toMatchObject({ kind: 'monster', creature: 'frostGiant', count: 1, name: 'Hrimgrimnir', line: 'hrimgrimnir', brood: { creature: 'wolfWinter' } });
    expect(creature('frostGiant')).toMatchObject({ wide: true, guardian: true });
    const g = gridOf(HLADIR);
    expect(g.terrain[tileIndex(g, boss.x, boss.y)]).toBe('ice');
    expect(boss.x).toBeLessThan(6);
    // Fought on the ice, the battle is a snow battle (skiers glide on it).
    expect(groundAt(HLADIR, boss.x + 1, boss.y)).toBe('snow');
    const a = startAdventure(HLADIR);
    const beside = { ...a, hero: { ...a.hero, x: boss.x + 1, y: boss.y } };
    expect(battleSides(beside, boss.id, HLADIR).snow).toBe(true);
  });

  it('tells of Hrimgrimnir the first time Hervor sees him, and stops her there, once', () => {
    const boss = HLADIR.objects.find((o) => o.id === 'hrimgrimnir')!;
    const g = gridOf(HLADIR);
    const a = startAdventure(HLADIR);
    expect(isSeen(a, HLADIR, boss.x, boss.y)).toBe(false);
    // Hervor on the ice, just out of sight of him (a hero sees 5 tiles), steps one tile west.
    const far = { x: boss.x + 6, y: boss.y };
    const at: Adventure = { ...a, prompts: [], hero: { ...a.hero, ...far, mp: 2000 } };
    const step = { x: far.x - 1, y: far.y, cost: stepCost(terrainView(at, HLADIR), far, { x: far.x - 1, y: far.y }), straight: 0, day: 0 };
    const r = stepHero(at, HLADIR, step);
    expect(isSeen(r.adv, HLADIR, boss.x, boss.y)).toBe(true);
    expect(r.stop).toBe(true);
    expect(r.adv.prompts).toEqual([expect.objectContaining({ kind: 'message', line: 'hrimgrimnir', title: LINES.hrimgrimnir.title })]);
    // Seen once, never told again.
    const back = { x: step.x + 1, y: step.y, cost: 100, straight: 0, day: 0 };
    const again = stepHero({ ...r.adv, prompts: [] }, HLADIR, back);
    expect(again.adv.prompts).toEqual([]);
    expect(again.stop).toBe(false);
    expect(g.terrain[tileIndex(g, far.x, far.y)]).toBe('ice');
    expect(upcoming({ ...a, prompts: [] }, 2)).toEqual(['hrimgrimnir', 'hladir-won']);
    expect(liveObjects(a).filter((o) => o.line).map((o) => o.id)).toEqual(['hrimgrimnir']);
  });
});

describe('Hladir’s town screen', () => {
  it('stands the Mead Hall on its own plot, offered on a bare one before it is built', () => {
    const built = [...HLADIR.town.built];
    expect(emptyPlots(built, 'norse').map((p) => p.building)).toContain('meadHall');
    expect(stagePieces(built, 'norse').some((p) => p.building === 'meadHall')).toBe(false);
    const withHall = stagePieces([...built, 'meadHall'], 'norse').find((p) => p.building === 'meadHall');
    expect(withHall?.art).toBe('meadHall');
    // The Greeks have none.
    expect(emptyPlots(built, 'crown').map((p) => p.building)).not.toContain('meadHall');
  });
});

describe('the fjord’s ice', () => {
  const g = parseGrid(['nni', 'nni']);
  const view = (snowWalker: boolean) => ({ grid: g, solid: new Set<number>(), stopAt: new Set<number>(), pathfinding: 0, ...(snowWalker ? { snowWalker } : {}) });

  it('is walked slowly by everyone, the Norse too (snow is grass to them, ice is not)', () => {
    expect(stepCost(view(true), { x: 0, y: 0 }, { x: 1, y: 0 })).toBe(100);
    expect(stepCost(view(false), { x: 0, y: 0 }, { x: 1, y: 0 })).toBe(150);
    expect(stepCost(view(true), { x: 2, y: 0 }, { x: 2, y: 1 })).toBe(175);
    expect(stepCost(view(false), { x: 2, y: 0 }, { x: 2, y: 1 })).toBe(175);
    expect(passable(g, 2, 0)).toBe(true);
  });

  it('is drawn in code as blue-grey ice, apart from the snow beside it', () => {
    const ground = composeGround({ grid: parseGrid(['nnnniiii', 'nnnniiii', 'nnnniiii', 'nnnniiii']), swatches: {}, seed: 7 });
    const mean = (x0: number): number[] => {
      const sum = [0, 0, 0];
      let n = 0;
      for (let y = 40; y < 150; y += 3) {
        for (let x = x0; x < x0 + 100; x += 3) {
          const i = ((y + GROUND_BORDER * MAP_TILE) * ground.w + x + GROUND_BORDER * MAP_TILE) * 4;
          for (let k = 0; k < 3; k++) sum[k]! += ground.data[i + k]!;
          n++;
        }
      }
      return sum.map((v) => v / n);
    };
    const snow = mean(20);
    const ice = mean(4 * MAP_TILE + 40);
    // Ice is darker than snow, and bluer than it is red.
    expect(ice[0]! + ice[1]! + ice[2]!).toBeLessThan(snow[0]! + snow[1]! + snow[2]! - 60);
    expect(ice[2]!).toBeGreaterThan(ice[0]! + 30);
  });
});
