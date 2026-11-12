import Phaser from 'phaser';
import { ART, stepAngle, stepOf } from './art';
import type { Fx } from './fx';
import { DEPTH, WORLD, type World } from './world';

export type RotationMode = 'free' | 'rotsprite';
export type GunKind = 'mg' | 'cannon' | 'cannon3' | 'rocket';

export interface Build {
  readonly id: string;
  readonly name: string;
  readonly drive: string;
  readonly hull: keyof typeof ART.ring;
  readonly turret: string;
  readonly gun: GunKind;
  /** Top speed px/s, hull turn rad/s, collision radius px. */
  readonly speed: number;
  readonly turn: number;
  readonly radius: number;
}

export const BUILDS: readonly Build[] = [
  { id: 'scout', name: 'Scout', drive: 'driveWheels', hull: 'hullLight', turret: 'turretMG', gun: 'mg', speed: 80, turn: 2.8, radius: 10 },
  { id: 'brawler', name: 'Brawler', drive: 'driveHalftrack', hull: 'hullMedium', turret: 'turretCannon', gun: 'cannon', speed: 60, turn: 2.0, radius: 12 },
  { id: 'siege', name: 'Siege', drive: 'driveTracks', hull: 'hullHeavy', turret: 'turretRocket', gun: 'rocket', speed: 44, turn: 1.5, radius: 14 },
  { id: 'brawler3', name: 'Brawler, Mk III cannon', drive: 'driveHalftrack', hull: 'hullMedium', turret: 'turretCannon3', gun: 'cannon3', speed: 58, turn: 2.0, radius: 12 },
];

interface Gun {
  shot: string;
  reload: number;
  speed: number;
  accel: number;
  life: number;
  /** Barrel tips from the turret's ring, in the art's facing (north = -y). */
  tips: ReadonlyArray<readonly [number, number]>;
  damage: number;
  spread: number;
  big: boolean;
}

const GUNS: Record<GunKind, Gun> = {
  mg: { shot: 'shotBullet', reload: 0.085, speed: 320, accel: 0, life: 0.7, tips: [[-1.2, -15], [1.2, -15]], damage: 1, spread: 0.05, big: false },
  cannon: { shot: 'shotShell', reload: 0.9, speed: 250, accel: 0, life: 1.1, tips: [[0, -20]], damage: 4, spread: 0.01, big: true },
  cannon3: { shot: 'shotShell', reload: 0.75, speed: 270, accel: 0, life: 1.1, tips: [[0, -23]], damage: 5, spread: 0.01, big: true },
  rocket: { shot: 'shotRocket', reload: 0.55, speed: 70, accel: 320, life: 1.4, tips: [[-3.6, -6], [3.6, -6]], damage: 6, spread: 0.03, big: true },
};

/** Where each drive's tracks or wheels touch the ground: x offset of each side and the mark's width. */
const TREADS: Record<string, { x: number; w: number; len: number }> = {
  driveWheels: { x: 8.8, w: 3, len: 12 },
  driveHalftrack: { x: 10.2, w: 4, len: 15 },
  driveTracks: { x: 11.8, w: 6, len: 19 },
};

/** The sun is fixed (front left, as the structures' render); a part's shadow falls this far per unit of its height. */
const SUN = ART.sun as [number, number, number];
const SHADOW_DIR = { x: -SUN[0] / SUN[2], y: -SUN[1] / SUN[2] };

export interface Controls {
  /** Where the driver wants to go (length 0..1), or null to stop. */
  move: { x: number; y: number } | null;
  /** The world point the turret should face. */
  aim: { x: number; y: number };
  fire: boolean;
}

interface Shot {
  img: Phaser.GameObjects.Image;
  key: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  accel: number;
  life: number;
  damage: number;
  big: boolean;
  trail: boolean;
}

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

