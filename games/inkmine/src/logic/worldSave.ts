import type { KeyValueStore } from '@16bitink/game-sdk';
import type { DroppedBag } from './flag';
import type { Inventory } from './inventory';
import type { Ladders } from './ladders';
import { parseInventory } from './save';
import { TILE, type Terrain, type TilePos } from './terrain';

/**
 * What a world keeps between sessions (spec, "Saving and loading"). Not the
 * world itself: the builder carves that again from its seed in a few
 * milliseconds. Only what the player changed: the ground they dug or blew
 * out, the ladders they left, and the items they took for good. Dug ground
 * and ladders are one bit a tile, packed as runs, so a world with a few
 * hours of tunnels saves in a few KB.
 *
 * The save never says what a tile *is*, only that it's open now. If a
 * world is retuned after release, old tunnels stay open in the new rock:
 * a save made for another version still loads (its `version` says which).
 * One that can't be read at all (a world that changed size) is kept under
 * a backup key, so the next save can't destroy it.
 */
export interface WorldSave {
  /** The world's version when this was saved. */
  readonly version: number;
  /** One per tile: 1 where ground the builder made has been dug or blown out. */
  readonly dug: Uint8Array;
  /** One per tile: 1 where a ladder hangs. */
  readonly ladders: Uint8Array;
  /** Items banked for good, by id; they're not put back in the world. */
  readonly taken: readonly string[];
  /** The bag left under its flag (flag.ts), at a tile index, if there is one. */
  readonly bag?: SavedBag;
}

export interface SavedBag {
  /** Tile index: row × width + column. */
  readonly at: number;
  readonly bag: Inventory;
}

/** A dropped bag as the save keeps it. */
export function saveBag(t: Terrain, d: DroppedBag | null): SavedBag | undefined {
  return d ? { at: d.row * t.width + d.col, bag: d.bag } : undefined;
}

/** A saved bag back in the world. */
export function droppedBag(width: number, b: SavedBag | undefined): DroppedBag | null {
  return b ? { col: b.at % width, row: Math.floor(b.at / width), bag: b.bag } : null;
}

const KEY = (worldId: string): string => `inkmine.world.${worldId}.v1`;
/** Longest packed mask accepted, in characters: far above any real world (a 600 × 500 world fully striped is ~400 KB). */
const MAX_PACKED = 1_000_000;
const MAX_TAKEN = 512;

/** What changed from the carved ground (`base`, its tiles as carved) to the world as it is. */
export function captureWorld(base: Uint8Array, t: Terrain, ladders: Ladders, version: number, taken: readonly string[], dropped: DroppedBag | null = null): WorldSave {
  const n = t.width * t.height;
  const dug = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (base[i] !== TILE.air && t.tiles[i] === TILE.air) dug[i] = 1;
  const rungs = new Uint8Array(n);
  for (const [x, y] of ladders.all()) rungs[y * t.width + x] = 1;
  const bag = saveBag(t, dropped);
  return { version, dug, ladders: rungs, taken: [...new Set(taken)], ...(bag ? { bag } : {}) };
}

/**
 * Puts a save back onto a freshly carved world: opens what was dug (with
 * whatever ore or gas was in it) and hangs the ladders. Bedrock never
 * opens and a ladder only hangs in the open, whatever the save says: saves
 * are untrusted, and a retuned world may have rock where a tunnel was.
 */
export function applyWorld(t: Terrain, ladders: Ladders, save: WorldSave): void {
  const n = t.width * t.height;
  const rungs: TilePos[] = [];
  for (let i = 0; i < n; i++) {
    if (save.dug[i] && t.tiles[i] !== TILE.bedrock) {
      t.tiles[i] = TILE.air;
      t.content[i] = 0;
      t.volatile[i] = 0;
    }
    if (save.ladders[i] && t.tiles[i] === TILE.air) rungs.push([i % t.width, Math.floor(i / t.width)]);
  }
  ladders.add(rungs);
}

