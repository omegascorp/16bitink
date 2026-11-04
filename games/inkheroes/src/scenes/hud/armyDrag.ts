import type Phaser from 'phaser';
import type { ArmyRow } from './armyRow';

/** A press that moves further than this (UI px) is a drag, not a tap. */
const DRAG = 6;
const CARRIED_ALPHA = 0.85;

export interface ArmyDragOpts<T> {
  /** Above everything the company is carried over. */
  readonly depth: number;
  /** Whether the company at `ref` can be carried off. */
  canCarry(ref: T): boolean;
  tap(ref: T): void;
  drop(from: T, to: T): void;
}

/**
 * Taps and drags across army rows. A press that stays put is a tap; one
 * that moves carries a copy of the company under the pointer, and letting
 * go over a slot drops it there. On a touch screen and with a mouse alike,
 * so a company can be moved either way.
 */
export class ArmyDrag<T> {
  private readonly rows: { row: ArmyRow; ref: (i: number) => T }[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly opts: ArmyDragOpts<T>) {}

  /** Starts listening to `row`; `ref` names its slots. */
  watch(row: ArmyRow, ref: (i: number) => T): void {
    this.rows.push({ row, ref });
    row.onPress = (i, p) => this.press(row, i, ref(i), p);
  }

  /** Stops listening to `row` (it's being replaced). */
  forget(row: ArmyRow): void {
    const at = this.rows.findIndex((r) => r.row === row);
    if (at >= 0) this.rows.splice(at, 1);
  }

  private press(row: ArmyRow, i: number, from: T, down: Phaser.Input.Pointer): void {
    const { scene, opts } = this;
    const start = { x: down.worldX, y: down.worldY };
    let carried: Phaser.GameObjects.Image | null = null;
    const move = (p: Phaser.Input.Pointer): void => {
      const x = Math.round(p.worldX);
      const y = Math.round(p.worldY);
      if (!carried && Math.hypot(x - start.x, y - start.y) >= DRAG && opts.canCarry(from)) {
        carried = scene.add.image(x, y, row.textureOf(i)).setDepth(opts.depth).setAlpha(CARRIED_ALPHA);
        row.carry(i);
      }
      carried?.setPosition(x, y);
    };
    const up = (p: Phaser.Input.Pointer): void => {
      scene.input.off('pointermove', move);
      scene.input.off('pointerup', up);
      scene.input.off('pointerupoutside', up);
      if (!carried) {
        if (row.slotAt(p.worldX, p.worldY) === i) opts.tap(from);
        return;
      }
      carried.destroy();
      row.carry(null);
      const over = this.rows.map((r) => ({ r, at: r.row.slotAt(p.worldX, p.worldY) })).find((o) => o.at >= 0);
      if (over) opts.drop(from, over.r.ref(over.at));
    };
    scene.input.on('pointermove', move);
    scene.input.on('pointerup', up);
    scene.input.on('pointerupoutside', up);
  }
}
