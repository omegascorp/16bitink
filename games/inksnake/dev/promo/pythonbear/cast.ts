import { VIDEO } from '../short';
import { bakeSprite, bakeStrip, type Sprite } from '../sprites';
import { BEAR } from './bearKit';
import { BEAR_LEG, BEAR_RUMP } from './bearRump';
import { BEAR_STAND } from './bearStand';
import { paintForest } from './forest';
import { RESEARCHER } from './person';
import type { PythonCast } from './python';
import { RETIC_HEAD_LEFT, RETIC_HEAD_RIGHT } from './reticArt';
import { RETIC_HEAD } from './reticHead';

/**
 * The short's cast, baked once at video size: the reticulated python (two
 * strips and its head), the sun bear (standing with its collar, and its back
 * half for the hook), the researcher, and the forests behind.
 */
export interface Cast {
  readonly python: PythonCast;
  /** The hook's neck is drawn huge: its own sharper strip. */
  readonly sleeve: PythonCast;
  readonly rump: Sprite;
  readonly leg: Readonly<Record<'near' | 'far', Sprite>>;
  readonly bear: Sprite;
  readonly researcher: Sprite;
  readonly night: HTMLCanvasElement;
  readonly day: HTMLCanvasElement;
  readonly dusk: HTMLCanvasElement;
}

/** The field shots pan across a forest wider than the frame. */
export const DAY_W = 1700;
export const GROUND_Y = 1180;

export function bakeCast(): Cast {
  const head = {
    shut: bakeSprite(RETIC_HEAD, 'shut', 10, 610),
    sleep: bakeSprite(RETIC_HEAD, 'sleep', 10, 610),
    gape: bakeSprite(RETIC_HEAD, 'gape', 12, 610),
  };
  return {
    python: { right: bakeStrip(RETIC_HEAD_RIGHT, 9, 31), left: bakeStrip(RETIC_HEAD_LEFT, 9, 31), head },
    sleeve: { right: bakeStrip(RETIC_HEAD_RIGHT, 16, 32), left: bakeStrip(RETIC_HEAD_LEFT, 16, 32), head },
    rump: bakeSprite(BEAR_RUMP, 'rump', 4, 710, BEAR.line),
    leg: { near: bakeSprite(BEAR_LEG, 'near', 4, 720, BEAR.line), far: bakeSprite(BEAR_LEG, 'far', 4, 730, BEAR.line) },
    bear: bakeSprite(BEAR_STAND, 'stand', 4, 740, BEAR.line),
    researcher: bakeSprite(RESEARCHER, 'listen', 4, 760),
    night: paintForest(VIDEO.width + 200, VIDEO.height + 200, 1300, 'night', 41),
    day: paintForest(DAY_W, VIDEO.height, GROUND_Y, 'day', 43),
    dusk: paintForest(VIDEO.width + 120, VIDEO.height, GROUND_Y, 'dusk', 47),
  };
}
