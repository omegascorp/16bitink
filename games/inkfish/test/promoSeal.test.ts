import { describe, expect, it } from 'vitest';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/seal/script';
import {
  BAR_X0, BAR_X1, biteNape, biteSeal, biteShark, boilAt, burstAt, BOIL_STEPS, cameraAt, chaseAt, clockAt, counterAt, countAt, equalAt, flashAt, gloomAt, iconPop, LOOP_S, nervousAt, onWhite, peekAt, peekSnoutX, placeAt, punchAt,
  placeSouthAt, ROLL_CUT, ROLL_FROM, ROLL_TO, said, SCENE_IDS, sceneAlpha, sealBarAt, sealLabelAt, sharkBarAt, sharkLabelAt, surfaceAt, TICK_AT, TUG_CUT, tugAt, whiteTagAt, WHITE_SNOUT, wrap,
} from '../dev/promo/seal/story';
import { TEMPO, WORDS } from '../dev/promo/seal/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const PLACED_KEYS = ['x', 'y', 'len', 'rot', 'face'] as const;
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);

describe('promo short: this seal hunts sharks (narrated)', () => {
  it('loops: every clocked value at the loop point equals its value at the start', () => {
    expect(wrap(END)).toBeCloseTo(LOOP_S, 5);
    const [s0, s1] = [biteShark(0), biteShark(END)];
    for (const k of PLACED_KEYS) expect(s1[k], k).toBeCloseTo(s0[k], 3);
    expect(Math.cos(s1.beat - s0.beat)).toBeCloseTo(1, 3);
    const [a0, a1] = [biteSeal(0), biteSeal(END)];
    for (const k of ['len', 'rot', 'gape'] as const) expect(a1[k], k).toBeCloseTo(a0[k], 3);
    const [c0, c1] = [cameraAt(0), cameraAt(END)];
    for (const k of ['zoom', 'rot', 'dx', 'dy', 'card'] as const) expect(c1[k], k).toBeCloseTo(c0[k], 3);
    expect(burstAt(END)).toBeGreaterThan(0.99);
    expect(burstAt(0)).toBe(0);
    const [n0, n1] = [biteNape(0), biteNape(END)];
    expect(n1.x).toBeCloseTo(n0.x, 2);
    expect(n1.y).toBeCloseTo(n0.y, 2);
    for (const id of SCENE_IDS) expect(sceneAlpha(id, END), id).toBeCloseTo(sceneAlpha(id, 0), 4);
    // Nothing written or washed at either end.
    for (const f of [placeAt, placeSouthAt, whiteTagAt, counterAt, clockAt, flashAt, gloomAt, nervousAt, sealLabelAt, sharkLabelAt, equalAt, punchAt]) {
      expect(f(0), f.name).toBe(0);
      expect(f(END), f.name).toBeCloseTo(0, 3);
    }
  });

  it('never jumps: the bite, the chase and the tug move smoothly frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [wrap(t), wrap(t + FRAME)];
      expect(dist(biteShark(a), biteShark(b))).toBeLessThan(30);
      expect(Math.abs(biteSeal(a).rot - biteSeal(b).rot)).toBeLessThan(0.08);
      const [c, d] = [cameraAt(a), cameraAt(b)];
      expect(Math.abs(c.zoom - d.zoom)).toBeLessThan(0.1);
            // The roll's cut is a hard cut, half way round, hidden by the flash.
      if (!(a < ROLL_CUT && b >= ROLL_CUT)) for (const id of SCENE_IDS) expect(Math.abs(sceneAlpha(id, b) - sceneAlpha(id, a)), id).toBeLessThan(0.35);
    }
    for (let t = ROLL_CUT + 0.01; t < said('And'); t += FRAME) {
      expect(dist(chaseAt(t).shark, chaseAt(t + FRAME).shark)).toBeLessThan(25);
      expect(dist(chaseAt(t).seal, chaseAt(t + FRAME).seal)).toBeLessThan(25);
    }
  });

  it('opens on the hook: the seal biting the blue shark, big, nothing written, alone in frame', () => {
    expect(sceneAlpha('bite', 0.3)).toBe(1);
    for (const id of SCENE_IDS.filter((x) => x !== 'bite')) expect(sceneAlpha(id, 0.3), id).toBe(0);
    const shark = biteShark(0.3);
    const seal = biteSeal(0.3);
    expect(shark.len).toBeGreaterThanOrEqual(900);
    expect(seal.len).toBeGreaterThanOrEqual(700);
    expect(shark.x).toBeGreaterThan(300);
    expect(shark.x).toBeLessThan(780);
    expect(seal.gape).toBeGreaterThan(0.3);
    expect(placeAt(0.3) + counterAt(0.3) + sealLabelAt(0.3)).toBe(0);
    expect(captionAt(0.3)!.line.words.map((w) => w.text).join(' ')).toBe('This seal HUNTS');
  });

  it('is alive from the first frame: the seal shakes its head, the shark thrashes, the camera punches in on "HUNTS"', () => {
    const at = [0.3, 0.9, 1.6].map((t) => ({ shark: biteShark(t), seal: biteSeal(t) }));
    const spread = (f: (x: (typeof at)[number]) => number): number => Math.max(...at.map(f)) - Math.min(...at.map(f));
    expect(spread((x) => x.seal.rot)).toBeGreaterThan(0.08);
    expect(spread((x) => x.shark.bend)).toBeGreaterThan(0.15);
    let [lo, hi] = [Infinity, -Infinity];
    for (let t = 0; t < 2; t += FRAME) {
      lo = Math.min(lo, biteShark(t).bend);
      hi = Math.max(hi, biteShark(t).bend);
    }
    // The tail whips both ways.
    expect(lo).toBeLessThan(-0.1);
    expect(hi).toBeGreaterThan(0.2);
    expect(punchAt(said('HUNTS') - 0.2)).toBe(0);
    expect(punchAt(said('HUNTS') + 0.3)).toBe(1);
    expect(cameraAt(said('HUNTS') + 0.3).zoom).toBeGreaterThan(cameraAt(0.3).zoom + 0.05);
  });

  it('puts every noun on screen as it is said', () => {
    // "Off Cape Point, South Africa": the place tag.
    expect(placeAt(said('Cape') + 0.3)).toBe(1);
    expect(placeSouthAt(said('Africa,') + 0.3)).toBe(1);
    expect(placeAt(said('Off'))).toBeGreaterThan(0);
    // "great whites eat seals": a great white rises under a seal at the surface, tagged.
    expect(sceneAlpha('surface', said('whites'))).toBe(1);
    expect(surfaceAt(said('great') - 0.5).white).toBeNull();
    const rising = [surfaceAt(said('great')).white!, surfaceAt(said('seals…')).white!];
    expect(rising[1]!.y).toBeLessThan(rising[0]!.y - 300);
    expect(whiteTagAt(said('whites') + 0.2)).toBe(1);
    expect(surfaceAt(said('seals…')).seal.y).toBeLessThan(700);
    // The great white is far bigger than the seal, snout up under it, jaws open by "seals".
    const white = surfaceAt(said('seals…') + 0.3).white!;
    const seal = surfaceAt(said('seals…') + 0.3).seal;
    expect(white.len).toBeGreaterThan(2.2 * seal.len);
    expect(white.jaw).toBeGreaterThan(0.6);
    const snout = onWhite(white, WHITE_SNOUT);
    expect(snout.y).toBeGreaterThan(seal.y);
    expect(snout.y).toBeLessThan(seal.y + 250);
    expect(Math.abs(snout.x - seal.x)).toBeLessThan(150);
    // The place tag is gone before the chase.
    expect(placeAt(said('script!'))).toBe(0);
  });

  it('rolls the picture over on "flipped": the great white scene gives way to a chase half way round', () => {
    expect(cameraAt(ROLL_FROM - 0.05).rot).toBe(0);
    expect(cameraAt(ROLL_FROM + 0.1).rot).toBeGreaterThan(0);
    expect(cameraAt(ROLL_CUT - 0.01).rot).toBeGreaterThan(1.4);
    expect(cameraAt(ROLL_CUT + 0.01).rot).toBeLessThan(-1.4);
    expect(cameraAt(ROLL_TO + 0.05).rot).toBeCloseTo(0, 5);
    expect(ROLL_CUT).toBeGreaterThan(said('flipped') - 0.1);
    expect(ROLL_CUT).toBeLessThan(said('flipped') + 0.5);
    expect(sceneAlpha('surface', ROLL_CUT - 0.01)).toBe(1);
    expect(sceneAlpha('surface', ROLL_CUT + 0.01)).toBe(0);
    expect(sceneAlpha('chase', ROLL_CUT + 0.01)).toBe(1);
    expect(sceneAlpha('chase', said('script!') + 0.3)).toBe(1);
    expect(flashAt(ROLL_CUT)).toBeGreaterThan(0.3);
    // Mid-flip the whole picture is a card, shrunk to fit; settled, it's full size again.
    expect(cameraAt(ROLL_CUT).card).toBeGreaterThan(0.95);
    expect(cameraAt(ROLL_CUT).zoom).toBeLessThan(0.62);
    expect(cameraAt(ROLL_TO + 0.05).card).toBeCloseTo(0, 5);
    // Roles swapped: the seal on top, diving at the blue shark below.
    for (let t = ROLL_CUT + 0.01; t < said('And'); t += 0.1) {
      const c = chaseAt(t);
      expect(c.seal.y).toBeLessThan(c.shark.y - 150);
      expect(c.seal.rot).toBeGreaterThan(0.8);
    }
  });

  it('counts 1 to 5 as five icons tick in, landing on "FIVE", then the clock on "two hours"', () => {
    expect(TICK_AT).toHaveLength(5);
    expect(TICK_AT[4]).toBeCloseTo(said('FIVE'), 5);
    expect(TICK_AT[0]).toBeGreaterThan(said('It') - 0.1);
    expect(countAt(TICK_AT[0]! - 0.01)).toBe(0);
    for (let n = 1; n <= 5; n++) expect(countAt(TICK_AT[n - 1]! + 0.01)).toBe(n);
    expect(countAt(said('hours!'))).toBe(5);
    for (let n = 0; n < 5; n++) expect(iconPop(n, said('blue'))).toBe(1);
    expect(iconPop(4, TICK_AT[4]! - 0.05)).toBe(0);
    expect(counterAt(said('FIVE'))).toBe(1);
    expect(clockAt(said('two') + 0.2)).toBe(1);
    expect(clockAt(said('FIVE'))).toBe(0);
    for (const at of [said('FIVE'), said('sharks'), said('two'), said('hours!')]) expect(sceneAlpha('chase', at + 0.05)).toBe(1);
  });

  it('tugs at a belly from behind, cuts to the smug seal, lets the shark sink away dark below, and burps on "bits"', () => {
    expect(sceneAlpha('tug', said('ate'))).toBe(1);
    const early = tugAt(said('And') + 0.2);
    expect(early.phase).toBe('tug');
    expect(early.dark).toBe(0);
    expect(early.seal.gape).toBeGreaterThan(0.1);
    // From behind and below: the seal's middle is behind (left of) and below the shark's.
    expect(early.seal.x).toBeLessThan(early.shark.x);
    expect(early.seal.y).toBeGreaterThan(early.shark.y);
    expect(TUG_CUT).toBeGreaterThan(said('only'));
    expect(TUG_CUT).toBeLessThan(said('best'));
    const late = tugAt(said('bits.') + 0.2);
    expect(late.phase).toBe('smug');
    expect(late.dark).toBe(1);
    expect(late.shark.y).toBeGreaterThan(early.shark.y + 500);
    // The sinking shape stays clear below the seal.
    for (let t = TUG_CUT; t < said('Some'); t += FRAME) expect(tugAt(t).shark.y).toBeGreaterThan(tugAt(t).seal.y + 450);
    expect(tugAt(said('bits.') + 0.5).sharkAlpha).toBeLessThan(0.8);
    expect(tugAt(said('bits.') + 0.1).puff).toBeGreaterThan(0.5);
    expect(SOUNDS.some((s) => s.id === 'suck' && s.pitch < 0.6 && Math.abs(s.t - said('bits.')) < 0.2)).toBe(true);
  });

  it('draws two equal bars with "5 ft / 1.5 m" under the nervous line, labels as each is named', () => {
    expect(BAR_X1 - BAR_X0).toBe(600);
    expect(sealBarAt(said('Some') + 1)).toBe(1);
    expect(sharkBarAt(said('sharks', 2) + 0.8)).toBe(1);
    expect(sharkLabelAt(said('long') + 0.3)).toBe(1);
    expect(sealLabelAt(said('seal', 3) + 0.3)).toBe(1);
    expect(equalAt(said('itself…') + 0.3)).toBe(1);
    expect(sceneAlpha('bars', said('long'))).toBe(1);
    expect(nervousAt(said('long'))).toBe(1);
    expect(gloomAt(said('long'))).toBe(0);
  });

  it('has a great white peek in, look at the seal and back off with a nervous eye', () => {
    expect(sceneAlpha('peek', said('predator'))).toBe(1);
    const [out, peeking, gone] = [peekAt(said('So') - 0.05), peekAt(said('predator') + 0.1), peekAt(said('now?') + 1)];
    expect(peekSnoutX(out)).toBeGreaterThan(1080);
    expect(peekSnoutX(peeking)).toBeLessThan(800);
    expect(peeking.white.len).toBeGreaterThan(2 * peeking.seal.len);
    expect(peeking.look).toBe(1);
    expect(peekAt(said('now?') + 0.3).scared).toBeGreaterThan(0.9);
    expect(peekAt(said('now?') + 0.3).white.worried).toBeGreaterThan(0.9);
    expect(peekSnoutX(gone)).toBeGreaterThan(1080);
    expect(peekAt(said('now?') + 0.3).shoo).toBeGreaterThan(0.9);
    // The seal and the great white never overlap.
    for (let t = said('So'); t < said('Because'); t += FRAME) {
      const p = peekAt(t);
      expect(peekSnoutX(p)).toBeGreaterThan(p.seal.x + (160 / 310) * p.seal.len + 40);
    }
  });

  it('comes back to the bite on "Because": frame 1 again', () => {
    expect(sceneAlpha('bite', said('Because') + 0.1)).toBe(1);
    expect(sceneAlpha('peek', said('Because') + 0.1)).toBe(0);
    expect(sceneAlpha('bite', said('now?'))).toBe(0);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('Because');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeLessThan(0.5);
    expect(TEMPO).toBeLessThanOrEqual(1.15);
    expect(TEMPO).toBeCloseTo(last.end / (LOOP_S - 0.3), 3);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(19);
    }
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
    expect(captionAt(0)!.line).toBe(LINES[0]);
    for (let t = 0; t < LOOP_S; t += FRAME) expect(captionAt(t), `t=${t}`).not.toBeNull();
  });

  it('keeps every text line inside the area the apps leave clear (y 270 to 1250)', () => {
    for (const [name, line] of Object.entries(TEXT)) {
      expect(line.y, name).toBeGreaterThanOrEqual(270);
      expect(line.y, name).toBeLessThanOrEqual(1250);
      expect(line.y - line.size * 0.72, name).toBeGreaterThanOrEqual(270);
    }
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
