import { describe, expect, it } from 'vitest';
import {
  AGE_TEXT, ageAt, bonesAt, BURST_AT, cameraAt, captionAt, CAVE_AT, crackAt, DECK_Y, deckFishAt, FISH_LEN, flashAt, FOSSIL, HIDDEN, hiddenAt, HOME, IMPACT_AT,
  labelAt, LABELS, LAND_AT, leapAt, LENS, LINES, LOOP_S, RISE, said, sedimentTop, SOUNDS, STAMP, stampAt, swimmerAt, SWAP_AT, worldAt,
} from '../dev/promo/coelacanth/story';
import { TEMPO, WORDS } from '../dev/promo/coelacanth/words';
import { groundAt } from '../dev/promo/coelacanth/rock';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));
/** The end of a word, in voice.mp3. */
const ended = (text: string): number => WORDS.find((w) => w.text === text)!.end / TEMPO;
const SAFE = { top: 270, bottom: 1250 } as const;

describe('promo short: the coelacanth, back from extinction (narrated)', () => {
  it('loops: the fish, the camera and everything else are where the loop began', () => {
    expect(worldAt(0)).toBe('sea');
    expect(worldAt(END)).toBe('sea');
    const [a, b] = [cameraAt(0), cameraAt(END)];
    expect(b.y).toBeCloseTo(a.y, 6);
    expect([a.shakeX, a.shakeY, b.shakeX, b.shakeY]).toEqual([0, 0, 0, 0]);
    const [first, last] = [swimmerAt(0)!, swimmerAt(END)!];
    expect(last.x).toBeCloseTo(first.x, 3);
    expect(last.y).toBeCloseTo(first.y, 3);
    expect(last.angle).toBeCloseTo(first.angle, 4);
    expect(last.effort).toBeCloseTo(first.effort, 4);
    expect(last.length).toBe(first.length);
    expect(wrap(last.paddle - first.paddle)).toBeCloseTo(0, 4);
    // Nothing else is on screen at either end.
    for (const t of [0, END]) {
      expect(stampAt(t)).toBeNull();
      expect(deckFishAt(t)).toBeNull();
      expect(leapAt(t)).toBeNull();
      expect(flashAt(t)).toBe(0);
      expect(ageAt(t).open).toBe(0);
      for (const h of HIDDEN) expect(hiddenAt(h, t)).toBe(0);
      for (const l of LABELS) expect(labelAt(l, t)).toBe(0);
    }
  });

  it('keeps the fish moving smoothly through the loop point', () => {
    const before = swimmerAt(END)!;
    const justBefore = swimmerAt(END - FRAME)!;
    const after = swimmerAt(FRAME)!;
    const start = swimmerAt(0)!;
    expect(Math.abs(before.x - justBefore.x - (after.x - start.x))).toBeLessThan(0.05);
    expect(Math.abs(before.y - justBefore.y - (after.y - start.y))).toBeLessThan(0.05);
    // No jumps while it swims on screen: out of the cave at the end, past it at the start.
    for (const [from, to] of [[0, BURST_AT], [said('And') - 0.2, LOOP_S]] as const) {
      for (let t = from; t + FRAME < to; t += FRAME) {
        const [p, q] = [swimmerAt(t)!, swimmerAt(t + FRAME)!];
        expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(20);
      }
    }
  });

  it('only cuts the camera under the burst’s white flash', () => {
    for (let t = 0; t + FRAME < LOOP_S; t += FRAME) {
      const jump = Math.abs(cameraAt(t + FRAME).y - cameraAt(t).y);
      if (jump > 160) expect(flashAt(t + FRAME)).toBeGreaterThan(0.9);
    }
    expect(flashAt(SWAP_AT)).toBe(1);
  });

  it('opens on the living fish, whole and clear of the captions', () => {
    const fish = swimmerAt(0)!;
    expect(fish.effort).toBe(1);
    expect(fish.x - FISH_LEN / 2).toBeGreaterThan(0);
    expect(fish.x + FISH_LEN / 2).toBeLessThan(1080);
    expect(fish.y + FISH_LEN * 0.32).toBeLessThan(1170 - 100);
    expect(fish).toEqual(expect.objectContaining({ x: HOME.x }));
  });

  it('stamps "EXTINCT" over it as the narrator says the word', () => {
    expect(stampAt(said('extinct.') - 0.02)).toBeNull();
    expect(stampAt(said('extinct.') + 0.2)!.alpha).toBe(1);
    expect(stampAt(said('extinct.') + 0.2)!.scale).toBeCloseTo(1, 5);
  });

  it('buries it and turns it to stone while "only from fossils" is said, bones and all', () => {
    expect(sedimentTop(said('Scientists'))).toBeGreaterThan(1920);
    // Covered, its tallest fin too, before its bones ink in.
    expect(sedimentTop(said('only'))).toBeLessThan(FOSSIL.y - FISH_LEN * 0.34);
    expect(swimmerAt(said('only'))!.effort).toBe(0);
    expect(bonesAt(said('coelacanth'))).toBe(0);
    expect(bonesAt(said('and'))).toBe(1);
    // It lies where it stopped.
    const lying = swimmerAt(said('fossils,'))!;
    expect([lying.x, lying.y]).toEqual([FOSSIL.x, FOSSIL.y]);
  });

  it('rises to dinosaurs on the ridge for "dinosaurs", and strikes the meteor on "million"', () => {
    const cam = cameraAt(said('dinosaurs,') + 0.3);
    expect(cam.y).toBeCloseTo(-RISE, 6);
    const ridge = groundAt(540) - cam.y;
    expect(ridge).toBeGreaterThan(500);
    expect(ridge).toBeLessThan(800);
    expect(IMPACT_AT).toBeGreaterThan(said('million'));
    expect(IMPACT_AT).toBeLessThan(said('years'));
    const sixtySix = LABELS.find((l) => l.text.startsWith('66'))!;
    for (const w of ['sixty-six', 'million', 'years', 'ago.']) expect(labelAt(sixtySix, said(w) + 0.1)).toBe(1);
  });

  it('cracks the fossil on "1938" and bursts the living fish out of it before the curator', () => {
    expect(crackAt(said('1938,'))).toBeGreaterThan(0);
    expect(crackAt(said('1938,'))).toBeLessThan(0.1);
    expect(BURST_AT).toBeGreaterThan(said('1938,') + 0.6);
    expect(BURST_AT).toBeLessThan(said('museum'));
    expect(leapAt(BURST_AT + 0.1)).not.toBeNull();
    expect(LAND_AT).toBeLessThan(said('curator'));
    const deck = deckFishAt(said('curator'))!;
    expect(deck.y).toBeLessThan(900);
    const place = LABELS.find((l) => l.text.startsWith('1938'))!;
    for (const w of ['South', 'Africa', 'found', "fisherman's", 'catch.']) expect(labelAt(place, said(w) + 0.1)).toBe(1);
  });

  it('dives from the boat to the cave by "caves", where eyes shine in the dark "all along"', () => {
    expect(cameraAt(ended('catch.')).y).toBe(DECK_Y);
    expect(cameraAt(said('caves') + 0.15).y).toBe(0);
    expect(CAVE_AT).toBeLessThan(ended('caves'));
    for (const h of HIDDEN) expect(hiddenAt(h, said('along.') + 0.3)).toBeGreaterThan(0.9);
  });

  it('counts the years on a scale up to a hundred as the narrator says it', () => {
    expect(ageAt(said('living') + 0.35).open).toBe(1);
    expect(ageAt(said('living')).years).toBeLessThan(10);
    expect(ageAt(ended('hundred,')).years).toBe(100);
  });

  it('keeps every label, the stamp and the lens inside the safe area', () => {
    for (const l of LABELS) {
      expect(l.y - l.size * 0.8).toBeGreaterThanOrEqual(SAFE.top);
      expect(l.y + l.size * 0.3).toBeLessThanOrEqual(SAFE.bottom);
    }
    expect(STAMP.y - 125).toBeGreaterThanOrEqual(SAFE.top);
    expect(LENS.y - LENS.r).toBeGreaterThanOrEqual(SAFE.top);
    expect(AGE_TEXT.y - AGE_TEXT.size * 0.8).toBeGreaterThanOrEqual(SAFE.top);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('though');
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
    expect((LOOP_S * 30) % 1).toBe(0);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
