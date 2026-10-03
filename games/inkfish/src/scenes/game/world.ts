import Phaser from 'phaser';
import { ART_RES, ensureDecorTextures, weedKey } from '../../art/textures';
import { hashUnit, type Seabed } from '../../logic/water';
import { decorKinds, placeDecor, planDecor } from './seabedDecor';
import type { LevelDef, ZoneId } from '../../levels/types';
import { ZONE_DARKNESS } from '../../levels/zones';
import type { WeedKind } from '../../art/propArt';
import { createRng, rangeOf } from '../../logic/rng';

const INK = 0x1b1a1f;

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

/** Paper, depth wash, surface and the level's own seabed with its scenery. Returns boiling weed sprites. */
export function drawWorld(scene: Phaser.Scene, level: LevelDef, zone: ZoneId, seabed: Seabed): Phaser.GameObjects.Image[] {
  const dark = ZONE_DARKNESS[zone];
  const flora = ZONE_WEEDS[zone];
  const { width, height } = level.world;
  // Seeded by the whole level id, so every level lays out its own seabed.
  const rng = createRng(Math.floor(hashUnit(level.id, 7) * 1e6) + 1);
  scene.add.tileSprite(0, 0, width, height, 'paper').setOrigin(0).setDepth(0);

  const wash = scene.add.graphics().setDepth(1);
  const bands = 12;
  for (let i = 0; i < bands; i++) {
    // Deeper zones get a heavier ink wash.
    wash.fillStyle(dark > 0.5 ? 0x1c2a4a : 0x2c4f86, (0.012 + i * 0.0075) * (1 + dark * 5));
    wash.fillRect(0, (i / bands) * height, width, height / bands + 1);
  }

  const lines = scene.add.graphics().setDepth(2);
  // Surface: a wavy double pen line.
  lines.lineStyle(1.4, INK, 0.75);
  wobblyPath(lines, width, (x) => 60 + Math.sin(x / 70) * 6, rng);
  lines.lineStyle(0.7, INK, 0.3);
  wobblyPath(lines, width, (x) => 72 + Math.sin(x / 70 + 1) * 5, rng);
  // Current strokes: little "~" marks scattered through the water.
  lines.lineStyle(0.8, INK, 0.16);
  for (let i = 0; i < 90; i++) {
    const x = rng() * width;
    const y = rangeOf(rng, 140, height - 220);
    lines.beginPath();
    lines.moveTo(x, y);
    for (let k = 1; k <= 6; k++) lines.lineTo(x + k * 8, y + Math.sin(k * 1.4) * 3);
    lines.strokePath();
  }
  // Sea floor with stippled sand.
  const floor = seabed.floorAt;
  lines.fillStyle(0xe6d8b8, 0.6);
  lines.beginPath();
  lines.moveTo(0, height);
  for (let x = 0; x <= width; x += 20) lines.lineTo(x, floor(x));
  lines.lineTo(width, height);
  lines.closePath();
  lines.fillPath();
  lines.lineStyle(1.3, INK, 0.85);
  wobblyPath(lines, width, floor, rng);
  // Sand: fine stipple, denser away from the surface of the floor.
  for (let i = 0; i < 2600; i++) {
    const x = rng() * width;
    const depth = rng();
    lines.fillStyle(INK, 0.25 + depth * 0.35);
    lines.fillCircle(x, floor(x) + 4 + depth * depth * (height - floor(x)), rng() * 0.7 + 0.25);
  }

  const plan = planDecor(level.id, zone, width);
  ensureDecorTextures(scene, decorKinds(plan));
  placeDecor(scene, plan, floor, 1);

  // Rock and weed counts vary level to level around the zone's usual.
  const rocks = Math.round(flora.rocks * rangeOf(rng, 0.5, 1.4));
  for (let i = 0; i < rocks; i++) {
    const x = rangeOf(rng, 0, width);
    // Origin near the bottom so the rock sits down into the sand.
    scene.add.image(x, floor(x) + 10, `rock-${i % 3}`).setOrigin(0.5, 0.94).setDepth(3)
      .setScale(rangeOf(rng, 0.8, 1.3) / ART_RES).setFlipX(rng() < 0.5);
  }
  // Scales are capped so weeds are never magnified past their texture.
  if (flora.kinds.length === 0) return [];
  return Array.from({ length: Math.round(flora.count * rangeOf(rng, 0.55, 1.35)) }, () => {
    const x = rangeOf(rng, 0, width);
    const kind = flora.kinds[Math.floor(rng() * flora.kinds.length)]!;
    return scene.add.image(x, floor(x) + 10, weedKey(kind, 0)).setOrigin(0.5, 1).setDepth(4)
      .setScale(rangeOf(rng, 0.75, 1.15) / ART_RES).setFlipX(rng() < 0.5).setData('kind', kind).setData('phase', rng() * Math.PI * 2);
  });
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

function wobblyPath(g: Phaser.GameObjects.Graphics, width: number, yAt: (x: number) => number, rng: () => number): void {
  g.beginPath();
  g.moveTo(0, yAt(0));
  for (let x = 12; x <= width; x += 12) g.lineTo(x, yAt(x) + (rng() - 0.5) * 1.6);
  g.strokePath();
}
