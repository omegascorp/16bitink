import { describe, expect, it } from 'vitest';
import { INKFISH_FULL_CHAPTERS } from '../content/paid';
import { bodyProportions } from '../src/art/fishArt';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';
import { canSwallow, PLAYER_ABILITY } from '../src/logic/abilities';
import { addGrowth, initialGrowth, playerSizeFor } from '../src/logic/growth';
import { growthPointsFor, relationTo, scoreFor } from '../src/logic/sizing';
import { SPECIES_INFO } from '../src/levels/species';
import { SPINE } from '../dev/promo/slurp/noodle';
import {
  BITE_AT, CAPTIONS, captionAlpha, GOAL, GULP_AT, GULPER_LEN, GULPER_SIZE, gulperAlarm, gulperAt, gulperMouth, gulperMurk, gulperNose, growthBar, insertion, LOOP_S,
  lureGlow, MEAL_POINTS, POINTS_BEFORE, pullAt, SCALE, SCORE_TEXT, SLURP_AT, SLURPS, SOUNDS, SPURT, SUCK_FROM, VIPER_LEN, VIPER_SIZE, viewAt, viperBelly, viperEyes,
  viperFish, viperJaw, viperLength, type View, type WorldFish,
} from '../dev/promo/slurp/story';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FOCUS = { x: 540, y: 800 };
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

interface P { readonly x: number; readonly y: number }
/** What the camera shows of a point. */
const seenAt = (p: P, v: View): P => ({ x: FOCUS.x + v.zoom * (p.x - v.x), y: FOCUS.y + v.zoom * (p.y - v.y) });
const seen = (f: WorldFish, v: View) => ({ ...seenAt(f, v), length: v.zoom * f.length });

const spineAt = (t: number): readonly P[] => {
  const g = gulperAt(t);
  if (g.kind === 'gone') throw new Error(`no gulper at ${t}`);
  return g.spine;
};

/** Chapter 8's last level, as the game builds it. */
const MIDNIGHT = INKFISH_FULL_CHAPTERS.find((c) => c.id === 8)!.levels[9]!;

