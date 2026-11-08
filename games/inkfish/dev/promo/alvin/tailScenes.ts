import { PAPER } from '../../../src/art/pen';
import { type TextInk, drawTextLine } from '../captions';
import { drawAlvin } from './art/alvin';
import { drawBow } from './art/bow';
import { crewPorts } from './art/crewPort';
import { CREW, drawCrew } from './art/faces';
import { drawRaisedFork } from './art/raisedFork';
import { drawPlate, drawPlatter, drawRail, drawSky, drawTable } from './food';
import { bowLightAt, cheerAt, lampsAt, plateAt, riseAt, sunAt, titanicSubAt } from './poses';
import { TEXT } from './script';
import { yearLaterAt } from './story';
import { drawStuck } from './stuck';
import { shafts, specks, tint, vignette, waterGradient } from './water';
import { VIDEO } from '../short';

/** The last scenes: the climb with the fish dangling, the steaks on deck, the Titanic's bow in Alvin's lamps. */

const LIGHT_TEXT: TextInk = { fill: PAPER, halo: '#041a30' };

/** The water lightens as the sub rises, with the fish dangling from its side; the faces laugh. */
export function drawRise(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const r = riseAt(t);
  const up = 1 - r.depth;
  waterGradient(ctx, tint('#0a3a66', '#62cfe8', up), tint('#03142a', '#1b86b4', up));
  shafts(ctx, up * up * 1.2, t);
  // Bubbles stream down the screen as the sub climbs, faster as it goes.
  specks(ctx, t, 45, 200 + 260 * up, 0.45, 5);
  if (up > 0.75) {
    const g = ctx.createLinearGradient(0, 0, 0, 260);
    g.addColorStop(0, `rgba(255,255,255,${0.85 * (up - 0.75) * 4})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIDEO.width, 260);
  }
  drawStuck(ctx, r, boil, t * 10);
  vignette(ctx, 0.25 * r.depth);
}

/** A sunny deck: the three crew grinning behind a full table, three big plates of grilled steak and the dish of the rest. */
export function drawSteaks(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  drawSky(ctx, sunAt(t), t);
  drawRail(ctx);
  const cheer = cheerAt(t);
  for (const i of [0, 2, 1]) {
    const bob = -26 * Math.abs(cheer) * (i % 2 === 0 ? 1 : 0.8) + 6 * Math.sin(t * 2.4 + i);
    drawCrew(ctx, CREW[i]!, 196 + i * 344, (i === 1 ? 500 : 540) + bob, 118, { shock: 0, joy: 0.85 + 0.15 * Math.sin(t * 3 + i), gaze: 0 });
  }
  const lift = 44 * Math.abs(cheer) + 10 * Math.sin(t * 3.1);
  drawRaisedFork(ctx, { x: 78, y: 690 - lift, fromX: 130, fromY: 930, tilt: -0.12, skin: CREW[0]!.skin, sleeve: CREW[0]!.shirt[1] });
  drawRaisedFork(ctx, { x: 1006, y: 668 - lift * 0.8, fromX: 960, fromY: 930, tilt: 0.14, skin: CREW[2]!.skin, sleeve: CREW[2]!.shirt[1] });
  drawTable(ctx);
  drawPlate(ctx, 196, 1010, 0.92, plateAt(t, 0), boil);
  drawPlate(ctx, 884, 1010, 0.92, plateAt(t, 2), boil);
  drawPlate(ctx, 540, 1070, 1.06, plateAt(t, 1), boil);
  drawPlatter(ctx, 540, 1510, plateAt(t, 2), boil);
}

/** 1986: looking up at the Titanic's prow out of the black, Alvin tiny against it, its lamps finding the stem. */
export function drawTitanic(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const sub = titanicSubAt(t);
  waterGradient(ctx, '#020c18', '#01060e');
  specks(ctx, t, 50, 22, 0.22, 2.6);
  drawBow(ctx, { light: bowLightAt(t), reveal: bowLightAt(t) }, boil);
  drawAlvin(ctx, { x: sub.x, y: sub.y, len: 250, rot: -0.14 }, { lit: 0.7, beams: lampsAt(t) * 0.8, reach: 170, prop: t * 8, port: crewPorts([{ shock: 0, joy: 0.2 }]) }, boil);
  specks(ctx, t, 30, 16, 0.3, 3.4);
  vignette(ctx, 0.55);
  drawTextLine(ctx, '1986', VIDEO.width / 2, TEXT.yearLater.y, TEXT.yearLater.size, 700, yearLaterAt(t), LIGHT_TEXT);
}
