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
const LANDING = 570;

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
  it('is won by its hint: the raft comes to Nib, takes the hopper\'s gold aboard, carries him over, and the river is cooled behind him', () => {
    const r = watchSolution();
    expect(r.won).toBe(true);
    expect(r.seconds).toBeGreaterThanOrEqual(60);
    // D: the raft has come out of its cave to the dock under Nib's shelf.
    expect(r.raft[0]).toBeGreaterThan(420);
    expect(r.raft[0]).toBeLessThan(480);
    // G: the hopper's gold has landed on the docked raft and Nib has it.
    expect(Math.abs(r.raft[1]! - r.raft[0]!)).toBeLessThan(20);
    // M: it has carried Nib over to the landing, standing on it.
    expect(r.raft[2]).toBeGreaterThan(LANDING);
    expect(Math.abs(r.nib[2]! - r.raft[2]!)).toBeLessThan(40);
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
    // The post before the dam: nothing to ride, and Nib, held at the dam till then, drops in on the surge.
    [['M', 'D', 'G', 'W', 'X', 'Y'], 'burnt'],
    // The vault first of all: no raft, and Nib walks off his shelf into the dock.
    [['X', 'D', 'G', 'M', 'W', 'Y'], 'burnt'],
    // The water first (the obvious first pull, nearest Nib): it pours into the empty dock, and the cave's lava comes in on top of Nib.
    [['W', 'D', 'G', 'M', 'X', 'Y'], 'burnt'],
    // The hopper before the dam: the gold falls on the empty dock, and the lava that follows melts it.
    [['G', 'D', 'M', 'W', 'X', 'Y'], 'melted'],
    // The raft sent off before its cargo: the gold falls into the lava behind it and melts.
    [['D', 'M', 'G', 'W', 'X', 'Y'], 'melted'],
    // The water with the raft docked (it sets the dock, and the basin, behind the post, stays hot): Nib walks out into it.
    [['D', 'W', 'G', 'M', 'X', 'Y'], 'burnt'],
    // The water after the cargo but before the ferry: the same, looks right until the post goes.
    [['D', 'G', 'W', 'M', 'X', 'Y'], 'burnt'],
    // The vault on the hot river before the ferry: the lava pours through the culvert and the raft is stranded.
    [['D', 'G', 'X', 'M', 'W', 'Y'], 'burnt'],
    // The vault on the hot river after the ferry: the lava pours through the culvert into the vault after Nib.
    [['D', 'G', 'M', 'X', 'W', 'Y'], 'burnt'],
    // The vault hopper first: harmless itself, but Nib waits at the dam, and jumps into the lava the moment it runs.
    [['Y', 'D', 'G', 'M', 'W', 'X'], 'burnt'],
  ])('%j loses: %s', (order, cause) => {
    expect(outcome(order)).toBe(cause);
  });

  if (process.env.AUDIT) it('audit', () => console.log('AUDIT ' + JSON.stringify(audit(PUMICE_RAFT))), 3_600_000);
}, 120_000);
