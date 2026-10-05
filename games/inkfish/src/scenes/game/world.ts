import Phaser from 'phaser';
import { ART_RES, CLOUD_COUNT, cloudKey, ensureDecorTextures, ensureShoreTextures, shoreKey, weedKey } from '../../art/textures';
import { SHORE_SIZE } from '../../art/shoreArt';
import { DECOR_SIZE } from '../../art/decorArt';
import { isGlowDecor } from '../../art/decorGlow';
import { planShore, SHORE_PARALLAX } from '../../levels/shore';
import { hashUnit, SKY, type Seabed } from '../../logic/water';
import { decorKinds, placeDecor, planDecor, type PlacedDecor } from './seabedDecor';
import type { LevelDef, ZoneId } from '../../levels/types';
import { ZONE_DARKNESS } from '../../levels/zones';
import type { WeedKind } from '../../art/propArt';
import { createRng, rangeOf } from '../../logic/rng';
import { makeCanvas } from '../../art/pen';
import { bakeBand, rgba, strokeLine, washTint } from './bake';
import { ringWavelength } from '../../logic/ring';
import type { Ring } from './ring';

const INK = 0x1b1a1f;
const PAPER_HEX = 0xf4eddc;

/** Seabed plants per zone (kelp in the kelp forest, nothing in the dark). */
export const ZONE_WEEDS: Readonly<Record<ZoneId, { readonly kinds: readonly WeedKind[]; readonly count: number; readonly rocks: number }>> = {
  tidepool: { kinds: [1, 2], count: 16, rocks: 9 },
  seagrass: { kinds: [1], count: 30, rocks: 5 },
  kelp: { kinds: [0], count: 26, rocks: 6 },
  reef: { kinds: [2, 1], count: 18, rocks: 14 },
  wreck: { kinds: [0, 2], count: 8, rocks: 10 },
  dropoff: { kinds: [2], count: 5, rocks: 8 },
  twilight: { kinds: [], count: 0, rocks: 7 },
  midnight: { kinds: [], count: 0, rocks: 6 },
  abyss: { kinds: [], count: 0, rocks: 5 },
  trench: { kinds: [], count: 0, rocks: 9 },
};

/** What drawWorld put in the water: the boiling weeds, the seabed scenery, and everything that stays put (for culling). */
export interface DrawnWorld {
  readonly weeds: Phaser.GameObjects.Image[];
  readonly decor: PlacedDecor[];
  readonly fixed: Phaser.GameObjects.Image[];
}

/** One "~" current mark: every mark has this same shape, so they share one texture. */
const MARK = { key: 'current-mark', w: 52, h: 10, step: 8, wave: 3 } as const;
/** Sand dot radius range, and how far the floor line wobbles: margins for the baked band. */
const SAND_MAX_R = 0.95;

/**
 * Paper, depth wash, surface and the level's own seabed with its scenery; with
 * `sky`, open air above the surface too. The static pen work (surface lines,
 * sand, floor line, current marks) is baked into textures, and the wash is a
 * tint on the paper, so none of it is re-tessellated or overdrawn every frame.
 * Everything meets itself where x = width wraps round to 0 (see logic/ring.ts).
 */
