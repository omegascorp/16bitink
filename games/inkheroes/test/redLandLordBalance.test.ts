import { describe, expect, it } from 'vitest';
import { RED_LAND } from '../src/level/twoLands';
import { rivalHeroes, startAdventure, type Adventure } from '../src/logic/adventure';
import { armyStrength } from '../src/logic/strength';
import { knowsHome, playLordPart, type LordRun } from './lordBot';
import { redRiddenOn } from './twoLandsRuns';

/** Node's environment, as far as this test needs it (the project has no Node types). */
declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/**
 * The Red Land with Sethi as a lord (docs/inkheroes-design.md, "Part 4:
 * The Delta", Sethi; the table is in "Part 3 as built"): AI against AI as Othrys, the lord mind playing our
 * side and his, (a) fresh and (b) ridden on (the bot plays Nekhen and Abu).
 * Only with BALANCE_SEEDS (it prints the table the doc quotes).
 */

const SEEDS = Number(process.env.BALANCE_SEEDS ?? 0);
const DAYS = 70;

const range = (xs: readonly number[]): string => (xs.length ? `${Math.min(...xs)} to ${Math.max(...xs)}` : 'never');

function row(name: string, runs: readonly LordRun[]): string {
  const won = runs.filter((r) => r.won).length;
  const lost = runs.filter((r) => r.lost).length;
  const strike = runs.flatMap((r) => (r.firstStrike ? [r.firstStrike] : []));
  const t = runs.flatMap((r) => (r.taken['gebtu-town'] ? [r.taken['gebtu-town']!] : []));
  const gebtu = `${t.filter((x) => x.by === 'player').length}/${t.filter((x) => x.by === 'rival').length} (day ${range(t.map((x) => x.day))})`;
  return `| ${name} | ${won} / ${lost} / ${runs.length - won - lost} of ${runs.length} | ${range(runs.filter((r) => r.won).map((r) => r.day))} | ${range(strike)} | ${gebtu} |`;
}

const ends = (runs: readonly LordRun[]): string => runs.map((r) => `${r.won ? 'W' : r.lost ? 'L' : 'S'}@${r.day} his ${r.adv.towns.filter((t) => t.owner === 'rival').map((t) => t.id.slice(0, 4)).join('+') || '-'}, sethi ${rivalHeroes(r.adv).some((h) => h.id === 'sethi') ? 'rides' : 'down'}, ${Math.round(r.strength.ours)} v ${Math.round(r.strength.his)}`).join('; ');

describe('the Red Land with Sethi as a lord, AI against AI', () => {
  it.skipIf(!SEEDS)('prints its table', () => {
    const fresh = Array.from({ length: SEEDS }, (_, i) => playLordPart(knowsHome({ ...startAdventure(RED_LAND), seed: 7000 + i * 13 }, RED_LAND, 40), RED_LAND, DAYS));
    const starts = Array.from({ length: SEEDS }, (_, i) => redRiddenOn(1000 + i * 7919)).filter((a): a is Adventure => !!a);
    const chapter = starts.map((a) => playLordPart(a, RED_LAND, DAYS));
    console.info([
      '| Start | Won / lost / stalled | Won on part day | First strike (part day) | Gebtu ours/his (day) |',
      '|---|---|---|---|---|',
      row('Fresh', fresh),
      row(`Ridden on (${starts.length} of ${SEEDS} won Abu)`, chapter),
    ].join('\n'));
    console.info(`Ends (fresh): ${ends(fresh)}`);
    console.info(`Ends (ridden on): ${ends(chapter)}`);
    console.info(`Rider at ride-on: ${range(starts.map((a) => Math.round(armyStrength(a.hero.army))))}, Sethi ${range(starts.map((a) => Math.round(armyStrength(a.rival!.hero!.army))))}`);
    expect(fresh.length).toBe(SEEDS);
  }, 3_600_000);
});
