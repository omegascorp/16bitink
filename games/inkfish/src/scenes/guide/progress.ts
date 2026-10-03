import Phaser from 'phaser';
import type { GuideProgress } from '../../guide';
import { HAND_FONT, wobblyRect } from '../ui';

const FILL = 0x1f3f8a;
const DONE = 0x2f7a3a;
const TRACK = 0xfffaf0;

/** Blue while filling in, green once the page is complete. */
function fillColor(p: GuideProgress): number {
  return p.percent >= 100 ? DONE : FILL;
}

/**
 * Draws a hand-inked progress bar centred on (0, 0) into `g`. Clears `g`
 * first, so the same graphics can be redrawn as the progress changes.
 */
export function drawProgressBar(g: Phaser.GameObjects.Graphics, w: number, h: number, p: GuideProgress, seed: number): void {
  g.clear();
  g.fillStyle(TRACK, 0.95).fillRect(-w / 2, -h / 2, w, h);
  const filled = p.total ? (w * p.met) / p.total : 0;
  if (filled > 0) g.fillStyle(fillColor(p), 0.85).fillRect(-w / 2, -h / 2, filled, h);
  wobblyRect(g, -w / 2, -h / 2, w, h, seed, 1.6);
}

/** "7 of 12 met (58%)" — the caption that goes with a bar. */
export function progressCaption(p: GuideProgress): string {
  if (p.percent >= 100) return `All ${p.total} met!`;
  return `${p.met} of ${p.total} met (${p.percent}%)`;
}

/** A labelled bar: the caption sits to the right of the bar. */
export function progressBar(scene: Phaser.Scene, x: number, y: number, w: number, h: number, p: GuideProgress, s: number): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  drawProgressBar(g, w, h, p, 41);
  const t = scene.add.text(w / 2 + 12 * s, 0, progressCaption(p), { fontFamily: HAND_FONT, fontSize: `${22 * s}px`, color: '#4a463e' }).setOrigin(0, 0.5);
  return scene.add.container(x, y, [g, t]);
}

/** An arc around a chapter tab showing how much of its page is met. */
export function drawProgressRing(g: Phaser.GameObjects.Graphics, r: number, p: GuideProgress): void {
  if (p.met === 0) return;
  const start = -Math.PI / 2;
  g.lineStyle(3.2, fillColor(p), 1);
  g.beginPath();
  g.arc(0, 0, r, start, start + (Math.PI * 2 * p.met) / p.total, false);
  g.strokePath();
}
