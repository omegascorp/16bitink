import { describe, expect, it } from 'vitest';
import { ORES } from '../src/logic/ore';
import { contents } from '../src/logic/inventory';
import { bagFull, burn, fits, GRACE, hurt, newSuit, spend, stow } from '../src/logic/suit';

describe('the suit', () => {
  const suit = newSuit({ energy: 5, fuel: 10, slots: 2, hearts: 2 });

  it('spends energy only when there is enough', () => {
    expect(spend(suit, 5)?.energy).toBe(0);
    expect(spend(suit, 6)).toBeNull();
  });

  it('stacks one ore a slot: a new ore needs a free slot', () => {
    const two = stow(stow(suit, ORES.copper.id)!, ORES.quartz.id)!;
    expect(stow(two, ORES.galena.id)).toBeNull();
    expect(fits(two, ORES.copper.id)).toBe(true);
    let s = two;
    for (let i = 0; i < 9; i++) s = stow(s, ORES.copper.id)!;
    expect(contents(s.bag)).toEqual({ copper: 10, quartz: 1 });
    expect(fits(s, ORES.copper.id)).toBe(false);
    expect(bagFull(s)).toBe(false);
  });

  it('loses a heart, then shrugs off hits for a grace period', () => {
    const once = hurt(suit, 10);
    expect(once.suit.hearts).toBe(1);
    expect(hurt(once.suit, 10 + GRACE / 2).hit).toBe(false);
    expect(hurt(once.suit, 10 + GRACE).suit.hearts).toBe(0);
  });

  it('burns fuel down to empty, never below', () => {
    expect(burn(suit, 4).fuel).toBe(6);
    expect(burn(suit, 40).fuel).toBe(0);
  });
});
