import { BOARD } from '../../src/level/types';
import { BREATH_LOW } from '../../src/logic/abilities/krait';
import { EEL_KINDS, pokeOut } from '../../src/logic/chapters/reefPrey';
import { LANE_HALF, Shark } from '../../src/logic/chapters/reefShark';
import { Diver } from '../../src/logic/enemies/diver';
import { Drifter } from '../../src/logic/enemies/drifter';
import { preySpec, type Prey } from '../../src/logic/prey';
import type { SnakeInput } from '../../src/logic/snake';
import { SPACING } from '../../src/logic/trail';
import { clamp, dist, nearestOnSegment, pt, turnTowards, type Pt } from '../../src/logic/vec';
import type { World } from '../../src/logic/world';
import type { BotHook } from './types';

/** A full breath, s, and the margin the bot keeps when it heads up for air. */
const DIVE = 22;
const MARGIN = 4;
/** It waits for a hidden eel on a ring this wide round its hole, px. */
const WAIT_R = 105;

/**
 * The krait comes up for air on the nearest cay in good time and breathes
 * its fill there; it swims clear of box jellies and the shark's lane, dives
 * into deep water when the sea eagle's ring locks on, strikes eels as they
 * poke out of their holes (waiting nearby while they're in), follows a
 * bitten moray until it sleeps, and strikes the shark's snout while it turns.
 */
export const bot: BotHook = (w) => {
  if (w.ability?.id !== 'breath') return null;
  const s = w.snake;
  const h = s.head;
  const shark = w.boss instanceof Shark ? w.boss : null;
  const go = (to: Pt, strike = false): SnakeInput => ({ toward: clear(w, to), face: null, strike });

  // The shark's lane: straight out of it, sideways.
  if (shark?.lane && (shark.mode === 'tell' || shark.mode === 'charge')) {
    const { from, to } = shark.lane;
    const q = nearestOnSegment(h, from, to);
    if (dist(q, h) < LANE_HALF + 50) {
      const la = Math.atan2(to.y - from.y, to.x - from.x);
      let side = Math.sign((h.x - q.x) * -Math.sin(la) + (h.y - q.y) * Math.cos(la)) || 1;
      const out = (k: number): Pt => pt(h.x - Math.sin(la) * k * 220, h.y + Math.cos(la) * k * 220);
      if (!onBoard(out(side))) side = -side;
      return { toward: clear(w, out(side), false), face: null, strike: false };
    }
  }
  // The sea eagle's ring: back into deep water, away from the nearest cay.
  for (const e of w.enemies) {
    if (e instanceof Diver && e.ring && dist(h, e.ring) < e.spec.ringR + 70) {
      const c = nearestCay(w, h);
      const a = c ? Math.atan2(h.y - c.y, h.x - c.x) : Math.atan2(h.y - e.ring.y, h.x - e.ring.x);
      return go(pt(clamp(h.x + Math.cos(a) * 200, 30, BOARD.w - 30), clamp(h.y + Math.sin(a) * 200, 30, BOARD.h - 30)));
    }
  }
  // Breath: up onto the nearest cay in good time, and stay there till it's full.
  const breath = s.meter?.value ?? 1;
  const cay = nearestCay(w, h);
  const onLand = w.inZone(h, 'land');
  if (cay) {
    const swim = Math.max(0, dist(h, cay) - cay.r) / (s.spec.speed * 1.15);
    const openShark = shark?.open === true && breath > BREATH_LOW;
    if (!onLand && breath * DIVE < swim + MARGIN && !openShark) return go(cay);
    if (onLand && breath < 0.96) {
      const a = Math.atan2(h.y - cay.y, h.x - cay.x) + 1.1;
      return go(pt(cay.x + Math.cos(a) * cay.r * 0.45, cay.y + Math.sin(a) * cay.r * 0.45));
    }
  }
  // The shark turning after a charge: in for its snout.
  if (shark?.open) {
    const sn = shark.snout;
    return go(sn, dist(sn, h) < 85 && facing(w, sn, 0.8));
  }
  const target = pickPrey(w);
  if (!target) return go(pt(BOARD.w / 2, BOARD.h / 2));
  const spec = preySpec(target.kind);
  if (target.mode === 'hidden' && target.data && target.data.hx !== undefined) {
    // In its hole: wait on a wide ring round it, facing where it'll poke out.
    const hole = pt(target.data.hx, target.data.hy!);
    if (dist(h, hole) < WAIT_R * 1.4) {
      const a = Math.atan2(h.y - hole.y, h.x - hole.x) + 0.7;
      return go(pt(hole.x + Math.cos(a) * WAIT_R, hole.y + Math.sin(a) * WAIT_R));
    }
    return go(pokeOut(hole, target.data.dir ?? 0, 60));
  }
  const d = dist(h, target);
  const venom = spec.size > s.gape && target.mode !== 'sleep';
  return go(target, target.mode !== 'stagger' && d < (venom ? 70 : 80) && facing(w, target, 0.9) && free(w, s.heading, 70));
};

