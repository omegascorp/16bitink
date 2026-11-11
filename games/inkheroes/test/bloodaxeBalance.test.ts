import { describe, expect, it } from 'vitest';
import { BLOODAXE, HLADIR, UPPSALA } from '../src/level/longWinter';
import type { MapDef } from '../src/level/types';
import { afterBattle, answerPrompt, battleSides, endDay, planPath, rivalHeroes, stepHero, townById, type Adventure } from '../src/logic/adventure';
import { partDays, rideOn } from '../src/logic/chapter';
import { armyStrength, autoBattle, rivalTurn } from '../src/logic/rival';
import { survivors } from '../src/logic/battle';
import type { ItemId } from '../src/logic/items';
import { playPart, rideOnInto, type BotOptions, type BotRun, type Fight } from './partBot';
import { playLordPart } from './lordBot';

/** Node's environment, as far as this test needs it (the project has no Node types). */
declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/**
 * The Bloodaxe's balance on the real rules (docs/inkheroes-design.md,
 * "Part 3 as built: The Bloodaxe (Nov 11)", Balance): the bot of partBot.ts
 * plays Hladir and Uppsala, rides on over the south fells with the army it
 * earned, and plays the part through as the Red Land's bot does (`wise`,
 * `goalFirst`, carving runes) against Eirik as a lord. Probes beside it, by
 * the Red Land's method: Eirik against the army a rider brings, the race for
 * Kaupang ridden straight and left to him, Avaldsnes's siege replayed with
 * the Ram and by hand. Then the part AI against AI (lordBot.ts). BALANCE_SEEDS=24
 * plays more seeds and prints the tables the doc quotes.
 */
const STYLES = { rush: { edge: 1.6, bossEdge: 1.3 }, steady: { edge: 2, bossEdge: 1.6 }, careful: { edge: 2.5, bossEdge: 2 } } as const;
type Style = keyof typeof STYLES;
const SEEDS = Number(process.env.BALANCE_SEEDS ?? 2);
const KAUPANG = 'kaupang-town';
const AVALDSNES = BLOODAXE.goal.target;

const answered = (adv: Adventure): Adventure => {
  let a = adv;
  for (let i = 0; i < 50 && a.prompts.length; i++) {
    const p = a.prompts[0]!;
    a = answerPrompt(a, p.kind === 'chest' ? 'gold' : p.kind === 'levelUp' ? p.offer.choices[0] : undefined);
  }
  return a;
};

const night = (adv: Adventure, def: MapDef): Adventure => answered(rivalTurn(endDay(adv, def), def).adv);

/** A straight ride for Kaupang from the ride-on, fighting what stops the way: the part day it is ours (or null). */
export function rideForKaupang(start: Adventure, def: MapDef = BLOODAXE): number | null {
  let adv = start;
  const k = townById(adv, KAUPANG)!;
  for (let d = 0; d < 20 && adv.status === 'playing'; d++) {
    const path = planPath(adv, def, k.x, k.y) ?? [];
    for (const step of path) {
      if (step.day > 0) break;
      const r = stepHero(adv, def, step, path.at(-1));
      adv = answered(r.adv);
      if (r.battle) {
        const s = battleSides(adv, r.battle, def);
        adv = answered(afterBattle(adv, def, r.battle, autoBattle(s.attacker, s.defender, s.seed, s.siege), r.then));
      }
      if (townById(adv, KAUPANG)!.owner === 'player') return partDays(adv);
      if (r.stop) break;
    }
    if (townById(adv, KAUPANG)!.owner === 'rival') return null;
    adv = night(adv, def);
    if (adv.rivalFight) return null;
  }
  return null;
}

/** Eirik alone (the hero waits at Uppsala): the part day Kaupang flies his banner (or null). */
export function eirikTakesKaupang(start: Adventure, def: MapDef = BLOODAXE): number | null {
  const home = townById(start, 'uppsala-town')!;
  let adv = { ...start, hero: { ...start.hero, x: home.x, y: home.y } };
  for (let d = 0; d < 20; d++) {
    adv = night(adv, def);
    if (adv.rivalFight) return null;
    if (townById(adv, KAUPANG)!.owner === 'rival') return partDays(adv);
  }
  return null;
}

