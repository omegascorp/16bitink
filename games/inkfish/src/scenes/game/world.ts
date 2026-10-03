import Phaser from 'phaser';
import { ART_RES, WEED_KINDS, weedKey } from '../../art/textures';
import type { LevelDef } from '../../levels/types';
import { createRng, rangeOf } from '../../logic/rng';

const INK = 0x1b1a1f;

/** Paper, depth wash, surface and sea-floor sketch. Returns boiling weed sprites. */
export function drawWorld(scene: Phaser.Scene, level: LevelDef): Phaser.GameObjects.Image[] {
  const { width, height } = level.world;
  const rng = createRng(level.id.length * 97 + level.chapter);
  scene.add.tileSprite(0, 0, width, height, 'paper').setOrigin(0).setDepth(0);

  const wash = scene.add.graphics().setDepth(1);
  const bands = 12;
  for (let i = 0; i < bands; i++) {
    wash.fillStyle(0x2c4f86, 0.012 + i * 0.0075);
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
  const floor = (x: number): number => height - 70 - Math.sin(x / 160) * 18 - Math.sin(x / 47) * 5;
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

  for (let i = 0; i < 9; i++) {
    const x = rangeOf(rng, 0, width);
    // Origin near the bottom so the rock sits down into the sand.
    scene.add.image(x, floor(x) + 10, `rock-${i % 3}`).setOrigin(0.5, 0.94).setDepth(3)
      .setScale(rangeOf(rng, 0.8, 1.3) / ART_RES).setFlipX(rng() < 0.5);
  }
  // Scales are capped so weeds are never magnified past their texture.
  return Array.from({ length: 18 }, () => {
    const x = rangeOf(rng, 0, width);
    const kind = WEED_KINDS[Math.floor(rng() * WEED_KINDS.length)]!;
    return scene.add.image(x, floor(x) + 10, weedKey(kind, 0)).setOrigin(0.5, 1).setDepth(4)
      .setScale(rangeOf(rng, 0.75, 1.15) / ART_RES).setFlipX(rng() < 0.5).setData('kind', kind);
  });
}

function wobblyPath(g: Phaser.GameObjects.Graphics, width: number, yAt: (x: number) => number, rng: () => number): void {
  g.beginPath();
  g.moveTo(0, yAt(0));
  for (let x = 12; x <= width; x += 12) g.lineTo(x, yAt(x) + (rng() - 0.5) * 1.6);
  g.strokePath();
}
