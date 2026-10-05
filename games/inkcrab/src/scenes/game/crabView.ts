import Phaser from 'phaser';
import { FOOT, FRAME, SHELL_MID, SHELL_UNITS } from '../../art/frame';
import { BOIL, RED_HEX } from '../../art/palette';
import { TEX } from '../../art/textures';
import { meterGoal } from '../../logic/growth';
import type { Beach } from '../../logic/sim';
import { shellPx, SHELLS } from '../../logic/shells';
import { swapProgress } from '../../logic/swap';

/** Frame px from the shell's middle to the opening (FOOT). */
const FOOT_FROM_MIDDLE = FOOT.x - SHELL_MID;
/** Leg-pose frames per second while walking; idle line boil is slower. */
const WALK_FPS = 10;
const BOIL_MS = 240;
/** Crab drawing size relative to a shell of the same body size. */
const BODY_SCALE = 0.95;

/**
 * The player in three layers: far legs, the shell, then the head, near legs
 * and claw. The body is scaled by how much of the shell it fills, so a crab
 * at its cap visibly crowds the opening.
 */
export class CrabView {
  readonly root: Phaser.GameObjects.Container;
  private readonly back: Phaser.GameObjects.Image;
  private readonly shell: Phaser.GameObjects.Image;
  private readonly front: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Graphics;
  private walkClock = 0;

  constructor(scene: Phaser.Scene) {
    const ox = FOOT.x / FRAME;
    const oy = FOOT.y / FRAME;
    this.back = scene.add.image(0, 0, TEX.crabBack(0)).setOrigin(ox, oy);
    this.shell = scene.add.image(0, 0, TEX.shell('bottlecap', 0)).setOrigin(ox, oy);
    this.front = scene.add.image(0, 0, TEX.crabFront(0)).setOrigin(ox, oy);
    this.root = scene.add.container(0, 0, [this.back, this.shell, this.front]).setDepth(5);
    this.ring = scene.add.graphics().setDepth(6);
  }

  update(beach: Beach, time: number, dt: number): void {
    const c = beach.crab;
    const walking = Math.abs(c.body.vx) > 1 && c.body.onGround && !c.swap;
    this.walkClock = walking ? this.walkClock + dt : 0;
    const f = walking ? Math.floor(this.walkClock * WALK_FPS) % BOIL : Math.floor(time / BOIL_MS) % BOIL;
    const spec = c.shell ? SHELLS[c.shell] : null;
    const unit = shellPx(spec ? spec.maxSize : c.growth.size) / SHELL_UNITS;
    // The body is sized by the crab's own growth, so it is the same size in any
    // shell and crowds the opening of one it has outgrown.
    const growth = c.growth.size + Math.min(1, c.growth.meter / meterGoal(c.growth.size));
    const body = (shellPx(growth) / SHELL_UNITS) * BODY_SCALE;
    this.root.setPosition(c.body.x + c.body.w / 2 + c.facing * FOOT_FROM_MIDDLE * unit, c.body.y + c.body.h);
    this.root.setScale(c.facing, 1);

    if (c.swap) {
      // Out of the shell: the soft body shows in red while the old shell lies behind.
      const p = swapProgress(c.swap);
      this.shell.setVisible(!!c.shell).setAlpha(0.6).setScale(unit).setX(-30 * unit);
      this.setBody(true, f, body, body, 12 * unit * p);
      this.drawRing(c.body.x + c.body.w / 2, c.body.y - 10, p);
      return;
    }
    this.ring.clear();
    if (!spec) {
      this.shell.setVisible(false);
      this.setBody(true, f, body, body, 0);
      return;
    }
    this.shell.setVisible(true).setAlpha(1).setX(0).setTexture(TEX.shell(spec.kind, f % BOIL)).setScale(unit);
    const squeeze = beach.capped ? 1 + Math.sin(time / 140) * 0.03 : 1;
    this.setBody(false, f, body, body * squeeze, 0);
  }

  private setBody(naked: boolean, f: number, sx: number, sy: number, x: number): void {
    this.back.setTexture(naked ? TEX.nakedBack(f) : TEX.crabBack(f)).setScale(sx, sy).setX(x);
    this.front.setTexture(naked ? TEX.nakedFront(f) : TEX.crabFront(f)).setScale(sx, sy).setX(x);
  }

  /** The "stuck" shrug when it eats with a full shell. */
  stuck(scene: Phaser.Scene): void {
    scene.tweens.add({ targets: this.shell, angle: { from: -6, to: 6 }, duration: 70, yoyo: true, repeat: 2, onComplete: () => this.shell.setAngle(0) });
  }

  /** The grow burst. */
  pop(scene: Phaser.Scene): void {
    scene.tweens.add({ targets: [this.back, this.front], scaleY: this.front.scaleY * 1.25, duration: 120, yoyo: true });
  }

  private drawRing(x: number, y: number, p: number): void {
    this.ring.clear();
    this.ring.lineStyle(2, RED_HEX, 0.9);
    this.ring.beginPath();
    this.ring.arc(x, y, 6, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
    this.ring.strokePath();
  }
}
