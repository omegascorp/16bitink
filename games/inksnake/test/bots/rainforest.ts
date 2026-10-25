import { FLOOR_SPEED, Glide, MAX_GLIDE, MIN_GLIDE } from '../../src/logic/abilities/flying';
import { SerpentEagle } from '../../src/logic/chapters/rainforestEagle';
import { Monitor } from '../../src/logic/chapters/rainforestMonitor';
import { Pecker } from '../../src/logic/enemies/pecker';
import { preySpec, type Prey } from '../../src/logic/prey';
import type { SnakeInput } from '../../src/logic/snake';
import { venomMaxOf } from '../../src/logic/species';
import { SPACING } from '../../src/logic/trail';
import { dist, pt, turnTowards, wrapAngle, type Pt } from '../../src/logic/vec';
import type { World } from '../../src/logic/world';
import { BOARD, type LevelDef } from '../../src/level/types';
import type { BotHook } from './types';

/** A round tree crown, by its index in the level. */
interface Crown {
  readonly i: number;
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/** What a glide under way is for: a point to come down in (in crown `crown`, or -1), or a bat to catch. */
interface Plan {
  readonly aim: Pt;
  readonly crown: number;
  readonly bat: Prey | null;
}

/** Glides are planned this far at most, centre to centre of the next crown, px. */
const REACH = MAX_GLIDE + 10;
/** A landing counts as "in" a crown this far inside its edge, px. */
const INSIDE = 18;
/** Crowns with gaps under this are a glide apart (the path search links them), px. */
const LINK_GAP = 150;
/** The eagle's ring is fled once it's this far through its lock (it holds still from about 0.7). */
const FLEE_AT = 0.55;

const CROWNS = new WeakMap<LevelDef, readonly Crown[]>();
const PLANS = new WeakMap<World, Plan>();

function crownsOf(level: LevelDef): readonly Crown[] {
  let cs = CROWNS.get(level);
  if (!cs) {
    cs = (level.zones ?? []).flatMap((z, i) => (z.kind === 'tree' && z.shape === 'circle' ? [{ i, x: z.x, y: z.y, r: z.r }] : []));
    CROWNS.set(level, cs);
  }
  return cs;
}

/** The crown `p` is deepest inside, if any. */
function crownAt(cs: readonly Crown[], p: Pt, margin = 0): Crown | null {
  let best: Crown | null = null;
  for (const c of cs) if (dist(p, c) <= c.r - margin && (!best || c.r - dist(p, c) > best.r - dist(p, best))) best = c;
  return best;
}

const ahead = (h: Pt, a: number, d: number): Pt => pt(h.x + Math.cos(a) * d, h.y + Math.sin(a) * d);
const angleTo = (a: Pt, b: Pt): number => Math.atan2(b.y - a.y, b.x - a.x);
const off = (w: World, to: Pt): number => Math.abs(wrapAngle(angleTo(w.snake.head, to) - w.snake.heading));

const steer = (toward: Pt, strike = false): SnakeInput => ({ toward, face: null, strike });
const glideNow = (w: World, plan: Plan): SnakeInput => {
  PLANS.set(w, plan);
  return { toward: plan.aim, face: null, strike: false, ability: true, abilityPressed: true };
};

/** The next crown on the way from `from` to `to`, hopping crowns a glide apart (breadth first). */
function nextCrown(cs: readonly Crown[], from: Crown, to: Crown): Crown {
  const prev = new Map<number, Crown | null>([[from.i, null]]);
  const queue: Crown[] = [from];
  while (queue.length) {
    const c = queue.shift()!;
    if (c.i === to.i) break;
    for (const n of cs) {
      if (prev.has(n.i) || dist(c, n) - c.r - n.r > LINK_GAP) continue;
      prev.set(n.i, c);
      queue.push(n);
    }
  }
  if (!prev.has(to.i)) return to;
  let c: Crown = to;
  while (prev.get(c.i) && prev.get(c.i)!.i !== from.i) c = prev.get(c.i)!;
  return c;
}

/** Whether heading `a` runs the head into its own body soon. */
function free(w: World, a: number, far = 60): boolean {
  const s = w.snake;
  const pts = s.trail.pts;
  const reach = s.width * 1.7;
  for (const look of [20, 40, far]) {
    const p = ahead(s.head, a, look);
    if (p.x < 10 || p.y < 10 || p.x > BOARD.w - 10 || p.y > BOARD.h - 10) return false;
    for (let i = s.neck + Math.ceil(look / SPACING); i < s.trail.count; i++) if (dist(p, pts[i]!) < reach) return false;
  }
  return true;
}

/**
 * How far the head gets, px, turning towards heading `a` at its full rate,
 * before it would cross its own body (simulated a moment ahead, the tail
 * drawing in as it goes), or Infinity if it doesn't.
 */
function runway(w: World, a: number, horizon = 0.7): number {
  const s = w.snake;
  const pts = s.trail.pts;
  const v = s.spec.speed * (w.inZone(s.head, 'tree') ? 1 : FLOOR_SPEED);
  const reach2 = (s.width * 1.2) ** 2;
  const dt = 1 / 20;
  let x = s.head.x;
  let y = s.head.y;
  let hd = s.heading;
  let d = 0;
  for (let t = 0; t < horizon; t += dt) {
    hd = turnTowards(hd, a, s.spec.turn * dt);
    x += Math.cos(hd) * v * dt;
    y += Math.sin(hd) * v * dt;
    d += v * dt;
    const last = Math.min(s.trail.count, Math.floor((s.length - d) / SPACING));
    for (let i = s.neck; i < last; i++) {
      const p = pts[i]!;
      if ((p.x - x) ** 2 + (p.y - y) ** 2 < reach2) return d;
    }
  }
  return Infinity;
}

/** Bends a wanted point aside if turning for it would run the head into its body, preferring to stay in crown `keep`. */
function clear(w: World, want: Pt, keep: Crown | null): Pt {
  const h = w.snake.head;
  const base = angleTo(h, want);
  let fallback: Pt | null = null;
  let best: { p: Pt; run: number } | null = null;
  for (const o of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.3, -2.3, Math.PI]) {
    const a = base + o;
    const p = o === 0 ? want : ahead(h, a, 120);
    const run = runway(w, a);
    if (run === Infinity) {
      if (!keep || dist(ahead(h, a, 30), keep) < keep.r - 6) return p;
      fallback ??= p;
    } else if (!best || run > best.run) best = { p, run };
  }
  return fallback ?? best?.p ?? want;
}

