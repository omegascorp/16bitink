import { HOOD_REACH } from '../../src/logic/abilities/cobra';
import { Mongoose } from '../../src/logic/chapters/jungleMongoose';
import { JungleRival } from '../../src/logic/chapters/jungleRival';
import { Chaser } from '../../src/logic/enemies/chaser';
import { catchable, preySpec } from '../../src/logic/prey';
import type { SnakeInput } from '../../src/logic/snake';
import { SPACING } from '../../src/logic/trail';
import { dist, pt, turnTowards, type Pt } from '../../src/logic/vec';
import type { World } from '../../src/logic/world';
import { BOARD } from '../../src/level/types';
import type { BotHook } from './types';

/**
 * The king cobra's habits: it eats rival snakes thinner than its gape
 * (spreading its hood to freeze a quick one), strikes a python to put it
 * to sleep and then swallows it, keeps off the heads of rivals wider than
 * itself (hooding one that hunts it), strikes a honey badger's nose (its
 * hood doesn't work on that), and fights the mongoose by striking right
 * after its feint, hooding at its dart and slipping out of the dart's ring.
 */
export const bot: BotHook = (w) => {
  const hood = w.ability;
  if (hood?.id !== 'hood') return null;
  const ready = hood.charge >= 1 && !hood.active;
  const boss = w.boss instanceof Mongoose && !w.boss.away ? w.boss : null;
  if (boss) return mongoose(w, boss, ready);
  return threat(w, ready) ?? hunt(w, ready);
};

const go = (toward: Pt, strike = false): SnakeInput => ({ toward, face: null, strike });
const rear = (toward: Pt | null = null): SnakeInput => ({ toward, face: null, strike: false, ability: true, abilityPressed: true });

function ahead(w: World, p: Pt, cos = 0.85): boolean {
  const h = w.snake.head;
  return Math.cos(Math.atan2(p.y - h.y, p.x - h.x) - w.snake.heading) > cos;
}

/** Away from `p`, a good way off, bent round its own body. */
function away(w: World, p: Pt): Pt {
  const h = w.snake.head;
  const a = Math.atan2(h.y - p.y, h.x - p.x);
  return clear(w, pt(h.x + Math.cos(a) * 200, h.y + Math.sin(a) * 200));
}

/** The nearest point of a rival's body to the head. */
function nearestOn(w: World, r: JungleRival): Pt {
  const h = w.snake.head;
  const pts = r.snake.trail.pts;
  let best = pts[0]!;
  for (let i = 0; i < r.snake.trail.count; i += 3) if (dist(pts[i]!, h) < dist(best, h)) best = pts[i]!;
  return best;
}

function rivals(w: World): JungleRival[] {
  return w.enemies.filter((e): e is JungleRival => e instanceof JungleRival && !e.away);
}

/** A honey badger at the head gets struck; a wider rival's head is kept off (or hooded, if it hunts). */
function threat(w: World, ready: boolean): SnakeInput | null {
  const s = w.snake;
  const h = s.head;
  for (const e of w.enemies) {
    if (!(e instanceof Chaser) || e.away || e.mode !== 'chase' || dist(e, h) > 150) continue;
    // Facing it: strike its nose. Behind: outrun it.
    if (ahead(w, e, 0.2)) return go(e, dist(e, h) < 85 && ahead(w, e, 0.8));
    return go(away(w, e));
  }
  for (const r of rivals(w)) {
    if (!r.dangerTo(s) || r.mode === 'frozen') continue;
    const d = dist(r.snake.head, h);
    if (r.mode === 'hunt' && d < 140 && ready) return rear();
    if (d < 70 && ahead(w, r.snake.head, 0.8) && s.strikeRest <= 0) return go(r.snake.head, true);
    if (d < 95) return go(away(w, r.snake.head));
  }
  return null;
}

