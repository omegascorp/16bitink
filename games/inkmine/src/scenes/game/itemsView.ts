import Phaser from 'phaser';
import { ITEM_FRAME } from '../../art/itemArt';
import { WRECK_FRAME } from '../../art/wreckArt';
import { recipeOf } from '../../logic/blueprints';
import { BOIL, HIGHLIGHT_HEX } from '../../art/palette';
import { pulseWreckTexture, TEX, wreckTexture } from '../../art/textures';
import type { Mine } from '../../logic/mine';
import type { Ring } from './ring';

const BOIL_FPS = 8;

/**
 * Things to find in the world. One still in the rock shows through it, a
 * little sunk, with a highlighter ring that pulses so it can be found; a
 * loose one sits on the ground. A broken part (wreck) is drawn bigger, as
 * the gear piece it was, tipped over in the dust. Pouched, banked and
 * taken-apart items aren't drawn.
 */
export class ItemsView {
  private readonly sprites: Phaser.GameObjects.Image[] = [];
  private readonly rings: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene, private readonly tile: number) {
    this.rings = scene.add.graphics().setDepth(3.5);
  }

  update(mine: Mine, now: number, ring: Ring): void {
    const f = Math.floor((now / 1000) * BOIL_FPS) % BOIL;
    const scale = (this.tile * 0.95) / ITEM_FRAME / 3;
    const g = this.rings.clear();
    const pulse = 0.35 + 0.3 * Math.abs(Math.sin(now / 420));
    mine.items.forEach((it, i) => {
      const img = this.sprites[i] ?? this.sprites[this.sprites.push(this.scene.add.image(0, 0, TEX.item(it.kind, 0)).setDepth(3.6)) - 1]!;
      const shown = it.state === 'rock' || it.state === 'loose';
      img.setVisible(shown);
      if (!shown) return;
      // A wreck is drawn as its blueprint's piece at that mark, or the tool it was.
      const recipe = it.kind === 'wreck' ? recipeOf(it.blueprint ?? '') : undefined;
      const wreck = recipe ? wreckTexture(this.scene, recipe.piece, recipe.mk, f) : it.kind === 'wreck' && it.blueprint === 'pulse' ? pulseWreckTexture(this.scene, f) : null;
      // A wreck stands a little taller than a tile, sitting on the ground it rests on.
      if (wreck) img.setTexture(wreck).setScale((this.tile * 1.3) / WRECK_FRAME / 3).setPosition(ring.near(it.x + it.w / 2), it.y + it.h - this.tile * 0.42);
      else img.setTexture(TEX.item(it.kind, f)).setScale(scale).setPosition(ring.near(it.x + it.w / 2), it.y + it.h / 2 - (it.state === 'loose' ? 4 : 0));
      img.setAlpha(it.state === 'rock' ? 0.8 : 1);
      if (it.state === 'rock') {
        const [x, y] = it.tile;
        g.lineStyle(3, HIGHLIGHT_HEX, pulse).strokeCircle(ring.near((x + 0.5) * this.tile), (y + 0.5) * this.tile, this.tile * 0.62);
      }
    });
  }
}
