import { BURST_REACH, HEDGEHOG_EATS, HEDGEHOG_SPEED, RAIN_HALF } from './charms';
import type { ColourId } from './colours';
import { D, type Line, type LineEvent, type Marble } from './line';
import { pointAt, type Pt } from './path';

/** Picks which of a line's marbles a charm pops. */
export type Pick = (line: Line, li: number) => readonly Marble[];

/** The Ink Pot: every open marble of one colour. */
export const ofColour = (colour: ColourId): Pick => (line) => line.marbles.filter((m) => m.s >= 0 && !m.stone && m.colour === colour);

/** Rain: every marble in a column down the board, but those under cover (`covered`). */
export const inColumn = (x: number, covered: (li: number, s: number) => boolean): Pick => (line, li) =>
  line.marbles.filter((m) => m.s >= 0 && !covered(li, m.s) && Math.abs(pointAt(line.path, m.s).x - x) <= RAIN_HALF);

/** Burst: every marble within its reach of `at`. */
export const nearPoint = (at: Pt): Pick => (line) => line.marbles.filter((m) => {
  if (m.s < 0) return false;
  const p = pointAt(line.path, m.s);
  return Math.hypot(p.x - at.x, p.y - at.y) <= BURST_REACH * D;
});

/** The Hedgehog trundling up a line from its well, and how many more marbles it will eat. */
export interface Hedgehog {
  readonly line: number;
  s: number;
  left: number;
}

/** The line nearest its well, for the Hedgehog to set off up (null if every line is empty). */
export function hedgehogLine(lines: readonly Line[]): number | null {
  let best: number | null = null;
  let most = -1;
  lines.forEach((l, i) => {
    const share = l.marbles.length ? l.front() / l.path.length : -1;
    if (l.marbles.length && share > most) {
      most = share;
      best = i;
    }
  });
  return best;
}

export function sendHedgehog(line: number, length: number): Hedgehog {
  return { line, s: length, left: HEDGEHOG_EATS };
}

/**
 * Moves the Hedgehog on: it scurries along empty track and slows to nibble
 * at the line, eating its front marble whenever it reaches it. Returns the
 * marble to eat now, if any (the board pops it).
 */
export function stepHedgehog(h: Hedgehog, line: Line, dt: number): Marble | null {
  const front = line.marbles[line.marbles.length - 1];
  const far = !front || h.s - front.s > D * 3;
  h.s -= HEDGEHOG_SPEED * (far ? 3.5 : 1) * dt;
  if (!front || front.s < 0 || front.s + D * 0.5 < h.s) return null;
  h.s = Math.min(h.s, front.s + D * 0.5);
  h.left--;
  return front;
}

/** Whether the Hedgehog is done: full, at the burrow, or with nothing left out to eat. */
export function hedgehogDone(h: Hedgehog, line: Line): boolean {
  return h.left <= 0 || h.s <= 0 || !line.marbles.some((m) => m.s >= 0);
}

/**
 * Puts a marble into a line beside its open marble nearest `near` (not in
 * the burrow, the last stretch to the well, or under cover): the line's
 * events, or null if no marble is open.
 */
export function dropNear(line: Line, near: Pt, colour: ColourId, bud: boolean, covered: (s: number) => boolean): LineEvent[] | null {
  let best = -1;
  let bestD = Infinity;
  // Pushing a marble in shoves the touching run ahead of it on by one: that run's front must have room before the well.
  const room = (i: number): boolean => {
    let j = i;
    while (j + 1 < line.marbles.length && line.marbles[j + 1]!.s - line.marbles[j]!.s <= D + 0.5) j++;
    return line.marbles[j]!.s < line.path.length - D * 1.5;
  };
  line.marbles.forEach((m, i) => {
    if (m.s < D || m.s > line.path.length - D * 2 || covered(m.s) || !room(i)) return;
    const p = pointAt(line.path, m.s);
    const d = Math.hypot(p.x - near.x, p.y - near.y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  if (best < 0) return null;
  const events: LineEvent[] = [];
  const m = line.insert(best, 'back', colour, null, events);
  if (bud) m.bud = true;
  return events;
}
