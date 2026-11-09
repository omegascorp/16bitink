import { describe, expect, it } from 'vitest';
import { ASHFORD, BLACK_BANNER, OTHRYS, THORNWOOD } from '../src/level/borderMarch';
import { battleSides, endDay, ourHeroes, rivalHeroes, startAdventure, terrainView, type Adventure } from '../src/logic/adventure';
import { autoBattle } from '../src/logic/autoBattle';
import { survivors } from '../src/logic/battle';
import { dailyMp } from '../src/logic/hero';
import { selectHero } from '../src/logic/heroes';
import { playLord } from '../src/logic/lord/turn';
import { findPath } from '../src/logic/path';
import { rideOn } from '../src/logic/chapter';
import { armyStrength } from '../src/logic/strength';
import { knowsHome, playLordPart, type LordRun } from './lordBot';
import { playPart, rideOnInto } from './partBot';

/**
 * Othrys balanced AI against AI (docs/inkheroes-design.md, Part 4
 * "Balance"): the lord mind plays our side and Lykaon's, (a) ridden on from
 * the chapter (the bot plays Ashford and Thornwood, the lord mind the Black
 * Banner against Kassander's rules), and (b) from the part's fresh start.
 * Only with BALANCE_SEEDS (it prints the table the doc quotes).
 */

