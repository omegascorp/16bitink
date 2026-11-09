/**
 * The night's ride of a rival with several heroes, split hero by hero for
 * the map to show each on its own figure. The rival's report gives one list
 * of tiles: each hero's legs in turn, every step next to the one before. A
 * jump starts another hero's ride; it is his whose tile the jump lands
 * beside (a hero hired tonight: the one who ends where the ride ends). Pure:
 * no Phaser.
 */

interface Tile {
  readonly x: number;
  readonly y: number;
}
interface Placed extends Tile {
  readonly id: string;
}

export interface RivalRide {
  readonly id: string;
  readonly tiles: readonly Tile[];
}

const beside = (a: Tile, b: Tile): boolean => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= 1;

/** The rides in `path`, by hero: `before` is where the rival's heroes stood at dusk, `after` where they stand at dawn. */
export function splitRides(path: readonly Tile[], before: readonly Placed[], after: readonly Placed[]): RivalRide[] {
  // Unbroken runs of steps.
  const runs: Tile[][] = [];
  for (const t of path) {
    const run = runs[runs.length - 1];
    if (run && beside(run[run.length - 1]!, t)) run.push(t);
    else runs.push([t]);
  }
  const at = new Map(before.map((h) => [h.id, { x: h.x, y: h.y } as Tile]));
  const rides: RivalRide[] = [];
  for (const run of runs) {
    const start = run[0]!;
    const end = run[run.length - 1]!;
    // Each hero rides once a night, his legs together: one who hasn't ridden yet first.
    const near = [...at].filter(([, p]) => beside(p, start)).map(([id]) => id);
    const rode = new Set(rides.map((r) => r.id));
    const from = near.find((h) => !rode.has(h) || rides[rides.length - 1]?.id === h) ?? near[0];
    const id = from ?? after.find((h) => h.x === end.x && h.y === end.y)?.id ?? after.find((h) => !at.has(h.id))?.id;
    if (!id) continue;
    at.set(id, end);
    const last = rides[rides.length - 1];
    // A hero's legs one after another make one ride.
    if (last?.id === id) rides[rides.length - 1] = { id, tiles: [...last.tiles, ...run] };
    else rides.push({ id, tiles: run });
  }
  return rides;
}
