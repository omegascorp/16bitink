import { describe, expect, it } from 'vitest';
import { bodyProportions } from '../src/art/fishArt';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';
import { canSwallow, PLAYER_ABILITY } from '../src/logic/abilities';
import { addGrowth, initialGrowth, playerSizeFor } from '../src/logic/growth';
import { growthPointsFor, relationTo, scoreFor } from '../src/logic/sizing';
import { SPECIES_INFO } from '../src/levels/species';
import { INKFISH_FULL_CHAPTERS } from '../content/paid';
import {
  bellyCoil, BITE_AT, CAPTIONS, captionAlpha, D_START, DRAWN, GULP_AT, growthBar, HEAVES, HOLD, LOOP_S, MEAL_POINTS, morayAlarm, morayAt, morayD, morayMurk, MORAY_LEN, MORAY_SIZE,
  POINTS_BEFORE, pullAt, SCALE, SCORE_TEXT, SLURP_AT, SOUNDS, tailFlick, viewAt, viperBelly, viperEyes, viperFish, viperJaw, VIPER_LEN, VIPER_SIZE, type MorayState, type View,
  type WorldFish,
} from '../dev/promo/gulpmoray/story';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FOCUS = { x: 540, y: 800 };
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

interface P { readonly x: number; readonly y: number }
const seenAt = (p: P, v: View): P => ({ x: FOCUS.x + v.zoom * (p.x - v.x), y: FOCUS.y + v.zoom * (p.y - v.y) });
const seen = (f: WorldFish, v: View) => ({ ...seenAt(f, v), length: v.zoom * f.length });
const ribbon = (t: number) => {
  const o: MorayState = morayAt(t);
  if (o.kind === 'gone') throw new Error(`no moray at ${t}`);
  return o.ribbon;
};
/** The ribbon's nose and tail tip on screen. */
const ends = (t: number) => {
  const [r, v] = [ribbon(t), viewAt(t)];
  return { nose: seenAt(r.at(0), v), tail: seenAt(r.at(r.length), v), length: r.length * v.zoom };
};

function expectSameOnScreen(a: WorldFish, va: View, b: WorldFish, vb: View): void {
  const sa = seen(a, va);
  const sb = seen(b, vb);
  expect(sb.x).toBeCloseTo(sa.x, 1);
  expect(sb.y).toBeCloseTo(sa.y, 1);
  expect(sb.length).toBeCloseTo(sa.length, 1);
  expect(b.tilt).toBeCloseTo(a.tilt, 3);
  expect(wrap(b.beat - a.beat)).toBeCloseTo(0, 3);
}

const MIDNIGHT = INKFISH_FULL_CHAPTERS.find((c) => c.id === 8)!.levels[9]!;

