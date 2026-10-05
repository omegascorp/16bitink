import Phaser from 'phaser';
import { EYE, FIN, mantleHalf } from '../../art/squidArt';
import { clubPoint, LIMBS, limbPoints, REST_POSE, type Pt, type SquidPose } from '../../art/squidPose';
import { SQUID_PUPIL_KEY, squidKey } from '../../art/textures';
import { keepDepth, keepTint } from './sync';
import type { InkVariant } from '../../art/fishArt';

/**
 * The giant squid's moving parts, hung on its body sprite: ten limbs, each a
 * pen-drawn texture bent along the pose's curve, two flapping fins, and a
 * pupil that rolls to watch you. Like the fish tails in swim.ts, the parts
 * follow the body every frame after tweens have moved it, so a squid being
 * eaten or knocked out takes its arms along.
 */
interface Rig {
  readonly ropes: readonly Phaser.GameObjects.Rope[];
  readonly points: readonly { x: number; y: number }[][];
  readonly fins: readonly [Phaser.GameObjects.Image, Phaser.GameObjects.Image];
  readonly pupil: Phaser.GameObjects.Image;
  look: SquidLook;
  /** Club centres in world px, while the tentacles are out far enough to grab. */
  clubs: Pt[];
}

export interface SquidLook {
  readonly pose: SquidPose;
  /** Where the tentacles strike, in the world (turned into body px each frame). */
  readonly aimAt: Pt | null;
  /** What the eye watches, in the world. */
  readonly watch: Pt | null;
  /** Fin flap, -1..1. */
  readonly flap: number;
  readonly variant: InkVariant;
  readonly frame: number;
}

type Image = Phaser.GameObjects.Image;

/** Far limbs sit in the body's shadow. */
const FAR_SHADE = 0xd9cfc0;
/** How far out the tentacles must be before their clubs can grab. */
const GRAB_FROM = 0.65;

const rigsByScene = new WeakMap<Phaser.Scene, Map<Image, Rig>>();

function rigsOf(scene: Phaser.Scene): Map<Image, Rig> {
  const existing = rigsByScene.get(scene);
  if (existing) return existing;
  const rigs = new Map<Image, Rig>();
  const sync = (): void => rigs.forEach(follow);
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, sync);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, sync);
    rigs.clear();
    rigsByScene.delete(scene);
  });
  rigsByScene.set(scene, rigs);
  return rigs;
}

/** Turns a plain sprite into the giant squid: body texture on it, limbs, fins and pupil around it. */
export function attachSquid(sprite: Image): void {
  const scene = sprite.scene;
  sprite.setTexture(squidKey('body', 'light', 0));
  const points = LIMBS.map((limb) => limbPoints(limb, REST_POSE).map((p) => ({ x: p.x, y: p.y })));
  const ropes = LIMBS.map((limb, i) => {
    const rope = scene.add.rope(sprite.x, sprite.y, squidKey(limb.kind, 'light', 0), undefined, points[i]!, true);
    if (limb.far) rope.setColors(FAR_SHADE);
    return rope;
  });
  const fin = (): Image => scene.add.image(sprite.x, sprite.y, squidKey('fin', 'light', 0)).setOrigin(FIN.origin.x, FIN.origin.y);
  const rig: Rig = {
    ropes,
    points,
    fins: [fin(), fin()],
    pupil: scene.add.image(sprite.x, sprite.y, SQUID_PUPIL_KEY),
    look: { pose: REST_POSE, aimAt: null, watch: null, flap: 0, variant: 'light', frame: 0 },
    clubs: [],
  };
  rigsOf(scene).set(sprite, rig);
  follow(rig, sprite);
  sprite.once(Phaser.GameObjects.Events.DESTROY, () => {
    rigsByScene.get(scene)?.delete(sprite);
    for (const part of [...rig.ropes, ...rig.fins, rig.pupil]) part.destroy();
  });
}

/** Sets this frame's pose, ink and gaze; the parts catch up after the update. */
export function setSquidLook(sprite: Image, look: SquidLook): void {
  const rig = rigsByScene.get(sprite.scene)?.get(sprite);
  if (!rig) return;
  rig.look = look;
  sprite.setTexture(squidKey('body', look.variant, look.frame));
}

/** Where the tentacle clubs are, in the world, when they're out far enough to grab; empty otherwise. */
export function squidClubs(sprite: Image): readonly Pt[] {
  return rigsByScene.get(sprite.scene)?.get(sprite)?.clubs ?? [];
}

