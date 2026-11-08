import { describe, expect, it } from 'vitest';
import { bodyProportions } from '../src/art/fishArt';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';
import { canSwallow, PLAYER_ABILITY } from '../src/logic/abilities';
import { addGrowth, initialGrowth, playerSizeFor } from '../src/logic/growth';
import { growthPointsFor, relationTo, scoreFor } from '../src/logic/sizing';
import { INKFISH_FULL_CHAPTERS } from '../content/paid';
import {
  BITE_AT, CAPTIONS, captionAlpha, GULP_AT, growthBar, HEAVES, LOOP_S, MEAL_POINTS, POINTS_BEFORE, pullAt, SCALE, SCORE_TEXT, SLURP_AT, SOUNDS, SWORD_SIZE, SWORD_WHOLE,
  DRAWN, FOCUS as FOCUS_PT, rotated, SWORD_TIP, swordAlarm, swordAt, swordD, swordMurk, TOOTH_FROM, TOOTHPICK, viewAt, viperBelly, viperEyes, viperFish, viperJaw, VIPER_LEN, VIPER_SIZE, bellySword,
  type View, type WorldFish,
} from '../dev/promo/gulpsword/story';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

interface P { readonly x: number; readonly y: number }
const seenAt = (p: P, v: View): P => rotated({ x: FOCUS_PT.x + v.zoom * (p.x - v.x), y: FOCUS_PT.y + v.zoom * (p.y - v.y) });
const seen = (f: WorldFish, v: View) => ({ ...seenAt(f, v), length: v.zoom * f.length });