/** The best meal: the nearest edible rival or prey (rat snakes first on a feast), else a python to put to sleep. */
function hunt(w: World, ready: boolean): SnakeInput | null {
  const s = w.snake;
  const h = s.head;
  const g = w.level.goal;
  const feast = g?.kind === 'feast' && w.feasted < g.count ? g.food : null;
  let best: { at: Pt; score: number; rival: JungleRival | null } | null = null;
  const consider = (at: Pt, score: number, rival: JungleRival | null): void => {
    if (!best || score < best.score) best = { at, score, rival };
  };
  for (const r of rivals(w)) {
    if (r.edibleBy(s)) {
      const at = nearestOn(w, r);
      consider(at, dist(at, h) - 60 - (feast === r.own.meal ? 500 : 0), r);
    } else if (r.own.sleepy && r.mode !== 'stagger') {
      // A python: strike its middle (well off its head) to put it to sleep.
      const mid = r.snake.trail.pts[Math.floor(r.snake.trail.count * 0.6)] ?? r.snake.head;
      consider(mid, dist(mid, h) - (g?.kind === 'rush' ? 120 : 20), r);
    }
  }
  for (const p of w.prey) {
    if (!catchable(p) || preySpec(p.kind).size > s.gape) continue;
    consider(p, dist(p, h), null);
  }
  const t = best as { at: Pt; score: number; rival: JungleRival | null } | null;
  if (!t) return null;
  const d = dist(t.at, h);
  const r = t.rival;
  if (r && r.edibleBy(s) && r.mode === 'flee' && d < HOOD_REACH - 30 && ready) return rear(t.at);
  if (r && !r.edibleBy(s)) {
    // Keep off the python's head while going for its body.
    if (dist(r.snake.head, h) < 70) return go(away(w, r.snake.head));
    return go(clear(w, t.at), d < 70 && ahead(w, t.at, 0.8) && free(w, s.heading, 60));
  }
  return go(clear(w, t.at), d < 65 && ahead(w, t.at, 0.9) && free(w, s.heading, 80));
}

/** The mongoose: slip out of its dart's ring (or hood it), strike it while it's open, and otherwise stay facing it. */
function mongoose(w: World, m: Mongoose, ready: boolean): SnakeInput {
  const s = w.snake;
  const h = s.head;
  const d = dist(m, h);
  if (m.open) {
    if (w.ability?.active) return { toward: null, face: null, strike: d < 105 && ahead(w, m, 0.9) };
    return go(m, d < 105 && ahead(w, m, 0.9));
  }
  if (m.ring && (m.mode === 'crouch' || m.mode === 'dart')) {
    if (ready && d < HOOD_REACH - 10) return rear();
    if (dist(m.ring, h) < m.ringR + 60) return go(away(w, m.ring));
  }
  if (m.mode === 'feint' || m.mode === 'circle') {
    // Keep it in front, out in the open; don't bite at the feint.
    const centre = pt(BOARD.w / 2, BOARD.h / 2);
    const want = dist(h, centre) > 220 ? centre : pt(m.x, m.y);
    return go(clear(w, want));
  }
  return go(clear(w, pt(BOARD.w / 2, BOARD.h / 2)));
}

/** Bends a wanted point aside if turning for it would run the head into its own body. */
function clear(w: World, want: Pt): Pt {
  const h = w.snake.head;
  const base = Math.atan2(want.y - h.y, want.x - h.x);
  for (const off of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.3, -2.3, Math.PI]) {
    const a = base + off;
    if (safe(w, a)) return off === 0 ? want : pt(h.x + Math.cos(a) * 120, h.y + Math.sin(a) * 120);
  }
  return want;
}

/**
 * Whether turning towards heading `a` keeps the head off its own body for
 * the next half second: the turn is played out at the snake's own speed
 * and turn rate (a fast cobra turns wide), against the body as it will be.
 */
function safe(w: World, a: number): boolean {
  const s = w.snake;
  const pts = s.trail.pts;
  const n = s.trail.count;
  const v = s.spec.speed;
  const dt = 1 / 30;
  const neck = s.neck * SPACING;
  const reach = s.width * 1.1;
  let x = s.head.x;
  let y = s.head.y;
  let hd = s.heading;
  for (let k = 1; k <= 16; k++) {
    hd = turnTowards(hd, a, s.spec.turn * dt);
    x += Math.cos(hd) * v * dt;
    y += Math.sin(hd) * v * dt;
    if (x < 12 || y < 12 || x > BOARD.w - 12 || y > BOARD.h - 12) return false;
    const d = k * v * dt;
    for (let i = Math.max(0, Math.ceil((neck - d) / SPACING)); i < n && i * SPACING + d < s.length; i += 2) {
      if (Math.hypot(pts[i]!.x - x, pts[i]!.y - y) < reach) return false;
    }
  }
  return true;
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
