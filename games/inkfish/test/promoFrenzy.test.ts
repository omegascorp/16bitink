import { describe, expect, it } from 'vitest';
import { pitchForSize } from '../src/audio/recipes';
import { drainFrenzy, feedFrenzy, frenzyLabel, frenzyMultiplier, initialFrenzy, MAX_MULTIPLIER } from '../src/logic/frenzy';
import { scoreFor } from '../src/logic/sizing';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';
import { schoolAt, schoolPositions, SCHOOL_FROM, SCHOOL_TO } from '../dev/promo/frenzy/school';
import {
  bubblesAt, CAPTIONS, captionAlpha, FRENZY_AT, floatScores, frenzyShout, growthBar, GULPS, LEVEL, lipsAt, LOOP_S, MEALS, meterAt, multiplierAt, PLAYER_LEN,
  playerFish, playerJaw, playerLump, SOUNDS, STAPLE, storyTime, type WorldFish,
} from '../dev/promo/frenzy/story';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

function expectSameFish(a: WorldFish, b: WorldFish): void {
  expect(b.x).toBeCloseTo(a.x, 1);
  expect(b.y).toBeCloseTo(a.y, 1);
  expect(b.length).toBeCloseTo(a.length, 1);
  expect(b.facing).toBe(a.facing);
  expect(b.tilt).toBeCloseTo(a.tilt, 3);
  expect(b.effort).toBeCloseTo(a.effort, 3);
  expect(wrap(b.beat - a.beat)).toBeCloseTo(0, 3);
}

