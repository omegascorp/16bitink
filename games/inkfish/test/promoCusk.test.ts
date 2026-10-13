import { describe, expect, it } from 'vitest';
import {
  AIM_HEAD, AIM_WATER, boilAt, BOIL_STEPS, BOTTOM_Y, BREACH_AT, cameraAt, captionAt, challengerAt, challengerNameAt, darkAt, DREDGE_TOP, dredgeAt, DROP_FROM,
  dropsAt, eyeLabelAt, fishAt, fishY, foundAt, glowAt, HANG, HAULED_AT, inNet, investigatorNameAt, lampAimAt, lampAt, LAND_AT, lensAt, LINES, LOOK_AT,
  LOOP_S, metresAt, mouthArrowAt, mouthLabelAt, netAt, NET_DROP_FROM, NET_ENTRY_AT, questionAt, readoutAt, REALISED_AT, rulerAt, said, sectionAt, SEVENTIES_AT,
  seventiesAt, skinLabelAt, SOUNDS, SPLASHES, yearAt, zoomAt,
} from '../dev/promo/cusk/story';
import { TEMPO, WORDS } from '../dev/promo/cusk/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;

/** Where a world point is on screen, given the camera at t. */
const onScreen = (t: number, x: number, y: number): { x: number; y: number } => {
  const c = cameraAt(t);
  return { x: 540 + (x - c.x) * c.zoom, y: 960 + (y - c.y) * c.zoom };
};