export function drawWorld(scene: Phaser.Scene, level: LevelDef, zone: ZoneId, seabed: Seabed, ring: Ring, sky = false): DrawnWorld {
  const dark = ZONE_DARKNESS[zone];
  const flora = ZONE_WEEDS[zone];
  const { width, height } = level.world;
  // Seeded by the whole level id, so every level lays out its own seabed.
  // Its draws must stay in this order: rocks and weeds below come from the same stream.
  const rng = createRng(Math.floor(hashUnit(level.id, 7) * 1e6) + 1);
  const top = sky ? -SKY.height : 0;
  const fixed: Phaser.GameObjects.Image[] = [];
  // With open sky the water starts at the surface line; the air stays plain paper.
  // Deeper zones get a heavier ink wash, darkening with depth: a vertical gradient
  // laid on the paper as a corner tint instead of a second full-screen layer.
  const waterFrom = sky ? SKY.surfaceY : 0;
  if (sky) ring.follow(scene.add.tileSprite(0, top, width, waterFrom - top, 'paper').setOrigin(0).setDepth(0));
  const color = dark > 0.5 ? 0x1c2a4a : 0x2c4f86;
  const tintTop = washTint(PAPER_HEX, color, Math.min(1, 0.012 * (1 + dark * 5)));
  const tintBottom = washTint(PAPER_HEX, color, Math.min(1, 0.095 * (1 + dark * 5)));
  ring.follow(scene.add.tileSprite(0, waterFrom, width, height - waterFrom, 'paper').setOrigin(0).setDepth(0)
    .setTilePosition(0, waterFrom - top).setTint(tintTop, tintTop, tintBottom, tintBottom));
  if (sky) {
    drawSky(scene, width, rng, fixed);
    drawShoreline(scene, level.id, zone, width, ring);
  }

  // Surface: a wavy double pen line. Deep down there is no surface in sight, just more dark water.
  if (sky) {
    const swell = ringWavelength(70, width);
    const upper = wobblyPoints(width, (x) => SKY.surfaceY + Math.sin(x / swell) * 6, rng);
    const lower = wobblyPoints(width, (x) => SKY.surfaceY + 12 + Math.sin(x / swell + 1) * 5, rng);
    const band = { x0: 0, x1: width, top: SKY.surfaceY - 10, height: 32 };
    fixed.push(...bakeBand(scene, 'surface', band, ART_RES, 2, (ctx) => {
      strokeLine(ctx, upper, 1.4, INK, 0.75);
      strokeLine(ctx, lower, 0.7, INK, 0.3);
    }));
  }
  // Current strokes: little "~" marks scattered through the water.
  ensureMarkTexture(scene);
  for (let i = 0; i < 90; i++) {
    const x = rng() * width;
    const y = rangeOf(rng, 140, height - 220);
    fixed.push(scene.add.image(x - 1, y - MARK.h / 2, MARK.key).setOrigin(0).setScale(1 / ART_RES).setDepth(2));
  }
  // Sea floor with stippled sand, denser away from the surface of the floor.
  const floor = seabed.floorAt;
  const outline: (readonly [number, number])[] = [];
  for (let x = 0; x < width; x += 20) outline.push([x, floor(x)]);
  outline.push([width, floor(width)]);
  const floorLine = wobblyPoints(width, floor, rng);
  const sand = Array.from({ length: 2600 }, () => {
    const x = rng() * width;
    const depth = rng();
    return { x, y: floor(x) + 4 + depth * depth * (height - floor(x)), alpha: 0.25 + depth * 0.35, r: rng() * 0.7 + 0.25 };
  });
  const sandTop = Math.min(...outline.map(([, y]) => y), ...floorLine.map(([, y]) => y)) - 4;
  fixed.push(...bakeBand(scene, 'seabed', { x0: 0, x1: width, top: sandTop, height: height - sandTop }, ART_RES, 2, (ctx, fromX, toX) => {
    ctx.fillStyle = rgba(0xe6d8b8, 0.6);
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (const [x, y] of outline) ctx.lineTo(x, y);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    strokeLine(ctx, floorLine, 1.3, INK, 0.85);
    for (const d of sand) {
      if (d.x < fromX - SAND_MAX_R || d.x > toX + SAND_MAX_R) continue;
      ctx.fillStyle = rgba(INK, d.alpha);
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }));

  const plan = planDecor(level.id, zone, width);
  ensureDecorTextures(scene, decorKinds(plan));
  const decor = placeDecor(scene, plan, floor, 1);
  fixed.push(...decor.map((d) => d.sprite));

  // Rock and weed counts vary level to level around the zone's usual.
  const rocks = Math.round(flora.rocks * rangeOf(rng, 0.5, 1.4));
  // Boulders stand in front of the landmark, so keep them off a glowing one: its light would shine through them.
  const glowing = plan.filter((d) => d.landmark && isGlowDecor(d.kind));
  const clear = (x: number): boolean => glowing.every((d) => Math.abs(x - d.x) > (DECOR_SIZE[d.kind].w * d.scale) / 2 + 60);
  for (let i = 0; i < rocks; i++) {
    const x = rangeOf(rng, 0, width);
    const scale = rangeOf(rng, 0.8, 1.3);
    const flip = rng() < 0.5;
    if (!clear(x)) continue;
    // Origin near the bottom so the rock sits down into the sand.
    fixed.push(scene.add.image(x, floor(x) + 10, `rock-${i % 3}`).setOrigin(0.5, 0.94).setDepth(3).setScale(scale / ART_RES).setFlipX(flip));
  }
  // Scales are capped so weeds are never magnified past their texture.
  if (flora.kinds.length === 0) return { weeds: [], decor, fixed };
  const weeds = Array.from({ length: Math.round(flora.count * rangeOf(rng, 0.55, 1.35)) }, () => {
    const x = rangeOf(rng, 0, width);
    const kind = flora.kinds[Math.floor(rng() * flora.kinds.length)]!;
    return scene.add.image(x, floor(x) + 10, weedKey(kind, 0)).setOrigin(0.5, 1).setDepth(4)
      .setScale(rangeOf(rng, 0.75, 1.15) / ART_RES).setFlipX(rng() < 0.5).setData('kind', kind).setData('phase', rng() * Math.PI * 2);
  });
  return { weeds, decor, fixed: [...fixed, ...weeds] };
}

/** The shared "~" texture: a short wavy stroke, drawn at ART_RES with a pixel of room around it. */
function ensureMarkTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(MARK.key)) return;
  const { canvas, ctx } = makeCanvas(MARK.w * ART_RES, MARK.h * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  const pts = Array.from({ length: 7 }, (_, k) => [1 + k * MARK.step, MARK.h / 2 + Math.sin(k * 1.4) * MARK.wave] as const);
  strokeLine(ctx, pts, 0.8, INK, 0.16);
  scene.textures.addCanvas(MARK.key, canvas);
}

