import { describe, expect, it } from 'vitest';
import { HEDGEHOG_EATS } from '../src/logic/charms';
import { D } from '../src/logic/line';
import { BOIL } from '../src/art/palette';
import { FPS, type Snap } from '../dev/promo/play/director';
import { cuesOf } from '../dev/promo/play/sounds';
import { BOIL_CYCLE_S } from '../dev/promo/sprites';
import { captionAt } from '../dev/promo/captions';
import {
  CAPTIONS, LOOP_S, PATH, PERIOD, recording, SAVE_AT, SPEED, viewAt,
} from '../dev/promo/hedgehog/story';

const rec = recording();
/** What shows of a line: colour, place and charm of every marble out of the burrow. */
const seen = (s: Snap) => s.lines[0]!.filter((m) => m.s > -D).map((m) => ({ colour: m.colour, s: m.s, charm: m.charm, age: m.charmAge }));

describe('promo short: it’s so over… we’re so back (the Hedgehog save)', () => {
  it('loops: the board at the loop’s end is the board at its start, on the game’s own logic', () => {
    for (const { start, end } of rec.seams) {
      const a = seen(start);
      const b = seen(end);
      expect(b.length).toBe(a.length);
      a.forEach((m, i) => {
        expect(b[i]!.colour).toBe(m.colour);
        expect(b[i]!.s).toBeCloseTo(m.s, 3);
        expect(b[i]!.charm).toBe(m.charm);
        expect(b[i]!.age).toBeCloseTo(m.age, 3);
      });
      expect(end.shots.length).toBe(start.shots.length);
      end.shots.forEach((s, i) => {
        expect(s.x).toBeCloseTo(start.shots[i]!.x, 3);
        expect(s.y).toBeCloseTo(start.shots[i]!.y, 3);
      });
      expect(end.gecko.angle).toBeCloseTo(start.gecko.angle, 6);
      expect(end.loaded).toBe(start.loaded);
      expect(end.next).toBe(start.next);
      expect(end.tint).toBe(start.tint);
    }
    const [v0, v1] = [viewAt(0), viewAt(LOOP_S - 1e-9)];
    expect(v1.cx).toBeCloseTo(v0.cx, 6);
    expect(v1.z).toBeCloseTo(v0.z, 6);
  });

  it('is the game’s arithmetic: pushed 14 marbles’ worth a loop, and 14 go', () => {
    expect(SPEED * LOOP_S).toBeCloseTo(PERIOD * D, 6);
    const pops = rec.events.filter((e) => e.t >= 0 && e.t < LOOP_S && e.e.type === 'pop');
    const gone = pops.reduce((n, e) => n + (e.e.type === 'pop' ? e.e.count : 0), 0);
    // Two shots joined the line and popped with it.
    expect(gone - 2).toBe(PERIOD);
  });

  it('lasts a whole number of video frames and line-boil cycles', () => {
    expect((LOOP_S * FPS) % 1).toBeCloseTo(0, 9);
    expect(rec.frames.length).toBe(Math.round(LOOP_S * FPS));
    expect(Math.abs(LOOP_S / BOIL_CYCLE_S - Math.round(LOOP_S / BOIL_CYCLE_S))).toBeLessThan(1e-9);
    expect(BOIL).toBe(3);
  });

  it('opens on action with nothing to read: a shot in the air, the line a few marbles from the well', () => {
    const first = rec.frames[0]!;
    expect(first.shots.length).toBe(1);
    expect(PATH.length - first.lines[0]!.at(-1)!.s).toBeLessThan(5 * D);
    for (const c of CAPTIONS) expect(captionAt(c, 0).alpha).toBe(0);
  });

  it('saves it at the last second: the front shoved to the lip, then the Hedgehog eats ten', () => {
    // Never into the well (record throws if one falls), but within half a marble of it.
    const nearest = Math.min(...rec.frames.map((f) => PATH.length - (f.lines[0]!.at(-1)?.s ?? 0)));
    expect(nearest).toBeLessThan(D / 2);
    const munches = rec.events.filter((e) => e.t >= 0 && e.t < LOOP_S && e.e.type === 'munch');
    expect(munches.length).toBe(HEDGEHOG_EATS);
    const charm = rec.events.find((e) => e.t >= 0 && e.e.type === 'charm')!;
    // The payoff about 40% of the way in.
    expect(charm.t / LOOP_S).toBeGreaterThan(0.35);
    expect(charm.t / LOOP_S).toBeLessThan(0.45);
    expect(charm.t).toBeGreaterThan(SAVE_AT);
  });

  it('keeps the meme captions in the clear band, one at a time', () => {
    for (const c of CAPTIONS) {
      expect(c.y - c.size).toBeGreaterThan(270);
      expect(c.y).toBeLessThan(1250);
    }
    for (let t = 0; t < LOOP_S; t += 0.05) expect(CAPTIONS.filter((c) => captionAt(c, t).alpha > 0).length).toBeLessThanOrEqual(1);
  });

  it('scores with the game’s own sounds, inside the loop: the heartbeat, the save, the munching', () => {
    const cues = cuesOf(rec, () => 540);
    for (const c of cues) expect(c.t >= 0 && c.t < LOOP_S).toBe(true);
    for (const id of ['danger', 'spit', 'pop', 'charm', 'snuffle', 'munch', 'join', 'swap'] as const) expect(cues.some((c) => c.id === id)).toBe(true);
  });
});
