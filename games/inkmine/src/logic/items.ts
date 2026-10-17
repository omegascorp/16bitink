import { moveBody, type Body, type Box } from './body';
import { between } from './pieces';
import { foldX, isSolid, type Terrain, type TilePos } from './terrain';

/**
 * Things to find in the world: broken parts of others' gear (a wreck), and
 * later what people ask you for (a core sample, a lost probe, a fossil).
 * Some sit in the rock until the drill or a blast breaks them out; some lie
 * in the open. Loose, they fall and rest. A wreck is studied and taken
 * apart where it lies, the moment you touch it: its design is learnt (if
 * it's new) and half its materials spill out as ore (see `salvageOf`). The
 * rest fly to the pouch when you're near, and are yours for good once
 * banked at the lander.
 */
export type ItemKind = 'core' | 'probe' | 'fossil' | 'wreck';

export interface ItemDef {
  /** Permanent: the world save lists banked items by it. Never change or reuse one. */
  readonly id: string;
  readonly kind: ItemKind;
  /** Column, and rows below the surface at the lander. */
  readonly at: TilePos;
  /** The design a wreck teaches (a blueprint id, blueprints.ts); also what it's a broken one of. */
  readonly blueprint?: string;
  /** Set into this rock, whatever the carver left there (default: as found; open ground leaves it loose). */
  readonly grade?: 'soil' | 'stone';
  /** The drill mark it's meant to be reached with: the world test checks it can be. */
  readonly drill?: number;
}

export type ItemState = 'rock' | 'loose' | 'pouch' | 'banked' | 'salvaged';

export interface MineItem extends Body {
  readonly index: number;
  readonly id: string;
  readonly kind: ItemKind;
  readonly blueprint?: string;
  readonly tile: TilePos;
  readonly state: ItemState;
}

/** `wreckReach`: px each side past a wreck's box that still counts as touching it, as it's drawn wider than its box. */
export const ITEM = { size: 18, magnet: 56, flySpeed: 320, catch: 16, wreckReach: 12 } as const;

/** Items placed for a site: in the rock where their tile is solid, otherwise loose on the spot. */
export function placeItems(t: Terrain, defs: readonly ItemDef[], surfaceRow: number, tile: number): MineItem[] {
  return defs.map((d, index) => {
    const [x, depth] = d.at;
    const y = surfaceRow + depth;
    const s = ITEM.size;
    return {
      index, id: d.id, kind: d.kind, blueprint: d.blueprint, tile: [x, y], state: isSolid(t, x, y) ? 'rock' : 'loose',
      x: (x + 0.5) * tile - s / 2, y: (y + 1) * tile - s, w: s, h: s, vx: 0, vy: 0, onGround: false,
    };
  });
}

/** Frees any item in a tile that's just been opened. */
export function freeItems(items: readonly MineItem[], opened: readonly TilePos[]): MineItem[] {
  const keys = new Set(opened.map(([x, y]) => `${x},${y}`));
  return items.map((it) => (it.state === 'rock' && keys.has(`${it.tile[0]},${it.tile[1]}`) ? { ...it, state: 'loose', vy: -80 } : it));
}

/**
 * One step for loose items: a wreck the prospector touches is taken apart;
 * anything else flies to them when near; otherwise they fall. Returns the
 * items, those just caught and the wrecks just taken apart.
 */
export function stepItems(t: Terrain, items: readonly MineItem[], player: Box, dt: number, tile: number): { items: MineItem[]; caught: MineItem[]; salvaged: MineItem[] } {
  const caught: MineItem[] = [];
  const salvaged: MineItem[] = [];
  const next = items.map((it): MineItem => {
    if (it.state !== 'loose') return it;
    const { dx, dy, d } = between(t, it, player, tile);
    if (it.kind === 'wreck') {
      // Studied where it lies: touching is enough. A wreck is too big to fly to the pouch.
      if (Math.abs(dx) < (it.w + player.w) / 2 + ITEM.wreckReach && Math.abs(dy) < (it.h + player.h) / 2) {
        const done = { ...it, state: 'salvaged' as const };
        salvaged.push(done);
        return done;
      }
      const fell = moveBody(t, it, 0, 0, dt, tile);
      return { ...it, ...fell, x: foldX(t, fell.x, tile) };
    }
    if (d < ITEM.catch) {
      const got = { ...it, state: 'pouch' as const };
      caught.push(got);
      return got;
    }
    if (d < ITEM.magnet) {
      const k = Math.min(1, (ITEM.flySpeed * dt) / Math.max(d, 1e-6));
      return { ...it, x: foldX(t, it.x + dx * k, tile), y: it.y + dy * k, vx: 0, vy: 0 };
    }
    const moved = moveBody(t, it, 0, 0, dt, tile);
    return { ...it, ...moved, x: foldX(t, moved.x, tile) };
  });
  return { items: next, caught, salvaged };
}

/** Banks everything in the pouch; returns the items and those just banked. */
export function bankItems(items: readonly MineItem[]): { items: MineItem[]; banked: MineItem[] } {
  const banked = items.filter((it) => it.state === 'pouch').map((it) => ({ ...it, state: 'banked' as const }));
  const byIndex = new Map(banked.map((it) => [it.index, it]));
  return { items: items.map((it) => byIndex.get(it.index) ?? it), banked };
}

export const inPouch = (items: readonly MineItem[]): MineItem[] => items.filter((it) => it.state === 'pouch');
