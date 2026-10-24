import type Phaser from 'phaser';
import { FRAME_H } from '../art/creatures/types';
import type { CreatureId } from '../logic/creatures';

/**
 * How a figure carries itself while it travels, on top of its painted walk
 * (FigureAnim plays the legs and wings): a little lift each footfall, a
 * lean into the way it goes, a sway or a rocking-horse pitch, a squash as
 * it lands, and a puff of dust where a foot comes down. Flyers are lifted
 * along their arc by `lift`. A stride lasts as long as the painted walk's
 * six frames at WALK_FPS.
 */
export type GaitStyle = 'walk' | 'trot' | 'stomp' | 'bound' | 'gallop' | 'fly';

interface GaitSpec {
  /** One stride, ms. */
  readonly period: number;
  /** How high a step lifts the figure, frame units. */
  readonly hop: number;
  /** Side-to-side rock, degrees. */
  readonly sway: number;
  /** Forward lean while moving, degrees. */
  readonly lean: number;
  /** Rocking-horse pitch, degrees. */
  readonly pitch: number;
  /** Squash on landing (or stretch on a wingbeat), a fraction. */
  readonly squash: number;
  /** Footfalls a stride: 2 for two legs, 1 for a gallop's single bound, 0 in the air. */
  readonly falls: number;
}

const SPECS: Readonly<Record<GaitStyle, GaitSpec>> = {
  walk: { period: 500, hop: 0.6, sway: 1, lean: 1.5, pitch: 0, squash: 0.02, falls: 2 },
  trot: { period: 420, hop: 0.8, sway: 1.2, lean: 2.5, pitch: 0, squash: 0.02, falls: 2 },
  stomp: { period: 600, hop: 0, sway: 1.5, lean: 1, pitch: 0, squash: 0.03, falls: 2 },
  bound: { period: 420, hop: 0, sway: 0, lean: 1, pitch: 0, squash: 0, falls: 1 },
  gallop: { period: 500, hop: 0, sway: 0, lean: 1, pitch: 0, squash: 0, falls: 1 },
  fly: { period: 430, hop: 2, sway: 1, lean: 6, pitch: 0, squash: 0, falls: 0 },
};

const STYLE: Readonly<Record<CreatureId | 'hero', GaitStyle>> = {
  hero: 'gallop', lancer: 'gallop',
  spearman: 'walk', bowman: 'walk', swordsman: 'walk', monk: 'walk', skeleton: 'walk',
  goblin: 'trot', bandit: 'trot',
  ogre: 'stomp',
  wolf: 'bound',
  griffin: 'fly', seraph: 'fly',
};

export const gaitOf = (id: CreatureId | 'hero'): GaitStyle => STYLE[id];

/** Walk frames a second for each gait (six frames make a stride). */
export const WALK_FPS: Readonly<Record<GaitStyle, number>> = { walk: 12, trot: 14, stomp: 10, bound: 14, gallop: 12, fly: 14 };

/** How high a flyer rises at the top of its arc, frame units. */
const LIFT = 26;
/** How long a figure takes to settle when it stops, ms. */
const SETTLE = 140;

export interface GaitOpts {
  /** A foot came down at (x, y) in the figure's own space (its parent's): raise a puff there. */
  readonly onFall?: (x: number, y: number, heavy: boolean) => void;
}

/**
 * Drives one figure's gait from the scene's update loop, through its origin
 * (so the hop never fights the tweens moving it), angle and scale.
 */
export class Gait {
  /** 0..1: how far up its arc a flyer is. */
  lift = 0;
  private readonly spec: GaitSpec;
  private readonly rest: { readonly ox: number; readonly oy: number; readonly sx: number; readonly sy: number; readonly angle: number };
  private t = 0;
  private falls = 0;
  private settling = -1;
  private running = false;

  constructor(private readonly scene: Phaser.Scene, private readonly img: Phaser.GameObjects.Image, style: GaitStyle, private readonly opts: GaitOpts = {}) {
    this.spec = SPECS[style];
    this.rest = { ox: img.originX, oy: img.originY, sx: img.scaleX, sy: img.scaleY, angle: img.angle };
  }

