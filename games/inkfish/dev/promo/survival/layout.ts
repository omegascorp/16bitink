import type { FishId } from './species';
import { T } from './timeline';

/**
 * The arena on the 1920x1080 frame: one big tank on a stage (two side by side
 * for the final), and where each contestant waits in it, round by round. The
 * fish aren't to scale in the tank (a 2 in fish beside a 15 ft shark would be a
 * speck): each round's survivors are drawn bigger as the field shrinks. The
 * line-up (lineup.ts) is the only to-scale picture.
 */

export const W = 1920;
export const H = 1080;

export interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

export const TANK: Rect = { x: 70, y: 190, w: 1780, h: 810 };
/** The final's two tanks. */
export const LEFT_TANK: Rect = { x: 70, y: 190, w: 850, h: 810 };
export const RIGHT_TANK: Rect = { x: 1000, y: 190, w: 850, h: 810 };
/** Where the sand starts, and the water's surface when the tank is full. */
export const SAND_Y = 905;
export const SURFACE_Y = 232;

/** The log the water leaves behind in round 4: its body, and the hollow end the rivulus hides in. */
export const LOG = { x0: 1240, x1: 1700, y: 830, r: 80 } as const;

export type Phase = 'packed' | 'eight' | 'sea' | 'dry' | 'final' | 'podium';

/** When each layout takes over (the fish glide to their new places). */
export const PHASES: readonly { readonly phase: Phase; readonly at: number }[] = [
  { phase: 'packed', at: -1 },
  { phase: 'eight', at: T.everyone },
  { phase: 'sea', at: T.round3 - 0.6 },
  { phase: 'dry', at: T.drain + 0.4 },
  { phase: 'final', at: T.final - 0.6 },
];

export const phaseAt = (t: number): Phase => {
  let p: Phase = 'packed';
  for (const k of PHASES) if (t >= k.at) p = k.phase;
  return p;
};

export interface Slot {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly facing: 1 | -1;
}

/** Each fish's length in the packed tank, px; later rounds scale it up. */
const BASE: Readonly<Partial<Record<FishId, number>>> = {
  pupfish: 82, mudskipper: 86, rivulus: 80, goldfish: 120, eel: 250, icefish: 230, salmon: 270, cod: 300, mako: 440, white: 640,
  giantMudskipper: 150,
};

const GROW: Readonly<Record<Phase, number>> = { packed: 1, eight: 1.15, sea: 1.45, dry: 1.6, final: 2.6, podium: 3.2 };

const at = (id: FishId, phase: Phase, x: number, y: number, facing: 1 | -1, grow = 1): Slot => ({ x, y, facing, len: (BASE[id] ?? 100) * GROW[phase] * grow });

type Slots = Readonly<Partial<Record<FishId, Slot>>>;

const SLOTS: Readonly<Record<Phase, Slots>> = {
  packed: {
    white: at('white', 'packed', 1000, 540, -1),
    mako: at('mako', 'packed', 480, 360, 1),
    cod: at('cod', 'packed', 1540, 340, -1),
    salmon: at('salmon', 'packed', 1560, 730, -1),
    icefish: at('icefish', 'packed', 380, 730, 1),
    eel: at('eel', 'packed', 760, 835, 1),
    goldfish: at('goldfish', 'packed', 1300, 845, -1),
    pupfish: at('pupfish', 'packed', 960, 862, 1),
    mudskipper: at('mudskipper', 'packed', 1060, 884, 1),
    rivulus: at('rivulus', 'packed', 1150, 866, -1),
  },
  eight: {
    cod: at('cod', 'eight', 420, 390, 1),
    salmon: at('salmon', 'eight', 960, 360, -1),
    icefish: at('icefish', 'eight', 1440, 410, -1),
    eel: at('eel', 'eight', 520, 620, 1),
    goldfish: at('goldfish', 'eight', 1130, 630, -1),
    pupfish: at('pupfish', 'eight', 720, 835, 1),
    mudskipper: at('mudskipper', 'eight', 960, 862, 1),
    rivulus: at('rivulus', 'eight', 1200, 835, -1),
  },
  sea: {
    eel: at('eel', 'sea', 560, 470, 1),
    goldfish: at('goldfish', 'sea', 1180, 480, -1),
    pupfish: at('pupfish', 'sea', 600, 780, 1),
    mudskipper: at('mudskipper', 'sea', 930, 830, 1),
    rivulus: at('rivulus', 'sea', 1260, 790, -1),
  },
  dry: {
    eel: at('eel', 'dry', 560, 872, 1),
    pupfish: at('pupfish', 'dry', 930, 880, 1),
    mudskipper: at('mudskipper', 'dry', 1130, 880, 1),
    giantMudskipper: at('giantMudskipper', 'dry', 1470, LOG.y - LOG.r - 38, -1),
    rivulus: at('rivulus', 'dry', LOG.x0 + 30, LOG.y + 8, -1, 0.8),
  },
  final: {
    mudskipper: at('mudskipper', 'final', 470, 600, 1),
    rivulus: at('rivulus', 'final', 1400, 600, -1),
  },
  podium: {
    rivulus: at('rivulus', 'podium', 960, 560, -1),
  },
};

export const slotOf = (id: FishId, phase: Phase): Slot | undefined => SLOTS[phase][id];

/** Where the goldfish's bowl sits on the stage, in front of the tank (round 3 onwards). */
export const BOWL = { x: 190, y: 965, r: 92 } as const;
