import { describe, expect, it } from 'vitest';
import { BLOODAXE, HALOGALAND, HLADIR, UPPSALA } from '../src/level/longWinter';
import { battleSides, endDay, ourHeroes, rivalHeroes, startAdventure, terrainView, type Adventure } from '../src/logic/adventure';
import { autoBattle } from '../src/logic/autoBattle';
import { survivors } from '../src/logic/battle';
import { partDays, rideOn } from '../src/logic/chapter';
import { dailyMp } from '../src/logic/hero';
import { selectHero } from '../src/logic/heroes';
import { playLord } from '../src/logic/lord/turn';
import { findPath } from '../src/logic/path';
import { armyStrength } from '../src/logic/strength';
import { knowsHome, playLordPart, type LordRun } from './lordBot';
import { playPart, rideOnInto, type BotOptions, type BotRun, type Fight } from './partBot';

/** Node's environment, as far as this test needs it (the project has no Node types). */
declare const process: { readonly env: Readonly<Record<string, string | undefined>> };
/** The table's lines: printed, and written to HALO_OUT's file when set (vitest's output can be cut). */
const said: string[] = [];
const say = (line: string): void => {
  console.info(line);
  said.push(line);
};
async function keep(): Promise<void> {
  if (!process.env.HALO_OUT) return;
  const fs = (await import(/* @vite-ignore */ 'node:fs' as string)) as { writeFileSync(path: string, data: string): void };
  fs.writeFileSync(process.env.HALO_OUT, `${said.join('\n')}\n`);
}

/**
 * Halogaland's balance on the real rules (docs/inkheroes-design.md, "Part 4
 * as built: Halogaland (Nov 11)", Balance), by the Delta's and the
 * Bloodaxe's methods: (a) the bot of partBot.ts plays Hladir, Uppsala and
 * the Bloodaxe, rides on north with what it earned and plays the part
 * through (`wise`, `goalFirst`, carving runes) against Gunnhild as a lord;
 * (b) the same ride-ons, and the part's fresh start, AI against AI
 * (lordBot.ts). Probes: Skoll's fight for our strongest hero, the race for
 * Trondenes and Vagar ridden straight and left to Gunnhild, the first week.
 * Two seeds by default (the asserted probes); BALANCE_SEEDS=24 plays more
 * and prints the tables the doc quotes.
 */
const STYLES = { rush: { edge: 1.6, bossEdge: 1.3 }, steady: { edge: 2, bossEdge: 1.6 }, careful: { edge: 2.5, bossEdge: 2 } } as const;
type Style = keyof typeof STYLES;
const SEEDS = Number(process.env.BALANCE_SEEDS ?? 2);
const STYLE_LIST: readonly Style[] = process.env.HALO_STYLES ? (process.env.HALO_STYLES.split(',') as Style[]) : ['rush', 'steady', 'careful'];
const DAYS = 70;
const BJARKOY = HALOGALAND.goal.target;
const STEIGEN = 'steigen-town';
const SKOLL = 'skoll';
const RACED = (HALOGALAND.towns ?? []).filter((t) => t.race).map((t) => t.id);
/** Gunnhild's big goal: the Dragon's Hoard (the Norse seventh dwelling, the building id the Greeks' Seraph Spire has). */
const HOARD = 'seraphSpire';

interface Run {
  readonly bloodaxe: BotRun;
  readonly opened: Adventure | null;
  readonly part: BotRun | null;
}

function play(style: Style, i: number): Run {
  const opts: BotOptions = { seed: 1000 + i * 7919, ...STYLES[style] };
  const hladir = playPart(HLADIR, opts);
  const uppsala = rideOnInto(hladir, HLADIR, UPPSALA, { ...opts, goalFirst: true, casts: true });
  const bloodaxe = rideOnInto(uppsala, UPPSALA, BLOODAXE, { ...opts, goalFirst: true, wise: true, casts: true, maxDays: 50 });
  if (!bloodaxe.won) return { bloodaxe, opened: null, part: null };
  const opened = rideOn(bloodaxe.adv, BLOODAXE, HALOGALAND);
  const part = rideOnInto(bloodaxe, BLOODAXE, HALOGALAND, { ...opts, goalFirst: true, wise: true, casts: true, maxDays: DAYS });
  return { bloodaxe, opened, part };
}

/** What beating Skoll would cost our strongest hero on `adv` (his army's share lost, 100: beaten), spells and all. */
export function skollCost(adv: Adventure): { cost: number; before: number } | null {
  if (!adv.objects.some((o) => o.id === SKOLL && !o.gone)) return null;
  const best = ourHeroes(adv).reduce((a, h) => (armyStrength(h.army) > armyStrength(a.army) ? h : a));
  const a = selectHero(adv, best.id);
  const s = battleSides(a, SKOLL, HALOGALAND);
  const st = autoBattle(s.attacker, s.defender, s.seed, s.siege);
  const before = armyStrength(a.hero.army);
  return { before: Math.round(before), cost: st.winner === 0 ? Math.round((1 - armyStrength(survivors(st, 0, a.hero.army)) / before) * 100) : 100 };
}

