import Phaser from 'phaser';
import type { Mine } from '../../logic/mine';
import { STORM } from '../../logic/storm';

/** The dust: rust in the air, a darker wash as it blots out the sun, and its grit, dark and pale. */
const DUST = 0xc27d55;
const GLOOM = 0x4d2b28;
const GRIT = [0x7a3f2a, 0xf1d6b4] as const;
/** The sky and the far mesas go this brown at the storm's thickest. */
const SKY_TINT = 0xc48a66;
/** At most this much of the view the dust hides. */
const VEIL_MAX = 0.55;
/** Metres down at which a storm stops showing: it's up on the surface. */
const SHELTER = { from: 2, to: 9 } as const;
/** Streaks of grit in the air, and how fast they fly at full strength, px/s. */
const GRAINS = 110;
const GRAIN_SPEED = 900;

interface Grain {
  /** Where across and down the view, 0..1. */
  u: number;
  readonly v: number;
  readonly len: number;
  readonly speed: number;
  readonly pale: boolean;
  readonly phase: number;
}

/**
 * Talus's dust storms as you see them (logic/storm.ts), drawn over the
 * world as the lamp's dark is: through the warning, a brown wall of dust
 * rising on the horizon it's coming from; while it blows, the air thick
 * with rust, the light going brown and dim, and streaks of grit flying
 * downwind, faster in the gusts. It fades as you go down: a few metres
 * under the surface, the storm is only a sound.
 */
export class StormView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly grains: Grain[];

  /** `backdrop`: the sky and ridge layers, browned as the dust thickens. */
  constructor(scene: Phaser.Scene, private readonly backdrop: readonly Phaser.GameObjects.TileSprite[] = []) {
    this.g = scene.add.graphics().setDepth(6.8);
    // Seeded by index, so the streaks are the same each landing.
    this.grains = Array.from({ length: GRAINS }, (_, i) => {
      const r = (k: number): number => (Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1;
      const a = (k: number): number => Math.abs(r(k));
      return { u: a(1), v: a(2), len: 10 + a(3) * 26, speed: 0.6 + a(4) * 0.8, pale: a(5) < 0.35, phase: a(6) * Math.PI * 2 };
    });
  }

  update(mine: Mine, view: Phaser.Geom.Rectangle, now: number, dt: number): void {
    const g = this.g.clear();
    const s = mine.storm;
    if (!s) return;
    const near = Phaser.Math.Clamp(1 - (mine.depth - SHELTER.from) / (SHELTER.to - SHELTER.from), 0, 1);
    this.brown(s.dust * near);
    if (near <= 0) return;
    if (s.phase === 'warn') this.front(view, s.dir, (1 - s.left / STORM.warn) * near);
    const dust = s.dust * near;
    if (dust <= 0) return;
    g.fillStyle(DUST, dust * VEIL_MAX).fillRect(view.x, view.y, view.width, view.height);
    g.fillStyle(GLOOM, dust * 0.14).fillRect(view.x, view.y, view.width, view.height);
    this.grit(view, s.dir, s.strength * near, now, dt);
  }

  /** The sky and far mesas, browned by `k` (0..1) of the dust. */
  private brown(k: number): void {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0xffffff), Phaser.Display.Color.ValueToColor(SKY_TINT), 100, Math.round(k * 100));
    const tint = Phaser.Display.Color.GetColor(c.r, c.g, c.b);
    for (const layer of this.backdrop) layer.setTint(tint);
  }

  /** The wall of dust on the horizon the storm comes from: bands deepening towards that edge, `k` (0..1) of the way through the warning. */
  private front(view: Phaser.Geom.Rectangle, dir: 1 | -1, k: number): void {
    const bands = 14;
    const reach = view.width * (0.12 + 0.4 * k);
    for (let i = 0; i < bands; i++) {
      const w = (reach / bands) * (bands - i);
      // Upwind: the wind blows towards `dir`, so the dust comes from the other side.
      const x = dir === 1 ? view.x : view.right - w;
      this.g.fillStyle(DUST, 0.05 * k).fillRect(x, view.y, w, view.height);
    }
  }

  /** Streaks of grit flying downwind, each wavering a little as it goes; their speed and how many show follow the gusts. */
  private grit(view: Phaser.Geom.Rectangle, dir: 1 | -1, strength: number, now: number, dt: number): void {
    if (strength <= 0.02) return;
    const g = this.g;
    for (const [i, gr] of this.grains.entries()) {
      gr.u = (gr.u + (dir * gr.speed * GRAIN_SPEED * strength * dt) / view.width + 1) % 1;
      if (i / GRAINS > strength * 1.1) continue;
      const x = view.x + gr.u * view.width;
      const y = view.y + gr.v * view.height + Math.sin(now / 260 + gr.phase) * 6;
      const len = gr.len * (0.5 + strength);
      g.lineStyle(gr.pale ? 1.4 : 1.1, GRIT[gr.pale ? 1 : 0], (gr.pale ? 0.5 : 0.45) * strength);
      g.lineBetween(x, y, x - dir * len, y - 1.5);
    }
  }
}
