import { describe, expect, it } from 'vitest';
import { DELTA, RED_LAND } from '../src/level/twoLands';
import { battleSides, endDay, gridOf, ourHeroes, rivalHeroes, startAdventure, terrainView, type Adventure } from '../src/logic/adventure';
import { autoBattle } from '../src/logic/autoBattle';
import { survivors } from '../src/logic/battle';
import { rideOn } from '../src/logic/chapter';
import { dailyMp } from '../src/logic/hero';
import { selectHero } from '../src/logic/heroes';
import { playLord } from '../src/logic/lord/turn';
import { findPath } from '../src/logic/path';
import { armyStrength } from '../src/logic/strength';
import { playLordPart, type LordRun } from './lordBot';
import { redRiddenOn } from './twoLandsRuns';

/** Node's environment, as far as this test needs it (the project has no Node types). */
declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/**
 * The Delta balanced AI against AI (docs/inkheroes-design.md, "Part 4:
 * The Delta", Balance): the lord mind plays our side and Apepi's, (a)
 * ridden on through the chapter (the bot plays Nekhen and Abu, the lord
 * mind the Red Land against Sethi) and (b) from the part's fresh start.
 * Only with BALANCE_SEEDS (it prints the table the doc quotes).
 */

const SEEDS = Number(process.env.BALANCE_SEEDS ?? 0);
const DAYS = 70;
/** Apepi's big goal: the Benben Stone (Egypt's seventh dwelling, the building id the Greeks' Seraph Spire has). */
const BENBEN = 'seraphSpire';
const AMMIT = 'benben-ammit';
const RACED = (DELTA.towns ?? []).filter((t) => t.race).map((t) => t.id);

/** A fresh start as a player has it: the land won before the Delta (inside the Red Land's 80 × 56, but the sea) already seen. */
export function knowsOld(adv: Adventure): Adventure {
  const w = gridOf(DELTA).w;
  const old = RED_LAND.rows;
  return { ...adv, explored: [...adv.explored].map((c, i) => (old[Math.floor(i / w)]?.[i % w] && old[Math.floor(i / w)]![i % w] !== '~' ? '1' : c)).join('') };
}

/** The chapter played up to the Delta: the Red Land by the lord mind. Null when it isn't won. */
export function deltaRiddenOn(seed: number): Adventure | null {
  const red = redRiddenOn(seed);
  if (!red) return null;
  const run = playLordPart(red, RED_LAND, DAYS);
  return run.won ? rideOn(run.adv, RED_LAND, DELTA) : null;
}

/** What beating Ammit would cost our strongest hero on `adv` (his army's share lost, 100: beaten), spells and all. */
function ammitCost(adv: Adventure): { cost: number; before: number } | null {
  if (!adv.objects.some((o) => o.id === AMMIT && !o.gone)) return null;
  const best = ourHeroes(adv).reduce((a, h) => (armyStrength(h.army) > armyStrength(a.army) ? h : a));
  const a = selectHero(adv, best.id);
  const s = battleSides(a, AMMIT);
  const st = autoBattle(s.attacker, s.defender, s.seed, s.siege);
  const before = armyStrength(a.hero.army);
  return { before: Math.round(before), cost: st.winner === 0 ? Math.round((1 - armyStrength(survivors(st, 0, a.hero.army)) / before) * 100) : 100 };
}

/** The race left to Apepi (our side waiting at home) against a straight ride from where our hero stands, and his Benben Stone unpressured: part days. */
function race(start: Adventure, id: string): { rider: number; his: number | null; benben: number | null } {
  const town = start.towns.find((t) => t.id === id)!;
  const bare: Adventure = { ...start, objects: start.objects.filter((o) => o.kind !== 'monster') };
  const way = findPath(terrainView(bare, DELTA), start.hero, town.x, town.y, start.hero.mp, dailyMp(start.hero));
  const rider = way ? way.at(-1)!.day + 1 : Infinity;
  // Our heroes far back at Nekhen: he races with nobody in his way.
  const home = start.towns[0]!;
  let a: Adventure = { ...start, hero: { ...start.hero, x: home.x, y: home.y }, others: (start.others ?? []).map((h) => ({ ...h, x: home.x, y: home.y, army: h.army.map(() => null) })) };
  let his: number | null = null;
  let benben: number | null = null;
  for (let d = 1; d <= 40 && benben === null; d++) {
    a = playLord(endDay(a, DELTA), DELTA, 'auto').adv;
    const day = a.day - (start.begun ?? 1) + 1;
    if (his === null && a.towns.find((t) => t.id === id)!.owner === 'rival') his = day;
    if (a.towns.some((t) => t.owner === 'rival' && t.built.includes(BENBEN))) benben = day;
  }
  return { rider, his, benben };
}

