import { RASP_REACH } from '../../src/logic/abilities/eggeater';
import { SecretaryBird, STAMP_RING } from '../../src/logic/chapters/savannaSecretary';
import { Weaver } from '../../src/logic/chapters/savannaWeavers';
import { Charger } from '../../src/logic/enemies/charger';
import { Chaser } from '../../src/logic/enemies/chaser';
import type { Enemy } from '../../src/logic/enemyTypes';
import type { SnakeInput } from '../../src/logic/snake';
import { clamp, dist, pt, pushOut, type Pt } from '../../src/logic/vec';
import { SPACING } from '../../src/logic/trail';
import type { World } from '../../src/logic/world';
import { BOARD } from '../../src/level/types';
import type { BotHook } from './types';

/** Mongooses on the chase and weavers mobbing: what a rasp or a bluff strike is for. */
const pestering = (e: Enemy): boolean => !e.away && ((e instanceof Chaser && e.mode === 'chase') || (e instanceof Weaver && (e.mode === 'mob' || e.mode === 'dart')));

/** Whether `p` is within a narrow cone ahead of the head. */
function ahead(w: World, p: Pt, cos = 0.85): boolean {
  const h = w.snake.head;
  return Math.cos(Math.atan2(p.y - h.y, p.x - h.x) - w.snake.heading) > cos;
}

/**
 * A point off to one side of the head, square to `along` (radians): on the
 * side `offset` points to, unless the other side has much more room (its
 * own body, the edges, solid things).
 */
function sideStep(w: World, along: number, offset: number): Pt {
  const h = w.snake.head;
  let side = Math.sign(offset) || 1;
  const roomOn = (k: number): number => room(w, along + (k * Math.PI) / 2, 90);
  if (roomOn(side) < 60 && roomOn(-side) > roomOn(side)) side = -side;
  const a = along + (side * Math.PI) / 2;
  return pt(clamp(h.x + Math.cos(a) * 200, 20, BOARD.w - 20), clamp(h.y + Math.sin(a) * 200, 20, BOARD.h - 20));
}

/** Out of the Secretary Bird's ring, and a strike while its foot is down. */
function secretary(w: World, b: SecretaryBird): SnakeInput | null {
  const s = w.snake;
  const h = s.head;
  if (b.ring && (b.mode === 'raise' || b.mode === 'stamp')) {
    const r = b.ring;
    if (dist(h, r) > STAMP_RING + 90) return null;
    // Turn hard to whichever side the ring isn't.
    const cross = Math.cos(s.heading) * (r.y - h.y) - Math.sin(s.heading) * (r.x - h.x);
    return { toward: sideStep(w, s.heading, -cross || 1), face: null, strike: false };
  }
  if (b.mode === 'down') return { toward: pt(b.x, b.y), face: null, strike: dist(b, h) < 95 && ahead(w, b, 0.9) };
  return null;
}

/** Out of a stampede's lane, while it warns and runs. */
function stampede(w: World): SnakeInput | null {
  const h = w.snake.head;
  for (const e of w.enemies) {
    if (!(e instanceof Charger) || !e.lane || (e.mode !== 'warn' && e.mode !== 'run')) continue;
    const { from, to } = e.lane;
    const la = Math.atan2(to.y - from.y, to.x - from.x);
    const off = (h.x - from.x) * -Math.sin(la) + (h.y - from.y) * Math.cos(la);
    if (Math.abs(off) > e.spec.halfWidth + 30) continue;
    return { toward: sideStep(w, la, off), face: null, strike: false };
  }
  return null;
}

/** How far the head could go on heading `a` before its own body, the board's edge or something solid, up to `far` px. */
function room(w: World, a: number, far: number): number {
  const s = w.snake;
  const pts = s.trail.pts;
  const reach = s.width * 2.2;
  for (let look = 15; look <= far; look += 15) {
    const p = pt(s.head.x + Math.cos(a) * look, s.head.y + Math.sin(a) * look);
    if (p.x < 12 || p.y < 12 || p.x > BOARD.w - 12 || p.y > BOARD.h - 12) return look - 15;
    if (w.solids.some((sh) => pushOut(p, s.width * 0.6, sh))) return look - 15;
    for (let i = s.neck + Math.ceil(look / SPACING); i < s.trail.count; i++) if (dist(p, pts[i]!) < reach) return look - 15;
  }
  return far;
}

