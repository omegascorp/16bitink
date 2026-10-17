import { describe, expect, it } from 'vitest';
import { contents } from '../src/logic/inventory';
import { suitSpecFor, markGain, markStat } from '../src/logic/marks';
import { evenLoadout, STARTER_LOADOUT } from '../src/logic/gear';
import { ORES } from '../src/logic/ore';
import { AIR, breathe, feed, FEED, GRACE, hurt, JET_RECHARGE, newSuit, pickFeed, rechargeJet, regen, restore, SHIELD, STARTER, stow, type Suit } from '../src/logic/suit';

const FUELS = { cell: 'graphite', air: 'ice' } as const;
const withOre = (s: Suit, ...ids: number[]): Suit => ids.reduce((acc, id) => stow(acc, id)!, s);

describe('the shield', () => {
  const suit = newSuit(STARTER);

  it('takes a hit before the hearts do', () => {
    const r = hurt(suit, 10);
    expect(r.hit).toBe('shield');
    expect(r.suit.shield).toBe(0);
    expect(r.suit.hearts).toBe(suit.hearts);
  });

  it('with the shield down, a hit costs a heart, then grace', () => {
    const down = hurt(suit, 10).suit;
    expect(hurt(down, 10 + GRACE / 2).hit).toBeNull();
    const r = hurt(down, 10 + GRACE);
    expect(r.hit).toBe('heart');
    expect(r.suit.hearts).toBe(suit.hearts - 1);
  });

  it('refills by itself, but only once there has been no hit for a while', () => {
    const down = hurt(suit, 10).suit;
    expect(regen(down, 1, 10 + SHIELD.delay - 0.5).shield).toBe(0);
    const back = regen(down, 1, 10 + SHIELD.delay + 1);
    expect(back.shield).toBeCloseTo(SHIELD.rate);
    expect(regen(back, 100, 100).shield).toBe(back.maxShield);
  });

  it('a part-charged shield does not stop a hit, and empties', () => {
    const part = { ...suit, shield: 0.5 };
    const r = hurt(part, 50);
    expect(r.hit).toBe('heart');
    expect(r.suit.shield).toBe(0);
  });
});

describe('life support', () => {
  const suit = newSuit(STARTER);

  it('lasts about six minutes from full', () => {
    expect(breathe(suit, AIR.seconds - 1).suit.air).toBeGreaterThan(0);
    expect(breathe(suit, AIR.seconds).suit.air).toBe(0);
  });

  it('once it is empty, a heart goes every few seconds, shield or no shield', () => {
    let s: Suit = { ...suit, air: 0 };
    let lost = 0;
    for (let t = 0; t < AIR.choke * 2 + 0.05; t += 0.05) {
      const r = breathe(s, 0.05);
      s = r.suit;
      if (r.choked) lost++;
    }
    expect(lost).toBe(2);
    expect(s.hearts).toBe(suit.hearts - 2);
    expect(s.shield).toBe(suit.shield);
  });

  it('getting air back stops the choking from carrying over', () => {
    const half = breathe({ ...suit, air: 0 }, AIR.choke - 1).suit;
    const fed = feed(withOre(half, ORES.ice.id), 'air', 'ice');
    expect(fed.ok).toBe(true);
    if (!fed.ok) return;
    expect(fed.suit.choking).toBe(0);
  });
});

describe('feeding a gauge from the bag', () => {
  const suit = newSuit(STARTER);

  it('takes one piece of the gauge’s ore and tops it up, never past full', () => {
    const low = withOre({ ...suit, energy: 10 }, ORES.graphite.id, ORES.graphite.id);
    const r = feed(low, 'cell', 'graphite');
    expect(r.ok && r.suit.energy).toBe(10 + FEED.cell);
    expect(r.ok && contents(r.suit.bag)).toEqual({ graphite: 1 });
    const nearly = feed(withOre({ ...suit, air: suit.maxAir - 1 }, ORES.ice.id), 'air', 'ice');
    expect(nearly.ok && nearly.suit.air).toBe(suit.maxAir);
  });

  it('says why it cannot: nothing to feed it, or already full', () => {
    expect(feed({ ...suit, energy: 10 }, 'cell', 'graphite')).toEqual({ ok: false, why: 'none' });
    expect(feed(withOre(suit, ORES.graphite.id), 'cell', 'graphite')).toEqual({ ok: false, why: 'full' });
  });

  it('the feed key picks the lower gauge it can feed', () => {
    const lowCell = { ...suit, energy: 10, air: 60 };
    expect(pickFeed(withOre(lowCell, ORES.graphite.id, ORES.ice.id), FUELS)).toBe('cell');
    // No graphite: the air, which there is ice for.
    expect(pickFeed(withOre(lowCell, ORES.ice.id), FUELS)).toBe('air');
    // Nothing to feed either: the lower one, to say why.
    expect(pickFeed(lowCell, FUELS)).toBe('cell');
  });
});

describe('the jetpack', () => {
  it('charges itself back up', () => {
    const empty = { ...newSuit(STARTER), fuel: 0 };
    expect(rechargeJet(empty, 1).fuel).toBe(JET_RECHARGE);
    expect(rechargeJet(empty, 100).fuel).toBe(empty.maxFuel);
  });
});

describe('the lander', () => {
  it('puts everything right: hearts, shield, air and the cell', () => {
    const worn: Suit = { ...newSuit(STARTER), hearts: 1, shield: 0, air: 3, energy: 4, choking: 2 };
    const r = restore(worn);
    expect([r.hearts, r.shield, r.air, r.energy, r.choking]).toEqual([r.maxHearts, r.maxShield, r.maxAir, r.maxEnergy, 0]);
  });
});

describe('the suit’s marks', () => {
  it('a heart on odd marks, a shield bar on even ones', () => {
    expect(suitSpecFor(STARTER_LOADOUT)).toMatchObject({ hearts: 3, shield: 1, air: 100 });
    expect(suitSpecFor(evenLoadout(1))).toMatchObject({ hearts: 4, shield: 1 });
    expect(suitSpecFor(evenLoadout(2))).toMatchObject({ hearts: 4, shield: 2 });
    expect(markGain('suit', 1)).toBe('hearts 3 → 4');
    expect(markGain('suit', 2)).toBe('shield 1 → 2 bars');
    expect(markStat('suit', 2)).toBe('4 hearts, 2 shield bars');
  });
});
