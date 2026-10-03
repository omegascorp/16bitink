import Phaser from 'phaser';
import { ART_RES, boilKey } from '../../art/textures';
import { ITEM_INFO, type ItemId } from '../../levels/items';
import type { LevelDef } from '../../levels/types';
import { rangeOf, type Rng } from '../../logic/rng';
import { WATER } from '../../logic/water';
import { TUNING } from './tuning';

/** Share of drops that are litter, when the level has any. */
const HAZARD_SHARE = 0.3;
/** In-game size the item art is drawn at. */
const ITEM_SCALE = 0.75;

export interface FallingItem {
  readonly sprite: Phaser.GameObjects.Image;
  readonly kind: ItemId;
  readonly sway: number;
  /** Set once it reaches the seabed; it's cleared away after resting a while. */
  landedAt: number | null;
}

export const itemKey = (kind: ItemId, frame: number): string => boilKey(`item-${kind}`, frame);

/** Picks one of the level's items, helpful ones more often than litter. */
function pickKind(level: LevelDef, rng: Rng): ItemId | null {
  const good = level.items.filter((id) => ITEM_INFO[id].good);
  const bad = level.items.filter((id) => !ITEM_INFO[id].good);
  const pool = bad.length > 0 && (good.length === 0 || rng() < HAZARD_SHARE) ? bad : good;
  return pool.length ? pool[Math.floor(rng() * pool.length)]! : null;
}

/** Drops an item from just above the view, so the player sees it sinking in. */
export function spawnItem(scene: Phaser.Scene, level: LevelDef, view: Phaser.Geom.Rectangle, rng: Rng): FallingItem | null {
  const kind = pickKind(level, rng);
  if (!kind) return null;
  const x = Phaser.Math.Clamp(rangeOf(rng, view.left + 100, view.right - 100), 80, level.world.width - 80);
  const y = Math.max(WATER.surface, view.top - 60);
  const sprite = scene.add.image(x, y, itemKey(kind, 0)).setDepth(13).setScale(ITEM_SCALE / ART_RES).setRotation(rangeOf(rng, -0.6, 0.6));
  return { sprite, kind, sway: rng() * Math.PI * 2, landedAt: null };
}

/** Sinks, tumbles and settles on the seabed. Returns false once it's gone. */
export function updateItem(it: FallingItem, now: number, dt: number, frame: number, floorAt: (x: number) => number): boolean {
  const s = it.sprite;
  s.setTexture(itemKey(it.kind, frame));
  if (it.landedAt === null) {
    const info = ITEM_INFO[it.kind];
    s.y += info.sink * dt;
    s.x += Math.sin(now / 700 + it.sway) * 18 * dt;
    s.rotation += Math.sin(now / 900 + it.sway) * 0.6 * dt;
    // Comes to rest on the sand, a little sunk in.
    const floor = floorAt(s.x) - 8;
    if (s.y >= floor) {
      s.y = floor;
      it.landedAt = now;
    }
    return true;
  }
  const left = it.landedAt + TUNING.itemRestMs - now;
  if (left <= 0) {
    s.destroy();
    return false;
  }
  s.setAlpha(left < 2000 && Math.floor(now / 150) % 2 === 0 ? 0.35 : 1);
  return true;
}
