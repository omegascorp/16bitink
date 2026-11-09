import { describe, expect, it } from 'vitest';
import { ABU, NEKHEN } from '../src/level/twoLands';
import { battleSides, type Adventure } from '../src/logic/adventure';
import { partDays } from '../src/logic/chapter';
import type { MachineId } from '../src/logic/creatures';
import type { ItemId } from '../src/logic/items';
import { survivors } from '../src/logic/battle';
import { armyStrength, autoBattle } from '../src/logic/rival';
import { playPart, rideOnInto, type BotOptions, type BotRun } from './partBot';

/** Node's environment, as far as this test needs it (the project has no Node types). */
declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/**
 * Part 5's balance on the real rules (docs/inkheroes-design.md, "Part 5:
 * Abu"): the bot of partBot.ts plays Nekhen, rides on into Abu with the army
 * it earned, buys an Earth Ramp at Nekhen's Workshop and takes Abu, in three
 * styles. The siege is also replayed from the same moment with no machine
 * and with each grade of ramp, as Thornwood's table was. BALANCE_SEEDS=24
 * plays more seeds and prints the table the doc quotes.
 */
const STYLES = { rush: { edge: 1.6, bossEdge: 1.3 }, steady: { edge: 2, bossEdge: 1.6 }, careful: { edge: 2.5, bossEdge: 2 } } as const;
const SEEDS = Number(process.env.BALANCE_SEEDS ?? 3);
const MACHINES: readonly (MachineId | null)[] = [null, 'ramp', 'ramp2', 'ramp3'];

interface AbuRun {
  readonly nekhen: BotRun;
  readonly abu: BotRun;
  /** The adventure as the bot rode at Abu's gate. */
  readonly atGate?: Adventure;
}

function play(style: keyof typeof STYLES, i: number): AbuRun {
  const opts: BotOptions = { seed: 1000 + i * 7919, ...STYLES[style] };
  const nekhen = playPart(NEKHEN, opts);
  let atGate: Adventure | undefined;
  const abu = rideOnInto(nekhen, NEKHEN, ABU, { ...opts, goalFirst: true, beforeGoal: (a) => { atGate = a; } });
  return { nekhen, abu, ...(atGate ? { atGate } : {}) };
}

const share = (before: number, after: number): number => Math.round((1 - after / before) * 100);

/** The siege of Abu from `adv`, with war machine `m` (or none): the share of the army's strength it costs (100 if lost). */
function siegeCost(adv: Adventure, m: MachineId | null): number {
  const { machine: _worn, ...gear } = adv.hero.gear ?? {};
  const hero = { ...adv.hero, gear: m ? { ...gear, machine: m as ItemId } : gear };
  const setup = battleSides({ ...adv, hero }, ABU.goal.target);
  // As the bot plays it: its hero casts no spells (with them the siege costs less: 19% with no machine, Nov 9).
  const st = autoBattle(setup.attacker, setup.defender, setup.seed, setup.siege, [false, true]);
  const before = armyStrength(adv.hero.army);
  return st.winner === 0 ? share(before, armyStrength(survivors(st, 0, setup.attacker.army))) : 100;
}

const mean = (xs: readonly number[]): number => Math.round(xs.reduce((n, x) => n + x, 0) / Math.max(1, xs.length));

describe('Abu, ridden on into from Nekhen by a bot that builds, hires and buys a ramp', () => {
  const table = (['rush', 'steady', 'careful'] as const).map((style) => ({ style, runs: Array.from({ length: SEEDS }, (_, i) => play(style, i)) }));

  it('is won every time, within par', () => {
    for (const { style, runs } of table) {
      for (const r of runs) {
        expect(r.nekhen.won, style).toBe(true);
        expect(r.abu.won, `${style}: Abu lost or unfinished on day ${r.abu.day}`).toBe(true);
        expect(partDays(r.abu.adv), style).toBeLessThanOrEqual(ABU.parDays);
      }
    }
  });

  it('brings the ramp to the siege, and makes the siege cost about what Thornwood’s did', () => {
    const gates = table.flatMap(({ runs }) => runs.flatMap((r) => (r.atGate ? [r.atGate] : [])));
    expect(gates.length).toBe(table.length * SEEDS);
    for (const g of gates) expect(g.hero.gear?.machine, 'the bot buys a ramp at the Workshop').toBe('ramp');
    const costs = MACHINES.map((m) => mean(gates.map((g) => siegeCost(g, m))));
    const [none, earth] = costs as [number, number, number, number];
    // Thornwood: 35% with no machine, 28% with a Catapult.
    expect(none).toBeGreaterThanOrEqual(25);
    expect(none).toBeLessThanOrEqual(45);
    expect(earth).toBeGreaterThanOrEqual(18);
    expect(earth).toBeLessThan(none);
    if (process.env.BALANCE_SEEDS) console.info(`Abu's siege, share of the army lost: none ${costs[0]}%, Earth Ramp ${costs[1]}%, Brick Ramp ${costs[2]}%, Pyramid Builders ${costs[3]}%`);
  }, 300_000);

  it('keeps the rest of the part in line with Thornwood’s: small fights on the way, the siege the real test', () => {
    for (const { style, runs } of table) {
      for (const r of runs) {
        const others = r.abu.fights.filter((f) => f.id !== ABU.goal.target);
        for (const f of others) expect(share(f.before, f.after), `${style} ${f.id} on day ${f.day}`).toBeLessThanOrEqual(style === 'rush' ? 30 : 20);
      }
    }
    if (process.env.BALANCE_SEEDS) {
      for (const { style, runs } of table) {
        const days = runs.map((r) => partDays(r.abu.adv)).sort((a, b) => a - b);
        const arrive = runs.map((r) => r.nekhen.day).sort((a, b) => a - b);
        const strength = runs.flatMap((r) => (r.atGate ? [Math.round(armyStrength(r.atGate.hero.army))] : [])).sort((a, b) => a - b);
        const siege = runs.flatMap((r) => (r.abu.goal ? [share(r.abu.goal.before, r.abu.goal.after)] : [])).sort((a, b) => a - b);
        const others = runs.flatMap((r) => r.abu.fights.filter((f) => f.id !== ABU.goal.target).map((f) => share(f.before, f.after)));
        const garrison = Math.round(armyStrength(ABU.towns![0]!.garrison));
        console.info(`abu ${style}: garrison ${garrison}, at the gate on part day ${runs.map((r) => (r.atGate ? partDays(r.atGate) : '-')).join(',')}, won ${runs.filter((r) => r.abu.won).length}/${runs.length}, rides on day ${arrive[0]}–${arrive.at(-1)}, part days ${days[0]}–${days.at(-1)}, army at the gate ${strength[0]}–${strength.at(-1)}, siege (Earth Ramp) lost ${siege[0]}–${siege.at(-1)}%, other fights mean ${mean(others)}% max ${Math.max(0, ...others)}% (${others.length} fights)`);
      }
    }
  });
});
