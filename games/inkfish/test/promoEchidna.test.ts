import { describe, expect, it } from 'vitest';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/echidna/script';
import {
  boilAt, BOIL_STEPS, cameraAt, coughAt, drainAt, everythingAt, fineSharkAt, fineTagAt, flashAt, hookAt, islandLineAt, legsAt, LOOP_S, metricAt, MOUTH_PART, PASSES, placeLineAt, reefLineAt, said, SCENE_IDS,
  sceneAlpha, sharkTagLabelAt, shockAge, sizeBarAt, spinesAt, tagOnAt, tagSharkAt, tagWordAt, usAt, wrap, yearAt, echidnaLabelAt, sadEchidna, leanAt,
} from '../dev/promo/echidna/story';
import { TEMPO, WORDS } from '../dev/promo/echidna/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);

describe('promo short: this shark swallowed a spiky animal (narrated)', () => {
  it('loops: every clocked value at the loop point equals its value at the start', () => {
    expect(wrap(END)).toBeCloseTo(LOOP_S, 5);
    const [a, b] = [hookAt(0), hookAt(END)];
    for (const k of ['x', 'y', 'len', 'rot'] as const) expect(b.shark[k], k).toBeCloseTo(a.shark[k], 3);
    expect(b.shark.bend).toBeCloseTo(a.shark.bend, 3);
    expect(Math.cos(b.shark.beat - a.shark.beat)).toBeCloseTo(1, 3);
    for (const k of ['gape', 'fear', 'lid', 'push', 'tint'] as const) expect(b[k], k).toBeCloseTo(a[k], 3);
    expect(b.passes).toEqual([]);
    expect(a.passes).toEqual([]);
    expect(a.focus).toBe(0);
    expect(b.focus).toBe(0);
    const [c0, c1] = [cameraAt(0), cameraAt(END)];
    for (const k of ['zoom', 'rot', 'dx', 'dy'] as const) expect(c1[k], k).toBeCloseTo(c0[k], 3);
    for (const id of SCENE_IDS) expect(sceneAlpha(id, END), id).toBeCloseTo(sceneAlpha(id, 0), 4);
    for (const f of [placeLineAt, islandLineAt, reefLineAt, yearAt, metricAt, usAt, sharkTagLabelAt, tagWordAt, echidnaLabelAt, spinesAt, legsAt, everythingAt, fineTagAt, drainAt, flashAt, tagOnAt, sizeBarAt]) {
      expect(f(0), f.name).toBeCloseTo(f === tagOnAt || f === sizeBarAt ? 0 : 0, 3);
    }
    for (const f of [placeLineAt, islandLineAt, reefLineAt, yearAt, metricAt, usAt, sharkTagLabelAt, tagWordAt, echidnaLabelAt, spinesAt, legsAt, everythingAt, fineTagAt, drainAt, flashAt]) {
      expect(f(END), f.name).toBeCloseTo(0, 3);
    }
  });

  it('never jumps: the shark, the camera and the scene fades move smoothly frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [wrap(t), wrap(t + FRAME)];
      expect(dist(hookAt(a).shark, hookAt(b).shark)).toBeLessThan(30);
      expect(Math.abs(cameraAt(a).zoom - cameraAt(b).zoom)).toBeLessThan(0.1);
      if (sceneAlpha('hook', a) > 0 && sceneAlpha('hook', b) > 0) expect(Math.abs(hookAt(a).push - hookAt(b).push)).toBeLessThan(0.2);
      for (const id of SCENE_IDS) expect(Math.abs(sceneAlpha(id, b) - sceneAlpha(id, a)), id).toBeLessThan(0.35);
    }
  });

  it('opens on the hook: the shark close and big, jaws open, the echidna going into its mouth, nothing written', () => {
    expect(sceneAlpha('hook', 0.3)).toBe(1);
    for (const id of SCENE_IDS.filter((x) => x !== 'hook')) expect(sceneAlpha(id, 0.3), id).toBe(0);
    for (const t of [0.3, 1.5, 2.4]) {
      const h = hookAt(t);
      expect(h.shark.len).toBeGreaterThanOrEqual(2000);
      expect(h.shark.face).toBe(1);
      expect(h.gape).toBeGreaterThan(0.6);
      expect(h.push).toBeGreaterThan(0.3);
      expect(h.passes).toEqual([]);
    }
    // The shore above the water is soft until "LAND", then sharp.
    expect(hookAt(0.3).focus).toBe(0);
    expect(hookAt(said('animal…')).focus).toBe(0);
    expect(hookAt(said('LAND!') + 0.5).focus).toBe(1);
    expect(placeLineAt(0.3) + yearAt(0.3) + metricAt(0.3) + usAt(0.3) + echidnaLabelAt(0.3) + tagWordAt(0.3)).toBe(0);
    expect(captionAt(0.3)!.line.words.map((w) => w.text).join(' ')).toBe('This shark');
  });

  it('is alive from the first frame: the jaws work and the echidna is pushed to and fro', () => {
    let [glo, ghi, plo, phi] = [Infinity, -Infinity, Infinity, -Infinity];
    for (let t = 0; t < 3; t += FRAME) {
      glo = Math.min(glo, hookAt(t).gape);
      ghi = Math.max(ghi, hookAt(t).gape);
      plo = Math.min(plo, hookAt(t).push);
      phi = Math.max(phi, hookAt(t).push);
    }
    expect(ghi - glo).toBeGreaterThan(0.08);
    expect(phi - plo).toBeGreaterThan(0.08);
  });

  it('puts every noun on screen as it is said', () => {
    // "This shark swallowed a spiky animal… from LAND!": the shark, the echidna, the shore.
    expect(sceneAlpha('hook', said('shark'))).toBe(1);
    expect(hookAt(said('animal…')).push).toBeGreaterThan(0.3);
    // "Australia, twenty twenty-two."
    expect(sceneAlpha('place', said('Australia,') + 0.3)).toBe(1);
    expect(placeLineAt(said('Australia,') + 0.3)).toBe(1);
    expect(islandLineAt(said('Australia,') + 0.6)).toBe(1);
    expect(yearAt(said('twenty twenty-two.') + 0.3)).toBe(1);
    // "Scientists caught a ten-foot tiger shark to tag it…": the researchers, the shark, 3 m over 10 ft, the tag.
    expect(sceneAlpha('tag', said('Scientists') + 0.2)).toBe(1);
    expect(leanAt(said('Scientists') + 0.7)).toBeGreaterThan(0.9);
    expect(tagSharkAt(said('caught') + 0.8).x).toBeLessThan(700);
    expect(metricAt(said('ten-foot') + 0.4)).toBe(1);
    expect(usAt(said('ten-foot') + 0.5)).toBe(1);
    expect(sharkTagLabelAt(said('tiger') + 0.1)).toBe(1);
    expect(tagOnAt(said('tag') + 0.4)).toBe(1);
    expect(tagWordAt(said('tag') + 0.2)).toBe(1);
    // "and it coughed up a whole ECHIDNA!": the jaws open, the echidna comes out, then big and named.
    expect(sceneAlpha('cough', said('coughed') + 0.1)).toBe(1);
    expect(coughAt(said('coughed') - 0.3).gape).toBe(0);
    expect(coughAt(said('coughed') + 0.3).gape).toBeGreaterThan(0.5);
    expect(coughAt(said('coughed') - 0.05).fly).toBe(0);
    expect(coughAt(said('coughed') + 0.1).fly).toBeLessThan(MOUTH_PART);
    expect(coughAt(said('ECHIDNA!') + 0.4).fly).toBe(1);
    expect(coughAt(said('ECHIDNA!') + 0.4).echidna.len).toBeGreaterThanOrEqual(600);
    expect(echidnaLabelAt(said('ECHIDNA!') + 0.3)).toBe(1);
    expect(shockAge(said('ECHIDNA!'))).toBe(0);
    // "Spines, legs, everything.": each part lit as it is said, one at a time.
    expect(spinesAt(said('Spines,') + 0.2)).toBe(1);
    expect(legsAt(said('Spines,') + 0.2)).toBe(0);
    expect(legsAt(said('legs,') + 0.2)).toBe(1);
    expect(spinesAt(said('legs,') + 0.2)).toBe(0);
    expect(everythingAt(said('everything.') + 0.2)).toBe(1);
    // "The echidna didn't make it…": the deck, the echidna lying still, the colour drained.
    expect(sceneAlpha('sad', said('echidna') + 0.1)).toBe(1);
    expect(drainAt(said('echidna') + 0.2)).toBeGreaterThan(0.9);
    expect(sadEchidna(said('echidna')).len).toBeGreaterThan(600);
    // "the shark was totally fine.": bright again, the shark off with its tag.
    expect(sceneAlpha('fine', said('shark', 3))).toBe(1);
    expect(drainAt(said('totally'))).toBe(0);
    expect(fineTagAt(said('fine.') + 0.2)).toBe(1);
    expect(fineSharkAt(said('fine.') + 0.9).x).toBeGreaterThan(fineSharkAt(said('shark', 3)).x);
    expect(fineSharkAt(said('fine.') + 0.9).len).toBeLessThan(fineSharkAt(said('shark', 3)).len);
    // "Tiger sharks eat almost ANYTHING.": a turtle, a seabird and a tyre pass the open mouth.
    expect(sceneAlpha('hook', said('sharks') + 0.2)).toBe(1);
    expect(PASSES.map((p) => p.kind)).toEqual(['turtle', 'bird', 'tyre']);
    expect(hookAt(said('eat') - 0.2).passes.map((p) => p.kind)).toContain('turtle');
    expect(hookAt(said('almost') + 0.05).passes.map((p) => p.kind)).toContain('bird');
    expect(hookAt(said('ANYTHING.') + 0.1).passes.map((p) => p.kind)).toContain('tyre');
    expect(hookAt(said('ANYTHING.') + 0.1).gape).toBeGreaterThan(0.6);
  });

  it('writes the narrated unit (10 ft) big with the metric (3 m) under it, smaller', () => {
    expect(TEXT.metric.y).toBeLessThan(TEXT.us.y);
    expect(TEXT.metric.size).toBeGreaterThan(TEXT.us.size);
  });

  it('shows no labels or numbers for the first 2.5 s of the picture', () => {
    for (let t = 0; t <= 2.5; t += FRAME) {
      expect(placeLineAt(t) + islandLineAt(t) + reefLineAt(t) + yearAt(t) + metricAt(t) + usAt(t) + sharkTagLabelAt(t) + tagWordAt(t) + echidnaLabelAt(t), `t=${t}`).toBe(0);
    }
  });

  it('comes back to frame 1 for the seam: the echidna slides back into the mouth on "So yes,"', () => {
    expect(sceneAlpha('hook', said('So') + 0.1)).toBe(1);
    expect(sceneAlpha('fine', said('So') + 0.1)).toBe(0);
    expect(hookAt(said('So')).push).toBeLessThan(hookAt(END).push);
    expect(hookAt(said('eat')).tint).toBeGreaterThan(0.3);
    expect(hookAt(said('eat')).push).toBeLessThan(0);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('yes,');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeLessThan(0.5);
    expect(TEMPO).toBeLessThanOrEqual(1.15);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(19);
    }
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
    expect(captionAt(0)!.line).toBe(LINES[0]);
    for (let t = 0; t < LOOP_S; t += FRAME) expect(captionAt(t), `t=${t}`).not.toBeNull();
  });

  it('keeps every text line inside the area the apps leave clear (y 270 to 1250)', () => {
    for (const [name, line] of Object.entries(TEXT)) {
      expect(line.y, name).toBeGreaterThanOrEqual(270);
      expect(line.y, name).toBeLessThanOrEqual(1250);
      expect(line.y - line.size * 0.72, name).toBeGreaterThanOrEqual(270);
    }
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

  it('changes the sound with the mood: a low sad note, a cough, a gulp for each swallowed thing', () => {
    expect(SOUNDS.some((s) => s.id === 'drop' && s.pitch < 0.35 && Math.abs(s.t - said('The') ) < 0.5)).toBe(true);
    expect(SOUNDS.some((s) => s.id === 'smash' && Math.abs(s.t - said('coughed')) < 0.1)).toBe(true);
    expect(SOUNDS.filter((s) => s.id === 'eat' || s.id === 'eatBig')).toHaveLength(3);
  });
});
