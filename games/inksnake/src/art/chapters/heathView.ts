import type Phaser from 'phaser';
import type { ZoneDef } from '../../level/types';
import { LOOK_STONE, Warmth } from '../../logic/abilities/adder';
import { Badger } from '../../logic/chapters/heathBadger';
import { inZoneShape } from '../../logic/zones';
import type { World } from '../../logic/world';
import type { ChapterView } from './types';

const SUN = 0xf2bf4a;
const SUN_RIM = 0xd99a2b;
const STONE_GLOW = 0xe0844a;
const CLOUD = 0x4e5f80;
const FROST = 0xdcecff;
const FROST_EDGE = 0x8fb3dc;
const SOIL = 0x6b4f34;
/** Depths: sun on the ground under the critters, setts just under them, clouds and frost over everything but the cover. */
const DEPTH = { sun: 1.15, setts: 2.45, clouds: 4.8, frost: 4.85 } as const;
/** Soft edges: this many rings, each a little smaller and as faint. */
const SOFT = 4;
/** Each ring's wash: sunshine strong enough to read as light, not bare sand; clouds a shadow you can see pass. */
const SUN_ALPHA = 0.11;
const STONE_ALPHA = 0.08;
const RIM_ALPHA = 0.6;
const CLOUD_ALPHA = 0.1;
/** Cold below this: frost shows, more as it gets colder. */
const FROSTY = 0.35;
const PUFF_EVERY = 1.3;
const PUFF_LIFE = 0.9;
const SOIL_LIFE = 0.7;

interface Speck {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
}

/**
 * The Heath's own layer: the sun patches glowing warm where the sky is
 * clear (and the warm stones at night), soft blue-grey cloud shadows
 * drifting over the heath, frost and breath on a cold snake and a shimmer
 * on one warming up, and a sett trembling with soil flying before the
 * badger comes up. (The pool and the setts themselves are painted on the
 * board: heathPlace.ts.)
 */
class HeathView implements ChapterView {
  private readonly sun: Phaser.GameObjects.Graphics;
  private readonly setts: Phaser.GameObjects.Graphics;
  private readonly clouds: Phaser.GameObjects.Graphics;
  private readonly frost: Phaser.GameObjects.Graphics;
  private readonly specks: Speck[] = [];
  private readonly puffs: { x: number; y: number; age: number }[] = [];
  private puffIn = 0;

  constructor(scene: Phaser.Scene, world: World) {
    this.sun = scene.add.graphics().setDepth(DEPTH.sun);
    this.setts = scene.add.graphics().setDepth(DEPTH.setts);
    this.clouds = scene.add.graphics().setDepth(DEPTH.clouds);
    this.frost = scene.add.graphics().setDepth(DEPTH.frost);
  }

  update(world: World, time: number, dt: number): void {
    const ab = world.ability instanceof Warmth ? world.ability : null;
    this.drawSun(world, ab, time);
    this.drawClouds(ab);
    this.drawSett(world, time, dt);
    this.drawFrost(world, ab, time, dt);
  }

  /** Each sun patch glows golden, rimmed, as much as it's in sunshine (sampled), pulsing gently; at night the warm stones glow. */
  private drawSun(world: World, ab: Warmth | null, time: number): void {
    const g = this.sun;
    g.clear();
    if (!ab) return;
    const pulse = 0.9 + 0.1 * Math.sin(time / 700);
    for (const z of world.level.zones ?? []) {
      if (z.kind !== 'sun') continue;
      const night = z.look === LOOK_STONE;
      const lit = sunnyShare(z, (p) => ab.sunAt(p) > 0);
      if (lit <= 0) continue;
      for (let i = 0; i < SOFT; i++) {
        g.fillStyle(night ? STONE_GLOW : SUN, (night ? STONE_ALPHA : SUN_ALPHA) * lit * pulse);
        fillZone(g, z, -i * 7);
      }
      g.lineStyle(2.5, night ? STONE_GLOW : SUN_RIM, RIM_ALPHA * lit * pulse);
      strokeZone(g, z);
    }
  }

  /** Cloud shadows: soft blue-grey ellipses. */
  private drawClouds(ab: Warmth | null): void {
    const g = this.clouds;
    g.clear();
    if (!ab) return;
    for (const c of ab.clouds) {
      for (let i = 0; i < SOFT; i++) {
        const k = 1 - i * 0.09;
        g.fillStyle(CLOUD, CLOUD_ALPHA);
        g.fillEllipse(c.x, c.y, c.rx * 2 * k, c.ry * 2 * k);
      }
    }
  }

