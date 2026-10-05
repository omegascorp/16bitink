import Phaser from 'phaser';
import type { SfxId } from '../../../audio/recipes';
import type { CoverView } from '../coverPatches';
import type { Fish, PlayerView } from '../fish';
import type { Player } from '../player';
import { keepInWater } from '../../../logic/water';
import type { SpeciesId } from '../../../levels/types';

/**
 * The shared kit for the giants' skills (one module per giant in this
 * folder). A Boss takes over its fish's movement from the usual fish
 * behaviour; the host is everything in the level it may reach into.
 */
export interface BossHost {
  readonly scene: Phaser.Scene;
  readonly world: { readonly width: number; readonly height: number };
  readonly floorAt: (x: number) => number;
  /** The level's weed and coral patches (empty where nothing grows). */
  readonly covers: readonly CoverView[];
  player(): Player;
  /** Every other fish in the water. */
  fish(): readonly Fish[];
  /** A bite from `by` that didn't come from touching it (jaws shot out ahead of it): costs a life like any bite. */
  bite(by: Fish): void;
  /** How far the player's own light reaches in the dark, px. */
  lightRadius(): number;
  /** Knocks the player senseless for `ms` (no steering), unless they're hidden or out of the water. Returns true if it did. */
  stunPlayer(ms: number, text: string): boolean;
  /** Drags the player by (dx, dy) px this frame (a current, a suction), unless they're hidden, in the air or hooked. */
  drag(dx: number, dy: number): void;
  /** Brings a new fish into the water (a giant's partner); it's added to the level's fish. */
  summon(species: SpeciesId, size: number, x: number, y: number, vx: number): Fish;
  /** Flushes the player out of cover, as if spotted. Returns true if they were hiding. */
  flushPlayer(): boolean;
  /** A splash on the surface at x, sized like a fish of radius `size`. */
  splash(x: number, size: number): void;
  floatText(x: number, y: number, text: string, color: string, size?: number): void;
  sfx(id: SfxId, at?: { readonly x: number; readonly y: number }, pitch?: number, gain?: number): void;
  burst(x: number, y: number, count: number): void;
  shake(ms: number, intensity: number): void;
}

export interface Boss {
  readonly fish: Fish;
  /** One frame of thinking and moving, in place of the usual fish behaviour. */
  update(p: PlayerView, now: number, dt: number): void;
  /** A fish was eaten at (x, y): blood in the water. */
  smell?(x: number, y: number): void;
  /** You're about to eat it: return true to slip away instead (it shed its tail, say). */
  resist?(now: number): boolean;
  destroy(): void;
}

const RED = 0xa3342b;

/** Plain points for Graphics polygons (it only reads x and y). */
const points = (pts: readonly { x: number; y: number }[]): Phaser.Math.Vector2[] => pts.map((p) => new Phaser.Math.Vector2(p.x, p.y));
const INK = 0x1b1a1f;

/**
 * Warnings in the game's red pencil, redrawn every frame on one Graphics:
 * a giant should always show what it's about to do before it does it.
 */
