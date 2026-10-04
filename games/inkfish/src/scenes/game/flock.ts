import Phaser from 'phaser';
import { beakTip, BIRD_RADIUS, DIVE_FRAME } from '../../art/birdArt';
import { ART_RES, birdKey, ensureBirdTextures } from '../../art/textures';
import type { ZoneId } from '../../levels/types';
import { BIRD_INFO, birdSize, diveTarget, pickBird, wantsDive, ZONE_BIRDS, type BirdId, type Quarry } from '../../logic/birds';
import { rangeOf, type Rng } from '../../logic/rng';
import { SKY } from '../../logic/water';

/**
 * Birds over the water, frame by frame. They cruise across the sky; hunters
 * that spot a smaller fish near the surface hover, fold their wings and
 * plunge in, then bob back up and fly on. Each casts a shadow on the water,
 * so you can tell something is overhead even when the sky is off-screen.
 */
export type BirdState = 'cruise' | 'aim' | 'dive' | 'rise' | 'carry';

export interface Bird {
  readonly sprite: Phaser.GameObjects.Image;
  readonly kind: BirdId;
  readonly size: number;
  state: BirdState;
  /** Heading along the sky: 1 right, -1 left. */
  dir: 1 | -1;
  readonly cruiseY: number;
  /** Ms in the current state. */
  t: number;
  /** Ms alive: drives flapping and bobbing. */
  age: number;
  restUntil: number;
  vx: number;
  vy: number;
  target: { x: number; y: number };
  /** What it's carrying off in its beak, if anything. */
  prize: Phaser.GameObjects.Image | null;
  /** The prize is a fish the bird owns now (destroyed with it), not the player. */
  ownsPrize: boolean;
  /** How far the prize's nose is from its centre, world px: it's held by the head. */
  prizeNose: number;
  /** Hangs upright from the beak (a duck) instead of nose-up (a fish). */
  prizeUpright: boolean;
  /** What it's diving at when that isn't the player (a floating duck). */
  mark: Quarry | null;
}

const AIM_MS = 600;
const DIVE_SPEED = 760;
/** Water slows a plunge to this fraction. */
const WATER_DRAG = 0.55;
const RISE_SPEED = 240;
const REST_MS = 5000;
const FIRST_BIRD_MS = 3000;
const BIRD_EVERY_MS: readonly [number, number] = [4000, 9000];
const FLAP_HZ: Readonly<Record<BirdId, number>> = { dragonfly: 22, tern: 6, gull: 4.5, pelican: 3, gannet: 5 };
/** The flap cycle through the wing frames: up, level, down, level. */
const FLAP = [0, 1, 2, 1] as const;

export interface FlockFx {
  splash(x: number, size: number): void;
  /** A bird has picked its target and is about to dive. */
  squawk(x: number, y: number): void;
}

export class Flock {
  birds: Bird[] = [];
  private nextAt = FIRST_BIRD_MS;
  private readonly shadows: Phaser.GameObjects.Graphics;
  private readonly enabled: boolean;

  constructor(private readonly scene: Phaser.Scene, private readonly zone: ZoneId, private readonly rng: Rng) {
    const kinds = ZONE_BIRDS[zone]?.kinds ?? [];
    this.enabled = kinds.length > 0;
    if (this.enabled) ensureBirdTextures(scene, kinds);
    this.shadows = scene.add.graphics().setDepth(2.5);
  }

  /** `quarry` is the player; `others` are anything else worth a dive (floating ducks). */
  update(now: number, dt: number, quarry: Quarry & { readonly playerSize: number }, view: Phaser.Geom.Rectangle, worldWidth: number, fx: FlockFx, others: readonly Quarry[] = []): void {
    if (this.enabled && now >= this.nextAt && this.birds.length < (ZONE_BIRDS[this.zone]?.max ?? 0)) {
      this.nextAt = now + rangeOf(this.rng, BIRD_EVERY_MS[0], BIRD_EVERY_MS[1]);
      this.spawn(quarry.playerSize, view);
    }
    this.shadows.clear();
    this.birds = this.birds.filter((b) => {
      this.step(b, now, dt, quarry, others, fx);
      this.drawShadow(b);
      const gone = b.sprite.x < -300 || b.sprite.x > worldWidth + 300 || b.sprite.y < -SKY.height - 200;
      if (gone) this.remove(b);
      return !gone;
    });
  }

