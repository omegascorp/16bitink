import { describe, expect, it } from 'vitest';
import { INKFISH_FULL_CHAPTERS } from '../content/paid';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';
import { canSwallow, PLAYER_ABILITY } from '../src/logic/abilities';
import { addGrowth, initialGrowth, playerSizeFor } from '../src/logic/growth';
import { growthPointsFor, relationTo, scoreFor } from '../src/logic/sizing';
import { SPECIES_INFO } from '../src/levels/species';
import {
  BITE_AT, CAPTIONS, captionAlpha, DRAWN_SHARK_LEN, finBump, finLight, GOAL, GULP_AT, growthBar, insertion, LOOP_S, MEAL_POINTS, POINTS_BEFORE, pullAt, SCALE, SCORE_TEXT,
  SHARK_GAPE, SHARK_LEN, SHARK_SIZE, sharkAlarm, sharkAt, sharkEyeWide, sharkJaw, sharkMurk, sharkStretch, SLURP_AT, SOUNDS, SPOT_AT, SPURT, SUCK_FROM, tailFlick, viewAt,
  viperBelly, viperEyes, viperFish, viperJaw, viperLength, VIPER_LEN, VIPER_SIZE, type View, type WorldFish,
} from '../dev/promo/gulpshark/story';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FOCUS = { x: 540, y: 800 };
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

interface P { readonly x: number; readonly y: number }
const seenAt = (p: P, v: View): P => ({ x: FOCUS.x + v.zoom * (p.x - v.x), y: FOCUS.y + v.zoom * (p.y - v.y) });
const seen = (f: WorldFish, v: View) => ({ ...seenAt(f, v), length: v.zoom * f.length });

