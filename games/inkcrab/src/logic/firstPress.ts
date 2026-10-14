import type { KeyValueStore } from '@16bitink/game-sdk';
import { birdOverhead, hunterNear, type Controls, type HintKind } from './coach';
import type { Beach } from './sim';

/** The presses the HUD singles out the first time each is needed: moving into a shell, digging, dropping sand, hiding. */
export type Press = 'grab' | 'dig' | 'drop' | 'hide';

const PRESSES: readonly Press[] = ['grab', 'dig', 'drop', 'hide'];
const KEY = 'inkcrab.taught.v1';
/** The coach's hints that need a dig: the dig lesson, the way down to a buried shell, the way out of a hole. */
const DIG_HINTS: ReadonlySet<HintKind> = new Set(['dig', 'buried', 'stuck']);

/** What a press is saved as: the keys and the touch buttons are learnt apart. */
const idOf = (controls: Controls, press: Press): string => `${controls}:${press}`;
const IDS: ReadonlySet<string> = new Set((['keys', 'touch'] as const).flatMap((c) => PRESSES.map((p) => idOf(c, p))));

/**
 * The press the moment calls for, most urgent first: hide when something
 * that can catch the crab is close (a bigger hunter, a bird about to stoop),
 * grab at a shell it can move into, drop sand once it's full of it (it can
 * dig no more until it does), dig when the coach's hint needs a dig.
 */
export function pressNeeded(beach: Beach, hint: HintKind | null): Press | null {
  const c = beach.crab;
  if (c.swap) return null;
  if (!c.hidden && (hunterNear(beach) || birdOverhead(beach))) return 'hide';
  if (beach.nearbyShell?.kind.type === 'shell' && beach.nearbyFits && !beach.nearbyHeld) return 'grab';
  if (c.sand >= beach.sandCapacity) return 'drop';
  if (hint !== null && DIG_HINTS.has(hint)) return 'dig';
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
 * has made it once.
 */
export class FirstPress {
  private readonly known: Set<string>;
  private lastSand: number | null = null;

  constructor(private readonly store: KeyValueStore | undefined) {
    this.known = new Set(load(store));
  }

  /** The press to highlight now, or null: one the moment needs and the player hasn't made yet. */
  cue(beach: Beach, hint: HintKind | null, controls: Controls): Press | null {
    const press = pressNeeded(beach, hint);
    return press && !this.known.has(idOf(controls, press)) ? press : null;
  }

  /** Learns the presses just made, with whichever controls are in use. Call each frame. */
  observe(beach: Beach, controls: Controls): void {
    const c = beach.crab;
    const dug = this.lastSand !== null && c.sand > this.lastSand;
    const dropped = this.lastSand !== null && c.sand < this.lastSand;
    this.lastSand = c.sand;
    if (c.swap) this.learn(controls, 'grab');
    if (dug) this.learn(controls, 'dig');
    if (dropped) this.learn(controls, 'drop');
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