const range = (xs: readonly number[]): string => (xs.length ? `${Math.min(...xs)} to ${Math.max(...xs)}` : 'never');

function row(name: string, runs: readonly LordRun[]): string {
  const won = runs.filter((r) => r.won).length;
  const lost = runs.filter((r) => r.lost).length;
  const benben = runs.flatMap((r) => (r.built[BENBEN] ? [r.built[BENBEN]] : []));
  const strike = runs.flatMap((r) => (r.firstStrike ? [r.firstStrike] : []));
  const raced = RACED.map((id) => {
    const t = runs.flatMap((r) => (r.taken[id] ? [r.taken[id]!] : []));
    return `${t.filter((x) => x.by === 'player').length}/${t.filter((x) => x.by === 'rival').length} (${range(t.map((x) => x.day))})`;
  });
  return `| ${name} | ${won} / ${lost} / ${runs.length - won - lost} of ${runs.length} | ${range(runs.filter((r) => r.won).map((r) => r.day))} | ${range(benben)} | ${range(strike)} | ${raced.join(' | ')} |`;
}

const ends = (runs: readonly LordRun[]): string => runs.map((r) => `${r.won ? 'W' : r.lost ? 'L' : 'S'}@${r.day} his ${r.adv.towns.filter((t) => t.owner === 'rival').map((t) => t.id.slice(0, 5)).join('+') || '-'}, apepi ${rivalHeroes(r.adv).some((h) => h.id === 'apepi') ? 'rides' : 'down'}, ${Math.round(r.strength.ours)} v ${Math.round(r.strength.his)}`).join('; ');

type Probed = LordRun & { at20?: ReturnType<typeof ammitCost>; at35?: ReturnType<typeof ammitCost> };

describe('the Delta, AI against AI', () => {
  it.skipIf(!SEEDS)('prints its table', () => {
    const probed = (start: Adventure): Probed => {
      const g: { at20?: ReturnType<typeof ammitCost>; at35?: ReturnType<typeof ammitCost> } = {};
      const run = playLordPart(start, DELTA, DAYS, (a, d) => { if (d === 20) g.at20 = ammitCost(a); if (d === 35) g.at35 = ammitCost(a); });
      return { ...run, ...g };
    };
    const freshStart = (i: number): Adventure => knowsOld({ ...startAdventure(DELTA), seed: 7000 + i * 13 });
    const fresh = Array.from({ length: process.env.DELTA_RIDDEN_ONLY ? 0 : SEEDS }, (_, i) => probed(freshStart(i)));
    const starts = Array.from({ length: process.env.DELTA_FRESH_ONLY ? 0 : SEEDS }, (_, i) => deltaRiddenOn(1000 + i * 7919)).filter((a): a is Adventure => !!a);
    const chapter = starts.map((a) => probed(a));
    console.info([
      `| Start | Won / lost / stalled | Won on part day | Benben Stone, in the game (part day) | First strike (part day) | ${RACED.map((id) => `${id} ours/his (day)`).join(' | ')} |`,
      `|---|---|---|---|---|${RACED.map(() => '---|').join('')}`,
      row('Fresh', fresh),
      row(`Ridden on (${starts.length} of ${SEEDS} won the Red Land)`, chapter),
    ].join('\n'));
    console.info(`Ends (fresh): ${ends(fresh)}`);
    console.info(`Ends (ridden on): ${ends(chapter)}`);
    console.info(`Rider at ride-on: ${range(starts.map((a) => Math.round(ourHeroes(a).reduce((n, h) => n + armyStrength(h.army), 0))))}`);
    for (const [name, list] of [['fresh', fresh.map((r, i) => ({ r, start: freshStart(i) }))], ['ridden on', chapter.map((r, i) => ({ r, start: starts[i]! }))]] as const) {
      const races = RACED.map((id) => `${id}: ${list.map(({ start }) => { const x = race(start, id); return `${x.rider}/${x.his ?? '-'} (Benben ${x.benben ?? '-'})`; }).join(' ')}`);
      console.info(`Race (${name}), straight ride / Apepi alone, part day: ${races.join('; ')}`);
      console.info(`Ammit (${name}), share lost by our strongest at part day 20 and 35: ${list.map(({ r }) => [r.at20, r.at35].map((g) => (g ? `${g.cost}% of ${g.before}` : '-')).join(' / ')).join('; ')}`);
    }
    expect(fresh.length + starts.length).toBeGreaterThan(0);
  }, 7_200_000);
});
