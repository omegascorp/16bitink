import { INK } from '../../src/art/pen';
import { BOIL_FPS } from '../../src/art/textures';
import { createRng } from '../../src/logic/rng';
import type { FishShape } from '../../src/art/fishArt';
import {
  aliveAt, EATEN_AGE, GROWTH, GULP_AGE, mouthOf, pathAt, poseOf, STAGE_S, zoomPhase, type Frame, type Pose,
} from './chain';
import type { Sprite } from './sprites';
import { drawSwimmer } from './swimmer';
import { alarm, eyesShut, jawOpen, lump, lumpAt, panic, shake, snap, STARTLE_AGE, suction, SWALLOW } from './eating';
import { storyTime } from './timing';
import { makeBackdrop } from './backdrop';
import { VIDEO } from './short';
import { drawChomp, drawExclaim, drawSuction, suckedIn } from './effects';

export { drawExclaim };

export { VIDEO };

/** Zoom centre a little above the middle: Reels and Stories cover the bottom with captions and buttons. */
const FRAME: Frame = { cx: VIDEO.width / 2, cy: VIDEO.height * 0.44, unit: 1150 };

const clamp01 = (u: number): number => Math.max(0, Math.min(1, u));

// ---------------------------------------------------------------- background

/** Paper with the game's shallow-water wash: a faint blue tint, deeper towards the bottom. */
const makeBackground = (): HTMLCanvasElement => makeBackdrop({ top: 'rgba(44,79,134,0.03)', bottom: 'rgba(44,79,134,0.16)' });

/**
 * Current marks ("~", as in the game's water) and specks of marine snow,
 * scattered at every scale: each layer is GROWTH times the last, so as the
 * camera pulls back they stream in from the edges, shrink, and fade out,
 * and one stage later the field looks the same again.
 */
interface Mark { readonly x: number; readonly y: number; readonly size: number; readonly kind: 'wave' | 'speck'; readonly phase: number }

function makeMarks(): readonly Mark[] {
  const rng = createRng(4242);
  return Array.from({ length: 70 }, () => ({
    x: (rng() - 0.5) * 2.4,
    y: (rng() - 0.5) * 3.6,
    size: 0.6 + rng() * 0.8,
    kind: rng() < 0.6 ? 'wave' : 'speck',
    phase: rng() * Math.PI * 2,
  }));
}

