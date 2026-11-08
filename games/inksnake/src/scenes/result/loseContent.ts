import Phaser from 'phaser';
import { BLUE } from '../../art/palette';
import { HURTS } from '../../logic/chapters/index';
import type { ResultData } from '../ResultScene';
import { inkText } from '../ui';
import { GROOVE, HAND, paperCard, VineBar } from '../uiPaint';
import { closeness } from './tips';

const SOFT_INK = '#4a463e';
/** Not the danger red: a loss is a nudge, not a scolding. */
const WELL_INK = '#9c4638';
/** How the level was lost, as the card's title: the clock, or whatever took the last life. */
const lossTitle = (cause: string): string => (cause === 'time' ? 'Out of time…' : HURTS[cause]?.title ?? 'Caught out…');
const TIP = { w: 470, h: 88 } as const;

/** Where the lose card's pieces go, relative to its top. */
export const LOSE = { title: 66, close: 160, bar: 252, tip: 350 } as const;

/**
 * A lost level's card body, gently: how close the goal came (the vine
 * grows back to where it got), the points, and a tip on a taped note.
 */
export function loseContent(scene: Phaser.Scene, card: Phaser.GameObjects.Container, data: ResultData, top: number, titleX: number, tip: string): void {
  const progress = Phaser.Math.Clamp(data.progress ?? 0, 0, 1);
  card.add(inkText(scene, titleX + 12, top + LOSE.title, lossTitle(data.lostBy ?? 'knot'), 50, WELL_INK));
  card.add(inkText(scene, titleX, top + LOSE.close, closeness(progress), 26, BLUE));
  const left = -GROOVE.w / 2;
  const y = top + LOSE.bar;
  card.add(inkText(scene, left, y - 30, `${data.score} points`, 24, BLUE).setOrigin(0, 0.5));
  card.add(inkText(scene, -left, y - 30, `${data.length} long · ${Math.round(progress * 100)}% there`, 20, SOFT_INK).setOrigin(1, 0.5));
  const bar = new VineBar(scene, left, y);
  card.add(bar.root);
  bar.set(0);
  scene.tweens.addCounter({ from: 0, to: progress, duration: 900, delay: 300, ease: 'Quad.Out', onUpdate: (t) => bar.set(t.getValue() ?? 0, scene.time.now) });
  const ty = top + LOSE.tip;
  card.add(paperCard(scene, 0, ty, TIP.w, TIP.h, 13, { radius: 4, rough: 1.2, shadow: 0.5, tapes: ['top'], tapeLen: 52, tint: 'sage' }).setAngle(-0.8));
  card.add(scene.add.text(0, ty + 4, tip, {
    fontFamily: HAND, fontSize: '22px', color: SOFT_INK, align: 'center', wordWrap: { width: TIP.w - 44 }, padding: { x: 4, y: 4 },
  }).setOrigin(0.5).setAngle(-0.8));
}
