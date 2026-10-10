/**
 * Fog (Fog & Kelp, beach 6): banks of sea fog drifting along the beach on
 * the wind. Inside a bank you see only what's near you, and what hunts by
 * sight sees only what's near it: never as far as you see, so a hunter
 * always shows before it can spot you. A bird can't find a crab in thick
 * fog at all. A raccoon hunts by smell, and the fog doesn't hide you from it.
 */
export interface FogSpec {
  /** Banks at the start: centre column and width in tiles. */
  readonly banks: readonly (readonly [number, number])[];
  /** Tiles a second the banks drift (negative: towards the left); 0 lies still. */
  readonly drift: number;
}

export const FOG = {
  /** Tiles at each end of a bank over which it thins to nothing. */
  edge: 4,
  /** Tiles round the crab it always sees through the fog, plus a little for a bigger crab… */
  clear: 5,
  clearPerSize: 0.4,
  /** …fading out over this many tiles further. */
  fade: 2.5,
  /** In thick fog a hunter that hunts by sight notices a crab only this close (tiles): inside what the crab can see. */
  near: 2,
  /** From this thick, a bird can't make out a crab under it. */
  thick: 0.5,
} as const;

/** Where a bank's centre has drifted to by `time`, wrapping round the beach (with room for it to clear the ends). */
function bankCentre(spec: FogSpec, width: number, bank: readonly [number, number], time: number): number {
  const loop = width + Math.max(...spec.banks.map(([, w]) => w));
  const x = bank[0] + spec.drift * time;
  return ((x % loop) + loop) % loop;
}

/** Shortest distance between two columns on the loop the banks drift round. */
function across(a: number, b: number, loop: number): number {
  const d = Math.abs(a - b) % loop;
  return Math.min(d, loop - d);
}

/** How thick the fog is at column `x` (tiles, fractional) at `time`: 0 clear … 1 thick. */
export function fogAt(spec: FogSpec | undefined, width: number, x: number, time: number): number {
  if (!spec?.banks.length) return 0;
  const loop = width + Math.max(...spec.banks.map(([, w]) => w));
  let thick = 0;
  for (const bank of spec.banks) {
    const half = bank[1] / 2;
    const d = across(x, bankCentre(spec, width, bank, time), loop);
    if (d >= half) continue;
    const u = Math.min(1, (half - d) / Math.min(FOG.edge, half));
    thick = Math.max(thick, u * u * (3 - 2 * u));
  }
  return thick;
}

/** Bank centres (tiles) at `time`, for drawing. */
export function bankCentres(spec: FogSpec, width: number, time: number): number[] {
  return spec.banks.map((b) => bankCentre(spec, width, b, time));
}

/** Tiles a crab of `size` sees round itself in thick fog. */
export function clearRadius(size: number): number {
  return FOG.clear + size * FOG.clearPerSize;
}

/**
 * How far (tiles) a hunter with `sight` notices a crab standing in fog
 * `thick`: its full sight in clear air, shrinking to FOG.near in thick fog.
 * One that hunts by its nose isn't troubled by fog.
 */
export function sightInFog(sight: number, thick: number, nose = false): number {
  if (nose || thick <= 0) return sight;
  const near = Math.min(sight, FOG.near);
  return sight + (near - sight) * Math.min(1, thick);
}