/** A 0/1 mask as alternating run lengths (starting with a run of 0s), each a LEB128 varint, in base64. */
export function packMask(mask: Uint8Array): string {
  const bytes: number[] = [];
  const put = (run: number): void => {
    let v = run;
    while (v >= 0x80) {
      bytes.push((v & 0x7f) | 0x80);
      v = Math.floor(v / 0x80);
    }
    bytes.push(v);
  };
  let value = 0;
  let run = 0;
  for (const bit of mask) {
    if ((bit ? 1 : 0) === value) {
      run++;
      continue;
    }
    put(run);
    value ^= 1;
    run = 1;
  }
  put(run);
  let text = '';
  for (const b of bytes) text += String.fromCharCode(b);
  return btoa(text);
}

/** A packed mask back into `n` tiles; null if it's malformed or isn't exactly `n` long (saves are untrusted). */
export function unpackMask(packed: unknown, n: number): Uint8Array | null {
  if (typeof packed !== 'string' || packed.length > MAX_PACKED) return null;
  let raw: string;
  try {
    raw = atob(packed);
  } catch {
    return null;
  }
  const mask = new Uint8Array(n);
  let at = 0;
  let value = 0;
  let i = 0;
  while (i < raw.length) {
    let run = 0;
    let scale = 1;
    for (let k = 0; ; k++) {
      if (i >= raw.length || k > 4) return null;
      const b = raw.charCodeAt(i++);
      run += (b & 0x7f) * scale;
      scale *= 0x80;
      if (b < 0x80) break;
    }
    if (at + run > n) return null;
    if (value) mask.fill(1, at, at + run);
    at += run;
    value ^= 1;
  }
  return at === n ? mask : null;
}

/** Writes the save; false if it couldn't (no storage, or the write failed), so the caller can try again. */
export function saveWorld(store: KeyValueStore | undefined, worldId: string, save: WorldSave): boolean {
  if (!store) return false;
  try {
    store.setItem(KEY(worldId), JSON.stringify({
      version: save.version,
      dug: packMask(save.dug),
      ladders: packMask(save.ladders),
      taken: save.taken,
      bag: save.bag,
    }));
    return true;
  } catch (err) {
    console.warn('[inkmine] could not save the world', err);
    return false;
  }
}

/**
 * The saved changes to a world of `n` tiles, or null when there are none
 * or they can't be read. Item ids are kept only if `known`, once each.
 */
export function loadWorld(store: KeyValueStore | undefined, worldId: string, n: number, known: ReadonlySet<string>): WorldSave | null {
  try {
    const text = store?.getItem(KEY(worldId));
    if (!text) return null;
    const save = readWorld(text, n, known);
    if (!save) {
      // Kept aside, so the first save of the new session doesn't overwrite the only copy.
      console.warn(`[inkmine] the saved world ${worldId} can't be read; kept as ${KEY(worldId)}.bak`);
      store?.setItem(`${KEY(worldId)}.bak`, text);
    }
    return save;
  } catch (err) {
    console.warn('[inkmine] could not read the saved world', err);
    return null;
  }
}

function readWorld(text: string, n: number, known: ReadonlySet<string>): WorldSave | null {
  try {
    return parseWorld(JSON.parse(text), n, known);
  } catch {
    return null;
  }
}

function parseWorld(raw: unknown, n: number, known: ReadonlySet<string>): WorldSave | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (!Number.isInteger(o.version) || (o.version as number) < 0) return null;
  const dug = unpackMask(o.dug, n);
  const ladders = unpackMask(o.ladders, n);
  if (!dug || !ladders) return null;
  const ids = Array.isArray(o.taken) ? o.taken.slice(0, MAX_TAKEN) : [];
  const taken = [...new Set(ids.filter((id): id is string => typeof id === 'string' && known.has(id)))];
  const bag = parseBag(o.bag, n);
  return { version: o.version as number, dug, ladders, taken, ...(bag ? { bag } : {}) };
}

/** A left bag, if it's on the world and holds something real. */
function parseBag(raw: unknown, n: number): SavedBag | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (!Number.isInteger(o.at) || (o.at as number) < 0 || (o.at as number) >= n) return null;
  const bag = parseInventory(o.bag, null);
  return bag && bag.slots.some((s) => s !== null) ? { at: o.at as number, bag } : null;
}
