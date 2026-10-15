import { describe, expect, it } from 'vitest';
import { CRABS, crabAt, HERO_INDEX } from '../dev/promo/snowcrab/field';
import {
  alaskaLabelAt, barAt, captionAt, crabLabelAt, crabsShown, energyAt, everAt, FADES, firstTimeAt, heatAt, heatwaveLabelAt, iceAt, icyLabelAt, joltAt,
  LINES, loneAt, LOOP_S, mapAt, noticeAlaskaAt, noticeAt, noticeYearAt, numberAt, outlinesShown, pinAt, seaLabelAt, seasonLineAt, shimmerAt, SOUNDS,
  stampAt, thermoAt, underlineAt, vanishedAt, warmthAt, yearAt, yearsAt,
} from '../dev/promo/snowcrab/story';
import { boilAt, BOIL_STEPS, said, YEAR_TICKS } from '../dev/promo/snowcrab/timing';
import { TEMPO, WORDS } from '../dev/promo/snowcrab/words';
import { BOIL } from '../src/art/palette';
import { BOIL_FPS } from '../dev/promo/sprites';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Everything that fades or moves as a plain number of time. */
const CURVES: Readonly<Record<string, (t: number) => number>> = {
  numberAt, vanishedAt, underlineAt, yearsAt, crabLabelAt, mapAt, pinAt, seaLabelAt, thermoAt, heatAt, heatwaveLabelAt, warmthAt, icyLabelAt, iceAt,
  barAt, energyAt, shimmerAt, noticeAt, stampAt, joltAt, firstTimeAt, everAt,
  loneBody: (t) => loneAt(t).body, loneGhost: (t) => loneAt(t).ghost, loneX: (t) => loneAt(t).x / 100,
};

