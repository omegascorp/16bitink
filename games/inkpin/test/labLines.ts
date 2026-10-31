import { parseStep, type LevelDef } from '../src/logic/level';
import { GAS, STEPS_PER_SECOND } from '../src/logic/particles';
import type { World } from '../src/logic/world';
import { mid, orderOf, type Audit } from './audit';
import { play, type Run } from './solver';

/**
 * The lab's extra lines (from Chapter 3 on; printed for every level): the
 * route order, drop-one decoys, walk-only time, torches the gas reaches, the
 * dead ends and deepest wrong orders from the audit, and (ROBUST=1) the
 * solution replayed with its stops and timings nudged.
 */

/** Nib's hint walk comes this close (px, in x, or y on a tall level) to a pin's midpoint: the reader meets that pin. */
const ROUTE_REACH = 150;
/** A gas grain this close (px) to a decorative torch: the reader expects it to light. */
const TORCH_REACH = 40;
/** Nib walking this fast (px per step) while nothing else moves counts as walk-only time. */
const WALKING = 0.3;
/** World calm for at least this many steps counts as "nothing else moves". */
const CALM = 1;

const sec = (steps: number): string => (steps / STEPS_PER_SECOND).toFixed(1);
const ended = (r: Run): string => (r.possible ? (r.status.state === 'won' ? 'won' : r.status.state === 'lost' ? `lost:${r.status.cause}` : 'stuck') : 'blocked');

/** What the hint's play shows, step by step. */
interface HintWatch {
  readonly firstNear: Map<string, number>;
  walkOnly: number;
  stretch: number;
  longest: number;
  readonly torches: Set<number>;
}

function watchHint(level: LevelDef): { run: Run; watch: HintWatch } {
  const tall = level.view.h > level.view.w;
  const watch: HintWatch = { firstNear: new Map(), walkOnly: 0, stretch: 0, longest: 0, torches: new Set() };
  const run = play(level, level.solution, false, undefined, (w: World) => {
    for (const p of level.pins) {
      if (watch.firstNear.has(p.id)) continue;
      const m = mid(p);
      if (Math.abs(tall ? w.nib.y - m.y : w.nib.x - m.x) < ROUTE_REACH) watch.firstNear.set(p.id, w.steps);
    }
    const walking = Math.abs(w.nib.vx) > WALKING && w.nibOrder.kind !== 'stay';
    if (walking && w.calm >= CALM) {
      watch.walkOnly++;
      watch.stretch++;
      watch.longest = Math.max(watch.longest, watch.stretch);
    } else watch.stretch = 0;
    const g = w.grains;
    level.torches.forEach((t, k) => {
      if (watch.torches.has(k)) return;
      g.near(t.x, t.y, TORCH_REACH, (i) => {
        if (g.kind[i] === GAS) watch.torches.add(k);
      });
    });
  });
  return { run, watch };
}

/** The route order, drop-one decoys, walk-only time and the torch check. */
export function hintLines(level: LevelDef): string[] {
  const { run, watch } = watchHint(level);
  const order = [...level.pins].sort((a, b) => (watch.firstNear.get(a.id) ?? Infinity) - (watch.firstNear.get(b.id) ?? Infinity));
  const route = orderOf(level, order);
  const routeRun = play(level, route);
  const out = [`obvious, route order (pins as the hint's walk meets them): ${route.join(',')} → ${ended(routeRun)}  t=${sec(routeRun.steps)}s (must lose)`];
  const used = new Set(level.solution.map((s) => parseStep(s).id));
  const decoys: string[] = [];
  const traps: string[] = [];
  for (const p of level.pins) {
    if (!used.has(p.id)) {
      traps.push(p.id);
      continue;
    }
    const r = play(level, level.solution.filter((s) => parseStep(s).id !== p.id));
    if (r.possible && r.status.state === 'won') decoys.push(p.id);
  }
  out.push(`drop-one: decoys [${decoys.join(' ')}] (target none)  trap [${traps.join(' ')}] (at most one: the pin no win uses)`);
  const share = run.steps ? watch.walkOnly / run.steps : 0;
  const ok = share <= 0.2 && watch.longest <= 3 * STEPS_PER_SECOND;
  out.push(`walk-only: ${sec(watch.walkOnly)}s of the hint's ${sec(run.steps)}s (${Math.round(share * 100)}%, target <=20%), longest stretch ${sec(watch.longest)}s (target <=3s)  ${ok ? 'PASS' : 'FAIL'}`);
  if (watch.torches.size) out.push(`WARNING: gas comes within ${TORCH_REACH}px of decorative torch(es) ${[...watch.torches].map((k) => `#${k} (${level.torches[k]!.x},${level.torches[k]!.y})`).join(', ')}: make it a real fire bowl or move it`);
  return out;
}

/** The audit's dead ends and its deepest wrong orders. */
export function auditLines(a: Audit): string[] {
  const pct = (n: number): string => `${Math.round(n * 100)}%`;
  const stuck = a.stuckShare - a.playingShare;
  return [
    `dead ends: stuck ${pct(stuck)} (settled, target 0) ${a.deadEnds.stuck.map((o) => `[${o}]`).join(' ')}  playing ${pct(a.playingShare)} (timed out, target 0) ${a.deadEnds.playing.map((o) => `[${o}]`).join(' ')}`,
    `deepest wrong orders: ${a.deepest.map((d) => `[${d.order}] tap ${d.tap} ${d.end} t=${sec(d.steps)}s`).join('  ') || 'none'}`,
  ];
}

/** ROBUST=1: the solution with the default stops, the stops reversed, each wait at ±25% and each walk at ±40 px. */
export function robustLines(level: LevelDef): string[] {
  const variants: [string, LevelDef, readonly string[]][] = [];
  if (level.stops) {
    variants.push(['default stops (the chest)', { ...level, stops: undefined }, level.solution]);
    variants.push(['stops reversed', { ...level, stops: [...level.stops].reverse() }, level.solution]);
  }
  level.solution.forEach((s, i) => {
    const st = parseStep(s);
    const head = s.lastIndexOf('~') < 0 ? s : s.slice(0, s.lastIndexOf('~'));
    const tail = st.wait === null ? '' : `~${st.wait}`;
    const swap = (to: string): string[] => level.solution.map((x, j) => (j === i ? to : x));
    if (st.wait !== null) for (const k of [0.75, 1.25]) variants.push([`${s} wait x${k}`, level, swap(`${head}~${Math.round(st.wait * k * 100) / 100}`)]);
    if (st.walk !== undefined) for (const d of [-40, 40]) variants.push([`${s} walk ${d > 0 ? '+' : ''}${d}`, level, swap(`@${st.walk + d}${tail}`)]);
  });
  const results = variants.map(([name, l, order]) => {
    const r = play(l, order);
    return { name, end: ended(r) };
  });
  const wins = results.filter((r) => r.end === 'won').length;
  return [`robust: ${wins}/${results.length} variants win${wins < results.length ? ' (a win only some give is fragile)' : ''}`, ...results.map((r) => `    ${r.name} → ${r.end}`)];
}
