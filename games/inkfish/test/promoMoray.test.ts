import { describe, expect, it } from 'vitest';
import { grouperAt, snackAt, snackEatenAt } from '../dev/promo/moray/grouper';
import {
  cameraAt, clapAt, crossAt, downArrow, jawLabel, measureAt, mostLabel, nameLabel, narrowLabel, paperLabel, slateAt, stampAt, throatRing, tickAt,
} from '../dev/promo/moray/notes';
import {
  BITE_AT, BOIL_STEPS, boilAt, captionAt, chromisAt, type Fish, GRAB_AT, GULP_AT, headPoint, JAW_LAUNCHED, JAW_REST, jawAlong, LINES, LOOP_S,
  type Moray, morayAt, said, secondJawAt, SOUNDS, TEX_HL,
} from '../dev/promo/moray/story';
import { TEMPO, WORDS } from '../dev/promo/moray/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';
import { ANATOMY } from '../src/art/fish/registry';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const KEYS = ['x', 'y', 'tilt', 'gape', 'lump', 'effort'] as const;

const sameMoray = (a: Moray, b: Moray): void => {
  for (const key of KEYS) expect(a[key]).toBeCloseTo(b[key], 2);
  expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 3);
};
const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);

describe('promo short: Alien\'s second jaw is real (narrated moray)', () => {
  it('draws the moray at its true proportions', () => {
    expect(TEX_HL).toBe(ANATOMY.moray.hl);
  });

  it('loops: everything at the loop point is where it was at the start', () => {
    sameMoray(morayAt(END), morayAt(0));
    const [a, b] = [secondJawAt(END), secondJawAt(0)];
    expect(a.reach).toBeCloseTo(b.reach, 2);
    expect(a.open).toBeCloseTo(b.open, 3);
    for (const f of [chromisAt, grouperAt, snackAt]) {
      expect(f(0)).toBeNull();
      expect(f(END)).toBeNull();
    }
    for (const f of [slateAt, clapAt, jawLabel, nameLabel, measureAt, narrowLabel, crossAt, tickAt, mostLabel, throatRing, downArrow, cameraAt, stampAt, paperLabel]) {
      expect(f(END)).toBeCloseTo(f(0), 3);
    }
  });

  it('never jumps: the moray, its second jaw and the fish move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      const [p, q] = [morayAt(a), morayAt(b)];
      expect(dist(p.nose, q.nose)).toBeLessThan(30);
      expect(Math.abs(q.tilt - p.tilt)).toBeLessThan(0.01);
      // Only the bite snaps the mouth shut in a frame or two.
      if (Math.abs(a - BITE_AT) > 0.1) expect(Math.abs(q.gape - p.gape)).toBeLessThan(0.12);
      expect(Math.abs(jawAlong(secondJawAt(b)) - jawAlong(secondJawAt(a)))).toBeLessThan(0.06);
      for (const at of [chromisAt, grouperAt, snackAt]) {
        const [f, g] = [at(a), at(b)] as [Fish | null, Fish | null];
        if (f && g) expect(dist(f, g)).toBeLessThan(60);
      }
    }
  });

  it('opens on the hook: mid-lunge, mouth wide, the second jaw in its mouth, under the film slate', () => {
    const m = morayAt(0);
    expect(dist(morayAt(FRAME).nose, m.nose)).toBeGreaterThan(1);
    expect(m.gape).toBeGreaterThan(0.35);
    const jaw = secondJawAt(0);
    expect(jaw.reach).toBeGreaterThan(0.9);
    expect(jaw.open).toBe(1);
    expect(secondJawAt(said('REAL.') + 0.1).open).toBe(0);
    expect(slateAt(0)).toBe(1);
    expect(jawLabel(0)).toBe(1);
    expect(captionAt(0)!.line).toBe(LINES[0]);
  });

  it('shows the second jaw resting in its throat on "one in its throat", and the moray named on "moray"', () => {
    expect(secondJawAt(said('throat.')).reach).toBe(0);
    expect(throatRing(said('throat.') + 0.3)).toBe(1);
    expect(jawLabel(said('throat.'))).toBe(1);
    expect(nameLabel(said('moray') + 0.3)).toBe(1);
    expect(slateAt(said('moray'))).toBe(0);
  });

  it('measures the narrow head, fails to suck the chromis in (✗), while a grouper sucks one straight in (✓) on "most fish"', () => {
    expect(measureAt(said('head') + 0.2)).toBe(1);
    expect(narrowLabel(said('narrow') + 0.3)).toBe(1);
    expect(crossAt(said('prey') + 0.3)).toBeGreaterThan(0.9);
    const before = chromisAt(said('suck') - 0.2)!;
    const during = chromisAt(said('prey') + 0.2)!;
    expect(dist(before, during)).toBeLessThan(40);
    expect(grouperAt(said('most'))).not.toBeNull();
    expect(snackEatenAt(GULP_AT - 0.1)).not.toBeNull();
    expect(snackAt(GULP_AT)).toBeNull();
    expect(GULP_AT).toBeGreaterThan(said('most'));
    expect(GULP_AT).toBeLessThan(said('So'));
    expect(tickAt(GULP_AT + 0.3)).toBeGreaterThan(0.9);
    expect(mostLabel(said('fish.'))).toBe(1);
  });

  it('bites the chromis on "bites": it arrives in the jaws where it hovered, held in the mouth', () => {
    expect(Math.abs(BITE_AT - said('bites,'))).toBeLessThan(0.1);
    const free = chromisAt(BITE_AT - 1e-3)!;
    const held = chromisAt(BITE_AT + 1e-3)!;
    expect(dist(free, held)).toBeLessThan(15);
    expect(morayAt(BITE_AT - 0.2).gape).toBeGreaterThan(0.35);
    expect(morayAt(BITE_AT + 0.05).gape).toBeLessThan(0.2);
    // It lunged for it.
    expect(dist(morayAt(BITE_AT).nose, morayAt(said('after')).nose)).toBeGreaterThan(80);
  });

  it('the payoff: the second jaw shoots forward on "shoots", grabs the prey on "grabs", and drags it down on "drags it down"', () => {
    expect(secondJawAt(said('shoots') - 0.05).reach).toBe(0);
    expect(secondJawAt(said('forward,')).reach).toBeGreaterThan(0.95);
    expect(secondJawAt(said('grabs') - 0.1).open).toBe(1);
    expect(secondJawAt(GRAB_AT + 0.05).open).toBe(0);
    // The prey's head is at the jaw's tip when it grabs, and goes down with it.
    const m = morayAt(GRAB_AT);
    const tip = headPoint(m, JAW_LAUNCHED, 2);
    expect(dist(chromisAt(GRAB_AT)!, tip)).toBeLessThan(150);
    const deep = chromisAt(said('down.') + 0.4)!;
    const rest = headPoint(morayAt(said('down.') + 0.4), JAW_REST, 2);
    expect(dist(deep, rest)).toBeLessThan(dist(chromisAt(GRAB_AT)!, rest) - 150);
    expect(secondJawAt(said('down.') + 0.4).reach).toBeLessThan(0.05);
    expect(downArrow(said('drags') + 0.3)).toBe(1);
    expect(morayAt(said('Scientists')).lump).toBeGreaterThan(0.5);
    // Around 40–65 % of the loop.
    expect(said('shoots') / LOOP_S).toBeGreaterThan(0.4);
    expect(said('shoots') / LOOP_S).toBeLessThan(0.65);
  });

  it('films it on "Scientists" and stamps "2007" on "2007"', () => {
    expect(cameraAt(said('Scientists') + 0.3)).toBe(1);
    expect(stampAt(said('2007.') - 0.05)).toBe(0);
    expect(stampAt(said('2007.') + 0.05)).toBe(1);
    expect(paperLabel(said('2007.') + 0.7)).toBe(1);
  });

  it('backs into its crevice on "So if you thought", claps the slate on "movie", and lunges into the loop', () => {
    const So = said('So', 2);
    expect(morayAt(said('movie')).nose.x).toBeLessThan(morayAt(So).nose.x - 60);
    expect(slateAt(said('movie'))).toBe(1);
    expect(clapAt(said('movie') - 0.05)).toBe(1);
    expect(clapAt(said('movie') + 0.1)).toBe(0);
    expect(secondJawAt(said('up,') + 0.25).reach).toBeGreaterThan(0.3);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('up,');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThan(0.2);
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
