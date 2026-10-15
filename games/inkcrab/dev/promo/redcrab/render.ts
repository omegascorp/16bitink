import { CRITTER_FRAME, CRITTER_GROUND } from '../../../src/art/critterArt';
import { RED } from '../../../src/art/palette';
import { drawSpokenLine } from '../captions';
import { bakeSprite, crabSprite, drawSprite, shellSprite, type Sprite } from '../sprites';
import { VIDEO, type Short } from '../short';
import { renderRedCrabAudio } from './audio';
import { CROWD, hermitPose, leadPose, motherPose, type Pose, walkerPose } from './crowd';
import { depthScale, depthY, DECK, WORLD } from './layout';
import { drawMapCard } from './mapCard';
import { arrow, callout, drawCounter, drawEggCloud, drawMoon, drawNight, drawPhases } from './overlays';
import { car, fence, flowers, house, ranger, roadblock, tree } from './props';
import { redCrab } from './redCrabArt';
import {
  barrierAt, boilAt, bridgeFlashAt, builtAt, cameraAt, captionAt, carAt, counterAt, counterPulseAt, EGG_PUFFS, eggPuffAt, HOUSE_CRABS, houseCrabAt,
  labelAt, LOOP_S, mapAt, moonAt, MOTHERS, nightAt, phasesAt, pinAt, rangerAt, seaLabelAt, seaNudgeAt, surgeAt,
} from './story';
import { drawBridgeBack, drawBridgeFlash, drawBridgeFront, drawGround, drawSky, drawStanding, type Scenery } from './world';

/** Draws the "fifty million crabs march to the sea" short (story.ts has the choreography, layout.ts the island). */

/** Where the crabs on the house sit, relative to its ground point: on the step, the walls, the sill and the roof, and how they're turned. */
const ON_HOUSE: readonly (readonly [number, number, number])[] = [
  [-8, -14, 0], [-152, -70, -Math.PI / 2], [96, -72, 0], [-90, -232, -0.62], [70, -246, 0.62], [150, -120, Math.PI / 2],
];
const FLOWERS: readonly (readonly [number, number])[] = Array.from({ length: 6 }, (_, i) => [WORLD.garden[0] + 20 + i * 44, 0.06 + 0.07 * (i % 3)] as const);

interface Thing {
  readonly depth: number;
  readonly draw: () => void;
}

