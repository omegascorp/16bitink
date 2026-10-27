import Phaser from 'phaser';
import { NIB_FRAME, propOffsets, type NibMark, type NibPose } from '../art/nib';
import { ART_RES, BOIL } from '../art/palette';
import { FOOTING_STEPS, type Creature, type LossCause } from '../logic/world';
import { nibKey, shockKey } from './textures';

const S = 1 / ART_RES;
/** Line-boil frames per second. */
const BOIL_FPS = 7;
const MARK_FOR: Record<LossCause, NibMark> = { burnt: 'soot', inked: 'ink', pricked: 'dizzy', melted: 'tears', fell: 'dizzy' };

/**
 * Nib on screen: picks the pose from what the creature is doing, carries the
 * sack and lantern, and plays the cheer or the silly fail.
 */
export class NibView {
  private readonly body: Phaser.GameObjects.Image;
  private readonly sack: Phaser.GameObjects.Image;
  private readonly lantern: Phaser.GameObjects.Image;
  private ending: 'won' | 'lost' | null = null;
  private mark: NibMark = 'dizzy';
  private walkClock = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly layer: Phaser.GameObjects.Layer) {
    this.sack = scene.add.image(0, 0, 'sack').setScale(S);
    this.body = scene.add.image(0, 0, nibKey('stand', 0)).setScale(S).setOrigin(NIB_FRAME.ox / NIB_FRAME.w, NIB_FRAME.oy / NIB_FRAME.h);
    this.lantern = scene.add.image(0, 0, 'lantern').setScale(S);
    layer.add([this.sack, this.body, this.lantern]);
  }

  update(nib: Creature, time: number, delta: number): void {
    const boil = Math.floor((time / 1000) * BOIL_FPS) % BOIL;
    if (this.ending === 'lost') {
      // Googly eyes: the shocked face swaps pupils fast.
      this.body.setTexture(shockKey(this.mark, Math.floor(time / 90) % BOIL));
      return;
    }
    const footed = nib.air <= FOOTING_STEPS;
    let pose: NibPose = 'stand';
    if (this.ending === 'won') pose = 'cheer';
    else if (nib.wet > 3 && !footed) pose = 'swim';
    else if (!footed && nib.vy < -0.3) pose = 'cheer';
    else if (Math.abs(nib.vx) > 0.15 && footed) {
      this.walkClock += delta * Math.abs(nib.vx) * 0.012;
      pose = (['walk0', 'walk1', 'walk2', 'walk3'] as const)[Math.floor(this.walkClock) % 4]!;
    }
    this.body.setTexture(nibKey(pose, boil));
    const hop = this.ending === 'won' ? -Math.abs(Math.sin(time / 160)) * 10 : 0;
    this.place(nib.x, nib.y + hop, nib.facing, pose);
  }

  private place(x: number, y: number, facing: number, pose: NibPose): void {
    const flip = facing < 0;
    this.body.setPosition(x, y).setFlipX(flip);
    const off = propOffsets(pose);
    const sx = flip ? -1 : 1;
    this.sack.setPosition(x + off.sack.x * sx, y + off.sack.y).setFlipX(flip);
    this.lantern.setPosition(x + off.lantern.x * sx, y + off.lantern.y);
  }

  /** The win: Nib cheers and hops. */
  cheer(): void {
    this.ending = 'won';
  }

  /**
   * The fail: Nib jumps out of its fur with eyes far too big, the sack and
   * lantern go flying, and coins spill out of the sack.
   */
  fail(cause: LossCause, nib: Creature, floorY: number): void {
    this.ending = 'lost';
    this.mark = MARK_FOR[cause];
    const { scene } = this;
    const flip = nib.facing < 0;
    this.body.setTexture(shockKey(this.mark, 0)).setFlipX(flip);
    // Jump, then land with a wobble.
    scene.tweens.add({ targets: this.body, y: nib.y - 34, duration: 220, ease: 'Quad.out', yoyo: true, hold: 60, onComplete: () => {
      scene.tweens.add({ targets: this.body, scaleX: S * 1.12, scaleY: S * 0.88, duration: 90, yoyo: true, repeat: 1 });
    } });
    const ground = Math.min(floorY, nib.y + 24);
    const away = flip ? 1 : -1;
    this.tumble(this.sack, this.sack.x + away * 46, ground - 10, away * 540);
    this.tumble(this.lantern, this.lantern.x - away * 38, ground - 8, -away * 400);
    // Coins spill out of the sack in little arcs.
    for (let i = 0; i < 7; i++) {
      const coin = scene.add.image(this.sack.x, this.sack.y - 6, 'coins', i % 4).setScale(S);
      this.layer.add(coin);
      const tx = this.sack.x + away * (20 + i * 9) + (i % 2 ? 6 : -6);
      scene.tweens.add({ targets: coin, x: tx, duration: 520 + i * 40, ease: 'Linear' });
      scene.tweens.add({ targets: coin, y: this.sack.y - 30 - (i % 3) * 10, duration: 220 + i * 15, ease: 'Quad.out', yoyo: false, onComplete: () => {
        scene.tweens.add({ targets: coin, y: ground - 4, duration: 300, ease: 'Bounce.out' });
      } });
      scene.tweens.add({ targets: coin, angle: 360 * (i % 2 ? 1 : -1), duration: 600 });
    }
  }

  private tumble(obj: Phaser.GameObjects.Image, x: number, y: number, spin: number): void {
    const { scene } = this;
    scene.tweens.add({ targets: obj, x, duration: 700, ease: 'Linear' });
    scene.tweens.add({ targets: obj, y: obj.y - 40, duration: 260, ease: 'Quad.out', onComplete: () => {
      scene.tweens.add({ targets: obj, y, duration: 440, ease: 'Bounce.out' });
    } });
    scene.tweens.add({ targets: obj, angle: spin, duration: 700, ease: 'Quad.out' });
  }
}
