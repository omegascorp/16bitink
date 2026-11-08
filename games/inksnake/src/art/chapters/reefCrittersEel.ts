import { closed, type Draw, pt, shade } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { castShadow, glaze } from '../critters/preyKit';
import { type Body, bodyOf, fishEye, intoHole } from './reefCrittersKit';

/**
 * An eel seen from above facing +x, shared by the conger and the moray:
 * a long scaleless body on a bending spine (snout at s = 0), its poses,
 * and the painting every eel has (wash, roundness, the fin fold down the
 * back, the head's eyes, gill opening and nostrils). Each species brings
 * its own shape, colours and markings.
 *
 * - 'out0', 'out1': the head and neck poking out of a hole, swaying one way
 *   and the other; the neck runs back past the frame's centre into the
 *   hole (at `hole` x) and melts into its dark.
 * - 'swim0', 'swim1': the whole eel in the open, an S one way and the other.
 * - 'sleep': lying slack on the sand, the mouth fallen open.
 */
export type EelPose = 'out0' | 'out1' | 'swim0' | 'swim1' | 'sleep';
export const EEL_POSES: readonly EelPose[] = ['out0', 'out1', 'swim0', 'swim1', 'sleep'];

export interface EelPaint {
  readonly base: string;
  readonly deep: string;
  readonly belly: string;
  readonly fin: string;
  readonly finEdge: string;
  readonly iris: string;
  readonly mouth: string;
}

export interface EelSpec {
  readonly frame: number;
  readonly len: number;
  readonly width: (s: number) => number;
  /** Where along it the eye and the gill opening are. */
  readonly eye: number;
  readonly gill: number;
  /** Where the fin fold along the back begins. */
  readonly finFrom: number;
  readonly eyeR: number;
  /** Out of its hole: the snout's x, the hole's x, how far the neck runs on into it. */
  readonly out: { readonly snout: number; readonly hole: number; readonly sway: number };
  /** The swimming S's height, and how many waves along it. */
  readonly wave: { readonly amp: number; readonly k: number };
  readonly paint: EelPaint;
  /** Its markings over the washed body. */
  readonly pattern: (d: Draw, z: Body, pose: EelPose) => void;
  /** Its head: jaws, teeth, nostrils (after the body's contour). */
  readonly head: (d: Draw, z: Body, pose: EelPose) => void;
  /** Fins out from the body (a conger's pectorals), painted under it. */
  readonly fins?: (d: Draw, z: Body, pose: EelPose) => void;
}

/** The spine for a pose, and how long a stretch of it is painted. */
function spineFor(e: EelSpec, pose: EelPose): { at: (s: number) => Pt; len: number } {
  if (pose === 'out0' || pose === 'out1') {
    const { snout, hole, sway } = e.out;
    const sign = pose === 'out0' ? 1 : -1;
    const toHole = snout - hole;
    const len = toHole + e.width(toHole) * 0.9;
    // The neck bends from the hole's mouth; the head swings furthest.
    return { at: (s) => pt(snout - s, sign * sway * Math.max(0, 1 - s / toHole) ** 1.6), len };
  }
  const { len } = e;
  if (pose === 'sleep') {
    return { at: (s) => {
      const u = s / len;
      return pt(len * 0.47 - s * 0.97, len * 0.2 * Math.sin(Math.PI * u) - len * 0.1 + len * 0.05 * Math.sin(Math.PI * 3 * u) * u);
    }, len };
  }
  const phase = pose === 'swim0' ? 0 : Math.PI;
  const { amp, k } = e.wave;
  // A travelling wave, growing towards the tail; the S shortens it a little.
  return { at: (s) => {
    const u = s / len;
    return pt(len * 0.46 - s * 0.93, amp * (0.25 + 0.75 * u) * Math.sin(Math.PI * 2 * k * u + phase) - amp * 0.25 * Math.sin(phase));
  }, len };
}

/** Clears the end of the painting softly, past `from` in direction `dir`, so the neck fades into the hole's dark. */
function fadeAway(d: Draw, from: Pt, dir: Pt, over: number): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(from.x, from.y, from.x + dir.x * over, from.y + dir.y * over);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = g;
  ctx.fillRect(-200, -200, 400, 400);
  ctx.restore();
}

/** The fin fold down the middle of the back: a thin ridge, its edge catching the light. */
function finFold(d: Draw, e: EelSpec, z: Body): void {
  const { pen } = d;
  const to = z.len - 0.5;
  if (to <= e.finFrom) return;
  const n = Math.max(6, Math.round((to - e.finFrom) / 1.2));
  const line = Array.from({ length: n + 1 }, (_, i) => z.at(e.finFrom + ((to - e.finFrom) * i) / n, -0.06));
  pen.clipped(z.shape, () => {
    pen.hair(line, Math.max(0.6, e.width(e.finFrom + 6) * 0.14), e.paint.fin, 0.55);
    pen.hair(line.map((p) => pt(p.x - 0.25, p.y - 0.35)), 0.3, e.paint.finEdge, 0.75);
    pen.hair(line.map((p) => pt(p.x + 0.2, p.y + 0.35)), 0.25, e.paint.deep, 0.6);
  });
}

