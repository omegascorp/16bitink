/**
 * The creatures roaming a beach besides the player. All share one rule
 * (bigger catches you, smaller is food: if you're bigger, you eat it) and
 * differ in how they move and whether they hunt.
 */
export type SpeciesId = 'ghostcrab' | 'slater' | 'beetle' | 'darkling' | 'antlion' | 'skink' | 'raven';

/**
 * How it gets about: walkers roam the surface and open tunnels; a lurker
 * stays put at the bottom of its pit; a burrower swims through the sand
 * itself (never rock), anywhere below the surface.
 */
export type Movement = 'walk' | 'lurk' | 'burrow';

export interface SpeciesSpec {
  readonly id: SpeciesId;
  readonly name: string;
  /** Speed as a share of the ghost crab's at the same size. */
  readonly speed: number;
  /** How far (tiles) it notices the player. */
  readonly sight: number;
  /** Whether it goes after a smaller player; timid ones only ever run. */
  readonly hunts: boolean;
  /** Runs in bursts: seconds running, then seconds standing still. */
  readonly burst?: { readonly run: number; readonly rest: number };
  /** Default: walk. */
  readonly move?: Movement;
  /** Hops up walls a walker would turn back at. */
  readonly hops?: boolean;
  /**
   * Body box as a share of the shell size scale (see critterBox). Widths sit
   * near 1, as wide as a crab in a shell of the same size, so on screen a
   * bigger creature always looks bigger than a smaller crab.
   */
  readonly box: { readonly w: number; readonly h: number };
}

export const SPECIES: Readonly<Record<SpeciesId, SpeciesSpec>> = {
  ghostcrab: { id: 'ghostcrab', name: 'ghost crab', speed: 1, sight: 6, hunts: true, box: { w: 0.95, h: 0.65 } },
  // A sea slater: a woodlouse of the strandline. Slow and harmless-minded; it never chases.
  slater: { id: 'slater', name: 'sea slater', speed: 0.6, sight: 4, hunts: false, box: { w: 1, h: 0.47 } },
  // A tiger beetle: a real beach predator, sprinting in short dashes with keen eyes.
  beetle: { id: 'beetle', name: 'tiger beetle', speed: 1.5, sight: 8, hunts: true, burst: { run: 0.7, rest: 0.5 }, box: { w: 0.95, h: 0.57 } },
  // Dune Sea (beach 2). A darkling beetle: the dunes' slow, harmless forager.
  darkling: { id: 'darkling', name: 'darkling beetle', speed: 0.65, sight: 4, hunts: false, box: { w: 0.95, h: 0.55 } },
  // An antlion: waits, buried to the jaws, at the bottom of its sand pit.
  antlion: { id: 'antlion', name: 'antlion', speed: 0, sight: 0, hunts: true, move: 'lurk', box: { w: 0.9, h: 0.42 } },
  // A sandfish skink: swims through the sand itself, after crabs in their tunnels.
  skink: { id: 'skink', name: 'sandfish', speed: 0.6, sight: 7, hunts: true, move: 'burrow', box: { w: 1.25, h: 0.45 } },
  // A raven: walks the dunes and hops up what would stop a crab; too big for a tunnel.
  raven: { id: 'raven', name: 'raven', speed: 1.1, sight: 9, hunts: true, hops: true, box: { w: 1.15, h: 0.95 } },
};

export function movementOf(id: SpeciesId): Movement {
  return SPECIES[id].move ?? 'walk';
}
