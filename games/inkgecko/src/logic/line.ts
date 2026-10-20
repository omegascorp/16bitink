import { CHARM_FADES_AFTER, type CharmId } from './charms';
import type { ColourId } from './colours';
import type { Path } from './path';

/** A marble's width, board px. */
export const D = 32;
/** Marbles this close (centre to centre) touch. */
const TOUCH = D + 0.5;
/** How fast the front of a gap rolls back to close it when the colours match, board px/s. */
export const PULL_SPEED = 560;
/** How fast the line rolls back after a marble falls in the well. */
export const REWIND_SPEED = 900;
/** A shot settles into the line for this long before it can pop. */
export const SETTLE = 0.12;
/** Two parts meeting get this long before their seam pops, so the meeting is seen. */
const SEAM_SETTLE = 0.05;
/** The line rushes out of the burrow at the start of a level, this much faster, until its front is this far along. */
export const RUSH_FACTOR = 8;
export const RUSH_UNTIL = 0.3;
/** Most marbles the burrow lets out in one step (a long frame shouldn't spill a whole level). */
const MAX_SPAWN_PER_STEP = 8;

export interface Marble {
  readonly id: number;
  readonly colour: ColourId;
  /** Distance along the track; below 0 it's still in the burrow. */
  s: number;
  charm: CharmId | null;
  charmAge: number;
}

export type LineEvent =
  /** Marbles popped: `combo` counts the rollbacks that led here (0 for a plain pop); `shot` the shot that caused it, if one did. */
  | { readonly type: 'pop'; readonly marbles: readonly Marble[]; readonly combo: number; readonly shot: number | null }
  /** The front of a gap started rolling back to close it. */
  | { readonly type: 'pull'; readonly s: number }
  /** Two parts of the line met. */
  | { readonly type: 'join'; readonly s: number }
  /** A marble rolled into the well. */
  | { readonly type: 'fell'; readonly marble: Marble };

interface Check {
  readonly id: number;
  readonly at: number;
  readonly combo: number;
  readonly shot: number | null;
}

/**
 * One track's line of marbles, ordered from the back (burrow) to the front
 * (well). The part holding the newest marble from the burrow is pushed at
 * the level's speed; parts ahead of a gap stand still unless the colours
 * either side of the gap match, when they roll back to close it.
 */
export class Line {
  marbles: Marble[] = [];
  /** The newest marble out of the burrow: its part of the line is the one pushed. */
  tail: number | null = null;
  /** The burrow still lets marbles out (until the level's bar fills). */
  spawning = true;
  /** Rushing out at the start of the level. */
  rushing = true;
  /** Distance still to roll back after a marble fell in. */
  rewind = 0;
  private time = 0;
  private checks: Check[] = [];
  /** A gap's front part (by its back marble's id) and the combo of the pop that opened the gap. */
  private readonly gaps = new Map<number, number>();
  /** Touching neighbours as "backId:frontId", to tell when two parts meet. */
  private pairs = new Set<string>();
  /** Shot marbles still in the line (marble id → shot id), so a pop that takes one counts for its shot. */
  private readonly shots = new Map<number, number>();

  constructor(
    readonly path: Path,
    private readonly spawnColour: (behind: readonly ColourId[]) => ColourId,
    private readonly nextId: () => number,
  ) {}

  /** Where the front marble is (0 when empty). */
  front(): number {
    return this.marbles.length ? this.marbles[this.marbles.length - 1]!.s : 0;
  }

  /** Colours in the line, burrow included. */
  colours(): Set<ColourId> {
    return new Set(this.marbles.map((m) => m.colour));
  }

  /** Index of the marble with this id, or -1. */
  indexOf(id: number): number {
    return this.marbles.findIndex((m) => m.id === id);
  }

  /**
   * Lays a touching run of marbles with its back at `backS` (levels and
   * tests). `asTail` makes it the pushed part.
   */
  lay(colours: readonly ColourId[], backS: number, asTail = false): void {
    const fresh = colours.map((colour, i): Marble => ({ id: this.nextId(), colour, s: backS + i * D, charm: null, charmAge: 0 }));
    this.marbles = [...this.marbles, ...fresh].sort((a, b) => a.s - b.s);
    if (asTail && fresh[0]) this.tail = fresh[0].id;
    this.pairs = this.touchingPairs();
  }

