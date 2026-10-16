import { describe, expect, it } from 'vitest';
import { CRACK, ENTRANCE, EXIT, HOLE, SPOT } from '../dev/promo/grouper/place';
import {
  arrowAt, arrowDrawn, bubbleAt, captionAt, coralLabel, crackLabel, dogAt, dumbAt, grouperLabel, headstandLabel, LINES, lunchLabel, morayLabel, pointingLabel,
  preyLabel, shakeLines, SOUNDS, spotLabel, spotRing, strikeAt,
} from '../dev/promo/grouper/script';
import {
  alarmAt, boilAt, BOIL_STEPS, chompAt, chromisAt, eatenAt, type Fish, GULP_AT, grouperAt, LOOP_S, morayAt, noseOf, said, shakeAt, STAND_TILT, suctionAt,
} from '../dev/promo/grouper/story';
import { TEMPO, WORDS } from '../dev/promo/grouper/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const KEYS = ['x', 'y', 'len', 'face', 'tilt', 'effort', 'jaw', 'lump'] as const;
/** The arrow as seen: how much is drawn only matters while it shows. */
const arrowSeen = (t: number): number => arrowAt(t) * arrowDrawn(t);
const NOTES = [arrowAt, arrowSeen, pointingLabel, headstandLabel, spotRing, spotLabel, preyLabel, coralLabel, grouperLabel, morayLabel, crackLabel, lunchLabel, shakeLines, bubbleAt, dogAt, dumbAt];

const same = (a: Fish, b: Fish): void => {
  for (const key of KEYS) expect(a[key]).toBeCloseTo(b[key], 3);
  expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 3);
};

