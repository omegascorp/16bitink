import { drawSpokenLine, drawTextLine, PAPER_ON_DARK, type TextInk } from '../captions';
import { BOIL, PAPER_FILL } from '../../../src/art/palette';
import { VIDEO, type Short } from '../short';
import { boilAt } from '../sprites';
import { type BoobyArt, drawBooby, makeBoobyArt } from './art/booby';
import { type CrabArt, drawClaw, drawCrabBody, drawCrabFace, makeCrabArt } from './art/coconutCrab';
import { renderCrabbirdAudio } from './audio';
import { drawGameCard, type GameCard, makeGameCard } from './card';
import { drawArrow, drawDrift, drawEyePair, drawFeather, drawImpact, inkWash, makeLayer } from './marks';
import { drawLowMoon, makeGroundShot, makeLeaves, makeSky, makeTree } from './scene';
import {
  AT, type BirdPose, type Cam, type CrabPose, CTA, ctaAt, EYE_PAIRS, groundBird, groundFeathers, groundLiftAt, LOOP_S, nightPoseOf, shotsAt, type Shot, SNAP_MARK, snapFeathers, snapMarkAt,
  spokenAt, WING_AT,
} from './story';

/** Draws "This crab took down a bird" (story.ts has the choreography). */

interface Kit {
  readonly sky: HTMLCanvasElement;
  readonly tree: ReturnType<typeof makeTree>;
  readonly leaves: ReturnType<typeof makeLeaves>;
  readonly ground: ReturnType<typeof makeGroundShot>;
  readonly crab: CrabArt;
  readonly bird: BoobyArt;
  readonly card: GameCard;
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
  const push = 1 + 0.05 * Math.max(0, (t - AT.ground) / (LOOP_S - AT.ground));
  const lift = groundLiftAt(t);
  ctx.fillStyle = '#02030a';
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.save();
  ctx.translate(VIDEO.width / 2, 1100 - lift);
  ctx.scale(push, push);
  ctx.translate(-VIDEO.width / 2, -1100);
  ctx.drawImage(kit.ground.sky, 0, 0);
  drawLowMoon(ctx, lift);
  ctx.drawImage(kit.ground.land, 0, 0);
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
  } else drawGround(ctx, kit, at, boil);
}

const HOT = '#ff5a3c';
const HOT_INK: TextInk = { fill: HOT, halo: '#0d1230' };

/** The spoken line, word by word, and the big SNAP on its word. */
function drawCaptions(ctx: CanvasRenderingContext2D, t: number): void {
  for (const r of spokenAt(t)) drawSpokenLine(ctx, r.words, r.current, PAPER_ON_DARK, HOT, r.y, r.size, r.unsaid);
  drawTextLine(ctx, 'SNAP', VIDEO.width / 2, SNAP_MARK.y, SNAP_MARK.size, 700, snapMarkAt(t), HOT_INK);
}

function drawCta(ctx: CanvasRenderingContext2D, kit: Kit, t: number, boil: number): void {
  const a = ctaAt(t);
  if (a <= 0) return;
  drawGameCard(ctx, kit.card, t, a, boil);
  drawTextLine(ctx, '10 levels free', CTA.x, CTA.y, CTA.size, 700, a, { fill: PAPER_FILL, halo: '#0d1230' });
  drawTextLine(ctx, 'tap the channel name', CTA.x, CTA.subY, CTA.subSize, 700, a, PAPER_ON_DARK);
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
    card: makeGameCard(),
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
      drawCta(ctx, kit, t, boil);
    },
    audio: renderCrabbirdAudio,
  };
}

