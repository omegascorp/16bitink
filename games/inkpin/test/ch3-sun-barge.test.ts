import { describe, expect, it } from 'vitest';
import { SUN_BARGE } from '../src/level/ch3/sunBarge';
import { COIN, GAS, LAVA, STEPS_PER_SECOND, STONE, WATER, type Kind } from '../src/logic/particles';
import type { World } from '../src/logic/world';
import { play } from './solver';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/** How a pull order ends: 'won', the loss cause, 'stuck'/'playing', or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(SUN_BARGE, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

/** PROBE="V,G,..." prints the board's state after each step (a tuning aid). */
const snap = (w: World, i: number): string => {
  const g = w.grains;
  const n = (k: Kind): number => g.countOf(k);
  const raft = w.boulders.find((b) => b.raft);
  const p = w.plates[0]!;
  const r = (v: number): number => Math.round(v);
  return `#${i} nib(${r(w.nib.x)},${r(w.nib.y)}) plate ${p.weight}${p.down ? ' down' : ''} door ${r(w.doors[0]!.open)} bowl ${w.bowls[0]!.lit ? 'lit' : 'out'} bar ${w.broken[28] ? 'broken' : 'stands'} raft ${raft ? `(${r(raft.x)},${r(raft.y)})` : '-'} frogs ${w.blots.map((b) => `(${r(b.x)},${r(b.y)}${b.puffed ? ' puffed' : ''}${b.gone ? ' ' + b.gone : ''})`).join(' ')} rubies ${w.rubies.map((b) => `(${r(b.x)},${r(b.y)})`).join(' ')} water ${n(WATER)} lava ${n(LAVA)} stone ${n(STONE)} coin ${n(COIN)} gas ${n(GAS)} ${w.status.state}${w.status.state === 'lost' ? ':' + w.status.cause : ''}`;
};

describe('The Sun Barge', () => {
  if (process.env.PROBE) {
    it('probe', () => {
      let open = 0;
      const r = play(SUN_BARGE, process.env.PROBE!.split(','), false, (w, i) => { console.log(snap(w, i) + ` doorMax ${Math.round(open)}`); open = 0; }, (w) => { open = Math.max(open, w.doors[0]!.open); });
      console.log(`end ${r.status.state} ${r.status.state === 'lost' ? r.status.cause : ''} t=${(r.steps / STEPS_PER_SECOND).toFixed(1)}`);
    }, 600_000);
    return;
  }

  it('is won by its hint', () => {
    const r = play(SUN_BARGE, SUN_BARGE.solution);
    expect(r.possible).toBe(true);
    expect(r.status.state).toBe('won');
    expect(r.steps / STEPS_PER_SECOND).toBeLessThan(120);
  });

  it('keeps to the grain budget', () => {
    expect(SUN_BARGE.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it.each([
    // The obvious order, left to right: S first runs the canal out of the gangway's grate, so there is no surge and no leak, and K's gold falls into the hot gutter.
    [['S', 'V', 'U', 'G', 'C', 'K', '@440', '@1215'], 'melted'],
    // K before the dam: the gutter is still lava when the gold drops.
    [['V', 'K', 'G', 'U', 'C', 'S', '@440', '@1215'], 'melted'],
    // The gold first: it falls into the empty berth and down its grate, the barge alone is too light, and the sun trapdoor stays shut over Nib.
    [['C', 'G', 'V', 'U', 'S', 'K', '@440', '@1215'], 'sealed'],
    // The dam before the frog's vent: V lies across U's slide, so U can't come out.
    [['U', 'V', 'G', 'C', 'K', 'S', '@440', '@1215'], 'blocked'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  if (process.env.AUDIT) it('audit', async () => console.log('AUDIT ' + JSON.stringify((await import('./audit')).audit(SUN_BARGE))), 3_600_000);
}, 180_000);
