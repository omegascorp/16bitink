import Phaser from 'phaser';
import { BOARD, type ZoneDef } from '../../level/types';
import { LANE_HALF, Shark } from '../../logic/chapters/reefShark';
import { Drifter } from '../../logic/enemies/drifter';
import { dist, type Pt } from '../../logic/vec';
import type { World } from '../../logic/world';
import { inZoneShape } from '../../logic/zones';
import type { ChapterView } from './types';

/** Depths (see ChapterView): light on the water, holes, then effects round the snake. */
const DEPTH = { light: 1.3, holes: 1.35, fin: 2.55, ripples: 3.3, bubbles: 3.7, lane: 6.5, breath: 6.6, glow: 6.85 } as const;
const INK = 0x26316a;
const RED = 0xb3322b;
const BLUE = 0x27408b;
const FOAM = 0xffffff;
const GLOW = 0x8ff7ff;
/** The water's light: a net of bright lines this many px apart, wobbling. */
const CELL = 58;
const WOBBLE = 15;
/** Bubbles leave the nostrils every so often underwater, s; each lasts LIFE s. */
const BUBBLE_EVERY = [0.28, 0.6] as const;
const BUBBLE_LIFE = 1.1;
/** Ripples spread round a head at the surface (the shallows), one every RIPPLE_EVERY s, each lasting RIPPLE_LIFE s. */
const RIPPLE_EVERY = 0.26;
const RIPPLE_LIFE = 0.9;
/** At night, sparks of living light in the snake's wake, each lasting this long, s. */
const SPARK_LIFE = 1.4;
/** Breath shows as a dotted arc round the head once it's below this share. */
const BREATH_SHOWN = 0.6;

interface Fleck {
  x: number;
  y: number;
  age: number;
  readonly life: number;
  readonly r: number;
  readonly vx: number;
  readonly vy: number;
}

/**
 * The reef's own layer over its painted boards (reefPlace.ts): light
 * shimmering on the water, the eels' holes as dark openings,
 * bubbles from the krait's nostrils underwater, ripples where it swims at
 * the surface, the shark's fin and dotted lane, a breath arc round the
 * head when it runs low, and at night the water lights up in its wake.
 */
class ReefView implements ChapterView {
  private readonly holes: Phaser.GameObjects.Graphics;
  private readonly light: Phaser.GameObjects.Graphics;
  private readonly low: Phaser.GameObjects.Graphics;
  private readonly high: Phaser.GameObjects.Graphics;
  private readonly warn: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics | null;
  private readonly fin: Phaser.GameObjects.Graphics;
  private readonly land: readonly ZoneDef[];
  private bubbles: Fleck[] = [];
  private ripples: Fleck[] = [];
  private sparks: Fleck[] = [];
  private nextBubble = 0;
  private nextRipple = 0;
  private wasWet: boolean | null = null;
  private seed = 1;

  constructor(scene: Phaser.Scene, world: World) {
    const level = world.level;
    this.land = (level.zones ?? []).filter((z) => z.kind === 'land');
    this.light = scene.add.graphics().setDepth(DEPTH.light);
    this.holes = scene.add.graphics().setDepth(DEPTH.holes);
    for (const h of level.spots ?? []) {
      this.holes.fillStyle(INK, 0.18).fillCircle(h.x + 2, h.y + 2, 11);
      this.holes.fillStyle(0x1b2440, 0.78).fillCircle(h.x, h.y, 9);
      this.holes.fillStyle(0x0b1022, 0.9).fillCircle(h.x + 1, h.y + 1, 5.5);
      this.holes.lineStyle(1.2, INK, 0.7).strokeCircle(h.x, h.y, 9.5);
    }
    this.fin = scene.add.graphics().setDepth(DEPTH.fin);
    this.low = scene.add.graphics().setDepth(DEPTH.ripples);
    this.high = scene.add.graphics().setDepth(DEPTH.bubbles);
    this.warn = scene.add.graphics().setDepth(DEPTH.lane);
    this.glow = level.dark ? scene.add.graphics().setDepth(DEPTH.glow).setBlendMode(Phaser.BlendModes.ADD) : null;
  }

