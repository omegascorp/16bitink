import { describe, expect, it } from 'vitest';
import { bodyPoint, type Fish, FLOOR_Y, mouthOf, PECTORAL_RAYS, pectoralAt, PELVIC_LEN, STILTS, stiltAt, TRIPOD } from '../dev/promo/tripod/body';
import {
  barsAt, bodyBarAt, captionAt, copepodLabel, currentAt, depthAt, finRaysLabel, foodArrowAt, frontFinsLabel, kmLabel, lensAt, LINES, metresAt, mudLabel,
  nameLabel, raySwingAt, rayTraceAt, SOUNDS, stiltsLabel, tagAt,
} from '../dev/promo/tripod/notes';
import {
  B_FROM, boilAt, BOIL_STEPS, DRIFTERS, drifterAt, EAT_A, EAT_B, finsForward, LAND_AT, LIFT_AT, LOOP_S, mealAt, rattailAt, RISE_AT, said, snapAt, STAND_AT,
  stiltsDown, stiffAt, tripodAt,
} from '../dev/promo/tripod/story';
import { TEMPO, WORDS } from '../dev/promo/tripod/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const KEYS = ['x', 'y', 'len', 'face', 'tilt', 'effort', 'jaw'] as const;

const same = (a: Fish, b: Fish): void => {
  for (const key of KEYS) expect(a[key]).toBeCloseTo(b[key], 3);
  expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 3);
};

/** Where its feet are at time t. */
const feet = (t: number): { x: number; y: number }[] => STILTS.map((s) => stiltAt(s, tripodAt(t), stiltsDown(t)).foot);

