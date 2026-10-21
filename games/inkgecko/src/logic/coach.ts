import type { Teach } from '../level/types';
import type { BoardEvent } from './board';

/** A hint, worded for a mouse or for a touch screen. */
interface Hint {
  readonly id: Teach;
  readonly mouse: string;
  readonly touch: string;
  /** Shown once an event like this happens (immediately when absent). */
  readonly after?: (e: BoardEvent) => boolean;
  /** Done once an event like this happens. */
  readonly until: (e: BoardEvent) => boolean;
  /** Gone after this long on screen anyway, s. */
  readonly max: number;
}

const is = (type: BoardEvent['type']) => (e: BoardEvent): boolean => e.type === type;
const charmed = (charm: string) => (e: BoardEvent): boolean => (e.type === 'charm' || e.type === 'caught') && e.charm === charm;

const HINTS: Readonly<Record<Teach, Hint>> = {
  spit: { id: 'spit', mouse: 'Click to spit a marble. Three of a colour pop!', touch: 'Tap to spit a marble. Three of a colour pop!', until: is('pop'), max: 30 },
  swap: { id: 'swap', mouse: 'Right-click or Space swaps the marble on its tail', touch: 'Tap the gecko to swap the marble on its tail', after: (e) => e.type === 'pop', until: is('swap'), max: 9 },
  pull: { id: 'pull', mouse: 'Matching colours either side of a gap pull together: combo!', touch: 'Matching colours either side of a gap pull together: combo!', until: is('pull'), max: 10 },
  rail: { id: 'rail', mouse: 'Move to run along the branch, click to spit straight up', touch: 'Tap above a marble: the gecko runs there and spits', until: is('pop'), max: 25 },
  catch: { id: 'catch', mouse: 'A charm is falling: run under it to catch it!', touch: 'A charm is falling: tap under it to catch it!', after: (e) => e.type === 'drop', until: is('caught'), max: 6 },
  hop: { id: 'hop', mouse: 'Click another lily pad to hop onto it (or Q / E)', touch: 'Tap another lily pad to hop onto it', until: is('landed'), max: 14 },
  tunnel: { id: 'tunnel', mouse: 'Marbles under the log are hidden: hit them where they come out', touch: 'Marbles under the log are hidden: hit them where they come out', until: is('pop'), max: 9 },
  dragonfly: {
    id: 'dragonfly', mouse: 'A Dragonfly! Your next spit flies through every marble it touches', touch: 'A Dragonfly! Your next spit flies through every marble it touches',
    after: charmed('dragonfly'), until: is('spit'), max: 8,
  },
  cross: { id: 'cross', mouse: 'Where lines cross, marbles in the tunnel are hidden: hit the ones on top', touch: 'Where lines cross, marbles in the tunnel are hidden: hit the ones on top', until: is('pop'), max: 9 },
  inkpot: { id: 'inkpot', mouse: 'The Ink Pot pops every marble of its colour!', touch: 'The Ink Pot pops every marble of its colour!', after: charmed('inkpot'), until: is('spit'), max: 5 },
  fruit: { id: 'fruit', mouse: 'Spit the rolling fruit: points and a free charm!', touch: 'Tap the rolling fruit: points and a free charm!', after: is('windfall'), until: is('fruit'), max: 8 },
  bud: { id: 'bud', mouse: 'Buds don\'t pop: match one and it blossoms, then it can', touch: 'Buds don\'t pop: match one and it blossoms, then it can', until: is('blossom'), max: 14 },
  stone: { id: 'stone', mouse: 'Stones match nothing: pop the marbles beside them to break them', touch: 'Stones match nothing: pop the marbles beside them to break them', until: (e) => e.type === 'pop' && e.marbles.some((m) => m.stone), max: 14 },
  geode: { id: 'geode', mouse: 'A Geode! Your next spit turns the colour of whatever it hits', touch: 'A Geode! Your next spit turns the colour of whatever it hits', after: charmed('geode'), until: is('spit'), max: 8 },
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
    if (events.some(h.until) || this.shownFor > h.max) {
      this.queue = this.queue.slice(1);
      this.shownFor = 0;
      this.started = false;
    }
  }
}
