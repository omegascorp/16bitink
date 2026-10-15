import { describe, expect, it } from 'vitest';
import { mouthOf, type Pose } from '../dev/promo/chain';
import {
  airborne, CAPTIONS, captionAlpha, CATCH_AT, FEATHER_COUNT, featherAt, GULL_ENTER, GULL_RATIO, gullAlarm, gullAt, GULP_AT, LOOP_S, MISS_AT, POINTS,
  shake, snap, SOUNDS, SPLASHES, SURFACE_Y, TUNA_LEN, tunaAt, tunaJaw, type GullPose,
} from '../dev/promo/leap/story';
import { realAt, SLOWS, storyAt } from '../dev/promo/leap/timing';
import { PLAYER_STATS } from '../src/levels/playerStats';
import { ZONE_INFO } from '../src/levels/zones';
import { BIRD_INFO, ZONE_BIRDS } from '../src/logic/birds';
import { EDIBLE_RATIO } from '../src/logic/sizing';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

const flyingGull = (t: number): GullPose => {
  const g = gullAt(t);
  if (g.kind !== 'flying') throw new Error(`no flying gull at ${t}`);
  return g.pose;
};

function expectSamePose(a: Pose, b: Pose): void {
  expect(b.x).toBeCloseTo(a.x, 1);
  expect(b.y).toBeCloseTo(a.y, 1);
  expect(b.facing).toBe(a.facing);
  expect(b.tilt).toBeCloseTo(a.tilt, 3);
  expect(b.effort).toBeCloseTo(a.effort, 3);
  expect(wrap(b.beat - a.beat)).toBeCloseTo(0, 3);
}

