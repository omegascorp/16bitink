import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/cookiecutter/script';
import {
  alarmAt, alarmMarksAt, aloneShark, backAt, backShark, BITES_AT, BITTEN_AT, blueprintZoomAt, boilAt, BOIL_STEPS, CUT, CUTTING_AT, dimAt, DIMPLE, drillHoleAt,
  drillShakeAt, drillShark, drillZoomAt, FRESH_HOLE, freshHoleAt, GLOWS_AT, harbourCamAt, HOLES_AT, hookShark, HULL_CAM0, hullCamAt, insetAt, LATCH, LATCH_ANGLE,
  LITTLE_AT, LOOP_S, navyLabelAt, NOPE_AT, OLD_HOLES, PERFECT_AT, pointAt, questionAt, ringAt, said, sceneAt, sealedAt, SECRET_AT, settleAt, type SharkPose, sizeBarAt,
  sketchAt, smugShark, SO_AT, sparkleAt, SPINS_AT, stampAt, SUB, SUBS_AT, subAt, suctionAt, toScreen, toWorld, TWENTY_AT, whiskAt, wrap,
} from '../dev/promo/cookiecutter/story';
import { TEMPO, WORDS } from '../dev/promo/cookiecutter/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);

/** The shark as the frame draws it, on screen: in the hull's world through its camera, or straight on screen in the other scenes. */
function sharkOnScreen(t: number): SharkPose | null {
  const u = wrap(t);
  switch (sceneAt(t)) {
    case 'hull': {
      const v = hullCamAt(t);
      const p = u >= CUT.back ? backShark(t) : hookShark(t);
      return { ...p, nose: toScreen(v, p.nose), len: p.len * v.zoom, angle: p.angle + v.angle };
    }
    case 'alone':
      return aloneShark(t);
    case 'drill':
      return drillShark(t);
    case 'smug':
      return smugShark(t);
    default:
      return null;
  }
}

/** Every value the picture is driven by, other than the shark and the camera, at time t. */
const DRIVEN: readonly ((t: number) => number)[] = [
  freshHoleAt, sealedAt, settleAt, whiskAt, backAt, sizeBarAt, dimAt, drillZoomAt, suctionAt, drillHoleAt, navyLabelAt, alarmMarksAt, pointAt, alarmAt, sketchAt,
  questionAt, blueprintZoomAt, (t) => ringAt(t).sweep, (t) => ringAt(t).alpha, (t) => insetAt(t).open, (t) => insetAt(t).press, (t) => stampAt(t).alpha,
  (t) => harbourCamAt(t).zoom, (t) => Math.max(0, Math.min(1, sparkleAt(t))) * (sparkleAt(t) <= 1 ? 1 : 0),
];

