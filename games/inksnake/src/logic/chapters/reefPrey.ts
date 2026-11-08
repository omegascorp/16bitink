import type { AbilityCtx } from '../abilities/types';
import { stepScurrier } from '../preyMoves';
import type { Prey, PreySpec, PreyWorld } from '../preyTypes';
import { dist, pt, TAU, wrapAngle, type Pt } from '../vec';

/**
 * The reef's prey: gobies darting over the sand, and eels living in holes
 * in the coral. Banded sea kraits eat mostly eels (morays and congers):
 * they probe the crevices for them. An eel swims home to its hole, pokes
 * its head out, sways a while, and pulls back in: it can only be caught
 * while it's out. A young conger goes down whole; a moray is too big and
 * needs the krait's venom.
 */

/** In its hole this long, s, then out this long (cut short when a snake it can see comes close). */
const IN_TIME = [1.3, 2.6] as const;
const OUT_TIME = [1.9, 2.8] as const;
/** A snake this close (px) makes an eel that's out think again: back in within SHY_TIME. */
const SHY = 46;
const SHY_TIME = 0.55;
/** How far its head pokes out past the hole's mouth, in its own widths. */
const POKE = 0.35;
/** A goby hovers this long between darts, s; a dart lasts DART. */
const HOVER = [0.5, 1.5] as const;
const DART = 0.22;
/** Another way out of a hole: holes this far from any coral head face a way of their own. */
const CORAL_NEAR = 70;

const roll = (world: { readonly rng: () => number }, [a, b]: readonly [number, number]): number => a + world.rng() * (b - a);

/** Where an eel that's out has its head: just past the mouth of its hole. */
export function pokeOut(hole: Pt, dir: number, size: number): Pt {
  return pt(hole.x + Math.cos(dir) * size * POKE, hole.y + Math.sin(dir) * size * POKE);
}

/** An eel's hole, if it has one (the ability hands holes out, see tendHoles). */
function holeOf(p: Prey): { readonly at: Pt; readonly dir: number } | null {
  const d = p.data;
  if (!d || (d.hole ?? -1) < 0 || d.hx === undefined || d.hy === undefined) return null;
  return { at: pt(d.hx, d.hy), dir: d.dir ?? 0 };
}

/** An eel: home to its hole, then in and out of it. With no hole free it swims about in the open. */
function eelStep(kind: string): NonNullable<PreySpec['step']> {
  return (p: Prey, world: PreyWorld, dt: number, near: boolean): void => {
    const spec = REEF_PREY[kind]!;
    const hole = holeOf(p);
    if (!hole) {
      stepScurrier(p, spec, world, near, dt);
      return;
    }
    const d = p.data!;
    const out = pokeOut(hole.at, hole.dir, spec.size);
    if (p.mode !== 'hidden' && p.mode !== 'walk' && dist(p, out) > 12) p.mode = 'walk';
    if (p.mode === 'hidden') {
      p.x = hole.at.x;
      p.y = hole.at.y;
      p.timer -= dt;
      if (p.timer <= 0) {
        p.mode = 'idle';
        p.timer = roll(world, OUT_TIME);
        d.sway = world.rng() * TAU;
      }
      return;
    }
    if (p.mode === 'walk') {
      // Swimming home: straight for the hole, and in.
      const to = dist(p, hole.at);
      p.heading = Math.atan2(hole.at.y - p.y, hole.at.x - p.x);
      const step = Math.min(to, spec.speed * dt);
      p.x += Math.cos(p.heading) * step;
      p.y += Math.sin(p.heading) * step;
      if (to - step < 2) {
        p.mode = 'hidden';
        p.timer = roll(world, IN_TIME) * 0.6;
      }
      return;
    }
    // Out of its hole: head and neck swaying, watching.
    p.x = out.x;
    p.y = out.y;
    d.sway = (d.sway ?? 0) + dt * 3.2;
    p.heading = wrapAngle(hole.dir + Math.sin(d.sway) * 0.45);
    p.timer -= dt;
    if (world.headSeen && dist(p, world.head) < SHY) p.timer = Math.min(p.timer, SHY_TIME);
    if (p.timer <= 0) {
      p.mode = 'hidden';
      p.timer = roll(world, IN_TIME);
    }
  };
}