/** Body samples lying close round `p`: an egg in a crowd of coils is a trap. */
function crowd(w: World, p: Pt): number {
  const s = w.snake;
  let n = 0;
  for (let i = s.neck; i < s.trail.count; i += 3) if (dist(p, s.trail.pts[i]!) < 50) n++;
  return n;
}

/**
 * Off to the nearest egg (a ringed one first in a feast), looking further
 * ahead than the shared bot so a long body doesn't box itself in. Eggs
 * never move, so one tucked inside the turning circle is passed and come
 * back to, not circled for ever.
 */
function goForEggs(w: World): SnakeInput | null {
  const s = w.snake;
  const h = s.head;
  const g = w.level.goal;
  const wantMarked = g?.kind === 'feast' && w.feasted < g.count;
  const eggs = w.prey.filter((p) => p.mode !== 'caught' && p.mode !== 'appear');
  const score = (p: Pt & { marked: boolean }): number => dist(p, h) - (wantMarked && p.marked ? 500 : 0) + crowd(w, p) * 12;
  const egg = eggs.reduce<(typeof eggs)[number] | null>((b, p) => (!b || score(p) < score(b) ? p : b), null);
  if (!egg) return null;
  const turn = (s.spec.speed / s.spec.turn) * 1.15;
  const dx = egg.x - h.x;
  const dy = egg.y - h.y;
  const fwd = dx * Math.cos(s.heading) + dy * Math.sin(s.heading);
  const lat = -dx * Math.sin(s.heading) + dy * Math.cos(s.heading);
  const tucked = fwd * fwd + (Math.abs(lat) - turn) ** 2 < turn * turn;
  const base = tucked ? s.heading : Math.atan2(dy, dx);
  const d = dist(h, egg);
  const far = Math.min(100, Math.max(40, d - 10));
  // The first heading near the egg's with room, else whichever has the most room.
  let best = { a: base, room: -1, off: 0 };
  for (const off of [0, 0.35, -0.35, 0.7, -0.7, 1.1, -1.1, 1.6, -1.6, 2.2, -2.2, Math.PI]) {
    const a = base + off;
    const r = room(w, a, far);
    if (r >= far) {
      best = { a, room: r, off };
      break;
    }
    if (r > best.room) best = { a, room: r, off };
  }
  const { a, off } = best;
  const toward = off === 0 && !tucked ? pt(egg.x, egg.y) : pt(h.x + Math.cos(a) * 120, h.y + Math.sin(a) * 120);
  return { toward, face: null, strike: off === 0 && !tucked && d < 70 && ahead(w, egg, 0.9) && room(w, s.heading, 90) >= 90 };
}

/**
 * The egg-eater dodges the stamp ring and the stampede's lane, rasps when
 * mongooses close in or weavers mob it, bluff-strikes a pest right ahead,
 * strikes the Secretary Bird while its foot is down, and goes for the eggs.
 */
export const bot: BotHook = (w) => {
  const s = w.snake;
  const ab = w.ability;
  if (ab?.id !== 'rasp') return null;
  if (w.boss instanceof SecretaryBird) {
    const own = secretary(w, w.boss);
    if (own) return own;
  }
  const dodge = stampede(w);
  if (dodge) return dodge;
  const near = w.enemies.filter((e) => pestering(e) && dist(e, s.head) < RASP_REACH * 0.8);
  if (near.length && ab.charge >= 1 && s.mode === 'move') return { toward: null, face: null, strike: false, ability: true, abilityPressed: true };
  const pest = near.find((e) => dist(e, s.head) < 80 && ahead(w, e));
  if (pest && s.strikeRest <= 0) return { toward: pt(pest.x, pest.y), face: null, strike: true };
  return goForEggs(w);
};