  update(world: World, time: number, dt: number): void {
    const t = time / 1000;
    const s = world.snake;
    const h = s.head;
    const wet = world.inZone(h, 'water');
    const shallow = world.inZone(h, 'sand');
    const moving = s.moved > 0.2;
    this.drawLight(world, t);
    // Bubbles from the nostrils while it holds its breath.
    this.nextBubble -= dt;
    if (wet && this.nextBubble <= 0 && world.state === 'play') {
      const nose = { x: h.x + Math.cos(s.heading) * s.width * 0.7, y: h.y + Math.sin(s.heading) * s.width * 0.7 };
      for (let i = 0; i < 1 + Math.floor(this.rand() * 2); i++) {
        this.bubbles.push({ x: nose.x + (this.rand() - 0.5) * 4, y: nose.y + (this.rand() - 0.5) * 4, age: 0, life: BUBBLE_LIFE * (0.7 + this.rand() * 0.5), r: 1.6 + this.rand() * 1.6, vx: (this.rand() - 0.5) * 10, vy: -6 - this.rand() * 8 });
      }
      this.nextBubble = BUBBLE_EVERY[0] + this.rand() * (BUBBLE_EVERY[1] - BUBBLE_EVERY[0]);
    }
    // Ripples: at the surface in the shallows, and a splash going in or out of the water.
    this.nextRipple -= dt;
    if (this.wasWet !== null && wet !== this.wasWet) for (let i = 0; i < 3; i++) this.ripples.push({ x: h.x, y: h.y, age: -i * 0.12, life: RIPPLE_LIFE, r: 34, vx: 0, vy: 0 });
    this.wasWet = wet;
    if (shallow && wet && moving && this.nextRipple <= 0) {
      this.ripples.push({ x: h.x, y: h.y, age: 0, life: RIPPLE_LIFE, r: 24, vx: 0, vy: 0 });
      this.nextRipple = RIPPLE_EVERY;
    }
    const shark = world.boss instanceof Shark ? world.boss : null;
    if (shark && shark.fin > 0.5 && this.rand() < dt * 9) this.ripples.push({ x: shark.x, y: shark.y, age: 0, life: RIPPLE_LIFE * 1.3, r: 40, vx: 0, vy: 0 });
    this.drawFlecks(dt);
    this.drawShark(shark, time);
    this.drawBreath(world, time);
    if (this.glow) this.drawGlow(world, dt, wet && moving, t);
  }

