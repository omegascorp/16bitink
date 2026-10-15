import { describe, expect, it } from 'vitest';
import { crabAt, HOLES, type Octo, OCTO_K, octoAt, REACHES, SHELL_TOP, trailAt } from '../dev/promo/octopus/motion';
import { BEEPS, FLAT, SOUNDS, THUMPS } from '../dev/promo/octopus/sounds';
import {
  alarmAt, beatAt, blueAt, BOIL_STEPS, boilAt, bodyFlowOffset, captionAt, copperTile, DASH, gillFlowOffset, HEART_IDS, heartRingsAt, HOOK_WORDS, ironCross, ironTile,
  LINES, LOOP_S, monitorAt, numberAt, said, stoppedAt, titleAt, xrayAt,
} from '../dev/promo/octopus/story';
import { TEMPO, WORDS } from '../dev/promo/octopus/words';
import { BOIL } from '../src/art/palette';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;

const tips = (o: Octo): { x: number; y: number }[] => o.arms.map((a) => ({ x: o.x + a[a.length - 1]!.x * OCTO_K, y: o.y + a[a.length - 1]!.y * OCTO_K }));
const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);

describe('promo short: this animal has three hearts (narrated)', () => {
  it('loops: everything at the loop point is where it was at the start', () => {
    const [a, b] = [octoAt(END), octoAt(0)];
    expect(a.x).toBeCloseTo(b.x, 2);
    expect(a.y).toBeCloseTo(b.y, 2);
    expect(a.angle).toBeCloseTo(b.angle, 3);
    tips(a).forEach((p, i) => expect(dist(p, tips(b)[i]!)).toBeLessThan(0.5));
    const [c, d] = [crabAt(END), crabAt(0)];
    expect(c.x).toBeCloseTo(d.x, 2);
    expect(c.hidden).toBeCloseTo(d.hidden, 4);
    for (const f of [xrayAt, blueAt, titleAt, monitorAt, stoppedAt, copperTile, ironTile, ironCross, alarmAt]) expect(f(END)).toBeCloseTo(f(0), 3);
    for (const id of HEART_IDS) {
      expect(numberAt(id, END)).toBeCloseTo(numberAt(id, 0), 3);
      expect(beatAt(id, END)).toBeCloseTo(beatAt(id, 0), 3);
    }
    // The blood's dashes come round a whole number of dash lengths.
    for (const f of [gillFlowOffset, bodyFlowOffset]) {
      const k = f(END) / DASH;
      expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-3);
    }
  });

  it('never jumps: the octopus, its arm tips and the crab move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [ta, tb] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      const [p, q] = [octoAt(ta), octoAt(tb)];
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(25);
      expect(Math.abs(q.angle - p.angle)).toBeLessThan(0.12);
      // The jet whips the arms back fast (up to ~70 px a frame for the outermost); anywhere else they drift.
      tips(p).forEach((tip, i) => expect(dist(tip, tips(q)[i]!)).toBeLessThan(75));
      expect(Math.abs(crabAt(tb).x - crabAt(ta).x)).toBeLessThan(5);
      expect(Math.abs(crabAt(tb).hidden - crabAt(ta).hidden)).toBeLessThan(0.35);
      for (const f of [xrayAt, blueAt, monitorAt, stoppedAt]) expect(Math.abs(f(tb) - f(ta))).toBeLessThan(0.35);
    }
  });

  it('opens on the hook: the octopus seen through, three numbered hearts, "3 hearts", the whole first line, already moving', () => {
    expect(xrayAt(0)).toBe(1);
    for (const id of HEART_IDS) expect(numberAt(id, 0)).toBe(1);
    expect(titleAt(0)).toBe(1);
    expect(captionAt(0)!.line.words.map((w) => w.text).join(' ')).toBe('This animal has THREE hearts.');
    expect(captionAt(0)!.word).toBe(0);
    const [a, b] = [octoAt(0), octoAt(FRAME)];
    expect(Math.hypot(b.x - a.x, b.y - a.y) + dist(tips(a)[0]!, tips(b)[0]!)).toBeGreaterThan(0.2);
    expect(a.angle).toBeCloseTo(0, 1);
  });

  it('turns the blood blue on "BLUE", and shows copper then iron crossed out', () => {
    expect(blueAt(said('is'))).toBe(0);
    expect(blueAt(said('BLUE:') + 0.45)).toBe(1);
    expect(copperTile(said('copper,') - 0.1)).toBe(0);
    expect(copperTile(said('copper,') + 0.3)).toBeGreaterThan(0.9);
    expect(ironTile(said('not') - 0.05)).toBe(0);
    expect(ironCross(said('iron.'))).toBe(0);
    expect(ironCross(said('iron.') + 0.35)).toBe(1);
  });

  it('stops the main heart while it swims (the payoff), the gill hearts beating on, and starts it again once it settles', () => {
    expect(monitorAt(said('stops'))).toBe(1);
    const swim = [said('beating'), said('swims.')];
    for (const t of swim) {
      expect(stoppedAt(t)).toBe(1);
      expect(trailAt(t)).toBeGreaterThan(0.5);
    }
    let gill = 0;
    let main = 0;
    for (let t = swim[0]!; t < swim[1]! + 0.3; t += 0.01) {
      gill = Math.max(gill, beatAt(1, t));
      main = Math.max(main, beatAt(3, t));
    }
    expect(gill).toBeGreaterThan(0.9);
    expect(main).toBe(0);
    expect(stoppedAt(said('stops') - 0.1)).toBe(0);
    expect(stoppedAt(said('crabs:'))).toBe(0);
    // It has jetted up off the middle of the pool, and is back down on the rocks for "Bad news".
    expect(octoAt(said('swims.')).y).toBeLessThan(octoAt(0).y - 150);
    expect(octoAt(said('crabs:')).y).toBeGreaterThan(octoAt(0).y + 100);
    expect(FLAT.from).toBeGreaterThan(said('stops'));
    expect(BEEPS.every((at) => stoppedAt(at) < 0.5)).toBe(true);
  });

  it('hunts crabs by feel: the crab notices on "crabs", an arm taps its shell on "feel" and it hides, arms reach into every hole', () => {
    expect(alarmAt(said('crabs:') + 0.2)).toBeGreaterThan(0.9);
    expect(crabAt(said('feel,') - 0.1).hidden).toBe(0);
    expect(crabAt(said('feel,') + 0.4).hidden).toBe(1);
    expect(crabAt(0).hidden).toBe(0);
    const at = said('hole.') - 0.05;
    const o = octoAt(at);
    for (const r of REACHES) expect(dist(tips(o)[r.arm]!, r.to)).toBeLessThan(25);
    expect(REACHES.map((r) => r.to)).toEqual([SHELL_TOP, HOLES.r1, HOLES.r2, HOLES.m]);
    expect(xrayAt(said('feel,'))).toBe(0);
  });

  it('counts the hearts again, one per word of "Count them again"', () => {
    const counted = [[1, 'Count', 1], [2, 'them', 2], [3, 'again:', 1]] as const;
    for (const [id, word, nth] of counted) {
      expect(numberAt(id, said(word, nth) - 0.1)).toBe(0);
      expect(numberAt(id, said(word, nth) + 0.25)).toBeGreaterThan(0.9);
    }
    expect(xrayAt(said('again:'))).toBe(1);
    // Their rings have spread and gone before the loop point, so the first frame matches the last.
    for (const id of HEART_IDS) for (const u of [...heartRingsAt(id, END), ...heartRingsAt(id, 0)]) expect(u < 0 || u > 1).toBe(true);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('again:');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    expect(LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO).toBeLessThan(0.5);
    expect(TEMPO).toBeGreaterThan(1.05);
    expect(TEMPO).toBeLessThan(1.15);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    expect(LINES[0]!.words.length).toBe(HOOK_WORDS);
    for (const l of LINES.slice(1)) expect(l.words.length).toBeLessThanOrEqual(4);
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(Math.abs(Math.round(LOOP_S / 1.5) - LOOP_S / 1.5)).toBeLessThan(1e-9);
    expect(BOIL_STEPS % BOIL).toBe(0);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END)).toBe(BOIL - 1);
    for (const s of [...SOUNDS.map((x) => x.t), ...THUMPS.map((x) => x.t), ...BEEPS]) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(LOOP_S);
    }
  });
});
