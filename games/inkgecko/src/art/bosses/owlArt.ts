import { createRng, type Rng } from '../../logic/rng';
import { polar, SHADOW } from '../groundKit';
import { bezier, closed, cub, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { petalBlade } from '../propsKit';
import { barredFeather, drawHead, glowingEyes, moonRim, OWL, plumage } from './owlParts';
import { paintWing, wingAt, type WingPose } from './owlWing';
import type { BossArt } from './types';

/**
 * The Tawny Owl (chapter 10, the night garden), seen from above facing +x:
 * round and mottled russet, its big head with the facial disc at the front
 * and dark-ringed amber eyes. 'perch' has the wings folded (the post is
 * painted apart); 'fly0' spreads them wide and 'fly1' beats them down, so
 * the two alternate as flapping; 'hurt' is perched, ruffled and shedding,
 * eyes shut; 'eyes' is only the glowing eyes, placed exactly where they are
 * in every other pose, for the game to lay over the night.
 */
const FRAME = 150;
const SEED = 7717;
const SPREAD: WingPose = { span: 56, sweep: -8, chord: 32 };
const BEAT: WingPose = { span: 36, sweep: 10, chord: 28 };

/** The perched body: a round egg broadest behind the head. */
function perchBody(): Pt[] {
  return Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * TAU;
    const c = Math.cos(a);
    return pt(-8 + c * 25, Math.sin(a) * 21.5 * (1 - 0.1 * Math.max(0, -c)));
  });
}

/** A folded wing along side s: from the shoulder back over the flank to the tip crossing over the tail. */
function foldedWing(s: number): Pt[] {
  const outer = cub(pt(8, s * 16), pt(-2, s * 25), pt(-26, s * 23), pt(-38, s * 4), 16);
  const inner = cub(pt(-38, s * 4), pt(-30, s * 1), pt(-14, s * 4), pt(4, s * 9), 12).slice(1, -1);
  return [...outer, ...inner];
}

/** The tail: a short barred fan at the rear; wider spread in flight. */
function tail(d: Draw, flying: boolean): void {
  const n = flying ? 7 : 5;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1) - 0.5;
    const ang = Math.PI + k * (flying ? 0.75 : 0.35);
    const base = pt(flying ? -24 : -28, k * (flying ? 5 : 3));
    barredFeather(d, base, polar(base, ang, flying ? 22 : 16), flying ? 7 : 6.5, 4);
  }
}

/** Volume over a feathered mass: moonlit at the upper left, shaded and hatched at the far side, a pen contour. */
function model(d: Draw, shape: readonly Pt[], k: number, line = 1.3): void {
  const { pen } = d;
  pen.crescent(shape, pt(-SHADOW.x * k, -SHADOW.y * k), () => pen.fill(shape, OWL.dark, 0.32));
  pen.crescent(shape, pt(-SHADOW.x * k * 1.5, -SHADOW.y * k * 1.5), () => pen.hatch(shape, 2, 0.9, 0.4, { color: d.ink, alpha: 0.32 }));
  pen.crescent(shape, pt(SHADOW.x * k * 0.5, SHADOW.y * k * 0.5), () => pen.fill(shape, PAPER_FILL, 0.28));
  pen.stroke(closed(shape), line, d.ink, 0.95);
}

/** The perched owl's back and folded wings (head drawn after). */
function perched(d: Draw, rng: Rng, ruffle: number): Pt[] {
  const { pen } = d;
  const body = perchBody();
  pen.fill(body.map((p) => pt(p.x + SHADOW.x * 5, p.y + SHADOW.y * 5)), d.ink, 0.2);
  moonRim(d, body);
  tail(d, false);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, OWL.russet, 0.85);
  plumage(d, body, rng, () => Math.PI, 220, 4.6, ruffle);
  model(d, body, 5);
  for (const s of [-1, 1]) {
    const wing = foldedWing(s);
    pen.fill(wing.map((p) => pt(p.x + SHADOW.x * 1.5, p.y + SHADOW.y * 1.5)), d.ink, 0.2);
    pen.fill(wing, PAPER_FILL, 1);
    pen.fill(wing, OWL.russet, 0.85);
    plumage(d, wing, rng, () => Math.PI + s * 0.12, 90, 4.6, ruffle);
    pen.clipped(wing, () => {
      // Barred primaries at the rear of the folded wing, a row of pale scapular spots along its top.
      for (let i = 0; i < 5; i++) barredFeather(d, pt(-16 - i * 1.5, s * (5 + i * 2.6)), pt(-40 + i * 1.5, s * (3 + i * 1.2)), 5.5, 5);
      for (let x = 2; x > -22; x -= 4.2) {
        const y = s * (11 + (x + 10) * 0.06);
        pen.fill([pt(x - 1.4, y - 1), pt(x + 1.2, y - 1.2), pt(x + 1.4, y + 1), pt(x - 1.2, y + 1.2)], OWL.cream, 0.9);
      }
    });
    model(d, wing, 3, 1.1);
  }
  return body;
}

