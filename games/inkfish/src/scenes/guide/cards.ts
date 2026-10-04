import Phaser from 'phaser';
import { viewSize } from '../hidpi';
import { isCritter } from '../../art/critterArt';
import { isSquid } from '../../art/squidArt';
import { bodyProportions, type FishShape } from '../../art/fishArt';
import { birdKey, ensureBirdTextures, ensureFishTextures, ensureJellyTextures, fishKey, jellyKey } from '../../art/textures';
import { GUIDE, guideArt, guideName, type GuideEntry, type GuideId } from '../../guide';
import type { BirdId } from '../../logic/birds';
import type { JellyId } from '../../levels/jellies';
import { BLUE_INK, HAND_FONT, inkButton, inkText, wobblyRect } from '../ui';

/** The creature's drawing, fitted inside a w x h box. */
export function creaturePicture(scene: Phaser.Scene, id: GuideId, x: number, y: number, w: number, h: number): Phaser.GameObjects.Image {
  if (guideArt(id) === 'bird') {
    ensureBirdTextures(scene, [id as BirdId]);
    const img = scene.add.image(x, y, birdKey(id as BirdId, 1));
    // The bird fills only the middle of its texture.
    return img.setScale(Math.min(w / img.width, h / img.height) * 2);
  }
  if (guideArt(id) === 'jelly') {
    ensureJellyTextures(scene, [id as JellyId]);
    const img = scene.add.image(x, y, jellyKey(id as JellyId, 0));
    return img.setScale(Math.min(w / img.width, h / img.height) * 1.15);
  }
  const shape = id as FishShape;
  ensureFishTextures(scene, [shape], ['light']);
  if (isSquid(shape)) {
    // The squid's portrait includes its arms: fit the whole picture.
    const img = scene.add.image(x, y, fishKey(shape, 'light', 0));
    return img.setScale(Math.min(w / img.width, h / img.height) * 1.25);
  }
  const a = bodyProportions(shape);
  // Crabs and lobsters reach out with legs and claws well past their body.
  const reach = isCritter(shape) ? 0.6 : 1;
  return scene.add.image(x, y, fishKey(shape, 'light', 0)).setScale(Math.min(w / (a.hl * 2.3), h / (a.hh * 3)) * reach);
}

export const CARD = { w: 170, h: 140 } as const;

/** One tile in the grid: picture and name when met, a question mark when not. */
export function guideCard(scene: Phaser.Scene, id: GuideId, met: boolean, x: number, y: number, s: number, onOpen: () => void): Phaser.GameObjects.Container {
  const w = CARD.w * s;
  const h = CARD.h * s;
  const g = scene.add.graphics();
  g.fillStyle(0xfffaf0, met ? 0.95 : 0.55).fillRect(-w / 2, -h / 2, w, h);
  wobblyRect(g, -w / 2, -h / 2, w, h, id.length * 17 + 3, 1.6, met ? 0x1b1a1f : 0xa69c8a);
  const parts: Phaser.GameObjects.GameObject[] = [g];
  if (met) {
    parts.push(creaturePicture(scene, id, 0, -14 * s, w * 0.8, h * 0.5));
    parts.push(inkText(scene, 0, h / 2 - 22 * s, guideName(id), 22 * s, BLUE_INK));
  } else {
    parts.push(inkText(scene, 0, -12 * s, '?', 54 * s, '#a69c8a'));
    parts.push(inkText(scene, 0, h / 2 - 22 * s, 'not met yet', 18 * s, '#a69c8a'));
  }
  const c = scene.add.container(x, y, parts).setSize(w, h);
  if (met) {
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => c.setScale(1.04));
    c.on('pointerout', () => c.setScale(1));
    c.on('pointerup', onOpen);
  }
  return c;
}

const ROWS: readonly (readonly [string, keyof GuideEntry])[] = [
  ['Length', 'length'], ['Weight', 'weight'], ['Lives', 'lifespan'], ['Speed', 'speed'],
  ['Depth', 'depth'], ['Where', 'range'], ['Eats', 'eats'],
];

/**
 * The full card for one creature: its drawing, name and scientific name, the
 * figures in a two-column table, and one striking fact.
 */
export function guideDetail(scene: Phaser.Scene, id: GuideId, s: number, onClose: () => void): Phaser.GameObjects.Container {
  const { width, height } = viewSize(scene);
  const e = GUIDE[id];
  const w = Math.min(width - 24, 820 * s);
  const h = Math.min(height - 24, 520 * s);
  const shade = scene.add.graphics();
  shade.fillStyle(0xf4eddc, 0.85).fillRect(-width, -height, width * 2, height * 2);
  shade.setInteractive(new Phaser.Geom.Rectangle(-width, -height, width * 2, height * 2), Phaser.Geom.Rectangle.Contains);
  const g = scene.add.graphics();
  g.fillStyle(0xfffaf0, 0.98).fillRect(-w / 2, -h / 2, w, h);
  wobblyRect(g, -w / 2, -h / 2, w, h, 77);
  const left = -w / 2 + 28 * s;
  const picW = w * 0.36;
  const parts: Phaser.GameObjects.GameObject[] = [shade, g];
  parts.push(creaturePicture(scene, id, left + picW / 2, -h / 2 + 120 * s, picW, 150 * s));
  parts.push(inkText(scene, left + picW / 2, -h / 2 + 230 * s, guideName(id), 40 * s, BLUE_INK));
  parts.push(scene.add.text(left + picW / 2, -h / 2 + 262 * s, e.latin, { fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: `${17 * s}px`, color: '#5b5446', align: 'center', wordWrap: { width: picW } }).setOrigin(0.5, 0));
  // Figures: label column and value column, each value wrapping inside its cell.
  const tableX = left + picW + 30 * s;
  const valueW = w / 2 - 28 * s - (tableX + 96 * s);
  let y = -h / 2 + 36 * s;
  for (const [label, key] of ROWS) {
    parts.push(scene.add.text(tableX, y, label, { fontFamily: HAND_FONT, fontSize: `${21 * s}px`, color: '#8a8070' }));
    const value = scene.add.text(tableX + 96 * s, y, e[key], { fontFamily: HAND_FONT, fontSize: `${22 * s}px`, color: '#1b1a1f', wordWrap: { width: valueW } });
    parts.push(value);
    y += Math.max(30 * s, value.height + 6 * s);
  }
  const fact = scene.add.text(0, Math.max(y + 14 * s, h / 2 - 120 * s), e.fact, {
    fontFamily: HAND_FONT, fontSize: `${24 * s}px`, color: BLUE_INK, align: 'center', wordWrap: { width: w - 70 * s },
  }).setOrigin(0.5, 0);
  parts.push(fact);
  parts.push(inkButton(scene, w / 2 - 80 * s, h / 2 - 34 * s, 'Back', onClose, { width: 120 * s, height: 44 * s, size: 24 * s }));
  return scene.add.container(width / 2, height / 2, parts).setDepth(50);
}
