import { describe, expect, it } from 'vitest';
import { runInSlices } from '../src/slices';

/** A clock the test moves by hand: each job "takes" `cost` ms. */
function fakeClock(cost: number): { now: () => number; tick: () => void } {
  let t = 0;
  return { now: () => t, tick: () => { t += cost; } };
}

describe('runInSlices', () => {
  it('runs every job once, in order', async () => {
    const ran: number[] = [];
    await runInSlices([0, 1, 2, 3].map((i) => () => { ran.push(i); }), { yieldTo: async () => undefined });
    expect(ran).toEqual([0, 1, 2, 3]);
  });

  it('yields to the browser whenever a slice uses up its budget', async () => {
    const clock = fakeClock(10);
    let yields = 0;
    const jobs = Array.from({ length: 10 }, () => clock.tick);
    await runInSlices(jobs, { budgetMs: 25, now: clock.now, yieldTo: async () => { yields += 1; } });
    // 10 ms jobs in 25 ms slices: three jobs per slice, so four slices and three yields between them.
    expect(yields).toBe(3);
  });

  it('reports progress after each slice, ending at exactly 1', async () => {
    const clock = fakeClock(10);
    const seen: number[] = [];
    const jobs = Array.from({ length: 4 }, () => clock.tick);
    await runInSlices(jobs, { budgetMs: 15, now: clock.now, yieldTo: async () => undefined, onProgress: (f) => seen.push(f) });
    expect(seen).toEqual([0.5, 1]);
  });

  it('reports done straight away for no jobs', async () => {
    const seen: number[] = [];
    await runInSlices([], { onProgress: (f) => seen.push(f) });
    expect(seen).toEqual([1]);
  });

  it('stops at the first failing job and rejects with its error', async () => {
    const ran: number[] = [];
    const boom = new Error('no canvas');
    const jobs = [() => { ran.push(0); }, () => { throw boom; }, () => { ran.push(2); }];
    await expect(runInSlices(jobs, { yieldTo: async () => undefined })).rejects.toBe(boom);
    expect(ran).toEqual([0]);
  });
});
