import { describe, expect, it } from 'vitest';
import { capyHeadAt, ownToWorld, headToOwn } from '../dev/promo/pelican/rig';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/pelican/script';
import {
  AT, bangAt, BOIL_STEPS, boilAt, camAt, capybarasAt, castAt, CUTS, flashAt, galAt, HOOK_CAM, LOOP_S, moodAt, pelicanAt, said, shotAt, wrap, zooAt,
} from '../dev/promo/pelican/story';
import { TEMPO, WORDS } from '../dev/promo/pelican/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;

describe('promo short: this pelican tried to swallow a capybara (narrated)', () => {
  it('loops: the camera, the pelican, the pups, the mood and the writing at the loop point equal their start', () => {
    expect(wrap(END)).toBeCloseTo(LOOP_S, 5);
    expect(shotAt(0).name).toBe('hook');
    expect(shotAt(END).name).toBe('hook');
    const [c0, c1] = [camAt(0), camAt(END)];
    for (const k of ['zoom', 'cx', 'cy', 'focus'] as const) expect(c1[k], k).toBeCloseTo(c0[k], 3);
    const [p0, p1] = [pelicanAt(0), pelicanAt(END)];
    expect(p1.holds).toBe(p0.holds);
    expect(p1.pose.face).toBe(p0.pose.face);
    for (const k of ['x', 'y', 'lean', 'walk'] as const) expect(p1.pose[k], k).toBeCloseTo(p0.pose[k], 3);
    for (const k of ['x', 'y', 'a', 'gape', 'sack', 'seeThrough', 'alarm', 'squint'] as const) expect(p1.pose.head[k], k).toBeCloseTo(p0.pose.head[k], 3);
    const [a0, a1] = [capybarasAt(0), capybarasAt(END)];
    expect(a1.a.lid).toBeCloseTo(a0.a.lid, 3);
    expect(castAt(END)).toEqual(castAt(0));
    const [m0, m1] = [moodAt(0), moodAt(END)];
    for (const k of ['drain', 'warm'] as const) expect(m1[k], k).toBeCloseTo(m0[k], 3);
    expect(flashAt(END)).toBeCloseTo(flashAt(0), 3);
    for (const f of [galAt, zooAt, (t: number) => bangAt(t).alpha]) {
      expect(f(0)).toBeCloseTo(0, 3);
      expect(f(END)).toBeCloseTo(0, 3);
    }
  });

  it('opens on the hook: pup A in the pelican\'s stretched pouch, deadpan, alone with the pelican, nothing written but the caption', () => {
    for (const t of [0, 0.3, 1, 2]) {
      const p = pelicanAt(t);
      expect(p.holds, `t=${t}`).toBe('A');
      expect(p.pose.head.sack).toBeGreaterThan(80);
      expect(capybarasAt(t).a.lid).toBeGreaterThan(0.45);
      expect(castAt(t)).toEqual({ mother: false, b: false });
    }
    // The pup's head sits in the pouch, under the bill, below the pelican's head.
    const p = pelicanAt(0.3).pose;
    const pup = capyHeadAt(capybarasAt(0.3).a);
    const head = ownToWorld(p, headToOwn(p.head, { x: 0, y: 0 }));
    expect(head.y).toBeLessThan(pup.y);
    expect(head.x).toBeGreaterThan(pup.x);
    expect(camAt(0.3).zoom).toBeGreaterThanOrEqual(HOOK_CAM.zoom);
    for (let t = 0; t <= 2.7; t += FRAME) expect(galAt(t) + zooAt(t) + bangAt(t).alpha, `t=${t}`).toBe(0);
    expect(captionAt(0.3)!.line.words.map((w) => w.text).join(' ')).toBe('This pelican tried');
  });

  it('is alive from the first frame: the pouch heaves as it tries', () => {
    let [lo, hi] = [Infinity, -Infinity];
    for (let t = 0; t < 2.6; t += FRAME) {
      lo = Math.min(lo, pelicanAt(t).pose.head.sack);
      hi = Math.max(hi, pelicanAt(t).pose.head.sack);
    }
    expect(hi - lo).toBeGreaterThan(3);
  });

  it('puts every noun on screen as it is said', () => {
    // "pouch ... three GALLONS": three jugs in the pouch, 3 gal over 11 L.
    expect(pelicanAt(AT.gallons + 0.2).jugs).toEqual([1, 1, 1]);
    expect(pelicanAt(AT.about - 0.3).jugs[0]).toBe(0);
    expect(galAt(AT.three + 0.2)).toBe(1);
    // "a zoo in Japan": written; the mother and both pups in the wide shot.
    expect(zooAt(AT.japan + 0.1)).toBe(1);
    expect(castAt(AT.japan)).toEqual({ mother: true, b: true });
    // "picked a baby capybara": pup A in the bill.
    expect(pelicanAt(AT.capyA + 0.2).holds).toBe('A');
    // "FLINCH!": the "!" over the pelican, its eye wide; the pup still deadpan.
    expect(bangAt(AT.flinch + 0.2).alpha).toBe(1);
    expect(pelicanAt(AT.flinch + 0.2).pose.head.alarm).toBeGreaterThan(0.9);
    expect(capybarasAt(AT.flinch + 0.2).a.lid).toBeCloseTo(capybarasAt(0).a.lid, 6);
    // "the NEXT baby": pup B in the bill; "Same face": both pups in the shot, blinking together.
    expect(pelicanAt(AT.next + 0.35).holds).toBe('B');
    expect(shotAt(AT.face).name).toBe('same');
    expect(castAt(AT.face).b).toBe(true);
    const blink = capybarasAt(AT.face + 0.25);
    expect(blink.a.lid).toBeGreaterThan(0.9);
    expect(blink.b.lid).toBe(blink.a.lid);
    // "It gave up": it walks away, the pouch empty, the colour drained.
    const gave = pelicanAt(AT.up);
    expect(gave.holds).toBeNull();
    expect(gave.pose.face).toBe(1);
    expect(gave.pose.walk).toBeGreaterThan(0.5);
    expect(moodAt(AT.up).drain).toBeGreaterThan(0.4);
    // "but hey": it turns back, sly.
    expect(pelicanAt(AT.hey + 0.1).pose.face).toBe(-1);
    expect(pelicanAt(AT.hey + 0.1).pose.head.squint).toBeGreaterThan(0.5);
  });

  it('cuts back to frame 1 for the seam: the bill comes down over pup A after "at least" begins', () => {
    expect(CUTS.hook).toBeGreaterThan(said('at', 2));
    expect(CUTS.hook).toBeLessThan(LOOP_S - 0.5);
    expect(pelicanAt(CUTS.hook + 0.01).holds).toBeNull();
    expect(pelicanAt(LOOP_S - 0.1).holds).toBe('A');
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('least');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    expect(LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO).toBeLessThan(0.6);
    expect(TEMPO).toBeLessThanOrEqual(1.15);
  });

  it('captions every spoken word in short phrases, the right one at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(19);
    }
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    for (let t = 0; t < LOOP_S; t += FRAME) expect(captionAt(t), `t=${t}`).not.toBeNull();
  });

  it('keeps every text line inside the area the apps leave clear (y 270 to 1250)', () => {
    for (const [name, line] of Object.entries(TEXT)) {
      expect(line.y, name).toBeGreaterThanOrEqual(270);
      expect(line.y, name).toBeLessThanOrEqual(1250);
      expect(line.y - line.size * 0.72, name).toBeGreaterThanOrEqual(270);
    }
  });

  it('lasts a whole number of video frames and line-boil cycles, with every word and sound inside the loop', () => {
    expect(LOOP_S % 1.5).toBeCloseTo(0, 9);
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    for (const w of WORDS) {
      expect(w.start / TEMPO).toBeGreaterThanOrEqual(0);
      expect(w.end / TEMPO).toBeLessThan(LOOP_S);
    }
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });

  it('changes the sound with the mood: a crash on "FLINCH!", a sad sting on "gave", pops for the jugs', () => {
    expect(SOUNDS.some((s) => s.id === 'smash' && Math.abs(s.t - AT.flinch) < 0.1)).toBe(true);
    expect(SOUNDS.some((s) => s.id === 'lose' && Math.abs(s.t - AT.gave) < 0.2)).toBe(true);
    expect(SOUNDS.filter((s) => s.id === 'eatBig' && s.t > AT.pouch && s.t < CUTS.zoo)).toHaveLength(3);
  });
});
