import Phaser from 'phaser';
import { CRITTER_FRAME, CRITTER_GROUND, CRITTER_RES, CRITTER_SPAN } from '../../art/critterArt';
import { BOIL } from '../../art/palette';
import { TEX } from '../../art/textures';
import { breached, type Critter } from '../../logic/critters';
import { movementOf } from '../../logic/species';
import type { Terrain } from '../../logic/terrain';
import { BLUE_HEX, RED_HEX } from '../../art/palette';

interface CritterSprites {
  readonly mark: Phaser.GameObjects.Image;
  readonly art: Phaser.GameObjects.Image;
}

/** Leg-pose frames per second at a walk. */
const WALK_FPS = 9;
const BOIL_MS = 260;

/**
 * The beach's creatures. Ones that can eat the player are inked red; ones it can eat
 * get a highlighter swipe, like food. It changes as the player grows. A
 * sandfish inside the sand shows only as ripples in the hatching (red when
 * it hunts you), and in full where it breaks into a tunnel.
 */
export class CrittersView {
  private readonly sprites = new Map<number, CritterSprites>();
  private readonly ripples: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene, private readonly terrain: Terrain, private readonly tile: number) {
    this.ripples = scene.add.graphics().setDepth(3.5);
  }

  sync(critters: ReadonlyMap<number, Critter>, playerSize: number, time: number): void {
    const g = this.ripples.clear();
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
      const hidden = movementOf(c.species) === 'burrow' && !breached(this.terrain, c, this.tile);
      s.art.setVisible(!hidden);
      if (hidden) this.ripple(g, c, c.size > playerSize, time);
    }
  }

  /** Bow waves in the sand ahead of a swimming sandfish, and a wake behind it. */
  private ripple(g: Phaser.GameObjects.Graphics, c: Critter, danger: boolean, time: number): void {
    const cx = c.x + c.w / 2;
    const cy = c.y + c.h / 2;
    const color = danger ? RED_HEX : BLUE_HEX;
    const h = c.h * 0.9 + 3;
    for (let i = 0; i < 3; i++) {
      // Each arc drifts back from the head and fades, so the ripples seem to stream past.
      const t = ((time / 420 + i / 3 + c.id * 0.37) % 1);
      const x = cx + c.dir * (c.w * 0.45 - t * c.w * 0.9);
      const r = h * (0.55 + 0.45 * (1 - t));
      g.lineStyle(1.3, color, 0.85 * (1 - t) + 0.1);
      g.beginPath();
      g.arc(x, cy, r, c.dir > 0 ? -Math.PI / 2.6 : Math.PI - Math.PI / 2.6, c.dir > 0 ? Math.PI / 2.6 : Math.PI + Math.PI / 2.6);
      g.strokePath();
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
