import { describe, expect, it } from 'vitest';
import { ORES } from '../src/logic/ore';
import { bagValue, burn, GRACE, hurt, newSuit, spend, stow } from '../src/logic/suit';

describe('the suit', () => {
  const suit = newSuit({ energy: 5, fuel: 10, bag: 2, hearts: 2 });

  it('spends energy only when there is enough', () => {
    expect(spend(suit, 5)?.energy).toBe(0);
    expect(spend(suit, 6)).toBeNull();
  });

  it('holds only as many pieces as the bag has room for', () => {
    const full = stow(stow(suit, ORES.copper.id)!, ORES.quartz.id)!;
    expect(stow(full, ORES.copper.id)).toBeNull();
    expect(bagValue(full.bag)).toBe(ORES.copper.value + ORES.quartz.value);
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
