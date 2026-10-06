import Phaser from 'phaser';
import { CRITTER_FRAME, CRITTER_GROUND, CRITTER_RES, CRITTER_SPAN } from '../../art/critterArt';
import { BOIL } from '../../art/palette';
import { TEX } from '../../art/textures';
import type { Critter } from '../../logic/critters';

interface CritterSprites {
  readonly mark: Phaser.GameObjects.Image;
  readonly art: Phaser.GameObjects.Image;
}

/** Leg-pose frames per second at a walk. */
const WALK_FPS = 9;
const BOIL_MS = 260;

/**
 * Ghost crabs. Ones that can eat the player are inked red; ones it can eat
 * get a highlighter swipe, like food. It changes as the player grows.
 */
export class CrittersView {
  private readonly sprites = new Map<number, CritterSprites>();

  constructor(private readonly scene: Phaser.Scene) {}

  sync(critters: ReadonlyMap<number, Critter>, playerSize: number, time: number): void {
    for (const [id, s] of this.sprites) {
      if (critters.has(id)) continue;
      s.mark.destroy();
      s.art.destroy();
      this.sprites.delete(id);
    }
    for (const c of critters.values()) {
      const s = this.sprites.get(c.id) ?? this.create(c);
      const walking = Math.abs(c.vx) > 1 && c.onGround;
      const f = Math.floor(time / (walking ? 1000 / WALK_FPS : BOIL_MS) + c.id) % BOIL;
      const cx = c.x + c.w / 2;
      const bottom = c.y + c.h;
      const k = c.w / CRITTER_SPAN[c.species] / CRITTER_RES;
      s.art.setTexture(TEX.critter(c.species, c.size > playerSize, f)).setScale(k * c.dir, k).setPosition(cx, bottom);
      s.mark.setVisible(c.size < playerSize).setPosition(cx, c.y + c.h * 0.4).setDisplaySize(c.w * 1.6, c.h * 1.5);
    }
  }

  private create(c: Critter): CritterSprites {
    const mark = this.scene.add.image(0, 0, TEX.highlight(c.id % BOIL)).setBlendMode(Phaser.BlendModes.MULTIPLY).setAlpha(0.8).setDepth(3);
    const art = this.scene.add.image(0, 0, TEX.critter(c.species, false, 0)).setOrigin(0.5, (CRITTER_FRAME / 2 + CRITTER_GROUND) / CRITTER_FRAME).setDepth(4);
    const s = { mark, art };
    this.sprites.set(c.id, s);
    return s;
  }
}
