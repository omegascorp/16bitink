import { clamp01, lerp, smooth } from '../short';

/**
 * The island as one long strip of ground the camera pans along, from the
 * rainforest on the left to the sea on the right, in world px (screen px at
 * the camera's scale; the camera only pans). The ground is seen at a low
 * angle: `depth` 0 is its far edge (high on the screen, drawn small), 1 its
 * near edge. Roads and the shore run into the distance, across the crabs'
 * way, so they cross them left to right.
 *
 *   0 .. 900     rainforest, where the crabs start
 *   1150         a road they cover
 *   1330 .. 1590 a garden: a picket fence and a flower bed
 *   1615 .. 1945 a house
 *   2060         a road the rangers close
 *   2210 .. 2910 fences funnel them onto the crab bridge over a road (2560)
 *   2910 ..      the beach, and the sea from SHORE on
 */
export const WORLD = {
  forestEnd: 900,
  roadA: 1150,
  garden: [1330, 1590],
  house: 1780,
  roadB: 2060,
  roadC: 2560,
  beach: 2910,
  shore: 3420,
} as const;

/** The ground band on screen: its far edge, its near edge, and the horizon above it. */
export const GROUND = { far: 690, near: 1085, horizon: 640 } as const;

/** Screen y of a point on the ground at `depth`. */
export const depthY = (depth: number): number => lerp(GROUND.far, GROUND.near, depth);
/** How big things are drawn at `depth` (1 = full size, near). */
export const depthScale = (depth: number): number => 0.6 + 0.5 * depth;

/** The crab bridge: ramps up, a flat span over road C, ramps down; its deck carries the crabs between DECK depths. */
export const BRIDGE = { from: 2330, up: 2450, down: 2670, to: 2790, height: 200 } as const;
export const DECK = { far: 0.3, near: 0.7 } as const;

/** The fences that guide the crowd onto the deck: narrowing in from FUNNEL.in, back out by FUNNEL.out. */
export const FUNNEL = { in: 2200, on: BRIDGE.from, off: BRIDGE.to, out: 2910 } as const;

/** How much of the crowd is squeezed onto the deck at world x, 0 .. 1. */
export function funnelAt(x: number): number {
  if (x <= FUNNEL.in || x >= FUNNEL.out) return 0;
  if (x < FUNNEL.on) return smooth((x - FUNNEL.in) / (FUNNEL.on - FUNNEL.in));
  if (x <= FUNNEL.off) return 1;
  return 1 - smooth((x - FUNNEL.off) / (FUNNEL.out - FUNNEL.off));
}

/** A crab's lane after the fences: squeezed between the deck's edges where the funnel is closed. */
export function laneDepth(x: number, depth: number): number {
  const deck = lerp(DECK.far, DECK.near, depth);
  return lerp(depth, deck, funnelAt(x));
}

/** The deck's height above the ground at x as a share of BRIDGE.height (0 off the bridge). */
export function bridgeProfile(x: number): number {
  if (x <= BRIDGE.from || x >= BRIDGE.to) return 0;
  if (x < BRIDGE.up) return smooth((x - BRIDGE.from) / (BRIDGE.up - BRIDGE.from));
  if (x <= BRIDGE.down) return 1;
  return 1 - smooth((x - BRIDGE.down) / (BRIDGE.to - BRIDGE.down));
}

/** A walker's ground point on screen (before the camera pans): its lane, lifted by the bridge as far as it is built. */
export function groundPoint(x: number, depth: number, built: number): { readonly y: number; readonly depth: number; readonly slope: number } {
  const lane = laneDepth(x, depth);
  const lift = (at: number): number => bridgeProfile(at) * BRIDGE.height * built;
  return { y: depthY(lane) - lift(x), depth: lane, slope: Math.atan2(lift(x - 4) - lift(x + 4), 8) };
}

/** Road centre lines run straight into the distance; a road's half-width at screen y. */
export const roadHalf = (y: number): number => 70 + (y - GROUND.far) * 0.13;

/** The waterline at `depth` (it slants a little with the beach), pushed up the sand by `surge` px. */
export const shoreX = (depth: number, surge: number): number => WORLD.shore - 70 * (depth - 0.5) - surge;

/** How far into the sea a point is, 0 on the sand .. 1 well under. */
export const underwater = (x: number, depth: number, surge: number): number => clamp01((x - shoreX(depth, surge)) / 110);
