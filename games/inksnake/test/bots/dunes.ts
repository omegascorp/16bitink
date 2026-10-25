import { LANE_HALF, Roadrunner } from '../../src/logic/chapters/dunesRoadrunner';
import { Charger } from '../../src/logic/enemies/charger';
import { Chaser } from '../../src/logic/enemies/chaser';
import { Diver } from '../../src/logic/enemies/diver';
import { DUNES_PREY } from '../../src/logic/chapters/dunesPrey';
import type { Enemy } from '../../src/logic/enemyTypes';
import { catchable, type Prey } from '../../src/logic/preyTypes';
import type { Snake } from '../../src/logic/snake';
import type { SnakeInput } from '../../src/logic/snake';
import { SPACING } from '../../src/logic/trail';
import { dist, nearestOnSegment, pt, wrapAngle, type Pt } from '../../src/logic/vec';
import type { World } from '../../src/logic/world';
import { BOARD } from '../../src/level/types';
import type { BotHook } from './types';

export const DEBUG = { branch: '', sub: '' };

/** Hold the ability, still: bury (or stay buried). */
const BURY: SnakeInput = { toward: null, face: null, strike: false, ability: true };

/**
 * The sidewinder's habits: it buries when a coyote chases it, when a hawk
 * locks on, and when the Roadrunner lines up a dash through it (or slips
 * out of the lane off the sand); it strikes the Roadrunner while it skids.
 * It keeps away from a kingsnake's head, strikes kangaroo rats (while they
 * kick sand) to envenom them, follows them and swallows them asleep.
 */
export const bot: BotHook = (w) => {
  const ab = w.ability;
  if (ab?.id !== 'bury') return null;
  const tries: [string, (w: World) => SnakeInput | null][] = [['rr', roadrunner], ['devil', dustDevil], ['coyote', coyote], ['king', kingsnake], ['hawk', hawk], ['loop', unloop], ['rat', kangarooRat], ['corner', corner]];
  for (const [name, f] of tries) {
    const r = f(w);
    if (r) {
      DEBUG.branch = name === 'rat' ? `rat-${DEBUG.sub}` : name;
      return r;
    }
  }
  DEBUG.branch = 'shared';
  return null;
};

/** Whether it can bury now (or is already burying). */
function canBury(w: World): boolean {
  const ab = w.ability!;
  return w.inZone(w.snake.head, 'sand') && (ab.active || ab.charge >= 1);
}

function roadrunner(w: World): SnakeInput | null {
  const rr = w.boss;
  if (!(rr instanceof Roadrunner)) return null;
  const h = w.snake.head;
  if (rr.mode === 'skid') return chase(w, rr, 72);
  const lane = rr.lane;
  if (!lane || (rr.mode !== 'aim' && rr.mode !== 'dash')) return null;
  const near = dist(nearestOnSegment(h, lane.from, lane.to), h) < LANE_HALF + w.snake.width + 26;
  // Already down in the sand: stay there until it has run past.
  if (w.ability!.active && (near || rr.mode === 'dash')) return BURY;
  if (!near) return null;
  if (canBury(w)) return BURY;
  // Off the sand: out of the lane sideways.
  const la = Math.atan2(lane.to.y - lane.from.y, lane.to.x - lane.from.x);
  const side = Math.sign(-(h.x - lane.from.x) * Math.sin(la) + (h.y - lane.from.y) * Math.cos(la)) || 1;
  return { toward: clear(w, pt(h.x - Math.sin(la) * side * 200, h.y + Math.cos(la) * side * 200)), face: null, strike: false };
}

/** A dust devil's lane showing: head out of it sideways, the near way. */
function dustDevil(w: World): SnakeInput | null {
  const h = w.snake.head;
  for (const e of w.enemies) {
    if (!(e instanceof Charger) || e.mode !== 'warn' || !e.lane) continue;
    const { from, to } = e.lane;
    if (dist(nearestOnSegment(h, from, to), h) > e.spec.halfWidth + w.snake.width + 30) continue;
    const la = Math.atan2(to.y - from.y, to.x - from.x);
    const side = Math.sign(-(h.x - from.x) * Math.sin(la) + (h.y - from.y) * Math.cos(la)) || 1;
    return { toward: clear(w, pt(h.x - Math.sin(la) * side * 200, h.y + Math.cos(la) * side * 200)), face: null, strike: false };
  }
  return null;
}

function hawk(w: World): SnakeInput | null {
  for (const e of w.enemies) {
    if (!(e instanceof Diver) || e.away) continue;
    const locked = (e.mode === 'lock' || e.mode === 'dive') && e.ring && dist(w.snake.head, e.ring) < 120;
    // Locked on: go under; once under, stay until it gives up and flies off.
    if ((locked || (w.ability!.active && e.mode === 'circle')) && canBury(w)) return BURY;
  }
  return null;
}

