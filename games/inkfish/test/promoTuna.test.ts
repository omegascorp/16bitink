import { describe, expect, it } from 'vitest';
import {
  barsShown, bidderPaddle, bidderShown, BID_RAISES, boardShown, catAt, dollarsShown, fractionRing, gavelAngle, gavelShown, kgText, nameLabel, needleKg,
  PADDLES, paddleUp, paidBar, paperShown, PLANNED_YEN, plannedBar, PRICE_YEN, rosetteAt, scaleShown, shakeAt, SOUNDS, tokyoStamp, winterAt, yearStamp,
  yenAt, yenText,
} from '../dev/promo/tuna/beats';
import {
  AUCTION_AT, boilAt, BOIL_STEPS, captionAt, EATS, type Fish, LINES, LOOP_S, preyAt, said, SLAM_AT, soldStampAt, stringAngle, SUCK_S, tagPop, tunaAt,
  tunaMouth,
} from '../dev/promo/tuna/story';
import { TEMPO, WORDS } from '../dev/promo/tuna/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const KEYS = ['x', 'y', 'len', 'face', 'tilt', 'effort', 'jaw', 'lump'] as const;

const same = (a: Fish, b: Fish): void => {
  for (const key of KEYS) expect(a[key]).toBeCloseTo(b[key], 3);
  expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 3);
};

const BEATS = [
  nameLabel, scaleShown, boardShown, dollarsShown, yearStamp, tokyoStamp, gavelShown, rosetteAt, catAt, paperShown, bidderShown, bidderPaddle,
  barsShown, winterAt, soldStampAt, tagPop, stringAngle,
];