function drawMarks(ctx: CanvasRenderingContext2D, marks: readonly Mark[], zoom: number): void {
  const base = Math.floor(zoom);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = 'round';
  for (let layer = base - 2; layer <= base + 2; layer++) {
    const scale = 900 * GROWTH ** (layer - zoom);
    for (const m of marks) {
      const len = 46 * m.size * GROWTH ** (layer - zoom) * 2.2;
      // Fade in while small, out while big: no mark pops.
      const fade = clamp01((len - 8) / 30) * clamp01((260 - len) / 120);
      if (fade <= 0) continue;
      const x = FRAME.cx + m.x * scale;
      const y = FRAME.cy + m.y * scale;
      if (x < -len || x > VIDEO.width + len || y < -len || y > VIDEO.height + len) continue;
      ctx.globalAlpha = fade * (m.kind === 'wave' ? 0.22 : 0.25);
      if (m.kind === 'speck') {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.8, len * 0.035), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.lineWidth = Math.max(0.8, len * 0.03);
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const px = x - len / 2 + (k / 6) * len;
        const py = y + Math.sin(k * 1.4 + m.phase) * len * 0.06;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- fish

/** The gulp's bubbles: start delay (ages), radius and sideways offset (eater body lengths). */
const BUBBLES = (() => {
  const rng = createRng(7);
  return Array.from({ length: 6 }, () => ({ delay: rng() * 0.15, r: 0.012 + rng() * 0.018, dx: (rng() - 0.5) * 0.12 }));
})();

/** A few bubbles let out with the gulp, rising and fading; they belong to the eater's scale. */
function drawBubbles(ctx: CanvasRenderingContext2D, pose: Pose): void {
  const since = pose.age - GULP_AGE;
  if (since < 0 || since > 0.7) return;
  const gulpAt = poseOf(pose.j, pose.j + GULP_AGE, FRAME);
  const mouth = mouthOf(gulpAt);
  // Positions in the eater's body lengths from where its mouth was, scaled with the camera.
  const unit = pose.length;
  const ox = (mouth.x - FRAME.cx) / gulpAt.length;
  const oy = (mouth.y - FRAME.cy) / gulpAt.length;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.2, unit * 0.004);
  BUBBLES.forEach((b, k) => {
    const t = since - b.delay;
    if (t < 0) return;
    const r = unit * b.r;
    const x = FRAME.cx + (ox + b.dx + Math.sin(t * 9 + k) * 0.01) * unit;
    const y = FRAME.cy + (oy - t * 0.45) * unit;
    ctx.globalAlpha = 0.7 * clamp01(1 - t / 0.5);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
}

// ---------------------------------------------------------------- frame

export interface Renderer {
  draw(seconds: number): void;
}

export function createRenderer(ctx: CanvasRenderingContext2D, sprites: ReadonlyMap<FishShape, Sprite>): Renderer {
  const background = makeBackground();
  const marks = makeMarks();
  return {
    draw(seconds: number): void {
      // Story time: the bites play in slow motion (timing.ts).
      const tau = storyTime(seconds / STAGE_S);
      const boil = Math.floor(seconds * BOIL_FPS + 1e-6);
      ctx.drawImage(background, 0, 0);
      drawMarks(ctx, marks, zoomPhase(tau));
      const jolt = shake(tau);
      ctx.save();
      ctx.translate(jolt.x, jolt.y);
      // Open mouths first, then the fish smallest first: a prey being
      // swallowed shows inside the dark of the mouth, under the eater's lips.
      for (const j of aliveAt(tau)) {
        const pose = poseOf(j, tau, FRAME);
        const jaw = jawOpen(pose.age);
        if (jaw > 0 && pose.length >= 6) drawSwimmer(ctx, sprites.get(pose.shape)!, pose, boil, { jaw, part: 'mouth' });
      }
      for (const j of aliveAt(tau).reverse()) {
        const pose = poseOf(j, tau, FRAME);
        if (pose.length < 6) continue;
        const sprite = sprites.get(pose.shape)!;
        const swallowed = (pose.age - (EATEN_AGE - SWALLOW)) / SWALLOW;
        if (swallowed >= 1) continue;
        const scared = panicked(pose);
        if (swallowed > 0) {
          const [inMouth, look] = suckedIn(scared, poseOf(j + 1, tau, FRAME), swallowed);
          drawSwimmer(ctx, sprite, inMouth, boil, look);
          continue;
        }
        const jaw = jawOpen(pose.age);
        const squash = 1 - 0.1 * snap(pose.age);
        const eater = { ...scared, tilt: scared.tilt + 0.07 * jaw - 0.06 * snap(pose.age) };
        drawSwimmer(ctx, sprite, eater, boil, { squash, stretch: 1 + 0.05 * snap(pose.age), jaw, lump: { size: lump(pose.age), at: lumpAt(pose.age) }, eyes: eyesShut(pose.age), part: 'body' });
        drawSuction(ctx, pose, suction(pose.age), pose.age);
        drawAlarm(ctx, pose);
        drawBubbles(ctx, pose);
        drawCrumbs(ctx, pose);
        drawChomp(ctx, pose, (pose.age - GULP_AGE) / 0.07);
      }
      ctx.restore();
    },
  };
}

/** A prey that has seen its eater coming thrashes its tail and shudders. */
function panicked(pose: Pose): Pose {
  const p = panic(pose.age);
  if (p <= 0) return pose;
  const since = pose.age - STARTLE_AGE;
  return {
    ...pose,
    beat: pose.beat + 2 * Math.PI * 7 * since,
    effort: Math.max(pose.effort, p),
    tilt: pose.tilt + 0.09 * p * Math.sin(since * 140),
  };
}

/** A hand-inked "!" popping up over a prey that has spotted its eater. */
function drawAlarm(ctx: CanvasRenderingContext2D, pose: Pose): void {
  const size = alarm(pose.age);
  if (size <= 0) return;
  drawExclaim(ctx, pose.x + pose.facing * pose.length * 0.18, pose.y - pose.length * 0.55, pose.length * 0.42 * size, pose.facing * 0.12);
}

/** Scraps of the meal (fin and scale flakes) sprayed from the bite, sinking; they belong to the eater's scale. */
const CRUMBS = (() => {
  const rng = createRng(31);
  return Array.from({ length: 7 }, () => ({ angle: (rng() - 0.5) * 2.2, speed: 0.18 + rng() * 0.25, r: 0.008 + rng() * 0.01, spin: (rng() - 0.5) * 30 }));
})();

function drawCrumbs(ctx: CanvasRenderingContext2D, pose: Pose): void {
  const since = pose.age - GULP_AGE;
  if (since < 0 || since > 0.45) return;
  const gulpAt = poseOf(pose.j, pose.j + GULP_AGE, FRAME);
  const mouth = mouthOf(gulpAt);
  const ox = (mouth.x - FRAME.cx) / gulpAt.length;
  const oy = (mouth.y - FRAME.cy) / gulpAt.length;
  const unit = pose.length;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = '#fffaf0';
  ctx.lineWidth = Math.max(1, unit * 0.003);
  for (const c of CRUMBS) {
    // Burst out fast, slow in the water, then sink.
    const out = c.speed * (1 - Math.exp(-since * 14)) / 3;
    const x = FRAME.cx + (ox + pose.facing * Math.cos(c.angle) * out) * unit;
    const y = FRAME.cy + (oy + Math.sin(c.angle) * out + since * since * 0.6) * unit;
    ctx.globalAlpha = clamp01(1 - since / 0.45);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(c.spin * since);
    ctx.beginPath();
    ctx.ellipse(0, 0, c.r * unit, c.r * unit * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/** For checking the chain maths on screen: the zoom centre and each fish's mouth. */
export function drawDebug(ctx: CanvasRenderingContext2D, seconds: number): void {
  const tau = storyTime(seconds / STAGE_S);
  ctx.save();
  ctx.fillStyle = 'red';
  ctx.fillRect(FRAME.cx - 3, FRAME.cy - 3, 6, 6);
  for (const j of aliveAt(tau)) {
    const p = poseOf(j, tau, FRAME);
    const m = mouthOf(p);
    ctx.fillStyle = 'magenta';
    ctx.fillRect(m.x - 4, m.y - 4, 8, 8);
    ctx.font = '28px monospace';
    ctx.fillText(`${p.shape} a=${p.age.toFixed(2)} L=${Math.round(p.length)} x=${pathAt(p.age).x.toFixed(2)}`, 20, 60 + 36 * ((j % 6 + 6) % 6));
  }
  ctx.restore();
}
