import { VIDEO } from '../short';
import { bakeSprite, bakeStrip, type Sprite } from '../sprites';
import type { Strips } from '../cobra/lay';
import { CORN } from '../../../src/art/snakes/corn';
import { CORN_HEAD } from '../../../src/art/snakes/cornHead';
import type { GameSnake } from './cta';
import { BURM_HEAD_LEFT, BURM_HEAD_RIGHT } from './burmeseArt';
import { BURM_HEAD, type BurmPose } from './burmeseHead';
import { FAWN_ART } from './fawn';
import { ANA, BEN, type PersonPose } from './people';
import { paintSwamp, type SwampFrame } from './swamp';

/**
 * The short's cast, baked once at video size: the Burmese python (side-on
 * strips, its head shut and gaping), the fawn, the two biologists in each
 * pose, and the swamp in each framing.
 */
export interface Cast {
  readonly burm: Strips;
  /** Frame 1's neck is drawn huge: its own sharper strips. */
  readonly burmBig: Strips;
  readonly head: Readonly<Record<BurmPose, Sprite>>;
  readonly fawn: Sprite;
  readonly ana: Readonly<Record<PersonPose, Sprite>>;
  readonly ben: Readonly<Record<PersonPose, Sprite>>;
  readonly hookBg: HTMLCanvasElement;
  readonly scaleBg: HTMLCanvasElement;
  readonly spotBg: HTMLCanvasElement;
  readonly liftBg: HTMLCanvasElement;
  readonly recordBg: HTMLCanvasElement;
  readonly restBg: HTMLCanvasElement;
  /** InkSnake's own corn snake, for the call to action. */
  readonly game: GameSnake;
}

const frame = (horizon: number, bank: number, extra = 0, sun = 0.7, dusk = 0): SwampFrame => ({ width: VIDEO.width + extra, height: VIDEO.height + extra, horizon, bank, sun, dusk });

const poses = (art: typeof ANA, seed: number): Record<PersonPose, Sprite> => ({
  peer: bakeSprite(art, 'peer', 4, seed),
  hold: bakeSprite(art, 'hold', 4, seed),
  startle: bakeSprite(art, 'startle', 4, seed),
  hands: bakeSprite(art, 'hands', 4, seed),
});

export function bakeCast(): Cast {
  return {
    burm: { right: bakeStrip(BURM_HEAD_RIGHT, 9, 41), left: bakeStrip(BURM_HEAD_LEFT, 9, 41) },
    burmBig: { right: bakeStrip(BURM_HEAD_RIGHT, 16, 42), left: bakeStrip(BURM_HEAD_LEFT, 16, 42) },
    head: { shut: bakeSprite(BURM_HEAD, 'shut', 10, 630), gape: bakeSprite(BURM_HEAD, 'gape', 10, 640) },
    fawn: bakeSprite(FAWN_ART, 'lie', 2.2, 700),
    ana: poses(ANA, 720),
    ben: poses(BEN, 740),
    hookBg: paintSwamp(frame(930, 1150, 100, 0.72), 61),
    scaleBg: paintSwamp(frame(1000, 1200, 0, 0.5), 63),
    spotBg: paintSwamp(frame(880, 1090, 0, 0.75), 65),
    liftBg: paintSwamp(frame(860, 1040, 0, 0.3), 67),
    recordBg: paintSwamp(frame(1040, 1240, 0, 0.6, 0.25), 69),
    restBg: paintSwamp(frame(1120, 1290, 0, 0.5, 0.45), 71),
    game: { strips: { right: bakeStrip(CORN, 6, 51), left: bakeStrip(CORN, 6, 51) }, head: bakeSprite(CORN_HEAD, 'shut', 6, 660) },
  };
}
