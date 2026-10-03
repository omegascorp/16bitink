import Phaser from 'phaser';
import { BOAT_SPEC, type BoatKind } from '../../art/skyArt';
import { ART_RES } from '../../art/textures';
import type { LevelDef, ZoneId } from '../../levels/types';
import { pickHookSpot, spawnHook, type Hook } from './hazards';
import { SKY } from '../../logic/water';
import type { Rng } from '../../logic/rng';

/**
 * The boats hooks come from. A boat sails in and stops with its rod over the
 * spot, then the hook drops; when the hook is done it sails on and away. The
 * boat arriving is the first warning that a hook is coming.
 */
export interface Boat {
  readonly sprite: Phaser.GameObjects.Image;
  readonly kind: BoatKind;
  /** 1: bow to the right (sailing right), -1: bow to the left. */
  readonly dir: 1 | -1;
  readonly from: number;
  /** Where the hull stops so the rod tip is over the hook. */
  readonly to: number;
  t: number;
  leaving: boolean;
  speed: number;
}

/** How long a boat takes to sail into position before its hook drops. */
export const BOAT_ARRIVE_MS = 1600;
const SAIL_IN_FROM = 700;
const LEAVE_ACCEL = 60;

export const ZONE_BOATS: Readonly<Partial<Record<ZoneId, readonly BoatKind[]>>> = {
  tidepool: ['dinghy'],
  seagrass: ['dinghy', 'skiff'],
  kelp: ['skiff', 'dinghy'],
  reef: ['skiff'],
  wreck: ['trawler', 'skiff'],
  dropoff: ['trawler'],
};

export const boatKey = (kind: BoatKind): string => `boat-${kind}`;

/** Rod tip relative to the hull's centre at the waterline, for a boat facing `dir`. */
function rodOffset(kind: BoatKind, dir: 1 | -1): { x: number; y: number } {
  const spec = BOAT_SPEC[kind];
  return { x: dir * (spec.rod.x - spec.w / 2), y: spec.rod.y - spec.waterline };
}

/** World y of the rod tip: where the hook's line starts. */
export function rodTipY(kind: BoatKind): number {
  return SKY.surfaceY + rodOffset(kind, 1).y;
}

export function pickBoat(zone: ZoneId, rng: Rng): BoatKind {
  const kinds = ZONE_BOATS[zone] ?? ['dinghy'];
  return kinds[Math.floor(rng() * kinds.length)]!;
}

/** A boat that will stop with its rod tip over `rodX`. */
export function spawnBoat(scene: Phaser.Scene, kind: BoatKind, rodX: number, rng: Rng): Boat {
  const dir: 1 | -1 = rng() < 0.5 ? 1 : -1;
  const to = rodX - rodOffset(kind, dir).x;
  const from = to - dir * SAIL_IN_FROM;
  const spec = BOAT_SPEC[kind];
  const sprite = scene.add.image(from, SKY.surfaceY, boatKey(kind))
    .setOrigin(0.5, spec.waterline / spec.h).setScale(1 / ART_RES).setFlipX(dir < 0).setDepth(10);
  return { sprite, kind, dir, from, to, t: 0, leaving: false, speed: 0 };
}

/** Returns false once the boat has sailed out of the world. */
export function updateBoat(b: Boat, dtMs: number, worldWidth: number): boolean {
  b.t += dtMs;
  const s = b.sprite;
  if (b.leaving) {
    b.speed += LEAVE_ACCEL * (dtMs / 1000);
    s.x += b.dir * b.speed * (dtMs / 1000) * 4;
  } else {
    const u = Math.min(1, b.t / BOAT_ARRIVE_MS);
    s.x = b.from + (b.to - b.from) * (1 - Math.pow(1 - u, 3));
  }
  // Riding the swell.
  s.y = SKY.surfaceY + Math.sin(b.t / 520) * 2;
  s.setRotation(Math.sin(b.t / 700) * 0.025);
  const half = BOAT_SPEC[b.kind].w / 2;
  return s.x > -half - SAIL_IN_FROM && s.x < worldWidth + half + SAIL_IN_FROM;
}

/** The hook is in: sail on the way it was heading. */
export function sendAway(b: Boat): void {
  b.leaving = true;
}

/**
 * Hooks and the boats they hang from. Where there's open sky every hook comes
 * from a boat that sails in first; elsewhere hooks drop from above as before.
 */
export class Fleet {
  private readonly boats = new Map<Hook, Boat>();
  private leaving: Boat[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly zone: ZoneId, private readonly sky: boolean, private readonly rng: Rng) {}

  /** A new hook aimed near the player at (px, py). */
  launch(level: LevelDef, px: number, py: number): Hook {
    const spot = pickHookSpot(level, px, py, this.rng);
    if (!this.sky) return spawnHook(this.scene, spot);
    const kind = pickBoat(this.zone, this.rng);
    const hook = spawnHook(this.scene, spot, rodTipY(kind), BOAT_ARRIVE_MS);
    this.boats.set(hook, spawnBoat(this.scene, kind, spot.x, this.rng));
    return hook;
  }

  update(dtMs: number, worldWidth: number): void {
    for (const b of this.boats.values()) updateBoat(b, dtMs, worldWidth);
    this.leaving = this.leaving.filter((b) => {
      if (updateBoat(b, dtMs, worldWidth)) return true;
      b.sprite.destroy();
      return false;
    });
  }

  /** The hook is back up: its boat moves on. */
  hookDone(hook: Hook): void {
    const boat = this.boats.get(hook);
    if (!boat) return;
    this.boats.delete(hook);
    sendAway(boat);
    this.leaving.push(boat);
  }
}
