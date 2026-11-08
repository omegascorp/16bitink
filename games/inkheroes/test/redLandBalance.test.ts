import { describe, expect, it } from 'vitest';
import { ABU, NEKHEN, RED_LAND } from '../src/level/twoLands';
import type { MapDef } from '../src/level/types';
import { afterBattle, answerPrompt, battleSides, endDay, heroTown, planPath, stepHero, townById, withTown, type Adventure } from '../src/logic/adventure';
import { partDays, rideOn } from '../src/logic/chapter';
import { findPath } from '../src/logic/path';
import { dailyMp } from '../src/logic/hero';
import { terrainView } from '../src/logic/adventure';
import { armyStrength, autoBattle, rivalTurn } from '../src/logic/rival';
import { hireAll } from '../src/logic/town';
import { survivors } from '../src/logic/battle';
import type { ItemId } from '../src/logic/items';
import { playPart, rideOnInto, type BotOptions, type BotRun } from './partBot';

/** Node's environment, as far as this test needs it (the project has no Node types). */
declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/**
 * Part 6's balance on the real rules (docs/inkheroes-design.md, "Part 6 as
 * built"): the bot of partBot.ts plays Nekhen and Abu, and from where it
 * rides on, Kassander's probe method (rideOn, endDay, rivalTurn) measures
 * Sethi against the army a rider brings, the race for Gebtu ridden
 * straight, and what Set's storms add to the ride to Nubt. Then the bot
 * plays the part through in three styles. BALANCE_SEEDS=24 plays more
 * seeds and prints the tables the doc quotes.
 */
const STYLES = { rush: { edge: 1.6, bossEdge: 1.3 }, steady: { edge: 2, bossEdge: 1.6 }, careful: { edge: 2.5, bossEdge: 2 } } as const;
const SEEDS = Number(process.env.BALANCE_SEEDS ?? 1);
const CALM: MapDef = { ...RED_LAND, stormEvery: undefined };
const GEBTU = 'gebtu-town';
const NUBT = 'nubt-town';
/** Abu's raiders at the east end of the ford, on the straight way east. */
const FORD = 'sandbar-raiders';

const answered = (adv: Adventure): Adventure => {
  let a = adv;
  for (let i = 0; i < 50 && a.prompts.length; i++) {
    const p = a.prompts[0]!;
    a = answerPrompt(a, p.kind === 'chest' ? 'gold' : p.kind === 'levelUp' ? p.offer.choices[0] : undefined);
  }
  return a;
};

/** The night, with the rival's turn. */
const night = (adv: Adventure, def: MapDef): Adventure => answered(rivalTurn(endDay(adv, def), def).adv);

/** The hero hires all the town they stand in has. */
function hire(adv: Adventure): Adventure {
  const t = heroTown(adv);
  if (!t) return adv;
  const r = hireAll(t, adv.hero.army, adv.purse);
  return { ...withTown(adv, r.town), purse: r.purse, hero: { ...adv.hero, army: r.army } };
}

/** A straight ride for Gebtu from the ride-on, fighting what stops the way: the part day it is ours (or null). */
function rideForGebtu(start: Adventure, def: MapDef): number | null {
  let adv = hire(start);
  const g = townById(adv, GEBTU)!;
  for (let d = 0; d < 20 && adv.status === 'playing'; d++) {
    // Straight across the ford from Abu's island: its raiders, if still there, are fought on the way.
    const ford = adv.objects.find((o) => o.id === FORD && !o.gone);
    const path = (ford ? planPath(adv, def, ford.x, ford.y) : planPath(adv, def, g.x, g.y)) ?? [];
    for (const step of path) {
      if (step.day > 0) break;
      const r = stepHero(adv, def, step, path.at(-1));
      adv = answered(r.adv);
      if (r.battle) {
        const s = battleSides(adv, r.battle);
        adv = answered(afterBattle(adv, def, r.battle, autoBattle(s.attacker, s.defender, s.seed, s.siege), r.then));
      }
      if (townById(adv, GEBTU)!.owner === 'player') return partDays(adv);
      if (r.stop) break;
    }
    if (townById(adv, GEBTU)!.owner === 'rival') return null;
    adv = night(adv, def);
  }
  return null;
}

