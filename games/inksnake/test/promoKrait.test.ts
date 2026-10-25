import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { SPOKEN } from '../dev/promo/captions';
import { boilAt } from '../dev/promo/sprites';
import { biteAt, crackCamera, crackKrait } from '../dev/promo/krait/crack';
import {
  breathAt, CAY_T, cayCamera, cayKrait, cayP, headInCrack, HOOK, hookCamera, hookDark, hookKrait, hookP, LENGTH, onLand,
} from '../dev/promo/krait/moves';
import {
  asleepFor, breathShown, captionAt, clockTurns, hoursLabel, kraitLabel, LINES, SOUNDS, TEXT, venomLabel,
} from '../dev/promo/krait/script';
import { LONG_EEL_SPAN } from '../dev/promo/krait/eel';
import { EEL_SCALE, headOn, type Camera, type KraitPose } from '../dev/promo/krait/snake';
import {
  BACK_FROM, BANDED_AT, BITE_AT, CRACK_FROM, EEL_AT, gradeAt, HIDING_AT, HOLD_AT, hookClock, LOOP_S, OUT_FROM, REEF_AT, sceneAt, SLEEP_AT, TWO_AT, VENOM_AT,
  WHOLE_AT, wrap,
} from '../dev/promo/krait/story';
import { TEMPO, WORDS } from '../dev/promo/krait/words';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);

/** The krait and the camera at t, whichever set is on screen. */
function shotAt(t: number): { cam: Camera; krait: KraitPose } {
  const scene = sceneAt(t);
  if (scene === 'crack') return { cam: crackCamera(wrap(t)), krait: crackKrait(wrap(t)) };
  if (scene === 'cay') return { cam: cayCamera(wrap(t)), krait: cayKrait(wrap(t)) };
  return { cam: hookCamera(t), krait: hookKrait(t) };
}

/** The deliberate cuts: into the crack, back out to the reef, and back to the hook on "So yes,". */
const crossesCut = (t: number): boolean => sceneAt(t) !== sceneAt(t + FRAME);

/** The labels pop in and out over a few frames (never in one). */
const LABELS = new Set(['kraitLabel', 'venomLabel', 'hoursLabel', 'clock']);

/** Every value driven by time alone, by name. */
const TIMED: Readonly<Record<string, (t: number) => number>> = {
  hookDark, headInCrack, kraitLabel, venomLabel, hoursLabel, breathShown, asleepFor,
  // The clock's hand as seen: it is only drawn while the clock shows.
  clock: (t) => hoursLabel(t) * clockTurns(t),
  breath: (t) => breathAt(wrap(t)),
  vignette: (t) => gradeAt(t).vignette,
  tint: (t) => gradeAt(t).tintAlpha,
  sun: (t) => gradeAt(t).sun,
};

