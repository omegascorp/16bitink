import { describe, expect, it } from 'vitest';
import { PUMICE_RAFT } from '../src/level/ch2/pumiceRaft';
import type { Stop } from '../src/logic/level';
import { LAVA, STEPS_PER_SECOND, STONE } from '../src/logic/particles';
import { World } from '../src/logic/world';
import { audit } from './audit';
import { play } from './solver';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/** How a pull order ends: 'won', the loss cause, 'playing' (stuck), or 'blocked'. */
const outcome = (order: readonly string[]): string => {
  const r = play(PUMICE_RAFT, order);
  if (!r.possible) return 'blocked';
  return r.status.state === 'lost' ? r.status.cause : r.status.state;
};

/** The landing's near edge: the raft is over once its middle is this far along. */
const LANDING = 590;

/**
 * Plays the hint as the bot does (test/solver.ts's play), and notes where
 * the raft and Nib were after each pull, and how much lava is left.
 */
function watchSolution(): { won: boolean; seconds: number; raft: number[]; nib: number[]; lava: number; stone: number; raftY: number } {
  const w = new World(PUMICE_RAFT);
  const run = (steps: number): void => {
    for (let s = 0; s < steps && !w.finished; s++) {
      w.step();
      if (s > 30 && w.settled && w.nibOrder.kind === 'stay') break;
    }
  };
  const stops = PUMICE_RAFT.stops ?? [];
  const visit = (list: readonly Stop[], steps: number): void => {
    for (const s of list) {
      if (w.finished) return;
      w.command({ kind: 'goto', x: s.x });
      run(steps);
    }
  };
  const raft: number[] = [];
  const nib: number[] = [];
  const r = w.boulders[0]!;
  let lava = 0;
  let stone = 0;
  for (const id of PUMICE_RAFT.solution) {
    w.pull(id);
    run(STEPS_PER_SECOND * 8);
    raft.push(r.x);
    nib.push(w.nib.x);
    visit(stops, STEPS_PER_SECOND * 8);
  }
  const back = [...stops].reverse();
  visit([...back, ...stops, ...back, ...stops], (STEPS_PER_SECOND * 25) / 4);
  w.leave();
  lava = w.grains.countOf(LAVA);
  stone = w.grains.countOf(STONE);
  return { won: w.status.state === 'won', seconds: w.steps / STEPS_PER_SECOND, raft, nib, lava, stone, raftY: r.y };
}

describe('The Pumice Raft', () => {
  it('is won by its hint in a minute or more: the raft comes to Nib, carries him over, and the river is cooled behind him', () => {
    const r = watchSolution();
    expect(r.won).toBe(true);
    expect(r.seconds).toBeGreaterThanOrEqual(60);
    // D: the raft has come out of its cave to the dock under Nib's shelf.
    expect(r.raft[0]).toBeGreaterThan(410);
    expect(r.raft[0]).toBeLessThan(470);
    // M: it has carried Nib over to the landing, standing on it.
    expect(r.raft[1]).toBeGreaterThan(LANDING);
    expect(Math.abs(r.nib[1]! - r.raft[1]!)).toBeLessThan(40);
    // W: the whole river, cave to culvert, set to stone.
    expect(r.lava).toBe(0);
    expect(r.stone).toBe(PUMICE_RAFT.fills.filter((f) => f.kind === LAVA).reduce((n, f) => n + f.count, 0));
    // And the raft is still there, set in the stone.
    expect(r.raftY).toBeLessThan(1060);
  });

  it('keeps to the grain budget', () => {
    expect(PUMICE_RAFT.fills.reduce((n, f) => n + f.count, 0)).toBeLessThanOrEqual(700);
  });

  it.each([
    // The post before the dam: the raft is still in its cave, and Nib walks out along the run into the hot basin.
    [['M', 'D', 'W', 'X'], 'burnt'],
    // The water first: it pours into the empty dock, Nib wades in after it, and the cave's lava comes in on top of him.
    [['W', 'D', 'M', 'X'], 'burnt'],
    // The water with the raft docked: the dock sets with the raft in it, and Nib walks out into the basin, still hot behind the post.
    [['D', 'W', 'M', 'X'], 'burnt'],
    // The vault on the hot river: the lava pours through the culvert into the vault after Nib.
    [['D', 'M', 'X', 'W'], 'burnt'],
    // The vault first, then the water with Nib still on the docked raft: it settles into the cooling lava with him.
    [['D', 'X', 'W', 'M'], 'burnt'],
    // The vault first of all: no raft, and Nib walks off his shelf into the dock.
    [['X', 'D', 'M', 'W'], 'burnt'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  if (process.env.AUDIT) it('audit', () => console.log('AUDIT ' + JSON.stringify(audit(PUMICE_RAFT))), 3_600_000);
}, 120_000);