describe('promo short: don’t fly too close to the sun… or too low', () => {
  it('loops: the next gull and your next leap at the end are the first ones at the start', () => {
    expectSamePose(tunaAt(0), tunaAt(END));
    const a = flyingGull(0);
    const b = flyingGull(END);
    expect(b.x).toBeCloseTo(a.x, 1);
    expect(b.y).toBeCloseTo(a.y, 1);
    expect(b.tilt).toBeCloseTo(a.tilt, 3);
    expect(b.frame).toBe(a.frame);
    expect(tunaJaw(END)).toBeCloseTo(tunaJaw(0), 4);
    expect(gullAlarm(END)).toBeCloseTo(gullAlarm(0), 3);
    expect(snap(END)).toBeCloseTo(snap(0), 4);
    expect(shake(END).x).toBeCloseTo(shake(0).x, 3);
    for (let i = 0; i < FEATHER_COUNT; i++) expect(featherAt(i, END) === null).toBe(featherAt(i, 0) === null);
  });

  it('opens on action: out of the water, jaws open, the gull has seen you', () => {
    expect(airborne(0)).toBe(true);
    expect(tunaJaw(0)).toBeGreaterThan(0.5);
    expect(gullAlarm(0)).toBeGreaterThan(0.5);
  });

  it('moves smoothly on screen, frame by real frame through the slow motion: no jump further than a leap, and the gull glides', () => {
    for (let r = 0; r < LOOP_S; r += FRAME) {
      const t = storyAt(r) % LOOP_S;
      const u = storyAt(r + FRAME) % LOOP_S;
      const a = tunaAt(t);
      const b = tunaAt(u);
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(75);
      const g = gullAt(t);
      const h = gullAt(u);
      if (g.kind === 'flying' && h.kind === 'flying') expect(Math.hypot(g.pose.x - h.pose.x, g.pose.y - h.pose.y)).toBeLessThan(20);
    }
  });

  it('slows the snatch to about a third for half a second, without moving the loop’s ends', () => {
    expect(storyAt(0)).toBeCloseTo(0, 6);
    expect(realAt(LOOP_S)).toBeCloseTo(LOOP_S, 6);
    expect(storyAt(END)).toBeCloseTo(LOOP_S, 4);
    const speed = (r: number): number => (storyAt(r + 1e-3) - storyAt(r - 1e-3)) / 2e-3;
    expect(speed(realAt(SLOWS[1]!.at))).toBeCloseTo(SLOWS[1]!.speed, 2);
    let slowed = 0;
    for (let r = 0; r < LOOP_S; r += 0.005) if (speed(r) < 0.6 && Math.abs(r - realAt(CATCH_AT)) < 1) slowed += 0.005;
    expect(slowed).toBeGreaterThan(0.35);
    expect(slowed).toBeLessThan(0.65);
    // The warp only runs forwards, and only a little faster than real time elsewhere.
    for (let r = 0; r < LOOP_S; r += 0.01) expect(speed(r)).toBeLessThan(1.1);
  });

  it('keeps the action in the picture, under the captions and above the credit', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      const f = tunaAt(t);
      expect(f.x).toBeGreaterThan(170);
      expect(f.x).toBeLessThan(900);
      for (const end of [-0.5, 0.5]) {
        const y = f.y - Math.sin(f.tilt) * end * TUNA_LEN;
        expect(y).toBeGreaterThan(500);
        // The credit's letters start at about 1228 - 0.7 * 56.
        expect(y).toBeLessThan(1189);
      }
      const g = gullAt(t);
      if (g.kind === 'flying' && t < GULL_ENTER) expect(g.pose.y).toBeGreaterThan(570);
    }
  });

  it('misses the first time: the jaws snap shut under the gull, not on it', () => {
    const mouth = mouthOf(tunaAt(MISS_AT));
    const gull = flyingGull(MISS_AT);
    expect(airborne(MISS_AT)).toBe(true);
    expect(mouth.y - gull.y).toBeGreaterThan(70);
    expect(tunaJaw(MISS_AT + 0.06)).toBe(0);
  });

  it('takes the second gull in mid-air: its tail at your mouth at the catch, gone down the throat by the gulp', () => {
    expect(airborne(CATCH_AT)).toBe(true);
    const mouth = mouthOf(tunaAt(CATCH_AT));
    const gull = flyingGull(CATCH_AT - 1e-6);
    expect(Math.hypot(mouth.x - gull.x, mouth.y - gull.y)).toBeLessThan(80);
    expect(gullAt(CATCH_AT).kind).toBe('taken');
    expect(gullAt(GULP_AT).kind).toBe('gone');
    // The payoff lands 40-50% of the way in.
    expect(CATCH_AT / LOOP_S).toBeGreaterThan(0.4);
    expect(CATCH_AT / LOOP_S).toBeLessThan(0.5);
  });

  it('is true to the game: the young tuna leaps best, its chapter has gulls, and a gull this size is prey', () => {
    const chapter = ZONE_INFO.find((z) => z.player === 'tuna')!;
    expect(ZONE_BIRDS[chapter.zone]?.kinds).toContain('gull');
    expect(Math.max(...Object.values(PLAYER_STATS).map((s) => s.leap))).toBe(PLAYER_STATS.tuna.leap);
    expect(GULL_RATIO).toBeGreaterThanOrEqual(BIRD_INFO.gull.scale[0]);
    expect(GULL_RATIO).toBeLessThan(EDIBLE_RATIO);
    expect(POINTS).toBe(340);
  });

  it('breaks the surface on the waterline at every splash', () => {
    for (const s of SPLASHES) expect(tunaAt(s.at % LOOP_S).y).toBeCloseTo(SURFACE_Y, 0);
  });

  it('shows the same words either side of the loop point, with something to read in the first frame', () => {
    for (const c of CAPTIONS) expect(captionAlpha(c, END)).toBeCloseTo(captionAlpha(c, 0), 3);
    expect(CAPTIONS.some((c) => captionAlpha(c, 0) === 1)).toBe(true);
    for (const c of CAPTIONS) {
      expect(c.y - c.size * 0.7).toBeGreaterThan(270);
      expect(c.y).toBeLessThan(480);
    }
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(LOOP_S % 1.5).toBe(0);
    expect((LOOP_S * 30) % 1).toBe(0);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    for (const s of SOUNDS) {
      expect(realAt(s.t)).toBeGreaterThanOrEqual(0);
      expect(realAt(s.t)).toBeLessThan(LOOP_S);
    }
  });
});
