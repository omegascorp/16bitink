import { moveBody, type Body, type Box } from './body';
import type { ItemKind } from './mission';
import { isSolid, type Terrain, type TilePos } from './terrain';

/**
 * Mission items in a dig site: the core sample, a lost probe, a fossil, a
 * blueprint. Some sit in the rock until the drill or a blast breaks them out
 * (a core, a fossil); some lie in the open (a probe in a cave, a blueprint
 * in a vault). Loose, they fall and rest; near the prospector they fly to
 * the pouch, which never fills. They count once banked at the lander.
 */
export interface ItemDef {
  readonly kind: ItemKind;
  /** Column, and rows below the surface at the lander. */
  readonly at: TilePos;
  /** The blueprint's id (blueprints.ts), for a blueprint. */
  readonly blueprint?: string;
  /** Set into this rock, whatever the carver left there (default: as found; open ground leaves it loose). */
  readonly grade?: 'soil' | 'stone';
}

export type ItemState = 'rock' | 'loose' | 'pouch' | 'banked';

export interface MineItem extends Body {
  readonly index: number;
  readonly kind: ItemKind;
  readonly blueprint?: string;
  readonly tile: TilePos;
  readonly state: ItemState;
}

export const ITEM = { size: 18, magnet: 56, flySpeed: 320, catch: 16 } as const;

/** Items placed for a site: in the rock where their tile is solid, otherwise loose on the spot. */
export function placeItems(t: Terrain, defs: readonly ItemDef[], surfaceRow: number, tile: number): MineItem[] {
  return defs.map((d, index) => {
    const [x, depth] = d.at;
    const y = surfaceRow + depth;
    const s = ITEM.size;
    return {
      index, kind: d.kind, blueprint: d.blueprint, tile: [x, y], state: isSolid(t, x, y) ? 'rock' : 'loose',
      x: (x + 0.5) * tile - s / 2, y: (y + 1) * tile - s, w: s, h: s, vx: 0, vy: 0, onGround: false,
    };
  });
}

/** Frees any item in a tile that's just been opened. */
export function freeItems(items: readonly MineItem[], opened: readonly TilePos[]): MineItem[] {
  const keys = new Set(opened.map(([x, y]) => `${x},${y}`));
  return items.map((it) => (it.state === 'rock' && keys.has(`${it.tile[0]},${it.tile[1]}`) ? { ...it, state: 'loose', vy: -80 } : it));
}

const centre = (b: Box): { x: number; y: number } => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** One step for loose items: fly to the prospector when near, otherwise fall. Returns the items and those just caught. */
export function stepItems(t: Terrain, items: readonly MineItem[], player: Box, dt: number, tile: number): { items: MineItem[]; caught: MineItem[] } {
  const caught: MineItem[] = [];
  const next = items.map((it): MineItem => {
    if (it.state !== 'loose') return it;
    const a = centre(it);
    const b = centre(player);
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (d < ITEM.catch) {
      const got = { ...it, state: 'pouch' as const };
      caught.push(got);
      return got;
    }
    if (d < ITEM.magnet) {
      const k = Math.min(1, (ITEM.flySpeed * dt) / Math.max(d, 1e-6));
      return { ...it, x: it.x + (b.x - a.x) * k, y: it.y + (b.y - a.y) * k, vx: 0, vy: 0 };
    }
    return { ...it, ...moveBody(t, it, 0, 0, dt, tile) };
  });
  return { items: next, caught };
}

/** Banks everything in the pouch; returns the items and those just banked. */
export function bankItems(items: readonly MineItem[]): { items: MineItem[]; banked: MineItem[] } {
  const banked = items.filter((it) => it.state === 'pouch').map((it) => ({ ...it, state: 'banked' as const }));
  const byIndex = new Map(banked.map((it) => [it.index, it]));
  return { items: items.map((it) => byIndex.get(it.index) ?? it), banked };
}

export const inPouch = (items: readonly MineItem[]): MineItem[] => items.filter((it) => it.state === 'pouch');
