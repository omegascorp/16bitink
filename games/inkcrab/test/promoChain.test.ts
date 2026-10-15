import { describe, expect, it } from 'vitest';
import { SLOT_FACING, SLOT_X, SLOT_Y } from '../dev/promo/chain/layout';
import {
  ARRIVE, type CrabPose, crabsAt, LEAVE, NEWCOMER_IN, type ShellPose, shellsAt, SHELL_LANDS, SLOT_SIZES, SLOTS, waveAt, widthOf,
} from '../dev/promo/chain/queue';
import { SOUNDS } from '../dev/promo/chain/sounds';
import {
  bigShellLabel, biggestLabel, boilAt, BOIL_STEPS, captionAt, chainArcAt, clockAt, ended, headingAt, headingWritten, hintArcsAt, hoursLabel, LINES,
  LOOP_S, paperLabel, rulerAt, said, secondsLabel, smallestLabel, stopwatchAt, waitAt,
} from '../dev/promo/chain/story';
import { TEMPO, WORDS } from '../dev/promo/chain/words';
import { BOIL } from '../src/art/palette';
import { BOIL_FPS } from '../dev/promo/sprites';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const PROPS = [bigShellLabel, hintArcsAt, waitAt, clockAt, hoursLabel, rulerAt, biggestLabel, smallestLabel, stopwatchAt, secondsLabel, paperLabel, (t: number) => headingAt(t) * headingWritten(t)];

const inShell = (t: number): Map<number, Extract<CrabPose, { mode: 'in' }>> =>
  new Map(crabsAt(t).flatMap((c) => (c.mode === 'in' ? [[c.slot, c] as const] : [])));
const naked = (t: number): Extract<CrabPose, { mode: 'naked' }>[] => crabsAt(t).flatMap((c) => (c.mode === 'naked' ? [c] : []));
/** The shells resting in their slots (not the one the wave is rolling in). */
const resting = (t: number): Map<number, ShellPose> => new Map(shellsAt(t).filter((s) => !s.rolling).map((s) => [s.slot, s] as const));

