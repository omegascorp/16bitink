import { centre, type Item } from './items';
import { canWear, SHELLS } from './shells';
import type { Beach, SimEvent } from './sim';

/** Something a level teaches, step by step, with a hint shown only while it's relevant. */
export type Lesson = 'move' | 'swap' | 'dig' | 'drop' | 'hide' | 'buried';

export type Controls = 'keys' | 'touch';

export interface Hint {
  readonly lesson: Lesson;
  readonly text: string;
  /** A world point to draw an arrow over, when there's somewhere to go. */
  readonly target?: { readonly x: number; readonly y: number };
}

/** How close (tiles) a bigger ghost crab gets before the hide lesson speaks up. */
const DANGER_TILES = 7;
/** How far (tiles) a buried shell can be and still be pointed out. */
const BURIED_TILES = 14;

const TEXT: Readonly<Record<Controls, Readonly<Record<string, string>>>> = {
  keys: {
    move: 'Walk with ← →, jump with Space. Eat food to grow.',
    swap: 'Your shell is full! Walk to the bigger shell and press E to move in.',
    dig: 'Press X to dig. Hold ↓ or ↑ to dig down or up.',
    drop: 'You\'re carrying sand. Press C to drop it; jump, then ↓ + C to build up under you.',
    full: 'You\'re full of sand. Drop some with C before you dig more.',
    hide: 'A red ghost crab can catch you! Hold Z to hide in your shell.',
    buried: 'A highlighter smudge in the sand is something buried. Dig down to it: ↓ + X.',
  },
  touch: {
    move: 'Steer with the stick, jump with the button. Eat food to grow.',
    swap: 'Your shell is full! Walk to the bigger shell and tap it to move in.',
    dig: 'Tap sand next to the crab to dig it.',
    drop: 'You\'re carrying sand. Tap open space next to the crab to drop it.',
    full: 'You\'re full of sand. Tap open space to drop some before you dig more.',
    hide: 'A red ghost crab can catch you! Hold the shell button to hide.',
    buried: 'A highlighter smudge in the sand is something buried. Tap the sand to dig down to it.',
  },
};

/**
 * The tutorial: watches play and offers one hint at a time for the lessons
 * a level teaches. Each lesson ends once the player has done it (eaten,
 * moved house, dug, dropped sand, hidden from a hunter, uncovered a shell),
 * so it never nags about something already learnt.
 */
export class Coach {
  private readonly done = new Set<Lesson>();
  private lastSand = 0;

  constructor(private readonly lessons: readonly Lesson[]) {}

  /** Marks lessons learnt from what just happened. Call after each step. */
  observe(beach: Beach, events: readonly SimEvent[]): void {
    const c = beach.crab;
    for (const e of events) {
      if (e.type === 'ate') this.done.add('move');
      else if (e.type === 'swapDone') this.done.add('swap');
      else if (e.type === 'tiles' && e.dug) this.done.add('dig');
      else if (e.type === 'revealed' && beach.items.get(e.id)?.kind.type === 'shell') this.done.add('buried');
    }
    if (c.sand < this.lastSand) this.done.add('drop');
    this.lastSand = c.sand;
    if (c.hidden && this.hunterNear(beach)) this.done.add('hide');
  }

  learnt(lesson: Lesson): boolean {
    return this.done.has(lesson);
  }

  /** The hint to show now, most urgent first, or null. */
  hint(beach: Beach, controls: Controls): Hint | null {
    const t = TEXT[controls];
    const open = (l: Lesson): boolean => this.lessons.includes(l) && !this.done.has(l);
    const c = beach.crab;
    if (open('hide') && this.hunterNear(beach) && !c.hidden) return { lesson: 'hide', text: t.hide! };
    if (open('swap') && beach.capped) {
      const shell = this.biggerShell(beach);
      if (shell) return { lesson: 'swap', text: t.swap!, target: centre(shell) };
    }
    if (this.lessons.includes('drop') && c.sand >= beach.sandCapacity) return { lesson: 'drop', text: t.full! };
    if (open('buried')) {
      const shell = this.buriedShell(beach);
      if (shell) return { lesson: 'buried', text: t.buried!, target: centre(shell) };
    }
    if (open('move')) return { lesson: 'move', text: t.move! };
    if (open('dig')) return { lesson: 'dig', text: t.dig! };
    if (open('drop') && c.sand > 0) return { lesson: 'drop', text: t.drop! };
    return null;
  }

  private hunterNear(beach: Beach): boolean {
    const c = beach.crab;
    const at = centre(c.body);
    const reach = DANGER_TILES * beach.tileSize;
    for (const k of beach.critters.values()) {
      if (k.size <= c.growth.size) continue;
      const p = centre(k);
      if (Math.abs(p.x - at.x) < reach && Math.abs(p.y - at.y) < reach) return true;
    }
    return false;
  }

  /** The nearest loose shell that fits and lets the crab grow past its current cap. */
  private biggerShell(beach: Beach): Item | null {
    const c = beach.crab;
    return this.nearest(beach, (i) => i.kind.type === 'shell' && !i.buried && canWear(SHELLS[i.kind.shell], c.growth.size) && SHELLS[i.kind.shell].maxSize > beach.cap);
  }

  /** A buried shell worth pointing out: close by, or the next one needed once the shell is full and nothing bigger lies in the open. */
  private buriedShell(beach: Beach): Item | null {
    const reach = BURIED_TILES * beach.tileSize;
    const at = centre(beach.crab.body);
    const shell = this.nearest(beach, (i) => i.kind.type === 'shell' && i.buried);
    if (!shell) return null;
    const needed = beach.capped && this.biggerShell(beach) === null;
    return needed || Math.abs(centre(shell).x - at.x) < reach ? shell : null;
  }

  private nearest(beach: Beach, ok: (i: Item) => boolean): Item | null {
    const at = centre(beach.crab.body);
    let best: Item | null = null;
    let bestD = Infinity;
    for (const i of beach.items.values()) {
      if (!ok(i)) continue;
      const p = centre(i);
      const d = Math.hypot(p.x - at.x, p.y - at.y);
      if (d < bestD) {
        best = i;
        bestD = d;
      }
    }
    return best;
  }
}
