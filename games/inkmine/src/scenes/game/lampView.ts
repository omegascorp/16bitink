import Phaser from 'phaser';
import { makeCanvas } from '../../art/pen';
import type { Mine } from '../../logic/mine';

/** The wash the deep goes under: a dark ink grey, never black. */
const DARK = 0x1f2230;
/** Metres over which the dark comes on, and how dark it gets. */
const DARK_FROM = 6;
const DARK_FULL = 50;
const DARK_MAX = 0.5;
const GLOW_KEY = 'lamp-glow';
const GLOW_PX = 256;

/**
 * Depth darkens slowly under a grey wash (spec, "Art direction"), so the
 * helmet's lamp matters more the deeper you go: a soft circle of light round
 * the prospector, its reach set by the helmet's mark. On the surface there's
 * no wash at all.
 */
export class LampView {
  private readonly glow: Phaser.GameObjects.Image;
  private readonly frame: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, private readonly reach: number, private readonly tile: number) {
    if (!scene.textures.exists(GLOW_KEY)) scene.textures.addCanvas(GLOW_KEY, glowCanvas());
    this.glow = scene.add.image(0, 0, GLOW_KEY).setDepth(7).setTint(DARK);
    this.frame = scene.add.graphics().setDepth(7);
  }

  update(mine: Mine, view: Phaser.Geom.Rectangle): void {
    const k = Phaser.Math.Clamp((mine.depth - DARK_FROM) / (DARK_FULL - DARK_FROM), 0, 1) * DARK_MAX;
    this.glow.setVisible(k > 0);
    this.frame.clear();
    if (k <= 0) return;
    const p = mine.player;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    // The glow texture fades from clear at its middle to solid at its rim; scaled so the clear part is the lamp's reach.
    const size = this.reach * this.tile * 2.6;
    this.glow.setPosition(cx, cy).setDisplaySize(size, size).setAlpha(k);
    const x0 = cx - size / 2;
    const y0 = cy - size / 2;
    const g = this.frame.fillStyle(DARK, k);
    const pad = 64;
    const rect = (x: number, y: number, w: number, h: number): void => {
      if (w > 0 && h > 0) g.fillRect(x, y, w, h);
    };
    rect(view.x - pad, view.y - pad, view.width + pad * 2, y0 - view.y + pad);
    rect(view.x - pad, y0 + size, view.width + pad * 2, view.bottom - y0 - size + pad);
    rect(view.x - pad, y0, x0 - view.x + pad, size);
    rect(x0 + size, y0, view.right - x0 - size + pad, size);
  }
}

/** White, clear in the middle and solid at the rim (tinted dark in use). */
function glowCanvas(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(GLOW_PX, GLOW_PX);
  const r = GLOW_PX / 2;
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.05)');
  grad.addColorStop(0.77, 'rgba(255,255,255,0.6)');
  grad.addColorStop(0.98, 'rgba(255,255,255,1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, GLOW_PX, GLOW_PX);
  return canvas;
}
