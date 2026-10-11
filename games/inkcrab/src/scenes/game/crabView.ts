import { shellFit } from '../../art/shellFit';
import Phaser from 'phaser';
import { FOOT, FRAME, SHELL_MID, SHELL_UNITS } from '../../art/frame';
import { crabShift } from '../../art/mouth';
import { BOIL, RED_HEX } from '../../art/palette';
import { PUFF, TEX } from '../../art/textures';
import { meterGoal } from '../../logic/growth';
import type { Beach } from '../../logic/sim';
import { bodyFill, shellPx, type Shell } from '../../logic/shells';
import { swapProgress } from '../../logic/swap';

/** Frame px from the shell's middle to the opening (FOOT). */
const FOOT_FROM_MIDDLE = FOOT.x - SHELL_MID;
/** Leg-pose frames per second while walking; idle line boil is slower. */
const WALK_FPS = 10;
const BOIL_MS = 240;
/** A naked crab's drawing size relative to a shell of the same body size. */
const NAKED_SCALE = 0.95;
/** Radians the crab tips down a pit's slope as it slides. */
const PIT_TILT = 0.35;
/** Radians it tips nose up (or down) climbing up (or down) the mangrove roots. */
const CLIMB_TILT = 0.5;
/** Swap progress where the crab slips from the old shell to the new, hidden by a puff of sand. */
const SWITCH = 0.5;
const PUFF_SPAN = 0.16;
const BLINK_MS = 90;

/**
 * The player in three layers: far legs, the shell, then the head, near legs
 * and claw. The body is scaled by how much of the shell it fills, so a crab
 * at its cap visibly crowds the opening.
 *
 * Moving house, the new shell is set mouth to mouth with the old one: the
 * crab reaches into it, a puff of sand covers the switch, and it peeks out
 * of the new mouth facing back. Its tail is never out of a shell.
 */
export class CrabView {
  readonly root: Phaser.GameObjects.Container;
  private readonly back: Phaser.GameObjects.Image;
  private readonly shell: Phaser.GameObjects.Image;
  private readonly incoming: Phaser.GameObjects.Image;
  private readonly front: Phaser.GameObjects.Image;
  private readonly puff: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Graphics;
  private walkClock = 0;
  private lastY = 0;

  constructor(scene: Phaser.Scene) {
    const ox = FOOT.x / FRAME;
    const oy = FOOT.y / FRAME;
    this.back = scene.add.image(0, 0, TEX.crabBack(0)).setOrigin(ox, oy);
    this.shell = scene.add.image(0, 0, TEX.shell('periwinkle', 0)).setOrigin(ox, oy);
    this.incoming = scene.add.image(0, 0, TEX.shell('periwinkle', 0)).setOrigin(ox, oy).setVisible(false);
    this.front = scene.add.image(0, 0, TEX.crabFront(0)).setOrigin(ox, oy);
    this.puff = scene.add.image(0, 0, TEX.puff(0)).setVisible(false);
    this.root = scene.add.container(0, 0, [this.back, this.shell, this.incoming, this.front, this.puff]).setDepth(5);
    this.ring = scene.add.graphics().setDepth(6);
  }

