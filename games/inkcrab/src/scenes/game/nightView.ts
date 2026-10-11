import Phaser from 'phaser';
import { clearRadius } from '../../logic/fog';
import type { Plankton } from '../../logic/moon';
import { surfaceRow, type Terrain } from '../../logic/terrain';

/** Over the beach and its creatures, under the fog, the coach's arrow and floating words; the glow over the dark. */
const DEPTH = 6.45;
const GLOW_DEPTH = 6.46;
/** Night's ink-blue, laid over the view: a light tint by moonlight… */
const NIGHT_HEX = 0x141c3c;
const MOONLIGHT = 0.16;
/** …and, with the moon hidden, this dark everywhere but round the crab. */
const DARK = 0.74;
/** The plankton's cold blue-green light. */
const GLOW_HEX = 0x5ef2e0;
/** The hole of sight round the crab: a soft-edged disc baked once, `HOLE_PX` across. */
const HOLE_PX = 256;
/** Share of the hole's radius that is clear, the rest fading to dark. */
const CLEAR = 0.55;
/** Sparks idling in the plankton per column a second, and how bright. */
const SPARKS = 0.6;
const SPARK = 0.35;

let views = 0;

/** Deterministic 0..1 noise. */
function hash(a: number, b: number): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Night on the beach: a tint of night-blue by moonlight; when a cloud
 * covers the moon, darkness over everything but a pool of sight round the
 * crab (as far as it can see, as in fog). Over the dark, the plankton
 * glows: footprints in the strand light up and fade, and sparks idle in it.
 */
export class NightView {
  private readonly key = `night${++views}`;
  private readonly tint: Phaser.GameObjects.Graphics;
  private readonly dark: Phaser.GameObjects.Graphics;
  private readonly hole: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, private readonly terrain: Terrain, private readonly tile: number, private readonly plankton: Plankton | null) {
    this.bakeHole(scene);
    this.tint = scene.add.graphics().setDepth(DEPTH);
    this.dark = scene.add.graphics().setDepth(DEPTH);
    this.hole = scene.add.image(0, 0, this.key).setDepth(DEPTH).setTint(NIGHT_HEX);
    this.glow = scene.add.graphics().setDepth(GLOW_DEPTH).setBlendMode(Phaser.BlendModes.ADD);
  }

  /** Dark all round its rim, clear in the middle: the dark seen through round the crab. */
  private bakeHole(scene: Phaser.Scene): void {
    const canvas = document.createElement('canvas');
    canvas.width = HOLE_PX;
    canvas.height = HOLE_PX;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const r = HOLE_PX / 2;
    const g = ctx.createRadialGradient(r, r, r * CLEAR, r, r, r);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, HOLE_PX, HOLE_PX);
    scene.textures.addCanvas(this.key, canvas);
  }

  /** `darkness` 0..1; `crab` the middle of the crab (world px) and its size; `time` in seconds (the beach's clock). */
  update(darkness: number, view: Phaser.Geom.Rectangle, crab: { x: number; y: number }, size: number, time: number): void {
    this.tint.clear().fillStyle(NIGHT_HEX, MOONLIGHT).fillRect(view.x, view.y, view.width, view.height);
    this.drawDark(darkness, view, crab, size);
    this.drawGlow(darkness, view, time);
  }

  private drawDark(darkness: number, view: Phaser.Geom.Rectangle, crab: { x: number; y: number }, size: number): void {
    const g = this.dark.clear();
    const alpha = DARK * darkness;
    this.hole.setVisible(alpha > 0.01);
    if (alpha <= 0.01) return;
    const r = (clearRadius(size) * this.tile) / CLEAR;
    this.hole.setPosition(crab.x, crab.y).setDisplaySize(r * 2, r * 2).setAlpha(alpha);
    // Everything outside the hole's square, in four bands.
    const left = crab.x - r;
    const right = crab.x + r;
    const top = crab.y - r;
    const bottom = crab.y + r;
    g.fillStyle(NIGHT_HEX, alpha);
    g.fillRect(view.x, view.y, view.width, Math.max(0, top - view.y));
    g.fillRect(view.x, bottom, view.width, Math.max(0, view.bottom - bottom));
    g.fillRect(view.x, top, Math.max(0, left - view.x), r * 2);
    g.fillRect(right, top, Math.max(0, view.right - right), r * 2);
  }

  /** Footprints glowing where they were stirred, and sparks idling in the rest of the strand, brighter in the dark. */
  private drawGlow(darkness: number, view: Phaser.Geom.Rectangle, time: number): void {
    const g = this.glow.clear();
    const p = this.plankton;
    if (!p) return;
    const T = this.tile;
    const first = Math.max(0, Math.floor(view.x / T));
    const last = Math.min(this.terrain.width - 1, Math.ceil(view.right / T));
    const boost = 0.6 + 0.4 * darkness;
    for (const [col, bright] of p.glowing(time)) {
      if (col < first || col > last) continue;
      const x = (col + 0.5) * T;
      const y = surfaceRow(this.terrain, col) * T;
      g.fillStyle(GLOW_HEX, 0.22 * bright * boost).fillEllipse(x, y, T * 2.2, T * 0.9);
      g.fillStyle(GLOW_HEX, 0.55 * bright * boost).fillEllipse(x, y, T * 1.1, T * 0.4);
    }
    const beat = Math.floor(time * 4);
    for (let col = first; col <= last; col++) {
      if (!p.has(col) || hash(col, beat) > SPARKS / 4) continue;
      const x = (col + hash(col, beat + 1)) * T;
      const y = surfaceRow(this.terrain, col) * T - hash(col, beat + 2) * 2;
      g.fillStyle(GLOW_HEX, SPARK * boost).fillCircle(x, y, 0.9 + hash(col, beat + 3) * 0.8);
    }
  }

  destroy(): void {
    this.tint.destroy();
    this.dark.destroy();
    this.hole.destroy();
    this.glow.destroy();
  }
}