describe('promo short: hermit crabs queue up to swap houses (narrated)', () => {
  it('loops: the line and every mark at the loop point are as they were at the start', () => {
    const [a, b] = [inShell(END), inShell(0)];
    expect([...a.keys()].sort()).toEqual([...b.keys()].sort());
    for (const [slot, c] of b) {
      const d = a.get(slot)!;
      expect(d.size).toBeCloseTo(c.size, 3);
      expect(d.dx).toBeCloseTo(c.dx, 2);
      expect(d.dy).toBeCloseTo(c.dy, 2);
    }
    expect(naked(END)).toEqual([]);
    expect(naked(0)).toEqual([]);
    const [s0, s1] = [shellsAt(0), shellsAt(END)];
    expect(s1.length).toBe(s0.length);
    for (const s of s0) {
      const e = s1.find((x) => x.slot === s.slot)!;
      expect(e.dx).toBeCloseTo(s.dx, 2);
      expect(e.rotation).toBeCloseTo(0, 4);
      expect(e.highlight).toBeCloseTo(s.highlight, 3);
    }
    for (const f of PROPS) expect(f(END)).toBeCloseTo(f(0), 4);
    expect(waveAt(0).alpha).toBe(0);
    expect(waveAt(END).alpha).toBe(0);
  });

  it('never jumps: crabs and shells move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      const [ca, cb] = [inShell(a), inShell(b)];
      for (const [slot, c] of ca) {
        const d = cb.get(slot);
        // A crab only leaves its slot's shell under a puff of sand, or walks off left.
        if (d && slot !== 0) expect(Math.abs(d.dx - c.dx) + Math.abs(d.dy - c.dy)).toBeLessThan(8);
        if (d) expect(Math.abs(d.size - c.size)).toBeLessThan(0.1);
      }
      const [ra, rb] = [resting(a), resting(b)];
      for (const [slot, s] of ra) {
        const r = rb.get(slot);
        if (r && slot !== 0) expect(Math.abs(r.dx - s.dx) + Math.abs(r.dy - s.dy)).toBeLessThan(8);
        if (r) expect(Math.abs(r.highlight - s.highlight)).toBeLessThan(0.3);
      }
      for (const f of PROPS) expect(Math.abs(f(b) - f(a))).toBeLessThan(0.35);
    }
  });

  it('opens on the hook: seven crabs queued biggest to smallest in a snaking line behind a big empty, highlighted shell, already moving', () => {
    const crabs = inShell(0);
    expect([...crabs.keys()].sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const [slot, c] of crabs) expect(c.size).toBe(SLOT_SIZES[slot]);
    expect(SLOT_SIZES).toEqual([8, 7, 6, 5, 4, 3, 2, 1]);
    // Three rows down the frame, the line running right, back left, then right again; each crab facing the shell ahead.
    expect(new Set(SLOT_Y).size).toBe(3);
    for (let i = 1; i < SLOTS; i++) {
      if (SLOT_Y[i] === SLOT_Y[i - 1]) {
        expect(Math.sign(SLOT_X[i]! - SLOT_X[i - 1]!)).toBe(-SLOT_FACING[i]!);
      } else {
        expect(SLOT_Y[i]!).toBeGreaterThan(SLOT_Y[i - 1]!);
      }
    }
    // All on screen at once, big, and clear of the captions.
    for (let s = 0; s < SLOTS; s++) {
      const w = widthOf(SLOT_SIZES[s]!);
      expect(SLOT_X[s]! - w / 2).toBeGreaterThan(0);
      expect(SLOT_X[s]! + w / 2).toBeLessThan(1080);
      expect(SLOT_Y[s]!).toBeGreaterThan(560);
      expect(SLOT_Y[s]!).toBeLessThan(1100);
    }
    expect(widthOf(SLOT_SIZES[1])).toBeGreaterThan(280);
    const shells = resting(0);
    expect(shells.size).toBe(SLOTS);
    expect(shells.get(0)!.highlight).toBe(1);
    expect(captionAt(0)!.line.words.map((w) => w.text).join(' ')).toBe('Hermit crabs QUEUE UP');
    expect(inShell(FRAME).get(1)!.dx).not.toBeCloseTo(crabs.get(1)!.dx, 2);
  });

  it('shows each thing as it is named: the big empty shell, the wait, the clock for hours, the ruler from biggest to smallest', () => {
    expect(hintArcsAt(said('swap') + 0.3)).toBeGreaterThan(0.5);
    expect(hintArcsAt(0)).toBe(0);
    expect(bigShellLabel(said('big') - 0.1)).toBe(0);
    expect(bigShellLabel(said('shell'))).toBe(1);
    // The crabs shuffle up as they gather round.
    expect(inShell(said('round')).get(5)!.dx).toBeLessThan(inShell(said('crabs', 2) - 0.2).get(5)!.dx - 5);
    expect(waitAt(said('wait,') + 0.2)).toBe(1);
    expect(clockAt(said('sometimes') - 0.25)).toBe(0);
    expect(clockAt(said('hours,'))).toBe(1);
    expect(hoursLabel(said('hours,') + 0.2)).toBe(1);
    expect(rulerAt(said('up'))).toBeGreaterThan(0.3);
    expect(biggestLabel(said('biggest') + 0.2)).toBe(1);
    expect(smallestLabel(said('smallest.') - 0.1)).toBe(0);
    expect(smallestLabel(said('smallest.') + 0.2)).toBe(1);
  });

  it('fires the chain on its words: the biggest moves in on "in", the rest swap down the line in seconds', () => {
    expect(LEAVE[1]!).toBeGreaterThan(said('the'));
    expect(LEAVE[1]!).toBeLessThan(said('biggest', 2) + 0.1);
    expect(ARRIVE[1]!).toBeCloseTo(said('in,'), 3);
    const dash = naked(said('moves'));
    expect(dash.length).toBe(1);
    expect(dash[0]!.from).toBe(1);
    expect(dash[0]!.to).toBe(0);
    expect(inShell(said('in,') + 0.05).get(0)!.size).toBe(7);
    // Down the line like dominoes, each after the one ahead has gone.
    for (let i = 2; i < SLOTS; i++) {
      expect(LEAVE[i]!).toBeGreaterThan(LEAVE[i - 1]!);
      expect(LEAVE[i]!).toBeGreaterThan(said('and', 2) - 0.1);
    }
    expect(ARRIVE[SLOTS - 1]!).toBeLessThan(ended('swaps,') + 0.1);
    expect(ARRIVE[SLOTS - 1]! - LEAVE[1]!).toBeLessThan(3);
    // After the chain each crab is one slot up, in a shell a size bigger than itself.
    const after = inShell(said('each'));
    for (let slot = 0; slot < SLOTS - 1; slot++) expect(after.get(slot)!.size).toBe(SLOT_SIZES[slot + 1]);
    expect(after.has(SLOTS - 1)).toBe(false);
    expect(resting(said('each')).get(SLOTS - 1)!.highlight).toBe(1);
    // The hops drawn one by one on "each crab taking the next shell up".
    expect(chainArcAt(1, said('each') - 0.05)).toBe(0);
    expect(chainArcAt(1, said('next'))).toBe(1);
    expect(chainArcAt(SLOTS - 1, said('crab'))).toBe(0);
    expect(chainArcAt(SLOTS - 1, ended('up,', 2))).toBeGreaterThan(0.5);
    expect(stopwatchAt(said('SECONDS.') + 0.1)).toBe(1);
    expect(secondsLabel(said('SECONDS.') + 0.2)).toBe(1);
    // Every swap and step has its sound.
    for (let i = 1; i < SLOTS; i++) {
      expect(SOUNDS.some((s) => s.id === 'movein' && Math.abs(s.t - ARRIVE[i]!) < 0.1)).toBe(true);
      expect(SOUNDS.some((s) => s.id === 'tok' && Math.abs(s.t - LEAVE[i]!) < 0.05)).toBe(true);
    }
  });

  it('names it on "vacancy chain" and comes round: they grow, the biggest leaves, a newcomer and a fresh big shell arrive', () => {
    expect(paperLabel(said('Scientists') + 0.3)).toBe(1);
    expect(headingWritten(said('vacancy') - 0.1)).toBe(0);
    expect(headingWritten(said('chain.') + 0.15)).toBe(1);
    expect(headingAt(said('So'))).toBe(1);
    // Grown into their new shells.
    const grown = inShell(said('chain.'));
    for (let slot = 1; slot < SLOTS - 1; slot++) expect(grown.get(slot)!.size).toBeCloseTo(SLOT_SIZES[slot]!, 3);
    // The biggest walks off left in its new shell.
    expect(inShell(said('call')).get(0)!.dx).toBeLessThan(inShell(said('Scientists')).get(0)!.dx);
    expect(inShell(SHELL_LANDS).has(0)).toBe(false);
    // The newcomer runs in and takes the shell left at the end.
    expect(naked(said('vacancy')).some((c) => c.from === -1 && c.to === SLOTS - 1)).toBe(true);
    expect(inShell(NEWCOMER_IN + 0.05).get(SLOTS - 1)!.size).toBe(1);
    // The wave rolls in a fresh big shell, highlighted once it rests.
    expect(waveAt(said('chain.')).alpha).toBeGreaterThan(0);
    const landed = shellsAt(SHELL_LANDS + 0.4).filter((s) => s.slot === 0);
    expect(landed.length).toBe(1);
    expect(landed[0]!.dx).toBeCloseTo(0, 3);
    expect(landed[0]!.highlight).toBe(1);
    expect(SOUNDS.some((s) => s.id === 'tide')).toBe(true);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('yes,');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    expect(LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO).toBeLessThan(0.5);
    expect(TEMPO).toBeGreaterThan(1.05);
    expect(TEMPO).toBeLessThan(1.15);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) expect(l.words.length).toBeLessThanOrEqual(5);
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
    expect(captionAt(0)!.line).toBe(LINES[0]);
    expect(LINES.some((l) => l.words.map((w) => w.text).join(' ') === 'a vacancy chain.')).toBe(true);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL).toBe(BOIL - 1);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
