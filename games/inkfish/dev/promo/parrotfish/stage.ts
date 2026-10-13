import { smooth } from '../short';

/**
 * The set, in world px (at the opening camera, world px = video px): a
 * tropical island seen side-on. The sea on the left, with a coral head on
 * the sand; the island's beach rising out of the water on the right, where
 * someone is sunbathing under an umbrella. Far off to the right (only seen
 * when the camera pulls back) the island's palms and its far shore.
 */

export const WATER_Y = 600;
export const SEABED_Y = 1090;
export const BEACH_Y = 540;

/** The near shore climbs from the seabed to the beach between these x; the far shore mirrors it. */
export const SHORE = { from: 560, to: 940 } as const;
export const FAR = { from: 1800, to: 2220 } as const;
/** The island's middle, for the pull-back. */
export const ISLAND_X = (SHORE.from + FAR.to) / 2;
/** Beyond the reef flat the island stands on, the seabed slopes gently away into deeper water either side. */
export const DEEP_Y = 1500;
const DROPS = { left: { from: -700, to: -150 }, right: { from: FAR.to + 150, to: FAR.to + 700 } } as const;

/** Steep underwater, levelling off gently into the beach above it. */
const shore = (u: number): number => 1 - (1 - smooth(u)) ** 1.8;

/** Height of the sand (world y) at x, without the pile. */
export function groundAt(x: number): number {
  const rise = shore((x - SHORE.from) / (SHORE.to - SHORE.from)) * shore((FAR.to - x) / (FAR.to - FAR.from));
  const drop = 1 - smooth((x - DROPS.left.from) / (DROPS.left.to - DROPS.left.from)) + smooth((x - DROPS.right.from) / (DROPS.right.to - DROPS.right.from));
  // A gentle dune along the top.
  const dune = 8 * Math.sin((x - SHORE.to) / 140) * rise ** 4;
  return SEABED_Y + (DEEP_Y - SEABED_Y) * drop - (SEABED_Y - BEACH_Y) * rise - dune;
}

/** Where the waterline meets each shore (solved once). */
function crossing(from: number, to: number): number {
  let [a, b] = [from, to];
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2;
    if ((groundAt(m) - WATER_Y) * (groundAt(a) - WATER_Y) > 0) a = m;
    else b = m;
  }
  return (a + b) / 2;
}
export const NEAR_EDGE = crossing(SHORE.from, SHORE.to);
export const FAR_EDGE = crossing(FAR.from, FAR.to);

/** The coral head the parrotfish bites (the game's brain coral, scaled up), standing on the seabed. */
export const CORAL = { x: 108, y: SEABED_Y + 6, scale: 2.3 } as const;
/** Its dome, world px: half-width and height (the game's drawing is 64 × 78 in its own px). */
export const CORAL_DOME = { rx: 64 * CORAL.scale, ry: 78 * CORAL.scale } as const;

/** The beach things: towel, umbrella, and the sunbather lying with their feet towards the sea. */
export const TOWEL = { x0: 858, x1: 1084, y: BEACH_Y } as const;
export const UMBRELLA = { x: 1078, top: 300, width: 330 } as const;
/** The sunbather's hip, which they sit up about. */
export const HIP = { x: 962, y: BEACH_Y - 12 } as const;

/** Palms out on the island, beyond the opening frame's right edge. */
export const PALMS: readonly { readonly x: number; readonly h: number; readonly lean: number }[] = [
  { x: 1330, h: 330, lean: -0.2 },
  { x: 1560, h: 400, lean: 0.12 },
  { x: 1730, h: 300, lean: 0.28 },
];

/** The sand pile the parrotfish makes, centred under where it hovers. */
export const PILE_X = 485;

/** The opening frame, and the pull-back that shows the whole island: zoom, and the world point at the video's centre. */
export interface Camera {
  readonly zoom: number;
  readonly cx: number;
  readonly cy: number;
}
export const CLOSE: Camera = { zoom: 1, cx: 540, cy: 960 };
const WIDE_ZOOM = 0.4;
/** Wide: the whole island and the sea either side, the waterline at video y 740. */
export const WIDE: Camera = { zoom: WIDE_ZOOM, cx: ISLAND_X - 60, cy: WATER_Y + (960 - 740) / WIDE_ZOOM };
