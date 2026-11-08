import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { QUIET_LIFT, QUIET_LINE, RAMP_S, VOICE_GAIN, VOICE_RIDE, voiceGainAt } from '../dev/promo/leatherback/audio';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/leatherback/script';
import {
  ALARM, ALL_AT, BIGGEST_AT, boilAt, BOIL_STEPS, BUT_AT, camDepthAt, counterAt, countAt, CUTE_AT, DAY_AT, diverAt, DOWN_AT, EATS_AT, FACE_AT, flareAt, flashAt,
  FOCAL, frontTurnAt, gapeAt, gradeAt, GULPS, IN_AT, jellyAlarmAt, jellyAt, jellySweatAt, JELLYFISH2_AT, LOOP_S, ONCE_AT, OUT_AT, perDayAt, PULL, said, sceneAt,
  SECTION_IN, sectionScrollAt, shakeAt, sideMouthAt, sideZoomAt, sizeLabelAt, sizePopAt, spikeGlintAt, SPIKES_AT, sweepAt, sweepFadeAt, THOUSAND_AT, TRIES,
  TURN, turtleAt, UP_AT, wrap,
} from '../dev/promo/leatherback/story';
import { TEMPO, WORDS } from '../dev/promo/leatherback/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
/** The head-on face's scale at camera depth camD (Infinity once the camera is past the lips). */
const faceScale = (camD: number): number => (camD < 0 ? FOCAL / -camD : Infinity);