/** The eyes, gill openings and the lit gloss of wet skin over the head. */
function headParts(d: Draw, e: EelSpec, z: Body): void {
  const { pen } = d;
  for (const v of [-1, 1]) {
    const eye = z.at(e.eye, v * 0.58);
    fishEye(d, eye, e.eyeR, e.paint.iris);
    const g = z.at(e.gill, v * 0.88);
    pen.fill([z.at(e.gill - 0.7, v * 0.9), z.at(e.gill, v * 0.72), z.at(e.gill + 0.8, v * 0.9), z.at(e.gill, v * 1.02)], '#141420', 0.7);
    pen.dot(g.x, g.y, 0.2, PAPER_FILL, 0.4);
  }
  const lit = z.at(e.eye * 0.6, -0.25);
  pen.clipped(z.shape, () => glaze(d, lit.x, lit.y, e.width(e.eye) * 0.45, e.width(e.eye) * 0.22, 0, PAPER_FILL, 0.45));
}

/** Wet-skin gloss: soft lit streaks along the upper-left side of the body. */
function gloss(d: Draw, z: Body): void {
  const { pen } = d;
  pen.clipped(z.shape, () => {
    const streak = Array.from({ length: 24 }, (_, i) => z.at(2 + ((z.len - 4) * i) / 23, -0.45));
    pen.hair(streak, Math.max(0.5, z.width(z.len * 0.4) * 0.12), PAPER_FILL, 0.3);
    pen.crescent(z.shape, pt(-0.9, -1.4), () => pen.fill(z.shape, '#141526', 0.3));
  });
}

/** Paints an eel in a pose. */
export function drawEel(d: Draw, e: EelSpec, pose: EelPose): void {
  const { pen } = d;
  const sp = spineFor(e, pose);
  const z = bodyOf(sp.at, e.width, sp.len, Math.max(48, Math.round(sp.len * 1.6)));
  const out = pose === 'out0' || pose === 'out1';
  castShadow(d, z.shape, pt(1.8, 2.6), out ? 0.13 : 0.18);
  e.fins?.(d, z, pose);
  pen.fill(z.shape, PAPER_FILL, 1);
  pen.fill(z.shape, e.paint.base, 0.92);
  if (pose === 'sleep') {
    // Slack, rolled a little: the paler belly shows along one side.
    pen.clipped(z.shape, () => pen.hair(Array.from({ length: 30 }, (_, i) => z.at(e.gill + ((z.len - e.gill - 2) * i) / 29, 0.85)), e.width(z.len * 0.5) * 0.32, e.paint.belly, 0.7));
  }
  e.pattern(d, z, pose);
  gloss(d, z);
  shade(d, z.shape, 0.16);
  finFold(d, e, z);
  pen.stroke(closed(z.shape), Math.max(0.45, e.width(e.gill) * 0.07), d.ink, 0.95);
  e.head(d, z, pose);
  headParts(d, e, z);
  if (out) {
    const toHole = e.out.snout - e.out.hole;
    intoHole(d, z, Math.max(0, toHole - e.width(toHole) * 1.2), '#101527');
    const end = z.at(toHole, 0);
    fadeAway(d, pt(end.x + e.width(toHole) * 0.2, end.y), pt(-1, 0), e.width(toHole) * 0.8);
  }
}

/** A row of tiny teeth along a jaw line: pale cones, inked. */
export function teeth(d: Draw, line: readonly Pt[], size: number, colour: string): void {
  const { pen } = d;
  for (let i = 1; i < line.length - 1; i++) {
    const a = line[i - 1]!;
    const b = line[i + 1]!;
    const p = line[i]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nrm = pt(-(b.y - a.y) / l, (b.x - a.x) / l);
    const tip = pt(p.x + nrm.x * size, p.y + nrm.y * size);
    const tri = [pt(p.x - ((b.x - a.x) / l) * size * 0.45, p.y - ((b.y - a.y) / l) * size * 0.45), tip, pt(p.x + ((b.x - a.x) / l) * size * 0.45, p.y + ((b.y - a.y) / l) * size * 0.45)];
    pen.fill(tri, colour, 0.95);
    pen.hair(tri, 0.12, d.ink, 0.6);
  }
}

/** A colour a little darker (towards the deep tone). */
export const deeper = (c: string, deep: string, t: number): string => mix(c, deep, t);
