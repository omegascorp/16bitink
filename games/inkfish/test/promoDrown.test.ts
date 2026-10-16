import { describe, expect, it } from 'vitest';
import { CARD, project, routeAt } from '../dev/promo/drown/atlas';
import {
  bluefinLabel, captionAt, chokeLabel, gillsLabel, hookAt, LINES, mouthLabel, oceanLabel, SOUNDS, tunaLabel, waterLabel,
} from '../dev/promo/drown/script';
import {
  bedAt, bedCrossAt, boilAt, BOIL_STEPS, drainAt, flowPhase, type Fish, gaugeAt, LOOP_S, MAP_LEN, mapAt, nightAt, onMapAt, oxygenAt, ringAt, RING_LAND,
  routeUAt, said, speedAt, stopAt, TUNA, tunaAt, waterAt, zzzAt, zzzStrikeAt,
} from '../dev/promo/drown/story';
import { TEMPO, WORDS } from '../dev/promo/drown/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const KEYS = ['x', 'y', 'len', 'tilt', 'effort', 'jaw'] as const;
const BEATS = [
  hookAt, tunaLabel, mouthLabel, waterLabel, gillsLabel, chokeLabel, bluefinLabel, oceanLabel, gaugeAt, drainAt, waterAt, nightAt, bedAt, zzzAt, mapAt,
  onMapAt, stopAt, speedAt,
];

const same = (a: Fish, b: Fish): void => {
  for (const key of KEYS) expect(a[key]).toBeCloseTo(b[key], 3);
  expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 3);
};

