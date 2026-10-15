import { describe, expect, it } from 'vitest';
import {
  apexLabel, bracketDrawn, bracketShown, captionAt, dinosLabel, firstSharksLabel, firstTreesLabel, hookTags, LINES, momentLit, nowAt, readoutAt, SOUNDS,
  survivedLabel,
  windingAt, yearAt, yearText,
} from '../dev/promo/trees/script';
import {
  alarmAt, asteroidAt, BITE_AT, DINOS_BACK_AT, boilAt, BOIL_STEPS, camAt, DINOS, dinoFall, eatenAt, FIRST_TREE, hikerAt, IMPACT_AT, IMPACT_MYR, LOOP_S, MID_X, preyAt,
  REWIND_FROM, said, screenX, shakeAt, sharkAt, sinceImpact, TODAY_CAM, treeGrowth, type Fish,
} from '../dev/promo/trees/story';
import { TEMPO, WORDS } from '../dev/promo/trees/words';
import { HOOK_TREE } from '../dev/promo/trees/world';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const KEYS = ['x', 'y', 'len', 'face', 'tilt', 'effort', 'jaw', 'lump', 'ink'] as const;
const onScreen = (x: number): boolean => x > 0 && x < 1080;

const same = (a: Fish, b: Fish): void => {
  for (const key of KEYS) expect(a[key]).toBeCloseTo(b[key], 3);
  expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 3);
};