describe('promo short: this fish has no face (narrated)', () => {
  it('loops: the fish, the net, the camera, the lamp and every note are where they began', () => {
    const [a, b] = [fishAt(END), fishAt(0)];
    for (const key of ['x', 'y', 'tilt', 'effort'] as const) expect(a[key]).toBeCloseTo(b[key], 3);
    expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 3);
    const [n, m] = [netAt(END), netAt(0)];
    for (const key of ['x', 'y', 'angle'] as const) expect(n[key]).toBeCloseTo(m[key], 3);
    const [p, q] = [cameraAt(END), cameraAt(0)];
    for (const key of ['x', 'y', 'zoom'] as const) expect(p[key]).toBeCloseTo(q[key], 3);
    expect(lampAimAt(END)).toBeCloseTo(lampAimAt(0), 4);
    expect(inNet(END)).toBe(inNet(0));
    const fades = [
      darkAt, glowAt, lampAt, challengerAt, questionAt, readoutAt, eyeLabelAt, skinLabelAt, mouthLabelAt, mouthArrowAt, challengerNameAt, seventiesAt,
      investigatorNameAt, yearAt, foundAt, rulerAt, sectionAt,
    ];
    for (const f of fades) expect(f(END)).toBeCloseTo(f(0), 3);
    const [l, k] = [lensAt(END), lensAt(0)];
    expect(l.alpha).toBeCloseTo(k.alpha, 4);
    // The drips carry on across the loop point.
    const [d0, d1] = [dropsAt(END), dropsAt(0)];
    expect(d0.length).toBe(d1.length);
    d0.forEach((d, i) => {
      expect(d.x).toBeCloseTo(d1[i]!.x, 1);
      expect(d.y).toBeCloseTo(d1[i]!.y, 0);
    });
  });

  it('never jumps: the fish, the net and the camera move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [t0, t1] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      const [f0, f1] = [fishAt(t0), fishAt(t1)];
      // On screen, the fish never leaps (the camera follows it).
      const [s0, s1] = [onScreen(t0, f0.x, f0.y), onScreen(t1, f1.x, f1.y)];
      expect(Math.hypot(s1.x - s0.x, s1.y - s0.y)).toBeLessThan(60);
      expect(Math.abs(f1.tilt - f0.tilt)).toBeLessThan(0.12);
      // In the world, nothing moves faster than a quick haul.
      expect(Math.abs(f1.y - f0.y)).toBeLessThan(70);
      // The empty net plunges 4 km in under a second, seen from far off: fast, but never a leap on screen.
      if (t0 >= NET_DROP_FROM) {
        const [n0, n1] = [netAt(t0), netAt(t1)];
        const [m0, m1] = [onScreen(t0, n0.x, n0.y), onScreen(t1, n1.x, n1.y)];
        expect(Math.hypot(m1.x - m0.x, m1.y - m0.y)).toBeLessThan(60);
      }
      const [c0, c1] = [cameraAt(t0), cameraAt(t1)];
      expect(Math.abs(Math.log(c1.zoom / c0.zoom))).toBeLessThan(0.1);
      expect(Math.abs(lampAimAt(t1) - lampAimAt(t0))).toBeLessThan(0.08);
    }
  });

  it('opens on its blank face under the lamp: in the net, wriggling, the "?" on, the lamp on its head', () => {
    const f = fishAt(0);
    expect(inNet(0)).toBe(true);
    expect(f.y).toBeCloseTo(-HANG, 0);
    expect(f.effort).toBeGreaterThan(0.8);
    expect(questionAt(0)).toBe(1);
    expect(lampAimAt(0)).toBeCloseTo(AIM_HEAD, 4);
    expect(lampAt(0)).toBe(1);
    expect(zoomAt(0)).toBeGreaterThan(2);
  });

  it('dives home on "The faceless cusk lives four kilometres down", and the dark closes in on "no light at all"', () => {
    expect(DROP_FROM).toBeLessThan(said('faceless'));
    expect(inNet(said('cusk'))).toBe(false);
    expect(questionAt(said('faceless'))).toBe(0);
    expect(fishY(said('four')).at).toBeGreaterThan(0);
    expect(readoutAt(said('kilometres'))).toBe(1);
    expect(LAND_AT).toBeGreaterThan(said('down,'));
    expect(LAND_AT).toBeLessThan(said('where'));
    expect(metresAt(LAND_AT)).toBe(4000);
    expect(darkAt(said('all.') + 0.3)).toBeGreaterThan(0.85);
    expect(darkAt(0)).toBeLessThan(0.5);
  });

  it('finds the tiny eyes under the skin with the X-ray, then the mouth underneath', () => {
    const eyes = lensAt(said('eyes') + 0.2);
    expect(eyes.alpha).toBe(1);
    expect(eyes.xray).toBe(1);
    expect(eyeLabelAt(said('eyes') + 0.3)).toBe(1);
    expect(skinLabelAt(said('under') + 0.3)).toBe(1);
    expect(skinLabelAt(said('buried'))).toBe(0);
    const mouth = lensAt(said('tucked'));
    expect(mouth.slide).toBe(1);
    expect(mouth.xray).toBe(0);
    expect(mouthLabelAt(said('mouth') + 0.3)).toBe(1);
    expect(mouthArrowAt(said('underneath.'))).toBe(1);
    // Nose up to show its chin on "underneath".
    expect(fishAt(said('underneath.') + 0.2).tilt).toBeGreaterThan(0.4);
    expect(fishAt(said('eyes')).tilt).toBeCloseTo(0, 5);
  });

  it('shows the whole 4 km with HMS Challenger on "the 1870s", her dredge down to the fish', () => {
    expect(sectionAt(SEVENTIES_AT)).toBe(1);
    expect(challengerAt(SEVENTIES_AT)).toBe(1);
    expect(seventiesAt(SEVENTIES_AT + 0.25)).toBe(1);
    expect(seventiesAt(SEVENTIES_AT - 0.1)).toBe(0);
    expect(foundAt(SEVENTIES_AT)).toBe(1);
    expect(rulerAt(SEVENTIES_AT)).toBe(1);
    const dredge = dredgeAt(SEVENTIES_AT)!;
    expect(dredge.y).toBeGreaterThan(BOTTOM_Y);
    expect(dredge.x).toBeGreaterThan(DREDGE_TOP.x);
    // Challenger is swapped in while the camera is too deep to see the surface.
    const swap = 10.62;
    expect(challengerAt(swap - 0.1)).toBe(0);
    expect(challengerAt(swap + 0.1)).toBe(1);
    expect(onScreen(swap, 0, 100).y).toBeLessThan(0);
  });

  it('hands over to RV Investigator on "Australian", whose net hauls it up on "hauled" and breaks the surface on "2017"', () => {
    expect(challengerAt(said('Australian') + 0.5)).toBe(0);
    expect(investigatorNameAt(said('Australian') + 0.35)).toBe(1);
    expect(NET_ENTRY_AT).toBeGreaterThan(said('Australian'));
    expect(netAt(HAULED_AT - 0.02).y).toBeCloseTo(BOTTOM_Y, 0);
    expect(inNet(HAULED_AT)).toBe(true);
    expect(fishY(said('up')).rate).toBeLessThan(-500);
    expect(BREACH_AT).toBeGreaterThan(said('2017,'));
    expect(BREACH_AT).toBeLessThan(said('they'));
    expect(yearAt(said('2017,') + 0.25)).toBe(1);
    expect(yearAt(said('2017,') - 0.05)).toBe(0);
    expect(SPLASHES.map((s) => s.at)).toContain(BREACH_AT);
  });

  it('swings the lamp onto its head on "look", and the "?" pops back on "realised"', () => {
    expect(lampAimAt(LOOK_AT - 0.15)).toBeCloseTo(AIM_WATER, 4);
    expect(Math.abs(lampAimAt(said('and', 2)) - AIM_HEAD)).toBeLessThan(0.12);
    expect(questionAt(REALISED_AT - 0.05)).toBe(0);
    expect(questionAt(REALISED_AT + 0.25)).toBe(1);
    expect(fishAt(said('realised:')).y).toBeCloseTo(-HANG, 0);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('realised:');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
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