/** Avaldsnes's siege from `adv` with war machine `m` (none: stormed by hand): the share of the army's strength it costs (100 if lost). */
function siegeCost(adv: Adventure, m: ItemId | null): number {
  const { machine: _m, ...gear } = adv.hero.gear ?? {};
  const hero = { ...adv.hero, gear: m ? { ...gear, machine: m } : gear };
  const s = battleSides({ ...adv, hero }, AVALDSNES, BLOODAXE);
  const st = autoBattle(s.attacker, s.defender, s.seed, s.siege);
  return st.winner === 0 ? Math.round((1 - armyStrength(survivors(st, 0, s.attacker.army)) / armyStrength(s.attacker.army)) * 100) : 100;
}

interface Run {
  readonly uppsala: BotRun;
  readonly opened: Adventure;
  readonly part: BotRun;
  readonly atGate?: Adventure;
}

function play(style: Style, i: number): Run {
  const opts: BotOptions = { seed: 1000 + i * 7919, ...STYLES[style] };
  const hladir = playPart(HLADIR, opts);
  const uppsala = rideOnInto(hladir, HLADIR, UPPSALA, { ...opts, goalFirst: true, casts: true });
  const opened = answered(rideOn(uppsala.adv, UPPSALA, BLOODAXE));
  let atGate: Adventure | undefined;
  const part = rideOnInto(uppsala, UPPSALA, BLOODAXE, { ...opts, goalFirst: true, wise: true, casts: true, maxDays: 50, beforeGoal: (a) => { atGate ??= a; } });
  return { uppsala, opened, part, ...(atGate ? { atGate } : {}) };
}

const share = (f: Pick<Fight, 'before' | 'after'>): number => (f.before > 0 ? Math.round((1 - f.after / f.before) * 100) : 0);
const dayIn = (r: BotRun, f: Fight): number => f.day - (r.adv.begun ?? 1) + 1;
const mean = (xs: readonly number[]): number => Math.round(xs.reduce((n, x) => n + x, 0) / Math.max(1, xs.length));
const range = (xs: readonly number[]): string => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s[0] === s.at(-1) ? `${s[0]}` : `${s[0]}–${s.at(-1)}`) : '-';
};
/** The siege of Avaldsnes: its walls' fight (the gate's hero, if any, is fought first under GATE). */
const siegeOf = (r: BotRun): Fight | undefined => r.fights.find((f) => f.id === AVALDSNES);

