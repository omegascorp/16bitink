import { describe, expect, it } from 'vitest';
import {
  alarmAt, badgeAt, barracudaAt, BITE_AT, boilAt, BOIL_STEPS, captionAt, clownAt, DIES_AT, eatenAt, EGGS, eggAt, LINES, LOOP_S, MOM_AT, RANKED_AT, RANKS, rankOf,
  rankShown, said, SO_AT, SOUNDS, tagsAt, TURNED_AT, type Clown, type Role,
} from '../dev/promo/clownfish/story';
import { TEMPO, WORDS } from '../dev/promo/clownfish/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;

const at = (role: Role, t: number): Clown => {
  const c = clownAt(role, t);
  if (!c) throw new Error(`${role} isn't there at ${t}`);
  return c;
};

const near = (place: { x: number; y: number; len: number }, c: Clown): void => {
  expect(c.x).toBeCloseTo(place.x, 0);
  expect(Math.abs(c.y - place.y)).toBeLessThan(10);
  expect(c.len).toBeCloseTo(place.len, 3);
};

describe("promo short: Nemo's dad should have become his mom (narrated)", () => {
  it('loops: at the loop point C has become A (dad) and D has become B (Nemo), badges, notes and all', () => {
    for (const [late, early] of [['C', 'A'], ['D', 'B']] as const) {
      const [a, b] = [at(late, END), at(early, 0)];
      for (const key of ['x', 'y', 'len', 'face', 'up', 'alpha', 'effort'] as const) expect(a[key]).toBeCloseTo(b[key], 3);
      expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 3);
      expect(badgeAt(late, END)).toEqual(badgeAt(early, 0));
      expect(alarmAt(late, END)).toBeCloseTo(alarmAt(early, 0), 3);
      const shown = (role: Role, t: number): string[] => tagsAt(role, t).filter((x) => x.alpha > 0.001).map((x) => x.text);
      expect(shown(late, END)).toEqual(shown(early, 0));
    }
    // The ones that leave are gone by the end: A died, B was eaten.
    expect(clownAt('A', END)).toBeNull();
    expect(clownAt('B', END)).toBeNull();
    expect(clownAt('C', 0)).toBeNull();
    expect(clownAt('D', 0)).toBeNull();
    // The barracuda carries on through the loop point.
    const [p, q] = [barracudaAt(END)!, barracudaAt(0)!];
    for (const key of ['x', 'y', 'tilt', 'jaw', 'lump', 'effort'] as const) expect(q[key]).toBeCloseTo(p[key], 3);
    EGGS.forEach((_, i) => expect(eggAt(i, END)).toBeCloseTo(eggAt(i, 0), 4));
  });

  it('never jumps: every fish and the barracuda move on smoothly, frame to frame and across the loop point', () => {
    for (const role of ['A', 'B', 'C', 'D'] as const) {
      for (let t = 0; t + FRAME < LOOP_S; t += FRAME) {
        const [p, q] = [clownAt(role, t), clownAt(role, t + FRAME)];
        if (!p || !q) continue;
        expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(40);
        expect(Math.abs(q.len - p.len)).toBeLessThan(25);
      }
    }
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [p, q] = [barracudaAt((t + LOOP_S) % LOOP_S), barracudaAt((t + FRAME + LOOP_S) % LOOP_S)];
      if (!p || !q) continue;
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(60);
    }
  });

  it('opens on the barracuda swimming off with mom inside, dad alarmed', () => {
    const b = barracudaAt(0)!;
    expect(b.lump).toBeGreaterThan(0.5);
    expect(b.x).toBeGreaterThan(0);
    expect(alarmAt('A', 0)).toBeGreaterThan(0.9);
    near(RANKS[1]!, at('A', 0));
    near(RANKS[2]!, at('B', 0));
    expect(badgeAt('A', 0).sex).toBe('male');
  });

  it('turns dad into mom on "…become his mom": he moves up to the top rank and his badge flips', () => {
    expect(badgeAt('A', MOM_AT + 0.3).sex).toBe('female');
    near(RANKS[0]!, at('A', MOM_AT + 0.5));
    near(RANKS[1]!, at('B', MOM_AT + 0.5));
    const struck = tagsAt('A', MOM_AT + 0.2).find((x) => x.text === 'dad')!;
    expect(struck.strike).toBe(1);
    expect(tagsAt('A', MOM_AT + 0.4).find((x) => x.text === 'mom')!.alpha).toBe(1);
  });

  it('hatches two males on "born male", ranked #1–#4 by size on "ranked by size"', () => {
    expect(clownAt('C', said('born') + 0.4)).not.toBeNull();
    expect(clownAt('D', said('male.') + 0.4)).not.toBeNull();
    expect(badgeAt('C', said('male.')).sex).toBe('male');
    expect(badgeAt('D', said('male.')).sex).toBe('male');
    const t = said('the', 2);
    expect(rankShown(t)).toBe(1);
    expect(rankShown(RANKED_AT - 0.2)).toBe(0);
    const ranks = (['A', 'B', 'C', 'D'] as const).map((r) => rankOf(r, t));
    expect(ranks).toEqual([1, 2, 3, 4]);
    // Bigger rank, bigger fish.
    const lens = (['A', 'B', 'C', 'D'] as const).map((r) => at(r, t).len);
    expect([...lens].sort((p, q) => q - p)).toEqual(lens);
  });

  it('names each as the narrator does: female, her mate, waiting', () => {
    const shows = (role: Role, text: string, t: number): boolean => tagsAt(role, t).some((x) => x.text === text && x.alpha > 0.9);
    expect(shows('A', 'female', said('female,') + 0.3)).toBe(true);
    expect(shows('B', 'her mate', said('mate,') + 0.3)).toBe(true);
    expect(shows('C', 'waiting…', said('waiting') + 0.3)).toBe(true);
    expect(shows('D', 'waiting…', said('waiting') + 0.3)).toBe(true);
    expect(shows('A', 'female', said('dies,'))).toBe(false);
  });

  it('kills the female on "dies", and turns her mate female on "…into a female", everyone a rank up', () => {
    expect(at('A', DIES_AT + 0.6).up).toBeCloseTo(-1, 5);
    expect(clownAt('A', TURNED_AT + 1)).toBeNull();
    expect(badgeAt('B', TURNED_AT - 0.3).sex).toBe('male');
    expect(badgeAt('B', TURNED_AT + 0.3).sex).toBe('female');
    const after = TURNED_AT + 0.5;
    near(RANKS[0]!, at('B', after));
    near(RANKS[1]!, at('C', after));
    near(RANKS[2]!, at('D', after));
    expect((['B', 'C', 'D'] as const).map((r) => rankOf(r, after))).toEqual([1, 2, 3]);
  });

  it('labels mom, dad and Nemo on "So…", and the barracuda eats mom on "mother"', () => {
    const t = SO_AT + 0.5;
    expect(tagsAt('B', t).map((x) => x.text)).toContain('mom');
    expect(tagsAt('C', t)[0]).toMatchObject({ text: 'dad', alpha: 1 });
    expect(tagsAt('D', t)[0]).toMatchObject({ text: 'Nemo', alpha: 1 });
    expect(barracudaAt(said('barracuda'))).not.toBeNull();
    expect(alarmAt('B', said('ate'))).toBeGreaterThan(0.9);
    expect(eatenAt(BITE_AT - 0.1)).not.toBeNull();
    expect(clownAt('B', BITE_AT)).toBeNull();
    expect(BITE_AT).toBeGreaterThan(said('mother,'));
    expect(BITE_AT).toBeLessThan(WORDS[WORDS.length - 1]!.end / TEMPO);
    expect(barracudaAt(BITE_AT + 0.1)!.jaw).toBe(0);
    // Gone before the narrator gets to the hatchlings.
    expect(barracudaAt(said('Every'))).toBeNull();
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('mother,');
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
