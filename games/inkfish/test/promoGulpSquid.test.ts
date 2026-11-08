import { describe, expect, it } from 'vitest';
import { INKFISH_FULL_CHAPTERS } from '../content/paid';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';
import { canSwallow, PLAYER_ABILITY } from '../src/logic/abilities';
import { addGrowth, initialGrowth, playerSizeFor } from '../src/logic/growth';
import { growthPointsFor, relationTo, scoreFor } from '../src/logic/sizing';
import { SPECIES_INFO } from '../src/levels/species';
import {
  armPaths, BITE_AT, CAPTIONS, captionAlpha, depth, DESSERT_FROM, EYE_AT, eyeOpen, GOAL, GULP_AT, growthBar, HEAVES, K_S, LOOP_S, MEAL_POINTS, mouthFrame, POINTS_BEFORE,
  poke, POKE_POP, pullAt, SCALE, SCORE_TEXT, SLURP_AT, SOUNDS, SPURT, SQUID_SIZE, squidAlarm, squidGone, squidMurk, squidTip, squidToFrame, tentaclePath, toWorld, viewAt,
  viperBelly, viperEyes, viperFish, viperJaw, viperLength, VIPER_LEN, VIPER_SIZE, wrapAmount, type View, type WorldFish,
} from '../dev/promo/gulpsquid/story';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FOCUS = { x: 540, y: 800 };
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

interface P { readonly x: number; readonly y: number }
const seenAt = (p: P, v: View): P => ({ x: FOCUS.x + v.zoom * (p.x - v.x), y: FOCUS.y + v.zoom * (p.y - v.y) });
const seen = (f: WorldFish, v: View) => ({ ...seenAt(f, v), length: v.zoom * f.length });
/** A point of the squid's drawing (body px) on screen. */
const squidSeen = (t: number, p: P): P => seenAt(toWorld(mouthFrame(t), squidToFrame(t, p)), viewAt(t));
const frameSeen = (t: number, p: P): P => seenAt(toWorld(mouthFrame(t), p), viewAt(t));

const MIDNIGHT = INKFISH_FULL_CHAPTERS.find((c) => c.id === 8)!.levels[9]!;

