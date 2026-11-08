import { Lure } from '../../src/logic/abilities/spidertail';
import { isBird } from '../../src/logic/chapters/mountainsBirds';
import { WildBoar } from '../../src/logic/chapters/mountainsBoar';
import { Charger } from '../../src/logic/enemies/charger';
import { Diver } from '../../src/logic/enemies/diver';
import { catchable, type Prey } from '../../src/logic/preyTypes';
import type { SnakeInput } from '../../src/logic/snake';
import { SPACING } from '../../src/logic/trail';
import { dist, pt, pushOut, type Pt } from '../../src/logic/vec';
import type { World } from '../../src/logic/world';
import { BOARD } from '../../src/level/types';
import type { BotHook } from './types';

/** It lures from this far in from the edges, px, and only when no lizard is this close, px. */
const ROOM = 90;
const LIZARD_NEAR = 170;

/**
 * The spider-tailed viper's habits: it gets out of a rockfall's or the
 * boar's lane, lures birds down when there's nothing else close and strikes
 * them as they hop up, goes back for a bird its venom put to sleep, and
 * keeps a rock between itself and a rooting boar's line, so the charge ends
 * in it.
 */
export const bot: BotHook = (w) => {
  const s = w.snake;
  const h = s.head;
  const lure = w.ability instanceof Lure ? w.ability : null;
  const lane = laneDodge(w);
  if (lane) return { toward: lane, face: null, strike: false };
  // A hawk-like ring, or a dazed boar: the shared bot's habits.
  if (w.enemies.some((e) => e instanceof Diver && e.ring && dist(h, e.ring) < 130)) return null;
  if (w.boss instanceof WildBoar && w.boss.mode === 'dazed') return null;
  const sleeper = w.prey.find((p) => p.mode === 'sleep' || p.mode === 'stagger');
  if (sleeper) return { toward: clear(w, sleeper), face: null, strike: false };
  if (lure?.active) return luring(w);
  const boar = w.boss instanceof WildBoar && !w.boss.away && w.boss.mode !== 'gone' ? w.boss : null;
  if (boar && !boar.beaten && (boar.mode === 'root' || boar.mode === 'enter')) return { toward: clear(w, behindRock(w, boar)), face: null, strike: false };
  if (lure && lure.charge >= 1 && s.mode === 'move' && !s.striking && wantsLure(w)) return { toward: null, face: null, strike: false, ability: true };
  return offEdge(w);
};

/** Heading into the board's edge: turn back towards the middle early, before the corner leaves no room to turn. */
function offEdge(w: World): SnakeInput | null {
  const s = w.snake;
  const h = s.head;
  const m = 60;
  const ahead = pt(h.x + Math.cos(s.heading) * m, h.y + Math.sin(s.heading) * m);
  const out = ahead.x < 20 || ahead.y < 20 || ahead.x > BOARD.w - 20 || ahead.y > BOARD.h - 20;
  if (!out) return null;
  return { toward: clear(w, pt(BOARD.w / 2, BOARD.h / 2)), face: null, strike: false };
}

/** While luring: strike the bird the head is turned to once it's in reach, or keep still. */
function luring(w: World): SnakeInput {
  const s = w.snake;
  const h = s.head;
  const ahead = (p: Prey): boolean => Math.cos(Math.atan2(p.y - h.y, p.x - h.x) - s.heading) > 0.96;
  const target = w.prey.find((p) => catchable(p) && p.alt < 0.15 && dist(p, h) < 88 && ahead(p));
  return { toward: null, face: null, strike: target !== undefined, ability: true };
}

/** Lure when there are birds to call, room round the head, and no lizard close by to chase instead. */
function wantsLure(w: World): boolean {
  const h = w.snake.head;
  if (!w.level.prey.some((d) => isBird(d.kind))) return false;
  if (h.x < ROOM || h.y < ROOM || h.x > BOARD.w - ROOM || h.y > BOARD.h - ROOM) return false;
  if (w.enemies.some((e) => e instanceof Diver && (e.mode === 'lock' || e.mode === 'dive'))) return false;
  const lizard = w.prey.some((p) => !isBird(p.kind) && catchable(p) && dist(p, h) < LIZARD_NEAR);
  return !lizard;
}

