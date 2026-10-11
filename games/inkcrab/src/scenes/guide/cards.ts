import Phaser from 'phaser';
import { BLUE, BLUE_HEX, PAPER_HEX } from '../../art/palette';
import { TEX } from '../../art/textures';
import { CREATURE_GUIDE, creatureName, isBird, SHELL_GUIDE, shellName, shellSeenId, type CreatureEntry, type CreatureId, type ShellEntry } from '../../guide';
import { START_SHELL } from '../../level/goal';
import type { ShellKind } from '../../logic/shells';
import { viewSize } from '../hidpi';
import { HAND_FONT, inkButton, inkText, wobblyRect } from '../ui';
import { fittedPicture } from './picture';

const INK = '#1b1a1f';
const SOFT_INK = '#4a463e';
const LABEL = '#8a8070';
const PENCIL = '#a69c8a';
const PENCIL_HEX = 0xa69c8a;
const CARD_FILL = 0xfffaf0;

/** Something the field guide has a card for: a creature or bird, or a shell. */
export type GuideItem = { readonly type: 'creature'; readonly id: CreatureId } | { readonly type: 'shell'; readonly id: ShellKind };

export const itemName = (item: GuideItem): string => (item.type === 'shell' ? shellName(item.id) : creatureName(item.id));
/** The item's id in the save's met list. */
export const seenId = (item: GuideItem): string => (item.type === 'shell' ? shellSeenId(item.id) : item.id);

/** The hermit crab you play, in the periwinkle it starts in, as on the map. */
const PLAYER_PICTURE = [TEX.crabBack(0), TEX.shell(START_SHELL.kind, 0), TEX.crabFront(0)];

/** The game's own drawing of it: blue ink (never the red of a hunter), a bird hovering, a hermit crab in its shell. */
function texturesOf(item: GuideItem): readonly string[] {
  if (item.type === 'shell') return [TEX.shell(item.id, 0)];
  if (item.id === 'hermit') return PLAYER_PICTURE;
  return [isBird(item.id) ? TEX.bird(item.id, false, false, 0) : TEX.critter(item.id, false, 0)];
}

export const CARD = { w: 150, h: 124 } as const;

/** One tile in a grid: drawing and name when met, a question mark until then. */
export function guideCard(scene: Phaser.Scene, item: GuideItem, met: boolean, x: number, y: number, s: number, onOpen: () => void): Phaser.GameObjects.Container {
  const w = CARD.w * s;
  const h = CARD.h * s;
  const g = scene.add.graphics();
  g.fillStyle(CARD_FILL, met ? 0.95 : 0.55).fillRect(-w / 2, -h / 2, w, h);
  wobblyRect(g, -w / 2, -h / 2, w, h, item.id.length * 17 + 3, 1.6, met ? BLUE_HEX : PENCIL_HEX);
  const parts: Phaser.GameObjects.GameObject[] = [g];
  if (met) {
    parts.push(fittedPicture(scene, texturesOf(item), 0, -12 * s, w * 0.72, h * 0.52));
    parts.push(inkText(scene, 0, h / 2 - 20 * s, itemName(item), 20 * s, BLUE));
  } else {
    parts.push(inkText(scene, 0, -10 * s, '?', 50 * s, PENCIL));
    parts.push(inkText(scene, 0, h / 2 - 20 * s, item.type === 'shell' ? 'not found yet' : 'not met yet', 17 * s, PENCIL));
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

type Rows<E> = readonly (readonly [label: string, key: keyof E])[];
const CREATURE_ROWS: Rows<CreatureEntry> = [
  ['Size', 'size'], ['Weight', 'weight'], ['Lives', 'lifespan'], ['Speed', 'speed'], ['Home', 'habitat'], ['Where', 'range'], ['Eats', 'eats'],
];
const SHELL_ROWS: Rows<ShellEntry> = [['Size', 'size'], ['Home', 'habitat'], ['Where', 'range'], ['Snail eats', 'eats']];

/** The card's figures as label and value pairs, and its scientific name and fact. */
function facts(item: GuideItem): { latin: string; fact: string; rows: (readonly [string, string])[] } {
  if (item.type === 'shell') {
    const e = SHELL_GUIDE[item.id];
    return { latin: e.latin, fact: e.fact, rows: SHELL_ROWS.map(([label, key]) => [label, e[key]] as const) };
  }
  const e = CREATURE_GUIDE[item.id];
  return { latin: e.latin, fact: e.fact, rows: CREATURE_ROWS.map(([label, key]) => [label, e[key]] as const) };
}

/**
 * The full card: the drawing, name and scientific name on the left, the
 * figures in a two-column table on the right, and one striking fact under them.
 */
export function guideDetail(scene: Phaser.Scene, item: GuideItem, s: number, onClose: () => void): Phaser.GameObjects.Container {
  const { width, height } = viewSize(scene);
  const { latin, fact, rows } = facts(item);
  const w = Math.min(width - 24, 820 * s);
  const h = Math.min(height - 24, 500 * s);
  const shade = scene.add.graphics();
  shade.fillStyle(PAPER_HEX, 0.85).fillRect(-width, -height, width * 2, height * 2);
  shade.setInteractive(new Phaser.Geom.Rectangle(-width, -height, width * 2, height * 2), Phaser.Geom.Rectangle.Contains);
  const g = scene.add.graphics();
  g.fillStyle(CARD_FILL, 0.98).fillRect(-w / 2, -h / 2, w, h);
  wobblyRect(g, -w / 2, -h / 2, w, h, 77, 2, BLUE_HEX);
  const left = -w / 2 + 28 * s;
  const picW = w * 0.34;
  const parts: Phaser.GameObjects.GameObject[] = [shade, g];
  parts.push(fittedPicture(scene, texturesOf(item), left + picW / 2, -h / 2 + 115 * s, picW * 0.9, 140 * s));
  parts.push(inkText(scene, left + picW / 2, -h / 2 + 222 * s, itemName(item), 36 * s, BLUE).setWordWrapWidth(picW).setAlign('center'));
  parts.push(scene.add.text(left + picW / 2, -h / 2 + 252 * s, latin, {
    fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: `${16 * s}px`, color: SOFT_INK, align: 'center', wordWrap: { width: picW },
  }).setOrigin(0.5, 0));
  // Figures: a label column and a value column, each value wrapping inside its cell.
  const tableX = left + picW + 26 * s;
  const labelW = 100 * s;
  const valueW = w / 2 - 28 * s - (tableX + labelW);
  let y = -h / 2 + 34 * s;
  for (const [label, value] of rows) {
    parts.push(scene.add.text(tableX, y, label, { fontFamily: HAND_FONT, fontSize: `${20 * s}px`, color: LABEL }));
    const v = scene.add.text(tableX + labelW, y, value, { fontFamily: HAND_FONT, fontSize: `${21 * s}px`, color: INK, wordWrap: { width: valueW } });
    parts.push(v);
    y += Math.max(28 * s, v.height + 6 * s);
  }
  parts.push(scene.add.text(0, Math.max(y + 14 * s, h / 2 - 116 * s), fact, {
    fontFamily: HAND_FONT, fontSize: `${23 * s}px`, color: BLUE, align: 'center', wordWrap: { width: w - 70 * s },
  }).setOrigin(0.5, 0));
  parts.push(inkButton(scene, w / 2 - 80 * s, h / 2 - 32 * s, 'Back', onClose, { width: 120 * s, height: 42 * s, size: 24 * s }));
  return scene.add.container(width / 2, height / 2, parts).setDepth(50);
}