export class Tank {
  x: number;
  y: number;
  angle: number;
  turretAngle: number;
  private speed = 0;
  private travelled = 0;
  private markAt = 0;
  private reload = 0;
  private barrel = 0;
  private build: Build = BUILDS[1]!;
  private readonly sBody: Phaser.GameObjects.Image;
  private readonly sTurret: Phaser.GameObjects.Image;
  private readonly drive: Phaser.GameObjects.Image;
  private readonly hull: Phaser.GameObjects.Image;
  private readonly turret: Phaser.GameObjects.Image;
  private readonly shots: Shot[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly world: World, private readonly fx: Fx, public mode: RotationMode) {
    const s = world.start;
    this.x = s.x;
    this.y = s.y;
    this.angle = s.angle;
    this.turretAngle = s.angle;
    const img = (): Phaser.GameObjects.Image => scene.add.image(0, 0, '__DEFAULT');
    this.sBody = img().setTint(0x000000).setAlpha(0.34).setDepth(DEPTH.tankShadow);
    // The turret's shadow falls on its own deck (and past it on the ground), so it sorts between hull and turret.
    this.sTurret = img().setTint(0x000000).setAlpha(0.32);
    this.drive = img();
    this.hull = img();
    this.turret = img();
  }

  get current(): Build {
    return this.build;
  }

  setBuild(b: Build): void {
    this.build = b;
  }

  /** One part on screen: free mode turns its sprite, RotSprite mode picks the pre-turned frame and doesn't turn it. */
  private show(img: Phaser.GameObjects.Image, key: string, angle: number, x: number, y: number): void {
    // The art faces north; the game's angle 0 is east.
    const turn = angle + Math.PI / 2;
    if (this.mode === 'free') img.setTexture(`free:${key}`).setRotation(turn);
    else img.setTexture(`rot:${key}`, String(stepOf(turn))).setRotation(0);
    img.setPosition(Math.round(x), Math.round(y));
  }

  update(dt: number, c: Controls): void {
    const b = this.build;
    const before = this.angle;
    let throttle = 0;
    if (c.move) {
      const mag = Math.min(1, Math.hypot(c.move.x, c.move.y));
      const diff = wrap(Math.atan2(c.move.y, c.move.x) - this.angle);
      // Tank steering: the hull turns towards the stick first, and only drives once it's roughly lined up.
      this.angle = wrap(this.angle + Phaser.Math.Clamp(diff, -b.turn * dt, b.turn * dt));
      throttle = mag * Phaser.Math.Clamp((Math.cos(diff) - 0.35) / 0.65, 0, 1);
    }
    const target = throttle * b.speed;
    this.speed += Phaser.Math.Clamp(target - this.speed, -b.speed * 3 * dt, b.speed * 1.6 * dt);
    const ox = this.x;
    const oy = this.y;
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    this.collide();
    const moved = Math.hypot(this.x - ox, this.y - oy);
    const turned = Math.abs(wrap(this.angle - before)) * TREADS[b.drive]!.x;
    this.travelled += moved + turned;
    if (this.travelled - this.markAt > 2.5) {
      this.markAt = this.travelled;
      this.leaveMarks();
    }
    // The turret turns towards the aim at its own pace, whatever the hull does.
    const want = Math.atan2(c.aim.y - this.y, c.aim.x - this.x);
    const td = wrap(want - this.turretAngle);
    this.turretAngle = wrap(this.turretAngle + Phaser.Math.Clamp(td, -4 * dt, 4 * dt));
    this.reload -= dt;
    if (c.fire && this.reload <= 0 && Math.abs(td) < 0.25) this.fire();
    this.draw();
    this.updateShots(dt);
  }

  private leaveMarks(): void {
    const t = TREADS[this.build.drive]!;
    const ground = this.world.groundAt(this.x, this.y);
    if (ground === 'water') return;
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    for (const side of [-1, 1]) {
      // The rear of each track, on the ground.
      const px = this.x - cos * t.len * 0.7 - sin * side * t.x;
      const py = this.y - sin * t.len * 0.7 + cos * side * t.x;
      this.fx.mark(px, py, this.angle + Math.PI / 2, t.w);
      if (ground === 'sand' && Math.abs(this.speed) > 8 && Math.random() < 0.7) this.fx.dust(px, py, this.angle);
    }
  }

  private collide(): void {
    const r = this.build.radius;
    for (const bx of this.world.boxes) {
      const cx = Phaser.Math.Clamp(this.x, bx.x0, bx.x1);
      const cy = Phaser.Math.Clamp(this.y, bx.y0, bx.y1);
      const dx = this.x - cx;
      const dy = this.y - cy;
      const d = Math.hypot(dx, dy);
      if (d < r && d > 1e-6) {
        this.x = cx + (dx / d) * r;
        this.y = cy + (dy / d) * r;
      }
    }
    for (const ci of this.world.circles) {
      const dx = this.x - ci.x;
      const dy = this.y - ci.y;
      const d = Math.hypot(dx, dy);
      if (d < r + ci.r && d > 1e-6) {
        this.x = ci.x + (dx / d) * (r + ci.r);
        this.y = ci.y + (dy / d) * (r + ci.r);
      }
    }
    this.x = Phaser.Math.Clamp(this.x, r, WORLD.w - r);
    this.y = Phaser.Math.Clamp(this.y, r, WORLD.h - r);
  }

