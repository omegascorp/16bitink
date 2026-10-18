import { drawSpokenLine, PAPER_ON_DARK } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderPlantsAudio } from './audio';
import { makeEarthLeaf } from './earth';
import { makeForest } from './forest';
import { makeLeafScene } from './leafScene';
import { makePage } from './page';
import { captionAt } from './script';
import { makeStarfield } from './starfield';
import { boilAt, cardAt, LOOP_S, wrap } from './story';
import { makeCanvas } from '../../../src/art/pen';

/**
 * Draws the "plants on most planets could be black" short (story.ts has
 * the choreography): the black forest under the red sun, the starfield,
 * the black leaf drinking every colour, the notebook page with the smug
 * green Earth leaf and the WRONG stamp, then back to the forest. Each
 * scene draws only while it shows; later ones cross-fade over earlier.
 */
const NIGHT = '#06050b';
/** The word being said: a warm sun-red that reads on the dark. */
const HOT = '#ff8a5c';

export function createPlants(ctx: CanvasRenderingContext2D): Short {
  const forest = makeForest();
  const stars = makeStarfield();
  const leaf = makeLeafScene();
  const page = makePage();
  const earth = makeEarthLeaf();
  // The page and all on it are drawn here first, then faded as one layer.
  const sheet = makeCanvas(VIDEO.width, VIDEO.height);
  const drawSheet = (t: number, boil: number): void => {
    const a = cardAt(t).alpha;
    if (a <= 0) return;
    const s = sheet.ctx;
    s.clearRect(0, 0, VIDEO.width, VIDEO.height);
    page.drawPage(s, t, boil);
    earth.draw(s, t, boil);
    page.drawStamp(s, t);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.drawImage(sheet.canvas, 0, 0);
    ctx.restore();
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t);
    ctx.save();
    ctx.fillStyle = NIGHT;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    forest.draw(ctx, t, boil);
    stars.draw(ctx, t);
    leaf.draw(ctx, t, boil);
    drawSheet(t, boil);
    page.drawFlash(ctx, t);
    ctx.restore();
    const now = captionAt(t);
    if (now) drawSpokenLine(ctx, now.line.words.map((w) => w.text), now.word, PAPER_ON_DARK, HOT);
  };
  return { loopSeconds: LOOP_S, draw, audio: renderPlantsAudio };
}
