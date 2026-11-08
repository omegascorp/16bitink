import { describe, expect, it } from 'vitest';
import { armyOf } from '../src/logic/army';
import { armyRowW } from '../src/scenes/hud/armySlots';
import { canSendAll, tradeAll, tradeMove, tradeSlot, tradeSplit, type TradeArmies } from '../src/scenes/hud/tradeData';

const armies = (): TradeArmies => [
  armyOf([{ creature: 'spearman', count: 10 }, { creature: 'bowman', count: 5 }]),
  armyOf([{ creature: 'spearman', count: 3 }]),
];

describe('trading companies between two heroes', () => {
  it('moves a company across, into an empty slot', () => {
    const [a, b] = tradeMove(armies(), { side: 0, i: 1 }, { side: 1, i: 4 })!;
    expect(a[1]).toBeNull();
    expect(b[4]).toEqual({ creature: 'bowman', count: 5 });
  });

  it('merges like companies and swaps others', () => {
    const merged = tradeMove(armies(), { side: 1, i: 0 }, { side: 0, i: 0 });
    // Rowan's only company can't leave him with nobody.
    expect(merged).toBeNull();
    const [a, b] = tradeMove(armies(), { side: 0, i: 0 }, { side: 1, i: 0 })!;
    expect(a[0]).toBeNull();
    expect(b[0]).toEqual({ creature: 'spearman', count: 13 });
    const [sa, sb] = tradeMove(armies(), { side: 0, i: 1 }, { side: 1, i: 0 })!;
    expect(sa[1]).toEqual({ creature: 'spearman', count: 3 });
    expect(sb[0]).toEqual({ creature: 'bowman', count: 5 });
  });

  it('moves within one army without the other changing', () => {
    const before = armies();
    const [a, b] = tradeMove(before, { side: 0, i: 0 }, { side: 0, i: 6 })!;
    expect(a[6]).toEqual({ creature: 'spearman', count: 10 });
    expect(b).toBe(before[1]);
  });

  it('splits a company into a new slot of the same army', () => {
    const r = tradeSplit(armies(), { side: 1, i: 0 }, 1)!;
    expect(r.at).toEqual({ side: 1, i: 1 });
    expect(r.armies[1].filter(Boolean)).toEqual([{ creature: 'spearman', count: 2 }, { creature: 'spearman', count: 1 }]);
  });

  it('sends all but the first company over', () => {
    expect(canSendAll(armies(), 0)).toBe(true);
    expect(canSendAll(armies(), 1)).toBe(false);
    const [a, b] = tradeAll(armies(), 0)!;
    expect(a.filter(Boolean)).toEqual([{ creature: 'spearman', count: 10 }]);
    expect(b.filter(Boolean)).toEqual([{ creature: 'spearman', count: 3 }, { creature: 'bowman', count: 5 }]);
  });

  it('sizes the slots so a face and seven slots fit the card, phone to desktop', () => {
    for (let inner = 300; inner <= 600; inner += 7) {
      const slot = tradeSlot(inner, 6);
      expect(slot % 2).toBe(0);
      if (slot > 36) expect(slot + 6 + armyRowW(slot)).toBeLessThanOrEqual(inner);
    }
    expect(tradeSlot(498, 6)).toBe(58);
  });
});