const sharkFish = (t: number): WorldFish => {
  const a = sharkAt(t);
  if (a.kind === 'gone') throw new Error(`no shark at ${t}`);
  return a.fish;
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

describe('promo short: how did that fit 4 (the shark)', () => {
  it('loops: the next shark at the end is the first at the start, scaled up by the camera’s pull-back', () => {
    expect(pullAt(END)).toBeCloseTo(pullAt(0) + 1, 6);
    const [va, vb] = [viewAt(0), viewAt(END)];
    expectSameOnScreen(viperFish(0), va, viperFish(END), vb);
    expectSameOnScreen(sharkFish(0), va, sharkFish(END), vb);
    expect(sharkAt(0).kind).toBe('swimming');
    expect(sharkAt(END).kind).toBe('swimming');
    expect(sharkJaw(END)).toBeCloseTo(sharkJaw(0), 3);
    expect(viperJaw(END)).toBeCloseTo(viperJaw(0), 3);
    expect(viperBelly(END).size).toBeCloseTo(0, 6);
    expect(viperBelly(0).size).toBe(0);
    expect(viperEyes(END)).toBe(viperEyes(0));
    expect(sharkAlarm(END)).toBeCloseTo(sharkAlarm(0), 4);
    expect(sharkMurk(END)).toBeCloseTo(0, 6);
    expect(sharkStretch(END)).toBe(sharkStretch(0));
    expect(finLight(END)).toBe(finLight(0));
    expect(sharkEyeWide(END)).toBeCloseTo(sharkEyeWide(0), 6);
    expect(finBump(END)).toBe(0);
    expect(finBump(0)).toBe(0);
    expect(growthBar(END).alpha).toBe(0);
    expect(growthBar(0).alpha).toBe(0);
  });

  it('opens on the viper’s jaw wide round the shark’s nose, the shark’s "!" up, and no numbers', () => {
    expect(viperJaw(0)).toBeGreaterThan(1.5);
    expect(viperJaw(FRAME)).toBeGreaterThan(viperJaw(0));
    expect(sharkAlarm(0)).toBeGreaterThan(0.9);
    const v = viewAt(0);
    const you = seen(viperFish(0), v);
    const it = seen(sharkFish(0), v);
    const nose = it.x - it.length / 2;
    expect(sharkFish(0).facing).toBe(-1);
    // Only the tip of its snout is in the viper’s open jaws: its face stays out, beside the lips.
    expect(nose).toBeLessThan(you.x + you.length / 2);
    expect(nose).toBeGreaterThan(you.x + you.length * 0.44);
    expect(sharkEyeWide(0)).toBe(1);
    // Everything that says "shark" is in frame, from its eye back to its first dorsal fin (0.48 of its length); its tail may run off.
    expect(nose + it.length * 0.48).toBeLessThan(1060);
    // The mouth and the face fill the width: the lips in the middle of the frame, both fish bigger than the old 450 px viper.
    expect(you.x + you.length / 2).toBeGreaterThan(400);
    expect(you.x + you.length / 2).toBeLessThan(640);
    expect(you.length).toBeGreaterThan(450 * 1.3);
    expect(you.length).toBeLessThan(450 * 1.5);
    expect(growthBar(0).alpha).toBe(0);
  });

  it('moves smoothly on screen: no frame jumps further than a lunge, the camera included', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      const next = (t + FRAME) % LOOP_S;
      const [v, w] = [viewAt(t), viewAt(next)];
      const a = seen(viperFish(t), v);
      const b = seen(viperFish(next), w);
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(56);
      expect(Math.hypot(v.zoom * v.x - w.zoom * w.x, v.zoom * v.y - w.zoom * w.y)).toBeLessThan(56);
      const fa = sharkAt(t);
      const fb = sharkAt(next);
      if (fa.kind !== 'gone' && fb.kind !== 'gone') {
        const p = seen(fa.fish, v);
        const q = seen(fb.fish, w);
        expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeLessThan(63);
      }
    }
  });

  it('keeps the viper big, its head in frame (all of it for the belly), and between the captions and the growth bar', () => {
    for (let t = 0; t < LOOP_S; t += 0.1) {
      const s = seen(viperFish(t), viewAt(t));
      expect(s.length).toBeGreaterThan(600);
      expect(s.x + s.length / 2).toBeLessThan(1080);
      expect(s.x + s.length * 0.2).toBeGreaterThan(0);
      if (t > GULP_AT && t < 7.5) expect(s.x - s.length / 2).toBeGreaterThan(-20);
      expect(s.y).toBeGreaterThan(620);
      expect(s.y).toBeLessThan(960);
    }
  });

  it('is faithful to the game: a reef shark that is a peer of the viper, only the gape can swallow it, worth a stage-up', () => {
    expect(PLAYER_ABILITY.viperfish).toBe('gape');
    expect(SPECIES_INFO.shark.hunter).toBe(true);
    expect(MIDNIGHT.name).toBe('Midnight');
    expect(MIDNIGHT.playerSizes[3]).toBe(VIPER_SIZE);
    expect(MIDNIGHT.playerSizes[4]! / MIDNIGHT.playerSizes[3]!).toBeCloseTo(SCALE, 6);
    expect(MIDNIGHT.tiers[MIDNIGHT.tiers.length - 1]).toBe(GOAL);
    // Both sharks (the second a stage bigger) are peers of the viper eating them, and bigger than it.
    for (const [viper, shark] of [[VIPER_SIZE, SHARK_SIZE], [VIPER_SIZE * SCALE, SHARK_SIZE * SCALE]] as const) {
      expect(relationTo(viper, shark)).toBe('peer');
      expect(shark).toBeGreaterThan(viper);
      expect(canSwallow('gape', relationTo(viper, shark))).toBe(true);
      expect(canSwallow('ink', relationTo(viper, shark))).toBe(false);
    }
    // As long as a peer can honestly be: about the viper’s own length, and deeper.
    expect(SHARK_LEN / VIPER_LEN).toBeGreaterThan(0.9);
    // Drawn bigger than that on purpose, so that on screen it is plainly the bigger fish.
    expect(DRAWN_SHARK_LEN / VIPER_LEN).toBeGreaterThan(1.4);
    const before = addGrowth(MIDNIGHT, initialGrowth, POINTS_BEFORE);
    const after = addGrowth(MIDNIGHT, before, growthPointsFor(SHARK_SIZE));
    expect(playerSizeFor(MIDNIGHT, before.tier)).toBe(VIPER_SIZE);
    expect(playerSizeFor(MIDNIGHT, after.tier)).toBe(MIDNIGHT.playerSizes[4]);
    expect(after.complete).toBe(false);
    expect(MEAL_POINTS).toBe(growthPointsFor(SHARK_SIZE));
    expect(SCORE_TEXT).toBe(`+${scoreFor(SHARK_SIZE, 1)}`);
  });

  it('swallows it whole, tail last: dragged in, stuck half way, the tail fin in a beat late with one flick, a balloon belly with one fin pressing out', () => {
    const before = sharkFish(SUCK_FROM - 1e-6);
    const after = sharkFish(SUCK_FROM);
    expect(Math.hypot(before.x - after.x, before.y - after.y)).toBeLessThan(1);
    expect(insertion(BITE_AT + 0.5)).toBeGreaterThan(0.2);
    expect(insertion(GULP_AT - 1e-6)).toBeGreaterThan(0.95);
    expect(insertion(SLURP_AT - 0.01)).toBeLessThan(0.6);
    // The flick comes after the last slurp has begun, once, and is over by the gulp.
    expect(tailFlick(SLURP_AT)).toBe(0);
    expect(tailFlick(SLURP_AT + 0.22)).toBeGreaterThan(0.9);
    expect(tailFlick(GULP_AT)).toBe(0);
    expect(sharkAt(GULP_AT).kind).toBe('gone');
    expect(viperJaw(GULP_AT - 0.01)).toBeGreaterThan(2.5);
    expect(viperJaw(GULP_AT + 0.1)).toBeLessThan(0.05);
    expect(viperBelly(GULP_AT + 0.3).size).toBeGreaterThan(1.5);
    expect(finBump(GULP_AT + 0.4)).toBeGreaterThan(0.5);
    expect(finBump(6)).toBeGreaterThan(0.5);
    expect(finBump(9)).toBe(0);
    expect(GULP_AT / LOOP_S).toBeGreaterThan(0.38);
    expect(GULP_AT / LOOP_S).toBeLessThan(0.5);
  });

  it('brings the next shark out of the dark fin first, and turns it on you', () => {
    expect(sharkMurk(8.2)).toBe(0);
    expect(sharkMurk(8.4)).toBe(1);
    expect(finLight(9.0)).toBeGreaterThan(0.9);
    expect(finLight(7)).toBe(0);
    // It swims away, then comes round (its drawing narrowing to a head-on view) to face the viper.
    expect(sharkFish(9).facing).toBe(1);
    expect(sharkFish(11).facing).toBe(-1);
    expect(sharkStretch(9.95)).toBeLessThan(0.3);
    expect(sharkStretch(9)).toBe(1);
    expect(sharkJaw(11)).toBeGreaterThan(0.4 * SHARK_GAPE);
    // Its flat eye goes wide only as it sees the teeth, with its "!".
    expect(sharkEyeWide(SPOT_AT - 0.1)).toBe(0);
    expect(sharkEyeWide(SPOT_AT + 0.2)).toBe(1);
    // Its face stays in frame, the tail free to run off: from the turn to the strike the eye and gills are on screen.
    for (let t = 10.3; t < 11.7; t += 0.1) {
      const it = seen(sharkFish(t), viewAt(t));
      expect(it.x - it.length * 0.2).toBeLessThan(1000);
      expect(it.x - it.length / 2).toBeGreaterThan(0);
    }
  });

  it('grows one stage on the meal: SCALE times longer, as the game steps sizes', () => {
    expect(viperLength(SPURT - 0.01)).toBeCloseTo(VIPER_LEN, 6);
    expect(viperLength(SPURT + 2)).toBeCloseTo(VIPER_LEN * SCALE, 2);
    expect(SCALE).toBeGreaterThan(1.3);
    expect(SCALE).toBeLessThan(1.5);
  });

  it('shows the same words either side of the loop point, none on the first frame, the first from 0.15 on, all in y 270..1250', () => {
    for (const c of CAPTIONS) {
      expect(captionAlpha(c, END)).toBeCloseTo(captionAlpha(c, 0), 3);
      const rows = c.text.split('\n').length;
      expect(c.from).toBeGreaterThanOrEqual(0.15);
      expect(c.y).toBeGreaterThan(270);
      expect(c.y + (rows - 1) * c.size * 1.02).toBeLessThan(560);
    }
    for (let t = 0; t <= 0.15; t += 0.01) for (const c of CAPTIONS) expect(captionAlpha(c, t)).toBe(0);
    expect(CAPTIONS.map((c) => c.text)).toEqual(expect.arrayContaining(['not the shark', 'how did THAT fit']));
    const on = CAPTIONS.find((c) => c.text === 'how did THAT fit')!;
    expect(on.from).toBeLessThanOrEqual(GULP_AT + 0.2);
    expect(on.from).toBeGreaterThanOrEqual(GULP_AT);
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
    expect(SOUNDS.some((c) => c.id === 'eatBig' && c.t === GULP_AT)).toBe(true);
  });
});
