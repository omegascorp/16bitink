import { drawTextLine, PAPER_ON_DARK, type TextInk } from '../captions';
import { BOIL, RED } from '../../../src/art/palette';
import { VIDEO, type Short } from '../short';
import { boilAt } from '../sprites';
import { type BoobyArt, drawBooby, makeBoobyArt } from './art/booby';
import { type CrabArt, drawClaw, drawCrabBody, drawCrabFace, makeCrabArt } from './art/coconutCrab';
import { renderCrabbirdAudio } from './audio';
import { drawGameShot, type GameKit, makeGameKit } from './gameShot';
import { drawArrow, drawDrift, drawEyePair, drawFeather, drawImpact, inkWash, makeLayer } from './marks';
import { makeGroundShot, makeLeaves, makeSky, makeTree } from './scene';
import {
  AT, type BirdPose, type Cam, captionsAt, type CrabPose, CTA, ctaAt, EYE_PAIRS, groundBird, groundFeathers, LOOP_S, nightPoseOf, shotsAt, type Shot, snapFeathers, WING_AT,
} from './story';

/** Draws "This crab took down a bird" (story.ts has the choreography). */

interface Kit {
  readonly sky: HTMLCanvasElement;
  readonly tree: ReturnType<typeof makeTree>;
  readonly leaves: ReturnType<typeof makeLeaves>;
  readonly ground: HTMLCanvasElement;
  readonly crab: CrabArt;
  readonly bird: BoobyArt;
  readonly game: GameKit;
}

/** The sky stays almost still behind the camera. */
function drawSky(ctx: CanvasRenderingContext2D, sky: HTMLCanvasElement, cam: Cam, time: number): void {
  const [px, py] = [-(cam.x - 540) * 0.1, -(cam.y - 960) * 0.1];
  ctx.drawImage(sky, -100 + px, -100 + py);
  drawDrift(ctx, px, py, time);
}

function drawNightWorld(ctx: CanvasRenderingContext2D, kit: Kit, cam: Cam, crab: CrabPose | null, bird: BirdPose, boil: number, t: number, time: number): void {
  drawSky(ctx, kit.sky, cam, time);
  ctx.save();
  ctx.translate(VIDEO.width / 2, VIDEO.height / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);
  ctx.drawImage(kit.tree.canvas, kit.tree.x, kit.tree.y, kit.tree.w, kit.tree.h);
  if (crab) {
    drawCrabBody(ctx, kit.crab, crab, boil);
    drawClaw(ctx, kit.crab, crab, 1, boil);
    drawCrabFace(ctx, crab, boil);
  }
  drawBooby(ctx, kit.bird, bird, boil);
  if (crab) drawClaw(ctx, kit.crab, crab, 0, boil);
  ctx.drawImage(kit.leaves.canvas, kit.leaves.x, kit.leaves.y);
  drawImpact(ctx, WING_AT.x, WING_AT.y, (t - AT.snap) / 0.6, boil);
  for (const f of snapFeathers(t)) drawFeather(ctx, f);
  ctx.restore();
  const shade = ctx.createLinearGradient(0, 1420, 0, VIDEO.height);
  shade.addColorStop(0, '#04050e00');
  shade.addColorStop(1, '#04050ef2');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 1420, VIDEO.width, VIDEO.height - 1420);
  const flash = 1 - (t - AT.snap) / 0.2;
  if (flash > 0 && flash <= 1) {
    ctx.fillStyle = `rgba(255,255,255,${flash})`;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  }
}

function drawGround(ctx: CanvasRenderingContext2D, kit: Kit, t: number, boil: number): void {
  const push = 1 + 0.05 * Math.max(0, (t - AT.ground) / (AT.game - AT.ground));
  ctx.save();
  ctx.translate(VIDEO.width / 2, 1100);
  ctx.scale(push, push);
  ctx.translate(-VIDEO.width / 2, -1100);
  ctx.drawImage(kit.ground, 0, 0);
  [...EYE_PAIRS].sort((a, b) => a.y - b.y).forEach((p) => drawEyePair(ctx, p, t, boil));
  drawBooby(ctx, kit.bird, groundBird(t), boil);
  for (const f of groundFeathers(t)) drawFeather(ctx, f, 0.95);
  ctx.restore();
}

function drawShot(ctx: CanvasRenderingContext2D, kit: Kit, shot: Shot, boil: number): void {
  const { id, at } = shot;
  if (id === 'hook' || id === 'night') {
    const { cam, crab, bird } = nightPoseOf(shot);
    drawNightWorld(ctx, kit, cam, crab, bird, boil, id === 'hook' ? -1 : at, at);
  } else if (id === 'ground') drawGround(ctx, kit, at, boil);
  else drawGameShot(ctx, kit.game, at, boil);
}

const HOT: TextInk = { fill: '#ff5a3c', halo: '#0d1230' };

function drawCaptions(ctx: CanvasRenderingContext2D, t: number): void {
  for (const c of captionsAt(t)) drawTextLine(ctx, c.text, VIDEO.width / 2, c.y, c.size, 700, c.alpha, c.hot ? HOT : PAPER_ON_DARK);
}

function drawCta(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const a = ctaAt(t);
  if (a <= 0) return;
  const ink: TextInk = { fill: RED, halo: '#fff6e2' };
  drawTextLine(ctx, '10 levels free', VIDEO.width / 2, CTA.y, CTA.size, 700, a, ink);
  drawTextLine(ctx, 'tap the channel name', VIDEO.width / 2, CTA.subY, CTA.subSize, 700, a, { fill: '#26316a', halo: '#fff6e2' });
  drawArrow(ctx, a, boil);
}

export function createCrabbird(ctx: CanvasRenderingContext2D): Short {
  const boils = BOIL;
  const kit: Kit = {
    sky: makeSky(),
    tree: makeTree(),
    leaves: makeLeaves(),
    ground: makeGroundShot(),
    crab: makeCrabArt(boils),
    bird: makeBoobyArt(boils),
    game: makeGameKit(),
  };
  const layer = makeLayer();
  return {
    loopSeconds: LOOP_S,
    draw(seconds: number): void {
      const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
      const boil = boilAt(t);
      const s = shotsAt(t);
      drawShot(ctx, kit, s.under, boil);
      if (s.over) {
        layer.ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
        drawShot(layer.ctx, kit, s.over, boil);
        if (s.how === 'wash') inkWash(ctx, layer.canvas, layer.ctx, s.u);
        else {
          ctx.save();
          ctx.globalAlpha = s.u;
          ctx.drawImage(layer.canvas, 0, 0);
          ctx.restore();
        }
      }
      drawCaptions(ctx, t);
      drawCta(ctx, t, boil);
    },
    audio: renderCrabbirdAudio,
  };
}

