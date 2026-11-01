import { describe, expect, it } from 'vitest';
import { BAD_AIR } from '../src/level/ch3/badAir';
import { STEPS_PER_SECOND } from '../src/logic/particles';
import { audit } from './audit';
import { play } from './solver';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(BAD_AIR, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

describe('Bad Air', () => {
  it('is won by its hint: vent, gas out the roof, the flood holds the ankh door open, then the gold', () => {
    const r = play(BAD_AIR, BAD_AIR.solution);
    expect(r.possible).toBe(true);
    expect(r.status.state).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeLessThan(120);
  });

  it('keeps to the grain budget', () => {
    expect(BAD_AIR.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it.each([
    // The cistern first (the pin nearest Nib): its water runs off the lid; then the slot with the vent shut fills the gallery, and Nib climbs into it.
    [['F', 'G', '@700~1.5', 'V', '@920~1', '@1010', 'P', '@1346', 'K'], 'gassed'],
    // Left to right: the flood runs off the lid before the slot opens, the plate stays bare and the ankh door stays shut.
    [['F', 'V', '@700~1.5', 'G', '@920~1', '@1010', 'P', '@1346', 'K'], 'sealed'],
    // The slot before the vent: the narrow flue fills and the rest runs uphill into the gallery.
    [['G', 'V', '@700~1.5', 'F', '@920~1', '@1010', 'K', '@1346', 'P'], 'gassed'],
    // The gold before the flood: the overflow out of the culvert washes it off the shelf and down the grate.
    [['V', 'G', '@700~1.5', 'K', 'F', '@920~1', '@1010', '@1346', 'P'], 'drained'],
    // The trap, early: gas never goes down, and the open plug drains the flood, so the plate never holds.
    [['P', 'V', '@700~1.5', 'G', '@920~1', '@1010', 'F', '@1346', 'K'], 'sealed'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  if (process.env.AUDIT) it('audit', () => console.log('AUDIT ' + JSON.stringify(audit(BAD_AIR))), 3_600_000);
}, 300_000);
