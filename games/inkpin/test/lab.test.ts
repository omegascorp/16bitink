import { describe, expect, it } from 'vitest';
import { ALL_LEVELS as LEVELS, CHAPTER_3_DRAFTS } from '../src/level/paid';
import type { LevelDef } from '../src/logic/level';
import { COIN, GAS, LAVA, STEPS_PER_SECOND, STONE, WATER } from '../src/logic/particles';
import { inRooms } from '../src/logic/rooms';
import { World } from '../src/logic/world';
import { audit, obviousOrders } from './audit';
import { curveCheck } from './curve';
import { auditLines, hintLines, robustLines } from './labLines';
import { play } from './solver';

declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

/**
 * Level lab: LAB=<id> [ORDERS="A,B|B,A"] [BOARD=1] [STEPS=1] [AUDIT=1] [ROBUST=1]
 * npx vitest run test/lab --silent=false --testTimeout=3600000
 */
const env = process.env;
const GRAIN_LIMIT = 700;
const COLS = 100;
const CELL = 20;

const orderText = (order: readonly string[]): string => order.join(',');
const sec = (steps: number): string => (steps / STEPS_PER_SECOND).toFixed(1);

const KIND_NAME: Record<number, string> = { [WATER]: 'water', [LAVA]: 'lava', [COIN]: 'coin', [STONE]: 'stone', [GAS]: 'gas' };

/** The rows world.ts's fill packs: every 10 px across from x0 + 6 to x1 - 6, odd rows offset 5, rows 9 px apart from y1 - 8 up (gas: from y1 + 8 down, hanging from its lid). */
function rowsOf(f: LevelDef['fills'][number]): number {
  const per = (offset: number): number => Math.max(0, Math.floor((f.x1 - 6 - (f.x0 + 6 + offset)) / 10) + 1);
  let left = f.count;
  let rows = 0;
  while (left > 0 && rows < 1000) left -= per((rows++ % 2) * 5);
  return rows;
}

/** Where a fill's rows end: up from y1 for grains that fall, down from its lid for gas. */
function packEnd(f: LevelDef['fills'][number]): string {
  const span = (rowsOf(f) - 1) * 9;
  return f.kind === GAS ? `down from its lid to y ${f.y1 + 8 + span}` : `up to y ${f.y1 - 8 - span}`;
}

/** A world with the grains settled, as the player sees the start. */
function settled(level: LevelDef): World {
  const w = new World(level);
  for (let s = 0; s < STEPS_PER_SECOND * 5 && !(s > 30 && w.settled); s++) w.step();
  return w;
}

function counts<T>(items: readonly T[], key: (t: T) => string): string {
  const m = new Map<string, number>();
  for (const t of items) m.set(key(t), (m.get(key(t)) ?? 0) + 1);
  return [...m].map(([k, n]) => `${n} ${k}`).join(', ') || 'none';
}

function header(level: LevelDef, w: World): string {
  const g = w.grains;
  const kinds = [[WATER, 'water'], [LAVA, 'lava'], [COIN, 'coin'], [STONE, 'stone']] as const;
  const byKind = kinds.map(([k, name]) => `${g.countOf(k)} ${name}`).join(', ') + (g.countOf(GAS) ? `, ${g.countOf(GAS)} gas` : '');
  const pins = level.pins.map((p) => (p.gate ? `${p.id}(gate)` : p.id)).join(' ');
  const guards = counts(level.blots, (b) => (b.boss ? 'boss ' : '') + (b.animal ?? (b.spiky ? 'porcupine' : 'boar')));
  return `${level.name} [${level.id}] view ${level.view.w}x${level.view.h}  grains ${g.count} (${byKind})  pins ${pins}  guards ${guards}  coins ${level.coinsNeeded}/${w.coinsTotal}`;
}