  /** Where the beak tip is, for striking and carrying things off. */
  beakOf(b: Bird): { x: number; y: number } {
    const s = b.sprite;
    const tip = beakTip(b.kind);
    const k = b.size / BIRD_RADIUS;
    const x = tip.x * k * (s.flipX ? -1 : 1);
    const y = tip.y * k;
    const c = Math.cos(s.rotation);
    const n = Math.sin(s.rotation);
    return { x: s.x + x * c - y * n, y: s.y + x * n + y * c };
  }

  /** The bird caught something: it carries it up and away. A fish is the bird's to destroy; the player's sprite isn't. */
  carryOff(b: Bird, prize: Phaser.GameObjects.Image, owns: boolean, nose: number, upright = false): void {
    Object.assign(b, { state: 'carry', t: 0, prize, ownsPrize: owns, prizeNose: nose, prizeUpright: upright, mark: null });
  }

  /** It struck and missed or let go: back up and away for a while. */
  retreat(b: Bird, now: number): void {
    Object.assign(b, { state: 'rise', t: 0, restUntil: now + REST_MS, mark: null });
  }

  /** Eaten by the player. */
  take(b: Bird): void {
    this.birds = this.birds.filter((x) => x !== b);
  }

  private spawn(playerSize: number, view: Phaser.Geom.Rectangle): void {
    const kind = pickBird(this.zone, this.rng);
    if (!kind) return;
    const info = BIRD_INFO[kind];
    const dir: 1 | -1 = this.rng() < 0.5 ? 1 : -1;
    const size = birdSize(kind, playerSize, this.rng);
    const cruiseY = SKY.surfaceY - rangeOf(this.rng, info.height[0], info.height[1]);
    const x = dir > 0 ? view.left - 120 : view.right + 120;
    const sprite = this.scene.add.image(x, cruiseY, birdKey(kind, 0)).setDepth(18)
      .setScale(size / BIRD_RADIUS / ART_RES).setFlipX(dir < 0);
    this.birds.push({ sprite, kind, size, state: 'cruise', dir, cruiseY, t: 0, age: this.rng() * 1000, restUntil: 0, vx: dir * info.speed, vy: 0, target: { x, y: cruiseY }, prize: null, ownsPrize: false, prizeNose: 0, prizeUpright: false, mark: null });
  }

