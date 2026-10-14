import { describe, expect, it } from 'vitest';
import { mouthOf, type Pose } from '../dev/promo/chain';
import {
  barbAt, BITE_AT, RIG, CAPTIONS, captionAlpha, DROP_AT, DROP_S, HOLD_S, HOOK_X, inklingAt, inklingJaw, LOOP_S, MEALS, MINNOW_LEN, OUT_AT, PERCH_FROM,
  PERCH_LEN, perchAlarm, perchAt, perchJaw, rigAt, SNACKS, snacksAt, SOUNDS, WARN_AT, WARN_S,
} from '../dev/promo/bait/story';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';
import { TUNING } from '../src/scenes/game/tuning';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));
const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);
/** Loop time for a moment given in seam time (negative = just before the loop point). */
const at = (u: number): number => ((u % LOOP_S) + LOOP_S) % LOOP_S;

const perchPose = (t: number): Pose => {
  const p = perchAt(t);
  if (p.kind === 'gone') throw new Error(`no perch at ${t}`);
  return p.pose;
};

function expectSamePose(a: Pose, b: Pose): void {
  expect(b.x).toBeCloseTo(a.x, 1);
  expect(b.y).toBeCloseTo(a.y, 1);
  expect(b.length).toBeCloseTo(a.length, 3);
  expect(b.facing).toBe(a.facing);
  expect(b.tilt).toBeCloseTo(a.tilt, 3);
  expect(b.effort).toBeCloseTo(a.effort, 3);
  expect(wrap(b.beat - a.beat)).toBeCloseTo(0, 3);
}

