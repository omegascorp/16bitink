import Phaser from 'phaser';
import { ART_RES } from '../art/palette';
import { RUBY_GLINTS, SLAB_PAD } from '../art/volcanoBodies';
import type { SoundBoard } from '../audio/sfx';
import { LEDGE_T } from '../logic/ledges';
import { inPlay } from '../logic/rubies';
import type { World } from '../logic/world';
import type { Effects } from './effects';
import { rubyKey, slabKey } from './textures';

const S = 1 / ART_RES;
/** How far a cracking ledge shakes (board px), and how often it sheds a crumb (ms). */
const SHAKE = 1.3;
const CRUMB_EVERY = 90;
/** A ruby glints once in this long (ms), each at its own moment. */
const GLINT_EVERY = 2600;
const GLINT_MS = 260;

/**
 * The Volcano Shrine's things on the board: the crumbling ledges (they
 * shake and shed crumbs while they crack, then fall as slabs and land in a
 * puff of dust) and the fire rubies (they glint, and hop into Nib's sack
 * like coins). Drawn behind the liquids, as the other bodies are.
 */
export class ShrineView {
  private readonly slabs: Phaser.GameObjects.Image[];
  private readonly rubies: Phaser.GameObjects.Image[];
  private lastCrumb = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly layer: Phaser.GameObjects.Layer, private readonly world: World, private readonly fx: Effects, private readonly sfx: () => SoundBoard) {
    this.slabs = world.ledges.map((l) => scene.add.image(l.x0 - SLAB_PAD, l.y - SLAB_PAD, slabKey(l.def)).setOrigin(0).setScale(S));
    this.rubies = world.rubies.map((r) => scene.add.image(r.x, r.y, rubyKey(0)).setScale(S));
    layer.add([...this.slabs, ...this.rubies]);
    this.resync();
  }

  /** Follows the world each frame. */
  update(time: number): void {
    const crumb = time - this.lastCrumb > CRUMB_EVERY;
    if (crumb) this.lastCrumb = time;
    this.world.ledges.forEach((l, i) => {
      const img = this.slabs[i];
      if (!img) return;
      const shake = l.state === 'cracking' ? Math.sin(time / 22 + i) * SHAKE : 0;
      img.setPosition(l.x0 - SLAB_PAD + shake, l.y - SLAB_PAD + (l.state === 'cracking' ? Math.abs(shake) * 0.4 : 0));
      if (l.state === 'cracking' && crumb) this.dropCrumb(l.x0 + Math.random() * (l.x1 - l.x0), l.y + LEDGE_T * 2);
    });
    this.world.rubies.forEach((r, i) => {
      const img = this.rubies[i];
      if (!img || !img.visible || !inPlay(r)) return;
      img.setPosition(r.x, r.y);
      // A glint now and then: frame 1, 2, 1 over GLINT_MS.
      const phase = (time + r.id * 977) % GLINT_EVERY;
      const g = phase < GLINT_MS ? [1, 2, 1][Math.min(2, Math.floor((phase / GLINT_MS) * 3))]! : 0;
      img.setTexture(rubyKey(Math.min(RUBY_GLINTS - 1, g)));
    });
  }

  /** A ledge starts to crack: a sharp crack, a burst of crumbs. */
  cracked(index: number): void {
    const l = this.world.ledges[index];
    if (!l) return;
    this.sfx().play('crack');
    for (let k = 0; k < 5; k++) this.dropCrumb(l.x0 + Math.random() * (l.x1 - l.x0), l.y + LEDGE_T * 2);
  }

  /** A slab has landed: a thud and a puff of dust off each end. */
  landed(index: number): void {
    const l = this.world.ledges[index];
    if (!l) return;
    this.sfx().play('thud');
    const foot = l.y + LEDGE_T * 2;
    for (const x of [l.x0, (l.x0 + l.x1) / 2, l.x1]) this.fx.puff('dust', x, foot - 4);
    this.scene.cameras.main.shake(140, 0.003);
  }

  /** A ruby taken: it hops into Nib's sack. */
  taken(id: number, x: number, y: number): void {
    const i = this.world.rubies.findIndex((r) => r.id === id);
    const img = this.rubies[i];
    if (!img) return;
    this.sfx().play('ruby');
    // A copy flies, so a rewind can show the ruby again.
    const flier = this.scene.add.image(x, y, rubyKey(2)).setScale(S);
    this.layer.add(flier);
    img.setVisible(false);
    this.fx.flyCoin(flier, x, y, this.world.nib);
  }

  /** A ruby gone down a drain or off the board. */
  lost(id: number): void {
    const i = this.world.rubies.findIndex((r) => r.id === id);
    const img = this.rubies[i];
    if (img) this.scene.tweens.add({ targets: img, alpha: 0, scale: S * 0.5, duration: 250, onComplete: () => img.setVisible(false) });
  }

  /** Puts every picture back as the world is now (after a rewind). */
  resync(): void {
    this.scene.tweens.killTweensOf([...this.slabs, ...this.rubies]);
    this.world.ledges.forEach((l, i) => this.slabs[i]?.setPosition(l.x0 - SLAB_PAD, l.y - SLAB_PAD));
    this.world.rubies.forEach((r, i) => this.rubies[i]?.setVisible(inPlay(r)).setAlpha(1).setScale(S).setPosition(r.x, r.y));
  }

  /** A crumb of basalt dropping from under a ledge and fading as it falls. */
  private dropCrumb(x: number, y: number): void {
    const c = this.scene.add.image(x, y, 'crumb').setScale(S * (0.6 + Math.random() * 0.6)).setAngle(Math.random() * 360);
    this.layer.add(c);
    this.scene.tweens.add({ targets: c, y: y + 40 + Math.random() * 50, angle: c.angle + 180, alpha: 0, duration: 500 + Math.random() * 300, ease: 'Quad.in', onComplete: () => c.destroy() });
  }
}
