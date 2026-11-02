import { BOIL_FRAMES } from '../../../src/art/textures';
import * as blueWhale from '../foodchain/art/blueWhale';
import { drawMouthInside, drawWhaleBody, drawWhaleJawAt, makeWhaleSprite, type WhaleSprite } from '../kraken/whaleArt';
import { drawOarfish } from '../oarfish/ribbon';
import { boilOf, type Pt } from '../swallowyou/art/ink';
import { drawSquid } from '../swallowyou/squid';
import * as basking from './art/baskingShark';
import * as frilled from './art/frilledShark';
import * as manatee from './art/manatee';
import { type Monster, MONSTERS } from './species';

/**
 * Every animal in the row through one door, like ../swallowyou/cast.ts:
 * `drawMonster` puts its front end at a screen point, `length` px from front
 * to tail tip, facing left or right, whatever each drawing's own anchor and
 * units are. Reused art: the oarfish (../oarfish), the giant squid (../kraken
 * via ../swallowyou/squid.ts), the sperm whale (../kraken), the blue whale
 * (../foodchain/art); the frilled shark, the manatee and the basking shark
 * are new (art/). `prepareCast` measures each drawing once, so placement is
 * exact. The squid's "front" is its mantle tip: it swims mantle first.
 */

export interface MonsterPose {
  /** Jaws, 0 shut .. 1 wide. */
  readonly gape?: number;
  /** Tail-beat or swimming-wave phase, radians (default: with time). */
  readonly tail?: number;
  /** The manatee's chewing and its slow blink, 0 .. 1. */
  readonly chew?: number;
  readonly blink?: number;
  /** Seagrass trailing from the manatee's mouth. */
  readonly grass?: boolean;
  /** The basking shark rotting into a "plesiosaur", 0 .. 1. */
  readonly rot?: number;
  /** The oarfish turned nose-up, 0 level .. 1 vertical. */
  readonly upright?: number;
  /** The blue whale's throat, 0 flat .. 1 ballooned. */
  readonly throat?: number;
}

interface Art {
  /** Draws it facing right, its own anchor at (x, y), its own length parameter `len`. */
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, t: number, pose: MonsterPose): void;
}

interface Measured {
  readonly snout: number;
  readonly tail: number;
  readonly top: number;
  readonly bottom: number;
}

const PROBE_LEN = 600;

let arts: Record<Monster, Art> | null = null;
const measured = new Map<Monster, Measured>();

const beatOf = (t: number, pose: MonsterPose, hz: number): number => pose.tail ?? t * hz * Math.PI * 2;

function oarfishArt(): Art {
  return {
    draw: (ctx, x, y, len, t, p) => {
      // The oarfish short works in metres with a 1080 x 1920 camera: an 8 m fish, scaled so it's `len` px, its snout at (x, y).
      const metres = 8;
      const zoom = len / metres;
      const heading = -(Math.PI / 2) * (p.upright ?? 0);
      const pose = { x: 0, y: 0, heading, length: metres, amp: 0.05, waves: 1.6, phase: beatOf(t, p, 0.35), curve: 0, fin: t * 3.2, crest: t * 0.8, limp: 0 };
      // Its head points along +x; the body trails back, so the snout is at the pose's origin.
      drawOarfish(ctx, pose, { x: 0, y: 0, zoom, dx: x - 540, dy: y - 960 }, { boil: boilOf(t) });
    },
  };
}

function spermArt(sprite: WhaleSprite): Art {
  return {
    draw: (ctx, x, y, len, t, p) => {
      const k = len / 3000;
      const open = (p.gape ?? 0) * 0.42;
      const boil = boilOf(t) % BOIL_FRAMES;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(k, k);
      drawMouthInside(ctx, open);
      drawWhaleJawAt(ctx, sprite, boil, open);
      drawWhaleBody(ctx, sprite, boil, beatOf(t, p, 0.25), 40);
      ctx.restore();
    },
  };
}

