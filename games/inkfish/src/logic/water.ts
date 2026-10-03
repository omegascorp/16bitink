/** The swimmable band shared by the player and every fish: nothing leaves the water. */
export const WATER = {
  /** Just under the drawn surface line. */
  surface: 80,
  /** Space kept free above the bottom of the world for the seabed. */
  floorMargin: 90,
} as const;

export function waterTop(radius: number): number {
  return WATER.surface + radius * 0.5;
}

export function waterBottom(worldHeight: number, radius: number): number {
  return worldHeight - WATER.floorMargin - radius * 0.5;
}

/** Clamps a vertical position into the water and turns the swimmer back if it hit the edge. */
export function keepInWater(y: number, vy: number, radius: number, worldHeight: number): { y: number; vy: number } {
  const top = waterTop(radius);
  const bottom = waterBottom(worldHeight, radius);
  if (y < top) return { y: top, vy: Math.abs(vy) * 0.5 };
  if (y > bottom) return { y: bottom, vy: -Math.abs(vy) * 0.5 };
  return { y, vy };
}