  /** Advances the line by `dt` at `speed` (negative rolls the pushed part back). */
  step(dt: number, speed: number, events: LineEvent[]): void {
    this.time += dt;
    if (this.rewind > 0) {
      const d = Math.min(this.rewind, REWIND_SPEED * dt);
      this.rewind -= d;
      for (const m of this.marbles) m.s -= d;
    } else {
      this.move(dt, speed);
    }
    this.settle(events);
    this.spawn();
    if (this.rewind <= 0) this.fall(events);
    this.age(dt);
    this.runChecks(events);
  }

  /**
   * Puts a shot marble into the line next to marble `hit`, on the side it
   * hit (`front`: towards the well), making room by pushing the marbles
   * ahead, and returns it.
   */
  insert(hit: number, side: 'front' | 'back', colour: ColourId, shot: number | null, events: LineEvent[]): Marble {
    const h = Math.max(0, Math.min(this.marbles.length - 1, hit));
    const target = this.marbles[h];
    const i = side === 'front' ? h + 1 : h;
    const behind = this.marbles[i - 1];
    const ahead = this.marbles[i];
    // Against the marble it hit: in front of it, or behind it (pushing it on when the one behind it touches).
    const s = !target ? 0 : side === 'front' ? target.s + D : behind && target.s - behind.s <= TOUCH ? behind.s + D : target.s - D;
    const m: Marble = { id: this.nextId(), colour, s, charm: null, charmAge: 0 };
    // The shot joins the part it hit; if it also closes a gap, that seam is two parts meeting (see settle).
    const within = behind !== undefined && ahead !== undefined && ahead.s - behind.s <= TOUCH;
    this.marbles = [...this.marbles.slice(0, i), m, ...this.marbles.slice(i)];
    if (behind && (side === 'front' || within) && s - behind.s <= TOUCH) this.pairs.add(`${behind.id}:${m.id}`);
    if (ahead && (side === 'back' || within)) this.pairs.add(`${m.id}:${ahead.id}`);
    if (shot !== null) this.shots.set(m.id, shot);
    this.settle(events);
    this.checks.push({ id: m.id, at: this.time + SETTLE, combo: 0, shot });
    return m;
  }

  /** Pops the marbles with these ids, as one pop. */
  popIds(ids: ReadonlySet<number>, combo: number, shot: number | null, events: LineEvent[]): void {
    const popped = this.marbles.filter((m) => ids.has(m.id));
    if (!popped.length) return;
    // Each run of popped marbles leaves a gap: kept marbles either side of it.
    const sides: [Marble, Marble][] = [];
    let before: Marble | undefined;
    let gone = false;
    for (const m of this.marbles) {
      if (ids.has(m.id)) {
        gone = true;
        continue;
      }
      if (gone && before) sides.push([before, m]);
      before = m;
      gone = false;
    }
    this.marbles = this.marbles.filter((m) => !ids.has(m.id));
    this.pairs = this.touchingPairs();
    // A shot whose marble pops through a seam still counts for its streak.
    const by = shot ?? popped.map((m) => this.shots.get(m.id)).find((id) => id !== undefined) ?? null;
    for (const m of popped) {
      this.shots.delete(m.id);
      this.gaps.delete(m.id);
    }
    events.push({ type: 'pop', marbles: popped, combo, shot: by });
    // A gap whose sides match: its front rolls back, and its pop counts one more link.
    for (const [back, front] of sides) {
      if (back.colour !== front.colour) continue;
      this.gaps.set(front.id, combo);
      events.push({ type: 'pull', s: front.s });
    }
  }

  /** The pushed part moves; matching gaps close; everything that overlaps is pushed on. */
  private move(dt: number, speed: number): void {
    const parts = this.parts();
    const pushed = this.tail === null ? -1 : parts.findIndex((p) => p.some((m) => m.id === this.tail));
    // With the burrow shut and its part gone, the leftovers keep rolling from the back (else one could stop under a tunnel for good).
    const tailPart = pushed < 0 && !this.spawning ? 0 : pushed;
    const rush = this.rushing && this.front() < this.path.length * RUSH_UNTIL ? RUSH_FACTOR : 1;
    if (rush === 1) this.rushing = false;
    parts.forEach((part, k) => {
      if (k === tailPart) {
        for (const m of part) m.s += speed * rush * dt;
        return;
      }
      const prev = parts[k - 1];
      if (prev && prev[prev.length - 1]!.colour === part[0]!.colour) {
        for (const m of part) m.s -= PULL_SPEED * dt;
      }
    });
  }

