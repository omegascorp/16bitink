import type Phaser from 'phaser';
import { POSE_FRAMES, STRIKE_FRAME, type PoseKind } from '../art/creatures/types';
import { TEX, type Figure } from '../art/textures';

/** Idle frames a second: a slow breath. */
const IDLE_FPS = 5;
/** How long each attack frame holds, ms: a quick start, the wind-up and the blow held, a brisk recovery. */
const ATTACK_MS = [70, 170, 190, 140, 110] as const;

/**
 * Plays a figure's baked poses on its sprite: the idle loop (each figure
 * starts at its own point in it, so a line of troops doesn't breathe in
 * step), the walk while it travels, and an attack that calls back on the
 * frame where the blow lands. Call `update` every frame.
 */
export class FigureAnim {
  private kind: PoseKind = 'idle';
  private frame: number;
  private clock: number;
  private fps = IDLE_FPS;
  private strike: (() => void) | null = null;
  private done: (() => void) | null = null;

  constructor(private readonly img: Phaser.GameObjects.Image, private fig: Figure) {
    this.frame = Math.floor(Math.random() * POSE_FRAMES.idle);
    this.clock = Math.random() * (1000 / IDLE_FPS);
    this.show();
  }

  /** Swaps the figure (a slot that changed hands) and goes back to idle. */
  setFigure(fig: Figure): void {
    this.fig = fig;
    this.idle();
  }

  idle(): void {
    this.finishAttack();
    this.set('idle', IDLE_FPS);
  }

  /** The walk (or run, gallop, wingbeat) loop at `fps` frames a second. */
  walk(fps: number): void {
    this.finishAttack();
    this.set('walk', fps);
  }

  /** One attack: `onStrike` fires on the frame of the blow; resolves back in the idle stance. */
  attack(onStrike?: () => void): Promise<void> {
    this.finishAttack();
    this.kind = 'attack';
    this.frame = 0;
    this.clock = 0;
    this.show();
    this.strike = onStrike ?? null;
    return new Promise((resolve) => {
      this.done = resolve;
    });
  }

  update(delta: number): void {
    this.clock += delta;
    const hold = this.kind === 'attack' ? ATTACK_MS[this.frame] ?? 100 : 1000 / this.fps;
    if (this.clock < hold) return;
    this.clock -= hold;
    if (this.kind === 'attack') {
      if (this.frame + 1 >= POSE_FRAMES.attack) {
        this.idle();
        return;
      }
      this.frame++;
      if (this.frame === STRIKE_FRAME) {
        const strike = this.strike;
        this.strike = null;
        strike?.();
      }
    } else this.frame = (this.frame + 1) % POSE_FRAMES[this.kind];
    this.show();
  }

  private set(kind: PoseKind, fps: number): void {
    if (this.kind !== kind) {
      this.frame = 0;
      this.clock = 0;
    }
    this.kind = kind;
    this.fps = fps;
    this.show();
  }

  /** Ends an attack cut short, firing what it still owes. */
  private finishAttack(): void {
    const strike = this.strike;
    const done = this.done;
    this.strike = null;
    this.done = null;
    strike?.();
    done?.();
  }

  private show(): void {
    const key = TEX.figure(this.fig, this.kind, this.frame);
    // A pose not painted yet (it's painted when a battle or map opens) falls back to standing.
    this.img.setTexture(this.img.scene.textures.exists(key) ? key : TEX.figure(this.fig, 'idle', 0));
  }
}
