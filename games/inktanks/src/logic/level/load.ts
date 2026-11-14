import type { Material } from '../damage';
import type { Shape } from '../geom';
import { buildLand, groundAt, SCREEN, type LandDef, type StructureDef } from '../land';
import { DRIVE_FAMILIES, GUN_FAMILIES, HULL_FAMILIES, type Family, type Loadout, type Mk, type Part } from '../parts';
import type { Pt } from '../vec';
import type { BonusDef, CrateDef, EnemyDef, LevelDef, ObjectiveDef, Place } from './types';

/** What the loader needs of a structure kind (the chapter's kinds table has more). */
export interface StructKind {
  readonly shape: Shape;
  readonly material: Material;
  readonly hp: number;
  readonly flattenable?: boolean;
  readonly cover?: boolean;
  readonly roof?: boolean;
  readonly low?: boolean;
}

export type ResolvedEnemy = Omit<EnemyDef, 'at' | 'tank'> & { readonly at: Pt; readonly loadout: Loadout; readonly index: number };
export type ResolvedCrate = Omit<CrateDef, 'at'> & { readonly at: Pt };

/** A level checked and built: every name resolved to a point. */
export interface LoadedLevel {
  readonly def: LevelDef;
  readonly land: LandDef;
  readonly start: Pt;
  readonly enemies: readonly ResolvedEnemy[];
  readonly crates: readonly ResolvedCrate[];
}

export class LevelError extends Error {
  constructor(level: string, msg: string) {
    super(`level ${level}: ${msg}`);
    this.name = 'LevelError';
  }
}

const ROUTED = new Set(['patrol', 'convoy', 'runner']);

/** Parses "cannon2/medium1/halftracks1" (Mk 1–3 after each family). */
export function parseTank(spec: string): Loadout {
  const parts = spec.split('/').map((s) => s.trim());
  const one = (s: string | undefined, fams: readonly Family[], slot: string): Part => {
    const m = /^([a-z]+)([123])$/.exec(s ?? '');
    if (!m || !fams.includes(m[1] as Family)) throw new Error(`bad ${slot} "${s}" in tank "${spec}" (want one of ${fams.join(', ')} + Mk 1–3)`);
    return { family: m[1] as Family, mk: Number(m[2]) as Mk };
  };
  if (parts.length !== 3) throw new Error(`tank "${spec}" must be gun/hull/drive`);
  return { gun: one(parts[0], GUN_FAMILIES, 'gun'), hull: one(parts[1], HULL_FAMILIES, 'hull'), drive: one(parts[2], DRIVE_FAMILIES, 'drive') };
}

/**
 * Checks a level and builds its map. Throws a LevelError naming the level
 * and the bad field: an unknown point, road, structure kind or tag, a place
 * off the map or in water, a routed role without a route, a bad tank.
 */
