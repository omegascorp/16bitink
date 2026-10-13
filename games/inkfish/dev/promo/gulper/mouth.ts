import type { Anatomy } from '../../../src/art/fish/kit';
import { bottomAt, C, xAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { lerp } from '../short';

/**
 * The gulper eel's hinged jaw and its balloon of a mouth, as geometry.
 *
 * The game's drawing ('gulper') has the pouch painted on, sagging open; to
 * throw the jaws open and balloon up, the eel here is drawn without it
 * (GULPER_BARE) and the jaw and pouch are added on top:
 * - the upper jaw is the underside of the head, from the snout back to the
 *   hinge (far back for a fish, a third of the body);
 * - the long lower jaw swings down about the hinge (`jaw` 0 shut .. 1 wide);
 * - the pouch is a membrane slung from the lower jaw back to the throat,
 *   bulging into a round balloon as it fills with water (`fill` 0 slack .. 1 full).
 *
 * Coordinates are fish-texture px (the sprite's units) with the origin at
 * the snout, x forwards, y down: render.ts scales them onto the screen.
 */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

const GULPER = ANATOMY.gulper;

/** The gulper as the game draws it, minus the painted pouch and the baked-in wave (the swimmer bends it as it swims). */
export const GULPER_BARE: Anatomy = {
  ...GULPER,
  wave: 0,
  extras: (k) => {
    k.pen.fill(k.body, '#1d1a22', 0.4);
  },
};

/** The snout, in texture px. */
const NOSE = { x: xAt(GULPER, 0), y: C + 1 } as const;
/** Texture px to snout-relative. */
const fromTex = (x: number, y: number): Pt => ({ x: x - NOSE.x, y: y - NOSE.y });

/** How far back the hinge is, as a fraction of the body (the game's drawing hinges it at 0.34). */
const HINGE_T = 0.34;
/** Where the pouch joins the throat, behind the hinge. */
const THROAT_T = 0.56;

/** The underside of the head from the snout to the hinge: the upper jaw. */
export const UPPER: readonly Pt[] = Array.from({ length: 18 }, (_, i) => {
  const t = (i / 17) * HINGE_T;
  return fromTex(xAt(GULPER, t), bottomAt(GULPER, t) - 1.5);
});
export const HINGE: Pt = UPPER[UPPER.length - 1]!;
export const SNOUT: Pt = UPPER[0]!;
export const THROAT: Pt = fromTex(xAt(GULPER, THROAT_T), bottomAt(GULPER, THROAT_T) - 1.5);
/** The gill slit: just behind where the pouch meets the throat. */
export const GILL: Pt = fromTex(xAt(GULPER, THROAT_T + 0.04), bottomAt(GULPER, THROAT_T + 0.04));
/** The body's half-length in texture px, snout to tail stalk: the centre of the sprite is HALF behind the snout. */
export const HALF = GULPER.hl;

/** The lower jaw, as long as the upper. Shut, it lies along the upper jaw; wide open it hangs at OPEN_ANGLE below forwards. */
const JAW_LEN = Math.hypot(HINGE.x - SNOUT.x, HINGE.y - SNOUT.y) + 1;
const SHUT_ANGLE = Math.atan2(SNOUT.y + 2.5 - HINGE.y, SNOUT.x - HINGE.x);
const OPEN_ANGLE = 1.2;

/** The pouch's bulge beyond the line from jaw tip to throat, texture px: slack, and full. */
const BULGE_SLACK = 5;
const BULGE_FULL = 92;

export interface Balloon {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
}

export interface MouthGeom {
  readonly tip: Pt;
  /** The lower jaw, hinge to tip. */
  readonly lower: readonly Pt[];
  /** The pouch's outline, from the jaw tip round to the throat. */
  readonly pouch: readonly Pt[];
  /** The circle the pouch's outline is an arc of. */
  readonly balloon: Balloon;
  /** The front of the open mouth, snout to jaw tip (bowing in). */
  readonly opening: readonly Pt[];
  /** The middle of the opening: where food goes in. */
  readonly gate: Pt;
}

const quad = (a: Pt, c: Pt, b: Pt, n: number): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
  });

const ARC_STEPS = 44;

/** An arc from `a` to `b` bulging `bulge` beyond their chord, on the side `side` points to. */
function bulgeArc(a: Pt, b: Pt, bulge: number, side: Pt): { readonly pts: Pt[]; readonly circle: Balloon } {
  const chord = Math.hypot(b.x - a.x, b.y - a.y);
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  let n = { x: -(b.y - a.y) / chord, y: (b.x - a.x) / chord };
  if (n.x * side.x + n.y * side.y < 0) n = { x: -n.x, y: -n.y };
  const s = Math.max(0.5, bulge);
  const r = (chord * chord) / 4 / (2 * s) + s / 2;
  const cx = mid.x + n.x * (s - r);
  const cy = mid.y + n.y * (s - r);
  const aA = Math.atan2(a.y - cy, a.x - cx);
  const aB = Math.atan2(b.y - cy, b.x - cx);
  const aF = Math.atan2(n.y, n.x);
  const turn = (d: number): number => ((d % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  // Round through the far side: whichever way reaches the bulge's tip before b.
  const ccw = turn(aF - aA) < turn(aB - aA);
  const sweep = ccw ? turn(aB - aA) : -turn(aA - aB);
  const pts = Array.from({ length: ARC_STEPS + 1 }, (_, i) => {
    const ang = aA + (sweep * i) / ARC_STEPS;
    return { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r };
  });
  return { pts, circle: { cx, cy, r } };
}

export function mouthGeom(jaw: number, fill: number): MouthGeom {
  const angle = lerp(SHUT_ANGLE, OPEN_ANGLE, jaw);
  const tip = { x: HINGE.x + Math.cos(angle) * JAW_LEN, y: HINGE.y + Math.sin(angle) * JAW_LEN };
  // The jaw bows down a little along its length.
  const bow = { x: (HINGE.x + tip.x) / 2 - Math.sin(angle) * 3, y: (HINGE.y + tip.y) / 2 + Math.cos(angle) * 3 };
  const lower = quad(HINGE, bow, tip, 14);
  // The pouch bulges away from the mouth: down and back from the jaw.
  const away = { x: -Math.sin(angle) - 0.3, y: Math.cos(angle) + 0.4 };
  const { pts: pouch, circle } = bulgeArc(tip, THROAT, lerp(BULGE_SLACK, BULGE_FULL, fill) * (0.75 + 0.25 * Math.max(jaw, fill)), away);
  const inward = { x: (HINGE.x - (SNOUT.x + tip.x) / 2) * 0.22, y: (HINGE.y - (SNOUT.y + tip.y) / 2) * 0.22 };
  const opening = quad(SNOUT, { x: (SNOUT.x + tip.x) / 2 + inward.x, y: (SNOUT.y + tip.y) / 2 + inward.y }, tip, 10);
  return { tip, lower, pouch, balloon: circle, opening, gate: opening[5]! };
}