export function createRedCrab(ctx: CanvasRenderingContext2D): Short {
  const red = bakeSprite(CRITTER_FRAME, 2, CRITTER_GROUND, 4100, redCrab);
  const scenery: Scenery = {
    trees: [0, 1, 2].map((v) => bakeSprite(480, 1, 210, 4200 + v * 10, (d) => tree(d, v))),
    house: bakeSprite(400, 1, 150, 4300, house),
    fence: bakeSprite(180, 1, 60, 4310, fence),
  };
  const bloom = [0, 1, 2].map((v) => bakeSprite(80, 1.5, 30, 4320 + v, (d) => flowers(d, v)));
  const block = bakeSprite(340, 1, 160, 4400, roadblock);
  const warden = bakeSprite(240, 1, 110, 4410, ranger);
  const auto = bakeSprite(200, 1.5, 70, 4420, car);
  const hermit = { back: crabSprite('back'), shell: shellSprite('whelk'), front: crabSprite('front') };

  const crab = (pose: Pose, boil: number, sprite: Sprite = red): void => {
    if (pose.alpha <= 0.01) return;
    drawSprite(ctx, sprite, boil + pose.boil, { x: pose.x, y: pose.y, scale: pose.scale, rotation: pose.tilt, alpha: pose.alpha });
  };
  const hermitAt = (pose: Pose, boil: number): void => {
    const at = { x: pose.x, y: pose.y, scale: 0.62 * pose.scale, rotation: pose.tilt, alpha: pose.alpha };
    for (const s of [hermit.back, hermit.shell, hermit.front]) drawSprite(ctx, s, boil, at);
  };

  /** The rangers' barrier dropping onto road B, and a ranger stepping in beside it. */
  const drawRoadClosed = (t: number, cam: number, boil: number): void => {
    const drop = barrierAt(t);
    if (drop > 0) drawSprite(ctx, block, boil, { x: WORLD.roadB - cam, y: depthY(0) - (1 - drop) ** 2 * 260, scale: 0.9, alpha: Math.min(1, drop * 3) });
    const walk = rangerAt(t);
    if (walk > 0) drawSprite(ctx, warden, boil, { x: WORLD.roadB + 190 - cam + (1 - walk) * 140, y: depthY(0.04), scale: 1, alpha: walk });
  };

  /** Crabs popping up on the house as "even houses" is said. */
  const drawHouseCrabs = (t: number, cam: number, boil: number): void => {
    for (let i = 0; i < HOUSE_CRABS; i++) {
      const pop = houseCrabAt(i, t);
      const [dx, dy, turn] = ON_HOUSE[i]!;
      if (pop > 0) drawSprite(ctx, red, boil + i, { x: WORLD.house + dx - cam, y: depthY(0) + 4 + dy, scale: 0.55 * pop, rotation: turn, alpha: Math.min(1, pop * 2) });
    }
  };

  /** The car driving away along road C, under the deck. */
  const carDepth = (u: number): number => 1 - 1.1 * u;
  const drawCar = (t: number, cam: number, boil: number): void => {
    const u = carAt(t);
    if (u <= 0 || u >= 1) return;
    const depth = carDepth(u);
    drawSprite(ctx, auto, boil, { x: WORLD.roadC - cam, y: depthY(depth), scale: 0.85 * depthScale(depth), alpha: Math.min(1, (1 - u) * 6) });
  };

  const things = (t: number, boil: number): Thing[] => {
    const list: Thing[] = [];
    CROWD.forEach((w, i) => {
      const pose = walkerPose(w, i, t);
      if (pose.alpha > 0.01 && pose.x > -110 && pose.x < VIDEO.width + 110) list.push({ depth: pose.depth, draw: () => crab(pose, boil) });
    });
    const lead = leadPose(t);
    list.push({ depth: lead.depth, draw: () => crab(lead, boil) });
    const h = hermitPose(t);
    list.push({ depth: h.depth, draw: () => hermitAt(h, boil) });
    MOTHERS.forEach((_, i) => {
      const m = motherPose(i, t);
      if (m.alpha > 0.01) list.push({ depth: m.depth, draw: () => crab(m, boil) });
    });
    const cam = cameraAt(t);
    FLOWERS.forEach(([x, depth], i) => {
      const sx = x - cam;
      if (sx > -60 && sx < VIDEO.width + 60) list.push({ depth, draw: () => drawSprite(ctx, bloom[i % 3]!, boil, { x: sx, y: depthY(depth), scale: 1.2 * depthScale(depth) }) });
    });
    return list.sort((a, b) => a.depth - b.depth);
  };

  const drawEggs = (t: number): void => {
    EGG_PUFFS.forEach((p, i) => {
      const u = eggPuffAt(i, t);
      if (u <= 0 || u >= 1) return;
      const m = motherPose(p.mother, p.t);
      drawEggCloud(ctx, { x: m.x + 34 * m.scale, y: m.y - 18 * m.scale }, u, i, m.scale);
    });
  };

  const drawLabels = (t: number, cam: number): void => {
    const lead = leadPose(t);
    callout(ctx, 'red crab', { x: lead.x + 170, y: lead.y - 175 }, { x: lead.x + 20, y: lead.y - 60 }, labelAt('redcrab', t), 72);
    callout(ctx, 'forest', { x: 330, y: 330 }, null, labelAt('forest', t), 80);
    const coast = labelAt('coast', t);
    arrow(ctx, { x: 600, y: 505 }, { x: 790, y: 505 }, coast);
    callout(ctx, 'coast', { x: 900, y: 525 }, null, coast, 80);
    const road = WORLD.roadA - cam;
    callout(ctx, 'road', { x: road, y: 560 }, { x: road, y: 720 }, labelAt('road', t), 72);
    const garden = (WORLD.garden[0] + WORLD.garden[1]) / 2 - cam;
    callout(ctx, 'garden', { x: garden, y: 520 }, { x: garden, y: 640 }, labelAt('garden', t), 72);
    const home = WORLD.house - cam;
    callout(ctx, 'house', { x: home + 260, y: 360 }, { x: home + 110, y: 470 }, labelAt('house', t), 72);
    const guard = WORLD.roadB + 190 - cam;
    callout(ctx, 'ranger', { x: guard + 120, y: 380 }, { x: guard + 10, y: 470 }, labelAt('rangers', t), 64);
    callout(ctx, 'crab bridge', { x: VIDEO.width / 2, y: 470 }, { x: WORLD.roadC - cam, y: depthY(DECK.far) - 182 }, labelAt('bridge', t), 100);
    const first = motherPose(0, t);
    callout(ctx, 'mothers', { x: first.x - 150, y: first.y - 150 }, { x: first.x - 20, y: first.y - 60 }, labelAt('mothers', t), 72);
    const cloud = motherPose(1, t);
    callout(ctx, 'eggs', { x: cloud.x + 230, y: cloud.y - 190 }, { x: cloud.x + 110, y: cloud.y - 40 }, labelAt('eggs', t), 80);
    callout(ctx, 'next year', { x: VIDEO.width / 2, y: 420 }, null, labelAt('next', t), 110);
    // The hook: the number, and the way to the sea.
    drawCounter(ctx, counterAt(t), counterPulseAt(t));
    const sea = seaLabelAt(t);
    const nudge = 30 * seaNudgeAt(t);
    arrow(ctx, { x: 640 + nudge, y: 575 }, { x: 800 + nudge, y: 575 }, sea);
    callout(ctx, 'sea', { x: 890 + nudge, y: 595 }, null, sea, 84);
  };

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % 3;
    const cam = cameraAt(t);
    const built = builtAt(t);
    drawSky(ctx, cam, boil);
    drawGround(ctx, cam, boil, surgeAt(t), t);
    drawStanding(ctx, cam, boil, scenery);
    drawHouseCrabs(t, cam, boil);
    drawRoadClosed(t, cam, boil);
    const carBehind = carDepth(carAt(t)) < DECK.near;
    drawBridgeBack(ctx, cam, boil, built, () => {
      if (carBehind) drawCar(t, cam, boil);
    });
    drawBridgeFlash(ctx, cam, bridgeFlashAt(t), RED);
    if (!carBehind) drawCar(t, cam, boil);
    for (const thing of things(t, boil)) thing.draw();
    drawBridgeFront(ctx, cam, boil, built);
    drawEggs(t);
    drawNight(ctx, nightAt(t));
    drawMoon(ctx, moonAt(t));
    drawPhases(ctx, phasesAt(t));
    drawLabels(t, cam);
    drawMapCard(ctx, mapAt(t), pinAt(t), boil);
    const now = captionAt(t);
    if (now) drawSpokenLine(ctx, now.line.words.map((w) => w.text), now.word);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderRedCrabAudio };
}
