import Phaser from 'phaser';
import { BOIL, BLUE_HEX, RED_HEX } from '../../art/palette';
import { CHARGE_FRAME } from '../../art/chargeArt';
import { PIECE_FRAME, TEX } from '../../art/textures';
import { blastArea } from '../../logic/volatiles';
import type { Mine } from '../../logic/mine';
import { oreById } from '../../logic/ore';

const BOIL_FPS = 8;

/**
 * Everything small on the ground: an old crew's charges (and the red
 * outline of where anything lit will blast, firedamp too), loose pieces of
 * ore, and ladders.
 * Sprites are pooled and matched to the sim each frame.
 */
export class ThingsView {
  private readonly charges: Phaser.GameObjects.Image[] = [];
  private readonly pieces = new Map<number, Phaser.GameObjects.Image>();
  private readonly warn: Phaser.GameObjects.Graphics;
  private readonly ladders: Phaser.GameObjects.Graphics;
  private ladderCount = -1;

  constructor(private readonly scene: Phaser.Scene, private readonly tile: number) {
    this.ladders = scene.add.graphics().setDepth(3);
    this.warn = scene.add.graphics().setDepth(6);
  }

  update(mine: Mine, now: number): void {
    const f = Math.floor((now / 1000) * BOIL_FPS) % BOIL;
    this.drawCharges(mine, f, now);
    this.drawPieces(mine);
    this.drawLadders(mine);
  }

  private drawCharges(mine: Mine, f: number, now: number): void {
    const T = this.tile;
    const placed = mine.blasts.placed();
    const lit = new Map(mine.blasts.lit().map((c) => [`${c.tile[0]},${c.tile[1]}`, c]));
    placed.forEach(({ tile: [x, y], kind }, i) => {
      const isLit = lit.has(`${x},${y}`);
      const img = this.charges[i] ?? this.charges[this.charges.push(this.scene.add.image(0, 0, TEX.charge(kind, false, 0)).setDepth(2)) - 1]!;
      // An armed lamp blinks slowly; a lit one fast.
      const blink = isLit ? Math.floor(now / 110) % 2 === 0 : Math.floor(now / 900) % 3 === 0;
      img.setTexture(TEX.charge(kind, blink, f)).setPosition((x + 0.5) * T, (y + 0.5) * T).setScale((T / CHARGE_FRAME / 3) * 1.35).setVisible(true);
    });
    for (let i = placed.length; i < this.charges.length; i++) this.charges[i]!.setVisible(false);
    // Anything lit shows where its blast will reach, in red, faster as it nears.
    this.warn.clear();
    for (const c of lit.values()) {
      const pulse = 0.35 + 0.35 * Math.abs(Math.sin(now / (c.left < 0.5 ? 60 : 160)));
      this.warn.lineStyle(2, RED_HEX, pulse);
      for (const [x, y] of blastArea(mine.terrain, c.kind, c.tile[0], c.tile[1])) {
        this.warn.strokeRect(x * T + 3, y * T + 3, T - 6, T - 6);
      }
    }
  }

  private drawPieces(mine: Mine): void {
    const alive = new Set<number>();
    for (const p of mine.pieces) {
      alive.add(p.id);
      let img = this.pieces.get(p.id);
      if (!img) {
        const ore = oreById(p.ore);
        img = this.scene.add.image(0, 0, TEX.piece(ore?.key ?? 'copper')).setDepth(4).setScale(p.w / PIECE_FRAME / 3 * 1.6);
        this.pieces.set(p.id, img);
      }
      img.setPosition(p.x + p.w / 2, p.y + p.h / 2);
    }
    for (const [id, img] of this.pieces) {
      if (alive.has(id)) continue;
      img.destroy();
      this.pieces.delete(id);
    }
  }

  /** Ladders: two rails and rungs down each column, redrawn when one is added. */
  private drawLadders(mine: Mine): void {
    const rungs = mine.ladders.all();
    if (rungs.length === this.ladderCount) return;
    this.ladderCount = rungs.length;
    const T = this.tile;
    const g = this.ladders.clear();
    g.lineStyle(2, BLUE_HEX, 0.95);
    for (const [x, y] of rungs) {
      const left = x * T + T * 0.22;
      const right = x * T + T * 0.78;
      g.lineBetween(left, y * T - 1, left + 0.6, (y + 1) * T + 1);
      g.lineBetween(right, y * T - 1, right - 0.6, (y + 1) * T + 1);
      for (const k of [0.3, 0.75]) g.lineBetween(left, (y + k) * T, right, (y + k) * T + 0.8);
    }
  }
}
