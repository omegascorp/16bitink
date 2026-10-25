/// <reference types="vite/client" />
import { Crow, Hen, Tomcat } from '../src/logic/enemies/index';
import { Diver } from '../src/logic/enemies/diver';
import type { BotHook } from './bots/types';

/** Each chapter's bot hook, by place (test/bots/<place>.ts). */
const HOOKS: Readonly<Record<string, BotHook>> = Object.fromEntries(
  Object.entries(import.meta.glob<{ bot: BotHook }>('./bots/*.ts', { eager: true })).filter(([f]) => !f.endsWith('types.ts')).map(([f, m]) => [f.replace(/^.*\/(\w+)\.ts$/, '$1'), m.bot]),
);
import { preySpec, type Prey } from '../src/logic/prey';
import type { SnakeInput } from '../src/logic/snake';
import { SPACING } from '../src/logic/trail';
import { dist, pt, pushOut, type Pt } from '../src/logic/vec';
import type { World } from '../src/logic/world';
import { BOARD, type LevelDef } from '../src/level/types';
import { World as WorldClass } from '../src/logic/world';

/**
 * A headless player for balance checks: perfect sight, plain habits. It
 * dodges the hawk's ring and the cat's lane, scares crows and hens off,
 * swallows what fits, circles what doesn't, and steers off its own body.
 */
export function botInput(w: World): SnakeInput {
  const s = w.snake;
  const h = s.head;
  // A chapter's own habits first (its snake's ability, its enemies).
  const own = HOOKS[w.level.id.split('-')[0]!]?.(w);
  if (own) return own;
  const danger = dodge(w);
  if (danger) return { toward: clear(w, danger), face: null, strike: false };
  const boss = w.boss;
  if (boss && boss.mode === 'dazed') return chase(w, boss, 70);
  // Pests near the head get struck.
  for (const e of w.enemies) {
    if ((e instanceof Crow || e instanceof Hen) && !e.away && e.alt < 0.3 && dist(e, h) < 140) return chase(w, e, 60);
    if (e instanceof Diver && e.mode === 'ground' && dist(e, h) < 120) return chase(w, e, 60);
  }
  const target = pickPrey(w);
  if (!target) return { toward: clear(w, pt(BOARD.w / 2, BOARD.h / 2)), face: null, strike: false };
  const spec = preySpec(target.kind);
  if (spec.size > s.gape) {
    // Circle it: aim at a point ahead on a ring round it, going round one way.
    const r = Math.max(42, s.width * 2.8);
    const a = Math.atan2(h.y - target.y, h.x - target.x) + 0.9;
    // No swerving off its own body here: the loop has to close on it.
    return { toward: pt(target.x + Math.cos(a) * r, target.y + Math.sin(a) * r), face: null, strike: false };
  }
  const d = dist(h, target);
  const ahead = Math.cos(Math.atan2(target.y - h.y, target.x - h.x) - s.heading) > 0.9;
  return { toward: clear(w, target), face: null, strike: d < 70 && ahead && free(w, s.heading, 90) };
}

function chase(w: World, e: Pt, reach: number): SnakeInput {
  const h = w.snake.head;
  const ahead = Math.cos(Math.atan2(e.y - h.y, e.x - h.x) - w.snake.heading) > 0.8;
  return { toward: clear(w, e), face: null, strike: dist(h, e) < reach && ahead && free(w, w.snake.heading, 90) };
}

/** Where to run from danger, if any: away from a locked hawk's ring or across a crouching cat's lane. */
function dodge(w: World): Pt | null {
  const h = w.snake.head;
  for (const e of w.enemies) {
    if (e instanceof Diver && e.ring && dist(h, e.ring) < 110) {
      const a = Math.atan2(h.y - e.ring.y, h.x - e.ring.x);
      return pt(h.x + Math.cos(a) * 200, h.y + Math.sin(a) * 200);
    }
  }
  const cat = w.boss;
  if (cat instanceof Tomcat && cat.lane && (cat.mode === 'crouch' || cat.mode === 'pounce')) {
    const { from, to } = cat.lane;
    const la = Math.atan2(to.y - from.y, to.x - from.x);
    const side = Math.sign((h.x - from.x) * Math.sin(la) * -1 + (h.y - from.y) * Math.cos(la)) || 1;
    return pt(h.x - Math.sin(la) * side * 200, h.y + Math.cos(la) * side * 200);
  }
  return null;
}

function pickPrey(w: World): Prey | null {
  const s = w.snake;
  const g = w.level.goal;
  const wantEggs = g?.kind === 'feast' && w.feasted < g.count;
  const list = w.prey.filter((p) => p.mode !== 'caught' && p.mode !== 'appear' && preySpec(p.kind).size <= s.coilMax && (s.spec.big === 'coil' || preySpec(p.kind).size <= s.gape));
  // A meal to coil needs room round it, and a body long enough to go round.
  const coilable = (p: Prey): boolean => s.length > 280 && roomy(w, p);
  const score = (p: Prey): number => dist(p, s.head) - (wantEggs && p.marked ? 500 : 0) + (preySpec(p.kind).size > s.gape ? (coilable(p) ? -60 : 1e6) : 0);
  return list.reduce<Prey | null>((best, p) => (!best || score(p) < score(best) ? p : best), null);
}

/** Bends a wanted point aside if heading for it would run the head into its own body. */
function clear(w: World, want: Pt): Pt {
  const s = w.snake;
  const h = s.head;
  const base = Math.atan2(want.y - h.y, want.x - h.x);
  for (const off of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.3, -2.3, Math.PI]) {
    const a = base + off;
    if (free(w, a)) return off === 0 ? want : pt(h.x + Math.cos(a) * 120, h.y + Math.sin(a) * 120);
  }
  return want;
}

/** Room to loop round `p`: away from the edges and from anything solid. */
function roomy(w: World, p: Pt): boolean {
  const m = 75;
  if (p.x < m || p.y < m || p.x > BOARD.w - m || p.y > BOARD.h - m) return false;
  return w.solids.every((sh) => !pushOut(p, m, sh));
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

export interface BotRun {
  readonly won: boolean;
  readonly time: number;
  readonly livesLost: number;
  readonly cause?: string;
}

/** Plays `level` with the bot for up to `limit` s of game time, at 60 steps a second. */
export function playLevel(level: LevelDef, limit = 300, seed = 0): BotRun {
  const w = new WorldClass(level, seed);
  const dt = 1 / 60;
  while (w.state === 'play' && w.elapsed < limit) w.step(botInput(w), dt);
  return { won: w.state === 'won', time: w.elapsed, livesLost: w.maxLives - w.lives, ...(w.lostBy ? { cause: w.lostBy } : {}) };
}
