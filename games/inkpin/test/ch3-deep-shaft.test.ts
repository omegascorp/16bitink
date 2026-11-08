import { describe, expect, it } from 'vitest';
import { DEEP_SHAFT } from '../src/level/ch3/deepShaft';
import { STEPS_PER_SECOND } from '../src/logic/particles';
import { audit } from './audit';
import { play } from './solver';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(DEEP_SHAFT, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

describe('The Deep Shaft', () => {
  it('is won by its hint: boulder in the closet, the blast, the flood, the lava step, the gold, the climb', () => {
    const r = play(DEEP_SHAFT, DEEP_SHAFT.solution);
    expect(r.possible).toBe(true);
    expect(r.status.state).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeLessThan(120);
  });

  it('keeps to the grain budget', () => {
    expect(DEEP_SHAFT.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it.each([
    // The tempting first pull: the cistern puts the bowl out, the gas pools unlit under the roof and the bar stands.
    [['X', 'B', 'G', 'S', '@440~0.5', 'L', 'K', '@720~0.5', '@1010'], 'sealed'],
    // The gas before the boulder: the blast breaks its chute, and the boulder drops through the roof and rolls down the stair onto Nib.
    [['G', 'B', 'S', 'X', '@440~0.5', 'L', 'K', '@720~0.5', '@1010'], 'crushed'],
    // The vat before the gas: its lava brims out of the dry pit and runs down onto the well's lid, and lights the gas low.
    [['B', 'L', 'G', 'S', 'X', '@440~0.5', 'K', '@720~0.5', '@1010'], 'sealed'],
    // The vat before the flood: the lava stays hot and brims down the stair onto Nib as he climbs.
    [['B', 'G', 'S', 'L', '@440~0.5', 'X', 'K', '@720~0.5', '@1010'], 'burnt'],
    // The gold before the lava: it lands in the pit's water, and the lava melts it.
    [['B', 'G', 'S', 'X', '@440~0.5', 'K', 'L', '@720~0.5', '@1010'], 'melted'],
    // The obvious order (nearest pin first, and left to right): the lava pours into the dry pit and Nib walks into it.
    [['S', 'G', 'L', 'K', '@440~0.5', 'B', 'X', '@720~0.5', '@1010'], 'burnt'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  if (process.env.AUDIT) it('audit', () => console.log('AUDIT ' + JSON.stringify(audit(DEEP_SHAFT))), 3_600_000);
}, 300_000);
