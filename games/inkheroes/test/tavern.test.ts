import { describe, expect, it } from 'vitest';
import { ASHFORD, THORNWOOD } from '../src/level/borderMarch';
import { startAdventure, townById } from '../src/logic/adventure';
import { hireHero } from '../src/logic/heroes';
import { tavernOffer } from '../src/scenes/town/tavernData';

const ashford = 'ashford-town';
const part2 = () => ({ ...startAdventure(THORNWOOD), prompts: [] });

describe("the Tavern's offer", () => {
  it('shows Ianthe from part 2: her class, what she knows and her price', () => {
    const a = part2();
    const o = tavernOffer(a, THORNWOOD, townById(a, ashford)!);
    expect(o.hero?.name).toBe('Ianthe');
    expect(o.title).toBe('Cleric');
    expect(o.knows).toBe('Basic Wisdom · Wisdom of Athena, Healing');
    expect(o.price).toBe('2500 gold');
    expect(o.hire).toEqual({ enabled: true });
    expect(o.note).toMatch(/in Ashford's gate/);
    // A hero in the gate must make room first: no Hire, and the reason.
    const t = townById(a, ashford)!;
    const blocked = tavernOffer({ ...a, hero: { ...a.hero, x: t.x, y: t.y } }, THORNWOOD, t);
    expect(blocked.note).toMatch(/Rowan stands in the gate/);
    expect(blocked.hire).toBeNull();
  });

  it('dims Hire without the gold, and says why', () => {
    const a = part2();
    const o = tavernOffer({ ...a, purse: { ...a.purse, gold: 10 } }, THORNWOOD, townById(a, ashford)!);
    expect(o.hire).toEqual({ enabled: false });
    expect(o.note).toMatch(/2500 gold/);
  });

  it('has no Hire once she rides with you, or on map 1', () => {
    const hired = hireHero(part2(), THORNWOOD, ashford)!;
    const o = tavernOffer(hired, THORNWOOD, townById(hired, ashford)!);
    expect(o.hero).toBeNull();
    expect(o.hire).toBeNull();
    expect(o.note).toMatch(/already rides/);
    const one = startAdventure(ASHFORD);
    expect(tavernOffer(one, ASHFORD, townById(one, ashford)!).hero).toBeNull();
  });
});

describe('the Tavern room', () => {
  it('puts the figure beside the words when there is room, and always fits the width', async () => {
    const { tavernLayout } = await import('../src/scenes/town/tavernData');
    expect(tavernLayout({ w: 1000, h: 500 })).toMatchObject({ w: 440, side: true });
    expect(tavernLayout({ w: 382, h: 500 })).toMatchObject({ w: 382, side: false });
    for (const w of [300, 382, 439, 440, 900]) expect(tavernLayout({ w, h: 400 }).w).toBeLessThanOrEqual(w);
  });
});
