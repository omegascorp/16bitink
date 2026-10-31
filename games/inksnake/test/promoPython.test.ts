import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { SPOKEN } from '../dev/promo/captions';
import { boilAt } from '../dev/promo/sprites';
import {
  bellyCamera, CROC_AT, daysCamera, duskCamera, duskP, duskPython, faceCamera, faceCroc, facePython, HOOK, hookP, lakeCamera, lakeCroc,
  lakePython, restPython, shakeAt, struggle,
} from '../dev/promo/python/moves';
import {
  captionAt, clockShown, clockTurns, crocBar, dayNumber, daySky, daysShown, LINES, placeLabel, pythonBar, questionShown, skyShown, SOUNDS, suitcaseShown,
  sunPhase, TEXT, yearLabel,
} from '../dev/promo/python/script';
import { headOn, toScreen, type Camera, type PythonPose } from '../dev/promo/python/snake';
import {
  BACK_FROM, BELLY_FROM, BELLY_AT, BET_AT, DAYS_FROM, DUSK_FROM, FACE_FROM, GRABBED_AT, gradeAt, HEAD_AT, hookClock, HOURS_AT, LAKE_FROM, LOOP_S, sceneAt,
  SUITCASE_AT, TAG_FROM, TEN_AT, THEN_AT, THREEFOOT_AT, TENFOOT_AT, wrap, WHOLE_AT, YOU_AT, ends, ITS_AT,
} from '../dev/promo/python/story';
import { TEMPO, WORDS } from '../dev/promo/python/words';
import { CROC_L, crocHalfAt, crocPoint, gapeOf, HIPS_U, hookShot, RIM, SKULL, toView } from '../dev/promo/python/profile';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);

/** The python and the camera at t, whichever top-down set is on screen (the hook is side on: hookShot). */
function shotAt(t: number): { cam: Camera; python: PythonPose } | null {
  switch (sceneAt(t)) {
    case 'lake': return { cam: lakeCamera(wrap(t)), python: lakePython(wrap(t)) };
    case 'dusk': return { cam: duskCamera(wrap(t)), python: duskPython(wrap(t)) };
    case 'belly': return { cam: bellyCamera(wrap(t)), python: restPython(wrap(t)) };
    case 'days': return { cam: daysCamera(wrap(t)), python: restPython(wrap(t)) };
    case 'face': return { cam: faceCamera(wrap(t)), python: facePython(wrap(t)) };
    case 'tag': return { cam: lakeCamera(wrap(t)), python: lakePython(wrap(t)) };
    default: return null;
  }
}

const crossesCut = (t: number): boolean => sceneAt(t) !== sceneAt(t + FRAME);

/** Every value driven by time alone, by name. */
const TIMED: Readonly<Record<string, (t: number) => number>> = {
  placeLabel, yearLabel, pythonBar, crocBar, clockShown, skyShown, suitcaseShown, daysShown, questionShown, struggle,
  // The clock's hands as seen (one turn is a full circle): they only show while the clock does.
  turns: (t) => (clockShown(t) > 0 ? clockTurns(t) : 0),
  vignette: (t) => gradeAt(t).vignette,
  tint: (t) => gradeAt(t).tintAlpha,
  shakeX: (t) => shakeAt(t).x,
  shakeY: (t) => shakeAt(t).y,
};