  /** A sett about to break open: the ground shakes in rings and soil flies, harder as the badger comes. */
  private drawSett(world: World, time: number, dt: number): void {
    const g = this.setts;
    g.clear();
    const b = world.boss;
    const rumble = b instanceof Badger ? b.rumble : 0;
    if (b instanceof Badger && rumble > 0) {
      const s = b.sett;
      const shake = Math.sin(time / 28) * (1 + rumble * 3);
      for (let i = 0; i < 3; i++) {
        const r = 22 + i * 12 + ((time / 9 + i * 12) % 12);
        g.lineStyle(2, SOIL, (0.5 - i * 0.12) * (0.5 + rumble * 0.5));
        g.strokeEllipse(s.x + shake, s.y, r * 2, r * 1.5);
      }
      if (Math.random() < dt * (10 + rumble * 30)) {
        const a = Math.random() * Math.PI * 2;
        const v = 60 + Math.random() * 90;
        this.specks.push({ x: s.x, y: s.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, age: 0 });
      }
    }
    for (const p of this.specks) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 160 * dt;
    }
    while (this.specks.length && this.specks[0]!.age > SOIL_LIFE) this.specks.shift();
    for (const p of this.specks) {
      g.fillStyle(SOIL, 0.8 * (1 - p.age / SOIL_LIFE));
      g.fillCircle(p.x, p.y, 2.2);
    }
  }

  /** Frost glints round a cold snake's head and neck, and its breath; a warm shimmer over one warming up. */
  private drawFrost(world: World, ab: Warmth | null, time: number, dt: number): void {
    const g = this.frost;
    g.clear();
    if (!ab) return;
    const s = world.snake;
    const h = s.head;
    const cold = Math.max(0, (FROSTY - ab.value) / FROSTY);
    if (cold > 0) {
      const pts = s.trail.pts;
      for (let i = 0; i < Math.min(s.trail.count, 60); i += 5) {
        const p = pts[i]!;
        const twinkle = 0.5 + 0.5 * Math.sin(time / 260 + i * 1.7);
        const off = (i % 2 ? 1 : -1) * s.width * 0.45;
        crystal(g, p.x + Math.sin(s.heading) * off, p.y - Math.cos(s.heading) * off, 2.5 + cold * 2, cold * (0.4 + 0.5 * twinkle));
      }
      g.lineStyle(1.5, FROST_EDGE, 0.35 * cold);
      g.strokeCircle(h.x, h.y, s.width * 0.9 + Math.sin(time / 300) * 1.5);
      this.puffIn -= dt;
      if (this.puffIn <= 0 && ab.value < FROSTY * 0.8) {
        this.puffIn = PUFF_EVERY;
        this.puffs.push({ x: h.x + Math.cos(s.heading) * 14, y: h.y + Math.sin(s.heading) * 14, age: 0 });
      }
    }
    for (const p of this.puffs) p.age += dt;
    while (this.puffs.length && this.puffs[0]!.age > PUFF_LIFE) this.puffs.shift();
    for (const p of this.puffs) {
      const k = p.age / PUFF_LIFE;
      g.fillStyle(FROST, 0.35 * (1 - k));
      g.fillCircle(p.x, p.y - k * 8, 4 + k * 9);
    }
    if (ab.warming > 0) {
      // Heat shimmer: wavy lines rising off a snake soaking up the sun.
      g.lineStyle(1.6, SUN_RIM, 0.6 * ab.warming);
      for (let i = -1; i <= 1; i++) {
        const x = h.x + i * 9;
        const rise = (time / 30 + i * 7) % 18;
        g.beginPath();
        for (let j = 0; j <= 6; j++) {
          const y = h.y - 12 - rise - j * 3;
          const wx = x + Math.sin(j * 1.3 + time / 140) * 2.5;
          if (j === 0) g.moveTo(wx, y);
          else g.lineTo(wx, y);
        }
        g.strokePath();
      }
    }
  }

  destroy(): void {
    for (const g of [this.sun, this.setts, this.clouds, this.frost]) g.destroy();
    this.specks.length = 0;
    this.puffs.length = 0;
  }
}

/** A zone's shape filled, grown by `grow` px (negative shrinks it; polygons are filled as they are). */
function fillZone(g: Phaser.GameObjects.Graphics, z: ZoneDef, grow: number): void {
  if (z.shape === 'circle') g.fillCircle(z.x, z.y, Math.max(2, z.r + grow));
  else if (z.shape === 'rect') g.fillRect(z.x - grow, z.y - grow, Math.max(2, z.w + grow * 2), Math.max(2, z.h + grow * 2));
  else {
    g.beginPath();
    z.points.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
    g.closePath();
    g.fillPath();
  }
}

/** A zone's outline. */
function strokeZone(g: Phaser.GameObjects.Graphics, z: ZoneDef): void {
  if (z.shape === 'circle') g.strokeCircle(z.x, z.y, z.r);
  else if (z.shape === 'rect') g.strokeRect(z.x, z.y, z.w, z.h);
  else {
    g.beginPath();
    z.points.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
    g.closePath();
    g.strokePath();
  }
}

/** How much of a zone is lit, 0..1, from a few points across it. */
function sunnyShare(z: ZoneDef, lit: (p: { x: number; y: number }) => boolean): number {
  const pts = samples(z);
  return pts.length ? pts.filter(lit).length / pts.length : 0;
}

function samples(z: ZoneDef): { x: number; y: number }[] {
  if (z.shape === 'circle') {
    const out = [{ x: z.x, y: z.y }];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      out.push({ x: z.x + Math.cos(a) * z.r * 0.6, y: z.y + Math.sin(a) * z.r * 0.6 });
    }
    return out;
  }
  if (z.shape === 'rect') {
    const out: { x: number; y: number }[] = [];
    for (let i = 1; i <= 3; i++) for (let j = 1; j <= 3; j++) out.push({ x: z.x + (z.w * i) / 4, y: z.y + (z.h * j) / 4 });
    return out;
  }
  const n = z.points.length;
  const mid = { x: z.points.reduce((a, p) => a + p.x, 0) / n, y: z.points.reduce((a, p) => a + p.y, 0) / n };
  return inZoneShape(mid, z) ? [mid] : [];
}

/** A tiny six-pointed frost glint. */
function crystal(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, alpha: number): void {
  g.lineStyle(1.2, FROST, alpha);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI;
    g.lineBetween(x - Math.cos(a) * r, y - Math.sin(a) * r, x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  g.fillStyle(FROST_EDGE, alpha * 0.8);
  g.fillCircle(x, y, 0.9);
}

/** The Heath's view for a level (see ChapterArt.view). */
export function heathView(scene: Phaser.Scene, world: World): ChapterView {
  return new HeathView(scene, world);
}
