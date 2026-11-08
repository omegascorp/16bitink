/**
 * The geographic cone snail's geometry, in snail px (sp): the snail faces
 * right with its shell's middle at the origin and its foot on the sand at
 * GROUND_Y. The shell is a long cone lying on its side, the low knobbly
 * spire to the left; the siphon pokes up from the narrow front end; the
 * head, with its two eye stalks, sits on the front of the foot; and the
 * false mouth (the rostrum) grows out of the head, from a little tube to a
 * wide funnel, a net, that engulfs a fish.
 *
 * Pure numbers (no canvas), so the tests can check the choreography.
 */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** The sand under the foot. */
export const GROUND_Y = 118;

/** The shell: apex of the spire, the shoulder, and the narrow front end, along its axis (y ≈ -3). */
export const SHELL = { apex: -228, shoulder: -150, tip: 178, top: -96, bottom: 90, tipTop: -20, tipBottom: 18, axis: -3 } as const;
/** The shell's whole length, sp (16.6 cm in life). */
export const SHELL_LEN = SHELL.tip + 14 - SHELL.apex;

/** Where the siphon leaves the shell's front end, and its open tip. */
export const SIPHON_ROOT: Pt = { x: 166, y: -8 };
export const SIPHON_TIP: Pt = { x: 224, y: -84 };

/** The two eye stalks' roots on the head (far one first). */
export const EYE_ROOTS: readonly Pt[] = [{ x: 204, y: 62 }, { x: 218, y: 70 }];
export const STALK_LEN = 62;
export const EYE_R = 15;

/** The rostrum grows from the front of the head. */
export const ROSTRUM_BASE: Pt = { x: 236, y: 84 };
/** Its length and the rim's half-width, tucked away (open 0) and spread as a net (open 1). */
export const ROSTRUM = { minLen: 34, maxLen: 250, minRim: 15, maxRim: 196, baseHalf: 22 } as const;
/** The rim is a circle seen at a slant: this much of its half-width shows along the axis. */
export const RIM_SLANT = 0.32;

/**
 * The rostrum's state: which way it points (canvas radians), how far it's
 * spread, how wide its rim may get (`spread` × the net's: lips stretched
 * round a fish rather than a net), and how far the rim has closed.
 */
export interface RostrumState {
  readonly heading: number;
  readonly open: number;
  readonly spread: number;
  readonly pucker: number;
}

/** The funnel as drawn: its base, axis, length, the rim's centre and half-width. */
export interface Bell {
  readonly base: Pt;
  readonly dir: Pt;
  readonly nrm: Pt;
  readonly len: number;
  readonly rim: number;
  readonly centre: Pt;
}

const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;

export function bellOf(r: RostrumState, origin: Pt = { x: 0, y: 0 }): Bell {
  const dir = { x: Math.cos(r.heading), y: Math.sin(r.heading) };
  const nrm = { x: -dir.y, y: dir.x };
  const base = { x: origin.x + ROSTRUM_BASE.x, y: origin.y + ROSTRUM_BASE.y };
  const len = lerp(ROSTRUM.minLen, ROSTRUM.maxLen, r.open);
  const rim = lerp(ROSTRUM.minRim, ROSTRUM.maxRim * r.spread, r.open) * (1 - 0.94 * r.pucker);
  return { base, dir, nrm, len, rim, centre: { x: base.x + dir.x * len, y: base.y + dir.y * len } };
}

/** A point on the bell: `s` along it (0 base .. 1 rim), `w` across (sp, along the normal). */
export const onBell = (b: Bell, s: number, w: number): Pt => ({
  x: b.base.x + b.dir.x * b.len * s + b.nrm.x * w,
  y: b.base.y + b.dir.y * b.len * s + b.nrm.y * w,
});

/** The funnel's flare: narrow at the base, opening out like a trumpet to the rim. */
export const flareAt = (b: Bell, s: number): number => ROSTRUM.baseHalf + (b.rim - ROSTRUM.baseHalf) * s ** 1.7;

/**
 * A fish going in tail first along the bell's axis, `inside` of its body
 * length past the rim (0: its tail at the rim, 1: all of it in). Returns
 * the body's centre; it faces out of the bell (nose along the axis).
 */
export function fishInBell(b: Bell, inside: number, length: number): Pt {
  const k = length * (0.5 - inside);
  return { x: b.centre.x + b.dir.x * k, y: b.centre.y + b.dir.y * k };
}

/** A fish's half-height, as a share of its body length (the clownfish, fins and all). */
export const FISH_HALF_H = 0.33;
