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

/** Nib waits on his ledge until the pins are done, then walks to the chest. */
const WALK = ['@806'];

describe('Bad Air', () => {
  it('is won by its hint: vent, hatch, the gas goes out the roof, and the flood holds the vault door open', () => {
    const r = play(BAD_AIR, BAD_AIR.solution);
    expect(r.possible).toBe(true);
    expect(r.status.state).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeLessThan(120);
  });

  it('also wins with the hatch before the vent (both are open before the gas comes)', () => {
    expect(outcome(['T', 'U', 'G', 'F', ...WALK])).toBe('won');
  });

  it('keeps to the grain budget', () => {
    expect(BAD_AIR.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it.each([
    // The slot first (the pin nearest Nib): the gas runs up the ceiling into the low gallery and waits for him there.
    [['G', 'U', 'T', 'F'], 'gassed'],
    // Left to right: the flood runs off and the gas fills the gallery; with every pin out, the shut door seals him first.
    [['F', 'G', 'T', 'P', 'U'], 'sealed'],
    // The hatch open but the vent shut: the small flue fills and the rest spills up into the gallery.
    [['T', 'G', 'U', 'F'], 'gassed'],
    // The flood before the slot: it runs off down the grate and the vault door stays shut (sealed once every pin is out).
    [['U', 'T', 'F', 'G', 'P'], 'sealed'],
    // The trap, last: the plug in the pit's floor drains the flood, the plate lifts and the door drops.
    [['U', 'T', 'G', 'F', 'P'], 'sealed'],
    // The trap, first: gas never goes down, so the pit's gas stays, and later the flood drains away.
    [['P', 'U', 'T', 'G', 'F'], 'sealed'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome([...order, ...WALK])).toBe(cause);
  });

  if (process.env.AUDIT) it('audit', () => console.log('AUDIT ' + JSON.stringify(audit(BAD_AIR))), 3_600_000);
}, 120_000);
