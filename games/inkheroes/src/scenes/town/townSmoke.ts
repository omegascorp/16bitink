import type Phaser from 'phaser';
import type { TownPeople } from './townKit';
import { townKit, type PieceId } from './townKit';
import { putBuffer } from '../battle/pixelUi';
import { puffPixels } from './townPictures';

/**
 * Smoke from the town's chimneys: small pixel puffs that leave the flue,
 * rise and lean with the wind, swelling and thinning until they are gone.
 * Drawn at the art's pixel, moved by whole pixels.
 */

/** Each chimney's flue in its sprite, pixels from the sprite's top-left (unmirrored). */
export const CHIMNEYS: Partial<Record<PieceId, { readonly x: number; readonly y: number }>> = {
  blacksmith: { x: 86, y: 6 },
};

/** The flue of `art` in a people's city, if it has one. */
export const chimneyOf = (art: PieceId, faction: TownPeople = 'crown'): { readonly x: number; readonly y: number } | undefined => (faction === 'crown' ? CHIMNEYS[art] : townKit(faction).chimneys?.[art]);

/** The puffs' radii as they swell, smallest first. */
const RADII = [2, 3, 3, 4, 4, 5, 5, 6] as const;
const PUFF = {
  /** Milliseconds between puffs, and how long one lasts. */
  every: 300,
  life: 4600,
  /** Pixels a second it rises, and leans downwind (the clouds drift right too). */
  rise: 10,
  lean: 5,
  /** How far it sways side to side, pixels. */
  sway: 1.5,
  /** Opacity at its start. */
  alpha: 0.95,
} as const;
interface Puff {
  readonly img: Phaser.GameObjects.Image;
  readonly from: { readonly x: number; readonly y: number };
  readonly phase: number;
  age: number;
}

/** The smoke from one flue at `at` (container pixels), its puffs in `into`. */
export class ChimneySmoke {
  private readonly keys: string[];
  private readonly puffs: Puff[] = [];
  private wait = 0;
  private n = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly into: Phaser.GameObjects.Container, private readonly at: { x: number; y: number }) {
    this.keys = RADII.map((r) => putBuffer(scene, puffPixels(r)));
    // Start with the air already full, as if the forge had been lit all day.
    for (let t = PUFF.life; t > 0; t -= PUFF.every) this.update(PUFF.every);
  }

  update(delta: number): void {
    this.wait -= delta;
    while (this.wait <= 0) {
      this.wait += PUFF.every;
      const img = this.scene.add.image(0, 0, this.keys[0]!).setOrigin(0);
      this.into.add(img);
      this.puffs.push({ img, from: this.at, phase: (this.n++ * 2.39) % (Math.PI * 2), age: 0 });
    }
    for (const p of this.puffs) {
      p.age += delta;
      const t = p.age / PUFF.life;
      const s = p.age / 1000;
      const r = Math.min(RADII.length - 1, Math.floor(t * RADII.length));
      p.img.setTexture(this.keys[r]!);
      const R = RADII[r]!;
      // Its middle rises from the flue; its top-left is placed, so it sits on whole pixels.
      p.img.setPosition(Math.round(p.from.x + s * PUFF.lean + Math.sin(s * 1.7 + p.phase) * PUFF.sway) - R, Math.round(p.from.y - s * PUFF.rise) - R * 2);
      p.img.setAlpha(PUFF.alpha * (1 - t ** 1.6));
    }
    while (this.puffs[0] && this.puffs[0].age >= PUFF.life) this.puffs.shift()!.img.destroy();
  }

  destroy(): void {
    for (const p of this.puffs) p.img.destroy();
    this.puffs.length = 0;
    for (const k of this.keys) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
  }
}
