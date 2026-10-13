import Phaser from 'phaser';
import { BLUE, BLUE_HEX, PAPER_HEX, RED, RED_HEX } from '../art/palette';
import type { Mine } from '../logic/mine';
import type { GameScene } from './GameScene';
import { screenScene, viewSize } from './hidpi';
import { HAND_FONT, inkText, wobblyRect } from './ui';

/** The cell reads as low (red) under this share of its charge. */
const LOW = 0.25;
const PANEL = { x: 14, y: 12, w: 330, h: 100 } as const;
/** Where the cell's and the jetpack's gauges sit in the panel. */
const GAUGE = { x: 156, w: 100, h: 18, cell: 20, fuel: 48 } as const;

/** A heart's outline, for the suit's hearts (blue: they're yours). */
function heart(cx: number, cy: number, s: number): Phaser.Math.Vector2[] {
  return Array.from({ length: 28 }, (_, i) => {
    const t = (i / 28) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return new Phaser.Math.Vector2(cx + (x / 17) * s, cy - (y / 17) * s);
  });
}

/**
 * The HUD on a paper scrap: hearts, the drill's energy cell, the jetpack's
 * fuel, the bag, the depth and the credits banked so far; and the controls along the bottom.
 * Redrawn only when a number changes.
 */
export class HudScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private energy!: Phaser.GameObjects.Text;
  private fuel!: Phaser.GameObjects.Text;
  private bag!: Phaser.GameObjects.Text;
  private depth!: Phaser.GameObjects.Text;
  private credits!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private failed!: Phaser.GameObjects.Text;
  private shown = '';

  constructor() {
    super('Hud');
  }

  create(): void {
    screenScene(this, true);
    this.g = this.add.graphics();
    const text = (x: number, y: number, size: number): Phaser.GameObjects.Text => inkText(this, x, y, '', size).setOrigin(0, 0.5);
    const gaugeEnd = PANEL.x + GAUGE.x + GAUGE.w + 6;
    text(PANEL.x + GAUGE.x - 48, PANEL.y + GAUGE.cell, 20).setText('cell');
    text(PANEL.x + GAUGE.x - 48, PANEL.y + GAUGE.fuel, 20).setText('fuel');
    this.energy = text(gaugeEnd, PANEL.y + GAUGE.cell, 22);
    this.fuel = text(gaugeEnd, PANEL.y + GAUGE.fuel, 22);
    this.bag = text(PANEL.x + 14, PANEL.y + 80, 22);
    this.depth = text(PANEL.x + 120, PANEL.y + 80, 22);
    this.credits = text(PANEL.x + 210, PANEL.y + 80, 22);
    this.hint = this.add
      .text(0, 0, '← → walk   ↓ ↑ drill (push into rock)   space jump, hold to fly   E ladder   R recall', { fontFamily: HAND_FONT, fontSize: '19px', color: BLUE })
      .setOrigin(0.5, 1)
      .setAlpha(0.75);
    this.failed = inkText(this, 0, 0, 'Your suit gave out. Banked credits are safe.', 34, RED).setVisible(false);
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.layout, this));
  }

  update(): void {
    const game = this.scene.get('Game') as GameScene | null;
    const mine = game?.mine;
    if (!mine) return;
    const s = mine.suit;
    const sig = [s.hearts, s.maxHearts, s.energy, Math.ceil(s.fuel), s.bag.length, s.bagSize, mine.depth, mine.credits, mine.state].join('|');
    if (sig === this.shown) return;
    this.shown = sig;
    this.draw(mine);
  }

  private layout(): void {
    const { width, height } = viewSize(this);
    this.hint.setPosition(width / 2, height - 8);
    this.failed.setPosition(width / 2, height / 2);
  }

  private gauge(g: Phaser.GameObjects.Graphics, row: number, share: number, seed: number): void {
    const ink = share < LOW ? RED_HEX : BLUE_HEX;
    const gx = PANEL.x + GAUGE.x;
    const gy = PANEL.y + row - GAUGE.h / 2;
    g.lineStyle(1.2, ink, 0.9);
    for (let k = 3; k < GAUGE.w * share; k += 3.2) g.lineBetween(gx + k, gy + GAUGE.h - 2, gx + k + 5, gy + 2);
    wobblyRect(g, gx, gy, GAUGE.w, GAUGE.h, seed, 1.5, ink);
  }

  private draw(mine: Mine): void {
    const s = mine.suit;
    const g = this.g.clear();
    const { x, y, w, h } = PANEL;
    g.fillStyle(PAPER_HEX, 0.93).fillRect(x, y, w, h);
    wobblyRect(g, x, y, w, h, 17, 1.6, BLUE_HEX);
    for (let i = 0; i < s.maxHearts; i++) {
      const pts = heart(x + 22 + i * 30, y + 34, 11);
      if (i < s.hearts) g.fillStyle(BLUE_HEX, 0.85).fillPoints(pts, true);
      g.lineStyle(1.6, BLUE_HEX, i < s.hearts ? 1 : 0.4).strokePoints(pts, true);
    }
    // The cell and the fuel tank: pencil gauges filled with hatching, red once they're low.
    this.gauge(g, GAUGE.cell, s.energy / s.maxEnergy, 23);
    this.gauge(g, GAUGE.fuel, s.fuel / s.maxFuel, 29);
    const lowCell = s.energy / s.maxEnergy < LOW;
    const lowFuel = s.fuel / s.maxFuel < LOW;
    this.energy.setText(`${s.energy}`).setColor(lowCell ? RED : BLUE);
    this.fuel.setText(`${Math.ceil(s.fuel)}`).setColor(lowFuel ? RED : BLUE);
    this.bag.setText(`bag ${s.bag.length}/${s.bagSize}`).setColor(s.bag.length >= s.bagSize ? RED : BLUE);
    this.depth.setText(mine.depth ? `−${mine.depth} m` : 'surface');
    this.credits.setText(`${mine.credits} credits`);
    this.failed.setVisible(mine.state === 'failed');
  }
}