const f0 = (t: number): WorldFish => viperFish(t);
const swordFish = (t: number): WorldFish => {
  const s = swordAt(t);
  if (s.kind === 'gone') throw new Error(`no swordfish at ${t}`);
  return s.fish;
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

const BODY_HL = bodyProportions('swordfish').hl;
const MIDNIGHT = INKFISH_FULL_CHAPTERS.find((c) => c.id === 8)!.levels[9]!;
const GOAL_POINTS = MIDNIGHT.tiers[MIDNIGHT.tiers.length - 1]!;

describe('promo short: how did that fit 4 (swordfish)', () => {
  it('loops: the next swordfish at the end is the first at the start, scaled up by the camera’s pull-back', () => {
    expect(pullAt(END)).toBeCloseTo(pullAt(0) + 1, 6);
    const [va, vb] = [viewAt(0), viewAt(END)];
    expectSameOnScreen(viperFish(0), va, viperFish(END), vb);
    expectSameOnScreen(swordFish(0), va, swordFish(END), vb);
    expect(swordAt(0).kind).toBe('there');
    expect(swordAt(END).kind).toBe('there');
    expect(viperJaw(END)).toBeCloseTo(viperJaw(0), 3);
    expect(viperBelly(END).size).toBeCloseTo(viperBelly(0).size, 4);
    expect(viperEyes(END)).toBe(viperEyes(0));
    expect(swordAlarm(END)).toBeCloseTo(swordAlarm(0), 4);
    expect(swordMurk(END)).toBeCloseTo(0, 6);
    expect(bellySword(END)).toBe(0);
    expect(bellySword(0)).toBe(0);
    expect(growthBar(END).alpha).toBe(0);
    expect(growthBar(0).alpha).toBe(0);
    expect(swordD(END)).toBeCloseTo(swordD(0), 4);
  });

  it('opens with the jaw swung wide round the swordfish’s tail, its sword out in front, its "!" up and no numbers', () => {
    expect(viperJaw(0)).toBeGreaterThan(2);
    expect(viperJaw(FRAME)).toBeGreaterThan(viperJaw(0));
    expect(swordAlarm(0)).toBeGreaterThan(0.9);
    // Its rear third is already deep in the jaws, the rest sticking out.
    expect(swordD(0)).toBeGreaterThan(0.3);
    expect(swordD(0)).toBeLessThan(0.45);
    const v = viewAt(0);
    const you = seen(viperFish(0), v);
    const it = swordFish(0);
    const s = seen(it, v);
    // Facing away from the viper: the sword points out of the mouth, ahead of it.
    expect(it.facing).toBe(1);
    expect(s.x).toBeGreaterThan(you.x + you.length / 2);
    expect(growthBar(0).alpha).toBe(0);
  });

  it('draws the swordfish as the big one on frame 1, filling the width out to its sword tip', () => {
    expect(DRAWN).toBeGreaterThanOrEqual(1.4);
    expect(DRAWN).toBeLessThanOrEqual(1.6);
    const v = viewAt(0);
    const it = swordFish(0);
    expect(it.length).toBeGreaterThan(viperFish(0).length);
    // The tip: the nose (half a body from the centre) and the sword past it, in the fish's own scale.
    const reach = ((BODY_HL + SWORD_TIP) / (2 * BODY_HL)) * it.length;
    const tip = seenAt({ x: it.x + reach * Math.cos(it.tilt), y: it.y - reach * Math.sin(it.tilt) }, v);
    expect(tip.x).toBeGreaterThan(980);
    expect(tip.x).toBeLessThan(1080);
  });

  it('moves smoothly on screen: no frame jumps further than a lunge, the camera included', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      const next = (t + FRAME) % LOOP_S;
      const [v, w] = [viewAt(t), viewAt(next)];
      const a = seen(viperFish(t), v);
      const b = seen(viperFish(next), w);
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(40);
      expect(Math.hypot(v.zoom * v.x - w.zoom * w.x, v.zoom * v.y - w.zoom * w.y)).toBeLessThan(40);
      const fa = swordAt(t);
      const fb = swordAt(next);
      if (fa.kind !== 'gone' && fb.kind !== 'gone') {
        const p = seen(fa.fish, v);
        const q = seen(fb.fish, w);
        expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeLessThan(t > SLURP_AT && t < GULP_AT ? 80 : 50);
      }
    }
  });

  it('keeps the viper big and in frame, and the swordfish in frame while it is in view', () => {
    for (let t = 0; t < LOOP_S; t += 0.1) {
      const v = viewAt(t);
      const s = seen(viperFish(t), v);
      expect(s.length).toBeGreaterThan(500);
      // Its head (the mouth) stays in frame and below the captions.
      const head = seenAt({ x: f0(t).x + Math.cos(0) * 0, y: f0(t).y }, v);
      expect(head.x).toBeGreaterThan(-100);
      expect(head.x).toBeLessThan(1080);
      expect(s.y).toBeGreaterThan(600);
      expect(s.y).toBeLessThan(1100);
      const f = swordAt(t);
      if (f.kind === 'there' && swordMurk(t) < 0.5 && t < GULP_AT) {
        const p = seen(f.fish, v);
        // The sword end (the nose) stays on screen.
        expect(p.x + p.length * 0.5 * Math.cos(f.fish.tilt)).toBeLessThan(1100);
        expect(p.y).toBeGreaterThan(450);
        expect(p.y).toBeLessThan(1150);
      }
    }
  });

  it('is faithful to the game: a swordfish a peer of the viper that only the gape can swallow, longer than it with its sword, worth a stage-up', () => {
    expect(PLAYER_ABILITY.viperfish).toBe('gape');
    expect(MIDNIGHT.name).toBe('Midnight');
    expect(MIDNIGHT.playerSizes[3]).toBe(VIPER_SIZE);
    expect(MIDNIGHT.playerSizes[4]! / MIDNIGHT.playerSizes[3]!).toBeCloseTo(SCALE, 6);
    for (const [viper, sword] of [[VIPER_SIZE, SWORD_SIZE], [VIPER_SIZE * SCALE, SWORD_SIZE * SCALE]] as const) {
      expect(relationTo(viper, sword)).toBe('peer');
      expect(canSwallow('gape', relationTo(viper, sword))).toBe(true);
      expect(canSwallow('ink', relationTo(viper, sword))).toBe(false);
    }
    // With its sword and tail fin it is longer than the viper, though a peer by size.
    expect(SWORD_WHOLE).toBeGreaterThan(VIPER_LEN);
    // Its points take the viper to its next stage: "Bigger!".
    expect(GOAL_POINTS).toBeGreaterThan(0);
    const before = addGrowth(MIDNIGHT, initialGrowth, POINTS_BEFORE);
    const after = addGrowth(MIDNIGHT, before, growthPointsFor(SWORD_SIZE));
    expect(playerSizeFor(MIDNIGHT, before.tier)).toBe(VIPER_SIZE);
    expect(playerSizeFor(MIDNIGHT, after.tier)).toBe(MIDNIGHT.playerSizes[4]);
    expect(MEAL_POINTS).toBe(growthPointsFor(SWORD_SIZE));
    expect(SCORE_TEXT).toBe(`+${scoreFor(SWORD_SIZE, 1)}`);
    expect(bodyProportions('swordfish').hl).toBeGreaterThan(0);
  });

  it('swallows it tail first, the sword last: a toothpick out of the lips, eyes crossed, then a pop and the gulp', () => {
    expect(swordD(BITE_AT + 0.5)).toBeGreaterThanOrEqual(0.12);
    // Three heaves, each one in further.
    const after = HEAVES.map((h) => swordD(h + 0.3));
    expect(after[1]!).toBeGreaterThan(after[0]!);
    expect(after[2]!).toBeGreaterThan(after[1]!);
    // Then only the sword is out, and it stays still for a beat.
    expect(swordD(TOOTH_FROM)).toBeCloseTo(TOOTHPICK, 3);
    expect(swordD(SLURP_AT - 0.05)).toBeCloseTo(TOOTHPICK, 2);
    expect(TOOTHPICK).toBeGreaterThan(0.7);
    expect(TOOTHPICK).toBeLessThan(0.9);
    expect(viperEyes(4.3)).toBe('cross');
    // The last slurp takes the sword in; the jaws snap shut on the gulp.
    expect(swordD(GULP_AT - 1e-6)).toBeGreaterThan(0.99);
    expect(swordAt(GULP_AT).kind).toBe('gone');
    // The lips pinch the sword for the toothpick, and stay nearly shut for the last slurp.
    expect(viperJaw(4.3)).toBeLessThan(0.7);
    expect(viperJaw(3.0)).toBeGreaterThan(2.5);
    expect(viperJaw(GULP_AT - 0.01)).toBeLessThan(1.2);
    expect(viperJaw(GULP_AT + 0.1)).toBeLessThan(0.05);
    // The belly balloons with a straight line pressing out of it.
    expect(viperBelly(GULP_AT + 0.3).size).toBeGreaterThan(0.8);
    expect(bellySword(GULP_AT + 0.3)).toBeGreaterThan(0.9);
    expect(bellySword(8)).toBe(0);
    expect(GULP_AT / LOOP_S).toBeGreaterThan(0.38);
    expect(GULP_AT / LOOP_S).toBeLessThan(0.5);
  });

  it('shows the next swordfish only after it fades up out of the dark', () => {
    expect(swordMurk(8.4)).toBeGreaterThan(0.9);
    expect(swordMurk(11)).toBe(0);
    expect(swordAt(7).kind).toBe('gone');
  });

  it('shows the same words either side of the loop point, none on the first frame, all inside the safe band', () => {
    for (const c of CAPTIONS) {
      expect(captionAlpha(c, END)).toBeCloseTo(captionAlpha(c, 0), 3);
      const rows = c.text.split('\n').length;
      expect(c.y).toBeGreaterThanOrEqual(270);
      expect(c.y + (rows - 1) * c.size * 1.02).toBeLessThanOrEqual(1250);
    }
    for (const c of CAPTIONS) expect(captionAlpha(c, 0)).toBe(0);
    expect(Math.min(...CAPTIONS.map((c) => c.from).filter((f) => f >= 0))).toBeGreaterThanOrEqual(0.15);
    for (let t = 0; t < LOOP_S; t += 0.05) expect(CAPTIONS.filter((c) => captionAlpha(c, t) > 0).length).toBeLessThanOrEqual(1);
    expect(CAPTIONS.map((c) => c.text)).toEqual(expect.arrayContaining(['wrong end first', 'toothpick?', 'how did THAT fit']));
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect((LOOP_S * 30) % 1).toBe(0);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    expect(LOOP_S % 1.5).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    expect(SOUNDS.some((c) => c.id === 'click' && Math.abs(c.t - GULP_AT) < 0.15)).toBe(true);
  });
});
