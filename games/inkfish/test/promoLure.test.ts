import { describe, expect, it } from 'vitest';
import { INKFISH_FULL_CHAPTERS } from '../content/paid';
import { bodyProportions } from '../src/art/fishArt';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';
import { canSwallow, PLAYER_ABILITY } from '../src/logic/abilities';
import { addGrowth, initialGrowth, playerSizeFor } from '../src/logic/growth';
import { growthPointsFor, relationTo, scoreFor } from '../src/logic/sizing';
import { SPECIES_INFO } from '../src/levels/species';
import {
  ANGLER_GAPE, ANGLER_LEN, ANGLER_SIZE, anglerAlarm, anglerAt, anglerJaw, anglerMurk, bellyLight, BITE_AT, CAPTIONS, captionAlpha, GOAL, GULP_AT, growthBar, insertion,
  LIGHT_IN, LIGHT_ON, LOOP_S, lureAt, lureLight, MEAL_POINTS, POINTS_BEFORE, pullAt, SCALE, SCORE_TEXT, SLURP_AT, SNAG_AT, SOUNDS, SPURT, SUCK_FROM, VIPER_LEN,
  VIPER_SIZE, viewAt, viperBelly, viperEyes, viperFish, viperJaw, viperLength, type View, type WorldFish,
} from '../dev/promo/lure/story';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FOCUS = { x: 540, y: 800 };
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

interface P { readonly x: number; readonly y: number }
/** What the camera shows of a point, and of a fish. */
const seenAt = (p: P, v: View): P => ({ x: FOCUS.x + v.zoom * (p.x - v.x), y: FOCUS.y + v.zoom * (p.y - v.y) });
const seen = (f: WorldFish, v: View) => ({ ...seenAt(f, v), length: v.zoom * f.length });

const anglerFish = (t: number): WorldFish => {
  const a = anglerAt(t);
  if (a.kind === 'gone') throw new Error(`no angler at ${t}`);
  return a.fish;
};
const lure = (t: number) => {
  const l = lureAt(t);
  if (!l) throw new Error(`no lure at ${t}`);
  return l;
};

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

/** Chapter 8's last level, as the game builds it: the viper's sizes. */
const MIDNIGHT = INKFISH_FULL_CHAPTERS.find((c) => c.id === 8)!.levels[9]!;
/** Where the game spawns anglers: the trench, chapter 10. */
const TRENCH = INKFISH_FULL_CHAPTERS.find((c) => c.id === 10)!;
const anglerSizes = TRENCH.levels.flatMap((l) => l.spawns.filter((s) => s.species === 'angler').map((s) => s.size));

