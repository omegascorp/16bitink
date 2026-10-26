import { backStipple, bezier, bottomAt, C, topAt, xAt, type Anatomy, type Kit } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { ellipse, type Pt } from '../../../src/art/pen';
import type { Pose } from '../chain';
import { DOGFISH } from '../octopus/dogfishArt';
import { VIDEO } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer, type SwimLook } from './swimmer';

/**
 * The three animals, as the game draws fish:
 * - the wreckfish (Polyprion americanus): a massive grey-brown, grouper-like
 *   fish, a huge jutting lower jaw under an upturned mouth, a spiny dorsal,
 *   a big eye (drawn over it in eye.ts, so it can look about);
 * - the deep-sea dogfish sharks: the spiny dogfish from the octopus short
 *   (small, grey-brown, big green eyes, spined dorsals);
 * - the dead swordfish: the game's swordfish, lying still.
 * The wreckfish is drawn on the grouper's frame (same length and height), so
 * the shared body maths (bodyProportions) fit it.
 */

const GROUPER = ANATOMY.grouper;
const DARK = '#36322b';
const PALE = '#e8e0cc';

/** Where the wreckfish's eye sits on its drawing (texture px, facing right), and its radius. */
export const EYE_TEX: Pt = { x: xAt(GROUPER, 0.15), y: C - 17 };
export const EYE_R = 7.2;

/** Back and belly lines (in half-heights, y down): a steep forehead from the point of the chin, a deep jowl, a thick tail stalk. */
function profile(t: number): { readonly top: number; readonly bottom: number } {
  const top = t <= 0.36
    ? 0.02 - 1.02 * Math.sin((t / 0.36) * (Math.PI / 2)) ** 0.75
    : -0.3 - 0.7 * Math.cos(((t - 0.36) / 0.64) * (Math.PI / 2)) ** 1.2;
  const bottom = t <= 0.42
    ? 0.1 + 0.82 * Math.sin((t / 0.42) * (Math.PI / 2)) ** 0.55
    : 0.26 + 0.66 * Math.cos(((t - 0.42) / 0.58) * (Math.PI / 2)) ** 1.1;
  return { top, bottom };
}

/** Soft blotches on the flank, a shade darker. */
function blotches(k: Kit): void {
  k.pen.clipped(k.body, () => {
    for (let i = 0; i < 26; i++) {
      const t = 0.12 + k.pen.rng() * 0.8;
      const y = C + k.h(t) * (k.pen.rng() * 1.6 - 0.9);
      const r = 4 + k.pen.rng() * 6;
      k.pen.fill(ellipse(k.x(t), y, r * 1.4, r * 0.8, 9).map((p) => ({ x: p.x + k.pen.jitter(1.5), y: p.y + k.pen.jitter(1.5) })), '#4b463d', 0.16);
    }
  });
}

export const WRECKFISH: Anatomy = {
  ...GROUPER,
  peak: 0.38,
  blunt: 0.6,
  peduncle: 0.34,
  tail: 'round',
  tailSize: 0.82,
  profile,
  dorsal: { from: 0.27, to: 0.55, height: 0.42, spiny: true },
  dorsal2: { from: 0.55, to: 0.8, height: 0.6 },
  anal: { from: 0.64, to: 0.82, height: 0.5 },
  pectoral: 0.48,
  pelvic: true,
  scales: true,
  // Its eye is drawn over the sprite (eye.ts); the generic one is hidden.
  eye: { t: 0.15, r: 0.01, buried: true },
  mouth: 'none',
  wash: '#5f5446',
  finWash: '#6b6052',
  finAlpha: 0.55,
  extras: (k) => {
    k.pen.clipped(k.body, () => {
      // Grey-brown all over, a dark back over a paler belly.
      k.pen.fill(k.body, '#54473a', 0.72);
      const line: Pt[] = [];
      for (let t = 0; t <= 1.001; t += 0.04) line.push({ x: k.x(t), y: C - k.h(t) * 0.15 });
      k.pen.fill([...line, ...[...line].reverse().map((p) => ({ x: p.x, y: C - 90 }))], DARK, 0.3);
      const belly: Pt[] = [];
      for (let t = 0; t <= 1.001; t += 0.04) belly.push({ x: k.x(t), y: C + k.h(t) * 0.55 });
      k.pen.fill([...belly, ...[...belly].reverse().map((p) => ({ x: p.x, y: C + 90 }))], PALE, 0.22);
    });
    blotches(k);
    backStipple(1.1)(k);
    // The gill cover's edge, with the bony ridge across it ending in a flat spine.
    const gx = k.x(0.31);
    k.pen.stroke(bezier({ x: gx + 4, y: topAt(k.a, 0.3) + 12 }, { x: gx - 6, y: C + 2 }, { x: gx + 2, y: bottomAt(k.a, 0.3) - 6 }, 12), 1.3, k.ink, 0.9, false);
    k.pen.stroke(bezier({ x: k.x(0.17), y: C - 4 }, { x: k.x(0.24), y: C - 7 }, { x: gx - 3, y: C - 6 }, 8), 1.1, k.ink, 0.85, false);
    const spine = [{ x: gx - 3, y: C - 8.5 }, { x: gx - 11, y: C - 6 }, { x: gx - 3, y: C - 3.5 }];
    k.pen.fill(spine, '#8a8577', 0.8);
    k.pen.hair(spine, 0.6, k.ink, 0.85);
  },
  face: (k) => {
    const tip = { x: xAt(k.a, 0) + 1, y: C + 3 };
    const hinge = { x: k.x(0.25), y: C + 12 };
    // The upturned mouth, from the point of the chin back under the eye.
    k.pen.stroke(bezier(tip, { x: k.x(0.12), y: C + 9 }, hinge, 12), 1.9, k.ink, 1, false);
    // The fat lower lip and the heavy, jutting jaw under it.
    k.pen.stroke(bezier({ x: tip.x - 1, y: tip.y + 2.2 }, { x: k.x(0.12), y: C + 11.5 }, { x: hinge.x + 2, y: hinge.y + 2.2 }, 12), 1.5, PALE, 0.55, false);
    k.pen.hair(bezier({ x: tip.x - 2, y: tip.y + 6 }, { x: k.x(0.1), y: C + 20 }, { x: k.x(0.24), y: C + 22 }, 10), 0.8, k.ink, 0.7);
    // The upper jaw's bone, sweeping up from the corner of the mouth.
    k.pen.hair(bezier(hinge, { x: k.x(0.17), y: C + 1 }, { x: k.x(0.07), y: C - 3 }, 10), 0.9, k.ink, 0.8);
    // A nostril on the snout.
    k.pen.dot(k.x(0.07), C - 10, 0.9, k.ink, 0.9);
  },
};