/** The meal to go for: a sleeping or staggering moray first, then whatever is nearest and catchable, a hidden eel last. */
function pickPrey(w: World): Prey | null {
  const s = w.snake;
  const g = w.level.goal;
  const feast = g?.kind === 'feast' && w.feasted < g.count;
  const jellies = w.enemies.filter((e): e is Drifter => e instanceof Drifter);
  const score = (p: Prey): number => {
    const big = preySpec(p.kind).size > s.gape;
    let v = dist(p, s.head);
    if (p.mode === 'sleep') v -= 160;
    else if (p.mode === 'stagger') v -= 120;
    else if (p.mode === 'hidden') v += 140;
    else if (big) v += 40;
    if (feast && p.marked) v -= 260;
    if (jellies.some((j) => dist(j, p) < 55)) v += 300;
    if (EEL_KINDS.includes(p.kind) && p.mode === 'idle') v -= 40;
    return v;
  };
  const list = w.prey.filter((p) => p.mode !== 'caught' && p.mode !== 'appear' && preySpec(p.kind).size <= Math.max(s.gape, s.width * 3));
  return list.reduce<Prey | null>((best, p) => (!best || score(p) < score(best) ? p : best), null);
}

/** The nearest cay (a round land zone), if the level has one. */
function nearestCay(w: World, h: Pt): { readonly x: number; readonly y: number; readonly r: number } | null {
  let best: { x: number; y: number; r: number } | null = null;
  for (const z of w.level.zones ?? []) {
    if (z.kind !== 'land' || z.shape !== 'circle') continue;
    if (!best || dist(h, z) - z.r < dist(h, best) - best.r) best = { x: z.x, y: z.y, r: z.r };
  }
  return best;
}

function facing(w: World, p: Pt, cos: number): boolean {
  const h = w.snake.head;
  return Math.cos(Math.atan2(p.y - h.y, p.x - h.x) - w.snake.heading) > cos;
}

function onBoard(p: Pt): boolean {
  return p.x > 30 && p.y > 30 && p.x < BOARD.w - 30 && p.y < BOARD.h - 30;
}

/** How far ahead the bot looks when it steers, s, in steps of STEP s. */
const HORIZON = 1;
const STEP = 0.05;
/** The courses it weighs: straight for the target, then turns (shares of its fastest, + is right) and straight on. */
type Course = 'aim' | number;
const COURSES: readonly Course[] = ['aim', -1, 1, -0.5, 0.5, 0];

/**
 * Where to steer so the head gets to `want` without running into its own
 * body, a jelly or the shark's lane (`lane` false while dodging it): it
 * plays out a few courses along the snake's real turning circle and takes
 * the target's if it stays clear, else the one that stays clear longest.
 */
function clear(w: World, want: Pt, lane = true): Pt {
  const s = w.snake;
  const h = s.head;
  let best: { course: Course; t: number } | null = null;
  for (const c of COURSES) {
    const t = clearFor(w, c, want, lane);
    if (t >= HORIZON && c === 'aim') return want;
    if (!best || t > best.t + 0.02) best = { course: c, t };
  }
  const c = best!.course;
  if (c === 'aim') return want;
  // Re-aimed every frame, a point this far round turns it at exactly that rate.
  const a = s.heading + (Math.abs(c) < 1 ? (c * s.spec.turn) / 60 : c * 1.5);
  return pt(h.x + Math.cos(a) * 120, h.y + Math.sin(a) * 120);
}

/** How long a course stays clear, s (HORIZON if it does). */
function clearFor(w: World, course: Course, want: Pt, lane: boolean): number {
  const s = w.snake;
  const speed = s.spec.speed * (w.inZone(s.head, 'water') ? 1.15 : 0.7);
  const turn = s.spec.turn * STEP;
  let x = s.head.x;
  let y = s.head.y;
  let a = s.heading;
  for (let t = STEP; t <= HORIZON + 1e-6; t += STEP) {
    if (course === 'aim') a = turnTowards(a, Math.atan2(want.y - y, want.x - x), turn);
    else a += course * turn;
    x += Math.cos(a) * speed * STEP;
    y += Math.sin(a) * speed * STEP;
    if (!freeAt(w, pt(x, y), speed * t, lane)) return t - STEP;
  }
  return HORIZON;
}

/** Whether the head can be at `p` after travelling `ahead` px: its body (the tail end will have moved on), jellies, the lane, the edges. */
function freeAt(w: World, p: Pt, ahead: number, lane = true): boolean {
  const s = w.snake;
  if (p.x < 18 || p.y < 18 || p.x > BOARD.w - 18 || p.y > BOARD.h - 18) return false;
  const pts = s.trail.pts;
  const reach = s.width * 1.5;
  const end = s.trail.count - Math.floor(ahead / SPACING);
  for (let i = Math.max(2, s.neck - Math.floor(ahead / SPACING)); i < end; i++) if (dist(p, pts[i]!) < reach) return false;
  for (const e of w.enemies) if (e instanceof Drifter && dist(e, p) < e.spec.reach + s.width / 2 + 14) return false;
  const shark = w.boss instanceof Shark ? w.boss : null;
  const l = lane && shark?.lane && (shark.mode === 'tell' || shark.mode === 'charge') ? shark.lane : null;
  return !l || dist(nearestOnSegment(p, l.from, l.to), p) > LANE_HALF + 12;
}

/** Room straight ahead for a strike. */
function free(w: World, a: number, far = 60): boolean {
  const h = w.snake.head;
  for (const look of [20, 40, far]) if (!freeAt(w, pt(h.x + Math.cos(a) * look, h.y + Math.sin(a) * look), look)) return false;
  return true;
}
