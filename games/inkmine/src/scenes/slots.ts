import Phaser from 'phaser';
import { BLUE_HEX, HIGHLIGHT_HEX, PAPER_HEX } from '../art/palette';
import { PIECE_FRAME, TEX } from '../art/textures';
import type { Inventory } from '../logic/inventory';
import { ORES } from '../logic/ore';
import { inkText, PENCIL_HEX, wobblyRect } from './ui';

export interface SlotGridOpts {
  /** Cell size, px. */
  readonly cell: number;
  readonly cols: number;
  /** A slot ringed in highlighter (the one picked up). */
  readonly selected?: number;
  readonly seed?: number;
  /** Called with the slot index when a cell is tapped (makes the grid interactive). */
  readonly onTap?: (slot: number) => void;
  readonly depth?: number;
}

/** Height a grid of `slots` takes. */
export function gridHeight(slots: number, o: Pick<SlotGridOpts, 'cell' | 'cols'>): number {
  return Math.ceil(slots / o.cols) * (o.cell + 4);
}

/**
 * A slot inventory as a grid of hand-drawn boxes, No Man's Sky style: each
 * stack shows its ore (the piece drawing, on a wash of its highlighter) and
 * a count; empty slots are pencil. Returns everything it made, so a HUD can
 * clear and redraw it.
 */
export function drawSlotGrid(scene: Phaser.Scene, x: number, y: number, inv: Inventory, o: SlotGridOpts): Phaser.GameObjects.GameObject[] {
  const made: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics().setDepth(o.depth ?? 0);
  made.push(g);
  const gap = 4;
  inv.slots.forEach((s, i) => {
    const cx = x + (i % o.cols) * (o.cell + gap);
    const cy = y + Math.floor(i / o.cols) * (o.cell + gap);
    g.fillStyle(PAPER_HEX, 0.95).fillRect(cx, cy, o.cell, o.cell);
    if (s) g.fillStyle(Phaser.Display.Color.HexStringToColor(ORES[s.ore].color).color, 0.28).fillRect(cx + 2, cy + 2, o.cell - 4, o.cell - 4);
    if (i === o.selected) g.fillStyle(HIGHLIGHT_HEX, 0.6).fillRect(cx, cy, o.cell, o.cell);
    wobblyRect(g, cx, cy, o.cell, o.cell, (o.seed ?? 5) + i * 7, s ? 1.4 : 1, s ? BLUE_HEX : PENCIL_HEX);
    if (s) {
      made.push(scene.add.image(cx + o.cell / 2, cy + o.cell * 0.44, TEX.piece(s.ore)).setScale((o.cell * 0.62) / PIECE_FRAME / 3).setDepth(o.depth ?? 0));
      made.push(inkText(scene, cx + o.cell - 2, cy + o.cell - 2, `${s.n}`, Math.max(15, Math.round(o.cell * 0.4))).setOrigin(1, 1).setDepth(o.depth ?? 0));
    }
    if (o.onTap) {
      const tap = o.onTap;
      const zone = scene.add.zone(cx + o.cell / 2, cy + o.cell / 2, o.cell, o.cell).setInteractive({ useHandCursor: true }).setDepth(o.depth ?? 0);
      // A tap, not the end of a drag (the ship page scrolls by dragging).
      let down: { x: number; y: number } | null = null;
      zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
        down = { x: p.x, y: p.y };
      });
      zone.on('pointerup', (p: Phaser.Input.Pointer) => {
        if (down && Math.hypot(p.x - down.x, p.y - down.y) < 16) tap(i);
        down = null;
      });
      made.push(zone);
    }
  });
  return made;
}
