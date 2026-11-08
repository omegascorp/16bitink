import { BlackCaiman } from '../../src/logic/chapters/floodedCaiman';
import { Jaguar, JAGUAR_RING } from '../../src/logic/chapters/floodedJaguar';
import { CAPY } from '../../src/logic/chapters/floodedPrey';
import { RivalSnake } from '../../src/logic/enemies/rival';
import { catchable, preySpec, type Prey } from '../../src/logic/prey';
import type { SnakeInput } from '../../src/logic/snake';
import { SPACING } from '../../src/logic/trail';
import { dist, pt, type Pt } from '../../src/logic/vec';
import type { World } from '../../src/logic/world';
import { BOARD } from '../../src/level/types';
import type { BotHook } from './types';

/** Circling big prey: this far out round it, px, aiming this far ahead round the ring, rad. */
const COIL_R = 44;
const COIL_LEAD = 0.9;
/** The body has to be at least this long to close a loop that size. */
const COIL_LENGTH = 250;
/** Threats this near make it go under, px. */
const HIDE_NEAR = 230;

/**
 * The anaconda's habits: it goes under near hunters and when creeping up
 * on egrets and drinking capybaras, coils capybaras and young caimans,
 * gets out of a caiman's ring and the jaguar's, keeps its head away from
 * the bigger anaconda's, and strikes the jaguar from under the water while
 * it drinks.
 */
export const bot: BotHook = (w) => {
  if (w.ability?.id !== 'submerge') return null;
  const danger = dodge(w);
  if (danger) {
    // Under the water a bigger anaconda (she hunts by sight) loses it, and so does the jaguar; a caiman's snap it just outruns.
    const under = w.inZone(w.snake.head, 'water') && (rivalNear(w) || w.boss instanceof Jaguar);
    return { toward: onBoard(clear(w, onBoard(danger))), face: null, strike: false, ability: under };
  }
  if (w.boss instanceof Jaguar) return jaguar(w, w.boss);
  return hunt(w);
};

/** Where to run from a snap or a leap that's coming, or a bigger anaconda's head. */
function dodge(w: World): Pt | null {
  const h = w.snake.head;
  const away = (from: Pt, far = 160): Pt => {
    const a = Math.atan2(h.y - from.y, h.x - from.x);
    return pt(h.x + Math.cos(a) * far, h.y + Math.sin(a) * far);
  };
  for (const e of w.enemies) {
    if (e instanceof BlackCaiman && e.aim) {
      const along = nearSegment(h, e, e.aim);
      if (along < 58 || dist(h, e.aim) < 70) return away(pt((e.x + e.aim.x) / 2, (e.y + e.aim.y) / 2));
    }
    if (e instanceof RivalSnake && !e.away && dist(e.snake.head, h) < 165 && e.snake.width > w.snake.width * 1.04) {
      // Away from her head, but not into a corner.
      const a = Math.atan2(h.y - e.snake.head.y, h.x - e.snake.head.x);
      const c = Math.atan2(BOARD.h / 2 - h.y, BOARD.w / 2 - h.x);
      const x = Math.cos(a) * 0.7 + Math.cos(c) * 0.3;
      const y = Math.sin(a) * 0.7 + Math.sin(c) * 0.3;
      const l = Math.hypot(x, y) || 1;
      return pt(h.x + (x / l) * 160, h.y + (y / l) * 160);
    }
  }
  const b = w.boss;
  if (b instanceof Jaguar && b.ring && dist(h, b.ring) < JAGUAR_RING + 70) return away(b.ring);
  return null;
}

/** Whether a bigger anaconda's head is near. */
function rivalNear(w: World): boolean {
  return w.enemies.some((e) => e instanceof RivalSnake && !e.away && dist(e.snake.head, w.snake.head) < 165);
}

/** A point pulled in off the board's edges, so running away never pins it in a corner. */
function onBoard(p: Pt, m = 70): Pt {
  return pt(Math.max(m, Math.min(BOARD.w - m, p.x)), Math.max(m, Math.min(BOARD.h - m, p.y)));
}

