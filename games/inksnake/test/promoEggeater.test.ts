import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { SPOKEN } from '../dev/promo/captions';
import { boilAt } from '../dev/promo/sprites';
import { TEMPO, WORDS } from '../dev/promo/eggeater/words';
import { modelAt } from '../dev/promo/eggeater/model';
import { captionAt, LINES, SOUNDS } from '../dev/promo/eggeater/script';
import {
  BACKBONE_AT, bracketsShown, cameraAt, CRACK_AT, crackFlash, cracked, crush, EGG, eggAt, eggLift, ends, FLAT_AT, gape, GULPS_AT, headPulse, HEAD_AT,
  INSIDE_AT, isWhole, lid, LOOP_S, moodWeights, NO_AT, OUT_AT, POP_AT, said, shakeAt, shellAt, spikesLit, spikesOut, squeeze, TEETH_AT, tongue, wrap,
  xray, yolkAt, yolkGlow, CAM_Y, SCREEN_W,
} from '../dev/promo/eggeater/story';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);

/** Every value driven by time alone, by name (with the biggest step it may take in one frame). */
const TIMED: Readonly<Record<string, readonly [(t: number) => number, number]>> = {
  egg: [(t) => eggAt(t) ?? 0, 9],
  lift: [eggLift, 24],
  crush: [crush, 0.4],
  cracked: [cracked, 1],
  xray: [xray, 0.3],
  spikesOut: [spikesOut, 0.3],
  spikesLit: [spikesLit, 0.45],
  squeeze: [squeeze, 0.06],
  flash: [crackFlash, 1.01],
  gape: [gape, 0.45],
  lid: [lid, 0.1],
  tongue: [tongue, 0.4],
  yolk: [yolkGlow, 0.4],
  brackets: [bracketsShown, 0.4],
  headPulse: [headPulse, 0.4],
  dark: [(t) => moodWeights(t).dramatic, 0.15],
  zoom: [(t) => Math.log(cameraAt(t).k), 0.1],
  camX: [(t) => cameraAt(t).cx * cameraAt(t).k, 80],
  camY: [(t) => cameraAt(t).cy * cameraAt(t).k, 80],
};

