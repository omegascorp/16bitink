import type Phaser from 'phaser';
import { BOARD } from '../../level/types';
import { BlackCaiman } from '../../logic/chapters/floodedCaiman';
import { Jaguar } from '../../logic/chapters/floodedJaguar';
import { RivalSnake } from '../../logic/enemies/rival';
import { preySpec } from '../../logic/prey';
import type { World } from '../../logic/world';
import type { ChapterView } from './types';

/** Depths (see ChapterView): ripples under the prey, eyes over the snake's head, mist under the night. */
const DEPTH = { ripples: 2.45, eyes: 3.65, mist: 6.6 } as const;
const INK = 0x27408b;
const EYE = 0x3f4a24;
const EYE_SHINE = 0xfffaf0;
const MIST_TEX = 'flooded-mist';
const MIST_PX = 128;
/** Ripples kept at most at once. */
const MAX_RIPPLES = 140;
/** Mist thins over the first this-many seconds of a level, to this share (dawn burning off). */
const MIST_CLEARS = 45;
const MIST_LEFT = 0.3;
const MIST_ALPHA = 0.26;

interface Ripple {
  x: number;
  y: number;
  age: number;
  readonly life: number;
  readonly r0: number;
  readonly r1: number;
  readonly alpha: number;
}

interface Mist {
  readonly img: Phaser.GameObjects.Image;
  readonly speed: number;
  readonly base: number;
}

/**
 * The Flooded Forest's own layer: rings spreading on the water wherever
 * something moves in it (the snake, fish, a caiman's lunge, the jaguar
 * swimming or lapping at the bank), the submerged anaconda's eyes and
 * nostrils just above the surface with tiny ripples round them, and mist
 * drifting over the water at dawn, thinning as the morning goes on.
 */
class FloodedView implements ChapterView {
  private readonly rings: Phaser.GameObjects.Graphics;
  private readonly eyes: Phaser.GameObjects.Graphics;
  private readonly mist: Mist[] = [];
  private readonly ripples: Ripple[] = [];
  /** Seconds to the next ripple from each mover, by id. */
  private readonly clocks = new Map<number, number>();
  private lastBoss = '';

  constructor(private readonly scene: Phaser.Scene, world: World) {
    this.rings = scene.add.graphics().setDepth(DEPTH.ripples);
    this.eyes = scene.add.graphics().setDepth(DEPTH.eyes);
    this.makeMist(world);
  }

  update(world: World, time: number, dt: number): void {
    this.spawnRipples(world, dt);
    this.drawRipples(dt);
    this.drawEyes(world, time);
    this.driftMist(world, dt);
  }

  destroy(): void {
    this.rings.destroy();
    this.eyes.destroy();
    for (const m of this.mist) m.img.destroy();
  }

  private ripple(x: number, y: number, r0: number, r1: number, life: number, alpha: number): void {
    if (this.ripples.length >= MAX_RIPPLES) this.ripples.shift();
    this.ripples.push({ x, y, age: 0, life, r0, r1, alpha });
  }

  /** Every `every` s from mover `id`, a ripple, while `on`. */
  private every(id: number, every: number, dt: number, on: boolean, make: () => void): void {
    if (!on) return;
    const left = (this.clocks.get(id) ?? Math.random() * every) - dt;
    if (left > 0) {
      this.clocks.set(id, left);
      return;
    }
    this.clocks.set(id, every);
    make();
  }

  private spawnRipples(world: World, dt: number): void {
    const wet = (x: number, y: number): boolean => world.inZone({ x, y }, 'water');
    const s = world.snake;
    const h = s.head;
    const under = s.cloak === 'submerged';
    if (wet(h.x, h.y)) {
      // The head pushes rings out as it swims; submerged, only small ones round the eyes.
      this.every(-1, under ? 0.5 : 0.22, dt, s.moved > 0.2 || under, () =>
        this.ripple(h.x, h.y, s.width * (under ? 0.3 : 0.5), s.width * (under ? 1.1 : 1.8), under ? 1.1 : 0.9, under ? 0.45 : 0.55));
    }
    for (const p of world.prey) {
      if (!wet(p.x, p.y) || p.mode === 'caught' || p.alt > 0.05) continue;
      const size = preySpec(p.kind).size;
      this.every(p.id, p.mode === 'flee' ? 0.18 : 0.7, dt, p.speed > 4, () => this.ripple(p.x, p.y, size * 0.3, size * 1.1, 0.8, 0.4));
    }
    for (const e of world.enemies) {
      if (e.away) continue;
      if (e instanceof BlackCaiman) {
        const busy = e.mode === 'tell' || e.mode === 'lunge';
        this.every(e.id, busy ? 0.09 : e.mode === 'move' ? 0.4 : 1.4, dt, true, () =>
          this.ripple(e.x + (Math.random() - 0.5) * (busy ? 20 : 6), e.y + (Math.random() - 0.5) * (busy ? 20 : 6), busy ? 4 : 8, busy ? 22 : 30, busy ? 0.6 : 1.4, busy ? 0.6 : 0.35));
      } else if (e instanceof RivalSnake) {
        const rh = e.snake.head;
        this.every(e.id, 0.25, dt, wet(rh.x, rh.y), () => this.ripple(rh.x, rh.y, e.snake.width * 0.5, e.snake.width * 1.9, 0.9, 0.5));
      }
    }
    const b = world.boss;
    if (b instanceof Jaguar && !b.away) {
      // The splash as it comes down in the water after a leap.
      if (this.lastBoss === 'leap' && b.mode !== 'leap' && wet(b.x, b.y)) for (let i = 0; i < 4; i++) this.ripple(b.x, b.y, 10 + i * 8, 70 + i * 22, 0.9 + i * 0.25, 0.7);
      this.lastBoss = b.mode;
      if (b.mode === 'drink') {
        // Lapping: rings from its muzzle at the water's edge.
        const mx = b.x + Math.cos(b.heading) * 36;
        const my = b.y + Math.sin(b.heading) * 36;
        this.every(b.id, 0.45, dt, true, () => this.ripple(mx, my, 4, 26, 1, 0.55));
      } else this.every(b.id, 0.2, dt, wet(b.x, b.y) && b.alt < 0.1, () => this.ripple(b.x, b.y, 16, 60, 1, 0.55));
    }
  }

