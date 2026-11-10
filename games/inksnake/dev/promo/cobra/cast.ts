import { COBRA_HOOD } from '../../../src/art/chapters/jungleHood';
import { VIDEO } from '../short';
import { bakeSprite, bakeStrip, type Sprite } from '../sprites';
import { RETIC_HEAD_LEFT, RETIC_HEAD_RIGHT } from '../pythonbear/reticArt';
import { RETIC_HEAD } from '../pythonbear/reticHead';
import { COBRA_HEAD_LEFT, COBRA_HEAD_RIGHT, COBRA } from './cobraArt';
import { COBRA_SIDE_HEAD } from './cobraHead';
import type { Strips } from './lay';
import { paintMangrove } from './mangrove';

/**
 * The short's cast, baked once at video size: the king cobra (its side-on
 * strips, its head shut and striking, and the game's own hood), the
 * reticulated python (pythonbear's strips and head), and the mangrove edge
 * in each light. The monitor is drawn live (monitor.ts).
 */
export interface Cast {
  readonly cobra: Strips;
  /** The hook's neck is drawn huge: its own sharper strips. */
  readonly sleeve: Strips;
  readonly cobraHead: Readonly<Record<'shut' | 'strike', Sprite>>;
  readonly hood: Sprite;
  readonly python: Strips;
  readonly pythonBig: Strips;
  readonly pythonHead: Sprite;
  readonly dusk: HTMLCanvasElement;
  readonly day: HTMLCanvasElement;
  readonly late: HTMLCanvasElement;
  readonly faceBg: HTMLCanvasElement;
  readonly restBg: HTMLCanvasElement;
}

/** The channel's edge: where the far mangroves stand and where the mud begins, for each shot. */
export const FLAT = { width: VIDEO.width, height: VIDEO.height, horizon: 830, bank: 1300 } as const;
export const HOOK_SHORE = { width: VIDEO.width + 200, height: VIDEO.height + 200, horizon: 1390, bank: 1500 } as const;
export const FACE_SHORE = { width: VIDEO.width, height: VIDEO.height, horizon: 1000, bank: 1130 } as const;
export const REST_SHORE = { width: VIDEO.width, height: VIDEO.height, horizon: 1240, bank: 1340 } as const;

export function bakeCast(): Cast {
  return {
    cobra: { right: bakeStrip(COBRA_HEAD_RIGHT, 9, 41), left: bakeStrip(COBRA_HEAD_LEFT, 9, 41) },
    sleeve: { right: bakeStrip(COBRA_HEAD_RIGHT, 16, 42), left: bakeStrip(COBRA_HEAD_LEFT, 16, 42) },
    cobraHead: { shut: bakeSprite(COBRA_SIDE_HEAD, 'shut', 10, 630), strike: bakeSprite(COBRA_SIDE_HEAD, 'strike', 10, 640) },
    hood: bakeSprite(COBRA_HOOD, 'spread', 8, 650, COBRA.line),
    python: { right: bakeStrip(RETIC_HEAD_RIGHT, 9, 31), left: bakeStrip(RETIC_HEAD_LEFT, 9, 31) },
    pythonBig: { right: bakeStrip(RETIC_HEAD_RIGHT, 16, 32), left: bakeStrip(RETIC_HEAD_LEFT, 16, 32) },
    pythonHead: bakeSprite(RETIC_HEAD, 'shut', 10, 610),
    dusk: paintMangrove(HOOK_SHORE, 'dusk', 61),
    day: paintMangrove(FLAT, 'day', 63, 2),
    late: paintMangrove(FLAT, 'late', 63, 2),
    faceBg: paintMangrove(FACE_SHORE, 'late', 67, 1.6),
    restBg: paintMangrove(REST_SHORE, 'dusk', 69),
  };
}
