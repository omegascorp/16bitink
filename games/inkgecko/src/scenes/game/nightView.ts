import Phaser from 'phaser';
import { BOARD } from '../../level/types';
import type { Board, BoardEvent } from '../../logic/board';
import { pointAt } from '../../logic/path';

/** The night's darkness is drawn at this share of board resolution: it is all soft edges. */
const RES = 0.5;
const LIGHT_KEY = 'night-light';
/** The light texture's radius, px; each light is scaled from it. */
const LIGHT_R = 128;
/** How dark the night is where nothing lights it (0..1), and its colour. */
const DARKNESS = 0.86;
const NIGHT_HEX = 0x0c1430;
/** Light radii, board px. */
const R = { gecko: 270, well: 170, burrow: 120, shot: 95, flash: 190, moon: 150 } as const;
/** Patches of moonlight drifting slowly across the garden. */
const MOONBEAMS = 3;
/** A pop lights the garden round it for this long, s. */
const FLASH_FOR = 0.7;
/** How fast the dark lifts for a Lantern and settles again, per s. */
const FADE = 2.5;

interface Flash {
  readonly x: number;
  readonly y: number;
  age: number;
}

/**
 * The night garden's dark (levels with `dark`): a layer of night over the
 * board, with soft holes where something gives light — the gecko, the
 * lanterns by the wells, the burrows, shots in flight, pops, and patches of
 * moonlight drifting over. A Lantern charm lifts it for a while.
 */
export class NightView {
  private readonly rt: Phaser.GameObjects.RenderTexture;
  private readonly flashes: Flash[] = [];
  private lift = 0;

  constructor(private readonly scene: Phaser.Scene) {
    makeLight(scene);
    this.rt = scene.add.renderTexture(0, 0, BOARD.w * RES, BOARD.h * RES).setOrigin(0).setScale(1 / RES).setDepth(7.5);
  }

  react(e: BoardEvent): void {
    if (e.type === 'pop' || e.type === 'fruit') this.flashes.push({ x: e.x, y: e.y, age: 0 });
    else if (e.type === 'rain') this.flashes.push({ x: e.x, y: BOARD.h / 2, age: 0 });
  }

  update(board: Board, time: number, dt: number): void {
    this.lift = Phaser.Math.Clamp(this.lift + (board.timers.lantern > 0 ? FADE : -FADE) * dt, 0, 1);
    for (const f of this.flashes) f.age += dt;
    while (this.flashes.length && this.flashes[0]!.age > FLASH_FOR) this.flashes.shift();
    const rt = this.rt;
    rt.clear();
    rt.fill(NIGHT_HEX, DARKNESS * (1 - this.lift));
    if (this.lift < 1) {
      const light = (x: number, y: number, r: number, alpha = 1): void => {
        rt.stamp(LIGHT_KEY, undefined, x * RES, y * RES, { scale: (r * RES) / LIGHT_R, alpha, blendMode: Phaser.BlendModes.ERASE });
      };
      const flicker = 1 + Math.sin(time / 90) * 0.03 + Math.sin(time / 37) * 0.02;
      light(board.gecko.x, board.gecko.y, R.gecko);
      for (const line of board.lines) {
        const w = pointAt(line.path, line.path.length);
        light(w.x, w.y, R.well * flicker);
        const b = pointAt(line.path, 0);
        light(b.x, b.y, R.burrow);
      }
      for (const s of board.shots) light(s.x, s.y, R.shot);
      for (const f of this.flashes) light(f.x, f.y, R.flash, 1 - f.age / FLASH_FOR);
      for (let i = 0; i < MOONBEAMS; i++) {
        const t = time / 1000 / (40 + i * 13) + i * 2.1;
        light(BOARD.w * (0.5 + 0.42 * Math.sin(t * 1.3 + i)), BOARD.h * (0.5 + 0.38 * Math.cos(t + i * 1.7)), R.moon, 0.55);
      }
    }
    rt.render();
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