  /** The turret ring's world position: the hull's ring offset turned with the hull (as drawn, so snapped in RotSprite mode). */
  private ring(): { x: number; y: number } {
    const [rx, ry] = ART.ring[this.build.hull] as [number, number];
    const turn = this.mode === 'free' ? this.angle + Math.PI / 2 : stepAngle(stepOf(this.angle + Math.PI / 2));
    const c = Math.cos(turn);
    const s = Math.sin(turn);
    return { x: this.x + rx * c - ry * s, y: this.y + rx * s + ry * c };
  }

  private draw(): void {
    const b = this.build;
    const frame = Math.floor(this.travelled) % 3;
    const driveKey = frame === 0 ? b.drive : `${b.drive}-f${frame}`;
    const ring = this.ring();
    const depth = DEPTH.sorted + this.y;
    this.show(this.sBody, `body:${b.id}`, this.angle, this.x + SHADOW_DIR.x * 3, this.y + SHADOW_DIR.y * 3);
    this.show(this.sTurret, b.turret, this.turretAngle, ring.x + SHADOW_DIR.x * 2.5, ring.y + SHADOW_DIR.y * 2.5);
    this.show(this.drive, driveKey, this.angle, this.x, this.y);
    this.show(this.hull, b.hull, this.angle, this.x, this.y);
    this.show(this.turret, b.turret, this.turretAngle, ring.x, ring.y);
    this.drive.setDepth(depth);
    this.hull.setDepth(depth + 0.01);
    this.sTurret.setDepth(depth + 0.015);
    this.turret.setDepth(depth + 0.02);
  }

  private fire(): void {
    const g = GUNS[this.build.gun];
    this.reload = g.reload;
    const ring = this.ring();
    const tip = g.tips[this.barrel % g.tips.length]!;
    this.barrel++;
    const turn = this.turretAngle + Math.PI / 2;
    const c = Math.cos(turn);
    const s = Math.sin(turn);
    const x = ring.x + tip[0] * c - tip[1] * s;
    const y = ring.y + tip[0] * s + tip[1] * c;
    const angle = this.turretAngle + (Math.random() - 0.5) * g.spread * 2;
    this.fx.muzzle(x, y, this.turretAngle, g.big);
    const img = this.scene.add.image(x, y, `free:${g.shot}`).setDepth(DEPTH.shots);
    this.shots.push({ img, key: g.shot, x, y, angle, speed: g.speed, accel: g.accel, life: g.life, damage: g.damage, big: g.big, trail: this.build.gun === 'rocket' });
    // A little kick back on the hull for the big guns.
    if (g.big) this.speed -= 6;
  }

  private updateShots(dt: number): void {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]!;
      s.life -= dt;
      s.speed += s.accel * dt;
      const steps = 3;
      let hit = s.life <= 0;
      for (let k = 0; k < steps && !hit; k++) {
        s.x += (Math.cos(s.angle) * s.speed * dt) / steps;
        s.y += (Math.sin(s.angle) * s.speed * dt) / steps;
        hit = this.shotHits(s);
      }
      if (s.trail && Math.random() < 0.8) this.fx.smoke(s.x - Math.cos(s.angle) * 5, s.y - Math.sin(s.angle) * 5, 0.4);
      if (hit) {
        this.fx.spark(s.x, s.y, s.big);
        s.img.destroy();
        this.shots.splice(i, 1);
        continue;
      }
      this.show(s.img, s.key, s.angle, s.x, s.y);
    }
  }

  private shotHits(s: Shot): boolean {
    if (s.x < 0 || s.y < 0 || s.x > WORLD.w || s.y > WORLD.h) return true;
    for (const b of this.world.boxes) {
      if (b.tag === 'water') continue;
      if (s.x >= b.x0 && s.x <= b.x1 && s.y >= b.y0 && s.y <= b.y1) {
        if (b.tag === 'wall') this.world.hitWall(s.damage);
        return true;
      }
    }
    for (const c of this.world.circles) if (Math.hypot(s.x - c.x, s.y - c.y) < c.r + 1) return true;
    return false;
  }
}
