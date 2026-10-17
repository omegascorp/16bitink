import Phaser from 'phaser';
import { BLUE, INK, RED, RED_HEX } from '../../art/palette';
import { nozzleOf, PROSPECTOR_GROUND } from '../../art/prospector';
import type { Blast } from '../../logic/blastSim';
import type { Mine } from '../../logic/mine';
import { createRng } from '../../logic/rng';
import { HAND_FONT } from '../ui';
import { SCALE } from './prospectorView';
import type { Ring } from './ring';

const INK_HEX = Phaser.Display.Color.HexStringToColor(INK).color;
/** The jet flame's watercolour wash. */
const FLAME_WASH = 0xf6c770;
/** Notes written this close together (ms) stack a line apart instead of over each other: a cap's carbon and water arrive at once. */
const NOTE_STACK_MS = 450;
const NOTE_LINE = 22;
/** A run of them (a blast's worth of pieces) climbs this many lines, then starts again at the bottom. */
const NOTE_STACK_MAX = 4;

/**
 * Small effects in the world: cracks spreading through the block being
 * drilled, specks of rock thrown off the bit, a scribbled red burst for a
 * blast, and notes written beside the prospector ("too hard", "+12").
 */
export class FxView {
  private readonly cracks: Phaser.GameObjects.Graphics;
  private readonly flame: Phaser.GameObjects.Graphics;
  private readonly rng = createRng(5);
  private lastNote = -Infinity;
  private stacked = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly tile: number, private readonly jetMk: number) {
    this.cracks = scene.add.graphics().setDepth(4);
    this.flame = scene.add.graphics().setDepth(4.5);
  }

  /** The jet's flame under the nozzle: a flickering inked tongue with a warm wash, and a puff now and then. */
  jet(mine: Mine, ring: Ring): void {
    const g = this.flame.clear();
    if (!mine.jetting) return;
    const p = mine.player;
    const nozzle = nozzleOf(this.jetMk);
    const x = ring.near(p.x + p.w / 2) + nozzle.x * SCALE * mine.facing;
    const y = p.y + p.h + (nozzle.y - PROSPECTOR_GROUND) * SCALE;
    const len = 9 + this.rng() * 7;
    const w = 3.2 + this.rng() * 1.2;
    const tongue = [
      new Phaser.Math.Vector2(x - w, y),
      new Phaser.Math.Vector2(x - w * 0.5, y + len * 0.55),
      new Phaser.Math.Vector2(x + (this.rng() - 0.5) * 2, y + len),
      new Phaser.Math.Vector2(x + w * 0.5, y + len * 0.5),
      new Phaser.Math.Vector2(x + w, y),
    ];
    g.fillStyle(FLAME_WASH, 0.75).fillPoints(tongue, true);
    g.lineStyle(1.2, INK_HEX, 0.9).strokePoints(tongue, false);
    g.lineStyle(0.8, INK_HEX, 0.6).lineBetween(x, y + 2, x + (this.rng() - 0.5) * 2, y + len * 0.6);
    if (this.rng() < 0.25) {
      const puff = this.scene.add.circle(x + (this.rng() - 0.5) * 4, y + len, 2 + this.rng() * 2, INK_HEX, 0).setStrokeStyle(0.8, INK_HEX, 0.6).setDepth(4.5);
      this.scene.tweens.add({ targets: puff, y: puff.y + 10, scale: 2.2, alpha: 0, duration: 380, onComplete: () => puff.destroy() });
    }
  }

  /** Cracks across the block being drilled, more as the bit gets through, and a speck or two flying off. */
  update(mine: Mine, ring: Ring): void {
    const g = this.cracks.clear();
    if (!mine.drilling) return;
    const T = this.tile;
    const [col, y] = mine.drilling.tile;
    // Drawn at the copy nearest the camera; the crack pattern is still seeded by the tile.
    const x = ring.near((col + 0.5) * T) / T - 0.5;
    const p = mine.drillProgress;
    const r = createRng(col * 7919 + y * 104729);
    g.lineStyle(1.3, INK_HEX, 0.85);
    const lines = Math.ceil(p * 6);
    for (let i = 0; i < lines; i++) {
      let cx = (x + 0.5) * T;
      let cy = (y + 0.5) * T;
      const a = r() * Math.PI * 2;
      g.beginPath();
      g.moveTo(cx, cy);
      for (let k = 0; k < 3; k++) {
        cx += Math.cos(a + (r() - 0.5)) * T * 0.17 * p * 1.4;
        cy += Math.sin(a + (r() - 0.5)) * T * 0.17 * p * 1.4;
        g.lineTo(cx, cy);
      }
      g.strokePath();
    }
    if (this.rng() < 0.45) this.speck((x + 0.5) * T, (y + 0.5) * T, ring.near(mine.player.x + mine.player.w / 2));
  }

  private speck(x: number, y: number, fromX: number): void {
    const away = Math.sign(fromX - x) || (this.rng() < 0.5 ? -1 : 1);
    const dot = this.scene.add.circle(x + (this.rng() - 0.5) * 10, y + (this.rng() - 0.5) * 10, 1 + this.rng() * 1.6, INK_HEX, 0.85).setDepth(6);
    this.scene.tweens.add({
      targets: dot,
      x: dot.x + away * (8 + this.rng() * 18),
      y: dot.y - 6 - this.rng() * 14,
      alpha: 0,
      duration: 260 + this.rng() * 200,
      ease: 'Quad.easeOut',
      onComplete: () => dot.destroy(),
    });
  }

  /** A scribbled red burst over the blast, and a shake. */
  blast(b: Blast, ring: Ring): void {
    const T = this.tile;
    const g = this.scene.add.graphics().setDepth(7);
    g.lineStyle(2.2, RED_HEX, 0.9);
    const cx = ring.near((b.at[0] + 0.5) * T);
    const cy = (b.at[1] + 0.5) * T;
    const reach = b.kind === 'lineCharge' ? T * 4.5 : T * 1.6;
    const tall = b.kind === 'lineCharge' ? T * 0.9 : T * 1.6;
    g.beginPath();
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const k = i % 2 === 0 ? 1 : 0.45 + this.rng() * 0.2;
      const px = cx + Math.cos(a) * reach * k;
      const py = cy + Math.sin(a) * tall * k;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.strokePath();
    this.scene.tweens.add({ targets: g, alpha: 0, scale: 1.08, duration: 450, onComplete: () => g.destroy() });
    this.scene.cameras.main.shake(180, 0.006);
  }

  /** A note written beside a point, rising and fading. */
  note(x: number, y: number, text: string, danger = false): void {
    const now = this.scene.time.now;
    this.stacked = now - this.lastNote < NOTE_STACK_MS ? (this.stacked + 1) % NOTE_STACK_MAX : 0;
    this.lastNote = now;
    const at = y - this.stacked * NOTE_LINE;
    const t = this.scene.add
      .text(x, at, text, { fontFamily: HAND_FONT, fontSize: '20px', color: danger ? RED : BLUE, stroke: '#f5f0e1', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(8);
    this.scene.tweens.add({ targets: t, y: at - 26, alpha: 0, duration: 1300, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }
}
