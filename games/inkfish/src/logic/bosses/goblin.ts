/**
 * The goblin shark, chapter 9's giant: slow, pale and pink, with jaws that
 * shoot out from under its long snout like a slingshot.
 *
 * While it's bigger than you it creeps after you; when you're in front of it
 * within reach, its snout glows (the warning) and its jaws fire out far ahead
 * of its nose, then snap back. Never come at it head-on. Once you're bigger
 * it swims away, but it keeps turning to face you, and snaps at anything in
 * front of it: cut in from the side or from behind.
 */

export type GoblinMode = 'stalk' | 'aim' | 'snap' | 'recoil' | 'flee' | 'turn';

export interface GoblinState {
  readonly mode: GoblinMode;
  readonly until: number;
  /** The next snap may start from this time, ms. */
  readonly snapAt: number;
  /** Fleeing, it turns to face you again at this time, ms. */
  readonly turnAt: number;
}

export interface GoblinSense {
  readonly now: number;
  readonly rel: 'hunt' | 'hide' | 'even';
  /** You're in front of its snout, within the jaws' reach. */
  readonly inFront: boolean;
  readonly seen: boolean;
}

export const GOBLIN = {
  /** How far ahead of its nose the jaws reach, in multiples of its size. */
  reach: 2.3,
  /** It counts as "in front" within this half-angle of its facing, radians. */
  cone: 0.55,
  aimMs: 550,
  snapMs: 260,
  recoilMs: 900,
  snapCooldownMs: 2200,
  stalkSpeed: 120,
  /** Fleeing, it swims this fast and turns round to face you every turnEveryMs, for turnMs. */
  fleeSpeed: 230,
  turnEveryMs: 2600,
  turnMs: 700,
  /** Its snap stuns a bigger you this long (it can't eat you). */
  stunMs: 1000,
} as const;

export const GOBLIN_START: GoblinState = { mode: 'stalk', until: 0, snapAt: 0, turnAt: 0 };

/** One step of the goblin shark's mind. Pure: the scene moves the fish and works the jaws. */
export function stepGoblin(s: GoblinState, i: GoblinSense): GoblinState {
  if (s.mode === 'aim') return i.now >= s.until ? { ...s, mode: 'snap', until: i.now + GOBLIN.snapMs } : s;
  if (s.mode === 'snap') return i.now >= s.until ? { ...s, mode: 'recoil', until: i.now + GOBLIN.recoilMs } : s;
  if (s.mode === 'recoil') {
    if (i.now < s.until) return s;
    return { ...s, mode: i.rel === 'hide' ? 'flee' : 'stalk', snapAt: i.now + GOBLIN.snapCooldownMs, turnAt: i.now + GOBLIN.turnEveryMs };
  }
  return i.rel === 'hide' ? flee(s, i) : hunt(s, i);
}

function hunt(s: GoblinState, i: GoblinSense): GoblinState {
  if (i.rel === 'hunt' && i.seen && i.inFront && i.now >= s.snapAt) return { ...s, mode: 'aim', until: i.now + GOBLIN.aimMs };
  return s.mode === 'stalk' ? s : { ...s, mode: 'stalk' };
}

function flee(s: GoblinState, i: GoblinSense): GoblinState {
  if (s.mode === 'turn') {
    // Facing you: it snaps at once if you're in front, otherwise swims on.
    if (i.inFront && i.now >= s.snapAt) return { ...s, mode: 'snap', until: i.now + GOBLIN.snapMs };
    return i.now >= s.until ? { ...s, mode: 'flee', turnAt: i.now + GOBLIN.turnEveryMs } : s;
  }
  if (s.mode !== 'flee') return { ...s, mode: 'flee', turnAt: i.now + GOBLIN.turnEveryMs };
  return i.now >= s.turnAt ? { ...s, mode: 'turn', until: i.now + GOBLIN.turnMs } : s;
}

/** Whether (dx, dy) from its snout is in front of it (facing 1 right, -1 left) within `reach` px. */
export function inJawReach(dx: number, dy: number, facing: 1 | -1, reach: number): boolean {
  const ahead = dx * facing;
  return ahead > 0 && Math.hypot(dx, dy) < reach && Math.abs(Math.atan2(dy, ahead)) < GOBLIN.cone;
}
