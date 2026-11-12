import { createRng } from '../../../src/logic/rng';
import { bezier, closed, type Draw, pt } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import type { SpriteArt } from '../../../src/art/types';
import { mix } from '../../../src/art/wash';
import { bilateral, ellipseAt, furEdge, glaze, hairs, skinWash } from '../../../src/art/critters/preyKit';

/**
 * A Jamaican fruit bat (Artibeus jamaicensis), from the game's bat
 * (src/art/chapters/rainforestCrittersBat.ts: the same wing skeleton and
 * finish), seen from the back facing +x, made a fruit bat: a stockier
 * grey-brown body, a broad head with a pointed nose-leaf and faint pale
 * stripes over the eyes, rounded ears, no tail (only a narrow fringe of
 * membrane between the legs), and wings of thin membrane between long
 * finger bones that glow warm where the dusk light shines through them.
 *  - 'fly1': the downstroke, wings spread full (span about 52);
 *  - 'fly0': the upstroke, wings raised (foreshortened);
 *  - 'swoop': swerving, wings half folded and swept back.
 */
const B = {
  fur: '#6f5c4e', furDeep: '#2f2620', furLit: '#a89282', membrane: '#33241f', membraneLit: '#d88a52',
  bone: '#b0907a', ear: '#4e3e34', earIn: '#a87a68', leaf: '#6a4e44', stripe: '#c8b8a6',
} as const;

export type BatPose = 'fly0' | 'fly1' | 'swoop';

const SPREAD = {
  shoulder: pt(2.4, 2.8), elbow: pt(-2, 8.4), wrist: pt(3.4, 14), d3: pt(-3, 26), d4: pt(-10, 19.6), d5: pt(-10.4, 11.4), foot: pt(-6.4, 3.4),
};

type WingPts = typeof SPREAD;

const POSE: Readonly<Record<BatPose, (p: Pt) => Pt>> = {
  fly1: (p) => p,
  fly0: (p) => pt(p.x + p.y * 0.16 - 1, p.y * 0.58 + 1),
  swoop: (p) => pt(p.x - Math.max(0, p.y - 4) * 0.42, p.y * 0.72 + 0.6),
};

const wingOf = (pose: BatPose): WingPts => Object.fromEntries(Object.entries(SPREAD).map(([k, p]) => [k, POSE[pose](p)])) as WingPts;

function membrane(w: WingPts): Pt[] {
  const sag = (a: Pt, b: Pt, k: number): Pt[] => {
    const m = pt((a.x + b.x) / 2, (a.y + b.y) / 2);
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    const n = pt(-(b.y - a.y) / l, (b.x - a.x) / l);
    return bezier(a, pt(m.x + n.x * l * k, m.y + n.y * l * k), b, 8);
  };
  const front = [pt(w.shoulder.x + 1.2, w.shoulder.y), pt((w.shoulder.x + w.wrist.x) / 2 + 2, (w.shoulder.y + w.wrist.y) / 2), w.wrist];
  return [
    ...front,
    ...sag(w.wrist, w.d3, -0.04).slice(1),
    ...sag(w.d3, w.d4, 0.2).slice(1),
    ...sag(w.d4, w.d5, 0.2).slice(1),
    ...sag(w.d5, w.foot, 0.16).slice(1),
    w.shoulder,
  ];
}

function wing(d: Draw, w: WingPts, side: number, dark: number): void {
  const { pen } = d;
  const m = (p: Pt): Pt => pt(p.x, p.y * side);
  const mw = Object.fromEntries(Object.entries(w).map(([k, p]) => [k, m(p)])) as WingPts;
  const shape = membrane(mw);
  pen.fill(shape, PAPER_FILL, 0.6);
  pen.fill(shape, B.membrane, 0.84 + dark * 0.1);
  pen.clipped(shape, () => {
    // Backlit: the thin membrane glows warm between the fingers.
    for (const [a, b] of [[mw.d3, mw.d4], [mw.d4, mw.d5], [mw.wrist, mw.d3]] as const) {
      const c = pt((a.x + b.x + mw.wrist.x) / 3, (a.y + b.y + mw.wrist.y) / 3);
      glaze(d, c.x, c.y, 7, 4.4, Math.atan2(b.y - a.y, b.x - a.x), B.membraneLit, 0.72 - dark * 0.3);
    }
    pen.crescent(shape, pt(-1.2, -side * 1.6), () => pen.fill(shape, '#1a1312', 0.35));
    const rng = createRng(7601 + side);
    for (let i = 0; i < 11; i++) {
      const t = 0.15 + i * 0.07;
      const a = pt(mw.shoulder.x - 2 + rng(), mw.shoulder.y);
      const tip = [mw.d3, mw.d4, mw.d5][i % 3]!;
      pen.hair([pt(a.x + (tip.x - a.x) * t, a.y + (tip.y - a.y) * t), pt(a.x + (tip.x - a.x) * (t + 0.22), a.y + (tip.y - a.y) * (t + 0.22))], 0.14, B.membraneLit, 0.4);
    }
  });
  pen.stroke(closed(shape), 0.4, d.ink, 0.9, false);
  const bone = (pts: Pt[], wd: number): void => {
    pen.hair(pts, wd + 0.28, d.ink, 0.8);
    pen.hair(pts, wd, B.bone, 0.92);
  };
  bone([mw.shoulder, mw.elbow, mw.wrist], 0.8);
  for (const tip of [mw.d3, mw.d4, mw.d5]) {
    const mid = pt(mw.wrist.x + (tip.x - mw.wrist.x) * 0.55, mw.wrist.y + (tip.y - mw.wrist.y) * 0.55);
    bone([mw.wrist, mid, tip], 0.44);
    pen.dot(mid.x, mid.y, 0.34, B.bone, 0.9);
  }
  pen.hair([mw.wrist, pt(mw.wrist.x + 1.7, mw.wrist.y - side * 0.2), pt(mw.wrist.x + 2.2, mw.wrist.y - side * 0.75)], 0.48, d.ink, 0.95);
  for (const k of [-0.5, 0, 0.5]) pen.hair([mw.foot, pt(mw.foot.x - 1.3, mw.foot.y + side * (0.5 + k * 0.4))], 0.24, d.ink, 0.8);
}