describe('promo short: ten billion snow crabs vanished (narrated)', () => {
  it('loops: everything at the loop point is where it was at the start', () => {
    for (const [name, f] of Object.entries(CURVES)) expect(f(END), name).toBeCloseTo(f(0), 3);
    for (const c of CRABS) {
      const [a, b] = [crabAt(c, END), crabAt(c, 0)];
      expect(a.body).toBeCloseTo(b.body, 3);
      expect(a.ghost).toBeCloseTo(b.ghost, 3);
      expect(a.x).toBeCloseTo(b.x, 2);
    }
  });

  it('never jumps: crabs, cards and gauges move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      for (const [name, f] of Object.entries(CURVES)) {
        // The stamp slams down (it starts big and invisible, at 1.8) and the pin drops in a few frames on purpose;
        // their cards come and go smoothly.
        const limit = name === 'stampAt' ? 1.85 : name === 'joltAt' ? 2 : name === 'pinAt' ? 0.4 : 0.25;
        expect(Math.abs(f(b) - f(a)), `${name} at ${a.toFixed(2)}`).toBeLessThan(limit);
      }
      for (const c of CRABS) {
        const [p, q] = [crabAt(c, a), crabAt(c, b)];
        expect(Math.abs(q.body - p.body)).toBeLessThan(0.25);
        expect(Math.abs(q.ghost - p.ghost)).toBeLessThan(0.25);
        expect(Math.abs(q.x - p.x)).toBeLessThan(5);
      }
    }
  });

  it('opens on the hook: a full field under "10,000,000,000 snow crabs vanished", crabs already fading to outlines, and moving', () => {
    expect(numberAt(0)).toBe(1);
    expect(vanishedAt(0)).toBe(1);
    expect(crabsShown(0)).toBeGreaterThanOrEqual(20);
    expect(outlinesShown(0)).toBeGreaterThanOrEqual(3);
    expect(captionAt(0)!.line.words.map((w) => w.text).join(' ')).toBe('TEN BILLION crabs');
    expect(captionAt(0)!.word).toBe(0);
    expect(crabAt(CRABS[0]!, FRAME).x).not.toBeCloseTo(crabAt(CRABS[0]!, 0).x, 3);
    expect(underlineAt(said('vanished.') + 0.4)).toBe(1);
  });

  it('empties the field: a few crabs each year from 2018 to 2021, the last on "disappeared"', () => {
    expect(yearAt(said('2018') + 0.05).year).toBe(2018);
    expect(yearAt(YEAR_TICKS[3]! + 0.2)).toEqual({ year: 2021, roll: 1 });
    expect(yearsAt(said('2018') + 0.1)).toBe(1);
    expect(numberAt(said('2018'))).toBe(0);
    const before = crabsShown(said('2018') - 0.05);
    const after = crabsShown(said('2021,') + 0.6);
    expect(after).toBeLessThan(before - 6);
    const hero = CRABS[HERO_INDEX]!;
    expect(crabAt(hero, said('snow') + 0.2).body).toBe(1);
    expect(crabLabelAt(said('snow') + 0.25)).toBe(1);
    expect(crabAt(hero, said('disappeared.') + 0.7).body).toBe(0);
    expect(crabAt(hero, said('disappeared.') + 0.7).ghost).toBeGreaterThan(0.5);
    expect(crabsShown(said('disappeared.') + 0.7)).toBe(0);
  });

  it('puts the Bering Sea on a map of Alaska as it is named', () => {
    expect(mapAt(said("Alaska's") + 0.1)).toBe(1);
    expect(alaskaLabelAt(said("Alaska's") - 0.1)).toBe(0);
    expect(alaskaLabelAt(said("Alaska's") + 0.4)).toBe(1);
    expect(pinAt(said('Bering') - 0.2)).toBe(0);
    expect(pinAt(said('Bering') + 0.3)).toBe(1);
    expect(seaLabelAt(said('Sea') + 0.25)).toBe(1);
    expect(mapAt(said('A') + 0.2)).toBe(0);
  });

  it('warms the water on "heatwave … warmed their icy water", melting the ice', () => {
    expect(thermoAt(said('heatwave'))).toBe(1);
    expect(heatwaveLabelAt(said('heatwave') + 0.2)).toBe(1);
    expect(heatAt(said('warmed') - 0.1)).toBeLessThan(0.2);
    expect(heatAt(said('water,') + 0.4)).toBeGreaterThan(0.85);
    expect(warmthAt(said('warm'))).toBe(1);
    expect(icyLabelAt(said('icy') + 0.2)).toBe(1);
    expect(iceAt(said('icy'))).toBe(1);
    expect(iceAt(said('warm'))).toBe(0);
    expect(iceAt(0)).toBe(1);
  });

  it('drains a warm crab\'s energy from "burn" to "starved", and it fades to an outline (nothing dead on screen)', () => {
    expect(loneAt(said('warm') - 0.2).body).toBe(0);
    expect(loneAt(said('crabs', 3) + 0.2).body).toBe(1);
    expect(barAt(said('crabs', 3) + 0.2)).toBe(1);
    expect(energyAt(said('burn') - 0.1)).toBe(1);
    expect(energyAt(said('energy,'))).toBeLessThan(0.9);
    expect(energyAt(said('starved.'))).toBeCloseTo(0, 3);
    expect(loneAt(said('starved.') + 0.6).body).toBe(0);
    expect(loneAt(said('starved.') + 0.5).ghost).toBeGreaterThan(0.5);
    expect(loneAt(said('2022,') + 0.7).ghost).toBe(0);
  });

  it('stamps the 2022 season CANCELLED on "cancelled", the payoff, then "first time EVER"', () => {
    expect(noticeAt(said('2022,'))).toBeGreaterThan(0.6);
    expect(noticeYearAt(said('2022,') + 0.5)).toBe(1);
    expect(noticeAlaskaAt(said('Alaska') - 0.1)).toBe(0);
    expect(noticeAlaskaAt(said('Alaska') + 0.4)).toBe(1);
    expect(stampAt(said('cancelled') - 0.1)).toBe(0);
    expect(stampAt(said('cancelled') + 0.05)).toBe(1);
    expect(seasonLineAt(said('season'))).toBeGreaterThan(0.6);
    expect(firstTimeAt(said('first') - 0.1)).toBe(0);
    expect(firstTimeAt(said('EVER.'))).toBe(1);
    expect(everAt(said('EVER.') + 0.4)).toBe(1);
    expect(SOUNDS.some((s) => s.id === 'caught' && Math.abs(s.t - said('cancelled')) < 0.05)).toBe(true);
    // The credit's spot (40% of the loop on) stays clear of the payoff's text, which ends at the notice's foot.
    expect(said('cancelled') / LOOP_S).toBeGreaterThan(0.4);
  });

  it('refills the field and writes the number back on "The count still says", ready for the hook', () => {
    expect(noticeAt(said('count') + 0.3)).toBe(0);
    expect(numberAt(said('count') - 0.1)).toBe(0);
    expect(numberAt(said('still'))).toBeGreaterThan(0.5);
    expect(crabsShown(said('says:'))).toBeGreaterThanOrEqual(24);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('says:');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    expect(LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO).toBeLessThan(0.5);
    expect(TEMPO).toBeGreaterThan(1.05);
    expect(TEMPO).toBeLessThan(1.15);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) expect(l.words.length).toBeLessThanOrEqual(4);
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END)).toBe(BOIL - 1);
    for (const s of [...SOUNDS, ...FADES]) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
