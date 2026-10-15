import Phaser from 'phaser';
import { BLUE, BLUE_HEX } from '../../art/palette';
import type { Mine } from '../../logic/mine';
import { ringDelta } from '../../logic/terrain';
import { HAND_FONT } from '../ui';
import type { Ring } from './ring';

/** Px from the prospector's middle to the arrow. */
const OFFSET = 46;
/** Tiles within which the arrow gives way: the thing itself is in view by then. */
const NEAR = 4;

/**
 * The suit's beacon arrow (No Man's Sky's marker, inked): a little pen
 * arrow beside the prospector pointing the short way round the world to
 * where a goal lies, with how far it is in metres. Blue: it's yours.
 */
export class BeaconView {
  private readonly arrow: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.arrow = scene.add.graphics().setDepth(8);
    this.label = scene.add
      .text(0, 0, '', { fontFamily: HAND_FONT, fontSize: '17px', color: BLUE, stroke: '#f5f0e1', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(8);
  }

  /** Points at `target` (world px, folded), or hides with none. */
  update(mine: Mine, ring: Ring, target: { readonly x: number; readonly y: number } | null, name: string, now: number): void {
    const g = this.arrow.clear();
    const p = mine.player;
    const dx = target ? ringDelta(mine.terrain, p.x + p.w / 2, target.x, mine.tile) : 0;
    const dy = target ? target.y - (p.y + p.h / 2) : 0;
    const d = Math.hypot(dx, dy);
    const show = target !== null && d > NEAR * mine.tile;
    this.label.setVisible(show);
    if (!show) return;
    const a = Math.atan2(dy, dx);
    const bob = Math.sin(now / 260) * 3;
    const cx = ring.near(p.x + p.w / 2) + Math.cos(a) * (OFFSET + bob);
    const cy = p.y + p.h / 2 + Math.sin(a) * (OFFSET + bob);
    const tip = (k: number, side: number): [number, number] => [cx + Math.cos(a) * k - Math.sin(a) * side, cy + Math.sin(a) * k + Math.cos(a) * side];
    g.lineStyle(2.2, BLUE_HEX, 0.95);
    g.lineBetween(...tip(-9, 0), ...tip(8, 0));
    g.lineBetween(...tip(8, 0), ...tip(1, -6));
    g.lineBetween(...tip(8, 0), ...tip(1, 6));
    this.label.setText(`${name} ${Math.round(d / mine.tile)} m`).setPosition(cx, cy + 18);
  }
}