  /** Pushes overlapping marbles apart (forward) and notices parts that met. */
  private settle(events: LineEvent[]): void {
    for (let i = 1; i < this.marbles.length; i++) {
      const min = this.marbles[i - 1]!.s + D;
      if (this.marbles[i]!.s < min) this.marbles[i]!.s = min;
    }
    const now = this.touchingPairs();
    for (const pair of now) {
      if (this.pairs.has(pair)) continue;
      const frontId = Number(pair.split(':')[1]);
      const opened = this.gaps.get(frontId);
      this.gaps.delete(frontId);
      const m = this.marbles[this.indexOf(frontId)]!;
      events.push({ type: 'join', s: m.s });
      this.checks.push({ id: frontId, at: this.time + SEAM_SETTLE, combo: opened === undefined ? 0 : opened + 1, shot: null });
    }
    this.pairs = now;
    // A gap entry only lasts while its marble is still the front of a gap.
    for (const id of this.gaps.keys()) {
      const i = this.indexOf(id);
      if (i <= 0 || this.marbles[i]!.s - this.marbles[i - 1]!.s <= TOUCH) this.gaps.delete(id);
    }
  }

  /** The burrow lets out the next marble once the pushed part's back has come clear of it. */
  private spawn(): void {
    if (!this.spawning || this.rewind > 0) return;
    for (let n = 0; n < MAX_SPAWN_PER_STEP; n++) {
      const back = this.backOfTailPart();
      if (back && back.s < 0) return;
      const s = back ? back.s - D : Math.min(0, this.marbles[0]?.s ?? 0) - D;
      const behind = this.marbles.slice(0, 2).map((m) => m.colour);
      const m: Marble = { id: this.nextId(), colour: this.spawnColour(behind), s, charm: null, charmAge: 0 };
      this.marbles = [m, ...this.marbles];
      if (back) this.pairs.add(`${m.id}:${back.id}`);
      this.tail = m.id;
    }
  }

  /** One marble a step into the well: the life it costs rolls the rest back before the next can follow. */
  private fall(events: LineEvent[]): void {
    const last = this.marbles[this.marbles.length - 1];
    if (!last || last.s < this.path.length) return;
    this.marbles = this.marbles.slice(0, -1);
    this.shots.delete(last.id);
    events.push({ type: 'fell', marble: last });
  }

  private age(dt: number): void {
    for (const m of this.marbles) {
      if (!m.charm) continue;
      m.charmAge += dt;
      if (m.charmAge > CHARM_FADES_AFTER) {
        m.charm = null;
        m.charmAge = 0;
      }
    }
  }

  /** Pops runs of 3+ round marbles whose settle time is up. */
  private runChecks(events: LineEvent[]): void {
    const due = this.checks.filter((c) => c.at <= this.time);
    if (!due.length) return;
    this.checks = this.checks.filter((c) => c.at > this.time);
    for (const c of due) {
      const i = this.indexOf(c.id);
      if (i < 0) continue;
      const run = this.runAt(i);
      if (run.length >= 3) this.popIds(new Set(run.map((m) => m.id)), c.combo, c.shot, events);
    }
  }

  /** The touching run of one colour through marble `i`. */
  private runAt(i: number): Marble[] {
    const colour = this.marbles[i]!.colour;
    let a = i;
    let b = i;
    while (a > 0 && this.marbles[a - 1]!.colour === colour && this.marbles[a]!.s - this.marbles[a - 1]!.s <= TOUCH) a--;
    while (b < this.marbles.length - 1 && this.marbles[b + 1]!.colour === colour && this.marbles[b + 1]!.s - this.marbles[b]!.s <= TOUCH) b++;
    return this.marbles.slice(a, b + 1);
  }

  /** The line split into touching parts, back to front. */
  private parts(): Marble[][] {
    const parts: Marble[][] = [];
    for (const m of this.marbles) {
      const last = parts[parts.length - 1];
      const prev = last?.[last.length - 1];
      if (last && prev && m.s - prev.s <= TOUCH) last.push(m);
      else parts.push([m]);
    }
    return parts;
  }

  /** The back marble of the pushed part, if there is one. */
  private backOfTailPart(): Marble | undefined {
    if (this.tail === null) return undefined;
    const part = this.parts().find((p) => p.some((m) => m.id === this.tail));
    if (!part) this.tail = null;
    return part?.[0];
  }

  private touchingPairs(): Set<string> {
    const out = new Set<string>();
    for (let i = 1; i < this.marbles.length; i++) {
      const a = this.marbles[i - 1]!;
      const b = this.marbles[i]!;
      if (b.s - a.s <= TOUCH) out.add(`${a.id}:${b.id}`);
    }
    return out;
  }
}