  /**
   * Light through the waves: a wobbling net of bright curved glints over
   * the water (a staggered grid, each point tied to three neighbours), lit
   * in drifting patches, and never over the cays.
   */
  private drawLight(world: World, t: number): void {
    const g = this.light;
    g.clear();
    const cols = Math.ceil(BOARD.w / CELL) + 2;
    const rows = Math.ceil(BOARD.h / (CELL * 0.8)) + 2;
    const at = (i: number, j: number): Pt => ({
      x: (i + (j % 2) * 0.5 - 0.5) * CELL + Math.sin(t * 0.9 + i * 1.7 + j * 0.6) * WOBBLE,
      y: (j - 0.5) * CELL * 0.8 + Math.cos(t * 0.75 + j * 1.3 + i * 0.4) * WOBBLE,
    });
    const dim = world.level.dark ? 0.45 : 1;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const p = at(i, j);
        if (this.onLand(p)) continue;
        const odd = j % 2;
        for (const q of [at(i + 1, j), at(i - 1 + odd, j + 1), at(i + odd, j + 1)]) {
          if (this.onLand(q)) continue;
          // Patches of light drift across the net: most of it is faint at any moment.
          const lit = Math.sin(t * 0.6 + p.x * 0.011 + p.y * 0.017) * Math.cos(t * 0.45 - p.x * 0.007 + p.y * 0.009);
          const a = Math.max(0, 0.03 + 0.2 * lit) * dim;
          if (a < 0.03) continue;
          const bow = Math.sin(t * 1.7 + p.x * 0.05 + q.y * 0.04) * 7;
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const len = Math.hypot(dx, dy) || 1;
          const m = { x: (p.x + q.x) / 2 - (dy / len) * bow, y: (p.y + q.y) / 2 + (dx / len) * bow };
          g.lineStyle(1 + a * 3, FOAM, a);
          g.beginPath();
          g.moveTo(p.x, p.y);
          g.lineTo(m.x, m.y);
          g.lineTo(q.x, q.y);
          g.strokePath();
        }
      }
    }
  }

  private onLand(p: Pt): boolean {
    return this.land.some((z) => inZoneShape(p, z));
  }

  /** Bubbles rise and pop; ripples spread and fade. */
  private drawFlecks(dt: number): void {
    const age = (list: Fleck[]): Fleck[] => {
      for (const f of list) {
        f.age += dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
      }
      return list.filter((f) => f.age < f.life);
    };
    this.bubbles = age(this.bubbles);
    this.ripples = age(this.ripples);
    const hi = this.high;
    hi.clear();
    for (const b of this.bubbles) {
      const k = b.age / b.life;
      const r = b.r * (1 + k * 1.2);
      hi.fillStyle(0xd9f3f7, 0.35 * (1 - k)).fillCircle(b.x, b.y, r);
      hi.lineStyle(1.1, INK, 0.45 * (1 - k)).strokeCircle(b.x, b.y, r);
      hi.fillStyle(FOAM, 0.9 * (1 - k)).fillCircle(b.x - r * 0.35, b.y - r * 0.35, Math.max(0.6, r * 0.32));
    }
    const lo = this.low;
    lo.clear();
    for (const r of this.ripples) {
      if (r.age < 0) continue;
      const k = r.age / r.life;
      lo.lineStyle(1.3, FOAM, 0.55 * (1 - k)).strokeCircle(r.x, r.y, 5 + r.r * k);
    }
  }

  /** The shark's fin rising through the tell, and the dotted lane it will charge down. */
  private drawShark(shark: Shark | null, time: number): void {
    const g = this.fin;
    g.clear();
    this.warn.clear();
    if (!shark || shark.away) return;
    const f = shark.fin;
    if (f > 0.02) {
      const c = Math.cos(shark.heading);
      const s = Math.sin(shark.heading);
      const back = { x: shark.x - c * 16, y: shark.y - s * 16 };
      const front = { x: shark.x + c * 8, y: shark.y + s * 8 };
      const tip = { x: shark.x - c * 14 + 10 * f, y: shark.y - s * 14 - 22 * f };
      g.lineStyle(1.4, FOAM, 0.8).lineBetween(front.x, front.y, front.x - c * 22 + s * 10, front.y - s * 22 - c * 10);
      g.lineBetween(front.x, front.y, front.x - c * 22 - s * 10, front.y - s * 22 + c * 10);
      g.fillStyle(0x5d646b, 0.95).fillTriangle(back.x, back.y, front.x, front.y, tip.x, tip.y);
      g.lineStyle(1.4, INK, 0.9).strokeTriangle(back.x, back.y, front.x, front.y, tip.x, tip.y);
    }
    if (shark.open) {
      // Turning slow and heavy: its snout is open to a strike.
      const sn = shark.snout;
      const r = 16 + Math.sin(time / 110) * 2;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + time / 900;
        this.warn.fillStyle(BLUE, 0.8).fillCircle(sn.x + Math.cos(a) * r, sn.y + Math.sin(a) * r, 1.8);
      }
    }
    const lane = shark.lane;
    if (!lane || (shark.mode !== 'tell' && shark.mode !== 'charge')) return;
    const dx = lane.to.x - lane.from.x;
    const dy = lane.to.y - lane.from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const flash = 0.5 + 0.5 * Math.sin(time / 70);
    this.warn.fillStyle(RED, (0.3 + 0.5 * Math.max(f, 0.3)) * (0.7 + 0.3 * flash));
    for (const side of [-1, 1]) {
      for (let k = 0; k <= 1; k += 16 / len) this.warn.fillCircle(lane.from.x + dx * k + nx * LANE_HALF * side, lane.from.y + dy * k + ny * LANE_HALF * side, 2);
    }
  }

  /** A dotted arc round the head, emptying as the breath runs out (red when it's low). */
  private drawBreath(world: World, time: number): void {
    const g = this.warn;
    const m = world.snake.meter;
    if (!m || m.value > BREATH_SHOWN || world.state !== 'play') return;
    const h = world.snake.head;
    const r = 24;
    const n = 20;
    const shown = Math.ceil(m.value * n);
    const pulse = m.low ? 0.55 + 0.45 * Math.sin(time / 90) : 0.8;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      g.fillStyle(i < shown ? (m.low ? RED : INK) : INK, i < shown ? pulse : 0.15).fillCircle(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r, 1.8);
    }
  }

  /** Night: the water lights up where the snake swims, and the jellies glow. */
  private drawGlow(world: World, dt: number, trail: boolean, t: number): void {
    const g = this.glow!;
    const s = world.snake;
    if (trail) {
      for (let i = 0; i < 2; i++) {
        this.sparks.push({ x: s.head.x + (this.rand() - 0.5) * 16, y: s.head.y + (this.rand() - 0.5) * 16, age: 0, life: SPARK_LIFE * (0.6 + this.rand() * 0.6), r: 1 + this.rand() * 1.4, vx: 0, vy: 0 });
      }
    }
    for (const f of this.sparks) f.age += dt;
    this.sparks = this.sparks.filter((f) => f.age < f.life);
    g.clear();
    for (const f of this.sparks) {
      const k = f.age / f.life;
      g.fillStyle(GLOW, 0.75 * (1 - k)).fillCircle(f.x, f.y, f.r * (1 + k));
    }
    for (const e of world.enemies) {
      if (!(e instanceof Drifter)) continue;
      const a = 0.16 + 0.08 * Math.sin(t * 3 + e.id);
      g.fillStyle(0xb9f0ff, a).fillCircle(e.x, e.y, 18);
      g.fillStyle(0xe6fbff, a * 1.4).fillCircle(e.x, e.y, 8);
    }
    for (const p of world.prey) {
      if (p.mode === 'hidden' || dist(p, s.head) > 260) continue;
      g.fillStyle(GLOW, 0.12).fillCircle(p.x, p.y, 7);
    }
  }

  /** A steady little random series (the view's own: the world's dice stay the world's). */
  private rand(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  destroy(): void {
    for (const g of [this.light, this.holes, this.fin, this.low, this.high, this.warn, this.glow]) g?.destroy();
  }
}

export const reefView = (scene: Phaser.Scene, world: World): ChapterView => new ReefView(scene, world);