/** The flying owl's wings, tail and body (head drawn after). */
function flying(d: Draw, rng: Rng, beat: boolean): void {
  const { pen } = d;
  tail(d, true);
  for (const s of [-1, 1]) paintWing(d, s, beat ? BEAT : SPREAD, rng);
  const body = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * TAU;
    return pt(-7 + Math.cos(a) * 22, Math.sin(a) * 14.5 * (1 - 0.15 * Math.max(0, -Math.cos(a))));
  });
  moonRim(d, body);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, OWL.russet, 0.85);
  plumage(d, body, rng, () => Math.PI, 130, 4.4);
  model(d, body, 4);
  if (beat) {
    // The downbeat's air: short swept strokes just beyond each wingtip, where the tips were.
    for (const s of [-1, 1]) {
      const tip = wingAt(s, BEAT)(1, 0.2);
      for (const k of [0, 1, 2]) {
        const y = tip.y + s * (5 + k * 4.5);
        const swish = bezier(pt(tip.x + 3 - k * 2, y - s * 2), pt(tip.x - 6, y + s * 1.5), pt(tip.x - 16 + k * 3, y - s * 1), 8);
        pen.stroke(swish, 2, PAPER_FILL, 0.3, false);
        pen.hair(swish, 0.8, d.ink, 0.7 - k * 0.15);
      }
    }
  }
}

/** A loose feather drifting off, at c turned to `ang`: a small curved barred feather and its shadow far below. */
function looseFeather(d: Draw, c: Pt, ang: number, len: number): void {
  const { pen } = d;
  const f = petalBlade(polar(c, ang + Math.PI, len / 2), ang, len, len * 0.38, 0.18);
  pen.fill(f.shape.map((p) => pt(p.x + SHADOW.x * 7, p.y + SHADOW.y * 7)), d.ink, 0.15);
  barredFeather(d, polar(c, ang + Math.PI, len / 2), polar(c, ang, len / 2), len * 0.46, 3);
  for (const k of [-1, 1]) pen.hair([polar(c, ang + Math.PI, len / 2 + 1), polar(polar(c, ang + Math.PI, len / 2 + 4), ang + k * 1.4, 1.5)], 0.4, d.ink, 0.6);
}

/** Feathers knocked askew out of the silhouette: tufts sticking out round the edge. */
function ruffs(d: Draw, body: readonly Pt[], rng: Rng): void {
  for (let i = 0; i < body.length; i += 4) {
    const p = body[i]!;
    const a = Math.atan2(p.y, p.x + 8) + (rng() - 0.5) * 0.8;
    const f = petalBlade(polar(p, a + Math.PI, 2), a, 4.5 + rng() * 2.5, 2.8, (rng() - 0.5) * 0.3);
    d.pen.fill(f.shape, PAPER_FILL, 1);
    d.pen.fill(f.shape, rng() < 0.5 ? OWL.rust : OWL.buff, 0.85);
    d.pen.hair([f.at(0.1, 0), f.at(0.9, 0)], 0.5, OWL.dark, 0.8);
    d.pen.hair(closed(f.shape), 0.45, d.ink, 0.85);
  }
}

function draw(d: Draw, pose: string): void {
  if (pose === 'eyes') {
    glowingEyes(d);
    return;
  }
  const rng = createRng(SEED);
  const hurt = pose === 'hurt';
  if (pose === 'fly0' || pose === 'fly1') flying(d, rng, pose === 'fly1');
  else {
    const body = perched(d, rng, hurt ? 0.6 : 0);
    if (hurt) ruffs(d, body, createRng(SEED + 3));
  }
  drawHead(d, rng, { shut: hurt, ruffle: hurt ? 0.6 : 0 });
  if (hurt) {
    for (const [x, y, a, l] of [[-28, -42, -2.5, 17], [32, -36, -0.6, 15], [-50, 26, 2.8, 15], [12, 44, 1.1, 13], [50, 16, 0.4, 12]] as const) looseFeather(d, pt(x, y), a, l);
  }
}

export const OWL_ART: BossArt = { frame: FRAME, res: 3, poses: ['perch', 'fly0', 'fly1', 'hurt', 'eyes'], draw };
