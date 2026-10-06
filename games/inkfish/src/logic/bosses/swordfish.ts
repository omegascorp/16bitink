/**
 * The swordfish, chapter 6's giant: the fastest thing in the sea.
 *
 * While it's bigger than you it lines up on you (a dotted red line shows its
 * path, following you, then holding still just before it goes), then tears
 * down that line, slashing through everything in the way: get off the line.
 * It overshoots and takes a while to turn. Once you're bigger it simply
 * outruns you, but sprinting drains it: run it out of breath and it has to
 * stop and rest, and that's your moment.
 */

export type SwordfishMode = 'cruise' | 'aim' | 'slash' | 'turn' | 'wary' | 'sprint' | 'winded';

export interface SwordfishState {
  readonly mode: SwordfishMode;
  readonly until: number;
  /** The next slash may start from this time, ms. */
  readonly slashAt: number;
  /** Seconds of sprinting it has left. */
  readonly stamina: number;
}

export interface SwordfishSense {
  readonly now: number;
  /** Seconds since the last step. */
  readonly dt: number;
  readonly rel: 'hunt' | 'hide' | 'even';
  readonly dist: number;
  readonly seen: boolean;
}

export const SWORDFISH = {
  /** It lines up on you from this far... */
  aimRange: 560,
  /** ...for this long, the last lockMs of it holding the line still. */
  aimMs: 900,
  lockMs: 260,
  slashMs: 1300,
  slashSpeed: 900,
  /** How far past you the slash carries, px. */
  overshoot: 520,
  turnMs: 1300,
  slashCooldownMs: 2400,
  cruiseSpeed: 210,
  /** Hiding: it sprints when you get this close, and stops once you're this far back. */
  sprintRange: 380,
  safeRange: 700,
  sprintSpeed: 560,
  /** Seconds of sprint in a full tank; it refills at refill per second while it isn't sprinting. */
  stamina: 3,
  refill: 0.5,
  windedMs: 3200,
  waryDistance: 480,
} as const;

export const SWORDFISH_START: SwordfishState = { mode: 'cruise', until: 0, slashAt: 0, stamina: SWORDFISH.stamina };

/** One step of the swordfish's mind. Pure: the scene moves the fish to match. */
export function stepSwordfish(s: SwordfishState, i: SwordfishSense): SwordfishState {
  return i.rel === 'hide' ? run(s, i) : hunt(s, i);
}

/** The aim still follows you until this close to the slash. */
export function aimLocked(s: SwordfishState, now: number): boolean {
  return s.mode === 'aim' && s.until - now <= SWORDFISH.lockMs;
}

function hunt(s: SwordfishState, i: SwordfishSense): SwordfishState {
  if (s.mode === 'aim') return i.now >= s.until ? { ...s, mode: 'slash', until: i.now + SWORDFISH.slashMs } : s;
  if (s.mode === 'slash') return i.now >= s.until ? { ...s, mode: 'turn', until: i.now + SWORDFISH.turnMs } : s;
  if (s.mode === 'turn') return i.now >= s.until ? { ...s, mode: 'cruise', slashAt: i.now + SWORDFISH.slashCooldownMs } : s;
  if (i.rel === 'hunt' && i.seen && i.dist < SWORDFISH.aimRange && i.now >= s.slashAt) return { ...s, mode: 'aim', until: i.now + SWORDFISH.aimMs };
  return s.mode === 'cruise' ? s : { ...s, mode: 'cruise' };
}

function run(s: SwordfishState, i: SwordfishSense): SwordfishState {
  if (s.mode === 'winded') return i.now >= s.until ? { ...s, mode: 'wary', stamina: SWORDFISH.stamina } : s;
  if (s.mode === 'sprint') {
    const stamina = s.stamina - i.dt;
    if (stamina <= 0) return { ...s, mode: 'winded', until: i.now + SWORDFISH.windedMs, stamina: 0 };
    return i.dist > SWORDFISH.safeRange ? { ...s, mode: 'wary', stamina } : { ...s, stamina };
  }
  const stamina = Math.min(SWORDFISH.stamina, s.stamina + SWORDFISH.refill * i.dt);
  if (i.dist < SWORDFISH.sprintRange) return { ...s, mode: 'sprint', stamina };
  return { ...s, mode: 'wary', stamina };
}