/** Distance from `p` to the segment a..b. */
function nearSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return dist(p, pt(a.x + dx * t, a.y + dy * t));
}

/** Whether a hunter it should hide from is near: a caiman waiting, the bigger anaconda. */
function threatened(w: World): boolean {
  const h = w.snake.head;
  return w.enemies.some((e) => !e.away && ((e instanceof BlackCaiman && dist(e, h) < HIDE_NEAR) || (e instanceof RivalSnake && dist(e.snake.head, h) < HIDE_NEAR + 60)));
}

/** Prey it can ambush only from under the water. */
const ambushPrey = (p: Prey): boolean => p.kind === 'egret' || p.kind === 'capybara';

function hunt(w: World): SnakeInput {
  const s = w.snake;
  const h = s.head;
  const wet = w.inZone(h, 'water');
  const target = pickPrey(w);
  const hide = wet && (threatened(w) || (target !== null && ambushPrey(target) && dist(target, h) < 320));
  if (!target) return { toward: clear(w, pt(BOARD.w / 2, BOARD.h / 2)), face: null, strike: false, ability: hide };
  const big = preySpec(target.kind).size > s.gape;
  const d = dist(h, target);
  const face = target.data?.face;
  if (target.kind === 'capybara' && !target.frozen && face !== undefined && d > COIL_R + 36) {
    // Up to it from the water in front of it, under the surface.
    const spot = pt(target.x + Math.cos(face) * (COIL_R + 20), target.y + Math.sin(face) * (COIL_R + 20));
    return { toward: dist(h, spot) > 30 ? clear(w, spot) : target, face: null, strike: false, ability: wet };
  }
  if (big && d < COIL_R + 60) {
    // Round it: a loop of body closing on it.
    const a = Math.atan2(h.y - target.y, h.x - target.x) + COIL_LEAD;
    return { toward: pt(target.x + Math.cos(a) * COIL_R, target.y + Math.sin(a) * COIL_R), face: null, strike: false, ability: hide };
  }
  const ahead = Math.cos(Math.atan2(target.y - h.y, target.x - h.x) - s.heading) > 0.9;
  const strike = !big && d < 75 && ahead && free(w, s.heading, 90);
  return { toward: clear(w, target), face: null, strike, ability: hide && !strike };
}

/** The meal to go for: the nearest it can take, a drinking capybara first once it's long enough to coil one. */
function pickPrey(w: World): Prey | null {
  const s = w.snake;
  const g = w.level.goal;
  const wantMarked = g?.kind === 'feast' && w.feasted < g.count;
  const ok = (p: Prey): boolean => {
    if (!catchable(p) || p.alt > 0.2) return false;
    const size = preySpec(p.kind).size;
    if (size <= s.gape) return true;
    if (size > s.coilMax || s.length < COIL_LENGTH || !roomy(w, p)) return false;
    // A capybara only once it's down at the water drinking (or frozen in a closing coil).
    return p.kind !== 'capybara' || p.data?.phase === CAPY.drink || p.frozen;
  };
  const score = (p: Prey): number => {
    const big = preySpec(p.kind).size > s.gape;
    return dist(p, s.head) - (wantMarked && p.marked ? 600 : 0) - (big ? 120 : 0) + (dangerNear(w, p) ? 400 : 0);
  };
  return w.prey.filter(ok).reduce<Prey | null>((best, p) => (!best || score(p) < score(best) ? p : best), null);
}

/** Whether a caiman waits near this prey (or the jaguar prowls by it). */
function dangerNear(w: World, p: Pt): boolean {
  return w.enemies.some((e) => !e.away && ((e instanceof BlackCaiman && dist(e, p) < 110) || (e instanceof RivalSnake && dist(e.snake.head, p) < 180)))
    || (w.boss instanceof Jaguar && dist(w.boss, p) < 150);
}

