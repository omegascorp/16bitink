import { describe, expect, it } from 'vitest';
import { ASHFORD } from '../src/level/borderMarch';
import { dailyIncome, heroSide, startAdventure } from '../src/logic/adventure';
import { createBattle } from '../src/logic/battle';
import { speedOf } from '../src/logic/damage';
import { creature } from '../src/logic/creatures';
import type { Hero } from '../src/logic/hero';
import { gainItem, gearBonus, gearGold, hasAsGood, SET_NAMES, takeOff, wear, withGear, type Gear, type ItemId } from '../src/logic/items';
import { setProgress, wearsWords } from '../src/logic/sets';
import { parseAdventure } from '../src/logic/save';

const rowan = (): Hero => startAdventure(ASHFORD).hero;
const wearing = (gear: Gear): Hero => ({ ...rowan(), gear });
const SPARTAN: Gear = { helm: 'spartanHelm', cuirass: 'spartanCuirass', bracers: 'spartanBracers', belt: 'agogeBelt', greaves: 'spartanGreaves', boots: 'laconianBoots' };

describe('set bonuses', () => {
  it('come at 2, 4 and 6 pieces worn, each on top of the last', () => {
    const two = gearBonus(wearing({ helm: 'corinthianHelm', cuirass: 'bellCuirass' }));
    // Pieces: +1 Defense, +1 Sight; +1 Defense, +50 gold. Two worn: +1 Morale.
    expect(two).toEqual({ defense: 2, sight: 1, gold: 50, morale: 1 });
    const one = gearBonus(wearing({ helm: 'corinthianHelm' }));
    expect(one.morale).toBeUndefined();
    const six = gearBonus(wearing(SPARTAN));
    // Spartan: 2 +1 Defense, 4 +1 Attack +1 Defense, 6 +1 Speed.
    expect(six.speed).toBe(1);
    expect(six.defense).toBe(2 + 2 + 1 + 1 + 1 + 1);
  });

  it('gray sets give none', () => {
    const bronze: Gear = { helm: 'bronzeHelm', cuirass: 'bronzeCuirass', bracers: 'bronzeBracers', belt: 'warBelt', greaves: 'bronzeGreaves', boots: 'warSandals' };
    expect(gearBonus(wearing(bronze))).toEqual({ defense: 3, attack: 2, morale: 1 });
  });

  it('name every set from the catalog, the gray ones too', () => {
    expect(SET_NAMES.bronze).toBe('Bronze set');
    expect(SET_NAMES.scale).toBe('Scale set');
    expect(SET_NAMES.spartan).toBe('Spartan set');
  });

  it('show on the Gear tab as progress, each bonus lit once it is on', () => {
    const [s] = setProgress(wearing({ helm: 'spartanHelm', cuirass: 'spartanCuirass', bracers: 'spartanBracers' }));
    expect(s).toMatchObject({ id: 'spartan', name: 'Spartan set', worn: 3 });
    expect(s!.tiers.map((t) => [t.at, t.lit])).toEqual([[2, true], [4, false], [6, false]]);
    expect(s!.tiers[2]!.says).toBe('+1 Speed to every company');
    expect(setProgress(wearing({ helm: 'bronzeHelm' }))[0]).toMatchObject({ name: 'Bronze set', worn: 1, tiers: [] });
  });

  it('speed reaches every company in battle', () => {
    const fast = { ...wearing(SPARTAN), army: rowan().army };
    const st = createBattle(heroSide(fast), { hero: null, army: [{ creature: 'goblin', count: 5 }, null, null, null, null, null, null] }, 1).state;
    const mine = st.stacks.filter((s) => s.side === 0);
    expect(mine.length).toBeGreaterThan(0);
    for (const s of mine) expect(speedOf(s)).toBe(creature(s.creature).speed + 1);
    for (const s of st.stacks.filter((x) => x.side === 1)) expect(speedOf(s)).toBe(creature(s.creature).speed);
  });

  it('gold pieces pay every day', () => {
    const adv = startAdventure(ASHFORD);
    const paid = { ...adv, hero: { ...adv.hero, gear: { cuirass: 'bellCuirass' as ItemId, belt: 'hopliteBelt' as ItemId } } };
    expect(gearGold([paid.hero])).toBe(100);
    expect(dailyIncome(paid).gold - dailyIncome(adv).gold).toBe(100);
  });

  it('a foe\'s card says what he wears', () => {
    expect(wearsWords(wearing({ helm: 'bronzeHelm', belt: 'warBelt' }))).toBe('wearing Bronze Helm and War Belt');
    expect(wearsWords(wearing({}))).toBe('');
  });

  it('withGear counts the set bonus in the four stats', () => {
    const h = wearing({ helm: 'myrmidonHelm', cuirass: 'myrmidonCuirass' });
    // +2 Defense +1 Morale, +2 Defense +1 Attack, and the 2-piece bonus +1 Attack +1 Defense.
    expect(withGear(h).defense - h.defense).toBe(5);
    expect(withGear(h).attack - h.attack).toBe(2);
  });
});

describe('rings fit either hand', () => {
  const ringed = (): Hero => ({ ...rowan(), gear: {} });

  it('a second ring goes on the other hand, a third into the bag', () => {
    const one = gainItem(ringed(), 'oliveWoodRing');
    expect(one.hero.gear).toMatchObject({ ring1: 'oliveWoodRing' });
    const two = gainItem(one.hero, 'oliveWoodRing');
    expect(two).toMatchObject({ worn: true, hero: { gear: { ring1: 'oliveWoodRing', ring2: 'oliveWoodRing' } } });
    const three = gainItem(two.hero, 'oliveWoodRing');
    expect(three).toMatchObject({ worn: false, kept: true });
    expect(three.hero.bag).toEqual(['oliveWoodRing']);
  });

  it('a ring worn from the bag fills an empty hand first, else swaps with the first, or the hand asked for', () => {
    const h: Hero = { ...ringed(), gear: { ring1: 'oliveWoodRing' }, bag: ['oliveWoodRing'] };
    expect(wear(h, 0).gear).toMatchObject({ ring1: 'oliveWoodRing', ring2: 'oliveWoodRing' });
    const full: Hero = { ...ringed(), gear: { ring1: 'oliveWoodRing', ring2: 'oliveWoodRing' }, bag: ['bronzeHelm'] };
    expect(wear(full, 0).gear).toMatchObject({ helm: 'bronzeHelm' });
    const swap: Hero = { ...full, bag: ['oliveWoodRing'] };
    expect(wear(swap, 0, 'ring2').bag).toEqual(['oliveWoodRing']);
    expect(wear(swap, 0, 'helm')).toBe(swap);
  });

  it('a ring on the second hand counts as held, comes off, and survives a reload', () => {
    const h: Hero = { ...ringed(), gear: { ring2: 'oliveWoodRing' } };
    expect(hasAsGood(h, 'oliveWoodRing')).toBe(true);
    expect(takeOff(h, 'ring2').bag).toEqual(['oliveWoodRing']);
    const adv = { ...startAdventure(ASHFORD), hero: h };
    expect(parseAdventure(JSON.parse(JSON.stringify(adv)), ASHFORD)!.hero.gear).toEqual({ ring2: 'oliveWoodRing' });
  });
});