describe('promo short: how did that fit 2', () => {
  it('loops: the next gulper at the end is the first at the start, scaled up by the camera’s pull-back', () => {
    expect(pullAt(END)).toBeCloseTo(pullAt(0) + 1, 6);
    const [va, vb] = [viewAt(0), viewAt(END)];
    const a = seen(viperFish(0), va);
    const b = seen(viperFish(END), vb);
    expect(b.x).toBeCloseTo(a.x, 1);
    expect(b.y).toBeCloseTo(a.y, 1);
    expect(b.length).toBeCloseTo(a.length, 1);
    expect(viperFish(END).tilt).toBeCloseTo(viperFish(0).tilt, 3);
    expect(wrap(viperFish(END).beat - viperFish(0).beat)).toBeCloseTo(0, 3);
    // The gulper's whole body, nose to whip, where it was.
    const sa = spineAt(0);
    const sb = spineAt(END);
    sa.forEach((p, i) => {
      const pa = seenAt(p, va);
      const pb = seenAt(sb[i]!, vb);
      expect(pb.x).toBeCloseTo(pa.x, 0);
      expect(pb.y).toBeCloseTo(pa.y, 0);
    });
    expect(gulperAt(0).kind).toBe('swimming');
    expect(gulperAt(END).kind).toBe('swimming');
    expect(gulperMouth(END).jaw).toBeCloseTo(gulperMouth(0).jaw, 3);
    expect(gulperMouth(END).fill).toBeCloseTo(gulperMouth(0).fill, 3);
    expect(viperJaw(END)).toBeCloseTo(viperJaw(0), 3);
    expect(viperBelly(END).size).toBeCloseTo(0, 6);
    expect(viperEyes(END)).toBe(viperEyes(0));
    expect(gulperAlarm(END)).toBeCloseTo(gulperAlarm(0), 4);
    expect(gulperMurk(END)).toBeCloseTo(0, 6);
    expect(lureGlow(END)).toBeCloseTo(lureGlow(0), 4);
    expect(growthBar(END).alpha).toBe(0);
    expect(growthBar(0).alpha).toBe(0);
  });

  it('opens on two giant mouths: the viper’s jaw swinging wide, the gulper’s thrown open at it, its "!" up', () => {
    expect(viperJaw(0)).toBeGreaterThan(1.5);
    expect(viperJaw(FRAME)).toBeGreaterThan(viperJaw(0));
    expect(gulperMouth(0).jaw).toBeGreaterThan(0.95);
    expect(gulperMouth(0).fill).toBeGreaterThan(0.4);
    expect(gulperAlarm(0)).toBeGreaterThan(0.9);
    // Facing each other: the gulper's nose just ahead of the viper's, on screen.
    const v = viewAt(0);
    const you = seen(viperFish(0), v);
    const nose = seenAt(gulperNose(spineAt(0)), v);
    expect(nose.x).toBeGreaterThan(you.x + you.length / 2);
    expect(nose.x).toBeLessThan(you.x + you.length);
    expect(nose.x).toBeLessThan(900);
  });

  it('moves smoothly on screen: no frame jumps further than a lunge, the camera and the noodle included', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      const next = (t + FRAME) % LOOP_S;
      const a = seen(viperFish(t), viewAt(t));
      const b = seen(viperFish(next), viewAt(next));
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(40);
      const v = viewAt(t);
      const w = viewAt(next);
      expect(Math.hypot(v.zoom * v.x - w.zoom * w.x, v.zoom * v.y - w.zoom * w.y)).toBeLessThan(40);
      const ga = gulperAt(t);
      const gb = gulperAt(next);
      if (ga.kind !== 'gone' && gb.kind !== 'gone') {
        // Every point of it: the whip flicks fast, but never teleports.
        ga.spine.forEach((p, i) => {
          const q = seenAt(p, v);
          const r = seenAt(gb.spine[i]!, w);
          expect(Math.hypot(q.x - r.x, q.y - r.y)).toBeLessThan(70);
        });
      }
    }
  });

  it('keeps the viper big, in frame, and between the captions and the growth bar; the noodle above the bar', () => {
    for (let t = 0; t < LOOP_S; t += 0.1) {
      const v = viewAt(t);
      const s = seen(viperFish(t), v);
      expect(s.length).toBeGreaterThan(440);
      expect(s.x - s.length / 2).toBeGreaterThan(0);
      expect(s.x + s.length / 2).toBeLessThan(1080);
      expect(s.y).toBeGreaterThan(620);
      expect(s.y).toBeLessThan(960);
      const g = gulperAt(t);
      if (g.kind === 'swallowed') for (const p of g.spine) expect(seenAt(p, v).y).toBeLessThan(1110);
    }
  });

  it('is faithful to the game: a gulper eel of chapter 8’s last level, a peer only the gape can swallow, worth a stage-up', () => {
    expect(PLAYER_ABILITY.viperfish).toBe('gape');
    expect(SPECIES_INFO.gulper.note).toBe('All mouth. Can swallow bigger fish.');
    expect(SPECIES_INFO.gulper.hunter).toBe(true);
    // The level: the viper's stages, and its gulpers.
    expect(MIDNIGHT.name).toBe('Midnight');
    expect(MIDNIGHT.playerSizes[3]).toBe(VIPER_SIZE);
    expect(MIDNIGHT.playerSizes[4]! / MIDNIGHT.playerSizes[3]!).toBeCloseTo(SCALE, 6);
    expect(MIDNIGHT.tiers[MIDNIGHT.tiers.length - 1]).toBe(GOAL);
    const gulpers = MIDNIGHT.spawns.find((s) => s.species === 'gulper')!;
    expect(GULPER_SIZE).toBeGreaterThanOrEqual(gulpers.size[0]);
    expect(GULPER_SIZE).toBeLessThanOrEqual(gulpers.size[1]);
    // A peer: only the viper's gape gets it down.
    expect(relationTo(VIPER_SIZE, GULPER_SIZE)).toBe('peer');
    expect(canSwallow('gape', relationTo(VIPER_SIZE, GULPER_SIZE))).toBe(true);
    expect(canSwallow('ink', relationTo(VIPER_SIZE, GULPER_SIZE))).toBe(false);
    // Its points take the viper from its fourth stage to its fifth: "Bigger!".
    const before = addGrowth(MIDNIGHT, initialGrowth, POINTS_BEFORE);
    const after = addGrowth(MIDNIGHT, before, growthPointsFor(GULPER_SIZE));
    expect(playerSizeFor(MIDNIGHT, before.tier)).toBe(VIPER_SIZE);
    expect(playerSizeFor(MIDNIGHT, after.tier)).toBe(MIDNIGHT.playerSizes[4]);
    expect(after.complete).toBe(false);
    expect(MEAL_POINTS).toBe(growthPointsFor(GULPER_SIZE));
    expect(SCORE_TEXT).toBe(`+${scoreFor(GULPER_SIZE, 1)}`);
    // The second helping (the first, a stage bigger) is a chapter 8 gulper too (levels 7-9 spawn them at 66-102), and a peer of the bigger viper.
    const later = INKFISH_FULL_CHAPTERS.find((c) => c.id === 8)!.levels.slice(6, 9).map((l) => l.spawns.find((s) => s.species === 'gulper')!.size);
    expect(later.some(([lo, hi]) => GULPER_SIZE * SCALE >= lo && GULPER_SIZE * SCALE <= hi)).toBe(true);
    expect(relationTo(VIPER_SIZE * SCALE, GULPER_SIZE * SCALE)).toBe('peer');
    // Drawn the game's way, it is as long as the viper, and much thinner.
    expect(GULPER_LEN).toBeGreaterThan(0.95 * VIPER_LEN);
    const depth = (shape: 'viperfish' | 'gulper', len: number): number => (len * bodyProportions(shape).hh) / bodyProportions(shape).hl;
    expect(depth('gulper', GULPER_LEN)).toBeLessThan(0.7 * depth('viperfish', VIPER_LEN));
  });

  it('slurps it like spaghetti: dragged in from where it was, a pull at each slurp, all in by the gulp, and the belly balloons', () => {
    const before = spineAt(SUCK_FROM - 1e-6);
    const after = spineAt(SUCK_FROM);
    before.forEach((p, i) => expect(Math.hypot(p.x - after[i]!.x, p.y - after[i]!.y)).toBeLessThan(1));
    expect(insertion(BITE_AT + 0.4)).toBeGreaterThan(25);
    // Each slurp pulls it further in.
    for (const s of SLURPS) expect(insertion(s + 0.3)).toBeGreaterThan(insertion(s - 0.05) + 20);
    expect(insertion(SLURP_AT)).toBeLessThan(0.8 * SPINE.to);
    expect(insertion(GULP_AT - 0.05)).toBeGreaterThanOrEqual(SPINE.to);
    expect(gulperAt(GULP_AT).kind).toBe('gone');
    expect(viperJaw(GULP_AT - 0.01)).toBeGreaterThan(2.5);
    expect(viperJaw(GULP_AT + 0.1)).toBeLessThan(0.05);
    expect(viperBelly(GULP_AT + 0.3).size).toBeGreaterThan(1);
    // The payoff lands 40-50% of the way in.
    expect(GULP_AT / LOOP_S).toBeGreaterThan(0.38);
    expect(GULP_AT / LOOP_S).toBeLessThan(0.5);
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
      expect(c.y).toBeGreaterThan(270);
      expect(c.y).toBeLessThan(1250);
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
    // A slurp sound on every slurp: the mouth's suck, pitched up.
    for (const s of SLURPS) expect(SOUNDS.some((c) => c.id === 'suck' && c.pitch > 1.2 && Math.abs(c.t - s) < 0.2)).toBe(true);
  });
});