describe('promo short: this fish sold for three million dollars (narrated)', () => {
  it('loops: the tuna, its meals, its tag and every note are where they were at the start', () => {
    same(tunaAt(END), tunaAt(0));
    EATS.forEach((_, i) => {
      const [a, b] = [preyAt(i, END), preyAt(i, 0)];
      expect(a === null).toBe(b === null);
      if (a && b) {
        same(a, b);
        expect(a.eaten ?? -1).toBeCloseTo(b.eaten ?? -1, 3);
      }
    });
    for (const f of BEATS) expect(f(END)).toBeCloseTo(f(0), 4);
    PADDLES.forEach((_, k) => expect(paddleUp(k, END)).toBe(0));
    expect(shakeAt(END)).toEqual(shakeAt(0));
  });

  it('never jumps: the tuna, its meals and the tag move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      const [p, q] = [tunaAt(a), tunaAt(b)];
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(20);
      expect(Math.abs(q.jaw - p.jaw)).toBeLessThan(0.9);
      expect(Math.abs(stringAngle(b) - stringAngle(a))).toBeLessThan(0.05);
      expect(Math.abs(winterAt(b) - winterAt(a))).toBeLessThan(0.15);
      EATS.forEach((_, i) => {
        const [m, n] = [preyAt(i, a), preyAt(i, b)];
        if (m && n && m.eaten === null && n.eaten === null) expect(Math.hypot(n.x - m.x, n.y - m.y)).toBeLessThan(80);
      });
    }
  });

  it('opens on the hook: the tuna mid-gulp with its $3.1M tag, the narrator already saying "This fish sold…"', () => {
    expect(tunaAt(0).jaw).toBeGreaterThan(0.5);
    const meal = preyAt(0, 0)!;
    const mouth = tunaMouth(tunaAt(0));
    expect(Math.hypot(meal.x - mouth.x, meal.y - mouth.y)).toBeLessThan(150);
    expect(captionAt(0)!.line).toBe(LINES[0]);
    expect(WORDS[0]!.start / TEMPO).toBeLessThan(0.1);
    // "SOLD" is stamped on its tag on "sold", and the tag jumps on "MILLION".
    expect(soldStampAt(said('sold') - 0.1)).toBe(0);
    expect(soldStampAt(said('sold') + 0.1)).toBe(1);
    expect(tagPop(said('MILLION') + 0.17)).toBeGreaterThan(0.9);
  });

  it('eats a sardine or an anchovy every couple of seconds, each one sucked in as the jaw gapes', () => {
    for (let i = 0; i < EATS.length; i++) {
      const at = EATS[i]!;
      const next = EATS[(i + 1) % EATS.length]! + (i + 1 === EATS.length ? LOOP_S : 0);
      expect(next - at).toBeGreaterThan(1.85);
      expect(next - at).toBeLessThan(5);
      expect(preyAt(i, at - SUCK_S / 2)!.eaten).toBeGreaterThan(0);
      expect(tunaAt(at - 0.1).jaw).toBeGreaterThan(0.8);
      expect(preyAt(i, at + 0.01)).toBeNull();
    }
    // None while the gavel falls: that moment is the auction's.
    for (const at of EATS) expect(Math.abs(at - SLAM_AT)).toBeGreaterThan(1);
  });

  it('names it and weighs it as it is said: "bluefin", then the needle to 200 and on to 278 kg', () => {
    expect(nameLabel(said('bluefin') + 0.3)).toBe(1);
    expect(scaleShown(said('two'))).toBeGreaterThan(0.5);
    expect(kgText(said('two') + 0.05)).toBe('2');
    expect(kgText(said('hundred') + 0.05)).toBe('200');
    expect(kgText(said('seventy-eight') + 0.05)).toBe('278');
    expect(kgText(said('kilos,') + 0.05)).toBe('278 kg');
    expect(needleKg(said('seventy-eight') - 0.1)).toBeCloseTo(200, 0);
    expect(needleKg(said('at'))).toBeCloseTo(278, 0);
  });

  it('runs the auction: paddles pop up faster and faster from "auction", the yen climbs to ¥333,600,000, and the gavel slams on "Tokyo"', () => {
    expect(PADDLES[0]!.at).toBeGreaterThan(said('first') - 0.1);
    for (let k = 2; k < PADDLES.length; k++) expect(PADDLES[k]!.at - PADDLES[k - 1]!.at).toBeLessThan(PADDLES[k - 1]!.at - PADDLES[k - 2]!.at);
    for (let k = 1; k < PADDLES.length; k++) expect(PADDLES[k]!.bid).toBeGreaterThan(PADDLES[k - 1]!.bid);
    expect(PADDLES[PADDLES.length - 1]!.bid).toBe(PRICE_YEN);
    let last = 0;
    for (let t = AUCTION_AT - 0.2; t < SLAM_AT + 1; t += FRAME) {
      expect(yenAt(t)).toBeGreaterThanOrEqual(last);
      last = yenAt(t);
    }
    expect(yenText(yenAt(SLAM_AT))).toBe('¥333,600,000');
    // The payoff, a little before halfway round the loop.
    expect(SLAM_AT / LOOP_S).toBeGreaterThan(0.38);
    expect(SLAM_AT / LOOP_S).toBeLessThan(0.48);
    expect(gavelAngle(SLAM_AT - 0.12)).toBeGreaterThan(1);
    expect(gavelAngle(SLAM_AT)).toBeLessThan(0.05);
    expect(Math.hypot(shakeAt(SLAM_AT + 0.02).x, shakeAt(SLAM_AT + 0.02).y)).toBeGreaterThan(3);
    expect(yearStamp(said('2019') - 0.1)).toBe(0);
    expect(yearStamp(said('2019') + 0.3)).toBe(1);
    expect(tokyoStamp(SLAM_AT - 0.05)).toBe(0);
    expect(tokyoStamp(SLAM_AT + 0.3)).toBe(1);
    expect(dollarsShown(SLAM_AT + 0.8)).toBe(1);
    PADDLES.forEach((_, k) => expect(paddleUp(k, SLAM_AT + 0.4)).toBe(0));
  });

  it('pins a "1st" on "first tuna", waves the lucky cat on "luck", spins in the paper on "headlines"', () => {
    expect(rosetteAt(said('first', 2) - 0.1)).toBe(0);
    expect(rosetteAt(said('first', 2) + 0.3)).toBe(1);
    expect(catAt(said('luck,') - 0.15)).toBe(0);
    expect(catAt(said('luck,') + 0.3)).toBe(1);
    expect(paperShown(said('headlines,') - 0.35)).toBe(0);
    expect(paperShown(said('headlines,') + 0.3)).toBe(1);
  });

  it('shows the sushi boss on "sushi boss", raising his paddle on "kept", "on" and "bidding"', () => {
    expect(bidderShown(said('sushi') + 0.3)).toBe(1);
    expect(bidderShown(said('so'))).toBe(0);
    for (const w of ['kept', 'on', 'bidding.']) {
      const at = said(w);
      expect(BID_RAISES.some((r) => Math.abs(r - at) < 0.1)).toBe(true);
    }
    expect(bidderPaddle(said('kept') + 0.13)).toBeGreaterThan(0.9);
  });

  it('sets what he planned against what he paid: a stub next to the long bar, circled on "fraction"', () => {
    expect(barsShown(said("He'd") + 0.3)).toBe(1);
    expect(paidBar(said('pay'))).toBe(1);
    expect(plannedBar(said('planned') - 0.05)).toBe(0);
    expect(plannedBar(said('fraction'))).toBe(1);
    expect(PLANNED_YEN / PRICE_YEN).toBeLessThan(0.2);
    expect(fractionRing(said('fraction') + 0.3)).toBeGreaterThan(0);
    expect(fractionRing(said('fraction') + 0.3)).toBeLessThan(1);
  });

  it('brings in the winter morning on "But on that winter…", and lets it go after the hook', () => {
    expect(winterAt(said('But') - 0.2)).toBe(0);
    expect(winterAt(said('morning,') + 0.1)).toBe(1);
    expect(winterAt(0)).toBe(1);
    expect(winterAt(said('One'))).toBe(0);
    expect(barsShown(said('morning,'))).toBe(0);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('morning,');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(last.end / TEMPO).toBeLessThanOrEqual(LOOP_S - 0.2);
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