/**
 * The flying snake's habits: it hunts crown to crown, gliding across the
 * gaps towards its next meal (and through bats in the air), heads straight
 * back to a tree when it lands on the floor (the monitor), glides out of
 * the eagle's ring, and strikes the eagle where it lands after a miss.
 */
export const bot: BotHook = (w) => {
  const g = w.ability;
  if (!(g instanceof Glide)) return null;
  const s = w.snake;
  if (s.mode !== 'move') return steer(s.head);
  const cs = crownsOf(w.level);
  if (g.active) return inAir(w, g, cs);
  PLANS.delete(w);
  const h = s.head;
  const here = crownAt(cs, h);
  const eagle = w.boss instanceof SerpentEagle ? w.boss : null;
  if (eagle?.ring && eagle.mode === 'lock' && eagle.ringT > FLEE_AT && dist(h, eagle.ring) < eagle.ringR + 40) return flee(w, g, cs, here, eagle.ring);
  if (eagle?.open) return goTo(w, g, cs, here, eagle, true);
  if (here) {
    for (const e of w.enemies) {
      if (e instanceof Pecker && !e.away && e.alt < 0.3 && dist(e, h) < 130) return goTo(w, g, cs, here, e, true);
    }
  }
  const prey = pickPrey(w, cs, here);
  if (!prey) return goTo(w, g, cs, here, cs.reduce((a, b) => (b.r > a.r ? b : a), cs[0]!), false);
  const venom = preySpec(prey.kind).size > s.gape && prey.mode !== 'sleep';
  return goTo(w, g, cs, here, prey, venom, prey.kind === 'bat' ? prey : null);
};

