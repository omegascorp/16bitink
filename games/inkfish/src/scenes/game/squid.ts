import Phaser from 'phaser';
import { FISH_RADIUS } from '../../art/fishArt';
import { GLOW_TEX } from '../../art/glowArt';
import { GLOW_KEY } from '../../art/textures';
import { REST_POSE, type Pt } from '../../art/squidPose';
import { capsuleTouchesCircle, type Capsule } from '../../logic/body';
import { relationTo } from '../../logic/sizing';
import { STRIKE, strikeExtension, tentacleReach } from '../../logic/squid';
import { keepInWater } from '../../logic/water';
import type { Fish, PlayerView, SeaWorld } from './fish';
import { clubRadius, setSquidLook, squidClubs } from './squidRig';
import { turnToward } from './swim';

/**
 * The giant squid, the last giant: it hangs in the dark, stalks you arms
 * first, shoots its two long tentacles at where you are, then jets away
 * backwards and hides in a cloud of ink. Once you're big enough to eat it,
 * it stops hunting and flees in bursts, inking as it goes.
 */
type Mode = 'drift' | 'stalk' | 'strike' | 'jet';
export type SquidEvent = 'strike' | 'jet' | 'ink';

interface Mind {
  mode: Mode;
  until: number;
  /** Which way the arms point: it stalks forwards and jets backwards. */
  face: -1 | 1;
  strikeAt: number;
  /** The strike's lash has fired (after the wind-up). */
  lashed: boolean;
  target: Pt | null;
  nextStrikeAt: number;
  nextJetAt: number;
  inkReadyAt: number;
  /** Animation state, eased towards each mode's look. */
  t: number;
  flap: number;
  splay: number;
  writhe: number;
  stream: number;
  lag: number;
  lastRotation: number;
  watch: Pt | null;
  events: SquidEvent[];
}

const SPEED = { drift: 35, stalk: 135, jet: 470, flee: 520 } as const;
/** Notices you from this far (world units). */
const SIGHT = 780;
/** Gaps between attacks and escapes, ms. */
const STRIKE_GAP_MS = 1500;
const JET_MS = 720;
const FLEE_GAP_MS = 2400;
const INK_GAP_MS = 5000;
/** How each mode holds the arms: fanned (splay), coiling (writhe), streamlined (stream). */
const LOOK: Readonly<Record<Mode, { splay: number; writhe: number; stream: number; flap: number }>> = {
  drift: { splay: 0.85, writhe: 0.95, stream: 0, flap: 2.2 },
  stalk: { splay: 0.5, writhe: 0.75, stream: 0, flap: 3.6 },
  strike: { splay: 1, writhe: 0.3, stream: 0, flap: 1.4 },
  jet: { splay: 0.1, writhe: 0.2, stream: 1, flap: 0.8 },
};

const minds = new WeakMap<Fish, Mind>();

function mindOf(f: Fish): Mind {
  const known = minds.get(f);
  if (known) return known;
  const mind: Mind = {
    mode: 'drift', until: 0, face: f.vx < 0 ? -1 : 1, strikeAt: 0, lashed: false, target: null, nextStrikeAt: 0, nextJetAt: 0, inkReadyAt: 0,
    t: f.phase, flap: 0, splay: 0.8, writhe: 0.7, stream: 0, lag: 0, lastRotation: 0, watch: null, events: [],
  };
  minds.set(f, mind);
  return mind;
}

/** What the squid did since last asked: for sounds. */
export function takeSquidEvents(f: Fish): SquidEvent[] {
  const m = minds.get(f);
  if (!m || m.events.length === 0) return [];
  const events = m.events;
  m.events = [];
  return events;
}

/** True when a tentacle club is touching this body. */
export function clubsTouch(f: Fish, body: Capsule): boolean {
  const r = clubRadius(f.sprite);
  return squidClubs(f.sprite).some((c) => capsuleTouchesCircle(body, c.x, c.y, r));
}

function steer(f: Fish, vx: number, vy: number, dt: number, accel: number): void {
  f.vx += (vx - f.vx) * Math.min(1, dt * accel);
  f.vy += (vy - f.vy) * Math.min(1, dt * accel);
}

