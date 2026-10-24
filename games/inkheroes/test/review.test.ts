import { describe, expect, it } from 'vitest';
import { ASHFORD } from '../src/level/chapter1';
import { afterBattle, endDay, planPath, startAdventure, stepHero, type Adventure } from '../src/logic/adventure';
import { armyOf } from '../src/logic/army';
import { act, createBattle } from '../src/logic/battle';
import { chooseAction } from '../src/logic/battleAi';
import { applyLevelUp, maxMana } from '../src/logic/hero';
import { parseAdventure } from '../src/logic/save';
import { build } from '../src/logic/town';

const fresh = (): Adventure => ({ ...startAdventure(ASHFORD), prompts: [] });
const roundTrip = (adv: Adventure): Adventure | null => parseAdventure(JSON.parse(JSON.stringify(adv)), ASHFORD);

describe('fixes from the first review', () => {
  it('tapping a monster plans a path that ends on it', () => {
    const path = planPath(fresh(), ASHFORD, 11, 7);
    expect(path).not.toBeNull();
    expect(path![path!.length - 1]).toMatchObject({ x: 11, y: 7 });
  });

  it('a guarded site is fought for first and only visited after the win', () => {
    let adv = fresh();
    const path = planPath(adv, ASHFORD, 10, 6)!;
    let battle: string | undefined;
    let then: string | undefined;
    for (const step of path) {
      const r = stepHero(adv, ASHFORD, step, path[path.length - 1]);
      adv = r.adv;
      if (r.stop) {
        battle = r.battle;
        then = r.then;
        break;
      }
    }
    expect(battle).toBe('goblins');
    expect(then).toBe('sawmill');
    expect(adv.objects.find((o) => o.id === 'sawmill')!.owner).toBe('neutral');
    let b = createBattle({ hero: null, army: adv.hero.army }, { hero: null, army: armyOf([{ creature: 'goblin', count: 4 }]) }, 3).state;
    for (let i = 0; i < 300 && b.winner === null; i++) b = act(b, chooseAction(b)).state;
    const after = afterBattle(adv, ASHFORD, 'goblins', b, then);
    expect(after.objects.find((o) => o.id === 'sawmill')!.owner).toBe('player');
  });

  it('a skill never goes past expert', () => {
    const hero = { ...fresh().hero, skills: { leadership: 3 as const } };
    expect(applyLevelUp(hero, { level: 2, primary: 'attack', choices: ['leadership'] }, 'leadership').skills.leadership).toBe(3);
  });

  it('a save cannot smuggle in level-ups, movement or mana', () => {
    const adv = fresh();
    const hero = { ...adv.hero, mp: 99999, mana: 999, skills: { leadership: 3 as const } };
    const p = roundTrip({ ...adv, hero, prompts: [{ kind: 'levelUp', offer: { level: 50, primary: 'attack', choices: ['leadership'] } }] })!;
    expect(p.prompts).toEqual([]);
    expect(p.hero.mp).toBeLessThanOrEqual(2000);
    expect(p.hero.mana).toBe(maxMana(p.hero));
  });

  it('a save cannot put the hero inside the town walls or on a monster', () => {
    const adv = fresh();
    expect(roundTrip({ ...adv, hero: { ...adv.hero, x: 5, y: 4 } })).toBeNull();
    expect(roundTrip({ ...adv, hero: { ...adv.hero, x: 11, y: 7 } })).toBeNull();
  });

  it('a save cannot build what the map switches off, or hold impossible monsters and chests', () => {
    const adv = fresh();
    const p = roundTrip({
      ...adv,
      town: { ...adv.town, built: [...adv.town.built, 'capitol'], stock: { ...adv.town.stock, seraph: 50 } },
      objects: adv.objects.map((o) => (o.id === 'ogres' ? { ...o, count: 999999 } : o.kind === 'pile' ? { ...o, count: 5 } : o)),
      prompts: [{ kind: 'chest', id: 'goblins', gold: 999999, xp: 999999 }],
    })!;
    expect(p.town.built).not.toContain('capitol');
    expect(p.town.stock.seraph).toBeUndefined();
    expect(p.objects.find((o) => o.id === 'ogres')!.count).toBeLessThanOrEqual(4000);
    expect(p.objects.find((o) => o.kind === 'pile')!.count).toBeUndefined();
    expect(p.prompts).toEqual([]);
  });

  it('Mysticism gives 2/3/4 mana a day, not one more', () => {
    const adv = fresh();
    const hero = { ...adv.hero, mana: 0, knowledge: 5, skills: { mysticism: 1 as const }, x: 3, y: 7 };
    expect(endDay({ ...adv, hero }).hero.mana).toBe(2);
  });

  it('monsters grow 10% a week, rounded, so a few goblins stay a few', () => {
    let adv = fresh();
    for (let d = 1; d < 8; d++) adv = endDay(adv);
    expect(adv.objects.find((o) => o.id === 'goblins')!.count).toBe(4);
    expect(adv.objects.find((o) => o.id === 'ogres')!.count).toBe(9);
  });

  it('a dwelling built after the Citadel opens with the boosted growth', () => {
    const adv = fresh();
    const town = { ...adv.town, built: [...adv.town.built, 'citadel' as const] };
    expect(build(town, 'archeryRange', adv.purse, ASHFORD.off).town.stock.bowman).toBe(13);
  });
});
