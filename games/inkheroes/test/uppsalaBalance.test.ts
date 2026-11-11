import { describe, expect, it } from 'vitest';
import { HLADIR, UPPSALA } from '../src/level/longWinter';
import { ABU, NEKHEN } from '../src/level/twoLands';
import type { MapDef } from '../src/level/types';
import { partDays } from '../src/logic/chapter';
import type { SpellId } from '../src/logic/spells';
import { playPart, rideOnInto, type BotOptions, type BotRun, type Fight } from './partBot';

/** Node's environment, as far as this test needs it (the project has no Node types). */
declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/**
 * Uppsala's balance on the real rules (docs/inkheroes-design.md, "Part 2 as
 * built: Uppsala (Nov 11)", Balance): the bot of partBot.ts plays Hladir,
 * rides on over the pass into Uppsala with the army it earned and plays it
 * to the end, as a player who knows where they're going (`goalFirst`, as
 * Abu's table was), casting as Auto does once the rune staff is in its hand
 * (the part's lesson is Rune Magic). Nekhen → Abu, chapter 2's part 2, is
 * played beside it as the yardstick. BALANCE_SEEDS=24 plays more seeds and
 * prints the table the doc quotes.
 */
const STYLES = { rush: { edge: 1.6, bossEdge: 1.3 }, steady: { edge: 2, bossEdge: 1.6 }, careful: { edge: 2.5, bossEdge: 2 } } as const;
type Style = keyof typeof STYLES;
const SEEDS = Number(process.env.BALANCE_SEEDS ?? 3);
/** A steady player's target: a step up from Hladir's two weeks, at most 18 days. */
const STEADY_DAYS = 18;
/** The runes (the Hof teaches Haste and Slow too, which any book casts). */
const RUNES: readonly SpellId[] = ['tiwaz', 'isa', 'thurisaz'];

interface Run {
  readonly first: BotRun;
  readonly part: BotRun;
}

function play(first: MapDef, second: MapDef, style: Style, i: number): Run {
  const opts: BotOptions = { seed: 1000 + i * 7919, ...STYLES[style] };
  const f = playPart(first, opts);
  return { first: f, part: rideOnInto(f, first, second, { ...opts, goalFirst: true, casts: true }) };
}

const share = (f: Pick<Fight, 'before' | 'after'>): number => Math.round((1 - f.after / f.before) * 100);
/** A fight's day counted within the part (its par counts these). */
const dayIn = (r: BotRun, f: Fight): number => f.day - (r.adv.begun ?? 1) + 1;
const mean = (xs: readonly number[]): number => Math.round(xs.reduce((n, x) => n + x, 0) / Math.max(1, xs.length));
const range = (xs: readonly number[]): string => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s[0] === s.at(-1) ? `${s[0]}` : `${s[0]}–${s.at(-1)}`) : '-';
};

describe('Uppsala, ridden on into from Hladir by a bot that builds, hires and carves runes', () => {
  const table = (['rush', 'steady', 'careful'] as const).map((style) => ({ style, runs: Array.from({ length: SEEDS }, (_, i) => play(HLADIR, UPPSALA, style, i)) }));

  it('is won every time: by a rusher or a steady player in 18 days at most, by a careful one within par', () => {
    for (const { style, runs } of table) {
      for (const { first, part } of runs) {
        expect(first.won, style).toBe(true);
        expect(part.won, `${style}: Uppsala lost or unfinished on part day ${partDays(part.adv)}`).toBe(true);
        expect(partDays(part.adv), style).toBeLessThanOrEqual(style === 'careful' ? UPPSALA.parDays : STEADY_DAYS);
      }
    }
  });

  it('keeps the first week safe, and makes Aun’s fight cost a real share of a rusher’s or steady player’s army', () => {
    for (const { style, runs } of table) {
      for (const { part } of runs) {
        const early = part.fights.filter((f) => dayIn(part, f) <= 7 && f.id !== UPPSALA.goal.target);
        // A careful player's first week is the gate's kings at about three to one (17% at worst over 24 seeds, Nov 11).
        for (const f of early) expect(share(f), `${style} ${f.id} on part day ${dayIn(part, f)}`).toBeLessThanOrEqual(style === 'careful' ? 20 : 15);
        // Aun is never fought for free by a rusher or a steady player.
        if (style !== 'careful') expect(share(part.goal!), style).toBeGreaterThanOrEqual(4);
      }
    }
    // A rusher loses a tenth of the army or more to him on the whole. A steady player loses less (8% on the whole over
    // 24 seeds, Nov 11): below the design's 10–25%, a known gap (docs/inkheroes-design.md, "Part 2 as built"), not the target.
    const goals = (style: Style): number => mean(table.find((t) => t.style === style)!.runs.map((r) => share(r.part.goal!)));
    expect(goals('rush')).toBeGreaterThanOrEqual(10);
    expect(goals('steady')).toBeGreaterThanOrEqual(SEEDS >= 24 ? 8 : 5);
  });

  it('puts the rune staff to use: it is won before Aun, and the hero casts from it in the fights after', () => {
    for (const { style, runs } of table) {
      for (const { part } of runs) {
        const ids = part.fights.map((f) => f.id);
        expect(ids.indexOf('altar-kings'), style).toBeGreaterThanOrEqual(0);
        expect(ids.indexOf('altar-kings'), style).toBeLessThan(ids.indexOf(UPPSALA.goal.target));
        expect(part.adv.hero.gear?.book, style).toBe('noviceRuneStaff');
        const after = part.fights.slice(ids.indexOf('altar-kings') + 1);
        expect(after.some((f) => f.cast.length > 0), `${style}: nothing cast after the staff`).toBe(true);
      }
    }
    // A rune is carved in most runs (the battle AI weighs Haste against them).
    const all = table.flatMap((t) => t.runs);
    const carved = all.filter((r) => r.part.fights.some((f) => f.cast.some((s) => RUNES.includes(s))));
    expect(carved.length / all.length).toBeGreaterThanOrEqual(0.6);
  });

  it('prints the table the design doc quotes (BALANCE_SEEDS=24), beside Abu', () => {
    if (!process.env.BALANCE_SEEDS) return;
    const abu = (['rush', 'steady', 'careful'] as const).map((style) => ({ style, runs: Array.from({ length: SEEDS }, (_, i) => play(NEKHEN, ABU, style, i)) }));
    for (const [name, def, rows] of [['uppsala', UPPSALA, table], ['abu', ABU, abu]] as const) {
      for (const { style, runs } of rows) {
        const parts = runs.map((r) => r.part);
        const days = parts.map((p) => partDays(p.adv));
        const goal = parts.flatMap((p) => (p.goal ? [share(p.goal)] : []));
        const early = parts.flatMap((p) => p.fights.filter((f) => dayIn(p, f) <= 7 && f.id !== def.goal.target).map(share));
        const carved = parts.filter((p) => p.fights.some((f) => f.cast.some((s) => RUNES.includes(s)))).length;
        const goalRunes = parts.filter((p) => p.goal?.cast.some((s) => RUNES.includes(s))).length;
        console.info(`${name} ${style}: won ${parts.filter((p) => p.won).length}/${parts.length}, part days ${range(days)} (mean ${mean(days)}), goal fight lost ${range(goal)}% (mean ${mean(goal)}%), week-1 fights lost at most ${Math.max(0, ...early)}%, runes carved in ${carved}/${parts.length} (in the goal's fight ${goalRunes})`);
      }
    }
  });
}, 900_000);