describe('promo short: this snake swallows eels whole (narrated, InkSnake)', () => {
  it('is 16.5 s, a multiple of 1.5 s, and the voice ends just before the loop point', () => {
    expect(LOOP_S).toBe(16.5);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect(boilAt(END)).toBe(boilAt(LOOP_S - FRAME));
    expect(boilAt(LOOP_S - FRAME + 1 / 8)).toBe(boilAt(0));
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('yes,');
    expect(last.end / TEMPO).toBeLessThan(LOOP_S);
    expect(LOOP_S - last.end / TEMPO).toBeLessThan(0.5);
  });

  it('loops: the clock, the camera, the krait, the eel in its jaws and every timed value are where they started', () => {
    expect(sceneAt(END)).toBe('hook');
    expect(sceneAt(0)).toBe('hook');
    expect(hookClock(END)).toBeCloseTo(hookClock(0), 5);
    const [c1, c2] = [hookCamera(END), hookCamera(0)];
    for (const key of ['x', 'y', 'zoom'] as const) expect(c1[key]).toBeCloseTo(c2[key], 4);
    const [k1, k2] = [hookKrait(END), hookKrait(0)];
    expect(k1.headS).toBeCloseTo(k2.headS, 4);
    expect(k1.head).toBe(k2.head);
    expect(k1.yaw ?? 0).toBeCloseTo(k2.yaw ?? 0, 4);
    expect(k1.lunge ?? 0).toBeCloseTo(k2.lunge ?? 0, 4);
    expect(k1.tongue ?? 0).toBeCloseTo(k2.tongue ?? 0, 4);
    expect(k1.gulp && k2.gulp).toBeTruthy();
    expect(k1.gulp!.p).toBeCloseTo(k2.gulp!.p, 4);
    expect(k1.gulp!.sway).toBeCloseTo(k2.gulp!.sway, 4);
    expect(k1.gulp!.pose).toBe(k2.gulp!.pose);
    expect(k1.bulges.length).toBe(k2.bulges.length);
    k1.bulges.forEach((b, i) => {
      for (const key of ['from', 'to', 'amp'] as const) expect(b[key]).toBeCloseTo(k2.bulges[i]![key], 3);
    });
    for (const [name, f] of Object.entries(TIMED)) expect(f(END), name).toBeCloseTo(f(0), 4);
    expect(gradeAt(END).tint).toBe(gradeAt(0).tint);
    expect(captionAt(END)?.line).toBe(LINES[LINES.length - 1]);
    expect(captionAt(0)?.line).toBe(LINES[0]);
    expect(creditAt(END, LOOP_S)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
  });

  it('never jumps: the camera, the krait and the eel move on smoothly, frame to frame and across the loop point (cutting only at its three cuts)', () => {
    for (const t of FRAMES) {
      if (crossesCut(t)) continue;
      const [p, q] = [shotAt(t), shotAt(t + FRAME)];
      expect(Math.abs(Math.log(q.cam.zoom / p.cam.zoom)), `zoom at ${t}`).toBeLessThan(0.1);
      // The camera jolts for 0.4 s on the bite.
      const jolt = wrap(t) >= BITE_AT - FRAME && wrap(t) < BITE_AT + 0.4;
      expect(dist(p.cam, q.cam) * p.cam.zoom, `camera at ${t}`).toBeLessThan(jolt ? 110 : 70);
      const [h1, h2] = [headOn(p.cam, p.krait), headOn(q.cam, q.krait)];
            // The two strikes (in the crack on "bite", and at the next moray before frame 1) cover the gap in about three frames.
      const striking = Math.abs(wrap(t) - BITE_AT) < 0.15 || Math.abs(hookClock(t) - HOOK.strike) < 0.15;
      expect(dist(h1.at, h2.at), `head at ${t}`).toBeLessThan(striking ? 160 : 110);
      expect(Math.abs(Math.atan2(Math.sin(h2.angle - h1.angle), Math.cos(h2.angle - h1.angle))), `turn at ${t}`).toBeLessThan(0.25);
      // The eel slides into the jaws (screen px a frame).
      if (p.krait.gulp && q.krait.gulp) expect(Math.abs(q.krait.gulp.p - p.krait.gulp.p) * LONG_EEL_SPAN * EEL_SCALE * p.cam.zoom, `swallow at ${t}`).toBeLessThan(60);
      for (const [name, f] of Object.entries(TIMED)) expect(Math.abs(f(t + FRAME) - f(t)), `${name} at ${t}`).toBeLessThan((LABELS.has(name) ? 0.5 : name === 'clock' ? 0.12 : 0.25));
    }
  });

  it('opens on the gaping jaws round a moray, about half of it still sticking out, with nothing written but the words', () => {
    const k = hookKrait(0);
    expect(k.head).toBe('open');
    expect(k.gulp!.p).toBeGreaterThan(0.35);
    expect(k.gulp!.p).toBeLessThan(0.65);
    const cam = hookCamera(0);
    const head = headOn(cam, k);
    // A close-up: the head in the upper middle, the krait's body wider than 150 px.
    expect(Math.abs(head.at.x - 540)).toBeLessThan(120);
    expect(head.at.y).toBeGreaterThan(700);
    expect(head.at.y).toBeLessThan(1050);
    expect(k.width * cam.zoom).toBeGreaterThan(150);
    for (const f of [kraitLabel, venomLabel, hoursLabel, breathShown, hookDark]) expect(f(0)).toBe(0);
  });

  it('swallows the moray in the hook, the tail gone just after "WHOLE!", then glides off to the crack and goes in by "reef…"', () => {
    expect(hookP(WHOLE_AT - 0.2)).toBeLessThan(1);
    expect(HOOK.gone).toBeGreaterThan(WHOLE_AT);
    expect(HOOK.gone).toBeLessThan(WHOLE_AT + 0.5);
    expect(hookKrait(HOOK.gone + 0.05).gulp).toBeUndefined();
    expect(kraitLabel(BANDED_AT + 0.3)).toBe(1);
    expect(headInCrack(REEF_AT + 0.2)).toBeGreaterThan(0.5);
    expect(hookDark(CRACK_FROM - 0.02)).toBeGreaterThan(0.9);
  });

  it('shows the eyes in the dark on "hiding", strikes on "bite", "venom" on "venom", and swallows the eel by "eel!"', () => {
    expect(sceneAt(HIDING_AT)).toBe('crack');
    expect(crackKrait(BITE_AT - 0.2).head).toBe('shut');
    expect(crackKrait(BITE_AT + 0.05).head).toBe('strike');
    expect(venomLabel(VENOM_AT + 0.2)).toBe(1);
    expect(sceneAt(OUT_FROM + 0.01)).toBe('cay');
    expect(cayP(OUT_FROM)).toBeGreaterThan(0);
    expect(CAY_T.gone).toBeLessThan(EEL_AT + 0.3);
    expect(cayKrait(EEL_AT + 0.35).gulp).toBeUndefined();
    expect(cayKrait(EEL_AT + 0.35).head).toBe('shut');
  });

  it('holds its breath (the meter running low, "up to 2 hours", two turns of the clock), then refills it on the cay and sleeps', () => {
    expect(breathShown(HOLD_AT)).toBe(1);
    expect(breathAt(CAY_T.shore - 0.05)).toBeLessThan(0.3);
    expect(breathAt(CAY_T.shore + 1.3)).toBeCloseTo(1, 3);
    expect(hoursLabel(TWO_AT)).toBe(1);
    expect(clockTurns(TWO_AT + 0.6)).toBeGreaterThan(1.5);
    expect(onLand(CAY_T.shore - 0.1)).toBe(false);
    expect(onLand(CAY_T.shore + 0.1)).toBe(true);
    expect(asleepFor(SLEEP_AT + 0.1)).toBeGreaterThan(0);
    expect(asleepFor(BACK_FROM + 0.01)).toBe(0);
    // Still and coiled on the sand by the time it's asleep, its belly bulging behind the head.
    const a = cayKrait(SLEEP_AT + 0.45);
    const b = cayKrait(BACK_FROM - 0.01);
    expect(a.headS).toBeCloseTo(b.headS, 3);
    expect(b.bulges[0]!.from).toBeGreaterThan(40);
    expect(b.bulges[0]!.to).toBeLessThan(LENGTH);
    expect(gradeAt(SLEEP_AT).sun).toBeCloseTo(1, 3);
  });

  it('cuts the voiceover into short lines (≤ 4 words, ≤ 18 letters) that follow WORDS, highlighting the word being said', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      expect(l.words.length === 1 || l.words.map((w) => w.text).join(' ').length <= 18).toBe(true);
      expect(l.to).toBeGreaterThan(l.from);
    }
    for (let i = 1; i < LINES.length; i++) expect(LINES[i]!.from).toBeCloseTo(LINES[i - 1]!.to, 6);
    for (const w of WORDS) {
      const t = w.start / TEMPO + 0.01;
      const now = captionAt(t)!;
      expect(now.line.words[now.word]).toBe(w);
    }
  });

  it('keeps every word on screen between y 270 and 1240', () => {
    const top = (baseline: number, size: number): number => baseline - size * 0.8;
    const bottom = (baseline: number, size: number): number => baseline + size * 0.3;
    // The captions.
    expect(top(SPOKEN.y, SPOKEN.size)).toBeGreaterThan(270);
    expect(bottom(SPOKEN.y, SPOKEN.size)).toBeLessThan(1240);
    // The labels and the clock.
    for (const l of [TEXT.krait, TEXT.hours]) {
      expect(top(l.y, l.size)).toBeGreaterThan(270);
      expect(bottom(l.y, l.size)).toBeLessThan(1240);
    }
    expect(TEXT.clock.y - TEXT.clock.r).toBeGreaterThan(270);
    expect(TEXT.clock.y + TEXT.clock.r).toBeLessThan(1240);
    // "venom" and its drop, by the bite, while they show.
    for (let t = VENOM_AT - 0.05; t < OUT_FROM; t += FRAME) {
      const bite = biteAt(t);
      expect(top(bite.y + TEXT.venom.dy, TEXT.venom.size)).toBeGreaterThan(270);
      const fall = Math.max(0, t - VENOM_AT) * TEXT.drop.fall;
      expect(bite.y + TEXT.drop.dy + fall + TEXT.drop.r * 1.2).toBeLessThan(1240);
      expect(bite.x + TEXT.venom.dx + 140).toBeLessThan(1080);
    }
    // The "z"s rising from the sleeping head.
    for (let t = SLEEP_AT - 0.15; t < BACK_FROM; t += FRAME) {
      const h = headOn(cayCamera(t), cayKrait(t));
      const y = h.at.y + TEXT.zs.dy;
      expect(y + TEXT.zs.size * 0.5).toBeLessThan(1240);
      expect(y - TEXT.zs.rise - TEXT.zs.size * 0.6).toBeGreaterThan(270);
    }
  });

  it('plays every sound effect inside the loop', () => {
    expect(SOUNDS.length).toBeGreaterThan(20);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
      expect(s.gain).toBeGreaterThan(0);
      expect(s.gain).toBeLessThanOrEqual(0.6);
    }
    // A strike on "bite", a swallow on "WHOLE!", a bright "ding" on "TWO".
    const near = (id: string, t: number): boolean => SOUNDS.some((s) => s.id === id && Math.abs(s.t - t) < 0.15);
    expect(near('strike', BITE_AT)).toBe(true);
    expect(near('swallow', WHOLE_AT)).toBe(true);
    expect(near('grown', TWO_AT)).toBe(true);
  });
});
