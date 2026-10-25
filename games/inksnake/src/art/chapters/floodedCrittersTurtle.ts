import { createRng } from '../../logic/rng';
import { closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { ellipseAt, glaze } from '../critters/preyKit';
import { softShadow } from './barrensCrittersBeast';
import { digits, lit } from './barrensCrittersKit';
import { film, local, rings, shapeIn, wake } from './floodedCrittersKit';

/**
 * The yellow-spotted river turtle from above facing +x: a smooth, low oval
 * shell about 26 long, dark olive-brown, its scutes edged and faintly
 * growth-ringed; a flat head with the bright yellow spots that name it;
 * broad webbed feet with claws and a short pointed tail. 'idle' floats,
 * limbs out; 'paddle0', 'paddle1' stroke the forefeet in turn.
 */
type Pose = 'idle' | 'paddle0' | 'paddle1';

const T = {
  shell: '#4f4d33',
  shellDeep: '#25241a',
  shellLit: '#8a8556',
  seam: '#1d1c15',
  skin: '#4c5040',
  skinDeep: '#262a20',
  spot: '#f0c63a',
  claw: '#d9d2b4',
} as const;

const SHELL: readonly (readonly [number, number])[] = [[13.5, 0], [12.4, 6], [8, 9.6], [0, 10.6], [-8, 10.2], [-12.5, 7], [-14, 2.4], [-14.5, 0], [-14, -2.4], [-12.5, -7], [-8, -10.2], [0, -10.6], [8, -9.6], [12.4, -6]];
const shellAt = (x: number, y: number): Pt => pt(x, y);

/** A webbed foot at the end of a short limb: from `root` reaching along `ang`, its toes fanned. */
function limb(d: Draw, root: Pt, ang: number, len: number, w: number): void {
  const { pen } = d;
  const f = local(root, ang);
  const shape = shapeIn(f, [[-1, -w * 0.5], [len * 0.5, -w * 0.55], [len, -w * 0.75], [len + 1.2, 0], [len, w * 0.75], [len * 0.5, w * 0.55], [-1, w * 0.5]], 3);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, T.skin, 0.92);
  pen.clipped(shape, () => {
    pen.crescent(shape, pt(-0.4, -0.6), () => pen.fill(shape, T.skinDeep, 0.5));
    const rng = createRng(Math.round(root.x * 17 + root.y * 3));
    for (let i = 0; i < 8; i++) {
      const q = f(rng() * len, (rng() - 0.5) * w);
      pen.dot(q.x, q.y, 0.25, lit(T.skin, 0.4), 0.7);
    }
  });
  pen.stroke(closed(shape), 0.35, d.ink, 0.9, false);
  digits(d, f(len, 0), ang, 1.1, [1.3, 1.6, 1.7, 1.4], 0.45, T.skin, T.skinDeep, T.claw, 0.2);
}

/** The flat head: dark olive, splashed with its bright yellow spots, the eyes high and forward. */
function head(d: Draw, c: Pt): void {
  const { pen } = d;
  const f = local(c, 0);
  const neck = shapeIn(f, [[-6, -2.4], [-1, -2.6], [2, -2.8], [4.6, -2], [6, 0], [4.6, 2], [2, 2.8], [-1, 2.6], [-6, 2.4]], 3);
  pen.fill(neck, PAPER_FILL, 1);
  pen.fill(neck, T.skin, 0.95);
  pen.clipped(neck, () => {
    pen.crescent(neck, pt(-0.5, -0.7), () => pen.fill(neck, T.skinDeep, 0.5));
    for (const [x, y, r] of [[3.6, 0, 0.85], [1.6, -1.6, 0.6], [1.6, 1.6, 0.6], [-0.4, -0.6, 0.45], [-0.4, 0.8, 0.45], [4.8, -1, 0.35], [4.8, 1, 0.35]] as const) {
      const q = f(x, y);
      pen.fill(ellipseAt(q.x, q.y, r * 1.2, r, 0, 10), T.spot, 0.95);
    }
    const g = f(2, -0.8);
    glaze(d, g.x, g.y, 2.5, 1.2, 0, PAPER_FILL, 0.25);
  });
  pen.stroke(closed(neck), 0.4, d.ink, 0.95, false);
  for (const s of [-1, 1]) {
    const e = f(3, s * 1.6);
    pen.dot(e.x, e.y, 0.45, '#141215', 1);
    pen.dot(e.x - 0.12, e.y - 0.15, 0.13, PAPER_FILL, 0.9);
  }
  for (const s of [-1, 1]) pen.dot(f(5.6, s * 0.4).x, f(5.6, s * 0.4).y, 0.16, d.ink, 0.9);
}