function coyote(w: World): SnakeInput | null {
  const s = w.snake;
  const h = s.head;
  const near = w.enemies.filter((e): e is Chaser => e instanceof Chaser && !e.away && e.mode !== 'flee' && dist(e, h) < 200);
  if (!near.length) return null;
  const by = (list: readonly Chaser[]): Chaser | undefined => [...list].sort((a, b) => dist(a, h) - dist(b, h))[0];
  const hunter = by(near.filter((e) => e.mode === 'chase'));
  // Burying doesn't hide it from a kingsnake's nose: with one about, keep moving instead.
  const safe = !kingsnakeNear(w, 230);
  // Down in the sand while one still hunts; once they've lost us (back to prowling, bored a while), up and on.
  if (w.ability!.active && hunter && safe) return BURY;
  // Sinking takes a moment it mustn't close in on.
  if (hunter && dist(hunter, h) > 120 && canBury(w) && safe) return BURY;
  const close = by(near.filter((e) => dist(e, h) < 170));
  if (!close) return null;
  // Face to face with the strike ready: at its nose. Otherwise outrun it (on sand it's the slower).
  const facing = Math.cos(Math.atan2(close.y - h.y, close.x - h.x) - s.heading) > 0.6;
  if (facing && s.strikeRest <= 0 && close.mode !== 'bite') return chase(w, close, 64);
  const threat = hunter && dist(hunter, h) < 170 ? hunter : dist(close, h) < 130 ? close : null;
  return threat ? away(w, threat) : null;
}

/**
 * A rival snake on the board (the kingsnake), told by its body: this file
 * keeps off enemies/rival.ts, which imports logic/prey.ts and so the whole
 * chapter registry (a cycle when the bots load first).
 */
function rivalBody(e: Enemy): Snake | null {
  return 'snake' in e && !e.away ? (e as Enemy & { readonly snake: Snake }).snake : null;
}

function kingsnakeNear(w: World, within: number): boolean {
  return w.enemies.some((e) => {
    const k = rivalBody(e);
    return k !== null && dist(k.head, w.snake.head) < within;
  });
}

function kingsnake(w: World): SnakeInput | null {
  const h = w.snake.head;
  for (const e of w.enemies) {
    const body = rivalBody(e);
    if (!body || dist(body.head, h) > 180 || body.width <= w.snake.width * 1.04) continue;
    return away(w, body.head);
  }
  return null;
}

/** Kangaroo rats: swallow a sleeping one, follow a staggering one, and strike one worth going for. */
function kangarooRat(w: World): SnakeInput | null {
  const s = w.snake;
  const h = s.head;
  const rats = w.prey.filter((p) => p.kind === 'kangaroo-rat' && catchable(p));
  const nearest = (list: readonly Prey[]): Prey | null => list.reduce<Prey | null>((b, p) => (!b || dist(p, h) < dist(b, h) ? p : b), null);
  const asleep = nearest(rats.filter((p) => p.mode === 'sleep'));
  if (asleep) {
    DEBUG.sub = 'asleep';
    return approach(w, asleep, 0);
  }
  // Bitten: it reels off and falls asleep; hang back rather than circle it tight.
  const reeling = nearest(rats.filter((p) => p.mode === 'stagger'));
  if (reeling) {
    DEBUG.sub = 'reel';
    return approach(w, reeling, 90);
  }
  const rat = nearest(rats);
  if (!rat) return null;
  const small = nearest(w.prey.filter((p) => catchable(p) && (DUNES_PREY[p.kind]?.size ?? 99) <= s.gape));
  const g = w.level.goal;
  const feast = g?.kind === 'feast' && g.food === 'kangaroo-rat' && w.feasted < g.count;
  if (!feast && small && dist(small, h) < dist(rat, h) * 0.8) return null;
  DEBUG.sub = 'hunt';
  return chase(w, rat, 76);
}

/**
 * Heads for `p` without circling it tight (a loop that small would close on
 * its own body): too close and off to one side, it runs on straight to come
 * round wider. `keep` px it hangs back.
 */
function approach(w: World, p: Pt, keep: number): SnakeInput {
  const s = w.snake;
  const h = s.head;
  const d = dist(h, p);
  const rel = Math.atan2(p.y - h.y, p.x - h.x) - s.heading;
  const off = Math.abs(Math.atan2(Math.sin(rel), Math.cos(rel)));
  const radius = s.spec.speed / s.spec.turn;
  // Too close, or off to one side inside its tightest turn: run on straight, to come round wider.
  const tight = off < Math.PI / 2 ? d < 2.2 * radius * Math.sin(off) : d < 2.4 * radius;
  if (d < keep || tight) return { toward: clear(w, pt(h.x + Math.cos(s.heading) * 120, h.y + Math.sin(s.heading) * 120)), face: null, strike: false };
  return { toward: clear(w, p), face: null, strike: false };
}