function makeArts(): Record<Monster, Art> {
  const sperm = makeWhaleSprite();
  return {
    frilled: { draw: (ctx, x, y, len, t, p) => frilled.drawFrilledShark(ctx, x, y, len, 1, t, { gape: p.gape ?? 0 }) },
    manatee: { draw: (ctx, x, y, len, t, p) => manatee.drawManatee(ctx, x, y, len, 1, t, { chew: p.chew ?? 0, blink: p.blink ?? 0, grass: p.grass ?? false }) },
    oarfish: oarfishArt(),
    basking: { draw: (ctx, x, y, len, t, p) => basking.drawBaskingShark(ctx, x, y, len, 1, t, { gape: p.gape ?? 0, rot: p.rot ?? 0 }) },
    squid: {
      // drawSquid leads with the mantle along -x: mirrored, so it faces right like the rest.
      draw: (ctx, x, y, len, t) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(-1, 1);
        drawSquid(ctx, 0, 0, len, 0, t);
        ctx.restore();
      },
    },
    sperm: spermArt(sperm),
    blue: { draw: (ctx, x, y, len, t, p) => blueWhale.drawBlueWhale(ctx, x, y, len, 0, t, { gape: p.gape ?? 0, throat: p.throat ?? 0, tail: p.tail }) },
  };
}

/** The alpha bounds of what `draw` paints on a scratch canvas, relative to (ox, oy). */
function bounds(draw: (c: CanvasRenderingContext2D) => void, ox: number, oy: number): Measured {
  const canvas = document.createElement('canvas');
  canvas.width = 2 * ox;
  canvas.height = 2 * oy;
  const c = canvas.getContext('2d')!;
  draw(c);
  const { data } = c.getImageData(0, 0, canvas.width, canvas.height);
  let x0 = canvas.width;
  let x1 = 0;
  let y0 = canvas.height;
  let y1 = 0;
  for (let y = 0; y < canvas.height; y += 2) {
    for (let x = 0; x < canvas.width; x += 2) {
      if (data[(y * canvas.width + x) * 4 + 3]! < 40) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 <= x0) throw new Error('A cast drawing painted nothing');
  return { snout: x1 - ox, tail: x0 - ox, top: y0 - oy, bottom: y1 - oy };
}

/** Bakes the drawings and measures each one. */
export async function prepareCast(): Promise<void> {
  if (arts) return;
  await Promise.all([blueWhale.prepare(), frilled.prepare(), manatee.prepare(), basking.prepare()]);
  arts = makeArts();
  for (const m of MONSTERS) {
    const art = arts[m];
    measured.set(m, bounds((c) => art.draw(c, 1000, 500, PROBE_LEN, 0, { tail: 0 }), 1000, 500));
  }
}

/** Its drawn height over its length (fins and arms included). */
export function heightRatio(m: Monster): number {
  const b = measured.get(m)!;
  return (b.bottom - b.top) / (b.snout - b.tail);
}

/**
 * Draws an animal with its front end at `front` (its body's vertical middle
 * on that line), `length` px from front to tail tip, facing right (1) or left
 * (-1), at t seconds. `angle` turns it nose-up about the front end.
 */
export function drawMonster(ctx: CanvasRenderingContext2D, m: Monster, front: Pt, length: number, facing: 1 | -1, t: number, pose: MonsterPose = {}, angle = 0): void {
  if (!arts) throw new Error('prepareCast() first');
  const b = measured.get(m)!;
  const r = length / (b.snout - b.tail);
  ctx.save();
  ctx.translate(front.x, front.y);
  if (angle) ctx.rotate(-angle * facing);
  ctx.scale(facing, 1);
  arts[m].draw(ctx, -b.snout * r, -((b.top + b.bottom) / 2) * r, PROBE_LEN * r, t, pose);
  ctx.restore();
}

/** Where the giant squid's eye is on its drawing (fractions of its box, front = mantle tip). */
export const SQUID_EYE = { along: 0.47, down: 0.5 } as const;

/** A point on the drawing as fractions of its box (0 front .. 1 tail along, 0 top .. 1 bottom down), in screen px. */
export function pointOn(m: Monster, front: Pt, length: number, facing: 1 | -1, along: number, down: number): Pt {
  const h = heightRatio(m) * length;
  return { x: front.x - facing * along * length, y: front.y - h / 2 + down * h };
}