/** A goby: it hovers over the sand, then darts off in a quick straight burst (away from a snake it sees). */
function gobyStep(p: Prey, world: PreyWorld, dt: number, near: boolean): void {
  const spec = REEF_PREY.goby!;
  p.timer -= dt;
  if (p.mode === 'walk') {
    p.x += Math.cos(p.heading) * spec.speed * dt;
    p.y += Math.sin(p.heading) * spec.speed * dt;
    if (p.timer <= 0) {
      p.mode = 'idle';
      p.timer = roll(world, HOVER);
    }
    return;
  }
  p.mode = 'idle';
  p.x += Math.cos(p.heading) * 6 * dt;
  p.y += Math.sin(p.heading) * 6 * dt;
  if ((near && p.timer <= 0.3) || p.timer <= 0) {
    p.mode = 'walk';
    p.timer = DART;
    const away = near ? Math.atan2(p.y - world.head.y, p.x - world.head.x) : world.rng() * TAU;
    p.heading = wrapAngle(away + (world.rng() - 0.5) * 1.4);
  }
}

export const REEF_PREY: Readonly<Record<string, PreySpec>> = {
  goby: { name: 'goby', plural: 'gobies', size: 9, growth: 22, gait: 'scurry', speed: 230, fear: 80, points: 8, zone: 'water', step: gobyStep },
  conger: { name: 'conger eel', size: 14, growth: 36, gait: 'scurry', speed: 95, fear: 60, points: 15, zone: 'water', step: eelStep('conger') },
  moray: { name: 'moray eel', size: 26, growth: 72, gait: 'scurry', speed: 85, fear: 60, points: 35, zone: 'water', step: eelStep('moray') },
};

/** The prey kinds that live in holes. */
export const EEL_KINDS: readonly string[] = ['conger', 'moray'];

/**
 * Hands the level's holes (its `spots`) out to its eels, one eel a hole:
 * an eel bitten, asleep or caught gives its hole up, and a new eel takes
 * the nearest free one (one still fading in starts there, unseen).
 * The breath ability calls it each frame: every reef level is the krait's,
 * and the ability is what runs with the whole board in view.
 */
export function tendHoles(ctx: Pick<AbilityCtx, 'prey' | 'level'>): void {
  const holes = ctx.level.spots ?? [];
  if (!holes.length) return;
  const eels = ctx.prey.filter((p) => EEL_KINDS.includes(p.kind));
  const taken = new Set<number>();
  for (const p of eels) {
    const d = p.data;
    if (!d || (d.hole ?? -1) < 0) continue;
    if (p.mode === 'stagger' || p.mode === 'sleep' || p.mode === 'caught') d.hole = -1;
    else taken.add(d.hole!);
  }
  for (const p of eels) {
    if ((p.data?.hole ?? -1) >= 0 || p.mode === 'stagger' || p.mode === 'sleep' || p.mode === 'caught') continue;
    let best = -1;
    for (let i = 0; i < holes.length; i++) if (!taken.has(i) && (best < 0 || dist(p, holes[i]!) < dist(p, holes[best]!))) best = i;
    if (best < 0) return;
    taken.add(best);
    const h = holes[best]!;
    const dir = holeFacing(ctx.level.solids ?? [], h, best);
    p.data = { ...(p.data ?? {}), hole: best, hx: h.x, hy: h.y, dir };
    if (p.mode === 'appear') {
      p.x = h.x;
      p.y = h.y;
      p.heading = dir;
    }
  }
}

/** Which way a hole faces: out from the coral head it's in, or a way of its own. */
export function holeFacing(solids: readonly { readonly kind: string; readonly x: number; readonly y: number }[], h: Pt, index: number): number {
  let best: Pt | null = null;
  for (const s of solids) if (s.kind === 'circle' && dist(s, h) < CORAL_NEAR && (!best || dist(s, h) < dist(best, h))) best = s;
  return best ? Math.atan2(h.y - best.y, h.x - best.x) : wrapAngle(index * 2.4);
}