describe('promo short: sharks are older than trees (narrated)', () => {
  it('loops: the camera, the shark, the hiker and every note are where they were at the start', () => {
    expect(camAt(END)).toBeCloseTo(camAt(0), 4);
    same(sharkAt(END), sharkAt(0));
    const [h0, h1] = [hikerAt(0)!, hikerAt(END)!];
    expect(h1.x).toBeCloseTo(h0.x, 1);
    expect(Math.cos(h1.step - h0.step)).toBeCloseTo(1, 3);
    for (const f of [hookTags, readoutAt, firstSharksLabel, firstTreesLabel, bracketShown, dinosLabel, survivedLabel, apexLabel]) expect(f(END)).toBeCloseTo(f(0), 4);
    expect(dinoFall(END)).toBe(1);
    expect(dinoFall(0)).toBe(1);
    for (const f of [preyAt, eatenAt, asteroidAt, sinceImpact]) {
      expect(f(0)).toBeNull();
      expect(f(END)).toBeNull();
    }
    expect(shakeAt(0)).toEqual({ x: 0, y: 0 });
    expect(shakeAt(END)).toEqual({ x: 0, y: 0 });
  });

  it('never jumps: the shark, the camera and the hiker move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      const [p, q] = [sharkAt(a), sharkAt(b)];
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(30);
      expect(Math.abs(q.face - p.face)).toBeLessThan(0.3);
      expect(Math.abs(q.len - p.len)).toBeLessThan(10);
      // The camera races along the timeline in the rewind (~150 px a frame, streaked), but never teleports.
      expect(Math.abs(camAt(b) - camAt(a))).toBeLessThan(20);
      const [g, h] = [hikerAt(a), hikerAt(b)];
      if (g && h && onScreen(g.x)) expect(Math.abs(h.x - g.x)).toBeLessThan(150);
      const [m, n] = [preyAt(a), preyAt(b)];
      if (m && n) expect(Math.hypot(n.x - m.x, n.y - m.y)).toBeLessThan(40);
    }
  });

  it('opens on the hook itself: today, the shark swimming past the big tree, both tagged with their ages', () => {
    expect(camAt(0)).toBe(TODAY_CAM);
    expect(onScreen(screenX(HOOK_TREE, camAt(0)))).toBe(true);
    const [s0, s1] = [sharkAt(0), sharkAt(said('TREES.'))];
    expect(s0.face).toBe(1);
    expect(s0.ink).toBe(1);
    expect(s1.x - s0.x).toBeGreaterThan(100);
    expect(hookTags(0)).toBe(1);
    expect(hookTags(said('TREES.'))).toBe(1);
    expect(onScreen(hikerAt(0)!.x)).toBe(true);
    // Nothing from the past on screen today: the dinosaurs are long gone, the first tree far off to the left.
    expect(screenX(FIRST_TREE, camAt(0))).toBeLessThan(-1000);
  });

  it('rewinds to 450 million years ago on "The first sharks…", landing as "fifty" is said, the shark a silhouette', () => {
    expect(camAt(REWIND_FROM)).toBe(TODAY_CAM);
    expect(windingAt(said('swam'))).toBe(-1);
    expect(camAt(said('fifty'))).toBeCloseTo(450, 0);
    expect(yearAt(said('fifty') + 0.05)).toBe(450);
    expect(yearText(450)).toBe('450 million years ago');
    expect(readoutAt(said('fifty'))).toBe(1);
    expect(sharkAt(said('fifty')).ink).toBe(0);
    expect(firstSharksLabel(said('four'))).toBe(1);
    expect(hookTags(said('swam'))).toBe(0);
    // Past the dinosaurs, who stand up again once the rewind has carried them out of sight.
    expect(dinoFall(DINOS_BACK_AT - 0.01)).toBe(1);
    expect(dinoFall(DINOS_BACK_AT)).toBe(0);
    for (const d of DINOS) expect(screenX(d.myr, camAt(DINOS_BACK_AT))).toBeGreaterThan(1300);
  });

  it('grows the first tree on "grew", and brackets the 60 million years between them on "sixty" (the payoff, ~45% in)', () => {
    expect(treeGrowth(said('grew') - 0.15)).toBe(0);
    expect(treeGrowth(said('grew') + 1)).toBe(1);
    expect(yearAt(said('grew') + 0.05)).toBe(390);
    expect(firstTreesLabel(said('sixty'))).toBe(1);
    const t = said('sixty') + 0.4;
    for (const myr of [450, FIRST_TREE]) expect(onScreen(screenX(myr, camAt(t)))).toBe(true);
    expect(bracketDrawn(said('sixty') - 0.15)).toBe(0);
    expect(bracketDrawn(t)).toBe(1);
    expect(bracketShown(t)).toBe(1);
    expect(said('sixty') / LOOP_S).toBeGreaterThan(0.4);
    expect(said('sixty') / LOOP_S).toBeLessThan(0.5);
  });

  it('fast forwards to the asteroid on "Sharks survived…": it hits on "asteroid", and the dinosaurs fall on "wiped out the dinosaurs"', () => {
    expect(windingAt(said('survived'))).toBe(1);
    const at = said('asteroid');
    expect(Math.abs(camAt(at) - IMPACT_MYR)).toBeLessThan(6);
    expect(yearAt(at + 0.05)).toBe(66);
    expect(asteroidAt(at)).not.toBeNull();
    expect(IMPACT_AT).toBeLessThan(said('wiped'));
    expect(sinceImpact(IMPACT_AT + 0.1)).not.toBeNull();
    for (const d of DINOS) expect(onScreen(screenX(d.myr, camAt(at)))).toBe(true);
    expect(dinoFall(said('wiped'))).toBe(0);
    expect(dinoFall(said('and', 2))).toBeGreaterThan(0.9);
    expect(dinosLabel(said('dinosaurs,') + 0.2)).toBe(1);
    // The shark swims on through it, inked in again, and is labelled a survivor.
    const s = sharkAt(at + 0.5);
    expect(s.ink).toBe(1);
    expect(onScreen(s.x)).toBe(true);
    expect(survivedLabel(said('dinosaurs,') + 0.2)).toBe(1);
  });

  it('comes home to today on "they\'re still…", and the shark sucks in a mackerel on "food chain"', () => {
    expect(camAt(said('top'))).toBeCloseTo(TODAY_CAM, 0);
    expect(yearText(yearAt(said('top')))).toBe('today');
    expect(apexLabel(said('top') + 0.3)).toBe(1);
    expect(alarmAt(said('top'))).toBeGreaterThan(0.9);
    expect(BITE_AT).toBeGreaterThan(said('food'));
    expect(BITE_AT).toBeLessThan(said('chain.') + 0.1);
    expect(eatenAt(BITE_AT - 0.1)).not.toBeNull();
    expect(preyAt(BITE_AT)).toBeNull();
    expect(sharkAt(BITE_AT - 0.2).jaw).toBeGreaterThan(0.5);
    expect(sharkAt(BITE_AT + 0.1).jaw).toBe(0);
    expect(sharkAt(BITE_AT + 0.4).lump).toBeGreaterThan(0.3);
  });

  it('walks the hiker through the forest on "walk through a forest" while the shark patrols beneath, and turns it back on "remember"', () => {
    for (const w of ['walk', 'forest,']) {
      const t = said(w);
      const h = hikerAt(t)!;
      expect(onScreen(h.x)).toBe(true);
      // Under today's forest, not out on the bare left.
      expect(h.x).toBeGreaterThan(MID_X);
      const s = sharkAt(t);
      expect(onScreen(s.x)).toBe(true);
      expect(s.face).toBe(-1);
    }
    expect(sharkAt(said('remember:') + 0.6).face).toBe(1);
    expect(hookTags(said('remember:') + 0.25)).toBe(1);
    // The hiker is carried away to the right by the rewind before it's dropped.
    expect(hikerAt(REWIND_FROM + 1.2)).toBeNull();
    expect(hikerAt(REWIND_FROM + 1.05)!.x).toBeGreaterThan(1100);
  });

  it('points the red ▼ on the ruler at where the story is, and lights each moment\'s number only while it\'s there', () => {
    const at = (t: number): number => nowAt(t);
    for (const t of [0, said('TREES.'), said('top'), said('remember:'), END]) {
      expect(at(t)).toBe(0);
      expect(screenX(at(t), camAt(t))).toBeLessThan(1080);
      for (const m of [450, FIRST_TREE, IMPACT_MYR]) expect(momentLit(m, t)).toBe(false);
    }
    expect(at(said('fifty') + 0.05)).toBe(450);
    expect(at(said('grew') + 0.05)).toBe(FIRST_TREE);
    expect(at(said('asteroid'))).toBe(IMPACT_MYR);
    expect(momentLit(450, said('million') + 0.1)).toBe(true);
    for (const m of [450, FIRST_TREE]) expect(momentLit(m, said('sixty') + 0.2)).toBe(true);
    expect(momentLit(IMPACT_MYR, said('sixty'))).toBe(false);
    expect(momentLit(IMPACT_MYR, said('asteroid'))).toBe(true);
    expect(momentLit(IMPACT_MYR, said('dinosaurs,'))).toBe(true);
    // It slides along with the story, never jumping.
    for (let t = 0; t < LOOP_S; t += FRAME) expect(Math.abs(at(t + FRAME) - at(t))).toBeLessThan(20);
    // The hook's comparison is gone before the readout comes in.
    expect(hookTags(REWIND_FROM + 0.05)).toBe(0);
    expect(readoutAt(REWIND_FROM + 0.05)).toBe(0);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('remember:');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeLessThan(0.5);
    expect(TEMPO).toBeLessThanOrEqual(1.15);
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
    expect(captionAt(0)!.line.words[0]!.text).toBe('Sharks');
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
    // A big low boom on the impact, and nothing comic on the extinction beat.
    expect(SOUNDS.some((s) => s.id === 'boom' && Math.abs(s.t - IMPACT_AT) < 0.05 && s.pitch < 1)).toBe(true);
    const grim = SOUNDS.filter((s) => s.t > IMPACT_AT - 0.5 && s.t < said('and', 2));
    for (const s of grim) expect(['boom', 'lunge', 'dash', 'smash']).toContain(s.id);
  });
});