/** ASCII map of the start, one character per CELL px wide and 2*CELL tall. */
function board(level: LevelDef, w: World): string[] {
  const xs = level.rooms.flat().map((p) => p[0]);
  const ys = level.rooms.flat().map((p) => p[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const dx = Math.max(CELL, (Math.max(...xs) - x0) / COLS);
  const dy = dx * 2;
  const cols = Math.ceil((Math.max(...xs) - x0) / dx) + 1;
  const rows = Math.ceil((Math.max(...ys) - y0) / dy) + 1;
  const grid: string[][] = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => (inRooms(level.rooms, x0 + (c + 0.5) * dx, y0 + (r + 0.5) * dy) ? ' ' : '.')),
  );
  const put = (x: number, y: number, ch: string): void => {
    const r = Math.floor((y - y0) / dy);
    const c = Math.floor((x - x0) / dx);
    if (grid[r]?.[c] !== undefined) grid[r]![c] = ch;
  };
  const line = (ax: number, ay: number, bx: number, by: number, ch: string): void => {
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (dx / 2)));
    for (let i = 0; i <= n; i++) put(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n, ch);
  };
  for (const d of level.drains ?? []) for (let y = d.y0; y <= d.y1; y += dy / 2) line(d.x0, y, d.x1, y, 'D');
  const glyph: Record<number, string> = { [WATER]: '~', [LAVA]: '^', [STONE]: '=', [COIN]: '$', [GAS]: 'o' };
  for (let i = 0; i < w.grains.count; i++) put(w.grains.x[i]!, w.grains.y[i]!, glyph[w.grains.kind[i]!] ?? '?');
  for (const s of level.walls) line(s.ax, s.ay, s.bx, s.by, '#');
  for (const i of level.cracked ?? []) if (level.walls[i]) line(level.walls[i]!.ax, level.walls[i]!.ay, level.walls[i]!.bx, level.walls[i]!.by, '%');
  for (const p of level.plates ?? []) line(p.x0, p.y - 4, p.x1, p.y - 4, 'P');
  for (const d of level.doors ?? []) line(d.ax, d.ay, d.bx, d.by, '|');
  for (const b of level.braziers ?? []) put(b.x, b.y - 34, 'F');
  for (const l of level.ledges ?? []) line(l.x0, l.y, l.x1, l.y, '_');
  for (const p of level.pins) line(p.ax, p.ay, p.bx, p.by, p.id);
  for (const b of w.boulders) if (!b.crate) put(b.x, b.y, b.raft ? 'R' : 'O');
  for (const r of w.rubies) put(r.x, r.y, '*');
  for (const b of w.blots) put(b.x, b.y, b.boss ? 'B' : 'g');
  if (level.chest) put(level.chest.x, level.chest.y, '&');
  put(w.nib.x, w.nib.y, 'N');
  const legend = '# wall/bar, letter pin, ~ water, ^ lava, = stone, $ coin, * ruby, _ ledge, R raft, O boulder, g guard, B boss, N Nib, & chest, D drain, . rock; tomb: o gas, % cracked wall, P plate, | door, F fire bowl';
  return [...grid.map((r) => r.join('').replace(/\s+$/, '')), `legend (1 char = ${Math.round(dx)}px wide): ${legend}`];
}

function runOrder(level: LevelDef, order: readonly string[], steps: boolean): string[] {
  const out: string[] = [];
  const r = play(level, order, false, (world, i) => {
    if (steps) out.push(`    step ${i} ${order[i]}: t=${sec(world.steps)}s nib=(${Math.round(world.nib.x)},${Math.round(world.nib.y)}) coins=${world.coinsCollected} ${world.status.state}`);
  });
  const status = r.possible ? (r.status.state === 'won' ? 'won' : r.status.state === 'lost' ? `lost:${r.status.cause}` : 'stuck') : 'blocked';
  return [`${orderText(order)} → ${status}  t=${sec(r.steps)}s  coins=${r.treasure}/${level.coinsNeeded}`, ...out];
}