  start(): this {
    if (this.running) return this;
    this.running = true;
    this.settling = -1;
    this.t = 0;
    this.falls = 0;
    this.scene.events.on('update', this.tick, this);
    this.scene.events.once('shutdown', this.halt, this);
    return this;
  }

  /** Eases back to standing; `now` snaps there (when the scene is about to sleep). */
  stop(now = false): void {
    if (!this.running) return;
    if (now) this.halt();
    else this.settling = 0;
  }

  private halt(): void {
    this.scene.events.off('update', this.tick, this);
    this.running = false;
    this.pose(0, 0, 1, 1);
  }

  private tick(_time: number, delta: number): void {
    const s = this.spec;
    if (this.settling >= 0) {
      this.settling += delta;
      const k = Math.max(0, 1 - this.settling / SETTLE);
      this.pose(this.hopNow() * k, this.angleNow() * k, 1 + (this.sx() - 1) * k, 1 + (this.sy() - 1) * k);
      if (k === 0) this.halt();
      return;
    }
    this.t += delta;
    const fell = s.falls ? Math.floor((this.t / s.period) * s.falls) : 0;
    if (fell > this.falls) {
      this.falls = fell;
      this.opts.onFall?.(this.img.x, this.img.y, s === SPECS.stomp || s === SPECS.gallop);
    }
    this.pose(this.hopNow(), this.angleNow(), this.sx(), this.sy());
  }

  private phase(): number {
    return (this.t / this.spec.period) * Math.PI * 2;
  }

  /** How high off the ground the figure is now, frame units. */
  private hopNow(): number {
    const s = this.spec;
    const p = this.phase();
    const step = s.falls === 2 ? Math.abs(Math.sin(p)) : s.falls === 1 ? Math.max(0, Math.sin(p)) : 0.5 + 0.5 * Math.sin(p);
    return s.hop * step + LIFT * Math.sin(Math.PI * Math.min(1, Math.max(0, this.lift)));
  }

  private angleNow(): number {
    const s = this.spec;
    const p = this.phase();
    const dir = this.img.flipX ? -1 : 1;
    return dir * (s.lean + s.pitch * Math.cos(p)) + s.sway * Math.sin(p);
  }

  /** Squash as a foot lands (strongest at the bottom of a step), or stretch with a wingbeat. */
  private squashNow(): number {
    const s = this.spec;
    const p = this.phase();
    if (!s.falls) return s.squash * Math.sin(p);
    const ground = s.falls === 2 ? 1 - Math.abs(Math.sin(p)) : 1 - Math.max(0, Math.sin(p));
    return -s.squash * ground ** 6;
  }

  private sx(): number {
    return 1 - this.squashNow() * 0.6;
  }

  private sy(): number {
    return 1 + this.squashNow();
  }

  private pose(hop: number, angle: number, kx: number, ky: number): void {
    const r = this.rest;
    this.img.setOrigin(r.ox, r.oy + hop / FRAME_H).setAngle(r.angle + angle).setScale(r.sx * kx, r.sy * ky);
  }
}

/** A puff of dust where a foot came down, in `parent` (or the scene) at depth `depth`. */
export function dustPuff(scene: Phaser.Scene, x: number, y: number, size: number, heavy: boolean, parent?: Phaser.GameObjects.Container, below?: Phaser.GameObjects.GameObject, depth = 0): void {
  const r = size * (heavy ? 1.4 : 1);
  for (let i = 0; i < (heavy ? 3 : 2); i++) {
    const dx = (Math.random() - 0.5) * r * 1.6;
    const puff = scene.add.ellipse(x + dx, y - r * 0.2, r, r * 0.55, 0xf4ead0, heavy ? 0.75 : 0.6).setStrokeStyle(1, 0x8f7a52, 0.3);
    if (parent) {
      const at = below ? parent.getIndex(below) : -1;
      if (at >= 0) parent.addAt(puff, at);
      else parent.add(puff);
    } else puff.setDepth(depth);
    scene.tweens.add({ targets: puff, scaleX: 2.2, scaleY: 1.6, y: puff.y - r * 0.5, alpha: 0, duration: 420 + Math.random() * 160, ease: 'Quad.easeOut', onComplete: () => puff.destroy() });
  }
}
