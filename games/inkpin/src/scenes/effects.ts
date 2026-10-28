import type Phaser from 'phaser';
import { ART_RES } from '../art/palette';
import type { SoundBoard } from '../audio/sfx';
import type { BlotEnd, Creature } from '../logic/world';

const S = 1 / ART_RES;

/** The little moments drawn over a level: puffs, guards beaten, coins flying to Nib, the chest opening. */
export class Effects {
  constructor(private readonly scene: Phaser.Scene, private readonly layer: Phaser.GameObjects.Layer, private readonly sfx: () => SoundBoard) {}

  /** A soft puff of steam or smoke drifting up. */
  puff(kind: 'steam' | 'smoke', x: number, y: number): void {
    const { scene } = this;
    const p = scene.add.image(x, y, kind).setScale(S * (0.6 + Math.random() * 0.5)).setAlpha(0.9);
    this.layer.add(p);
    scene.tweens.add({ targets: p, y: y - 40 - Math.random() * 30, x: x + (Math.random() - 0.5) * 24, scale: p.scale * 1.8, alpha: 0, duration: 700 + Math.random() * 400, onComplete: () => p.destroy() });
  }

  /** A picked-up coin hops into Nib's backpack, so even one dug out from deep down is seen going. */
  flyCoin(c: Phaser.GameObjects.Image, x: number, y: number, nib: Creature): void {
    c.setPosition(x, y).setVisible(true).setDepth(1);
    this.scene.tweens.add({ targets: c, x: nib.x - nib.facing * 10, y: nib.y - 18, scale: S * 0.6, alpha: 0.4, duration: 260, ease: 'Quad.in', onComplete: () => c.destroy() });
  }

  /** A guard beaten: squashed flat, washed away tumbling, or rocketing up with a singed bottom. */
  guardGone(img: Phaser.GameObjects.Image, scaredKey: string, how: BlotEnd, x: number, y: number): void {
    const { scene } = this;
    img.setTexture(scaredKey);
    if (how === 'stomped') {
      this.sfx().play('stomp');
      scene.tweens.add({
        targets: img, scaleY: S * 0.28, scaleX: S * 1.25, duration: 90, ease: 'Quad.out',
        onComplete: () => {
          for (let k = 0; k < 3; k++) this.puff('steam', x + (k - 1) * 12, y + 12);
          scene.tweens.add({ targets: img, alpha: 0, delay: 350, duration: 250, onComplete: () => img.setVisible(false) });
        },
      });
      return;
    }
    this.sfx().play('squelch');
    if (how === 'washed') {
      img.setTint(0xb8c8e0);
      for (let k = 0; k < 3; k++) this.puff('steam', x + (k - 1) * 10, y - 4);
      scene.tweens.add({ targets: img, angle: img.flipX ? 200 : -200, x: x + (img.flipX ? 40 : -40), y: y + 10, alpha: 0, duration: 800, ease: 'Quad.in' });
    } else {
      img.setTint(0x7a6a62);
      for (let k = 0; k < 4; k++) this.puff('smoke', x + (k - 1.5) * 8, y + 10);
      scene.tweens.add({ targets: img, y: y - 90, alpha: 0, duration: 650, ease: 'Quad.in' });
    }
  }

  /** The chest flies open and its golden idol jumps out into Nib's pack. */
  openChest(img: Phaser.GameObjects.Image, chest: { x: number; y: number }, nib: Creature): void {
    const { scene } = this;
    img.setTexture('chest-open');
    scene.tweens.add({ targets: img, scale: S * 1.12, duration: 140, yoyo: true });
    this.sfx().play('win');
    const idol = scene.add.image(chest.x, chest.y - 10, 'idol').setScale(S);
    this.layer.add(idol);
    scene.tweens.add({ targets: idol, y: chest.y - 70, duration: 380, ease: 'Quad.out', onComplete: () => {
      scene.tweens.add({ targets: idol, x: nib.x - 12, y: nib.y - 8, scale: S * 0.4, alpha: 0.2, duration: 420, ease: 'Quad.in', onComplete: () => idol.destroy() });
    } });
    for (let k = 0; k < 6; k++) this.puff('steam', chest.x + (k - 2.5) * 8, chest.y - 16);
  }
}