/** Whether a point is inside a polygon (even-odd). */
function inside(p: { x: number; y: number }, poly: readonly { x: number; y: number }[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [a, b] = [poly[i]!, poly[j]!];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

describe('promo short: fish can point (narrated)', () => {
  it('loops: the grouper, the moray and every note are where they were at the start', () => {
    same(grouperAt(END), grouperAt(0));
    same(morayAt(END), morayAt(0));
    for (const f of NOTES) expect(f(END)).toBeCloseTo(f(0), 3);
    for (const f of [chromisAt, eatenAt]) {
      expect(f(0)).toBeNull();
      expect(f(END)).toBeNull();
    }
    expect(shakeAt(0)).toBe(0);
    expect(alarmAt(END)).toBe(0);
    expect(suctionAt(0)).toBe(0);
  });

  it('never jumps: the fish and the notes move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      for (const at of [grouperAt, morayAt]) {
        const [p, q] = [at(a), at(b)];
        expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(30);
        expect(Math.abs(q.face - p.face)).toBeLessThan(0.3);
        expect(Math.abs(q.tilt - p.tilt)).toBeLessThan(0.3);
      }
      const [m, n] = [chromisAt(a), chromisAt(b)];
      if (m && n) expect(Math.hypot(n.x - m.x, n.y - m.y)).toBeLessThan(40);
      for (const f of NOTES) expect(Math.abs(f(b) - f(a))).toBeLessThan(0.25);
    }
  });

  it('opens on the hook: the grouper on its head over the crack, the arrow down from its nose and "pointing"', () => {
    const g = grouperAt(0);
    expect(g.face).toBe(1);
    expect(g.tilt).toBeLessThan(STAND_TILT + 0.05);
    const nose = noseOf(g);
    expect(nose.y).toBeGreaterThan(g.y + 100);
    expect(Math.abs(nose.x - SPOT.x)).toBeLessThan(40);
    expect(nose.y).toBeLessThan(ENTRANCE[1].y);
    expect(arrowAt(0)).toBe(1);
    expect(arrowDrawn(0)).toBe(1);
    expect(pointingLabel(0)).toBe(1);
    expect(dumbAt(0)).toBe(0);
    expect(captionAt(0)!.line.words.map((w) => w.text).join(' ')).toBe('Fish can POINT.');
    // Already moving in the first frame.
    const h = grouperAt(FRAME);
    expect(Math.hypot(h.x - g.x, h.y - g.y) + Math.abs(h.tilt - g.tilt)).toBeGreaterThan(0.05);
  });

  it('hides the prey in the coral on "When prey hides in the coral", where it waits in the crack', () => {
    expect(chromisAt(said('When') - 0.15)).toBeNull();
    // In from the right edge as "When" is said, and on screen by "prey".
    expect(chromisAt(said('When'))!.x).toBeGreaterThan(1080);
    expect(chromisAt(said('prey'))!.x).toBeLessThan(1080);
    expect(preyLabel(said('prey') + 0.2)).toBe(1);
    expect(coralLabel(said('coral,') + 0.2)).toBe(1);
    for (const t of [said('grouper'), said('HEADSTAND'), said('dog.')]) expect(inside(chromisAt(t)!, CRACK)).toBe(true);
  });

  it('swims the grouper up to the moray in its hole on "a grouper swims up to a moray eel", and shakes its head on "shakes its head"', () => {
    const m = morayAt(said('moray'));
    expect(noseOf(m).x - HOLE.x).toBeLessThan(140);
    expect(grouperAt(said('grouper')).face).toBe(-1);
    expect(grouperLabel(said('grouper') + 0.2)).toBe(1);
    expect(morayLabel(said('moray') + 0.2)).toBe(1);
    const g = grouperAt(said('eel'));
    expect(g.x - noseOf(m).x).toBeLessThan(300);
    const swings = [said('shakes'), said('its'), said('head:')].map((t) => Math.abs(shakeAt(t + 0.03)) + Math.abs(shakeAt(t + 0.08)));
    for (const s of swings) expect(s).toBeGreaterThan(0.3);
    expect(shakeLines(said('head:'))).toBe(1);
    expect(bubbleAt(said('hunt.'))).toBeGreaterThan(0.95);
  });

  it('does the headstand on "HEADSTAND", rings the spot on "hiding spot", points on "pointing" and shows the dog on "dog"', () => {
    expect(grouperAt(said('Then')).tilt).toBeGreaterThan(-0.4);
    expect(grouperAt(said('over')).tilt).toBeLessThan(-0.8);
    expect(grouperAt(said('spot,')).face).toBe(1);
    expect(headstandLabel(said('HEADSTAND') + 0.2)).toBe(1);
    expect(spotRing(said('spot,'))).toBe(1);
    expect(arrowAt(said('spot,'))).toBe(0);
    expect(arrowAt(said('pointing,') + 0.2)).toBe(1);
    expect(pointingLabel(said('like'))).toBe(1);
    expect(dogAt(said('dog.') - 0.15)).toBe(0);
    expect(dogAt(said('dog.') + 0.15)).toBe(1);
    // The moray has followed it over.
    expect(noseOf(morayAt(said('dog.'))).x).toBeGreaterThan(600);
  });

  it('slides the eel into the crack, flushes the chromis out the far end, and the grouper gulps it on "lunch"', () => {
    const deep = noseOf(morayAt(said('crack,') + 0.4));
    expect(inside(deep, CRACK)).toBe(true);
    expect(crackLabel(said('crack,') + 0.2)).toBe(1);
    expect(alarmAt(said('crack,'))).toBeGreaterThan(0.9);
    const g = grouperAt(said('one'));
    expect(Math.abs(noseOf(g).x - (EXIT[0].x + EXIT[1].x) / 2)).toBeLessThan(40);
    expect(g.tilt).toBeLessThan(-1);
    expect(GULP_AT - said('lunch.')).toBeLessThan(0.1);
    expect(eatenAt(GULP_AT - 0.1)).not.toBeNull();
    expect(chromisAt(GULP_AT)).toBeNull();
    expect(grouperAt(GULP_AT - 0.2).jaw).toBeGreaterThan(0.5);
    expect(grouperAt(GULP_AT + 0.1).jaw).toBe(0);
    expect(grouperAt(GULP_AT + 0.4).lump).toBeGreaterThan(0.3);
    expect(chompAt(GULP_AT + 0.05)).toBeGreaterThan(0);
    expect(lunchLabel(GULP_AT + 0.3)).toBe(1);
  });

  it('sets them side by side for "fish are dumb", strikes "dumb?" on "dumb", and tips back into the headstand', () => {
    const [g, m] = [grouperAt(said('tell')), morayAt(said('tell'))];
    expect(Math.abs(g.tilt)).toBeLessThan(0.2);
    expect(Math.abs(m.tilt)).toBeLessThan(0.05);
    expect(Math.abs(g.x - noseOf(m).x)).toBeLessThan(200);
    expect(dumbAt(said('tell'))).toBe(1);
    expect(strikeAt(said('dumb.') - 0.05)).toBe(0);
    expect(strikeAt(said('dumb.') + 0.15)).toBe(1);
    expect(grouperAt(LOOP_S - 0.15).tilt).toBeLessThan(-1.1);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('Some…');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    expect(LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO).toBeLessThan(0.5);
    expect(TEMPO).toBeLessThanOrEqual(1.15);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(18);
    }
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop and the mood\'s sounds on its beat', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    expect(SOUNDS.some((s) => s.id === 'eatBig' && Math.abs(s.t - GULP_AT) < 0.05)).toBe(true);
    expect(SOUNDS.some((s) => s.id === 'clang' && Math.abs(s.t - said('POINT.')) < 0.05)).toBe(true);
    // The soft last line: only quiet touches.
    for (const s of SOUNDS.filter((c) => c.t > said('So') - 0.1)) expect(s.gain).toBeLessThanOrEqual(0.12);
  });
});
