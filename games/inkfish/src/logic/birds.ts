import type { ZoneId } from '../levels/types';
import { relationTo } from './sizing';
import type { Rng } from './rng';

/**
 * Birds over sunlit water. The same size rule as fish: a bird smaller than
 * you is a snack you can only reach by leaping; a bigger one is a hunter that
 * plunges in after you when you swim near the surface.
 */
export type BirdId = 'dragonfly' | 'tern' | 'gull' | 'pelican' | 'gannet';

export interface BirdInfo {
  readonly name: string;
  /** Size as a multiple of the player's size when it appears (< 0.9 prey, > 1.1 hunter). */
  readonly scale: readonly [number, number];
  /** Cruising height above the surface, px. Low fliers are within a leap. */
  readonly height: readonly [number, number];
  /** Flight speed, px/s. */
  readonly speed: number;
  /** Plunge-dives after fish; how far under the surface the dive reaches. 0 = never dives. */
  readonly diveDepth: number;
}

export const BIRD_INFO: Readonly<Record<BirdId, BirdInfo>> = {
  // Dragonflies skim low over tide pools and meadows: always a snack, but you have to leap for it.
  dragonfly: { name: 'dragonfly', scale: [0.55, 0.8], height: [40, 110], speed: 150, diveDepth: 0 },
  // Terns hover, then plunge: a meal when you're big, a terror while you're small.
  tern: { name: 'tern', scale: [0.5, 1.7], height: [60, 170], speed: 170, diveDepth: 130 },
  gull: { name: 'gull', scale: [0.6, 1.9], height: [70, 190], speed: 130, diveDepth: 70 },
  pelican: { name: 'pelican', scale: [1.4, 2.4], height: [150, 230], speed: 110, diveDepth: 150 },
  gannet: { name: 'gannet', scale: [1.3, 2.2], height: [170, 250], speed: 160, diveDepth: 230 },
};

export const ZONE_BIRDS: Readonly<Partial<Record<ZoneId, { readonly kinds: readonly BirdId[]; readonly max: number }>>> = {
  tidepool: { kinds: ['dragonfly', 'dragonfly', 'gull', 'tern'], max: 2 },
  seagrass: { kinds: ['dragonfly', 'tern', 'tern', 'gull'], max: 2 },
  kelp: { kinds: ['gull', 'tern', 'pelican'], max: 2 },
  reef: { kinds: ['tern', 'pelican', 'gull'], max: 3 },
  wreck: { kinds: ['gull', 'gannet', 'pelican'], max: 3 },
  dropoff: { kinds: ['gannet', 'tern', 'gannet'], max: 3 },
};

/** A bird for this zone, or null where nothing flies (the deep has no sky). */
export function pickBird(zone: ZoneId, rng: Rng): BirdId | null {
  const kinds = ZONE_BIRDS[zone]?.kinds;
  return kinds?.length ? kinds[Math.floor(rng() * kinds.length)]! : null;
}

export function birdSize(kind: BirdId, playerSize: number, rng: Rng): number {
  const [lo, hi] = BIRD_INFO[kind].scale;
  return playerSize * (lo + rng() * (hi - lo));
}

/** What the hunting bird sees of the player. */
export interface Quarry {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  /** In cover, hooked or otherwise out of play. */
  readonly safe: boolean;
}

export interface Diver {
  readonly kind: BirdId;
  readonly size: number;
  readonly x: number;
  /** No new dive before this time. */
  readonly restUntil: number;
}

/** How far to the side a hunter will still go for you. */
export const DIVE_REACH = 240;

/** Does this bird start a dive at the player now? */
export function wantsDive(b: Diver, p: Quarry, surfaceY: number, now: number): boolean {
  const depth = BIRD_INFO[b.kind].diveDepth;
  return depth > 0 && !p.safe && now >= b.restUntil && relationTo(p.size, b.size) === 'predator' &&
    Math.abs(p.x - b.x) < DIVE_REACH && p.y < surfaceY + depth;
}

/** Where the dive aims: at the player, but never deeper than this bird can plunge. */
export function diveTarget(kind: BirdId, p: { x: number; y: number }, surfaceY: number): { x: number; y: number } {
  return { x: p.x, y: Math.min(p.y, surfaceY + BIRD_INFO[kind].diveDepth) };
}