/** The meal to go for: the nearest by the way there (a glide costs a little), ringed ones first. */
function pickPrey(w: World, cs: readonly Crown[], here: Crown | null): Prey | null {
  const s = w.snake;
  const g = w.level.goal;
  const feast = g?.kind === 'feast' && w.feasted < g.count ? g.food : null;
  const venomMax = venomMaxOf(s.width);
  let best: Prey | null = null;
  let bestScore = Infinity;
  for (const p of w.prey) {
    if (p.mode === 'appear' || p.mode === 'caught' || p.mode === 'stagger') continue;
    const size = preySpec(p.kind).size;
    if (size > s.gape && (p.mode !== 'sleep' && size > venomMax)) continue;
    let score = dist(p, s.head);
    if (crownAt(cs, p) !== here) score += 70;
    if (p.kind === 'bat' && p.alt >= 0.2) score += here ? 40 : 1e5;
    if (p.mode === 'sleep') score -= 150;
    if (feast && p.kind === feast) score -= 500;
    if (score < bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

/**
 * Heads for `t`: within the crown it's in, slither there; to another
 * crown, turn to face it and glide (via the crowns between, if it's far);
 * from the floor, back up the nearest tree first.
 */
function goTo(w: World, g: Glide, cs: readonly Crown[], here: Crown | null, t: Pt, strike: boolean, bat: Prey | null = null): SnakeInput {
  const s = w.snake;
  const h = s.head;
  const tc = crownAt(cs, t);
  const wantStrike = strike && dist(h, t) < 70 && off(w, t) < 0.5 && free(w, s.heading, 90);
  if (!here) return fromFloor(w, cs, t, tc, wantStrike);
  if (g.charge >= 1 && boxed(w, here)) return breakOut(w, cs, here);
  if (bat && bat.alt >= 0.2) return chaseBat(w, g, here, bat);
  if (tc === here || (!tc && dist(h, t) < here.r)) return steer(clear(w, t, here), wantStrike);
  const goal = tc ?? cs.reduce((a, b) => (dist(b, t) < dist(a, t) ? b : a), cs[0]!);
  const next = nextCrown(cs, here, goal);
  const aim = next === tc && dist(t, next) < next.r - INSIDE ? pt(t.x, t.y) : pt(next.x, next.y);
  const d = dist(h, aim);
  if (d < MIN_GLIDE * 0.9) return steer(clear(w, aim, null), wantStrike);
  if (g.charge >= 1 && off(w, aim) < 0.2 && d < REACH) return glideNow(w, { aim, crown: next.i, bat: null });
  // Not lined up (or still resting): turn towards it, without slithering off the crown.
  const edge = dist(ahead(h, s.heading, 34), here) > here.r - 4;
  if (edge && (g.charge < 1 || off(w, aim) > 0.6)) return steer(clear(w, pt(here.x, here.y), here));
  return steer(clear(w, aim, here));
}

/** Hemmed in by its own coils on a crown: no free way on that stays in the tree. */
function boxed(w: World, here: Crown): boolean {
  const s = w.snake;
  for (const o of [0, 0.5, -0.5, 1, -1, 1.6, -1.6]) {
    const a = s.heading + o;
    if (free(w, a, 50) && dist(ahead(s.head, a, 30), here) < here.r - 6) return false;
  }
  return true;
}

/** Glides out of a tangle (in the air it passes over its own coils): to a crown roughly ahead, or straight on. */
function breakOut(w: World, cs: readonly Crown[], here: Crown): SnakeInput {
  const s = w.snake;
  const h = s.head;
  const options = cs.filter((c) => c !== here && dist(h, c) > MIN_GLIDE * 0.8 && dist(h, c) < REACH && Math.abs(wrapAngle(angleTo(h, c) - s.heading)) < 0.7);
  const c = options.reduce<Crown | null>((a, b) => (!a || Math.abs(wrapAngle(angleTo(h, b) - s.heading)) < Math.abs(wrapAngle(angleTo(h, a) - s.heading)) ? b : a), null);
  return glideNow(w, { aim: c ? pt(c.x, c.y) : ahead(h, s.heading, MAX_GLIDE), crown: c?.i ?? -1, bat: null });
}

/** A bat in the air: line up on where it's going and glide into it. */
function chaseBat(w: World, g: Glide, here: Crown, bat: Prey): SnakeInput {
  const s = w.snake;
  const h = s.head;
  const lead = dist(h, bat) / (s.spec.speed * 2.1);
  const aim = pt(bat.x + Math.cos(bat.heading) * bat.speed * lead, bat.y + Math.sin(bat.heading) * bat.speed * lead);
  const d = dist(h, aim);
  if (g.charge >= 1 && off(w, aim) < 0.18 && d < MAX_GLIDE - 30 && d > 40) return glideNow(w, { aim, crown: -1, bat });
  const edge = dist(ahead(h, s.heading, 34), here) > here.r - 4;
  if (edge && (g.charge < 1 || off(w, aim) > 0.4)) return steer(clear(w, pt(here.x, here.y), here));
  return steer(clear(w, aim, here));
}

/** Down on the floor: straight for the nearest tree (towards where it's going, away from the monitor). */
function fromFloor(w: World, cs: readonly Crown[], t: Pt, tc: Crown | null, strike: boolean): SnakeInput {
  const h = w.snake.head;
  if (tc && dist(h, tc) - tc.r < 60) return steer(clear(w, t, null), strike);
  const monitor = w.enemies.find((e): e is Monitor => e instanceof Monitor && !e.away && dist(e, h) < 160);
  const score = (c: Crown): number => {
    let v = dist(h, c) - c.r + dist(c, t) * 0.15 + (1 - Math.cos(angleTo(h, c) - w.snake.heading)) * 70;
    if (monitor && Math.cos(angleTo(h, c) - angleTo(h, monitor)) > 0.5) v += 120;
    return v;
  };
  const c = cs.reduce((a, b) => (score(b) < score(a) ? b : a), cs[0]!);
  return steer(clear(w, pt(c.x, c.y), null), strike);
}

/** The eagle's ring is about to hold: glide out of it if it can (towards a crown), else slither out. */
function flee(w: World, g: Glide, cs: readonly Crown[], here: Crown | null, ring: Pt): SnakeInput {
  const s = w.snake;
  const h = s.head;
  const away = angleTo(ring, h);
  if (here && g.charge >= 1 && Math.cos(s.heading - away) > -0.2) {
    const options = cs.filter((c) => c !== here && dist(h, c) > MIN_GLIDE && dist(h, c) < REACH && Math.abs(wrapAngle(angleTo(h, c) - s.heading)) < 0.5);
    const c = options.reduce<Crown | null>((a, b) => (!a || dist(b, ring) > dist(a, ring) ? b : a), null);
    return glideNow(w, { aim: c ? pt(c.x, c.y) : ahead(h, s.heading, MAX_GLIDE), crown: c?.i ?? -1, bat: null });
  }
  return steer(clear(w, ahead(h, away, 160), null));
}

/** In the air: steer for the plan and let go once coming down now lands well inside the crown it's for. */
function inAir(w: World, g: Glide, cs: readonly Crown[]): SnakeInput {
  const s = w.snake;
  const h = s.head;
  const plan = PLANS.get(w);
  const bat = plan?.bat && w.prey.includes(plan.bat) ? plan.bat : null;
  const aim = bat ? pt(bat.x, bat.y) : plan?.aim ?? ahead(h, s.heading, 100);
  const eagle = w.boss instanceof SerpentEagle ? w.boss : null;
  const strike = !!eagle?.open && dist(h, eagle) < 70 && off(w, eagle) < 0.5;
  const rel = ahead(h, s.heading, g.leftIfReleased);
  const end = ahead(h, s.heading, g.leftIfHeld);
  const target = plan && plan.crown >= 0 ? cs.find((c) => c.i === plan.crown) ?? null : null;
  let hold = true;
  if (bat) hold = true;
  else if (target && dist(rel, target) <= target.r - INSIDE) hold = false;
  else if (!crownAt(cs, end, INSIDE) && crownAt(cs, rel, INSIDE)) hold = false;
  return { toward: aim, face: null, strike, ability: hold, abilityPressed: false };
}