describe('promo short: how did that fit 3', () => {
  it('loops: the next angler at the end is the first at the start, its light where it was, scaled up by the camera’s pull-back', () => {
    expect(pullAt(END)).toBeCloseTo(pullAt(0) + 1, 6);
    const [va, vb] = [viewAt(0), viewAt(END)];
    expectSameOnScreen(viperFish(0), va, viperFish(END), vb);
    expectSameOnScreen(anglerFish(0), va, anglerFish(END), vb);
    expect(anglerAt(0).kind).toBe('swimming');
    expect(anglerAt(END).kind).toBe('swimming');
    const [la, lb] = [lure(0), lure(END)];
    for (const key of ['root', 'bend', 'bulb'] as const) {
      const pa = seenAt(la[key], va);
      const pb = seenAt(lb[key], vb);
      expect(pb.x).toBeCloseTo(pa.x, 1);
      expect(pb.y).toBeCloseTo(pa.y, 1);
    }
    expect(lb.k * vb.zoom).toBeCloseTo(la.k * va.zoom, 3);
    expect(lb.glow).toBeCloseTo(la.glow, 3);
    expect(lb.snag).toBeNull();
    expect(anglerJaw(END)).toBeCloseTo(anglerJaw(0), 3);
    expect(viperJaw(END)).toBeCloseTo(viperJaw(0), 3);
    expect(viperBelly(END).size).toBeCloseTo(0, 6);
    expect(viperBelly(0).size).toBe(0);
    expect(viperEyes(END)).toBe(viperEyes(0));
    expect(anglerAlarm(END)).toBeCloseTo(anglerAlarm(0), 4);
    expect(anglerMurk(END)).toBeCloseTo(0, 6);
    expect(bellyLight(END)).toBe(0);
    expect(bellyLight(0)).toBe(0);
    expect(growthBar(END).alpha).toBe(0);
    expect(growthBar(0).alpha).toBe(0);
  });

  it('opens on two mouths open at each other, the lit lure between them, the angler’s "!" up, and no numbers', () => {
    expect(viperJaw(0)).toBeGreaterThan(1.5);
    expect(viperJaw(FRAME)).toBeGreaterThan(viperJaw(0));
    expect(anglerJaw(0)).toBeCloseTo(ANGLER_GAPE, 3);
    expect(anglerAlarm(0)).toBeGreaterThan(0.9);
    expect(lure(0).glow).toBeGreaterThan(0.8);
    // Facing each other, mouth to mouth: the angler's nose just ahead of the viper's.
    const v = viewAt(0);
    const you = seen(viperFish(0), v);
    const it = seen(anglerFish(0), v);
    const nose = it.x - it.length / 2;
    expect(anglerFish(0).facing).toBe(-1);
    expect(nose).toBeGreaterThan(you.x + you.length / 2);
    expect(nose).toBeLessThan(you.x + you.length / 2 + 0.3 * you.length);
    // The light hangs between and above the two mouths, on screen.
    const bulb = seenAt(lure(0).bulb, v);
    expect(bulb.x).toBeGreaterThan(you.x + you.length * 0.3);
    expect(bulb.x).toBeLessThan(it.x);
    expect(bulb.y).toBeLessThan(it.y);
    // No score, no growth bar.
    expect(growthBar(0).alpha).toBe(0);
  });

  it('moves smoothly on screen: no frame jumps further than a lunge, the camera and the lure included', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      const next = (t + FRAME) % LOOP_S;
      const [v, w] = [viewAt(t), viewAt(next)];
      const a = seen(viperFish(t), v);
      const b = seen(viperFish(next), w);
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(40);
      expect(Math.hypot(v.zoom * v.x - w.zoom * w.x, v.zoom * v.y - w.zoom * w.y)).toBeLessThan(40);
      const fa = anglerAt(t);
      const fb = anglerAt(next);
      if (fa.kind !== 'gone' && fb.kind !== 'gone') {
        const p = seen(fa.fish, v);
        const q = seen(fb.fish, w);
        expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeLessThan(45);
      }
      const la = lureAt(t);
      const lb = lureAt(next);
      // The bulb whips in on the last slurp; otherwise it bobs.
      if (la && lb) expect(Math.hypot(seenAt(la.bulb, v).x - seenAt(lb.bulb, w).x, seenAt(la.bulb, v).y - seenAt(lb.bulb, w).y)).toBeLessThan(t > SLURP_AT ? 90 : 50);
    }
  });

  it('keeps the viper big, in frame, and between the captions and the growth bar; the light in frame while it’s lit', () => {
    for (let t = 0; t < LOOP_S; t += 0.1) {
      const v = viewAt(t);
      const s = seen(viperFish(t), v);
      expect(s.length).toBeGreaterThan(440);
      expect(s.x - s.length / 2).toBeGreaterThan(0);
      expect(s.x + s.length / 2).toBeLessThan(1080);
      expect(s.y).toBeGreaterThan(620);
      expect(s.y).toBeLessThan(960);
      const l = lureAt(t);
      if (l && l.glow > 0.1) {
        const b = seenAt(l.bulb, v);
        expect(b.x).toBeGreaterThan(40);
        expect(b.x).toBeLessThan(1040);
        expect(b.y).toBeGreaterThan(500);
        expect(b.y).toBeLessThan(1100);
      }
    }
  });

  it('is faithful to the game: an anglerfish of a size the game spawns, a peer only the gape can swallow, worth a stage-up', () => {
    expect(PLAYER_ABILITY.viperfish).toBe('gape');
    expect(SPECIES_INFO.angler.note).toBe('Follow the light, become dinner.');
    expect(SPECIES_INFO.angler.hunter).toBe(true);
    // The viper's stages: chapter 8's last level.
    expect(MIDNIGHT.name).toBe('Midnight');
    expect(MIDNIGHT.playerSizes[3]).toBe(VIPER_SIZE);
    expect(MIDNIGHT.playerSizes[4]! / MIDNIGHT.playerSizes[3]!).toBeCloseTo(SCALE, 6);
    expect(MIDNIGHT.tiers[MIDNIGHT.tiers.length - 1]).toBe(GOAL);
    // Both anglers (the second a stage bigger) are sizes the game spawns them at, and peers of the viper eating them.
    for (const [viper, angler] of [[VIPER_SIZE, ANGLER_SIZE], [VIPER_SIZE * SCALE, ANGLER_SIZE * SCALE]] as const) {
      expect(anglerSizes.some(([lo, hi]) => angler >= lo && angler <= hi)).toBe(true);
      expect(relationTo(viper, angler)).toBe('peer');
      expect(angler).toBeGreaterThan(viper);
      expect(canSwallow('gape', relationTo(viper, angler))).toBe(true);
      expect(canSwallow('ink', relationTo(viper, angler))).toBe(false);
    }
    // Its points take the viper from its fourth stage to its fifth: "Bigger!".
    const before = addGrowth(MIDNIGHT, initialGrowth, POINTS_BEFORE);
    const after = addGrowth(MIDNIGHT, before, growthPointsFor(ANGLER_SIZE));
    expect(playerSizeFor(MIDNIGHT, before.tier)).toBe(VIPER_SIZE);
    expect(playerSizeFor(MIDNIGHT, after.tier)).toBe(MIDNIGHT.playerSizes[4]);
    expect(after.complete).toBe(false);
    expect(MEAL_POINTS).toBe(growthPointsFor(ANGLER_SIZE));
    expect(SCORE_TEXT).toBe(`+${scoreFor(ANGLER_SIZE, 1)}`);
    // Drawn the game's way, it is a ball of a fish: over twice as deep as the viper.
    const depth = (shape: 'viperfish' | 'angler', len: number): number => (len * bodyProportions(shape).hh) / bodyProportions(shape).hl;
    expect(depth('angler', ANGLER_LEN)).toBeGreaterThan(2 * depth('viperfish', VIPER_LEN));
  });

  it('swallows it whole, lure last: dragged in, the stalk caught on the lip, the light in after the tail, glowing through the belly, then out', () => {
    const before = anglerFish(SUCK_FROM - 1e-6);
    const after = anglerFish(SUCK_FROM);
    expect(Math.hypot(before.x - after.x, before.y - after.y)).toBeLessThan(1);
    expect(insertion(BITE_AT + 0.5)).toBeGreaterThan(0.2);
    expect(insertion(GULP_AT - 1e-6)).toBeGreaterThan(0.95);
    // Caught on the lip through the heaves, out in the water.
    expect(SNAG_AT).toBeGreaterThan(BITE_AT);
    expect(SNAG_AT).toBeLessThan(1.5);
    for (const t of [1.6, 2.5, 3.4, 4.3]) expect(lure(t).snag).not.toBeNull();
    // The light goes in last: after the angler is all in.
    expect(LIGHT_IN).toBeGreaterThanOrEqual(GULP_AT);
    expect(anglerAt(GULP_AT).kind).toBe('gone');
    expect(lure(GULP_AT - 0.1).swallowed).toBe(0);
    expect(lure(GULP_AT).swallowed).toBeGreaterThan(0);
    expect(lureAt(LIGHT_IN)).toBeNull();
    expect(bellyLight(LIGHT_IN + 0.2)).toBeGreaterThan(0.8);
    expect(bellyLight(6.0)).toBeGreaterThan(0.2);
    expect(bellyLight(7.0)).toBe(0);
    expect(viperJaw(GULP_AT - 0.01)).toBeGreaterThan(2.5);
    expect(viperJaw(GULP_AT + 0.1)).toBeLessThan(0.05);
    expect(viperBelly(GULP_AT + 0.3).size).toBeGreaterThan(1);
    // The payoff lands 40-50% of the way in.
    expect(GULP_AT / LOOP_S).toBeGreaterThan(0.38);
    expect(GULP_AT / LOOP_S).toBeLessThan(0.5);
  });

  it('lights the next lure in the dark ahead before the angler under it shows', () => {
    expect(lureLight(LIGHT_ON - 0.05)).toBe(0);
    expect(lureLight(LIGHT_ON + 0.4)).toBeGreaterThan(0.8);
    expect(anglerMurk(LIGHT_ON + 0.4)).toBe(1);
    expect(anglerMurk(11)).toBe(0);
  });

  it('grows one stage on the meal: SCALE times longer, as the game steps sizes', () => {
    expect(viperLength(SPURT - 0.01)).toBeCloseTo(VIPER_LEN, 6);
    expect(viperLength(SPURT + 2)).toBeCloseTo(VIPER_LEN * SCALE, 2);
    expect(SCALE).toBeGreaterThan(1.3);
    expect(SCALE).toBeLessThan(1.5);
  });

  it('shows the same words either side of the loop point, with something to read in the first frame', () => {
    for (const c of CAPTIONS) {
      expect(captionAlpha(c, END)).toBeCloseTo(captionAlpha(c, 0), 3);
      const rows = c.text.split('\n').length;
      expect(c.y).toBeGreaterThan(270);
      expect(c.y + (rows - 1) * c.size * 1.02).toBeLessThan(560);
    }
    expect(CAPTIONS.some((c) => captionAlpha(c, 0) === 1)).toBe(true);
    for (let t = 0; t < LOOP_S; t += 0.05) expect(CAPTIONS.filter((c) => captionAlpha(c, t) > 0).length).toBeLessThanOrEqual(1);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect((LOOP_S * 30) % 1).toBe(0);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    expect(LOOP_S % 1.5).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    // A click as the next light comes on.
    expect(SOUNDS.some((c) => c.id === 'click' && Math.abs(c.t - LIGHT_ON) < 0.05)).toBe(true);
  });
});
