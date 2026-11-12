import { PAPER_ON_DARK, drawTextLine } from '../captions';
import { zoomAbout } from '../heartbeat/boaRig';
import { VIDEO, clamp01, lerp } from '../short';
import { drawSprite, type Pt, type Sprite } from '../sprites';
import { type Cast, MARGIN, PASSAGE_MOUTH } from './cast';
import { drawVignette } from './cave';
import type { BatPose } from './fruitBat';
import { along, type Boa, drawBoa, frameOf, hangingKnots } from './rig';
import {
  askAt, askPop, BOA_DIR, BOA_X, CUT, dropAt, type FlyingBat, passageCam, type Scene, sceneAt, SNATCH_AT, STREAM_FROM, streamAt, strikeOf, swerveAt,
  TOGETHER_SNAPS, tongueAt, turnAt, wrap,
} from './story';

/**
 * The passage, looking down it to the glowing mouth: the boas hanging from
 * its ceiling across the way (one, then three), the bats streaming past
 * them out to the dusk and, far off, a cloud of them going out through the
 * mouth. The wall, the three catches and the question are this shot too,
 * from closer.
 */
const HINGE_Y = 1210;
/** In the last shot the heads hang lower, under the call to action. */
const QUESTION_DROP = 190;
const LEN = 312;
const NECK = 160;
const LUNGE_PX = 130;
const LIFT_PX = 1800;
const BOA_PLANE = 0.74;

/** Hanging head down, the snout a little forward; lunging, it swings out sideways. */
const headingOf = (dir: number, lunge: number): number => (dir > 0 ? 1.28 - 0.4 * lunge : Math.PI - 1.28 + 0.4 * lunge);

/** Boa i in the passage at t. */
export function passageBoa(t: number, i: number): Boa {
  const u = wrap(t);
  const dir = BOA_DIR[i]!;
  const lift = (1 - dropAt(t, i)) * LIFT_PX;
  const sway = 9 * Math.sin(u * 1.3 + i * 2.1);
  const s = strikeOf(t, i);
  const heading = headingOf(dir, s.lunge);
  const f = frameOf(heading);
  const low = sceneAt(t) === 'question' ? QUESTION_DROP : 0;
  const hinge = along({ x: BOA_X[i]! + dir * 26 + sway, y: HINGE_Y + low - lift }, f, s.lunge * LUNGE_PX, 0);
  return {
    rim: along(hinge, f, LEN, 0),
    heading,
    len: LEN,
    neck: NECK,
    girth: 1.28,
    knots: hangingKnots(BOA_X[i]!, hinge, dir, lift, sway, heading),
    gape: 3 + s.gape * 60 + (s.caught ? 22 : 0),
    eye: 'open',
    held: s.caught ? { pose: 'fly1', scale: 7.4, turn: 0.1 * Math.sin(u * 9 + i), back: 0.14 } : undefined,
    turn: turnAt(t, i),
    tongue: i === 0 ? tongueAt(t) : 0,
    offset: 30 + i * 47,
  };
}

/** Where a bat comes in: near the camera, at the frame's foot or its sides. */
function entryOf(e: number): Pt {
  if (e < 0.5) return { x: -120 + e * 2 * 1320, y: 2080 };
  const left = e < 0.75;
  return { x: left ? -180 : VIDEO.width + 180, y: 1350 + ((e - (left ? 0.5 : 0.75)) / 0.25) * 650 };
}

const aimOf = (a: number): Pt => ({ x: PASSAGE_MOUTH.x + (a - 0.5) * 420, y: PASSAGE_MOUTH.y - 40 + (a - 0.5) * 200 });

interface Placed {
  readonly at: Pt;
  readonly scale: number;
  readonly rotation: number;
  readonly pose: BatPose;
}

function placeBat(b: FlyingBat, u: number, hung: readonly number[], swerve: number): Placed {
  const a = entryOf(b.entry);
  const z = aimOf(b.aim);
  const bump = Math.max(0, Math.sin(clamp01((b.s - 0.5) / 0.42) * Math.PI));
  let x = lerp(a.x, z.x, b.s);
  const y = lerp(a.y, z.y, b.s);
  let pushed = 0;
  for (const bx of hung) {
    const dx = x - bx;
    if (Math.abs(dx) < 170) {
      const push = Math.sign(dx || 1) * (170 - Math.abs(dx)) * bump * (0.45 + 0.55 * swerve);
      x += push;
      pushed = Math.max(pushed, Math.abs(push) / 170);
    }
  }
  const flap = Math.floor(u * 11 + b.k * 0.37) % 2 === 0 ? 'fly1' : 'fly0';
  return { at: { x, y }, scale: 2.4 + 7 * (1 - b.s) ** 1.3, rotation: Math.atan2(z.y - a.y, z.x - a.x) + pushed * 0.5, pose: pushed > 0.35 ? 'swoop' : flap };
}