/** Shoots off backwards (mantle first) along `away`, maybe inking. */
function jet(f: Fish, m: Mind, away: Pt, speed: number, now: number, ink: boolean): void {
  const d = Math.hypot(away.x, away.y) || 1;
  f.vx = (away.x / d) * speed;
  f.vy = (away.y / d) * speed * 0.6;
  m.mode = 'jet';
  m.until = now + JET_MS;
  m.target = null;
  m.events.push('jet');
  if (ink && now >= m.inkReadyAt) {
    m.inkReadyAt = now + INK_GAP_MS;
    m.events.push('ink');
    // The ink leaves through the siphon, under the head.
    inkCloud(f.sprite.scene, f.sprite.x + m.face * f.size * 0.6, f.sprite.y + f.size * 0.2, f.size);
  }
}

function think(f: Fish, m: Mind, p: PlayerView, dist: number, now: number, dt: number): void {
  const rel = p.hidden ? 'peer' : relationTo(p.size, f.size);
  const dx = p.x - f.sprite.x;
  const dy = p.y - f.sprite.y;
  const reach = tentacleReach(f.size);
  const hunting = rel === 'predator' && dist < SIGHT && now > f.cooldownUntil;
  switch (m.mode) {
    case 'drift':
      steer(f, m.face * SPEED.drift, Math.sin(m.t * 0.6) * 14, dt, 1);
      if (hunting) m.mode = 'stalk';
      else if (rel === 'prey' && dist < 420 && now > m.nextJetAt) {
        // Too big to fight: face you and jet away, inking.
        m.face = dx < 0 ? -1 : 1;
        m.nextJetAt = now + FLEE_GAP_MS;
        jet(f, m, { x: -dx, y: -dy }, SPEED.flee, now, true);
      }
      return;
    case 'stalk': {
      if (!hunting) {
        m.mode = 'drift';
        return;
      }
      if (Math.abs(dx) > 50) m.face = dx < 0 ? -1 : 1;
      // Creep up to just inside striking range, arms first.
      const hold = reach * 0.62;
      const tx = p.x - (dx / (dist || 1)) * hold;
      const ty = p.y - (dy / (dist || 1)) * hold;
      const d = Math.hypot(tx - f.sprite.x, ty - f.sprite.y) || 1;
      const speed = Math.min(SPEED.stalk, d * 2);
      steer(f, ((tx - f.sprite.x) / d) * speed, ((ty - f.sprite.y) / d) * speed, dt, 1.6);
      const ahead = dx * m.face > 0 && Math.abs(dy) < Math.abs(dx) * 1.4;
      if (dist < reach * 0.92 && ahead && now > m.nextStrikeAt) {
        m.mode = 'strike';
        m.strikeAt = now;
        m.until = now + STRIKE.total;
        // Aimed where you are now: keep moving during the wind-up and it misses.
        m.target = { x: p.x, y: p.y };
        m.lashed = false;
      }
      return;
    }
    case 'strike': {
      // Draws back while winding up, then lunges behind the tentacles and holds still.
      const ms = now - m.strikeAt;
      const fired = ms >= STRIKE.windup;
      steer(f, !fired ? -m.face * 55 : ms < STRIKE.windup + 160 ? m.face * 90 : 0, 0, dt, 5);
      if (fired && !m.lashed) {
        m.lashed = true;
        m.events.push('strike');
      }
      if (now >= m.until) {
        m.nextStrikeAt = now + STRIKE_GAP_MS;
        jet(f, m, { x: -m.face, y: (Math.random() - 0.5) * 0.8 }, SPEED.jet, now, true);
      }
      return;
    }
    case 'jet':
      f.vx *= Math.exp(-2.4 * dt);
      f.vy *= Math.exp(-2.4 * dt);
      if (now >= m.until) m.mode = hunting ? 'stalk' : 'drift';
      return;
  }
}

/** One step of the squid's life: think, move, stay in the water and in the level. */
export function updateSquid(f: Fish, p: PlayerView, dist: number, world: SeaWorld, now: number, dt: number): void {
  const m = mindOf(f);
  m.t += dt;
  m.watch = { x: p.x, y: p.y };
  think(f, m, p, dist, now, dt);
  f.sprite.x += f.vx * dt;
  const edge = f.size * 2;
  if (f.sprite.x < edge || f.sprite.x > world.width - edge) {
    f.sprite.x = Phaser.Math.Clamp(f.sprite.x, edge, world.width - edge);
    f.vx = -f.vx * 0.3;
    if (m.mode === 'drift') m.face = f.sprite.x < world.width / 2 ? 1 : -1;
  }
  const water = keepInWater(f.sprite.y + f.vy * dt, f.vy, f.size, world.height, world.floorAt?.(f.sprite.x));
  f.sprite.y = water.y;
  f.vy = water.vy;
}