describe('promo short: free food? it’s a trap!', () => {
  it('loops: you, the next perch, the hook and its worm are where they were at the start', () => {
    expectSamePose(inklingAt(0), inklingAt(END));
    expectSamePose(perchPose(0), perchPose(END));
    expect(inklingJaw(END)).toBeCloseTo(inklingJaw(0), 4);
    expect(perchJaw(END)).toBeCloseTo(perchJaw(0), 4);
    const a = rigAt(0);
    const b = rigAt(END);
    expect(b.phase).toBe(a.phase);
    expect(dist(a.eye, b.eye)).toBeLessThan(0.1);
    expect(b.wormAge).toBeCloseTo(a.wormAge, 4);
    expect(b.worm).toBe(true);
    expect(a.worm).toBe(true);
    expect(perchAlarm(0)).toBe(0);
    expect(perchAlarm(END)).toBe(0);
  });

  it('opens on the bait: a worm on a lowered hook, you in front of it and the perch charging in', () => {
    expect(rigAt(0).phase).toBe('hold');
    const mouth = mouthOf(inklingAt(0));
    expect(dist(mouth, barbAt(0))).toBeLessThan(150);
    expect(inklingAt(0).facing).toBe(1);
    const perch = perchPose(0);
    expect(perch.facing).toBe(-1);
    expect(perch.x).toBeLessThan(1080);
    // Still charging: moving left fast in the first frames.
    expect(perchPose(0).x - perchPose(FRAME).x).toBeGreaterThan(8);
  });

  it('works the hook as the game does: a 1.5 s dotted warning, a 280 ms drop, a hold of about the game’s 3.2 s, then a hard haul up', () => {
    expect(WARN_S).toBe(TUNING.hookWarnMs / 1000);
    expect(DROP_S).toBeCloseTo(0.28, 6);
    expect(HOLD_S).toBeGreaterThan(TUNING.hookHoldMs / 1000 - 0.1);
    expect(HOLD_S).toBeLessThan(TUNING.hookHoldMs / 1000 + 0.6);
    expect(rigAt(at(WARN_AT + 0.5)).phase).toBe('warn');
    expect(rigAt(at(DROP_AT + 0.1)).phase).toBe('drop');
    expect(rigAt(BITE_AT + 0.1).phase).toBe('reel');
    expect(rigAt(OUT_AT + 0.1).phase).toBe('none');
    // No worm before the hook is down from the angler (as in the game), and none once something has bitten.
    expect(rigAt(at(WARN_AT + 0.5)).worm).toBe(false);
    expect(rigAt(BITE_AT + 0.01).worm).toBe(false);
  });

  it('hooks the perch by the mouth on the barb and hauls it head-up out of the top of the frame', () => {
    expect(dist(mouthOf(perchPose(BITE_AT - 1e-6)), barbAt(BITE_AT))).toBeLessThan(2);
    for (let t = BITE_AT + 0.2; t < OUT_AT; t += 0.07) {
      const p = perchPose(t);
      expect(dist(mouthOf(p), barbAt(t))).toBeLessThan(1);
      expect(Math.abs(p.tilt - Math.PI / 2)).toBeLessThan(0.31);
    }
    // Its tail end is above the top of the frame before it disappears.
    const last = perchPose(OUT_AT - 1e-3);
    expect(last.y + PERCH_LEN / 2).toBeLessThan(0);
    expect(perchAt(OUT_AT).kind).toBe('gone');
    expect(perchAt(at(PERCH_FROM - 0.05)).kind).toBe('gone');
  });

  it('keeps you off the barb: never inside the game’s 12 px catch radius (plus a margin), mouth shut before the perch bites', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      const rig = rigAt(t);
      if (rig.phase !== 'hold' && rig.phase !== 'drop') continue;
      expect(dist(mouthOf(inklingAt(t)), barbAt(t))).toBeGreaterThan(12 * RIG + 5);
    }
    expect(inklingJaw(BITE_AT - 0.5)).toBe(0);
  });

  it('moves smoothly on screen: no frame jumps further than a dash, bar the hook’s drop and haul', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      const next = (t + FRAME) % LOOP_S;
      expect(dist(inklingAt(t), inklingAt(next))).toBeLessThan(30);
      const a = perchAt(t);
      const b = perchAt(next);
      if (a.kind !== 'gone' && b.kind !== 'gone' && rigAt(t).phase !== 'reel') expect(dist(a.pose, b.pose)).toBeLessThan(50);
      const ra = rigAt(t);
      const rb = rigAt(next);
      if (ra.phase === 'hold' && rb.phase === 'hold') expect(dist(ra.eye, rb.eye)).toBeLessThan(10);
    }
    // The bite itself: the perch is caught where it was, then whipped head-up.
    expect(dist(perchPose(BITE_AT - 1e-6), perchPose(BITE_AT))).toBeLessThan(0.5);
  });

  it('shows the same words either side of the loop point, with something to read in the first frame', () => {
    for (const c of CAPTIONS) expect(captionAlpha(c, END)).toBeCloseTo(captionAlpha(c, 0), 3);
    expect(CAPTIONS.some((c) => captionAlpha(c, 0) === 1)).toBe(true);
    // The payoff lands once the perch is on its way up, while the frame still remembers it.
    const payoff = CAPTIONS.find((c) => c.text.includes('trap'))!;
    expect(payoff.from).toBeGreaterThan(BITE_AT);
    expect(payoff.from).toBeLessThan(OUT_AT);
    for (const c of CAPTIONS) {
      expect(c.y).toBeGreaterThanOrEqual(300);
      expect(c.y).toBeLessThanOrEqual(480);
    }
  });

  it('never lets the hauled perch cross “it’s a trap!”: the words wait until it is wholly above them', () => {
    const trap = CAPTIONS.find((c) => c.text.includes('trap'))!;
    // The words' top (ascenders and halo) in px.
    const top = trap.y - trap.size;
    for (let t = BITE_AT; t < OUT_AT; t += 1 / 120) {
      if (captionAlpha(trap, t) <= 0) continue;
      const p = perchAt(t);
      if (p.kind === 'gone') continue;
      // Its lowest point, however it thrashes: the centre plus a little over half its length.
      expect(p.pose.y + 0.6 * PERCH_LEN).toBeLessThan(top);
    }
  });

  it('feeds you two free-swimming minnows under “never trust free food”, scored and sounded as the game does', () => {
    const moral = CAPTIONS.find((c) => c.text === 'never trust')!;
    expect(MEALS.map((m) => m.text)).toEqual(['+100', '+120']);
    expect(MEALS.map((m) => m.sfx)).toEqual(['eat', 'frenzy']);
    for (const s of SNACKS) {
      expect(captionAlpha(moral, s.at)).toBe(1);
      // Gulped as it reaches your mouth, nowhere near a hook: none is in the water.
      expect(rigAt(s.at).phase).toBe('none');
      const swimming = snacksAt(s.at - 0.2).find((m) => m.kind === 'swimming')!;
      expect(dist(swimming.pose, mouthOf(inklingAt(s.at - 0.2)))).toBeLessThan(MINNOW_LEN);
      expect(Math.abs(swimming.pose.x - HOOK_X)).toBeGreaterThan(200);
      expect(swimming.pose.x - MINNOW_LEN / 2).toBeGreaterThan(-MINNOW_LEN * 0.2);
      expect(inklingJaw(s.at - 0.18)).toBeGreaterThan(0.5);
    }
    expect(snacksAt(0)).toHaveLength(0);
    expect(snacksAt(END)).toHaveLength(0);
    for (const m of MEALS) expect(SOUNDS.some((s) => s.id === m.sfx && s.t === m.at)).toBe(true);
    // The player's own losing jingle doesn't belong to a perch.
    expect(SOUNDS.some((s) => s.id === 'lose')).toBe(false);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect((LOOP_S * 30) % 1).toBe(0);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    expect(LOOP_S % 1.5).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    expect(SOUNDS.some((s) => s.id === 'hooked' && s.t === BITE_AT)).toBe(true);
  });
});
