import type Phaser from 'phaser';

/**
 * Write-if-changed setters for things copied onto a follower every frame
 * (tails, glow twins, squid limbs, a bird's catch). Writing a depth makes
 * Phaser re-sort the scene's whole display list before the next render,
 * even when the value is the same, and tint writes dirty the vertices.
 */
interface Depthed {
  readonly depth: number;
  setDepth(value: number): unknown;
}
type Tinted = Pick<Phaser.GameObjects.Image, 'tintTopLeft' | 'tintMode' | 'setTint' | 'setTintMode'>;

export function keepDepth(obj: Depthed, depth: number): void {
  if (obj.depth !== depth) obj.setDepth(depth);
}

/** Gives `copy` the tint (colour and mode) of `of`. */
export function keepTint(copy: Tinted, of: Pick<Tinted, 'tintTopLeft' | 'tintMode'>): void {
  if (copy.tintTopLeft !== of.tintTopLeft) copy.setTint(of.tintTopLeft);
  if (copy.tintMode !== of.tintMode) copy.setTintMode(of.tintMode);
}
