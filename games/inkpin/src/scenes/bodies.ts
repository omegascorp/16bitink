import Phaser from 'phaser';
import { VINE_FOOT } from '../art/vine';
import { ART_RES } from '../art/palette';
import type { Boulder } from '../logic/boulders';
import type { World } from '../logic/world';
import type { Effects } from './effects';
import { vineKey } from './textures';

const S = 1 / ART_RES;
/** How long a burning crate or vine takes to char and fade (ms). */
const BURN_MS = 700;
/** Puffs of smoke along a burning vine, every this far (board px). */
const SMOKE_EVERY = 60;

/** A riding raft leans this much (radians) per px per step it drifts: it reads as afloat. */
const RAFT_LEAN = 0.05;

/**
 * The things in a level besides the grains and the creatures: the boulders
 * rolling (basalt ones in the volcano), the crates and pumice rafts bobbing
 * on the water and the lava, and the vines, which grow from their seeds and
 * burn away in lava. Drawn behind the liquids, so a crate or a raft sits
 * half under.
 */
export class BodiesView {
  private readonly boulders: Phaser.GameObjects.Image[];
  private readonly vines: Phaser.GameObjects.Image[];
  private readonly seeds: (Phaser.GameObjects.Image | null)[];

  constructor(private readonly scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, private readonly world: World, private readonly fx: Effects) {
    // A vine's picture reaches VINE_FOOT below its foot; the seed sits in a crack in the floor.
    this.vines = world.vines.map((v) => scene.add.image(v.x, v.bottom + VINE_FOOT, vineKey(v.def)).setScale(S).setOrigin(0.5, 1));
    this.seeds = world.vines.map((v) => (v.def.seed ? scene.add.image(v.x, v.bottom + 4, 'seed').setScale(S).setOrigin(0.5, 1) : null));
    const basalt = world.level.ruin === 'volcano';
    const key = (b: Boulder): string => (b.raft ? 'raft' : b.crate ? 'crate' : basalt ? 'boulder-basalt' : 'boulder');
    this.boulders = world.boulders.map((b) => scene.add.image(b.x, b.y, key(b)).setScale(S));
    layer.add([...this.vines, ...this.seeds.filter((s): s is Phaser.GameObjects.Image => s !== null), ...this.boulders]);
    this.resync();
  }

  /** Follows the world each frame: boulders roll, crates bob, vines grow. */
  update(): void {
    this.world.boulders.forEach((b, i) => {
      const img = this.boulders[i];
      if (!img || b.gone) return;
      img.setPosition(b.x, b.y).setRotation(b.raft ? Math.max(-0.04, Math.min(0.04, b.vx * RAFT_LEAN)) : b.crate ? 0 : b.angle);
    });
    this.world.vines.forEach((v, i) => {
      const img = this.vines[i];
      if (!img || v.burnt || !v.def.seed) return;
      this.crop(img, v.grown);
    });
  }

  /** A crate burnt away: it chars, smokes and fades. */
  crateBurnt(x: number, y: number): void {
    const i = this.world.boulders.findIndex((b) => b.gone && Math.hypot(b.x - x, b.y - y) < 1);
    const img = this.boulders[i];
    if (!img) return;
    this.fx.puff('smoke', x, y - 10);
    this.fx.puff('smoke', x + 12, y - 4);
    this.char(img);
  }

  /** A vine burnt away: smoke all along it, and it chars and fades. */
  vineBurnt(x: number): void {
    const i = this.world.vines.findIndex((v) => v.burnt && v.x === x);
    const v = this.world.vines[i];
    const img = this.vines[i];
    if (!v || !img) return;
    for (let y = v.bottom - 20; y > v.top; y -= SMOKE_EVERY) this.fx.puff('smoke', v.x, y);
    this.char(img);
    const seed = this.seeds[i];
    if (seed) this.char(seed);
  }

  /** A seed sprouting: it gives a little hop. */
  sprout(x: number): void {
    const i = this.world.vines.findIndex((v) => v.x === x);
    const seed = this.seeds[i];
    if (!seed) return;
    this.scene.tweens.add({ targets: seed, scaleX: S * 1.25, scaleY: S * 0.8, duration: 120, yoyo: true, repeat: 1 });
  }

  /** Puts every picture back as the world is now (after a rewind). */
  resync(): void {
    this.scene.tweens.killTweensOf([...this.boulders, ...this.vines, ...this.seeds.filter((s) => s !== null)]);
    this.world.boulders.forEach((b, i) => {
      this.boulders[i]?.setVisible(!b.gone).setAlpha(1).clearTint().setScale(S).setPosition(b.x, b.y);
    });
    this.world.vines.forEach((v, i) => {
      const img = this.vines[i];
      img?.setVisible(!v.burnt).setAlpha(1).clearTint();
      if (img) this.crop(img, v.grown);
      this.seeds[i]?.setVisible(!v.burnt).setAlpha(1).clearTint().setScale(S);
    });
  }

  /** Shows the bottom `grown` share of a vine's picture: it grows up from its foot. */
  private crop(img: Phaser.GameObjects.Image, grown: number): void {
    const h = img.frame.height;
    const shown = Math.round(h * grown);
    img.setCrop(0, h - shown, img.frame.width, shown).setVisible(shown > 0);
  }

  private char(img: Phaser.GameObjects.Image): void {
    img.setTint(0x3a2e28);
    this.scene.tweens.add({ targets: img, alpha: 0, duration: BURN_MS, ease: 'Quad.in', onComplete: () => img.setVisible(false) });
  }
}
