import type { Pt } from '../../../src/art/pen';

/**
 * Where everything is on the reef: a coral boulder on the left with the
 * moray's hole in its right face, and a coral mound across the rest of the
 * frame split by a U-shaped crack (in at the left arm, out at the right),
 * the prey's hiding spot at its bottom. Shapes only; reef.ts draws them.
 */

/** The boulder, filling the left edge; the hole opens in its right face. */
export const ROCK: readonly Pt[] = [
  { x: -60, y: 700 }, { x: 40, y: 684 }, { x: 140, y: 706 }, { x: 214, y: 770 }, { x: 252, y: 836 }, { x: 262, y: 920 },
  { x: 252, y: 1000 }, { x: 274, y: 1090 }, { x: 262, y: 1200 }, { x: 250, y: 1300 }, { x: -60, y: 1310 },
];

/** The moray's hole. */
export const HOLE = { x: 240, y: 882, rx: 42, ry: 60 } as const;

/** The crack's two openings on the mound's top edge (left lip, right lip), and the hiding spot at the bottom of the U. */
export const ENTRANCE: readonly [Pt, Pt] = [{ x: 628, y: 940 }, { x: 724, y: 944 }];
export const EXIT: readonly [Pt, Pt] = [{ x: 934, y: 956 }, { x: 1010, y: 958 }];
export const SPOT: Pt = { x: 838, y: 1040 };

/** The mound's top edge, left to right, through both openings' lips. */
const EDGE: readonly Pt[] = [
  { x: 286, y: 1012 }, { x: 330, y: 990 }, { x: 420, y: 972 }, { x: 520, y: 956 }, ENTRANCE[0], ENTRANCE[1], { x: 800, y: 938 }, { x: 870, y: 944 },
  EXIT[0], EXIT[1], { x: 1070, y: 948 }, { x: 1140, y: 958 },
];

export const MOUND: readonly Pt[] = [...EDGE, { x: 1140, y: 1310 }, { x: 300, y: 1310 }, { x: 284, y: 1100 }];

/** The crack: down the left arm from the entrance, along the bottom past the spot, and up the right arm to the exit. */
const U: readonly Pt[] = [
  ENTRANCE[0], { x: 664, y: 990 }, { x: 716, y: 1042 }, { x: 772, y: 1078 }, { x: 850, y: 1088 }, { x: 918, y: 1070 }, { x: 964, y: 1028 }, { x: 994, y: 990 },
  EXIT[1], EXIT[0], { x: 924, y: 996 }, { x: 884, y: 1014 }, { x: 830, y: 1010 }, { x: 784, y: 990 }, { x: 750, y: 966 }, ENTRANCE[1],
];

/** Each side of the U broken in two, the middle nudged in or out: a ragged split in the coral, not a smooth bowl. */
export const CRACK: readonly Pt[] = U.flatMap((a, i) => {
  // Not across the two openings (exit lip to lip, entrance lip back to the start).
  if (i === 8 || i === U.length - 1) return [a];
  const b = U[(i + 1) % U.length]!;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const n = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
  const nudge = (i * 7) % 5 - 2;
  return [a, { x: (a.x + b.x) / 2 + n.x * nudge * 2.5, y: (a.y + b.y) / 2 + n.y * nudge * 2.5 }];
});

/** The sand's top edge. */
export const SAND_Y = 1286;
export const sandEdge = (x: number): number => SAND_Y + 10 * Math.sin(x / 90) + 4 * Math.sin(x / 31 + 1);

/** Middles of the two openings. */
export const mid = (lips: readonly [Pt, Pt]): Pt => ({ x: (lips[0].x + lips[1].x) / 2, y: (lips[0].y + lips[1].y) / 2 });
