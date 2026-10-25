import type { Teach } from '../level/types';
import { CHAPTER_HINTS } from './chapters/index';
import type { WorldEvent } from './world';

/** A hint, worded for a mouse or for a touch screen. */
interface Hint {
  readonly id: string;
  readonly mouse: string;
  readonly touch: string;
  /** Shown once an event like this happens (immediately when absent). */
  readonly after?: (e: WorldEvent) => boolean;
  /** Done once an event like this happens. */
  readonly until: (e: WorldEvent) => boolean;
  /** Gone after this long on screen anyway, s. */
  readonly max: number;
}

const is = (type: WorldEvent['type']) => (e: WorldEvent): boolean => e.type === type;
const never = (): boolean => false;
const arrived = (kind: string) => (e: WorldEvent): boolean => e.type === 'arrive' && e.kind === kind;

const HINTS: Readonly<Record<string, Hint>> = {
  steer: { id: 'steer', mouse: 'Move the mouse: the snake\'s head follows it', touch: 'Hold a finger on the board: the snake\'s head follows it', until: never, max: 5 },
  eat: { id: 'eat', mouse: 'Catch mice and frogs to grow longer', touch: 'Catch mice and frogs to grow longer', until: is('eat'), max: 14 },
  strike: { id: 'strike', mouse: 'Click or Space to strike: a quick lunge', touch: 'Tap to strike: a quick lunge', after: is('eat'), until: is('strike'), max: 10 },
  knot: { id: 'knot', mouse: 'One life: don\'t bite your own body!', touch: 'One life: don\'t bite your own body!', until: never, max: 6 },
  coil: {
    id: 'coil', mouse: 'Rats are too big to swallow: circle round one to coil it', touch: 'Rats are too big to swallow: circle round one to coil it',
    until: is('squeeze'), max: 25,
  },
  crow: { id: 'crow', mouse: 'A crow pecks your tail! Strike it to scare it off', touch: 'A crow pecks your tail! Tap to strike and scare it off', after: arrived('crow'), until: (e) => e.type === 'scared' && e.kind === 'crow', max: 14 },
  hawk: { id: 'hawk', mouse: 'A hawk! Get out of the red ring, or hide under the cabbages', touch: 'A hawk! Get out of the red ring, or hide under the cabbages', after: is('lock'), until: (e) => e.type === 'miss' || e.type === 'hurt', max: 8 },
  cover: { id: 'cover', mouse: 'Under leaves the hawk can\'t see you', touch: 'Under leaves the hawk can\'t see you', after: (e) => e.type === 'miss' || e.type === 'hurt', until: never, max: 6 },
  feast: { id: 'feast', mouse: 'Eat the hen\'s eggs! A strike sends her flapping', touch: 'Eat the hen\'s eggs! A strike sends her flapping', until: (e) => e.type === 'eat' && e.kind === 'egg', max: 14 },
  rush: { id: 'rush', mouse: 'Grow before the clock runs out!', touch: 'Grow before the clock runs out!', until: never, max: 5 },
  dark: { id: 'dark', mouse: 'Night: you only see what\'s near you', touch: 'Night: you only see what\'s near you', until: never, max: 6 },
  venom: { id: 'venom', mouse: 'Too big to swallow? Strike it: it runs off, falls asleep, then swallow it', touch: 'Too big to swallow? Tap to strike it: it runs off, falls asleep, then swallow it', until: is('bite'), max: 18 },
  boss: { id: 'boss', mouse: 'Dodge the pounce, then strike the cat while it\'s off balance', touch: 'Dodge the pounce, then tap to strike the cat while it\'s off balance', after: is('crouch'), until: is('bossHit'), max: 16 },
};

/** A hint by id: a shared one, or one a chapter adds. */
function hintFor(id: Teach): Hint | null {
  const own = HINTS[id];
  if (own) return own;
  const c = CHAPTER_HINTS[id];
  if (!c) return null;
  return {
    id, mouse: c.mouse, touch: c.touch, max: c.max ?? 12,
    ...(c.after ? { after: (e: WorldEvent) => e.type === c.after } : {}),
    until: c.until ? (e: WorldEvent) => e.type === c.until : never,
  };
}

/** A level's twist is told for this long as it starts, s. */
const TWIST_FOR = 6;

/**
 * First-time hints for a level's `teach` list, one at a time: each shows
 * once its moment comes and goes when the player has done the thing (or
 * after a while). A level's twist (already worded) is told first.
 */
export class Coach {
  private queue: Hint[];
  private shownFor = 0;
  private started = false;

  constructor(teach: readonly Teach[], twists: readonly string[] = []) {
    const told = twists.map((text): Hint => ({ id: 'twist', mouse: text, touch: text, until: never, max: TWIST_FOR }));
    this.queue = [...told, ...teach.map(hintFor).filter((h): h is Hint => h !== null)];
  }

  /** The hint to show now, if any. */
  current(touch: boolean): string | null {
    const h = this.queue[0];
    return h && this.started ? (touch ? h.touch : h.mouse) : null;
  }

  observe(events: readonly WorldEvent[], dt: number): void {
    const h = this.queue[0];
    if (!h) return;
    if (!this.started && (!h.after || events.some(h.after))) this.started = true;
    if (!this.started) return;
    this.shownFor += dt;
    if (events.some(h.until) || this.shownFor > h.max) {
      this.queue = this.queue.slice(1);
      this.shownFor = 0;
      this.started = false;
    }
  }
}