describe('promo short: this fish stands on stilts (narrated)', () => {
  it('loops: everything at the loop point is where it was at the start', () => {
    same(tripodAt(END), tripodAt(0));
    expect(stiltsDown(END)).toBeCloseTo(stiltsDown(0), 4);
    expect(finsForward(END)).toBeCloseTo(finsForward(0), 4);
    const [a, b] = [mealAt('a', END), mealAt('a', 0)];
    expect(a && b).toBeTruthy();
    expect(a!.x).toBeCloseTo(b!.x, 1);
    expect(a!.y).toBeCloseTo(b!.y, 1);
    expect(mealAt('b', 0)).toBeNull();
    expect(mealAt('b', END)).toBeNull();
    expect(rattailAt(0)).toBeNull();
    expect(rattailAt(END)).toBeNull();
    DRIFTERS.forEach((_, i) => {
      expect(drifterAt(i, END).x).toBeCloseTo(drifterAt(i, 0).x, 1);
      expect(drifterAt(i, END).y).toBeCloseTo(drifterAt(i, 0).y, 1);
    });
    for (const f of [stiltsLabel, nameLabel, mudLabel, depthAt, kmLabel, barsAt, currentAt, frontFinsLabel, lensAt, copepodLabel, foodArrowAt, stiffAt]) {
      expect(f(END)).toBeCloseTo(f(0), 4);
    }
    for (let i = 0; i < 3; i++) expect(tagAt(i, END)).toBeCloseTo(tagAt(i, 0), 4);
  });

  it('never jumps: the fish, its rays and the copepods move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      const [p, q] = [tripodAt(a), tripodAt(b)];
      // Its quickest move is the rise onto its stilts, about 1,000 px a second at its fastest.
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(40);
      expect(Math.abs(q.tilt - p.tilt)).toBeLessThan(0.03);
      expect(Math.abs(stiltsDown(b) - stiltsDown(a))).toBeLessThan(0.15);
      expect(Math.abs(finsForward(b) - finsForward(a))).toBeLessThan(0.12);
      for (const id of ['a', 'b'] as const) {
        const [m, n] = [mealAt(id, a), mealAt(id, b)];
        if (m && n) expect(Math.hypot(n.x - m.x, n.y - m.y)).toBeLessThan(40);
      }
      const [r, s] = [rattailAt(a), rattailAt(b)];
      if (r && s) expect(Math.abs(s.x - r.x)).toBeLessThan(20);
    }
  });

  it('opens on the hook: standing tall on three stilts, each foot on the mud, labelled, a copepod drifting into its mouth', () => {
    expect(stiltsDown(0)).toBe(1);
    expect(stiltsLabel(0)).toBe(1);
    for (const p of feet(0)) expect(p.y).toBeCloseTo(FLOOR_Y, 0);
    expect(FLOOR_Y - tripodAt(0).y).toBeGreaterThan(0.9 * TRIPOD.len);
    // Already moving: the copepod is on its way in and gets eaten just after "fish".
    const m0 = mealAt('a', 0)!;
    const m1 = mealAt('a', 0.2)!;
    const mouth = mouthOf(tripodAt(0));
    expect(Math.hypot(m1.x - mouth.x, m1.y - mouth.y)).toBeLessThan(Math.hypot(m0.x - mouth.x, m0.y - mouth.y));
    expect(EAT_A).toBeLessThan(said('stands'));
    expect(mealAt('a', EAT_A + 0.01)).toBeNull();
    expect(tripodAt(EAT_A - 0.15).jaw).toBeGreaterThan(0.4);
    expect(snapAt(EAT_A + 0.1)).toBeGreaterThan(0);
    // The rays flash on "STILTS".
    expect(stiffAt(said('STILTS.') + 0.2)).toBeGreaterThan(0.5);
  });

  it('settles onto the mud on "lives on the mud…floor", its rays folded back, with a rattail swimming by', () => {
    expect(tripodAt(LIFT_AT + 0.4).y).toBeLessThan(tripodAt(0).y);
    expect(stiltsDown(said('mud'))).toBe(0);
    expect(nameLabel(said('tripodfish') + 0.3)).toBe(1);
    expect(mudLabel(said('mud') + 0.3)).toBe(1);
    const lying = tripodAt(LAND_AT + 0.1);
    expect(bodyPoint(lying, 0.42, 1).y).toBeGreaterThan(FLOOR_Y - 8);
    expect(Math.abs(LAND_AT - said('floor,'))).toBeLessThan(0.05);
    expect(rattailAt(said('down.'))).not.toBeNull();
  });

  it('runs the depth gauge to 4,500 m on "up to four and a half kilometres down"', () => {
    expect(depthAt(said('four'))).toBe(1);
    expect(metresAt(said('up') - 0.1)).toBe(0);
    expect(metresAt(said('half'))).toBeGreaterThan(1000);
    expect(metresAt(said('down.'))).toBe(4500);
    expect(kmLabel(said('kilometres') + 0.4)).toBe(1);
    expect(depthAt(STAND_AT + 0.2)).toBe(0);
  });

  it('props itself up (the payoff, about 40% in): rays swing down, it rises, and its feet land on the mud', () => {
    expect(RISE_AT / LOOP_S).toBeGreaterThan(0.35);
    expect(STAND_AT / LOOP_S).toBeLessThan(0.45);
    expect(Math.abs(RISE_AT - said('It'))).toBeLessThan(0.25);
    expect(stiltsDown(said('props'))).toBeLessThan(0.1);
    expect(stiltsDown(said('up', 2))).toBeGreaterThan(0.8);
    expect(tripodAt(said('up', 2)).y).toBeLessThan(tripodAt(said('props')).y - 300);
    for (const p of feet(STAND_AT)) expect(p.y).toBeCloseTo(FLOOR_Y, 0);
    expect(stiffAt(STAND_AT + 0.2)).toBeGreaterThan(0.5);
    // The rays never poke into the mud on the way up or down.
    for (let t = 0; t < LOOP_S; t += 0.01) for (const p of feet(t)) expect(p.y).toBeLessThan(FLOOR_Y + 3);
  });

  it('numbers the three rays as they are named, and shows the front one is longer than the body', () => {
    expect(STILTS.length).toBe(3);
    expect(PELVIC_LEN).toBeGreaterThan(TRIPOD.len);
    ['three', 'fin', 'rays'].forEach((word, i) => {
      expect(tagAt(i, said(word) - 0.1)).toBe(0);
      expect(tagAt(i, said(word) + 0.2)).toBe(1);
    });
    expect(finRaysLabel(said('fin') + 0.3)).toBe(1);
    expect(rayTraceAt(said('longer'))).toBeGreaterThan(0.9);
    expect(raySwingAt(said('than'))).toBeGreaterThan(0);
    expect(raySwingAt(said('body,') + 0.1)).toBe(1);
    expect(bodyBarAt(said('body,') - 0.15)).toBe(0);
    expect(bodyBarAt(said('body,') + 0.3)).toBe(1);
    expect(barsAt(said('body,') + 0.3)).toBe(1);
  });

  it('shows the current on "faces into the current", then the front fins reaching forward on "reach forward"', () => {
    expect(currentAt(said('faces') - 0.2)).toBe(0);
    expect(currentAt(said('current.'))).toBe(1);
    expect(finsForward(said('current.'))).toBe(0);
    expect(finsForward(said('like'))).toBeGreaterThan(0.9);
    expect(frontFinsLabel(said('fins') + 0.1)).toBe(1);
  });

  it('feels for a copepod: it drifts into the fins on "feeling", a lens on it on "tiny crustaceans", and it is eaten on "come to it"', () => {
    expect(B_FROM).toBeLessThan(said('reach'));
    // Among the fin rays' tips as they feel about.
    const t = said('feeling');
    const c = mealAt('b', t)!;
    const tips = Array.from({ length: PECTORAL_RAYS }, (_, i) => pectoralAt(tripodAt(t), i, finsForward(t)).tip);
    expect(Math.min(...tips.map((p) => Math.hypot(p.x - c.x, p.y - c.y)))).toBeLessThan(60);
    expect(lensAt(said('crustaceans'))).toBe(1);
    expect(copepodLabel(said('crustaceans') + 0.3)).toBe(1);
    const m = mealAt('b', said('food'))!;
    const mouth = mouthOf(tripodAt(said('food')));
    expect(Math.hypot(m.x - mouth.x, m.y - mouth.y)).toBeGreaterThan(40);
    expect(foodArrowAt(said('food'))).toBe(1);
    expect(EAT_B).toBeGreaterThan(said('it.'));
    expect(EAT_B).toBeLessThan(said("That's"));
    expect(mealAt('b', EAT_B)).toBeNull();
    expect(tripodAt(EAT_B - 0.15).jaw).toBeGreaterThan(0.4);
    expect(SOUNDS.some((s) => s.id === 'eat' && Math.abs(s.t - EAT_B) < 0.05)).toBe(true);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('why');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    expect(gap).toBeLessThan(0.5);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) expect(l.words.length).toBeLessThanOrEqual(4);
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
    expect(captionAt(0)!.line).toBe(LINES[0]);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