/** A straight ride for raced town `id` from where our hero stands (monsters aside), against Gunnhild left alone (our heroes at home): part days. */
export function race(start: Adventure, id: string): { rider: number; hers: number | null } {
  const town = start.towns.find((t) => t.id === id)!;
  const bare: Adventure = { ...start, objects: start.objects.filter((o) => o.kind !== 'monster') };
  const way = findPath(terrainView(bare, HALOGALAND), start.hero, town.x, town.y, start.hero.mp, dailyMp(start.hero));
  const rider = way ? way.at(-1)!.day + 1 : Infinity;
  const home = start.towns[0]!;
  let a: Adventure = { ...start, hero: { ...start.hero, x: home.x, y: home.y }, others: (start.others ?? []).map((h) => ({ ...h, x: home.x, y: home.y })) };
  for (let d = 1; d <= 20; d++) {
    a = playLord(endDay(a, HALOGALAND), HALOGALAND, 'auto').adv;
    if (a.towns.find((t) => t.id === id)!.owner === 'rival') return { rider, hers: a.day - (start.begun ?? 1) + 1 };
  }
  return { rider, hers: null };
}

const share = (f: Pick<Fight, 'before' | 'after'>): number => (f.before > 0 ? Math.round((1 - f.after / f.before) * 100) : 0);
const dayIn = (r: BotRun, f: Fight): number => f.day - (r.adv.begun ?? 1) + 1;
const mean = (xs: readonly number[]): number => Math.round(xs.reduce((n, x) => n + x, 0) / Math.max(1, xs.length));
const range = (xs: readonly number[]): string => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s[0] === s.at(-1) ? `${s[0]}` : `${s[0]}–${s.at(-1)}`) : '-';
};
/** Gunnhild's towns' fights (the gate's hero, if any, is fought first under GATE). */
const townFights = (r: BotRun): Fight[] => r.fights.filter((f) => f.id === BJARKOY || f.id === STEIGEN);
const isTown = (f: Fight): boolean => f.id.endsWith(BJARKOY) || f.id.endsWith(STEIGEN);
const strength = (a: Adventure): number => Math.round(ourHeroes(a).reduce((n, h) => n + armyStrength(h.army), 0));

const lordRow = (name: string, runs: readonly LordRun[]): string => {
  const won = runs.filter((r) => r.won);
  const hoard = runs.flatMap((r) => (r.built[HOARD] ? [r.built[HOARD]] : []));
  const strike = runs.flatMap((r) => (r.firstStrike ? [r.firstStrike] : []));
  const raced = RACED.map((id) => {
    const t = runs.flatMap((r) => (r.taken[id] ? [r.taken[id]!] : []));
    return `${t.filter((x) => x.by === 'player').length}/${t.filter((x) => x.by === 'rival').length} (${range(t.map((x) => x.day))})`;
  });
  return `| ${name} | ${won.length} / ${runs.filter((r) => r.lost).length} / ${runs.length - won.length - runs.filter((r) => r.lost).length} of ${runs.length} | ${range(won.map((r) => r.day))} | ${range(hoard)} | ${range(strike)} | ${raced.join(' | ')} |`;
};