  private drawRipples(dt: number): void {
    const g = this.rings;
    g.clear();
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i]!;
      r.age += dt;
      if (r.age >= r.life) {
        this.ripples.splice(i, 1);
        continue;
      }
      const t = r.age / r.life;
      const e = 1 - (1 - t) * (1 - t);
      g.lineStyle(1.3, INK, r.alpha * (1 - t));
      g.strokeCircle(r.x, r.y, r.r0 + (r.r1 - r.r0) * e);
    }
  }

  /** Submerged, the snake shows only its eyes and nostrils (on top of its head), and a faint V where it swims. */
  private drawEyes(world: World, time: number): void {
    const g = this.eyes;
    g.clear();
    const s = world.snake;
    if (s.cloak !== 'submerged') return;
    const h = s.head;
    const a = s.heading;
    const w = s.width;
    const fx = Math.cos(a);
    const fy = Math.sin(a);
    const at = (fwd: number, side: number): { x: number; y: number } => ({ x: h.x + fx * fwd - fy * side, y: h.y + fy * fwd + fx * side });
    const bob = Math.sin(time / 380) * 0.4;
    if (s.moved > 0.2) {
      g.lineStyle(1.2, INK, 0.35);
      for (const side of [-1, 1]) {
        const p0 = at(w * 0.9, side * w * 0.2);
        const p1 = at(-w * 1.6, side * w * 1.05);
        g.lineBetween(p0.x, p0.y, p1.x, p1.y);
      }
    }
    for (const side of [-1, 1]) {
      const e = at(w * 0.21, side * w * 0.35);
      g.fillStyle(EYE, 0.95);
      g.fillCircle(e.x, e.y, w * 0.14 + bob);
      g.fillStyle(0x111111, 0.9);
      g.fillCircle(e.x + fx * 0.6, e.y + fy * 0.6, w * 0.065);
      g.fillStyle(EYE_SHINE, 0.9);
      g.fillCircle(e.x - fy * side * 0.6 - fx * 0.6, e.y + fx * side * 0.6 - fy * 0.6, w * 0.03);
      const n = at(w * 0.85, side * w * 0.1);
      g.fillStyle(EYE, 0.9);
      g.fillCircle(n.x, n.y, w * 0.07);
      g.fillStyle(0x111111, 0.9);
      g.fillCircle(n.x, n.y, w * 0.03);
    }
  }

  private makeMist(world: World): void {
    if (!this.scene.textures.exists(MIST_TEX)) {
      const c = document.createElement('canvas');
      c.width = MIST_PX;
      c.height = MIST_PX;
      const ctx = c.getContext('2d');
      if (ctx) {
        const r = MIST_PX / 2;
        const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
        grad.addColorStop(0, 'rgba(255,250,240,0.9)');
        grad.addColorStop(0.55, 'rgba(255,250,240,0.45)');
        grad.addColorStop(1, 'rgba(255,250,240,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, MIST_PX, MIST_PX);
      }
      this.scene.textures.addImage(MIST_TEX, c as unknown as HTMLImageElement);
    }
    const { w, h } = BOARD;
    for (let i = 0; i < 7; i++) {
      // Banks of mist lie over the water, spread across the board.
      const y = 50 + ((i * 173) % (h - 100));
      const x = (i * 311) % w;
      const base = MIST_ALPHA * (0.6 + 0.4 * ((i * 7) % 5) / 4) * (world.level.dark ? 0.45 : 1);
      const img = this.scene.add.image(x, y, MIST_TEX).setDepth(DEPTH.mist).setScale(2.6 + (i % 3) * 0.7, 0.9 + (i % 2) * 0.35).setAlpha(base);
      this.mist.push({ img, speed: 5 + (i % 4) * 2.5, base });
    }
  }

  private driftMist(world: World, dt: number): void {
    const clear = Math.max(MIST_LEFT, 1 - world.elapsed / MIST_CLEARS);
    for (const m of this.mist) {
      const half = (m.img.displayWidth || MIST_PX * 3) / 2;
      let x = m.img.x + m.speed * dt;
      if (x - half > BOARD.w) x = -half;
      m.img.setX(x).setAlpha(m.base * clear);
    }
  }
}

/** The Flooded Forest's layer over the board. */
export function floodedView(scene: Phaser.Scene, world: World): ChapterView {
  return new FloodedView(scene, world);
}
