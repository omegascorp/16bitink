import type { Teach } from '../level/types';
import type { BoardEvent } from './board';

/** A hint, worded for a mouse or for a touch screen. */
interface Hint {
  readonly id: Teach;
  readonly mouse: string;
  readonly touch: string;
  /** Shown once an event like this happens (immediately when absent). */
  readonly after?: (e: BoardEvent) => boolean;
  /** Done once this event happens. */
  readonly until: BoardEvent['type'];
  /** Gone after this long on screen anyway, s. */
  readonly max: number;
}

const HINTS: Readonly<Record<Teach, Hint>> = {
  spit: { id: 'spit', mouse: 'Click to spit a marble. Three of a colour pop!', touch: 'Tap to spit a marble. Three of a colour pop!', until: 'pop', max: 30 },
  swap: { id: 'swap', mouse: 'Right-click or Space swaps the marble on its tail', touch: 'Tap the gecko to swap the marble on its tail', after: (e) => e.type === 'pop', until: 'swap', max: 9 },
  pull: { id: 'pull', mouse: 'Matching colours either side of a gap pull together: combo!', touch: 'Matching colours either side of a gap pull together: combo!', until: 'pull', max: 10 },
  rail: { id: 'rail', mouse: 'Move to run along the branch, click to spit straight up', touch: 'Tap above a marble: the gecko runs there and spits', until: 'pop', max: 25 },
  catch: { id: 'catch', mouse: 'A charm is falling: run under it to catch it!', touch: 'A charm is falling: tap under it to catch it!', after: (e) => e.type === 'drop', until: 'caught', max: 6 },
  hop: { id: 'hop', mouse: 'Click another lily pad to hop onto it (or Q / E)', touch: 'Tap another lily pad to hop onto it', until: 'landed', max: 14 },
  tunnel: { id: 'tunnel', mouse: 'Marbles under the log are hidden: hit them where they come out', touch: 'Marbles under the log are hidden: hit them where they come out', until: 'pop', max: 9 },
  dragonfly: {
    id: 'dragonfly', mouse: 'A Dragonfly! Your next spit flies through every marble it touches', touch: 'A Dragonfly! Your next spit flies through every marble it touches',
    after: (e) => (e.type === 'charm' || e.type === 'caught') && e.charm === 'dragonfly', until: 'spit', max: 8,
  },
};

/**
 * First-time hints for a level's `teach` list, one at a time: each shows
 * once its moment comes and goes when the player has done the thing (or
 * after a while).
 */
export class Coach {
  private queue: Hint[];
  private shownFor = 0;
  private started = false;

  constructor(teach: readonly Teach[]) {
    this.queue = teach.map((t) => HINTS[t]);
  }

  /** The hint to show now, if any. */
  current(touch: boolean): string | null {
    const h = this.queue[0];
    return h && this.started ? (touch ? h.touch : h.mouse) : null;
  }

  observe(events: readonly BoardEvent[], dt: number): void {
    const h = this.queue[0];
    if (!h) return;
    if (!this.started && (!h.after || events.some(h.after))) this.started = true;
    if (!this.started) return;
    this.shownFor += dt;
    if (events.some((e) => e.type === h.until) || this.shownFor > h.max) {
      this.queue = this.queue.slice(1);
      this.shownFor = 0;
      this.started = false;
    }
  }
}
