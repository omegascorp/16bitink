import type Phaser from 'phaser';
import { capsule, closed, cub, type Draw, makeDraw, oval, pt, ribbon } from '../kit';
import { BOIL, PAPER_FILL } from '../palette';
import { makeCanvas, type Pt } from '../pen';
import { glaze } from '../snakes/cornPaint';
import type { SpriteArt } from '../types';
import { VIPER_PAINT } from './mountainsSnakePaint';

/**
 * The tail tip's "spider", seen from above, pointing +x (away from the
 * body), the frame centred on the bulb, drawn for a body SNAKE_W wide: the
 * last thin bit of tail running in from -x, the bulb (a swollen, dark,
 * rough-scaled knob, like a spider's body) and, fringing it, eight long
 * pointed scales splayed out to both sides and bent at a "knee", like
 * legs. Poses: 'still' (legs folded in close), 'wave0', 'wave1' (legs
 * spread, two phases of the wiggle that calls the birds down).
 */
export type LurePose = 'still' | 'wave0' | 'wave1';

const V = VIPER_PAINT;
const LEG_DARK = '#4a3f37';
const LEG_LIT = '#9a8b78';

/** Leg k (0 front .. 3 back) on side s: its root on the bulb, its knee, its tip. */
function leg(k: number, s: 1 | -1, pose: LurePose): [Pt, Pt, Pt] {
  const spread = pose === 'still' ? 0.55 : 1;
  const beat = pose === 'wave0' ? 1 : pose === 'wave1' ? -1 : 0;
  // Front legs reach forward, back legs back, as a spider's do.
  const a = (0.55 + k * 0.62) * s;
  const swing = beat * (k % 2 === 0 ? 0.16 : -0.16) * s;
  const ang = a * (0.7 + 0.3 * spread) + swing;
  const root = pt(Math.cos(ang) * 2.4, Math.sin(ang) * 2.1);
  const out = 3.8 + spread * 1.6 + (k === 1 || k === 2 ? 0.6 : 0);
  const knee = pt(root.x + Math.cos(ang) * out, root.y + Math.sin(ang) * out);
  // From the knee the leg bends down and on, towards the body's axis ends.
  const bend = ang + (k < 2 ? 0.55 : -0.55) * s * (0.6 + 0.4 * spread);
  const len = 3.6 + spread * 1.4;
  const tip = pt(knee.x + Math.cos(bend) * len, knee.y + Math.sin(bend) * len);
  return [root, knee, tip];
}

function drawLure(d: Draw, pose: LurePose): void {
  const { pen } = d;
  const { ctx } = pen;
  const legs = ([1, -1] as const).flatMap((s) => [0, 1, 2, 3].map((k) => leg(k, s, pose)));
  const stalk = ribbon(cub(pt(-12, 0), pt(-8, 0.2), pt(-4.5, 0.1), pt(-1.5, 0), 10), (u) => 2.4 + u * 0.6).shape;
  const bulb = oval(0.4, 0, 3.6, 2.9, 26);
  // Shadows on the ground (light from the upper left).
  for (const [r, kn, t] of legs) pen.stroke([r, kn, t].map((p) => pt(p.x + 1.1, p.y + 1.6)), 0.9, V.shadow, 0.22, false);
  pen.fill(bulb.map((p) => pt(p.x + 1.3, p.y + 1.9)), V.shadow, 0.28);
  // The legs: long pointed scales, dark, lit along their upper edge, inked.
  for (const [r, kn, t] of legs) {
    const thigh = capsule(r, kn, 1.25, 0.9);
    const shin = ribbon([kn, pt((kn.x + t.x) / 2, (kn.y + t.y) / 2), t], (u) => 0.9 * (1 - u) + 0.12).shape;
    for (const part of [thigh, shin]) {
      pen.fill(part, PAPER_FILL, 1);
      pen.fill(part, LEG_DARK, 0.92);
      pen.clipped(part, () => pen.fill(part.map((p) => pt(p.x - 0.35, p.y - 0.45)), LEG_LIT, 0.35));
      pen.hair(closed(part), 0.32, d.ink, 0.85);
    }
  }
  // The tail's last bit, running into the bulb.
  pen.fill(stalk, PAPER_FILL, 1);
  pen.fill(stalk, '#9c917e', 0.95);
  pen.clipped(stalk, () => pen.fill(stalk.map((p) => pt(p.x, p.y + 0.8)), V.shadow, 0.3));
  for (let x = -11; x < -2; x += 1.6) pen.hair([pt(x, -0.9), pt(x + 1, 0), pt(x, 0.9)], 0.22, V.shadow, 0.5);
  pen.hair(closed(stalk), 0.35, d.ink, 0.8);
  // The bulb: dark, its rough scales catching the light, a glossy lift on its upper side.
  pen.fill(bulb, PAPER_FILL, 1);
  pen.fill(bulb, V.barDeep, 0.95);
  pen.clipped(bulb, () => {
    glaze(ctx, -0.4, -0.9, 2.6, 1.8, 0, V.barLit, 0.85);
    for (let i = 0; i < 9; i++) {
      const x = -2.4 + (i % 3) * 1.8 + (Math.floor(i / 3) % 2) * 0.9;
      const y = -1.6 + Math.floor(i / 3) * 1.5;
      pen.hair([pt(x - 0.5, y - 0.5), pt(x + 0.6, y), pt(x - 0.5, y + 0.5)], 0.22, V.rim, 0.6);
    }
    pen.crescent(bulb, pt(-1, -1.3), () => pen.fill(bulb, V.rim, 0.45));
  });
  pen.stroke(closed(bulb), 0.6, d.ink, 0.95, false);
  pen.dot(-0.8, -1.2, 0.45, PAPER_FILL, 0.6);
}

export const SPIDER_LURE: SpriteArt<LurePose> = {
  frame: 32,
  res: 4,
  poses: ['still', 'wave0', 'wave1'],
  draw: drawLure,
};

/** The lure's texture key for a pose and boil frame. */
export const lureKey = (pose: LurePose, f: number): string => `mountains-lure-${pose}-${f}`;

/** Bakes every pose of the lure in every boil frame (once: textures outlive a level). */
export function bakeLure(scene: Phaser.Scene): void {
  const art = SPIDER_LURE;
  art.poses.forEach((pose, i) => {
    for (let f = 0; f < BOIL; f++) {
      const key = lureKey(pose, f);
      if (scene.textures.exists(key)) continue;
      const { canvas, ctx } = makeCanvas(art.frame * art.res, art.frame * art.res);
      ctx.scale(art.res, art.res);
      ctx.translate(art.frame / 2, art.frame / 2);
      art.draw(makeDraw(ctx, 18100 + i * 10 + f, f, 0), pose);
      scene.textures.addImage(key, canvas as unknown as HTMLImageElement);
    }
  });
}
