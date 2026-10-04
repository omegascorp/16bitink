import Phaser from 'phaser';
import { ART_RES } from '../../art/textures';
import { DUCK, riseStep, type Decoy } from '../../logic/decoy';
import type { Quarry } from '../../logic/birds';
import { rangeOf, type Rng } from '../../logic/rng';
import { SKY } from '../../logic/water';
import { itemKey } from './items';

/** In-game size the duck art is drawn at. */
const DUCK_SCALE = 0.9;

interface Duck {
  readonly sprite: Phaser.GameObjects.Image;
  vy: number;
  afloat: boolean;
  /** Sideways drift once afloat: -1 or 1. */
  readonly drift: number;
  /** Ms alive: drives the bobbing. */
  age: number;
}

/**
 * Rubber ducks let loose by the player. Under open sky they pop up and float
 * on the surface until a bird carries them off; in the deep they rise out of
 * view. Every duck in play is a decoy for hunters.
 */
export class Ducks {
  private ducks: Duck[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly sky: boolean, private readonly rng: Rng) {}

  release(x: number, y: number): void {
    const sprite = this.scene.add.image(x, y, itemKey('duck', 0)).setDepth(14).setScale(DUCK_SCALE / ART_RES);
    this.ducks = [...this.ducks, { sprite, vy: 0, afloat: false, drift: this.rng() < 0.5 ? -1 : 1, age: rangeOf(this.rng, 0, 1000) }];
  }

  /** Where hunters should go instead of the player. */
  decoys(): readonly Decoy[] {
    return this.ducks.map((d) => d.sprite);
  }

  /** Floating ducks, as diving birds see them. */
  quarries(): readonly Quarry[] {
    return this.ducks.filter((d) => d.afloat).map((d) => ({ x: d.sprite.x, y: d.sprite.y, size: DUCK.radius, safe: false }));
  }

  /** The duck a beak at (x, y) with reach r is touching, taken out of play; the caller now owns its sprite. */
  snatch(x: number, y: number, r: number): Phaser.GameObjects.Image | null {
    const duck = this.ducks.find((d) => Phaser.Math.Distance.Between(x, y, d.sprite.x, d.sprite.y) < r + DUCK.radius);
    if (!duck) return null;
    this.ducks = this.ducks.filter((d) => d !== duck);
    duck.sprite.setAngle(0);
    return duck.sprite;
  }

  update(dt: number, view: Phaser.Geom.Rectangle, worldWidth: number): void {
    this.ducks = this.ducks.filter((d) => {
      d.age += dt * 1000;
      const s = d.sprite;
      if (!d.afloat) {
        const next = riseStep(s.y, d.vy, dt, this.sky ? SKY.surfaceY : null);
        Object.assign(d, { vy: next.vy, afloat: next.afloat });
        s.setPosition(s.x + Math.sin(d.age / 400) * 20 * dt, next.y).setAngle(Math.sin(d.age / 300) * 18);
      } else {
        // Bobbing on the swell, drifting slowly along the surface.
        const x = Phaser.Math.Clamp(s.x + d.drift * DUCK.driftSpeed * dt, 40, worldWidth - 40);
        s.setPosition(x, SKY.surfaceY + DUCK.floatDepth + Math.sin(d.age / 450) * 3).setAngle(Math.sin(d.age / 600) * 8);
      }
      // Only in the deep does a duck leave, by rising out of sight.
      const gone = !this.sky && s.y < view.top - 60;
      if (gone) s.destroy();
      return !gone;
    });
  }
}