export function loadLevel(def: LevelDef, kinds: Readonly<Record<string, StructKind>>): LoadedLevel {
  // Collect every problem, so one run of the lab lists them all.
  const problems: string[] = [];
  const err = (msg: string): never => {
    throw new LevelError(`${def.number} ${def.name}`, [...problems, msg].join('\n  '));
  };
  const soft = <T>(msg: string, fallback: T): T => {
    problems.push(msg);
    return fallback;
  };
  const { map } = def;
  if (map.cols < 1 || map.rows < 1 || map.cols > 6 || map.rows > 6) err(`map ${map.cols}×${map.rows} screens is out of 1–6`);
  const width = map.cols * SCREEN.w;
  const height = map.rows * SCREEN.h;
  const inside = (p: Pt, what: string): Pt => (p.x < 0 || p.y < 0 || p.x > width || p.y > height ? soft(`${what} (${p.x}, ${p.y}) is off the ${width}×${height} map`, p) : p);
  for (const [k, p] of Object.entries(map.points)) inside(p, `point "${k}"`);
  for (const [k, r] of Object.entries(map.roads)) {
    if (r.length < 2) err(`road "${k}" needs 2+ points`);
    r.forEach((p, i) => inside(p, `road "${k}" point ${i}`));
  }
  const place = (p: Place, what: string): Pt => (typeof p === 'string' ? (map.points[p] ?? soft(`${what}: unknown point "${p}"`, { x: 0, y: 0 })) : inside(p, what));
  const road = (k: string, what: string): void => {
    if (!map.roads[k]) soft(`${what}: unknown road "${k}"`, null);
  };
  const structures: StructureDef[] = map.structures.flatMap((s, i) => {
    const k = kinds[s.kind];
    if (!k) return soft(`structure ${i}: unknown kind "${s.kind}"`, []);
    inside(s, `structure ${i} (${s.kind})`);
    return [{ id: s.id ?? `${s.kind}${i}`, kind: s.kind, x: s.x, y: s.y, shape: k.shape, material: k.material, hp: k.hp, flattenable: k.flattenable, cover: k.cover, roof: k.roof, low: k.low, tag: s.tag }];
  });
  const ids = new Set<string>();
  for (const s of structures) {
    if (ids.has(s.id)) soft(`duplicate structure id "${s.id}"`, null);
    ids.add(s.id);
  }
  const land: LandDef = { id: def.id, name: def.name, cols: map.cols, rows: map.rows, base: map.base, terrain: map.terrain, structures, roads: map.roads, points: map.points };
  const built = buildLand(land);
  const dry = (p: Pt, what: string): Pt => (groundAt(built, p.x, p.y) === 'water' ? soft(`${what} (${p.x}, ${p.y}) is in water`, p) : p);
  const start = dry(place(def.start, 'start'), 'start');
  const enemies = def.enemies.map((e, i): ResolvedEnemy => {
    const what = `enemy ${i} (${e.role})`;
    if (ROUTED.has(e.role)) {
      if (!e.route) err(`${what} needs a route`);
      road(e.route!, what);
    }
    if (e.role === 'wave' && e.when === undefined) err(`${what} needs "when"`);
    let loadout: Loadout;
    try {
      loadout = parseTank(e.tank);
    } catch (x) {
      return err(`${what}: ${(x as Error).message}`);
    }
    const { at, tank: _tank, ...rest } = e;
    return { ...rest, at: dry(place(at, what), what), loadout, index: i };
  });
  const crates = def.crates.map((c, i): ResolvedCrate => ({ ...c, at: dry(place(c.at, `crate ${i}`), `crate ${i}`) }));
  checkObjective(def.objective, { point: (k, w) => place(k, w), road, tag: (t, w) => (structures.some((s) => s.tag === t) ? undefined : err(`${w}: no structure tagged "${t}"`)), enemies: def.enemies, err });
  def.bonus.forEach((b, i) => checkBonus(b, i, err));
  if (problems.length > 0) throw new LevelError(`${def.number} ${def.name}`, problems.join('\n  '));
  return { def, land, start, enemies, crates };
}

interface Checks {
  readonly point: (k: string, what: string) => Pt;
  readonly road: (k: string, what: string) => void;
  readonly tag: (t: string, what: string) => void;
  readonly enemies: readonly EnemyDef[];
  readonly err: (msg: string) => never;
}

function checkObjective(o: ObjectiveDef, c: Checks): void {
  const w = `objective ${o.kind}`;
  const has = (role: string, n = 1): void => {
    if (c.enemies.filter((e) => e.role === role).length < n) c.err(`${w} needs ${n}+ enemies with role "${role}"`);
  };
  switch (o.kind) {
    case 'raid':
      c.tag(o.tag, w);
      break;
    case 'escort':
      c.road(o.road, w);
      break;
    case 'hold':
      c.point(o.zone, w);
      break;
    case 'ace':
      if (!c.enemies.some((e) => e.ace)) c.err(`${w} needs an enemy with ace: true`);
      break;
    case 'rescue':
      c.tag(o.tag, w);
      c.point(o.home, w);
      break;
    case 'ambush':
      has('convoy');
      break;
    case 'salvage':
      c.point(o.at, w);
      c.point(o.pickup, w);
      break;
    case 'breakout':
      c.point(o.exit, w);
      break;
    case 'recon':
      if (o.spots.length === 0) c.err(`${w} needs spots`);
      o.spots.forEach((s) => c.point(s, w));
      break;
    case 'capture':
      if (o.flags.length === 0) c.err(`${w} needs flags`);
      o.flags.forEach((s) => c.point(s, w));
      break;
    case 'chase':
      has('runner');
      c.point(o.base, w);
      break;
    case 'fortress':
      c.road(o.boss.road, w);
      break;
    case 'assault':
      if (c.enemies.length === 0) c.err(`${w} needs enemies`);
      break;
  }
}

function checkBonus(b: BonusDef, i: number, err: (msg: string) => never): void {
  const n = 'n' in b ? b.n : 'under' in b ? b.under : 'min' in b ? b.min : 1;
  if (!(n > 0)) err(`bonus ${i} (${b.kind}) needs a positive number`);
}