const ease = (from: number, to: number, rate: number, dt: number): number => from + (to - from) * Math.min(1, dt * rate);

/** Draws the squid's pose for this frame: arms by mode, fins flapping, the eye on you. */
export function renderSquid(f: Fish, frame: number, dt: number, heavy: boolean): void {
  const m = mindOf(f);
  const s = f.sprite;
  const target = f.size / FISH_RADIUS;
  const scale = s.scaleY + (target - s.scaleY) * 0.25;
  const limp = f.state === 'dead' || f.state === 'stunned';
  const look = limp ? { splay: 0.5, writhe: 0.15, stream: 0, flap: 0.5 } : LOOK[m.mode];
  m.splay = ease(m.splay, look.splay, m.mode === 'strike' ? 10 : 3, dt);
  m.writhe = ease(m.writhe, look.writhe, 3, dt);
  m.stream = ease(m.stream, look.stream, m.mode === 'jet' ? 9 : 2.5, dt);
  m.flap += dt * look.flap * Math.PI;
  const strike = m.mode === 'strike' ? strikeExtension(s.scene.time.now - m.strikeAt) : 0;
  if (f.state === 'dead') {
    s.setScale(scale).setTint(0xb3ab9c).setFlipY(true).setRotation(Math.sin(f.phase * 1.5) * 0.08);
  } else {
    s.setFlipY(false);
    if (f.state === 'stunned') s.setTint(0xc4a8e0);
    else s.clearTint();
    // Turning round squashes it through edge-on, like the fish; a jet stretches it.
    const facing = turnToward(f, m.face, dt);
    const backwards = f.vx * m.face < 0 ? -1 : 1;
    const tilt = Phaser.Math.Clamp(f.vy / 500, -0.3, 0.3) * m.face * backwards;
    s.setFlipX(f.turn < 0).setScale(scale * facing * (1 + 0.1 * m.stream), scale).setRotation(tilt);
  }
  // The arms swing behind any turn, then settle.
  const turned = s.rotation - m.lastRotation;
  m.lastRotation = s.rotation;
  m.lag = Phaser.Math.Clamp(ease(m.lag, 0, 2, dt) - turned * 4, -0.6, 0.6);
  setSquidLook(s, {
    pose: { t: m.t, splay: m.splay, writhe: m.writhe, stream: m.stream, lag: m.lag, strike, aim: REST_POSE.aim },
    aimAt: strike > 0 ? m.target : null,
    watch: limp ? null : m.watch,
    flap: Math.sin(m.flap),
    variant: heavy ? 'heavy' : 'light',
    frame,
  });
}

/** Sepia: real squid ink is brown-black, and warm enough to show against the blue-black deep. */
const INK_COLORS = [0x4a3226, 0x3a2830, 0x553a2a] as const;

/** A billowing cloud of squid ink: soft puffs that swell, drift apart and thin away. */
export function inkCloud(scene: Phaser.Scene, x: number, y: number, size: number): void {
  const puff = GLOW_TEX / 2;
  for (let i = 0; i < 14; i++) {
    const r = size * (0.35 + Math.random() * 0.35);
    const blot = scene.add
      .image(x + (Math.random() - 0.5) * size * 0.8, y + (Math.random() - 0.5) * size * 0.6, GLOW_KEY)
      .setTint(INK_COLORS[i % INK_COLORS.length]!)
      .setAlpha(0)
      .setScale(r / puff)
      .setDepth(30);
    const hold = 0.85 + Math.random() * 0.15;
    scene.tweens.chain({
      targets: blot,
      tweens: [
        { alpha: hold, scale: (r * 1.6) / puff, duration: 220, ease: 'Quad.Out' },
        {
          x: blot.x + (Math.random() - 0.5) * size * 2.4,
          y: blot.y + (Math.random() - 0.65) * size * 1.6,
          scale: (r * (3.2 + Math.random() * 1.6)) / puff,
          alpha: 0,
          duration: 3400 + Math.random() * 1800,
          ease: 'Sine.In',
        },
      ],
      onComplete: () => blot.destroy(),
    });
  }
}
