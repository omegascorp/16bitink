/** The swimmable band shared by the player and every fish: nothing leaves the water. */
export const WATER = {
  /** Just under the drawn surface line. */
  surface: 80,
  /** Space kept free above the bottom of the world for the seabed. */
  floorMargin: 90,
} as const;

/** Open air above the surface in sunlit levels: room to leap, boats, sky. */
export const SKY = {
  /** How far the world extends above y = 0. Taller than the highest leap. */
  height: 380,
  /** Where the surface pen line is drawn. */
  surfaceY: 60,
} as const;

export function waterTop(radius: number): number {
  return WATER.surface + radius * 0.5;
}

export function waterBottom(worldHeight: number, radius: number): number {
  return worldHeight - WATER.floorMargin - radius * 0.5;
}

/** Lowest a swimmer's centre can go over sand at `floorY`: belly just brushing the seabed. */
export function aboveSeabed(floorY: number, radius: number): number {
  return floorY - radius * 0.45;
}

/**
 * Clamps a vertical position into the water and turns the swimmer back if it hit the edge.
 * With `floorY` (the seabed under the swimmer) it can go right down to the sand.
 */
export function keepInWater(y: number, vy: number, radius: number, worldHeight: number, floorY?: number): { y: number; vy: number } {
  const top = waterTop(radius);
  const bottom = floorY === undefined ? waterBottom(worldHeight, radius) : aboveSeabed(floorY, radius);
  if (y < top) return { y: top, vy: Math.abs(vy) * 0.5 };
  if (y > bottom) return { y: bottom, vy: -Math.abs(vy) * 0.5 };
  return { y, vy };
}

/**
 * The shape of a level's seabed. Every level gets its own: gentle dunes or
 * steep ridges, a slope one way or the other, so no two floors look alike.
 */
export interface Seabed {
  /** Sand surface height (world y) at x. */
  floorAt(x: number): number;
}

const SEABED_TOP = 118;
const SEABED_BOTTOM = 34;

/** Stable 0..1 from a string (FNV-1a), for per-level variety that never changes between plays. */
export function hashUnit(text: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}

export function seabedFor(levelId: string, world: { readonly width: number; readonly height: number }): Seabed {
  const r = (salt: number): number => hashUnit(levelId, salt);
  const amp = 8 + r(1) * 22;
  const wave = 110 + r(2) * 170;
  const ripple = 2 + r(3) * 6;
  const phase = r(4) * Math.PI * 2;
  const tilt = (r(5) - 0.5) * 50;
  const base = world.height - 72;
  return {
    floorAt: (x) => {
      const y = base - Math.sin(x / wave + phase) * amp - Math.sin(x / 47 + phase * 2) * ripple + tilt * (x / world.width - 0.5);
      return Math.min(world.height - SEABED_BOTTOM, Math.max(world.height - SEABED_TOP, y));
    },
  };
}
