import { describe, expect, it } from 'vitest';
import { captionAt, LINES, SOUNDS, SYNTHS } from '../dev/promo/titan/cues';
import { bubblesOn, dropsAt, motesAt, ringsAt } from '../dev/promo/titan/field';
import {
  AND_AT, BEATS, boilAt, BOIL_STEPS, bubblesAt, coatAt, COAT_AT, coldAt, CUT_AT, DEGREES_AT, degreesAt, dreadAt, flatAt, FLY_AT, flyBurstAt, flyerAt,
  FOUR_AT, fourAt, FREEZE_AT, frostAt, GAS_AT, hazeAt, horizonAt, insetAt, LAKE_AT, liftAt, LOOP_S, MINUS_AT, nadirAt, OFF_AT, ONE_AT, phaseAt, poofAt,
  POOF_AT, reliefAt, said, SATURN_AT, shiverAt, shockMarkAt, shoreAt, SO_AT, STRAP_AT, STROKES, thickAt, TITAN_AT, TODDLER_AT, toddlerAt, washAt,
  weightAt, WEIGH_AT, WINGS_AT, wingAt, wrap,
} from '../dev/promo/titan/story';
import { TEMPO, WORDS } from '../dev/promo/titan/words';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
/** A frame step that crosses the one cut (to the shore on "Strap"). */
const crossesCut = (t: number): boolean => wrap(t) < CUT_AT && wrap(t + FRAME) >= CUT_AT;

const SMOOTH = [horizonAt, nadirAt, hazeAt, thickAt, flatAt, washAt, coldAt, frostAt, dreadAt, liftAt, reliefAt, shiverAt, bubblesAt];
const NOTES = [insetAt, fourAt, weightAt, toddlerAt, degreesAt, shockMarkAt];

