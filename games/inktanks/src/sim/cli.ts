import { CH1_LAND } from '../content/ch1/land';
import { CH1_MISSIONS, ch1Mission } from '../content/ch1/missions';
import { sumIntel } from '../logic/intel';
import { outcome } from '../logic/mission/outcome';
import { FAMILIES, STARTER_LOADOUT, type Family } from '../logic/parts';
import { rankOf } from '../logic/rank';
import { intelLine, runChapter } from './chapter';
import { runMission, type RunResult } from './runMission';

/**
 * The headless sim.
 *   sim -- --level 3 --runs 20          a mission with a bot in the player's seat
 *   sim -- --level 3 --bots             bots only
 *   sim -- --chapter --seeds 5          the whole-chapter no-grind check
 */
interface Args {
  level: number;
  runs: number;
  seed: number;
  bots: boolean;
  chapter: boolean;
  seeds: number;
}

export function parseArgs(argv: readonly string[]): Args {
  const a: Args = { level: 1, runs: 20, seed: 1, bots: false, chapter: false, seeds: 3 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]!;
    const v = Number(argv[i + 1]);
    if (k === '--level' && Number.isFinite(v)) a.level = v;
    else if (k === '--runs' && Number.isFinite(v)) a.runs = v;
    else if (k === '--seed' && Number.isFinite(v)) a.seed = v;
    else if (k === '--seeds' && Number.isFinite(v)) a.seeds = v;
    else if (k === '--bots') a.bots = true;
    else if (k === '--chapter') a.chapter = true;
  }
  if (a.level < 1 || a.level > CH1_MISSIONS.length) throw new Error(`--level must be 1–${CH1_MISSIONS.length}`);
  return a;
}

const avg = (xs: readonly number[]): number => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const pct = (x: number): string => `${Math.round(x * 100)}%`;
const fmt = (s: number): string => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

function pickRates(results: readonly RunResult[]): string {
  const picks = new Map<Family, number>();
  const fitted = new Map<Family, number>();
  let nPicks = 0;
  let nTanks = 0;
  for (const r of results) {
    for (const t of r.tanks) {
      if (t.role !== 'tank') continue;
      nTanks++;
      for (const p of t.picks) {
        picks.set(p.family, (picks.get(p.family) ?? 0) + 1);
        nPicks++;
      }
      for (const p of [t.loadout.gun, t.loadout.hull, t.loadout.drive]) fitted.set(p.family, (fitted.get(p.family) ?? 0) + 1);
    }
  }
  const row = (f: Family) => `${f.padEnd(11)} picked ${pct((picks.get(f) ?? 0) / Math.max(1, nPicks)).padStart(4)}   fitted at end ${pct((fitted.get(f) ?? 0) / Math.max(1, nTanks)).padStart(4)}`;
  return `  swaps per tank ${(nPicks / Math.max(1, nTanks)).toFixed(2)}\n${FAMILIES.map((f) => `  ${row(f)}`).join('\n')}`;
}

export function missionSummary(a: Args): string {
  const def = ch1Mission(a.level);
  const results: RunResult[] = [];
  for (let i = 0; i < a.runs; i++) results.push(runMission({ land: CH1_LAND, mission: def, seed: a.seed + i, player: a.bots ? null : { loadout: STARTER_LOADOUT } }));
  const lines = [`Level ${def.level} ${def.name} (${def.type}), ${a.runs} runs, ${a.bots ? 'bots only' : 'a bot in the player seat on the starter tank'}`];
  const times = results.map((r) => r.time);
  lines.push(`  match length avg ${fmt(avg(times))}  min ${fmt(Math.min(...times))}  max ${fmt(Math.max(...times))}`);
  lines.push(`  tanks per match ${avg(results.map((r) => r.tanks.filter((t) => t.role === 'tank').length)).toFixed(1)}  sim ms per match ${Math.round(avg(results.map((r) => r.ms)))}  flow fields built ${Math.round(avg(results.map((r) => r.flowBuilds)))}`);
  if (!a.bots) {
    const reps = results.map((r) => r.report!);
    const outs = reps.map((r) => outcome(def, r, undefined));
    const place = reps.map((r) => r.placement);
    lines.push(`  passed ${pct(avg(results.map((r) => (r.passed ? 1 : 0))))}  placement avg ${avg(place).toFixed(1)} (${place.join(' ')})`);
    lines.push(`  kills avg ${avg(reps.map((r) => r.kills)).toFixed(2)}  intel avg ${avg(reps.map((r) => r.intelCount)).toFixed(1)}  XP avg ${Math.round(avg(outs.map((o) => o.xp)))}  bonus medals ${pct(avg(outs.map((o) => ((o.done[1] ? 1 : 0) + (o.done[2] ? 1 : 0)) / 2)))}`);
    const reasons = new Map<string, number>();
    for (const r of results) reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + 1);
    lines.push(`  ends: ${[...reasons].map(([k, v]) => `${k} ${v}`).join(', ')}`);
  }
  const all = results.flatMap((r) => r.tanks.filter((t) => t.role === 'tank'));
  lines.push(`  hit rate ${pct(all.reduce((s, t) => s + t.shotsHit, 0) / Math.max(1, all.reduce((s, t) => s + t.shotsFired, 0)))}  kills per match ${avg(results.map((r) => r.tanks.reduce((s, t) => s + t.kills, 0))).toFixed(1)}  storm deaths share ${pct(all.filter((t) => t.stormDamage > 0 && !t.alive).length / Math.max(1, all.filter((t) => !t.alive).length))}`);
  lines.push(pickRates(results));
  return lines.join('\n');
}

export function chapterSummary(a: Args): string {
  const lines: string[] = [];
  let ok = 0;
  for (let s = 0; s < a.seeds; s++) {
    const r = runChapter(CH1_LAND, CH1_MISSIONS, a.seed + s);
    if (r.verdict.ok) ok++;
    lines.push(`Chapter 1, seed ${a.seed + s}`);
    lines.push('  lv name                 tries  medals  XP    rank            intel gained                        tank at start');
    for (const row of r.rows) {
      const medals = row.outcome.done.map((d) => (d ? 'x' : '.')).join('');
      lines.push(`  ${String(row.level).padStart(2)} ${row.name.padEnd(20)} ${String(row.attempts).padStart(5)}  ${medals.padEnd(6)} ${String(row.xp).padStart(5)}  ${row.rank.padEnd(15)} ${String(sumIntel(row.intel)).padStart(3)}  ${row.loadout}`);
    }
    const p = r.progress;
    lines.push(`  end: ${rankOf(p.xp).name} (${p.xp} XP), bonus medals ${pct(r.bonusShare)}, total intel ${intelLine(p.intelTotal)}`);
    lines.push(`  unlocked ${p.unlocked.join(', ')}; Mk ${Object.entries(p.mk).map(([k, v]) => `${k} ${v}`).join(', ')}`);
    lines.push(`  research ${JSON.stringify(p.research)}`);
    lines.push(`  no-grind: ${r.verdict.ok ? 'PASS' : 'FAIL'}: ${r.verdict.detail}`);
  }
  lines.push(`No-grind check passed on ${ok} of ${a.seeds} seeds.`);
  return lines.join('\n');
}

export function main(argv: readonly string[]): string {
  const a = parseArgs(argv);
  return a.chapter ? chapterSummary(a) : missionSummary(a);
}