/** Room to loop round `p`: away from the board's edges and anything solid. */
function roomy(w: World, p: Pt): boolean {
  const m = COIL_R + 26;
  if (p.x < m || p.y < m || p.x > BOARD.w - m || p.y > BOARD.h - m) return false;
  return w.solids.every((sh) => dist(p, sh.kind === 'circle' ? sh : pt(Math.max(sh.x, Math.min(p.x, sh.x + sh.w)), Math.max(sh.y, Math.min(p.y, sh.y + sh.h)))) > m + (sh.kind === 'circle' ? sh.r : 0));
}

/** The jaguar: stay under and out of its way; when it drinks, swim up under the water and strike. */
function jaguar(w: World, j: Jaguar): SnakeInput {
  const s = w.snake;
  const h = s.head;
  const wet = w.inZone(h, 'water');
  const d = dist(h, j);
  if (j.mode === 'drink' || j.mode === 'look') {
    const ahead = Math.cos(Math.atan2(j.y - h.y, j.x - h.x) - s.heading) > 0.8;
    const strike = d < 92 && ahead && s.cloak === 'submerged';
    return { toward: d < 110 ? pt(j.x, j.y) : clear(w, j), face: null, strike, ability: wet && !strike };
  }
  const low = (s.meter?.value ?? 1) < 0.35;
  // Out of its sight it needn't hide: up for air, and faster at the surface.
  const hide = wet && d < 380;
  if (j.mode === 'swim' || d < 150 || (low && d < 330)) {
    // Out of its reach, and up for air well away from the bank it's on.
    const a = Math.atan2(h.y - j.y, h.x - j.x);
    const far = pt(Math.max(80, Math.min(BOARD.w - 80, h.x + Math.cos(a) * 200)), Math.max(150, Math.min(BOARD.h - 150, h.y + Math.sin(a) * 200)));
    return { toward: clear(w, far), face: null, strike: false, ability: hide };
  }
  // Meanwhile: fish in the middle of the lagoon, under the water.
  const fish = w.prey.filter((p) => catchable(p) && preySpec(p.kind).size <= s.gape && dist(p, j) > 200 && w.inZone(p, 'water'));
  const t = fish.reduce<Prey | null>((b, p) => (!b || dist(p, h) < dist(b, h) ? p : b), null);
  const goal = t ?? pt(BOARD.w / 2, BOARD.h / 2);
  const ahead = t !== null && Math.cos(Math.atan2(t.y - h.y, t.x - h.x) - s.heading) > 0.9;
  const strike = t !== null && dist(t, h) < 60 && ahead && free(w, s.heading, 90);
  return { toward: clear(w, goal), face: null, strike, ability: hide && !strike };
}

/**
 * Bends a wanted point aside if heading for it would run the head into its
 * own body or off the board; a point inside the turning circle (it would
 * only orbit it, and bite its own body) it first swims straight away from.
 */
function clear(w: World, want: Pt): Pt {
  const s = w.snake;
  const h = s.head;
  const r = (s.spec.speed * (s.cloak === 'submerged' ? 0.65 : 1)) / s.spec.turn;
  for (const side of [-1, 1]) {
    const c = pt(h.x - Math.sin(s.heading) * r * side, h.y + Math.cos(s.heading) * r * side);
    if (dist(c, want) < r * 1.05) return pt(h.x + Math.cos(s.heading) * 120, h.y + Math.sin(s.heading) * 120);
  }
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
  const reach = s.width * 2;
  for (const look of [24, 44, far]) {
    const p = pt(s.head.x + Math.cos(a) * look, s.head.y + Math.sin(a) * look);
    if (p.x < 12 || p.y < 12 || p.x > BOARD.w - 12 || p.y > BOARD.h - 12) return false;
    for (let i = s.neck + Math.ceil(look / SPACING); i < s.trail.count; i++) if (dist(p, pts[i]!) < reach) return false;
  }
  return true;
}