/** Sethi alone (the hero waits at Nekhen): the part day Gebtu flies his banner (or null). */
function sethiTakesGebtu(start: Adventure, def: MapDef): number | null {
  let adv = { ...start, hero: { ...start.hero, x: 9, y: 8 } };
  for (let d = 0; d < 20; d++) {
    adv = night(adv, def);
    if (adv.rivalFight) return null;
    if (townById(adv, GEBTU)!.owner === 'rival') return partDays(adv);
  }
  return null;
}

/** Days to ride from Abu's gate to Nubt's, by the ground alone (no fights), each day's own weather. */
function rideDays(start: Adventure, def: MapDef): number {
  const nubt = townById(start, NUBT)!;
  let hero = start.hero;
  for (let d = 0; d < 30; d++) {
    const adv = { ...start, day: start.day + d, hero };
    const path = findPath(terrainView(adv, def), hero, nubt.x - 1, nubt.y + 1, dailyMp(hero), dailyMp(hero));
    if (!path) return Infinity;
    const today = path.filter((s) => s.day === 0);
    if (today.length === path.length) return d + 1;
    const last = today.at(-1) ?? hero;
    hero = { ...hero, x: last.x, y: last.y };
  }
  return Infinity;
}

interface RedRun {
  readonly abu: BotRun;
  readonly opened: Adventure;
  readonly red: BotRun;
  /** The adventure as the bot rode at Nubt's gate. */
  readonly atGate?: Adventure;
}

/** Nubt's siege from `adv` with war machine `m`: the share of the army's strength it costs (100 if lost). */
function siegeCost(adv: Adventure, m: ItemId): number {
  const hero = { ...adv.hero, gear: { ...adv.hero.gear, machine: m } };
  const s = battleSides({ ...adv, hero }, NUBT);
  const st = autoBattle(s.attacker, s.defender, s.seed, s.siege);
  return st.winner === 0 ? Math.round((1 - armyStrength(survivors(st, 0, s.attacker.army)) / armyStrength(s.attacker.army)) * 100) : 100;
}

function play(style: keyof typeof STYLES, i: number): RedRun {
  const opts: BotOptions = { seed: 1000 + i * 7919, ...STYLES[style] };
  const nekhen = playPart(NEKHEN, opts);
  const abu = rideOnInto(nekhen, NEKHEN, ABU, { ...opts, goalFirst: true });
  const opened = answered(rideOn(abu.adv, ABU, RED_LAND));
  let atGate: Adventure | undefined;
  const red = rideOnInto(abu, ABU, RED_LAND, { ...opts, goalFirst: true, wise: true, maxDays: 60, beforeGoal: (a) => { atGate = a; } });
  return { abu, opened, red, ...(atGate ? { atGate } : {}) };
}

const range = (xs: readonly number[]): string => (xs.length ? `${Math.min(...xs)}–${Math.max(...xs)}` : '-');