describe('promo short: ink frenzy (all-you-can-eat buffet)', () => {
  it('loops: you, the school, the jaw, the scores and the HUD are the same either side of the loop point', () => {
    expect(storyTime(END)).toBeCloseTo(storyTime(0), 4);
    expectSameFish(playerFish(0), playerFish(END));
    expect(playerJaw(END)).toBeCloseTo(playerJaw(0), 4);
    expect(playerLump(END).size).toBeCloseTo(playerLump(0).size, 4);
    const a = schoolAt(0);
    const b = schoolAt(END);
    expect(b).toHaveLength(a.length);
    a.forEach((m, i) => {
      expect(b[i]!.kind).toBe(m.kind);
      expectSameFish(m.fish, b[i]!.fish);
    });
    expect(floatScores(END)).toHaveLength(floatScores(0).length);
    // The HUD is hidden across the seam (the run starts afresh), like revenge's growth bar.
    expect(growthBar(END).alpha).toBe(0);
    expect(growthBar(0).alpha).toBe(0);
    expect(frenzyShout(0)).toBeNull();
    expect(frenzyShout(END)).toBeNull();
  });

  it('opens on action: the school is on screen, your jaws are opening and a minnow is at your lips', () => {
    expect(schoolAt(0).length).toBeGreaterThan(10);
    expect(playerJaw(0)).toBeGreaterThan(0.3);
    expect(MEALS[0]!.at).toBeLessThan(0.3);
  });

  it('wraps story time only when nothing on screen depends on it: the school is off stage at both ends', () => {
    for (const s of [SCHOOL_FROM, SCHOOL_TO - 1e-6]) {
      for (const p of schoolPositions(s)) {
        if (p.eaten) continue;
        const off = p.x < -p.length / 2 || p.x > 1080 + p.length / 2 || p.y < -60 || p.y > 1980;
        expect(off).toBe(true);
      }
    }
  });

  it('shows nothing that depends on story time as it wraps (quietly, after the frenzy)', () => {
    const wrapAt = LOOP_S + SCHOOL_FROM;
    for (const t of [wrapAt - 1e-6, wrapAt]) {
      expect(bubblesAt(t)).toHaveLength(0);
      expect(floatScores(t)).toHaveLength(0);
      expect(frenzyShout(t)).toBeNull();
      expect(growthBar(t).alpha).toBe(0);
      expect(playerJaw(t)).toBe(0);
      expect(playerLump(t).size).toBe(0);
      for (const c of CAPTIONS) expect(captionAlpha(c, t)).toBe(0);
    }
    expectSameFish(playerFish(wrapAt - 1e-6), playerFish(wrapAt));
  });

  it('moves smoothly on screen: you, and every minnow until it is swallowed', () => {
    for (let t = 0; t + FRAME < LOOP_S + FRAME; t += FRAME) {
      const u = (t + FRAME) % LOOP_S;
      const a = playerFish(t);
      const b = playerFish(u);
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(30);
      const s = storyTime(t);
      if (storyTime(u) < s) continue;
      const pa = schoolPositions(s);
      const pb = schoolPositions(storyTime(u));
      pa.forEach((p, i) => {
        if (p.eaten || pb[i]!.eaten) return;
        const onStage = p.x > -p.length && p.x < 1080 + p.length && p.y > -p.length && p.y < 1920 + p.length;
        if (!onStage) return;
        // Bolting fish are fast, but never jump.
        expect(Math.hypot(p.x - pb[i]!.x, p.y - pb[i]!.y)).toBeLessThan(110);
      });
    }
  });

  it('keeps the action clear of the captions and the HUD while they show', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      const you = playerFish(t);
      expect(you.y - you.length * 0.3).toBeGreaterThan(480);
      expect(you.y + you.length * 0.3).toBeLessThan(1110);
      for (const m of schoolAt(t)) {
        if (m.fish.y < -60 || m.fish.y > 1980) continue;
        if (m.fish.x < -m.fish.length / 2 || m.fish.x > 1080 + m.fish.length / 2) continue;
        if (storyTime(t) > FRENZY_AT) continue;
        expect(m.fish.y).toBeGreaterThan(500);
        expect(m.fish.y).toBeLessThan(1100);
      }
    }
  });

  it('is the game’s School Rush level: minnows of the staple size, your size from the first stage', () => {
    expect(LEVEL.twists).toContain('rush');
    expect(STAPLE.species).toBe('minnow');
    for (const m of MEALS) {
      expect(m.size).toBeGreaterThanOrEqual(STAPLE.size[0]);
      expect(m.size).toBeLessThanOrEqual(STAPLE.size[1]);
    }
    expect(PLAYER_LEN).toBeGreaterThanOrEqual(170);
  });

  it('climbs the multiplier by the game’s frenzy rules, to x5 and "INK FRENZY!" at the payoff', () => {
    let state = initialFrenzy;
    let last = MEALS[0]!.at;
    for (const m of MEALS) {
      state = drainFrenzy(state, m.at - last);
      last = m.at;
      const mult = frenzyMultiplier(state);
      expect(m.mult).toBe(mult);
      expect(m.gained).toBe(scoreFor(m.size, mult));
      expect(m.text).toBe(mult > 1 ? `+${m.gained} ×${mult}` : `+${m.gained}`);
      state = feedFrenzy(state);
      expect(m.combo).toBe(frenzyMultiplier(state));
    }
    // It climbs, never falls, and only tops out on the last gulp (two at once).
    MEALS.slice(1).forEach((m, i) => expect(m.combo).toBeGreaterThanOrEqual(MEALS[i]!.combo));
    expect(MEALS.filter((m) => m.combo === MAX_MULTIPLIER).every((m) => m.at === FRENZY_AT)).toBe(true);
    expect(MEALS.map((m) => m.combo)).toEqual([1, 2, 2, 3, 4, 4, 5, 5]);
    // The HUD's multiplier holds from meal to meal on the way up: no flicker back down before the payoff.
    for (let t = MEALS[0]!.at; t < FRENZY_AT; t += FRAME / 4) {
      const last = [...MEALS].reverse().find((m) => m.at <= t)!;
      expect(multiplierAt(t).mult).toBe(last.combo);
    }
    expect(MEALS[MEALS.length - 1]!.text).toMatch(/×5$/);
    expect(frenzyLabel(MAX_MULTIPLIER)).toBe('INK FRENZY!');
    // The payoff lands 40-50% of the way in, with the shout up and the HUD's label at the game's values after.
    expect(FRENZY_AT / LOOP_S).toBeGreaterThan(0.4);
    expect(FRENZY_AT / LOOP_S).toBeLessThan(0.5);
    expect(frenzyShout(FRENZY_AT + 0.3)!.alpha).toBe(1);
    expect(multiplierAt(FRENZY_AT + 0.5)).toEqual({ mult: 4, label: 'Frenzy' });
    expect(meterAt(FRENZY_AT)).toBe(1);
    expect(meterAt(FRENZY_AT + 1)).toBeCloseTo(1 - 0.06, 6);
  });

  it('floats every score big and clear: no two overlapping, all above the school’s thick middle', () => {
    const width = (f: { readonly text: string; readonly size: number }): number => f.text.length * 0.42 * f.size;
    for (let t = 0; t < LOOP_S; t += FRAME) {
      const floats = floatScores(t);
      for (const f of floats) {
        expect(f.size).toBeGreaterThanOrEqual(64);
        expect(f.y).toBeLessThan(700);
        expect(f.y - f.size / 2).toBeGreaterThan(440);
      }
      floats.forEach((a, i) => floats.slice(i + 1).forEach((b) => {
        const apartX = Math.abs(a.x - b.x) > (width(a) + width(b)) / 2;
        const apartY = Math.abs(a.y - b.y) > 0.6 * Math.max(a.size, b.size);
        expect(apartX || apartY).toBe(true);
      }));
    }
  });

  it('plays each meal the way the game does: frenzy pitched up the combo when it climbs, a size-pitched eat otherwise', () => {
    for (const m of MEALS) {
      const at = SOUNDS.filter((s) => Math.abs(s.t - m.at) < 1e-9 && (s.id === 'frenzy' || s.id === 'eat'));
      const want = m.combo > m.mult ? { id: 'frenzy', pitch: 0.9 + m.combo * 0.1 } : { id: 'eat', pitch: pitchForSize(m.size) };
      expect(at.some((s) => s.id === want.id && Math.abs(s.pitch - want.pitch) < 1e-9)).toBe(true);
    }
    const climbs = MEALS.filter((m) => m.combo > m.mult).map((m) => 0.9 + m.combo * 0.1);
    expect(climbs).toEqual([...climbs].sort((a, b) => a - b));
  });

  it('swallows every minnow it scores: each one is at your lips when its gulp lands', () => {
    for (const at of GULPS) {
      const lips = lipsAt(at - 1e-4);
      const swallowed = schoolAt(at - 1e-4).filter((m) => m.kind === 'swallowed');
      expect(swallowed).toHaveLength(MEALS.filter((m) => m.at === at).length);
      for (const m of swallowed) expect(Math.hypot(m.fish.x - lips.x, m.fish.y - lips.y)).toBeLessThan(PLAYER_LEN * 0.4);
    }
  });

  it('shows the same words either side of the loop point, with the hook readable in the first frame', () => {
    for (const c of CAPTIONS) expect(captionAlpha(c, END)).toBeCloseTo(captionAlpha(c, 0), 3);
    expect(CAPTIONS.filter((c) => captionAlpha(c, 0) === 1).map((c) => c.text).join(' ')).toBe('me at the all-you-can-eat buffet');
    // The hook is gone before the shout takes its place.
    for (const c of CAPTIONS) expect(captionAlpha(c, FRENZY_AT)).toBe(0);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect((LOOP_S * 30) % 1).toBe(0);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    expect(LOOP_S % 1.5).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
