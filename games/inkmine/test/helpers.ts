import { STARTER_LOADOUT } from '../src/logic/gear';
import { Mine, NO_INPUT, type MineInput, type MineEvent, type MineSetup } from '../src/logic/mine';
import { ORES } from '../src/logic/ore';
import { addOre, contents, emptyInventory, type Inventory } from '../src/logic/inventory';
import { oreKeyOf } from '../src/logic/ore';
import type { Hold } from '../src/logic/hold';
import { STARTER, SUIT_STACK } from '../src/logic/suit';
import { createTerrain, setTile, TILE, type Terrain } from '../src/logic/terrain';
import { VOLATILES } from '../src/logic/volatiles';

export const T = 32;

/**
 * A terrain from rows of characters: `.` air, `s` soil, `t` stone, `d` deep
 * rock, `#` bedrock, `f` firedamp in soil, `F` firedamp in stone, `b` an old
 * charge in soil, `y` a line charge in soil, `c` copper in soil, `g`
 * graphite in soil, `q` quartz in stone.
 */
export function grid(rows: readonly string[], wrap = false): Terrain {
  const t = createTerrain(rows[0]!.length, rows.length, wrap);
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === 's') setTile(t, x, y, TILE.soil);
      if (ch === 't') setTile(t, x, y, TILE.stone);
      if (ch === 'd') setTile(t, x, y, TILE.deep);
      if (ch === '#') setTile(t, x, y, TILE.bedrock);
      if (ch === 'f') setTile(t, x, y, TILE.soil, 0, VOLATILES.firedamp.id);
      if (ch === 'F') setTile(t, x, y, TILE.stone, 0, VOLATILES.firedamp.id);
      if (ch === 'b') setTile(t, x, y, TILE.soil, 0, VOLATILES.charge.id);
      if (ch === 'y') setTile(t, x, y, TILE.soil, 0, VOLATILES.lineCharge.id);
      if (ch === 'c') setTile(t, x, y, TILE.soil, ORES.copper.id);
      if (ch === 'g') setTile(t, x, y, TILE.soil, ORES.graphite.id);
      if (ch === 'q') setTile(t, x, y, TILE.stone, ORES.quartz.id);
    });
  });
  return t;
}

export function mine(rows: readonly string[], over: Partial<MineSetup> = {}): Mine {
  return new Mine({
    terrain: grid(rows),
    tileSize: T,
    drill: { mk: 1, planet: 1 },
    loadout: STARTER_LOADOUT,
    suit: STARTER,
    ladders: 3,
    lander: { col: 1, row: 2 },
    ...over,
  });
}

/** Runs `seconds` of 60 fps steps with `input` held (directions and thrust; buttons only on the first step); returns every event. */
export function run(m: Mine, seconds: number, input: Partial<MineInput> = {}): MineEvent[] {
  const events: MineEvent[] = [];
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    const held = { ...NO_INPUT, ix: input.ix ?? 0, iy: input.iy ?? 0, thrust: input.thrust ?? false };
    const pressed = i === 0 ? { jump: input.jump ?? false, ladder: input.ladder ?? false, recall: input.recall ?? false, feed: input.feed ?? null } : {};
    events.push(...m.step(1 / 60, { ...held, ...pressed }));
  }
  return events;
}

/** Moves the prospector to stand on the ground in column `col`, feet on row `row`. */
export function standAt(m: Mine, col: number, row: number): void {
  m.player = { ...m.player, x: col * T + (T - m.player.w) / 2, y: row * T - m.player.h, vx: 0, vy: 0, onGround: true };
}

/** A starter bag holding these pieces (by ore id). */
export function bagOf(...ids: number[]): Inventory {
  return ids.reduce((inv, id) => addOre(inv, oreKeyOf(id)!, 1).inv, emptyInventory(STARTER.slots, SUIT_STACK));
}

/** What a bag holds, by ore. */
export const bagHas = (inv: Inventory): Hold => contents(inv);
