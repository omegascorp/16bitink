import { describe, expect, it } from 'vitest';
import {
  ELEPHANT_LEGS, elephantAt, GIVE_AT, giveAt, hopeAlpha, SINK_AT, SIT_AT, SIT_DROP, snapBurstAt, thinAt, thinLit, trembleAt as thinTremble,
} from '../dev/promo/heavy/falls';
import {
  bigAt, CELLS_AT, cellAt, DROPS, dropAt, eightMark, fourMark, growAt, legsLit, pageSlide, puzzledMark, quillAt, squashAt, STROKES, tilesAt, twoMark, writtenAt,
} from '../dev/promo/heavy/lesson';
import { captionAt, LINES, SOUNDS } from '../dev/promo/heavy/script';
import {
  ANIMALS_AT, BEAST, beastAt, BECAUSE_AT, CANT_AT, boilAt, BOIL_STEPS, burstAt, countAt, cracksAt, DOUBLE_AT, earthAt, EIGHT_AT, ELEPHANTS_AT, EVERY_AT, FOUR_AT, GALILEO_AT,
  glowAt, HEAVIER_AT, ITS_AT, LEGS_AT, LIKE_AT, LOOP_S, MORE_AT, ringAt, riderAt, RIDERS_LAND, said, sceneAt, SCENES, shakeAt, shortMark, SHORT_AT, SIX_AT, SLAM_AT,
  SNAP_AT, SO_AT, STEP_AT, STEPS, STOMP_AT, THIN_AT, THIS_AT, TWO_AT, walkAmp, walkerAt, wideMark, WIDE_AT, YEAR_AT, type Scene,
} from '../dev/promo/heavy/story';
import { TEMPO, WORDS } from '../dev/promo/heavy/words';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const NAMES = Object.keys(SCENES) as Scene[];
const BOIL_FRAMES = 3;

