import { CREATURE, type Creature } from './creatures';
import type { FaunaHost } from './fauna';
import { foldX, isGrowth, isSolid, tileAt, type Terrain } from './terrain';

/**
 * Creatures that crawl the ground (creatures.ts): Mycel's grazers, Brine's
 * shore crabs, Talus's dew beetles, and a boulder crab scuttling off. Pure
 * steps, as fauna.ts's are.
 */

/** Ground a crawler walks on: anything solid but a growth (caps and barrel plants are food, not ground). */
function firm(t: Terrain, x: number, y: number): boolean {
  return isSolid(t, x, y) && !isGrowth(tileAt(t, x, y));
}

/** Tiles a second each harmless crawler goes. */
const SPEED: Partial<Record<Creature['kind'], number>> = { grazer: CREATURE.grazer.speed, crab: CREATURE.crab.speed, beetle: CREATURE.beetle.speed };

/**
 * One step along the ground at `speed` tiles/s the way it faces, stepping
 * up a tile or down one; `blocked` when a wall or a drop it can't take is
 * ahead (it stays put). With the ground gone from under it, it drops, a
 * tile line at a time so it can't fall through one.
 */
export function stride(c: Creature, dt: number, host: FaunaHost, speed: number): { readonly c: Creature; readonly blocked: boolean } {
  const t = host.terrain;
  const T = host.tile;
  const solid = (x: number, y: number): boolean => firm(t, x, y);
  const col = Math.floor(c.x / T);
  const row = Math.floor((c.y - 1) / T);
  if (!solid(col, row + 1)) return { c: { ...c, y: Math.min(c.y + 300 * dt, (Math.floor(c.y / T) + 1) * T) }, blocked: false };
  // How a column's ground stands against this one's: level, a step up, a step down, or no way on.
  const level = (ax: number): number | null => {
    if (!solid(ax, row) && solid(ax, row + 1)) return 0;
    if (solid(ax, row) && !solid(ax, row - 1) && !solid(col, row - 1)) return -1;
    if (!solid(ax, row) && !solid(ax, row + 1) && solid(ax, row + 2)) return 1;
    return null;
  };
  const ahead = Math.floor((c.x + c.facing * T * 0.45) / T);
  if (ahead !== col && level(ahead) === null) return { c, blocked: true };
  const x = c.x + c.facing * speed * T * dt;
  const next = Math.floor(x / T);
  const y = next !== col ? c.y + (level(next) ?? 0) * T : c.y;
  return { c: { ...c, x: foldX(t, x, T), y }, blocked: false };
}

/**
 * Crawls along the ground, turning before a wall or a drop it can't take
 * (and now and then for no reason); shot, it curls up a while. It falls if
 * the ground goes from under it. A grazer, a crab or a dew beetle (their
 * tucking in is the grazer's curling up).
 */
export function grazer(c: Creature, dt: number, host: FaunaHost): Creature {
  const timer = c.timer - dt;
  if (c.state === 'curled') return timer > 0 ? { ...c, timer } : { ...c, state: 'walk', timer: 4 };
  const turned = { ...c, facing: c.facing === 1 ? -1 : 1, timer: 5 + (c.id % 4) } as const;
  const step = stride({ ...c, timer }, dt, host, SPEED[c.kind] ?? CREATURE.grazer.speed);
  if (step.c.y !== c.y && step.c.x === c.x) return step.c;
  if (timer <= 0 || step.blocked) return turned;
  return step.c;
}
