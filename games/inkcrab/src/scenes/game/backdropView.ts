import Phaser from 'phaser';
import { BACKDROP_SCALE, BACKDROP_W, BOAT_BOX, type BoatSpec, THEME_BOATS, THEMES, type ThemeId } from '../../art/backdrop';
import { ART_RES } from '../../art/palette';
import { TEX } from '../../art/textures';
import { sailAt } from '../../logic/sailing';

/** World px left of the level where the backdrop starts, so it covers the view at any scroll. */
const LEFT = -1200;
const DEPTH = 0.1;
const DEPTH_STEP = 0.1;

interface Boat {
  readonly spec: BoatSpec;
  readonly sprites: readonly Phaser.GameObjects.Image[];
  readonly y: number;
  readonly phase: number;
}

/**
 * The faraway beach: parallax layers anchored above the beach's typical
 * surface height, each sliding slower than the world the further off it
 * is, and the boats sailing on them. Boats repeat every backdrop tile, as
 * the layers do, so they line up with the scenery wherever the camera is.
 */
export class BackdropView {
  private readonly boats: Boat[] = [];

  constructor(scene: Phaser.Scene, theme: ThemeId, ground: number, span: number) {
    const layers = THEMES[theme];
    const tops = new Map<string, number>();
    layers.forEach((layer, i) => {
      const h = layer.height * BACKDROP_SCALE;
      tops.set(layer.id, ground - layer.lift - h);
      scene.add.tileSprite(LEFT, ground - layer.lift - h, span, h, TEX.backdrop(theme, layer.id))
        .setOrigin(0)
        .setTileScale(BACKDROP_SCALE / ART_RES)
        .setScrollFactor(layer.scroll, 1)
        .setDepth(DEPTH + i * DEPTH_STEP);
    });
    const tile = BACKDROP_W * BACKDROP_SCALE;
    THEME_BOATS[theme].forEach((spec, i) => {
      const at = layers.findIndex((l) => l.id === spec.layer);
      const layer = layers[at]!;
      const box = BOAT_BOX[spec.kind];
      const depth = DEPTH + (at + (spec.front ? 1 : 0)) * DEPTH_STEP + DEPTH_STEP / 2;
      const sprites = Array.from({ length: Math.ceil(span / tile) + 1 }, () =>
        scene.add.image(0, 0, TEX.boat(theme, i))
          .setOrigin(-box.left / (box.right - box.left), -box.top / (box.bottom - box.top))
          .setScale(BACKDROP_SCALE / ART_RES)
          .setScrollFactor(layer.scroll, 1)
          .setDepth(depth));
      this.boats.push({ spec, sprites, y: tops.get(spec.layer)! + spec.water * BACKDROP_SCALE, phase: i * 1.7 });
    });
  }

  /** Sails the boats on, with a gentle bob and roll on the swell. */
  update(time: number): void {
    const t = time / 1000;
    for (const b of this.boats) {
      const { x, heading } = sailAt(b.spec, t, BACKDROP_W);
      const bob = Math.sin(t * 1.6 + b.phase) * 0.35;
      const roll = Math.sin(t * 1.1 + b.phase) * 0.012;
      b.sprites.forEach((s, k) => {
        s.setPosition(LEFT + (x + k * BACKDROP_W) * BACKDROP_SCALE, b.y + bob).setFlipX(heading < 0).setRotation(roll);
      });
    }
  }
}