  update(beach: Beach, time: number, dt: number): void {
    const c = beach.crab;
    const walking = Math.abs(c.body.vx) > 1 && c.body.onGround && !c.swap;
    this.walkClock = walking ? this.walkClock + dt : 0;
    const f = walking ? Math.floor(this.walkClock * WALK_FPS) % BOIL : Math.floor(time / BOIL_MS) % BOIL;
    const spec = c.shell;
    const unit = shellPx(spec ? spec.size : c.growth.size) / SHELL_UNITS;
    // The shell's drawing, scaled to look its size whatever its kind (see shellFit.ts); the crab goes by the size alone.
    const drawn = spec ? unit * shellFit(spec.kind) : unit;
    // In a shell the body is sized against it (see bodyFill), so it always sits
    // in the opening and grows to crowd it at the cap.
    const growth = c.growth.size + Math.min(1, c.growth.meter / meterGoal(c.growth.size));
    const body = spec ? unit * bodyFill(spec, growth) : (shellPx(growth) / SHELL_UNITS) * NAKED_SCALE;
    this.root.setPosition(c.body.x + c.body.w / 2 + c.facing * FOOT_FROM_MIDDLE * drawn, c.body.y + c.body.h);
    this.root.setScale(c.facing, 1);
    // Tipped down the slope while an antlion pit's sand carries it in; nose up or down as it climbs.
    const rise = c.body.y - this.lastY;
    this.lastY = c.body.y;
    const climb = c.climbing && Math.abs(rise) > 0.05 ? -Math.sign(rise) * c.facing * CLIMB_TILT : 0;
    const tilt = Math.sign(beach.pitPull(c.body)) * PIT_TILT - climb;
    this.root.setRotation(this.root.rotation + (tilt - this.root.rotation) * Math.min(1, dt * 10));
    // Blinks through the grace after being caught.
    this.root.setAlpha(c.safe > 0 && Math.floor(time / BLINK_MS) % 2 === 0 ? 0.35 : 1);

    const target = c.swap ? beach.items.get(c.swap.itemId) : undefined;
    if (c.swap && target?.kind.type === 'shell') {
      this.shell.setVisible(!!spec).setTexture(TEX.shell(spec?.kind ?? 'periwinkle', f % BOIL));
      this.drawSwap(swapProgress(c.swap), f, drawn, body, spec, target.kind.shell);
      this.drawRing(c.body.x + c.body.w / 2, c.body.y - 10, swapProgress(c.swap));
      return;
    }
    this.ring.clear();
    this.incoming.setVisible(false);
    this.puff.setVisible(false);
    if (!spec) {
      this.shell.setVisible(false);
      this.setBody(true, f, body, body, 1, 0);
      return;
    }
    this.shell.setVisible(true).setTexture(TEX.shell(spec.kind, f % BOIL)).setScale(drawn);
    const squeeze = beach.capped ? 1 + Math.sin(time / 140) * 0.03 : 1;
    this.setBody(false, f, body, body * squeeze, 1, crabShift(spec.kind, drawn, body));
    // Hiding: pulled all the way in, only the shell shows.
    this.back.setVisible(!c.hidden);
    this.front.setVisible(!c.hidden);
  }

  /**
   * Mouth to mouth: the old shell where it is, the new one mirrored just
   * ahead of it. Before the switch the exposed (red) crab reaches out of the
   * old mouth; after it, it peeks out of the new one, facing back.
   */
  private drawSwap(p: number, f: number, unit: number, body: number, from: Shell | null, to: Shell): void {
    const toUnit = (shellPx(to.size) / SHELL_UNITS) * shellFit(to.kind);
    this.shell.setScale(unit);
    this.incoming.setVisible(true).setTexture(TEX.shell(to.kind, f)).setScale(-toUnit, toUnit);
    const before = p < SWITCH;
    // Reaching in grows towards the switch; peeking out grows after it.
    const reach = before ? Math.min(1, p / (SWITCH - PUFF_SPAN / 2)) : Math.min(1, (p - SWITCH) / (SWITCH - PUFF_SPAN / 2));
    const s = body * (0.55 + 0.45 * reach);
    const shift = before ? (from ? crabShift(from.kind, unit, s) : 0) : -crabShift(to.kind, toUnit, s);
    this.setBody(true, f, s, s, before ? 1 : -1, shift);
    const hidden = Math.abs(p - SWITCH) < PUFF_SPAN / 2;
    this.back.setVisible(!hidden);
    this.front.setVisible(!hidden);
    // The puff swells and settles around the joined mouths.
    const puff = Math.max(0, 1 - Math.abs(p - SWITCH) / PUFF_SPAN);
    const size = (Math.max(unit, toUnit) * SHELL_UNITS * 0.75) / PUFF;
    this.puff.setVisible(puff > 0).setTexture(TEX.puff(f)).setPosition(0, -size * PUFF * 0.3).setScale(size * (0.6 + 0.4 * puff)).setAlpha(puff);
  }

  /**
   * `side` 1: out of the shell it's in; -1: mirrored, out of the new one facing
   * back. `shift` slides it into the opening (see crabShift).
   */
  private setBody(naked: boolean, f: number, sx: number, sy: number, side: 1 | -1, shift: number): void {
    this.back.setVisible(true).setTexture(naked ? TEX.nakedBack(f) : TEX.crabBack(f)).setScale(sx * side, sy).setX(shift);
    this.front.setVisible(true).setTexture(naked ? TEX.nakedFront(f) : TEX.crabFront(f)).setScale(sx * side, sy).setX(shift);
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
