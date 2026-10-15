import { describe, expect, it } from 'vitest';
import { INKFISH_FULL_CHAPTERS } from '../content/paid';
import { mouthOf, type Pose } from '../dev/promo/chain';
import {
  CAPTIONS, captionAlpha, FRY_LEN, fryAlarm, fryAt, fryEyes, fryJaw, GULP_AT, growthBar, HUNTER_LEN, hunterEyes, hunterFish, hunterJaw, hunterLump,
  hunterMenace, LOOP_S, PRICK_AT, sardinesAt, SNACK_AT, SOUNDS, SPINES_COOLDOWN_S, SPIT_AT, SPOTS, STUN_END, STUN_S, SUCK_FROM, viewAt, type View,
  type WorldFish,
} from '../dev/promo/spat/story';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';
import { PLAYER_ABILITY } from '../src/logic/abilities';
import { SPECIES_INFO } from '../src/levels/species';
import { relationTo } from '../src/logic/sizing';
import { playerSizeFor } from '../src/logic/growth';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

/** The screen point the camera centres on (render.ts). */
const FOCUS = { x: 540, y: 800 };
/** Where a fish is on the 1080x1920 frame. */
const seen = (f: WorldFish, v: View) => ({ x: FOCUS.x + v.zoom * (f.x - v.x), y: FOCUS.y + v.zoom * (f.y - v.y), length: v.zoom * f.length });

const fryFish = (t: number): WorldFish => {
  const f = fryAt(t);
  if (f.kind === 'inside') throw new Error(`fry inside at ${t}`);
  return f.fish;
};
const pose = (f: WorldFish): Pose => ({ j: 0, age: 0, ...f });

function expectSameOnScreen(a: WorldFish, va: View, b: WorldFish, vb: View): void {
  const sa = seen(a, va);
  const sb = seen(b, vb);
  expect(sb.x).toBeCloseTo(sa.x, 1);
  expect(sb.y).toBeCloseTo(sa.y, 1);
  expect(sb.length).toBeCloseTo(sa.length, 1);
  expect(b.facing).toBe(a.facing);
  expect(b.tilt).toBeCloseTo(a.tilt, 3);
  expect(b.effort).toBeCloseTo(a.effort, 3);
  expect(wrap(b.beat - a.beat)).toBeCloseTo(0, 3);
}

