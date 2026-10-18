import { CREATURE } from '../../logic/creatures';
import { SPORE_AIR, type MineEvent } from '../../logic/mine';

/** How the game scene says things: a note over the prospector (or higher up), and the camera's shake. */
export interface Say {
  over(text: string, danger?: boolean): void;
  high(text: string, danger?: boolean): void;
  /** A note over a tile, px. */
  at(x: number, y: number, text: string, danger?: boolean): void;
  shake(ms: number, strength: number): void;
}

/** Which way a wind blowing towards `dir` comes from. */
const fromSide = (dir: 1 | -1): string => (dir === 1 ? 'the west' : 'the east');

/**
 * What the suit says about the worlds' hazards and creatures as they
 * happen (GameScene.react hands them here): spore pockets, jellies, the
 * giants waking, floods, deep water, and on Talus the dust storms, boulder
 * crabs and sand skates. Returns whether the event was one of these.
 */
export function hazardNote(e: MineEvent, say: Say, tile: number, windFrom: 1 | -1): boolean {
  switch (e.kind) {
    case 'spores':
      say.at((e.tile[0] + 0.5) * tile, e.tile[1] * tile - 6, `spores! air − ${SPORE_AIR}`, true);
      return true;
    case 'stung':
      say.over(`stung! air − ${CREATURE.jelly.sting}`, true);
      return true;
    case 'leviathan':
      if (e.now === 'wake') say.shake(700, 0.004);
      say.high(e.now === 'stir' ? 'something huge stirs below…' : e.now === 'wake' ? 'it’s awake! get clear' : 'it settles back to sleep', e.now !== 'sleep');
      return true;
    case 'rockslide':
      if (e.now === 'quake') say.shake(320, 0.003);
      else if (e.now === 'wake') say.shake(900, 0.006);
      if (e.now !== 'quake') say.high(e.now === 'stir' ? 'the rock heap shifts…' : e.now === 'wake' ? 'the hill gets up! mind the roof' : 'it settles back into a heap', e.now !== 'sleep');
      return true;
    case 'flood':
      if (e.near) {
        say.shake(260, 0.0025);
        say.high(e.sea ? 'the sea is coming in!' : 'water! it’s pouring in', true);
      }
      return true;
    case 'deep':
      say.high(`deep water: air ×${e.rate.toFixed(1)}`, true);
      return true;
    case 'storm':
      if (e.now === 'warn') say.high(`dust storm coming from ${fromSide(windFrom)}! get under cover`, true);
      else if (e.now === 'blow') say.high('dust storm! shelter in a hole, under an overhang, or in the lee of a rock', true);
      else if (e.now === 'clear') say.high('the storm is passing');
      return true;
    case 'pinched':
      say.over('a boulder crab!', true);
      return true;
    case 'struckUp':
      say.over('a sand skate!', true);
      return true;
    case 'hurt':
      if (e.cause === 'storm') say.over('sandblasted!', true);
      return e.cause === 'storm';
    default:
      return false;
  }
}
