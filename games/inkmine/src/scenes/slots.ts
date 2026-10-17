import Phaser from 'phaser';
import { PIECE_FRAME, TEX } from '../art/textures';
import { getSound } from '../host';
import type { Inventory } from '../logic/inventory';
import { ORES } from '../logic/ore';
import { iconKey } from './kit/icons';
import { bakeUi, roundRect, rule, RULE, uiImage, wash } from './kit/paint';
import { label } from './kit/type';

export interface SlotGridOpts {
  /** Cell size, px. */
  readonly cell: number;
  readonly cols: number;
  /** A slot ringed in highlighter (the one picked up). */
  readonly selected?: number;
  readonly seed?: number;
  /** Slots that stay in the bag at the lander: a padlock in their corner. */
  readonly locked?: (slot: number) => boolean;
  /** Called with the slot index when a cell is tapped (makes the grid interactive). */
  readonly onTap?: (slot: number) => void;
  readonly depth?: number;
}

/** Px between cells. */
const GAP = 5;

/** Height a grid of `slots` takes. */
export function gridHeight(slots: number, o: Pick<SlotGridOpts, 'cell' | 'cols'>): number {
  return Math.ceil(slots / o.cols) * (o.cell + GAP);
}

/** An empty slot: a well pressed into the paper, shaded under its top edge. */
function wellKey(scene: Phaser.Scene, size: number, state: 'empty' | 'full' | 'picked'): string {
  return bakeUi(scene, `ui-well-${state}-${size}`, size, size, (ctx) => {
    roundRect(ctx, 0.5, 0.5, size - 1, size - 1, 4);
    ctx.fillStyle = state === 'picked' ? '#f6e7a6' : '#ebe1c7';
    ctx.fill();
    ctx.save();
    roundRect(ctx, 0.5, 0.5, size - 1, size - 1, 4);
    ctx.clip();
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, 'rgba(80, 60, 30, 0.2)');
    g.addColorStop(0.3, 'rgba(80, 60, 30, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
    if (state === 'picked') {
      roundRect(ctx, 2, 2, size - 4, size - 4, 3);
      wash(ctx, 0, 0, size, size, '#f0d55a', size, { alpha: 0.5, rim: 0.6 });
    }
    roundRect(ctx, 0.5, 0.5, size - 1, size - 1, 4);
    rule(ctx, state === 'empty' ? 0.7 : 1.1, RULE, state === 'empty' ? 0.45 : 0.9);
  });
}

/** The wash behind a stack: its ore's highlighter, laid on like watercolour. */
function stainKey(scene: Phaser.Scene, size: number, ore: keyof typeof ORES): string {
  return bakeUi(scene, `ui-stain-${ore}-${size}`, size, size, (ctx) => {
    roundRect(ctx, 3, 3, size - 6, size - 6, 3);
    wash(ctx, 0, 0, size, size, ORES[ore].mark, ORES[ore].id * 17 + size, { alpha: 0.45, pool: 0.6, rim: 0.5 });
  });
}

/**
 * A slot inventory as a grid of wells pressed into the paper, No Man's Sky
 * style: each stack shows its ore (the piece drawing, on a wash of its
 * highlighter) and a count; empty wells are faint. Returns everything it
 * made, so a HUD can clear and redraw it.
 */
export function drawSlotGrid(scene: Phaser.Scene, x: number, y: number, inv: Inventory, o: SlotGridOpts): Phaser.GameObjects.GameObject[] {
  const made: Phaser.GameObjects.GameObject[] = [];
  const depth = o.depth ?? 0;
  inv.slots.forEach((s, i) => {
    const cx = x + (i % o.cols) * (o.cell + GAP);
    const cy = y + Math.floor(i / o.cols) * (o.cell + GAP);
    const state = i === o.selected ? 'picked' : s ? 'full' : 'empty';
    made.push(uiImage(scene, cx, cy, wellKey(scene, o.cell, state)).setDepth(depth));
    if (s) {
      made.push(uiImage(scene, cx, cy, stainKey(scene, o.cell, s.ore)).setDepth(depth));
      made.push(scene.add.image(cx + o.cell / 2, cy + o.cell * 0.45, TEX.piece(s.ore)).setScale((o.cell * 0.6) / PIECE_FRAME / 3).setDepth(depth));
      made.push(label(scene, cx + o.cell - 3, cy + o.cell - 1, `${s.n}`, Math.max(13, Math.round(o.cell * 0.34)), '#1f2a55', '600').setOrigin(1, 1).setDepth(depth));
    }
    if (o.locked?.(i)) {
      const size = Math.max(12, Math.round(o.cell * 0.34));
      made.push(uiImage(scene, cx + 1, cy + 1, iconKey(scene, 'lock', size)).setDepth(depth));
    }
    if (o.onTap) {
      const tap = o.onTap;
      const zone = scene.add.zone(cx + o.cell / 2, cy + o.cell / 2, o.cell, o.cell).setInteractive({ useHandCursor: true }).setDepth(depth);
      // A tap, not the end of a drag (the ship page scrolls by dragging).
      let down: { x: number; y: number } | null = null;
      zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
        down = { x: p.x, y: p.y };
      });
      zone.on('pointerup', (p: Phaser.Input.Pointer) => {
        if (down && Math.hypot(p.x - down.x, p.y - down.y) < 16) {
          getSound(scene)?.play('tick');
          tap(i);
        }
        down = null;
      });
      made.push(zone);
    }
  });
  return made;
}