describe("promo short: this turtle's mouth is a nightmare (narrated)", () => {
  it('loops: the camera, the jaws, the turn, the scenes, the jellyfish, the counter, the labels and the moods are where they started', () => {
    expect(camDepthAt(END)).toBeCloseTo(camDepthAt(0), 4);
    expect(gapeAt(END)).toBeCloseTo(gapeAt(0), 4);
    expect(frontTurnAt(END)).toBeCloseTo(frontTurnAt(0), 6);
    expect(sceneAt(END)).toEqual(sceneAt(0));
    expect(sceneAt(0)).toEqual({ front: 1, section: 0, side: 0 });
    expect(jellyAt(END)).toBeNull();
    expect(jellyAt(0)).toBeNull();
    for (const f of [counterAt, perDayAt, sizeLabelAt, sizePopAt, diverAt, sideMouthAt, spikeGlintAt, flashAt, jellyAlarmAt, jellySweatAt]) expect(f(END)).toBeCloseTo(f(0), 5);
    expect(countAt(END) * counterAt(END)).toBeCloseTo(countAt(0) * counterAt(0), 5);
    expect(sweepAt(END) * sweepFadeAt(END)).toBeCloseTo(sweepAt(0) * sweepFadeAt(0), 5);
    for (const y of [0, 500, 1000, 1900]) expect(flareAt(END, y)).toBeCloseTo(flareAt(0, y), 5);
    const [g1, g2] = [gradeAt(END), gradeAt(0)];
    for (const key of Object.keys(g1) as (keyof typeof g1)[]) expect(g1[key]).toBeCloseTo(g2[key], 4);
    expect(shakeAt(END).x).toBeCloseTo(shakeAt(0).x, 6);
    expect(shakeAt(END).y).toBeCloseTo(shakeAt(0).y, 6);
    // The camera is still creeping in at the same pace either side of the seam.
    const pace = (t: number): number => (camDepthAt(t + 0.01) - camDepthAt(t - 0.01)) / 0.02;
    expect(pace(LOOP_S - 0.02)).toBeCloseTo(pace(0.02), 1);
    expect(pace(0.5)).toBeGreaterThan(0);
  });

  it('never jumps: the camera, the turtle, the jellyfish, the counter and the moods move on smoothly, frame to frame and across the loop point', () => {
    for (const t of FRAMES) {
      const u = t + FRAME;
      const [a, b] = [sceneAt(t), sceneAt(u)];
      // Head-on: the face's scale changes smoothly (once past the lips only the throat shows, still smoothly).
      if (a.front > 0 && b.front > 0) {
        const [d0, d1] = [camDepthAt(t), camDepthAt(u)];
        if (d0 < -0.5 && d1 < -0.5) expect(Math.abs(Math.log(faceScale(d1) / faceScale(d0)))).toBeLessThan(0.12);
        else expect(Math.abs(d1 - d0)).toBeLessThan(0.12);
        expect(Math.abs(gapeAt(u) - gapeAt(t))).toBeLessThan(0.15);
        expect(Math.abs(frontTurnAt(u) - frontTurnAt(t))).toBeLessThan(0.3);
      }
      // Side on: the turtle glides, its flippers beat, the camera pulls out smoothly.
      if (a.side > 0 && b.side > 0) {
        const [p, q] = [turtleAt(t), turtleAt(u)];
        expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(40);
        expect(Math.abs(Math.log(q.scale / p.scale))).toBeLessThan(0.05);
        expect(Math.abs(Math.cos(q.stroke - p.stroke) - 1)).toBeLessThan(0.1);
        expect(Math.abs(q.mouth - p.mouth)).toBeLessThan(0.6);
        expect(Math.abs(q.turn - p.turn)).toBeLessThan(0.3);
        expect(Math.abs(Math.log(sideZoomAt(u) / sideZoomAt(t)))).toBeLessThan(0.2);
      }
      // The cutaway's scroll, while the cutaway shows (on its own or in the pull-out's lens): it rushes down on "down!" (a swoosh), never more than 60 px a frame.
      const cut = (x: number): boolean => sceneAt(x).section > 0 || (wrap(x) >= PULL.from && wrap(x) < PULL.to + 0.4);
      if (cut(t) && cut(u)) expect(Math.abs(sectionScrollAt(u) - sectionScrollAt(t))).toBeLessThan(60);
      const [j0, j1] = [jellyAt(t), jellyAt(u)];
      if (j0 && j1) {
        expect(Math.abs(j1.y - j0.y)).toBeLessThan(130);
        expect(Math.abs(j1.x - j0.x)).toBeLessThan(10);
      }
      // The counter only ever counts up while it shows.
      if (counterAt(t) > 0 && counterAt(u) > 0) expect(countAt(u)).toBeGreaterThanOrEqual(countAt(t));
      for (const f of [counterAt, sizeLabelAt, diverAt, perDayAt]) expect(Math.abs(f(u) - f(t))).toBeLessThan(0.35);
      const [g0, g1] = [gradeAt(t), gradeAt(u)];
      for (const key of Object.keys(g0) as (keyof typeof g0)[]) expect(Math.abs(g1[key] - g0[key])).toBeLessThan(0.25);
    }
  });

  it('opens head-on into the wide-open mouth, a little above the middle, with nothing written but the words', () => {
    expect(sceneAt(0).front).toBe(1);
    expect(gapeAt(0)).toBeGreaterThan(0.95);
    expect(frontTurnAt(0)).toBe(1);
    // The mouth (780 px wide at scale 1) fills 55–65% of the frame's width.
    const mouthW = 780 * faceScale(camDepthAt(0));
    expect(mouthW / 1080).toBeGreaterThan(0.55);
    expect(mouthW / 1080).toBeLessThan(0.65);
    expect(FACE_AT.y).toBeLessThan(960);
    for (const f of [sizeLabelAt, counterAt, perDayAt, jellyAlarmAt, flashAt]) expect(f(0)).toBe(0);
    expect(sweepAt(0) * sweepFadeAt(0)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
  });

  it('dives down the throat on "Its throat is lined with spikes…", then cuts it open', () => {
    expect(camDepthAt(SPIKES_AT)).toBeGreaterThan(camDepthAt(0) + 1);
    expect(camDepthAt(SECTION_IN.from)).toBeGreaterThan(0);
    expect(sceneAt(SECTION_IN.to + 0.05).section).toBe(1);
    expect(sceneAt(SECTION_IN.to + 0.05).front).toBe(0);
  });

  it('flares the spines in a wave down the throat on "ALL", and sweeps the arrow down on "down!"', () => {
    const peak = (y: number): number => {
      let best = 0;
      let when = 0;
      for (let t = ALL_AT - 0.2; t < DOWN_AT + 0.6; t += 0.01) if (flareAt(t, y) > best) [best, when] = [flareAt(t, y), t];
      return when;
    };
    expect(peak(100)).toBeLessThan(peak(900));
    expect(peak(900)).toBeLessThan(peak(1700));
    expect(peak(100)).toBeGreaterThan(ALL_AT - 0.1);
    expect(sweepAt(DOWN_AT - 0.1)).toBe(0);
    expect(sweepAt(DOWN_AT + 0.35) * sweepFadeAt(DOWN_AT + 0.35)).toBeGreaterThan(0.9);
  });

  it('slides the jellyfish in, stops it twice at the spines, and lets it go down on "out."', () => {
    expect(jellyAt(ONCE_AT - 0.2)).toBeNull();
    const sit = jellyAt(IN_AT + 0.1)!;
    expect(sit.y).toBeGreaterThan(700);
    for (const h of TRIES) {
      const pushing = jellyAt(h.hit)!;
      expect(pushing.y).toBeLessThan(sit.y - 60);
      expect(jellyAt(h.hit + 0.08)!.face).toBe('squish');
      expect(jellyAlarmAt(h.hit + 0.15)).toBeGreaterThan(0.9);
      // It never gets back up past the spines.
      for (let t = h.push; t < h.hit + 0.3; t += 0.01) expect(jellyAt(t)!.y).toBeGreaterThan(pushing.y - 1);
    }
    expect(jellyAt(OUT_AT + 0.1)!.face).toBe('droop');
    expect(jellyAt(OUT_AT + 0.75)!.y).toBeGreaterThan(1920);
  });

  it('pulls out to the whole turtle beside the diver, with the weight in pounds and kilograms', () => {
    expect(sceneAt(PULL.from + 0.05).side).toBe(1);
    expect(sideZoomAt(PULL.from)).toBeGreaterThan(4);
    expect(sideZoomAt(BIGGEST_AT + 0.5)).toBeCloseTo(1, 3);
    expect(diverAt(BIGGEST_AT + 0.3)).toBe(1);
    expect(sizeLabelAt(UP_AT - 0.1)).toBe(0);
    expect(sizeLabelAt(UP_AT + 0.2)).toBe(1);
    expect(sizePopAt(THOUSAND_AT + 0.17)).toBeGreaterThan(0.9);
  });

  it('races the counter to about 260 as the jellyfish vanish into its mouth, and adds "/ day" on "DAY!"', () => {
    expect(counterAt(EATS_AT + 0.2)).toBe(1);
    expect(countAt(EATS_AT)).toBe(0);
    expect(countAt(JELLYFISH2_AT + 0.15)).toBe(260);
    expect(perDayAt(DAY_AT - 0.1)).toBe(0);
    expect(perDayAt(DAY_AT + 0.2)).toBe(1);
    for (const g of GULPS) {
      expect(g).toBeGreaterThan(EATS_AT);
      expect(g).toBeLessThan(DAY_AT + 0.3);
      expect(sideMouthAt(g)).toBeGreaterThan(0.9);
    }
    for (let i = 1; i < GULPS.length; i++) expect(GULPS[i]!).toBeGreaterThan(GULPS[i - 1]!);
  });

  it('glides in sunlight for "Cute shell, though.", then turns to camera and opens its mouth on "But"', () => {
    expect(gradeAt(CUTE_AT + 0.3).sun).toBe(1);
    expect(turtleAt(CUTE_AT + 0.3).eye).toBe('happy');
    expect(turtleAt(TURN.from).turn).toBe(1);
    expect(turtleAt(TURN.mid).turn).toBe(0);
    expect(sceneAt(TURN.mid + 0.01).front).toBe(1);
    expect(frontTurnAt(TURN.to)).toBe(1);
    expect(gapeAt(TURN.to)).toBeLessThan(0.3);
    expect(gapeAt(BUT_AT + 0.62)).toBeGreaterThan(0.95);
    expect(faceScale(camDepthAt(TURN.mid))).toBeLessThan(0.4);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('But');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.8);
    expect(said('But')).toBe(BUT_AT);
  });

  it('captions every spoken word, in lines of at most four words and 18 letters, the spoken word highlighted', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      if (l.words.length > 1) expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(18);
    }
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(0)!.line).toBe(LINES[0]);
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
  });

  it('keeps every piece of text between y 270 and 1240', () => {
    // Caveat's capitals and ascenders reach about 0.8 of the size above the baseline, descenders about 0.3 below.
    const inside = (y: number, size: number): void => {
      expect(y - 0.8 * size).toBeGreaterThanOrEqual(270);
      expect(y + 0.3 * size).toBeLessThanOrEqual(1240);
    };
    for (const line of Object.values(TEXT)) inside(line.y, line.size * line.pop);
    for (let t = 0; t < LOOP_S; t += FRAME) {
      const j = jellyAt(t);
      if (j && jellyAlarmAt(t) > 0) inside(j.y - ALARM.above, ALARM.size * ALARM.pop);
    }
  });

  it('lifts the voice by about 4.5 dB over "Cute shell, though.", ramping in and out over 40 ms', () => {
    const cute = WORDS.find((w) => w.text === 'Cute')!;
    const though = WORDS.find((w) => w.text === 'though.')!;
    expect(QUIET_LINE.from).toBeCloseTo(cute.start / TEMPO, 6);
    expect(QUIET_LINE.to).toBeCloseTo(though.end / TEMPO, 6);
    expect(20 * Math.log10(QUIET_LIFT)).toBeCloseTo(4.5, 3);
    expect(RAMP_S).toBeCloseTo(0.04, 6);
    for (let t = QUIET_LINE.from; t <= QUIET_LINE.to; t += 0.02) expect(voiceGainAt(t)).toBeCloseTo(VOICE_GAIN * QUIET_LIFT, 6);
    for (const t of [0, 5, QUIET_LINE.from - RAMP_S - 0.01, QUIET_LINE.to + RAMP_S + 0.01, 17.5]) expect(voiceGainAt(t)).toBeCloseTo(VOICE_GAIN, 6);
    for (let i = 1; i < VOICE_RIDE.length; i++) expect(VOICE_RIDE[i]![0]).toBeGreaterThan(VOICE_RIDE[i - 1]![0]);
  });

  it('shows the credit around the middle, never in the hook or at the seam', () => {
    expect(creditAt(10, LOOP_S)).toBeGreaterThan(0);
    expect(creditAt(END, LOOP_S)).toBe(0);
    expect(creditAt(3, LOOP_S)).toBe(0);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    expect(wrap(LOOP_S)).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