describe('promo short: how did that fit 122 (the moray)', () => {
  it('loops: the next moray at the end is the first at the start, scaled up by the camera’s pull-back, whip included', () => {
    expect(pullAt(END)).toBeCloseTo(pullAt(0) + 1, 6);
    const [va, vb] = [viewAt(0), viewAt(END)];
    expectSameOnScreen(viperFish(0), va, viperFish(END), vb);
    expect(morayAt(0).kind).toBe('there');
    expect(morayAt(END).kind).toBe('there');
    expect(morayD(END)).toBeCloseTo(morayD(0), 4);
    for (const f of [0, 0.1, 0.3, 0.6, 0.9, 1]) {
      const [a, b] = [ribbon(0), ribbon(END)];
      const [pa, pb] = [seenAt(a.at(f * a.length), va), seenAt(b.at(f * b.length), vb)];
      expect(pb.x).toBeCloseTo(pa.x, 0);
      expect(pb.y).toBeCloseTo(pa.y, 0);
    }
    expect(viperJaw(END)).toBeCloseTo(viperJaw(0), 3);
    expect(viperBelly(END).size).toBeCloseTo(viperBelly(0).size, 4);
    expect(viperEyes(END)).toBe(viperEyes(0));
    expect(morayAlarm(END)).toBeCloseTo(morayAlarm(0), 4);
    expect(morayMurk(END)).toBeCloseTo(0, 6);
    expect(bellyCoil(END)).toBe(0);
    expect(bellyCoil(0)).toBe(0);
    expect(growthBar(END).alpha).toBe(0);
    expect(growthBar(0).alpha).toBe(0);
  });

  it('opens on the jaws round the moray’s head, its "!" up, the ribbon running out of the frame, and no numbers', () => {
    expect(viperJaw(0)).toBeGreaterThan(1.5);
    expect(morayAlarm(0)).toBeGreaterThan(0.9);
    expect(morayD(0)).toBeCloseTo(D_START, 6);
    const v = viewAt(0);
    const you = seen(viperFish(0), v);
    const { nose, tail } = ends(0);
    // The head is at the lips, in the middle of the frame, the tail far across the frame.
    expect(nose.x).toBeGreaterThan(you.x);
    expect(nose.x).toBeLessThan(700);
    expect(tail.x).toBeGreaterThan(850);
    expect(ends(0).length).toBeGreaterThan(1.4 * you.length);
    expect(growthBar(0).alpha).toBe(0);
  });

  it('is much longer than the viper, and every point of it stays in the safe band while it is in view', () => {
    expect(MORAY_LEN * DRAWN).toBeGreaterThan(1.4 * VIPER_LEN);
    for (let t = 0; t < LOOP_S; t += 0.1) {
      const o = morayAt(t);
      if (o.kind === 'gone' || morayMurk(t) > 0.5) continue;
      const r = o.ribbon;
      const v = viewAt(t);
      for (let f = 0; f <= 1; f += 0.05) {
        const p = seenAt(r.at(f * r.length), v);
        expect(p.y, `t=${t} f=${f}`).toBeGreaterThan(250);
        expect(p.y).toBeLessThan(1500);
      }
    }
  });

  it('moves smoothly on screen: no frame jumps further than a lunge, the camera included', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      const next = (t + FRAME) % LOOP_S;
      const [v, w] = [viewAt(t), viewAt(next)];
      const a = seen(viperFish(t), v);
      const b = seen(viperFish(next), w);
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(56);
      expect(Math.hypot(v.zoom * v.x - w.zoom * w.x, v.zoom * v.y - w.zoom * w.y)).toBeLessThan(56);
      const [fa, fb] = [morayAt(t), morayAt(next)];
      if (fa.kind !== 'gone' && fb.kind !== 'gone') {
        const p = seenAt(fa.ribbon.at(0), v);
        const q = seenAt(fb.ribbon.at(0), w);
        expect(Math.hypot(p.x - q.x, p.y - q.y), `t=${t}`).toBeLessThan(100);
      }
    }
  });

  it('keeps the viper big and its head in frame', () => {
    for (let t = 0; t < LOOP_S; t += 0.1) {
      const s = seen(viperFish(t), viewAt(t));
      expect(s.length).toBeGreaterThan(600);
      expect(s.x + s.length / 2).toBeLessThan(1080);
      expect(s.x + s.length * 0.2).toBeGreaterThan(-100);
      expect(s.y).toBeGreaterThan(620);
      expect(s.y).toBeLessThan(960);
    }
  });

  it('is faithful to the game: an moray a peer of the viper that only the gape can swallow, worth a stage-up', () => {
    expect(PLAYER_ABILITY.viperfish).toBe('gape');
    expect(SPECIES_INFO.moray).toBeDefined();
    expect(MIDNIGHT.name).toBe('Midnight');
    expect(MIDNIGHT.playerSizes[3]).toBe(VIPER_SIZE);
    expect(MIDNIGHT.playerSizes[4]! / MIDNIGHT.playerSizes[3]!).toBeCloseTo(SCALE, 6);
    for (const [viper, oar] of [[VIPER_SIZE, MORAY_SIZE], [VIPER_SIZE * SCALE, MORAY_SIZE * SCALE]] as const) {
      expect(relationTo(viper, oar)).toBe('peer');
      expect(canSwallow('gape', relationTo(viper, oar))).toBe(true);
      expect(canSwallow('ink', relationTo(viper, oar))).toBe(false);
    }
    // Its true drawing is already about as long as the viper, and an eel's long body.
    expect(MORAY_LEN / VIPER_LEN).toBeGreaterThan(0.9);
    expect(bodyProportions('moray').hl / bodyProportions('moray').hh).toBeGreaterThan(5);
    const before = addGrowth(MIDNIGHT, initialGrowth, POINTS_BEFORE);
    const after = addGrowth(MIDNIGHT, before, growthPointsFor(MORAY_SIZE));
    expect(playerSizeFor(MIDNIGHT, before.tier)).toBe(VIPER_SIZE);
    expect(playerSizeFor(MIDNIGHT, after.tier)).toBe(MIDNIGHT.playerSizes[4]);
    expect(MEAL_POINTS).toBe(growthPointsFor(MORAY_SIZE));
    expect(SCORE_TEXT).toBe(`+${scoreFor(MORAY_SIZE, 1)}`);
  });

  it('slurps in head first like a noodle: three heaves, it keeps coming, the tail tip last with one flick, then the gulp', () => {
    expect(morayD(BITE_AT + 0.3)).toBeGreaterThan(D_START);
    const after = HEAVES.map((h) => morayD(h + 0.3));
    expect(after[1]!).toBeGreaterThan(after[0]!);
    expect(after[2]!).toBeGreaterThan(after[1]!);
    // It never quite stops between the heaves.
    expect(morayD(3.5)).toBeGreaterThan(morayD(2.5));
    expect(morayD(SLURP_AT - 0.1)).toBeCloseTo(HOLD, 3);
    expect(morayD(GULP_AT - 1e-6)).toBeGreaterThan(1);
    expect(morayAt(GULP_AT).kind).toBe('gone');
    // The tail tip is the last bit out of the lips, and flicks once before the last slurp.
    expect(tailFlick(4.3)).toBeGreaterThan(0.9);
    expect(tailFlick(3)).toBe(0);
    expect(tailFlick(SLURP_AT)).toBe(0);
    // The ribbon whips: it is not a straight line while it goes in.
    const r = ribbon(3);
    const [a, b, c] = [r.at(0.5 * r.length), r.at(0.7 * r.length), r.at(0.9 * r.length)];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    expect(Math.abs(cross)).toBeGreaterThan(1);
    // The belly balloons with the ribbon coiled inside.
    expect(viperBelly(GULP_AT + 0.3).size).toBeGreaterThan(1.2);
    expect(bellyCoil(GULP_AT + 0.3)).toBeGreaterThan(0.9);
    expect(bellyCoil(8)).toBe(0);
    expect(GULP_AT / LOOP_S).toBeGreaterThan(0.38);
    expect(GULP_AT / LOOP_S).toBeLessThan(0.5);
  });

  it('shows the next moray only after it ribbons in out of the dark', () => {
    expect(morayMurk(8.4)).toBeGreaterThan(0.9);
    expect(morayMurk(11)).toBe(0);
    expect(morayAt(7).kind).toBe('gone');
    expect(morayD(8.4)).toBeLessThan(0);
    expect(morayD(11)).toBeLessThan(0);
  });

  it('shows the same words either side of the loop point, none on the first frame, all inside the safe band', () => {
    for (const c of CAPTIONS) {
      expect(captionAlpha(c, END)).toBeCloseTo(captionAlpha(c, 0), 3);
      const rows = c.text.split('\n').length;
      expect(c.y).toBeGreaterThanOrEqual(270);
      expect(c.y + (rows - 1) * c.size * 1.02).toBeLessThanOrEqual(1250);
      expect(captionAlpha(c, 0)).toBe(0);
    }
    expect(Math.min(...CAPTIONS.map((c) => c.from).filter((f) => f >= 0))).toBeGreaterThanOrEqual(0.15);
    for (let t = 0; t < LOOP_S; t += 0.05) expect(CAPTIONS.filter((c) => captionAlpha(c, t) > 0).length).toBeLessThanOrEqual(1);
    expect(CAPTIONS.map((c) => c.text)).toEqual(['he bites\nback…', 'how did THAT fit', 'his uncle is\nTWICE as long']);
    expect(CAPTIONS.map((c) => [c.from, c.to])).toEqual([[0.2, 2.5], [5.0, 8.3], [9.0, 11.25]]);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop and a slurp at each heave', () => {
    expect((LOOP_S * 30) % 1).toBe(0);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    expect(LOOP_S % 1.5).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    for (const h of HEAVES) expect(SOUNDS.some((c) => c.id === 'suck' && Math.abs(c.t - h) < 0.1)).toBe(true);
    expect(SOUNDS.some((c) => c.id === 'eatBig' && Math.abs(c.t - GULP_AT) < 0.1)).toBe(true);
  });
});