describe('the Bloodaxe, ridden on into from Uppsala', () => {
  const table = (['rush', 'steady', 'careful'] as const).map((style) => ({ style, runs: Array.from({ length: SEEDS }, (_, i) => play(style, i)) }));
  const all = table.flatMap((t) => t.runs);

  const lords = table.map(({ style, runs }) => ({ style, runs: runs.map((r) => playLordPart(r.opened, BLOODAXE, 50)) }));
  const of = (style: Style): Run[] => table.find((t) => t.style === style)!.runs;

  it('is won AI against AI (the lord mind on both sides) in every style but at most one run in 24', () => {
    const all = lords.flatMap((l) => l.runs);
    expect(all.filter((l) => l.lost)).toHaveLength(0);
    expect(all.filter((l) => !l.won).length).toBeLessThanOrEqual(Math.floor(all.length / 24));
  }, 3_600_000);

  it('is won by the steady bot in about three weeks, its Avaldsnes siege costing 10 to 25% on the whole, the Ram cheaper than storming by hand', () => {
    const steady = of('steady').map((r) => r.part);
    // 22 of 24 won (Nov 11): the two lost were caught by Eirik at an unwalled town's gate.
    expect(steady.filter((p) => p.won).length / steady.length).toBeGreaterThanOrEqual(SEEDS >= 24 ? 0.9 : 0.5);
    const days = steady.filter((p) => p.won).map((p) => partDays(p.adv));
    expect(mean(days)).toBeLessThanOrEqual(22);
    const sieges = steady.flatMap((p) => { const f = siegeOf(p); return f ? [share(f)] : []; });
    expect(mean(sieges)).toBeGreaterThanOrEqual(10);
    expect(mean(sieges)).toBeLessThanOrEqual(25);
    const gates = of('steady').flatMap((r) => (r.atGate ? [r.atGate] : []));
    expect(gates.every((a) => a.hero.gear?.machine === 'ram')).toBe(true);
    expect(mean(gates.map((a) => siegeCost(a, 'ram')))).toBeLessThan(mean(gates.map((a) => siegeCost(a, null))));
  }, 3_600_000);

  it('makes Kaupang a real race: a straight ride takes it first, and Eirik takes it if we wait', () => {
    const races = all.map((r) => ({ mine: rideForKaupang(r.opened), his: eirikTakesKaupang(r.opened) }));
    for (const { mine, his } of races) {
      expect(mine, 'the rider takes Kaupang').not.toBeNull();
      if (his !== null) expect(his - mine!).toBeGreaterThanOrEqual(1);
    }
    // Left alone he takes it on the part's 5th day in most runs (against a strong rider he may stay home).
    expect(races.filter((r) => r.his !== null).length).toBeGreaterThanOrEqual(races.length / 2);
  }, 3_600_000);

  it('keeps the first week safe (the siege of Avaldsnes aside)', () => {
    for (const { style, runs } of table) {
      for (const { part } of runs) {
        // 21% at worst for a rusher over 24 seeds (a troll pack fought at 1.6 to 1), 15% for a steady player, 7% for a careful one (Nov 11).
        const cap = style === 'rush' ? 25 : style === 'steady' ? 15 : 10;
        for (const f of part.fights.filter((x) => dayIn(part, x) <= 7 && !x.id.endsWith(AVALDSNES))) expect(share(f), `${style} ${f.id}`).toBeLessThanOrEqual(cap);
      }
    }
  });

  it('prints the tables (BALANCE_SEEDS=24)', () => {
    if (!process.env.BALANCE_SEEDS) return;
    for (const { style, runs } of table) {
      const parts = runs.map((r) => r.part);
      const days = parts.filter((p) => p.won).map((p) => partDays(p.adv));
      const sieges = parts.flatMap((p) => { const f = siegeOf(p); return f ? [share(f)] : []; });
      const early = parts.flatMap((p) => p.fights.filter((f) => dayIn(p, f) <= 7 && f.id !== AVALDSNES && !f.id.endsWith(AVALDSNES)).map(share));
      const first = runs.map((r) => armyStrength(rivalTurn(endDay(r.opened, BLOODAXE), BLOODAXE).adv.rival!.hero!.army) / armyStrength(r.opened.hero.army));
      const race = runs.map((r) => [rideForKaupang(r.opened), eirikTakesKaupang(r.opened)] as const);
      const kaupang = parts.map((p) => townById(p.adv, KAUPANG)!.owner);
      const ram = runs.flatMap((r) => (r.atGate ? [siegeCost(r.atGate, 'ram')] : []));
      const hand = runs.flatMap((r) => (r.atGate ? [siegeCost(r.atGate, null)] : []));
      const machines = runs.map((r) => r.atGate?.hero.gear?.machine ?? '-');
      console.info(`bloodaxe ${style}: rides on day ${range(runs.map((r) => r.uppsala.day))}, rider ${range(runs.map((r) => Math.round(armyStrength(r.opened.hero.army))))}, Eirik after night 1 ×${range(first.map((x) => Math.round(x * 100) / 100))}; won ${days.length}/${parts.length} (part days ${range(days)}, mean ${mean(days)}); Avaldsnes siege ${range(sieges)}% (mean ${mean(sieges)}%), replayed with the Ram ${range(ram)}%, by hand ${range(hand)}%, machine at the gate ${machines.join(',')}; week-1 fights at most ${Math.max(0, ...early)}%; Kaupang straight ride part day ${range(race.flatMap((x) => (x[0] ? [x[0]] : [])))}, Eirik alone ${range(race.flatMap((x) => (x[1] ? [x[1]] : [])))}, ends ${kaupang.join(',')}`);
      const lord = lords.find((l) => l.style === style)!.runs;
      const lordWon = lord.filter((l) => l.won);
      const lordKaupang = lord.flatMap((l) => (l.taken[KAUPANG] ? [`${l.taken[KAUPANG]!.by[0]}${l.taken[KAUPANG]!.day}`] : []));
      console.info(`bloodaxe ${style} AI v AI: won ${lordWon.length}/${lord.length} lost ${lord.filter((l) => l.lost).length} (part days ${range(lordWon.map((l) => l.day))}), first strike ${range(lord.flatMap((l) => (l.firstStrike ? [l.firstStrike] : [])))}, Kaupang ${lordKaupang.join(',')}`);
      console.info(`  ends: ${parts.map((p) => `${p.adv.status}@${partDays(p.adv)}[${p.fights.map((f) => `${f.id.replace('bloodaxe-', '')}:${share(f)}@${dayIn(p, f)}`).join(' ')}] eirik ${rivalHeroes(p.adv).some((h) => h.id === 'eirik') ? 'rides' : 'down'}`).join('\n  ')}`);
    }
    expect(all.length).toBe(SEEDS * 3);
  }, 3_600_000);
});

