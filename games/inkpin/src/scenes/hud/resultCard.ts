import type Phaser from 'phaser';
import { INK, RED } from '../../art/palette';
import type { LevelDef } from '../../logic/level';
import type { Result } from '../GameScene';
import { DPR } from '../hidpi';
import { lossText } from '../lossLines';
import { HAND, paintedButton, paperCard, UI_RES, UI_TEX } from '../uiPaint';

const SOFT_INK = '#3e4168';
const FADED = '#9a927f';
const SEED = 23;

export interface ResultActions {
  readonly again: () => void;
  readonly map: () => void;
  readonly next: (index: number) => void;
  readonly buy: () => void;
}

/** The card's height for a result: room for the blots and a way on when won. */
export function resultHeight(r: Result): number {
  return r.won ? 392 : 300;
}

/**
 * The end of a level, on a page torn from Nib's journal: the outcome, the
 * haul and the bank, three ink blots (done, every coin, first try), and
 * painted buttons, the way on biggest. Centred on (0, 0) in its container.
 */
export function resultCard(scene: Phaser.Scene, r: Result, level: LevelDef | undefined, width: number, act: ResultActions): Phaser.GameObjects.Container {
  const w = Math.round(Math.min(380, width - 28) / 8) * 8;
  const h = resultHeight(r);
  const text = (y: number, line: string, size: number, color: string, bold = false, wrap = w - 48): Phaser.GameObjects.Text =>
    scene.add.text(0, y, line, { fontFamily: HAND, fontSize: `${size}px`, fontStyle: bold ? '700' : '500', color, align: 'center', wordWrap: { width: wrap }, padding: { x: 6, y: 2 } }).setOrigin(0.5, 0).setResolution(DPR);
  const seed = SEED + (r.won ? 0 : 1);
  const parts: Phaser.GameObjects.GameObject[] = [paperCard(scene, 0, 0, w, h, seed, { tint: 'parchment', rule: true, tapes: ['tl', 'tr'], tapeLen: 70, leaf: r.won })];
  const cause = lossText(r.cause, r.by, level?.ruin);
  parts.push(text(-h / 2 + 24, r.won ? 'Nib made it!' : cause?.title ?? 'Oh no!', 46, r.won ? INK : RED, true));
  const haul = r.hasChest ? `The idol and ${r.coins} of ${r.total} coins.` : `${r.coins} of ${r.total} coins.`;
  const bank = `Bank: ${r.bank.coins.toLocaleString('en-US')} coins · ${r.bank.idols} ${r.bank.idols === 1 ? 'idol' : 'idols'}`;
  parts.push(text(-h / 2 + 84, r.won ? haul : cause?.line ?? '', 22, INK));
  if (r.won) {
    parts.push(text(-h / 2 + 112, bank, 19, SOFT_INK));
    if (r.hasChest) parts.push(scene.add.image(w / 2 - 30, -h / 2 + 8, 'chest-open').setScale(0.36).setAngle(10));
    blots(scene, parts, -h / 2 + 178, [true, r.allCoins, r.firstTry]);
    const note = r.offer ? 'The Volcano and the Tomb wait in the full game' : r.moreComing ? 'More levels are being drawn' : '';
    if (note) parts.push(text(-h / 2 + 228, note, 20, SOFT_INK));
  }
  // The way on, big: the next level, the full game, or (lost) another go; the rest small beneath it.
  const mainY = h / 2 - 100;
  const smallY = h / 2 - 42;
  if (r.won && r.next !== null) {
    const next = r.next;
    parts.push(paintedButton(scene, 0, mainY, 'Next level  ➜', () => act.next(next), { kind: 'leaf', width: 240, height: 56, size: 32 }).root);
  } else if (r.won && r.offer) {
    parts.push(paintedButton(scene, 0, mainY, `Full game · ${r.offer}`, act.buy, { kind: 'gold', width: 260, height: 56, size: 30 }).root);
  } else {
    parts.push(paintedButton(scene, 0, mainY, r.won ? 'Play again' : 'Try again', act.again, { kind: r.won ? 'paper' : 'clay', width: 220, height: 56, size: 32 }).root);
  }
  const way = r.won && (r.next !== null || r.offer !== undefined);
  if (way) {
    parts.push(paintedButton(scene, -70, smallY, 'Play again', act.again, { width: 128, height: 42, size: 23 }).root);
    parts.push(paintedButton(scene, 70, smallY, '‹ Map', act.map, { width: 112, height: 42, size: 23 }).root);
  } else {
    parts.push(paintedButton(scene, 0, smallY, '‹ Map', act.map, { width: 120, height: 42, size: 23 }).root);
  }
  // Its size and seed, so the page's painting can be let go with the card.
  return scene.add.container(0, 0, parts).setData({ w, h, seed });
}

/** Three ink blots across the card at y, filled where earned, each labelled under it. */
function blots(scene: Phaser.Scene, parts: Phaser.GameObjects.GameObject[], y: number, got: readonly boolean[]): void {
  ['done', 'every coin', 'first try'].forEach((label, i) => {
    const x = (i - 1) * 96;
    const earned = got[i] === true;
    parts.push(scene.add.image(x, y, earned ? UI_TEX.blot(i) : UI_TEX.blotSlot).setScale(1 / UI_RES).setAngle((i - 1) * 9));
    parts.push(scene.add.text(x, y + 30, label, { fontFamily: HAND, fontSize: '19px', color: earned ? INK : FADED, padding: { x: 4, y: 2 } }).setOrigin(0.5, 0).setResolution(DPR));
  });
}
