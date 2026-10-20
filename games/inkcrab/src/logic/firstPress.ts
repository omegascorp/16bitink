import type { KeyValueStore } from '@16bitink/game-sdk';
import { birdOverhead, hunterNear, ledgeAhead, type Controls, type HintKind } from './coach';
import type { Beach } from './sim';

/** The presses the HUD singles out the first time each is needed: walking, jumping, moving into a shell, digging, dropping sand, building a step, hiding. */
export type Press = 'move' | 'jump' | 'grab' | 'dig' | 'drop' | 'build' | 'hide';

const PRESSES: readonly Press[] = ['move', 'jump', 'grab', 'dig', 'drop', 'build', 'hide'];
/** Seconds standing still, not having walked yet on the level, before the walking controls are singled out. */
export const STILL_SECONDS = 4;
/** Seconds a beginner (one who has never jumped) stands still after walking before they're singled out again. */
export const LOST_SECONDS = 8;
/** Seconds pushing into a bank it could jump onto before the jump is singled out. */
export const PUSH_SECONDS = 0.4;
const KEY = 'inkcrab.taught.v1';
/** The coach's hints that need a dig: the dig lesson, the way down to a buried shell, the way out of a hole. */
const DIG_HINTS: ReadonlySet<HintKind> = new Set(['dig', 'buried', 'stuck']);
/** The coach's hints that need a step built: at a bank too high to jump, below a shell up out of reach. */
const BUILD_HINTS: ReadonlySet<HintKind> = new Set(['drop', 'reach']);

/** What a press is saved as: the keys and the touch buttons are learnt apart. */
const idOf = (controls: Controls, press: Press): string => `${controls}:${press}`;
const IDS: ReadonlySet<string> = new Set((['keys', 'touch'] as const).flatMap((c) => PRESSES.map((p) => idOf(c, p))));

/**
 * The press the moment calls for, most urgent first: hide when something
 * that can catch the crab is close (a bigger hunter, a bird about to stoop),
 * grab at a shell it can move into, drop sand once it's full of it (it can
 * dig no more until it does), dig when the coach's hint needs a dig, and
 * build a step when it needs one (dig first, with no sand to build with).
 */
export function pressNeeded(beach: Beach, hint: HintKind | null): Press | null {
  const c = beach.crab;
  if (c.swap) return null;
  if (!c.hidden && (hunterNear(beach) || birdOverhead(beach))) return 'hide';
  if (beach.nearbyShell?.kind.type === 'shell' && beach.nearbyFits && !beach.nearbyHeld) return 'grab';
  if (c.sand >= beach.sandCapacity) return 'drop';
  if (hint !== null && DIG_HINTS.has(hint)) return 'dig';
  if (hint !== null && BUILD_HINTS.has(hint)) return c.sand > 0 ? 'build' : 'dig';
  return null;
}

/** Untrusted saved presses to the ones this game knows; anything else is dropped. */
export function parseTaught(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((id): id is string => typeof id === 'string' && IDS.has(id)))];
}

/**
 * Which presses the player has made, on the keys and on the touch buttons,
 * remembered across levels: the HUD highlights a press only until the player
 * has made it once. Walking is the exception: a crab that stands still on a
 * level it hasn't walked on yet always gets the walking controls shown, as
 * does a beginner who stops for long anywhere.
 */
export class FirstPress {
  private readonly known: Set<string>;
  private lastSand: number | null = null;
  /** The top of the crab's body last frame: a step built lifts it a whole tile at once. */
  private lastTop: number | null = null;
  private wasOnGround = true;
  /** The crab has walked on this level (one FirstPress lasts a level, as the HUD does). */
  private walked = false;
  /** When (level seconds) the crab last did anything: walked, jumped, dug, hid. */
  private stillSince = 0;
  /** When (level seconds) it started pushing into a bank it could jump onto, while it still is. */
  private pushSince: number | null = null;

  constructor(private readonly store: KeyValueStore | undefined) {
    this.known = new Set(load(store));
  }

  /** The press to highlight now, or null: one the moment needs and the player hasn't made yet. */
  cue(beach: Beach, hint: HintKind | null, controls: Controls): Press | null {
    const fresh = (p: Press): boolean => !this.known.has(idOf(controls, p));
    const press = pressNeeded(beach, hint);
    if (press === 'hide') return fresh(press) ? press : null;
    if (this.jumpNeeded(beach) && fresh('jump')) return 'jump';
    if (press) return fresh(press) ? press : null;
    return this.lost(beach, controls) ? 'move' : null;
  }

  /** Up against a bank it could jump onto: pushing into it a moment, or stood still at its foot. */
  private jumpNeeded(beach: Beach): boolean {
    const t = beach.elapsed;
    if (this.pushSince !== null && t - this.pushSince >= PUSH_SECONDS) return true;
    return t - this.stillSince >= STILL_SECONDS && ledgeAhead(beach, beach.crab.facing) !== null;
  }

  /** Standing still: before ever walking on this level, or for long as a beginner who hasn't jumped yet. */
  private lost(beach: Beach, controls: Controls): boolean {
    const still = beach.elapsed - this.stillSince;
    if (!this.walked) return still >= STILL_SECONDS;
    return !this.known.has(idOf(controls, 'jump')) && still >= LOST_SECONDS;
  }

  /** Learns the presses just made, with whichever controls are in use. Call each frame. */
  observe(beach: Beach, controls: Controls): void {
    const c = beach.crab;
    const dug = this.lastSand !== null && c.sand > this.lastSand;
    const dropped = this.lastSand !== null && c.sand < this.lastSand;
    this.lastSand = c.sand;
    const b = c.body;
    const built = dropped && this.lastTop !== null && this.lastTop - b.y >= beach.tileSize * 0.9;
    this.lastTop = b.y;
    const pushing = Math.abs(b.vx) >= 1;
    // Off the ground and on the way up from it: a jump (a steam vent's throw passes too, but no level has one before the player must jump).
    const jumped = this.wasOnGround && !b.onGround && b.vy < 0 && !c.climbing;
    this.wasOnGround = b.onGround;
    if (pushing || jumped || dug || dropped || c.hidden || c.swap || c.climbing || !b.onGround) this.stillSince = beach.elapsed;
    this.pushSince = pushing && ledgeAhead(beach, Math.sign(b.vx)) ? this.pushSince ?? beach.elapsed : null;
    if (pushing) {
      this.walked = true;
      this.learn(controls, 'move');
    }
    if (jumped) this.learn(controls, 'jump');
    if (c.swap) this.learn(controls, 'grab');
    if (dug) this.learn(controls, 'dig');
    if (dropped) this.learn(controls, 'drop');
    if (built) this.learn(controls, 'build');
    if (c.hidden) this.learn(controls, 'hide');
  }

  private learn(controls: Controls, press: Press): void {
    const id = idOf(controls, press);
    if (this.known.has(id)) return;
    this.known.add(id);
    try {
      this.store?.setItem(KEY, JSON.stringify([...this.known]));
    } catch (err) {
      console.warn('[inkcrab] could not save what has been taught', err);
    }
  }
}

function load(store: KeyValueStore | undefined): string[] {
  try {
    const raw = store?.getItem(KEY);
    return raw ? parseTaught(JSON.parse(raw)) : [];
  } catch (err) {
    console.warn('[inkcrab] could not read what has been taught', err);
    return [];
  }
}