describe('promo short: this snake swallowed a whole crocodile (narrated, InkSnake)', () => {
  it('is 19.5 s, a multiple of 1.5 s, and the voice ends just before the loop point', () => {
    expect(LOOP_S).toBe(19.5);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect(boilAt(END)).toBe(boilAt(LOOP_S - FRAME));
    expect(boilAt(LOOP_S - FRAME + 1 / 8)).toBe(boilAt(0));
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('Because');
    expect(last.end / TEMPO).toBeLessThan(LOOP_S);
    expect(LOOP_S - last.end / TEMPO).toBeLessThan(0.5);
  });

  it('loops: the hook, its camera, the python, the croc in its jaws and every timed value are where they started', () => {
    expect(sceneAt(END)).toBe('hook');
    expect(sceneAt(0)).toBe('hook');
    expect(hookClock(END)).toBeCloseTo(hookClock(0), 5);
    const [k1, k2] = [hookShot(END), hookShot(0)];
    for (const key of ['p', 'sway', 'kick', 'fold', 'tilt', 'tongue', 'zoom'] as const) expect(k1[key], key).toBeCloseTo(k2[key], 4);
    expect(gapeOf(k1).top).toBeCloseTo(gapeOf(k2).top, 4);
    expect(gapeOf(k1).bottom).toBeCloseTo(gapeOf(k2).bottom, 4);
    for (const [name, f] of Object.entries(TIMED)) expect(f(END), name).toBeCloseTo(f(0), 3);
    expect(gradeAt(END).tint).toBe(gradeAt(0).tint);
    expect(captionAt(END)?.line).toBe(LINES[LINES.length - 1]);
    expect(captionAt(0)?.line).toBe(LINES[0]);
    expect(creditAt(END, LOOP_S)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
  });

  it('never jumps: the camera, the python, the croc and every timed value move on smoothly (cutting only at its scene cuts)', () => {
    for (const t of FRAMES) {
      if (crossesCut(t)) continue;
      if (sceneAt(t) === 'hook') {
        const [a, b] = [hookShot(t), hookShot(t + FRAME)];
        expect(Math.abs(b.p - a.p), `croc in at ${t}`).toBeLessThan(0.03);
        expect(Math.abs(b.zoom - a.zoom), `zoom at ${t}`).toBeLessThan(0.02);
        expect(Math.abs(b.tilt - a.tilt), `nod at ${t}`).toBeLessThan(0.02);
        expect(Math.abs(b.sway - a.sway), `sway at ${t}`).toBeLessThan(0.03);
        for (const [name, f] of Object.entries(TIMED)) expect(Math.abs(f(t + FRAME) - f(t)), `${name} at ${t}`).toBeLessThan(name.startsWith('shake') ? 70 : 0.5);
        continue;
      }
      const [p, q] = [shotAt(t)!, shotAt(t + FRAME)!];
      expect(Math.abs(Math.log(q.cam.zoom / p.cam.zoom)), `zoom at ${t}`).toBeLessThan(0.1);
      expect(dist(p.cam, q.cam) * p.cam.zoom, `camera at ${t}`).toBeLessThan(80);
      const [h1, h2] = [headOn(p.cam, p.python), headOn(q.cam, q.python)];
      // The strike across the top of the croc and the coil's first turn cover ground in a few frames.
      const dashing = wrap(t) > 5.2 && wrap(t) < 6.0;
      expect(dist(h1.at, h2.at), `head at ${t}`).toBeLessThan(dashing ? 260 : 130);
      for (const [name, f] of Object.entries(TIMED)) {
        // Hands matter only while the clock is up.
        if (name === 'turns' && (clockShown(t) <= 0 || clockShown(t + FRAME) <= 0)) continue;
        const limit = name.startsWith('shake') ? 70 : name === 'turns' ? 0.4 : 0.5;
        expect(Math.abs(f(t + FRAME) - f(t)), `${name} at ${t}`).toBeLessThan(limit);
      }
    }
  });

  it("opens side on: the jaws stretched round the croc's body (deeper than the head), its hips, hind legs and tail outside, big, nothing written but the words", () => {
    const k = hookShot(0);
    // Head and shoulders in, the hips (the hind legs' root) and the tail out, the legs not yet folding.
    expect(k.p).toBeGreaterThan(0.3);
    expect(k.p).toBeLessThan(HIPS_U - 0.1);
    expect(k.fold).toBe(0);
    // The croc's body at the lips is far deeper than the python's skull, and the lips are stretched round it.
    expect(2 * crocHalfAt(k.p * CROC_L)).toBeGreaterThan(3 * SKULL);
    const g = gapeOf(k);
    expect(g.top + g.bottom).toBeGreaterThan(2 * crocHalfAt(k.p * CROC_L));
    // Big: the lips near the middle, the croc's hips on screen to their left, all of it above the buttons.
    const view = toView(k, { x: 0, y: 0 });
    const lips = view(RIM);
    const hips = view(crocPoint(k, HIPS_U * CROC_L));
    expect(Math.abs(lips.x - 540)).toBeLessThan(150);
    expect(lips.x - hips.x).toBeGreaterThan(250);
    expect(hips.x).toBeGreaterThan(120);
    expect(lips.y).toBeGreaterThan(600);
    expect(lips.y + g.bottom * 6).toBeLessThan(1150);
    for (const f of [placeLabel, yearLabel, pythonBar, crocBar, clockShown, skyShown, suitcaseShown, daysShown, questionShown]) expect(f(0)).toBe(0);
  });

  it('swallows the croc in the hook, the tail gone within "CROCODILE!", the jaws closing', () => {
    expect(hookP(WHOLE_AT - 0.2)).toBeLessThan(1);
    expect(HOOK.gone).toBeGreaterThan(WHOLE_AT);
    expect(HOOK.gone).toBeLessThan(ends('CROCODILE!') + 0.2);
    const after = hookShot(HOOK.gone + 0.05);
    expect(after.p).toBe(1);
    expect(after.fold).toBe(1);
    expect(gapeOf(after).top).toBeLessThan(3);
  });

  it('names the place and the year, then the python swims in beside the croc with its length bar, and the croc has its own on "three-foot"', () => {
    expect(sceneAt(TAG_FROM + 0.05)).toBe('tag');
    expect(placeLabel(TAG_FROM + 0.8)).toBe(1);
    expect(yearLabel(TAG_FROM + 1.5)).toBe(1);
    expect(placeLabel(LAKE_FROM + 0.5)).toBe(0);
    expect(sceneAt(LAKE_FROM + 0.05)).toBe('lake');
    expect(pythonBar(TENFOOT_AT + 0.3)).toBe(1);
    expect(pythonBar(THREEFOOT_AT + 0.5)).toBe(0);
    expect(crocBar(THREEFOOT_AT + 0.3)).toBe(1);
    // Both animals are on screen when the bars are, the whole python in view.
    const t = TENFOOT_AT + 0.3;
    const { cam, python } = shotAt(t)!;
    const tail = toScreen(cam, python.route.at(python.headS - python.length));
    const head = toScreen(cam, python.route.at(python.headS));
    expect(head.x).toBeGreaterThan(0);
    expect(head.x).toBeLessThan(1080);
    expect(tail.x).toBeGreaterThan(0);
    expect(tail.x).toBeLessThan(1080);
    expect(head.y).toBeGreaterThan(270);
    expect(tail.y).toBeLessThan(1700);
    const croc = toScreen(cam, lakeCroc(t).at);
    expect(croc.y).toBeGreaterThan(270);
    expect(croc.y).toBeLessThan(1250);
  });

  it('grabs the croc on "grabbed" (head at the croc, mouth open), coils round it and struggles until the cut to dusk', () => {
    expect(dist(lakePython(GRABBED_AT + 0.1).route.at(lakePython(GRABBED_AT + 0.1).headS), CROC_AT)).toBeLessThan(90);
    expect(lakePython(GRABBED_AT + 0.05).head).toBe('strike');
    expect(struggle(8.6)).toBeGreaterThan(0.9);
    expect(struggle(LAKE_FROM + 0.2)).toBe(0);
    expect(clockShown(HOURS_AT)).toBe(1);
    expect(clockTurns(HOURS_AT)).toBeGreaterThan(4);
    // The croc and the python stay close during the fight: the head by the croc's middle.
    const py = lakePython(8.5);
    expect(dist(py.route.at(py.headS), lakeCroc(8.5).at)).toBeLessThan(60);
  });

  it('swallows the croc head first at dusk: the mouth gapes, the croc goes in on "HEAD first!", the sun sinks', () => {
    expect(sceneAt(HOURS_AT)).toBe('dusk');
    expect(duskP(HOURS_AT)).toBeLessThan(-0.3);
    expect(duskP(HEAD_AT)).toBeGreaterThan(0);
    expect(duskPython(HEAD_AT).head).toBe('open');
    expect(skyShown(HEAD_AT)).toBe(1);
    expect(sunPhase(BELLY_FROM)).toBeGreaterThan(sunPhase(HOURS_AT + 1));
    expect(gradeAt(HEAD_AT).tint).not.toBe(gradeAt(LAKE_FROM + 0.6).tint);
  });

  it('shows the lump of the croc in its belly and a suitcase beside it on "suitcase"', () => {
    expect(sceneAt(ITS_AT)).toBe('belly');
    expect(sceneAt(BELLY_AT)).toBe('belly');
    const k = restPython(SUITCASE_AT);
    expect(k.bulges[0]!.amp).toBeGreaterThan(10);
    expect(k.inside!.alpha).toBeGreaterThan(0);
    expect(suitcaseShown(SUITCASE_AT + 0.3)).toBe(1);
    expect(suitcaseShown(BELLY_AT)).toBe(0);
  });

  it('counts ten days (1 to 10, never back), the sun and the moon going round, then goes face to face with a "?" on "YOU"', () => {
    expect(sceneAt(THEN_AT + 0.2)).toBe('days');
    expect(dayNumber(THEN_AT)).toBe(0);
    expect(dayNumber(TEN_AT + 0.2)).toBe(10);
    let last = 0;
    for (let t = THEN_AT; t < FACE_FROM; t += FRAME) {
      expect(dayNumber(t)).toBeGreaterThanOrEqual(last);
      last = dayNumber(t);
    }
    expect(daysShown(TEN_AT + 0.2)).toBe(1);
    const moons = new Set<number>();
    for (let t = THEN_AT + 0.4; t < TEN_AT; t += FRAME) moons.add(daySky(t).night);
    expect(moons.size).toBe(2);
    expect(sceneAt(BET_AT)).toBe('face');
    expect(questionShown(YOU_AT + 0.3)).toBe(1);
    expect(sceneAt(BACK_FROM + 0.05)).toBe('hook');
    expect(questionShown(BACK_FROM + 0.1)).toBe(0);
    const croc = faceCroc(YOU_AT);
    const cam = faceCamera(YOU_AT);
    const head = headOn(cam, facePython(YOU_AT));
    const c = toScreen(cam, croc.at);
    expect(head.at.y).toBeGreaterThan(c.y);
    expect(head.at.y - c.y).toBeLessThan(900);
    expect(DAYS_FROM).toBeGreaterThan(BELLY_FROM);
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
    expect(top(SPOKEN.y, SPOKEN.size)).toBeGreaterThan(270);
    expect(bottom(SPOKEN.y, SPOKEN.size)).toBeLessThan(1240);
    for (const l of [TEXT.lake, TEXT.australia, TEXT.year, TEXT.days, TEXT.daysWord, TEXT.question]) {
      expect(top(l.y, l.size)).toBeGreaterThan(270);
      expect(bottom(l.y, l.size)).toBeLessThan(1240);
    }
    expect(TEXT.clock.y - TEXT.clock.r).toBeGreaterThan(270);
    expect(TEXT.clock.y + TEXT.clock.r).toBeLessThan(1240);
    // The sky arc (its sun and rays) and the suitcase.
    expect(TEXT.sky.y - 150 - 80).toBeGreaterThan(270);
    expect(TEXT.sky.y + 20).toBeLessThan(1240);
    expect(TEXT.suitcase.y - TEXT.suitcase.w * 0.66 * 0.7).toBeGreaterThan(270);
    expect(TEXT.suitcase.y + TEXT.suitcase.w * 0.66 * 0.5).toBeLessThan(1240);
    // The length labels sit at the middle of their bars, two lines (the second 84 px lower), while the bars show.
    for (let t = TENFOOT_AT; t < THREEFOOT_AT + 1.8; t += FRAME) {
      const { cam, python } = shotAt(t)!;
      const croc = lakeCroc(t);
      const spans: [number, number][] = [];
      if (pythonBar(t) > 0) spans.push([toScreen(cam, python.route.at(python.headS)).y, toScreen(cam, python.route.at(python.headS - python.length)).y]);
      if (crocBar(t) > 0) spans.push([toScreen(cam, { x: croc.at.x, y: croc.at.y - 40 }).y, toScreen(cam, { x: croc.at.x, y: croc.at.y + 40 }).y]);
      for (const [a, b] of spans) {
        const mid = (a + b) / 2;
        expect(top(mid - 10, TEXT.pythonLen.size), `label top at ${t}`).toBeGreaterThan(270);
        expect(bottom(mid + 84, TEXT.pythonLen.size * 0.9), `label bottom at ${t}`).toBeLessThan(1240);
      }
    }
  });

  it('plays every sound effect inside the loop', () => {
    expect(SOUNDS.length).toBeGreaterThan(30);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
      expect(s.gain).toBeGreaterThan(0);
      expect(s.gain).toBeLessThanOrEqual(0.6);
    }
    const near = (id: string, t: number): boolean => SOUNDS.some((s) => s.id === id && Math.abs(s.t - t) < 0.15);
    expect(near('strike', GRABBED_AT)).toBe(true);
    expect(near('swallow', WHOLE_AT)).toBe(true);
    expect(near('swallow', HEAD_AT)).toBe(true);
    expect(near('squeak', SUITCASE_AT)).toBe(true);
  });
});
