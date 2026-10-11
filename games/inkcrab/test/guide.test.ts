import { describe, expect, it } from 'vitest';
import { INKCRAB_PAID_BEACHES } from '../content/paid';
import { CREATURE_GUIDE, guidePages, SHELL_GUIDE } from '../src/guide';
import { GUIDE_LIMITS } from '../src/guide/types';
import { BEACH_1 } from '../src/level/beach1';
import { SHELL_KINDS } from '../src/logic/shells';
import { SPECIES } from '../src/logic/species';

const BIRDS = ['kestrel', 'hawk', 'kingfisher', 'osprey', 'brahminy', 'snowyowl'];

function checkLimits(cards: Readonly<Record<string, object>>): void {
  for (const [id, card] of Object.entries(cards)) {
    for (const [key, value] of Object.entries(card) as [string, string][]) {
      const limit = key === 'fact' ? GUIDE_LIMITS.fact : GUIDE_LIMITS.field;
      expect(value.trim().length, `${id}.${key}`).toBeGreaterThan(0);
      expect(value.length, `${id}.${key}: "${value}"`).toBeLessThanOrEqual(limit);
    }
  }
}

describe('field guide cards', () => {
  it('has a card for every creature and bird in the game', () => {
    const missing = [...Object.keys(SPECIES), ...BIRDS].filter((id) => !(id in CREATURE_GUIDE));
    expect(missing).toEqual([]);
  });

  it('has a card for every shell in the game', () => {
    expect(SHELL_KINDS.filter((kind) => !(kind in SHELL_GUIDE))).toEqual([]);
  });

  it('keeps every card short enough to fit its panel', () => {
    checkLimits(CREATURE_GUIDE);
    checkLimits(SHELL_GUIDE);
  });

  it('has a card for everything the pages list', () => {
    for (const page of guidePages([BEACH_1, ...INKCRAB_PAID_BEACHES])) {
      for (const id of page.creatures) expect(CREATURE_GUIDE[id], id).toBeDefined();
      for (const kind of page.shells) expect(SHELL_GUIDE[kind], kind).toBeDefined();
    }
  });
});