describe('promo short: he spat me out', () => {
  it('loops: the sheephead coming again at the end is the lunge at the start', () => {
    expectSameOnScreen(fryFish(0), viewAt(0), fryFish(END), viewAt(END));
    expectSameOnScreen(hunterFish(0), viewAt(0), hunterFish(END), viewAt(END));
    expect(hunterJaw(END)).toBeCloseTo(hunterJaw(0), 4);
    expect(hunterJaw(0)).toBeGreaterThan(0.5);
    expect(hunterMenace(END)).toBe(hunterMenace(0));
    expect(hunterEyes(END)).toBe(hunterEyes(0));
    expect(hunterLump(END).size).toBe(hunterLump(0).size);
    expect(fryAlarm(END)).toBeCloseTo(fryAlarm(0), 4);
    expect(fryAlarm(0)).toBeGreaterThan(0.5);
    expect(fryJaw(END)).toBe(fryJaw(0));
    expect(fryEyes(END)).toBe(fryEyes(0));
    expect(growthBar(END).alpha).toBe(0);
    expect(growthBar(0).alpha).toBe(0);
    expect(sardinesAt(0)).toHaveLength(0);
    expect(sardinesAt(END)).toHaveLength(0);
  });

  it('moves smoothly on screen: no frame jumps further than a dash, the camera included', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      const next = (t + FRAME) % LOOP_S;
      const v = viewAt(t);
      const w = viewAt(next);
      expect(Math.hypot(v.x - w.x, v.y - w.y)).toBeLessThan(25);
      const a = seen(hunterFish(t), v);
      const b = seen(hunterFish(next), w);
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(45);
      const fa = fryAt(t);
      const fb = fryAt(next);
      // Going in and coming out of his mouth are the only cuts.
      if (fa.kind !== 'swimming' || fb.kind !== 'swimming') continue;
      const p = seen(fa.fish, v);
      const q = seen(fb.fish, w);
      expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeLessThan(40);
    }
  });

  it('keeps the fish big, in frame, and clear of the captions and the bar', () => {
    expect(FRY_LEN).toBeGreaterThanOrEqual(170);
    for (let t = 0; t < LOOP_S; t += FRAME) {
      const v = viewAt(t);
      const f = fryAt(t);
      if (f.kind === 'swimming' || f.kind === 'spat') {
        const s = seen(f.fish, v);
        expect(s.x).toBeGreaterThan(100);
        expect(s.x).toBeLessThan(980);
        expect(s.y - 0.3 * s.length).toBeGreaterThan(480);
        expect(s.y + 0.3 * s.length).toBeLessThan(1120);
      }
      // The sheephead is tall: its body (about 0.23 of its length either side of the centre) stays between the captions and the bar.
      const h = seen(hunterFish(t), v);
      expect(h.y - 0.23 * h.length).toBeGreaterThan(480);
      expect(h.y + 0.23 * h.length).toBeLessThan(1120);
    }
  });

  it('is true to the game: chapter 3’s perch fry, a real chapter-3 hunter (not the boss), and the spines’ stun and cooldown', () => {
    const kelp = INKFISH_FULL_CHAPTERS.find((c) => c.zone === 'kelp')!;
    expect(kelp.player).toBe('perchfry');
    expect(PLAYER_ABILITY.perchfry).toBe('spines');
    expect(SPECIES_INFO.sheephead.hunter).toBe(true);
    const first = kelp.levels[0]!;
    const withSheephead = kelp.levels.filter((l) => l.spawns.some((s) => s.species === 'sheephead'));
    expect(withSheephead.length).toBeGreaterThan(0);
    const bosses = kelp.levels.flatMap((l) => (l.objective.kind === 'boss' ? [l.objective.species] : []));
    expect(bosses.length).toBeGreaterThan(0);
    expect(bosses).not.toContain('sheephead');
    // He's a predator to the fry at its starting size, as drawn.
    const sheep = withSheephead[0]!.spawns.find((s) => s.species === 'sheephead')!;
    expect(relationTo(playerSizeFor(first, 0), sheep.size[0])).toBe('predator');
    expect(HUNTER_LEN / FRY_LEN).toBeGreaterThan(2);
    // Stunned (light ink, lilac) for exactly the game's 2.2 s from the spit, then a hunter again.
    expect(STUN_S).toBeCloseTo(2.2, 6);
    expect(hunterMenace(SPIT_AT + 0.5)).toBe(0);
    expect(hunterMenace(STUN_END - 0.11)).toBe(0);
    expect(hunterMenace(STUN_END + 0.01)).toBe(1);
    expect(hunterMenace(PRICK_AT)).toBe(1);
    // The loop is the cooldown: the spines are ready again when he comes back.
    expect(LOOP_S).toBeGreaterThanOrEqual(SPINES_COOLDOWN_S);
  });

  it('swallows you whole, then spits you out of his mouth ahead of him', () => {
    const before = fryFish(SUCK_FROM - 1e-6);
    const after = fryFish(SUCK_FROM);
    expect(Math.hypot(before.x - after.x, before.y - after.y)).toBeLessThan(1);
    const mouth = mouthOf(pose(hunterFish(SUCK_FROM)));
    expect(Math.hypot(mouth.x - before.x, mouth.y - before.y)).toBeLessThan(FRY_LEN);
    expect(fryAt(GULP_AT).kind).toBe('inside');
    expect(fryAt(SPIT_AT - 0.01).kind).toBe('inside');
    expect(hunterLump(GULP_AT + 0.5).size).toBeGreaterThan(0);
    const out = fryAt(SPIT_AT);
    expect(out.kind).toBe('spat');
    const spat = fryFish(SPIT_AT);
    expect(Math.hypot(spat.x - SPOTS.spitFrom.x, spat.y - SPOTS.spitFrom.y)).toBeLessThan(1);
    expect(hunterJaw(SPIT_AT + 0.1)).toBe(1);
    // Tumbles clear ahead of him, upright again by the time it swims off.
    const free = fryFish(6.0);
    expect(free.x).toBeLessThan(hunterFish(6.0).x - 0.5 * HUNTER_LEN);
    expect(wrap(free.tilt)).toBeCloseTo(0, 1);
    // The payoff lands about 40% in.
    expect(SPIT_AT / LOOP_S).toBeGreaterThan(0.35);
    expect(SPIT_AT / LOOP_S).toBeLessThan(0.5);
  });

  it('eats a sardine afterwards: you keep playing', () => {
    expect(sardinesAt(SNACK_AT - 0.1).some((s) => s.kind === 'swallowed')).toBe(true);
    expect(sardinesAt(SNACK_AT + 0.01).length).toBe(2);
    expect(growthBar(SNACK_AT + 0.5).fill).toBeGreaterThan(growthBar(SNACK_AT - 0.5).fill);
  });

  it('shows the same words either side of the loop point, with something to read in the first frame', () => {
    for (const c of CAPTIONS) expect(captionAlpha(c, END)).toBeCloseTo(captionAlpha(c, 0), 3);
    expect(CAPTIONS.some((c) => captionAlpha(c, 0) === 1)).toBe(true);
    for (const c of CAPTIONS) {
      expect(c.y).toBeGreaterThan(270);
      expect(c.y).toBeLessThan(500);
    }
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect((LOOP_S * 30) % 1).toBe(0);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    // The game's own spines sound plays as the spines go in.
    expect(SOUNDS.some((s) => s.id === 'clang' && s.t === PRICK_AT && s.pitch === 1.4)).toBe(true);
  });
});