/** A few loose clouds drifting in the open air above the surface. */
function drawSky(scene: Phaser.Scene, width: number, rng: () => number, into: Phaser.GameObjects.Image[]): void {
  const count = Math.round(width / 700 + rng() * 2);
  for (let i = 0; i < count; i++) {
    const x = (width / count) * (i + rangeOf(rng, 0.1, 0.9));
    const y = rangeOf(rng, -SKY.height + 50, -70);
    into.push(scene.add.image(x, y, cloudKey(Math.floor(rng() * CLOUD_COUNT))).setDepth(1)
      .setScale(rangeOf(rng, 0.6, 1.1) / ART_RES).setAlpha(0.85).setFlipX(rng() < 0.5));
  }
}

/** Islands, rocks and lighthouses on the horizon, scrolling slower than the water so they read as far off. */
function drawShoreline(scene: Phaser.Scene, levelId: string, zone: ZoneId, width: number, ring: Ring): void {
  const plan = planShore(levelId, zone, width);
  ensureShoreTextures(scene, plan.map((p) => p.kind));
  const pieces = plan.map((p) => {
    const { h } = SHORE_SIZE[p.kind];
    return scene.add.image(p.x, SKY.surfaceY + 3, shoreKey(p.kind)).setOrigin(0.5, (h - 4) / h)
      .setScrollFactor(SHORE_PARALLAX, 1).setScale(p.scale / ART_RES).setAlpha(p.far ? 0.5 : 0.9).setDepth(p.far ? 1.4 : 1.5);
  });
  ring.addParallax(pieces, SHORE_PARALLAX, width);
}

/**
 * Seaweed rooted at its base: a slow sway in still water; in a current it
 * leans downstream and flutters harder, in gusts. `current` is in world
 * units per second (sign = direction).
 */
export function swayWeeds(weeds: readonly Phaser.GameObjects.Image[], current: number, now: number): void {
  const t = now / 1000;
  const lean = Math.sign(current) * Math.min(WEED_SWAY.maxLean, Math.abs(current) * WEED_SWAY.leanPerCurrent);
  const amp = current ? WEED_SWAY.currentAmp : WEED_SWAY.calmAmp;
  const speed = current ? WEED_SWAY.currentSpeed : WEED_SWAY.calmSpeed;
  for (const w of weeds) {
    const phase = (w.getData('phase') as number | undefined) ?? 0;
    // A gust rolls along the seabed: weeds further downstream catch it a moment later.
    const gust = current ? 0.75 + 0.25 * Math.sin(t * 0.7 - w.x / 260) : 1;
    w.setRotation(lean * gust + Math.sin(t * speed + phase) * amp);
  }
}

const WEED_SWAY = { maxLean: 0.32, leanPerCurrent: 0.0028, calmAmp: 0.05, currentAmp: 0.08, calmSpeed: 0.9, currentSpeed: 2.2 } as const;

/** A pen line along `yAt`, every 12 px, with a little hand jitter; both ends unjittered at x = 0 and `width`, so laps of the ring join up. */
function wobblyPoints(width: number, yAt: (x: number) => number, rng: () => number): (readonly [number, number])[] {
  const pts: (readonly [number, number])[] = [[0, yAt(0)]];
  for (let x = 12; x < width; x += 12) pts.push([x, yAt(x) + (rng() - 0.5) * 1.6]);
  pts.push([width, yAt(width)]);
  return pts;
}