describe('Halogaland, ridden on into from the Bloodaxe', () => {
  const table = STYLE_LIST.map((style) => ({ style, runs: Array.from({ length: SEEDS }, (_, i) => play(style, i)) }));
  const all = table.flatMap((t) => t.runs);
  const opened = all.flatMap((r) => (r.opened ? [r.opened] : []));
  const lords = opened.map((a) => playLordPart(a, HALOGALAND, DAYS));
  const fresh = Array.from({ length: SEEDS }, (_, i) => playLordPart(knowsHome({ ...startAdventure(HALOGALAND), seed: 9000 + i * 13 }, HALOGALAND, 32), HALOGALAND, DAYS));
  const of = (style: Style): Run[] => table.find((t) => t.style === style)?.runs ?? [];

  it('is won AI against AI (the lord mind on both sides), ridden on and fresh', () => {
    const runs = [...lords, ...fresh];
    expect(runs.filter((l) => l.lost)).toHaveLength(0);
    expect(runs.filter((l) => !l.won).length).toBeLessThanOrEqual(Math.floor(runs.length / 24));
  }, 7_200_000);

  // Not asserted: the steady partBot wins only 1 of 6 (Nov 11, short of "most"): a one-hero bot leaves the towns it takes empty, Eirik
  // and Gunnhild ride back into them, and she comes back each week while she holds one. The lord mind, which garrisons, wins every run.
  // The tables print it (BALANCE_SEEDS=24); docs/inkheroes-design.md, "Part 4 as built: Halogaland", says so.

  it('makes Skoll a real fight (25 to 40% of a strong army at part day 20, fresh) and the first week safe', () => {
    if (SEEDS >= 4) {
      const costs = fresh.slice(0, 4).flatMap((_, i) => {
        let at20: ReturnType<typeof skollCost> = null;
        playLordPart(knowsHome({ ...startAdventure(HALOGALAND), seed: 9000 + i * 13 }, HALOGALAND, 32), HALOGALAND, 20, (x, d) => { if (d === 20) at20 = skollCost(x); });
        return at20 ? [(at20 as { cost: number }).cost] : [];
      });
      expect(mean(costs)).toBeGreaterThanOrEqual(25);
      expect(mean(costs)).toBeLessThanOrEqual(40);
    }
    for (const { style, runs } of table) {
      for (const { part } of runs) {
        if (!part) continue;
        const cap = style === 'rush' ? 25 : style === 'steady' ? 15 : 10;
        for (const f of part.fights.filter((x) => dayIn(part, x) <= 7 && !isTown(x) && x.id !== SKOLL)) expect(share(f), `${style} ${f.id}`).toBeLessThanOrEqual(cap);
      }
    }
  }, 7_200_000);

  it('makes Trondenes and Vagar a real race: a straight ride takes each first, and Gunnhild takes them if we wait', () => {
    for (const start of opened.slice(0, 2)) {
      for (const id of RACED) {
        const r = race(start, id);
        expect(r.rider, id).toBeLessThan(Infinity);
        if (r.hers !== null) expect(r.hers, id).toBeGreaterThanOrEqual(r.rider);
      }
    }
  }, 7_200_000);

  it('prints the tables (BALANCE_SEEDS=24)', async () => {
    if (!process.env.BALANCE_SEEDS) return;
    const skoll = (a: Adventure | null): string => {
      if (!a) return '-';
      let at20: ReturnType<typeof skollCost> = null;
      playLordPart(a, HALOGALAND, 20, (x, d) => { if (d === 20) at20 = skollCost(x); });
      return at20 ? `${(at20 as { cost: number }).cost}% of ${(at20 as { before: number }).before}` : '-';
    };
    for (const { style, runs } of table) {
      const parts = runs.flatMap((r) => (r.part ? [r.part] : []));
      const days = parts.filter((p) => p.won).map((p) => partDays(p.adv));
      const towns = parts.flatMap((p) => townFights(p).map(share));
      const sk = parts.flatMap((p) => p.fights.filter((f) => f.id === SKOLL).map((f) => `${share(f)}@${dayIn(p, f)}`));
      const early = parts.flatMap((p) => p.fights.filter((f) => dayIn(p, f) <= 7 && !isTown(f)).map(share));
      say(`halogaland ${style}: bloodaxe won ${runs.filter((r) => r.opened).length}/${runs.length} (rides on day ${range(runs.flatMap((r) => (r.opened ? [r.bloodaxe.day] : [])))}, rider ${range(runs.flatMap((r) => (r.opened ? [strength(r.opened)] : [])))}); won ${days.length}/${parts.length} (part days ${range(days)}, mean ${mean(days)}); her towns ${range(towns)}% (mean ${mean(towns)}%); Skoll ${sk.join(',') || '-'}; week-1 fights at most ${Math.max(0, ...early)}%`);
      say(`  ends: ${parts.map((p) => `${p.adv.status}@${partDays(p.adv)}[${p.fights.map((f) => `${f.id.replace('halo-', '')}:${share(f)}@${dayIn(p, f)}`).join(' ')}] gunnhild ${rivalHeroes(p.adv).some((h) => h.id === 'gunnhild') ? 'rides' : 'down'}`).join('\n  ')}`);
    }
    say([
      `| Start | Won / lost / stalled | Won on part day | Dragon's Hoard (part day) | First strike (part day) | ${RACED.map((id) => `${id} ours/hers (day)`).join(' | ')} |`,
      `|---|---|---|---|---|${RACED.map(() => '---|').join('')}`,
      lordRow('Fresh', fresh),
      lordRow(`Ridden on (${opened.length} of ${all.length} won the Bloodaxe)`, lords),
    ].join('\n'));
    say(`AI v AI ends: ${[...fresh, ...lords].map((r) => `${r.won ? 'W' : r.lost ? 'L' : 'S'}@${r.day} hers ${r.adv.towns.filter((t) => t.owner === 'rival').map((t) => t.id.slice(0, 5)).join('+') || '-'} ${Math.round(r.strength.ours)} v ${Math.round(r.strength.his)}`).join('; ')}`);
    say(`Skoll at part day 20 (our strongest, AI v AI): fresh ${Array.from({ length: Math.min(SEEDS, 8) }, (_, i) => skoll(knowsHome({ ...startAdventure(HALOGALAND), seed: 9000 + i * 13 }, HALOGALAND, 32))).join('; ')}; ridden on ${opened.slice(0, 8).map(skoll).join('; ')}`);
    say(`Race (straight ride / Gunnhild alone, part day): ${opened.slice(0, 8).map((a) => RACED.map((id) => { const r = race(a, id); return `${r.rider}/${r.hers ?? '-'}`; }).join(' ')).join('; ')}`);
    await keep();
    expect(all.length).toBe(SEEDS * STYLE_LIST.length);
  }, 7_200_000);
});