describe('promo short: this tiny shark bites holes in submarines (narrated)', () => {
  it('loops: the scene, the tilted hull camera, the shark sealed on, the holes and every time-driven value are where they started', () => {
    expect(sceneAt(END)).toBe('hull');
    expect(sceneAt(0)).toBe('hull');
    const [a, b] = [hullCamAt(END), hullCamAt(0)];
    for (const key of ['x', 'y', 'zoom', 'angle'] as const) expect(a[key]).toBeCloseTo(b[key], 4);
    expect(b).toEqual(HULL_CAM0);
    const [s1, s2] = [backShark(END), hookShark(0)];
    expect(dist(s1.nose, s2.nose)).toBeLessThan(0.1);
    for (const key of ['angle', 'len', 'roll', 'lips', 'grin', 'glow', 'plug', 'whirl', 'effort'] as const) expect(s1[key]).toBeCloseTo(s2[key], 3);
    expect(s1.eye).toBe(s2.eye);
    expect(Math.cos(s1.beat - s2.beat)).toBeCloseTo(1, 4);
    for (const f of DRIVEN) expect(f(END)).toBeCloseTo(f(0), 4);
    expect(dist(drillShakeAt(END), drillShakeAt(0))).toBeLessThan(1e-6);
  });

  it('never jumps: the camera and the shark move on smoothly within each scene, frame to frame and across the loop point', () => {
    for (const t of FRAMES) {
      const [u, w] = [wrap(t), wrap(t + FRAME)];
      if (sceneAt(t) !== sceneAt(t + FRAME)) continue;
      const [p, q] = [hullCamAt(t), hullCamAt(t + FRAME)];
      expect(Math.abs(Math.log(q.zoom / p.zoom))).toBeLessThan(0.09);
      expect(Math.abs(q.angle - p.angle)).toBeLessThan(0.03);
      const [a, b] = [sharkOnScreen(t), sharkOnScreen(t + FRAME)];
      if (!a || !b) continue;
      // Quick entrances: swimming in just after the cut, and popping up from below the screen on "Nope.".
      const entering = (u > CUT.alone && u < CUT.alone + 0.25) || (u >= CUT.smug && u < NOPE_AT + 0.2);
      expect(dist(a.nose, b.nose)).toBeLessThan(entering ? 330 : 90);
      expect(Math.abs(Math.log(b.len / a.len))).toBeLessThan(0.08);
      // It never turns more than a little a frame (its spin is round its own axis, not this).
      expect(Math.abs(b.angle - a.angle)).toBeLessThan(entering ? 0.2 : 0.12);
      if (w > u && !entering) for (const f of [backAt, dimAt, sealedAt]) expect(Math.abs(f(t + FRAME) - f(t))).toBeLessThan(0.35);
    }
  });

  it('opens on the shark sealed onto the submarine bow, big and above the middle, round holes beside it, nothing written but the words', () => {
    const v = hullCamAt(0);
    const s = sharkOnScreen(0)!;
    expect(s.lips).toBe(1);
    expect(s.plug).toBe(0);
    expect(s.glow).toBeGreaterThan(0.3);
    // 40–50% of the frame's width, its lips a little above the middle.
    expect(s.len / 1080).toBeGreaterThan(0.4);
    expect(s.len / 1080).toBeLessThan(0.5);
    expect(s.nose.y).toBeGreaterThan(700);
    expect(s.nose.y).toBeLessThan(960);
    // Its whole body on screen.
    const tail = { x: s.nose.x - Math.cos(s.angle) * s.len, y: s.nose.y - Math.sin(s.angle) * s.len };
    for (const p of [s.nose, tail]) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(1080);
      expect(p.y).toBeGreaterThan(270);
    }
    // Its lips on the dome's rim (just off it), pointing in, the dimple under them.
    const u = (LATCH.x - SUB.capX) / SUB.capLen;
    const w = (LATCH.y - SUB.axisY) / SUB.radius;
    expect(Math.hypot(u, w)).toBeGreaterThan(1);
    expect(Math.hypot(u, w)).toBeLessThan(1.04);
    expect(Math.cos(LATCH_ANGLE - Math.atan2(SUB.axisY - LATCH.y, SUB.capX - LATCH.x))).toBeGreaterThan(0.9);
    expect(dist(DIMPLE, LATCH)).toBeLessThan(25);
    // The sail is in view, the hull fills the middle of the picture.
    const sailTop = toScreen(v, { x: SUB.sailX + SUB.sailW / 2, y: SUB.axisY - SUB.radius - SUB.sailH });
    expect(sailTop.x).toBeLessThan(1080);
    expect(sailTop.y).toBeGreaterThan(0);
    const hullMid = toScreen(v, { x: SUB.capX + 200, y: SUB.axisY });
    expect(hullMid.y).toBeGreaterThan(800);
    expect(hullMid.y).toBeLessThan(1250);
    // Two or three round holes in the rubber dome, right beside its lips, big enough to read.
    expect(OLD_HOLES.length).toBeGreaterThanOrEqual(2);
    for (const h of OLD_HOLES) {
      expect(Math.hypot((h.x - SUB.capX) / SUB.capLen, (h.y - SUB.axisY) / SUB.radius)).toBeLessThan(0.85);
      expect(dist(h, LATCH)).toBeLessThan(260);
      expect(h.r * v.zoom).toBeGreaterThan(30);
    }
    expect(freshHoleAt(0)).toBe(0);
    for (const f of [navyLabelAt, sizeBarAt, dimAt, settleAt]) expect(f(0)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
  });

  it('spins on "bites", pops off with a plug on "holes", leaving a fresh hole, and pulls back to the whole submarine on "SUBMARINES!"', () => {
    expect(hookShark(BITES_AT + 0.1).whirl).toBeGreaterThan(0.3);
    expect(hookShark(BITES_AT + 0.1).roll).toBeGreaterThan(0.5);
    const off = hookShark(HOLES_AT + 0.5);
    expect(off.plug).toBe(1);
    expect(dist(off.nose, LATCH)).toBeGreaterThan(60);
    expect(freshHoleAt(HOLES_AT + 0.1)).toBe(1);
    expect(sealedAt(HOLES_AT + 0.2)).toBe(0);
    expect(Math.hypot((FRESH_HOLE.x - SUB.capX) / SUB.capLen, (FRESH_HOLE.y - SUB.axisY) / SUB.radius)).toBeLessThan(1);
    const wide = hullCamAt(SUBS_AT + 0.7);
    expect(wide.zoom).toBeLessThan(0.6);
    // The shark small against the sub, both in view.
    const s = sharkOnScreen(SUBS_AT + 0.7)!;
    expect(s.len).toBeLessThan(260);
    expect(s.nose.x).toBeGreaterThan(0);
    expect(toScreen(wide, { x: SUB.sailX, y: SUB.axisY - SUB.radius - SUB.sailH }).x).toBeLessThan(1080);
  });

  it('measures it on "twenty inches" and lights its belly on "GLOWS"', () => {
    expect(sceneAt(TWENTY_AT)).toBe('alone');
    expect(sizeBarAt(TWENTY_AT + 0.25)).toBe(1);
    expect(sizeBarAt(TWENTY_AT - 0.2)).toBe(0);
    expect(dimAt(GLOWS_AT + 0.4)).toBe(1);
    expect(aloneShark(GLOWS_AT + 0.4).glow).toBe(1);
    expect(aloneShark(TWENTY_AT).glow).toBeLessThan(0.3);
  });

  it('seals its lips on, spins, cuts out a perfect circle, as it is said', () => {
    expect(sceneAt(SPINS_AT)).toBe('drill');
    expect(suctionAt(said('suction') + 0.2)).toBe(1);
    expect(drillZoomAt(said('lips…'))).toBeGreaterThan(1.5);
    expect(drillShark(said('lips…')).lips).toBeGreaterThan(0.9);
    expect(drillShark(SPINS_AT + 0.3).whirl).toBeGreaterThan(0.5);
    expect(drillHoleAt(CUTTING_AT + 0.3)).toBe(1);
    expect(drillShark(CUTTING_AT + 0.5).plug).toBe(1);
    expect(ringAt(PERFECT_AT + 0.8).sweep).toBe(1);
    expect(insetAt(PERFECT_AT).open).toBe(1);
  });

  it('surfaces a Navy submarine at a harbour, "US Navy, 1970s", and punches in on its bitten dome on "BITTEN!"', () => {
    expect(sceneAt(BITTEN_AT)).toBe('harbour');
    expect(navyLabelAt(said('Navy'))).toBe(1);
    expect(subAt(said('came')).nose.y).toBeLessThan(subAt(CUT.harbour).nose.y - 150);
    expect(harbourCamAt(BITTEN_AT + 0.2).zoom).toBeGreaterThan(1.6);
    expect(alarmMarksAt(BITTEN_AT + 0.3)).toBe(1);
    expect(pointAt(BITTEN_AT)).toBe(1);
  });

  it('suspects a secret weapon under a red alarm, then whips it away on "Nope." for a smug wink on "little guy"', () => {
    expect(sceneAt(SECRET_AT)).toBe('blueprint');
    expect(stampAt(SECRET_AT + 0.3).alpha).toBe(1);
    expect(questionAt(SECRET_AT)).toBeGreaterThan(0.9);
    expect(Math.max(...[0, 0.1, 0.2, 0.3, 0.4].map((d) => alarmAt(SECRET_AT + d)))).toBeGreaterThan(0.8);
    expect(whiskAt(NOPE_AT + 0.3)).toBe(1);
    expect(sceneAt(NOPE_AT + 0.1)).toBe('smug');
    expect(smugShark(NOPE_AT + 0.7).grin).toBe(1);
    expect(smugShark(LITTLE_AT + 0.1).eye).toBe('wink');
  });

  it('hands the smug shark back onto the hull on "So yes," without a jump, sealing on before the loop point', () => {
    const t = CUT.back;
    const smug = smugShark(t - 1e-6);
    const back = backShark(t);
    const onScreen = toScreen(HULL_CAM0, back.nose);
    expect(dist(onScreen, smug.nose)).toBeLessThan(2);
    expect(back.len * HULL_CAM0.zoom).toBeCloseTo(smug.len, 0);
    expect(back.angle + HULL_CAM0.angle).toBeCloseTo(smug.angle, 1);
    expect(dist(toWorld(HULL_CAM0, toScreen(HULL_CAM0, LATCH)), LATCH)).toBeLessThan(1e-6);
    expect(backAt(CUT.back + 0.01)).toBeGreaterThan(0.9);
    expect(backAt(SO_AT + 0.35)).toBe(0);
    expect(sealedAt(END)).toBe(1);
    expect(backShark(LOOP_S - 0.2).lips).toBe(1);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('yes,');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.5);
    expect(said('So')).toBe(SO_AT);
    // "Nope." moved later than Scribe put it, clear of the chuckle.
    expect(WORDS.find((w) => w.text === 'Nope.')!.start).toBeCloseTo(17.238, 3);
  });

  it('captions every spoken word, in short lines, the spoken word highlighted', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      if (l.words.length > 1) expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(18);
    }
    for (const w of WORDS) {
      const now = captionAt((w.start + w.end) / 2 / TEMPO)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(0)!.line).toBe(LINES[0]);
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
  });

  it('keeps every line of text between y 270 and 1240', () => {
    const inside = (baseline: number, size: number): void => {
      expect(baseline - size * 0.8).toBeGreaterThan(270);
      expect(baseline + size * 0.3).toBeLessThan(1240);
    };
    inside(TEXT.caption.y, TEXT.caption.size);
    inside(TEXT.navy.y, TEXT.navy.size);
    for (const t of FRAMES) {
      if (sizeBarAt(t) > 0) inside(aloneShark(t).nose.y + TEXT.sizeBar.below + TEXT.sizeBar.labelBelow, TEXT.sizeBar.size);
    }
    // The stamp at its largest, inside the blueprint's push-in (about y 900).
    const k = TEXT.stamp.maxScale * blueprintZoomAt(NOPE_AT - 0.05);
    const top = 900 + (TEXT.stamp.y - TEXT.stamp.halfH * k - 900) * blueprintZoomAt(NOPE_AT - 0.05) - TEXT.stamp.halfW * Math.sin(0.12) * k;
    const bottom = 900 + (TEXT.stamp.y + TEXT.stamp.halfH * k - 900) * blueprintZoomAt(NOPE_AT - 0.05) + TEXT.stamp.halfW * Math.sin(0.12) * k;
    expect(top).toBeGreaterThan(270);
    expect(bottom).toBeLessThan(1240);
    expect(stampAt(SECRET_AT).scale).toBeLessThanOrEqual(TEXT.stamp.maxScale);
  });

  it('shows the credit in the middle, never in the hook or at the seam', () => {
    expect(creditAt(BITTEN_AT, LOOP_S)).toBeGreaterThan(0);
    expect(creditAt(END, LOOP_S)).toBe(0);
    expect(creditAt(2, LOOP_S)).toBe(0);
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
      expect(s.gain).toBeGreaterThan(0);
      expect(s.gain).toBeLessThan(0.5);
    }
  });
});
