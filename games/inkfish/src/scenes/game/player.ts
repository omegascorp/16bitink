import Phaser from 'phaser';
import { FISH_RADIUS } from '../../art/fishArt';
import { fishKey } from '../../art/textures';
import type { LevelDef, PlayerFishId } from '../../levels/types';
import { JUMP, stepSurface, type SurfaceEvent } from '../../logic/jump';
import { aboveSeabed, waterBottom, waterTop } from '../../logic/water';
import { attachTail, setSwimTexture, setTailBeat, stroke, turnToward, type SwimState } from './swim';
import { TUNING } from './tuning';

export interface Player extends SwimState {
  readonly sprite: Phaser.GameObjects.Image;
  readonly shape: PlayerFishId;
  /** Gameplay radius; jumps on tier-up. */
  size: number;
  /** Rendered radius; eases towards `size` so growth animates. */
  drawSize: number;
  /** Time of the last bite, for the chomp squash. */
  chompAt: number;
  vx: number;
  vy: number;
  invulnerableUntil: number;
  stunnedUntil: number;
  speedUntil: number;
  dashReadyAt: number;
  /** When the last dash started: a fresh dash into the surface leaps. */
  dashedAt: number;
  /** On a hook: controls are off and the hook moves the fish. */
  hooked: boolean;
  /** Sick from plastic or tangled in rings: swims slower. */
  slowUntil: number;
  /** Six-pack rings: no dash until this time. */
  tangledUntil: number;
  /** Hiding in a tin can: the next hit is absorbed. */
  shield: boolean;
  /** Glow stick: a bigger circle of light in the dark. */
  glowUntil: number;
  /** Tucked into weed or coral: fish can't see you, and you can't eat. */
  hidden: boolean;
  /** Leaping through the air: no steering, and nothing in the water can reach you. */
  airborne: boolean;
}

/** Bottom-right screen area reserved for the touch dash button. */
export const DASH_ZONE = 170;

export function createPlayer(scene: Phaser.Scene, level: LevelDef, shape: PlayerFishId): Player {
  const size = level.playerSizes[0];
  const sprite = scene.add
    .image(level.world.width / 2, level.world.height / 2, fishKey(shape, 'light', 0))
    .setDepth(20)
    .setScale(size / FISH_RADIUS);
  attachTail(sprite, shape);
  return { sprite, shape, size, swim: 0, turn: 1, drawSize: size, chompAt: -1000, vx: 0, vy: 0, invulnerableUntil: 0, stunnedUntil: 0, speedUntil: 0, dashReadyAt: 0, dashedAt: -10000, hooked: false,
    slowUntil: 0, tangledUntil: 0, shield: false, glowUntil: 0, hidden: false, airborne: false };
}

export interface Controls {
  readonly keys: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;
  usingKeys: boolean;
  /** Device has a touchscreen (shows the dash button). */
  readonly touch: boolean;
  /** Last pointer input was a finger: steer only while it's down. Mice steer by hovering. */
  lastWasTouch: boolean;
}

export function createControls(scene: Phaser.Scene): Controls {
  const kb = scene.input.keyboard;
  if (!kb) throw new Error('Keyboard plugin missing');
  const K = Phaser.Input.Keyboard.KeyCodes;
  const keys = {
    up: kb.addKey(K.UP), down: kb.addKey(K.DOWN), left: kb.addKey(K.LEFT), right: kb.addKey(K.RIGHT),
    w: kb.addKey(K.W), a: kb.addKey(K.A), s: kb.addKey(K.S), d: kb.addKey(K.D),
  };
  scene.input.addPointer(1);
  const controls: Controls = { keys, usingKeys: false, touch: scene.sys.game.device.input.touch, lastWasTouch: false };
  const track = (p: Phaser.Input.Pointer): void => {
    controls.usingKeys = false;
    controls.lastWasTouch = p.wasTouch;
  };
  scene.input.on('pointermove', track);
  scene.input.on('pointerdown', track);
  return controls;
}

function keyDir(c: Controls): { x: number; y: number } {
  const k = c.keys;
  const x = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
  const y = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
  return { x, y };
}

function steeringPointer(scene: Phaser.Scene, c: Controls): Phaser.Input.Pointer | null {
  if (!c.lastWasTouch) return scene.input.mousePointer ?? scene.input.activePointer;
  const { width, height } = scene.scale;
  const ptrs = [scene.input.pointer1, scene.input.pointer2];
  return ptrs.find((p) => p?.isDown && !(p.x > width - DASH_ZONE && p.y > height - DASH_ZONE)) ?? null;
}