describe('the Red Land, ridden on into from Abu', () => {
  const runs = (['rush', 'steady', 'careful'] as const).map((style) => ({ style, runs: Array.from({ length: SEEDS }, (_, i) => play(style, i)) }));
  const all = runs.flatMap((r) => r.runs);

  it('opens with Sethi stronger than the army a rider brings, but not out of reach once it hires at Abu', () => {
    // About the 1.35 times of the Black Banner on the whole (a rider who kept a big army arrives the stronger)...
    const ratios = all.map((r) => armyStrength(r.opened.rival!.hero!.army) / armyStrength(r.opened.hero.army));
    const mean = ratios.reduce((n, x) => n + x, 0) / ratios.length;
    expect(mean).toBeGreaterThan(1.1);
    expect(mean).toBeLessThan(1.8);
    // ...but on the whole under the 1.3 times he needs to ride at our hero once the hero has hired at Abu.
    const hired = all.map((r) => armyStrength(r.opened.rival!.hero!.army) / armyStrength(hire(r.opened).hero.army));
    expect(hired.reduce((n, x) => n + x, 0) / hired.length).toBeLessThan(1.3);
  }, 600_000);

  it('a straight ride wins the race for Gebtu, and a rider who waits loses it', () => {
    const races = all.map((r) => ({ mine: rideForGebtu(r.opened, RED_LAND), his: sethiTakesGebtu(r.opened, RED_LAND) }));
    for (const { mine } of races) expect(mine, 'the rider takes Gebtu').not.toBeNull();
    // Left alone he takes it from the part's 6th day or so (or, against a strong rider, stays home): ahead of a straight ride in most runs.
    const lost = races.filter(({ mine, his }) => his !== null && mine !== null && his - mine < 1);
    expect(lost.length).toBeLessThanOrEqual(Math.floor(races.length / 4));
  });

  it('storms add a day or two to the ride across, not more', () => {
    for (const r of all) {
      const calm = rideDays(r.opened, CALM);
      const stormy = rideDays(r.opened, RED_LAND);
      expect(stormy - calm).toBeGreaterThanOrEqual(0);
      expect(stormy - calm).toBeLessThanOrEqual(2);
    }
  });

  it('prints the tables', () => {
    if (!process.env.BALANCE_SEEDS) return;
    for (const { style, runs: rs } of runs) {
      const ratio = rs.map((r) => armyStrength(r.opened.rival!.hero!.army) / armyStrength(r.opened.hero.army));
      const race = rs.map((r) => [rideForGebtu(r.opened, RED_LAND), sethiTakesGebtu(r.opened, RED_LAND), rideForGebtu(r.opened, CALM), sethiTakesGebtu(r.opened, CALM)]);
      const storm = rs.map((r) => rideDays(r.opened, RED_LAND) - rideDays(r.opened, CALM));
      const won = rs.filter((r) => r.red.won);
      const nubt = rs.flatMap((r) => r.red.fights.filter((f) => f.id === NUBT).map((f) => Math.round((1 - f.after / f.before) * 100)));
      const brick = rs.flatMap((r) => (r.atGate ? [siegeCost(r.atGate, 'ramp2')] : []));
      const earth = rs.flatMap((r) => (r.atGate ? [siegeCost(r.atGate, 'ramp')] : []));
      console.info(`red ${style}: rides on day ${range(rs.map((r) => r.abu.day))}, rider ${range(rs.map((r) => Math.round(armyStrength(r.opened.hero.army))))}, Sethi ${range(rs.map((r) => Math.round(armyStrength(r.opened.rival!.hero!.army))))} (×${Math.min(...ratio).toFixed(2)}–${Math.max(...ratio).toFixed(2)}); Gebtu: rider part day ${range(race.flatMap((x) => (x[0] ? [x[0]] : [])))}, Sethi ${range(race.flatMap((x) => (x[1] ? [x[1]] : [])))} (calm: ${range(race.flatMap((x) => (x[2] ? [x[2]] : [])))} / ${range(race.flatMap((x) => (x[3] ? [x[3]] : [])))}); storms add ${range(storm)} days to the ride to Nubt; bot won ${won.length}/${rs.length} (part days ${range(won.map((r) => partDays(r.red.adv)))}), Nubt's siege cost ${range(nubt)}% (replayed: Earth Ramp ${range(earth)}%, Brick Ramp ${range(brick)}%), ended ${rs.map((r) => `${r.red.adv.status}@${partDays(r.red.adv)}[${r.red.fights.map((f) => `${f.id}:${Math.round(100 - (100 * f.after) / f.before)}`).join(" ")}]`).join(", ")}`);
    }
  });
});
