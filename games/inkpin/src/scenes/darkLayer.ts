import Phaser from 'phaser';
import { DarkPainter, DARK_RES, type Light } from '../art/dark';
import type { LevelDef } from '../logic/level';
import { LAVA } from '../logic/particles';
import type { World } from '../logic/world';

/** Light radii in the dark (board px): Nib's lamp, a torch, a lava grain, a pin's ring. */
const LAMP_R = 190;
const TORCH_R = 130;
const LAVA_LIGHT_R = 46;
const PIN_GLINT_R = 34;
/** A salamander's ember glow: a living light, smaller than a torch (the Old Salamander's bigger). */
const EMBER_R = 84;
const OLD_EMBER_R = 120;
/** Most lava grains that each give off light: enough for a glow, cheap to draw. */
const LAVA_LIGHTS = 80;

/** Lights out: a sheet of night over the rooms, with the lights cut out of it each frame. */
export class DarkLayer {
  private readonly painter: DarkPainter;
  private readonly tex: Phaser.Textures.CanvasTexture;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, level: LevelDef) {
    const { view } = level;
    this.painter = new DarkPainter(view.x, view.y, view.w, view.h, level.rooms);
    if (scene.textures.exists('dark')) scene.textures.remove('dark');
    const tex = scene.textures.addCanvas('dark', this.painter.canvas);
    if (!tex) throw new Error('Could not make the dark texture');
    this.tex = tex;
    layer.add(scene.add.image(view.x, view.y, 'dark').setOrigin(0).setScale(1 / DARK_RES));
  }

  /** Nib's lamp, the torches (flickering), a glint on each pin still in, the salamanders' embers, and the glow of lava. */
  paint(w: World, time: number): void {
    const lights: Light[] = [{ x: w.nib.x, y: w.nib.y - 8, r: LAMP_R, power: 1 }];
    w.level.torches.forEach((t, i) => lights.push({ x: t.x, y: t.y - 14, r: TORCH_R * (0.94 + Math.sin(time / 170 + i * 1.7) * 0.06), power: 0.95 }));
    for (const p of w.pins) if (p.pulledAt === null) lights.push({ x: p.def.ax, y: p.def.ay, r: PIN_GLINT_R, power: 0.8 });
    w.blots.forEach((b, i) => {
      if (b.gone || b.animal !== 'salamander') return;
      // It glows like an ember, breathing slowly; a soaked one barely.
      const breath = 0.92 + Math.sin(time / 420 + i * 2.1) * 0.08;
      lights.push({ x: b.x, y: b.y - 4, r: (b.boss ? OLD_EMBER_R : EMBER_R) * breath, power: b.wet > 0 ? 0.4 : 0.85 });
    });
    const g = w.grains;
    let lava = 0;
    for (let i = 0; i < g.count && lava < LAVA_LIGHTS; i++) {
      if (g.kind[i] !== LAVA || i % 3 !== 0) continue;
      lights.push({ x: g.x[i]!, y: g.y[i]!, r: LAVA_LIGHT_R, power: 0.7 });
      lava++;
    }
    this.painter.paint(lights);
    this.tex.refresh();
  }
}