describe('promo short: this snake swallows eggs wider than its head (narrated, InkSnake)', () => {
  it('is 18 s, a multiple of 1.5 s, and the voice ends just before the loop point', () => {
    expect(LOOP_S).toBe(18);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect(boilAt(END)).toBe(boilAt(LOOP_S - FRAME));
    expect(boilAt(LOOP_S - FRAME + 1 / 8)).toBe(boilAt(0));
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('Because');
    expect(last.end / TEMPO).toBeLessThan(LOOP_S);
    expect(LOOP_S - last.end / TEMPO).toBeLessThan(0.5);
  });

  it('loops: the egg, the camera, the face and every timed value are where they started', () => {
    for (const [name, [f]] of Object.entries(TIMED)) expect(f(END), name).toBeCloseTo(f(0), 2);
    const [a, b] = [cameraAt(END), cameraAt(0)];
    for (const key of ['cx', 'cy', 'k'] as const) expect(a[key], key).toBeCloseTo(b[key], 2);
    const [m1, m2] = [modelAt(END), modelAt(0)];
    expect(m1.object!.x).toBeCloseTo(m2.object!.x, 2);
    expect(m1.half.map((h) => Math.round(h * 10))).toEqual(m2.half.map((h) => Math.round(h * 10)));
    expect(m1.gape).toBeCloseTo(m2.gape, 4);
    expect(shellAt(END)).toBeNull();
    expect(shellAt(0)).toBeNull();
    expect(shakeAt(END).x).toBeCloseTo(shakeAt(0).x, 3);
    expect(captionAt(END)?.line).toBe(LINES[LINES.length - 1]);
    expect(captionAt(0)?.line).toBe(LINES[0]);
    expect(creditAt(END, LOOP_S)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
    for (const w of Object.values(moodWeights(END))) expect(w).toBeGreaterThanOrEqual(0);
    expect(moodWeights(END).surprised).toBeCloseTo(moodWeights(0).surprised, 4);
  });

  it('never jumps: every timed value moves on smoothly, frame to frame, round the seam too', () => {
    for (const t of FRAMES) {
      for (const [name, [f, limit]] of Object.entries(TIMED)) {
        // The new egg and the shell's pop are cuts in what exists, not in how it moves.
        if (['egg', 'crush', 'cracked', 'lift'].includes(name) && (eggAt(t) === null || eggAt(t + FRAME) === null)) continue;
        expect(Math.abs(f(t + FRAME) - f(t)), `${name} at ${t.toFixed(2)}`).toBeLessThan(limit);
      }
      const [s1, s2] = [shellAt(t), shellAt(t + FRAME)];
      if (s1 && s2) expect(Math.hypot(s2.x - s1.x, s2.y - s1.y), `shell at ${t.toFixed(2)}`).toBeLessThan(26);
    }
  });

  it('opens on the egg wider than the head: the jaws stretched round it, nothing written but the words', () => {
    const m = modelAt(0);
    const egg = m.object!;
    expect(egg.whole).toBe(true);
    // Part of the egg is in the mouth, part out in front of the snout.
    expect(egg.x - egg.rx).toBeLessThan(-5);
    expect(egg.x + egg.rx).toBeGreaterThan(15);
    // The skin over it is far deeper than the head's own depth, and it stretches (the scales spread apart).
    const headDepth = 2 * 5.4;
    expect(2 * m.half[10]!).toBeGreaterThan(3 * headDepth * 0.85);
    expect(m.stretch[10]!).toBeGreaterThan(0.8);
    expect(m.gape).toBe(0);
    // Big on screen, inside the safe area, above the captions.
    const cam = cameraAt(0);
    const top = CAM_Y + (-2 * EGG.ry - cam.cy) * cam.k;
    const bottom = CAM_Y + (0 - cam.cy) * cam.k;
    expect(top).toBeGreaterThan(400);
    expect(bottom).toBeLessThan(900);
    expect(bottom - top).toBeGreaterThan(380);
    const left = SCREEN_W / 2 + (egg.x - egg.rx - cam.cx) * cam.k;
    expect(left).toBeGreaterThan(40);
    expect(bracketsShown(0)).toBe(0);
    expect(bracketsShown(HEAD_AT + 0.1)).toBeGreaterThan(0.9);
    expect(bracketsShown(3.6)).toBe(0);
    expect(headPulse(HEAD_AT + 0.25)).toBeGreaterThan(0.9);
  });

  it('slides the egg into the neck as a bulge, then opens the empty mouth on "no teeth"', () => {
    expect(eggAt(4.6)).toBeGreaterThan(65);
    const m = modelAt(4.6);
    expect(Math.max(...m.half)).toBeGreaterThan(18);
    expect(m.half[5]!).toBeLessThan(7);
    expect(gape(NO_AT - 0.3)).toBe(0);
    expect(gape(TEETH_AT + 0.1)).toBeGreaterThan(0.9);
    expect(gape(6.2)).toBe(0);
  });

  it('goes see-through on "INSIDE", grows the spikes on "spikes", lights them on "BACKBONE", then cracks the egg', () => {
    expect(xray(INSIDE_AT - 0.1)).toBe(0);
    expect(xray(INSIDE_AT + 0.5)).toBeGreaterThan(0.95);
    expect(squeeze(INSIDE_AT + 0.3)).toBeGreaterThan(0.05);
    expect(spikesOut(said('spikes') - 0.2)).toBe(0);
    expect(spikesOut(said('spikes') + 0.5)).toBe(1);
    expect(spikesLit(BACKBONE_AT - 0.05)).toBe(0);
    expect(spikesLit(BACKBONE_AT + 0.3)).toBe(1);
    expect(CRACK_AT).toBeGreaterThan(ends('BACKBONE!'));
    expect(cracked(CRACK_AT - 0.02)).toBe(0);
    expect(cracked(CRACK_AT + 0.2)).toBe(1);
    expect(isWhole(CRACK_AT - 0.02)).toBe(true);
    expect(crackFlash(CRACK_AT + 0.02)).toBeGreaterThan(0.7);
    expect(modelAt(CRACK_AT + 0.02).xray).toBeGreaterThan(0.9);
    // The mood goes dark for this sentence.
    expect(moodWeights(9).dramatic).toBe(1);
  });

  it('slides the golden glow down the body on "gulps the yolk", then brings the shell back and pops it out on "out,"', () => {
    expect(yolkGlow(GULPS_AT + 0.1)).toBeGreaterThan(0.9);
    expect(yolkAt(GULPS_AT + 0.1)).toBeLessThan(yolkAt(said('yolk…') + 0.3));
    expect(modelAt(said('yolk…') + 0.3).xray).toBeLessThan(0.1);
    expect(eggAt(said('spits'))).toBeGreaterThan(40);
    expect(eggAt(OUT_AT - 0.1)).toBeLessThan(25);
    expect(gape(POP_AT)).toBeGreaterThan(0.9);
    expect(shellAt(POP_AT - 0.05)).toBeNull();
    const out = shellAt(POP_AT + 0.1)!;
    expect(out.fold).toBe(0);
    const flat = shellAt(FLAT_AT + 0.4)!;
    expect(flat.fold).toBe(1);
    expect(flat.y).toBeGreaterThan(-4);
    expect(shellAt(said('folded') - 0.05)!.fold).toBeLessThan(0.05);
    expect(Math.abs(flat.x - cameraAt(FLAT_AT + 0.4).cx)).toBeLessThan(540 / cameraAt(FLAT_AT + 0.4).k);
  });

  it('is smug for the last sentence beside the flat shell, flicks it away, and a new whole egg drops in', () => {
    expect(lid(NO_AT)).toBe(0);
    expect(lid(16)).toBeCloseTo(0.5, 2);
    expect(shellAt(16)!.fold).toBe(1);
    expect(shellAt(17.2)).toBeNull();
    expect(eggAt(16.6)).toBeNull();
    expect(eggAt(16.8)!).toBeLessThan(-20);
    expect(eggLift(16.8)).toBeGreaterThan(40);
    expect(eggLift(17.3)).toBe(0);
    expect(eggAt(17.9)!).toBeGreaterThan(-3);
    expect(isWhole(17.5)).toBe(true);
    expect(cracked(17.5)).toBe(0);
    expect(moodWeights(16).sarcastic).toBe(1);
    expect(moodWeights(END).surprised).toBeGreaterThan(0.99);
  });

  it('has a different mood for each sentence (the mood weights sum to one all through)', () => {
    for (const t of FRAMES) {
      const w = moodWeights(t);
      expect(Object.values(w).reduce((s, v) => s + v, 0), `at ${t}`).toBeCloseTo(1, 5);
    }
    const dominant = [1, 4, 9, 12.5, 16].map((t) => Object.entries(moodWeights(t)).sort((a, b) => b[1] - a[1])[0]![0]);
    expect(new Set(dominant).size).toBe(5);
  });

  it('keeps every word on screen with the spoken line, and every noun in view when it is said', () => {
    expect(LINES[0]!.from).toBe(0);
    expect(LINES[LINES.length - 1]!.to).toBe(LOOP_S);
    for (const w of WORDS) {
      const c = captionAt((w.start + 0.01) / TEMPO);
      expect(c, w.text).not.toBeNull();
      expect(c!.line.words[c!.word]!.text).toBe(w.text);
    }
    // Captions sit inside the clear area.
    expect(SPOKEN.y).toBeGreaterThan(270);
    expect(SPOKEN.y).toBeLessThan(1250);
    // "snake", "eggs" and "head": the egg-eater with its egg is in view from frame 1; "teeth": the open mouth on screen; "egg" and "neck": the bulge;
    // "backbone": the spikes; "yolk": the glow; "shell": the shell flying out.
    expect(modelAt(said('snake')).object).not.toBeNull();
    expect(gape(said('teeth.') + 0.1)).toBeGreaterThan(0.9);
    expect(Math.max(...modelAt(said('egg')).half)).toBeGreaterThan(18);
    expect(xray(said('neck,'))).toBeGreaterThan(0.95);
    expect(spikesOut(said('BACKBONE!'))).toBe(1);
    expect(yolkGlow(said('yolk…'))).toBeGreaterThan(0.9);
    expect(shellAt(said('shell') + 1.5)).not.toBeNull();
    expect(shellAt(said('back') + 0.9)).not.toBeNull();
  });

  it('has a sound for every beat, all inside the loop', () => {
    for (const c of SOUNDS) {
      expect(c.t).toBeGreaterThanOrEqual(0);
      expect(c.t).toBeLessThan(LOOP_S);
      expect(c.gain).toBeGreaterThan(0);
    }
    const near = (t: number, id?: string): boolean => SOUNDS.some((c) => Math.abs(c.t - wrap(t)) < 0.15 && (!id || c.id === id));
    expect(near(HEAD_AT, 'swallow')).toBe(true);
    expect(near(CRACK_AT, 'bump')).toBe(true);
    expect(near(POP_AT, 'plop')).toBe(true);
    expect(near(BACKBONE_AT, 'strike')).toBe(true);
  });
});
