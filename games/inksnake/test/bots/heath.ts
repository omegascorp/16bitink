import { BOARD } from '../../src/level/types';
import { cloudsAt, Warmth } from '../../src/logic/abilities/adder';
import { Badger } from '../../src/logic/chapters/heathBadger';
import { Chaser } from '../../src/logic/enemies/chaser';
import { isRinged } from '../../src/logic/enemyTypes';
import { catchable, preySpec, type Prey } from '../../src/logic/prey';
import type { SnakeInput } from '../../src/logic/snake';
import { SPACING } from '../../src/logic/trail';
import { dist, pt, type Pt } from '../../src/logic/vec';
import type { World } from '../../src/logic/world';
import type { BotHook } from './types';

/** Cold below this: it goes for the sun before anything else but danger. */
const COLD = 0.4;
/** A sunny spot is worth this many px of travel less if it stays sunny a while. */
const LASTING = 120;
/** Once warming, it stays in the sun till this warm. */
const WARM_ENOUGH = 0.8;
/** In the sun, it aims at sunny ground at least this far off, to keep moving through it. */
const ON_PAST = 70;

/** Heading somewhere on purpose. */
const go = (toward: Pt, strike = false): SnakeInput => ({ toward, face: null, strike, moved: true });

/**
 * The adder dodges every red ring and a trembling sett, keeps away from
 * the hedgehog (too prickly to strike), slithers through the sun when it's cold,
 * strikes voles with its venom and follows them till they sleep, and
 * strikes the badger while it sniffs.
 */
export const bot: BotHook = (w) => {
  const ab = w.ability;
  if (!(ab instanceof Warmth)) return null;
  const s = w.snake;
  const h = s.head;
  const danger = dangerFrom(w);
  if (danger) return go(clear(w, away(h, danger, 220)));
  // Cold: a hedgehog's nip costs only length, and running from it cold is hopeless: warm up first.
  const chaser = chaserNear(w);
  if (chaser && ab.value >= COLD) return go(clear(w, away(h, chaser, 220)));
  const boss = w.boss;
  if (boss instanceof Badger && boss.mode === 'sniff') {
    const ahead = Math.cos(Math.atan2(boss.y - h.y, boss.x - h.x) - s.heading) > 0.8;
    return go(pt(boss.x, boss.y), dist(boss, h) < 75 && ahead);
  }
  // Cold, or warming and not yet warm: on through the sunshine (a spot a little way off, so it keeps crossing the patch).
  if (ab.value < COLD || (ab.warming > 0.5 && ab.value < WARM_ENOUGH)) {
    const spot = sunSpot(w, ab, ab.sunAt(h) > 0 ? ON_PAST : 0);
    if (spot) return go(clear(w, spot));
  }
  // A bitten vole: let it run off and fall asleep (circling it ties knots), then swallow it.
  const bitten = w.prey.find((p) => p.mode === 'sleep');
  if (bitten) return go(clear(w, bitten));
  const vole = voleToHunt(w);
  if (vole) {
    const d = dist(h, vole);
    const ahead = Math.cos(Math.atan2(vole.y - h.y, vole.x - h.x) - s.heading) > 0.9;
    return go(clear(w, vole), d < 70 && ahead && free(w, s.heading, 80));
  }
  return null;
};

/** Where to run from, if anything is about to land on the head: a ring, or a trembling sett. */
function dangerFrom(w: World): Pt | null {
  const h = w.snake.head;
  for (const e of [...w.enemies, ...(w.boss ? [w.boss] : [])]) {
    if (isRinged(e) && e.ring && dist(h, e.ring) < e.ringR + 70) return e.ring;
  }
  const b = w.boss;
  if (b instanceof Badger && b.mode === 'rumble' && dist(b.sett, h) < 170) return b.sett;
  return null;
}

/** A hedgehog on the snake's heels, if any. */
function chaserNear(w: World): Pt | null {
  const h = w.snake.head;
  const e = w.enemies.find((q) => q instanceof Chaser && q.mode === 'chase' && dist(q, h) < 120);
  return e ? pt(e.x, e.y) : null;
}

/** A point `far` px from `from`, through the head. */
function away(h: Pt, from: Pt, far: number): Pt {
  const a = Math.atan2(h.y - from.y, h.x - from.x);
  return pt(Math.min(BOARD.w - 30, Math.max(30, h.x + Math.cos(a) * far)), Math.min(BOARD.h - 30, Math.max(30, h.y + Math.sin(a) * far)));
}

/** The nearest sunny ground, favouring spots no cloud is about to cover. */
function sunSpot(w: World, ab: Warmth, beyond = 0): Pt | null {
  const h = w.snake.head;
  const soon = cloudsAt(w.level, w.elapsed + 4);
  let best: Pt | null = null;
  let score = Infinity;
  for (let x = 30; x < BOARD.w; x += 30) {
    for (let y = 30; y < BOARD.h; y += 30) {
      const p = pt(x, y);
      if (ab.sunAt(p) <= 0 || dist(p, h) < beyond || w.solids.some((sh) => (sh.kind === 'circle' ? dist(p, sh) < sh.r + 14 : p.x > sh.x - 14 && p.x < sh.x + sh.w + 14 && p.y > sh.y - 14 && p.y < sh.y + sh.h + 14))) continue;
      const lasts = shadedSoon(p, soon) ? 0 : LASTING;
      const sc = dist(p, h) - lasts;
      if (sc < score) {
        score = sc;
        best = p;
      }
    }
  }
  return best;
}

function shadedSoon(p: Pt, clouds: ReturnType<typeof cloudsAt>): boolean {
  return clouds.some((c) => ((p.x - c.x) / c.rx) ** 2 + ((p.y - c.y) / c.ry) ** 2 < 1);
}

/** A vole worth going for: the feast's, or a near one when nothing smaller is nearer. */
function voleToHunt(w: World): Prey | null {
  const s = w.snake;
  const g = w.level.goal;
  const feast = g?.kind === 'feast' && g.food === 'vole' && w.feasted < g.count;
  const live = w.prey.filter((p) => catchable(p) && p.mode !== 'sleep' && p.mode !== 'stagger');
  if (w.prey.some((p) => p.mode === 'stagger')) return null;
  const big = live.filter((p) => preySpec(p.kind).size > s.gape && preySpec(p.kind).size <= s.width * 3);
  if (!big.length) return null;
  const nearest = (list: Prey[]): Prey => list.reduce((a, b) => (dist(a, s.head) < dist(b, s.head) ? a : b));
  const v = nearest(big);
  if (feast) return v;
  const small = live.filter((p) => preySpec(p.kind).size <= s.gape);
  return !small.length || dist(v, s.head) < dist(nearest(small), s.head) ? v : null;
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
