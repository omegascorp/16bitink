import Phaser from 'phaser';
import { DEPTH } from './world';

/**
 * Particles and ground marks, pooled: muzzle flashes, hit sparks, smoke,
 * dust on sand and the track marks that fade behind a tank. All drawn from
 * a one-pixel white texture, tinted and scaled (code may do particles; the
 * art stays generated).
 */
interface Mote {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  max: number;
  alpha: number;
  drag: number;
  grow: number;
}

const MARK_LIFE = 7;
const MAX_MARKS = 700;

export class Fx {
  private readonly motes: Mote[] = [];
  private readonly free: Phaser.GameObjects.Image[] = [];
  private readonly marks: { img: Phaser.GameObjects.Image; life: number }[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    if (!scene.textures.exists('px')) {
      const c = document.createElement('canvas');
      c.width = c.height = 1;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 1, 1);
      scene.textures.addCanvas('px', c);
    }
  }

  private take(): Phaser.GameObjects.Image {
    return (this.free.pop() ?? this.scene.add.image(0, 0, 'px')).setVisible(true);
  }

  private spawn(x: number, y: number, o: { vx: number; vy: number; life: number; colour: number; size: number; alpha?: number; drag?: number; grow?: number; depth?: number }): void {
    const img = this.take().setPosition(x, y).setTint(o.colour).setScale(o.size).setAlpha(o.alpha ?? 1).setDepth(o.depth ?? DEPTH.fx).setRotation(0);
    this.motes.push({ img, vx: o.vx, vy: o.vy, life: o.life, max: o.life, alpha: o.alpha ?? 1, drag: o.drag ?? 0, grow: o.grow ?? 0 });
  }

  muzzle(x: number, y: number, angle: number, big: boolean): void {
    const n = big ? 9 : 4;
    this.spawn(x, y, { vx: 0, vy: 0, life: 0.05, colour: 0xfff6d8, size: big ? 4 : 2 });
    for (let i = 0; i < n; i++) {
      const a = angle + (Math.random() - 0.5) * (big ? 0.9 : 0.5);
      const v = (big ? 40 : 30) + Math.random() * 60;
      this.spawn(x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.06 + Math.random() * 0.08, colour: i % 2 ? 0xffd25a : 0xff9a2e, size: big ? 2 : 1, drag: 6 });
    }
    if (big) for (let i = 0; i < 4; i++) this.smoke(x + Math.cos(angle) * 3, y + Math.sin(angle) * 3, 0.5);
  }

  spark(x: number, y: number, big: boolean): void {
    const n = big ? 18 : 6;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 25 + Math.random() * (big ? 110 : 70);
      this.spawn(x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.12 + Math.random() * (big ? 0.35 : 0.18), colour: [0xfff2b0, 0xffc44a, 0xff7a1f][i % 3]!, size: big && i < 6 ? 2 : 1, drag: 5 });
    }
    if (big) {
      this.spawn(x, y, { vx: 0, vy: 0, life: 0.08, colour: 0xffffff, size: 6 });
      for (let i = 0; i < 7; i++) this.smoke(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8, 1);
    }
  }

  smoke(x: number, y: number, k: number): void {
    const a = Math.random() * Math.PI * 2;
    this.spawn(x, y, { vx: Math.cos(a) * 6, vy: Math.sin(a) * 6 - 5, life: 0.7 + Math.random() * 0.8 * k, colour: 0x6d6a62, size: 2, alpha: 0.55, drag: 1.5, grow: 2.5 });
  }

  dust(x: number, y: number, angle: number): void {
    const a = angle + Math.PI + (Math.random() - 0.5) * 1.2;
    const v = 6 + Math.random() * 14;
    this.spawn(x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, life: 0.5 + Math.random() * 0.6, colour: 0xd9c08a, size: 2, alpha: 0.6, drag: 2, grow: 2, depth: DEPTH.sorted + y + 30 });
  }

  /** A track mark: a dark dash on the ground under a track, which fades out. */
  mark(x: number, y: number, angle: number, w: number): void {
    if (this.marks.length >= MAX_MARKS) {
      const old = this.marks.shift()!;
      this.free.push(old.img.setVisible(false));
    }
    const img = this.take().setPosition(Math.round(x), Math.round(y)).setTint(0x2e2416).setScale(w, 2).setRotation(angle).setAlpha(0.26).setDepth(DEPTH.marks);
    this.marks.push({ img, life: MARK_LIFE });
  }

  update(dt: number): void {
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i]!;
      m.life -= dt;
      if (m.life <= 0) {
        this.free.push(m.img.setVisible(false));
        this.motes.splice(i, 1);
        continue;
      }
      const k = Math.max(0, 1 - m.drag * dt);
      m.vx *= k;
      m.vy *= k;
      m.img.x += m.vx * dt;
      m.img.y += m.vy * dt;
      if (m.grow) m.img.setScale(m.img.scaleX + m.grow * dt);
      m.img.setAlpha(m.alpha * Math.min(1, (m.life / m.max) * 2));
    }
    for (let i = this.marks.length - 1; i >= 0; i--) {
      const m = this.marks[i]!;
      m.life -= dt;
      if (m.life <= 0) {
        this.free.push(m.img.setVisible(false));
        this.marks.splice(i, 1);
      } else m.img.setAlpha(0.26 * Math.min(1, m.life / (MARK_LIFE * 0.6)));
    }
  }
}