describe('promo short: you could fly on Titan (narrated)', () => {
  it('is 21 s, a multiple of 1.5 s (whole video frames and line-boil cycles)', () => {
    expect(LOOP_S).toBe(21);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect(BOIL_STEPS % 3).toBe(0);
    expect(boilAt(END)).toBe(boilAt(LOOP_S - FRAME));
    // The voice ends before the loop point.
    expect(WORDS[WORDS.length - 1]!.end / TEMPO).toBeLessThan(LOOP_S);
  });

  it('loops: the prospector, its wings, the camera and every mood are where they started', () => {
    const [a, b] = [flyerAt(END), flyerAt(0)];
    for (const key of ['x', 'y', 'tilt', 'near', 'far'] as const) expect(a[key]).toBeCloseTo(b[key], 3);
    expect(a.legs).toBe(b.legs);
    expect(a.face).toBe(b.face);
    const dp = (((phaseAt(END) - phaseAt(0)) % 1) + 1.5) % 1 - 0.5;
    expect(Math.abs(dp)).toBeLessThan(1e-4);
    for (const f of [...SMOOTH, ...NOTES]) expect(f(END)).toBeCloseTo(f(0), 3);
    expect(coatAt(END).show).toBe(coatAt(0).show);
    expect(shoreAt(END)).toBe(shoreAt(0));
    // The coat's puff is over before the loop point.
    expect(poofAt(END)).toBeGreaterThan(1);
    // Rings, spray and motes carry straight on across the seam.
    expect(ringsAt(END).length).toBe(ringsAt(0).length);
    expect(dropsAt(END).length).toBe(dropsAt(0).length);
    ringsAt(END).forEach((r, i) => expect(Math.hypot(r.x - ringsAt(0)[i]!.x, r.rx - ringsAt(0)[i]!.rx)).toBeLessThan(1));
    motesAt(END).forEach((m, i) => {
      const n = motesAt(0)[i]!;
      // A mote may wrap round an edge, off screen.
      if (m.x > 0 && m.x < 1060 && m.y > 0 && m.y < 1910) expect(Math.hypot(m.x - n.x, m.y - n.y)).toBeLessThan(1);
    });
  });

  it('never jumps, except at the cut to the shore', () => {
    let cuts = 0;
    for (const t of FRAMES) {
      if (crossesCut(t)) {
        cuts++;
        continue;
      }
      const [f, g] = [flyerAt(t), flyerAt(t + FRAME)];
      expect(Math.hypot(g.x - f.x, g.y - f.y)).toBeLessThan(40);
      expect(Math.abs(g.tilt - f.tilt)).toBeLessThan(0.08);
      // Flapping hard is fast, but under 45° a frame.
      expect(Math.abs(g.near - f.near)).toBeLessThan(0.78);
      expect(Math.abs(horizonAt(t + FRAME) - horizonAt(t))).toBeLessThan(160);
      expect(Math.abs(nadirAt(t + FRAME) - nadirAt(t))).toBeLessThan(40);
      expect(Math.abs(hazeAt(t + FRAME) - hazeAt(t))).toBeLessThan(40);
      for (const fn of [thickAt, coldAt, frostAt, dreadAt, washAt]) expect(Math.abs(fn(t + FRAME) - fn(t))).toBeLessThan(0.2);
    }
    expect(cuts).toBe(1);
  });

  it('opens on the flight: mid-downstroke just over the dark lake, spray and rings under it, no notes or labels', () => {
    const f = flyerAt(0);
    expect(f.legs).toBe('fly');
    expect(f.face).toBe('calm');
    // On its way down: the wings sweeping.
    expect(wingAt(FRAME)).toBeLessThan(wingAt(0));
    expect(phaseAt(0) % 1).toBeCloseTo(0, 6);
    // Big in the middle of the frame, above the lake's horizon.
    expect(Math.abs(f.x - 540)).toBeLessThan(120);
    expect(f.y).toBeLessThan(horizonAt(0) - 200);
    expect(shoreAt(0)).toBe(false);
    expect(washAt(0)).toBe(1);
    expect(ringsAt(0).length).toBeGreaterThan(0);
    expect(dropsAt(0).length).toBeGreaterThan(0);
    for (const n of NOTES) expect(n(0)).toBe(0);
    expect(coatAt(0).show).toBe(0);
    expect(coldAt(0)).toBe(0);
    expect(frostAt(0)).toBe(0);
    expect(flyBurstAt(0)).toBeLessThan(0);
    // The hook's two rows are up from the first frame.
    expect(captionAt(0)!.line.rows.flat().map((w) => w.text).join(' ')).toBe('On Saturn\'s moon Titan, you could FLY…');
  });

  it('captions every word once, in order, each line on screen while its words are said', () => {
    expect(LINES.flatMap((l) => l.rows.flat())).toEqual(WORDS);
    expect(LINES[0]!.from).toBe(0);
    expect(LINES[LINES.length - 1]!.to).toBe(LOOP_S);
    LINES.forEach((l, i) => {
      if (i > 0) expect(l.from).toBe(LINES[i - 1]!.to);
      for (const w of l.rows.flat()) {
        expect(w.start / TEMPO).toBeGreaterThanOrEqual(l.from);
        expect(w.start / TEMPO).toBeLessThan(l.to);
      }
      for (const row of l.rows) expect(row.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(28);
    });
    WORDS.forEach((w, i) => {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.rows.flat()[now.word]).toBe(WORDS[i]);
    });
  });

  it('beat 1 (thrill): the moon inset on "Saturn\'s moon Titan", a big stroke and a burst on "FLY"', () => {
    expect(SATURN_AT).toBeCloseTo(said(1), 6);
    expect(insetAt(SATURN_AT - 0.1)).toBe(0);
    expect(insetAt(TITAN_AT)).toBe(1);
    expect(insetAt(FLY_AT + 0.5)).toBe(0);
    expect(flyBurstAt(FLY_AT + 0.2)).toBeGreaterThan(0);
    expect(liftAt(FLY_AT + 0.4)).toBe(1);
    expect(flyerAt(FLY_AT + 0.7).y).toBeLessThan(flyerAt(FLY_AT - 0.3).y);
  });

  it('beat 2 (mischief): on the shore from "Strap", wings flaring on "wings", hopping, and off on "you\'re off!"', () => {
    expect(CUT_AT).toBe(STRAP_AT);
    expect(shoreAt(STRAP_AT + 0.05)).toBe(true);
    expect(flyerAt(STRAP_AT + 0.1).legs).toBe('stand');
    expect(wingAt(WINGS_AT + 0.4)).toBeGreaterThan(wingAt(WINGS_AT - 0.2) + 0.3);
    const stand = flyerAt(STRAP_AT + 0.1).y;
    const hops = FRAMES.filter((t) => t > said(16) && t < OFF_AT).map((t) => flyerAt(t).y);
    expect(Math.min(...hops)).toBeLessThan(stand - 20);
    expect(flyerAt(OFF_AT + 1).y).toBeLessThan(stand - 150);
    expect(liftAt(OFF_AT + 0.3)).toBe(1);
  });

  it('beat 3 (curious awe): the haze thickens on "air" and "THICKER", "4×", "≈ 10 kg" and a toddler', () => {
    expect(thickAt(said(26) + 0.4)).toBeGreaterThan(thickAt(0) * 2.5);
    expect(fourAt(FOUR_AT + 0.3)).toBe(1);
    expect(fourAt(FOUR_AT - 0.1)).toBe(0);
    expect(weightAt(WEIGH_AT + 0.3)).toBe(1);
    expect(toddlerAt(TODDLER_AT + 0.2)).toBe(1);
    expect(toddlerAt(TODDLER_AT - 0.2)).toBe(0);
    // It moves aside for the toddler.
    expect(flyerAt(TODDLER_AT).x).toBeLessThan(520);
  });

  it('beat 4 (nervous): cold from "One catch", frost and a shiver from "it\'s", "−180 °C" on "minus"', () => {
    expect(coldAt(ONE_AT)).toBe(0);
    expect(coldAt(DEGREES_AT)).toBe(1);
    expect(frostAt(DEGREES_AT + 0.6)).toBe(1);
    expect(shiverAt(MINUS_AT + 0.5)).toBe(1);
    expect(degreesAt(MINUS_AT - 0.1)).toBe(0);
    expect(degreesAt(MINUS_AT + 0.3)).toBe(1);
  });

  it('beat 5 (shock): the lake swings into view on "lake", it freezes mid-flap wide-eyed, bubbles on "GAS!", and it drops', () => {
    expect(horizonAt(AND_AT)).toBeGreaterThan(1920);
    expect(horizonAt(LAKE_AT + 0.45)).toBeLessThan(700);
    expect(dreadAt(LAKE_AT + 0.5)).toBe(1);
    expect(flyerAt(FREEZE_AT + 0.05).face).toBe('shock');
    // Frozen with the tips up until "So".
    expect(phaseAt(FREEZE_AT) % 1).toBeCloseTo(0.75, 6);
    expect(phaseAt(GAS_AT)).toBeCloseTo(phaseAt(FREEZE_AT), 6);
    expect(shiverAt(FREEZE_AT + 0.1)).toBe(0);
    expect(bubblesAt(GAS_AT)).toBe(1);
    expect(bubblesOn(GAS_AT).length).toBeGreaterThan(10);
    expect(flyerAt(SO_AT).y).toBeGreaterThan(flyerAt(GAS_AT).y + 120);
  });

  it('beat 6 (relief): flapping again from "So", the coat pops on on "coat" and puffs away before the loop', () => {
    expect(phaseAt(SO_AT + 0.4)).toBeGreaterThan(phaseAt(GAS_AT) + 0.3);
    expect(flyerAt(SO_AT + 0.4).face).toBe('calm');
    expect(coatAt(COAT_AT - 0.1).show).toBe(0);
    expect(coatAt(COAT_AT + 0.1).show).toBe(1);
    expect(coatAt(POOF_AT + 0.01).show).toBe(0);
    expect(POOF_AT).toBeGreaterThan(said(60));
    expect(coldAt(COAT_AT + 0.8)).toBe(0);
    expect(frostAt(COAT_AT + 0.7)).toBe(0);
    expect(reliefAt(COAT_AT + 0.4)).toBe(1);
  });

  it('times every sound inside the mix, a whoosh for each wingbeat and a splash for low strokes', () => {
    for (const c of [...SOUNDS, ...SYNTHS]) {
      expect(c.t).toBeGreaterThanOrEqual(0);
      expect(c.t).toBeLessThan(LOOP_S + 1);
    }
    expect(BEATS.length).toBeGreaterThan(25);
    expect(SYNTHS.filter((c) => c.kind === 'noise' && c.filter === 'bandpass' && c.from === 320)).toHaveLength(BEATS.length);
    expect(STROKES.filter((s) => washAt(s.t) > 0.5).length).toBeGreaterThan(4);
    // A sound on each mood change.
    for (const at of [FLY_AT, OFF_AT, said(22), ONE_AT, said(40), LAKE_AT, GAS_AT, COAT_AT]) {
      expect([...SOUNDS, ...SYNTHS].some((c) => Math.abs(c.t - at) < 0.3)).toBe(true);
    }
  });
});
