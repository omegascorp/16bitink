/**
 * Fish whose tails taper to a point (eels, rattails, chimaeras) have no tail
 * fin to swing, so they swim by bending: a wave runs from head to tail,
 * growing as it goes. These are the shapes of that wave; the rig that applies
 * it lives in scenes/game/swim.ts.
 */
export interface BendStyle {
  /** Share of the body from the nose that stays straight. */
  readonly stiff: number;
  /** Sway at the nose, as a share of the sway at the tail tip. */
  readonly nose: number;
  /** Sway at the tail tip per radian of tail beat, as a share of the half length. */
  readonly sway: number;
  /** Wavelengths along the whole body: more is a tighter ripple. */
  readonly waves: number;
}

/** Fish this many times longer than they are deep bend even with a tail fin: a rigid stick with a flapping fin looks wrong. */
export const BEND_FROM_RATIO = 6;
/** ...and from this long and thin, or drawn with a wavy body, they ripple all along like an eel. */
const EEL_FROM_RATIO = 8;

/** Eels ripple their whole length; tapering tails sweep from mid-body back. */
export const BEND: Readonly<Record<'eel' | 'taper', BendStyle>> = {
  eel: { stiff: 0, nose: 0.15, sway: 0.75, waves: 1 },
  taper: { stiff: 0.35, nose: 0, sway: 0.95, waves: 0.6 },
};

/** Where a texture x lies along a body centred on `centre`: 0 at the nose (facing +x), 1 at the tail tip. */
export function alongBody(x: number, centre: number, halfLength: number): number {
  return Math.min(1, Math.max(0, (centre + halfLength - x) / (2 * halfLength)));
}

/** How far a point at `along` (see alongBody) sways for a one-radian beat, px. */
export function swayAt(along: number, halfLength: number, style: BendStyle): number {
  const rear = Math.max(0, (along - style.stiff) / (1 - style.stiff));
  return halfLength * style.sway * (style.nose + (1 - style.nose) * rear ** 1.4);
}

/** Sideways offset of a point this frame, for a beat of `amp` radians at swim phase `phase`. */
export function bendOffset(along: number, sway: number, amp: number, phase: number, style: BendStyle): number {
  return sway * amp * Math.sin(phase - along * style.waves * Math.PI * 2);
}

/** The bend for a body of half length `hl` and half height `hh`, drawn wavy or not. */
export function bendStyleOf(hl: number, hh: number, wavy: boolean): BendStyle {
  return wavy || hl / hh >= EEL_FROM_RATIO ? BEND.eel : BEND.taper;
}