/** Club radius in world px for this sprite. */
export function clubRadius(sprite: Image): number {
  return 14 * sprite.scaleY;
}

/** Body px to world, the way the body sprite is drawn (flips, squash, tilt). */
function toWorld(s: Image, sx: number, sy: number, p: Pt): Pt {
  const c = Math.cos(s.rotation);
  const n = Math.sin(s.rotation);
  const x = p.x * sx;
  const y = p.y * sy;
  return { x: s.x + x * c - y * n, y: s.y + x * n + y * c };
}

/** World to body px (the inverse of toWorld). */
function toBody(s: Image, sx: number, sy: number, p: Pt): Pt {
  const c = Math.cos(s.rotation);
  const n = Math.sin(s.rotation);
  const dx = p.x - s.x;
  const dy = p.y - s.y;
  return { x: (dx * c + dy * n) / (sx || 1e-6), y: (-dx * n + dy * c) / (sy || 1e-6) };
}

function follow(rig: Rig, s: Image): void {
  const { look } = rig;
  const sx = s.scaleX * (s.flipX ? -1 : 1);
  const sy = s.scaleY * (s.flipY ? -1 : 1);
  const aim = look.aimAt ? toBody(s, sx, sy, look.aimAt) : look.pose.aim;
  const pose: SquidPose = { ...look.pose, aim };
  const clubs: Pt[] = [];
  const tinted = s.isTinted;
  LIMBS.forEach((limb, i) => {
    const pts = limbPoints(limb, pose);
    const target = rig.points[i]!;
    pts.forEach((p, k) => {
      target[k]!.x = p.x;
      target[k]!.y = p.y;
    });
    if (limb.kind === 'tentacle' && pose.strike >= GRAB_FROM) clubs.push(toWorld(s, sx, sy, clubPoint(pts)));
    rig.ropes[i]!
      .setTexture(squidKey(limb.kind, look.variant, look.frame))
      .setPosition(s.x, s.y)
      .setRotation(s.rotation)
      .setScale(sx, sy)
      .setAlpha(s.alpha)
      .setVisible(s.visible)
      .setColors(tinted ? s.tintTopLeft : limb.far ? FAR_SHADE : 0xffffff)
      .setDirty();
    keepDepth(rig.ropes[i]!, s.depth + (limb.far ? -0.03 : 0.02));
  });
  rig.clubs = clubs;
  // Fins: upper and lower lobes flap together, like wings seen side-on.
  const flap = 0.74 + 0.26 * look.flap;
  const h = mantleHalf(FIN.x);
  const slope = Math.atan2(-(mantleHalf(FIN.x + 3) - mantleHalf(FIN.x - 3)), 6);
  rig.fins.forEach((fin, k) => {
    const lower = k === 1;
    const at = toWorld(s, sx, sy, { x: FIN.x, y: lower ? h * 0.94 - 2 : -h + 2 });
    const side = (lower ? -1 : 1) * Math.sign(sy);
    fin
      .setTexture(squidKey('fin', look.variant, look.frame))
      .setPosition(at.x, at.y)
      .setRotation(s.rotation + slope * Math.sign(sx) * side)
      .setScale(sx, s.scaleY * flap * side)
      .setAlpha(s.alpha)
      .setVisible(s.visible);
    keepDepth(fin, s.depth - 0.02);
    keepTint(fin, { tintTopLeft: s.tintTopLeft, tintMode: fin.tintMode });
  });
  // The pupil rolls towards whatever it watches.
  const eye = { x: EYE.x, y: EYE.y };
  let roll = { x: 0, y: 0 };
  if (look.watch) {
    const w = toBody(s, sx, sy, look.watch);
    const d = Math.hypot(w.x - eye.x, w.y - eye.y) || 1;
    roll = { x: ((w.x - eye.x) / d) * EYE.roll, y: ((w.y - eye.y) / d) * EYE.roll };
  }
  const p = toWorld(s, sx, sy, { x: eye.x + roll.x, y: eye.y + roll.y });
  rig.pupil
    .setPosition(p.x, p.y)
    .setScale(Math.abs(sx), Math.abs(sy))
    .setAlpha(s.alpha)
    .setVisible(s.visible);
  keepDepth(rig.pupil, s.depth + 0.01);
}
