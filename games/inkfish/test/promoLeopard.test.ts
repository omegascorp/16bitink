import { describe, expect, it } from 'vitest';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/leopard/script';
import {
  bearAt, boilAt, BOIL_STEPS, BITE_AT, cameraAt, countAt, CUT, decay, dropAt, driftAt, flashAt, glareAt, iceAt, jawsAt, LOOP_S, offerAt, PILE, placeAt, said,
  SCENE_IDS, sceneAlpha, TICK_AT, wrap, yearAt, tagAt, pengTextAt, counterAt, sadAt, zipAt, punchAt, USELESS_AT, WHOD_AT, DAYS_AT, PENGUIN_AT, GRIZZLY_AT, BIGGER_AT,
} from '../dev/promo/leopard/story';
import { TEMPO, WORDS } from '../dev/promo/leopard/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;

describe('promo short: the leopard seal and the photographer (narrated)', () => {
  it('loops: every clocked value at the loop point equals its value at the start', () => {
    expect(wrap(END)).toBeCloseTo(LOOP_S, 5);
    const [a, b] = [jawsAt(0), jawsAt(END)];
    for (const k of ['x', 'y', 'len', 'rot'] as const) expect(b.seal[k], k).toBeCloseTo(a.seal[k], 2);
    expect(Math.cos(b.seal.beat - a.seal.beat)).toBeCloseTo(1, 3);
    expect(b.gape).toBeCloseTo(a.gape, 3);
    expect(b.lid).toBeCloseTo(a.lid, 3);
    for (const k of ['x', 'y', 'rot', 'kick'] as const) expect(b.diver[k], k).toBeCloseTo(a.diver[k], 3);
    const [c0, c1] = [cameraAt(0), cameraAt(END)];
    for (const k of ['zoom', 'rot', 'dx', 'dy'] as const) expect(c1[k], k).toBeCloseTo(c0[k], 3);
    for (const id of SCENE_IDS) expect(sceneAlpha(id, END), id).toBeCloseTo(sceneAlpha(id, 0), 4);
    for (const f of [placeAt, yearAt, tagAt, pengTextAt, counterAt, sadAt, flashAt, punchAt]) {
      expect(f(0), f.name).toBeCloseTo(0, 3);
      expect(f(END), f.name).toBeCloseTo(0, 3);
    }
    expect(countAt(0)).toBe(0);
    expect(countAt(END)).toBe(4);
  });

  it('never jumps: the jaws and the camera move smoothly frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [wrap(t), wrap(t + FRAME)];
      const [j, k] = [jawsAt(a), jawsAt(b)];
      if (Math.abs(a - b) < 1 && sceneAlpha('jaws', a) > 0 && sceneAlpha('jaws', b) > 0) {
        expect(Math.abs(j.gape - k.gape)).toBeLessThan(0.5);
        expect(Math.hypot(j.seal.x - k.seal.x, j.seal.y - k.seal.y)).toBeLessThan(40);
      }
      expect(Math.abs(cameraAt(a).zoom - cameraAt(b).zoom)).toBeLessThan(0.1);
      for (const id of SCENE_IDS) expect(Math.abs(sceneAlpha(id, b) - sceneAlpha(id, a)), id).toBeLessThan(0.35);
    }
  });

  it('opens on the hook: the jaws wide round the diver, big, nothing written, alone in frame', () => {
    expect(sceneAlpha('jaws', 0.3)).toBe(1);
    for (const id of SCENE_IDS.filter((x) => x !== 'jaws')) expect(sceneAlpha(id, 0.3), id).toBe(0);
    const s = jawsAt(0.3);
    expect(s.seal.len).toBeGreaterThanOrEqual(2000);
    expect(s.gape).toBeGreaterThan(0.8);
    // The diver's head is between the jaws: in front of the corner of the mouth, behind the nose.
    expect(s.diver.x).toBeGreaterThan(110);
    expect(s.diver.x).toBeLessThan(206);
    expect(placeAt(0.3) + yearAt(0.3) + tagAt(0.3) + pengTextAt(0.3) + counterAt(0.3)).toBe(0);
    expect(captionAt(0.3)!.line.words.map((w) => w.text).join(' ')).toBe('This leopard seal');
  });

  it('is alive from the first frame: the jaws and the diver tremble, the jaws snap on "MOUTH"', () => {
    const at = [0.3, 1.1, 1.9].map(jawsAt);
    const spread = (f: (x: ReturnType<typeof jawsAt>) => number): number => Math.max(...at.map(f)) - Math.min(...at.map(f));
    expect(spread((x) => x.gape) + spread((x) => x.diver.x) + spread((x) => x.diver.rot)).toBeGreaterThan(0.05);
    expect(jawsAt(said('MOUTH.') + 0.12).gape).toBeLessThan(jawsAt(said('MOUTH.') - 0.2).gape - 0.15);
    expect(cameraAt(said('MOUTH.') + 0.3).zoom).toBeGreaterThan(cameraAt(said('MOUTH.') - 0.3).zoom + 0.02);
  });

  it('puts every noun on screen as it is said', () => {
    // "Antarctica" and "two thousand six": ice overhead, the seal and the diver, the place and the year.
    expect(sceneAlpha('ice', said('Antarctica,') + 0.3)).toBe(1);
    expect(placeAt(said('Antarctica,') + 0.3)).toBe(1);
    expect(yearAt(said('two thousand six.') + 0.3)).toBe(1);
    expect(yearAt(said('Antarctica,') + 0.1)).toBe(0);
    expect(iceAt(said('two thousand six.')).seal.x).toBeGreaterThan(iceAt(said('Antarctica,')).seal.x);
    // "grizzly": the bear is there with the tag, and the seal's head is the bigger one.
    expect(sceneAlpha('bear', GRIZZLY_AT)).toBe(1);
    expect(tagAt(GRIZZLY_AT + 0.3)).toBe(1);
    expect(bearAt(GRIZZLY_AT + 0.3).seal.len).toBeGreaterThan(bearAt(BIGGER_AT - 0.2).seal.len + 300);
    expect(bearAt(GRIZZLY_AT).bear.len).toBeLessThan(bearAt(GRIZZLY_AT).seal.len / 3);
    // "PENGUIN!": the seal with a penguin in her jaws and the word.
    expect(sceneAlpha('offer', PENGUIN_AT)).toBe(1);
    expect(pengTextAt(PENGUIN_AT + 0.2)).toBe(1);
    expect(offerAt(PENGUIN_AT).pop).toBeGreaterThan(0.9);
    // "Then another. And another.": a penguin lands on each; a day counter 1 to 4 on "four DAYS".
    expect(PILE.length).toBeGreaterThanOrEqual(7);
    for (const at of [said('another.'), said('And', 1), said('another.', 2)]) expect(PILE.filter((p) => p.at <= at + 0.1).length).toBeGreaterThanOrEqual(2);
    expect(TICK_AT).toHaveLength(4);
    expect(TICK_AT[3]).toBeCloseTo(DAYS_AT, 5);
    for (let n = 1; n <= 4; n++) expect(countAt(TICK_AT[n - 1]! + 0.01)).toBe(n);
    expect(counterAt(DAYS_AT)).toBe(1);
    expect(counterAt(CUT.glare + 0.3)).toBe(0);
    // "useless hunter": a penguin zips past the diver; "starve": the diver sinks, the seal looks on.
    expect(zipAt(USELESS_AT + 0.3).on).toBe(1);
    expect(zipAt(USELESS_AT + 0.3).x).toBeLessThan(zipAt(USELESS_AT).x);
    expect(driftAt(WHOD_AT + 0.6).diver.y).toBeGreaterThan(driftAt(WHOD_AT - 0.3).diver.y + 60);
    expect(driftAt(WHOD_AT + 0.6).sealIn).toBeGreaterThan(0.8);
  });

  it('lets go on "bite": the jaws open wide, the diver slides out, then stillness', () => {
    const [before, after, later] = [jawsAt(said('didn\'t') - 0.1), jawsAt(BITE_AT + 0.6), jawsAt(BITE_AT + 1.0)];
    expect(before.gape).toBeLessThan(0.6);
    expect(after.gape).toBeGreaterThan(0.95);
    expect(after.diver.x).toBeGreaterThan(before.diver.x + 120);
    expect(Math.abs(later.diver.x - after.diver.x)).toBeLessThan(40);
    expect(sceneAlpha('jaws', BITE_AT)).toBe(1);
    expect(flashAt(BITE_AT + 0.17)).toBeGreaterThan(0.1);
  });

  it('plops each penguin in from above and lets it settle', () => {
    for (const p of PILE.slice(1)) {
      expect(dropAt(p.at - 0.1, p.at).here).toBe(false);
      expect(dropAt(p.at + 0.05, p.at).dy).toBeLessThan(-300);
      expect(dropAt(p.at + 0.4, p.at).dy).toBeCloseTo(0, 1);
      expect(dropAt(p.at + 0.45, p.at).squash).toBeGreaterThan(0.3);
      expect(dropAt(p.at + 1.5, p.at).squash).toBeLessThan(0.01);
    }
  });

  it('gives the seal a flat stare on "He says", and sad eyes on "who\'d starve"', () => {
    const g = glareAt(said('thought'));
    expect(g.lid).toBeGreaterThan(0.35);
    expect(g.slant).toBeGreaterThan(0.3);
    expect(g.len).toBeGreaterThan(2000);
    expect(sceneAlpha('glare', said('thought'))).toBe(1);
    expect(sadAt(said('starve.') + 0.2)).toBe(1);
    expect(sceneAlpha('drift', said('starve.'))).toBe(1);
    expect(driftAt(said('starve.') + 0.2).sad).toBe(1);
  });

  it('comes back to the jaws on "And it all started when": frame 1 again', () => {
    expect(sceneAlpha('jaws', said('started'))).toBe(1);
    expect(sceneAlpha('drift', said('started'))).toBe(0);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('when');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    expect(LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO).toBeLessThan(0.5);
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
    expect(decay(0, 1, 1)).toBe(0);
  });
});
