import Phaser from 'phaser';
import { BOARD } from '../../level/types';
import type { World, WorldEvent } from '../../logic/world';

/** The night's darkness is drawn at this share of board resolution: it is all soft edges. */
const RES = 0.5;
/** How far past the board's edges the night reaches, board px. */
const BLEED = 400;
const LIGHT_KEY = 'night-light';
const LIGHT_R = 128;
/** How dark it is where nothing lights it (0..1), and its colour. */
const DARKNESS = 0.84;
const NIGHT_HEX = 0x0c1430;
/** Light radii, board px. */
const R = { head: 220, flash: 150, moon: 140 } as const;
const MOONBEAMS = 2;
/** A meal lights the barn round it for this long, s. */
const FLASH_FOR = 0.6;

/**
 * Night (levels with `dark`): a layer of dark over the board with a soft
 * pool of sight round the snake's head, a short glow where it eats, and
 * patches of moonlight drifting through the gaps in the barn's boards.
 */
export class NightView {
  private readonly rt: Phaser.GameObjects.RenderTexture;
  private readonly flashes: { x: number; y: number; age: number }[] = [];

  constructor(scene: Phaser.Scene) {
    makeLight(scene);
    this.rt = scene.add.renderTexture(-BLEED, -BLEED, (BOARD.w + BLEED * 2) * RES, (BOARD.h + BLEED * 2) * RES).setOrigin(0).setScale(1 / RES).setDepth(6.8);
  }

  react(e: WorldEvent): void {
    if (e.type === 'eat') this.flashes.push({ x: e.x, y: e.y, age: 0 });
  }

  update(world: World, time: number, dt: number): void {
    for (const f of this.flashes) f.age += dt;
    while (this.flashes.length && this.flashes[0]!.age > FLASH_FOR) this.flashes.shift();
    const rt = this.rt;
    rt.clear();
    rt.fill(NIGHT_HEX, DARKNESS);
    const light = (x: number, y: number, r: number, alpha = 1): void => {
      rt.stamp(LIGHT_KEY, undefined, (x + BLEED) * RES, (y + BLEED) * RES, { scale: (r * RES) / LIGHT_R, alpha, blendMode: Phaser.BlendModes.ERASE });
    };
    const h = world.snake.head;
    light(h.x, h.y, R.head * (1 + Math.sin(time / 600) * 0.02));
    for (const f of this.flashes) light(f.x, f.y, R.flash, 1 - f.age / FLASH_FOR);
    for (let i = 0; i < MOONBEAMS; i++) {
      const t = time / 1000 / (38 + i * 15) + i * 2.1;
      light(BOARD.w * (0.5 + 0.4 * Math.sin(t * 1.3 + i)), BOARD.h * (0.5 + 0.36 * Math.cos(t + i * 1.7)), R.moon, 0.5);
    }
    rt.render();
  }

  destroy(): void {
    this.rt.destroy();
  }
}

/** A soft round light: opaque in the middle, fading smoothly to nothing at its edge. */
function makeLight(scene: Phaser.Scene): void {
  if (scene.textures.exists(LIGHT_KEY)) return;
  const size = LIGHT_R * 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const g = ctx.createRadialGradient(LIGHT_R, LIGHT_R, 0, LIGHT_R, LIGHT_R, LIGHT_R);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.75, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  scene.textures.addImage(LIGHT_KEY, canvas as unknown as HTMLImageElement);
}