/** Out of a rockfall's lane or the boar's: straight off to the nearer side. */
function laneDodge(w: World): Pt | null {
  const h = w.snake.head;
  for (const e of [...w.enemies, ...(w.boss ? [w.boss] : [])]) {
    let l: { readonly from: Pt; readonly to: Pt } | null = null;
    let half = 0;
    if (e instanceof Charger && e.lane) {
      l = e.lane;
      half = e.spec.halfWidth + 34;
    } else if (e instanceof WildBoar && e.lane && (e.mode === 'paw' || e.mode === 'charge')) {
      l = e.lane;
      half = 70;
    }
    if (!l) continue;
    const dx = l.to.x - l.from.x;
    const dy = l.to.y - l.from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const side = (h.x - l.from.x) * nx + (h.y - l.from.y) * ny;
    const along = ((h.x - l.from.x) * dx + (h.y - l.from.y) * dy) / len;
    if (Math.abs(side) > half || along < -40 || along > len + 40) continue;
    let sgn = Math.sign(side) || 1;
    // Away from the board's edge if that side has no room.
    const out = pt(h.x + nx * sgn * 160, h.y + ny * sgn * 160);
    if (out.x < 30 || out.y < 30 || out.x > BOARD.w - 30 || out.y > BOARD.h - 30) sgn = -sgn;
    return pt(h.x + nx * sgn * 200, h.y + ny * sgn * 200);
  }
  return null;
}

/** A spot with a rock right behind it, seen from the boar: its charge through the head will end in the rock. */
function behindRock(w: World, boar: WildBoar): Pt {
  const h = w.snake.head;
  let best: Pt | null = null;
  let bd = Infinity;
  for (const sh of w.solids) {
    const c = sh.kind === 'circle' ? pt(sh.x, sh.y) : pt(sh.x + sh.w / 2, sh.y + sh.h / 2);
    const r = sh.kind === 'circle' ? sh.r : Math.max(sh.w, sh.h) / 2;
    const a = Math.atan2(boar.y - c.y, boar.x - c.x);
    const spot = pt(c.x + Math.cos(a) * (r + 46), c.y + Math.sin(a) * (r + 46));
    if (spot.x < 40 || spot.y < 40 || spot.x > BOARD.w - 40 || spot.y > BOARD.h - 40) continue;
    if (dist(spot, boar) < 170 || w.solids.some((o) => pushOut(spot, 14, o))) continue;
    const d = dist(spot, h);
    if (d < bd) {
      bd = d;
      best = spot;
    }
  }
  return best ?? pt(BOARD.w / 2, BOARD.h / 2);
}

/** Bends a wanted point aside if heading for it would run the head into its own body (as the shared bot does). */
function clear(w: World, want: Pt): Pt {
  const h = w.snake.head;
  const base = Math.atan2(want.y - h.y, want.x - h.x);
  for (const off of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.3, -2.3, Math.PI]) {
    const a = base + off;
    if (free(w, a)) return off === 0 ? want : pt(h.x + Math.cos(a) * 120, h.y + Math.sin(a) * 120);
  }
  return want;
}

function free(w: World, a: number): boolean {
  const s = w.snake;
  const pts = s.trail.pts;
  const reach = s.width * 2.2;
  for (const look of [20, 40, 60]) {
    const p = pt(s.head.x + Math.cos(a) * look, s.head.y + Math.sin(a) * look);
    if (p.x < 10 || p.y < 10 || p.x > BOARD.w - 10 || p.y > BOARD.h - 10) return false;
    for (let i = s.neck + Math.ceil(look / SPACING); i < s.trail.count; i++) if (dist(p, pts[i]!) < reach) return false;
  }
  return true;
}
