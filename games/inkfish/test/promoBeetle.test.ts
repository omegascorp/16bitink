import { describe, expect, it } from 'vitest';
import { BEETLE_LEN } from '../dev/promo/beetle/art/beetle';
import { SNOUT, VENT } from '../dev/promo/beetle/art/frog';
import { captionAt, LINES, SOUNDS, TEXT, WATCH_TEXT_Y } from '../dev/promo/beetle/script';
import {
  AT, BOIL_STEPS, CUTS, DIM_ONE, fourBeetleAt, fourFrogAt, gapeAt, gutAt, HOOK_CAM, hookBeetleAt, hookCamAt, hookFrogAt, huhAt, kickAt, lightAt, LOOP_S,
  oddsBeetleAt, outBeetleAt, ratioAt, said, sceneAt, shakeAt, stomachAt, throatLabelAt, tongueAt, watchAt, watchMinutesAt, wholeAt, wrap, xrayAt,
} from '../dev/promo/beetle/story';
import { TEMPO, WORDS } from '../dev/promo/beetle/words';
import { creditAt } from '../dev/promo/credit';
import { BOIL_FPS } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
/** Seconds into the hook at loop time t (negative before the loop point). */
const hookS = (t: number): number => {
  const sc = sceneAt(t);
  if (sc.name !== 'hook') throw new Error(`t=${t} is not in the hook`);
  return sc.s;
};