function spriteFor(cast: Cast, p: Placed): Sprite {
  return p.scale > 2.2 ? cast.bats.mid[p.pose] : cast.bats.far[p.pose];
}

const hash01 = (k: number, n: number): number => {
  const v = Math.sin(k * 91.7 + n * 47.3) * 24634.6345;
  return v - Math.floor(v);
};

/** The cloud far off, going out through the mouth. */
function drawSwarm(ctx: CanvasRenderingContext2D, cast: Cast, u: number, boil: number, alpha: number): void {
  for (let j = 0; j < 40; j++) {
    const a = -Math.PI * (0.1 + 0.8 * hash01(j, 3));
    const p = (((u - STREAM_FROM) * (0.45 + 0.3 * hash01(j, 4)) + hash01(j, 5)) % 1 + 1) % 1;
    const x = PASSAGE_MOUTH.x + (hash01(j, 6) - 0.5) * PASSAGE_MOUTH.rx * 1.1 + Math.cos(a) * 160 * p;
    const y = PASSAGE_MOUTH.y - 30 + (hash01(j, 7) - 0.5) * PASSAGE_MOUTH.ry * 0.8 + Math.sin(a) * 120 * p;
    const pose = Math.floor(u * 10 + j * 0.3) % 2 === 0 ? 'fly1' : 'fly0';
    drawSprite(ctx, cast.bats.far[pose], boil, { x, y, scale: 1.5 - 0.6 * p, rotation: a, alpha: alpha * Math.min(1, p * 5) * Math.min(1, (1 - p) * 5) });
  }
}

/** The bats each boa snaps, flying in from near the camera to its jaws. */
function drawVictims(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number, scene: Scene): void {
  const u = wrap(t);
  const runs = scene === 'wall' ? [{ i: 0, at: SNATCH_AT }] : scene === 'together' ? [1, 0, 2].map((i, k) => ({ i, at: TOGETHER_SNAPS[k]! })) : [];
  for (const { i, at } of runs) {
    const p = clamp01((u - (at - 0.75)) / 0.75);
    if (p <= 0 || p >= 1) continue;
    const end = passageBoa(at, i).rim;
    const from = { x: BOA_X[i]! + (i === 2 ? 260 : -260), y: 2050 };
    const e = 1 - (1 - p) ** 2;
    const pose = Math.floor(u * 11) % 2 === 0 ? 'fly1' : 'fly0';
    drawSprite(ctx, cast.bats.mid[pose], boil, { x: lerp(from.x, end.x, e), y: lerp(from.y, end.y, e), scale: lerp(9, 7.4, e), rotation: Math.atan2(end.y - from.y, end.x - from.x) });
  }
}

export function drawPassage(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number, scene: Scene): void {
  const u = wrap(t);
  const cam = passageCam(t);
  ctx.save();
  zoomAbout(ctx, { x: 540, y: 1300 }, cam.zoom, cam.dx, cam.dy);
  ctx.drawImage(cast.passageBg, -MARGIN, -MARGIN);
  const swarm = clamp01((u - STREAM_FROM) / 0.6) * (scene === 'question' ? 1 - clamp01((u - CUT.question) / 1.2) : 1);
  if (swarm > 0) drawSwarm(ctx, cast, u, boil, swarm);
  const boas = [0, 1, 2].map((i) => passageBoa(t, i));
  const hung = boas.map((b, i) => (dropAt(t, i) > 0.85 ? BOA_X[i]! : -9999));
  const flying = streamAt(t).map((b) => ({ b, p: placeBat(b, u, hung, swerveAt(t)) }));
  for (const { b, p } of flying) if (b.s > BOA_PLANE) drawSprite(ctx, spriteFor(cast, p), boil, { ...p.at, scale: p.scale, rotation: p.rotation });
  for (const i of [1, 2, 0]) if (dropAt(t, i) > 0) drawBoa(ctx, cast.boa, cast.bats, boil, boas[i]!);
  drawVictims(ctx, cast, t, boil, scene);
  for (const { b, p } of flying) if (b.s <= BOA_PLANE) drawSprite(ctx, spriteFor(cast, p), boil, { ...p.at, scale: p.scale, rotation: p.rotation });
  ctx.drawImage(cast.passageCeiling, -MARGIN, -MARGIN);
  if (scene === 'question') {
    const ask = askAt(t);
    if (ask > 0) for (const b of boas) drawTextLine(ctx, '?', b.rim.x - (b.rim.x - BOA_X[boas.indexOf(b)]!) * 0.6, HINGE_Y + QUESTION_DROP - 110, 120 * (1 + 0.25 * askPop(t)), 700, ask, PAPER_ON_DARK);
  }
  drawVignette(ctx, VIDEO.width, VIDEO.height, 0.5);
  ctx.restore();
}
