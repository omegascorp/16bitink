import { describe, expect, it } from 'vitest';
import {
  alarmAt, AWAY_AT, beamAngle, beamLight, BITE_AT, boilAt, BOIL_STEPS, captionAt, dragonAt, eatenAt, FIVE_AT, granulesAt, HITS_AT, hunterAt, hunterLabel,
  lampOn, lensAt, lensRayAt, LENS_RAYS, LINES, LOOP_S, nameLabel, NINETY_AT, numberAt, OFF_AT, ON_AT, ordinaryLabel, PERCENT_AT, pigmentLabel, POINT_AT,
  preyAt, preyGlow, type PreyId, RAYS, readoutAt, reflectedAt, said, SO_AT, SOUNDS, type Fish,
} from '../dev/promo/blackdragon/story';
import { TEMPO, WORDS } from '../dev/promo/blackdragon/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const KEYS = ['x', 'y', 'len', 'face', 'tilt', 'effort', 'jaw', 'lump'] as const;

const same = (a: Fish, b: Fish): void => {
  for (const key of KEYS) expect(a[key]).toBeCloseTo(b[key], 3);
  expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 3);
};

/** How well the beam lights a fish, at its nose, middle and tail. */
const lit = (f: Fish, t: number): number[] => [-0.4, 0, 0.4].map((u) => beamLight(f.x + f.face * -u * f.len, f.y, t));