describe('promo short: this beetle got swallowed alive and walked out (narrated)', () => {
  it('loops on a whole number of 1.5 s beats, frames and line-boil steps', () => {
    expect(LOOP_S % 1.5).toBe(0);
    expect(Number.isInteger(LOOP_S * 30)).toBe(true);
    expect(BOIL_STEPS).toBe(LOOP_S * BOIL_FPS);
    expect(Number.isInteger(BOIL_STEPS)).toBe(true);
  });

  it('loops seamlessly: the frog, the beetle, the camera and the shake at the loop point equal frame 1', () => {
    expect(sceneAt(0).name).toBe('hook');
    expect(sceneAt(END).name).toBe('hook');
    const [s0, s1] = [hookS(0), hookS(END)];
    const [f0, f1] = [hookFrogAt(s0), hookFrogAt(s1)];
    for (const k of ['x', 'gape', 'press', 'look', 'blink', 'gulp'] as const) expect(f1[k], k).toBeCloseTo(f0[k], 4);
    expect(f1.tongue!.x).toBeCloseTo(f0.tongue!.x, 3);
    expect(f1.tongue!.y).toBeCloseTo(f0.tongue!.y, 3);
    const [b0, b1] = [hookBeetleAt(s0, 0)!, hookBeetleAt(s1, END)!];
    for (const k of ['x', 'y', 'k', 'a', 'flail', 'tilt'] as const) expect(b1[k], k).toBeCloseTo(b0[k], 3);
    const [c0, c1] = [hookCamAt(s0), hookCamAt(s1)];
    for (const k of ['cx', 'cy', 'zoom'] as const) expect(c1[k], k).toBeCloseTo(c0[k], 4);
    expect(shakeAt(END).x).toBeCloseTo(shakeAt(0).x, 3);
    for (const f of [xrayAt, kickAt, ratioAt, watchAt, wholeAt]) {
      expect(f(0)).toBe(0);
      expect(f(END)).toBe(0);
    }
    expect(creditAt(0, LOOP_S)).toBe(0);
    expect(creditAt(END, LOOP_S)).toBeCloseTo(0, 6);
  });

  it('never jumps inside a shot: the hook\'s camera, frog and beetle move on smoothly frame to frame and across the loop point', () => {
    for (const t of FRAMES) {
      const q = t + FRAME;
      if (sceneAt(t).name !== 'hook' || sceneAt(q).name !== 'hook') continue;
      const [s, r] = [hookS(t), hookS(q)];
      if (r < s) continue; // the cut into the hook
      const [c0, c1] = [hookCamAt(s), hookCamAt(r)];
      expect(Math.abs(c1.zoom - c0.zoom), `t=${t}`).toBeLessThan(0.25);
      expect(Math.hypot(c1.cx - c0.cx, c1.cy - c0.cy) * c0.zoom, `t=${t}`).toBeLessThan(80);
      // The jaws snap open and shut in a few frames.
      expect(Math.abs(gapeAt(r) - gapeAt(s)), `t=${t}`).toBeLessThan(0.5);
      const [b0, b1] = [hookBeetleAt(s, wrap(t)), hookBeetleAt(r, wrap(q))];
      // The tongue's strike and the swallow are fast; everywhere else the beetle creeps.
      const fast = s > -0.7 && s < 0.05 || s > AT.frogs - 0.1 && s < AT.frogs + 0.3;
      if (b0 && b1) expect(Math.hypot(b1.x - b0.x, b1.y - b0.y), `t=${t}`).toBeLessThan(fast ? 40 : 4);
    }
  });

  it('opens on the hook: the frog\'s mouth wide, the beetle half inside on its tongue, legs flailing, big enough to read on a phone', () => {
    for (const t of [0, 0.3, 1, 2]) {
      const s = hookS(t);
      const f = hookFrogAt(s);
      const b = hookBeetleAt(s, t)!;
      expect(f.gape, `t=${t}`).toBeGreaterThan(0.9);
      expect(f.tongue, `t=${t}`).not.toBeNull();
      expect(b.flail).toBe(1);
      // Its rear half past the lips into the mouth, its head still out (the snout tip is the front of the mouth).
      expect(b.x, `t=${t}`).toBeLessThan(SNOUT.x - 15);
      expect(b.x + 15 * b.k, `t=${t}`).toBeGreaterThan(SNOUT.x - 15);
      expect(BEETLE_LEN * b.k * hookCamAt(s).zoom, `t=${t}`).toBeGreaterThan(150);
    }
    expect(hookCamAt(0)).toEqual(HOOK_CAM);
    // The head fills most of the frame: snout to eardrum is over 60% of the width.
    expect((SNOUT.x - 56) * HOOK_CAM.zoom).toBeGreaterThan(0.55 * 1080);
    expect(captionAt(0.3)!.line.words.map((w) => w.text).join(' ')).toBe('This beetle got');
  });

  it('puts every beat on screen as it is said', () => {
    // "Frogs don't even chew": the mouth snaps shut, the beetle gone in, the eyes press down.
    expect(gapeAt(AT.frogs + 0.3)).toBe(0);
    expect(hookBeetleAt(AT.frogs + 0.3, AT.frogs + 0.3)).toBeNull();
    expect(hookFrogAt(AT.chew + 0.1).press).toBeGreaterThan(0.9);
    expect(hookFrogAt(AT.frogs - 0.2).press).toBe(0);
    // "Down the throat… into the stomach… total darkness."
    expect(sceneAt(AT.down).name).toBe('gullet');
    expect(throatLabelAt(AT.throat + 0.15)).toBe(1);
    expect(stomachAt(AT.throat)).toBe(0);
    expect(stomachAt(AT.stomach + 0.2)).toBe(1);
    expect(lightAt(AT.total - 0.2)).toBe(1);
    expect(lightAt(AT.darkness + 0.5)).toBe(0);
    // "Then its tiny legs start KICKING!"
    expect(sceneAt(AT.then).name).toBe('kick');
    for (const w of ['tiny', 'legs', 'KICKING!']) expect(kickAt(said(w) + 0.01), w).toBeGreaterThan(0.7);
    // "It crawls through the WHOLE frog…": the X-ray, the gut lit; out of the back door in colour.
    expect(sceneAt(AT.crawls).name).toBe('xray');
    expect(xrayAt(AT.crawls)).toBe(1);
    expect(wholeAt(AT.whole + 0.2)).toBe(1);
    expect(gutAt(AT.whole)).toBeGreaterThan(gutAt(AT.crawls));
    expect(xrayAt(AT.walks + 0.1)).toBe(0);
    expect(outBeetleAt(AT.and)).toBeNull();
    const out = outBeetleAt(AT.door + 0.3)!;
    expect(out.x).toBeLessThan(VENT.x);
    expect(huhAt(AT.door + 0.4).alpha).toBe(1);
    // "Nine out of ten made it out": nine lit, marching off; the tenth stays dim where it sat.
    expect(sceneAt(AT.nine).name).toBe('odds');
    const lit = Array.from({ length: 10 }, (_, i) => oddsBeetleAt(i, AT.made)!);
    expect(lit.filter((b) => b.dim === 0)).toHaveLength(9);
    expect(lit[DIM_ONE]!.dim).toBe(1);
    expect(ratioAt(AT.ten + 0.1)).toBe(1);
    expect(oddsBeetleAt(0, AT.six)!.x).toBeGreaterThan(1080);
    expect(oddsBeetleAt(DIM_ONE, AT.made)!.x).toBe(oddsBeetleAt(DIM_ONE, AT.ten)!.x);
    // …and fades away as they leave, gone before the stopwatch.
    expect(oddsBeetleAt(DIM_ONE, AT.six - 0.2)).toBeNull();
    // "…some in just six minutes!": the stopwatch at 6 min.
    expect(watchAt(AT.six + 0.1)).toBe(1);
    expect(watchAt(AT.six - 0.2)).toBe(0);
    expect(watchMinutesAt(AT.minutes + 0.2)).toBe(6);
    // "Four other kinds of frog? Same escape.": four frogs, a beetle out behind each on "Same".
    expect(sceneAt(AT.four).name).toBe('four');
    for (let i = 0; i < 4; i++) expect(fourFrogAt(i, AT.frogQ)).toBe(1);
    expect(fourBeetleAt(AT.same - 0.2)).toBeNull();
    expect(fourBeetleAt(AT.escape)!.x).toBeLessThan(VENT.x);
    // Big enough to read: about 70 px or more on screen at the smallest frog.
    expect(BEETLE_LEN * fourBeetleAt(AT.escape)!.k * 1.0).toBeGreaterThan(70);
    // The one out of the back door: about 150 px.
    expect(BEETLE_LEN * outBeetleAt(AT.door + 0.3)!.k * 2.35).toBeGreaterThan(140);
    // "And somewhere, right now,": back on the frog, the tongue shooting after "right".
    expect(sceneAt(AT.somewhere).name).toBe('hook');
    expect(CUTS.hook).toBeLessThan(AT.and2);
    expect(tongueAt(hookS(AT.right))).toBeNull();
    expect(tongueAt(hookS(LOOP_S - 0.3))).not.toBeNull();
    expect(hookBeetleAt(hookS(AT.somewhere), AT.somewhere)!.flail).toBe(0);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('now,');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    expect(LOOP_S - last.end / TEMPO).toBeLessThan(0.6);
    expect(TEMPO).toBeLessThanOrEqual(1.15);
  });

  it('captions every spoken word in short phrases, the right one at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(19);
    }
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    for (const t of FRAMES) expect(captionAt(t), `t=${t}`).not.toBeNull();
  });

  it('keeps every line of text inside the safe area (y 270 to 1250)', () => {
    const lines = [
      { y: TEXT.caption.y, size: TEXT.caption.size },
      { y: TEXT.label.y, size: TEXT.label.size },
      { y: TEXT.ratio.y, size: TEXT.ratio.size },
      { y: WATCH_TEXT_Y, size: TEXT.watch.size },
    ];
    for (const l of lines) {
      expect(l.y - 0.75 * l.size).toBeGreaterThanOrEqual(270);
      expect(l.y + 0.25 * l.size).toBeLessThanOrEqual(1250);
    }
  });

  it('plays every sound inside the loop', () => {
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
      expect(s.gain).toBeLessThanOrEqual(0.25);
    }
  });
});