const SEEDS = Number((globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.BALANCE_SEEDS ?? 0);
const DAYS = 70;

/** The chapter played up to Othrys: the Black Banner by the lord mind (the bot no longer wins it, Nov 8). Null when it isn't won. */
export function riddenOn(seed: number): Adventure | null {
  const opts = { seed, edge: 1.6, bossEdge: 1.3, wise: true } as const;
  const ashford = playPart(ASHFORD, opts);
  const thornwood = rideOnInto(ashford, ASHFORD, THORNWOOD, opts);
  if (!thornwood.won) return null;
  const banner = playLordPart(rideOn(thornwood.adv, THORNWOOD, BLACK_BANNER), BLACK_BANNER, 60);
  return banner.won ? rideOn(banner.adv, BLACK_BANNER, OTHRYS) : null;
}

/** What beating the Gigantes would cost our strongest hero on `adv` (his army's share lost, 100: beaten), spells and all. */
function gigantesCost(adv: Adventure): { cost: number; before: number } | null {
  if (!adv.objects.some((o) => o.id === 'forge-gigantes' && !o.gone)) return null;
  const best = ourHeroes(adv).reduce((a, h) => (armyStrength(h.army) > armyStrength(a.army) ? h : a));
  const a = selectHero(adv, best.id);
  const s = battleSides(a, 'forge-gigantes');
  const st = autoBattle(s.attacker, s.defender, s.seed, s.siege);
  const before = armyStrength(a.hero.army);
  return { before: Math.round(before), cost: st.winner === 0 ? Math.round((1 - armyStrength(survivors(st, 0, a.hero.army)) / before) * 100) : 100 };
}

/** The race left to Lykaon (our side waiting at home) against a straight ride from where our hero stands: the part day each takes the town. */
function race(start: Adventure, id: string): { rider: number; his: number | null; spire: number | null } {
  const town = start.towns.find((t) => t.id === id)!;
  const bare: Adventure = { ...start, objects: start.objects.filter((o) => o.kind !== 'monster') };
  const way = findPath(terrainView(bare, OTHRYS), start.hero, town.x, town.y, start.hero.mp, dailyMp(start.hero));
  // The ride, and a fight on the way (the guard, then the garrison) the same day.
  const rider = way ? way.at(-1)!.day + 1 : Infinity;
  // Our heroes far back at Ashford: he races with nobody in his way.
  const home = start.towns[0]!;
  let a: Adventure = { ...start, hero: { ...start.hero, x: home.x, y: home.y }, others: (start.others ?? []).map((h) => ({ ...h, x: home.x, y: home.y, army: h.army.map(() => null) })) };
  let his: number | null = null;
  let spire: number | null = null;
  // Left alone: the day he takes the town, and the day he raises the Seraph Spire (unpressured).
  for (let d = 1; d <= 40 && spire === null; d++) {
    a = playLord(endDay(a, OTHRYS), OTHRYS, 'auto').adv;
    const day = a.day - (start.begun ?? 1) + 1;
    if (his === null && a.towns.find((t) => t.id === id)!.owner === 'rival') his = day;
    if (a.towns.some((t) => t.owner === 'rival' && t.built.includes('seraphSpire'))) spire = day;
  }
  return { rider, his, spire };
}

const range = (xs: readonly number[]): string => (xs.length ? `${Math.min(...xs)} to ${Math.max(...xs)}` : 'never');

function row(name: string, runs: readonly LordRun[]): string {
  const won = runs.filter((r) => r.won).length;
  const lost = runs.filter((r) => r.lost).length;
  const spire = runs.flatMap((r) => (r.built.seraphSpire ? [r.built.seraphSpire] : []));
  const strike = runs.flatMap((r) => (r.firstStrike ? [r.firstStrike] : []));
  const race = (id: string): string => {
    const t = runs.flatMap((r) => (r.taken[id] ? [r.taken[id]!] : []));
    return `${t.filter((x) => x.by === 'player').length}/${t.filter((x) => x.by === 'rival').length} (day ${range(t.map((x) => x.day))})`;
  };
  return `| ${name} | ${won} / ${lost} / ${runs.length - won - lost} of ${runs.length} | ${range(runs.filter((r) => r.won).map((r) => r.day))} | ${range(spire)} | ${range(strike)} | ${race('pherai-town')} | ${race('iolkos-town')} |`;
}

describe('Othrys, AI against AI', () => {
  it.skipIf(!SEEDS)('prints its table', () => {
    const probed = (start: Adventure): LordRun & { at20?: ReturnType<typeof gigantesCost>; at35?: ReturnType<typeof gigantesCost> } => {
      const g: { at20?: ReturnType<typeof gigantesCost>; at35?: ReturnType<typeof gigantesCost> } = {};
      const run = playLordPart(start, OTHRYS, DAYS, (a, d) => { if (d === 20) g.at20 = gigantesCost(a); if (d === 35) g.at35 = gigantesCost(a); });
      return { ...run, ...g };
    };
    const fresh = Array.from({ length: SEEDS }, (_, i) => probed(knowsHome({ ...startAdventure(OTHRYS), seed: 7000 + i * 13 }, OTHRYS)));
    const starts = Array.from({ length: SEEDS }, (_, i) => riddenOn(100 + i)).filter((a): a is Adventure => !!a);
    const chapter = starts.map((a) => probed(a));
    console.info([
      '| Start | Won / lost / stalled | Won on part day | Seraph Spire (part day) | First strike (part day) | Pherai ours/his (day) | Iolkos ours/his (day) |',
      '|---|---|---|---|---|---|---|',
      row('Fresh', fresh),
      row(`Ridden on (${starts.length} of ${SEEDS} won the Black Banner)`, chapter),
    ].join('\n'));
    for (const [name, runs] of [['fresh', fresh], ['ridden on', chapter]] as const) {
      console.info(`Ends (${name}): ${runs.map((r) => `${r.won ? 'W' : r.lost ? 'L' : 'S'} his towns ${r.adv.towns.filter((t) => t.owner === 'rival').map((t) => t.id.slice(0, 4)).join('+') || '-'}, lykaon ${rivalHeroes(r.adv).some((h) => h.id === 'lykaon') ? 'rides' : 'down'}, ${Math.round(r.strength.ours)} v ${Math.round(r.strength.his)}`).join('; ')}`);
    }
    console.info(`Rider at ride-on: ${range(starts.map((a) => Math.round(armyStrength(a.hero.army))))}`);
    for (const [name, list] of [['fresh', fresh.map((r, i) => ({ r, start: knowsHome({ ...startAdventure(OTHRYS), seed: 7000 + i * 13 }, OTHRYS) }))], ['ridden on', chapter.map((r, i) => ({ r, start: starts[i]! }))]] as const) {
      const races = ['pherai-town', 'iolkos-town'].map((id) => `${id}: ${list.map(({ start }) => { const x = race(start, id); return `${x.rider}/${x.his ?? '-'} (Spire ${x.spire ?? '-'})`; }).join(' ')}`);
      console.info(`Race (${name}), straight ride / Lykaon alone, part day: ${races.join('; ')}`);
      console.info(`Gigantes (${name}), share lost by our strongest at part day 20 and 35: ${list.map(({ r }) => [r.at20, r.at35].map((g) => (g ? `${g.cost}% of ${g.before}` : '-')).join(' / ')).join('; ')}`);
    }
    expect(fresh.length).toBe(SEEDS);
  }, 3_600_000);
});
