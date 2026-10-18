import { makeCanvas, type Pt } from '../../../src/art/pen';
import { drawSpokenLine } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderManowarAudio } from './audio';
import { type BeachArt, drawBeach, drawZap, makeBeach, onScreen } from './beach';
import { drawColony } from './colony';
import { captionAt } from './cues';
import { makeHermit } from './hermit';
import { makeFloats } from './manowarArt';
import { callout, drawYelp, vignette, wash } from './marks';
import { drawRoad, makeRoad } from './road';
import { drawSea, makeSea } from './sea';
import { boilAt, crabAt, dimAt, flashAt, FLOAT, LOOP_S, nameLabel, type SceneId, sceneAt, wrap, yelpAt } from './story';

/** Draws the "this is NOT a jellyfish" short (story.ts has the choreography). */

/** The middle of the float, in world px, for the name's leader line. */
const FLOAT_BODY: Pt = { x: FLOAT.x - 10, y: FLOAT.ground - 26 * FLOAT.scale };
const NIGHT = '#141a3c';
const FLASH = '#fffbe6';

export function createManowar(ctx: CanvasRenderingContext2D): Short {
  const floats = makeFloats();
  const beach: BeachArt = { base: makeBeach(), floats, hermit: makeHermit() };
  const road = makeRoad();
  const sea = makeSea();
  // A cut's incoming picture is drawn here first, then laid over the outgoing one.
  const { canvas: scratch, ctx: over } = makeCanvas(VIDEO.width, VIDEO.height);

  /** The beach, and over it in screen space: the mood's light, the zap's flash, the yelp, the name. */
  const drawBeachScene = (c: CanvasRenderingContext2D, t: number, boil: number): void => {
    const cam = drawBeach(c, beach, t, boil);
    const dim = dimAt(t);
    vignette(c, 0.2 + 0.45 * dim);
    wash(c, NIGHT, 0.45 * dim);
    const f = flashAt(t);
    if (f > 0 && f < 1) wash(c, FLASH, 0.85 * (1 - f) ** 2);
    drawZap(c, cam, t, boil);
    const crab = crabAt(t);
    drawYelp(c, onScreen(cam, { x: crab.x + 60, y: crab.y - 120 }).x, onScreen(cam, { x: crab.x, y: crab.y - 120 }).y, yelpAt(t));
    callout(c, 'Portuguese man o\' war', { x: 540, y: 400 }, [onScreen(cam, FLOAT_BODY)], nameLabel(t), 84);
  };

  const drawScene = (c: CanvasRenderingContext2D, id: SceneId, t: number, boil: number): void => {
    if (id === 'beach') drawBeachScene(c, t, boil);
    else if (id === 'colony') drawColony(c, t, boil);
    else if (id === 'road') drawRoad(c, road, floats, t, boil);
    else drawSea(c, sea, floats, t, boil);
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t);
    const scene = sceneAt(t);
    drawScene(ctx, scene.base, t, boil);
    if (scene.over && scene.mix > 0) {
      drawScene(over, scene.over, t, boil);
      ctx.save();
      ctx.globalAlpha = scene.mix;
      ctx.drawImage(scratch, 0, 0);
      ctx.restore();
    }
    const now = captionAt(t);
    if (now) drawSpokenLine(ctx, now.line.words.map((w) => w.text), now.word);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderManowarAudio };
}
