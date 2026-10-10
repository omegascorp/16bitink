import Phaser from 'phaser';
import { drawCrabBack, drawCrabFront, RIVAL_COLORS } from '../../art/crabArt';
import { FOOT, FRAME, GROUND, SHELL_MID, SHELL_UNITS } from '../../art/frame';
import { makeDraw } from '../../art/kit';
import { crabShift } from '../../art/mouth';
import { BOIL } from '../../art/palette';
import { makeCanvas } from '../../art/pen';
import { TEX } from '../../art/textures';
import type { Critter } from '../../logic/critters';
import { isRival } from '../../logic/rivals';
import { bodyFill, shellPx } from '../../logic/shells';

/** Just behind the player, in front of the other creatures. */
const DEPTH = 4.2;
const FOOT_FROM_MIDDLE = FOOT.x - SHELL_MID;
const NAKED_SCALE = 0.95;
const WALK_FPS = 9;
const BOIL_MS = 260;

const KEY = {
  back: (naked: boolean, f: number) => `rival-${naked ? 'naked-tail-' : ''}back-${f}`,
  front: (naked: boolean, f: number) => `rival-${naked ? 'naked-' : ''}front-${f}`,
} as const;

interface RivalSprites {
  readonly root: Phaser.GameObjects.Container;
  readonly back: Phaser.GameObjects.Image;
  readonly shell: Phaser.GameObjects.Image;
  readonly front: Phaser.GameObjects.Image;
}

/** The rival's own drawings: the player's crab in purple-pincher colours, in blue ink (it's never a danger); out of a shell, with its soft tail. */
function bakeRivals(scene: Phaser.Scene): void {
  for (let f = 0; f < BOIL; f++) {
    for (const naked of [false, true]) {
      const bake = (key: string, seed: number, draw: (d: ReturnType<typeof makeDraw>) => void): void => {
        if (scene.textures.exists(key)) return;
        const { canvas, ctx } = makeCanvas(FRAME, FRAME);
        ctx.translate(FRAME / 2, FRAME / 2);
        draw(makeDraw(ctx, seed, f, GROUND));
        scene.textures.addCanvas(key, canvas);
      };
      bake(KEY.back(naked, f), 140 + f, (d) => drawCrabBack(d, naked, RIVAL_COLORS, naked));
      bake(KEY.front(naked, f), 150 + f, (d) => drawCrabFront(d, naked, RIVAL_COLORS));
    }
  }
}

/**
 * Rival hermit crabs, drawn as the player is (legs and claw behind the
 * shell, head and big claw in front) but purple. Tucked in, only the shell
 * shows; out of a shell, its soft body does.
 */
export class RivalsView {
  private readonly sprites = new Map<number, RivalSprites>();

  constructor(private readonly scene: Phaser.Scene) {
    bakeRivals(scene);
  }

  sync(critters: ReadonlyMap<number, Critter>, time: number): void {
    for (const [id, s] of this.sprites) {
      if (critters.has(id)) continue;
      s.root.destroy();
      this.sprites.delete(id);
    }
    for (const k of critters.values()) {
      if (!isRival(k)) continue;
      const s = this.sprites.get(k.id) ?? this.create(k.id);
      const walking = Math.abs(k.vx) > 1 && k.onGround;
      const f = Math.floor(time / (walking ? 1000 / WALK_FPS : BOIL_MS) + k.id) % BOIL;
      const spec = k.shell ?? null;
      const unit = shellPx(spec ? spec.size : k.size) / SHELL_UNITS;
      const body = spec ? unit * bodyFill(spec, k.size) : (shellPx(k.size) / SHELL_UNITS) * NAKED_SCALE;
      s.root.setPosition(k.x + k.w / 2 + k.dir * FOOT_FROM_MIDDLE * unit, k.y + k.h).setScale(k.dir, 1);
      const naked = !spec;
      const shift = spec ? crabShift(spec.kind, unit, body) : 0;
      s.shell.setVisible(!naked);
      if (spec) s.shell.setTexture(TEX.shell(spec.kind, f)).setScale(unit);
      for (const [img, key] of [[s.back, KEY.back(naked, f)], [s.front, KEY.front(naked, f)]] as const) {
        img.setTexture(key).setScale(body).setX(shift).setVisible(!k.tucked);
      }
    }
  }

  private create(id: number): RivalSprites {
    const ox = FOOT.x / FRAME;
    const oy = FOOT.y / FRAME;
    const back = this.scene.add.image(0, 0, KEY.back(false, 0)).setOrigin(ox, oy);
    const shell = this.scene.add.image(0, 0, TEX.shell('periwinkle', 0)).setOrigin(ox, oy);
    const front = this.scene.add.image(0, 0, KEY.front(false, 0)).setOrigin(ox, oy);
    const root = this.scene.add.container(0, 0, [back, shell, front]).setDepth(DEPTH);
    const s = { root, back, shell, front };
    this.sprites.set(id, s);
    return s;
  }
}