export class Marks {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, depth = 37) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  clear(): this {
    this.g.clear();
    return this;
  }

  /** A hand-drawn "!" of height `size` standing on (x, y), wobbling with `t` (s). */
  exclaim(x: number, y: number, size: number, t: number): this {
    const g = this.g;
    const lean = Math.sin(t * 9) * 0.08;
    const top = { x: x + lean * size, y: y - size };
    const foot = { x, y: y - size * 0.32 };
    g.lineStyle(size * 0.16, RED, 0.9).lineBetween(top.x, top.y, foot.x, foot.y);
    g.lineStyle(size * 0.07, INK, 0.5).lineBetween(top.x - size * 0.05, top.y, foot.x - size * 0.03, foot.y);
    g.fillStyle(RED, 0.95).fillCircle(x, y - size * 0.1, size * 0.1);
    return this;
  }

  /** A dashed red ring, turning slowly: something is about to happen inside it. */
  ring(x: number, y: number, r: number, t: number, alpha = 0.85): this {
    const g = this.g.lineStyle(Math.max(1.5, r * 0.025), RED, alpha);
    for (let a = 0; a < Math.PI * 2; a += 0.42) g.beginPath().arc(x, y, r, a + t * 0.8, a + t * 0.8 + 0.26).strokePath();
    return this;
  }

  /**
   * Water rushing into a mouth at (x, y) that faces `facing` (1 right, -1 left):
   * curved strokes inside a cone of half-angle `cone`, sliding inward with `t`.
   */
  swirl(x: number, y: number, facing: 1 | -1, reach: number, cone: number, t: number, alpha = 0.7, lift = 0): this {
    const g = this.g;
    const at = (r: number, a: number): { x: number; y: number } => ({ x: x + Math.cos(a - lift) * r * facing, y: y + Math.sin(a - lift) * r });
    for (let i = 0; i < 9; i++) {
      const lane = -1 + (2 * i) / 8;
      const phase = (t * 1.4 + i * 0.37) % 1;
      // Each streak curls in towards the middle of the cone as it nears the mouth.
      const r0 = reach * (1 - phase) * 0.95;
      const fade = alpha * Math.sin(Math.PI * phase);
      g.lineStyle(Math.max(1.2, reach * 0.005), RED, fade).beginPath();
      for (let k = 0; k <= 4; k++) {
        const r = Math.max(0, r0 - reach * 0.035 * k);
        const p = at(r, lane * cone * (0.3 + 0.7 * (r / reach)));
        if (k === 0) g.moveTo(p.x, p.y);
        else g.lineTo(p.x, p.y);
      }
      g.strokePath();
    }
    return this;
  }

  /** A solid ring of `color` spreading out: a shock wave, a boom. */
  wave(x: number, y: number, r: number, alpha: number, color = INK): this {
    this.g.lineStyle(Math.max(2, r * 0.03), color, alpha).strokeCircle(x, y, r);
    this.g.lineStyle(Math.max(1, r * 0.012), color, alpha * 0.5).strokeCircle(x, y, r * 0.86);
    return this;
  }

  /** A pair of pale eye-glints in the dark, `gap` px apart. */
  glints(x: number, y: number, gap: number, r: number, alpha: number): this {
    this.g.fillStyle(0xdfe8ff, alpha).fillCircle(x - gap / 2, y, r).fillCircle(x + gap / 2, y, r);
    this.g.fillStyle(0xffffff, alpha * 0.25).fillCircle(x - gap / 2, y, r * 2.4).fillCircle(x + gap / 2, y, r * 2.4);
    return this;
  }

  /** A soft glow of `color`: a warning light. */
  glow(x: number, y: number, r: number, alpha: number, color = 0xf2c7c9): this {
    for (let k = 3; k >= 1; k--) this.g.fillStyle(color, (alpha * 0.3) / k).fillCircle(x, y, r * (0.5 + k * 0.35));
    return this;
  }

  /**
   * Slingshot jaws shot out to (x, y) from a head at (hx, hy), facing `facing`:
   * a tapering fleshy stalk ending in a gaping mouth, both jaws curving apart
   * and set with needle teeth pointing in.
   */
  jaws(hx: number, hy: number, x: number, y: number, facing: 1 | -1, size: number): this {
    const g = this.g;
    const line = Math.max(1, size * 0.035);
    // The stalk: wide at the head, narrower at the jaws.
    const w0 = size * 0.17;
    const w1 = size * 0.1;
    const stalk = [
      { x: hx, y: hy - w0 }, { x, y: y - w1 }, { x, y: y + w1 }, { x: hx, y: hy + w0 },
    ];
    g.fillStyle(0xd9a3a5, 1).fillPoints(points(stalk), true);
    g.lineStyle(line, INK, 0.85).lineBetween(stalk[0]!.x, stalk[0]!.y, stalk[1]!.x, stalk[1]!.y).lineBetween(stalk[3]!.x, stalk[3]!.y, stalk[2]!.x, stalk[2]!.y);
    // Each jaw: a curved blade from the end of the stalk out to a forward tip, the two opening a gape.
    const len = size * 0.62;
    const gape = size * 0.42;
    const curve = (t: number, a: { x: number; y: number }, c: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } => ({
      x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
      y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
    });
    for (const side of [-1, 1] as const) {
      const tip = { x: x + facing * len, y: y + side * gape };
      const outerA = { x: x - facing * size * 0.05, y: y + side * w1 * 1.6 };
      const outerC = { x: x + facing * len * 0.45, y: y + side * gape * 1.25 };
      const innerA = { x: x + facing * size * 0.04, y: y + side * w1 * 0.2 };
      const innerC = { x: x + facing * len * 0.6, y: y + side * gape * 0.55 };
      const outer = Array.from({ length: 9 }, (_, k) => curve(k / 8, outerA, outerC, tip));
      const inner = Array.from({ length: 9 }, (_, k) => curve(k / 8, innerA, innerC, tip));
      const jaw = [...outer, ...[...inner].reverse()];
      g.fillStyle(0xe7b7b6, 1).fillPoints(points(jaw), true);
      g.lineStyle(line, INK, 0.9).strokePoints(points(jaw), true);
      // Needle teeth along the inner edge, pointing across the gape.
      g.lineStyle(Math.max(1, size * 0.026), 0xfffaf0, 1);
      for (let k = 1; k < inner.length - 1; k++) {
        const p = inner[k]!;
        g.lineBetween(p.x, p.y, p.x + facing * size * 0.04, p.y - side * size * 0.1);
      }
    }
    // The dark throat between the jaws.
    g.fillStyle(0x3a1f1a, 0.85).fillCircle(x + facing * size * 0.06, y, w1 * 0.9);
    return this;
  }

  /** A dotted pencil line: the path something is about to take. */
  dotted(x0: number, y0: number, x1: number, y1: number, width: number, alpha = 0.8): this {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const step = width * 4;
    this.g.fillStyle(RED, alpha);
    for (let d = 0; d <= len; d += step) {
      const k = d / len;
      this.g.fillCircle(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, width);
    }
    return this;
  }

  destroy(): void {
    this.g.destroy();
  }
}

/** Moves a boss fish by its velocity for one frame, keeping it in the water and off the sand. */
export function swimBoss(f: Fish, world: BossHost['world'], floorAt: (x: number) => number, dt: number): void {
  f.sprite.x += f.vx * dt;
  const water = keepInWater(f.sprite.y + f.vy * dt, f.vy, f.size, world.height, floorAt(f.sprite.x));
  f.sprite.y = water.y;
  f.vy = water.vy;
}

/** Eases a fish's velocity towards (vx, vy) at `rate` per second. */
export function easeVelocity(f: Fish, vx: number, vy: number, rate: number, dt: number): void {
  const k = Math.min(1, dt * rate);
  f.vx += (vx - f.vx) * k;
  f.vy += (vy - f.vy) * k;
}

/** A jellyfish sting or a battery shock overrides any plan: it drifts, sinking a little. Returns true while that lasts. */
export function dazed(f: Fish, now: number, dt: number): boolean {
  if (f.state !== 'stunned') return false;
  if (now >= f.stateUntil) {
    f.state = 'cruise';
    return false;
  }
  easeVelocity(f, 0, 22, 4, dt);
  return true;
}
