/**
 * The tarpon, chapter 2's giant: the silver king, famous for leaping.
 *
 * While it's bigger than you it hunts near the surface: it races up ahead of
 * you, leaps, and belly-flops where you are. A red ring on the water marks the
 * landing; the splash stuns everything under it, and it dives straight through
 * after you. Stay deep and it can't flop on you. Once you're bigger it escapes
 * by leaping far along the surface, but three leaps in a row wear it out.
 */

export type TarponMode = 'cruise' | 'rise' | 'air' | 'dive' | 'recover' | 'wary' | 'spent';

export interface TarponState {
  readonly mode: TarponMode;
  readonly until: number;
  /** Where the leap is aimed to land (world x); set when it starts to rise. */
  readonly landX: number;
  /** The next leap may start from this time, ms. */
  readonly leapAt: number;
  /** Escape leaps since it last rested. */
  readonly leaps: number;
  /** The leap under way is a hunting belly-flop (not an escape). */
  readonly flop: boolean;
}

export interface TarponSense {
  readonly now: number;
  /** hunt: it's bigger. hide: you're bigger. even: neither can eat the other. */
  readonly rel: 'hunt' | 'hide' | 'even';
  readonly dist: number;
  /** Its own x; your x and sideways speed; how far you are below the surface, px. */
  readonly x: number;
  readonly px: number;
  readonly pvx: number;
  readonly playerDepth: number;
  /** You're in plain view (not hidden, not in the air yourself). */
  readonly seen: boolean;
  /** Which way you are from it along the surface: 1 right, -1 left. */
  readonly side: 1 | -1;
  /** It's up at the surface, ready to jump. */
  readonly atSurface: boolean;
  /** It came back down into the water this frame. */
  readonly landed: boolean;
}

export const TARPON = {
  /** It only flops on you when you're this close to the surface, px. */
  huntDepth: 460,
  /** ...and this close to it. */
  huntRange: 760,
  /** It can't spend longer than this getting up to the surface for a leap. */
  riseMs: 2600,
  riseSpeed: 470,
  /** Time in the air, s; how high the arc goes follows from it. */
  airTime: 0.8,
  gravity: 1700,
  /** Where it lands, ahead of where you were: you're swimming. */
  leadMs: 420,
  /** The splash: anything within this of where it lands is stunned. */
  splashRadius: 170,
  stunMs: 1300,
  diveMs: 650,
  diveSpeed: 460,
  recoverMs: 1300,
  /** Rest between flops. */
  huntCooldownMs: 4200,
  /** Escaping: it leaps away when you get this close... */
  escapeRange: 320,
  /** ...this far, px... */
  escapeLeap: 620,
  /** ...at most this often... */
  escapeCooldownMs: 2600,
  /** ...and after this many it's spent for spentMs. */
  escapeLeaps: 3,
  spentMs: 3600,
  cruiseSpeed: 170,
  waryDistance: 420,
  wanderSpeed: 240,
} as const;

export const TARPON_START: TarponState = { mode: 'cruise', until: 0, landX: 0, leapAt: 0, leaps: 0, flop: false };

/** In the air (or on the way up for a leap) nothing in the water can reach it. */
export function tarponAirborne(mode: TarponMode): boolean {
  return mode === 'air';
}

/** One step of the tarpon's mind. Pure: the scene moves the fish to match. */
export function stepTarpon(s: TarponState, i: TarponSense): TarponState {
  if (s.mode === 'air') {
    if (!i.landed) return s;
    return i.rel === 'hide' ? { ...s, mode: 'wary' } : { ...s, mode: 'dive', until: i.now + TARPON.diveMs };
  }
  if (s.mode === 'rise') {
    if (i.atSurface) return { ...s, mode: 'air' };
    return i.now >= s.until ? { ...s, mode: i.rel === 'hide' ? 'wary' : 'cruise' } : s;
  }
  return i.rel === 'hide' ? escape(s, i) : hunt(s, i);
}

function hunt(s: TarponState, i: TarponSense): TarponState {
  if (s.mode === 'dive') return i.now >= s.until ? { ...s, mode: 'recover', until: i.now + TARPON.recoverMs } : s;
  if (s.mode === 'recover') return i.now >= s.until ? { ...s, mode: 'cruise', leapAt: i.now + TARPON.huntCooldownMs } : s;
  const flop = i.rel === 'hunt' && i.seen && i.now >= s.leapAt && i.playerDepth < TARPON.huntDepth && i.dist < TARPON.huntRange;
  if (flop) return { ...s, mode: 'rise', until: i.now + TARPON.riseMs, landX: i.px + (i.pvx * TARPON.leadMs) / 1000, flop: true };
  return s.mode === 'cruise' ? s : { ...s, mode: 'cruise', leaps: 0 };
}

function escape(s: TarponState, i: TarponSense): TarponState {
  if (s.mode === 'spent') return i.now >= s.until ? { ...s, mode: 'wary', leaps: 0 } : s;
  if (s.mode !== 'wary') return { ...s, mode: 'wary' };
  if (s.leaps >= TARPON.escapeLeaps) return { ...s, mode: 'spent', until: i.now + TARPON.spentMs };
  if (i.dist < TARPON.escapeRange && i.now >= s.leapAt) {
    return {
      ...s, mode: 'rise', until: i.now + TARPON.riseMs, landX: i.x - i.side * TARPON.escapeLeap,
      leapAt: i.now + TARPON.escapeCooldownMs, leaps: s.leaps + 1, flop: false,
    };
  }
  return s;
}