describe('promo short: on a heavy planet a deer would look like THIS (narrated)', () => {
  it('loops: the beast, its legs, the dust, the shake, the scenes and every mark are where they started', () => {
    const [a, b] = [beastAt(END), beastAt(0)];
    for (const key of ['x', 'ground', 'scale', 'tilt', 'bob'] as const) expect(a[key]).toBeCloseTo(b[key], 4);
    a.legs.forEach((leg, i) => {
      expect(leg.angle).toBeCloseTo(b.legs[i]!.angle, 4);
      expect(leg.stretch).toBeCloseTo(b.legs[i]!.stretch, 4);
      expect(leg.hip.y).toBeCloseTo(b.legs[i]!.hip.y, 4);
    });
    for (const name of NAMES) expect(sceneAt(name, END)).toBeCloseTo(sceneAt(name, 0), 4);
    for (const f of [earthAt, glowAt, shortMark, wideMark, walkAmp, (t: number) => burstAt(t, SLAM_AT), (t: number) => cracksAt(t, SLAM_AT), (t: number) => cracksAt(t, STOMP_AT)]) {
      expect(f(END)).toBeCloseTo(f(0), 4);
    }
    for (let k = 0; k < 6; k++) expect(ringAt(END, k)).toBeCloseTo(ringAt(0, k), 4);
    expect(shakeAt(END).x).toBeCloseTo(shakeAt(0).x, 2);
    expect(shakeAt(END).y).toBeCloseTo(shakeAt(0).y, 2);
    // Every other scene is out of sight on both sides of the loop point.
    for (const name of NAMES.filter((n) => n !== 'beast')) {
      expect(sceneAt(name, 0)).toBe(0);
      expect(sceneAt(name, END)).toBe(0);
    }
    expect(riderAt(0, 0)).toBeNull();
    expect(riderAt(END, 1)).toBeNull();
    expect(quillAt(0)).toBeNull();
    expect(pageSlide(END)).toBeCloseTo(pageSlide(0), 4);
  });

  it('never jumps: the beast, its legs, you, the blocks, the falls and the scenes move on smoothly; only the slam and the snap are quick', () => {
    for (const t of FRAMES) {
      const [p, q] = [beastAt(t), beastAt(t + FRAME)];
      if (sceneAt('beast', t) > 0 && sceneAt('beast', t + FRAME) > 0) {
        expect(Math.abs(q.x - p.x)).toBeLessThan(40);
        expect(Math.abs(q.scale - p.scale) / p.scale).toBeLessThan(0.03);
        // The slam is the quickest it moves: a fifth of a second from reared to down.
        expect(Math.abs(q.tilt - p.tilt)).toBeLessThan(0.15);
        expect(Math.abs(q.bob - p.bob)).toBeLessThan(2);
        p.legs.forEach((leg, i) => {
          expect(Math.abs(q.legs[i]!.angle - leg.angle)).toBeLessThan(0.2);
          // The stomp on "THIS" slams the foot down in a few frames: the quickest a leg moves.
          expect(Math.abs(q.legs[i]!.stretch - leg.stretch)).toBeLessThan(0.3);
        });
      }
      // Scenes cross-fade over a fifth of a second.
      for (const name of NAMES) expect(Math.abs(sceneAt(name, t + FRAME) - sceneAt(name, t))).toBeLessThan(0.3);
      if (sceneAt('stack', t) > 0 && sceneAt('stack', t + FRAME) > 0) expect(Math.abs(walkerAt(t + FRAME).x - walkerAt(t).x)).toBeLessThan(10);
      expect(Math.abs(squashAt(t + FRAME) - squashAt(t))).toBeLessThan(0.05);
      // Its push up on "can't" is quick (a few px a frame).
      if (sceneAt('elephant', t) > 0) expect(Math.abs(elephantAt(t + FRAME).rise - elephantAt(t).rise)).toBeLessThan(5);
      // It sits down hard on "snap": its body drops in about a fifth of a second.
      if (sceneAt('thin', t) > 0) expect(Math.abs(thinAt(t + FRAME).drop - thinAt(t).drop)).toBeLessThan(SIT_DROP / 3);
      const [s, u] = [shakeAt(t), shakeAt(t + FRAME)];
      expect(Math.hypot(s.x, s.y)).toBeLessThan(40);
      expect(Math.hypot(u.x - s.x, u.y - s.y)).toBeLessThan(40);
    }
  });

  it('opens on the action: the heavy deer just stomped, alone and huge, dust bursting, the ground cracked, no labels or numbers', () => {
    expect(sceneAt('beast', 0)).toBe(1);
    for (const name of NAMES.filter((n) => n !== 'beast')) expect(sceneAt(name, 0)).toBe(0);
    // The slam landed a moment before the loop point: the dust is young, the cracks out, the camera still jolting.
    expect(SLAM_AT).toBeLessThan(LOOP_S);
    expect(burstAt(0, SLAM_AT)).toBeGreaterThan(0);
    expect(burstAt(0, SLAM_AT)).toBeLessThan(0.2);
    expect(cracksAt(0, SLAM_AT)).toBeGreaterThan(0.7);
    expect(Math.hypot(shakeAt(0).x, shakeAt(0).y)).toBeGreaterThan(1);
    // All six feet down, the body level, full size, filling the width (its drawing is ~280 units long).
    const p = beastAt(0);
    expect(p.tilt).toBeCloseTo(0, 3);
    expect(p.scale).toBe(BEAST.scale);
    expect(p.scale * 280).toBeGreaterThan(0.85 * 1080);
    for (const t of [0, 0.2, 0.5]) {
      for (const mark of [shortMark, wideMark, glowAt, twoMark, eightMark, fourMark, tilesAt, legsLit, puzzledMark, thinLit, hopeAlpha]) expect(mark(t)).toBe(0);
      for (let k = 0; k < 6; k++) expect(ringAt(t, k)).toBe(0);
    }
  });

  it('stomps again on "THIS": the front foot lifts on "like" and comes down as the word lands, cracking the ground', () => {
    expect(STOMP_AT).toBeGreaterThan(LIKE_AT);
    expect(Math.abs(STOMP_AT - THIS_AT)).toBeLessThan(0.05);
    const up = beastAt(STOMP_AT - 0.15).legs[2]!.stretch;
    const down = beastAt(STOMP_AT + 0.02).legs[2]!.stretch;
    expect(up).toBeLessThan(0.7);
    expect(down).toBeGreaterThan(0.9);
    expect(cracksAt(STOMP_AT - 0.05, STOMP_AT)).toBe(0);
    expect(cracksAt(STOMP_AT + 0.25, STOMP_AT)).toBe(1);
    expect(sceneAt('beast', EVERY_AT + 0.2)).toBe(0);
  });

  it('stacks two more of you on your back on "two" and "more", a thud at every step', () => {
    expect(STEPS.some((at) => Math.abs(at - STEP_AT) < 0.01)).toBe(true);
    expect(Math.abs(RIDERS_LAND[0]! - TWO_AT)).toBeLessThan(0.1);
    expect(Math.abs(RIDERS_LAND[1]! - MORE_AT)).toBeLessThan(0.15);
    expect(riderAt(TWO_AT - 0.4, 0)).toBeNull();
    expect(riderAt(RIDERS_LAND[0]! + 0.01, 0)!.drop).toBe(0);
    expect(riderAt(RIDERS_LAND[1]! - 0.1, 1)!.drop).toBeGreaterThan(0);
    expect(walkerAt(MORE_AT + 0.5).squash).toBeGreaterThan(walkerAt(EVERY_AT + 0.2).squash);
    expect(sceneAt('stack', STEP_AT)).toBe(1);
    for (const at of [...STEPS, ...RIDERS_LAND]) expect(SOUNDS.some((s) => Math.abs(s.t - at) < 0.01)).toBe(true);
  });

  it('writes "Galileo", draws his two bones on "the rule", then "1638" on the year', () => {
    expect(sceneAt('page', GALILEO_AT + 0.1)).toBe(1);
    expect(pageSlide(GALILEO_AT + 0.1)).toBe(0);
    expect(writtenAt('name', GALILEO_AT - 0.05)).toBe(0);
    expect(writtenAt('name', GALILEO_AT + 0.5)).toBe(1);
    expect(writtenAt('small', said(28))).toBeGreaterThan(0.5);
    expect(writtenAt('big', YEAR_AT)).toBe(1);
    expect(writtenAt('year', YEAR_AT - 0.01)).toBe(0);
    expect(writtenAt('year', YEAR_AT + 0.45)).toBe(1);
    // The quill rides each stroke as it's written.
    for (const s of STROKES) {
      const q = quillAt((s.from + s.to) / 2)!;
      expect(q.lift).toBe(0);
      expect(q.x).toBeCloseTo((s.x0 + s.x1) / 2, 0);
    }
    expect(pageSlide(DOUBLE_AT + 0.05)).toBeGreaterThan(1300);
  });

  it('doubles the block deer on "double", fills it with eight blocks on "EIGHT times heavier", and its legs hold only four on "FOUR"', () => {
    expect(growAt(DOUBLE_AT)).toBe(0);
    expect(bigAt(said(34) + 0.1).k).toBeCloseTo(2, 2);
    expect(DROPS).toHaveLength(8);
    for (const d of DROPS) {
      expect(d.at).toBeGreaterThan(EIGHT_AT - 0.2);
      expect(d.at).toBeLessThan(HEAVIER_AT + 0.1);
      expect(dropAt(d.at + 0.01, DROPS.indexOf(d))).toBe(0);
    }
    expect(dropAt(EIGHT_AT - 0.5, 0)).toBeNull();
    expect(eightMark(HEAVIER_AT + 0.2)).toBe(1);
    expect(legsLit(LEGS_AT + 0.15)).toBe(1);
    expect(CELLS_AT).toHaveLength(4);
    expect(cellAt(FOUR_AT - 0.2, 3)).toBe(0);
    expect(cellAt(FOUR_AT + 0.25, 3)).toBe(1);
    expect(fourMark(FOUR_AT + 0.3)).toBe(1);
    expect(sceneAt('blocks', THIN_AT + 0.1)).toBe(0);
  });

  it('gives at the knees on "snap" and sits the thin deer down on its belly, stunned, before "It\'s why"', () => {
    expect(sceneAt('thin', THIN_AT + 0.1)).toBe(1);
    expect(thinTremble(SNAP_AT - 0.1)).toBeGreaterThan(0.8);
    expect(Math.abs(GIVE_AT - SNAP_AT)).toBeLessThan(0.05);
    expect(giveAt(SNAP_AT - 0.05)).toBe(0);
    expect(giveAt(SNAP_AT + 0.2)).toBe(1);
    expect(thinAt(SNAP_AT - 0.05).drop).toBe(0);
    expect(thinAt(SIT_AT + 0.6).drop).toBeCloseTo(SIT_DROP, 3);
    expect(snapBurstAt(GIVE_AT + 0.1)).toBeGreaterThan(0);
    expect(thinAt(ITS_AT - 0.2).dizzy).toBe(1);
    expect(SOUNDS.filter((s) => s.id === 'snap' && Math.abs(s.t - GIVE_AT) < 0.01)).toHaveLength(1);
    expect(SOUNDS.filter((s) => s.id === 'plop' && Math.abs(s.t - SIT_AT) < 0.01)).toHaveLength(1);
  });

  it("lets the elephant try a hop on \"can't\" without its feet leaving the ground, on Earth's blue dusk", () => {
    expect(sceneAt('elephant', ELEPHANTS_AT)).toBe(1);
    expect(earthAt(ELEPHANTS_AT)).toBe(1);
    expect(elephantAt(CANT_AT - 0.08).rise).toBeLessThan(-5);
    expect(elephantAt(CANT_AT + 0.2).rise).toBeGreaterThan(4);
    // Its legs stretch to keep every foot on the ground, however high it pushes.
    for (const t of FRAMES.filter((x) => x > ITS_AT && x < SO_AT)) {
      const p = elephantAt(t);
      expect(p.rise).toBeLessThan(8);
      expect(ELEPHANT_LEGS.length).toBe(4);
    }
    expect(elephantAt(SINK_AT + 0.8).rise).toBeCloseTo(0, 3);
    expect(elephantAt(SO_AT - 0.1).sad).toBe(1);
    expect(SOUNDS.some((s) => s.id === 'wah' && s.t > CANT_AT && s.t < SO_AT)).toBe(true);
  });

  it('brings the heavy deer striding back on "So heavy worlds", marks "short" and "wide", counts six legs, rears on "Because" and slams into the loop point', () => {
    expect(sceneAt('beast', SO_AT + 0.1)).toBe(1);
    expect(earthAt(SO_AT + 0.1)).toBe(0);
    expect(walkAmp(SO_AT + 0.3)).toBe(1);
    expect(beastAt(SO_AT).x).toBeLessThan(beastAt(SHORT_AT).x);
    expect(walkAmp(SHORT_AT + 0.05)).toBe(0);
    expect(shortMark(SHORT_AT + 0.15)).toBe(1);
    expect(wideMark(WIDE_AT + 0.15)).toBe(1);
    for (let k = 0; k < 6; k++) {
      expect(countAt(k)).toBeGreaterThan(SIX_AT - 0.1);
      expect(countAt(k)).toBeLessThan(ANIMALS_AT);
      expect(ringAt(countAt(k) + 0.15, k)).toBe(1);
    }
    expect(glowAt(ANIMALS_AT + 0.3)).toBeGreaterThan(0.9);
    for (const m of [shortMark, wideMark]) expect(m(BECAUSE_AT + 0.05)).toBe(0);
    expect(beastAt(BECAUSE_AT + 0.6).tilt).toBeLessThan(-0.25);
    expect(beastAt(SLAM_AT).tilt).toBeCloseTo(0, 6);
    expect(beastAt(BECAUSE_AT + 0.6).scale).toBe(BEAST.scale);
    expect(SOUNDS.filter((s) => s.id === 'boom' && Math.abs(s.t - SLAM_AT) < 0.01)).toHaveLength(1);
    expect(SOUNDS.filter((s) => s.id === 'boom' && Math.abs(s.t - STOMP_AT) < 0.01)).toHaveLength(1);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('Because');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.5);
    expect(said(68)).toBe(BECAUSE_AT);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) expect(l.words.length).toBeLessThanOrEqual(8);
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
    expect(captionAt(0)!.line).toBe(LINES[0]);
    expect(captionAt(0)!.word).toBe(0);
  });

  it('lasts 24 s, a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(LOOP_S).toBe(24);
    expect(LOOP_S % 1.5).toBe(0);
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END)).toBe(BOIL_FRAMES - 1);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