/** No tail: only a narrow fringe of membrane along the insides of the legs. */
function fringe(d: Draw, w: WingPts): void {
  const { pen } = d;
  const shape = [pt(-5, w.foot.y * 0.7), ...bezier(w.foot, pt(-7.6, 0.8), pt(-7.4, 0), 5), ...bezier(pt(-7.4, 0), pt(-7.6, -0.8), pt(w.foot.x, -w.foot.y), 5).slice(1), pt(-5, -w.foot.y * 0.7)];
  pen.fill(shape, B.membrane, 0.9);
  pen.stroke(closed(shape), 0.32, d.ink, 0.8, false);
  for (const s of [-1, 1]) pen.hair([pt(-4.6, s * 2.2), pt(-5.8, s * 3)], 0.7, B.furDeep, 0.9);
}

function body(d: Draw): void {
  const { pen } = d;
  // Smaller than the game bat's against its wings: a fruit bat's span is about five of its body lengths.
  pen.ctx.save();
  pen.ctx.translate(2, 0);
  pen.ctx.scale(0.8, 0.8);
  pen.ctx.translate(-2, 0);
  bodyParts(d);
  pen.ctx.restore();
}

function bodyParts(d: Draw): void {
  const { pen } = d;
  const trunk = bilateral([pt(10, 0), pt(9.6, 2.2), pt(7.6, 3.6), pt(5.2, 3.4), pt(2.8, 3.8), pt(-1, 4), pt(-4.2, 3.3), pt(-6, 2), pt(-6.6, 0)]);
  for (const s of [-1, 1]) {
    const ear = ellipseAt(7.4, s * 3.5, 2.4, 1.5, s * 0.55, 14);
    skinWash(d, ear, B.ear, B.furDeep);
    pen.clipped(ear, () => glaze(d, 7.5, s * 3.5, 1.6, 0.7, s * 0.55, B.earIn, 0.65));
    pen.stroke(closed(ear), 0.3, d.ink, 0.9, false);
  }
  skinWash(d, trunk, B.fur, B.furDeep, { at: pt(1, -1.2), r: 4.2 }, 0.45);
  const coat = { dir: (p: Pt) => Math.PI + p.y * 0.12, color: (_p: Pt, r: number) => (r < 0.35 ? B.furLit : r < 0.7 ? mix(B.fur, B.furDeep, 0.4) : B.furDeep) };
  hairs(d, trunk, coat, 110, 7611, 1.1, 0.22, 0.7);
  pen.clipped(trunk, () => {
    glaze(d, 7.2, 0, 2.4, 2.2, 0, mix(B.fur, B.furLit, 0.4), 0.5);
    pen.crescent(trunk, pt(-0.8, -1.1), () => pen.fill(trunk, B.furDeep, 0.3));
  });
  furEdge(d, trunk, 0.4, 7621, 2, 0.6);
  // The face: faint pale stripes over the eyes, bead eyes with a catchlight, the pointed nose-leaf.
  for (const s of [-1, 1]) {
    pen.hair([pt(7.2, s * 2.3), pt(6, s * 2.6)], 0.26, B.stripe, 0.3);
    // Small, dark, glossy eyes (no whites), one tiny catchlight.
    pen.dot(7.9, s * 1.55, 0.62, '#3a2a22', 0.9);
    pen.dot(7.9, s * 1.55, 0.5, '#0a0808', 1);
    pen.dot(8.05, s * 1.55 - 0.18, 0.11, '#e8dcc8', 0.85);
  }
  const leaf = [pt(9.4, -0.9), pt(11.6, 0), pt(9.4, 0.9)];
  pen.fill(leaf, B.leaf, 0.95);
  pen.stroke(closed(leaf), 0.22, d.ink, 0.9, false);
  for (const s of [-1, 1]) pen.dot(9.5, s * 0.5, 0.2, d.ink, 0.9);
}

function draw(d: Draw, pose: BatPose): void {
  const w = wingOf(pose);
  fringe(d, w);
  for (const s of [-1, 1]) wing(d, w, s, pose === 'fly0' ? 1 : 0);
  body(d);
}

export const FRUIT_BAT: SpriteArt<BatPose> = { frame: 60, res: 2, poses: ['fly0', 'fly1', 'swoop'], draw };