/**
 * The shark that gets eaten, drawn to read as a shark at a glance even half
 * swallowed: a slate back over a white belly, taller dorsals with long pale
 * spines, and a bigger shark's tail, its upper lobe long.
 */
export const EATEN: Anatomy = {
  ...DOGFISH,
  tailSize: 1.6,
  dorsal: { from: 0.36, to: 0.46, height: 1.3, tri: true },
  dorsal2: { from: 0.68, to: 0.76, height: 1.05, tri: true },
  wash: '#5d6268',
  extras: (k) => {
    DOGFISH.extras?.(k);
    k.pen.clipped(k.body, () => {
      // A darker back, so the white belly stands out.
      const line: Pt[] = [];
      for (let t = 0; t <= 1.001; t += 0.04) line.push({ x: k.x(t), y: C + k.h(t) * 0.1 });
      k.pen.fill([...line, ...[...line].reverse().map((p) => ({ x: p.x, y: C - 60 }))], '#2f3338', 0.35);
    });
    // Long spines in front of both dorsals.
    for (const [t, h] of [[0.36, 15], [0.68, 13]] as const) {
      const base = { x: k.x(t) + 1, y: topAt(k.a, t) + 1 };
      k.pen.stroke([base, { x: base.x - h * 0.35, y: base.y - h }], 1.8, '#f1ead6', 1, false);
      k.pen.hair([base, { x: base.x - h * 0.35, y: base.y - h }], 0.6, k.ink, 0.9);
    }
  },
};

export interface Cast {
  readonly wreck: Sprite;
  readonly shark: Sprite;
  /** The shark that gets eaten. */
  readonly eaten: Sprite;
  readonly sword: Sprite;
  /** A scratch layer the size of the video, for drawing a fish out of the dark. */
  readonly layer: CanvasRenderingContext2D;
}

export function makeCast(): Cast {
  const layer = document.createElement('canvas');
  layer.width = VIDEO.width;
  layer.height = VIDEO.height;
  return {
    wreck: makeSprite('grouper', 9, 'light', WRECKFISH),
    shark: makeSprite('shark', 6, 'light', DOGFISH),
    eaten: makeSprite('shark', 7, 'light', EATEN),
    sword: makeSprite('swordfish', 5, 'light'),
    layer: layer.getContext('2d')!,
  };
}

/** A fish drawn out of the dark: its drawing shaded by `murk` (0 plain .. 1 hidden), as if just outside the floodlight. */
export function drawMurky(ctx: CanvasRenderingContext2D, cast: Cast, sprite: Sprite, pose: Pose, boil: number, look: SwimLook, murk: number): void {
  if (murk <= 0.005) {
    drawSwimmer(ctx, sprite, pose, boil, look);
    return;
  }
  if (murk >= 0.995) return;
  const layer = cast.layer;
  layer.clearRect(0, 0, VIDEO.width, VIDEO.height);
  drawSwimmer(layer, sprite, pose, boil, look);
  layer.save();
  layer.globalCompositeOperation = 'source-atop';
  // A shade lighter than the black water round it, so the shape shows before its markings do.
  layer.fillStyle = `rgba(14,20,26,${(0.94 * murk).toFixed(3)})`;
  layer.fillRect(0, 0, VIDEO.width, VIDEO.height);
  layer.restore();
  ctx.save();
  ctx.globalAlpha = Math.min(1, 4 * (1 - murk));
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.restore();
}