describe('promo short: fish CAN drown (narrated)', () => {
  it('loops: the tuna, its ring, the sea and every note are where they were at the start', () => {
    same(tunaAt(END), tunaAt(0));
    for (const f of BEATS) expect(f(END)).toBeCloseTo(f(0), 4);
    const [r0, r1] = [ringAt(0)!, ringAt(END)!];
    expect(r1.lift).toBeCloseTo(r0.lift, 3);
    expect(r1.spin).toBeCloseTo(r0.spin, 3);
    // The stream comes round whole: every mark has lapped the frame a whole number of times.
    expect(flowPhase(0)).toBe(0);
    expect(flowPhase(END)).toBeCloseTo(1, 4);
  });

  it('never jumps: the tuna, its ring and the night move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      const [p, q] = [tunaAt(a), tunaAt(b)];
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(40);
      expect(Math.abs(q.len - p.len)).toBeLessThan(40);
      expect(Math.abs(q.tilt - p.tilt)).toBeLessThan(0.1);
      expect(Math.abs(q.jaw - p.jaw)).toBeLessThan(0.15);
      for (const f of [nightAt, mapAt, gaugeAt, oxygenAt, waterAt]) expect(Math.abs(f(b) - f(a))).toBeLessThan(0.2);
      const [m, n] = [ringAt(a), ringAt(b)];
      // While it's on screen the ring floats and falls, never teleports.
      if (m && n && Math.min(m.lift, n.lift) < 600) expect(Math.abs(n.lift - m.lift)).toBeLessThan(80);
      const d = (flowPhase(b) - flowPhase(a) + 1) % 1;
      expect(d).toBeLessThan(0.01);
    }
  });

  it('opens on the hook: the tuna already swimming in a life ring under "FISH CAN DROWN?!"', () => {
    expect(hookAt(0)).toBe(1);
    expect(ringAt(0)!.lift).toBe(0);
    const f = tunaAt(0);
    expect(f.len).toBe(TUNA.len);
    expect(f.x).toBeGreaterThan(300);
    expect(f.x).toBeLessThan(780);
    expect(speedAt(0)).toBe(1);
    expect(f.effort).toBeGreaterThan(0.5);
    expect(mapAt(0)).toBe(0);
    expect(nightAt(0)).toBe(0);
    expect(captionAt(0)!.line).toBe(LINES[0]);
    expect(captionAt(0)!.line.words.map((w) => w.text).join(' ')).toBe('Fish CAN drown.');
  });

  it('breathes: the ring floats off, the O₂ gauge is full, the mouth opens and water runs over the gills on their words', () => {
    expect(ringAt(said('breathes') + 1)).toBeNull();
    expect(tunaLabel(said('tuna') + 0.25)).toBe(1);
    expect(gaugeAt(said('breathes') + 0.2)).toBe(1);
    expect(oxygenAt(said('breathes') + 0.2)).toBe(1);
    expect(tunaAt(said('mouth') - 0.15).jaw).toBe(0);
    expect(tunaAt(said('open,') + 0.15).jaw).toBeGreaterThan(0.25);
    expect(mouthLabel(said('mouth') + 0.25)).toBe(1);
    expect(waterAt(said('water') + 0.15)).toBe(1);
    expect(waterLabel(said('water') + 0.25)).toBe(1);
    expect(gillsLabel(said('gills.') + 0.25)).toBe(1);
  });

  it('stops on "stops swimming": the water stops, it sinks, the gauge drains into the red on "suffocates", and it swims off before anything worse', () => {
    expect(stopAt(said('stops') - 0.1)).toBe(0);
    expect(stopAt(said('it', 2) + 0.05)).toBe(1);
    expect(speedAt(said('suffocates.'))).toBeLessThan(0.1);
    expect(waterAt(said('suffocates.'))).toBe(0);
    expect(tunaAt(said('suffocates.')).y - TUNA.y).toBeGreaterThan(50);
    expect(oxygenAt(said('suffocates.') + 0.7)).toBeLessThan(0.2);
    expect(chokeLabel(said('suffocates.') + 0.2)).toBe(1);
    // "So it never stops": off again, the oxygen back up.
    expect(stopAt(said('stops.'))).toBe(0);
    expect(speedAt(said('never'))).toBeGreaterThan(1);
    expect(oxygenAt(said('stops.', 1) + 0.3)).toBe(1);
  });

  it('swims through the night: the bed crossed out on "rest", the "Zzz" struck through on "SLEEP"', () => {
    expect(nightAt(said('rest.'))).toBe(1);
    expect(nightAt(said('SLEEP.'))).toBe(1);
    expect(bedAt(said('rest.') + 0.05)).toBe(1);
    expect(bedCrossAt(said('rest.') + 0.5)).toBe(1);
    expect(bedCrossAt(said('rest.'))).toBe(0);
    expect(zzzAt(said('even') + 0.15)).toBe(1);
    expect(zzzStrikeAt(said('SLEEP.'))).toBe(0);
    expect(zzzStrikeAt(said('SLEEP.') + 0.4)).toBe(1);
    for (const w of ['rest.', 'SLEEP.']) expect(speedAt(said(w))).toBeGreaterThan(0.95);
    // The gauge has gone before the night's props come in.
    expect(gaugeAt(said('rest.'))).toBe(0);
  });

  it('crosses the Atlantic on "A bluefin can swim across an entire ocean", from the Americas to Gibraltar', () => {
    const t = said('bluefin') + 0.3;
    expect(mapAt(t)).toBe(1);
    expect(nightAt(t)).toBe(0);
    expect(tunaAt(t).len).toBe(MAP_LEN);
    expect(bluefinLabel(t)).toBe(1);
    expect(routeUAt(said('swim') - 0.3)).toBe(0);
    expect(routeUAt(said('ocean.') + 0.6)).toBe(1);
    expect(oceanLabel(said('ocean.') + 0.2)).toBe(1);
    const [start, end] = [routeAt(0), routeAt(1)];
    expect(start.x).toBeLessThan(project(-60, 0).x);
    expect(end.x).toBeGreaterThan(project(-10, 0).x);
    for (const p of [start, end]) {
      expect(p.x).toBeGreaterThan(CARD.x);
      expect(p.x).toBeLessThan(CARD.x + CARD.w);
    }
    const mid = tunaAt(said('across'));
    expect(mid.x).toBeGreaterThan(start.x);
    expect(mid.x).toBeLessThan(end.x);
  });

  it('comes back to the hook on "So yes, believe it or not:", the ring landing before the loop point', () => {
    expect(mapAt(said('believe'))).toBe(0);
    expect(tunaAt(said('believe')).len).toBe(TUNA.len);
    expect(hookAt(said('believe') + 0.3)).toBe(1);
    expect(RING_LAND).toBeLessThan(LOOP_S - 0.3);
    expect(ringAt(RING_LAND - 0.3)!.lift).toBeGreaterThan(0);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('not:');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    expect(LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO).toBeLessThan(0.5);
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

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop and nothing comic as it suffocates', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    const grim = SOUNDS.filter((s) => s.t > said('stops') && s.t < said('So') - 0.2);
    expect(grim.length).toBeGreaterThan(3);
    for (const s of grim) expect(['click', 'spotted', 'dash']).toContain(s.id);
  });
});