function auditLine(level: LevelDef): { lines: string[]; failures: readonly string[] } {
  const a = audit(level);
  const { chapter, pos, row, maxWin, minLessons, failures } = curveCheck(level, a);
  const lessons = Object.entries(a.lessons).sort((x, y) => y[1] - x[1]);
  const pct = (n: number): string => `${Math.round(n * 100)}%`;
  return { failures, lines: [
    `audit (chapter ${chapter}, level ${pos} of it; curve row from chapter ${row.fromChapter}): tried ${a.tried}  win ${pct(a.winShare)} (<=${pct(maxWin)})  lessons ${lessons.length} (>=${minLessons})  top ${pct(a.topLessonShare)} (<=${pct(row.maxTop)})  stuck ${pct(a.stuckShare)} (<=10%)  late losses ${pct(a.lateLossShare)} (>=${pct(row.minLate)})  blocked ${pct(a.blockedShare)}  obvious: nearest ${a.obvious.nearest}, left-to-right ${a.obvious.leftToRight} (must lose)  ${failures.length === 0 ? 'PASS' : 'FAIL'}`,
    ...lessons.slice(0, 5).map(([k, n]) => `    ${n}x ${k}`),
    ...auditLines(a),
  ] };
}

describe.skipIf(!env.LAB)('level lab', () => {
  it('reports on the level', () => {
    // Drafts too: a level is only listed once it passes, and the lab is how it gets there.
    const all = [...LEVELS, ...CHAPTER_3_DRAFTS];
    const level = all.find((l) => l.id === env.LAB);
    if (!level) throw new Error(`no level "${env.LAB}"; ids: ${all.map((l) => l.id).join(' ')}`);
    const w = settled(level);
    const out: string[] = [header(level, w)];
    if (env.BOARD) out.push(...board(level, w));
    const orders = [level.solution.slice(), ...(env.ORDERS ?? '').split('|').filter(Boolean).map((o) => o.split(','))];
    orders.forEach((o, i) => out.push(...runOrder(level, o, !!env.STEPS).map((l, j) => (i === 0 && j === 0 ? `hint: ${l}` : l))));
    const obv = obviousOrders(level);
    out.push(...runOrder(level, obv.nearest, false).map((l) => `obvious, nearest first: ${l}`));
    out.push(...runOrder(level, obv.leftToRight, false).map((l) => `obvious, left to right: ${l}`));
    out.push(...hintLines(level));
    if (env.ROBUST) out.push(...robustLines(level));
    const curve = env.AUDIT ? auditLine(level) : null;
    if (curve) out.push(...curve.lines);
    const g = new World(level).grains;
    const outside = Array.from({ length: g.count }, (_, i) => i).filter((i) => !inRooms(level.rooms, g.x[i]!, g.y[i]!));
    // The boss's breath counts toward the budget at its cap.
    const total = g.count + (level.breath?.max ?? 0);
    out.push(`grains: ${outside.length} start outside the rooms; total ${total}/${GRAIN_LIMIT}${level.breath ? ` (with the breath cap ${level.breath.max})` : ''}${total > GRAIN_LIMIT ? ' OVER' : ''}`);
    // Grain ids follow the fills in order: name each fill that starts grains in the rock.
    let first = 0;
    level.fills.forEach((f, k) => {
      const n = outside.filter((i) => g.id[i]! >= first && g.id[i]! < first + f.count).length;
      if (n) out.push(`  fill ${k} (${KIND_NAME[f.kind]} x ${f.x0}..${f.x1}, y1 ${f.y1}, count ${f.count}) overflows: ${n} grains start outside the rooms (it packs ${rowsOf(f)} rows ${packEnd(f)})`);
      first += f.count;
    });
    console.log(out.join('\n'));
    if (curve) expect(curve.failures, `${level.name} misses the difficulty curve`).toEqual([]);
    expect(out.length).toBeGreaterThan(0);
  });
});
