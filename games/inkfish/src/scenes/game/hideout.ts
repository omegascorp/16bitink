import Phaser from 'phaser';
import { HIDE_START, insidePatch, stepHide, type HideState } from '../../levels/cover';
import type { CoverView } from './coverPatches';
import { fadeCover } from './coverPatches';
import type { Player } from './player';
import { TUNING } from './tuning';
import { nearestOnRing } from '../../logic/ring';

const BLUE = 0x1f3f8a;
const RULES = { maxMs: TUNING.hideMs, cooldownMs: TUNING.hideCooldownMs } as const;

/**
 * Hiding in cover, frame by frame: which patch you're in, whether it still
 * hides you, and a small draining ring above your fish showing how long.
 */
export class Hideout {
  private state: HideState = HIDE_START;
  private readonly ring: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene, private readonly covers: readonly CoverView[], private readonly floorAt: (x: number) => number, private readonly ringWidth: number,
  ) {
    this.ring = scene.add.graphics().setDepth(30);
  }

  /** Updates `player.hidden`; calls `onSpotted` the moment cover stops hiding you. */
  update(p: Player, now: number, deltaMs: number, dt: number, onSpotted: () => void): void {
    const { x, y } = p.sprite;
    // Patches are planned within the first lap; you may be any number of laps round.
    const inside = p.hooked ? null : this.covers.find((c) => insidePatch(c.patch, nearestOnRing(x, c.patch.x, this.ringWidth), y, p.size, this.floorAt(x))) ?? null;
    const step = stepHide(this.state, inside !== null, now, deltaMs, RULES);
    this.state = step.state;
    p.hidden = step.state.hidden;
    if (step.spotted) onSpotted();
    fadeCover(this.covers, inside, dt);
    this.drawRing(p);
  }

  private drawRing(p: Player): void {
    this.ring.clear();
    if (!this.state.hidden) return;
    const left = 1 - this.state.usedMs / RULES.maxMs;
    const r = p.drawSize + 12;
    const top = -Math.PI / 2;
    this.ring.lineStyle(3, BLUE, 0.75).beginPath().arc(p.sprite.x, p.sprite.y, r, top, top + Math.PI * 2 * left).strokePath();
  }
}