/** The shell: scutes in their rows (vertebrals down the middle, costals either side, the marginal rim), each growth-ringed, the dome lit at its top. */
function shell(d: Draw): void {
  const { pen } = d;
  const s = shapeIn(shellAt, SHELL, 4);
  pen.fill(s, PAPER_FILL, 1);
  pen.fill(s, T.shell, 0.95);
  pen.clipped(s, () => {
    glaze(d, -2, -3, 10, 6, -0.2, T.shellLit, 0.55);
    glaze(d, 3, 4, 12, 6, 0, T.shellDeep, 0.35);
    // The marginal rim.
    const rim = shapeIn((x, y) => pt(x * 0.84, y * 0.8), SHELL, 4);
    pen.stroke(closed(rim), 0.4, T.seam, 0.8, false);
    for (let i = 0; i < s.length; i += 4) {
      const q = s[i]!;
      pen.hair([q, pt(q.x * 0.84, q.y * 0.8)], 0.3, T.seam, 0.7);
    }
    // The vertebral scutes along the spine and the costals either side.
    const vx = [11, 5.6, 0, -5.6, -10.6];
    for (let i = 0; i < vx.length - 1; i++) {
      const [a, b] = [vx[i]!, vx[i + 1]!];
      const v = [pt(a, 0), pt(a - 1, -3.4), pt(b + 1, -3.4), pt(b, 0), pt(b + 1, 3.4), pt(a - 1, 3.4)];
      pen.stroke(closed(v), 0.38, T.seam, 0.85, false);
      for (const k of [0.7, 0.45]) pen.hair(closed(v.map((p) => pt((a + b) / 2 + (p.x - (a + b) / 2) * k, p.y * k))), 0.22, lit(T.shell, 0.3), 0.6);
      for (const sd of [-1, 1]) {
        pen.hair([pt(a - 1, sd * 3.4), pt(a - 1.6, sd * 8.2)], 0.38, T.seam, 0.85);
        const cc = pt((a + b) / 2 - 0.6, sd * 5.8);
        pen.hair(ellipseAt(cc.x, cc.y, 1.8, 1.3, 0, 10).slice(0, 8), 0.22, lit(T.shell, 0.3), 0.55);
      }
    }
    pen.crescent(s, pt(-1.2, -1.8), () => pen.fill(s, T.shellDeep, 0.5));
    pen.crescent(s, pt(-0.5, -0.8), () => pen.hatch(s, 1.2, 0.9, 0.22, { color: d.ink, alpha: 0.35 }));
    // Wet glints on the dome.
    for (const [x, y, l] of [[-4, -5.5, 3], [3, -6, 2], [-8, -3, 1.6]] as const) pen.hair([pt(x, y), pt(x + l, y - 0.3)], 0.5, PAPER_FILL, 0.75);
  });
  pen.stroke(closed(s), 0.55, d.ink, 0.95);
}

const LIMBS: Readonly<Record<Pose, readonly (readonly [number, number, number])[]>> = {
  // Fore +y, fore −y, hind +y, hind −y: root x, root y (scaled by side), angle (towards +y side; mirrored).
  idle: [[7, 8, 0.85], [7, 8, 0.85], [-9, 8, 2.3], [-9, 8, 2.3]],
  paddle0: [[7, 8, 0.4], [7, 8, 2], [-9, 8, 2.6], [-9, 8, 2.1]],
  paddle1: [[7, 8, 2], [7, 8, 0.4], [-9, 8, 2.1], [-9, 8, 2.6]],
};

function draw(d: Draw, pose: Pose): void {
  const swim = pose !== 'idle';
  const l = LIMBS[pose];
  rings(d, pt(0, 0), 16, 13, swim ? 1 : 2, 6801, 0.5);
  if (swim) wake(d, pt(18, 0), 14, 9, 0.5);
  softShadow(d, [shapeIn(shellAt, SHELL, 3)], pt(2, 3), 0.2, 1.2);
  l.forEach(([x, y, a], i) => {
    const side = i % 2 === 0 ? 1 : -1;
    limb(d, pt(x, side * y), side * a, i < 2 ? 7.4 : 5.8, i < 2 ? 3.2 : 3.6);
  });
  // The short pointed tail.
  const tail = [pt(-13, -1.6), pt(-18.5, 0), pt(-13, 1.6)];
  d.pen.fill(tail, T.skin, 1);
  d.pen.stroke(closed(tail), 0.35, d.ink, 0.9, false);
  head(d, pt(15.5, 0));
  shell(d);
  // The water laps over the shell's back edge and the limbs' ends.
  film(d, shapeIn((x, y) => pt(x - 7, y * 1.05), [[-6, 0], [-5, -9], [0, -11.5], [3, -8], [3, 8], [0, 11.5], [-5, 9]], 3), 0.2, 6802);
}

export const RIVER_TURTLE_ART: SpriteArt<Pose> = { frame: 50, res: 3, poses: ['idle', 'paddle0', 'paddle1'], draw };