/** Frames of turning remembered (two seconds), and how much turning one way in them means a loop closing. */
const LOOP_FRAMES = 120;
const LOOP_TURN = Math.PI * 1.45;
const turning = new WeakMap<World, { last: number; turns: number[]; sum: number; straightUntil: number }>();

/**
 * Chasing a dodging meal round and round, the head would close a loop on
 * its own body: after most of a full turn one way, it runs straight a moment.
 */
function unloop(w: World): SnakeInput | null {
  const s = w.snake;
  let m = turning.get(w);
  if (!m) {
    m = { last: s.heading, turns: [], sum: 0, straightUntil: 0 };
    turning.set(w, m);
  }
  const d = wrapAngle(s.heading - m.last);
  m.last = s.heading;
  m.turns.push(d);
  m.sum += d;
  if (m.turns.length > LOOP_FRAMES) m.sum -= m.turns.shift()!;
  if (Math.abs(m.sum) > LOOP_TURN) {
    m.straightUntil = w.elapsed + 0.6;
    m.turns.length = 0;
    m.sum = 0;
  }
  if (w.elapsed >= m.straightUntil) return null;
  const h = s.head;
  return { toward: clear(w, pt(h.x + Math.cos(s.heading) * 120, h.y + Math.sin(s.heading) * 120)), face: null, strike: false };
}

/**
 * Heading into a wall or a corner: back out towards the middle before the
 * walls slide the head round onto its own body.
 */
function corner(w: World): SnakeInput | null {
  const s = w.snake;
  const h = s.head;
  const m = 95;
  const cx = h.x < m ? -1 : h.x > BOARD.w - m ? 1 : 0;
  const cy = h.y < m ? -1 : h.y > BOARD.h - m ? 1 : 0;
  const intoCorner = cx !== 0 && cy !== 0 && Math.cos(s.heading) * cx + Math.sin(s.heading) * cy > 0;
  const wall = 48;
  const intoWall = (h.x < wall && Math.cos(s.heading) < -0.5) || (h.x > BOARD.w - wall && Math.cos(s.heading) > 0.5)
    || (h.y < wall && Math.sin(s.heading) < -0.5) || (h.y > BOARD.h - wall && Math.sin(s.heading) > 0.5);
  if (!intoCorner && !intoWall) return null;
  return { toward: clear(w, pt(BOARD.w / 2, BOARD.h / 2)), face: null, strike: false };
}

/** Turns away from `e`, round the edges and its own body. */
function away(w: World, e: Pt): SnakeInput {
  const h = w.snake.head;
  const a0 = Math.atan2(h.y - e.y, h.x - e.x);
  for (const off of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) {
    const a = a0 + off;
    if (free(w, a, 90)) return { toward: pt(h.x + Math.cos(a) * 150, h.y + Math.sin(a) * 150), face: null, strike: false };
  }
  return { toward: clear(w, pt(h.x + Math.cos(a0) * 150, h.y + Math.sin(a0) * 150)), face: null, strike: false };
}

function chase(w: World, e: Pt, reach: number): SnakeInput {
  const h = w.snake.head;
  const ahead = Math.cos(Math.atan2(e.y - h.y, e.x - h.x) - w.snake.heading) > 0.85;
  return { toward: clear(w, e), face: null, strike: dist(h, e) < reach && ahead && free(w, w.snake.heading, 90) };
}

/** Bends a wanted point aside if heading for it would run the head into its own body. */
function clear(w: World, want: Pt): Pt {
  const h = w.snake.head;
  const base = Math.atan2(want.y - h.y, want.x - h.x);
  for (const off of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.3, -2.3, Math.PI]) {
    const a = base + off;
    if (free(w, a)) return off === 0 ? want : pt(h.x + Math.cos(a) * 120, h.y + Math.sin(a) * 120);
  }
  return want;
}

function free(w: World, a: number, far = 60): boolean {
  const s = w.snake;
  const pts = s.trail.pts;
  const reach = s.width * 2.2;
  for (const look of [20, 40, far]) {
    const p = pt(s.head.x + Math.cos(a) * look, s.head.y + Math.sin(a) * look);
    if (p.x < 10 || p.y < 10 || p.x > BOARD.w - 10 || p.y > BOARD.h - 10) return false;
    for (let i = s.neck + Math.ceil(look / SPACING); i < s.trail.count; i++) if (dist(p, pts[i]!) < reach) return false;
  }
  return true;
}