describe('promo short: this fish is blacker than black (narrated)', () => {
  it('loops: everything at the loop point is where it was at the start', () => {
    same(dragonAt(END), dragonAt(0));
    same(hunterAt(END), hunterAt(0));
    for (const id of ['near', 'meal'] as const) {
      expect(preyAt(id, 0)).toBeNull();
      expect(preyAt(id, END)).toBeNull();
    }
    expect(beamAngle(END)).toBeCloseTo(beamAngle(0), 4);
    expect(lampOn(END)).toBeCloseTo(lampOn(0), 4);
    for (const f of [lensAt, readoutAt, reflectedAt, ordinaryLabel, nameLabel, hunterLabel, pigmentLabel, alarmAt]) expect(f(END)).toBeCloseTo(f(0), 4);
    expect(eatenAt(0)).toBeNull();
    expect(eatenAt(END)).toBeNull();
  });

  it('never jumps: the fish, the beam and the lens move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      for (const at of [dragonAt, hunterAt]) {
        const [p, q] = [at(a), at(b)];
        expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(20);
        expect(Math.abs(q.face - p.face)).toBeLessThan(0.3);
      }
      for (const id of ['near', 'meal'] as PreyId[]) {
        const [p, q] = [preyAt(id, a), preyAt(id, b)];
        if (p && q) expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(60);
      }
      expect(Math.abs(beamAngle(b) - beamAngle(a))).toBeLessThan(0.03);
      expect(Math.abs(lensAt(b) - lensAt(a))).toBeLessThan(0.2);
    }
  });

  it('opens with the lamp swinging onto both fish: the ordinary one and the blackdragon, side by side in the light', () => {
    expect(lampOn(0)).toBe(1);
    expect(Math.abs(beamAngle(FRAME) - beamAngle(0))).toBeGreaterThan(0.003);
    const t = said('than');
    for (const v of lit(hunterAt(t), t)) expect(v).toBeGreaterThan(0.4);
    for (const v of lit(dragonAt(t), t)) expect(v).toBeGreaterThan(0.4);
    expect(ordinaryLabel(0.5)).toBe(1);
  });

  it('builds "99.95%" as it is said, and shows how little comes back on "hits it"', () => {
    expect(numberAt(NINETY_AT - 0.1)).toBe('');
    expect(numberAt(NINETY_AT + 0.05)).toBe('99');
    expect(numberAt(POINT_AT + 0.05)).toBe('99.');
    expect(numberAt(FIVE_AT + 0.05)).toBe('99.95');
    expect(numberAt(PERCENT_AT + 0.05)).toBe('99.95%');
    expect(readoutAt(said('ninety-nine'))).toBe(1);
    expect(reflectedAt(HITS_AT - 0.2)).toBe(0);
    expect(reflectedAt(HITS_AT + 0.4)).toBe(1);
    expect(nameLabel(said("blackdragon's") + 0.3)).toBe(1);
  });

  it('shines rays at both fish while the narrator talks about the light: the blackdragon swallows them, the ordinary fish bounces them back', () => {
    const lampRays = RAYS.filter((r) => r.colour === 'lamp');
    expect(lampRays.length).toBeGreaterThan(8);
    for (const r of lampRays) {
      expect(r.at).toBeGreaterThanOrEqual(said('swallows') - 0.2);
      expect(r.at + 2 * r.travel).toBeLessThan(OFF_AT + 0.1);
      const into = r.to.kind === 'fish' && r.to.who === 'dragon';
      expect(r.back === null).toBe(into);
    }
    expect(lampRays.some((r) => r.back !== null)).toBe(true);
  });

  it('switches the lamp off on "Down in the deep" and lights up the prey on "prey glow"', () => {
    expect(lampOn(said('Down') - 0.05)).toBe(1);
    expect(lampOn(said('deep,'))).toBe(0);
    for (const id of ['near', 'meal'] as const) {
      expect(preyGlow(id, said('prey') - 0.2)).toBe(0);
      expect(preyGlow(id, said('and') + 0.05)).toBe(1);
    }
  });

  it('gives the hunter away: it creeps up into the glow, and on "away" the prey sees it and flees', () => {
    const start = hunterAt(said('Down'));
    const close = hunterAt(AWAY_AT);
    const prey = preyAt('near', AWAY_AT)!;
    expect(Math.hypot(close.x - prey.x, close.y - prey.y)).toBeLessThan(Math.hypot(start.x - prey.x, start.y - prey.y) - 100);
    expect(hunterLabel(said('hunter') + 0.3)).toBe(1);
    expect(alarmAt(AWAY_AT - 0.2)).toBe(0);
    expect(alarmAt(AWAY_AT + 0.3)).toBeGreaterThan(0.9);
    expect(preyAt('near', AWAY_AT + 1)).toBeNull();
    // Its light bounces off the hunter on "bouncing", and vanishes into the blackdragon.
    const glowRays = RAYS.filter((r) => r.colour === 'glow');
    expect(glowRays.some((r) => r.back !== null && Math.abs(r.at - said('bouncing')) < 0.5)).toBe(true);
    expect(glowRays.some((r) => r.back === null)).toBe(true);
  });

  it('lets the blackdragon eat the other one unseen, between "away" and "So"', () => {
    expect(BITE_AT).toBeGreaterThan(WORDS.find((w) => w.text === 'away.')!.end / TEMPO);
    expect(BITE_AT).toBeLessThan(SO_AT);
    expect(eatenAt(BITE_AT - 0.1)).not.toBeNull();
    expect(preyAt('meal', BITE_AT)).toBeNull();
    expect(dragonAt(BITE_AT - 0.2).jaw).toBeGreaterThan(0.5);
    expect(dragonAt(BITE_AT + 0.1).jaw).toBe(0);
    // It was glowing right up to the end: the blackdragon gave nothing away.
    expect(preyGlow('meal', BITE_AT - 0.5)).toBe(1);
  });

  it('magnifies its skin after "So": granules packed in on "packed", labelled on "pigment", rays dying in it on "traps"', () => {
    expect(lensAt(SO_AT - 0.1)).toBe(0);
    expect(lensAt(said('packed'))).toBe(1);
    expect(granulesAt(said('packed') - 0.3)).toBe(0);
    expect(granulesAt(said('pigment'))).toBe(1);
    expect(pigmentLabel(said('pigment') + 0.3)).toBe(1);
    LENS_RAYS.forEach((_, i) => {
      expect(lensRayAt(i, said('traps') - 0.4)).toBeLessThan(0);
      expect(lensRayAt(i, said('light.') + 0.1)).toBeGreaterThan(0.2);
    });
    expect(lensAt(said('lamp'))).toBe(0);
  });

  it('switches the lamp back on at "Shine" and swings it down onto the fish', () => {
    expect(lampOn(said('Shine') - 0.05)).toBe(0);
    expect(lampOn(ON_AT + 0.4)).toBe(1);
    expect(beamAngle(ON_AT)).toBeLessThan(-0.6);
    expect(beamAngle(said('why'))).toBeGreaterThan(beamAngle(said('lamp')));
    // Up in empty water first: the blackdragon stays dark until the swing reaches it.
    expect(Math.max(...lit(dragonAt(ON_AT + 0.3), ON_AT + 0.3))).toBeLessThan(0.1);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('why');
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
