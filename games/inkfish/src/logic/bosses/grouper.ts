/**
 * The grouper, chapter 4's giant: a reef heavyweight that hunts by sound and
 * with a partner.
 *
 * While it's bigger than you it closes in, swells up (the warning) and booms:
 * a ring of sound spreads out and stuns whatever it reaches, and it lunges
 * while you're dazed. Once you're bigger it booms to stun you when you come
 * close, then flees, so time your approach between booms. Either way, hide in
 * the coral near it and it calls up a moray to flush you out (real groupers
 * hunt with morays).
 */

export type GrouperMode = 'roam' | 'swell' | 'lunge' | 'rest' | 'wary' | 'flee';

export interface GrouperState {
  readonly mode: GrouperMode;
  readonly until: number;
  /** The next boom may start from this time, ms. */
  readonly boomAt: number;
  /** When it last called its moray partner (0: never); the next call may come from callAt. */
  readonly called: number;
  readonly callAt: number;
}

export interface GrouperSense {
  readonly now: number;
  readonly rel: 'hunt' | 'hide' | 'even';
  readonly dist: number;
  readonly seen: boolean;
  /** You're tucked into cover. */
  readonly hidden: boolean;
}

export const GROUPER = {
  /** It booms when you're this close... */
  boomRange: 270,
  /** ...after swelling up this long (shorter when defending itself)... */
  swellMs: 750,
  defendSwellMs: 450,
  /** ...and the ring of sound reaches this far, stunning for stunMs (defendStunMs when defending). */
  boomRadius: 300,
  stunMs: 1100,
  defendStunMs: 800,
  /** How fast the ring spreads, ms to full size. */
  waveMs: 380,
  lungeMs: 650,
  lungeSpeed: 430,
  restMs: 1500,
  boomCooldownMs: 4200,
  defendCooldownMs: 3600,
  fleeMs: 1500,
  fleeSpeed: 330,
  roamSpeed: 150,
  waryDistance: 380,
  /** You hiding in cover within this range brings the moray... */
  callRange: 950,
  /** ...at most this often. */
  callCooldownMs: 12000,
} as const;

export const GROUPER_START: GrouperState = { mode: 'roam', until: 0, boomAt: 0, called: 0, callAt: 0 };

/** Swelling up to boom: the mode it booms at the end of. */
export function grouperSwelling(mode: GrouperMode): boolean {
  return mode === 'swell';
}

/** One step of the grouper's mind. Pure: the scene moves the fish and makes the noise. */
export function stepGrouper(s: GrouperState, i: GrouperSense): GrouperState {
  const called = i.hidden && i.dist < GROUPER.callRange && i.now >= s.callAt
    ? { ...s, called: i.now, callAt: i.now + GROUPER.callCooldownMs }
    : s;
  return i.rel === 'hide' ? defend(called, i) : hunt(called, i);
}

function hunt(s: GrouperState, i: GrouperSense): GrouperState {
  // Booming at the end of a swell is the scene's job: it sees swell -> lunge.
  if (s.mode === 'swell') return i.now >= s.until ? { ...s, mode: 'lunge', until: i.now + GROUPER.lungeMs } : s;
  if (s.mode === 'lunge') return i.now >= s.until ? { ...s, mode: 'rest', until: i.now + GROUPER.restMs } : s;
  if (s.mode === 'rest') return i.now >= s.until ? { ...s, mode: 'roam', boomAt: i.now + GROUPER.boomCooldownMs } : s;
  const near = i.rel === 'hunt' && i.seen && i.dist < GROUPER.boomRange && i.now >= s.boomAt;
  if (near) return { ...s, mode: 'swell', until: i.now + GROUPER.swellMs };
  return s.mode === 'roam' ? s : { ...s, mode: 'roam' };
}

function defend(s: GrouperState, i: GrouperSense): GrouperState {
  if (s.mode === 'swell') return i.now >= s.until ? { ...s, mode: 'flee', until: i.now + GROUPER.fleeMs } : s;
  if (s.mode === 'flee') return i.now >= s.until ? { ...s, mode: 'wary', boomAt: i.now + GROUPER.defendCooldownMs } : s;
  if (s.mode !== 'wary') return { ...s, mode: 'wary' };
  if (i.seen && i.dist < GROUPER.boomRange && i.now >= s.boomAt) return { ...s, mode: 'swell', until: i.now + GROUPER.defendSwellMs };
  return s;
}