/** Direction the player wants to go: unit-ish vector scaled 0..1 by intent. */
export function desiredDirection(scene: Phaser.Scene, c: Controls, p: Player): { x: number; y: number } {
  const kd = keyDir(c);
  if (kd.x || kd.y) {
    c.usingKeys = true;
    const len = Math.hypot(kd.x, kd.y);
    return { x: kd.x / len, y: kd.y / len };
  }
  if (c.usingKeys) return { x: 0, y: 0 };
  const ptr = steeringPointer(scene, c);
  if (!ptr) return { x: 0, y: 0 };
  const world = scene.cameras.main.getWorldPoint(ptr.x, ptr.y);
  const dx = world.x - p.sprite.x;
  const dy = world.y - p.sprite.y;
  const d = Math.hypot(dx, dy);
  if (d < 4) return { x: 0, y: 0 };
  const intent = Math.min(1, d / 40);
  return { x: (dx / d) * intent, y: (dy / d) * intent };
}

/** Moves the player one frame. With `sky`, rushing the surface fast enough leaps out; returns 'leap' or 'splash' on the frame it happens. */
export function movePlayer(
  p: Player, dir: { x: number; y: number }, level: LevelDef, now: number, dt: number, floorAt?: (x: number) => number, sky = false,
): SurfaceEvent {
  if (p.airborne) {
    p.vx *= 1 - JUMP.airDrag * dt;
  } else {
    const stunned = now < p.stunnedUntil;
    const max = TUNING.playerSpeed * (now < p.speedUntil ? TUNING.speedBoost : 1) * (now < p.slowUntil ? TUNING.slowFactor : 1) * (p.hidden ? TUNING.coverSpeed : 1);
    const tx = stunned ? 0 : dir.x * max;
    const ty = stunned ? 0 : dir.y * max;
    const k = Math.min(1, dt * TUNING.playerAccel);
    p.vx += (tx - p.vx) * k;
    p.vy += (ty - p.vy) * k;
  }
  const r = p.size;
  p.sprite.x = Phaser.Math.Clamp(p.sprite.x + p.vx * dt, r, level.world.width - r);
  const top = waterTop(r);
  const rushing = now - p.dashedAt < JUMP.rushMs || now < p.speedUntil;
  const { state, event } = stepSurface({ y: p.sprite.y, vy: p.vy, airborne: p.airborne }, top, dt, sky, rushing);
  p.airborne = state.airborne;
  p.vy = state.vy;
  // Down to the sand: crabs and shrimp live there.
  const bottom = floorAt ? aboveSeabed(floorAt(p.sprite.x), r) : waterBottom(level.world.height, r);
  p.sprite.y = state.airborne ? state.y : Phaser.Math.Clamp(state.y, top, bottom);
  return event;
}

export function tryDash(p: Player, dir: { x: number; y: number }, now: number): boolean {
  if (p.airborne || now < p.dashReadyAt || now < p.stunnedUntil || now < p.tangledUntil) return false;
  let { x, y } = dir;
  if (!x && !y) {
    x = p.sprite.flipX ? -1 : 1;
    y = 0;
  }
  const d = Math.hypot(x, y) || 1;
  p.vx = (x / d) * TUNING.dashSpeed;
  p.vy = (y / d) * TUNING.dashSpeed;
  p.dashReadyAt = now + TUNING.dashCooldownMs;
  p.dashedAt = now;
  return true;
}

export function renderPlayer(p: Player, now: number, frame: number, dt: number): void {
  const s = p.sprite;
  setSwimTexture(s, fishKey(p.shape, 'light', frame));
  p.drawSize += (p.size - p.drawSize) * Math.min(1, dt * 5);
  const base = p.drawSize / FISH_RADIUS;
  const chomp = now - p.chompAt < 140 ? 0.85 : 1;
  if (p.hooked) {
    setTailBeat(s, stroke(p, 0, dt, 3.2));
    s.setScale(base, base * chomp).setFlipX(false).setRotation(-Math.PI / 2 + Math.sin(now / 40) * 0.35);
  } else {
    const speed = Math.hypot(p.vx, p.vy);
    // Dashing and energy rushes beat harder; idle fins still keep a slow stroke.
    const effort = now < p.speedUntil || speed > TUNING.playerSpeed * 1.2 ? 1.6 : now < p.stunnedUntil ? 0.3 : 1;
    setTailBeat(s, stroke(p, speed, dt, effort));
    const facing = turnToward(p, Math.abs(p.vx) > 8 ? (p.vx < 0 ? -1 : 1) : 0, dt);
    s.setFlipX(p.turn < 0).setScale(base * facing, base * chomp);
    // In the air the body follows its arc: nose up on the way out, down on the way back.
    const tilt = p.airborne ? Phaser.Math.Clamp(Math.atan2(p.vy, Math.abs(p.vx) + 60), -1.2, 1.2) : Phaser.Math.Clamp(p.vy / 700, -0.45, 0.45);
    s.setRotation(tilt * (s.flipX ? -1 : 1));
  }
  const invuln = now < p.invulnerableUntil;
  s.setAlpha(invuln && Math.floor(now / 120) % 2 === 0 ? 0.35 : p.hidden ? 0.7 : 1);
  if (now < p.stunnedUntil) s.setTint(0x9b6fc4);
  else if (now < p.slowUntil) s.setTint(0xa9c08c);
  else if (now < p.speedUntil) s.setTint(0xffe2a0);
  else s.clearTint();
}
