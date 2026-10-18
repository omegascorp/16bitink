import type { KeyValueStore } from '@16bitink/game-sdk';
import type { DroppedBag } from './flag';
import type { Inventory } from './inventory';
import type { Ladders } from './ladders';
import { oreKeyOf } from './ore';
import type { Piece } from './pieces';
import { parseInventory } from './save';
import { TILE, type Terrain, type TilePos } from './terrain';

/**
 * What a world keeps between sessions (spec, "Saving and loading"). Not the
 * world itself: the builder carves that again from its seed in a few
 * milliseconds. Only what the player changed: the ground they dug or blew
 * out, the ladders they left, the items they took for good, and the ore
 * they broke out and left lying. Dug ground
 * and ladders are one bit a tile, packed as runs, so a world with a few
 * hours of tunnels saves in a few KB. On Talus, where loose rock falls,
 * where it lies now is kept the same way (`rubble`).
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
  /** Pieces of ore left lying loose (pieces.ts), each at the tile index it lay in. */
  readonly pieces?: readonly SavedPiece[];
  /** One per tile: 1 where water stands (water.ts), on a world with water. */
  readonly wet?: Uint8Array;
  /** One per tile: 1 where loose rock lies now (rocks.ts), on a world with any. */
  readonly rubble?: Uint8Array;
}

export interface SavedPiece {
  /** Tile index: row × width + column. */
  readonly at: number;
  /** The ore's id (ore.ts). */
  readonly ore: number;
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
/** Loose pieces kept, at most: far above what a full bag leaves behind. */
const MAX_PIECES = 400;

/** What changed from the carved ground (`base`, its tiles as carved) to the world as it is. */
export function captureWorld(base: Uint8Array, t: Terrain, ladders: Ladders, version: number, taken: readonly string[], dropped: DroppedBag | null = null, loose: readonly SavedPiece[] = [], wet?: Uint8Array, rubble?: Uint8Array): WorldSave {
  const n = t.width * t.height;
  const dug = new Uint8Array(n);
  // Ground a rock has since fallen into counts as dug too, so its old rock (and ore) isn't put back under the rubble.
  const opened = (i: number): boolean => t.tiles[i] === TILE.air || (t.tiles[i] === TILE.loose && base[i] !== TILE.loose);
  for (let i = 0; i < n; i++) if (base[i] !== TILE.air && opened(i)) dug[i] = 1;
  const rungs = new Uint8Array(n);
  for (const [x, y] of ladders.all()) rungs[y * t.width + x] = 1;
  const bag = saveBag(t, dropped);
  const pieces = loose.slice(0, MAX_PIECES);
  const rocks = rubble?.some((v) => v === 1) ? { rubble: rubble.slice() } : {};
  return { version, dug, ladders: rungs, taken: [...new Set(taken)], ...(bag ? { bag } : {}), ...(pieces.length ? { pieces } : {}), ...(wet ? { wet: wet.slice() } : {}), ...rocks };
}

/** Loose pieces as the save keeps them: the tile each one's middle is in (`tile` px a tile). */
export function savePieces(t: Terrain, loose: readonly Piece[], tile: number): SavedPiece[] {
  const T = tile;
  return loose.slice(0, MAX_PIECES).map((p) => {
    const col = Math.min(t.width - 1, Math.max(0, Math.floor((p.x + p.w / 2) / T)));
    const row = Math.min(t.height - 1, Math.max(0, Math.floor((p.y + p.h / 2) / T)));
    return { at: row * t.width + col, ore: p.ore };
  });
}

/**
 * Puts a save back onto a freshly carved world: opens what was dug (with
 * whatever ore or gas was in it), lays loose rock back where it fell, and
 * hangs the ladders. Bedrock never opens, loose rock only lands in the
 * open and a ladder only hangs there, whatever the save says: saves are
 * untrusted, and a retuned world may have rock where a tunnel was.
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
    if (save.rubble?.[i] && t.tiles[i] === TILE.air) t.tiles[i] = TILE.loose;
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
      pieces: save.pieces,
      ...(save.wet ? { wet: packMask(save.wet) } : {}),
      ...(save.rubble ? { rubble: packMask(save.rubble) } : {}),
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
  const pieces = parsePieces(o.pieces, n);
  // Water that can't be read is left out: the world's water is carved afresh instead.
  const wet = o.wet === undefined ? null : unpackMask(o.wet, n);
  // Rubble that can't be read is left out: rocks that fell are gone, but nothing worse.
  const rubble = o.rubble === undefined ? null : unpackMask(o.rubble, n);
  return { version: o.version as number, dug, ladders, taken, ...(bag ? { bag } : {}), ...(pieces.length ? { pieces } : {}), ...(wet ? { wet } : {}), ...(rubble ? { rubble } : {}) };
}

/** Loose pieces on the world, of ores that exist; anything else is dropped. */
function parsePieces(raw: unknown, n: number): SavedPiece[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_PIECES).flatMap((p): SavedPiece[] => {
    if (typeof p !== 'object' || p === null) return [];
    const o = p as Record<string, unknown>;
    const ok = Number.isInteger(o.at) && (o.at as number) >= 0 && (o.at as number) < n && Number.isInteger(o.ore) && oreKeyOf(o.ore as number) !== null;
    return ok ? [{ at: o.at as number, ore: o.ore as number }] : [];
  });
}

/** A left bag, if it's on the world and holds something real. */
function parseBag(raw: unknown, n: number): SavedBag | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (!Number.isInteger(o.at) || (o.at as number) < 0 || (o.at as number) >= n) return null;
  const bag = parseInventory(o.bag, null);
  return bag && bag.slots.some((s) => s !== null) ? { at: o.at as number, bag } : null;
}