  private step(b: Bird, now: number, dt: number, q: Quarry, others: readonly Quarry[], fx: FlockFx): void {
    const s = b.sprite;
    const info = BIRD_INFO[b.kind];
    b.t += dt * 1000;
    b.age += dt * 1000;
    const wasWet = s.y > SKY.surfaceY;
    if (b.state === 'cruise') {
      // Ease back to cruising height after a dive, bobbing a little; dragonflies dart up and down.
      const bob = b.kind === 'dragonfly' ? Math.sin(b.age / 260) * 16 + Math.sin(b.age / 90) * 4 : Math.sin(b.age / 500) * 6;
      s.x += b.dir * info.speed * dt;
      s.y += (b.cruiseY + bob - s.y) * Math.min(1, dt * 2);
      s.setRotation(0).setFlipX(b.dir < 0);
      const diver = { kind: b.kind, size: b.size, x: s.x, restUntil: b.restUntil };
      const wantsPlayer = wantsDive(diver, q, SKY.surfaceY, now);
      const mark = wantsPlayer ? null : others.find((o) => wantsDive(diver, o, SKY.surfaceY, now));
      if (wantsPlayer || mark) {
        Object.assign(b, { state: 'aim', t: 0, mark: mark ?? null });
        if (b.kind !== 'dragonfly') fx.squawk(s.x, s.y);
      }
    } else if (b.state === 'aim') {
      // Hang in the air, tipping over towards the water.
      const tip = Math.min(1, b.t / AIM_MS) * 1.1;
      s.setRotation(b.dir * tip);
      if (b.t >= AIM_MS) {
        b.target = diveTarget(b.kind, b.mark ?? q, SKY.surfaceY);
        const dx = b.target.x - s.x;
        const dy = Math.max(40, b.target.y - s.y);
        const d = Math.hypot(dx, dy);
        Object.assign(b, { state: 'dive', t: 0, vx: (dx / d) * DIVE_SPEED, vy: (dy / d) * DIVE_SPEED });
      }
    } else if (b.state === 'dive') {
      const drag = s.y > SKY.surfaceY ? WATER_DRAG : 1;
      s.x += b.vx * drag * dt;
      s.y += b.vy * drag * dt;
      this.face(b, b.vx, b.vy);
      if (s.y >= b.target.y || b.t > 1600) Object.assign(b, { state: 'rise', t: 0, restUntil: now + REST_MS, mark: null });
    } else if (b.state === 'rise') {
      // Bob back up to the surface, then take off again.
      s.y -= RISE_SPEED * dt;
      s.x += b.dir * info.speed * 0.3 * dt;
      this.face(b, b.dir * 60, -RISE_SPEED);
      if (s.y < SKY.surfaceY - 10) Object.assign(b, { state: 'cruise', t: 0 });
    } else {
      // Carrying a catch: climb away fast.
      s.x += b.dir * info.speed * 1.3 * dt;
      s.y -= 220 * dt;
      this.face(b, b.dir * info.speed, -220);
      if (b.prize?.active && b.prizeUpright) {
        // Gripped by the back, swinging under the beak.
        const beak = this.beakOf(b);
        b.prize.setPosition(beak.x, beak.y + b.prizeNose * 0.6).setRotation(Math.sin(b.t / 160) * 0.25).setDepth(s.depth - 0.5);
      } else if (b.prize?.active) {
        // Held by the head, nose up in the beak, the body dangling and swinging below.
        const beak = this.beakOf(b);
        const a = -Math.PI / 2 + Math.sin(b.t / 140) * 0.2;
        const hold = b.prizeNose * 0.8;
        b.prize
          .setPosition(beak.x - Math.cos(a) * hold, beak.y - Math.sin(a) * hold)
          .setRotation(a).setFlipX(false).setFlipY(false).setDepth(s.depth - 0.5);
      }
    }
    const isWet = s.y > SKY.surfaceY;
    if (wasWet !== isWet && b.kind !== 'dragonfly') fx.splash(s.x, b.size * 0.8);
    this.flap(b);
  }

  /** Points the bird along (vx, vy), mirrored when heading left. */
  private face(b: Bird, vx: number, vy: number): void {
    const left = vx < 0;
    b.sprite.setFlipX(left).setRotation(left ? Math.atan2(-vy, -vx) : Math.atan2(vy, vx));
  }

  private flap(b: Bird): void {
    if (b.state === 'dive' || b.state === 'rise') {
      b.sprite.setTexture(birdKey(b.kind, DIVE_FRAME));
      return;
    }
    // Hovering beats fast; big birds glide between bursts of flapping.
    const hz = FLAP_HZ[b.kind] * (b.state === 'aim' ? 2 : 1);
    const gliding = b.kind !== 'dragonfly' && b.state === 'cruise' && Math.sin(b.age / 1400) > 0.35;
    const frame = gliding ? 1 : FLAP[Math.floor((b.age / 1000) * hz * FLAP.length) % FLAP.length]!;
    b.sprite.setTexture(birdKey(b.kind, frame));
  }

  /** A soft shadow on the surface under the bird: darker the lower it flies. */
  private drawShadow(b: Bird): void {
    const height = SKY.surfaceY - b.sprite.y;
    if (height < 0 || b.kind === 'dragonfly') return;
    const alpha = Phaser.Math.Clamp(0.32 - height / 1000, 0.08, 0.3) * (b.state === 'aim' ? 1.6 : 1);
    this.shadows.fillStyle(0x1b1a1f, alpha).fillEllipse(b.sprite.x, SKY.surfaceY + 14, b.size * 2.2, b.size * 0.35);
  }

  private remove(b: Bird): void {
    b.sprite.destroy();
    if (b.ownsPrize) b.prize?.destroy();
    else b.prize?.setVisible(false);
  }
}