describe('promo short: how did that fit 4 (giant squid)', () => {
  it('loops: the next squid at the end is the first at the start, on screen where it was, scaled up by the camera’s pull-back', () => {
    expect(pullAt(END)).toBeCloseTo(pullAt(0) + 1, 6);
    const [va, vb] = [viewAt(0), viewAt(END)];
    const [a, b] = [seen(viperFish(0), va), seen(viperFish(END), vb)];
    expect(b.x).toBeCloseTo(a.x, 1);
    expect(b.y).toBeCloseTo(a.y, 1);
    expect(b.length).toBeCloseTo(a.length, 1);
    expect(wrap(viperFish(END).beat - viperFish(0).beat)).toBeCloseTo(0, 3);
    expect(viperJaw(END)).toBeCloseTo(viperJaw(0), 3);
    expect(viperBelly(END).size).toBeCloseTo(0, 6);
    expect(viperBelly(0).size).toBe(0);
    expect(viperEyes(END)).toBe(viperEyes(0));
    expect(squidAlarm(END)).toBeCloseTo(squidAlarm(0), 4);
    expect(squidMurk(END)).toBe(0);
    expect(squidGone(0)).toBe(false);
    expect(squidGone(END)).toBe(false);
    expect(wrapAmount(END)).toBeCloseTo(wrapAmount(0), 4);
    expect(growthBar(END).alpha).toBe(0);
    expect(growthBar(0).alpha).toBe(0);
    // Every part of the squid is on screen where it was.
    for (const local of [{ x: -124, y: 0 }, EYE_AT, { x: 110, y: 0 }]) {
      const [p, q] = [squidSeen(0, local), squidSeen(END, local)];
      expect(q.x).toBeCloseTo(p.x, 0);
      expect(q.y).toBeCloseTo(p.y, 0);
    }
    for (const j of [0, 1] as const) {
      const [pa, pb] = [tentaclePath(0, j), tentaclePath(END, j)];
      pa.forEach((p, i) => {
        const [x, y] = [frameSeen(0, p), frameSeen(END, pb[i]!)];
        expect(y.x).toBeCloseTo(x.x, 0);
        expect(y.y).toBeCloseTo(x.y, 0);
      });
    }
    armPaths(0).forEach((arm, i) => arm.pts.forEach((p, k) => {
      const q = armPaths(END)[i]!.pts[k]!;
      expect(q.x).toBeCloseTo(p.x, 0);
      expect(q.y).toBeCloseTo(p.y, 0);
    }));
  });

  it('opens on the jaw swung wide round the squid’s mantle, its eye in frame, its "!" up, the tentacles reaching, and no numbers', () => {
    expect(viperJaw(0)).toBeGreaterThan(1.5);
    expect(viperJaw(FRAME)).toBeGreaterThan(viperJaw(0));
    expect(squidAlarm(0)).toBeGreaterThan(0.9);
    expect(eyeOpen(0)).toBe(1);
    // The mantle tip is in the mouth: past the lips, between the jaws.
    expect(squidTip(0).x).toBeLessThan(-20);
    expect(Math.abs(squidTip(0).y)).toBeLessThan(10);
    const v = viewAt(0);
    const you = seen(viperFish(0), v);
    expect(you.length).toBeGreaterThan(440);
    const eye = squidSeen(0, EYE_AT);
    expect(eye.x).toBeGreaterThan(you.x + you.length / 2);
    expect(eye.x).toBeLessThan(1000);
    expect(eye.y).toBeGreaterThan(600);
    expect(eye.y).toBeLessThan(1000);
    // The squid is big: its mantle, in the mouth, is wider than a third of the viper's head, and its eye a big eye.
    const [m0, m1] = [squidSeen(0, { x: 54, y: -30 }), squidSeen(0, { x: 54, y: 30 })];
    const mantle = Math.hypot(m0.x - m1.x, m0.y - m1.y);
    expect(mantle).toBeGreaterThan(110);
    // Both tentacles reach out over and under the mantle, towards the viper's head.
    const [up, down] = [tentaclePath(0, 0), tentaclePath(0, 1)];
    expect(frameSeen(0, up.at(-1)!).y).toBeLessThan(frameSeen(0, down.at(-1)!).y - 200);
    expect(growthBar(0).alpha).toBe(0);
  });

  it('moves smoothly on screen: no frame jumps further than a lunge, the camera and the squid included', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      const next = (t + FRAME) % LOOP_S;
      const [v, w] = [viewAt(t), viewAt(next)];
      const [a, b] = [seen(viperFish(t), v), seen(viperFish(next), w)];
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(40);
      expect(Math.hypot(v.zoom * v.x - w.zoom * w.x, v.zoom * v.y - w.zoom * w.y)).toBeLessThan(45);
      if (next > t) expect(Math.abs(v.zoom / w.zoom - 1)).toBeLessThan(0.03);
      if (!squidGone(t) && !squidGone(next)) {
        const [p, q] = [squidSeen(t, { x: 0, y: 0 }), squidSeen(next, { x: 0, y: 0 })];
        // The last slurp is fast; otherwise the squid drifts or is hauled.
        expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeLessThan(t > SLURP_AT - 0.15 ? 190 : 50);
        for (const j of [0, 1] as const) {
          const [ta, tb] = [tentaclePath(t, j).at(-1)!, tentaclePath(next, j).at(-1)!];
          const [pa, pb] = [frameSeen(t, ta), frameSeen(next, tb)];
          expect(Math.hypot(pa.x - pb.x, pa.y - pb.y)).toBeLessThan(t > SLURP_AT - 0.15 ? 260 : 90);
        }
      }
    }
  });

  it('keeps the viper in frame and above the growth bar, its eye and the squid’s eye on screen while it is seen', () => {
    for (let t = 0; t < LOOP_S; t += 0.1) {
      const s = seen(viperFish(t), viewAt(t));
      expect(s.length).toBeGreaterThan(280);
      expect(s.x + s.length / 2).toBeGreaterThan(200);
      expect(s.y).toBeGreaterThan(620);
      expect(s.y).toBeLessThan(960);
      if (!squidGone(t) && eyeOpen(t) > 0.5) {
        const eye = squidSeen(t, EYE_AT);
        expect(eye.x).toBeLessThan(1060);
        expect(eye.y).toBeGreaterThan(450);
        expect(eye.y).toBeLessThan(1100);
      }
    }
  });

  it('is faithful to the game: the game’s giant squid, a peer only the gape can swallow, worth a stage-up', () => {
    expect(PLAYER_ABILITY.viperfish).toBe('gape');
    expect(SPECIES_INFO.giantsquid.hunter).toBe(true);
    expect(MIDNIGHT.name).toBe('Midnight');
    expect(MIDNIGHT.playerSizes[3]).toBe(VIPER_SIZE);
    expect(MIDNIGHT.playerSizes[4]! / MIDNIGHT.playerSizes[3]!).toBeCloseTo(SCALE, 6);
    expect(MIDNIGHT.tiers[MIDNIGHT.tiers.length - 1]).toBe(GOAL);
    // The chapter 10 giant, shown here at a size a gape can take (a peer).
    expect(SPECIES_INFO.giantsquid.giant).toBe(true);
    // Both squids (the second a stage bigger) are peers of the viper eating them.
    for (const [viper, squid] of [[VIPER_SIZE, SQUID_SIZE], [VIPER_SIZE * SCALE, SQUID_SIZE * SCALE]] as const) {
      expect(relationTo(viper, squid)).toBe('peer');
      expect(squid).toBeGreaterThan(viper);
      expect(canSwallow('gape', relationTo(viper, squid))).toBe(true);
      expect(canSwallow('ink', relationTo(viper, squid))).toBe(false);
    }
    const before = addGrowth(MIDNIGHT, initialGrowth, POINTS_BEFORE);
    const after = addGrowth(MIDNIGHT, before, growthPointsFor(SQUID_SIZE));
    expect(playerSizeFor(MIDNIGHT, before.tier)).toBe(VIPER_SIZE);
    expect(playerSizeFor(MIDNIGHT, after.tier)).toBe(MIDNIGHT.playerSizes[4]);
    expect(MEAL_POINTS).toBe(growthPointsFor(SQUID_SIZE));
    expect(SCORE_TEXT).toBe(`+${scoreFor(SQUID_SIZE, 1)}`);
    // Peer by size, yet it looks huge next to the viper: its mantle and head alone are longer than the viper.
    expect(2 * 124 * K_S).toBeGreaterThan(1.3 * VIPER_LEN);
  });

  it('fights back, then goes in whole: tentacles outside and wrapped round the head through the heaves, in like spaghetti on the last slurp', () => {
    expect(depth(BITE_AT + 0.01)).toBeGreaterThan(depth(0.3));
    expect(depth(GULP_AT - 1e-6)).toBeGreaterThan(500);
    for (const h of HEAVES) expect(depth(h + 0.3)).toBeGreaterThan(depth(h - 0.05));
    // Wrapped: the tentacle tips are on the viper's head (behind the lips) while the squid's head is out in the water.
    for (const t of [1.6, 2.5, 3.4, 4.3]) {
      expect(wrapAmount(t)).toBe(1);
      expect(squidToFrame(t, EYE_AT).x).toBeGreaterThan(10);
      for (const j of [0, 1] as const) {
        const path = tentaclePath(t, j);
        expect(path.at(-1)!.x).toBeLessThan(-30);
        expect(path[0]!.x).toBeGreaterThan(0);
      }
    }
    // All of it is behind the lips on the gulp.
    for (const j of [0, 1] as const) for (const p of tentaclePath(GULP_AT - 1e-6, j)) expect(p.x).toBeLessThan(5);
    for (const a of armPaths(GULP_AT - 1e-6)) for (const p of a.pts) expect(squidToFrame(GULP_AT - 1e-6, p).x).toBeLessThan(5);
    expect(squidGone(GULP_AT)).toBe(true);
    expect(viperJaw(GULP_AT - 0.01)).toBeGreaterThan(2.5);
    expect(viperJaw(GULP_AT + 0.1)).toBeLessThan(0.05);
    expect(viperBelly(GULP_AT + 0.3).size).toBeGreaterThan(1);
    expect(GULP_AT / LOOP_S).toBeGreaterThan(0.38);
    expect(GULP_AT / LOOP_S).toBeLessThan(0.5);
    // A tentacle tip pokes out of the closed lips and is slurped back, once the jaws are shut and before the camera pulls back.
    expect(poke(GULP_AT + 0.4)).toBeNull();
    expect(poke(GULP_AT + 0.8)!.out).toBeGreaterThan(30);
    expect(poke(POKE_POP - 0.01)!.out).toBeLessThan(5);
    expect(poke(POKE_POP)).toBeNull();
    expect(POKE_POP).toBeLessThan(pullAt(0) + 6.5);
  });

  it('brings the next squid up out of the dark, its eye first, a stage bigger on screen only by the camera pulling back', () => {
    expect(eyeOpen(8.5)).toBe(0);
    expect(eyeOpen(9.5)).toBe(1);
    expect(squidMurk(8.8)).toBe(1);
    expect(squidMurk(9.0)).toBeGreaterThan(0.99);
    expect(squidMurk(11)).toBe(0);
    expect(eyeOpen(DESSERT_FROM)).toBe(0);
    // The eye is lit well before the squid is plain.
    expect(eyeOpen(9.3)).toBeGreaterThan(0.6);
    expect(squidMurk(9.3)).toBeGreaterThan(0.9);
    // On screen the squid has the same size at the end as at the start: the world is a stage bigger.
    const [ka, kb] = [mouthFrame(0).k * viewAt(0).zoom, mouthFrame(END).k * viewAt(END).zoom];
    expect(kb).toBeCloseTo(ka, 3);
  });

  it('grows one stage on the meal: SCALE times longer, as the game steps sizes', () => {
    expect(viperLength(SPURT - 0.01)).toBeCloseTo(VIPER_LEN, 6);
    expect(viperLength(SPURT + 2)).toBeCloseTo(VIPER_LEN * SCALE, 2);
    expect(SCALE).toBeGreaterThan(1.3);
    expect(SCALE).toBeLessThan(1.5);
  });

  it('shows the same words either side of the loop point, none on the first frame, and keeps them in y 270-1250', () => {
    expect(CAPTIONS.map((c) => c.text)).toContain('how did THAT fit');
    expect(CAPTIONS[0]!.text).toBe('it’s fighting back');
    expect(CAPTIONS[0]!.from).toBeGreaterThanOrEqual(0.15);
    expect(CAPTIONS[0]!.to).toBeCloseTo(2.5, 6);
    for (const c of CAPTIONS) {
      expect(captionAlpha(c, END)).toBeCloseTo(captionAlpha(c, 0), 3);
      expect(captionAlpha(c, 0)).toBe(0);
      const rows = c.text.split('\n').length;
      expect(c.y - c.size / 2).toBeGreaterThan(270);
      expect(c.y + (rows - 1) * c.size * 1.02 + c.size / 2).toBeLessThan(1250);
    }
    for (let t = 0; t < LOOP_S; t += 0.05) expect(CAPTIONS.filter((c) => captionAlpha(c, t) > 0).length).toBeLessThanOrEqual(1);
    // "how did THAT fit" lands on the gulp.
    const gulp = CAPTIONS.find((c) => c.text === 'how did THAT fit')!;
    expect(captionAlpha(gulp, GULP_AT + 0.5)).toBe(1);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop and the squid’s eye a click', () => {
    expect((LOOP_S * 30) % 1).toBe(0);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    expect(LOOP_S % 1.5).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
      expect(s.gain).toBeLessThanOrEqual(1);
    }
    expect(SOUNDS.some((c) => c.id === 'eatBig' && Math.abs(c.t - GULP_AT) < 0.05)).toBe(true);
    expect(SOUNDS.some((c) => c.id === 'eat' && Math.abs(c.t - POKE_POP) < 0.05)).toBe(true);
  });
});
